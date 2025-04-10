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
import { Brain, PenLine } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import { AiModelOptions } from '@/constants/constants';
import PreviewTestDraftDialog from './PreviewTestDraftDialog/PreviewTestDraftDialog';
import { FC } from 'react';
import useComposeEmailSection, {
	ComposeEmailSectionProps,
} from './useComposeEmailSection';
import { Separator } from '@/components/ui/separator';
import { TypographyMuted, TypographyP } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';

const ComposeEmailSection: FC<ComposeEmailSectionProps> = (props) => {
	const {
		form,
		isAiDraft,
		setIsAiDraft,
		isAiSubject,
		setIsAiSubject,
		handleFormAction,
		isTest,
		isPendingDraftEmail,
		dataDraftEmail,
		trigger,
		errors,
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		aiTestCredits,
	} = useComposeEmailSection(props);

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
						{isAiDraft && (
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
						)}
						<div className="flex flex-col gap-4">
							<div className="flex gap-4">
								<Button
									type="button"
									onClick={() => handleFormAction('test')}
									variant="outline"
									isLoading={isTest && isPendingDraftEmail}
									disabled={isPendingDraftEmail || (isAiDraft && aiTestCredits === 0)}
								>
									{isAiDraft ? 'Test Your Prompt' : 'Preview Draft'}
								</Button>
								{dataDraftEmail && <PreviewTestDraftDialog draftEmail={dataDraftEmail} />}
								{isAiDraft && (
									<Badge variant="outline">Test Credits: {aiTestCredits}</Badge>
								)}
							</div>
							<Separator />
							<div className="flex gap-4">
								<ConfirmDialog
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
											isLoading={isPendingDraftEmail && !isTest}
											disabled={isPendingDraftEmail || aiDraftCredits === 0}
										>
											{isAiDraft
												? 'Generate Custom Emails for All Recipients'
												: 'Save Drafts for All Recipients'}
										</Button>
									}
								>
									Are you sure you want to generate emails for all selected recipients?
									<br /> <br />
									This action will have AI create a custom email for each recipient based
									on the prompt you provided and will count towards your monthly usage
									limits.
								</ConfirmDialog>
								{/* <Separator className="!h-auto" orientation="vertical" /> */}
								<Button
									className=""
									type="button"
									onClick={handleSavePrompt}
									variant="default"
									isLoading={isPendingSavePrompt}
								>
									{/* {isAiDraft ? 'Save Prompt' : 'Save Message'} */}
									Save Section
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};

export default ComposeEmailSection;
