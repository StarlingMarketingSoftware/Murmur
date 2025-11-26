import { FC, useState } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
// EmailGeneration kept available but not used in current view
// import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { ContactsSelection } from './EmailGeneration/ContactsSelection/ContactsSelection';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';
import { DraftedEmails } from './EmailGeneration/DraftedEmails/DraftedEmails';
import { EmailWithRelations } from '@/types';

interface ExtendedDraftingSectionProps extends DraftingSectionProps {
	onOpenIdentityDialog?: () => void;
}

export const DraftingSection: FC<ExtendedDraftingSectionProps> = (props) => {
	const { view = 'testing', goToDrafting, onOpenIdentityDialog } = props;
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
		// These are kept available for future use but not in current view:
		// setGenerationProgress,
		// cancelGeneration,
		// isFirstLoad,
		// scrollToEmailStructure,
		draftingRef,
		emailStructureRef,
		isLivePreviewVisible,
		livePreviewContactId,
		livePreviewMessage,
		livePreviewSubject,
	} = useDraftingSection(props);

	const isMobile = useIsMobile();

	// State for contacts selection in the Contacts tab
	const [contactsTabSelectedIds, setContactsTabSelectedIds] = useState<Set<number>>(
		new Set()
	);
	const handleContactsTabSelection = (contactId: number) => {
		setContactsTabSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(contactId)) {
				next.delete(contactId);
			} else {
				next.add(contactId);
			}
			return next;
		});
	};

	// State for drafts selection in the Drafts tab
	const [draftsTabSelectedIds, setDraftsTabSelectedIds] = useState<Set<number>>(
		new Set()
	);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const [, setIsDraftDialogOpen] = useState(false);
	const handleDraftSelection = (draftId: number) => {
		setDraftsTabSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(draftId)) {
				next.delete(draftId);
			} else {
				next.add(draftId);
			}
			return next;
		});
	};

	// Get contact and email counts for the header box
	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: headerContacts } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0,
	});
	const { data: headerEmails, isPending: isPendingEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
	});

	const contactsCount = headerContacts?.length || 0;
	const draftEmails = (headerEmails || []).filter((e) => e.status === EmailStatus.draft);
	const draftCount = draftEmails.length;
	const sentEmails = (headerEmails || []).filter((e) => e.status === EmailStatus.sent);
	const sentCount = sentEmails.length;

	const toListNames =
		campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const fromName = campaign?.identity?.name || '';
	const fromEmail = campaign?.identity?.email || '';

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div
						ref={emailStructureRef}
						className="mb-[4px] flex justify-between items-center"
					></div>
					{view === 'testing' && (
						<div className="relative">
							{/* Desktop: Campaign header box positioned to the left */}
							{!isMobile && (
								<div
									className="absolute hidden lg:block"
									style={{
										right: 'calc(50% + 250px + 24px)',
										top: '0',
									}}
								>
									<CampaignHeaderBox
										campaignId={campaign?.id}
										campaignName={campaign?.name || 'Untitled Campaign'}
										toListNames={toListNames}
										fromName={fromName}
										contactsCount={contactsCount}
										draftCount={draftCount}
										sentCount={sentCount}
										onFromClick={onOpenIdentityDialog}
									/>
								</div>
							)}
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
									left: 'calc(50% + 250px + 50px)',
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
						{/* Drafts tab - show only the drafts table centered */}
						{view === 'drafting' && (
							<div className="flex items-center justify-center min-h-[300px]">
								<DraftedEmails
									contacts={contacts || []}
									selectedDraftIds={draftsTabSelectedIds}
									selectedDraft={selectedDraft}
									setSelectedDraft={setSelectedDraft}
									setIsDraftDialogOpen={setIsDraftDialogOpen}
									handleDraftSelection={handleDraftSelection}
									draftEmails={draftEmails}
									isPendingEmails={isPendingEmails}
									setSelectedDraftIds={setDraftsTabSelectedIds}
									onSend={async () => {
										// Send functionality - placeholder
									}}
									isSendingDisabled={false}
									isFreeTrial={false}
									fromName={fromName}
									fromEmail={fromEmail}
									subject={form.watch('subject')}
								/>
							</div>
						)}
					</div>

					{/* Contacts tab - show the contacts table */}
					{view === 'contacts' && (
						<div className="flex items-center justify-center min-h-[300px]">
							<ContactsSelection
								contacts={contacts || []}
								selectedContactIds={contactsTabSelectedIds}
								setSelectedContactIds={setContactsTabSelectedIds}
								handleContactSelection={handleContactsTabSelection}
							/>
						</div>
					)}

					{/* Sent tab - show the sent emails table */}
					{view === 'sent' && (
						<div className="flex items-center justify-center min-h-[300px]">
							<SentEmails emails={sentEmails} isPendingEmails={isPendingEmails} />
						</div>
					)}

					{/* Placeholder content for future tabs */}
					{(view === 'search' || view === 'inbox' || view === 'all') && (
						<div className="flex items-center justify-center min-h-[300px] text-gray-400">
							{/* Blank for now */}
						</div>
					)}

					{/* Mobile-only: show the Drafting status panel inside the Drafting tab - disabled for now */}
					{/* {view === 'drafting' && isMobile && (
						<div className="mt-6 lg:hidden w-screen max-w-none px-3 flex justify-center">
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
					)} */}
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
