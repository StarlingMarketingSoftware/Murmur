import { fetchSampleCitiesWeather } from './fetchOpenMeteo';
import { RegionWeather } from './regions';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

type CacheEntry = {
	data: RegionWeather[];
	fetchedAt: number;
};

let cached: CacheEntry | null = null;
let inFlight: Promise<RegionWeather[] | null> | null = null;

export async function getCachedWeather(): Promise<RegionWeather[] | null> {
	const now = Date.now();
	if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
		return cached.data;
	}

	if (inFlight) return inFlight;

	inFlight = fetchSampleCitiesWeather()
		.then((data) => {
			if (data) {
				cached = { data, fetchedAt: Date.now() };
				return data;
			}
			return cached?.data ?? null;
		})
		.finally(() => {
			inFlight = null;
		});

	return inFlight;
}
