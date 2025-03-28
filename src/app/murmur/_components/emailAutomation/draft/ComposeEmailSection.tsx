import { Dispatch, FC, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Draft, emailDraftSchema } from '@/constants/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Brain, PenLine } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SavedDraftsTable from './SavedDraftsTable';
interface ComposeEmailProps {
	setDrafts: Dispatch<SetStateAction<Draft[]>>;
}

const ComposeEmailSection: FC<ComposeEmailProps> = ({ setDrafts }) => {
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(true);

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
		<Card>
			<CardContent className="space-y-2">
				<ToggleGroup
					// onClick={handleModeClick}
					variant="outline"
					className="mx-auto"
					type="single"
					size="lg"
					value={isAiDraft ? 'ai' : 'compose'}
					onValueChange={(value) => {
						setIsAiDraft(value === 'ai');
						setIsAiSubject(value === 'ai');
					}}
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
	);
};

export default ComposeEmailSection;
