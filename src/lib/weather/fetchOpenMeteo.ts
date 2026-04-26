import { RegionWeather, SAMPLE_CITIES } from './regions';
import { wmoCodeToMood } from './wmoToMood';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 5000;

type OpenMeteoCurrent = {
	weather_code: number;
	temperature_2m: number;
	precipitation: number;
	cloud_cover: number;
	wind_speed_10m: number;
	is_day: number;
};

type OpenMeteoSingleResponse = {
	current?: OpenMeteoCurrent;
};

export async function fetchSampleCitiesWeather(): Promise<RegionWeather[] | null> {
	const lats = SAMPLE_CITIES.map((c) => c.lat).join(',');
	const lngs = SAMPLE_CITIES.map((c) => c.lng).join(',');
	const params = new URLSearchParams({
		latitude: lats,
		longitude: lngs,
		current: 'weather_code,temperature_2m,precipitation,cloud_cover,wind_speed_10m,is_day',
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
		const limit = Math.min(arr.length, SAMPLE_CITIES.length);
		for (let i = 0; i < limit; i++) {
			const city = SAMPLE_CITIES[i];
			const current = arr[i]?.current;
			if (!current) continue;
			out.push({
				regionKey: city.key,
				regionLabel: city.label,
				mood: wmoCodeToMood(
					current.weather_code,
					current.precipitation,
					current.wind_speed_10m
				),
				weatherCode: current.weather_code,
				temperatureF: current.temperature_2m,
				precipitationMm: current.precipitation,
				windSpeedMph: current.wind_speed_10m,
				isDay: current.is_day === 1,
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
