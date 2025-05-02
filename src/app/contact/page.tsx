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
import { useSendMailgunMessage } from '@/hooks/useMailgun';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { TypographyP } from '@/components/ui/typography';

const Contact = () => {
	const contactFormSchema = z.object({
		name: z.string().min(1, { message: 'Name is required.' }),
		email: z.string().email({ message: 'Invalid email address.' }),
		subject: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
	});

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
		<AppLayout>
			<PageHeading>Contact Us</PageHeading>
			<TypographyP>
				You can reach us at any time, on any day, and we will get back to you immediately.
				We run this business to the highest degree of excellence we possibly can, and we
				seek to serve you to the best of our ability, according to the task at hand.
			</TypographyP>{' '}
			<Card>
				<CardHeader className="">
					<CardTitle>Send us a message</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="">
							<div className="flex sm:flex-row flex-col items-center w-full gap-0 sm:gap-4 m-0">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="w-full sm:w-1/2">
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
										<FormItem className="w-full sm:w-1/2">
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
		</AppLayout>
	);
};

export default Contact;
