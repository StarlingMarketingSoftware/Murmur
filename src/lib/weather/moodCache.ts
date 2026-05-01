import { fetchSampleCitiesWeather } from './fetchOpenMeteo';
import { RegionWeather } from './regions';

// Aligned with the hook's poll cadence (~15 min). Most polls hit cache; each
// fresh fetch actually delivers new conditions. Open-Meteo current data only
// updates on the order of tens of minutes, so going faster wouldn't help.
const CACHE_TTL_MS = 15 * 60_000;

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
