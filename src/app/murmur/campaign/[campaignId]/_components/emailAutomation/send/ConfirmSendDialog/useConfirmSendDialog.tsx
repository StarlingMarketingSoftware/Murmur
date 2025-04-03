import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { Email } from '@prisma/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FormData from 'form-data'; // form-data v4.0.1
import Mailgun from 'mailgun.js'; // mailgun.js v11.1.0

export interface ConfirmSendDialogProps {
	draftEmails: EmailWithRelations[];
	campaign: CampaignWithRelations;
}

export const useConfirmSendDialog = (props: ConfirmSendDialogProps) => {
	const { campaign, draftEmails } = props;
	const queryClient = useQueryClient();

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

			console.log(data); // logs response data
		} catch (error) {
			console.log(error); //logs any error
		}
	};

	const handleSend = async () => {
		for (const email of draftEmails) {
			const res = await sendMailgunMessage(email, 'shingoAlert@gmail.com');
			console.log('🚀 ~ handleSend ~ res:', res);
			if (res?.status === 200) {
				queryClient.invalidateQueries({ queryKey: ['campaign'] });
			}
		}
	};

	return {
		handleSend,
	};
};
