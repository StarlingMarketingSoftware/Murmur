import { FC, useEffect } from 'react';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { Brain, PenLine } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import { usePerplexityDraftEmail } from '@/hooks/usePerplexity';
import { AiModelOptions } from '@/constants/constants';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { setCompletedDrafts } from '@/lib/redux/features/murmur/murmurSlice';
import { Draft } from '@/constants/types';
import PreviewDraftDialog from '../../PreviewDraftDialog';
import { toast } from 'sonner';

const getEmailDraftSchema = (isAiSubject: boolean) => {
	return z.object({
		subject: isAiSubject
			? z.string().optional()
			: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
		aiModel: z.enum(['sonar', 'sonar-pro'], {
			required_error: 'AI model is required.',
		}),
	});
};

const ComposeEmailSection = () => {
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(true);
	const selectedRecipients = useAppSelector((state) => state.murmur.selectedRecipients);
	const completedDrafts: Draft[] = useAppSelector(
		(state) => state.murmur.completedDrafts
	);
	const dispatch = useAppDispatch();

	const { dataDraftEmail, isPendingDraftEmail, draftEmail } = usePerplexityDraftEmail();

	const form = useForm<z.infer<ReturnType<typeof getEmailDraftSchema>>>({
		resolver: zodResolver(getEmailDraftSchema(isAiSubject)),
		defaultValues: {
			subject: '',
			message: '',
			aiModel: 'sonar',
		},
	});

	const handleFormAction = async (action: 'test' | 'submit') => {
		// Check form validity first
		const isValid = await form.trigger();
		if (!isValid) return;

		const values = form.getValues();

		if (action === 'test') {
			// if error, don't cost the user any tokens
			try {
				draftEmail({
					generateSubject: isAiSubject,
					model: values.aiModel,
					recipient: selectedRecipients[0],
					prompt: values.message,
				});
			} catch (error) {
				if (error instanceof Error) {
					toast.error(error.message);
				}
			}
		} else {
			console.log('Submitting form with:', values);
			// Call your submit function
			// await onSubmit(values);
		}
	};

	// useEffect(() => {
	// 	if (dataDraftEmail && !isPendingDraftEmail) {
	// 		console.log('Draft email generated:', dataDraftEmail);
	// 		dispatch(setCompletedDrafts([...completedDrafts, dataDraftEmail]));
	// 	}
	// }, [dataDraftEmail, isPendingDraftEmail]);

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
					<form onSubmit={(e) => e.preventDefault()} className="space-y-8">
						<div className="m-0 grid grid-cols-12 gap-4 items-center">
							<FormField
								control={form.control}
								name="subject"
								rules={{
									required: isAiSubject,
								}}
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
									<FormLabel>{isAiDraft ? 'AI Prompt' : 'Message'}</FormLabel>
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
						<FormField
							control={form.control}
							name="aiModel"
							render={({ field }) => (
								<FormItem>
									<FormLabel>AI Model</FormLabel>
									<FormControl>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<SelectTrigger className="w-[180px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>AI Model</SelectLabel>
													{AiModelOptions.map((model) => (
														<SelectItem key={model.value} value={model.value}>
															{model.name}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex gap-4">
							<Button
								type="button"
								onClick={() => handleFormAction('test')}
								variant="ghost"
								isLoading={isPendingDraftEmail}
							>
								{isAiDraft ? 'Test Your Prompt' : 'Preview Draft'}
							</Button>
							{dataDraftEmail && !isPendingDraftEmail && (
								<PreviewDraftDialog draftEmail={dataDraftEmail} />
							)}
							<Button type="button" onClick={() => handleFormAction('submit')}>
								{isAiDraft
									? 'Generate Custom Emails for All Recipients'
									: 'Save Drafts for All Recipients'}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};

export default ComposeEmailSection;
