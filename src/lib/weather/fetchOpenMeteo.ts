import { RegionWeather, SAMPLE_CITIES } from './regions';
import { wmoCodeToMood } from './wmoToMood';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 5000;
// Tolerance when matching a response entry to a SAMPLE_CITIES entry by lat/lng.
// Open-Meteo snaps to the nearest grid cell so the echoed coordinates can
// differ by a fraction of a degree; 0.5° is plenty to disambiguate the 9
// cities (which are hundreds of miles apart) without false matches.
const COORD_MATCH_TOLERANCE_DEG = 0.5;

type OpenMeteoCurrent = {
	weather_code: number;
	temperature_2m: number;
	precipitation: number;
	cloud_cover: number;
	wind_speed_10m: number;
};

type OpenMeteoSingleResponse = {
	latitude?: number;
	longitude?: number;
	current?: OpenMeteoCurrent;
};

const matchesCityCoord = (
	entry: OpenMeteoSingleResponse | undefined,
	lat: number,
	lng: number
): boolean => {
	if (!entry || entry.latitude == null || entry.longitude == null) return false;
	return (
		Math.abs(entry.latitude - lat) <= COORD_MATCH_TOLERANCE_DEG &&
		Math.abs(entry.longitude - lng) <= COORD_MATCH_TOLERANCE_DEG
	);
};

export async function fetchSampleCitiesWeather(): Promise<RegionWeather[] | null> {
	const lats = SAMPLE_CITIES.map((c) => c.lat).join(',');
	const lngs = SAMPLE_CITIES.map((c) => c.lng).join(',');
	const params = new URLSearchParams({
		latitude: lats,
		longitude: lngs,
		current: 'weather_code,temperature_2m,precipitation,cloud_cover,wind_speed_10m',
		temperature_unit: 'fahrenheit',
		wind_speed_unit: 'mph',
	});

	const url = `${ENDPOINT}?${params.toString()}`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		const json = (await res.json()) as OpenMeteoSingleResponse | OpenMeteoSingleResponse[];
		const arr = Array.isArray(json) ? json : [json];

		const fetchedAt = Date.now();
		const out: RegionWeather[] = [];
		// Lenient: skip cities with no `current` field instead of aborting the whole
		// batch. Open-Meteo is reliable but a partial response shouldn't kill all 9.
		for (let i = 0; i < SAMPLE_CITIES.length; i++) {
			const city = SAMPLE_CITIES[i];
			// Prefer index alignment (the batched endpoint preserves order in
			// practice), but verify against the echoed lat/lng. If the index
			// entry doesn't match, scan for the right one — silently
			// misattributing weather to the wrong region is far worse than
			// dropping a single response.
			let entry: OpenMeteoSingleResponse | undefined = arr[i];
			if (!matchesCityCoord(entry, city.lat, city.lng)) {
				entry = arr.find((e) => matchesCityCoord(e, city.lat, city.lng));
			}
			const current = entry?.current;
			if (!current) continue;
			out.push({
				regionKey: city.key,
				mood: wmoCodeToMood(current.weather_code, current.precipitation),
				weatherCode: current.weather_code,
				temperatureF: current.temperature_2m,
				precipitationMm: current.precipitation,
				windSpeedMph: current.wind_speed_10m,
				fetchedAt,
			});
		}
		return out.length > 0 ? out : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}
