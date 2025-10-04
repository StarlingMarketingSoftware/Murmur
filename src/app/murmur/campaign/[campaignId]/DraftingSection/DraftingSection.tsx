import { FC } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
// removed unused DraftingMode/HybridBlock imports after moving mode toggles inside

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const { view = 'testing', goToDrafting } = props;
	const {
		campaign,
		contacts,
		form,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		isFirstLoad,
		draftingRef,
		emailStructureRef,
		scrollToEmailStructure,
		// draftingMode,
		isLivePreviewVisible,
		livePreviewContactId,
		livePreviewMessage,
		livePreviewSubject,
	} = useDraftingSection(props);

	const isMobile = useIsMobile();

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div
						ref={emailStructureRef}
						className="mb-[4px] flex justify-between items-center"
					></div>
					{view !== 'drafting' && (
						<div className="relative">
							<HybridPromptInput
								trackFocusedField={trackFocusedField}
								testMessage={campaign?.testMessage}
								handleGenerateTestDrafts={handleGenerateTestDrafts}
								isGenerationDisabled={isGenerationDisabled}
								isPendingGeneration={isPendingGeneration}
								isTest={isTest}
								contact={contacts?.[0]}
								onGoToDrafting={goToDrafting}
							/>
							{/* Right panel for Testing view - positioned absolutely */}
							<div
								className="absolute hidden lg:block"
								style={{
									left: 'calc(50% + 446px + 50px)',
									top: '0',
								}}
							>
								<DraftingStatusPanel
									campaign={campaign}
									contacts={contacts || []}
									form={form}
									generationProgress={generationProgress}
									onOpenDrafting={goToDrafting}
									isGenerationDisabled={isGenerationDisabled}
									isPendingGeneration={isPendingGeneration}
									isLivePreviewVisible={isLivePreviewVisible}
									livePreviewContactId={livePreviewContactId || undefined}
									livePreviewSubject={livePreviewSubject}
									livePreviewMessage={livePreviewMessage}
									onDraftSelectedContacts={async (ids) => {
										await handleGenerateDrafts(ids);
									}}
								/>
							</div>
						</div>
					)}

					<div
						ref={draftingRef}
						className={cn('transition-opacity duration-500 ease-in-out')}
					>
						{view !== 'testing' && (
							<EmailGeneration
								campaign={campaign}
								contacts={contacts || []}
								isGenerationDisabled={isGenerationDisabled}
								isPendingGeneration={isPendingGeneration}
								isTest={isTest}
								form={form}
								handleGenerateDrafts={handleGenerateDrafts}
								generationProgress={generationProgress}
								setGenerationProgress={setGenerationProgress}
								cancelGeneration={cancelGeneration}
								isFirstLoad={isFirstLoad}
								scrollToEmailStructure={scrollToEmailStructure}
								isLivePreviewVisible={isLivePreviewVisible}
								livePreviewContactId={livePreviewContactId}
								livePreviewMessage={livePreviewMessage}
							/>
						)}
					</div>

					{/* Mobile-only: show the Drafting status panel inside the Drafting tab */}
					{view === 'drafting' && isMobile && (
						<div className="mt-6 lg:hidden w-screen max-w-none px-3 flex justify-end">
							<DraftingStatusPanel
								campaign={campaign}
								contacts={contacts || []}
								form={form}
								generationProgress={generationProgress}
								onOpenDrafting={goToDrafting}
								isGenerationDisabled={isGenerationDisabled}
								isPendingGeneration={isPendingGeneration}
								isLivePreviewVisible={isLivePreviewVisible}
								livePreviewContactId={livePreviewContactId || undefined}
								livePreviewSubject={livePreviewSubject}
								livePreviewMessage={livePreviewMessage}
								onDraftSelectedContacts={async (ids) => {
									await handleGenerateDrafts(ids);
								}}
							/>
						</div>
					)}
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
