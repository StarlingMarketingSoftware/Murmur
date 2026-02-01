import { NextResponse, type NextRequest } from 'next/server';

import { US_STATES } from '@/constants/usStates';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type GeoStateResponse = {
	stateCode: string | null;
	stateName: string | null;
};

// Vercel-specific geo property (not in Next.js types)
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

function resolveUsState(
	candidate: string | null
): { stateCode: string; stateName: string } | null {
	if (!candidate) return null;
	const raw = candidate.trim();
	if (!raw) return null;

	// Handle ISO-style strings like "US-PA"
	const lastToken = raw.split(/[-_]/).pop()?.trim() ?? raw;

	// 1) Abbreviation
	const code = lastToken.toUpperCase();
	if (/^[A-Z]{2}$/.test(code)) {
		const match = US_STATES.find((s) => s.abbr.toUpperCase() === code);
		return match ? { stateCode: match.abbr, stateName: match.name } : null;
	}

	// 2) Full state name
	const lc = raw.toLowerCase();
	const byName = US_STATES.find((s) => s.name.toLowerCase() === lc);
	return byName ? { stateCode: byName.abbr, stateName: byName.name } : null;
}

export async function GET(req: NextRequestWithGeo) {
	// Best-effort: these headers are set by Vercel's geolocation (and some other proxies).
	// When unavailable (e.g. local dev), we return nulls.
	const geoRegion =
		typeof req.geo?.region === 'string' && req.geo.region.trim().length > 0
			? req.geo.region.trim()
			: null;

	const headers = req.headers;
	const headerRegion =
		headers.get('x-vercel-ip-country-region') ??
		headers.get('x-vercel-ip-region') ??
		headers.get('x-region') ??
		null;

	const resolved = resolveUsState(geoRegion ?? headerRegion);

	const res = NextResponse.json<GeoStateResponse>({
		stateCode: resolved?.stateCode ?? null,
		stateName: resolved?.stateName ?? null,
	});
	res.headers.set('Cache-Control', 'private, no-store, max-age=0');
	return res;
}

