import { clamp } from './math';
import { WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR, WHAT_TO_HOVER_TOOLTIP_FILL_COLOR, normalizeWhatKey } from './searchMode';
import type { LatLngLiteral } from './types';
import { ContactWithName } from '@/types/contact';
export const SELECTED_TOOLTIP_FADE_START_ZOOM = 5.4;

export const SELECTED_TOOLTIP_FADE_END_ZOOM = 4.7;

export const SELECTED_TOOLTIP_STACK_MIN_SCALE = 0.9;

export const SELECTED_TOOLTIP_STACK_GROUP_SIZE = 10;

export const SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX = 6;

export const SELECTED_TOOLTIP_PLACEMENT_OVERLAP_WEIGHT = 200;

export const SELECTED_TOOLTIP_PLACEMENT_DISTANCE_WEIGHT = 0.08;

export const SELECTED_TOOLTIP_PLACEMENT_MAX_RING = 18;

export const SELECTED_TOOLTIP_PLACEMENT_RING_STEP_PX = 28;

export const SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX = 2;

// Stack cards use a tiny up-left offset, enough to read as a deck without
// becoming a diagonal ribbon across the map.
export const SELECTED_TOOLTIP_STACK_OFFSET_X_PX = 3;

export const SELECTED_TOOLTIP_STACK_OFFSET_Y_PX = 6;

export const SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT = 3;

export const HOVER_TOOLTIP_SIDE_GAP_X_PX = 3;

export const HOVER_TOOLTIP_SIDE_GAP_Y_PX = 14;

export const HOVER_TOOLTIP_VIEWPORT_PADDING_PX = 8;

export const PEOPLE_TOOLTIP_FILL_COLOR = '#4FBCDD';

// Lighter companion tint for the tooltip body card. Categories supply a
// saturated title-band color + a lighter body color (see
// WHAT_TO_HOVER_TOOLTIP_FILL_COLOR / WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR) so
// the white title text reads against a distinct band. "People" (contacts with
// no known category) previously reused PEOPLE_TOOLTIP_FILL_COLOR for BOTH the
// band and the body, which made the band blend into the body card and hid the
// title on hover. Pairing the saturated band with this lighter body restores a
// visible title band, matching every category type.
export const PEOPLE_TOOLTIP_BODY_FILL_COLOR = '#99E0FF';


export const getHoverTooltipFillColor = (whatForMarker: string | null | undefined): string => {
	if (!whatForMarker) return PEOPLE_TOOLTIP_FILL_COLOR;
	return (
		WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizeWhatKey(whatForMarker)] ??
		PEOPLE_TOOLTIP_FILL_COLOR
	);
};


export const getHoverTooltipBodyFillColor = (
	whatForMarker: string | null | undefined
): string => {
	if (!whatForMarker) return PEOPLE_TOOLTIP_BODY_FILL_COLOR;
	return (
		WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR[normalizeWhatKey(whatForMarker)] ??
		PEOPLE_TOOLTIP_BODY_FILL_COLOR
	);
};


export const firstTrimmedTooltipText = (...values: Array<string | null | undefined>): string => {
	for (const value of values) {
		const trimmed = (value ?? '').trim();
		if (trimmed) return trimmed;
	}
	return '';
};


export const getContactTitleForTooltip = (
	contact: Pick<ContactWithName, 'curatedDisplayLabel' | 'title' | 'headline'>
): string =>
	firstTrimmedTooltipText(contact.curatedDisplayLabel, contact.title, contact.headline);


export type SelectedCompactTooltipEntry = {
	contact: ContactWithName;
	coords: LatLngLiteral;
	sourceKind: SelectedCompactTooltipSourceKind;
	whatForMarker: string | null;
	width: number;
	height: number;
	anchorY: number;
	svg: string;
	bodyFillColor: string;
	categoryKey: string;
	categoryFillColor: string;
	selectedOrder: number;
};


export type SelectedCompactTooltipSourceKind =
	| 'base'
	| 'booking'
	| 'promotion'
	| 'all'
	| 'compact'
	| 'fallback';


export type ProjectedSelectedTooltipEntry = SelectedCompactTooltipEntry & {
	markerX: number;
	markerY: number;
	naturalX: number;
	naturalY: number;
	left: number;
	top: number;
	right: number;
	bottom: number;
	centerX: number;
	centerY: number;
};


export type SelectedTooltipStackGroup = {
	id: string;
	contactIds: number[];
	count: number;
	colors: string[];
	width: number;
	height: number;
	svg: string;
	bodyFillColor: string;
};


