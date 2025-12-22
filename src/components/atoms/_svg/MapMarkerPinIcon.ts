import { getTooltipCategoryIconSpec } from './mapTooltipCategoryIcons';

const DEFAULT_PIN_FILL_COLOR = '#D21E1F';
const DEFAULT_PIN_STROKE_COLOR = '#FFFFFF';

export const MAP_MARKER_PIN_VIEWBOX_WIDTH = 39;
export const MAP_MARKER_PIN_VIEWBOX_HEIGHT = 44;
export const MAP_MARKER_PIN_CIRCLE_DIAMETER = 36;
export const MAP_MARKER_PIN_CIRCLE_CENTER_X = 19.5;
export const MAP_MARKER_PIN_CIRCLE_CENTER_Y = 19.5;

// Category icon sizing inside the colored circle of the pin.
const MARKER_CATEGORY_ICON_SIZE = 24;

const isValidHexColor = (value: string): boolean => {
	const trimmed = value.trim();
	return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed);
};

// Convert React-style SVG attrs (camelCase) to SVG/XML attrs (kebab-case).
// Our category icon markup is copied from React SVG components, but we embed it into an
// XML-parsed `data:image/svg+xml` string, so we need valid SVG/XML attribute names.
const normalizeInlineSvgMarkupForXml = (markup: string): string =>
	markup
		.replaceAll('strokeWidth', 'stroke-width')
		.replaceAll('strokeLinecap', 'stroke-linecap')
		.replaceAll('strokeLinejoin', 'stroke-linejoin')
		.replaceAll('fillRule', 'fill-rule')
		.replaceAll('clipRule', 'clip-rule')
		.replaceAll('stopColor', 'stop-color')
		.replaceAll('stopOpacity', 'stop-opacity');

export const generateMapMarkerPinSvg = (
	fillColor: string = DEFAULT_PIN_FILL_COLOR,
	strokeColor: string = DEFAULT_PIN_STROKE_COLOR,
	searchWhat?: string | null
): string => {
	const safeFillColor = isValidHexColor(fillColor) ? fillColor.trim() : DEFAULT_PIN_FILL_COLOR;
	const safeStrokeColor = isValidHexColor(strokeColor)
		? strokeColor.trim()
		: DEFAULT_PIN_STROKE_COLOR;

	const categoryIconSpec = getTooltipCategoryIconSpec(searchWhat);
	const showCategoryIcon = Boolean(categoryIconSpec);
	const markerCircleClipId = 'markerCircleClip__murmur';
	const categoryIcon =
		showCategoryIcon && categoryIconSpec
			? (() => {
					const x = MAP_MARKER_PIN_CIRCLE_CENTER_X - MARKER_CATEGORY_ICON_SIZE / 2;
					const y = MAP_MARKER_PIN_CIRCLE_CENTER_Y - MARKER_CATEGORY_ICON_SIZE / 2;
					const normalized = normalizeInlineSvgMarkupForXml(categoryIconSpec.content);
					return `
<g clip-path="url(#${markerCircleClipId})">
  <svg x="${x}" y="${y}" width="${MARKER_CATEGORY_ICON_SIZE}" height="${MARKER_CATEGORY_ICON_SIZE}" viewBox="${categoryIconSpec.viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
${normalized}
  </svg>
</g>
`.trim();
				})()
			: '';

	// NOTE: The marker color is controlled by the center circle fill (rect). The rest of the
	// SVG (base + stroke) stays as-designed.
	return `<svg width="39" height="44" viewBox="0 0 39 44" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="${markerCircleClipId}">
    <circle cx="${MAP_MARKER_PIN_CIRCLE_CENTER_X}" cy="${MAP_MARKER_PIN_CIRCLE_CENTER_Y}" r="${
		MAP_MARKER_PIN_CIRCLE_DIAMETER / 2
	}"/>
  </clipPath>
</defs>
<path d="M30 34C30 38.4183 17.5 46 18.5 43.5C21 45.5 9 38.4183 9 34C9 29.5817 13.701 26 19.5 26C25.299 26 30 29.5817 30 34Z" fill="white"/>
<rect x="1.5" y="1.5" width="36" height="36" rx="18" fill="${safeFillColor}" stroke="${safeStrokeColor}" stroke-width="3"/>
${categoryIcon ? `\n${categoryIcon}\n` : ''}
</svg>`;
};

export const generateMapMarkerPinIconUrl = (
	fillColor?: string,
	strokeColor?: string,
	searchWhat?: string | null
): string => {
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateMapMarkerPinSvg(
			fillColor ?? DEFAULT_PIN_FILL_COLOR,
			strokeColor ?? DEFAULT_PIN_STROKE_COLOR,
			searchWhat
		)
	)}`;
};

