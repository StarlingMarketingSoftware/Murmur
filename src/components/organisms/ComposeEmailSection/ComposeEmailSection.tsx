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
import { Brain, FlaskConical, SaveIcon, WandSparklesIcon } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { AiModelOptions } from '@/constants/constants';
import PreviewTestDraftDialog from '../_dialogs/PreviewTestDraftDialog/PreviewTestDraftDialog';
import { FC } from 'react';
import useComposeEmailSection, {
	ComposeEmailSectionProps,
} from './useComposeEmailSection';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ManageSignaturesDialog } from '../_dialogs/ManageSignaturesDialog/ManageSignaturesDialog';
import ProgressIndicator from '../../molecules/ProgressIndicator/ProgressIndicator';
import { ConfirmDialog } from '../_dialogs/ConfirmDialog/ConfirmDialog';
import { ellipsesText } from '@/app/utils/string';

const ComposeEmailSection: FC<ComposeEmailSectionProps> = (props) => {
	const {
		form,
		isAiDraft,
		isAiSubject,
		setIsAiSubject,
		handleFormAction,
		isTest,
		isPendingDraftEmail,
		dataDraftEmail,
		trigger,
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		aiTestCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		isDirty,
		campaign,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
	} = useComposeEmailSection(props);

	return (
		<>
			{campaign?.contacts.length === 0 && (
				<Alert variant="warning">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No Recipients</AlertTitle>
					<AlertDescription>
						You have not selected any recipients for this campaign. Please return to step
						1 and select at least one before generating emails.
					</AlertDescription>
				</Alert>
			)}
			<Card>
				<CardContent className="space-y-2">
					{/* <ToggleGroup
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

					<ToggleGroupItem value="compose" disabled>
						<PenLine />
						Compose
					</ToggleGroupItem>
				</ToggleGroup> */}
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
										<FormItem className="col-span-10 sm:col-span-11">
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
									className="w-5 -translate-y-1 col-span-2 sm:col-span-1"
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
							<div className="flex flex-col sm:flex-row gap-4">
								{isAiDraft && (
									<FormField
										control={form.control}
										name="aiModel"
										render={({ field }) => (
											<FormItem>
												<FormLabel>AI Model</FormLabel>
												<FormControl>
													<Select
														onValueChange={field.onChange}
														defaultValue={field.value}
													>
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
								<div className="flex flex-row gap-4 w-full">
									<div className="w-full sm:w-fit">
										<FormLabel>Signatures</FormLabel>
										<ManageSignaturesDialog
											campaign={campaign}
											handleSavePrompt={() => handleSavePrompt(true)}
										/>
									</div>
									<div className="w-full sm:w-fit">
										<FormLabel>Selected Signature</FormLabel>
										<Button className="w-full max-w-[150px]" variant="outline" disabled>
											{selectedSignature
												? ellipsesText(selectedSignature.name, 18)
												: 'No Signature Selected'}
										</Button>
									</div>
								</div>
							</div>

							<div className="flex flex-col gap-4">
								<div className="flex gap-4">
									<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-fit">
										<Button
											type="button"
											className="w-full sm:w-fit"
											onClick={() => handleFormAction('test')}
											variant="outline"
											isLoading={isTest && isPendingDraftEmail}
											disabled={
												campaign?.contacts.length === 0 ||
												isPendingDraftEmail ||
												(isAiDraft && aiTestCredits === 0)
											}
										>
											<FlaskConical />
											{isAiDraft ? 'Test Your Prompt' : 'Preview Draft'}
										</Button>
										{dataDraftEmail.message.length > 0 && (
											<PreviewTestDraftDialog draftEmail={dataDraftEmail} />
										)}
									</div>

									{isAiDraft && (
										<Badge variant="outline">Test Credits: {aiTestCredits}</Badge>
									)}
								</div>
								<Separator />
								<div className="flex flex-col sm:flex-row gap-4">
									<Button
										type="button"
										onClick={async (e) => {
											e.stopPropagation();
											const isValid = await trigger();
											if (!isValid) {
												e.preventDefault(); // Prevent modal from opening
												return;
											}
											setIsConfirmDialogOpen(true);
										}}
										isLoading={isPendingDraftEmail && !isTest}
										disabled={
											campaign?.contacts.length === 0 ||
											isPendingDraftEmail ||
											aiDraftCredits === 0
										}
									>
										<WandSparklesIcon />
										{isAiDraft
											? 'Generate Emails for All Recipients'
											: 'Save Drafts for All Recipients'}
									</Button>
									<Button
										type="button"
										onClick={() => handleSavePrompt(false)}
										variant="default"
										isLoading={isPendingSavePrompt}
									>
										<SaveIcon /> Save Section
									</Button>
									{isDirty && <Badge variant="warning">You have unsaved changes</Badge>}
								</div>
							</div>
							<ConfirmDialog
								title="Confirm Batch Generation of Emails"
								confirmAction={() => {
									handleFormAction('submit');
								}}
								open={isConfirmDialogOpen}
								onOpenChange={setIsConfirmDialogOpen}
							>
								Are you sure you want to generate emails for all selected recipients?
								<br /> <br />
								This action will have AI create a custom email for each recipient based on
								the prompt you provided and will count towards your monthly usage limits.
							</ConfirmDialog>
						</form>
					</Form>
				</CardContent>
			</Card>
			<ProgressIndicator
				progress={generationProgress}
				setProgress={setGenerationProgress}
				total={campaign.contacts.length}
				pendingMessage="Generating {{progress}} emails..."
				completeMessage="Finished generating {{progress}} emails."
				cancelAction={cancelGeneration}
			/>
		</>
	);
};

export default ComposeEmailSection;
