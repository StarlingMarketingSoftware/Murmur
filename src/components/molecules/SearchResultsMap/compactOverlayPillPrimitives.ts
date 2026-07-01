import { getAmbientContactWhatFromTitle } from './ambientOverlayShared';
import { buildCompactOverlayLabel, shrinkCompactOverlayLabelToFit } from './compactOverlayLabel';
import { LIGHTWEIGHT_COMPACT_OVERLAY_MAX_WIDTH_PX, LIGHTWEIGHT_COMPACT_OVERLAY_MIN_WIDTH_PX } from './constants';
import { clamp } from './math';
import { normalizeWhatKey } from './searchMode';
import { firstTrimmedTooltipText } from './selectedTooltipLayout';
import type { BoundingBox, LatLngLiteral } from './types';
import { latLngToWorldPixel } from './wasmGeo';
import { measureTextWidthWithFallback } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec, type TooltipCategoryIconSpec as TooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import { ContactWithName } from '@/types/contact';

export type CompactOverlayPillEntry = {
	contact: ContactWithName;
	coords: LatLngLiteral;
	label: string;
	width: number;
	initialX: number;
	initialY: number;
	whatForMarker: string | null;
	categoryKey: string;
	iconSpec: TooltipCategoryIconSpec;
	/** Left-rail inner-fill color for the icon, or null to keep the spec's own fill. */
	iconInnerFill: string | null;
	isSelected: boolean;
};


export type CompactOverlaySettledViewport = BoundingBox & {
	center: LatLngLiteral;
	zoom: number;
	width: number;
	height: number;
	key: string;
};


export const COMPACT_OVERLAY_PEOPLE_ICON_SPEC: TooltipCategoryIconSpec = {
	viewBox: '0 0 27 27',
	content: `
<path
	d="M12.1865 0.979492C12.5764 0.341123 13.5037 0.341124 13.8936 0.979492L18.1416 7.93945L25.1016 12.1875C25.7399 12.5774 25.7399 13.5047 25.1016 13.8945L18.1416 18.1426L13.8936 25.1025C13.5037 25.7409 12.5764 25.7409 12.1865 25.1025L7.93848 18.1426L0.978516 13.8945C0.340147 13.5047 0.340147 12.5774 0.978516 12.1875L7.93848 7.93945L12.1865 0.979492Z"
	fill="#50A5C9"
	stroke="white"
/>
`.trim(),
};


