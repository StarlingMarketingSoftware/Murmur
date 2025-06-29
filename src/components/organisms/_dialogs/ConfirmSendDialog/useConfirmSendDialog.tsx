import {
	CampaignWithRelations,
	EmailWithRelations,
	StripeSubscriptionStatus,
} from '@/types';
import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
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
}

const addSenderInfoSchema = z.object({
	senderName: z.string().min(1, { message: 'Sender name is required.' }),
	senderEmail: z
		.string()
		.email({ message: 'Please enter a valid email address.' })
		.min(1, { message: 'Email address is required.' }),
});

export const useConfirmSendDialog = (props: ConfirmSendDialogProps) => {
	const { draftEmails } = props;
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

	const handleSend = async () => {
		setIsOpen(false);
		if (
			!subscriptionTier &&
			user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
		) {
			toast.error('Please upgrade to a paid plan to send emails.');
			return;
		}
		setSendingProgress(0);
		if (!campaign) {
			return null;
		}

		for (const email of draftEmails) {
			const res = await sendMailgunMessage({
				subject: email.subject,
				message: email.message,
				recipientEmail: email.contact.email,
				senderEmail: form.getValues().senderEmail,
				senderName: form.getValues().senderName,
				originEmail: user?.customDomain ?? user?.murmurEmail,
			});
			if (res.success) {
				await updateEmail({
					id: email.id.toString(),
					data: {
						...email,
						status: EmailStatus.sent,
						sentAt: new Date(),
					},
				});
				setSendingProgress((prev) => prev + 1);
				queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
			}
		}
	};

	return {
		handleSend,
		form,
		draftEmailCount,
		isOpen,
		setIsOpen,
	};
};
