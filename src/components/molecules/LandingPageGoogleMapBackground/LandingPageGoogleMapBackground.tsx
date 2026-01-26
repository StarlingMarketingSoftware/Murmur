'use client';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useState } from 'react';
import {
	generateMapMarkerPinIconUrl,
	MAP_MARKER_PIN_CIRCLE_CENTER_X,
	MAP_MARKER_PIN_CIRCLE_CENTER_Y,
	MAP_MARKER_PIN_VIEWBOX_HEIGHT,
	MAP_MARKER_PIN_VIEWBOX_WIDTH,
} from '@/components/atoms/_svg/MapMarkerPinIcon';
import { LandingPageMapMiniSearchBar } from './LandingPageMapMiniSearchBar';
import {
	LandingPageMapResultsSidePanel,
	type LandingMapPanelContact,
} from './LandingPageMapResultsSidePanel';
import { LandingPageMapSearchTray } from './LandingPageMapSearchTray';
import { LandingPageMapSearchTools } from './LandingPageMapSearchTools';

type Props = {
	className?: string;
	onReady?: () => void;
};

// Marketing map should be focused on California and allow only limited panning.
const DEFAULT_CENTER = { lat: 34.0522, lng: -118.2437 }; // Los Angeles area
const DEFAULT_ZOOM = 4;
const CALIFORNIA_PAN_BOUNDS: google.maps.LatLngBoundsLiteral = {
	// A little breathing room around CA so it can be nudged, but not much.
	north: 42.4,
	south: 32.3,
	west: -125.2,
	east: -113.8,
};

// Demo pins for the landing page map.
const LANDING_DEMO_MARKER_COUNT = 560;
const LANDING_DEMO_MARKER_WIDTH_PX = 16; // smaller pins for dense, marketing-map view

type DemoCategory =
	| 'Restaurants'
	| 'Coffee Shops'
	| 'Music Venues'
	| 'Music Festivals'
	| 'Wedding Planners'
	| 'Wedding Venues'
	| 'Wineries'
	| 'Breweries'
	| 'Distilleries'
	| 'Cideries';

type DemoMarker = { id: number; lat: number; lng: number; category: DemoCategory };

// Demo rows for the landing-page map side panel (the real data can be wired in later).
const LANDING_DEMO_PANEL_CONTACTS: LandingMapPanelContact[] = [
	{
		id: 1,
		name: 'Acquiesce Winery & Vineya...',
		headline: 'Winery',
		city: 'Acampo',
		state: 'CA',
		isUsed: true,
	},
	{ id: 2, name: 'Durst Winery', headline: 'Winery', city: 'Acampo', state: 'CA', isUsed: true },
	{
		id: 3,
		name: "Housley's Century Oak Win...",
		headline: 'Winery',
		city: 'Acampo',
		state: 'CA',
		isUsed: true,
	},
	{ id: 4, name: 'Agua Dulce Winery', headline: 'Winery', city: 'Agua Dulce', state: 'CA', isUsed: true },
	{
		id: 5,
		name: 'Alameda Island Brewing Co...',
		headline: 'Brewery',
		city: 'Alameda',
		state: 'CA',
		isUsed: true,
	},
	{ id: 6, name: 'Building 43 Winery', headline: 'Winery', city: 'Alameda', state: 'CA', isUsed: true },
	{
		id: 7,
		name: 'E.J. Phair Brewing Company',
		headline: 'Brewery',
		city: 'Alamo',
		state: 'CA',
		isUsed: true,
	},
	{
		id: 8,
		name: 'Ocean View Brew Works',
		headline: 'Brewery',
		city: 'Albany',
		state: 'CA',
		isUsed: true,
	},
	{
		id: 9,
		name: 'Wine Tree Farm & Corinne ...',
		headline: 'Winery',
		city: 'Amador City',
		state: 'CA',
		isUsed: true,
	},
	{ id: 10, name: 'Ballast Point: Anaheim', headline: 'Brewery', city: 'Anaheim', state: 'CA', isUsed: true },
	{
		id: 11,
		name: 'Broken Timbers Brewing C...',
		headline: 'Brewery',
		city: 'Anaheim',
		state: 'CA',
		isUsed: true,
	},
	{ id: 12, name: 'Vino Metate', headline: 'Winery', city: 'Angels Camp', state: 'CA', isUsed: true },
	{ id: 13, name: 'Bravante Vineyards', headline: 'Winery', city: 'Angwin', state: 'CA', isUsed: true },
];

