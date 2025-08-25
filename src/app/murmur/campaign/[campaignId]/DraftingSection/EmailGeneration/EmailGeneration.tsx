import { FC, ReactNode } from 'react';
import { EmailGenerationProps, useEmailGeneration } from './useEmailGeneration';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';

import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { cn } from '@/utils';
import { ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { ConfirmSendDialog } from '@/components/organisms/_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Badge } from '@/components/ui/badge';
import { ContactsSelection } from './ContactsSelection/ContactsSelection';
import { DraftedEmails } from './DraftedEmails/DraftedEmails';

export const EmailGeneration: FC<EmailGenerationProps> = (props) => {
	const {
		campaign,
		setSelectedContactIds,
		contacts,
		selectedContactIds,
		handleContactSelection,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		isPendingGeneration,
		isTest,
		isGenerationDisabled,
		setSelectedDraftIds,
		setSelectedDraft,
		selectedDraftIds,
		isSendingDisabled,
		isFreeTrial,
		setSendingProgress,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		generationTotal,
		handleDraftSelection,
		selectedDraft,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		cancelGeneration,
		sendingProgress,
		form,
		autosaveStatus,
		isJustSaved,
		draftEmails,
		isPendingEmails,
		isWaitingForConfirm,
		handleDraftButtonClick,
	} = useEmailGeneration(props);

	const {
		formState: { isDirty },
	} = form;

	// Debug helper
	const isDraftDisabled = () => {
		const genDisabled = isGenerationDisabled();
		const noSelection = selectedContactIds.size === 0;
		console.log('Draft button disabled check:', {
			isGenerationDisabled: genDisabled,
			selectedContactIds: selectedContactIds.size,
			noSelection,
			overall: genDisabled || noSelection,
		});
		return genDisabled || noSelection;
	};

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
		<>
			<div className="mb-3 mt-6">
				<FormLabel className="font-inter font-normal">Drafting</FormLabel>
			</div>
			<div className="flex gap-[47px] items-start">
				<div className="flex-shrink-0">
					<div className="relative flex flex-row w-[892px] h-[560px] border-[3px] border-black rounded-lg overflow-x-hidden p-[17px]">
						{/* Left table container */}
						<ContactsSelection
							contacts={contacts}
							selectedContactIds={selectedContactIds}
							setSelectedContactIds={setSelectedContactIds}
							handleContactSelection={handleContactSelection}
							generationProgress={generationProgress}
							generationTotal={generationTotal}
						/>

						{/* Generate Drafts Button - Absolutely centered */}
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
							<Button
								type="button"
								onClick={handleDraftButtonClick}
								disabled={isDraftDisabled()}
								className={cn(
									'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black font-inter font-medium rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] active:border-[#3d7346] h-[52px] w-[95px] flex items-center justify-center appearance-none text-sm font-inter p-0 m-0 leading-normal box-border text-center',
									isDraftDisabled()
										? 'opacity-50 cursor-not-allowed hover:bg-[rgba(93,171,104,0.47)] hover:border-[#5DAB68]'
										: ''
								)}
								noPadding
							>
								{isPendingGeneration && !isTest ? (
									<Spinner size="small" />
								) : isWaitingForConfirm ? (
									<span className="flex flex-col items-center leading-tight">
										<span className="text-xs">Click to</span>
										<span className="text-sm font-semibold">Confirm</span>
									</span>
								) : (
									<span className="flex items-center gap-1">
										Draft
										<ChevronRight size={16} />
									</span>
								)}
							</Button>
						</div>

						{/* Right table - push to the end */}
						<div className="ml-auto">
							<DraftedEmails
								selectedDraftIds={selectedDraftIds}
								setSelectedDraftIds={setSelectedDraftIds}
								draftEmails={draftEmails}
								isPendingEmails={isPendingEmails}
								contacts={contacts}
								setSelectedDraft={setSelectedDraft}
								setIsDraftDialogOpen={setIsDraftDialogOpen}
								handleDraftSelection={handleDraftSelection}
							/>
						</div>
					</div>
				</div>
			</div>

			<div>
				<div className="flex flex-col gap-4 mt-4">
					{getAutosaveStatusDisplay() && (
						<div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
							{getAutosaveStatusDisplay()}
						</div>
					)}
					{draftEmails.length > 0 && (
						<div className="flex justify-end">
							{isSendingDisabled ? (
								<UpgradeSubscriptionDrawer
									triggerButtonText="Send"
									className={`!w-[891px] !h-[39px] !bg-[rgba(93,171,104,0.47)] !border-2 !border-[#5DAB68] !text-black !font-bold !flex !items-center !justify-center ${
										selectedDraftIds.size === 0
											? '!opacity-50 !cursor-not-allowed hover:!bg-[rgba(93,171,104,0.47)] hover:!border-[#5DAB68]'
											: 'hover:!bg-[rgba(93,171,104,0.6)] hover:!border-[#5DAB68] active:!bg-[rgba(93,171,104,0.7)]'
									}`}
									message={
										isFreeTrial
											? `Your free trial subscription does not include the ability to send emails. To send the emails you've drafted, please upgrade your subscription to the paid version.`
											: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
									}
								/>
							) : (
								<ConfirmSendDialog
									setSendingProgress={setSendingProgress}
									campaign={campaign}
									draftEmails={draftEmails.filter((d) => selectedDraftIds.has(d.id))}
									disabled={selectedDraftIds.size === 0}
								/>
							)}
						</div>
					)}
				</div>
			</div>
			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
				isEditable={true}
			/>
		</>
	);
};
