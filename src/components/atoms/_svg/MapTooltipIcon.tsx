import { getTooltipCategoryIconSpec } from './mapTooltipCategoryIcons';

const DEFAULT_TOOLTIP_FILL_COLOR = '#0E8530';

const isValidHexColor = (value: string): boolean => {
	const trimmed = value.trim();
	return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
};

// Tooltip sizing (in SVG user units / CSS px)
const MIN_TOOLTIP_INNER_WIDTH = 140;
const MAX_TOOLTIP_INNER_WIDTH = 188;
const TOOLTIP_TEXT_X = 12; // aligns with <text x="..."> (excluding stroke padding offset)
const TOOLTIP_TEXT_RIGHT_PADDING = 10;
const TOP_CARD_HEIGHT = 37;
const TITLE_BAND_HEIGHT = 16;
const TITLE_BOX_GAP = 4;
const TITLE_FADE_OVERLAY_WIDTH = 32;
const TOP_CARD_FADE_OVERLAY_WIDTH = 22;
const TOOLTIP_STROKE_WIDTH = 1.25;
const STROKE_PADDING = Math.ceil(TOOLTIP_STROKE_WIDTH);

// Category icon sizing inside the hover tooltip (square slot).
const TOOLTIP_CATEGORY_ICON_SIZE = 16;
const TOOLTIP_CATEGORY_ICON_GAP = 8;
const TOOLTIP_CATEGORY_ICON_TOP_OFFSET = 5;

// Convert React-style SVG attrs (camelCase) to SVG/XML attrs (kebab-case).
// The tooltip is rendered via `data:image/svg+xml`, which is parsed as XML.
export const normalizeInlineSvgMarkupForXml = (markup: string): string =>
	markup
		.replaceAll('strokeWidth', 'stroke-width')
		.replaceAll('strokeLinecap', 'stroke-linecap')
		.replaceAll('strokeLinejoin', 'stroke-linejoin')
		.replaceAll('fillRule', 'fill-rule')
		.replaceAll('clipRule', 'clip-rule')
		.replaceAll('stopColor', 'stop-color')
		.replaceAll('stopOpacity', 'stop-opacity');

let measurementContext: CanvasRenderingContext2D | null = null;
const getMeasurementContext = (): CanvasRenderingContext2D | null => {
	if (measurementContext) return measurementContext;
	if (typeof document === 'undefined') return null;
	const canvas = document.createElement('canvas');
	measurementContext = canvas.getContext('2d');
	return measurementContext;
};

const measureTextWidthPx = (text: string, font: string): number | null => {
	const ctx = getMeasurementContext();
	if (!ctx) return null;
	ctx.font = font;
	return ctx.measureText(text).width;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const measureTextWidthWithFallback = (
	text: string,
	font: string,
	fallbackCharWidth: number
): number =>
	measureTextWidthPx(text, font) ?? text.length * fallbackCharWidth;

const truncateTextToWidth = (
	text: string,
	maxWidth: number,
	font: string,
	fallbackCharWidth: number
): string => {
	const trimmed = text.trim();
	if (!trimmed) return '';
	if (measureTextWidthWithFallback(trimmed, font, fallbackCharWidth) <= maxWidth) {
		return trimmed;
	}

	const ellipsisBase = trimmed.replace(/\.+$/, '');
	let low = 0;
	let high = ellipsisBase.length;
	let best = '...';
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const candidate = `${ellipsisBase.slice(0, mid).trimEnd()}...`;
		if (measureTextWidthWithFallback(candidate, font, fallbackCharWidth) <= maxWidth) {
			best = candidate;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return best;
};

const wrapTextToTwoLines = (
	text: string,
	maxWidth: number,
	font: string,
	fallbackCharWidth: number
): string[] => {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];

	const lines: string[] = [];
	let current = '';
	let consumedWords = 0;

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (measureTextWidthWithFallback(candidate, font, fallbackCharWidth) <= maxWidth) {
			current = candidate;
			consumedWords += 1;
			continue;
		}

		if (current) {
			lines.push(current);
			current = word;
			consumedWords += 1;
		} else {
			lines.push(truncateTextToWidth(word, maxWidth, font, fallbackCharWidth));
			consumedWords += 1;
		}

		if (lines.length === 2) break;
	}

	if (lines.length < 2 && current) {
		lines.push(current);
	}

	if (consumedWords < words.length && lines.length > 0) {
		const lastIndex = lines.length - 1;
		lines[lastIndex] = truncateTextToWidth(
			`${lines[lastIndex]}...`,
			maxWidth,
			font,
			fallbackCharWidth
		);
	}

	return lines.slice(0, 2);
};

