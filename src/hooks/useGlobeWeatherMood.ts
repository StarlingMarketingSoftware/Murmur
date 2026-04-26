'use client';

import { useQuery } from '@tanstack/react-query';
import { isValidMood, WeatherMood } from '@/lib/weather/regions';

type GlobeMoodResponse = {
	regionKey: string;
	regionLabel: string;
	mood: WeatherMood;
	temperatureF: number | null;
	fetchedAt: number | null;
};

const QUERY_KEY = ['globe-weather-mood'] as const;

const FALLBACK: GlobeMoodResponse = {
	regionKey: 'normal',
	regionLabel: 'Normal',
	mood: 'normal',
	temperatureF: null,
	fetchedAt: null,
};

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
				const res = await fetch(url, { credentials: 'include' });
				if (!res.ok) return FALLBACK;
				return (await res.json()) as GlobeMoodResponse;
			} catch {
				return FALLBACK;
			}
		},
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	return {
		mood: query.data?.mood ?? 'normal',
		regionLabel: query.data?.regionLabel ?? null,
		temperatureF: query.data?.temperatureF ?? null,
		isLoading: query.isLoading,
	};
}