export const getCompactOverlayDisplaySource = (contact: ContactWithName): string =>
	firstTrimmedTooltipText(
		contact.company,
		`${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
		contact.name,
		contact.curatedDisplayLabel,
		contact.headline,
		contact.title
	);


// 5px left pad + 14px icon + 4px gap + 7px right pad = 30px chrome around the
// label text, plus 1px slack so the measured text never clips its last glyph.
// Keep in sync with the pill's rendered icon size / padding / gap below.
export const COMPACT_OVERLAY_PILL_BASE_WIDTH_PX = 30;

export const COMPACT_OVERLAY_PILL_TEXT_SLACK_PX = 1;

// Canvas font shorthand (weight size family) matching the rendered pill label,
// so width is measured against the actual glyphs instead of a per-char guess.
export const COMPACT_OVERLAY_PILL_FONT = '500 12.975px Inter, Arial, sans-serif';

// SSR fallback only (pills render client-side, where canvas measurement is used).
export const COMPACT_OVERLAY_PILL_FALLBACK_CHAR_WIDTH_PX = 7.2;

export const COMPACT_OVERLAY_PILL_MAX_TEXT_WIDTH_PX =
	LIGHTWEIGHT_COMPACT_OVERLAY_MAX_WIDTH_PX -
	COMPACT_OVERLAY_PILL_BASE_WIDTH_PX -
	COMPACT_OVERLAY_PILL_TEXT_SLACK_PX;


export const doesCompactOverlayLabelFitMaxPill = (label: string): boolean =>
	measureTextWidthWithFallback(
		label,
		COMPACT_OVERLAY_PILL_FONT,
		COMPACT_OVERLAY_PILL_FALLBACK_CHAR_WIDTH_PX
	) <= COMPACT_OVERLAY_PILL_MAX_TEXT_WIDTH_PX;


// (Declared after doesCompactOverlayLabelFitMaxPill for no-use-before-define;
// the pre-split file relied on its lint exemption for this forward reference.)
export const getCompactOverlayLabel = (contact: ContactWithName): string => {
	const source = getCompactOverlayDisplaySource(contact) || 'Unknown';
	// Shorten to the first couple of significant words, but never leave the label
	// ending on an open-ended conjunction / article / joining preposition / "&"
	// (e.g. "Washington & Jefferson College" must not render as "Washington &").
	const parsedLabel = buildCompactOverlayLabel(source) || source.trim() || 'Unknown';
	return shrinkCompactOverlayLabelToFit(parsedLabel, doesCompactOverlayLabelFitMaxPill);
};


export const getCompactOverlayPillWidth = (label: string): number => {
	const textWidth = measureTextWidthWithFallback(
		label,
		COMPACT_OVERLAY_PILL_FONT,
		COMPACT_OVERLAY_PILL_FALLBACK_CHAR_WIDTH_PX
	);
	return clamp(
		Math.ceil(
			COMPACT_OVERLAY_PILL_BASE_WIDTH_PX + textWidth + COMPACT_OVERLAY_PILL_TEXT_SLACK_PX
		),
		LIGHTWEIGHT_COMPACT_OVERLAY_MIN_WIDTH_PX,
		LIGHTWEIGHT_COMPACT_OVERLAY_MAX_WIDTH_PX
	);
};


// Fade a compact pill label's right edge only when its text actually overflows
// its box. Measured (not estimated) so it's correct regardless of font metrics,
// and short names that fit keep a crisp edge. Run as a span ref callback.
export const COMPACT_OVERLAY_LABEL_FADE_MASK =
	'linear-gradient(to right, #000 calc(100% - 18px), transparent 100%)';

export const applyCompactPillLabelFade = (el: HTMLSpanElement | null): void => {
	if (!el) return;
	const mask = el.scrollWidth - el.clientWidth > 1 ? COMPACT_OVERLAY_LABEL_FADE_MASK : '';
	el.style.setProperty('mask-image', mask);
	el.style.setProperty('-webkit-mask-image', mask);
};


export const getCompactOverlayWhatForContact = (
	contact: ContactWithName,
	fallbackWhat?: string | null
): string | null =>
	contact.curatedCategory ??
	getAmbientContactWhatFromTitle(contact.title) ??
	fallbackWhat ??
	null;


export const getCompactOverlayCategoryKey = (whatForMarker: string | null): string =>
	whatForMarker ? normalizeWhatKey(whatForMarker) : '__people__';


export const getCompactOverlayIconSpec = (
	whatForMarker: string | null
): TooltipCategoryIconSpec =>
	getTooltipCategoryIconSpec(whatForMarker) ?? COMPACT_OVERLAY_PEOPLE_ICON_SPEC;


export const projectCompactOverlayPoint = (
	coords: LatLngLiteral,
	viewport: CompactOverlaySettledViewport
): { x: number; y: number } => {
	const worldSize = 512 * Math.pow(2, viewport.zoom);
	const point = latLngToWorldPixel(coords, worldSize);
	const center = latLngToWorldPixel(viewport.center, worldSize);
	return {
		x: viewport.width / 2 + (point.x - center.x),
		y: viewport.height / 2 + (point.y - center.y),
	};
};


export const compactOverlayRectsOverlap = (
	a: { left: number; top: number; right: number; bottom: number },
	b: { left: number; top: number; right: number; bottom: number },
	margin: number
): boolean =>
	a.left < b.right + margin &&
	a.right + margin > b.left &&
	a.top < b.bottom + margin &&
	a.bottom + margin > b.top;


// Recolor a category icon's visible inner fill (the `fill="white"` paths) to a
// left-rail color, leaving `<mask>…</mask>` blocks untouched — inside a mask,
// `fill="white"` defines the mask region, not a visible fill, so recoloring it
// would corrupt the cutout. Mirrors how our React `*Icon` components apply
// `innerFill` only to inner paths. Run on the RAW spec content (still
// `fill="white"`) before XML normalization / id-prefixing.
export const recolorCompactOverlayInnerFill = (markup: string, innerFill: string): string =>
	markup
		.split(/(<mask[\s\S]*?<\/mask>)/g)
		.map((segment) =>
			segment.startsWith('<mask')
				? segment
				: segment.replace(/fill="white"/g, `fill="${innerFill}"`)
		)
		.join('');


export const prefixCompactOverlayInlineSvgIds = (markup: string, prefix: string): string => {
	const idMap = new Map<string, string>();
	let next = markup.replace(/id="([^"]+)"/g, (_match, id: string) => {
		const scoped = `${prefix}-${id}`;
		idMap.set(id, scoped);
		return `id="${scoped}"`;
	});
	for (const [id, scoped] of idMap) {
		next = next
			.replaceAll(`url(#${id})`, `url(#${scoped})`)
			.replaceAll(`href="#${id}"`, `href="#${scoped}"`)
			.replaceAll(`xlink:href="#${id}"`, `xlink:href="#${scoped}"`);
	}
	return next;
};
