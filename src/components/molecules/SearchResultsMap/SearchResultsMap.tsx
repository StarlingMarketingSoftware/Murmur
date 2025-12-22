'use client';

import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, OverlayView, OverlayViewF } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useGetContactsMapOverlay } from '@/hooks/queryHooks/useContacts';
import {
	calculateTooltipWidth,
	calculateTooltipHeight,
	calculateTooltipAnchorY,
	generateMapTooltipIconUrl,
	MAP_TOOLTIP_ANCHOR_X,
} from '@/components/atoms/_svg/MapTooltipIcon';
import {
	generateMapMarkerPinIconUrl,
	MAP_MARKER_PIN_CIRCLE_CENTER_X,
	MAP_MARKER_PIN_CIRCLE_CENTER_Y,
	MAP_MARKER_PIN_CIRCLE_DIAMETER,
	MAP_MARKER_PIN_VIEWBOX_HEIGHT,
	MAP_MARKER_PIN_VIEWBOX_WIDTH,
} from '@/components/atoms/_svg/MapMarkerPinIcon';

type LatLngLiteral = { lat: number; lng: number };
type MarkerHoverMeta = { clientX: number; clientY: number };

type ClippingCoord = [number, number]; // [lng, lat]
type ClippingRing = ClippingCoord[];
type ClippingPolygon = ClippingRing[];
type ClippingMultiPolygon = ClippingPolygon[];

type BoundingBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type PreparedClippingPolygon = { polygon: ClippingPolygon; bbox: BoundingBox };

type MapSelectionBounds = { south: number; west: number; north: number; east: number };

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

const getClientPointFromDomEvent = (domEvent: unknown): { x: number; y: number } | null => {
	const ev = domEvent as Partial<MouseEvent & TouchEvent & PointerEvent> | null;
	if (!ev) return null;
	if (typeof (ev as MouseEvent).clientX === 'number' && typeof (ev as MouseEvent).clientY === 'number') {
		return { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };
	}
	const touches = (ev as TouchEvent).touches;
	if (touches && touches.length > 0) {
		return { x: touches[0].clientX, y: touches[0].clientY };
	}
	return null;
};

