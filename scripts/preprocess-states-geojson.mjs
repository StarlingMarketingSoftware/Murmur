import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import polylabel from 'polylabel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const geoDir = path.join(repoRoot, 'public', 'geo');

const SOURCE_FILE = path.join(geoDir, 'us-states.geojson');

const OUTPUT_FILES = {
	processed: path.join(geoDir, 'us-states-processed.json'),
	meta: path.join(geoDir, 'us-states-meta.json'),
	labels: path.join(geoDir, 'us-states-labels.json'),
	outline: path.join(geoDir, 'us-states-outline.json'),
	preparedPolygons: path.join(geoDir, 'us-states-prepared-polygons.json'),
};

const VALID_STATE_ABBRS = new Set([
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
	'DC',
]);

const STATE_NAME_TO_ABBR = {
	ALABAMA: 'AL',
	ALASKA: 'AK',
	ARIZONA: 'AZ',
	ARKANSAS: 'AR',
	CALIFORNIA: 'CA',
	COLORADO: 'CO',
	CONNECTICUT: 'CT',
	DELAWARE: 'DE',
	FLORIDA: 'FL',
	GEORGIA: 'GA',
	HAWAII: 'HI',
	IDAHO: 'ID',
	ILLINOIS: 'IL',
	INDIANA: 'IN',
	IOWA: 'IA',
	KANSAS: 'KS',
	KENTUCKY: 'KY',
	LOUISIANA: 'LA',
	MAINE: 'ME',
	MARYLAND: 'MD',
	MASSACHUSETTS: 'MA',
	MICHIGAN: 'MI',
	MINNESOTA: 'MN',
	MISSISSIPPI: 'MS',
	MISSOURI: 'MO',
	MONTANA: 'MT',
	NEBRASKA: 'NE',
	NEVADA: 'NV',
	'NEW HAMPSHIRE': 'NH',
	'NEW JERSEY': 'NJ',
	'NEW MEXICO': 'NM',
	'NEW YORK': 'NY',
	'NORTH CAROLINA': 'NC',
	'NORTH DAKOTA': 'ND',
	OHIO: 'OH',
	OKLAHOMA: 'OK',
	OREGON: 'OR',
	PENNSYLVANIA: 'PA',
	'RHODE ISLAND': 'RI',
	'SOUTH CAROLINA': 'SC',
	'SOUTH DAKOTA': 'SD',
	TENNESSEE: 'TN',
	TEXAS: 'TX',
	UTAH: 'UT',
	VERMONT: 'VT',
	VIRGINIA: 'VA',
	WASHINGTON: 'WA',
	'WEST VIRGINIA': 'WV',
	WISCONSIN: 'WI',
	WYOMING: 'WY',
	'DISTRICT OF COLUMBIA': 'DC',
};

// Hand-tuned label points for a few small / oddly-shaped states where the pole
// of inaccessibility reads as off-center (e.g. it lands in the north of a
// vertical state). polylabel handles every other state automatically.
const STATE_LABEL_OVERRIDES = {
	NJ: [-74.45, 40.15],
	MA: [-72.0, 42.3],
	DE: [-75.5, 39.0],
	RI: [-71.62, 41.7],
	CT: [-72.75, 41.64],
	PA: [-77.6, 40.88],
	TX: [-99.35, 31.48],
};

// Zoom-gating for labels: big states label from the wide view, tiny ones (DC,
// territories) only once zoomed in so they don't clutter / sit on top of
// neighbors. Interpolated on log(area) between these area (deg²) / zoom anchors.
const LABEL_MIN_ZOOM_FLOOR = 2.25; // mirrors MAP_MIN_ZOOM in the map constants
const LABEL_MIN_ZOOM_CEIL = 8;
const LABEL_AREA_SMALL = 0.015;
const LABEL_AREA_LARGE = 3.0;

const labelMinZoomForArea = (area) => {
	if (!(area > 0)) return LABEL_MIN_ZOOM_CEIL;
	const a = Math.max(LABEL_AREA_SMALL, Math.min(LABEL_AREA_LARGE, area));
	const t =
		(Math.log(a) - Math.log(LABEL_AREA_LARGE)) /
		(Math.log(LABEL_AREA_SMALL) - Math.log(LABEL_AREA_LARGE));
	const z = LABEL_MIN_ZOOM_FLOOR + t * (LABEL_MIN_ZOOM_CEIL - LABEL_MIN_ZOOM_FLOOR);
	return Math.round(z * 100) / 100;
};

const closeRing = (ring) => {
	if (!ring.length) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;
	return [...ring, first];
};

const absRingArea = (ring) => {
	if (ring.length < 3) return 0;
	let area2 = 0;
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[(i + 1) % ring.length];
		area2 += x1 * y2 - x2 * y1;
	}
	return Math.abs(area2 / 2);
};

