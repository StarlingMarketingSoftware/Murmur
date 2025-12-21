const DEFAULT_TOOLTIP_FILL_COLOR = '#0E8530';

const isValidHexColor = (value: string): boolean => {
	const trimmed = value.trim();
	return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
};

// Tooltip sizing (in SVG user units / CSS px)
const MIN_TOOLTIP_INNER_WIDTH = 140;
const MAX_TOOLTIP_INNER_WIDTH = 350;
const TOOLTIP_TEXT_X = 18; // aligns with <text x="..."> (excluding stroke padding offset)
const TOOLTIP_TEXT_RIGHT_PADDING = 16;
const TITLE_BAND_HEIGHT = 16;
const TITLE_BAND_BOTTOM_PADDING = 8;

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

const calculateTooltipInnerWidth = (
	primaryText: string,
	secondaryText: string,
	titleText: string
): number => {
	const primary = primaryText.trim();
	const secondary = secondaryText.trim();
	const title = titleText.trim();

	// Use Canvas text measurement in the browser for a tighter fit.
	const primaryMeasured =
		measureTextWidthPx(primary, 'bold 14px Arial, sans-serif') ?? primary.length * 7.6;
	const secondaryMeasured = secondary
		? measureTextWidthPx(secondary, '13px Arial, sans-serif') ?? secondary.length * 6.7
		: 0;
	const titleMeasured = title
		? measureTextWidthPx(title, '14px Arial, sans-serif') ?? title.length * 7.2
		: 0;

	const maxTextWidth = Math.max(primaryMeasured, secondaryMeasured, titleMeasured);
	// Add left inset (text x) + right padding so the bubble "hugs" the text.
	const innerWidth = Math.ceil(maxTextWidth + TOOLTIP_TEXT_X + TOOLTIP_TEXT_RIGHT_PADDING);
	return clamp(innerWidth, MIN_TOOLTIP_INNER_WIDTH, MAX_TOOLTIP_INNER_WIDTH);
};

