// Browser-side coarse geolocation via IP. Never prompts the user.
// Used for "feels nearby" experiences (curated search) where exact location
// isn't required. Cached in localStorage so we don't hit the upstream service
// on every interaction.

const STORAGE_KEY = 'murmur_approximate_location_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const REQUEST_TIMEOUT_MS = 4000;

export interface ApproximateLocation {
	lat: number | null;
	lon: number | null;
	city: string | null;
	region: string | null; // state name or code, depending on provider
	regionCode: string | null;
	country: string | null;
	source: 'cache' | 'ipapi.co' | 'ipwho.is' | 'none';
}

interface StoredLocation extends ApproximateLocation {
	resolvedAt: number;
}

const empty = (source: ApproximateLocation['source']): ApproximateLocation => ({
	lat: null,
	lon: null,
	city: null,
	region: null,
	regionCode: null,
	country: null,
	source,
});

const readCache = (): ApproximateLocation | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredLocation;
		if (!parsed || typeof parsed.resolvedAt !== 'number') return null;
		if (Date.now() - parsed.resolvedAt > TTL_MS) return null;
		return { ...parsed, source: 'cache' };
	} catch {
		return null;
	}
};

const writeCache = (loc: ApproximateLocation): void => {
	if (typeof window === 'undefined') return;
	try {
		const payload: StoredLocation = { ...loc, resolvedAt: Date.now() };
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	} catch {
		// quota errors etc. — fine to ignore, the location is non-critical.
	}
};

const fetchWithTimeout = async (url: string): Promise<Response | null> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		return res;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
};

const tryIpapi = async (): Promise<ApproximateLocation | null> => {
	const res = await fetchWithTimeout('https://ipapi.co/json/');
	if (!res || !res.ok) return null;
	try {
		const data = (await res.json()) as Record<string, unknown>;
		const lat = typeof data.latitude === 'number' ? data.latitude : null;
		const lon = typeof data.longitude === 'number' ? data.longitude : null;
		if (lat == null || lon == null) return null;
		return {
			lat,
			lon,
			city: typeof data.city === 'string' ? data.city : null,
			region: typeof data.region === 'string' ? data.region : null,
			regionCode: typeof data.region_code === 'string' ? data.region_code : null,
			country: typeof data.country_name === 'string' ? data.country_name : null,
			source: 'ipapi.co',
		};
	} catch {
		return null;
	}
};

const tryIpwhois = async (): Promise<ApproximateLocation | null> => {
	const res = await fetchWithTimeout('https://ipwho.is/');
	if (!res || !res.ok) return null;
	try {
		const data = (await res.json()) as Record<string, unknown>;
		const success = data.success !== false;
		if (!success) return null;
		const lat = typeof data.latitude === 'number' ? data.latitude : null;
		const lon = typeof data.longitude === 'number' ? data.longitude : null;
		if (lat == null || lon == null) return null;
		return {
			lat,
			lon,
			city: typeof data.city === 'string' ? data.city : null,
			region: typeof data.region === 'string' ? data.region : null,
			regionCode: typeof data.region_code === 'string' ? data.region_code : null,
			country: typeof data.country === 'string' ? data.country : null,
			source: 'ipwho.is',
		};
	} catch {
		return null;
	}
};

let inFlight: Promise<ApproximateLocation> | null = null;

export const getApproximateLocation = async (
	options: { forceRefresh?: boolean } = {}
): Promise<ApproximateLocation> => {
	if (!options.forceRefresh) {
		const cached = readCache();
		if (cached) return cached;
	}
	if (inFlight) return inFlight;

	inFlight = (async () => {
		// Try ipapi.co first (more accurate region naming), fall back to ipwho.is
		// (different provider/network path) so a single outage doesn't kill us.
		const resolved = (await tryIpapi()) ?? (await tryIpwhois());
		if (resolved) {
			writeCache(resolved);
			return resolved;
		}
		return empty('none');
	})();

	try {
		return await inFlight;
	} finally {
		inFlight = null;
	}
};