export type SelectedTooltipStackPlacement = SelectedTooltipStackGroup & {
	x: number;
	y: number;
	opacity?: number;
	scale?: number;
};


export type SelectedTooltipHoverHiddenTarget =
	| { type: 'contact'; id: number }
	| { type: 'stack'; id: string };


export type SelectedTooltipPlacementSide =
	| 'top'
	| 'right'
	| 'left'
	| 'bottom'
	| 'top-right'
	| 'top-left'
	| 'bottom-right'
	| 'bottom-left';


export type SelectedTooltipBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};


export type SelectedTooltipIndividualPlacement = SelectedTooltipBounds & {
	side: SelectedTooltipPlacementSide;
	x: number;
	y: number;
	centerX: number;
	centerY: number;
	transformOrigin: string;
	preferenceRank: number;
};


export const createHoverTooltipSidePlacement = ({
	markerX,
	markerY,
	tooltipWidth,
	tooltipHeight,
	hitSlopPx,
	sideGapXPx,
	sideGapYPx,
	viewportWidth,
	viewportHeight,
}: {
	markerX: number;
	markerY: number;
	tooltipWidth: number;
	tooltipHeight: number;
	hitSlopPx: number;
	sideGapXPx: number;
	sideGapYPx: number;
	viewportWidth: number;
	viewportHeight: number;
}): { x: number; y: number } => {
	const minX = HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const maxX = Math.max(
		minX,
		viewportWidth - HOVER_TOOLTIP_VIEWPORT_PADDING_PX - tooltipWidth
	);
	const rightX = markerX + sideGapXPx;
	const leftX = markerX - tooltipWidth - sideGapXPx;
	const rightFits =
		rightX + tooltipWidth <= viewportWidth - HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const leftFits = leftX >= HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const innerX = clamp(rightFits || !leftFits ? rightX : leftX, minX, maxX);

	const minY = HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const maxY = Math.max(
		minY,
		viewportHeight - HOVER_TOOLTIP_VIEWPORT_PADDING_PX - tooltipHeight
	);
	const innerY = clamp(markerY - tooltipHeight - sideGapYPx, minY, maxY);

	return {
		x: innerX - hitSlopPx,
		y: innerY - hitSlopPx,
	};
};


export const selectedTooltipHoverTargetsEqual = (
	a: SelectedTooltipHoverHiddenTarget | null,
	b: SelectedTooltipHoverHiddenTarget | null
): boolean => a?.type === b?.type && a?.id === b?.id;


export const isClientPointInsideRect = (
	clientX: number,
	clientY: number,
	rect: DOMRect
): boolean =>
	rect.width > 0 &&
	rect.height > 0 &&
	clientX >= rect.left &&
	clientX <= rect.right &&
	clientY >= rect.top &&
	clientY <= rect.bottom;


export const selectedTooltipRectsOverlap = (
	a: ProjectedSelectedTooltipEntry,
	b: ProjectedSelectedTooltipEntry
): boolean =>
	a.left - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX <
		b.right + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.right + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX >
		b.left - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.top - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX <
		b.bottom + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.bottom + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX >
		b.top - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX;


export const SELECTED_TOOLTIP_PLACEMENT_SIDES: SelectedTooltipPlacementSide[] = [
	'top-right',
	'top',
	'right',
	'left',
	'bottom',
	'top-left',
	'bottom-right',
	'bottom-left',
];


export const getSelectedTooltipPlacementTransformOrigin = (
	side: SelectedTooltipPlacementSide
): string => {
	switch (side) {
		case 'bottom':
			return 'top center';
		case 'left':
			return 'center right';
		case 'right':
			return 'center left';
		case 'top-left':
			return 'bottom right';
		case 'top-right':
			return 'bottom left';
		case 'bottom-left':
			return 'top right';
		case 'bottom-right':
			return 'top left';
		case 'top':
		default:
			return 'bottom center';
	}
};


