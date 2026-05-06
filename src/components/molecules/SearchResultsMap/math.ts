// Pure math helpers — no module-level state, no React, no Mapbox.

export const clamp = (n: number, min: number, max: number) =>
	Math.max(min, Math.min(max, n));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number) => {
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
};

export const normalizeLngDeg = (lng: number) =>
	((((lng + 180) % 360) + 360) % 360) - 180;

export const angularLngDistanceDeg = (a: number, b: number) =>
	Math.abs(normalizeLngDeg(a - b));

export const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const mapboxEaseOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number => {
	const x = clamp(t, 0, 1);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