type GeoJsonFeatureCollection = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		properties?: Record<string, unknown>;
		geometry: {
			type: 'Polygon' | 'MultiPolygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][][] | number[][][];
		};
	}>;
};

type LngLat = [number, number]; // [lng, lat]
type GeoJsonRing = LngLat[];
type GeoJsonPolygon = GeoJsonRing[];
type GeoJsonMultiPolygon = GeoJsonPolygon[];

type Bbox = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type PreparedPolygon = { rings: GeoJsonPolygon; bbox: Bbox };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const bboxFromRing = (ring: GeoJsonRing): Bbox => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const [lng, lat] of ring) {
		if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
		minLat = Math.min(minLat, lat);
		maxLat = Math.max(maxLat, lat);
		minLng = Math.min(minLng, lng);
		maxLng = Math.max(maxLng, lng);
	}
	return { minLat, maxLat, minLng, maxLng };
};

const isPointInRing = (lng: number, lat: number, ring: GeoJsonRing): boolean => {
	// Ray casting, even-odd rule. Ring coords are [lng,lat].
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i]?.[0];
		const yi = ring[i]?.[1];
		const xj = ring[j]?.[0];
		const yj = ring[j]?.[1];
		if (
			xi == null ||
			yi == null ||
			xj == null ||
			yj == null ||
			!Number.isFinite(xi) ||
			!Number.isFinite(yi) ||
			!Number.isFinite(xj) ||
			!Number.isFinite(yj)
		) {
			continue;
		}

		const intersects =
			(yi > lat) !== (yj > lat) &&
			lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

const isPointInPolygon = (lng: number, lat: number, polygon: GeoJsonPolygon): boolean => {
	if (!polygon.length) return false;
	const outer = polygon[0] ?? [];
	if (!isPointInRing(lng, lat, outer)) return false;
	// Holes
	for (let i = 1; i < polygon.length; i++) {
		const hole = polygon[i] ?? [];
		if (hole.length >= 3 && isPointInRing(lng, lat, hole)) return false;
	}
	return true;
};

const isPointInPreparedPolygons = (
	lng: number,
	lat: number,
	prepared: PreparedPolygon[]
): boolean => {
	for (const poly of prepared) {
		const { bbox, rings } = poly;
		if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) continue;
		if (isPointInPolygon(lng, lat, rings)) return true;
	}
	return false;
};

const mulberry32 = (seed: number) => {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
};

