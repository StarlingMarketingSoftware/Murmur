import { US_STATES } from '@/constants/usStates';

type WasmGeoModule = {
	batch_haversine_km: (
		originLat: number,
		originLng: number,
		targets: Float64Array
	) => Float64Array | ArrayLike<number>;
	nearest_us_states: (stateName: string, count: number) => string[];
};

const USE_WASM_GEO = process.env.USE_WASM_GEO === 'true';

let cachedNodeWasmGeo: WasmGeoModule | null | undefined;
let hasLoggedWasmGeoLoadError = false;
let hasLoggedWasmGeoRuntimeError = false;

const logWasmGeoLoadError = (error: unknown): void => {
	if (hasLoggedWasmGeoLoadError) return;
	hasLoggedWasmGeoLoadError = true;
	console.error('[usStates] failed to load node WASM geo module, using TypeScript fallback', error);
};

const logWasmGeoRuntimeError = (error: unknown): void => {
	if (hasLoggedWasmGeoRuntimeError) return;
	hasLoggedWasmGeoRuntimeError = true;
	console.error('[usStates] WASM geo call failed, using TypeScript fallback', error);
};

const toFloat64Array = (value: Float64Array | ArrayLike<number>): Float64Array =>
	value instanceof Float64Array ? value : Float64Array.from(value);

const getNodeWasmGeoModule = (): WasmGeoModule | null => {
	if (!USE_WASM_GEO || typeof window !== 'undefined') return null;
	if (cachedNodeWasmGeo !== undefined) return cachedNodeWasmGeo;

	try {
		const maybeGlobal = globalThis as {
			__non_webpack_require__?: NodeRequire;
			require?: NodeRequire;
		};
		const dynamicRequire =
			maybeGlobal.__non_webpack_require__ ??
			maybeGlobal.require ??
			(typeof require === 'function' ? (require as NodeRequire) : null);
		if (!dynamicRequire) {
			cachedNodeWasmGeo = null;
			return cachedNodeWasmGeo;
		}

		const loaded = dynamicRequire(
			`${process.cwd()}/rust-scorer/pkg-node`
		) as Partial<WasmGeoModule> & { default?: Partial<WasmGeoModule> };
		const maybeModule = (loaded.default ?? loaded) as Partial<WasmGeoModule>;

		if (
			typeof maybeModule.batch_haversine_km !== 'function' ||
			typeof maybeModule.nearest_us_states !== 'function'
		) {
			cachedNodeWasmGeo = null;
			return cachedNodeWasmGeo;
		}

		cachedNodeWasmGeo = maybeModule as WasmGeoModule;
		return cachedNodeWasmGeo;
	} catch (error: unknown) {
		logWasmGeoLoadError(error);
		cachedNodeWasmGeo = null;
		return cachedNodeWasmGeo;
	}
};

const toRad = (deg: number): number => (deg * Math.PI) / 180;

// Haversine distance (km) between two lat/lng points.
const haversineKm = (
	a: { lat: number; lng: number },
	b: { lat: number; lng: number }
): number => {
	const wasmGeo = getNodeWasmGeoModule();
	if (wasmGeo) {
		try {
			const result = toFloat64Array(
				wasmGeo.batch_haversine_km(a.lat, a.lng, new Float64Array([b.lat, b.lng]))
			);
			const distKm = result[0];
			if (Number.isFinite(distKm)) return distKm;
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	const R = 6371; // km
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);

	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const h =
		sinDLat * sinDLat +
		Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const normalizeUsStateName = (input: string | null | undefined): string | null => {
	const v = (input ?? '').trim();
	if (!v) return null;

	const lc = v.toLowerCase();
	const match = US_STATES.find(
		(s) => s.name.toLowerCase() === lc || s.abbr.toLowerCase() === lc
	);
	return match?.name ?? null;
};

export const getNearestUsStateNames = (
	stateNameOrAbbr: string,
	count: number = 4
): string[] => {
	const safeCount = Math.max(0, Math.floor(count));
	const canonical = normalizeUsStateName(stateNameOrAbbr);
	if (!canonical) return [];

	const origin = US_STATES.find((s) => s.name === canonical);
	if (!origin) return [];

	const wasmGeo = getNodeWasmGeoModule();
	if (wasmGeo) {
		try {
			const nearest = wasmGeo.nearest_us_states(canonical, safeCount);
			if (Array.isArray(nearest)) {
				return nearest.filter((name): name is string => typeof name === 'string');
			}
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	return US_STATES.filter((s) => s.name !== origin.name)
		.map((s) => ({
			name: s.name,
			distanceKm: haversineKm(origin.centroid, s.centroid),
		}))
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, safeCount)
		.map((x) => x.name);
};

export const getAllUsStateNames = (): string[] => US_STATES.map((s) => s.name);

/**
 * Returns an ordered list of canonical US state names where:
 * - The provided `preferred` states appear first (in their original order)
 * - The remaining states are appended (ensuring all 50 states are present)
 * - Duplicates are removed (case-insensitive, normalized via `normalizeUsStateName`)
 */
export const buildAllUsStateNames = (preferred: Array<string | null | undefined> = []): string[] => {
	const seen = new Set<string>();
	const out: string[] = [];

	const pushCanonical = (value: string | null | undefined) => {
		const canonical = normalizeUsStateName(value);
		if (!canonical) return;
		const key = canonical.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		out.push(canonical);
	};

	for (const p of preferred) pushCanonical(p);
	for (const name of getAllUsStateNames()) pushCanonical(name);

	return out;
};


