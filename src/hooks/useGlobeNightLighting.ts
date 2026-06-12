'use client';

import { useEffect, useMemo, useState } from 'react';

// "Night outside, for this user." Driven entirely by the browser's local clock —
// no per-location sun-time API needed. Seasonal/latitude variation in real sunrise
// time is bounded to ~±90 min, well below the visual fidelity of the stylized globe
// lighting; using the user's actual clock guarantees the hemisphere is always right.
//
// IMPORTANT: We intentionally model sunrise/sunset as short, fixed-duration transitions
// so the mode can dynamically animate within a session (instead of feeling like a
// one-time "load" choice).
const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 19;
const DEFAULT_TRANSITION_MS = 60_000;

// MANUAL SUNRISE OVERRIDE FOR TESTING.
// Set to true to force the sunrise transition on a loop (replays every
// `transitionMs`, so you can keep tuning the lighting while it animates).
// Pair with `?devSunTransitionMs=...` in the URL to slow the transition for
// frame-by-frame inspection. Set back to null when done.
const MANUAL_SUNRISE_OVERRIDE: boolean | null = null;

// MANUAL SUNSET OVERRIDE FOR TESTING.
// Set to true to force the sunset transition on a loop. Same `?devSunTransitionMs=...`
// pairing as the sunrise override. Set back to null when done.
// (If both sunrise and sunset overrides are true at once, sunrise wins.)
const MANUAL_SUNSET_OVERRIDE: boolean | null = null;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const easeInOutCubic = (t: number): number => {
	const x = clamp(t, 0, 1);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export type GlobeSunPhase = 'night' | 'sunrise' | 'day' | 'sunset';

export type GlobeNightLightingState = {
	nightT: number;
	phase: GlobeSunPhase;
	phaseStartMs: number;
	phaseEndMs: number;
	transitionMs: number;
	isLoading: boolean;
};

function getDevNightOverride(): number | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = new URLSearchParams(window.location.search).get('devNightT');
		if (!raw) return null;
		const n = Number(raw);
		return Number.isFinite(n) ? clamp(n, 0, 1) : null;
	} catch {
		return null;
	}
}

function getDevSunTransitionMs(): number | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = new URLSearchParams(window.location.search).get('devSunTransitionMs');
		if (!raw) return null;
		const n = Number(raw);
		// Clamp to [1s, 15m] — long enough to visually verify, short enough to avoid
		// accidentally pinning the UI in "transition mode" during debugging.
		if (!Number.isFinite(n)) return null;
		return clamp(Math.round(n), 1_000, 15 * 60_000);
	} catch {
		return null;
	}
}

function computeNightLighting(
	nowMs: number,
	transitionMs: number
): Omit<GlobeNightLightingState, 'isLoading'> {
	const msPerHour = 3600_000;
	const msPerDay = 24 * msPerHour;

	const dayStart = new Date(nowMs);
	dayStart.setHours(0, 0, 0, 0);
	const dayStartMs = dayStart.getTime();

	const sunriseStartMs = dayStartMs + SUNRISE_HOUR * msPerHour;
	const sunriseEndMs = sunriseStartMs + transitionMs;
	const sunsetStartMs = dayStartMs + SUNSET_HOUR * msPerHour;
	const sunsetEndMs = sunsetStartMs + transitionMs;

	// Pre-dawn (still "night" until sunrise starts).
	if (nowMs < sunriseStartMs) {
		const prevDayStartMs = dayStartMs - msPerDay;
		const prevSunsetEndMs = prevDayStartMs + SUNSET_HOUR * msPerHour + transitionMs;
		return {
			nightT: 1,
			phase: 'night',
			phaseStartMs: prevSunsetEndMs,
			phaseEndMs: sunriseStartMs,
			transitionMs,
		};
	}

	// Sunrise transition: night -> day.
	if (nowMs < sunriseEndMs) {
		const t = (nowMs - sunriseStartMs) / transitionMs;
		const eased = easeInOutCubic(t);
		return {
			nightT: 1 - eased,
			phase: 'sunrise',
			phaseStartMs: sunriseStartMs,
			phaseEndMs: sunriseEndMs,
			transitionMs,
		};
	}

	// Daytime.
	if (nowMs < sunsetStartMs) {
		return {
			nightT: 0,
			phase: 'day',
			phaseStartMs: sunriseEndMs,
			phaseEndMs: sunsetStartMs,
			transitionMs,
		};
	}

	// Sunset transition: day -> night.
	if (nowMs < sunsetEndMs) {
		const t = (nowMs - sunsetStartMs) / transitionMs;
		const eased = easeInOutCubic(t);
		return {
			nightT: eased,
			phase: 'sunset',
			phaseStartMs: sunsetStartMs,
			phaseEndMs: sunsetEndMs,
			transitionMs,
		};
	}

	// Post-sunset night: until tomorrow's sunrise starts.
	const nextSunriseStartMs = dayStartMs + msPerDay + SUNRISE_HOUR * msPerHour;
	return {
		nightT: 1,
		phase: 'night',
		phaseStartMs: sunsetEndMs,
		phaseEndMs: nextSunriseStartMs,
		transitionMs,
	};
}