export const createSelectedTooltipPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	side: SelectedTooltipPlacementSide,
	baseGapPx: number,
	ringExpansionPx: number,
	preferenceRank: number
): SelectedTooltipIndividualPlacement => {
	const { markerX, markerY, width, height } = entry;
	const gapPx = baseGapPx + ringExpansionPx;
	// The primary `top-right` side hugs the marker at the same gaps as the hover
	// overlay so the resting label sits exactly where the hover tooltip appears
	// (a pure cross-fade on hover). Collisions still push it outward via the ring.
	const topRightGapX = HOVER_TOOLTIP_SIDE_GAP_X_PX + ringExpansionPx;
	const topRightGapY = HOVER_TOOLTIP_SIDE_GAP_Y_PX + ringExpansionPx;
	let x = markerX - width / 2;
	let y = markerY - height - gapPx;

	switch (side) {
		case 'bottom':
			x = markerX - width / 2;
			y = markerY + gapPx;
			break;
		case 'left':
			x = markerX - width - gapPx;
			y = markerY - height / 2;
			break;
		case 'right':
			x = markerX + gapPx;
			y = markerY - height / 2;
			break;
		case 'top-left':
			x = markerX - width - gapPx;
			y = markerY - height - gapPx;
			break;
		case 'top-right':
			x = markerX + topRightGapX;
			y = markerY - height - topRightGapY;
			break;
		case 'bottom-left':
			x = markerX - width - gapPx;
			y = markerY + gapPx;
			break;
		case 'bottom-right':
			x = markerX + gapPx;
			y = markerY + gapPx;
			break;
		case 'top':
		default:
			break;
	}

	return {
		side,
		x,
		y,
		left: x,
		top: y,
		right: x + width,
		bottom: y + height,
		centerX: x + width / 2,
		centerY: y + height / 2,
		transformOrigin: getSelectedTooltipPlacementTransformOrigin(side),
		preferenceRank,
	};
};


export const getSelectedTooltipOverlapArea = (
	a: SelectedTooltipBounds,
	b: SelectedTooltipBounds
): number => {
	const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
	const overlapHeight = Math.max(
		0,
		Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
	);
	return overlapWidth * overlapHeight;
};


export const selectedTooltipBoundsOverlap = (
	a: SelectedTooltipBounds,
	b: SelectedTooltipBounds,
	paddingPx = 0
): boolean =>
	a.left - paddingPx < b.right + paddingPx &&
	a.right + paddingPx > b.left - paddingPx &&
	a.top - paddingPx < b.bottom + paddingPx &&
	a.bottom + paddingPx > b.top - paddingPx;


export const selectedTooltipPlacementOverlapsAny = (
	placement: SelectedTooltipIndividualPlacement,
	blockingBounds: SelectedTooltipBounds[]
): boolean =>
	blockingBounds.some((bounds) =>
		selectedTooltipBoundsOverlap(
			placement,
			bounds,
			SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX
		)
	);


export const scoreSelectedTooltipPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	placement: SelectedTooltipIndividualPlacement,
	placedTooltips: SelectedTooltipIndividualPlacement[]
): number => {
	const overlapArea = placedTooltips.reduce(
		(sum, placed) => sum + getSelectedTooltipOverlapArea(placement, placed),
		0
	);
	const distanceFromNatural = Math.hypot(
		placement.x - entry.naturalX,
		placement.y - entry.naturalY
	);
	return (
		overlapArea * SELECTED_TOOLTIP_PLACEMENT_OVERLAP_WEIGHT +
		distanceFromNatural * SELECTED_TOOLTIP_PLACEMENT_DISTANCE_WEIGHT +
		placement.preferenceRank
	);
};


export const createSelectedTooltipFallbackPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	blockingBounds: SelectedTooltipBounds[],
	gapPx: number
): SelectedTooltipIndividualPlacement => {
	let placement = createSelectedTooltipPlacement(
		entry,
		'bottom',
		gapPx,
		0,
		SELECTED_TOOLTIP_PLACEMENT_SIDES.length
	);

	while (selectedTooltipPlacementOverlapsAny(placement, blockingBounds)) {
		const nextY =
			blockingBounds.reduce(
				(bottom, bounds) => Math.max(bottom, bounds.bottom),
				placement.y
			) + SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX;
		const nextX = entry.markerX - entry.width / 2;
		placement = {
			...placement,
			x: nextX,
			y: nextY,
			left: nextX,
			top: nextY,
			right: nextX + entry.width,
			bottom: nextY + entry.height,
			centerX: nextX + entry.width / 2,
			centerY: nextY + entry.height / 2,
			transformOrigin: 'top center',
		};
	}

	return placement;
};


