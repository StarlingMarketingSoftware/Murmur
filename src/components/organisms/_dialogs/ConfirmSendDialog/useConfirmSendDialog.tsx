import { CampaignWithRelations, EmailWithRelations } from '@/types';
import { useEditCampaign, useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
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
	const hasReachedSendingLimit = !subscriptionTier && user && user?.emailSendCredits <= 0;

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

	const { mutate: editCampaign } = useEditCampaign({ suppressToasts: true });

	const { mutateAsync: updateEmail } = useEditEmail({
		suppressToasts: true,
	});

	const { mutateAsync: updateEmailSendCredits } = useEditUser({ suppressToasts: true });

	const handleSend = async () => {
		setIsOpen(false);
		setSendingProgress(0);
		if (!campaign) {
			return null;
		}
		editCampaign({ id: campaign.id.toString(), data: form.getValues() });
		let currentEmailSendCredits = user?.emailSendCredits || 0;

		for (const email of draftEmails) {
			if (currentEmailSendCredits <= 0 && !subscriptionTier) {
				toast.error(
					'You have reached the sending limit of the free tier. Please upgrade to a paid plan to send more emails.'
				);
				return;
			}
			const res = await sendMailgunMessage({
				subject: email.subject,
				message: email.message,
				recipientEmail: email.contact.email,
				senderEmail: form.getValues().senderEmail,
				senderName: form.getValues().senderName,
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
				if (!subscriptionTier && user) {
					await updateEmailSendCredits({
						clerkId: user.clerkId,
						data: { emailSendCredits: user.emailSendCredits - 1 },
					});
					currentEmailSendCredits--;
				}
			}
		}
	};

	return {
		handleSend,
		form,
		draftEmailCount,
		hasReachedSendingLimit,
		isOpen,
		setIsOpen,
	};
};
