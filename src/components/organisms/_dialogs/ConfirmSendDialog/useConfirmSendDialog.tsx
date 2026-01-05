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

	const { mutateAsync: updateEmail } = useEditEmail({
		suppressToasts: true,
	});

	const { mutateAsync: editUser } = useEditUser({
		suppressToasts: true,
	});

	const handleSend = async () => {
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

		// Check sending credits
		const sendingCredits = user?.sendingCredits || 0;
		const emailsToSend = draftEmails.length;

		if (sendingCredits === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		// Determine how many emails we can actually send
		const emailsWeCanSend = Math.min(emailsToSend, sendingCredits);
		const emailsToProcess = draftEmails.slice(0, emailsWeCanSend);

		setIsOpen(false);
		setSendingProgress(0);

		if (!campaign) {
			return null;
		}

		let successfulSends = 0;

		for (const email of emailsToProcess) {
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
				});

				if (res.success) {
					await updateEmail({
						id: email.id.toString(),
						data: {
							status: EmailStatus.sent,
							sentAt: new Date(),
						},
					});
					successfulSends++;
					setSendingProgress((prev) => prev + 1);
					queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
				}
			} catch (error) {
				console.error('Failed to send email:', error);
				// Continue with next email even if one fails
			}
		}

		// Update user credits after sending
		if (user && successfulSends > 0) {
			const newCreditBalance = Math.max(0, sendingCredits - successfulSends);
			await editUser({
				clerkId: user.clerkId,
				data: { sendingCredits: newCreditBalance },
			});
		}

		// Show final status message
		if (successfulSends === emailsToSend) {
			toast.success(`All ${successfulSends} emails sent successfully!`);
		} else if (successfulSends > 0) {
			if (emailsWeCanSend < emailsToSend) {
				toast.warning(
					`Sent ${successfulSends} emails before running out of credits. Please upgrade your subscription to send the remaining ${
						emailsToSend - successfulSends
					} emails.`
				);
				setSendingProgress(-1);
			} else {
				toast.warning(
					`${successfulSends} of ${emailsToSend} emails sent successfully. Some emails failed to send.`
				);
				setSendingProgress(-1);
			}
		} else {
			toast.error('Failed to send emails. Please try again.');
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