type TooltipLineExtras = {
	primary?: number;
	secondary?: number;
	title?: number;
};

const calculateTooltipInnerWidth = (
	primaryText: string,
	secondaryText: string,
	titleText: string,
	lineExtras: TooltipLineExtras = {}
): number => {
	const primary = primaryText.trim();
	const secondary = secondaryText.trim();
	const title = titleText.trim();

	const primaryExtra = lineExtras.primary ?? 0;
	const secondaryExtra = lineExtras.secondary ?? 0;
	const titleExtra = lineExtras.title ?? 0;

	// Use Canvas text measurement in the browser for a tighter fit.
	const primaryMeasured =
		measureTextWidthPx(primary, 'bold 14px Arial, sans-serif') ?? primary.length * 7.6;
	const secondaryMeasured = secondary
		? measureTextWidthPx(secondary, '13px Arial, sans-serif') ?? secondary.length * 6.7
		: 0;
	const titleMeasured = title
		? measureTextWidthPx(title, '11px Arial, sans-serif') ?? title.length * 5.5
		: 0;

	// Compute required widths per line: left inset + (optional icon slot) + measured text + right padding.
	const primaryRequired = primaryMeasured + TOOLTIP_TEXT_X + primaryExtra;
	const secondaryRequired = secondary ? secondaryMeasured + TOOLTIP_TEXT_X + secondaryExtra : 0;
	const titleRequired = title ? titleMeasured + TOOLTIP_TEXT_X + titleExtra : 0;

	const maxRequired = Math.max(primaryRequired, secondaryRequired, titleRequired);
	// Add right padding so the bubble "hugs" the content.
	const innerWidth = Math.ceil(maxRequired + TOOLTIP_TEXT_RIGHT_PADDING);
	return clamp(innerWidth, MIN_TOOLTIP_INNER_WIDTH, MAX_TOOLTIP_INNER_WIDTH);
};

