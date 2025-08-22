import { FC, ReactNode } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { DraftingMode } from '@prisma/client';
import { cn } from '@/utils';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		autosaveStatus,
		campaign,
		cancelGeneration,
		contacts,
		draftingMode,
		form,
		generationProgress,
		handleGenerateDrafts,
		handleGenerateTestDrafts,
		isAiSubject,
		isConfirmDialogOpen,
		isGenerationDisabled,
		isJustSaved,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		setGenerationProgress,
		setIsConfirmDialogOpen,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
	} = useDraftingSection(props);

	const {
		formState: { isDirty },
	} = form;

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
					<div className="w-[892px]">
						<div className="mb-4">
							<FormField
								control={form.control}
								name="subject"
								rules={{
									required: isAiSubject,
								}}
								render={({ field }) => (
									<FormItem className="w-[892px]">
										<div className="flex items-center gap-2">
											<FormLabel>Subject</FormLabel>
											<Separator orientation="vertical" className="!h-5" />
											<Switch
												checked={isAiSubject}
												disabled={draftingMode === DraftingMode.handwritten}
												onCheckedChange={(val: boolean) =>
													form.setValue('isAiSubject', val)
												}
												className="data-[state=checked]:bg-primary -translate-y-[2px]"
											/>
											<FormLabel className="">Automated Subject</FormLabel>
										</div>
										<FormControl>
											<Input
												className="w-full h-[44px]"
												placeholder={
													isAiSubject ? 'Automated subject...' : 'Enter subject...'
												}
												disabled={isAiSubject}
												{...field}
												onFocus={(e) =>
													!isAiSubject && trackFocusedField('subject', e.target)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="mb-3">
							<FormLabel>Email Template</FormLabel>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									testMessage={campaign?.testMessage}
								/>
							</div>
						</div>
						<div className="flex justify-end mt-2 mb-2">
							<Button
								type="button"
								onClick={handleGenerateTestDrafts}
								disabled={isGenerationDisabled()}
								className={cn(
									'w-[94px] h-[39px] bg-[rgba(93,171,104,0.08)] border-2 border-[#5DAB68] text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary',
									isGenerationDisabled() ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
								)}
								style={{
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
							</Button>
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
										className="!w-[892px] !h-[39px]"
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
									Are you sure you want to generate emails for all selected recipients?
									<br /> <br />
									This action will automatically create a custom email for each recipient
									based on the prompt you provided and will count towards your monthly
									usage limits.
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
