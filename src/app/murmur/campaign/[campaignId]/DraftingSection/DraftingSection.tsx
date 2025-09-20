import { FC } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn } from '@/utils';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
// removed unused DraftingMode/HybridBlock imports after moving mode toggles inside

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const { view = 'testing' } = props;
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
	} = useDraftingSection(props);

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div
						ref={emailStructureRef}
						className="mb-[4px] flex justify-between items-center"
					></div>
					{view !== 'drafting' && (
						<div className="flex gap-[47px] items-start justify-center overflow-visible">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									testMessage={campaign?.testMessage}
									handleGenerateTestDrafts={handleGenerateTestDrafts}
									isGenerationDisabled={isGenerationDisabled}
									isPendingGeneration={isPendingGeneration}
									isTest={isTest}
									contact={contacts?.[0]}
								/>
							</div>
							{/* Floating status panel for Testing view; fixed so it won't displace content */}
							<DraftingStatusPanel
								campaign={campaign}
								contacts={contacts || []}
								form={form}
								generationProgress={generationProgress}
							/>
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
