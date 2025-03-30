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
import {
	addCompletedDrafts,
	setCompletedDrafts,
	setCurrentTestDraft,
} from '@/lib/redux/features/murmur/murmurSlice';
import { Draft } from '@/constants/types';
import PreviewDraftDialog from '../../PreviewDraftDialog';
import ConfirmModal from '@/components/ConfirmModal';

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
	const [isTest, setIsTest] = useState<boolean>(false);
	const murmurState = useAppSelector((state) => state.murmur);

	const dispatch = useAppDispatch();

	const { dataDraftEmail, isPendingDraftEmail, draftEmail, draftEmailAsync } =
		usePerplexityDraftEmail();

	const form = useForm<z.infer<ReturnType<typeof getEmailDraftSchema>>>({
		resolver: zodResolver(getEmailDraftSchema(isAiSubject)),
		defaultValues: {
			subject: '',
			message: '',
			aiModel: 'sonar',
		},
		mode: 'onChange',
		reValidateMode: 'onChange',
	});

	const {
		trigger,
		getValues,
		formState: { errors },
	} = form;

	const handleFormAction = async (action: 'test' | 'submit') => {
		// Check form validity first
		const isValid = await trigger();
		if (!isValid) return;

		const values = getValues();

		if (action === 'test') {
			setIsTest(true);
			// if error, don't cost the user any tokens
			const res: Draft = await draftEmailAsync({
				generateSubject: isAiSubject,
				model: values.aiModel,
				recipient: murmurState.selectedRecipients[0],
				prompt: values.message,
			});
			dispatch(setCurrentTestDraft(res));
		} else if (isAiDraft) {
			for (const recipient of murmurState.selectedRecipients) {
				const newDraft: Draft = await draftEmailAsync({
					generateSubject: isAiSubject,
					model: values.aiModel,
					recipient,
					prompt: values.message,
				});
				if (newDraft) {
					if (!isAiSubject) {
						newDraft.subject = values.subject ? values.subject : newDraft.subject;
					}
					dispatch(addCompletedDrafts(newDraft));
				}
			}
		}
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
								isLoading={isTest && isPendingDraftEmail}
							>
								{isAiDraft ? 'Test Your Prompt' : 'Preview Draft'}
							</Button>
							{isTest && dataDraftEmail && !isPendingDraftEmail && (
								<PreviewDraftDialog draftEmail={dataDraftEmail} />
							)}
							<ConfirmModal
								title="Confirm Batch Generation of Emails"
								confirmAction={() => handleFormAction('submit')}
								triggerButton={
									<Button
										type="button"
										onClick={async (e) => {
											// e.preventDefault();
											e.stopPropagation();
											await trigger();
											const hasErrors = Object.keys(errors).length > 0;
											if (hasErrors) {
												return;
											}
										}}
									>
										{isAiDraft
											? 'Generate Custom Emails for All Recipients'
											: 'Save Drafts for All Recipients'}
									</Button>
								}
							>
								Are you sure you want to generate emails for all selected recipients?
								<br /> <br />
								This action will have AI create a custom email for each recipient based on
								the prompt you provided and will count towards your monthly usage limits.
							</ConfirmModal>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};

export default ComposeEmailSection;
