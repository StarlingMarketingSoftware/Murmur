import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const STATE_LABEL_OVERRIDES = {
	TX: [-99.5, 31.5],
	OK: [-97.5, 35.5],
	MN: [-94.3, 46.0],
	NV: [-117.0, 39.0],
	CA: [-119.3, 36.5],
	ID: [-114.5, 44.4],
	FL: [-81.7, 28.6],
	MI: [-85.4, 43.5],
	LA: [-92.5, 31.0],
	MD: [-76.8, 39.05],
	HI: [-157.5, 20.5],
	AK: [-153.0, 64.0],
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

	const labelFeatures = [];
	for (const [key, entry] of statesByKey) {
		const bbox = entry.bbox;
		if (!bbox) continue;
		const override = STATE_LABEL_OVERRIDES[key];
		const lng = override ? override[0] : (bbox.minLng + bbox.maxLng) / 2;
		const lat = override ? override[1] : (bbox.minLat + bbox.maxLat) / 2;

		labelFeatures.push({
			type: 'Feature',
			properties: { key, name: entry.name },
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
