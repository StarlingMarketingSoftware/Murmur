'use client';

import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, OverlayView } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

type LatLngLiteral = { lat: number; lng: number };
type MarkerHoverMeta = { clientX: number; clientY: number };

type ClippingCoord = [number, number]; // [lng, lat]
type ClippingRing = ClippingCoord[];
type ClippingPolygon = ClippingRing[];
type ClippingMultiPolygon = ClippingPolygon[];

type BoundingBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type PreparedClippingPolygon = { polygon: ClippingPolygon; bbox: BoundingBox };

const closeRing = (ring: ClippingRing): ClippingRing => {
	if (ring.length === 0) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;
	return [...ring, first];
};

const absRingArea = (ring: ClippingRing): number => {
	if (ring.length < 3) return 0;
	let area2 = 0;
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[(i + 1) % ring.length];
		area2 += x1 * y2 - x2 * y1;
	}
	return Math.abs(area2 / 2);
};

const createOutlinePolygonsFromMultiPolygon = (
	multiPolygon: ClippingMultiPolygon,
	options: Pick<
		google.maps.PolygonOptions,
		'strokeColor' | 'strokeOpacity' | 'strokeWeight' | 'zIndex'
	>
): google.maps.Polygon[] => {
	const polygons: google.maps.Polygon[] = [];
	for (const clippingPolygon of multiPolygon) {
		if (!clippingPolygon?.length) continue;

		const outerRing = clippingPolygon.reduce<ClippingRing | null>((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);

		if (!outerRing) continue;

		const path = outerRing
			.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
			.map(([lng, lat]) => ({ lat, lng }));

		if (path.length < 3) continue;

		polygons.push(
			new google.maps.Polygon({
				paths: path,
				clickable: false,
				fillOpacity: 0,
				strokeColor: options.strokeColor,
				strokeOpacity: options.strokeOpacity ?? 1,
				strokeWeight: options.strokeWeight ?? 2,
				zIndex: options.zIndex,
			})
		);
	}
	return polygons;
};

const linearRingToClippingRing = (
	linearRing: google.maps.Data.LinearRing
): ClippingRing => {
	const coords = linearRing
		.getArray()
		.map((latLng): ClippingCoord => [latLng.lng(), latLng.lat()])
		.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

	// Polygon-clipping expects valid rings; skip obviously invalid ones.
	if (coords.length < 3) return [];
	return closeRing(coords);
};

const polygonToClippingPolygon = (polygon: google.maps.Data.Polygon): ClippingPolygon => {
	const rings = polygon
		.getArray()
		.map((ring) => linearRingToClippingRing(ring))
		.filter((ring) => ring.length >= 4);
	return rings;
};

const geometryToClippingMultiPolygon = (
	geometry: google.maps.Data.Geometry
): ClippingMultiPolygon | null => {
	const type = geometry.getType();
	if (type === 'Polygon') {
		const poly = polygonToClippingPolygon(geometry as google.maps.Data.Polygon);
		return poly.length ? [poly] : null;
	}
	if (type === 'MultiPolygon') {
		const polys = (geometry as google.maps.Data.MultiPolygon)
			.getArray()
			.map((poly) => polygonToClippingPolygon(poly))
			.filter((poly) => poly.length);
		return polys.length ? polys : null;
	}
	return null;
};

const coerceFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// Handle common "decimal comma" formats (e.g. "39,1234")
		const normalized =
			trimmed.includes(',') && !trimmed.includes('.')
				? trimmed.replace(',', '.')
				: trimmed;
		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	}

	// Prisma can sometimes surface numeric-like objects; Number(...) is a safe coercion attempt.
	const n = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
	return Number.isFinite(n) ? n : null;
};

const getLatLngFromContact = (contact: ContactWithName): LatLngLiteral | null => {
	const anyContact = contact as unknown as Record<string, unknown>;
	const lat = coerceFiniteNumber(
		anyContact.latitude ?? anyContact.lat ?? anyContact.Latitude ?? anyContact.LATITUDE
	);
	const lng = coerceFiniteNumber(
		anyContact.longitude ??
			anyContact.lng ??
			anyContact.lon ??
			anyContact.Longitude ??
			anyContact.LONGITUDE
	);

	if (lat == null || lng == null) return null;
	// Defensive sanity bounds: Google Maps won't render invalid ranges reliably.
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
};