export function useGlobeNightLighting(): GlobeNightLightingState {
	const devOverride = getDevNightOverride();
	const transitionMs = getDevSunTransitionMs() ?? DEFAULT_TRANSITION_MS;

	// We only need to re-render when the "sun phase" changes (night -> sunrise -> day -> sunset -> ...).
	// The actual animation is driven imperatively by the map, using `phaseStartMs` / `phaseEndMs`.
	const [phaseTick, setPhaseTick] = useState(0);

	const computed = useMemo(() => {
		// Intentional: `phaseTick` forces a recompute at phase boundaries (sunrise start/end, sunset start/end).
		void phaseTick;
		const nowMs = Date.now();
		if (devOverride != null) {
			const nightT = clamp(devOverride, 0, 1);
			const phase: GlobeSunPhase = nightT >= 0.5 ? 'night' : 'day';
			return {
				nightT,
				phase,
				phaseStartMs: nowMs,
				phaseEndMs: nowMs + 365 * 24 * 3600_000,
				transitionMs,
			};
		}

		if (MANUAL_SUNRISE_OVERRIDE || MANUAL_SUNSET_OVERRIDE) {
			// Alternate phases each cycle so the globe's brightness see-saws
			// smoothly between day and night without a jarring snap-back at the
			// loop boundary (end-of-sunset is fully dark; the next sunrise picks
			// up from there). Both phases run through the same twilight wash
			// peak, so visually you still see the transition you're tuning.
			const startPhase: GlobeSunPhase = MANUAL_SUNSET_OVERRIDE ? 'sunset' : 'sunrise';
			const oppositePhase: GlobeSunPhase = startPhase === 'sunset' ? 'sunrise' : 'sunset';
			const phase = phaseTick % 2 === 0 ? startPhase : oppositePhase;
			return {
				nightT: phase === 'sunrise' ? 1 : 0,
				phase,
				phaseStartMs: nowMs,
				phaseEndMs: nowMs + transitionMs,
				transitionMs,
			};
		}

		return computeNightLighting(nowMs, transitionMs);
	}, [devOverride, transitionMs, phaseTick]);

	useEffect(() => {
		if (devOverride != null) return;
		if (typeof window === 'undefined') return;

		let timeoutId: number | null = null;

		const schedule = () => {
			const nowMs = Date.now();
			if (MANUAL_SUNRISE_OVERRIDE || MANUAL_SUNSET_OVERRIDE) {
				// Loop the override: re-tick once the transition completes so the
				// useMemo above produces a fresh phase window.
				timeoutId = window.setTimeout(
					() => setPhaseTick((t) => t + 1),
					transitionMs + 25
				);
				return;
			}
			const phaseEndMs = computeNightLighting(nowMs, transitionMs).phaseEndMs;
			const delay = clamp(phaseEndMs - nowMs + 25, 50, 2_147_483_647);
			timeoutId = window.setTimeout(() => setPhaseTick((t) => t + 1), delay);
		};

		schedule();
		return () => {
			if (timeoutId != null) window.clearTimeout(timeoutId);
		};
	}, [devOverride, transitionMs, phaseTick]);

	// Stabilize the returned object so memoized consumers (e.g. SearchResultsMap)
	// can skip re-rendering when nothing here actually changed.
	return useMemo(() => ({ ...computed, isLoading: false }), [computed]);
}