// Generates a map marker hover tooltip SVG with contact name, company, and title
export const generateMapTooltipSvg = (
	name: string,
	company: string,
	title: string,
	fillColor: string = DEFAULT_TOOLTIP_FILL_COLOR
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

	const primaryText = escapeSvgText(primaryTextRaw);
	const secondaryText = secondaryTextRaw ? escapeSvgText(secondaryTextRaw) : '';
	const titleText = titleTextRaw ? escapeSvgText(titleTextRaw) : '';

	// Calculate width based on actual measured text width (tight fit)
	const innerWidth = calculateTooltipInnerWidth(primaryTextRaw, secondaryTextRaw, titleTextRaw);

	// Add padding for stroke (2px stroke = 1px on each side)
	const strokePadding = 2;
	const svgWidth = innerWidth + strokePadding * 2;

	// Overall tooltip geometry (without stroke padding offset)
	const bodyBottomY = 46 + TITLE_BAND_HEIGHT + TITLE_BAND_BOTTOM_PADDING;
	const pointerHeight = 10;
	const tooltipHeight = bodyBottomY + pointerHeight;
	const svgHeight = tooltipHeight + strokePadding;

	// If only one line of text, center it vertically
	const primaryY = secondaryText ? 18 : 27;
	const titleBandTopY = bodyBottomY - TITLE_BAND_BOTTOM_PADDING - TITLE_BAND_HEIGHT;
	const titleY = titleBandTopY + 12;

	// Offset all coordinates by strokePadding to center the shape
	const offsetX = strokePadding;
	const offsetY = strokePadding;

	const bodyCornerRadius = 8;
	const bodyCornerStartY = bodyBottomY - bodyCornerRadius;
	const pointerTipY = bodyBottomY + pointerHeight;

	const bubblePathD = `M${innerWidth - bodyCornerRadius + offsetX} ${offsetY}C${innerWidth - 3.582 + offsetX} ${offsetY} ${innerWidth + offsetX} ${3.58172 + offsetY} ${innerWidth + offsetX} ${bodyCornerRadius + offsetY}V${bodyCornerStartY + offsetY}C${innerWidth + offsetX} ${bodyCornerStartY + 4.4183 + offsetY} ${innerWidth - 3.582 + offsetX} ${bodyBottomY + offsetY} ${innerWidth - bodyCornerRadius + offsetX} ${bodyBottomY + offsetY}H${35.4326 + offsetX}L${23.5 + offsetX} ${pointerTipY + offsetY}L${11.5674 + offsetX} ${bodyBottomY + offsetY}H${bodyCornerRadius + offsetX}C${3.58172 + offsetX} ${bodyBottomY + offsetY} ${offsetX} ${bodyCornerStartY + 4.4183 + offsetY} ${offsetX} ${bodyCornerStartY + offsetY}V${bodyCornerRadius + offsetY}C${offsetX} ${3.58172 + offsetY} ${3.58172 + offsetX} ${offsetY} ${bodyCornerRadius + offsetX} ${offsetY}H${innerWidth - bodyCornerRadius + offsetX}Z`;

	return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="bubbleClip">
    <path d="${bubblePathD}"/>
  </clipPath>
</defs>
<path d="${bubblePathD}" fill="${safeFillColor}"/>
<g clip-path="url(#bubbleClip)">
  <rect x="${offsetX}" y="${titleBandTopY + offsetY}" width="${innerWidth}" height="${TITLE_BAND_HEIGHT}" fill="#E8EFFF"/>
  <line x1="${offsetX}" y1="${titleBandTopY + offsetY}" x2="${innerWidth + offsetX}" y2="${titleBandTopY + offsetY}" stroke="black" stroke-width="2"/>
  <line x1="${offsetX}" y1="${titleBandTopY + TITLE_BAND_HEIGHT + offsetY}" x2="${innerWidth + offsetX}" y2="${titleBandTopY + TITLE_BAND_HEIGHT + offsetY}" stroke="black" stroke-width="2"/>
  <text x="${TOOLTIP_TEXT_X + offsetX}" y="${primaryY + offsetY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textFill}">${primaryText}</text>
  ${secondaryText ? `<text x="${TOOLTIP_TEXT_X + offsetX}" y="${36 + offsetY}" font-family="Arial, sans-serif" font-size="13" fill="${textFill}">${secondaryText}</text>` : ''}
  ${titleText ? `<text x="${TOOLTIP_TEXT_X + offsetX}" y="${titleY + offsetY}" font-family="Arial, sans-serif" font-size="14" fill="black">${titleText}</text>` : ''}
</g>
<path d="${bubblePathD}" fill="none" stroke="black" stroke-width="2"/>
</svg>`;
};

// Generate data URL for use in Google Maps markers
export const generateMapTooltipIconUrl = (
	name: string,
	company: string,
	title: string,
	fillColor?: string
): string => {
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateMapTooltipSvg(name, company, title, fillColor ?? DEFAULT_TOOLTIP_FILL_COLOR)
	)}`;
};

// Stroke padding added to SVG dimensions
const STROKE_PADDING = 2;

// Calculate width based on text (for Google Maps sizing)
export const calculateTooltipWidth = (name: string, company: string, title: string): number => {
	const trimmedName = (name ?? '').trim();
	const trimmedCompany = (company ?? '').trim();
	const trimmedTitle = (title ?? '').trim();
	const hasName = trimmedName.length > 0;
	const hasCompany = trimmedCompany.length > 0;

	const primaryText = hasName ? trimmedName : hasCompany ? trimmedCompany : 'Unknown';
	const secondaryText = hasName && hasCompany ? trimmedCompany : '';

	const innerWidth = calculateTooltipInnerWidth(primaryText, secondaryText, trimmedTitle);
	return innerWidth + STROKE_PADDING * 2;
};

// Fixed height (includes stroke padding)
export const MAP_TOOLTIP_HEIGHT = 80 + STROKE_PADDING;

// Anchor point (pointer tip position, adjusted for stroke padding)
export const MAP_TOOLTIP_ANCHOR_X = 23.5 + STROKE_PADDING;
export const MAP_TOOLTIP_ANCHOR_Y = 80 + STROKE_PADDING;

