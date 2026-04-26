'use client';

import { useEffect, useState } from 'react';

// "Night outside, for this user." Driven entirely by the browser's local clock —
// no per-location sun-time API needed. Seasonal/latitude variation in real
// sunrise time is bounded to ~±90 min, well below the visual fidelity of the
// stylized globe lighting; using the user's actual clock guarantees the
// hemisphere is always right.
const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 19;
const RAMP_HOURS = 1;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const easeInOutCubic = (t: number): number => {
	const x = clamp(t, 0, 1);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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

function nightTFromLocalDate(date: Date): number {
	const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

	// Dawn ramp: 1 → 0 ending at sunrise.
	if (hour < SUNRISE_HOUR - RAMP_HOURS) return 1;
	if (hour < SUNRISE_HOUR) {
		const t = (hour - (SUNRISE_HOUR - RAMP_HOURS)) / RAMP_HOURS;
		return 1 - easeInOutCubic(t);
	}
	// Day.
	if (hour < SUNSET_HOUR) return 0;
	// Dusk ramp: 0 → 1 starting at sunset.
	if (hour < SUNSET_HOUR + RAMP_HOURS) {
		const t = (hour - SUNSET_HOUR) / RAMP_HOURS;
		return easeInOutCubic(t);
	}
	// Night.
	return 1;
}

export function useGlobeNightLighting() {
	const devOverride = getDevNightOverride();
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNowMs(Date.now()), 60_000);
		return () => clearInterval(id);
	}, []);

	const nightT = devOverride != null ? devOverride : nightTFromLocalDate(new Date(nowMs));

	return { nightT, isLoading: false };
}
