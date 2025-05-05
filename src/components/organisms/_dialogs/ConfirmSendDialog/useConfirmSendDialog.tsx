import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { useEditCampaign, useGetCampaign } from '@/hooks/useCampaigns';
import { useEditEmail } from '@/hooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { useEditUser } from '@/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
	const { data: campaign } = useGetCampaign(parseInt(campaignId));

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

	const sendMailgunMessage = async (
		draftEmail: EmailWithRelations,
		senderEmail: string,
		senderName: string
	) => {
		try {
			const response = await fetch('/api/mailgun/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					recipientEmail: draftEmail.contact.email,
					subject: draftEmail.subject,
					message: draftEmail.message,
					senderEmail,
					senderName,
				}),
			});

			const data = await response.json();
			if (!data.success) {
				throw new Error('Failed to send email');
			}
			return data.data;
		} catch (error) {
			console.error(error);
			return null;
		}
	};

	const { mutate: editCampaign } = useEditCampaign({ suppressToasts: true });

	const { mutateAsync: updateEmail } = useEditEmail({
		suppressToasts: true,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['drafts'] });
		},
	});

	const { mutateAsync: updateEmailSendCredits } = useEditUser({ suppressToasts: true });

	const handleSend = async () => {
		setIsOpen(false);
		setSendingProgress(0);
		if (!campaign) {
			return null;
		}
		editCampaign({ campaignId: campaign.id, data: form.getValues() });
		let currentEmailSendCredits = user?.emailSendCredits || 0;

		for (const email of draftEmails) {
			if (currentEmailSendCredits <= 0 && !subscriptionTier) {
				toast.error(
					'You have reached the sending limit of the free tier. Please upgrade to a paid plan to send more emails.'
				);
				return;
			}
			const res = await sendMailgunMessage(
				email,
				form.getValues().senderEmail,
				form.getValues().senderName
			);
			if (res?.status === 200) {
				await updateEmail({
					emailId: email.id,
					data: {
						...email,
						status: EmailStatus.sent,
						sentAt: new Date(),
					},
				});
				setSendingProgress((prev) => prev + 1);
				queryClient.invalidateQueries({ queryKey: ['campaign', campaignId.toString()] });
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
