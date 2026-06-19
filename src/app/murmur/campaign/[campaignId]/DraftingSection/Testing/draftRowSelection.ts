/**
 * Selection/showing model for the campaign Drafts tab.
 *
 * On the Drafts tab exactly one draft is "showing" (the gold row in the editor) and it is
 * always part of the send selection. A single click on a row cycles its state:
 *
 *   1. The showing row -> no-op (it can't be deselected; something must always show).
 *   2. A selected, non-showing row -> deselect it.
 *   3. A plain (unselected) row -> promote it to showing and make it the only selection.
 */
export type DraftRowClickResult = {
	/** Whether to make the clicked draft the showing draft. */
	showDraft: boolean;
	/** The next selection set, or null when the selection is unchanged (rule 1 no-op). */
	nextSelectedIds: Set<number> | null;
};

export function resolveDraftRowClick(
	clickedId: number,
	showingId: number | null | undefined,
	selectedIds: Set<number>
): DraftRowClickResult {
	// Rule 1: the showing draft is always selected and something must always show.
	if (clickedId === showingId) {
		return { showDraft: false, nextSelectedIds: null };
	}

	// Rule 2: a selected, non-showing draft toggles off.
	if (selectedIds.has(clickedId)) {
		const next = new Set(selectedIds);
		next.delete(clickedId);
		return { showDraft: false, nextSelectedIds: next };
	}

	// Rule 3: a plain draft is promoted to showing and becomes the only selection.
	return { showDraft: true, nextSelectedIds: new Set([clickedId]) };
}