export const buildSelectedTooltipIndividualPlacements = (
	projectedEntries: ProjectedSelectedTooltipEntry[],
	hiddenContactIds: ReadonlySet<number>,
	blockingBounds: SelectedTooltipBounds[],
	gapPx: number
): Map<number, SelectedTooltipIndividualPlacement> => {
	const placements = new Map<number, SelectedTooltipIndividualPlacement>();
	const placedBounds: SelectedTooltipBounds[] = [...blockingBounds];
	const placedTooltips: SelectedTooltipIndividualPlacement[] = [];
	const visibleEntries = projectedEntries
		.filter((entry) => !hiddenContactIds.has(entry.contact.id))
		.slice()
		.sort((a, b) => a.selectedOrder - b.selectedOrder);

	for (const entry of visibleEntries) {
		let bestPlacement: SelectedTooltipIndividualPlacement | null = null;
		let bestScore = Number.POSITIVE_INFINITY;

		for (let ring = 0; ring <= SELECTED_TOOLTIP_PLACEMENT_MAX_RING; ring += 1) {
			const ringExpansionPx = ring * SELECTED_TOOLTIP_PLACEMENT_RING_STEP_PX;
			for (let index = 0; index < SELECTED_TOOLTIP_PLACEMENT_SIDES.length; index += 1) {
				const side = SELECTED_TOOLTIP_PLACEMENT_SIDES[index];
				const placement = createSelectedTooltipPlacement(
					entry,
					side,
					gapPx,
					ringExpansionPx,
					ring * SELECTED_TOOLTIP_PLACEMENT_SIDES.length + index
				);
				if (selectedTooltipPlacementOverlapsAny(placement, placedBounds)) continue;

				const score = scoreSelectedTooltipPlacement(entry, placement, placedTooltips);
				if (score < bestScore) {
					bestScore = score;
					bestPlacement = placement;
				}
			}
		}

		const placement =
			bestPlacement ?? createSelectedTooltipFallbackPlacement(entry, placedBounds, gapPx);
		placements.set(entry.contact.id, placement);
		placedBounds.push(placement);
		placedTooltips.push(placement);
	}

	return placements;
};


export const getSelectedTooltipGroupColors = (
	entries: ProjectedSelectedTooltipEntry[]
): string[] => {
	const colors: string[] = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		const color =
			entry.bodyFillColor || entry.categoryFillColor || PEOPLE_TOOLTIP_FILL_COLOR;
		if (seen.has(color)) continue;
		seen.add(color);
		colors.push(color);
		if (colors.length >= SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT + 1) break;
	}
	return colors.length > 0 ? colors : [PEOPLE_TOOLTIP_FILL_COLOR];
};


export const getSelectedTooltipStackBounds = (placement: SelectedTooltipStackPlacement) => {
	const backLayerCount = Math.min(
		SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT,
		Math.max(0, placement.count - 1)
	);
	return {
		left:
			placement.x -
			backLayerCount * SELECTED_TOOLTIP_STACK_OFFSET_X_PX -
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		top:
			placement.y -
			backLayerCount * SELECTED_TOOLTIP_STACK_OFFSET_Y_PX -
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		right: placement.x + placement.width + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		bottom: placement.y + placement.height + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
	};
};


export const selectedTooltipStackPlacementsOverlap = (
	a: SelectedTooltipStackPlacement,
	b: SelectedTooltipStackPlacement
): boolean => {
	const aBounds = getSelectedTooltipStackBounds(a);
	const bBounds = getSelectedTooltipStackBounds(b);
	return (
		aBounds.left < bBounds.right &&
		aBounds.right > bBounds.left &&
		aBounds.top < bBounds.bottom &&
		aBounds.bottom > bBounds.top
	);
};


export const mergeSelectedTooltipStackPlacements = (
	placements: SelectedTooltipStackPlacement[]
): SelectedTooltipStackPlacement => {
	const frontPlacement = placements
		.slice()
		.sort((a, b) => b.count - a.count || b.width - a.width || a.y - b.y)[0];
	const contactIds: number[] = [];
	const seenContactIds = new Set<number>();
	const colors: string[] = [];
	const seenColors = new Set<string>();

	for (const placement of placements) {
		for (const contactId of placement.contactIds) {
			if (seenContactIds.has(contactId)) continue;
			seenContactIds.add(contactId);
			contactIds.push(contactId);
		}
		for (const color of placement.colors) {
			if (seenColors.has(color)) continue;
			seenColors.add(color);
			colors.push(color);
		}
	}

	const totalCount = contactIds.length;
	const weightedCenterX =
		placements.reduce(
			(sum, placement) => sum + (placement.x + placement.width / 2) * placement.count,
			0
		) /
		Math.max(
			1,
			placements.reduce((sum, placement) => sum + placement.count, 0)
		);
	const topY = Math.min(...placements.map((placement) => placement.y));

	return {
		id: `selected-stack-${contactIds.join('-')}`,
		contactIds,
		count: totalCount,
		colors:
			colors.length > 0
				? colors.slice(0, SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT + 1)
				: [PEOPLE_TOOLTIP_FILL_COLOR],
		width: frontPlacement.width,
		height: frontPlacement.height,
		svg: frontPlacement.svg,
		bodyFillColor: frontPlacement.bodyFillColor,
		x: weightedCenterX - frontPlacement.width / 2,
		y: topY,
	};
};


