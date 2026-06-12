'use client';

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { DraftPreviewExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftPreviewExpandedList';
import { useDraftingSection } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { DashboardDraftReview } from './DashboardDraftReview';
import type { CampaignWithRelations } from '@/types';

interface DashboardWriteOverlayProps {
	/** The campaign the search is in the context of (drafts land here). */
	campaign: CampaignWithRelations;
	/** Contacts to draft for — the map selection (already committed to `campaign` on open). */
	targetContactIds: number[];
	/** Switch the floating-card mode back to "Add Contacts to Folder" (also exits Write mode). */
	onSwitchToAddToFolder: () => void;
	/** Notify the parent whether the batch review is active (so it can keep the overlay mounted). */
	onReviewActiveChange?: (active: boolean) => void;
}

// The campaign drafting panel renders natively at 499px wide; scale it down to the design's
// 449×555 box. `containerHeightPx` is applied pre-scale so the scaled height lands at 555.
const HPI_NATIVE_WIDTH_PX = 499;
const TARGET_WIDTH_PX = 449;
const TARGET_HEIGHT_PX = 555;
const HPI_SCALE = TARGET_WIDTH_PX / HPI_NATIVE_WIDTH_PX;
const HPI_CONTAINER_HEIGHT_PX = Math.round(TARGET_HEIGHT_PX / HPI_SCALE);

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
	onReviewActiveChange,
}) => {
	const d = useDraftingSection({ campaign, view: 'testing' });

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

	// Leave the review once the batch is fully sent/deleted (after it had drafts and no generation
	// is in flight) — clearing the batch makes the prompt box return (mirrors DraftingSection).
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
		d.clearWriteReviewBatch();
	}, [
		d.writeReviewBatchContactIds,
		batchDrafts.length,
		isBatchDraftingInProgress,
		d.isPendingGeneration,
		d.clearWriteReviewBatch,
	]);

	const isReviewActive =
		d.writeReviewBatchContactIds.size > 0 && writeReviewPreviewComplete;

	useEffect(() => {
		onReviewActiveChange?.(isReviewActive);
	}, [isReviewActive, onReviewActiveChange]);

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

	// Drafting only targets contacts already in the campaign's contact list. The dashboard commits
	// the selection on open, but gate the Draft button until the refetch reflects them so the
	// engine's `targets` filter resolves (it also self-guards with a toast).
	const contactsCommitted = useMemo(
		() => targetContactIds.every((id) => d.contacts?.some((c) => c.id === id)),
		[targetContactIds, d.contacts]
	);

	const isDraftDisabled =
		targetContactIds.length === 0 || d.isContactsLoading || !contactsCommitted;

	const handleDraftClick = async () => {
		if (isDraftDisabled) return;
		await d.handleGenerateDrafts(targetContactIds);
	};

	const livePreview = useMemo(
		() => ({
			visible: d.isLivePreviewVisible,
			contactId: d.livePreviewContactId ?? null,
			subject: d.livePreviewSubject,
			message: d.livePreviewMessage,
		}),
		[d.isLivePreviewVisible, d.livePreviewContactId, d.livePreviewSubject, d.livePreviewMessage]
	);

	return (
		<div className="relative" style={{ width: TARGET_WIDTH_PX }}>
			{isReviewActive ? (
				<DashboardDraftReview
					campaign={campaign}
					form={d.form}
					contacts={d.contacts ?? []}
					batchDrafts={batchDrafts}
					isPendingEmails={isPendingEmails}
					onClose={() => d.clearWriteReviewBatch()}
				/>
			) : (
				<>
			{/* Live drafting preview (streaming) — appears to the left while a batch generates,
			    absolutely positioned so the panel itself never reflows when drafting starts. */}
			{d.isLivePreviewVisible && (
				<div className="absolute top-[52px]" style={{ right: '100%', marginRight: 12 }}>
					<DraftPreviewExpandedList
						contacts={d.contacts || []}
						livePreview={livePreview}
						width={330}
						height={TARGET_HEIGHT_PX}
					/>
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
			</div>

			{/* Scale the natively-499px panel down to the design's 449×555 box. */}
			<div className="relative" style={{ width: TARGET_WIDTH_PX, height: TARGET_HEIGHT_PX }}>
				<div
					style={{
						width: HPI_NATIVE_WIDTH_PX,
						transform: `scale(${HPI_SCALE})`,
						transformOrigin: 'top left',
					}}
				>
					<Form {...d.form}>
						<HybridPromptInput
							trackFocusedField={d.trackFocusedField}
							testMessage={campaign.testMessage}
							handleGenerateTestDrafts={d.handleGenerateTestDrafts}
							isGenerationDisabled={d.isGenerationDisabled}
							isPendingGeneration={d.isPendingGeneration}
							isTest={d.isTest}
							contact={d.contacts?.[0]}
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
							forceDesktop
							useStaticDropdownPosition
							hideMobileStickyTestFooter
							containerHeightPx={HPI_CONTAINER_HEIGHT_PX}
						/>
					</Form>
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
				onClick={() => d.handleGenerateTestDrafts()}
				className="absolute font-inter text-black text-[14px] font-medium"
				style={{
					bottom: 20,
					// 12px to the right of the centered 212px pill (half-pill 106 + gap 12).
					left: 'calc(50% + 118px)',
					width: 93,
					height: 28,
					borderRadius: '12px',
					opacity: 0.4,
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
				</>
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
