import { FC, ReactNode } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { DraftingRightPanel } from '@/components/organisms/DraftingRightPanel/DraftingRightPanel';
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
import { Typography } from '@/components/ui/typography';
import { Font } from '@/types';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { HybridBlock } from '@prisma/client';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		campaign,
		form,
		setIsConfirmDialogOpen,
		cancelGeneration,
		generationProgress,
		setGenerationProgress,
		contacts,
		isConfirmDialogOpen,
		isPendingGeneration,
		isAiSubject,
		isTest,
		signatures,
		isOpenSignaturesDialog,
		setIsOpenSignaturesDialog,
		selectedSignature,
		handleGenerateTestDrafts,
		handleGenerateDrafts,
		autosaveStatus,
		isJustSaved,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
		insertPlaceholder,
		activeTab,
		setActiveTab,
		hasFullAutomatedBlock,
	} = useDraftingSection(props);

	const {
		formState: { isDirty },
	} = form;

	// Helper function to get autosave status display
	const getAutosaveStatusDisplay = (): ReactNode => {
		switch (autosaveStatus) {
			case 'saving':
				return (
					<Badge size="small" variant="secondary" className="text-xs">
						Saving...
					</Badge>
				);
			case 'saved':
				return (
					<Badge size="small" variant="default" className="text-xs">
						Saved
					</Badge>
				);
			case 'error':
				return (
					<Badge size="small" variant="destructive" className="text-xs">
						Save failed
					</Badge>
				);
			case 'idle':
				return (
					<>
						{!isJustSaved && isDirty && autosaveStatus === 'idle' && (
							<Badge size="small" variant="warning" className="text-xs">
								Unsaved
							</Badge>
						)}
					</>
				);
			default:
				return null;
		}
	};

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div className="w-[1165px]">
						<div className="mb-4">
							<FormField
								control={form.control}
								name="subject"
								rules={{
									required: isAiSubject,
								}}
								render={({ field }) => (
									<FormItem className="w-[469px]">
										<div className="flex items-center gap-2">
											<FormLabel>Subject</FormLabel>
											<Separator orientation="vertical" className="!h-5" />
											<Switch
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
												className="w-full h-[44px]"
												placeholder={
													isAiSubject ? 'AI-generated subject...' : 'Enter subject...'
												}
												disabled={isAiSubject}
												{...field}
												onFocus={(e) => !isAiSubject && trackFocusedField('subject', e.target)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="flex justify-between items-center mb-3">
							<FormLabel>Email Template</FormLabel>
							<div className="w-[559px]">
								<BlockTabs
									activeValue={activeTab}
									onValueChange={(value) => setActiveTab(value as 'settings' | 'test' | 'placeholders')}
									options={[
										{ label: 'Settings', value: 'settings' },
										{ label: 'Test', value: 'test' },
										{ label: 'Placeholders', value: 'placeholders' },
									]}
								/>
							</div>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									signatures={signatures}
									selectedSignature={selectedSignature}
									setIsOpenSignaturesDialog={setIsOpenSignaturesDialog}
								/>
							</div>
							<div className="flex-shrink-0">
								<DraftingRightPanel
									isGenerationDisabled={isGenerationDisabled}
									campaign={campaign}
									handleTestPrompt={handleGenerateTestDrafts}
									isTest={isTest}
									draftingMode={'hybrid'}
									hasFullAutomatedBlock={hasFullAutomatedBlock}
									insertPlaceholder={insertPlaceholder}
									activeTab={activeTab}
								/>
							</div>
						</div>
						<div>
							<div className="flex flex-col gap-4 mt-4">
								<div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
									{getAutosaveStatusDisplay()}
									<Button
										type="button"
										variant="primary-light"
										onClick={() => setIsConfirmDialogOpen(true)}
										isLoading={isPendingGeneration && !isTest}
										disabled={isGenerationDisabled()}
										bold
										className="!w-[1165px] !h-[39px]"
									>
										Generate Drafts
									</Button>
								</div>
							</div>
								<ConfirmDialog
									title="Confirm Batch Generation of Emails"
									confirmAction={handleGenerateDrafts}
									open={isConfirmDialogOpen}
									onOpenChange={setIsConfirmDialogOpen}
								>
									<Typography>
										Are you sure you want to generate emails for all selected
										recipients?
										<br /> <br />
										This action will have AI create a custom email for each recipient
										based on the prompt you provided and will count towards your
										monthly usage limits.
									</Typography>
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
				</form>
			</Form>

			<ManageSignaturesDialog
				campaign={campaign}
				open={isOpenSignaturesDialog}
				onOpenChange={setIsOpenSignaturesDialog}
			/>
			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={isOpenUpgradeSubscriptionDrawer}
				setIsOpen={setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>
		</div>
	);
};
