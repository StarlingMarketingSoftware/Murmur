import {
	getTooltipCategoryIconSpec,
	isCleanMapMarkerCategory,
} from './mapTooltipCategoryIcons';

const DEFAULT_PIN_FILL_COLOR = '#D21E1F';
const DEFAULT_PIN_STROKE_COLOR = '#FFFFFF';
const DEFAULT_PIN_BASE_COLOR = '#FFFFFF';

export const MAP_MARKER_PIN_VIEWBOX_WIDTH = 39;
export const MAP_MARKER_PIN_VIEWBOX_HEIGHT = 44;
export const MAP_MARKER_PIN_CIRCLE_DIAMETER = 36;
export const MAP_MARKER_PIN_CIRCLE_CENTER_X = 19.5;
export const MAP_MARKER_PIN_CIRCLE_CENTER_Y = 19.5;

// Category icon sizing inside the colored circle of the pin.
const MARKER_CATEGORY_ICON_SIZE = 24;

export const generateUncategorizedContactMarkerSvg = (): string => {
	// Keep the supplied 32x31 artwork centered on the existing pin anchor.
	return `<svg width="39" height="44" viewBox="0 0 39 44" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(3.5 4)">
  <ellipse cx="16" cy="15.5" rx="16" ry="15.5" fill="url(#paint0_radial_uncategorized_contact_marker)"/>
  <path d="M13.6465 4.43848C14.0364 3.80011 14.9636 3.80011 15.3535 4.43848L19.6016 11.3984L26.5615 15.6465C27.1999 16.0364 27.1999 16.9636 26.5615 17.3535L19.6016 21.6016L15.3535 28.5615C14.9636 29.1999 14.0364 29.1999 13.6465 28.5615L9.39844 21.6016L2.43848 17.3535C1.80011 16.9636 1.80011 16.0364 2.43848 15.6465L9.39844 11.3984L13.6465 4.43848Z" fill="#5BB6DD" stroke="white"/>
  <defs>
    <radialGradient id="paint0_radial_uncategorized_contact_marker" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 15.5) rotate(90) scale(15.5 16)">
      <stop offset="0.3125" stop-color="white"/>
      <stop offset="1" stop-color="#E8F7FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
</g>
</svg>`;
};

export const generateUncategorizedContactMarkerIconUrl = (): string =>
	`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateUncategorizedContactMarkerSvg()
	)}`;

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
	searchWhat?: string | null,
	baseColor: string = DEFAULT_PIN_BASE_COLOR
): string => {
	if (!isCleanMapMarkerCategory(searchWhat)) {
		return generateUncategorizedContactMarkerSvg();
	}

	const safeFillColor = isValidHexColor(fillColor) ? fillColor.trim() : DEFAULT_PIN_FILL_COLOR;
	const safeStrokeColor = isValidHexColor(strokeColor)
		? strokeColor.trim()
		: DEFAULT_PIN_STROKE_COLOR;
	const safeBaseColor = isValidHexColor(baseColor) ? baseColor.trim() : DEFAULT_PIN_BASE_COLOR;

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

	// NOTE: The marker color is controlled by the center circle fill (rect). The base "tail" and
	// circle stroke can be customized via `baseColor` / `strokeColor`.
	return `<svg width="39" height="44" viewBox="0 0 39 44" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="${markerCircleClipId}">
    <circle cx="${MAP_MARKER_PIN_CIRCLE_CENTER_X}" cy="${MAP_MARKER_PIN_CIRCLE_CENTER_Y}" r="${
		MAP_MARKER_PIN_CIRCLE_DIAMETER / 2
	}"/>
  </clipPath>
</defs>
<path d="M30 34C30 38.4183 17.5 46 18.5 43.5C21 45.5 9 38.4183 9 34C9 29.5817 13.701 26 19.5 26C25.299 26 30 29.5817 30 34Z" fill="${safeBaseColor}"/>
<rect x="1.5" y="1.5" width="36" height="36" rx="18" fill="${safeFillColor}" stroke="${safeStrokeColor}" stroke-width="3"/>
${categoryIcon ? `\n${categoryIcon}\n` : ''}
</svg>`;
};

export const generateMapMarkerPinIconUrl = (
	fillColor?: string,
	strokeColor?: string,
	searchWhat?: string | null,
	baseColor?: string
): string => {
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateMapMarkerPinSvg(
			fillColor ?? DEFAULT_PIN_FILL_COLOR,
			strokeColor ?? DEFAULT_PIN_STROKE_COLOR,
			searchWhat,
			baseColor ?? DEFAULT_PIN_BASE_COLOR
		)
	)}`;
};
