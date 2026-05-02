import { NextResponse, type NextRequest } from 'next/server';

import { getCachedWeather } from '@/lib/weather/moodCache';
import {
	isValidMood,
	nearestSampleCity,
	regionKeyFromTimezone,
	RegionWeather,
	WeatherMood,
} from '@/lib/weather/regions';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface VercelGeo {
	city?: string;
	country?: string;
	region?: string;
	latitude?: string;
	longitude?: string;
}

interface NextRequestWithGeo extends NextRequest {
	geo?: VercelGeo;
}

type GlobeMoodResponse = {
	regionKey: string;
	mood: WeatherMood;
	temperatureF: number | null;
	fetchedAt: number | null;
};

const NORMAL_FALLBACK: GlobeMoodResponse = {
	regionKey: 'normal',
	mood: 'normal',
	temperatureF: null,
	fetchedAt: null,
};

export async function GET(req: NextRequestWithGeo) {
	const url = new URL(req.url);
	const tz = url.searchParams.get('tz');
	const devMood = url.searchParams.get('devMood');

	const weather = await getCachedWeather();
	if (!weather || weather.length === 0) {
		return jsonResponse(
			devMood && isValidMood(devMood)
				? { ...NORMAL_FALLBACK, mood: devMood }
				: NORMAL_FALLBACK
		);
	}

	const region = resolveRegion(req, tz, weather);
	if (!region) return jsonResponse(NORMAL_FALLBACK);
	const response = toResponse(region);
	return jsonResponse(
		devMood && isValidMood(devMood) ? { ...response, mood: devMood } : response
	);
}

function resolveRegion(
	req: NextRequestWithGeo,
	tz: string | null,
	weather: RegionWeather[]
): RegionWeather | null {
	const lat = parseCoord(req.geo?.latitude ?? req.headers.get('x-vercel-ip-latitude'));
	const lng = parseCoord(req.geo?.longitude ?? req.headers.get('x-vercel-ip-longitude'));

	const regionKey =
		lat !== null && lng !== null
			? nearestSampleCity(lat, lng).key
			: regionKeyFromTimezone(tz);

	if (regionKey) {
		const match = weather.find((w) => w.regionKey === regionKey);
		if (match) return match;
	}

	// No geo + no timezone match (or the matched region happens to be missing
	// from a partial Open-Meteo response). Fall back to the first available
	// region rather than failing — any real weather is better than 'normal'.
	return weather[0] ?? null;
}

function toResponse(region: RegionWeather): GlobeMoodResponse {
	return {
		regionKey: region.regionKey,
		mood: region.mood,
		temperatureF: region.temperatureF,
		fetchedAt: region.fetchedAt,
	};
}

function jsonResponse(body: GlobeMoodResponse) {
	const res = NextResponse.json<GlobeMoodResponse>(body);
	res.headers.set('Cache-Control', 'private, max-age=600');
	return res;
}

function parseCoord(raw: string | null | undefined): number | null {
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}
