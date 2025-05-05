import { Button } from '@/components/ui/button';
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
import { AiModelOptions, FontOptions } from '@/constants/constants';
import PreviewTestDraftDialog from '../../_dialogs/PreviewTestDraftDialog/PreviewTestDraftDialog';
import { FC } from 'react';
import useAiCompose, { AiComposeProps } from './useAiCompose';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ManageSignaturesDialog } from '../../_dialogs/ManageSignaturesDialog/ManageSignaturesDialog';
import ProgressIndicator from '../../../molecules/ProgressIndicator/ProgressIndicator';
import { ConfirmDialog } from '../../_dialogs/ConfirmDialog/ConfirmDialog';
import { ellipsesText } from '@/app/utils/string';

const AiCompose: FC<AiComposeProps> = (props) => {
	const {
		form,
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
	} = useAiCompose(props);

	return (
		<>
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
											disabled={isAiSubject}
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
						>
							<Brain />
						</Toggle>
					</div>
					<FormField
						control={form.control}
						name="message"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{'AI Prompt'}</FormLabel>
								<FormControl>
									<Textarea
										className="h-[200px]"
										placeholder={
											'Write your prompt for the AI here. For example:\n"Draft an email to schedule a meeting with the marketing team to discuss our Q2 strategy."\nBased on this prompt, the AI will generate a custom email for each recipient.'
										}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex flex-col sm:flex-row gap-4">
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
						<FormField
							control={form.control}
							name="font"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Font</FormLabel>
									<FormControl>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<SelectTrigger className="w-[180px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>Font</SelectLabel>
													{FontOptions.map((font) => (
														<SelectItem key={font} value={font}>
															{font}
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
										aiTestCredits === 0
									}
								>
									<FlaskConical />
									Test Your Prompt
								</Button>
								{dataDraftEmail.message.length > 0 && (
									<PreviewTestDraftDialog draftEmail={dataDraftEmail} />
								)}
							</div>

							<Badge variant="outline">Test Credits: {aiTestCredits}</Badge>
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
								Generate Emails for All Recipients
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
						This action will have AI create a custom email for each recipient based on the
						prompt you provided and will count towards your monthly usage limits.
					</ConfirmDialog>
				</form>
			</Form>
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

export default AiCompose;
