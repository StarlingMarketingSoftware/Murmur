export const generateSelectedUncategorizedContactMarkerSvg = (
	accentColor = '#50A5C9',
	centerFillColor = 'white'
): string => {
	return `<svg width="78" height="75" viewBox="0 0 78 75" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="39" cy="37.5" rx="39" ry="37.5" fill="url(#selected_uncategorized_contact_marker_gradient)"/>
<circle cx="39.5" cy="43.5" r="13.5" fill="${centerFillColor}" stroke="${accentColor}" stroke-width="4"/>
<path d="M39.0557 37.2285C39.2584 36.8964 39.7416 36.8964 39.9443 37.2285L42.1523 40.8477L45.7715 43.0557C46.1036 43.2584 46.1036 43.7416 45.7715 43.9443L42.1523 46.1523L39.9443 49.7715C39.7416 50.1036 39.2584 50.1036 39.0557 49.7715L36.8477 46.1523L33.2285 43.9443C32.8964 43.7416 32.8964 43.2584 33.2285 43.0557L36.8477 40.8477L39.0557 37.2285Z" fill="${accentColor}" stroke="white" stroke-width="0.52"/>
<defs>
<radialGradient id="selected_uncategorized_contact_marker_gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39 37.5) rotate(90) scale(37.5 39)">
<stop offset="0.3125" stop-color="white"/>
<stop offset="1" stop-color="#E8F7FF" stop-opacity="0"/>
</radialGradient>
</defs>
</svg>`;
};

export const generateSelectedUncategorizedContactMarkerIconUrl = (
	accentColor?: string,
	centerFillColor?: string
): string =>
	`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
		generateSelectedUncategorizedContactMarkerSvg(accentColor, centerFillColor)
	)}`;
