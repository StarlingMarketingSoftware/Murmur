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

// Airbnb-style "snappy" ease-out: CSS cubic-bezier(0, 0, 0.3, 1).
// Mapbox easing functions are time->progress (t in [0,1]) like CSS timing functions.
export const mapboxEaseOutAirbnb = (t: number): number => {
	const x = t < 0 ? 0 : t > 1 ? 1 : t;
	if (x === 0 || x === 1) return x;

	// Control points:
	//   P0=(0,0), P1=(0,0), P2=(0.3,1), P3=(1,1)
	// So:
	//   x(u) = 0.9u^2 + 0.1u^3
	//   y(u) = 3u^2 - 2u^3
	//
	// Solve x(u)=x for u, then return y(u).
	let u = Math.sqrt(x); // good initial guess since x(u) ~ 0.9u^2 near 0
	for (let i = 0; i < 8; i++) {
		const u2 = u * u;
		const u3 = u2 * u;
		const xEst = 0.9 * u2 + 0.1 * u3;
		const dx = xEst - x;
		if (Math.abs(dx) < 1e-6) break;
		const dxdU = 1.8 * u + 0.3 * u2;
		if (dxdU === 0) break;
		u -= dx / dxdU;
		if (u <= 0) {
			u = 0;
			break;
		}
		if (u >= 1) {
			u = 1;
			break;
		}
	}

	// Newton can get slightly off at the extremes; clamp and compute final y(u).
	if (u < 0) u = 0;
	else if (u > 1) u = 1;
	const u2 = u * u;
	const u3 = u2 * u;
	return 3 * u2 - 2 * u3;
};