export const compressOverlappingSelectedTooltipStacks = (
	placements: SelectedTooltipStackPlacement[]
): SelectedTooltipStackPlacement[] => {
	let current = placements;
	let didMerge = true;

	while (didMerge && current.length > 1) {
		didMerge = false;
		const visited = new Set<number>();
		const next: SelectedTooltipStackPlacement[] = [];

		for (let startIndex = 0; startIndex < current.length; startIndex += 1) {
			if (visited.has(startIndex)) continue;
			const queue = [startIndex];
			const component: SelectedTooltipStackPlacement[] = [];
			visited.add(startIndex);

			while (queue.length > 0) {
				const index = queue.shift();
				if (index == null) continue;
				const placement = current[index];
				component.push(placement);

				for (let nextIndex = 0; nextIndex < current.length; nextIndex += 1) {
					if (visited.has(nextIndex)) continue;
					if (!selectedTooltipStackPlacementsOverlap(placement, current[nextIndex]))
						continue;
					visited.add(nextIndex);
					queue.push(nextIndex);
				}
			}

			if (component.length > 1) {
				didMerge = true;
				next.push(mergeSelectedTooltipStackPlacements(component));
			} else {
				next.push(component[0]);
			}
		}

		current = next;
	}

	return current;
};


export const buildSelectedTooltipStackPlacements = (
	projectedEntries: ProjectedSelectedTooltipEntry[]
): SelectedTooltipStackPlacement[] => {
	const components: ProjectedSelectedTooltipEntry[][] = [];
	const visited = new Set<number>();

	for (let startIndex = 0; startIndex < projectedEntries.length; startIndex += 1) {
		if (visited.has(startIndex)) continue;

		const queue = [startIndex];
		const component: ProjectedSelectedTooltipEntry[] = [];
		visited.add(startIndex);

		while (queue.length > 0) {
			const index = queue.shift();
			if (index == null) continue;
			const entry = projectedEntries[index];
			component.push(entry);

			for (let nextIndex = 0; nextIndex < projectedEntries.length; nextIndex += 1) {
				if (visited.has(nextIndex)) continue;
				if (!selectedTooltipRectsOverlap(entry, projectedEntries[nextIndex])) continue;
				visited.add(nextIndex);
				queue.push(nextIndex);
			}
		}

		components.push(component);
	}

	const placements: SelectedTooltipStackPlacement[] = [];
	for (const component of components) {
		if (component.length <= 1) continue;

		const sorted = component.slice().sort((a, b) => {
			const yDelta = a.centerY - b.centerY;
			if (Math.abs(yDelta) > 1) return yDelta;
			const xDelta = a.centerX - b.centerX;
			if (Math.abs(xDelta) > 1) return xDelta;
			return a.selectedOrder - b.selectedOrder;
		});

		for (
			let startIndex = 0;
			startIndex < sorted.length;
			startIndex += SELECTED_TOOLTIP_STACK_GROUP_SIZE
		) {
			const groupEntries = sorted.slice(
				startIndex,
				startIndex + SELECTED_TOOLTIP_STACK_GROUP_SIZE
			);
			if (groupEntries.length <= 1) continue;

			const centerX =
				groupEntries.reduce((sum, entry) => sum + entry.centerX, 0) / groupEntries.length;
			const topY = Math.min(...groupEntries.map((entry) => entry.top));
			const frontEntry =
				groupEntries
					.slice()
					.sort((a, b) => a.selectedOrder - b.selectedOrder)
					.at(-1) ?? groupEntries[groupEntries.length - 1];
			const contactIds = groupEntries
				.slice()
				.sort((a, b) => a.selectedOrder - b.selectedOrder)
				.map((entry) => entry.contact.id);

			placements.push({
				id: `selected-stack-${contactIds.join('-')}`,
				contactIds,
				count: groupEntries.length,
				colors: getSelectedTooltipGroupColors(groupEntries),
				width: frontEntry.width,
				height: frontEntry.height,
				svg: frontEntry.svg,
				bodyFillColor: frontEntry.bodyFillColor,
				x: centerX - frontEntry.width / 2,
				y: topY,
			});
		}
	}

	return compressOverlappingSelectedTooltipStacks(placements);
};
