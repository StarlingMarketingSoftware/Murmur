'use client';

import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, OverlayView } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import {
	generateMapTooltipIconUrl,
	calculateTooltipWidth,
	MAP_TOOLTIP_HEIGHT,
	MAP_TOOLTIP_ANCHOR_X,
	MAP_TOOLTIP_ANCHOR_Y,
} from '@/components/atoms/_svg/MapTooltipIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

type LatLngLiteral = { lat: number; lng: number };

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

const linearRingToClippingRing = (linearRing: google.maps.Data.LinearRing): ClippingRing => {
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
			trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed;
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

// Calculate background dot count based on viewport area to maintain consistent visual density.
// This ensures dots don't become denser when zooming in.
const BACKGROUND_DOTS_DENSITY = 0.55; // dots per square degree at baseline
const BACKGROUND_DOTS_MIN = 8;
const BACKGROUND_DOTS_MAX = 500;

const getBackgroundDotsTargetCount = (
	viewportArea: number,
	zoom: number
): number => {
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
	if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
		return null;
	}
	return { minLat, maxLat, minLng, maxLng };
};

const isLatLngInBbox = (lat: number, lng: number, bbox: BoundingBox): boolean =>
	lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;

const pointInRing = (point: ClippingCoord, ring: ClippingRing): boolean => {
	const [x, y] = point;
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			(yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

const pointInClippingPolygon = (point: ClippingCoord, polygon: ClippingPolygon): boolean => {
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

const pointInMultiPolygon = (point: ClippingCoord, multiPolygon: ClippingMultiPolygon): boolean => {
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
	onMarkerClick?: (contact: ContactWithName) => void;
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

const mapOptions: google.maps.MapOptions = {
	disableDefaultUI: false,
	zoomControl: true,
	streetViewControl: false,
	mapTypeControl: false,
	fullscreenControl: false,
	gestureHandling: 'greedy',
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

const normalizeStateKey = (state?: string | null): string | null => {
	if (!state) return null;
	const abbr = getStateAbbreviation(state);
	if (abbr) return abbr;
	return state.trim().toUpperCase();
};

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	onMarkerClick,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
	isLoading,
}) => {
	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(4); // Default zoom level
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const stateLayerRef = useRef<google.maps.Data | null>(null);
	const resultsOutlinePolygonsRef = useRef<google.maps.Polygon[]>([]);
	const searchedStateOutlinePolygonsRef = useRef<google.maps.Polygon[]>([]);
	const resultsSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const resultsSelectionBboxRef = useRef<BoundingBox | null>(null);
	const resultsSelectionSignatureRef = useRef<string>('');
	const backgroundDotsLayerRef = useRef<google.maps.Data | null>(null);
	const lastBackgroundDotsKeyRef = useRef<string>('');
	const usStatesPolygonsRef = useRef<PreparedClippingPolygon[] | null>(null);
	const selectedStateKeyRef = useRef<string | null>(null);
	const onStateSelectRef = useRef<SearchResultsMapProps['onStateSelect'] | null>(null);
	const [isStateLayerReady, setIsStateLayerReady] = useState(false);

	useEffect(() => {
		selectedStateKeyRef.current = selectedStateKey;
	}, [selectedStateKey]);

	useEffect(() => {
		onStateSelectRef.current = onStateSelect ?? null;
	}, [onStateSelect]);

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

	const resultStateKeysSignature = useMemo(() => resultStateKeys.join('|'), [resultStateKeys]);

	useEffect(() => {
		resultsSelectionSignatureRef.current = resultStateKeysSignature;
	}, [resultStateKeysSignature]);

	// Helper to get coordinates for a contact (stable + already-parsed)
	const getContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null => coordsByContactId.get(contact.id) ?? null,
		[coordsByContactId]
	);

	const updateBackgroundDots = useCallback((mapInstance: google.maps.Map | null) => {
		if (!mapInstance) return;
		const layer = backgroundDotsLayerRef.current;
		if (!layer) return;
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
		const viewportKey = `${zoom}|${qSouth}|${qWest}|${qNorth}|${qEast}|${selectionSig}`;
		if (viewportKey === lastBackgroundDotsKeyRef.current) return;
		lastBackgroundDotsKeyRef.current = viewportKey;

		// Clear existing dot features.
		layer.forEach((feature) => layer.remove(feature));

		// Calculate viewport area in square degrees for density-based dot count
		const latSpan = north - south;
		const lngSpan = east - west;
		const viewportArea = latSpan * lngSpan;

		const targetCount = getBackgroundDotsTargetCount(viewportArea, zoom);

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
	}, []);

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

	// Trigger background dots update when US state polygons become available
	useEffect(() => {
		if (!map || !isStateLayerReady) return;
		updateBackgroundDots(map);
	}, [map, isStateLayerReady, updateBackgroundDots]);

	useEffect(() => {
		if (!map) return;
		const listener = map.addListener('idle', () => updateBackgroundDots(map));
		// Initial fill
		updateBackgroundDots(map);
		return () => {
			listener.remove();
		};
	}, [map, updateBackgroundDots]);

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
				console.error('Failed to build state outline union; falling back to per-state outline', err);
			}

			if (cancelled) return;

			// Clear the previous outline polygons
			clearResultsOutline();

			const multiPolygonsToRender: ClippingMultiPolygon =
				unioned && Array.isArray(unioned) && unioned.length
					? unioned
					: stateMultiPolygons.flat();

			const polygonsToDraw = createOutlinePolygonsFromMultiPolygon(multiPolygonsToRender, {
				strokeColor: '#6B7280',
				strokeOpacity: 1,
				strokeWeight: 2,
				zIndex: 1,
			});

			for (const polygon of polygonsToDraw) polygon.setMap(map);
			resultsOutlinePolygonsRef.current = polygonsToDraw;

			// Store the selected region (used to exclude background dots inside the outline).
			resultsSelectionMultiPolygonRef.current = multiPolygonsToRender;
			resultsSelectionBboxRef.current = bboxFromMultiPolygon(multiPolygonsToRender);

			// Refresh background dots now that the selected region is known.
			updateBackgroundDots(map);
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
	]);

	// Draw a black outline around the searched/locked state (even when state interactions are off).
	// When state interactions are enabled, the Data layer already renders the selected state border.
	useEffect(() => {
		if (!map || !isStateLayerReady) return;

		// Clear while loading
		if (isLoading) {
			clearSearchedStateOutline();
			return;
		}

		if (enableStateInteractions) {
			clearSearchedStateOutline();
			return;
		}

		if (!lockedStateKey) {
			clearSearchedStateOutline();
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

			clearSearchedStateOutline();
			if (!found) return;

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
	const fitMapToState = useCallback(
		(mapInstance: google.maps.Map, stateKey: string) => {
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
		},
		[]
	);

	const onLoad = useCallback(
		(mapInstance: google.maps.Map) => {
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
		},
		[]
	);

	const onUnmount = useCallback(() => {
		clearResultsOutline();
		clearSearchedStateOutline();
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
			if (lockedStateKey && isStateLayerReady && (isNewSearch || isNewStateSearch || !hasFitBoundsRef.current)) {
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
	}, [map, contactsWithCoords, fitMapToBounds, fitMapToState, lockedStateKey, isStateLayerReady]);

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
		setSelectedMarker(contact);
		onMarkerClick?.(contact);
		// Toggle selection when clicking on a marker
		onToggleSelection?.(contact.id);
	};

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale 4, at zoom 14 (zoomed in): scale 12
	const markerScale = useMemo(() => {
		const minZoom = 4;
		const maxZoom = 14;
		const minScale = 4;
		const maxScale = 12;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
		const t = (clampedZoom - minZoom) / (maxZoom - minZoom);
		return minScale + t * (maxScale - minScale);
	}, [zoomLevel]);

	const strokeWeight = useMemo(() => {
		return 1.5 + (markerScale - 4) * 0.2; // Scale stroke proportionally
	}, [markerScale]);

	// Default red dot marker
	const defaultMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: '#D21E1F',
			fillOpacity: 1,
			strokeColor: '#FFFFFF',
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight]);

	// Selected green dot marker
	const selectedMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: '#0E8530',
			fillOpacity: 1,
			strokeColor: '#FFFFFF',
			strokeWeight: strokeWeight,
			scale: markerScale,
		};
	}, [isLoaded, markerScale, strokeWeight]);

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
			strokeColor: '#FFFFFF',
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

	// Generate hover tooltip icon with contact name and company
	const getHoverMarkerIcon = useCallback(
		(contact: ContactWithName) => {
			if (!isLoaded) return undefined;

			// Get name - use firstName/lastName, fall back to name field
			const name =
				`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
				contact.name ||
				'';
			const company = contact.company || '';
			const width = calculateTooltipWidth(name, company);

			return {
				url: generateMapTooltipIconUrl(name, company),
				scaledSize: new google.maps.Size(width, MAP_TOOLTIP_HEIGHT),
				anchor: new google.maps.Point(MAP_TOOLTIP_ANCHOR_X, MAP_TOOLTIP_ANCHOR_Y),
			};
		},
		[isLoaded]
	);

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
			{contactsWithCoords.map((contact) => {
				const coords = getContactCoords(contact);
				if (!coords) return null;
				const isHovered = hoveredMarkerId === contact.id;
				const isSelected = selectedContacts.includes(contact.id);
				return (
					<Fragment key={contact.id}>
						{/* Invisible larger hit area for hover detection - this controls all hover state */}
						<MarkerF
							position={coords}
							icon={invisibleHitAreaIcon}
							onMouseOver={() => setHoveredMarkerId(contact.id)}
							onMouseOut={() => setHoveredMarkerId(null)}
							onClick={() => handleMarkerClick(contact)}
							clickable={true}
							zIndex={3}
						/>
						{/* Dot marker - only when NOT hovered, green if selected, red if not */}
						{!isHovered && (
							<MarkerF
								position={coords}
								onClick={() => handleMarkerClick(contact)}
								icon={isSelected ? selectedMarkerIcon : defaultMarkerIcon}
								clickable={false}
								zIndex={1}
							/>
						)}
						{/* Hover tooltip - only when hovered */}
						{isHovered && (
							<MarkerF
								position={coords}
								onClick={() => handleMarkerClick(contact)}
								icon={getHoverMarkerIcon(contact)}
								clickable={false}
								zIndex={2}
							/>
						)}
					</Fragment>
				);
			})}

			{selectedMarker && selectedMarkerCoords && (
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
