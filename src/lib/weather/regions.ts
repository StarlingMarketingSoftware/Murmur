export type WeatherMood =
	| 'sunny'
	| 'normal'
	| 'cloudy'
	| 'stormy'
	| 'snowy';

const VALID_MOODS = new Set<WeatherMood>([
	'sunny',
	'normal',
	'cloudy',
	'stormy',
	'snowy',
]);

export function isValidMood(value: unknown): value is WeatherMood {
	return typeof value === 'string' && VALID_MOODS.has(value as WeatherMood);
}

export type SampleCity = {
	key: string;
	label: string;
	lat: number;
	lng: number;
};

export const SAMPLE_CITIES: SampleCity[] = [
	{ key: 'pacific-northwest', label: 'Pacific Northwest', lat: 47.61, lng: -122.33 },
	{ key: 'pacific-southwest', label: 'Pacific Southwest', lat: 34.05, lng: -118.24 },
	{ key: 'mountain', label: 'Mountain', lat: 39.74, lng: -104.99 },
	{ key: 'southwest', label: 'Southwest', lat: 33.45, lng: -112.07 },
	{ key: 'plains', label: 'Plains', lat: 39.1, lng: -94.58 },
	{ key: 'midwest', label: 'Midwest', lat: 41.88, lng: -87.63 },
	{ key: 'south', label: 'South', lat: 29.76, lng: -95.37 },
	{ key: 'southeast', label: 'Southeast', lat: 33.75, lng: -84.39 },
	{ key: 'northeast', label: 'Northeast', lat: 40.71, lng: -74.0 },
];

export type RegionWeather = {
	regionKey: string;
	regionLabel: string;
	mood: WeatherMood;
	weatherCode: number;
	temperatureF: number;
	precipitationMm: number;
	windSpeedMph: number;
	isDay: boolean;
	fetchedAt: number;
};

const TIMEZONE_TO_REGION_KEY: Record<string, string> = {
	'America/Los_Angeles': 'pacific-southwest',
	'America/Vancouver': 'pacific-northwest',
	'America/Tijuana': 'pacific-southwest',
	'America/Denver': 'mountain',
	'America/Boise': 'mountain',
	'America/Edmonton': 'mountain',
	'America/Phoenix': 'southwest',
	'America/Chicago': 'midwest',
	'America/Winnipeg': 'midwest',
	'America/Mexico_City': 'south',
	'America/New_York': 'northeast',
	'America/Detroit': 'midwest',
	'America/Indiana/Indianapolis': 'midwest',
	'America/Toronto': 'northeast',
	'America/Anchorage': 'pacific-northwest',
	'Pacific/Honolulu': 'pacific-southwest',
};

export function regionKeyFromTimezone(tz: string | null | undefined): string | null {
	if (!tz) return null;
	return TIMEZONE_TO_REGION_KEY[tz] ?? null;
}

export function nearestSampleCity(lat: number, lng: number): SampleCity {
	let best = SAMPLE_CITIES[0];
	let bestDist = haversineMiles(lat, lng, best.lat, best.lng);
	for (let i = 1; i < SAMPLE_CITIES.length; i++) {
		const c = SAMPLE_CITIES[i];
		const d = haversineMiles(lat, lng, c.lat, c.lng);
		if (d < bestDist) {
			bestDist = d;
			best = c;
		}
	}
	return best;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 3958.8;
	const toRad = (n: number) => (n * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}
