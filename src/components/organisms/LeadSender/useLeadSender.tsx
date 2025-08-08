import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';

export const useLeadSender = () => {
	const leadFormSchema = z.object({
		email: z.string().email({ message: 'Invalid email address.' }),
	});
	const form = useForm<z.infer<typeof leadFormSchema>>({
		resolver: zodResolver(leadFormSchema),
		defaultValues: {
			email: '',
		},
	});

	const { mutate: sendMailgunMessage, isPending: isSendingMailgunMessage } =
		useSendMailgunMessage({
			onSuccess: () => {
				form.reset();
			},
			successMessage:
				'Thank you for your interest in Murmur! We will be in touch shortly.',
		});

	const onSubmit = (values: z.infer<typeof leadFormSchema>) => {
		const emailBody: string = `
			<p>A new lead has submitted their email through Murmur.</p>
			<p><strong>Email:</strong> ${values.email}</p>
			<p>Please follow up with them at your earliest convenience.</p>
		`;

		sendMailgunMessage({
			recipientEmail: process.env.NEXT_PUBLIC_CONTACT_FORM_RECIPIENT!,
			senderEmail: values.email,
			senderName: 'Murmur Inquiry',
			subject: 'New Murmur Inquiry',
			message: emailBody,
		});
	};

	return {
		form,
		onSubmit,
		isSendingMailgunMessage,
	};
};
