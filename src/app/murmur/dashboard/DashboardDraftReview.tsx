'use client';

import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DraftedEmails } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftedEmails/DraftedEmails';
import { useDraftReviewHandlers } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftedEmails/useDraftReviewHandlers';
import type { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { useMe } from '@/hooks/useMe';
import { ReviewStatus } from '@/constants/prismaEnums';
import type { CampaignWithRelations, EmailWithRelations } from '@/types';
import type { ContactWithName } from '@/types/contact';

interface DashboardDraftReviewProps {
	campaign: CampaignWithRelations;
	form: UseFormReturn<DraftingFormValues>;
	contacts: ContactWithName[];
	/** Drafts for the just-drafted batch (already scoped to the batch contact IDs). */
	batchDrafts: EmailWithRelations[];
	isPendingEmails: boolean;
	/** Exit the review back to the prompt box (clears the review batch in the overlay). */
	onClose: () => void;
}

// Compact dashboard review renders a narrower native card than the 449px prompt box
// (`DashboardWriteOverlay`) and scales it down, while preserving the same overall height. The card
// is right-aligned in the overlay (see `marginLeft: auto` below) so its right edge stays put as the
// prompt box morphs into the review.
const REVIEW_NATIVE_WIDTH_PX = 455;
const TARGET_WIDTH_PX = 421;
const REVIEW_SCALE = TARGET_WIDTH_PX / REVIEW_NATIVE_WIDTH_PX;
// The compact native card renders at a fixed 450px tall (`desktopReviewHeightPx` in
// DraftedEmails); the Send / Regenerate / Delete action row adds ~62px beneath it.
const REVIEW_NATIVE_COMPACT_HEIGHT_PX = 450;
const REVIEW_ACTION_ROW_NATIVE_HEIGHT_PX = 62;
const TARGET_HEIGHT_PX = Math.round(
	(REVIEW_NATIVE_COMPACT_HEIGHT_PX + REVIEW_ACTION_ROW_NATIVE_HEIGHT_PX) * REVIEW_SCALE
);

/**
 * The stacked-draft review shown in the dashboard search overlay after a batch is drafted.
 * Reuses the campaign `DraftedEmails` UI (Send / Regenerate / Delete + prev/next arrows) and the
 * shared `useDraftReviewHandlers`, scoped to just the batch the user drafted. Closing returns to
 * the prompt box via `onClose` (which clears the review batch upstream).
 */
export const DashboardDraftReview: FC<DashboardDraftReviewProps> = ({
	campaign,
	form,
	contacts,
	batchDrafts,
	isPendingEmails,
	onClose,
}) => {
	const { user, isFreeTrial } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: editIdentity } = useEditIdentity({ suppressToasts: true });

	// Open with the first batch draft expanded (avoids a one-frame flash of the list view).
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(
		() => batchDrafts[0] ?? null
	);
	const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
	const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>(
		'all'
	);
	const [, setIsDraftDialogOpen] = useState(false);

	const handleDraftSelection = useCallback((draftId: number) => {
		setSelectedDraftIds((prev) => {
			const next = new Set(prev);
			if (next.has(draftId)) {
				next.delete(draftId);
			} else {
				next.add(draftId);
			}
			return next;
		});
	}, []);

	// Keep the review open on the first batch draft; re-point if the selected draft is sent/deleted.
	useEffect(() => {
		if (selectedDraft) {
			const stillExists = batchDrafts.some((d) => d.id === selectedDraft.id);
			if (stillExists) return;
			if (batchDrafts.length === 0 && isPendingEmails) return;
			setSelectedDraft(batchDrafts[0] ?? null);
			return;
		}
		const first = batchDrafts[0];
		if (!first) return;
		setSelectedDraft(first);
	}, [batchDrafts, isPendingEmails, selectedDraft]);

	const rejectedDraftIds = useMemo(() => {
		const ids = new Set<number>();
		batchDrafts.forEach((email) => {
			if ((email as { reviewStatus?: string }).reviewStatus === ReviewStatus.rejected) {
				ids.add(email.id);
			}
		});
		return ids;
	}, [batchDrafts]);

	const approvedDraftIds = useMemo(() => {
		const ids = new Set<number>();
		batchDrafts.forEach((email) => {
			if ((email as { reviewStatus?: string }).reviewStatus === ReviewStatus.approved) {
				ids.add(email.id);
			}
		});
		return ids;
	}, [batchDrafts]);

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

	const {
		handleRejectDraft,
		handleApproveDraft,
		handleRegenerateDraft,
		handleSendDrafts,
	} = useDraftReviewHandlers({
		campaign,
		form,
		contacts,
		draftEmails: batchDrafts,
		selectedSendIds: selectedDraftIds,
		clearSelectedSendIds: () => setSelectedDraftIds(new Set()),
	});

	const isSendingDisabled = isFreeTrial || (user?.sendingCredits || 0) === 0;

	return (
		<div style={{ width: TARGET_WIDTH_PX, height: TARGET_HEIGHT_PX, marginLeft: 'auto' }}>
			<div
				style={{
					width: REVIEW_NATIVE_WIDTH_PX,
					transform: `scale(${REVIEW_SCALE})`,
					transformOrigin: 'top left',
				}}
			>
				<DraftedEmails
					contacts={contacts}
					draftEmails={batchDrafts}
					isPendingEmails={isPendingEmails}
					selectedDraft={selectedDraft}
					setSelectedDraft={setSelectedDraft}
					selectedDraftIds={selectedDraftIds}
					setSelectedDraftIds={setSelectedDraftIds}
					handleDraftSelection={handleDraftSelection}
					setIsDraftDialogOpen={setIsDraftDialogOpen}
					onSend={handleSendDrafts}
					isSendingDisabled={isSendingDisabled}
					isFreeTrial={isFreeTrial || false}
					fromName={campaign.identity?.name ?? undefined}
					fromEmail={campaign.identity?.email ?? undefined}
					identity={campaign.identity ?? null}
					onIdentityUpdate={handleIdentityUpdate}
					subject={form.watch('subject')}
					onRejectDraft={handleRejectDraft}
					onApproveDraft={handleApproveDraft}
					onRegenerateDraft={handleRegenerateDraft}
					rejectedDraftIds={rejectedDraftIds}
					approvedDraftIds={approvedDraftIds}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					hideSendButton
					disableOutsideClickClose
					onDraftReviewCloseOverride={onClose}
					compactDraftReview
				/>
			</div>
		</div>
	);
};