const randNormal = (rng: () => number): number => {
	// Box–Muller
	let u = 0;
	let v = 0;
	while (u === 0) u = rng();
	while (v === 0) v = rng();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

type CityCluster = {
	name: string;
	lat: number;
	lng: number;
	weight: number;
	// Default is CA; use NV for the Vegas demo cluster.
	state?: 'CA' | 'NV';
	// Std dev in degrees latitude; longitude is adjusted by cos(lat)
	sigmaLatDeg: number;
};

const CITY_CLUSTERS: CityCluster[] = [
	// Spread the city-biased points across more metro areas so no single city gets ultra-dense.
	{ name: 'Los Angeles', lat: 34.0522, lng: -118.2437, weight: 0.14, sigmaLatDeg: 0.20 },
	{ name: 'Orange County', lat: 33.8366, lng: -117.9143, weight: 0.07, sigmaLatDeg: 0.16 },
	{ name: 'San Diego', lat: 32.7157, lng: -117.1611, weight: 0.09, sigmaLatDeg: 0.15 },
	{ name: 'Inland Empire', lat: 34.1083, lng: -117.2898, weight: 0.06, sigmaLatDeg: 0.16 },
	{ name: 'Santa Barbara / Ventura', lat: 34.2746, lng: -119.229, weight: 0.05, sigmaLatDeg: 0.12 },
	{ name: 'San Francisco', lat: 37.7749, lng: -122.4194, weight: 0.10, sigmaLatDeg: 0.15 },
	{ name: 'East Bay', lat: 37.8044, lng: -122.2712, weight: 0.06, sigmaLatDeg: 0.14 },
	{ name: 'San Jose', lat: 37.3382, lng: -121.8863, weight: 0.07, sigmaLatDeg: 0.14 },
	{ name: 'Sacramento', lat: 38.5816, lng: -121.4944, weight: 0.06, sigmaLatDeg: 0.14 },
	{ name: 'Stockton', lat: 37.9577, lng: -121.2908, weight: 0.04, sigmaLatDeg: 0.14 },
	{ name: 'Fresno', lat: 36.7378, lng: -119.7871, weight: 0.05, sigmaLatDeg: 0.16 },
	{ name: 'Bakersfield', lat: 35.3733, lng: -119.0187, weight: 0.04, sigmaLatDeg: 0.16 },
	{ name: 'San Luis Obispo', lat: 35.2828, lng: -120.6596, weight: 0.04, sigmaLatDeg: 0.12 },
	{ name: 'Monterey', lat: 36.6002, lng: -121.8947, weight: 0.03, sigmaLatDeg: 0.12 },
	{ name: 'Napa', lat: 38.2975, lng: -122.2869, weight: 0.03, sigmaLatDeg: 0.10 },
	{ name: 'Redding', lat: 40.5865, lng: -122.3917, weight: 0.03, sigmaLatDeg: 0.18 },
	{ name: 'Eureka', lat: 40.8021, lng: -124.1637, weight: 0.02, sigmaLatDeg: 0.18 },
	{ name: 'Palm Springs', lat: 33.8303, lng: -116.5453, weight: 0.02, sigmaLatDeg: 0.12 },
	// Vegas is visible in the landing map view; sprinkle a small slice there too.
	{ name: 'Las Vegas', lat: 36.1699, lng: -115.1398, weight: 0.10, state: 'NV', sigmaLatDeg: 0.14 },
];

const pickWeighted = <T,>(items: Array<{ weight: number; value: T }>, rng: () => number): T => {
	const total = items.reduce((sum, i) => sum + i.weight, 0);
	const r = rng() * total;
	let acc = 0;
	for (const item of items) {
		acc += item.weight;
		if (r <= acc) return item.value;
	}
	return items[items.length - 1]!.value;
};

const CATEGORY_WEIGHTS: Array<{ category: DemoCategory; weight: number }> = [
	{ category: 'Restaurants', weight: 0.30 },
	{ category: 'Coffee Shops', weight: 0.20 },
	{ category: 'Music Venues', weight: 0.14 },
	{ category: 'Wineries', weight: 0.08 },
	{ category: 'Breweries', weight: 0.06 },
	{ category: 'Distilleries', weight: 0.04 },
	{ category: 'Cideries', weight: 0.03 },
	{ category: 'Wedding Planners', weight: 0.07 },
	{ category: 'Wedding Venues', weight: 0.05 },
	{ category: 'Music Festivals', weight: 0.03 },
];

const CATEGORY_FILL_COLOR: Record<DemoCategory, string> = {
	Restaurants: '#1EA300',
	'Coffee Shops': '#8BD003',
	'Music Venues': '#00CBFB',
	'Music Festivals': '#2D27DC',
	'Wedding Planners': '#D6990A',
	'Wedding Venues': '#D6990A',
	Wineries: '#981AEC',
	Breweries: '#981AEC',
	Distilleries: '#981AEC',
	Cideries: '#981AEC',
};

type Bounds = { north: number; south: number; west: number; east: number };
const isPointInBounds = (lng: number, lat: number, b: Bounds): boolean =>
	lat <= b.north && lat >= b.south && lng >= b.west && lng <= b.east;

// Quick demo-only exclusions: avoid dropping fake businesses deep inside major National Parks/Preserves.
// These are intentionally rough (bbox-only) and tuned to avoid excluding nearby metros.
const CA_PROTECTED_AREA_EXCLUSION_BOUNDS: Array<{
	name: string;
	kind: 'National Park' | 'National Preserve';
	bounds: Bounds;
}> = [
	{
		name: 'Death Valley',
		kind: 'National Park',
		bounds: { south: 35.7, north: 37.55, west: -117.7, east: -115.0 },
	},
	{
		name: 'Mojave',
		kind: 'National Preserve',
		bounds: { south: 34.8, north: 35.75, west: -116.6, east: -114.7 },
	},
	{
		name: 'Joshua Tree',
		kind: 'National Park',
		// Keep Coachella Valley (Palm Springs / Indio) out of the exclusion.
		bounds: { south: 33.9, north: 34.45, west: -116.45, east: -115.2 },
	},
	{
		name: 'Yosemite',
		kind: 'National Park',
		bounds: { south: 37.4, north: 38.25, west: -120.35, east: -119.15 },
	},
	{
		name: 'Sequoia',
		kind: 'National Park',
		bounds: { south: 36.2, north: 36.95, west: -118.95, east: -118.15 },
	},
	{
		name: 'Kings Canyon',
		kind: 'National Park',
		bounds: { south: 36.6, north: 37.45, west: -119.25, east: -118.1 },
	},
	{
		name: 'Lassen Volcanic',
		kind: 'National Park',
		bounds: { south: 40.25, north: 40.75, west: -121.85, east: -121.1 },
	},
	{
		name: 'Redwood',
		kind: 'National Park',
		bounds: { south: 41.1, north: 41.95, west: -124.45, east: -123.65 },
	},
	{
		name: 'Pinnacles',
		kind: 'National Park',
		bounds: { south: 36.25, north: 36.75, west: -121.45, east: -120.95 },
	},
	{
		name: 'Channel Islands',
		kind: 'National Park',
		bounds: { south: 33.9, north: 34.25, west: -120.65, east: -119.2 },
	},
];

const isInProtectedAreaCa = (lng: number, lat: number): boolean =>
	CA_PROTECTED_AREA_EXCLUSION_BOUNDS.some((a) => isPointInBounds(lng, lat, a.bounds));

type LatLngPoint = { lat: number; lng: number };
type MajorCorridor = {
	name: string;
	weight: number;
	sigmaLatDeg: number;
	points: LatLngPoint[];
};

// Road-density "cheat code": put a good slice of markers near major highway corridors.
const MAJOR_CA_CORRIDORS: MajorCorridor[] = [
	{
		name: 'I-5',
		weight: 0.26,
		sigmaLatDeg: 0.10,
		points: [
			{ lat: 32.7157, lng: -117.1611 }, // San Diego
			{ lat: 34.0522, lng: -118.2437 }, // Los Angeles
			{ lat: 35.3733, lng: -119.0187 }, // Bakersfield
			{ lat: 36.7378, lng: -119.7871 }, // Fresno
			{ lat: 38.5816, lng: -121.4944 }, // Sacramento
			{ lat: 40.5865, lng: -122.3917 }, // Redding
		],
	},
	{
		name: 'US-101',
		weight: 0.22,
		sigmaLatDeg: 0.10,
		points: [
			{ lat: 34.0522, lng: -118.2437 }, // Los Angeles
			{ lat: 34.2746, lng: -119.229 }, // Ventura
			{ lat: 34.4208, lng: -119.6982 }, // Santa Barbara
			{ lat: 35.2828, lng: -120.6596 }, // San Luis Obispo
			{ lat: 36.6002, lng: -121.8947 }, // Monterey
			{ lat: 37.3382, lng: -121.8863 }, // San Jose
			{ lat: 37.7749, lng: -122.4194 }, // San Francisco
			{ lat: 38.4405, lng: -122.7144 }, // Santa Rosa
			{ lat: 40.8021, lng: -124.1637 }, // Eureka
		],
	},
	{
		name: 'CA-99',
		weight: 0.14,
		sigmaLatDeg: 0.10,
		points: [
			{ lat: 35.3733, lng: -119.0187 }, // Bakersfield
			{ lat: 36.7378, lng: -119.7871 }, // Fresno
			{ lat: 37.9577, lng: -121.2908 }, // Stockton
			{ lat: 38.5816, lng: -121.4944 }, // Sacramento
		],
	},
	{
		name: 'I-10',
		weight: 0.12,
		sigmaLatDeg: 0.09,
		points: [
			{ lat: 34.0522, lng: -118.2437 }, // Los Angeles
			{ lat: 33.8303, lng: -116.5453 }, // Palm Springs
			{ lat: 33.7206, lng: -116.2156 }, // Indio
			{ lat: 33.6103, lng: -114.5969 }, // Blythe
		],
	},
	{
		name: 'I-80',
		weight: 0.10,
		sigmaLatDeg: 0.08,
		points: [
			{ lat: 37.7749, lng: -122.4194 }, // San Francisco
			{ lat: 37.8044, lng: -122.2712 }, // Oakland
			{ lat: 38.5816, lng: -121.4944 }, // Sacramento
			{ lat: 39.3279, lng: -120.1833 }, // Truckee
		],
	},
	{
		name: 'I-15 (CA)',
		weight: 0.16,
		sigmaLatDeg: 0.09,
		points: [
			{ lat: 34.1083, lng: -117.2898 }, // San Bernardino
			{ lat: 34.5361, lng: -117.2912 }, // Victorville
			{ lat: 34.8958, lng: -117.0173 }, // Barstow
			{ lat: 35.2653, lng: -116.0739 }, // Baker
		],
	},
];

const distanceSqPointToSegmentDeg = (
	lng: number,
	lat: number,
	a: LatLngPoint,
	b: LatLngPoint
): number => {
	const midLatRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
	const cos = Math.max(0.25, Math.cos(midLatRad));
	const ax = a.lng * cos;
	const ay = a.lat;
	const bx = b.lng * cos;
	const by = b.lat;
	const px = lng * cos;
	const py = lat;

	const abx = bx - ax;
	const aby = by - ay;
	const apx = px - ax;
	const apy = py - ay;
	const abLenSq = abx * abx + aby * aby;
	const t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
	const tt = clamp(t, 0, 1);
	const cx = ax + tt * abx;
	const cy = ay + tt * aby;
	const dx = px - cx;
	const dy = py - cy;
	return dx * dx + dy * dy;
};

const minDistanceSqToCorridorsDeg = (lng: number, lat: number): number => {
	let best = Infinity;
	for (const corridor of MAJOR_CA_CORRIDORS) {
		for (let i = 0; i < corridor.points.length - 1; i++) {
			const a = corridor.points[i]!;
			const b = corridor.points[i + 1]!;
			best = Math.min(best, distanceSqPointToSegmentDeg(lng, lat, a, b));
		}
	}
	return best;
};

const samplePointOnPolyline = (points: LatLngPoint[], rng: () => number): LatLngPoint => {
	// Choose a segment proportional to its length (in degree-ish units).
	let total = 0;
	const segLengths: number[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const a = points[i]!;
		const b = points[i + 1]!;
		const midLatRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
		const cos = Math.max(0.25, Math.cos(midLatRad));
		const dLat = b.lat - a.lat;
		const dLng = (b.lng - a.lng) * cos;
		const len = Math.sqrt(dLat * dLat + dLng * dLng);
		segLengths.push(len);
		total += len;
	}
	const r = rng() * (total || 1);
	let acc = 0;
	let segIdx = 0;
	for (let i = 0; i < segLengths.length; i++) {
		acc += segLengths[i]!;
		if (r <= acc) {
			segIdx = i;
			break;
		}
	}
	const a = points[segIdx]!;
	const b = points[segIdx + 1] ?? a;
	const t = rng();
	return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
};

const generateDemoMarkersInCalifornia = (
	preparedCa: PreparedPolygon[],
	preparedNv: PreparedPolygon[] = [],
	seed = 1337
): DemoMarker[] => {
	const rng = mulberry32(seed);
	const cityWeighted = CITY_CLUSTERS.map((c) => ({ weight: c.weight, value: c }));
	const corridorWeighted = MAJOR_CA_CORRIDORS.map((c) => ({ weight: c.weight, value: c }));
	const categoryWeighted = CATEGORY_WEIGHTS.map((c) => ({ weight: c.weight, value: c.category }));

	const markers: DemoMarker[] = [];
	const maxAttempts = 80_000;
	let attempts = 0;

	const tightCityProbability = 0.22;
	const wideCityProbability = 0.23; // cumulative 0.45
	const corridorProbability = 0.45; // cumulative 0.90
	const wideSigmaMultiplier = 3.0;
	const maxBackgroundDistanceToCorridorDeg = 0.22; 
	const maxBackgroundDistanceToCorridorSq = maxBackgroundDistanceToCorridorDeg ** 2;

	while (markers.length < LANDING_DEMO_MARKER_COUNT && attempts < maxAttempts) {
		attempts++;
		const category = pickWeighted(categoryWeighted, rng);
		let lng: number;
		let lat: number;
		let allowedPolygons: PreparedPolygon[] = preparedCa;
		let allowedState: 'CA' | 'NV' = 'CA';
		let mode: 'city' | 'corridor' | 'background' = 'background';

		const modeRoll = rng();
		if (modeRoll < tightCityProbability + wideCityProbability) {
			mode = 'city';
			const isWide = modeRoll >= tightCityProbability;
			const cluster = pickWeighted(cityWeighted, rng);
			allowedState = cluster.state === 'NV' ? 'NV' : 'CA';
			allowedPolygons = allowedState === 'NV' ? preparedNv : preparedCa;
			const n1 = randNormal(rng);
			const n2 = randNormal(rng);
			const latRad = (cluster.lat * Math.PI) / 180;
			const lngScale = Math.max(0.25, Math.cos(latRad));
			// Slightly wider longitude spread to mimic metro sprawl.
			const sigmaLat = cluster.sigmaLatDeg * (isWide ? wideSigmaMultiplier : 1);
			const sigmaLng = (sigmaLat * 1.25) / lngScale;
			lat = cluster.lat + n1 * sigmaLat;
			lng = cluster.lng + n2 * sigmaLng;
		} else if (modeRoll < tightCityProbability + wideCityProbability + corridorProbability) {
			mode = 'corridor';
			const corridor = pickWeighted(corridorWeighted, rng);
			const base = samplePointOnPolyline(corridor.points, rng);
			const n1 = randNormal(rng);
			const n2 = randNormal(rng);
			const latRad = (base.lat * Math.PI) / 180;
			const lngScale = Math.max(0.25, Math.cos(latRad));
			const sigmaLat = corridor.sigmaLatDeg;
			const sigmaLng = (sigmaLat * 1.35) / lngScale;
			lat = base.lat + n1 * sigmaLat;
			lng = base.lng + n2 * sigmaLng;
		} else {
			// Background: uniform inside the CA bounding rectangle, then rejected if outside polygon
			// and if it's too far from major corridors (proxy for road density).
			lat = CALIFORNIA_PAN_BOUNDS.south + rng() * (CALIFORNIA_PAN_BOUNDS.north - CALIFORNIA_PAN_BOUNDS.south);
			lng = CALIFORNIA_PAN_BOUNDS.west + rng() * (CALIFORNIA_PAN_BOUNDS.east - CALIFORNIA_PAN_BOUNDS.west);
			allowedPolygons = preparedCa; // keep background distribution in CA (avoid random NV scatter)
		}

		// Keep inside world bounds just in case.
		lat = clamp(lat, -90, 90);
		lng = clamp(lng, -180, 180);

		// Hard filter: inside allowed state polygon => not in the ocean.
		if (!isPointInPreparedPolygons(lng, lat, allowedPolygons)) continue;

		// Avoid major protected areas for CA demo markers.
		if (allowedState === 'CA' && isInProtectedAreaCa(lng, lat)) continue;

		// For background points, require proximity to major corridors (road-density proxy).
		if (allowedState === 'CA' && mode === 'background') {
			if (minDistanceSqToCorridorsDeg(lng, lat) > maxBackgroundDistanceToCorridorSq) continue;
		}

		markers.push({
			id: 100_000 + markers.length + 1,
			lat,
			lng,
			category,
		});
	}

	return markers;
};

export function LandingPageGoogleMapBackground({ className, onReady }: Props) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

	const { isLoaded, loadError } = useJsApiLoader({
		id: 'google-maps-loader',
		googleMapsApiKey: apiKey,
	});

	const [preparedCalifornia, setPreparedCalifornia] = useState<PreparedPolygon[] | null>(null);
	const [preparedNevada, setPreparedNevada] = useState<PreparedPolygon[] | null>(null);
	const [demoMarkers, setDemoMarkers] = useState<DemoMarker[]>([]);

	// Load CA + NV polygons once so we can keep markers off the ocean.
	useEffect(() => {
		let cancelled = false;
		const loadPolygons = async () => {
			try {
				const res = await fetch('/geo/us-states.geojson');
				if (!res.ok) return;
				const json = (await res.json()) as GeoJsonFeatureCollection;

				const getFeatureByName = (targetLower: string) =>
					json.features.find((f) => {
						const name = (f.properties?.name ?? f.properties?.NAME ?? '') as string;
						return String(name).trim().toLowerCase() === targetLower;
					});

				const prepareFeature = (
					feature: GeoJsonFeatureCollection['features'][number]
				): PreparedPolygon[] => {
					const geom = feature.geometry;
					const multiPolygon: GeoJsonMultiPolygon =
						geom.type === 'Polygon'
							? [(geom.coordinates as number[][][]).map((ring) => ring as GeoJsonRing)]
							: (geom.coordinates as number[][][][]).map((poly) => poly as GeoJsonPolygon);

					return multiPolygon
						.map((rings) => {
							const outer = rings[0] ?? [];
							if (outer.length < 3) return null;
							return { rings, bbox: bboxFromRing(outer) } as PreparedPolygon;
						})
						.filter((x): x is PreparedPolygon => Boolean(x));
				};

				const caFeature = getFeatureByName('california');
				const nvFeature = getFeatureByName('nevada');
				if (!caFeature) return;

				const preparedCa = prepareFeature(caFeature);
				const preparedNv = nvFeature ? prepareFeature(nvFeature) : [];

				if (cancelled) return;
				setPreparedCalifornia(preparedCa.length ? preparedCa : null);
				setPreparedNevada(preparedNv.length ? preparedNv : null);
			} catch {
				// Silent: landing page should still render without demo pins if geo fails.
			}
		};
		void loadPolygons();
		return () => {
			cancelled = true;
		};
	}, []);

	// Generate the demo markers once CA polygon is ready.
	useEffect(() => {
		if (!preparedCalifornia) return;
		const markers = generateDemoMarkersInCalifornia(preparedCalifornia, preparedNevada ?? [], 1337);
		setDemoMarkers(markers);
	}, [preparedCalifornia, preparedNevada]);

	const markerSizing = useMemo(() => {
		const scale = LANDING_DEMO_MARKER_WIDTH_PX / MAP_MARKER_PIN_VIEWBOX_WIDTH;
		const width = LANDING_DEMO_MARKER_WIDTH_PX;
		const height = Math.round(MAP_MARKER_PIN_VIEWBOX_HEIGHT * scale);
		const anchorX = MAP_MARKER_PIN_CIRCLE_CENTER_X * scale;
		const anchorY = MAP_MARKER_PIN_CIRCLE_CENTER_Y * scale;
		return { width, height, anchorX, anchorY };
	}, []);

	const markerIconByCategory = useMemo(() => {
		// `google` may not be available yet if the Maps API hasn't loaded.
		if (!isLoaded) return new Map<DemoCategory, google.maps.Icon>();
		const map = new Map<DemoCategory, google.maps.Icon>();
		for (const key of Object.keys(CATEGORY_FILL_COLOR) as DemoCategory[]) {
			const fill = CATEGORY_FILL_COLOR[key];
			const url = generateMapMarkerPinIconUrl(fill, '#FFFFFF', key, '#FFFFFF');
			map.set(key, {
				url,
				scaledSize: new google.maps.Size(markerSizing.width, markerSizing.height),
				anchor: new google.maps.Point(markerSizing.anchorX, markerSizing.anchorY),
			});
		}
		return map;
	}, [markerSizing, isLoaded]);

	if (!apiKey || loadError || !isLoaded) return null;

	const containerClassName = className ?? 'w-full h-full';

	return (
		<div className={`relative ${containerClassName}`}>
			{/* Map frame (rounded corners + black stroke) */}
			<div className="absolute inset-0 rounded-[8px] overflow-hidden">
				<GoogleMap
					mapContainerClassName="w-full h-full"
					center={DEFAULT_CENTER}
					zoom={DEFAULT_ZOOM}
					onLoad={() => onReady?.()}
					options={{
						disableDefaultUI: true,
						clickableIcons: false,
						// Allow pan via drag, but keep page scroll-friendly.
						gestureHandling: 'cooperative',
						keyboardShortcuts: false,
						draggable: true,
						scrollwheel: false,
						disableDoubleClickZoom: true,
						// Lock the zoom level so users can't zoom in/out.
						minZoom: DEFAULT_ZOOM,
						maxZoom: DEFAULT_ZOOM,
						// Limit how far the map can be panned.
						restriction: {
							latLngBounds: CALIFORNIA_PAN_BOUNDS,
							strictBounds: true,
						},
						zoomControl: false,
						fullscreenControl: false,
						streetViewControl: false,
						mapTypeControl: false,
					}}
				>
					{demoMarkers.map((m) => (
						<MarkerF
							key={m.id}
							position={{ lat: m.lat, lng: m.lng }}
							icon={markerIconByCategory.get(m.category)}
							clickable={false}
							// Keep overlap ordering stable to avoid “surfacing/under” flicker.
							zIndex={m.id}
						/>
					))}
				</GoogleMap>
			</div>

			<div className="pointer-events-none absolute inset-0 rounded-[8px] border-[3px] border-[#000000] z-[20]" />

			{/* Landing map overlay: dashboard "mini" (map view) segmented search bar */}
			<div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
				<div className="pointer-events-auto relative">
					{/* Keep the search bar centered; position the tray to its left (desktop only). */}
					<div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-full mr-[43px]">
						<LandingPageMapSearchTray />
					</div>
					<LandingPageMapMiniSearchBar
						initialWhy="[Booking]"
						initialWhat="Music Venues"
						initialWhere="California"
					/>
					{/* Dashboard map-view tools (Select / Grab / Home) to the right of the search bar (desktop only). */}
					<div className="hidden lg:block">
						<LandingPageMapSearchTools />
					</div>
				</div>
			</div>

			{/* Landing page overlay: map results side panel (right side). */}
			<LandingPageMapResultsSidePanel contacts={LANDING_DEMO_PANEL_CONTACTS} />
		</div>
	);
}

