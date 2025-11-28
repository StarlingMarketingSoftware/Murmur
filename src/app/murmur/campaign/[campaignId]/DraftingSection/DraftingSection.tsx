import { FC, useEffect, useState } from 'react';
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
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { ContactsSelection } from './EmailGeneration/ContactsSelection/ContactsSelection';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';
import { DraftedEmails } from './EmailGeneration/DraftedEmails/DraftedEmails';
import { EmailWithRelations, StripeSubscriptionStatus } from '@/types';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContactWithName } from '@/types/contact';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { TestPreviewPanel } from '@/components/molecules/TestPreviewPanel/TestPreviewPanel';
import { MiniEmailStructure } from './EmailGeneration/MiniEmailStructure';
import ContactsExpandedList from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';

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

	const { user, subscriptionTier, isFreeTrial } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

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

	const isSendingDisabled = isFreeTrial || (user?.sendingCredits || 0) === 0;

	// Selected contact for shared research panel (persistent on click)
	const [selectedContactForResearch, setSelectedContactForResearch] =
		useState<ContactWithName | null>(null);
	// Hovered contact for temporary preview
	const [hoveredContactForResearch, setHoveredContactForResearch] =
		useState<ContactWithName | null>(null);
	// Track whether the user has explicitly selected a contact (via click)
	const [hasUserSelectedResearchContact, setHasUserSelectedResearchContact] =
		useState(false);
	// Whether to show the Test Preview panel in place of the Research panel (desktop only)
	const [showTestPreview, setShowTestPreview] = useState(false);

	// Display priority: hovered contact > selected contact
	const displayedContactForResearch =
		hoveredContactForResearch || selectedContactForResearch;

	// Default to the first contact in the campaign for the research panel
	useEffect(() => {
		if (!selectedContactForResearch && contacts && contacts.length > 0) {
			setSelectedContactForResearch(contacts[0]);
		}
	}, [contacts, selectedContactForResearch]);

	// Handlers to coordinate hover / selection behavior for the research panel
	const handleResearchContactClick = (contact: ContactWithName | null) => {
		if (!contact) return;
		setSelectedContactForResearch(contact);
		setHasUserSelectedResearchContact(true);
	};

	const handleResearchContactHover = (contact: ContactWithName | null) => {
		if (contact) {
			// Always update the currently hovered contact
			setHoveredContactForResearch(contact);
			return;
		}

		// When hover ends (null), decide what to show:
		// - If the user has explicitly selected a contact, fall back to that selection
		//   by clearing the hover state.
		// - If not, keep showing the last hovered contact by leaving hover state as-is.
		if (hasUserSelectedResearchContact) {
			setHoveredContactForResearch(null);
		}
	};

	const handleSendDrafts = async () => {
		const selectedDrafts =
			draftsTabSelectedIds.size > 0
				? draftEmails.filter((d) => draftsTabSelectedIds.has(d.id))
				: draftEmails;

		if (selectedDrafts.length === 0) {
			toast.error('No drafts selected to send.');
			return;
		}

		if (!campaign?.identity?.email || !campaign?.identity?.name) {
			toast.error('Please create an Identity before sending emails.');
			return;
		}

		if (
			!subscriptionTier &&
			user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
		) {
			toast.error('Please upgrade to a paid plan to send emails.');
			return;
		}

		const sendingCredits = user?.sendingCredits || 0;
		const emailsToSend = selectedDrafts.length;

		if (sendingCredits === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		const emailsWeCanSend = Math.min(emailsToSend, sendingCredits);
		const emailsToProcess = selectedDrafts.slice(0, emailsWeCanSend);

		let successfulSends = 0;

		for (let i = 0; i < emailsToProcess.length; i++) {
			const email = emailsToProcess[i];

			try {
				const res = await sendMailgunMessage({
					subject: email.subject,
					message: email.message,
					recipientEmail: email.contact.email,
					senderEmail: campaign.identity?.email,
					senderName: campaign.identity?.name,
					originEmail:
						user?.customDomain && user?.customDomain !== ''
							? user?.customDomain
							: user?.murmurEmail,
				});

				if (res.success) {
					await updateEmail({
						id: email.id.toString(),
						data: {
							status: EmailStatus.sent,
							sentAt: new Date(),
						},
					});
					successfulSends++;
					queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
				}
			} catch (error) {
				console.error('Failed to send email:', error);
			}
		}

		if (user && successfulSends > 0) {
			const newCreditBalance = Math.max(0, sendingCredits - successfulSends);
			await editUser({
				clerkId: user.clerkId,
				data: { sendingCredits: newCreditBalance },
			});
		}

		setDraftsTabSelectedIds(new Set());

		if (successfulSends === emailsToSend) {
			toast.success(`All ${successfulSends} emails sent successfully!`);
		} else if (successfulSends > 0) {
			if (emailsWeCanSend < emailsToSend) {
				toast.warning(`Sent ${successfulSends} emails before running out of credits.`);
			} else {
				toast.warning(`${successfulSends} of ${emailsToSend} emails sent successfully.`);
			}
		} else {
			toast.error('Failed to send emails. Please try again.');
		}
	};

	const toListNames =
		campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const fromName = campaign?.identity?.name || '';
	const fromEmail = campaign?.identity?.email || '';

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center w-full">
					<div
						ref={emailStructureRef}
						className="mb-[4px] flex justify-between items-center"
					></div>

					{/* Main content wrapper to anchor the persistent Header Box */}
					<div className="relative w-full flex flex-col items-center">
					{/* Persistent Campaign Header Box for specific tabs */}
					{!isMobile && ['testing', 'contacts', 'drafting', 'sent', 'search'].includes(view) && (
							<div
								className="absolute hidden lg:flex flex-col"
								style={{
									right: 'calc(50% + 250px + 24px)',
									top: '29px',
									gap: '16px',
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
								{/* For the Writing (testing) and Search tabs, show a mini contacts table instead of mini email structure. */}
								{view === 'testing' || view === 'search' ? (
									<div
										style={{
											width: '373px',
											height: '373px',
											overflow: 'hidden',
										}}
									>
										<ContactsExpandedList
											contacts={contacts || []}
											selectedContactIds={contactsTabSelectedIds}
											onContactSelectionChange={(updater) =>
												setContactsTabSelectedIds((prev) => updater(new Set(prev)))
											}
											onContactClick={handleResearchContactClick}
											onContactHover={handleResearchContactHover}
											onDraftSelected={async (ids) => {
												await handleGenerateDrafts(ids);
											}}
											isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
											isPendingGeneration={isPendingGeneration}
											width={373}
											height={373}
										/>
									</div>
								) : (
									<div
										style={{
											width: '373px',
											height: '373px',
											// Fixed-height mini structure that uses the compact layout
											// inside; no scaling, just a tighter signature area.
											overflow: 'hidden',
										}}
									>
										<MiniEmailStructure
											form={form}
											onDraft={() =>
												handleGenerateDrafts(contacts?.map((c) => c.id) || [])
											}
											isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
											isPendingGeneration={isPendingGeneration}
											generationProgress={generationProgress}
											generationTotal={contacts?.length || 0}
											hideTopChrome
											hideFooter
											fullWidthMobile
										/>
									</div>
								)}
							</div>
						)}

						{/* Shared Research / Test Preview panel to the right of the drafting tables / writing view */}
						{!isMobile && ['testing', 'contacts', 'drafting', 'sent'].includes(view) && (
							<div
								className="absolute hidden xl:block"
								style={{
									top: '29px',
									left: 'calc(50% + 250px + 36px)',
								}}
							>
								{view === 'testing' && showTestPreview ? (
									<TestPreviewPanel
										setShowTestPreview={setShowTestPreview}
										testMessage={campaign?.testMessage || ''}
										isLoading={Boolean(isTest)}
										onTest={() => {
											handleGenerateTestDrafts();
											setShowTestPreview(true);
										}}
										isDisabled={isGenerationDisabled()}
										isTesting={Boolean(isTest)}
										contact={contacts?.[0] || displayedContactForResearch}
										style={{ width: 375, height: 630 }}
									/>
								) : (
									<ContactResearchPanel contact={displayedContactForResearch} />
								)}
							</div>
						)}

						{view === 'testing' && (
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
									onTestPreviewToggle={setShowTestPreview}
								/>
								{/* Right panel for Testing view - positioned absolutely */}
								{false && (
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
								)}
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
										onSend={handleSendDrafts}
										isSendingDisabled={isSendingDisabled}
										isFreeTrial={isFreeTrial || false}
										fromName={fromName}
										fromEmail={fromEmail}
										subject={form.watch('subject')}
										onContactClick={handleResearchContactClick}
										onContactHover={handleResearchContactHover}
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
									campaign={campaign}
									onDraftEmails={async (ids) => {
										await handleGenerateDrafts(ids);
									}}
									isDraftingDisabled={isGenerationDisabled() || isPendingGeneration}
									onContactClick={handleResearchContactClick}
									onContactHover={handleResearchContactHover}
								/>
							</div>
						)}

						{/* Sent tab - show the sent emails table */}
						{view === 'sent' && (
							<div className="flex items-center justify-center min-h-[300px]">
								<SentEmails
									emails={sentEmails}
									isPendingEmails={isPendingEmails}
									onContactClick={handleResearchContactClick}
									onContactHover={handleResearchContactHover}
								/>
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
