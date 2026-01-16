'use client';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';

export const useResourcesPage = () => {
	const resourcesFormSchema = z.object({
		name: z.string().min(1, { message: 'Name is required.' }),
		email: z.string().email({ message: 'Invalid email address.' }),
		subject: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
	});

	const form = useForm<z.infer<typeof resourcesFormSchema>>({
		resolver: zodResolver(resourcesFormSchema),
		defaultValues: {
			name: '',
			email: '',
			subject: '',
			message: '',
		},
	});

	const { isPending, mutate } = useSendMailgunMessage({
		onSuccess: () => {
			form.reset();
		},
	});

	const onSubmit = (values: z.infer<typeof resourcesFormSchema>) => {
		const emailBody: string = `<p>Name: ${values.name}</p><p></p><p>Email: ${values.email}</p><p></p><p>Message: ${values.message}</p>`;

		mutate({
			recipientEmail: process.env.NEXT_PUBLIC_CONTACT_FORM_RECIPIENT!,
			...values,
			senderEmail: values.email,
			senderName: `Murmur Inquiry from ${values.name}`,
			message: emailBody,
		});
	};

	return {
		isPending,
		onSubmit,
		form,
	};
};

