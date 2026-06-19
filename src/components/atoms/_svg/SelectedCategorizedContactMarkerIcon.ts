export const generateSelectedCategorizedContactMarkerSvg = (
	strokeColor = '#739EE8',
	centerFillColor = 'white'
): string => {
	return `<svg width="78" height="75" viewBox="0 0 78 75" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="39" cy="37.5" rx="39" ry="37.5" fill="url(#selected_categorized_contact_marker_gradient)"/>
<circle cx="39.5" cy="43.5" r="13.5" fill="${centerFillColor}" stroke="${strokeColor}" stroke-width="4"/>
<defs>
<radialGradient id="selected_categorized_contact_marker_gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39 37.5) rotate(90) scale(37.5 39)">
<stop offset="0.3125" stop-color="white"/>
<stop offset="1" stop-color="#E8F7FF" stop-opacity="0"/>
</radialGradient>
</defs>
</svg>`;
};

export const generateSelectedCategorizedContactMarkerIconUrl = (
	strokeColor?: string,
	centerFillColor?: string
): string =>
	`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateSelectedCategorizedContactMarkerSvg(strokeColor, centerFillColor)
	)}`;
