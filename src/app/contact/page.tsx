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

const formSchema = z.object({
	name: z.string().min(1, { message: 'Name is required' }),
	email: z.string().email({ message: 'Invalid email address' }),
	subject: z.string().min(1, { message: 'Subject is required' }),
	message: z.string().min(1, { message: 'Message is required' }),
});

const Contact = () => {
	// 1. Define your form.
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			email: '',
			subject: '',
			message: '',
		},
	});

	// 2. Define a submit handler.
	function onSubmit(values: z.infer<typeof formSchema>) {
		// Do something with the form values.
		// ✅ This will be type-safe and validated.
		console.log(values);
	}
	return (
		<div className="max-w-[900px] mx-auto">
			<PageHeading>Contact Us</PageHeading>
			<MutedSubtext>{`We're here to help with any questions you may have`}.</MutedSubtext>
			<Card className="max-w-[750px] mx-auto">
				<CardHeader className="bg-">
					<CardTitle>Send us a message</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<div className="flex flex-row items-center w-full gap-4 m-0 min-h[85px]">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="w-1/2">
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input placeholder="Your Full Name" {...field} />
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
												<Input placeholder="Your Email" {...field} />
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
											<Input placeholder="Your Subject" {...field} />
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
											<Textarea
												rows={145}
												className="!h-48"
												placeholder="Your message"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit">Submit</Button>
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