// Generates a map marker hover tooltip SVG with contact name, company, and title
export const generateMapTooltipSvg = (
	name: string,
	company: string,
	title: string,
	fillColor: string = DEFAULT_TOOLTIP_FILL_COLOR,
	searchWhat?: string | null,
	bodyFillColor?: string | null
): string => {
	// Escape special characters for SVG/XML
	const escapeSvgText = (text: string) =>
		text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');

	const safeFillColor = isValidHexColor(fillColor) ? fillColor.trim() : DEFAULT_TOOLTIP_FILL_COLOR;
	const safeBodyFillColor =
		bodyFillColor && isValidHexColor(bodyFillColor)
			? bodyFillColor.trim()
			: safeFillColor;
	const bodyTextFill = 'black';
	const titleTextFill = 'white';

	const trimmedName = (name ?? '').trim();
	const trimmedCompany = (company ?? '').trim();
	const hasName = trimmedName.length > 0;
	const hasCompany = trimmedCompany.length > 0;

	// If no name, show company as the primary bold text
	const primaryTextRaw = hasName ? trimmedName : hasCompany ? trimmedCompany : 'Unknown';
	// Only show secondary text if we have both name and company
	const secondaryTextRaw = hasName && hasCompany ? trimmedCompany : '';
	const titleTextRaw = (title ?? '').trim();

	// Category icon comes from the "What" search category (when available).
	const categoryIconSpec = getTooltipCategoryIconSpec(searchWhat);
	const showCategoryIcon = Boolean(categoryIconSpec && hasCompany);
	const categoryIconSlotExtra = showCategoryIcon
		? TOOLTIP_CATEGORY_ICON_SIZE + TOOLTIP_CATEGORY_ICON_GAP
		: 0;
	// Always place category icon on the primary (name) line when showing
	const categoryIconPlacement: 'primary' | null = showCategoryIcon ? 'primary' : null;

	const primaryLineExtra = categoryIconPlacement === 'primary' ? categoryIconSlotExtra : 0;
	const secondaryLineExtra = 0;

	const titleText = titleTextRaw ? escapeSvgText(titleTextRaw) : '';

	// Calculate width based on actual measured text width (tight fit)
	const innerWidth = calculateTooltipInnerWidth(primaryTextRaw, secondaryTextRaw, titleTextRaw, {
		primary: primaryLineExtra,
		secondary: secondaryLineExtra,
	});

	// Add padding so strokes stay inside the SVG viewbox.
	const strokePadding = STROKE_PADDING;
	const svgWidth = innerWidth + strokePadding * 2;

	// Overall tooltip geometry (without stroke padding offset)
	const tooltipHeight = TOP_CARD_HEIGHT + TITLE_BOX_GAP + TITLE_BAND_HEIGHT;
	const svgHeight = tooltipHeight + strokePadding * 2;

	const titleBandTopY = TOP_CARD_HEIGHT + TITLE_BOX_GAP;
	const titleY = titleBandTopY + 12;

	// Offset all coordinates by strokePadding to center the shape
	const offsetX = strokePadding;
	const offsetY = strokePadding;

	const topCardLineOneBaselineY = 14 + offsetY;
	const topCardLineTwoBaselineY = 30 + offsetY;
	const titleBaselineY = titleY + offsetY;

	const primaryTextX = TOOLTIP_TEXT_X + offsetX;
	const titleTextX = TOOLTIP_TEXT_X + offsetX;

	// Subtle right-edge fade for very long titles (so truncation is visually softer)
	const titleFadeOverlayX = Math.max(
		offsetX,
		innerWidth + offsetX - TOOLTIP_TEXT_RIGHT_PADDING - TITLE_FADE_OVERLAY_WIDTH
	);
	const titleFadeOverlayWidth = innerWidth + offsetX - titleFadeOverlayX;

	const primaryIconX =
		categoryIconPlacement === 'primary'
			? innerWidth + offsetX - TOOLTIP_TEXT_RIGHT_PADDING - TOOLTIP_CATEGORY_ICON_SIZE
			: 0;
	const categoryIconPrimaryY =
		offsetY + TOOLTIP_CATEGORY_ICON_TOP_OFFSET;

	const topCardLineOneMaxWidth =
		innerWidth -
		TOOLTIP_TEXT_X -
		TOOLTIP_TEXT_RIGHT_PADDING -
		(categoryIconPlacement === 'primary' ? categoryIconSlotExtra : 0);
	const topCardLineTwoMaxWidth =
		innerWidth - TOOLTIP_TEXT_X - TOOLTIP_TEXT_RIGHT_PADDING;
	const topCardLinesRaw = secondaryTextRaw
		? [primaryTextRaw, secondaryTextRaw]
		: wrapTextToTwoLines(
				primaryTextRaw,
				topCardLineOneMaxWidth,
				'bold 14px Arial, sans-serif',
				7.6
			);
	const topCardLineTwoIsTitleFallback = topCardLinesRaw.length < 2 && Boolean(titleTextRaw);
	if (topCardLineTwoIsTitleFallback) {
		topCardLinesRaw.push(
			truncateTextToWidth(
				titleTextRaw,
				topCardLineTwoMaxWidth,
				'13px Arial, sans-serif',
				6.7
			)
		);
	}
	const topCardLineOne = topCardLinesRaw[0] ? escapeSvgText(topCardLinesRaw[0]) : '';
	const topCardLineTwo = topCardLinesRaw[1] ? escapeSvgText(topCardLinesRaw[1]) : '';
	const topCardLineOneOverflows =
		measureTextWidthWithFallback(topCardLinesRaw[0] ?? '', 'bold 14px Arial, sans-serif', 7.6) >
		topCardLineOneMaxWidth;
	const topCardLineTwoOverflows =
		measureTextWidthWithFallback(topCardLinesRaw[1] ?? '', '13px Arial, sans-serif', 6.7) >
		topCardLineTwoMaxWidth;
	const topCardLineOneFadeX =
		primaryTextX + Math.max(0, topCardLineOneMaxWidth - TOP_CARD_FADE_OVERLAY_WIDTH);
	const topCardLineTwoFadeX =
		primaryTextX + Math.max(0, topCardLineTwoMaxWidth - TOP_CARD_FADE_OVERLAY_WIDTH);
	const topCardLineOneFadeWidth = primaryTextX + topCardLineOneMaxWidth - topCardLineOneFadeX;
	const topCardLineTwoFadeWidth = primaryTextX + topCardLineTwoMaxWidth - topCardLineTwoFadeX;

	const renderCategoryIcon = (x: number, y: number): string => {
		if (!categoryIconSpec || !showCategoryIcon) return '';
		const normalized = normalizeInlineSvgMarkupForXml(categoryIconSpec.content);
		return `<svg x="${x}" y="${y}" width="${TOOLTIP_CATEGORY_ICON_SIZE}" height="${TOOLTIP_CATEGORY_ICON_SIZE}" viewBox="${categoryIconSpec.viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
${normalized}
</svg>`;
	};

	const bodyCornerRadius = 8;
	const titleCornerRadius = 4;

	return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="topCardClip">
    <rect x="${offsetX}" y="${offsetY}" width="${innerWidth}" height="${TOP_CARD_HEIGHT}" rx="${bodyCornerRadius}"/>
  </clipPath>
  <clipPath id="topCardLineOneClip">
    <rect x="${primaryTextX}" y="${offsetY}" width="${topCardLineOneMaxWidth}" height="${TOP_CARD_HEIGHT / 2}"/>
  </clipPath>
  <clipPath id="topCardLineTwoClip">
    <rect x="${primaryTextX}" y="${offsetY + TOP_CARD_HEIGHT / 2}" width="${topCardLineTwoMaxWidth}" height="${TOP_CARD_HEIGHT / 2}"/>
  </clipPath>
  <clipPath id="titleBoxClip">
    <rect x="${offsetX}" y="${titleBandTopY + offsetY}" width="${innerWidth}" height="${TITLE_BAND_HEIGHT}" rx="${titleCornerRadius}"/>
  </clipPath>
  <linearGradient id="topCardFadeOverlayGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${safeBodyFillColor}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${safeBodyFillColor}" stop-opacity="1"/>
  </linearGradient>
  <linearGradient id="titleFadeOverlayGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${safeFillColor}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${safeFillColor}" stop-opacity="1"/>
  </linearGradient>
</defs>
<rect x="${offsetX}" y="${offsetY}" width="${innerWidth}" height="${TOP_CARD_HEIGHT}" rx="${bodyCornerRadius}" fill="${safeBodyFillColor}" stroke="black" stroke-width="${TOOLTIP_STROKE_WIDTH}"/>
<g clip-path="url(#topCardClip)">
  <g clip-path="url(#topCardLineOneClip)">
    <text x="${primaryTextX}" y="${topCardLineOneBaselineY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${bodyTextFill}">${topCardLineOne}</text>
  </g>
  ${topCardLineOneOverflows ? `<rect x="${topCardLineOneFadeX}" y="${offsetY + 1}" width="${topCardLineOneFadeWidth}" height="${TOP_CARD_HEIGHT / 2 - 1}" fill="url(#topCardFadeOverlayGradient)"/>` : ''}
  ${topCardLineTwo ? `<g clip-path="url(#topCardLineTwoClip)">
    <text x="${primaryTextX}" y="${topCardLineTwoBaselineY}" font-family="Arial, sans-serif" font-size="13" font-weight="normal" fill="${bodyTextFill}">${topCardLineTwo}</text>
  </g>` : ''}
  ${topCardLineTwo && topCardLineTwoOverflows ? `<rect x="${topCardLineTwoFadeX}" y="${offsetY + TOP_CARD_HEIGHT / 2}" width="${topCardLineTwoFadeWidth}" height="${TOP_CARD_HEIGHT / 2 - 1}" fill="url(#topCardFadeOverlayGradient)"/>` : ''}
  ${categoryIconPlacement === 'primary' ? renderCategoryIcon(primaryIconX, categoryIconPrimaryY) : ''}
</g>
<rect x="${offsetX}" y="${titleBandTopY + offsetY}" width="${innerWidth}" height="${TITLE_BAND_HEIGHT}" rx="${titleCornerRadius}" fill="${safeFillColor}"/>
<g clip-path="url(#titleBoxClip)">
  ${
		titleText
			? `<text x="${titleTextX}" y="${titleBaselineY}" font-family="Arial, sans-serif" font-size="11" fill="${titleTextFill}" text-anchor="start">${titleText}</text>
  <rect x="${titleFadeOverlayX}" y="${titleBandTopY + offsetY + 1}" width="${titleFadeOverlayWidth}" height="${TITLE_BAND_HEIGHT - 2}" fill="url(#titleFadeOverlayGradient)"/>`
			: ''
	}
</g>
<rect x="${offsetX}" y="${titleBandTopY + offsetY}" width="${innerWidth}" height="${TITLE_BAND_HEIGHT}" rx="${titleCornerRadius}" fill="none" stroke="black" stroke-width="${TOOLTIP_STROKE_WIDTH}"/>
</svg>`;
};

// Calculate width based on text (for Google Maps sizing)
export const calculateTooltipWidth = (
	name: string,
	company: string,
	title: string,
	searchWhat?: string | null
): number => {
	const trimmedName = (name ?? '').trim();
	const trimmedCompany = (company ?? '').trim();
	const trimmedTitle = (title ?? '').trim();
	const hasName = trimmedName.length > 0;
	const hasCompany = trimmedCompany.length > 0;

	const primaryText = hasName ? trimmedName : hasCompany ? trimmedCompany : 'Unknown';
	const secondaryText = hasName && hasCompany ? trimmedCompany : '';

	const showCategoryIcon = Boolean(getTooltipCategoryIconSpec(searchWhat) && hasCompany);
	const categoryIconSlotExtra = showCategoryIcon
		? TOOLTIP_CATEGORY_ICON_SIZE + TOOLTIP_CATEGORY_ICON_GAP
		: 0;
	// Always place category icon on the primary (name) line
	const primaryLineExtra = showCategoryIcon ? categoryIconSlotExtra : 0;
	const secondaryLineExtra = 0;

	const innerWidth = calculateTooltipInnerWidth(primaryText, secondaryText, trimmedTitle, {
		primary: primaryLineExtra,
		secondary: secondaryLineExtra,
	});
	return innerWidth + STROKE_PADDING * 2;
};

// Calculate height based on whether there's one or two lines of text
export const calculateTooltipHeight = (name: string, company: string): number => {
	void name;
	void company;
	const tooltipHeight = TOP_CARD_HEIGHT + TITLE_BOX_GAP + TITLE_BAND_HEIGHT;
	return tooltipHeight + STROKE_PADDING * 2;
};

// Fixed height for two-line tooltips (legacy constant for backwards compatibility)
export const MAP_TOOLTIP_HEIGHT =
	TOP_CARD_HEIGHT + TITLE_BOX_GAP + TITLE_BAND_HEIGHT + STROKE_PADDING * 2;

// Anchor horizontally from the center of the stacked tooltip.
export const MAP_TOOLTIP_ANCHOR_X = (MIN_TOOLTIP_INNER_WIDTH + STROKE_PADDING * 2) / 2;

// Calculate anchor Y based on tooltip height
export const calculateTooltipAnchorY = (name: string, company: string): number => {
	return calculateTooltipHeight(name, company);
};

// Legacy constant for backwards compatibility
export const MAP_TOOLTIP_ANCHOR_Y = MAP_TOOLTIP_HEIGHT;