// Reorder a clipping polygon's rings into polylabel's expected shape:
// [outerRing, ...holes], where the outer ring is the largest by area.
const polygonForPolylabel = (clippingPolygon) => {
	const rings = (clippingPolygon ?? []).filter((ring) => ring?.length >= 4);
	if (!rings.length) return null;
	let outerIdx = 0;
	let outerArea = -Infinity;
	rings.forEach((ring, i) => {
		const a = absRingArea(ring);
		if (a > outerArea) {
			outerArea = a;
			outerIdx = i;
		}
	});
	return [rings[outerIdx], ...rings.filter((_, i) => i !== outerIdx)];
};

// Total land area of a state's largest-ring-per-polygon — used to rank states so
// bigger ones win label collisions when zoomed out.
const stateLabelArea = (multiPolygon) => {
	let total = 0;
	for (const polygon of multiPolygon ?? []) {
		const candidate = polygonForPolylabel(polygon);
		if (candidate) total += absRingArea(candidate[0]);
	}
	return total;
};

// Pole of inaccessibility (polylabel) of a state's LARGEST polygon, so the label
// sits well inside the main landmass instead of a bbox center that can fall in
// the ocean or a neighbor for concave / multi-part states. Falls back to the
// bbox center if polylabel can't produce a finite point.
const labelPointFromMultiPolygon = (multiPolygon, bbox) => {
	const fallback = bbox
		? [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2]
		: null;
	try {
		let best = null;
		let bestArea = -Infinity;
		for (const polygon of multiPolygon ?? []) {
			const candidate = polygonForPolylabel(polygon);
			if (!candidate) continue;
			const area = absRingArea(candidate[0]);
			if (area > bestArea) {
				bestArea = area;
				best = candidate;
			}
		}
		if (!best) return fallback;
		// Precision in degrees (~1 km); the library default of 1.0 is far too
		// coarse for lat/lng-scale polygons and lands near the bbox center.
		const [lng, lat] = polylabel(best, 0.01);
		if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat];
		return fallback;
	} catch {
		return fallback;
	}
};

const createOutlineGeoJsonFromMultiPolygon = (multiPolygon) => {
	const features = [];
	for (const clippingPolygon of multiPolygon) {
		if (!clippingPolygon?.length) continue;

		const outerRing = clippingPolygon.reduce((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);

		if (!outerRing) continue;

		const coords = closeRing(
			outerRing.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
		);
		if (coords.length < 4) continue;

		features.push({
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [coords.map(([lng, lat]) => [lng, lat])],
			},
		});
	}

	return { type: 'FeatureCollection', features };
};

const geoJsonRingToClippingRing = (ring) => {
	const coords = ring
		.map((pair) => [pair?.[0], pair?.[1]])
		.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

	if (coords.length < 3) return [];
	return closeRing(coords);
};

const geoJsonPolygonToClippingPolygon = (polygonCoords) =>
	(polygonCoords ?? [])
		.map((ring) => geoJsonRingToClippingRing(ring))
		.filter((ring) => ring.length >= 4);

const geoJsonGeometryToClippingMultiPolygon = (geometry) => {
	if (!geometry) return null;

	if (geometry.type === 'Polygon') {
		const poly = geoJsonPolygonToClippingPolygon(geometry.coordinates);
		return poly.length ? [poly] : null;
	}

	if (geometry.type === 'MultiPolygon') {
		const polys = (geometry.coordinates ?? [])
			.map((polyCoords) => geoJsonPolygonToClippingPolygon(polyCoords))
			.filter((poly) => poly.length);
		return polys.length ? polys : null;
	}

	return null;
};

const bboxFromPolygon = (polygon) => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;

	for (const ring of polygon) {
		for (const [lng, lat] of ring) {
			if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
			minLat = Math.min(minLat, lat);
			maxLat = Math.max(maxLat, lat);
			minLng = Math.min(minLng, lng);
			maxLng = Math.max(maxLng, lng);
		}
	}

	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}

	return { minLat, maxLat, minLng, maxLng };
};

const bboxFromMultiPolygon = (multiPolygon) => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;

	for (const polygon of multiPolygon) {
		for (const ring of polygon) {
			for (const [lng, lat] of ring) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				minLat = Math.min(minLat, lat);
				maxLat = Math.max(maxLat, lat);
				minLng = Math.min(minLng, lng);
				maxLng = Math.max(maxLng, lng);
			}
		}
	}

	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}

	return { minLat, maxLat, minLng, maxLng };
};

const getStateAbbreviation = (state) => {
	if (!state) return null;
	const upper = state.toUpperCase().trim();
	if (upper.length === 2 && VALID_STATE_ABBRS.has(upper)) return upper;
	return STATE_NAME_TO_ABBR[upper] || null;
};

const normalizeStateKey = (state) => {
	if (!state) return null;
	const abbr = getStateAbbreviation(state);
	if (abbr) return abbr;
	return state.trim().toUpperCase();
};

const formatBytes = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const writeJsonFile = async (filePath, value) => {
	const json = `${JSON.stringify(value)}\n`;
	await fs.writeFile(filePath, json, 'utf8');
	const sizeBytes = Buffer.byteLength(json, 'utf8');
	console.log(`Wrote ${path.relative(repoRoot, filePath)} (${formatBytes(sizeBytes)})`);
};

