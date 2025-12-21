const DEFAULT_TOOLTIP_FILL_COLOR = '#0E8530';

const isValidHexColor = (value: string): boolean => {
	const trimmed = value.trim();
	return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
};

// Generates a map marker hover tooltip SVG with contact name and company
export const generateMapTooltipSvg = (
	name: string,
	company: string,
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

	const hasName = name && name.trim().length > 0;
	const hasCompany = company && company.trim().length > 0;

	// If no name, show company as the primary bold text
	const primaryText = escapeSvgText(hasName ? name : hasCompany ? company : 'Unknown');
	// Only show secondary text if we have both name and company
	const secondaryText = hasName && hasCompany ? escapeSvgText(company) : '';

	// Calculate width based on text length (approximate)
	const primaryWidth = primaryText.length * 10 + 40;
	const secondaryWidth = secondaryText ? secondaryText.length * 7.5 + 40 : 0;
	const innerWidth = Math.max(160, Math.min(350, Math.max(primaryWidth, secondaryWidth)));

	// Add padding for stroke (2px stroke = 1px on each side)
	const strokePadding = 2;
	const svgWidth = innerWidth + strokePadding * 2;
	const svgHeight = 56 + strokePadding;

	// If only one line of text, center it vertically
	const primaryY = secondaryText ? 18 : 27;

	// Offset all coordinates by strokePadding to center the shape
	const offsetX = strokePadding;
	const offsetY = strokePadding;

	return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M${innerWidth - 8 + offsetX} ${offsetY}C${innerWidth - 3.582 + offsetX} ${offsetY} ${innerWidth + offsetX} ${3.58172 + offsetY} ${innerWidth + offsetX} ${8 + offsetY}V${38 + offsetY}C${innerWidth + offsetX} ${42.4183 + offsetY} ${innerWidth - 3.582 + offsetX} ${46 + offsetY} ${innerWidth - 8 + offsetX} ${46 + offsetY}H${35.4326 + offsetX}L${23.5 + offsetX} ${56 + offsetY}L${11.5674 + offsetX} ${46 + offsetY}H${8 + offsetX}C${3.58172 + offsetX} ${46 + offsetY} ${offsetX} ${42.4183 + offsetY} ${offsetX} ${38 + offsetY}V${8 + offsetY}C${offsetX} ${3.58172 + offsetY} ${3.58172 + offsetX} ${offsetY} ${8 + offsetX} ${offsetY}H${innerWidth - 8 + offsetX}Z" fill="${safeFillColor}" stroke="black" stroke-width="2"/>
<text x="${18 + offsetX}" y="${primaryY + offsetY}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textFill}">${primaryText}</text>
${secondaryText ? `<text x="${18 + offsetX}" y="${36 + offsetY}" font-family="Arial, sans-serif" font-size="13" fill="${textFill}">${secondaryText}</text>` : ''}
</svg>`;
};

// Generate data URL for use in Google Maps markers
export const generateMapTooltipIconUrl = (
	name: string,
	company: string,
	fillColor?: string
): string => {
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateMapTooltipSvg(name, company, fillColor ?? DEFAULT_TOOLTIP_FILL_COLOR)
	)}`;
};

// Stroke padding added to SVG dimensions
const STROKE_PADDING = 2;

// Calculate width based on text (for Google Maps sizing)
export const calculateTooltipWidth = (name: string, company: string): number => {
	const hasName = name && name.trim().length > 0;
	const hasCompany = company && company.trim().length > 0;

	const primaryText = hasName ? name : hasCompany ? company : 'Unknown';
	const secondaryText = hasName && hasCompany ? company : '';

	const primaryWidth = primaryText.length * 10 + 40;
	const secondaryWidth = secondaryText ? secondaryText.length * 7.5 + 40 : 0;
	const innerWidth = Math.max(160, Math.min(350, Math.max(primaryWidth, secondaryWidth)));
	// Add padding for stroke on both sides
	return innerWidth + STROKE_PADDING * 2;
};

// Fixed height (includes stroke padding)
export const MAP_TOOLTIP_HEIGHT = 56 + STROKE_PADDING;

// Anchor point (pointer tip position, adjusted for stroke padding)
export const MAP_TOOLTIP_ANCHOR_X = 23.5 + STROKE_PADDING;
export const MAP_TOOLTIP_ANCHOR_Y = 56 + STROKE_PADDING;