const hashStringToUint32 = (str: string): number => {
	// FNV-1a 32-bit
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

// Hard cap for total dots rendered in the viewport (contacts + background dots).
// Rendering more than this tends to overload many machines at low zoom levels.
const MAX_TOTAL_DOTS = 500;

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
	/** Full search query string (e.g. "[Booking] Music Venues (Portland, ME)") */
	searchQuery?: string | null;
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	/** Map interaction mode controlled by the dashboard (grab = pan/zoom, select = draw rectangle). */
	activeTool?: 'select' | 'grab';
	/** Called when the user completes a rectangle selection (south/west/north/east). */
	onAreaSelect?: (bounds: MapSelectionBounds) => void;
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

const MAP_MIN_ZOOM = 5;

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
// When zoomed out to a US-wide view, show subtle state divider lines (like Zillow).
// Keep these behind the blue/black search-area outlines.
const STATE_DIVIDER_LINES_MAX_ZOOM = 8;
const STATE_DIVIDER_LINES_COLOR = '#90A4AE';
const STATE_DIVIDER_LINES_STROKE_OPACITY = 1;
const STATE_DIVIDER_LINES_STROKE_WEIGHT = 1.7;

// Marker dot colors by search "What" value (dashboard/drafting search).
const DEFAULT_RESULT_DOT_COLOR = '#D21E1F';
const RESULT_DOT_ZOOM_MIN = 4;
const RESULT_DOT_ZOOM_MAX = 14;
const RESULT_DOT_SCALE_MIN = 3;
const RESULT_DOT_SCALE_MAX = 11;
// Overlay pins look too small when zoomed out; keep their circle readable without
// overpowering the search tray/category icons.
const MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX = 16;
// Stroke weight should be thinner when zoomed out and approach ~3px when zoomed in.
const RESULT_DOT_STROKE_WEIGHT_MIN_PX = 1.5;
const RESULT_DOT_STROKE_WEIGHT_MAX_PX = 3;
const RESULT_DOT_STROKE_COLOR_DEFAULT = '#FFFFFF';
const RESULT_DOT_STROKE_COLOR_SELECTED = '#15C948';

// Keep hover tooltip above all map markers so it never gets covered.
const HOVER_TOOLTIP_Z_INDEX = 1_000_000;
const MARKER_HIT_AREA_Z_INDEX = 2;
const MARKER_DOT_Z_INDEX = 1;
// Minimum zoom level required to trigger hover tooltips and research highlights on markers.
// Below this zoom level, markers are too dense and small for hover interactions to be useful.
const HOVER_INTERACTION_MIN_ZOOM = 8;
// Booking searches: when zoomed in enough, show additional nearby booking categories as extra markers.
const BOOKING_EXTRA_MARKERS_MIN_ZOOM = 10;
// Keep extra markers capped so map remains responsive.
const BOOKING_EXTRA_MARKERS_MAX_DOTS = 160;
// Promotion searches: show state-wide radio list pins as overlay markers.
// These are intentionally available at low zoom so all states can be visible together.
const PROMOTION_OVERLAY_MARKERS_MIN_ZOOM = 4;
// Defensive cap; expected to be ~2 per state.
const PROMOTION_OVERLAY_MARKERS_MAX_PINS = 220;
// Zoom level at which the map switches to satellite/hybrid view for better detail
const SATELLITE_VIEW_MIN_ZOOM = 14;

const BOOKING_EXTRA_TITLE_PREFIXES = [
	'Music Venues',
	'Coffee Shops',
	'Restaurants',
	'Music Festivals',
	'Breweries',
	'Wineries',
	'Wedding Planners',
	'Wedding Venues',
	// Also supported by the booking search backend; include if present.
	'Distilleries',
	'Cideries',
] as const;

const PROMOTION_OVERLAY_TITLE_PREFIXES = ['Radio Stations', 'College Radio'] as const;

const startsWithCaseInsensitive = (value: string | null | undefined, prefix: string): boolean => {
	if (!value) return false;
	const p = prefix.trim().toLowerCase();
	if (!p) return false;
	return value.trim().toLowerCase().startsWith(p);
};

const getBookingTitlePrefixFromContactTitle = (title: string | null | undefined): string | null => {
	if (!title) return null;
	for (const prefix of BOOKING_EXTRA_TITLE_PREFIXES) {
		if (startsWithCaseInsensitive(title, prefix)) return prefix;
	}
	return null;
};

const isPromotionOverlayListTitle = (title: string | null | undefined): boolean => {
	if (!title) return false;
	return PROMOTION_OVERLAY_TITLE_PREFIXES.some((p) => startsWithCaseInsensitive(title, p));
};

// Promotion overlay pins should use the Radio Stations visual language (icon + color).
const getPromotionOverlayWhatFromContactTitle = (title: string | null | undefined): string | null =>
	isPromotionOverlayListTitle(title) ? 'Radio Stations' : null;

const isBookingSearchQuery = (query: string | null | undefined): boolean =>
	(query ?? '').trim().toLowerCase().startsWith('[booking]');
const isPromotionSearchQuery = (query: string | null | undefined): boolean =>
	(query ?? '').trim().toLowerCase().startsWith('[promotion]');
const normalizeWhatKey = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

const WHAT_TO_RESULT_DOT_COLOR: Record<string, string> = {
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	[normalizeWhatKey('Venues')]: '#00CBFB',
	[normalizeWhatKey('Music Venues')]: '#00CBFB',
	[normalizeWhatKey('Festivals')]: '#2D27DC',
	[normalizeWhatKey('Music Festivals')]: '#2D27DC',
	[normalizeWhatKey('Restaurants')]: '#1EA300',
	[normalizeWhatKey('Coffee Shops')]: '#8BD003',
	[normalizeWhatKey('Wedding Planners')]: '#D6990A',
	[normalizeWhatKey('Wine Beer and spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#981AEC',
	// Booking extras: map alcohol-related categories to the Wine/Beer/Spirits palette.
	[normalizeWhatKey('Breweries')]: '#981AEC',
	[normalizeWhatKey('Wineries')]: '#981AEC',
	[normalizeWhatKey('Distilleries')]: '#981AEC',
	[normalizeWhatKey('Cideries')]: '#981AEC',
	// Booking extras: show wedding venues with the same palette as wedding planners.
	[normalizeWhatKey('Wedding Venues')]: '#D6990A',
};

// Hover tooltip (SVG bubble) fill colors by search "What" value.
// These are intentionally allowed to differ from the dot colors.
const WHAT_TO_HOVER_TOOLTIP_FILL_COLOR: Record<string, string> = {
	// Promotion: match the search tray palette.
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	// Music venues should be a lighter blue on hover.
	[normalizeWhatKey('Venues')]: '#71C9FD',
	[normalizeWhatKey('Music Venues')]: '#71C9FD',

	// Wine/beer/spirits should be periwinkle on hover.
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spirits')]: '#80AAFF',
	// Defensive: handle a misspelling we've seen in copy.
	[normalizeWhatKey('Wine, Beer, and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spiriti')]: '#80AAFF',

	// Keep existing behavior for festivals.
	[normalizeWhatKey('Festivals')]: '#80AAFF',
	[normalizeWhatKey('Music Festivals')]: '#80AAFF',
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
	searchQuery,
	searchWhat,
	activeTool,
	onAreaSelect,
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
	// Track tooltip that is fading out (for smooth transition)
	const [fadingTooltipId, setFadingTooltipId] = useState<number | null>(null);
	const fadingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(4); // Default zoom level
	const [visibleContacts, setVisibleContacts] = useState<ContactWithName[]>([]);
	const [bookingExtraVisibleContacts, setBookingExtraVisibleContacts] = useState<ContactWithName[]>(
		[]
	);
	const lastBookingExtraVisibleContactsKeyRef = useRef<string>('');
	const lastBookingExtraFetchKeyRef = useRef<string>('');
	const [bookingExtraFetchBbox, setBookingExtraFetchBbox] = useState<BoundingBox | null>(null);
	const [promotionOverlayVisibleContacts, setPromotionOverlayVisibleContacts] = useState<
		ContactWithName[]
	>([]);
	const lastPromotionOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastPromotionOverlayFetchKeyRef = useRef<string>('');
	const [promotionOverlayFetchBbox, setPromotionOverlayFetchBbox] = useState<BoundingBox | null>(
		null
	);
	// Rectangle selection state (dashboard map select tool)
	const [isAreaSelecting, setIsAreaSelecting] = useState(false);
	const selectionStartLatLngRef = useRef<LatLngLiteral | null>(null);
	const selectionStartClientRef = useRef<{ x: number; y: number } | null>(null);
	const selectionRectRef = useRef<google.maps.Rectangle | null>(null);
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Small delay when moving between marker layers (prevents hover flicker)
	const hoverClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
	const baseContactIdSet = useMemo(
		() => new Set<number>(contacts.map((c) => c.id)),
		[contacts]
	);

	const isBookingSearch = useMemo(() => isBookingSearchQuery(searchQuery), [searchQuery]);
	const isPromotionSearch = useMemo(() => isPromotionSearchQuery(searchQuery), [searchQuery]);
	useEffect(() => {
		// Reset the overlay fetch window and any visible extra markers on search transitions.
		lastBookingExtraFetchKeyRef.current = '';
		setBookingExtraFetchBbox(null);
		lastBookingExtraVisibleContactsKeyRef.current = '';
		setBookingExtraVisibleContacts([]);
		lastPromotionOverlayFetchKeyRef.current = '';
		setPromotionOverlayFetchBbox(null);
		lastPromotionOverlayVisibleContactsKeyRef.current = '';
		setPromotionOverlayVisibleContacts([]);
	}, [searchQuery]);

	const areaSelectionEnabled = useMemo(
		() => activeTool === 'select' && typeof onAreaSelect === 'function',
		[activeTool, onAreaSelect]
	);

	const clearSelectionRect = useCallback(() => {
		if (selectionRectRef.current) {
			selectionRectRef.current.setMap(null);
			selectionRectRef.current = null;
		}
		selectionStartLatLngRef.current = null;
		selectionStartClientRef.current = null;
		setIsAreaSelecting(false);
	}, []);

	const ensureSelectionRect = useCallback((): google.maps.Rectangle | null => {
		if (!map) return null;
		if (selectionRectRef.current) return selectionRectRef.current;
		const rect = new google.maps.Rectangle({
			map,
			clickable: false,
			draggable: false,
			editable: false,
			strokeColor: '#143883',
			strokeOpacity: 1,
			strokeWeight: 2,
			fillColor: '#143883',
			fillOpacity: 0.08,
			zIndex: 2_000_000,
		});
		selectionRectRef.current = rect;
		return rect;
	}, [map]);

	// Cancel selection if the tool changes or the map unmounts.
	useEffect(() => {
		if (!areaSelectionEnabled && isAreaSelecting) {
			clearSelectionRect();
		}
	}, [areaSelectionEnabled, isAreaSelecting, clearSelectionRect]);

	useEffect(() => {
		return () => {
			// Defensive cleanup on unmount.
			if (selectionRectRef.current) {
				selectionRectRef.current.setMap(null);
				selectionRectRef.current = null;
			}
		};
	}, []);

	// ESC cancels an in-progress selection.
	useEffect(() => {
		if (!isAreaSelecting) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				clearSelectionRect();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isAreaSelecting, clearSelectionRect]);

	// If the user releases the mouse outside the map, ensure we don't get "stuck" selecting.
	useEffect(() => {
		if (!isAreaSelecting) return;
		// Defer so the map's own mouseup handler can run first.
		const onWindowMouseUp = () => setTimeout(() => clearSelectionRect(), 0);
		window.addEventListener('mouseup', onWindowMouseUp);
		return () => window.removeEventListener('mouseup', onWindowMouseUp);
	}, [isAreaSelecting, clearSelectionRect]);

	const mapOptionsForTool: google.maps.MapOptions = useMemo(() => {
		const tool = activeTool ?? 'grab';
		return {
			...mapOptions,
			// When selecting, disable drag-to-pan so click-drag can be used to draw the box.
			draggable: tool === 'grab',
			draggableCursor: tool === 'select' ? 'crosshair' : 'grab',
			draggingCursor: tool === 'select' ? 'crosshair' : 'grabbing',
		};
	}, [activeTool]);

	const handleMapMouseDown = useCallback(
		(e: google.maps.MapMouseEvent) => {
			if (!areaSelectionEnabled) return;
			if (!e.latLng) return;

			// Only left-click starts a selection.
			const domEv = e.domEvent as MouseEvent | undefined;
			if (domEv && typeof domEv.button === 'number' && domEv.button !== 0) return;

			const start = e.latLng.toJSON();
			selectionStartLatLngRef.current = start;
			selectionStartClientRef.current = getClientPointFromDomEvent(e.domEvent);
			setIsAreaSelecting(true);

			const rect = ensureSelectionRect();
			rect?.setBounds({
				south: start.lat,
				west: start.lng,
				north: start.lat,
				east: start.lng,
			});
		},
		[areaSelectionEnabled, ensureSelectionRect]
	);

	const handleMapMouseMove = useCallback(
		(e: google.maps.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) return;
			if (!e.latLng) return;
			const current = e.latLng.toJSON();
			const rect = ensureSelectionRect();
			rect?.setBounds({
				south: Math.min(start.lat, current.lat),
				west: Math.min(start.lng, current.lng),
				north: Math.max(start.lat, current.lat),
				east: Math.max(start.lng, current.lng),
			});
		},
		[isAreaSelecting, ensureSelectionRect]
	);

	const handleMapMouseUp = useCallback(
		(e: google.maps.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) {
				clearSelectionRect();
				return;
			}
			const end = e.latLng ? e.latLng.toJSON() : start;

			// Ignore tiny "click" selections (treat as cancel).
			const startClient = selectionStartClientRef.current;
			const endClient = getClientPointFromDomEvent(e.domEvent);
			const dx = startClient && endClient ? Math.abs(endClient.x - startClient.x) : 0;
			const dy = startClient && endClient ? Math.abs(endClient.y - startClient.y) : 0;
			const movedEnough = dx >= 6 || dy >= 6;

			clearSelectionRect();

			if (!movedEnough) return;

			onAreaSelect?.({
				south: Math.min(start.lat, end.lat),
				west: Math.min(start.lng, end.lng),
				north: Math.max(start.lat, end.lat),
				east: Math.max(start.lng, end.lng),
			});
		},
		[isAreaSelecting, clearSelectionRect, onAreaSelect]
	);

	const updateBookingExtraFetchBbox = useCallback(
		(mapInstance: google.maps.Map | null) => {
			if (!mapInstance) return;

			// Only run for booking-mode searches, and only once the user is zoomed in.
			if (!isBookingSearch) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < BOOKING_EXTRA_MARKERS_MIN_ZOOM) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;

			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat();
			const west = sw.lng();
			const north = ne.lat();
			const east = ne.lng();

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Pad the fetch bounds so panning within the current view doesn't immediately require refetching.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.35;
			const padLng = lngSpan * 0.35;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;

			if (nextKey === lastBookingExtraFetchKeyRef.current) return;
			lastBookingExtraFetchKeyRef.current = nextKey;
			setBookingExtraFetchBbox({ minLat: qSouth, minLng: qWest, maxLat: qNorth, maxLng: qEast });
		},
		[isBookingSearch]
	);

	const updatePromotionOverlayFetchBbox = useCallback(
		(mapInstance: google.maps.Map | null) => {
			if (!mapInstance) return;

			// Only run for promotion-mode searches.
			if (!isPromotionSearch) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < PROMOTION_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;

			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat();
			const west = sw.lng();
			const north = ne.lat();
			const east = ne.lng();

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.1;
			const padLng = lngSpan * 0.1;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastPromotionOverlayFetchKeyRef.current) return;
			lastPromotionOverlayFetchKeyRef.current = nextKey;
			setPromotionOverlayFetchBbox({ minLat: qSouth, minLng: qWest, maxLat: qNorth, maxLng: qEast });
		},
		[isPromotionSearch]
	);

	const bookingExtraOverlayFilters = useMemo(() => {
		if (!bookingExtraFetchBbox) return undefined;
		return {
			mode: 'booking' as const,
			south: bookingExtraFetchBbox.minLat,
			west: bookingExtraFetchBbox.minLng,
			north: bookingExtraFetchBbox.maxLat,
			east: bookingExtraFetchBbox.maxLng,
			limit: 1200,
		};
	}, [bookingExtraFetchBbox]);

	const { data: bookingExtraRawContacts } = useGetContactsMapOverlay({
		filters: bookingExtraOverlayFilters,
		enabled: Boolean(bookingExtraOverlayFilters),
	});

	const promotionOverlayFilters = useMemo(() => {
		if (!promotionOverlayFetchBbox) return undefined;
		return {
			mode: 'promotion' as const,
			south: promotionOverlayFetchBbox.minLat,
			west: promotionOverlayFetchBbox.minLng,
			north: promotionOverlayFetchBbox.maxLat,
			east: promotionOverlayFetchBbox.maxLng,
			limit: 1200,
		};
	}, [promotionOverlayFetchBbox]);

	const { data: promotionOverlayRawContacts } = useGetContactsMapOverlay({
		filters: promotionOverlayFilters,
		enabled: Boolean(promotionOverlayFilters),
	});

	const bookingExtraContacts = useMemo(() => {
		if (!bookingExtraRawContacts || bookingExtraRawContacts.length === 0) return [];
		return bookingExtraRawContacts.filter((c) => {
			// Never duplicate primary result markers.
			if (baseContactIdSet.has(c.id)) return false;
			const prefix = getBookingTitlePrefixFromContactTitle(c.title);
			if (!prefix) return false;
			return true;
		});
	}, [bookingExtraRawContacts, baseContactIdSet]);

	const promotionOverlayContacts = useMemo(() => {
		if (!promotionOverlayRawContacts || promotionOverlayRawContacts.length === 0) return [];
		return promotionOverlayRawContacts.filter((c) => {
			// Client-side safety: only keep state-wide list titles.
			return isPromotionOverlayListTitle(c.title);
		});
	}, [promotionOverlayRawContacts]);

	const { contactsWithCoords: bookingExtraContactsWithCoords, coordsByContactId: bookingExtraCoordsByContactId } =
		useMemo(() => {
			const coordsByContactId = new Map<number, LatLngLiteral>();
			const contactsWithCoords: ContactWithName[] = [];
			const groups = new Map<string, number[]>();

			for (const contact of bookingExtraContacts) {
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
		}, [bookingExtraContacts]);

	const {
		contactsWithCoords: promotionOverlayContactsWithCoords,
		coordsByContactId: promotionOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of promotionOverlayContacts) {
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
	}, [promotionOverlayContacts]);

	const getBookingExtraContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			bookingExtraCoordsByContactId.get(contact.id) ?? null,
		[bookingExtraCoordsByContactId]
	);

	const getPromotionOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			promotionOverlayCoordsByContactId.get(contact.id) ?? null,
		[promotionOverlayCoordsByContactId]
	);

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
		const stillVisible =
			visibleContacts.some((c) => c.id === hoveredMarkerId) ||
			bookingExtraVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			promotionOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId);
		if (stillVisible) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		hoveredMarkerIdRef.current = null;
		onMarkerHover?.(null);
	}, [
		visibleContacts,
		bookingExtraVisibleContacts,
		promotionOverlayVisibleContacts,
		hoveredMarkerId,
		onMarkerHover,
	]);

	// Clear hover state when zooming out past the minimum threshold
	useEffect(() => {
		if (zoomLevel >= HOVER_INTERACTION_MIN_ZOOM) return;
		if (hoveredMarkerId == null) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		hoveredMarkerIdRef.current = null;
		onMarkerHover?.(null);
	}, [zoomLevel, hoveredMarkerId, onMarkerHover]);

	// Switch to satellite/hybrid view when zoomed in close enough for street-level detail
	useEffect(() => {
		if (!map) return;
		const shouldUseSatellite = zoomLevel >= SATELLITE_VIEW_MIN_ZOOM;
		const currentMapType = map.getMapTypeId();
		const targetMapType = shouldUseSatellite ? 'hybrid' : 'roadmap';
		if (currentMapType !== targetMapType) {
			map.setMapTypeId(targetMapType);
		}
	}, [map, zoomLevel]);

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
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
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

	// Add/remove hover highlight and optional click-to-select for states.
	// Hover highlight is intentionally only enabled at the minimum zoom (fully zoomed out).
	useEffect(() => {
		const dataLayer = stateLayerRef.current;
		if (!map || !dataLayer || !isStateLayerReady) return;

		const loading = isLoading ?? false;
		// "Fully zoomed out" means at the minimum zoom allowed by the map.
		const isFullyZoomedOut = !loading && zoomLevel <= MAP_MIN_ZOOM + 0.001;
		const hasStateInteractivity = !!enableStateInteractions || !!onStateSelect;

		// Hover highlight should only exist at the minimum zoom and only when states are actionable.
		const shouldEnableHoverHighlight = isFullyZoomedOut && hasStateInteractivity;
		// Click-to-select states:
		// - Campaign page (enableStateInteractions): always clickable
		// - Dashboard map view (no enableStateInteractions): clickable only when fully zoomed out
		const shouldEnableClickSelect = !!enableStateInteractions || (!!onStateSelect && isFullyZoomedOut);

		if (!shouldEnableHoverHighlight && !shouldEnableClickSelect) return;

		let mouseoverListener: google.maps.MapsEventListener | null = null;
		let mouseoutListener: google.maps.MapsEventListener | null = null;
		let clickListener: google.maps.MapsEventListener | null = null;

		if (shouldEnableHoverHighlight) {
			mouseoverListener = dataLayer.addListener(
				'mouseover',
				(event: google.maps.Data.MouseEvent) => {
					// Defensive: if zoom changed mid-hover, don't apply the fill.
					const currentZoom = map.getZoom() ?? zoomLevel;
					if (currentZoom > MAP_MIN_ZOOM + 0.001) return;
					if (isLoadingRef.current) return;

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

			mouseoutListener = dataLayer.addListener(
				'mouseout',
				(event: google.maps.Data.MouseEvent) => {
					dataLayer.revertStyle(event.feature);
				}
			);
		}

		if (shouldEnableClickSelect) {
			clickListener = dataLayer.addListener(
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
		}

		return () => {
			mouseoverListener?.remove();
			mouseoutListener?.remove();
			clickListener?.remove();

			// If the user zoomed in while hovering, ensure we clear any lingering fill override.
			if (shouldEnableHoverHighlight) {
				dataLayer.revertStyle();
			}
		};
	}, [map, enableStateInteractions, isStateLayerReady, zoomLevel, isLoading, onStateSelect]);

	// When state interactions are off, show subtle divider lines at low zoom (US-wide view).
	useEffect(() => {
		const dataLayer = stateLayerRef.current;
		if (!dataLayer || !isStateLayerReady) return;
		if (enableStateInteractions) return;

		const loading = isLoading ?? false;
		const isFullyZoomedOut = !loading && zoomLevel <= MAP_MIN_ZOOM + 0.001;
		const shouldShowZoomedOutDividers = zoomLevel <= STATE_DIVIDER_LINES_MAX_ZOOM;
		dataLayer.setStyle(
			shouldShowZoomedOutDividers
				? {
						fillOpacity: 0,
						strokeColor: STATE_DIVIDER_LINES_COLOR,
						strokeOpacity: STATE_DIVIDER_LINES_STROKE_OPACITY,
						strokeWeight: STATE_DIVIDER_LINES_STROKE_WEIGHT,
						// Enable hover only at the map's minimum zoom.
						clickable: isFullyZoomedOut && !!onStateSelect,
						zIndex: 0,
					}
				: {
						fillOpacity: 0,
						strokeOpacity: 0,
						strokeWeight: 0,
						clickable: false,
						zIndex: 0,
					}
		);
	}, [enableStateInteractions, isStateLayerReady, zoomLevel, isLoading, onStateSelect]);

	// When state interactions are on, render the state borders + selected-state outline.
	useEffect(() => {
		const dataLayer = stateLayerRef.current;
		if (!dataLayer || !isStateLayerReady) return;
		if (!enableStateInteractions) return;

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
			// Background dots have been disabled - no longer rendering fake gray dots
			void mapInstance;
			void loading;
			void maxDotsInViewport;
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

			// Promotion overlay pins: state-wide "Radio Stations <State>" / "College Radio <State>"
			// lists should all be visible together at low zoom.
			const shouldShowPromotionOverlay =
				isPromotionSearch &&
				zoomRaw >= PROMOTION_OVERLAY_MARKERS_MIN_ZOOM &&
				promotionOverlayContactsWithCoords.length > 0;
			let nextPromotionOverlayVisible: ContactWithName[] = [];
			if (shouldShowPromotionOverlay) {
				const promoInBounds: ContactWithName[] = [];
				for (const contact of promotionOverlayContactsWithCoords) {
					const coords = getPromotionOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					promoInBounds.push(contact);
				}
				// Keep ordering stable.
				promoInBounds.sort((a, b) => a.id - b.id);
				// Defensive cap (we expect far fewer than this).
				nextPromotionOverlayVisible =
					promoInBounds.length > PROMOTION_OVERLAY_MARKERS_MAX_PINS
						? promoInBounds.slice(0, PROMOTION_OVERLAY_MARKERS_MAX_PINS)
						: promoInBounds;
			}

			const nextPromotionKey = nextPromotionOverlayVisible.map((c) => c.id).join(',');
			if (nextPromotionKey !== lastPromotionOverlayVisibleContactsKeyRef.current) {
				lastPromotionOverlayVisibleContactsKeyRef.current = nextPromotionKey;
				setPromotionOverlayVisibleContacts(nextPromotionOverlayVisible);
			}

			const promotionOverlayIdSet =
				nextPromotionOverlayVisible.length > 0
					? new Set<number>(nextPromotionOverlayVisible.map((c) => c.id))
					: null;

			// Determine which contacts are currently in the viewport.
			const inBounds: ContactWithName[] = [];
			for (const contact of contactsWithCoords) {
				// If this contact is rendered as a promotion overlay pin, don't duplicate it as a dot.
				if (promotionOverlayIdSet?.has(contact.id)) continue;
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

			// Reserve budget for promotion overlay pins so they always render.
			const maxPrimaryDots = Math.max(0, MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length);

			// Build a stable "candidate pool" larger than what we render, then pick a
			// non-overlapping subset so dots never visually stack on top of each other.
			const POOL_FACTOR = 4;
			const poolSlots = maxPrimaryDots * POOL_FACTOR;
			let pool: ContactWithName[] = [];
			if (poolSlots <= 0) {
				pool = [];
			} else if (inBounds.length <= poolSlots) {
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
				if (picked.length >= maxPrimaryDots) break;
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

			// Booking zoom-in extras: render additional booking categories at high zoom without
			// exceeding MAX_TOTAL_DOTS total markers.
			const shouldShowBookingExtras =
				isBookingSearch &&
				zoomRaw >= BOOKING_EXTRA_MARKERS_MIN_ZOOM &&
				bookingExtraContactsWithCoords.length > 0;
			let nextBookingExtraVisible: ContactWithName[] = [];
			if (shouldShowBookingExtras) {
				const remainingBudget = Math.max(
					0,
					MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length - nextVisibleContacts.length
				);
				const maxExtraDots = Math.min(BOOKING_EXTRA_MARKERS_MAX_DOTS, remainingBudget);
				if (maxExtraDots > 0) {
					const extraInBounds: ContactWithName[] = [];
					for (const contact of bookingExtraContactsWithCoords) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
						if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
						extraInBounds.push(contact);
					}

					// Use the same sampling + non-overlap strategy as primary markers.
					const POOL_FACTOR = 4;
					const poolSlots = maxExtraDots * POOL_FACTOR;
					let pool: ContactWithName[] = [];
					if (extraInBounds.length <= poolSlots) {
						pool = extraInBounds;
					} else {
						pool = stableViewportSampleContacts(
							extraInBounds,
							getBookingExtraContactCoords,
							viewportBbox,
							poolSlots,
							`${seed}|bookingExtra|pool`
						);
					}

					type Candidate = { contact: ContactWithName; x: number; y: number; key: number };
					const candidates: Candidate[] = [];
					for (const contact of pool) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
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
							key: hashStringToUint32(`${seed}|bookingExtra|${contact.id}`),
						});
					}

					// Stable ordering.
					candidates.sort((a, b) => a.key - b.key);

					const cellSize = Math.max(6, minSeparationPx);
					const grid = new Map<string, Array<{ x: number; y: number }>>();
					const pickedExtra: ContactWithName[] = [];
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
						if (pickedExtra.length >= maxExtraDots) break;
						const cx = Math.floor(c.x / cellSize);
						const cy = Math.floor(c.y / cellSize);
						if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;
						pickedExtra.push(c.contact);
						const k = `${cx},${cy}`;
						const arr = grid.get(k);
						if (arr) arr.push({ x: c.x, y: c.y });
						else grid.set(k, [{ x: c.x, y: c.y }]);
					}

					nextBookingExtraVisible = pickedExtra;
					nextBookingExtraVisible.sort((a, b) => a.id - b.id);
				}
			}

			const nextExtraKey = nextBookingExtraVisible.map((c) => c.id).join(',');
			if (nextExtraKey !== lastBookingExtraVisibleContactsKeyRef.current) {
				lastBookingExtraVisibleContactsKeyRef.current = nextExtraKey;
				setBookingExtraVisibleContacts(nextBookingExtraVisible);
			}

			const totalRendered = nextVisibleContacts.length + nextBookingExtraVisible.length;
			const backgroundBudget = Math.max(0, MAX_TOTAL_DOTS - totalRendered);
			backgroundDotsBudgetRef.current = backgroundBudget;
			updateBackgroundDots(mapInstance, loading, backgroundBudget);
		},
		[
			contactsWithCoords,
			getContactCoords,
			selectedContacts,
			updateBackgroundDots,
			isBookingSearch,
			bookingExtraContactsWithCoords,
			getBookingExtraContactCoords,
			isPromotionSearch,
			promotionOverlayContactsWithCoords,
			getPromotionOverlayContactCoords,
		]
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

		// Ensure state divider lines render above the background dots layer.
		// (Data layers are stacked by attach order; the dots layer is created later.)
		const stateLayer = stateLayerRef.current;
		if (stateLayer) {
			stateLayer.setMap(null);
			stateLayer.setMap(map);
		}

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
		const onIdle = () => {
			updateBookingExtraFetchBbox(map);
			updatePromotionOverlayFetchBbox(map);
			recomputeViewportDots(map, isLoadingRef.current);
		};
		const listener = map.addListener('idle', onIdle);
		// Initial fill
		onIdle();
		return () => {
			listener.remove();
		};
	}, [map, recomputeViewportDots, updateBookingExtraFetchBbox, updatePromotionOverlayFetchBbox]);

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
		// Initialize zoomLevel immediately so styling reflects the real zoom on first render.
		setZoomLevel(mapInstance.getZoom() ?? 4);

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
		// Toggle selection when clicking on a marker (only for primary result set)
		if (baseContactIdSet.has(contact.id)) {
			onToggleSelection?.(contact.id);
		}
	};

	const handleMarkerMouseOver = useCallback(
		(contact: ContactWithName, e?: google.maps.MapMouseEvent) => {
			// Don't trigger hover interactions until sufficiently zoomed in
			if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM) return;

			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			// Clear any fading tooltip when hovering a new marker
			if (fadingTooltipTimeoutRef.current) {
				clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = null;
			}
			setFadingTooltipId(null);

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
		},
		[onMarkerHover, zoomLevel]
	);

	const handleMarkerMouseOut = useCallback(
		(contactId: number) => {
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
			}
			hoverClearTimeoutRef.current = setTimeout(() => {
				if (hoveredMarkerIdRef.current !== contactId) return;
				hoveredMarkerIdRef.current = null;
				// Start fade-out: set the fading tooltip to the current one
				setFadingTooltipId(contactId);
				setHoveredMarkerId(null);
				onMarkerHover?.(null);
				// Clear fading tooltip after transition completes (150ms matches CSS)
				if (fadingTooltipTimeoutRef.current) {
					clearTimeout(fadingTooltipTimeoutRef.current);
				}
				fadingTooltipTimeoutRef.current = setTimeout(() => {
					setFadingTooltipId(null);
				}, 150);
			}, 60);
		},
		[onMarkerHover]
	);

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale ~3, at zoom 14 (zoomed in): scale ~11
	const markerScale = useMemo(() => {
		return getResultDotScaleForZoom(zoomLevel);
	}, [zoomLevel]);

	const strokeWeight = useMemo(() => {
		return getResultDotStrokeWeightForZoom(zoomLevel);
	}, [zoomLevel]);

	// Marker pin (SVG) sizing: scale so the 36px circle area matches our dot diameter (2*markerScale),
	// but clamp to a minimum so pins remain readable at low zoom.
	const markerPinCircleDiameterPx = useMemo(() => {
		return Math.max(markerScale * 2, MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX);
	}, [markerScale]);

	const markerPinCircleRadiusPx = useMemo(() => markerPinCircleDiameterPx / 2, [markerPinCircleDiameterPx]);

	// Scale factor for the full SVG viewbox.
	const markerPinScaleFactor = useMemo(() => {
		return markerPinCircleDiameterPx / MAP_MARKER_PIN_CIRCLE_DIAMETER;
	}, [markerPinCircleDiameterPx]);

	const markerPinMetrics = useMemo(() => {
		if (!isLoaded) return null;
		const width = MAP_MARKER_PIN_VIEWBOX_WIDTH * markerPinScaleFactor;
		const height = MAP_MARKER_PIN_VIEWBOX_HEIGHT * markerPinScaleFactor;
		// Keep the marker positioned like our previous dot markers: anchor on the circle center.
		const anchorX = MAP_MARKER_PIN_CIRCLE_CENTER_X * markerPinScaleFactor;
		const anchorY = MAP_MARKER_PIN_CIRCLE_CENTER_Y * markerPinScaleFactor;
		return { width, height, anchorX, anchorY };
	}, [isLoaded, markerPinScaleFactor]);

	const markerPinUrlCacheRef = useRef<Map<string, string>>(new Map());
	const getMarkerPinUrl = useCallback(
		(fillColor: string, strokeColor: string, searchWhat?: string | null): string => {
			const key = `${fillColor}|${strokeColor}|${searchWhat ?? ''}`;
			const cached = markerPinUrlCacheRef.current.get(key);
			if (cached) return cached;
			const url = generateMapMarkerPinIconUrl(fillColor, strokeColor, searchWhat);
			markerPinUrlCacheRef.current.set(key, url);
			return url;
		},
		[]
	);

	const getMarkerPinIcon = useCallback(
		(fillColor: string, strokeColor: string, searchWhat?: string | null): google.maps.Icon | undefined => {
			if (!isLoaded) return undefined;
			const metrics = markerPinMetrics;
			if (!metrics) return undefined;

			return {
				url: getMarkerPinUrl(fillColor, strokeColor, searchWhat),
				scaledSize: new google.maps.Size(metrics.width, metrics.height),
				anchor: new google.maps.Point(metrics.anchorX, metrics.anchorY),
			};
		},
		[getMarkerPinUrl, isLoaded, markerPinMetrics]
	);

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

	// Invisible marker for hover hit area - same size as visible dot for enter trigger.
	// The larger leave area is provided by the tooltip overlay's extended bounds below.
	const invisibleHitAreaIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: 'transparent',
			fillOpacity: 0,
			strokeColor: 'transparent',
			strokeWeight: 0,
			scale: markerScale, // Same size as visible dot for precise enter detection
		};
	}, [isLoaded, markerScale]);

	// Invisible hit area sized to match the pin circle (pins are clamped larger at low zoom).
	const invisiblePinHitAreaIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: 'transparent',
			fillOpacity: 0,
			strokeColor: 'transparent',
			strokeWeight: 0,
			scale: markerPinCircleRadiusPx,
		};
	}, [isLoaded, markerPinCircleRadiusPx]);

	// Larger leave buffer zone - how much extra padding below the tooltip for hysteresis
	const hoverLeaveBufferPx = useMemo(() => {
		// The buffer should be roughly the size the hit area used to be (2x marker)
		// This prevents flicker when moving off the marker
		return markerScale * 2;
	}, [markerScale]);

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
			zIndex: -1,
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
			options={mapOptionsForTool}
			onClick={() => {
				// In select mode, a click-drag is used for box selection.
				// Avoid clearing marker state on clicks that are part of drawing.
				if (areaSelectionEnabled) return;
				setSelectedMarker(null);
			}}
			onMouseDown={handleMapMouseDown}
			onMouseMove={handleMapMouseMove}
			onMouseUp={handleMapMouseUp}
		>
			{/* Only render markers when not loading */}
			{!isLoading &&
				promotionOverlayVisibleContacts.map((contact) => {
					const coords = getPromotionOverlayContactCoords(contact);
					if (!coords) return null;
					const isHovered = hoveredMarkerId === contact.id;
					const isSelected = selectedContacts.includes(contact.id);
					const hasLockedStateSelection =
						lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey;
					const isOutsideLockedState = hasLockedStateSelection
						? !isCoordsInLockedState(coords)
						: false;
					// In promotion mode, keep markers *inside* the searched/locked state as regular dots.
					// Only render the overlay "pin" UI for contacts outside the searched area.
					const shouldUseOverlayPinStyle = !hasLockedStateSelection || isOutsideLockedState;

					const whatForMarker = getPromotionOverlayWhatFromContactTitle(contact.title) ?? null;
					const dotFillColor = getResultDotColorForWhat(whatForMarker);
					const dotFillColorOutside = washOutHexColor(
						dotFillColor,
						OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
					);
					const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;
					const pinStrokeColor = isSelected
						? RESULT_DOT_STROKE_COLOR_SELECTED
						: RESULT_DOT_STROKE_COLOR_DEFAULT;
					const pinIcon = getMarkerPinIcon(pinFillColor, pinStrokeColor, whatForMarker);

					const dotIcon =
						isSelected
							? isOutsideLockedState
								? selectedMarkerIconOutside
								: selectedMarkerIcon
							: isOutsideLockedState
								? defaultMarkerIconOutside
								: defaultMarkerIcon;

					// Show tooltip if hovered or if this marker is fading out
					const isFading = fadingTooltipId === contact.id;
					const shouldShowTooltip = isHovered || isFading;
					const hoverTooltip = shouldShowTooltip
						? (() => {
								const fullName = `${contact.firstName || ''} ${
									contact.lastName || ''
								}`.trim();
								const nameForTooltip = fullName || contact.name || '';
								const companyForTooltip = contact.company || '';
								const titleForTooltip = (contact.title || contact.headline || '').trim();
								const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
								const tooltipFillColor = normalizedWhat
									? WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? dotFillColor
									: dotFillColor;
								const width = calculateTooltipWidth(
									nameForTooltip,
									companyForTooltip,
									titleForTooltip,
									whatForMarker
								);
								const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
								const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
								return {
									url: generateMapTooltipIconUrl(
										nameForTooltip,
										companyForTooltip,
										titleForTooltip,
										tooltipFillColor,
										whatForMarker
									),
									width,
									height,
									anchorY,
								};
							})()
						: null;

					return (
						<Fragment key={`promotionOverlay-${contact.id}`}>
							<MarkerF
								position={coords}
								icon={shouldUseOverlayPinStyle ? invisiblePinHitAreaIcon : invisibleHitAreaIcon}
								onMouseOver={(e) => handleMarkerMouseOver(contact, e)}
								onMouseOut={() => handleMarkerMouseOut(contact.id)}
								onClick={() => handleMarkerClick(contact)}
								clickable={true}
								// Keep in-state promotion markers behaving like primary dots; out-of-state pins sit behind.
								zIndex={shouldUseOverlayPinStyle ? 0 : MARKER_HIT_AREA_Z_INDEX}
							/>
							<MarkerF
								position={coords}
								icon={shouldUseOverlayPinStyle ? pinIcon : dotIcon}
								clickable={false}
								zIndex={shouldUseOverlayPinStyle ? -1 : MARKER_DOT_Z_INDEX}
							/>
							{shouldShowTooltip && hoverTooltip && (
								<OverlayViewF
									position={coords}
									mapPaneName={OverlayView.FLOAT_PANE}
									zIndex={HOVER_TOOLTIP_Z_INDEX}
									getPixelPositionOffset={() => ({
										x: -MAP_TOOLTIP_ANCHOR_X,
										y: -hoverTooltip.anchorY,
									})}
								>
									<div
										style={{
											width: `${hoverTooltip.width}px`,
											height: `${hoverTooltip.height + hoverLeaveBufferPx}px`,
											pointerEvents: isHovered ? 'auto' : 'none',
											display: 'flex',
											flexDirection: 'column',
										}}
										onMouseEnter={() => handleMarkerMouseOver(contact)}
										onMouseLeave={() => handleMarkerMouseOut(contact.id)}
										onClick={() => handleMarkerClick(contact)}
									>
										<div
											style={{
												width: '100%',
												height: `${hoverTooltip.height}px`,
												opacity: isHovered ? 1 : 0,
												transition: 'opacity 150ms ease-in-out',
												flexShrink: 0,
											}}
										>
											<img
												src={hoverTooltip.url}
												alt=""
												draggable={false}
												style={{ width: '100%', height: '100%', display: 'block' }}
											/>
										</div>
									</div>
								</OverlayViewF>
							)}
						</Fragment>
					);
				})}
			{!isLoading &&
				bookingExtraVisibleContacts.map((contact) => {
					const coords = getBookingExtraContactCoords(contact);
					if (!coords) return null;
					const isHovered = hoveredMarkerId === contact.id;
					const isSelected = selectedContacts.includes(contact.id);
					const hasLockedStateSelection =
						lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey;
					const isOutsideLockedState = hasLockedStateSelection
						? !isCoordsInLockedState(coords)
						: false;

					const whatForMarker = getBookingTitlePrefixFromContactTitle(contact.title) ?? null;
					const dotFillColor = getResultDotColorForWhat(whatForMarker);
					const dotFillColorOutside = washOutHexColor(
						dotFillColor,
						OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
					);
					const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;
					const pinStrokeColor = isSelected
						? RESULT_DOT_STROKE_COLOR_SELECTED
						: RESULT_DOT_STROKE_COLOR_DEFAULT;
					const pinIcon = getMarkerPinIcon(pinFillColor, pinStrokeColor, whatForMarker);

					// Show tooltip if hovered or if this marker is fading out
					const isFading = fadingTooltipId === contact.id;
					const shouldShowTooltip = isHovered || isFading;
					const hoverTooltip = shouldShowTooltip
						? (() => {
								const fullName = `${contact.firstName || ''} ${
									contact.lastName || ''
								}`.trim();
								const nameForTooltip = fullName || contact.name || '';
								const companyForTooltip = contact.company || '';
								const titleForTooltip = (contact.title || contact.headline || '').trim();
								const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
								const tooltipFillColor = normalizedWhat
									? WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? dotFillColor
									: dotFillColor;
								const width = calculateTooltipWidth(
									nameForTooltip,
									companyForTooltip,
									titleForTooltip,
									whatForMarker
								);
								const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
								const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
								return {
									url: generateMapTooltipIconUrl(
										nameForTooltip,
										companyForTooltip,
										titleForTooltip,
										tooltipFillColor,
										whatForMarker
									),
									width,
									height,
									anchorY,
								};
							})()
						: null;

					return (
						<Fragment key={`bookingExtra-${contact.id}`}>
							{/* Lower z-index hit area so primary markers win when overlapping */}
							<MarkerF
								position={coords}
								icon={invisiblePinHitAreaIcon}
								onMouseOver={(e) => handleMarkerMouseOver(contact, e)}
								onMouseOut={() => handleMarkerMouseOut(contact.id)}
								onClick={() => handleMarkerClick(contact)}
								clickable={true}
								zIndex={0}
							/>
							<MarkerF
								position={coords}
								icon={pinIcon}
								clickable={false}
								zIndex={-1}
							/>
							{shouldShowTooltip && hoverTooltip && (
								<OverlayViewF
									position={coords}
									mapPaneName={OverlayView.FLOAT_PANE}
									zIndex={HOVER_TOOLTIP_Z_INDEX}
									getPixelPositionOffset={() => ({
										x: -MAP_TOOLTIP_ANCHOR_X,
										y: -hoverTooltip.anchorY,
									})}
								>
									<div
										style={{
											width: `${hoverTooltip.width}px`,
											height: `${hoverTooltip.height + hoverLeaveBufferPx}px`,
											pointerEvents: isHovered ? 'auto' : 'none',
											display: 'flex',
											flexDirection: 'column',
										}}
										onMouseEnter={() => handleMarkerMouseOver(contact)}
										onMouseLeave={() => handleMarkerMouseOut(contact.id)}
										onClick={() => handleMarkerClick(contact)}
									>
										<div
											style={{
												width: '100%',
												height: `${hoverTooltip.height}px`,
												opacity: isHovered ? 1 : 0,
												transition: 'opacity 150ms ease-in-out',
												flexShrink: 0,
											}}
										>
											<img
												src={hoverTooltip.url}
												alt=""
												draggable={false}
												style={{ width: '100%', height: '100%', display: 'block' }}
											/>
										</div>
									</div>
								</OverlayViewF>
							)}
						</Fragment>
					);
				})}
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
						? isOutsideLockedState
							? selectedMarkerIconOutside
							: selectedMarkerIcon
						: isOutsideLockedState
							? defaultMarkerIconOutside
							: defaultMarkerIcon;

					// Show tooltip if hovered or if this marker is fading out
					const isFading = fadingTooltipId === contact.id;
					const shouldShowTooltip = isHovered || isFading;
					const hoverTooltip = shouldShowTooltip
						? (() => {
								const fullName = `${contact.firstName || ''} ${
									contact.lastName || ''
								}`.trim();
								const nameForTooltip = fullName || contact.name || '';
								const companyForTooltip = contact.company || '';
								const titleForTooltip = (contact.title || contact.headline || '').trim();
								// Even if the marker dot is "washed out" outside the locked/selected state,
								// keep the hover tooltip using the base search color so it consistently
								// communicates the search category.
								const normalizedWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;
								const tooltipFillColor = normalizedWhat
									? WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? defaultDotFillColor
									: defaultDotFillColor;
								const width = calculateTooltipWidth(
									nameForTooltip,
									companyForTooltip,
									titleForTooltip,
									searchWhat
								);
								const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
								const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
								return {
									url: generateMapTooltipIconUrl(
										nameForTooltip,
										companyForTooltip,
										titleForTooltip,
										tooltipFillColor,
										searchWhat
									),
									width,
									height,
									anchorY,
								};
							})()
						: null;
					return (
						<Fragment key={contact.id}>
							{/* Invisible larger hit area for hover detection - this controls all hover state */}
							<MarkerF
								position={coords}
								icon={invisibleHitAreaIcon}
								onMouseOver={(e) => handleMarkerMouseOver(contact, e)}
								onMouseOut={() => handleMarkerMouseOut(contact.id)}
								onClick={() => handleMarkerClick(contact)}
								clickable={true}
								zIndex={MARKER_HIT_AREA_Z_INDEX}
							/>
							{/* Dot marker (fixed size; hover shows SVG tooltip instead of scaling) */}
							<MarkerF
								position={coords}
								icon={dotIcon}
								clickable={false}
								zIndex={MARKER_DOT_Z_INDEX}
							/>
							{/* Hover SVG tooltip (rendered as an overlay so it's always above markers) */}
							{shouldShowTooltip && hoverTooltip && (
								<OverlayViewF
									position={coords}
									mapPaneName={OverlayView.FLOAT_PANE}
									zIndex={HOVER_TOOLTIP_Z_INDEX}
									getPixelPositionOffset={() => ({
										x: -MAP_TOOLTIP_ANCHOR_X,
										// Align the tooltip tip to the marker's LatLng pixel point.
										y: -hoverTooltip.anchorY,
									})}
								>
									{/* Outer wrapper extends below tooltip for larger leave area (hysteresis) */}
									<div
										style={{
											width: `${hoverTooltip.width}px`,
											// Extend height to include buffer below for easier hover exit
											height: `${hoverTooltip.height + hoverLeaveBufferPx}px`,
											pointerEvents: isHovered ? 'auto' : 'none',
											// Use flex to keep content at top, buffer at bottom
											display: 'flex',
											flexDirection: 'column',
										}}
										onMouseEnter={() => handleMarkerMouseOver(contact)}
										onMouseLeave={() => handleMarkerMouseOut(contact.id)}
										onClick={() => handleMarkerClick(contact)}
									>
										<div
											style={{
												width: '100%',
												height: `${hoverTooltip.height}px`,
												opacity: isHovered ? 1 : 0,
												transition: 'opacity 150ms ease-in-out',
												flexShrink: 0,
											}}
										>
											<img
												src={hoverTooltip.url}
												alt=""
												draggable={false}
												style={{ width: '100%', height: '100%', display: 'block' }}
											/>
										</div>
										{/* Invisible buffer zone below tooltip for hysteresis */}
									</div>
								</OverlayViewF>
							)}
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