const run = async () => {
	const raw = await fs.readFile(SOURCE_FILE, 'utf8');
	const json = JSON.parse(raw);

	const processedFeatures = [];
	const preparedPolygons = [];
	const statesByKey = new Map();

	for (const feature of json.features ?? []) {
		const props = feature.properties ?? {};
		const rawName = props.name ?? props.NAME ?? props.STATE_NAME ?? props.State ?? props.state ?? '';
		const name = String(rawName ?? '').trim();

		const rawAbbr =
			props.abbr ??
			props.ABBR ??
			props.stusps ??
			props.STUSPS ??
			props.postal ??
			props.POSTAL ??
			'';
		const abbr = String(rawAbbr ?? '').trim();

		const key = normalizeStateKey(abbr || name);
		if (!key) continue;

		const multiPolygon = geoJsonGeometryToClippingMultiPolygon(feature.geometry);
		if (!multiPolygon) continue;

		const bbox = bboxFromMultiPolygon(multiPolygon);
		for (const polygon of multiPolygon) {
			const polygonBbox = bboxFromPolygon(polygon);
			if (polygonBbox) preparedPolygons.push({ polygon, bbox: polygonBbox });
		}

		const safeName = name || key;
		statesByKey.set(key, {
			key,
			name: safeName,
			geometry: feature.geometry,
			multiPolygon,
			bbox,
		});

		processedFeatures.push({
			type: 'Feature',
			id: key,
			properties: { ...props, name: safeName, key },
			geometry: feature.geometry,
		});
	}

	const processedFeatureCollection = {
		type: 'FeatureCollection',
		features: processedFeatures,
	};

	const statesMeta = {};
	for (const [key, entry] of statesByKey) {
		statesMeta[key] = { key: entry.key, name: entry.name, bbox: entry.bbox };
	}

	// Area per state (deg²), reused for collision ranking and zoom-gating.
	const areaByKey = new Map();
	for (const [key, entry] of statesByKey) {
		areaByKey.set(key, stateLabelArea(entry.multiPolygon));
	}

	// Rank states by area (1 = largest) so the symbol layer can prioritize bigger
	// states in label collisions via `symbol-sort-key`.
	const rankByKey = new Map();
	[...areaByKey.entries()]
		.sort((a, b) => b[1] - a[1])
		.forEach(([key], i) => rankByKey.set(key, i + 1));

	const labelFeatures = [];
	for (const [key, entry] of statesByKey) {
		const bbox = entry.bbox;
		if (!bbox) continue;
		const override = STATE_LABEL_OVERRIDES[key];
		const [lng, lat] = override
			? override
			: labelPointFromMultiPolygon(entry.multiPolygon, bbox);

		labelFeatures.push({
			type: 'Feature',
			properties: {
				key,
				name: entry.name,
				rank: rankByKey.get(key) ?? 999,
				minZoom: labelMinZoomForArea(areaByKey.get(key) ?? 0),
			},
			geometry: { type: 'Point', coordinates: [lng, lat] },
		});
	}

	const labelsFeatureCollection = {
		type: 'FeatureCollection',
		features: labelFeatures,
	};

	const allStateMultiPolygons = Array.from(statesByKey.values()).map((entry) => entry.multiPolygon);
	let unioned = null;

	if (allStateMultiPolygons.length) {
		try {
			const wasmModule = await import('../rust-scorer/pkg-node').catch(() =>
				import('../rust-scorer/pkg')
			);
			const maybeUnion =
				wasmModule.union_multi_polygons || wasmModule.default?.union_multi_polygons;
			if (typeof maybeUnion === 'function') {
				const out = maybeUnion(allStateMultiPolygons);
				if (Array.isArray(out) && out.length) unioned = out;
			}
		} catch {
			// Keep preprocessing resilient; fallback keeps behavior matching runtime fallback.
		}
	}

	if (!unioned && allStateMultiPolygons.length) {
		try {
			const module = await import('polygon-clipping');
			const polygonClipping = module.default ?? module;
			unioned = polygonClipping.union(...allStateMultiPolygons);
		} catch {
			// Keep preprocessing resilient; fallback keeps behavior matching runtime fallback.
		}
	}

	const multiPolygonsToOutline =
		unioned && Array.isArray(unioned) && unioned.length ? unioned : allStateMultiPolygons.flat();
	const outlineFeatureCollection = createOutlineGeoJsonFromMultiPolygon(multiPolygonsToOutline);
	const outlineGeometry = {
		type: 'MultiPolygon',
		coordinates: outlineFeatureCollection.features.map((feature) => feature.geometry.coordinates),
	};

	await writeJsonFile(OUTPUT_FILES.processed, processedFeatureCollection);
	await writeJsonFile(OUTPUT_FILES.meta, statesMeta);
	await writeJsonFile(OUTPUT_FILES.labels, labelsFeatureCollection);
	await writeJsonFile(OUTPUT_FILES.outline, outlineGeometry);
	await writeJsonFile(OUTPUT_FILES.preparedPolygons, preparedPolygons);
};

run().catch((error) => {
	console.error('Failed to preprocess US states GeoJSON:', error);
	process.exitCode = 1;
});
