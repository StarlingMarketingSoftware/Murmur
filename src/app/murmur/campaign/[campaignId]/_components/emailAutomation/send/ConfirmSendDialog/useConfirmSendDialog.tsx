import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { useEditCampaign } from '@/hooks/useCampaigns';
import { useEditEmail } from '@/hooks/useEmails';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailStatus } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FormData from 'form-data'; // form-data v4.0.1
import Mailgun from 'mailgun.js'; // mailgun.js v11.1.0
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface ConfirmSendDialogProps {
	draftEmails: EmailWithRelations[];
	campaign: CampaignWithRelations;
}

const addSenderInfoSchema = z.object({
	senderName: z.string().min(1, { message: 'Sender name is required.' }),
	senderEmail: z.string().min(1, { message: 'Sender email is required.' }),
});

export const useConfirmSendDialog = (props: ConfirmSendDialogProps) => {
	const { campaign, draftEmails } = props;
	const queryClient = useQueryClient();
	const draftEmailCount = draftEmails.length;

	const form = useForm<z.infer<typeof addSenderInfoSchema>>({
		resolver: zodResolver(addSenderInfoSchema),
		defaultValues: {
			senderName: campaign.senderName || '',
			senderEmail: campaign.senderEmail || '',
		},
	});

	useEffect(() => {
		console.log('campaignchaned', campaign);
		form.setValue('senderName', campaign.senderName || '');
		form.setValue('senderEmail', campaign.senderEmail || '');
	}, [campaign, form]);

	const sendMailgunMessage = async (
		draftEmail: EmailWithRelations,
		senderEmail: string
	) => {
		const form = new FormData();
		form.append('h:Reply-To', 'reply.demoPerson123@gmail.com');
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

	const { updateCampaign } = useEditCampaign(campaign.id, true);

	const { mutate: updateEmail } = useEditEmail({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['drafts'] });
		},
	});

	const handleSend = async () => {
		// updateCampaign(form.getValues());
		for (const email of draftEmails) {
			// const res = await sendMailgunMessage(email, 'shingoAlert@gmail.com');
			// console.log('🚀 ~ handleSend ~ res:', res);
			// if (res?.status === 200) {
			console.log('email status is 200!!');
			updateEmail({
				emailId: email.id,
				data: {
					...email,
					status: EmailStatus.sent,
				},
			});
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
			// }
		}
	};

	return {
		handleSend,
		form,
		draftEmailCount,
	};
};
