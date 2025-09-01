import { FC } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { FormLabel, Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		campaign,
		contacts,
		form,
		handleGenerateTestDrafts,
		isDraftingContentReady,
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
		scrollToDrafting,
		scrollToEmailStructure,
	} = useDraftingSection(props);

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div className="w-[892px]">
						<div
							ref={emailStructureRef}
							className="mb-[4px] flex justify-between items-center"
						>
							<FormLabel className="font-inter font-medium">Email structure</FormLabel>
							<div className="flex items-center gap-4">
								{isDraftingContentReady() && (
									<>
										<Button
											type="button"
											onClick={scrollToDrafting}
											variant="ghost"
											className="flex items-center !p-0 h-fit !m-0 gap-1 text-[#AFAFAF] font-inter font-medium text-[14px] hover:text-[#8F8F8F] transition-colors"
										>
											to Drafting
											<ChevronDown size={16} />
										</Button>
									</>
								)}
							</div>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									testMessage={campaign?.testMessage}
									handleGenerateTestDrafts={handleGenerateTestDrafts}
									isGenerationDisabled={isGenerationDisabled}
									isPendingGeneration={isPendingGeneration}
									isTest={isTest}
								/>
							</div>
						</div>

						<div
							ref={draftingRef}
							className={cn(
								'transition-opacity duration-500 ease-in-out',
								isDraftingContentReady() ? 'opacity-100' : 'opacity-0 pointer-events-none'
							)}
						>
							{isDraftingContentReady() && (
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
								/>
							)}
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
