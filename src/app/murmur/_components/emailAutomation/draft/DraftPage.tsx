import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Form,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Draft as DraftPage, emailDraftSchema } from '@/constants/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Brain, PenLine } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SavedDraftsTable from './SavedDraftsTable';

const sampleDrafts: DraftPage[] = [
	{
		subject: 'Meeting Reminder',
		message: "Don't forget about our meeting scheduled for tomorrow at 10 AM.",
		contactEmail: 'john.doe@example.com',
	},
	{
		subject: 'Project Update',
		message:
			'The latest update on the project is now available. Please review and provide feedback.',
		contactEmail: 'jane.smith@example.com',
	},
	{
		subject: 'Invoice Submission',
		message: 'Please find attached the invoice for this month’s services.',
		contactEmail: 'billing@company.com',
	},
	{
		subject: 'Event Invitation',
		message:
			'You are invited to our annual company event on March 15th. RSVP by March 1st.',
		contactEmail: 'events@company.com',
	},
	{
		subject: 'Technical Support Request',
		message: 'I am experiencing an issue with my account login. Can you assist?',
		contactEmail: 'support@service.com',
	},
	{
		subject: 'Job Application',
		message: 'I am applying for the Software Engineer position. My resume is attached.',
		contactEmail: 'hr@company.com',
	},
	{
		subject: 'Feedback Request',
		message: 'We would appreciate your feedback on our new product.',
		contactEmail: 'feedback@company.com',
	},
	{
		subject: 'Subscription Renewal',
		message:
			'Your subscription will expire soon. Renew now to continue enjoying our services.',
		contactEmail: 'subscriptions@service.com',
	},
	{
		subject: 'Security Alert',
		message:
			'A new login attempt was detected on your account. If this wasn’t you, reset your password.',
		contactEmail: 'security@service.com',
	},
	{
		subject: 'Weekly Newsletter',
		message: 'Check out this week’s updates and news in our latest newsletter.',
		contactEmail: 'newsletter@company.com',
	},
	{
		subject: 'Password Reset Request',
		message: 'Click the link below to reset your password.',
		contactEmail: 'noreply@service.com',
	},
	{
		subject: 'Product Inquiry',
		message:
			'I am interested in learning more about your latest product. Can you provide details?',
		contactEmail: 'sales@company.com',
	},
	{
		subject: 'Meeting Reschedule',
		message: 'Can we move our scheduled meeting to a later time?',
		contactEmail: 'colleague@example.com',
	},
	{
		subject: 'Customer Support Follow-up',
		message: 'Following up on my previous support request regarding my order status.',
		contactEmail: 'support@ecommerce.com',
	},
	{
		subject: 'Collaboration Proposal',
		message: 'I’d love to discuss a potential collaboration opportunity with you.',
		contactEmail: 'business@company.com',
	},
];

const DraftPage = () => {
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(true);
	const [selectedRecipient, setSelectedRecipient] = useState<string>(''); // store user emails here to coordiate between the recipients selection area and the draft selection area
	const [selectedRows, setSelectedRows] = useState<DraftPage[]>([]);
	const [drafts, setDrafts] = useState<DraftPage[]>([...sampleDrafts]); // TODO store this in localStorage as well in case app crashes

	// const handleModeClick = () => {
	// 	if (modeValue === 'ai') {
	// 		toast.info('Mode switched to Compose.');
	// 	} else {
	// 		toast.info('Mode switched to AI Draft.');
	// 	}
	// };

	const form = useForm<z.infer<typeof emailDraftSchema>>({
		resolver: zodResolver(emailDraftSchema),
		defaultValues: {
			subject: '',
			message: '',
		},
		// mode: aiDraft === 'ai' ? 'none' : 'onSubmit',
	});

	const onSubmit = async (values: z.infer<typeof emailDraftSchema>) => {
		console.log(values);
		// save the message maybe
	};

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					<ToggleGroup
						// onClick={handleModeClick}
						variant="outline"
						className="mx-auto"
						type="single"
						size="lg"
						value={isAiDraft ? 'ai' : 'compose'}
						onValueChange={(value) => setIsAiDraft(value === 'ai')}
					>
						<ToggleGroupItem value="ai">
							<Brain />
							AI Draft
						</ToggleGroupItem>
						<ToggleGroupItem value="compose">
							<PenLine />
							Compose
						</ToggleGroupItem>
					</ToggleGroup>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<div className="m-0 grid grid-cols-12 gap-4 items-center">
								<FormField
									control={form.control}
									name="subject"
									render={({ field }) => (
										<FormItem className="col-span-11">
											<FormLabel>Subject</FormLabel>
											<FormControl>
												<Input
													className="flex-grow"
													placeholder={
														isAiSubject ? 'AI-generated subject...' : 'Enter subject...'
													}
													disabled={isAiDraft && isAiSubject}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Toggle
									className="w-5 -translate-y-1"
									pressed={isAiSubject}
									onPressedChange={() => setIsAiSubject(!isAiSubject)}
									disabled={!isAiDraft}
								>
									<Brain />
								</Toggle>
							</div>
							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Message</FormLabel>
										<FormControl>
											<Textarea
												className="h-[200px]"
												placeholder={
													isAiDraft
														? 'Write your prompt for the AI here. For example:\n"Draft an email to schedule a meeting with the marketing team to discuss our Q2 strategy."\nBased on this prompt, the AI will generate a custom email for each recipient.'
														: 'Draft an email...'
												}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex gap-4">
								<Button variant="ghost">Test Your Prompt</Button>
								<Button type="submit">
									{isAiDraft ? 'Generate Custom Emails for All Recipients' : 'Save Draft'}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
			<SavedDraftsTable drafts={drafts} setSelectedRows={setSelectedRows} />
		</>
	);
};

export default DraftPage;
