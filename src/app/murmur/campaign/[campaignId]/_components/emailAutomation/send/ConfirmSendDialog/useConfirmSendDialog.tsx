import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { useEditCampaign } from '@/hooks/useCampaigns';
import { useEditEmail } from '@/hooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { useEditUser } from '@/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import FormData from 'form-data'; // form-data v4.0.1
import Mailgun from 'mailgun.js'; // mailgun.js v11.1.0
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
	senderEmail: z.string().min(1, { message: 'Sender email is required.' }),
});

export const useConfirmSendDialog = (props: ConfirmSendDialogProps) => {
	const { campaign, draftEmails } = props;
	const { subscriptionTier, user } = useMe();
	const [isOpen, setIsOpen] = useState(false);
	const { setSendingProgress } = props;

	const queryClient = useQueryClient();
	const draftEmailCount = draftEmails.length;
	const hasReachedSendingLimit = !subscriptionTier && user && user?.emailSendCredits <= 0;

	const form = useForm<z.infer<typeof addSenderInfoSchema>>({
		resolver: zodResolver(addSenderInfoSchema),
		defaultValues: {
			senderName: campaign.senderName || '',
			senderEmail: campaign.senderEmail || '',
		},
	});

	useEffect(() => {
		form.setValue('senderName', campaign.senderName || '');
		form.setValue('senderEmail', campaign.senderEmail || '');
	}, [campaign, form]);

	const sendMailgunMessage = async (
		draftEmail: EmailWithRelations,
		senderEmail: string
	) => {
		const form = new FormData();
		form.append('h:Reply-To', senderEmail);
		const mailgun = new Mailgun(FormData);
		const recipientEmail = draftEmail.contact.email;

		const mg = mailgun.client({
			username: 'api',
			key: process.env.NEXT_PUBLIC_MAILGUN_API_KEY || '',
		});
		try {
			const data = await mg.messages.create(
				'sandbox19faacf722c14c58b751195591eb4fcf.mailgun.org',
				{
					from: 'Mailgun Sandbox <postmaster@sandbox19faacf722c14c58b751195591eb4fcf.mailgun.org>',

					to: [recipientEmail],
					subject: draftEmail.subject,
					text: draftEmail.message,
				}
			);
			return data;
		} catch (error) {
			console.log(error); //logs any error
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

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const handleSend = async () => {
		setIsOpen(false);
		setSendingProgress(0);
		editCampaign({ campaignId: 5, data: form.getValues() });
		let currentEmailSendCredits = user?.emailSendCredits || 0;
		console.log('🚀 ~ handleSend ~ draftEmails:', draftEmails.length);

		for (const email of draftEmails) {
			console.log('RUNNNN');
			await delay(2000);
			if (currentEmailSendCredits <= 0 && !subscriptionTier) {
				toast.error(
					'You have reached the sending limit of the free tier. Please upgrade to a paid plan to send more emails.'
				);
				return;
			}
			const res = await sendMailgunMessage(email, 'shingoAlert@gmail.com');
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
				queryClient.invalidateQueries({ queryKey: ['campaign'] });
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
