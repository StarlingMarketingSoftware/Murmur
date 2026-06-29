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

// EaseOutQuart: snappy start, hard stop. Used for discrete +/- click and
// keyboard zoom requests (Airbnb-style). Higher polynomial than
// mapboxEaseOutCubic so the camera commits fast and brakes dead — no
// "floaty tail" on integer/ladder-stop zoom steps.
export const mapboxEaseOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export const easeInOutCubic = (t: number): number => {
	const x = clamp(t, 0, 1);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// Mapbox camera easing: gentle (near-zero velocity) start AND end. Unlike
// `mapboxEaseOutCubic` (which starts at maximum velocity), this accelerates out
// of rest, so a camera fly kicked off right after the user-driven scroll scrub
// — which releases at ~zero velocity — has no velocity discontinuity. That jump
// from the slow scrub into a fast ease-out fly is what read as a "jarring shift"
// when entering the map; ease-in-out makes the handoff feel continuous/gentle.
export const mapboxEaseInOutCubic = (t: number): number => {
	const x = t < 0 ? 0 : t > 1 ? 1 : t;
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// Drag-pan inertia easing for the "heavy / abrupt-stop" feel (Airbnb-style).
// Ease-out quadratic: position(t) = 2t - t². In velocity space this is a LINEAR
// decrease (constant deceleration), which is what makes it feel "weighted"
// rather than Mapbox's softer default bezier tail. Combined with a high
// `deceleration` value the coast is short and the residual velocity at the end
// is imperceptible — emulating the "hard cutoff" without a custom physics loop.
export const mapboxDragPanLinearDecel = (t: number): number => {
	const x = t < 0 ? 0 : t > 1 ? 1 : t;
	return 1 - (1 - x) * (1 - x);
};
