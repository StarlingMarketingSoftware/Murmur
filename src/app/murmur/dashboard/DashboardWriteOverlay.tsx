'use client';

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { ProfileSidePanelBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { TestPreviewPanel } from '@/components/molecules/TestPreviewPanel/TestPreviewPanel';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { useDraftingSection } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { EmailStatus } from '@/constants/prismaEnums';
import { DashboardDraftReview } from './DashboardDraftReview';
import { DashboardDraftingDeck } from './DashboardDraftingDeck';
import type { CampaignWithRelations } from '@/types';

export interface DashboardDraftingStatus {
	isDrafting: boolean;
	activeContactId: number | null;
	completedContactIds: number[];
	total: number;
}

interface DashboardWriteOverlayProps {
	/** The campaign the search is in the context of (drafts land here). */
	campaign: CampaignWithRelations;
	/** Contacts to draft for — the map selection (already committed to `campaign` on open). */
	targetContactIds: number[];
	/** Switch the floating-card mode back to "Add Contacts to Folder" (also exits Write mode). */
	onSwitchToAddToFolder: () => void;
	/** Close the write overlay and abandon the current map selection. */
	onClose: () => void;
	/** Notify the parent whether the batch review is active (so it can keep the overlay mounted). */
	onReviewActiveChange?: (active: boolean) => void;
	/** Notify the parent which reviewed draft/contact is currently open. */
	onActiveReviewContactChange?: (contactId: number | null) => void;
	/** Notify the parent which selected rows should be shown as queued/active/drafted. */
	onDraftingStatusChange?: (status: DashboardDraftingStatus) => void;
	/** Shared collapsed state for the drafting deck and Selection-panel drafting bar. */
	isDraftingDeckCollapsed?: boolean;
	onDraftingDeckCollapsedChange?: (collapsed: boolean) => void;
}

// The campaign drafting panel renders natively at 499px wide; scale it down to the design's
// 449×555 box. `containerHeightPx` is applied pre-scale so the scaled height lands at 555.
const HPI_NATIVE_WIDTH_PX = 499;
const TARGET_WIDTH_PX = 449;
const TARGET_HEIGHT_PX = 555;
const HPI_SCALE = TARGET_WIDTH_PX / HPI_NATIVE_WIDTH_PX;
const HPI_CONTAINER_HEIGHT_PX = Math.round(TARGET_HEIGHT_PX / HPI_SCALE);
const PROFILE_SIDE_PANEL_NATIVE_WIDTH_PX = 393;
const PROFILE_SIDE_PANEL_NATIVE_HEIGHT_PX = 681;
const PROFILE_SIDE_PANEL_SCALE = TARGET_HEIGHT_PX / PROFILE_SIDE_PANEL_NATIVE_HEIGHT_PX;
const PROFILE_SIDE_PANEL_TOP_OFFSET_PX = 36;
// Write-tab test preview footprint, scaled to the dashboard prompt height (same as profile box).
const TEST_PREVIEW_NATIVE_WIDTH_PX = 375;
const TEST_PREVIEW_NATIVE_HEIGHT_PX = 672;
const TEST_PREVIEW_SCALE = TARGET_HEIGHT_PX / TEST_PREVIEW_NATIVE_HEIGHT_PX;

/**
 * Inline drafting panel shown over the dashboard search map when the user picks "Write Message"
 * on a map selection. Reuses the campaign Writing-tab engine (`useDraftingSection`) + the green
 * `HybridPromptInput` — scoped to the active campaign — so drafts stream straight into that
 * campaign (one Email per contact) without leaving the search. Mirrors the embedding shape proven
 * by `LandingDraftingDemo`, but wired to the real generation hook.
 */
export const DashboardWriteOverlay: FC<DashboardWriteOverlayProps> = ({
	campaign,
	targetContactIds,
	onSwitchToAddToFolder,
	onClose,
	onReviewActiveChange,
	onActiveReviewContactChange,
	onDraftingStatusChange,
	isDraftingDeckCollapsed = false,
	onDraftingDeckCollapsedChange,
}) => {
	const d = useDraftingSection({ campaign, view: 'testing' });
	const queryClient = useQueryClient();
	const { mutateAsync: editIdentity } = useEditIdentity({ suppressToasts: true });
	const [isProfileSidePanelOpen, setIsProfileSidePanelOpen] = useState(false);
	const [showTestPreview, setShowTestPreview] = useState(false);
	const [forceReviewOpen, setForceReviewOpen] = useState(false);

	// Campaign drafts, scoped to the just-drafted batch for the review.
	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: { campaignId: campaign.id },
	});
	const batchDrafts = useMemo(
		() =>
			(emails ?? [])
				.filter((e) => e.status === EmailStatus.draft)
				.filter((e) => d.writeReviewBatchContactIds.has(e.contactId)),
		[emails, d.writeReviewBatchContactIds]
	);

	// Hold the prompt box through the live-preview type-out, then flip to the review on the
	// falling edge (mirrors the campaign Write tab's `writeReviewPreviewComplete` latch).
	const [writeReviewPreviewComplete, setWriteReviewPreviewComplete] = useState(false);
	const wasBatchDraftingRef = useRef(false);
	const isBatchDraftingInProgress = d.isLivePreviewVisible;
	useEffect(() => {
		if (d.writeReviewBatchContactIds.size === 0) {
			wasBatchDraftingRef.current = false;
			setWriteReviewPreviewComplete(false);
			setForceReviewOpen(false);
			return;
		}
		if (isBatchDraftingInProgress) {
			wasBatchDraftingRef.current = true;
			setWriteReviewPreviewComplete(false);
			return;
		}
		if (wasBatchDraftingRef.current) {
			setWriteReviewPreviewComplete(true);
			return;
		}
		if (!d.isPendingGeneration && batchDrafts.length > 0) {
			setWriteReviewPreviewComplete(true);
		}
	}, [
		d.writeReviewBatchContactIds.size,
		isBatchDraftingInProgress,
		d.isPendingGeneration,
		batchDrafts.length,
	]);

	// Finish the Search-tab write flow once the batch is fully sent/deleted (after it had
	// drafts and no generation is in flight). Manual review close still returns to the prompt.
	const writeReviewSawDraftsRef = useRef(false);
	useEffect(() => {
		if (d.writeReviewBatchContactIds.size === 0) {
			writeReviewSawDraftsRef.current = false;
			return;
		}
		if (batchDrafts.length > 0) {
			writeReviewSawDraftsRef.current = true;
			return;
		}
		if (isBatchDraftingInProgress || d.isPendingGeneration) return;
		if (!writeReviewSawDraftsRef.current) return;
		onClose();
	}, [
		d.writeReviewBatchContactIds,
		batchDrafts.length,
		isBatchDraftingInProgress,
		d.isPendingGeneration,
		onClose,
	]);

	const isReviewActive =
		d.writeReviewBatchContactIds.size > 0 &&
		(writeReviewPreviewComplete || (forceReviewOpen && batchDrafts.length > 0));

	useEffect(() => {
		onReviewActiveChange?.(isReviewActive);
	}, [isReviewActive, onReviewActiveChange]);

	useEffect(() => {
		if (!isReviewActive) onActiveReviewContactChange?.(null);
	}, [isReviewActive, onActiveReviewContactChange]);

	useEffect(() => {
		if (isReviewActive) setIsProfileSidePanelOpen(false);
	}, [isReviewActive]);

	useEffect(() => {
		if (d.isLivePreviewVisible) {
			setIsProfileSidePanelOpen(false);
			setShowTestPreview(false);
		}
	}, [d.isLivePreviewVisible]);

	// `handleGetSuggestions` lives in the campaign-page component (not the hook); replicate it.
	const handleGetSuggestions = useCallback(
		async (text: string) => {
			const blocks = d.form.getValues('hybridBlockPrompts');
			const isManualMode =
				!!blocks &&
				blocks.length > 0 &&
				blocks.every((b: { type: string }) => b.type === 'text');
			if (isManualMode) {
				await d.critiqueManualEmailText(text);
			} else {
				await d.scoreFullAutomatedPrompt(text);
			}
		},
		[d]
	);

	const profileFields = useMemo(() => {
		const identityProfile = campaign.identity;
		if (!identityProfile) return null;
		return {
			name: identityProfile.name ?? '',
			genre: identityProfile.genre ?? '',
			area: identityProfile.area ?? '',
			band: identityProfile.bandName ?? '',
			bio: identityProfile.bio ?? '',
			links: identityProfile.website ?? '',
		};
	}, [campaign.identity]);

	const handleIdentityUpdate = useCallback(
		async (data: Parameters<typeof editIdentity>[0]['data']) => {
			const identityId = campaign.identity?.id;
			if (!identityId) return;
			try {
				await editIdentity({ id: identityId, data });
				queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			} catch (error) {
				toast.error('Failed to save profile changes.');
				console.error('Failed to update identity:', error);
			}
		},
		[campaign.identity?.id, editIdentity, queryClient]
	);

	useEffect(() => {
		if (!isProfileSidePanelOpen) return;
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest('[data-campaign-profile-side-panel]')) return;
			setIsProfileSidePanelOpen(false);
		};
		document.addEventListener('mousedown', handlePointerDown);
		return () => document.removeEventListener('mousedown', handlePointerDown);
	}, [isProfileSidePanelOpen]);

	// Drafting only targets contacts already in the campaign's contact list. The dashboard commits
	// the selection on open, but gate the Draft button until the refetch reflects them so the
	// engine's `targets` filter resolves (it also self-guards with a toast).
	const contactsCommitted = useMemo(
		() => targetContactIds.every((id) => d.contacts?.some((c) => c.id === id)),
		[targetContactIds, d.contacts]
	);

	const isDraftDisabled =
		targetContactIds.length === 0 || d.isContactsLoading || !contactsCommitted;

	const testPreviewContact = useMemo(
		() =>
			d.contacts?.find((contact) => targetContactIds.includes(contact.id)) ??
			d.contacts?.[0],
		[d.contacts, targetContactIds]
	);

	const handleDraftClick = async () => {
		if (isDraftDisabled) return;
		setIsProfileSidePanelOpen(false);
		setShowTestPreview(false);
		setForceReviewOpen(false);
		await d.handleGenerateDrafts(targetContactIds);
	};

	const handleTestClick = () => {
		setIsProfileSidePanelOpen(false);
		setShowTestPreview(true);
		d.handleGenerateTestDrafts();
	};

	const handleKeepTestDraft = useCallback(async () => {
		const kept = await d.keepTestDraftForReview(testPreviewContact ?? null, {
			armForReview: true,
		});
		if (kept) {
			setShowTestPreview(false);
			setWriteReviewPreviewComplete(true);
		}
		return kept;
	}, [d, testPreviewContact]);

	const livePreview = useMemo(
		() => ({
			visible: d.isLivePreviewVisible,
			contactId: d.livePreviewContactId ?? null,
			subject: d.livePreviewSubject,
			message: d.livePreviewMessage,
		}),
		[d.isLivePreviewVisible, d.livePreviewContactId, d.livePreviewSubject, d.livePreviewMessage]
	);

	const completedDraftingContactIds = useMemo(() => {
		const targetSet = new Set(targetContactIds);
		const seen = new Set<number>();
		const completed: number[] = [];
		for (const id of d.livePreviewCompletedContactIds ?? []) {
			if (!targetSet.has(id) || seen.has(id)) continue;
			seen.add(id);
			completed.push(id);
		}
		return completed;
	}, [d.livePreviewCompletedContactIds, targetContactIds]);

	const draftingTotal = d.livePreviewTotal || targetContactIds.length;

	useEffect(() => {
		onDraftingStatusChange?.({
			isDrafting: d.isLivePreviewVisible,
			activeContactId: d.livePreviewContactId ?? null,
			completedContactIds: completedDraftingContactIds,
			total: draftingTotal,
		});
	}, [
		completedDraftingContactIds,
		d.isLivePreviewVisible,
		d.livePreviewContactId,
		draftingTotal,
		onDraftingStatusChange,
	]);

	useEffect(() => {
		return () => {
			onDraftingStatusChange?.({
				isDrafting: false,
				activeContactId: null,
				completedContactIds: [],
				total: 0,
			});
		};
	}, [onDraftingStatusChange]);

	const handleCancelDrafting = useCallback(() => {
		setForceReviewOpen(false);
		d.cancelGeneration();
	}, [d]);

	const handleViewDrafts = useCallback(() => {
		if (batchDrafts.length === 0) return;
		setIsProfileSidePanelOpen(false);
		setShowTestPreview(false);
		setForceReviewOpen(true);
		setWriteReviewPreviewComplete(false);
	}, [batchDrafts.length]);

	const handleReviewClose = useCallback(() => {
		if (d.isLivePreviewVisible || d.isPendingGeneration) {
			setForceReviewOpen(false);
			setWriteReviewPreviewComplete(false);
			return;
		}
		setForceReviewOpen(false);
		d.clearWriteReviewBatch();
	}, [d]);

	return (
		<div className="relative" style={{ width: TARGET_WIDTH_PX }}>
			{isProfileSidePanelOpen && !isReviewActive && profileFields && (
				<div
					className="absolute z-[70]"
					style={{
						top: PROFILE_SIDE_PANEL_TOP_OFFSET_PX,
						right: 'calc(100% + 12px)',
						width: PROFILE_SIDE_PANEL_NATIVE_WIDTH_PX * PROFILE_SIDE_PANEL_SCALE,
						height: TARGET_HEIGHT_PX,
					}}
				>
					<div
						style={{
							width: PROFILE_SIDE_PANEL_NATIVE_WIDTH_PX,
							height: PROFILE_SIDE_PANEL_NATIVE_HEIGHT_PX,
							transform: `scale(${PROFILE_SIDE_PANEL_SCALE})`,
							transformOrigin: 'top left',
						}}
					>
						<ProfileSidePanelBox
							profileName={profileFields.name}
							profileGenre={profileFields.genre}
							profileArea={profileFields.area}
							profilePerformingName={profileFields.band}
							profileBio={profileFields.bio}
							onProfileNameUpdate={(name) => handleIdentityUpdate({ name })}
							onProfileGenreUpdate={(genre) => handleIdentityUpdate({ genre })}
							onProfileAreaUpdate={(area) => handleIdentityUpdate({ area })}
							onProfilePerformingNameUpdate={(bandName) =>
								handleIdentityUpdate({ bandName })
							}
							onProfileBioUpdate={(bio) => handleIdentityUpdate({ bio })}
						/>
					</div>
				</div>
			)}
			{isReviewActive ? (
				<DashboardDraftReview
					campaign={campaign}
					form={d.form}
					contacts={d.contacts ?? []}
					batchDrafts={batchDrafts}
					isPendingEmails={isPendingEmails}
					onActiveReviewContactChange={onActiveReviewContactChange}
					onClose={handleReviewClose}
				/>
			) : d.isLivePreviewVisible ? (
				<DashboardDraftingDeck
					contacts={d.contacts || []}
					targetContactIds={targetContactIds}
					livePreview={livePreview}
					completedContactIds={completedDraftingContactIds}
					total={draftingTotal}
					isCollapsed={isDraftingDeckCollapsed}
					onCollapsedChange={onDraftingDeckCollapsedChange ?? (() => undefined)}
					onCancel={handleCancelDrafting}
					onViewDrafts={handleViewDrafts}
					viewDraftsDisabled={batchDrafts.length === 0}
				/>
			) : (
				<Form {...d.form}>
					{showTestPreview && !d.isLivePreviewVisible && (
						<div
							className="absolute z-[70]"
							style={{
								top: PROFILE_SIDE_PANEL_TOP_OFFSET_PX,
								right: 'calc(100% + 12px)',
								width: TEST_PREVIEW_NATIVE_WIDTH_PX * TEST_PREVIEW_SCALE,
								height: TARGET_HEIGHT_PX,
							}}
						>
							<div
								style={{
									width: TEST_PREVIEW_NATIVE_WIDTH_PX,
									height: TEST_PREVIEW_NATIVE_HEIGHT_PX,
									transform: `scale(${TEST_PREVIEW_SCALE})`,
									transformOrigin: 'top left',
								}}
							>
								<TestPreviewPanel
									setShowTestPreview={setShowTestPreview}
									testMessage={campaign.testMessage || ''}
									isLoading={Boolean(d.isTest)}
									isDisabled={d.isGenerationDisabled()}
									isTesting={Boolean(d.isTest)}
									contact={testPreviewContact}
									onKeep={() => handleKeepTestDraft()}
									isKeeping={d.isKeepingTestDraft}
									keepDisabled={
										!campaign.testMessage ||
										!testPreviewContact ||
										Boolean(d.isTest)
									}
									style={{
										width: TEST_PREVIEW_NATIVE_WIDTH_PX,
										height: TEST_PREVIEW_NATIVE_HEIGHT_PX,
									}}
								/>
							</div>
						</div>
					)}

					{/* Draft / Add Contacts to Folder mode toggle (mirrors the floating card actions). */}
					<div
						className="flex flex-row items-center gap-[13px] mb-2"
						style={{
							width: TARGET_WIDTH_PX,
							height: 28,
							borderRadius: 6,
							background: '#EB8586',
							paddingLeft: 4,
							paddingRight: 8,
						}}
					>
						<button
							type="button"
							className="flex items-center pl-[12px] font-inter text-[13px] font-medium text-black"
							style={{
								width: 185,
								height: 20,
								borderRadius: 6,
								background: '#FFA5A5',
								border: '1.5px solid #FFFFFF',
							}}
						>
							Draft
						</button>
						<button
							type="button"
							onClick={onSwitchToAddToFolder}
							className="flex items-center justify-center font-inter text-[13px] font-medium text-black"
							style={{
								width: 185,
								height: 20,
								borderRadius: 6,
								background: '#FFFFFF',
							}}
						>
							Add Contacts to Folder
						</button>
						<button
							type="button"
							aria-label="Close write message panel"
							onClick={onClose}
							className="ml-auto flex items-center justify-center"
							style={{
								width: 18,
								height: 18,
								background: 'transparent',
								border: 'none',
								padding: 0,
								cursor: 'pointer',
							}}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
								<line
									x1="3"
									y1="3"
									x2="13"
									y2="13"
									stroke="#000000"
									strokeWidth="2.5"
									strokeLinecap="butt"
								/>
								<line
									x1="13"
									y1="3"
									x2="3"
									y2="13"
									stroke="#000000"
									strokeWidth="2.5"
									strokeLinecap="butt"
								/>
							</svg>
						</button>
					</div>

					{/* Scale the natively-499px panel down to the design's 449×555 box. */}
					<div
						className="relative"
						style={{ width: TARGET_WIDTH_PX, height: TARGET_HEIGHT_PX }}
					>
						<div
							style={{
								width: HPI_NATIVE_WIDTH_PX,
								transform: `scale(${HPI_SCALE})`,
								transformOrigin: 'top left',
							}}
						>
							<HybridPromptInput
								trackFocusedField={d.trackFocusedField}
								testMessage={campaign.testMessage}
								handleGenerateTestDrafts={d.handleGenerateTestDrafts}
								isGenerationDisabled={d.isGenerationDisabled}
								isPendingGeneration={d.isPendingGeneration}
								isTest={d.isTest}
								contact={testPreviewContact}
								draftCount={targetContactIds.length}
								// The built-in draft button + Test controls are a campaign-write-tab
								// convention; hide them here and use the custom "Draft N messages" pill below.
								hideDraftButton
								hideGenerateTestButton
								onGetSuggestions={handleGetSuggestions}
								onUpscalePrompt={d.upscalePrompt}
								isUpscalingPrompt={d.isUpscalingPrompt}
								promptQualityScore={d.promptQualityScore}
								promptQualityLabel={d.promptQualityLabel}
								hasPreviousPrompt={d.hasPreviousPrompt}
								onUndoUpscalePrompt={d.undoUpscalePrompt}
								identity={campaign.identity}
								onIdentityUpdate={handleIdentityUpdate}
								onProfilePanelOpen={() => {
									setShowTestPreview(false);
									setIsProfileSidePanelOpen(true);
								}}
								forceDesktop
								useStaticDropdownPosition
								hideMobileStickyTestFooter
								containerHeightPx={HPI_CONTAINER_HEIGHT_PX}
							/>
						</div>
						{/* Draft pill centered in the box; Test sits to its right
						    (replaces the campaign-write-tab draft/Test row). */}
						<button
							type="button"
							onClick={handleDraftClick}
							disabled={isDraftDisabled}
							className="absolute left-1/2 -translate-x-1/2 font-inter text-black text-[14px] font-medium"
							style={{
								bottom: 20,
								display: 'inline-flex',
								width: 212,
								height: 28,
								padding: '3.589px 32.242px 3.367px 30.758px',
								justifyContent: 'center',
								alignItems: 'center',
								borderRadius: '47.758px',
								background: '#FFF',
								boxShadow: '0 1.165px 2.33px 0 rgba(0, 0, 0, 0.05)',
								whiteSpace: 'nowrap',
								opacity: isDraftDisabled ? 0.6 : 1,
								cursor: isDraftDisabled ? 'not-allowed' : 'pointer',
							}}
						>
							Draft {targetContactIds.length} messages
						</button>
						<button
							type="button"
							onClick={handleTestClick}
							className="absolute font-inter text-black text-[14px] font-medium opacity-40 transition-opacity hover:opacity-25"
							style={{
								bottom: 20,
								// 12px to the right of the centered 212px pill (half-pill 106 + gap 12).
								left: 'calc(50% + 118px)',
								width: 93,
								height: 28,
								borderRadius: '12px',
								background: '#DBF3DC',
								display: 'inline-flex',
								justifyContent: 'center',
								alignItems: 'center',
								cursor: 'pointer',
							}}
						>
							Test
						</button>
					</div>
				</Form>
			)}

			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={d.isOpenUpgradeSubscriptionDrawer}
				setIsOpen={d.setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>
		</div>
	);
};
