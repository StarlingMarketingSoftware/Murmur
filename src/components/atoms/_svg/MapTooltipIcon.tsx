import { getTooltipCategoryIconSpec } from './mapTooltipCategoryIcons';

const DEFAULT_TOOLTIP_FILL_COLOR = '#0E8530';

const isValidHexColor = (value: string): boolean => {
	const trimmed = value.trim();
	return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
};

// Tooltip sizing (in SVG user units / CSS px)
const MIN_TOOLTIP_INNER_WIDTH = 140;
const MAX_TOOLTIP_INNER_WIDTH = 350;
const TOOLTIP_TEXT_X = 12; // aligns with <text x="..."> (excluding stroke padding offset)
const TOOLTIP_TEXT_RIGHT_PADDING = 10;
const TITLE_BAND_HEIGHT = 16;
const TITLE_BAND_BOTTOM_PADDING = 8;
const TITLE_FADE_OVERLAY_WIDTH = 32;

// Body content area heights (before title band)
const BODY_CONTENT_HEIGHT_TWO_LINES = 46; // For name + company
const BODY_CONTENT_HEIGHT_ONE_LINE = 28; // For company only (no name)

// Category icon sizing inside the hover tooltip (square slot).
const TOOLTIP_CATEGORY_ICON_SIZE = 20;
const TOOLTIP_CATEGORY_ICON_GAP = 8;
// Small tweak so the icon visually aligns with text baselines.
const TOOLTIP_CATEGORY_ICON_BASELINE_OFFSET = 5;

// Convert React-style SVG attrs (camelCase) to SVG/XML attrs (kebab-case).
// The tooltip is rendered via `data:image/svg+xml`, which is parsed as XML.
const normalizeInlineSvgMarkupForXml = (markup: string): string =>
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
	searchWhat?: string | null
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
	const textFill = 'white';

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

	const primaryText = escapeSvgText(primaryTextRaw);
	const secondaryText = secondaryTextRaw ? escapeSvgText(secondaryTextRaw) : '';
	const titleText = titleTextRaw ? escapeSvgText(titleTextRaw) : '';

	// Calculate width based on actual measured text width (tight fit)
	const innerWidth = calculateTooltipInnerWidth(primaryTextRaw, secondaryTextRaw, titleTextRaw, {
		primary: primaryLineExtra,
		secondary: secondaryLineExtra,
	});

	// Add padding for stroke (2px stroke = 1px on each side)
	const strokePadding = 2;
	const svgWidth = innerWidth + strokePadding * 2;

	// Overall tooltip geometry (without stroke padding offset)
	// Use shorter height when there's only one line of text (company only, no name)
	const bodyContentHeight = secondaryText
		? BODY_CONTENT_HEIGHT_TWO_LINES
		: BODY_CONTENT_HEIGHT_ONE_LINE;
	const bodyBottomY = bodyContentHeight + TITLE_BAND_HEIGHT + TITLE_BAND_BOTTOM_PADDING;
	const pointerHeight = 10;
	const tooltipHeight = bodyBottomY + pointerHeight;
	const svgHeight = tooltipHeight + strokePadding;

	// If only one line of text, center it vertically in the content area
	const primaryY = secondaryText ? 18 : bodyContentHeight / 2 + 5;
	const titleBandTopY = bodyBottomY - TITLE_BAND_BOTTOM_PADDING - TITLE_BAND_HEIGHT;
	const titleY = titleBandTopY + 12;

	// Offset all coordinates by strokePadding to center the shape
	const offsetX = strokePadding;
	const offsetY = strokePadding;

	const primaryBaselineY = primaryY + offsetY;
	const secondaryBaselineY = 36 + offsetY;
	const titleBaselineY = titleY + offsetY;

	const primaryTextX = TOOLTIP_TEXT_X + offsetX;
	const secondaryTextX = TOOLTIP_TEXT_X + offsetX;
	const titleTextX = TOOLTIP_TEXT_X + offsetX;

	// Subtle right-edge fade for very long titles (so truncation is visually softer)
	const titleFadeOverlayX = Math.max(
		offsetX,
		innerWidth + offsetX - TOOLTIP_TEXT_RIGHT_PADDING - TITLE_FADE_OVERLAY_WIDTH
	);
	const titleFadeOverlayWidth = innerWidth + offsetX - titleFadeOverlayX;

	// Place the icon to the right of the primary (name) text line.
	const primaryMeasuredForIcon =
		categoryIconPlacement === 'primary'
			? (measureTextWidthPx(primaryTextRaw, 'bold 14px Arial, sans-serif') ??
				primaryTextRaw.length * 7.6)
			: 0;

	const maxIconX =
		innerWidth + offsetX - TOOLTIP_TEXT_RIGHT_PADDING - TOOLTIP_CATEGORY_ICON_SIZE;
	const primaryIconX =
		categoryIconPlacement === 'primary'
			? Math.min(primaryTextX + primaryMeasuredForIcon + TOOLTIP_CATEGORY_ICON_GAP, maxIconX)
			: 0;
	const categoryIconPrimaryY =
		primaryBaselineY - TOOLTIP_CATEGORY_ICON_SIZE + TOOLTIP_CATEGORY_ICON_BASELINE_OFFSET;

	const renderCategoryIcon = (x: number, y: number): string => {
		if (!categoryIconSpec || !showCategoryIcon) return '';
		const normalized = normalizeInlineSvgMarkupForXml(categoryIconSpec.content);
		return `<svg x="${x}" y="${y}" width="${TOOLTIP_CATEGORY_ICON_SIZE}" height="${TOOLTIP_CATEGORY_ICON_SIZE}" viewBox="${categoryIconSpec.viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
${normalized}
</svg>`;
	};

	const bodyCornerRadius = 8;
	const bodyCornerStartY = bodyBottomY - bodyCornerRadius;
	const pointerTipY = bodyBottomY + pointerHeight;

	const bubblePathD = `M${innerWidth - bodyCornerRadius + offsetX} ${offsetY}C${innerWidth - 3.582 + offsetX} ${offsetY} ${innerWidth + offsetX} ${3.58172 + offsetY} ${innerWidth + offsetX} ${bodyCornerRadius + offsetY}V${bodyCornerStartY + offsetY}C${innerWidth + offsetX} ${bodyCornerStartY + 4.4183 + offsetY} ${innerWidth - 3.582 + offsetX} ${bodyBottomY + offsetY} ${innerWidth - bodyCornerRadius + offsetX} ${bodyBottomY + offsetY}H${35.4326 + offsetX}L${23.5 + offsetX} ${pointerTipY + offsetY}L${11.5674 + offsetX} ${bodyBottomY + offsetY}H${bodyCornerRadius + offsetX}C${3.58172 + offsetX} ${bodyBottomY + offsetY} ${offsetX} ${bodyCornerStartY + 4.4183 + offsetY} ${offsetX} ${bodyCornerStartY + offsetY}V${bodyCornerRadius + offsetY}C${offsetX} ${3.58172 + offsetY} ${3.58172 + offsetX} ${offsetY} ${bodyCornerRadius + offsetX} ${offsetY}H${innerWidth - bodyCornerRadius + offsetX}Z`;

	return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="bubbleClip">
    <path d="${bubblePathD}"/>
  </clipPath>
  <linearGradient id="titleFadeOverlayGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#E8EFFF" stop-opacity="0"/>
    <stop offset="100%" stop-color="#E8EFFF" stop-opacity="1"/>
  </linearGradient>
