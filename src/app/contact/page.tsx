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
import { Textarea } from '@/components/ui/textarea';
import PageHeading from '@/components/text/PageHeading';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import MutedSubtext from '@/components/text/MutedSubtext';
import { contactFormSchema } from '@/constants/types';
import { toast } from 'sonner';

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

	const onSubmit = async (values: z.infer<typeof contactFormSchema>) => {
		const res = await fetch('/api/contact', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(values),
		});
		if (res.status === 200) {
			form.reset();
			toast.success('Message sent successfully!');
		} else {
			const { error } = await res.json();
			toast.error(error);
		}
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
											<Textarea className="h-44" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button size="lg" type="submit">
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
