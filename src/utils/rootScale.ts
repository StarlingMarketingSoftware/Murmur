/**
 * Returns the page's applied root scale — the factor by which viewport-space
 * coordinates from getBoundingClientRect() must be divided before being used as
 * `position: fixed` top/left values on elements portaled to <body>/<html>.
 *
 * Murmur scales its compact pages two different ways:
 * - Chrome (and other zoom-capable engines): `zoom` on <html>.
 * - Safari: `murmur-campaign-force-transform` puts `transform: scale()` on
 *   <body> instead, which makes body the containing block for fixed
 *   descendants. Computed html zoom reads 1 in that mode, so zoom-only reads
 *   silently break fixed-portal positioning in Safari.
 *
 * Measuring body's visual width against its layout width captures both
 * mechanisms (and reads 1 when neither is active).
 */
export const getMurmurRootScale = (): number => {
	if (typeof window === 'undefined') return 1;
	const body = document.body;
	if (body) {
		const layoutWidth = body.offsetWidth;
		if (layoutWidth > 0) {
			const scale = body.getBoundingClientRect().width / layoutWidth;
			if (Number.isFinite(scale) && scale > 0) return scale;
		}
	}
	const zoom = window.getComputedStyle(document.documentElement).zoom;
	if (zoom && zoom !== 'normal') {
		const zoomValue = parseFloat(zoom);
		if (Number.isFinite(zoomValue) && zoomValue > 0) return zoomValue;
	}
	return 1;
};
