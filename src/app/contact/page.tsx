'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import PageHeading from '@/components/atoms/_text/PageHeading';
import MutedSubtext from '@/components/atoms/_text/MutedSubtext';
import { useSendMailgunMessage } from '@/hooks/useMailgun';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';

export const contactFormSchema = z.object({
	name: z.string().min(1, { message: 'Name is required.' }),
	email: z.string().email({ message: 'Invalid email address.' }),
	subject: z.string().min(1, { message: 'Subject is required.' }),
	message: z.string().min(1, { message: 'Message is required.' }),
});

const Contact = () => {
	const form = useForm<z.infer<typeof contactFormSchema>>({
		resolver: zodResolver(contactFormSchema),
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

	const onSubmit = (values: z.infer<typeof contactFormSchema>) => {
		const emailBody: string = `<p>Name: ${values.name}</p><p></p><p>Email: ${values.email}</p><p></p><p>Message: ${values.message}</p>`;

		mutate({
			recipientEmail: process.env.NEXT_PUBLIC_CONTACT_FORM_RECIPIENT!,
			...values,
			senderEmail: values.email,
			senderName: `Murmur Inquiry from ${values.name}`,
			message: emailBody,
		});
	};

	return (
		<div className="max-w-[900px] mx-auto">
			<PageHeading>Contact Us</PageHeading>
			<MutedSubtext>{`We're here to help with any questions you may have`}.</MutedSubtext>
			<Card className="max-w-[750px] mx-auto">
				<CardHeader className="">
					<CardTitle>Send us a message</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="">
							<div className="flex flex-row items-center w-full gap-4 m-0">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="w-1/2">
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem className="w-1/2">
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Subject</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Message</FormLabel>
										<FormControl>
											<RichTextEditor
												hideMenuBar
												value={field.value}
												onChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button size="lg" type="submit" isLoading={isPending}>
								Submit
							</Button>
						</form>
					</Form>
				</CardContent>
				<CardFooter></CardFooter>
			</Card>

			<div className="flex flex-row justify-center items-center">
				<div></div>
			</div>
			<MutedSubtext>We typically respond within 24 hours.</MutedSubtext>
		</div>
	);
};

export default Contact;