const coordinateKey = (coords: LatLngLiteral) =>
	`${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

// Deterministic "spiderfy" offset for exact/near-exact duplicate coordinates so markers don't fully overlap.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399963...
const DUPLICATE_JITTER_BASE_DEG = 0.0015; // ~167m latitude; visible at mid zoom levels
const jitterDuplicateCoords = (base: LatLngLiteral, index: number): LatLngLiteral => {
	const angle = index * GOLDEN_ANGLE;
	const radius = DUPLICATE_JITTER_BASE_DEG * Math.sqrt(index);
	const dx = radius * Math.cos(angle);
	const dy = radius * Math.sin(angle);
	const latRad = (base.lat * Math.PI) / 180;
	const lngScale = Math.max(0.2, Math.cos(latRad));
	return {
		lat: base.lat + dy,
		lng: base.lng + dx / lngScale,
	};
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const hashStringToUint32 = (str: string): number => {
	// FNV-1a 32-bit
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

const mulberry32 = (seed: number) => {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let x = t;
		x = Math.imul(x ^ (x >>> 15), x | 1);
		x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
};

// Hard cap for total dots rendered in the viewport (contacts + background dots).
// Rendering more than this tends to overload many machines at low zoom levels.
const MAX_TOTAL_DOTS = 500;

// Calculate background dot count based on viewport area to maintain consistent visual density.
// This ensures dots don't become denser when zooming in.
const BACKGROUND_DOTS_DENSITY = 0.55; // dots per square degree at baseline
const BACKGROUND_DOTS_MIN = 8;
const BACKGROUND_DOTS_MAX = MAX_TOTAL_DOTS;

const getBackgroundDotsTargetCount = (viewportArea: number, zoom: number): number => {
	// Base count from area (larger viewport = more dots, smaller = fewer)
	let count = viewportArea * BACKGROUND_DOTS_DENSITY;

	// Apply a zoom-based reduction factor so very zoomed-in views don't feel cluttered
	// even with area-based scaling. This mimics how real establishments are distributed.
	if (zoom >= 10) {
		count *= 0.6;
	} else if (zoom >= 8) {
		count *= 0.8;
	}

	return Math.min(BACKGROUND_DOTS_MAX, Math.max(BACKGROUND_DOTS_MIN, Math.round(count)));
};

const getBackgroundDotsQuantizationDeg = (zoom: number): number => {
	// Controls when we regenerate dots as the viewport changes.
	if (zoom <= 4) return 0.75;
	if (zoom <= 6) return 0.4;
	if (zoom <= 8) return 0.22;
	if (zoom <= 10) return 0.12;
	if (zoom <= 12) return 0.08;
	return 0.05;
};

const bboxFromMultiPolygon = (multiPolygon: ClippingMultiPolygon): BoundingBox | null => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const poly of multiPolygon) {
		for (const ring of poly) {
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

const isLatLngInBbox = (lat: number, lng: number, bbox: BoundingBox): boolean =>
	lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;

type ScoredContact = { contact: ContactWithName; score: number };

const stableViewportSampleContacts = (
	contacts: ContactWithName[],
	getCoords: (contact: ContactWithName) => LatLngLiteral | null,
	viewportBbox: BoundingBox,
	slots: number,
	seed: string
): ContactWithName[] => {
	if (slots <= 0 || contacts.length === 0) return [];
	if (contacts.length <= slots) return contacts;

	const latSpan = viewportBbox.maxLat - viewportBbox.minLat;
	const lngSpan = viewportBbox.maxLng - viewportBbox.minLng;
	if (!Number.isFinite(latSpan) || !Number.isFinite(lngSpan) || latSpan <= 0 || lngSpan <= 0) {
		// Fallback: deterministic sample by hash order.
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	// Bin into a viewport grid and sample per-cell so spatial density is preserved.
	const grid = Math.max(8, Math.min(64, Math.round(Math.sqrt(slots) * 1.15)));
	const latStep = latSpan / grid;
	const lngStep = lngSpan / grid;
	if (!Number.isFinite(latStep) || !Number.isFinite(lngStep) || latStep <= 0 || lngStep <= 0) {
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	const cellMap = new Map<string, ScoredContact[]>();
	for (const contact of contacts) {
		const coords = getCoords(contact);
		if (!coords) continue;
		if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;

		const x = clamp(
			Math.floor((coords.lng - viewportBbox.minLng) / lngStep),
			0,
			grid - 1
		);
		const y = clamp(
			Math.floor((coords.lat - viewportBbox.minLat) / latStep),
			0,
			grid - 1
		);
		const key = `${x},${y}`;
		const score = hashStringToUint32(`${seed}|${contact.id}`);
		const existing = cellMap.get(key);
		if (existing) existing.push({ contact, score });
		else cellMap.set(key, [{ contact, score }]);
	}

	const cells = Array.from(cellMap.entries()).map(([key, items]) => {
		items.sort((a, b) => a.score - b.score);
		return { key, items, weight: items.length };
	});
	if (cells.length === 0) return [];

	// If we have more non-empty cells than slots, select which cells to represent using
	// weighted sampling (cells with more contacts are more likely to be shown).
	if (cells.length >= slots) {
		const cellChoices = cells
			.map((cell) => {
				const u = (hashStringToUint32(`${seed}|cell|${cell.key}`) + 1) / 4294967296;
				const w = Math.max(1, cell.weight);
				// Efraimidis-Spirakis weighted sampling key: log(u)/w (higher is better).
				const cellScore = Math.log(u) / w;
				return { ...cell, cellScore };
			})
			.sort((a, b) => b.cellScore - a.cellScore)
			.slice(0, slots);

		return cellChoices.map((cell) => cell.items[0]!.contact);
	}

	// Otherwise, include one per cell, then allocate remaining slots proportionally to cell density.
	const picked: ContactWithName[] = cells.map((cell) => cell.items[0]!.contact);
	const remainingSlots = slots - picked.length;
	if (remainingSlots <= 0) return picked;

	const totalRemaining = cells.reduce((sum, cell) => sum + Math.max(0, cell.items.length - 1), 0);
	if (totalRemaining <= 0) return picked;

	const allocs = cells.map((cell) => {
		const remaining = Math.max(0, cell.items.length - 1);
		const exact = (remainingSlots * remaining) / totalRemaining;
		const base = Math.min(remaining, Math.floor(exact));
		const frac = exact - base;
		const tie = hashStringToUint32(`${seed}|rem|${cell.key}`);
		return { key: cell.key, items: cell.items, base, frac, remaining, tie };
	});

	const used = allocs.reduce((sum, a) => sum + a.base, 0);
	let remainder = Math.max(0, remainingSlots - used);

	allocs.sort((a, b) => {
		if (b.frac !== a.frac) return b.frac - a.frac;
		return a.tie - b.tie;
	});

	for (let i = 0; i < allocs.length && remainder > 0; i++) {
		const a = allocs[i];
		if (a.base < a.remaining) {
			a.base += 1;
			remainder--;
		}
	}

	for (const a of allocs) {
		const take = Math.min(a.base, a.remaining);
		for (let i = 1; i <= take; i++) {
			const item = a.items[i];
			if (item) picked.push(item.contact);
		}
	}

	return picked.slice(0, slots);
};

const pointInRing = (point: ClippingCoord, ring: ClippingRing): boolean => {
	const [x, y] = point;
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

const pointInClippingPolygon = (
	point: ClippingCoord,
	polygon: ClippingPolygon
): boolean => {
	if (!polygon?.length) return false;
	const outerRing = polygon.reduce<ClippingRing | null>((best, ring) => {
		if (!ring?.length) return best;
		if (!best) return ring;
		return absRingArea(ring) > absRingArea(best) ? ring : best;
	}, null);
	if (!outerRing) return false;
	if (!pointInRing(point, outerRing)) return false;
	// Treat all other rings as holes.
	for (const ring of polygon) {
		if (ring === outerRing) continue;
		if (ring?.length && pointInRing(point, ring)) return false;
	}
	return true;
};

const pointInMultiPolygon = (
	point: ClippingCoord,
	multiPolygon: ClippingMultiPolygon
): boolean => {
	for (const polygon of multiPolygon) {
		if (pointInClippingPolygon(point, polygon)) return true;
	}
	return false;
};

const bboxFromPolygon = (polygon: ClippingPolygon): BoundingBox | null => {
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

const isPointInUSA = (
	lat: number,
	lng: number,
	preparedStatePolygons: PreparedClippingPolygon[]
): boolean => {
	for (const { bbox, polygon } of preparedStatePolygons) {
		if (!isLatLngInBbox(lat, lng, bbox)) continue;
		if (pointInClippingPolygon([lng, lat], polygon)) return true;
	}
	return false;
};

// State badge colors matching dashboard
const stateBadgeColorMap: Record<string, string> = {
	AL: '#E57373',
	AK: '#64B5F6',
	AZ: '#FFD54F',
	AR: '#81C784',
	CA: '#BA68C8',
	CO: '#4DD0E1',
	CT: '#FF8A65',
	DE: '#A1887F',
	FL: '#4DB6AC',
	GA: '#7986CB',
	HI: '#F06292',
	ID: '#AED581',
	IL: '#FFB74D',
	IN: '#90A4AE',
	IA: '#DCE775',
	KS: '#FFF176',
	KY: '#4FC3F7',
	LA: '#CE93D8',
	ME: '#80CBC4',
	MD: '#FFCC80',
	MA: '#B39DDB',
	MI: '#80DEEA',
	MN: '#C5E1A5',
	MS: '#EF9A9A',
	MO: '#BCAAA4',
	MT: '#B0BEC5',
	NE: '#E6EE9C',
	NV: '#FFE082',
	NH: '#81D4FA',
	NJ: '#F48FB1',
	NM: '#FFAB91',
	NY: '#9FA8DA',
	NC: '#A5D6A7',
	ND: '#CFD8DC',
	OH: '#FFF59D',
	OK: '#FF8A80',
	OR: '#80CBC4',
	PA: '#EA80FC',
	RI: '#8C9EFF',
	SC: '#FFCDD2',
	SD: '#E1BEE7',
	TN: '#DCEDC8',
	TX: '#FFE0B2',
	UT: '#B2EBF2',
	VT: '#C8E6C9',
	VA: '#D1C4E9',
	WA: '#B2DFDB',
	WV: '#FFE57F',
	WI: '#F8BBD9',
	WY: '#FFCCBC',
	DC: '#E0E0E0',
};

// Helper to get state abbreviation
const getStateAbbreviation = (state: string): string | null => {
	if (!state) return null;
	const upper = state.toUpperCase().trim();
	if (upper.length === 2 && stateBadgeColorMap[upper]) return upper;
	const stateMap: Record<string, string> = {
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
	return stateMap[upper] || null;
};

// Parse metadata sections [1], [2], etc.
// Returns sections if at least 1 valid section exists (more lenient than dashboard's 3)
const parseMetadataSections = (
	metadata: string | null | undefined
): Record<string, string> => {
	if (!metadata) return {};
	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		allSections[match[1]] = match[2].trim();
	}
	const sections: Record<string, string> = {};
	let expectedNum = 1;
	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		const meaningfulContent = content.replace(/[.\s,;:!?'"()\-–—]/g, '').trim();
		if (meaningfulContent.length < 5) break;
		sections[String(expectedNum)] = content;
		expectedNum++;
	}
	// Return sections if we have at least 1 valid section
	return Object.keys(sections).length >= 1 ? sections : {};
};

interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	onMarkerClick?: (contact: ContactWithName) => void;
	onMarkerHover?: (contact: ContactWithName | null, meta?: MarkerHoverMeta) => void;
	onToggleSelection?: (contactId: number) => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
	/** When true, hides the state outlines (useful while search is loading). */
	isLoading?: boolean;
}

const mapContainerStyle = {
	width: '100%',
	height: '100%',
};

const defaultCenter = {
	lat: 39.8283, // Center of US
	lng: -98.5795,
};

const MAP_MIN_ZOOM = 4;

const mapOptions: google.maps.MapOptions = {
	disableDefaultUI: true,
	zoomControl: false,
	streetViewControl: false,
	mapTypeControl: false,
	fullscreenControl: false,
	gestureHandling: 'greedy',
	minZoom: MAP_MIN_ZOOM,
	styles: [
		// Hide Google's default state/province border lines so our custom outline is the only
		// prominent border. (When state interactions are enabled, we draw borders via GeoJSON.)
		{
			featureType: 'administrative.province',
			elementType: 'geometry.stroke',
			stylers: [{ visibility: 'off' }],
		},
		{
			featureType: 'administrative.province',
			elementType: 'geometry.fill',
			stylers: [{ visibility: 'off' }],
		},
		{
			featureType: 'poi',
			elementType: 'labels',
			stylers: [{ visibility: 'off' }],
		},
		{
			featureType: 'transit',
			elementType: 'labels',
			stylers: [{ visibility: 'off' }],
		},
	],
};

const STATE_GEOJSON_URL = 'https://storage.googleapis.com/mapsdevsite/json/states.js';
const STATE_HIGHLIGHT_COLOR = '#5DAB68';
const STATE_HIGHLIGHT_OPACITY = 0.68;
const STATE_BORDER_COLOR = '#CFD8DC';

// Marker dot colors by search "What" value (dashboard/drafting search).
const DEFAULT_RESULT_DOT_COLOR = '#D21E1F';
const RESULT_DOT_ZOOM_MIN = 4;
const RESULT_DOT_ZOOM_MAX = 14;
const RESULT_DOT_SCALE_MIN = 3;
const RESULT_DOT_SCALE_MAX = 11;
// Stroke weight should be thinner when zoomed out and approach ~3px when zoomed in.
const RESULT_DOT_STROKE_WEIGHT_MIN_PX = 1.5;
const RESULT_DOT_STROKE_WEIGHT_MAX_PX = 3;
const RESULT_DOT_STROKE_COLOR_DEFAULT = '#FFFFFF';
const RESULT_DOT_STROKE_COLOR_SELECTED = '#15C948';
const normalizeWhatKey = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

const WHAT_TO_RESULT_DOT_COLOR: Record<string, string> = {
	[normalizeWhatKey('Venues')]: '#00CBFB',
	[normalizeWhatKey('Music Venues')]: '#00CBFB',
	[normalizeWhatKey('Festivals')]: '#2D27DC',
	[normalizeWhatKey('Music Festivals')]: '#2D27DC',
	[normalizeWhatKey('Restaurants')]: '#1EA300',
	[normalizeWhatKey('Coffee Shops')]: '#AAD402',
	[normalizeWhatKey('Wedding Planners')]: '#EFB121',
	[normalizeWhatKey('Wine Beer and spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#981AEC',
};

const getResultDotColorForWhat = (searchWhat?: string | null): string => {
	if (!searchWhat) return DEFAULT_RESULT_DOT_COLOR;
	const key = normalizeWhatKey(searchWhat);
	return WHAT_TO_RESULT_DOT_COLOR[key] ?? DEFAULT_RESULT_DOT_COLOR;
};

const getResultDotTForZoom = (zoom: number): number => {
	const clampedZoom = clamp(zoom, RESULT_DOT_ZOOM_MIN, RESULT_DOT_ZOOM_MAX);
	return (clampedZoom - RESULT_DOT_ZOOM_MIN) / (RESULT_DOT_ZOOM_MAX - RESULT_DOT_ZOOM_MIN);
};

const getResultDotScaleForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return RESULT_DOT_SCALE_MIN + t * (RESULT_DOT_SCALE_MAX - RESULT_DOT_SCALE_MIN);
};

const getResultDotStrokeWeightForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return (
		RESULT_DOT_STROKE_WEIGHT_MIN_PX +
		t * (RESULT_DOT_STROKE_WEIGHT_MAX_PX - RESULT_DOT_STROKE_WEIGHT_MIN_PX)
	);
};

// When a search/locked state is active, de-emphasize out-of-state markers by making them
// look like they'd be at 50% opacity on a white background (but keep fillOpacity=1).
const OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE = 0.5;

type RgbColor = { r: number; g: number; b: number };

const parseHexColor = (hex: string): RgbColor | null => {
	const trimmed = hex.trim();
	if (!trimmed.startsWith('#')) return null;
	const raw = trimmed.slice(1);
	const isShort = raw.length === 3;
	const isLong = raw.length === 6;
	if (!isShort && !isLong) return null;

	const expand = (c: string) => `${c}${c}`;
	const rHex = isShort ? expand(raw[0]!) : raw.slice(0, 2);
	const gHex = isShort ? expand(raw[1]!) : raw.slice(2, 4);
	const bHex = isShort ? expand(raw[2]!) : raw.slice(4, 6);

	const r = Number.parseInt(rHex, 16);
	const g = Number.parseInt(gHex, 16);
	const b = Number.parseInt(bHex, 16);
	if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
	return { r, g, b };
};

const toHexByte = (n: number): string => {
	const clamped = clamp(Math.round(n), 0, 255);
	return clamped.toString(16).padStart(2, '0').toUpperCase();
};

const washOutHexColor = (hex: string, mixToWhite: number): string => {
	const rgb = parseHexColor(hex);
	if (!rgb) return hex;
	const t = clamp(mixToWhite, 0, 1);

	// Blend toward white → lighter and less saturated (pastel).
	const r = rgb.r + (255 - rgb.r) * t;
	const g = rgb.g + (255 - rgb.g) * t;
	const b = rgb.b + (255 - rgb.b) * t;

	return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
};

const normalizeStateKey = (state?: string | null): string | null => {
	if (!state) return null;
	const abbr = getStateAbbreviation(state);
	if (abbr) return abbr;
	return state.trim().toUpperCase();
};

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	searchWhat,
	onMarkerClick,
	onMarkerHover,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
	isLoading,
}) => {
	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const hoveredMarkerIdRef = useRef<number | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(4); // Default zoom level
	const [visibleContacts, setVisibleContacts] = useState<ContactWithName[]>([]);
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const stateLayerRef = useRef<google.maps.Data | null>(null);
	const resultsOutlinePolygonsRef = useRef<google.maps.Polygon[]>([]);
	const searchedStateOutlinePolygonsRef = useRef<google.maps.Polygon[]>([]);
	const lockedStateSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const lockedStateSelectionBboxRef = useRef<BoundingBox | null>(null);
	const lockedStateSelectionKeyRef = useRef<string | null>(null);
	const resultsSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const resultsSelectionBboxRef = useRef<BoundingBox | null>(null);
	const resultsSelectionSignatureRef = useRef<string>('');
	const backgroundDotsLayerRef = useRef<google.maps.Data | null>(null);
	const lastBackgroundDotsKeyRef = useRef<string>('');
	const backgroundDotsBudgetRef = useRef<number>(MAX_TOTAL_DOTS);
	const lastVisibleContactsKeyRef = useRef<string>('');
	const usStatesPolygonsRef = useRef<PreparedClippingPolygon[] | null>(null);
	const selectedStateKeyRef = useRef<string | null>(null);
	const onStateSelectRef = useRef<SearchResultsMapProps['onStateSelect'] | null>(null);
	const isLoadingRef = useRef<boolean>(false);
	const [isStateLayerReady, setIsStateLayerReady] = useState(false);

	useEffect(() => {
		selectedStateKeyRef.current = selectedStateKey;
	}, [selectedStateKey]);

	useEffect(() => {
		onStateSelectRef.current = onStateSelect ?? null;
	}, [onStateSelect]);

	useEffect(() => {
		isLoadingRef.current = isLoading ?? false;
	}, [isLoading]);

	// If a hovered marker is removed due to viewport sampling, clear hover state
	// to avoid the UI getting "stuck" on a now-nonexistent marker.
	useEffect(() => {
		if (hoveredMarkerId == null) return;
		const stillVisible = visibleContacts.some((c) => c.id === hoveredMarkerId);
		if (stillVisible) return;
		setHoveredMarkerId(null);
		hoveredMarkerIdRef.current = null;
		onMarkerHover?.(null);
	}, [visibleContacts, hoveredMarkerId, onMarkerHover]);

	useEffect(() => {
		if (lockedStateName === undefined) return;
		const nextKey = normalizeStateKey(lockedStateName);
		setSelectedStateKey(nextKey);
	}, [lockedStateName]);

	// Clear timeout when panel is closed or component unmounts
	useEffect(() => {
		return () => {
			if (researchPanelTimeoutRef.current) {
				clearTimeout(researchPanelTimeoutRef.current);
			}
		};
	}, []);

	const clearResultsOutline = useCallback(() => {
		for (const polygon of resultsOutlinePolygonsRef.current) {
			polygon.setMap(null);
		}
		resultsOutlinePolygonsRef.current = [];
		resultsSelectionMultiPolygonRef.current = null;
		resultsSelectionBboxRef.current = null;
		resultsSelectionSignatureRef.current = '';
	}, []);

	const clearSearchedStateOutline = useCallback(() => {
		for (const polygon of searchedStateOutlinePolygonsRef.current) {
			polygon.setMap(null);
		}
		searchedStateOutlinePolygonsRef.current = [];
	}, []);

	// Load US state shapes (used for outline + optional hover/click interactions)
	useEffect(() => {
		if (!map) return;

		// Reset any previous layer on map instance changes
		if (stateLayerRef.current) {
			stateLayerRef.current.setMap(null);
			stateLayerRef.current = null;
		}

		const dataLayer = new google.maps.Data({ map });
		stateLayerRef.current = dataLayer;
		setIsStateLayerReady(false);

		dataLayer.setStyle({
			fillOpacity: 0,
			strokeOpacity: 0,
			strokeWeight: 0,
			clickable: false,
			zIndex: 0,
		});

		dataLayer.loadGeoJson(STATE_GEOJSON_URL, { idPropertyName: 'NAME' }, () => {
			// Prepare state polygons for background dots point-in-polygon checks
			const prepared: PreparedClippingPolygon[] = [];
			dataLayer.forEach((feature) => {
				const geometry = feature.getGeometry();
				if (!geometry) return;
				const mp = geometryToClippingMultiPolygon(geometry);
				if (!mp) return;
				for (const poly of mp) {
					const bbox = bboxFromPolygon(poly);
					if (bbox) {
						prepared.push({ polygon: poly, bbox });
					}
				}
			});
			usStatesPolygonsRef.current = prepared.length ? prepared : null;
			setIsStateLayerReady(true);
		});

		return () => {
			dataLayer.setMap(null);
			stateLayerRef.current = null;
			setIsStateLayerReady(false);
			clearResultsOutline();
			clearSearchedStateOutline();
		};
	}, [map, clearResultsOutline, clearSearchedStateOutline]);

	// Add/remove hover/click highlighting for states (only when enabled)
	useEffect(() => {
		const dataLayer = stateLayerRef.current;
		if (!map || !dataLayer || !enableStateInteractions || !isStateLayerReady) return;

		const mouseoverListener = dataLayer.addListener(
			'mouseover',
			(event: google.maps.Data.MouseEvent) => {
				const hoveredKey = normalizeStateKey(
					(event.feature.getProperty('NAME') as string) ||
						(event.feature.getId() as string)
				);
				if (hoveredKey && hoveredKey === selectedStateKeyRef.current) {
					return;
				}
				dataLayer.overrideStyle(event.feature, {
					fillColor: STATE_HIGHLIGHT_COLOR,
					fillOpacity: STATE_HIGHLIGHT_OPACITY,
					strokeColor: STATE_HIGHLIGHT_COLOR,
					strokeOpacity: 1,
					strokeWeight: 1.2,
				});
			}
		);

		const mouseoutListener = dataLayer.addListener(
			'mouseout',
			(event: google.maps.Data.MouseEvent) => {
				dataLayer.revertStyle(event.feature);
			}
		);

		const clickListener = dataLayer.addListener(
			'click',
			(event: google.maps.Data.MouseEvent) => {
				const stateName = (event.feature.getProperty('NAME') as string) || '';
				const normalizedKey =
					normalizeStateKey(stateName) ||
					normalizeStateKey((event.feature.getId() as string) || undefined);
				setSelectedStateKey(normalizedKey);
				if (stateName) {
					onStateSelectRef.current?.(stateName);
				}
			}
		);

		return () => {
			mouseoverListener.remove();
			mouseoutListener.remove();
			clickListener.remove();
		};
	}, [map, enableStateInteractions, isStateLayerReady]);

	// Update stroke styling when the selected state changes
	useEffect(() => {
		const dataLayer = stateLayerRef.current;
		if (!dataLayer || !isStateLayerReady) return;

		// Keep the layer invisible unless state interactions are enabled.
		if (!enableStateInteractions) {
			dataLayer.setStyle({
				fillOpacity: 0,
				strokeOpacity: 0,
				strokeWeight: 0,
				clickable: false,
				zIndex: 0,
			});
			return;
		}

		dataLayer.setStyle((feature) => {
			const featureKey = normalizeStateKey(
				(feature.getProperty('NAME') as string) || (feature.getId() as string)
			);
			const isSelected = featureKey && featureKey === selectedStateKey;
			return {
				fillOpacity: 0,
				clickable: true,
				strokeColor: isSelected ? '#000000' : STATE_BORDER_COLOR,
				strokeOpacity: isSelected ? 1 : 0.7,
				strokeWeight: isSelected ? 2 : 0.6,
				zIndex: 0,
			};
		});
	}, [selectedStateKey, enableStateInteractions, isStateLayerReady]);

	const handleResearchPanelMouseEnter = useCallback(() => {
		if (researchPanelTimeoutRef.current) {
			clearTimeout(researchPanelTimeoutRef.current);
			researchPanelTimeoutRef.current = null;
		}
	}, []);

	const handleResearchPanelMouseLeave = useCallback(() => {
		researchPanelTimeoutRef.current = setTimeout(() => {
			setSelectedMarker(null);
		}, 5000);
	}, []);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
	});

	// Compute valid coords once and keep a per-contact lookup for stable rendering.
	// Also apply a small deterministic offset for duplicate coordinate groups so every result is visible.
	const { contactsWithCoords, coordsByContactId } = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of contacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [contacts]);

	// State keys represented by the *visible* results on the map (only contacts with coords).
	const resultStateKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const contact of contactsWithCoords) {
			const key = normalizeStateKey(contact.state ?? null);
			if (key) keys.add(key);
		}
		return Array.from(keys).sort();
	}, [contactsWithCoords]);

	const lockedStateKey = useMemo(
		() => normalizeStateKey(lockedStateName ?? null),
		[lockedStateName]
	);

	const isCoordsInLockedState = useCallback((coords: LatLngLiteral): boolean => {
		const selection = lockedStateSelectionMultiPolygonRef.current;
		if (!selection) return true; // no locked state selection -> treat as "in state"
		const bbox = lockedStateSelectionBboxRef.current;
		if (bbox && !isLatLngInBbox(coords.lat, coords.lng, bbox)) return false;
		return pointInMultiPolygon([coords.lng, coords.lat], selection);
	}, []);

	const resultStateKeysSignature = useMemo(
		() => resultStateKeys.join('|'),
		[resultStateKeys]
	);

	useEffect(() => {
		resultsSelectionSignatureRef.current = resultStateKeysSignature;
	}, [resultStateKeysSignature]);

	// Helper to get coordinates for a contact (stable + already-parsed)
	const getContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			coordsByContactId.get(contact.id) ?? null,
		[coordsByContactId]
	);

	const updateBackgroundDots = useCallback(
		(
			mapInstance: google.maps.Map | null,
			loading?: boolean,
			maxDotsInViewport: number = MAX_TOTAL_DOTS
		) => {
			if (!mapInstance) return;
			const layer = backgroundDotsLayerRef.current;
			if (!layer) return;

			// Clear background dots while loading to avoid visual clutter
			if (loading) {
				layer.forEach((feature) => layer.remove(feature));
				lastBackgroundDotsKeyRef.current = '';
				return;
			}

			const usStates = usStatesPolygonsRef.current;
			// Don't render any background dots until we have US state polygons (ensures dots only in USA).
			if (!usStates || usStates.length === 0) return;

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat();
			const west = sw.lng();
			const north = ne.lat();
			const east = ne.lng();

			// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
			if (east < west) return;

			const zoom = Math.round(mapInstance.getZoom() ?? 4);
			const quant = getBackgroundDotsQuantizationDeg(zoom);

			const qSouth = Math.round(south / quant);
			const qWest = Math.round(west / quant);
			const qNorth = Math.round(north / quant);
			const qEast = Math.round(east / quant);

			const selectionSig = resultsSelectionSignatureRef.current;
			const maxAllowed = Math.max(
				0,
				Math.min(MAX_TOTAL_DOTS, Math.floor(Number(maxDotsInViewport) || 0))
			);
			const viewportKey = `${zoom}|${qSouth}|${qWest}|${qNorth}|${qEast}|${selectionSig}|bg:${maxAllowed}`;
			if (viewportKey === lastBackgroundDotsKeyRef.current) return;
			lastBackgroundDotsKeyRef.current = viewportKey;

			// Clear existing dot features.
			layer.forEach((feature) => layer.remove(feature));

			// Calculate viewport area in square degrees for density-based dot count
			const latSpan = north - south;
			const lngSpan = east - west;
			const viewportArea = latSpan * lngSpan;

			const targetCount = Math.min(
				getBackgroundDotsTargetCount(viewportArea, zoom),
				maxAllowed
			);
			if (targetCount <= 0) return;

			const selection = resultsSelectionMultiPolygonRef.current;
			const selectionBbox = resultsSelectionBboxRef.current;

			const rand = mulberry32(hashStringToUint32(viewportKey));
			const points: LatLngLiteral[] = [];
			const maxAttempts = Math.max(1000, targetCount * 25);
			let attempts = 0;

			while (points.length < targetCount && attempts < maxAttempts) {
				attempts++;
				const lat = south + rand() * (north - south);
				const lng = west + rand() * (east - west);

				// Avoid extreme latitudes where the map projection behaves oddly.
				const clampedLat = clamp(lat, -85, 85);

				// Only show dots within the United States (using state polygons as land mask).
				if (!isPointInUSA(clampedLat, lng, usStates)) continue;

				// Alaska is huge but sparsely populated - reduce dot density there by ~70%
				const isInAlaska = clampedLat > 51 && lng < -130;
				if (isInAlaska && rand() < 0.7) continue;

				if (selection) {
					// Quick bbox reject so we only do point-in-polygon work near the selected region.
					if (!selectionBbox || isLatLngInBbox(clampedLat, lng, selectionBbox)) {
						if (pointInMultiPolygon([lng, clampedLat], selection)) {
							continue; // inside the selected region -> skip (we only want outside)
						}
					}
				}

				points.push({ lat: clampedLat, lng });
			}

			for (const pt of points) {
				layer.add(
					new google.maps.Data.Feature({
						geometry: new google.maps.Data.Point(pt),
					})
				);
			}
		},
		[]
	);

	// Recompute which contact markers are rendered in the current viewport, and
	// budget background dots so the combined total stays under MAX_TOTAL_DOTS.
	const recomputeViewportDots = useCallback(
		(mapInstance: google.maps.Map | null, loading?: boolean) => {
			if (!mapInstance) return;

			const bounds = mapInstance.getBounds();
			if (!bounds) return;

			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat();
			const west = sw.lng();
			const north = ne.lat();
			const east = ne.lng();

			// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
			if (east < west) return;

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Keep the seed quantized so marker sampling stays stable while panning/zooming.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.round(south / quant);
			const qWest = Math.round(west / quant);
			const qNorth = Math.round(north / quant);
			const qEast = Math.round(east / quant);
			const seed = `${zoomKey}|${qSouth}|${qWest}|${qNorth}|${qEast}`;

			const viewportBbox: BoundingBox = { minLat: south, maxLat: north, minLng: west, maxLng: east };

			// Determine which contacts are currently in the viewport.
			const inBounds: ContactWithName[] = [];
			for (const contact of contactsWithCoords) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
				inBounds.push(contact);
			}

			const selectedSet = new Set<number>(selectedContacts);
			const selectedInBounds: ContactWithName[] = [];
			const unselectedInBounds: ContactWithName[] = [];
			for (const contact of inBounds) {
				if (selectedSet.has(contact.id)) selectedInBounds.push(contact);
				else unselectedInBounds.push(contact);
			}

			// Build a stable "candidate pool" larger than what we render, then pick a
			// non-overlapping subset so dots never visually stack on top of each other.
			const POOL_FACTOR = 4;
			const poolSlots = MAX_TOTAL_DOTS * POOL_FACTOR;
			let pool: ContactWithName[] = [];
			if (inBounds.length <= poolSlots) {
				pool = inBounds;
			} else if (selectedInBounds.length >= poolSlots) {
				pool = stableViewportSampleContacts(
					selectedInBounds,
					getContactCoords,
					viewportBbox,
					poolSlots,
					`${seed}|pool:selected`
				);
			} else {
				const slots = poolSlots - selectedInBounds.length;
				const sampled = stableViewportSampleContacts(
					unselectedInBounds,
					getContactCoords,
					viewportBbox,
					slots,
					`${seed}|pool`
				);
				pool = [...selectedInBounds, ...sampled];
			}

			// Compute marker size at this zoom so we can enforce min spacing in screen pixels.
			// Note: Google Maps can report fractional zoom; use the raw value for accurate scaling.
			const markerScale = getResultDotScaleForZoom(zoomRaw);
			const strokeWeight = getResultDotStrokeWeightForZoom(zoomRaw);
			// Ensure *hovered* dots also won't overlap.
			const minSeparationPx =
				2 * (markerScale * 1.18) + strokeWeight + 1.5;
			const minSeparationSq = minSeparationPx * minSeparationPx;
			const worldSize = 256 * Math.pow(2, zoomRaw);

			type Candidate = {
				contact: ContactWithName;
				x: number;
				y: number;
				isSelected: boolean;
				key: number;
			};

			const candidates: Candidate[] = [];
			for (const contact of pool) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				// Web Mercator world pixel coords at the current zoom.
				const latClamped = clamp(coords.lat, -85, 85);
				const siny = Math.sin((latClamped * Math.PI) / 180);
				const x = ((coords.lng + 180) / 360) * worldSize;
				const y =
					(0.5 -
						Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) *
					worldSize;
				candidates.push({
					contact,
					x,
					y,
					isSelected: selectedSet.has(contact.id),
					key: hashStringToUint32(`${seed}|${contact.id}`),
				});
			}

			// Stable ordering with selected contacts first.
			candidates.sort((a, b) => {
				if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
				return a.key - b.key;
			});

			// Poisson-disc style selection using a grid acceleration structure.
			const cellSize = Math.max(6, minSeparationPx); // avoid tiny/degenerate cells
			const grid = new Map<string, Array<{ x: number; y: number }>>();
			const picked: ContactWithName[] = [];

			const hasNeighborWithin = (cx: number, cy: number, x: number, y: number): boolean => {
				for (let dx = -1; dx <= 1; dx++) {
					for (let dy = -1; dy <= 1; dy++) {
						const arr = grid.get(`${cx + dx},${cy + dy}`);
						if (!arr) continue;
						for (const p of arr) {
							const ddx = x - p.x;
							const ddy = y - p.y;
							if (ddx * ddx + ddy * ddy < minSeparationSq) return true;
						}
					}
				}
				return false;
			};

			for (const c of candidates) {
				if (picked.length >= MAX_TOTAL_DOTS) break;
				const cx = Math.floor(c.x / cellSize);
				const cy = Math.floor(c.y / cellSize);
				if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;

				picked.push(c.contact);
				const k = `${cx},${cy}`;
				const arr = grid.get(k);
				if (arr) arr.push({ x: c.x, y: c.y });
				else grid.set(k, [{ x: c.x, y: c.y }]);
			}

			const nextVisibleContacts: ContactWithName[] = picked;

			// Stabilize ordering to reduce marker churn in @react-google-maps/api.
			nextVisibleContacts.sort((a, b) => a.id - b.id);

			const nextKey = nextVisibleContacts.map((c) => c.id).join(',');
			if (nextKey !== lastVisibleContactsKeyRef.current) {
				lastVisibleContactsKeyRef.current = nextKey;
				setVisibleContacts(nextVisibleContacts);
			}

			const backgroundBudget = Math.max(0, MAX_TOTAL_DOTS - nextVisibleContacts.length);
			backgroundDotsBudgetRef.current = backgroundBudget;
			updateBackgroundDots(mapInstance, loading, backgroundBudget);
		},
		[contactsWithCoords, getContactCoords, selectedContacts, updateBackgroundDots]
	);

	// Background dots layer (non-interactive) to avoid the map feeling empty outside the selected region.
	useEffect(() => {
		if (!map) return;

		// Reset any previous layer on map instance changes
		if (backgroundDotsLayerRef.current) {
			backgroundDotsLayerRef.current.setMap(null);
			backgroundDotsLayerRef.current = null;
		}

		const layer = new google.maps.Data({ map });
		backgroundDotsLayerRef.current = layer;
		lastBackgroundDotsKeyRef.current = '';

		return () => {
			layer.setMap(null);
			backgroundDotsLayerRef.current = null;
			lastBackgroundDotsKeyRef.current = '';
		};
	}, [map]);

	// Trigger background dots update when US state polygons become available or loading state changes
	useEffect(() => {
		if (!map) return;
		recomputeViewportDots(map, isLoading);
	}, [map, isStateLayerReady, isLoading, recomputeViewportDots]);

	useEffect(() => {
		if (!map) return;
		const listener = map.addListener('idle', () =>
			recomputeViewportDots(map, isLoadingRef.current)
		);
		// Initial fill
		recomputeViewportDots(map, isLoadingRef.current);
		return () => {
			listener.remove();
		};
	}, [map, recomputeViewportDots]);

	// Draw a gray outline around the *group of states* that have results.
	// This uses the state polygons we load via the Data layer and unions them so the outline is one shape.
	useEffect(() => {
		if (!map || !isStateLayerReady) return;

		// Clear outlines while loading or if no result states
		if (isLoading || !resultStateKeysSignature) {
			clearResultsOutline();
			return;
		}

		const dataLayer = stateLayerRef.current;
		if (!dataLayer) return;

		let cancelled = false;

		const run = async () => {
			// Collect the state geometries we need
			const wanted = new Set(resultStateKeys);
			const stateMultiPolygons: ClippingMultiPolygon[] = [];

			dataLayer.forEach((feature) => {
				const featureKey = normalizeStateKey(
					(feature.getProperty('NAME') as string) || (feature.getId() as string)
				);
				if (!featureKey || !wanted.has(featureKey)) return;
				const geometry = feature.getGeometry();
				if (!geometry) return;
				const mp = geometryToClippingMultiPolygon(geometry);
				if (mp) stateMultiPolygons.push(mp);
			});

			// If we couldn't resolve any polygons, nothing to outline.
			if (stateMultiPolygons.length === 0) {
				clearResultsOutline();
				return;
			}

			// Union all selected state polygons into one (or multiple if disjoint) outline.
			let unioned: ClippingMultiPolygon | null = null;
			try {
				const { default: polygonClipping } = await import('polygon-clipping');
				unioned = polygonClipping.union(...stateMultiPolygons);
			} catch (err) {
				console.error(
					'Failed to build state outline union; falling back to per-state outline',
					err
				);
			}

			if (cancelled) return;

			// Clear the previous outline polygons
			clearResultsOutline();

			const multiPolygonsToRender: ClippingMultiPolygon =
				unioned && Array.isArray(unioned) && unioned.length
					? unioned
					: stateMultiPolygons.flat();

			const polygonsToDraw = createOutlinePolygonsFromMultiPolygon(
				multiPolygonsToRender,
				{
					strokeColor: '#1277E1',
					strokeOpacity: 1,
					strokeWeight: 2,
					zIndex: 1,
				}
			);

			for (const polygon of polygonsToDraw) polygon.setMap(map);
			resultsOutlinePolygonsRef.current = polygonsToDraw;

			// Store the selected region (used to exclude background dots inside the outline).
			resultsSelectionMultiPolygonRef.current = multiPolygonsToRender;
			resultsSelectionBboxRef.current = bboxFromMultiPolygon(multiPolygonsToRender);

			// Refresh background dots now that the selected region is known.
			updateBackgroundDots(map, isLoadingRef.current, backgroundDotsBudgetRef.current);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isStateLayerReady,
		isLoading,
		resultStateKeys,
		resultStateKeysSignature,
		clearResultsOutline,
		updateBackgroundDots,
	]);

	// Draw a black outline around the searched/locked state (even when state interactions are off).
	// When state interactions are enabled, the Data layer already renders the selected state border.
	useEffect(() => {
		if (!map || !isStateLayerReady) return;

		// Clear while loading
		if (isLoading) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			return;
		}

		if (!lockedStateKey) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			return;
		}

		const dataLayer = stateLayerRef.current;
		if (!dataLayer) return;

		let cancelled = false;

		const run = () => {
			let found: ClippingMultiPolygon | null = null;

			dataLayer.forEach((feature) => {
				if (found) return;
				const featureKey = normalizeStateKey(
					(feature.getProperty('NAME') as string) || (feature.getId() as string)
				);
				if (!featureKey || featureKey !== lockedStateKey) return;
				const geometry = feature.getGeometry();
				if (!geometry) return;
				found = geometryToClippingMultiPolygon(geometry);
			});

			if (cancelled) return;

			// Store polygon selection for marker "inside/outside" styling (even if we don't draw the outline).
			lockedStateSelectionMultiPolygonRef.current = found;
			lockedStateSelectionBboxRef.current = found ? bboxFromMultiPolygon(found) : null;
			lockedStateSelectionKeyRef.current = lockedStateKey;

			clearSearchedStateOutline();
			if (enableStateInteractions || !found) return;

			const polygonsToDraw = createOutlinePolygonsFromMultiPolygon(found, {
				strokeColor: '#000000',
				strokeOpacity: 1,
				strokeWeight: 3,
				zIndex: 2,
			});

			for (const polygon of polygonsToDraw) polygon.setMap(map);
			searchedStateOutlinePolygonsRef.current = polygonsToDraw;
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isStateLayerReady,
		isLoading,
		lockedStateKey,
		enableStateInteractions,
		clearSearchedStateOutline,
	]);

	// Track if we've done the initial bounds fit
	const hasFitBoundsRef = useRef(false);
	// Track the last contacts count to detect when results change
	const lastContactsCountRef = useRef(0);
	// Track first contact ID to detect when search results have changed
	const lastFirstContactIdRef = useRef<number | null>(null);
	// Track last locked state to detect new searches
	const lastLockedStateKeyRef = useRef<string | null>(null);

	// Helper to fit map bounds with padding
	const fitMapToBounds = useCallback(
		(mapInstance: google.maps.Map, contactsList: ContactWithName[]) => {
			if (contactsList.length === 0) return;

			const bounds = new google.maps.LatLngBounds();
			let hasValidCoords = false;

			contactsList.forEach((contact) => {
				const coords = getContactCoords(contact);
				if (coords) {
					bounds.extend(coords);
					hasValidCoords = true;
				}
			});

			if (!hasValidCoords) return;

			// Fit bounds with padding
			mapInstance.fitBounds(bounds, {
				top: 50,
				right: 50,
				bottom: 50,
				left: 50,
			});

			// Prevent too much zoom on single marker or very close markers
			const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
				const currentZoom = mapInstance.getZoom();
				if (currentZoom && currentZoom > 14) {
					mapInstance.setZoom(14);
				}
				google.maps.event.removeListener(listener);
			});
		},
		[getContactCoords]
	);

	// Helper to fit map to a state's bounds
	const fitMapToState = useCallback((mapInstance: google.maps.Map, stateKey: string) => {
		const dataLayer = stateLayerRef.current;
		if (!dataLayer) return false;

		let stateBounds: google.maps.LatLngBounds | null = null;

		dataLayer.forEach((feature) => {
			if (stateBounds) return; // Already found
			const featureKey = normalizeStateKey(
				(feature.getProperty('NAME') as string) || (feature.getId() as string)
			);
			if (!featureKey || featureKey !== stateKey) return;

			const geometry = feature.getGeometry();
			if (!geometry) return;

			stateBounds = new google.maps.LatLngBounds();
			geometry.forEachLatLng((latLng) => {
				stateBounds!.extend(latLng);
			});
		});

		if (!stateBounds) return false;

		// Fit to state bounds with padding for a comfortable zoomed view
		mapInstance.fitBounds(stateBounds, {
			top: 100,
			right: 100,
			bottom: 100,
			left: 100,
		});

		// Ensure we don't zoom in too much (especially for small states like DC, RI)
		const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
			const currentZoom = mapInstance.getZoom();
			if (currentZoom && currentZoom > 8) {
				mapInstance.setZoom(8);
			}
			google.maps.event.removeListener(listener);
		});

		return true;
	}, []);

	const onLoad = useCallback((mapInstance: google.maps.Map) => {
		setMap(mapInstance);

		// Listen for zoom changes
		mapInstance.addListener('zoom_changed', () => {
			const newZoom = mapInstance.getZoom();
			if (newZoom !== undefined) {
				setZoomLevel(newZoom);
			}
		});

		// Note: Initial bounds fitting is handled by the useEffect that watches contactsWithCoords
		// and lockedStateKey. This ensures we wait for the state layer to be ready before
		// fitting to state bounds.
	}, []);

	const onUnmount = useCallback(() => {
		clearResultsOutline();
		clearSearchedStateOutline();
		lockedStateSelectionMultiPolygonRef.current = null;
		lockedStateSelectionBboxRef.current = null;
		lockedStateSelectionKeyRef.current = null;
		setMap(null);
		hasFitBoundsRef.current = false;
		lastContactsCountRef.current = 0;
		lastFirstContactIdRef.current = null;
		lastLockedStateKeyRef.current = null;
	}, [clearResultsOutline, clearSearchedStateOutline]);

	// Fit bounds when contacts with coordinates change
	useEffect(() => {
		if (!map || contactsWithCoords.length === 0) return;

		// Check if this is a new set of search results by comparing the first contact ID
		const currentFirstId = contactsWithCoords[0]?.id ?? null;
		const isNewSearch = currentFirstId !== lastFirstContactIdRef.current;

		// Check if the locked state changed (indicating a new search in a different state)
		const isNewStateSearch = lockedStateKey !== lastLockedStateKeyRef.current;

		// Fit bounds if:
		// 1. We haven't fit bounds yet (initial load after geocoding)
		// 2. This is a completely new search (first contact ID changed)
		// 3. The number of contacts with coords has increased (more were geocoded)
		// 4. The contacts list changed significantly (new search)
		const shouldFitBounds =
			!hasFitBoundsRef.current ||
			isNewSearch ||
			isNewStateSearch ||
			contactsWithCoords.length > lastContactsCountRef.current ||
			Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

		if (shouldFitBounds) {
			// If there's a locked state (searched state) and this is a new search or new state,
			// zoom to that state first for a better initial view
			if (
				lockedStateKey &&
				isStateLayerReady &&
				(isNewSearch || isNewStateSearch || !hasFitBoundsRef.current)
			) {
				const didFitToState = fitMapToState(map, lockedStateKey);
				if (!didFitToState) {
					// Fallback to fitting to contacts if state geometry not found
					fitMapToBounds(map, contactsWithCoords);
				}
			} else {
				fitMapToBounds(map, contactsWithCoords);
			}
			hasFitBoundsRef.current = true;
			lastContactsCountRef.current = contactsWithCoords.length;
			lastFirstContactIdRef.current = currentFirstId;
			lastLockedStateKeyRef.current = lockedStateKey;
		}
	}, [
		map,
		contactsWithCoords,
		fitMapToBounds,
		fitMapToState,
		lockedStateKey,
		isStateLayerReady,
	]);

	// Reset bounds tracking when contacts prop is empty (preparing for new search)
	useEffect(() => {
		if (contacts.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
		}
	}, [contacts]);

	const handleMarkerClick = (contact: ContactWithName) => {
		onMarkerClick?.(contact);
		// Toggle selection when clicking on a marker
		onToggleSelection?.(contact.id);
	};

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale ~3, at zoom 14 (zoomed in): scale ~11
	const markerScale = useMemo(() => {
		return getResultDotScaleForZoom(zoomLevel);
	}, [zoomLevel]);

	const strokeWeight = useMemo(() => {
		return getResultDotStrokeWeightForZoom(zoomLevel);
	}, [zoomLevel]);

	const defaultDotFillColor = useMemo(() => {
		return getResultDotColorForWhat(searchWhat);
	}, [searchWhat]);

	const outsideDefaultDotFillColor = useMemo(
		() =>
			washOutHexColor(
				defaultDotFillColor,
				OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
			),
		[defaultDotFillColor]
	);

	// Default red dot marker
	const defaultMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: defaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_DEFAULT,
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight, defaultDotFillColor]);

	const defaultMarkerIconOutside = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: outsideDefaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_DEFAULT,
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight, outsideDefaultDotFillColor]);

	// Selected dot marker (same fill, different stroke)
	const selectedMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: defaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_SELECTED,
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight, defaultDotFillColor]);

	const selectedMarkerIconOutside = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: outsideDefaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_SELECTED,
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight, outsideDefaultDotFillColor]);

	// Slightly larger icons when hovered (no text tooltip)
	const hoveredDefaultMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: defaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_DEFAULT,
			strokeWeight: strokeWeight,
			scale: markerScale * 1.18,
		};
	}, [isLoaded, markerScale, strokeWeight, defaultDotFillColor]);

	const hoveredDefaultMarkerIconOutside = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: outsideDefaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_DEFAULT,
			strokeWeight: strokeWeight,
			scale: markerScale * 1.18,
		};
	}, [isLoaded, markerScale, strokeWeight, outsideDefaultDotFillColor]);

	const hoveredSelectedMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: defaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_SELECTED,
			strokeWeight: strokeWeight,
			scale: markerScale * 1.18,
		};
	}, [isLoaded, markerScale, strokeWeight, defaultDotFillColor]);

	const hoveredSelectedMarkerIconOutside = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: outsideDefaultDotFillColor,
			fillOpacity: 1,
			strokeColor: RESULT_DOT_STROKE_COLOR_SELECTED,
			strokeWeight: strokeWeight,
			scale: markerScale * 1.18,
		};
	}, [isLoaded, markerScale, strokeWeight, outsideDefaultDotFillColor]);

	// Invisible larger marker for hover hit area
	const invisibleHitAreaIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: 'transparent',
			fillOpacity: 0,
			strokeColor: 'transparent',
			strokeWeight: 0,
			scale: markerScale * 2, // Larger than visible dot for easier hover
		};
	}, [isLoaded, markerScale]);

	// Background gray dot icon (same design as result dots, lower emphasis)
	const backgroundDotIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: '#9CA3AF',
			fillOpacity: 0.55,
			strokeColor: RESULT_DOT_STROKE_COLOR_DEFAULT,
			strokeWeight: Math.max(1, strokeWeight * 0.85),
			scale: markerScale * 0.78,
		};
	}, [isLoaded, markerScale, strokeWeight]);

	// Keep the background dots styled appropriately as zoom changes.
	useEffect(() => {
		const layer = backgroundDotsLayerRef.current;
		if (!layer || !backgroundDotIcon) return;
		layer.setStyle({
			clickable: false,
			zIndex: 0,
			icon: backgroundDotIcon,
		});
	}, [backgroundDotIcon]);

	// Compute initial center based on contacts (if available)
	// Must be before early returns to satisfy React hooks rules
	const initialCenter = useMemo(() => {
		if (contactsWithCoords.length === 0) return defaultCenter;

		// Calculate centroid of all contact coordinates
		let sumLat = 0;
		let sumLng = 0;
		let count = 0;

		contactsWithCoords.forEach((contact) => {
			const coords = getContactCoords(contact);
			if (coords) {
				sumLat += coords.lat;
				sumLng += coords.lng;
				count++;
			}
		});

		if (count === 0) return defaultCenter;

		return {
			lat: sumLat / count,
			lng: sumLng / count,
		};
	}, [contactsWithCoords, getContactCoords]);

	if (loadError) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
				<p className="text-gray-500">Error loading map</p>
			</div>
		);
	}

	if (!isLoaded) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	// Get position for selected marker
	const selectedMarkerCoords = selectedMarker ? getContactCoords(selectedMarker) : null;

	return (
		<GoogleMap
			mapContainerStyle={mapContainerStyle}
			center={initialCenter}
			zoom={contactsWithCoords.length > 0 ? 10 : 4}
			onLoad={onLoad}
			onUnmount={onUnmount}
			options={mapOptions}
			onClick={() => setSelectedMarker(null)}
		>
			{/* Only render markers when not loading */}
			{!isLoading &&
				visibleContacts.map((contact) => {
					const coords = getContactCoords(contact);
					if (!coords) return null;
					const isHovered = hoveredMarkerId === contact.id;
					const isSelected = selectedContacts.includes(contact.id);
					const hasLockedStateSelection =
						lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey;
					const isOutsideLockedState = hasLockedStateSelection
						? !isCoordsInLockedState(coords)
						: false;
					const dotIcon = isSelected
						? isHovered
							? isOutsideLockedState
								? hoveredSelectedMarkerIconOutside
								: hoveredSelectedMarkerIcon
							: isOutsideLockedState
								? selectedMarkerIconOutside
								: selectedMarkerIcon
						: isHovered
							? isOutsideLockedState
								? hoveredDefaultMarkerIconOutside
								: hoveredDefaultMarkerIcon
							: isOutsideLockedState
								? defaultMarkerIconOutside
								: defaultMarkerIcon;
					return (
						<Fragment key={contact.id}>
							{/* Invisible larger hit area for hover detection - this controls all hover state */}
							<MarkerF
								position={coords}
								icon={invisibleHitAreaIcon}
								onMouseOver={(e) => {
									hoveredMarkerIdRef.current = contact.id;
									setHoveredMarkerId(contact.id);
									const domEvent = e?.domEvent as MouseEvent | TouchEvent | undefined;
									let meta: MarkerHoverMeta | undefined;
									if (domEvent && 'clientX' in domEvent && 'clientY' in domEvent) {
										meta = { clientX: domEvent.clientX, clientY: domEvent.clientY };
									} else if (
										domEvent &&
										'touches' in domEvent &&
										domEvent.touches &&
										domEvent.touches.length > 0
									) {
										meta = {
											clientX: domEvent.touches[0].clientX,
											clientY: domEvent.touches[0].clientY,
										};
									}
									onMarkerHover?.(contact, meta);
								}}
								onMouseOut={() => {
									setHoveredMarkerId((prev) => (prev === contact.id ? null : prev));
									if (hoveredMarkerIdRef.current === contact.id) {
										hoveredMarkerIdRef.current = null;
										onMarkerHover?.(null);
									}
								}}
								onClick={() => handleMarkerClick(contact)}
								clickable={true}
								zIndex={3}
							/>
							{/* Dot marker (slightly larger on hover) */}
							<MarkerF
								position={coords}
								icon={dotIcon}
								clickable={false}
								zIndex={isHovered ? 2 : 1}
							/>
						</Fragment>
					);
				})}

			{/* Only show selected marker overlay when not loading */}
			{!isLoading && selectedMarker && selectedMarkerCoords && (
				<OverlayView
					position={selectedMarkerCoords}
					mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
					getPixelPositionOffset={(width, height) => ({
						x: -(width / 2),
						y: -height - 20,
					})}
				>
					<div
						className="relative"
						style={{
							width: '320px',
							backgroundColor: 'rgba(216, 229, 251, 0.8)',
							border: '2px solid black',
							borderRadius: '7px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
						}}
						onMouseEnter={handleResearchPanelMouseEnter}
						onMouseLeave={handleResearchPanelMouseLeave}
					>
						{/* Close button */}
						<button
							onClick={() => setSelectedMarker(null)}
							className="absolute top-[10px] -translate-y-1/2 right-2 z-20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
							style={{ fontSize: '14px', lineHeight: 1, fontWeight: 500 }}
						>
							×
						</button>
						{/* Header */}
						<div
							className="w-full"
							style={{ height: '20px', backgroundColor: 'rgba(232, 239, 255, 0.8)' }}
						/>
						<div className="absolute top-[10px] left-[12px] -translate-y-1/2 z-10">
							<span className="font-bold text-[12px] leading-none text-black">
								Research
							</span>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '20px', height: '2px' }}
						/>
						{/* Name/Company section */}
						<div className="w-full bg-white" style={{ height: '36px', marginTop: '2px' }}>
							<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
								<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
									<div className="font-inter font-bold text-[13px] leading-none truncate text-black">
										{(() => {
											const fullName = `${selectedMarker.firstName || ''} ${
												selectedMarker.lastName || ''
											}`.trim();
											return (
												fullName ||
												selectedMarker.name ||
												selectedMarker.company ||
												'Unknown'
											);
										})()}
									</div>
									{(() => {
										const fullName = `${selectedMarker.firstName || ''} ${
											selectedMarker.lastName || ''
										}`.trim();
										const hasName =
											fullName.length > 0 ||
											(selectedMarker.name && selectedMarker.name.length > 0);
										if (!hasName) return null;
										return (
											<div className="text-[11px] leading-tight truncate text-black mt-[2px]">
												{selectedMarker.company || ''}
											</div>
										);
									})()}
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="flex flex-col items-end gap-[2px] max-w-[120px]">
										<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
											{(() => {
												const stateAbbr =
													getStateAbbreviation(selectedMarker.state || '') || '';
												if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
													return (
														<span
															className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
															style={{ backgroundColor: stateBadgeColorMap[stateAbbr] }}
														>
															{stateAbbr}
														</span>
													);
												}
												return null;
											})()}
											{selectedMarker.city && (
												<span className="text-[11px] leading-none text-black truncate">
													{selectedMarker.city}
												</span>
											)}
										</div>
										{(selectedMarker.title || selectedMarker.headline) && (
											<div className="px-1.5 py-[1px] rounded-[6px] bg-[#E8EFFF] border border-black max-w-full truncate">
												<span className="text-[9px] leading-none text-black block truncate">
													{selectedMarker.title || selectedMarker.headline}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '58px', height: '1px' }}
						/>
						{/* Research boxes */}
						{(() => {
							// Debug: log the metadata to console
							console.log('Contact metadata:', {
								id: selectedMarker.id,
								metadata: selectedMarker.metadata,
								hasMetadata: !!selectedMarker.metadata,
							});

							const metadataSections = parseMetadataSections(selectedMarker.metadata);
							const boxConfigs = [
								{ key: '1', color: 'rgba(21, 139, 207, 0.8)' },
								{ key: '2', color: 'rgba(67, 174, 236, 0.8)' },
								{ key: '3', color: 'rgba(124, 201, 246, 0.8)' },
								{ key: '4', color: 'rgba(170, 218, 246, 0.8)' },
							];
							const visibleBoxes = boxConfigs.filter(
								(config) => metadataSections[config.key]
							);

							// If no parsed sections but raw metadata exists, show raw metadata
							if (visibleBoxes.length === 0) {
								if (
									selectedMarker.metadata &&
									selectedMarker.metadata.trim().length > 0
								) {
									// Show raw metadata in a single box if it doesn't match [1], [2] format
									return (
										<div className="p-2">
											<div
												id="map-research-scroll-container"
												className="relative"
												style={{
													width: '100%',
													minHeight: '60px',
													backgroundColor: 'rgba(21, 139, 207, 0.8)',
													border: '2px solid #000000',
													borderRadius: '6px',
												}}
											>
												<style>{`
													#map-research-scroll-container *::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
													#map-research-scroll-container * {
														scrollbar-width: none !important;
														-ms-overflow-style: none !important;
													}
												`}</style>
												<div
													className="absolute"
													style={{
														top: '4px',
														bottom: '4px',
														left: '6px',
														right: '6px',
														backgroundColor: '#FFFFFF',
														border: '1px solid #000000',
														borderRadius: '4px',
														overflow: 'hidden',
													}}
												>
													<CustomScrollbar
														className="w-full h-full"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-14}
														contentClassName="scrollbar-hide"
													>
														<div className="px-2 py-1">
															<div className="w-full text-[10px] leading-[1.3] text-black font-inter">
																{selectedMarker.metadata}
															</div>
														</div>
													</CustomScrollbar>
												</div>
											</div>
										</div>
									);
								}
								return (
									<div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
										No research data available for this contact
									</div>
								);
							}

							return (
								<div className="p-2 flex flex-col gap-2">
									{visibleBoxes.map((config) => (
										<div
											key={config.key}
											className="relative"
											style={{
												width: '100%',
												minHeight: '44px',
												backgroundColor: config.color,
												border: '2px solid #000000',
												borderRadius: '6px',
											}}
										>
											<div
												className="absolute font-inter font-bold"
												style={{
													top: '4px',
													left: '6px',
													fontSize: '10px',
													color: '#000000',
												}}
											>
												[{config.key}]
											</div>
											<div
												className="absolute overflow-hidden"
												style={{
													top: '50%',
													transform: 'translateY(-50%)',
													right: '6px',
													width: 'calc(100% - 36px)',
													minHeight: '36px',
													maxHeight: '36px',
													backgroundColor: '#FFFFFF',
													border: '1px solid #000000',
													borderRadius: '4px',
												}}
											>
												<div className="w-full h-full px-2 flex items-center overflow-hidden">
													<div
														className="w-full text-[10px] leading-[1.3] text-black font-inter"
														style={{
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
														}}
													>
														{metadataSections[config.key]}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							);
						})()}
						{/* Pointer triangle */}
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-10px',
								width: 0,
								height: 0,
								borderLeft: '10px solid transparent',
								borderRight: '10px solid transparent',
								borderTop: '10px solid #D8E5FB',
							}}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-14px',
								width: 0,
								height: 0,
								borderLeft: '12px solid transparent',
								borderRight: '12px solid transparent',
								borderTop: '12px solid black',
								zIndex: -1,
							}}
						/>
					</div>
				</OverlayView>
			)}
		</GoogleMap>
	);
};

export default SearchResultsMap;
