'use client';

import { useQuery } from '@tanstack/react-query';
import { isValidMood, SAMPLE_CITIES, WeatherMood } from '@/lib/weather/regions';

type GlobeMoodResponse = {
	regionKey: string;
	regionLabel: string;
	mood: WeatherMood;
	temperatureF: number | null;
	fetchedAt: number | null;
};

type WeatherRegionCenter = {
	lat: number;
	lng: number;
};

const QUERY_KEY = ['globe-weather-mood'] as const;
// Keep the globe's weather-driven mood feeling "alive" during long sessions.
// This is intentionally slower than typical polling UIs; weather shifts are
// gradual, and the map visuals themselves interpolate when the mood flips.
const REFRESH_INTERVAL_MS = 10 * 60_000;
const STALE_TIME_MS = 5 * 60_000;

const FALLBACK: GlobeMoodResponse = {
	regionKey: 'normal',
	regionLabel: 'Normal',
	mood: 'normal',
	temperatureF: null,
	fetchedAt: null,
};

function centerForRegionKey(regionKey: string | null | undefined): WeatherRegionCenter | null {
	if (!regionKey) return null;
	const match = SAMPLE_CITIES.find((city) => city.key === regionKey);
	return match ? { lat: match.lat, lng: match.lng } : null;
}

function getBrowserTimezone(): string | null {
	if (typeof Intl === 'undefined') return null;
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
	} catch {
		return null;
	}
}

function getDevMoodOverride(): WeatherMood | null {
	if (typeof window === 'undefined') return null;
	try {
		const m = new URLSearchParams(window.location.search).get('devMood');
		return isValidMood(m) ? m : null;
	} catch {
		return null;
	}
}

export function useGlobeWeatherMood() {
	const devOverride = getDevMoodOverride();

	const query = useQuery<GlobeMoodResponse>({
		queryKey: [...QUERY_KEY, devOverride ?? null],
		queryFn: async () => {
			const tz = getBrowserTimezone();
			const params = new URLSearchParams();
			if (tz) params.set('tz', tz);
			if (devOverride) params.set('devMood', devOverride);
			const url = `/api/weather/globe-mood${params.toString() ? `?${params.toString()}` : ''}`;
			try {
				// Bypass browser HTTP caching so periodic refreshes can actually observe
				// server-side updates (the API route handles its own caching).
				const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
				if (!res.ok) return FALLBACK;
				return (await res.json()) as GlobeMoodResponse;
			} catch {
				return FALLBACK;
			}
		},
		staleTime: STALE_TIME_MS,
		gcTime: 60 * 60 * 1000,
		refetchInterval: REFRESH_INTERVAL_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: true,
		retry: 1,
	});

	return {
		mood: query.data?.mood ?? 'normal',
		regionLabel: query.data?.regionLabel ?? null,
		regionCenter: centerForRegionKey(query.data?.regionKey),
		temperatureF: query.data?.temperatureF ?? null,
		isLoading: query.isLoading,
	};
}