</defs>
<path d="${bubblePathD}" fill="${safeFillColor}"/>
<g clip-path="url(#bubbleClip)">
  <rect x="${offsetX}" y="${titleBandTopY + offsetY}" width="${innerWidth}" height="${TITLE_BAND_HEIGHT}" fill="#E8EFFF"/>
  <line x1="${offsetX}" y1="${titleBandTopY + offsetY}" x2="${innerWidth + offsetX}" y2="${titleBandTopY + offsetY}" stroke="black" stroke-width="2"/>
  <line x1="${offsetX}" y1="${titleBandTopY + TITLE_BAND_HEIGHT + offsetY}" x2="${innerWidth + offsetX}" y2="${titleBandTopY + TITLE_BAND_HEIGHT + offsetY}" stroke="black" stroke-width="2"/>
  <text x="${primaryTextX}" y="${primaryBaselineY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textFill}">${primaryText}</text>
  ${categoryIconPlacement === 'primary' ? renderCategoryIcon(primaryIconX, categoryIconPrimaryY) : ''}
  ${secondaryText ? `<text x="${secondaryTextX}" y="${secondaryBaselineY}" font-family="Arial, sans-serif" font-size="13" fill="${textFill}">${secondaryText}</text>` : ''}
  ${
		titleText
			? `<text x="${titleTextX}" y="${titleBaselineY}" font-family="Arial, sans-serif" font-size="11" fill="black" text-anchor="start">${titleText}</text>
  <rect x="${titleFadeOverlayX}" y="${titleBandTopY + offsetY + 1}" width="${titleFadeOverlayWidth}" height="${TITLE_BAND_HEIGHT - 2}" fill="url(#titleFadeOverlayGradient)"/>`
			: ''
	}
</g>
<path d="${bubblePathD}" fill="none" stroke="black" stroke-width="2"/>
</svg>`;
};

// Generate data URL for use in Google Maps markers
export const generateMapTooltipIconUrl = (
	name: string,
	company: string,
	title: string,
	fillColor?: string,
	searchWhat?: string | null
): string => {
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateMapTooltipSvg(
			name,
			company,
			title,
			fillColor ?? DEFAULT_TOOLTIP_FILL_COLOR,
			searchWhat
		)
	)}`;
};

// Stroke padding added to SVG dimensions
const STROKE_PADDING = 2;

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
	const trimmedName = (name ?? '').trim();
	const trimmedCompany = (company ?? '').trim();
	const hasName = trimmedName.length > 0;
	const hasCompany = trimmedCompany.length > 0;

	// Secondary text only shows when we have both name and company
	const hasSecondaryText = hasName && hasCompany;
	const bodyContentHeight = hasSecondaryText
		? BODY_CONTENT_HEIGHT_TWO_LINES
		: BODY_CONTENT_HEIGHT_ONE_LINE;
	const bodyBottomY = bodyContentHeight + TITLE_BAND_HEIGHT + TITLE_BAND_BOTTOM_PADDING;
	const pointerHeight = 10;
	const tooltipHeight = bodyBottomY + pointerHeight;
	return tooltipHeight + STROKE_PADDING;
};

// Fixed height for two-line tooltips (legacy constant for backwards compatibility)
export const MAP_TOOLTIP_HEIGHT = BODY_CONTENT_HEIGHT_TWO_LINES + TITLE_BAND_HEIGHT + TITLE_BAND_BOTTOM_PADDING + 10 + STROKE_PADDING;

// Anchor point (pointer tip position, adjusted for stroke padding)
export const MAP_TOOLTIP_ANCHOR_X = 23.5 + STROKE_PADDING;

// Calculate anchor Y based on tooltip height
export const calculateTooltipAnchorY = (name: string, company: string): number => {
	return calculateTooltipHeight(name, company);
};

// Legacy constant for backwards compatibility
export const MAP_TOOLTIP_ANCHOR_Y = MAP_TOOLTIP_HEIGHT;

