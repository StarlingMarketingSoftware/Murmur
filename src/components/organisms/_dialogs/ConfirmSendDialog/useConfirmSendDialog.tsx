import {
	CampaignWithRelations,
	EmailWithRelations,
	StripeSubscriptionStatus,
} from '@/types';
import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useEnqueueEmails } from '@/hooks/queryHooks/useSendQueue';
import { useMe } from '@/hooks/useMe';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useDivertEmailToMessage } from '@/hooks/queryHooks/useConversations';

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

	// Venue recipients are delivered as internal messages instead of email.
	const { mutateAsync: divertEmailToMessage } = useDivertEmailToMessage({
		suppressToasts: true,
	});

	const enqueueEmails = useEnqueueEmails();

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
				toast.error('Please create an Identity before sending messages.');
				return;
			}

			if (
				!subscriptionTier &&
				user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
			) {
				toast.error('Please upgrade to a paid plan to send messages.');
				return;
			}
		}

		setIsOpen(false);
		setSendingProgress(0);

		let messagedCount = 0;

		// 1) Internal messages to venue users — delivered synchronously (no email,
		// no sending credit, never queued).
		for (const email of venueDrafts) {
			try {
				await divertEmailToMessage(email.id);
				messagedCount++;
				setSendingProgress((prev) => prev + 1);
				queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
			} catch (error) {
				console.error('Failed to deliver internal message:', error);
			}
		}

		// 2) Regular emails → async send queue. The worker dispatches on a throttled
		// schedule and charges sending credits AT SEND TIME, so there is NO
		// client-side credit debit here. The endpoint gates the batch to the user's
		// available credits and reports the remainder as skippedNoCredits.
		let scheduledCount = 0;
		let skippedNoCredits = 0;
		if (emailDrafts.length > 0) {
			try {
				const result = await enqueueEmails.mutateAsync({
					campaignId: campaign.id,
					emailIds: emailDrafts.map((d) => d.id),
				});
				scheduledCount = result.scheduledCount;
				skippedNoCredits = result.skippedNoCredits;
			} catch (error) {
				console.error('Failed to enqueue messages:', error);
				toast.error('Failed to add messages to the sending queue.');
			}
		}

		if (scheduledCount > 0) {
			toast.success('Message added to sending queue');
		}
		if (skippedNoCredits > 0) {
			toast.warning(
				`${skippedNoCredits} message${
					skippedNoCredits === 1 ? '' : 's'
				} not queued — out of sending credits.`
			);
		}
		if (messagedCount > 0 && scheduledCount === 0 && skippedNoCredits === 0) {
			toast.success(`${messagedCount} message${messagedCount === 1 ? '' : 's'} sent.`);
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
