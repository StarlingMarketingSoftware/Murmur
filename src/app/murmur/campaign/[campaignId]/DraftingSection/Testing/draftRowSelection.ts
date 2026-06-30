/**
 * Selection/showing model for the campaign Drafts tab.
 *
 * On the Drafts tab exactly one draft is "showing" (the gold row in the editor) and it is
 * always part of the send selection. A single click on a row cycles its state in two steps:
 *
 *   1. A selected, non-showing row -> promote it to showing (the selection is unchanged).
 *   2. The showing row -> deselect it and move the preview to the nearest still-selected
 *      draft (the next one in list order, else the previous one).
 *   3. A plain (unselected) row -> promote it to showing and make it the only selection.
 *
 * When deselecting the showing row leaves nothing else selected, `nextShowingId` is null:
 * the Drafts tab always keeps one draft showing, so the caller falls back to the first row
 * (which the DraftingSection effects then re-add to the selection). There is no blank state.
 */
export type DraftRowClickResult = {
	/**
	 * The draft id to make "showing": a draft id, or null when no selected draft remains
	 * (the caller resolves null to the first row — the Drafts tab always shows something).
	 */
	nextShowingId: number | null;
	/** The next selection set, or null when the selection is unchanged. */
	nextSelectedIds: Set<number> | null;
};

/**
 * Pick the nearest draft that is still selected, scanning outward from the clicked row:
 * downward (later in the list) first, then upward. Returns null when nothing is selected.
 * If the clicked id isn't in the list (a race where the row left the view), fall back to
 * the first selected id.
 */
function pickNearestSelected(
	orderedIds: number[],
	clickedIndex: number,
	selected: Set<number>
): number | null {
	if (clickedIndex === -1) {
		for (const id of orderedIds) {
			if (selected.has(id)) return id;
		}
		return null;
	}
	for (let i = clickedIndex + 1; i < orderedIds.length; i++) {
		if (selected.has(orderedIds[i])) return orderedIds[i];
	}
	for (let i = clickedIndex - 1; i >= 0; i--) {
		if (selected.has(orderedIds[i])) return orderedIds[i];
	}
	return null;
}

export function resolveDraftRowClick(
	clickedId: number,
	showingId: number | null | undefined,
	selectedIds: Set<number>,
	orderedIds: number[]
): DraftRowClickResult {
	// Rule 1: clicking the showing draft deselects it and moves the preview to the nearest
	// remaining selected draft (next in list order, else previous; null when none remain).
	if (clickedId === showingId) {
		const next = new Set(selectedIds);
		next.delete(clickedId);
		const clickedIndex = orderedIds.indexOf(clickedId);
		return {
			nextShowingId: pickNearestSelected(orderedIds, clickedIndex, next),
			nextSelectedIds: next,
		};
	}

	// Rule 2: a selected, non-showing draft is promoted to showing; the selection is unchanged.
	if (selectedIds.has(clickedId)) {
		return { nextShowingId: clickedId, nextSelectedIds: null };
	}

	// Rule 3: a plain draft is promoted to showing and becomes the only selection.
	return { nextShowingId: clickedId, nextSelectedIds: new Set([clickedId]) };
}
