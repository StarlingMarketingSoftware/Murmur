import { FC } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { DraftingRightPanel } from '@/components/organisms/DraftingRightPanel/DraftingRightPanel';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';
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
import { Switch } from '@/components/ui/switch';
import { SaveIcon } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { FONT_OPTIONS } from '@/constants';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ManageSignaturesDialog } from '@/components/organisms/_dialogs/ManageSignaturesDialog/ManageSignaturesDialog';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { Signature } from '@prisma/client';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { HandwrittenPromptInput } from '@/components/molecules/HandwrittenPromptInput/HandwrittenPromptInput';
import { Typography } from '@/components/ui/typography';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		campaign,
		modeOptions,
		form,
		setIsConfirmDialogOpen,
		cancelGeneration,
		generationProgress,
		setGenerationProgress,
		contacts,
		isConfirmDialogOpen,
		isPendingGeneration,
		isAiSubject,
		isPendingSaveCampaign,
		handleSavePrompt,
		isTest,
		signatures,
		isOpenSignaturesDialog,
		setIsOpenSignaturesDialog,
		selectedSignature,
		draftingMode,
		handleGenerateTestDrafts,
		handleGenerateDrafts,
	} = useDraftingSection(props);

	const {
		formState: { isDirty },
	} = form;

	return (
		<>
			<Form {...form}>
				<form>
					<div className="flex gap-4">
						<div className="w-1/2">
							<div className="mt-6">
								<BlockTabs
									options={modeOptions}
									activeValue={draftingMode}
									onValueChange={(val) => form.setValue('draftingMode', val)}
								/>
								<div className="mt-5">
									<FormField
										control={form.control}
										name="subject"
										rules={{
											required: isAiSubject,
										}}
										render={({ field }) => (
											<FormItem>
												<div className="flex items-center gap-2">
													<FormLabel>Subject</FormLabel>
													<Separator orientation="vertical" className="!h-5" />
													<Switch
														disabled={draftingMode === 'handwritten'}
														checked={isAiSubject}
														onCheckedChange={(val: boolean) =>
															form.setValue('isAiSubject', val)
														}
														className="data-[state=checked]:bg-primary -translate-y-[2px]"
													/>
													<FormLabel className="">AI Subject</FormLabel>
												</div>
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
								</div>
								{draftingMode === 'ai' && (
									<FormField
										control={form.control}
										name="fullAiPrompt"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{'AI Prompt'}</FormLabel>
												<FormControl>
													<Textarea
														className="h-[530px]"
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
								)}
								{draftingMode === 'hybrid' && <HybridPromptInput />}
								<div>
									{draftingMode === 'handwritten' && <HandwrittenPromptInput />}
									<div className="flex flex-col sm:flex-row gap-2 w-full">
										<FormField
											control={form.control}
											name="font"
											render={({ field }) => (
												<FormItem className="w-full mb-2">
													<FormLabel>Font</FormLabel>
													<FormControl>
														<Select
															disabled={draftingMode === 'handwritten'}
															onValueChange={field.onChange}
															defaultValue={field.value}
														>
															<SelectTrigger className="w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectGroup>
																	<SelectLabel>Font</SelectLabel>
																	{FONT_OPTIONS.map((font) => (
																		<SelectItem key={font} value={font}>
																			<span style={{ fontFamily: font }}>{font}</span>
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
											name="signatureId"
											render={({ field }) => (
												<FormItem className="w-full mb-2 relative">
													<FormLabel>Signature</FormLabel>
													<FormControl>
														<Select
															onValueChange={(value) => {
																if (value === 'manage-signatures') {
																	setIsOpenSignaturesDialog(true);
																	return;
																}
																field.onChange(Number(value));
															}}
															defaultValue={field.value?.toString()}
															value={field.value ? field.value.toString() : ''}
														>
															<SelectTrigger className="!w-full">
																<SelectValue placeholder="Select signature" />
															</SelectTrigger>
															<SelectContent>
																<SelectGroup>
																	<SelectLabel>Signatures</SelectLabel>
																	{signatures && signatures.length > 0 ? (
																		signatures.map((signature: Signature) => (
																			<SelectItem
																				key={signature.id}
																				value={signature.id.toString()}
																			>
																				{signature.name}
																			</SelectItem>
																		))
																	) : (
																		<SelectItem value="no-signatures" disabled>
																			No signatures available
																		</SelectItem>
																	)}
																	<Separator className="my-1" />{' '}
																</SelectGroup>
																<SelectGroup>
																	<SelectItem value="manage-signatures">
																		Manage Signatures
																	</SelectItem>
																</SelectGroup>
															</SelectContent>
														</Select>
													</FormControl>
													<div className="w-full bg-gray-200 h-5 absolute -bottom-3" />
												</FormItem>
											)}
										/>
									</div>
									<RichTextEditor
										hideMenuBar
										className="bg-gray-100 border-none h-25 min-h-0 overflow-y-auto"
										isEdit={false}
										value={selectedSignature?.content || ''}
									/>

									<div className="flex flex-col gap-4 mt-4">
										<div className="flex flex-col sm:flex-row gap-4">
											<Button
												type="button"
												variant="light"
												onClick={handleSavePrompt}
												isLoading={isPendingSaveCampaign}
											>
												<SaveIcon /> Save Prompt
											</Button>
											<Button
												type="button"
												variant="primary-light"
												onClick={() => setIsConfirmDialogOpen(true)}
												isLoading={isPendingGeneration && !isTest}
												disabled={
													generationProgress > -1 ||
													contacts?.length === 0 ||
													isPendingGeneration
												}
											>
												Generate Drafts
											</Button>
											{isDirty && (
												<Badge variant="warning">You have unsaved changes</Badge>
											)}
										</div>
									</div>
									<ConfirmDialog
										title="Confirm Batch Generation of Emails"
										confirmAction={handleGenerateDrafts}
										open={isConfirmDialogOpen}
										onOpenChange={setIsConfirmDialogOpen}
									>
										{draftingMode === 'handwritten' ? (
											<Typography>
												Are you sure you want to generate handwritten emails for all
												selected recipients? This action will generate a custom email for
												each recipient based on the template you provided.{' '}
											</Typography>
										) : (
											<Typography>
												Are you sure you want to generate emails for all selected
												recipients?
												<br /> <br />
												This action will have AI create a custom email for each recipient
												based on the prompt you provided and will count towards your
												monthly usage limits.
											</Typography>
										)}
									</ConfirmDialog>
									<ProgressIndicator
										progress={generationProgress}
										setProgress={setGenerationProgress}
										total={contacts?.length || 0}
										pendingMessage="Generating {{progress}} emails..."
										completeMessage="Finished generating {{progress}} emails."
										cancelAction={cancelGeneration}
									/>
								</div>
							</div>
						</div>
						<div className="w-1/2">
							<DraftingRightPanel
								campaign={campaign}
								handleTestPrompt={handleGenerateTestDrafts}
								isTest={isTest}
								draftingMode={draftingMode}
							/>
						</div>
					</div>
				</form>
			</Form>

			<ManageSignaturesDialog
				campaign={campaign}
				open={isOpenSignaturesDialog}
				onOpenChange={setIsOpenSignaturesDialog}
			/>
		</>
	);
};
