import { FC, useRef } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
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
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { DraftingMode } from '@prisma/client';
import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { ChevronDown } from 'lucide-react';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		campaign,
		contacts,
		draftingMode,
		form,
		handleGenerateTestDrafts,
		isAiSubject,
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
	} = useDraftingSection(props);

	const draftingRef = useRef<HTMLDivElement>(null);
	const emailStructureRef = useRef<HTMLDivElement>(null);

	const scrollToDrafting = () => {
		if (draftingRef.current) {
			const yOffset = -20; // Small offset from top
			const element = draftingRef.current;
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
		}
	};

	const scrollToEmailStructure = () => {
		if (emailStructureRef.current) {
			const yOffset = -20; // Small offset from top
			const element = emailStructureRef.current;
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
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
						<div
							ref={emailStructureRef}
							className="mb-3 flex justify-between items-center"
						>
							<FormLabel className="font-inter font-normal">Email Structure</FormLabel>
							{isDraftingContentReady() && (
								<button
									type="button"
									onClick={scrollToDrafting}
									className="flex items-center gap-1 text-[#AFAFAF] font-inter font-medium text-[14px] hover:text-[#8F8F8F] transition-colors"
								>
									to Drafting
									<ChevronDown size={16} />
								</button>
							)}
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
							className={`transition-opacity duration-500 ease-in-out ${
								isDraftingContentReady() ? 'opacity-100' : 'opacity-0 pointer-events-none'
							}`}
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
