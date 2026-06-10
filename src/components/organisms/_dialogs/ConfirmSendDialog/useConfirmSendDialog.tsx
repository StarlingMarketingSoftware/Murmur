import {
	CampaignWithRelations,
	EmailWithRelations,
	StripeSubscriptionStatus,
} from '@/types';
import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useDivertEmailToMessage } from '@/hooks/queryHooks/useConversations';
import { ContactWithName } from '@/types/contact';
import {
	getSendDwellMs,
	useSendingSessionActions,
	waitForSendDwell,
} from '@/contexts/SendingSessionContext';

export interface ConfirmSendDialogProps {
	draftEmails: EmailWithRelations[];
	campaign: CampaignWithRelations;
	setSendingProgress: Dispatch<SetStateAction<number>>;
	disabled?: boolean;
}

const addSenderInfoSchema = z.object({
	senderName: z.string().min(1, { message: 'Sender name is required.' }),
	senderEmail: z
		.string()
		.email({ message: 'Please enter a valid email address.' })
		.min(1, { message: 'Email address is required.' }),
});

export const useConfirmSendDialog = (props: ConfirmSendDialogProps) => {
	const { draftEmails, disabled } = props;
	const { campaignId } = useParams() as { campaignId: string };
	const { data: campaign } = useGetCampaign(campaignId);

	const { subscriptionTier, user } = useMe();
	const [isOpen, setIsOpen] = useState(false);
	const { setSendingProgress } = props;

	const queryClient = useQueryClient();
	const draftEmailCount = draftEmails.length;

	const form = useForm<z.infer<typeof addSenderInfoSchema>>({
		resolver: zodResolver(addSenderInfoSchema),
		defaultValues: {
			senderName: campaign?.senderName || '',
			senderEmail: campaign?.senderEmail || '',
		},
	});

	useEffect(() => {
		form.setValue('senderName', campaign?.senderName || '');
		form.setValue('senderEmail', campaign?.senderEmail || '');
	}, [campaign, form]);

	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});

	// Venue recipients are delivered as internal messages instead of email.
	const { mutateAsync: divertEmailToMessage } = useDivertEmailToMessage({
		suppressToasts: true,
	});

	const { mutateAsync: updateEmail } = useEditEmail({
		suppressToasts: true,
	});

	const { mutateAsync: editUser } = useEditUser({
		suppressToasts: true,
	});

	// No-op outside the SendingSessionProvider (mounted in MurmurLayoutClient).
	const sendingActions = useSendingSessionActions();

	const handleSend = async () => {
		if (!campaign) {
			return null;
		}

		// Split recipients: published venue users (contact.venueId set) are delivered
		// as internal direct messages — never emailed, and they cost no sending
		// credits. Everyone else goes through the normal Mailgun path.
		const venueDrafts = draftEmails.filter((email) => email.contact.venueId != null);
		const emailDrafts = draftEmails.filter((email) => email.contact.venueId == null);

		// The email path needs an identity, an active plan, and credits. The DM path
		// needs none of these — so only gate when there are actual emails to send.
		if (emailDrafts.length > 0) {
			if (!campaign?.identity?.email || !campaign?.identity?.name) {
				toast.error('Please create an Identity before sending emails.');
				return;
			}

			if (
				!subscriptionTier &&
				user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
			) {
				toast.error('Please upgrade to a paid plan to send emails.');
				return;
			}
		}

		const sendingCredits = user?.sendingCredits || 0;
		// Credits gate ONLY the email recipients; DMs are always allowed.
		const emailsWeCanSend = Math.min(emailDrafts.length, sendingCredits);
		const emailsToProcess = emailDrafts.slice(0, emailsWeCanSend);

		if (emailDrafts.length > 0 && sendingCredits === 0 && venueDrafts.length === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		setIsOpen(false);
		setSendingProgress(0);

		// Drive the campaign-global sending UI alongside the legacy setSendingProgress
		// counter; queue mirrors the processing order below (DMs, then capped emails).
		const sendQueue = [...venueDrafts, ...emailsToProcess];
		const sessionStarted = sendingActions.startSession({
			campaignId: campaign.id,
			queue: sendQueue.map((email) => ({
				emailId: email.id,
				contactId: email.contactId,
				contact: email.contact as ContactWithName,
				kind: email.contact.venueId != null ? 'venueMessage' : 'email',
				subject: email.subject,
			})),
		});
		if (!sessionStarted) {
			toast.error('A send is already in progress.');
			return;
		}
		// No sending UI without the provider — skip the dwell.
		const dwellMs = sendingActions.hasProvider ? getSendDwellMs(sendQueue.length) : 0;

		let emailedCount = 0;
		let messagedCount = 0;

		try {
			// 1) Internal messages to venue users (no email, no credit cost).
			for (const email of venueDrafts) {
				const dwellStart = Date.now();
				sendingActions.beginEmail(email.id);
				try {
					await divertEmailToMessage(email.id);
					messagedCount++;
					setSendingProgress((prev) => prev + 1);
					sendingActions.completeEmail(email.id);
					queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
				} catch (error) {
					console.error('Failed to deliver internal message:', error);
					sendingActions.failEmail(email.id);
					// Continue with the next recipient even if one fails.
				}
				await waitForSendDwell(dwellStart, dwellMs);
			}

			// 2) Regular emails via Mailgun.
			for (const email of emailsToProcess) {
				const dwellStart = Date.now();
				sendingActions.beginEmail(email.id);
				try {
					const res = await sendMailgunMessage({
						subject: email.subject,
						message: email.message,
						recipientEmail: email.contact.email,
						senderEmail: campaign?.identity?.email,
						senderName: campaign?.identity?.name,
						originEmail:
							user?.customDomain && user?.customDomain !== ''
								? user?.customDomain
								: user?.murmurEmail,
						replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
						template: 'newMessage',
						campaignId: campaign.id,
					});

					if (res.success) {
						await updateEmail({
							id: email.id.toString(),
							data: {
								status: EmailStatus.sent,
								sentAt: new Date(),
							},
						});
						emailedCount++;
						setSendingProgress((prev) => prev + 1);
						sendingActions.completeEmail(email.id);
						queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
					} else {
						sendingActions.failEmail(email.id);
					}
				} catch (error) {
					console.error('Failed to send email:', error);
					sendingActions.failEmail(email.id);
					// Continue with next email even if one fails
				}
				await waitForSendDwell(dwellStart, dwellMs);
			}

			// Only emails consume sending credits; internal messages are free.
			if (user && emailedCount > 0) {
				const newCreditBalance = Math.max(0, sendingCredits - emailedCount);
				await editUser({
					clerkId: user.clerkId,
					data: { sendingCredits: newCreditBalance },
				});
			}
		} finally {
			sendingActions.finishSession();
		}

		// Show final status message.
		const totalProcessed = emailedCount + messagedCount;
		const totalRequested = draftEmails.length;

		if (totalProcessed === totalRequested && totalProcessed > 0) {
			toast.success(
				`All ${totalProcessed} message${totalProcessed === 1 ? '' : 's'} sent successfully!`
			);
		} else if (totalProcessed > 0) {
			if (emailsWeCanSend < emailDrafts.length) {
				toast.warning(
					`Sent ${totalProcessed} before running out of credits. Please upgrade your subscription to send the remaining ${
						emailDrafts.length - emailsWeCanSend
					} email${emailDrafts.length - emailsWeCanSend === 1 ? '' : 's'}.`
				);
				setSendingProgress(-1);
			} else {
				toast.warning(
					`${totalProcessed} of ${totalRequested} sent successfully. Some failed to send.`
				);
				setSendingProgress(-1);
			}
		} else {
			toast.error('Failed to send. Please try again.');
		}
	};

	return {
		handleSend,
		draftEmailCount,
		isOpen,
		setIsOpen,
		user,
		campaign,
		disabled,
	};
};
