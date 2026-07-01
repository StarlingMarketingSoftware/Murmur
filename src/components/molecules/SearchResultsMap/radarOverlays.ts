import { mixCssColorString } from './color';
import { CAMPAIGN_FOOTPRINT_COLOR, CAMPAIGN_FOOTPRINT_SPARK_COLOR } from './constants';
import { buildMercatorCircleMultiPolygon, mercatorMultiPolygonToLngLat } from './curatedBlob';
import { clamp, lerp, smoothstep } from './math';
import type { LatLngLiteral } from './types';
import { mapStackStarIconSvg } from '@/components/atoms/_svg/MapStackStarIcon';
import { venueHomeIconSvg } from '@/components/atoms/_svg/VenueHomeIcon';

export type OwnedVenueLocation = LatLngLiteral & { name?: string | null };


export const OWNED_VENUE_HOME_ICON_IMAGE_NAME = 'murmur-owned-venue-home-icon-image';

export const OWNED_VENUE_HOME_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	venueHomeIconSvg
)}`;

export const OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS = { width: 72, height: 63 } as const;

export const OWNED_VENUE_RING_STEPS = 160;

export const OWNED_VENUE_RADAR_MS = 3400;

// Radius placement preview: convert the draft miles to km and how many segments to
// draw the tracking circle with (smooth without being heavy on every mousemove).
export const KM_PER_MILE = 1.609344;

export const RADIUS_PLACEMENT_PREVIEW_STEPS = 128;

// Radar sweeps animate via 3 GeoJSON setData calls per frame (reparse +
// re-tessellation + forced repaint); 30fps over a 3.4s period is ~113 steps —
// visually identical to 60fps at half the cost.
export const RADAR_FRAME_MS = 33;

export const OWNED_VENUE_RADAR_OUTER_TRAVEL_KM = 10;

export const OWNED_VENUE_RADAR_IDLE_COLOR = 'rgb(255, 255, 255)';

export const OWNED_VENUE_GLOW_IDLE_COLOR = 'rgb(169, 231, 255)';

export const OWNED_VENUE_GLOW_ACTIVE_COLOR = 'rgb(96, 207, 255)';

export const OWNED_VENUE_GLOW_CIRCLES = [
	{ radiusKm: 340, opacity: 0.03 },
	{ radiusKm: 240, opacity: 0.05 },
	{ radiusKm: 150, opacity: 0.075 },
	{ radiusKm: 82, opacity: 0.12 },
] as const;

export const OWNED_VENUE_RING_CIRCLES = [
	{ radiusKm: 26, opacity: 0.86, width: 2.35 },
	{ radiusKm: 35, opacity: 0.82, width: 2.25 },
	{ radiusKm: 45, opacity: 0.76, width: 2.12 },
	{ radiusKm: 58, opacity: 0.69, width: 1.96 },
	{ radiusKm: 74, opacity: 0.61, width: 1.78 },
	{ radiusKm: 93, opacity: 0.52, width: 1.58 },
	{ radiusKm: 116, opacity: 0.43, width: 1.38 },
	{ radiusKm: 145, opacity: 0.35, width: 1.18 },
	{ radiusKm: 180, opacity: 0.28, width: 1 },
	{ radiusKm: 222, opacity: 0.21, width: 0.86 },
	{ radiusKm: 272, opacity: 0.15, width: 0.72 },
] as const;


export const isValidOwnedVenueLocation = (
	location: OwnedVenueLocation | null | undefined
): location is OwnedVenueLocation =>
	Boolean(
		location &&
		Number.isFinite(location.lat) &&
		Number.isFinite(location.lng) &&
		location.lat >= -90 &&
		location.lat <= 90 &&
		location.lng >= -180 &&
		location.lng <= 180
	);


export const buildOwnedVenueCircleRing = (
	center: LatLngLiteral,
	radiusKm: number
): number[][] | null => {
	const circle = buildMercatorCircleMultiPolygon(
		center,
		radiusKm,
		OWNED_VENUE_RING_STEPS,
		0,
		0
	);
	if (!circle) return null;
	return mercatorMultiPolygonToLngLat(circle)[0]?.[0] ?? null;
};


export const buildOwnedVenueGlowFeatures = (
	center: LatLngLiteral,
	radarPhase = 0,
	animated = false
) =>
	OWNED_VENUE_GLOW_CIRCLES.flatMap((circle, index) => {
		const lastGlowIndex = OWNED_VENUE_GLOW_CIRCLES.length - 1;
		const glowPhase = (radarPhase - index * 0.09 + 1) % 1;
		const rawLift = animated
			? smoothstep(0.12, 0.34, glowPhase) * (1 - smoothstep(0.66, 0.98, glowPhase))
			: 0;
		const falloff = lastGlowIndex > 0 ? 1 - (index / lastGlowIndex) * 0.65 : 1;
		const lift = rawLift * falloff;
		const ring = buildOwnedVenueCircleRing(center, circle.radiusKm + lift * 3.5);
		if (!ring) return [];

		return [
			{
				type: 'Feature' as const,
				id: `owned-venue-glow-${index}`,
				properties: {
					color: mixCssColorString(
						OWNED_VENUE_GLOW_IDLE_COLOR,
						OWNED_VENUE_GLOW_ACTIVE_COLOR,
						lift * 0.35
					),
					opacity: circle.opacity * (1 + lift * 0.28),
					sort: OWNED_VENUE_GLOW_CIRCLES.length - index,
				},
				geometry: { type: 'Polygon' as const, coordinates: [ring] },
			},
		];
	});


export const buildOwnedVenueRadarLineFeatures = (
	center: LatLngLiteral,
	radarPhase = 0,
	{
		animated = false,
		bloom = false,
	}: {
		animated?: boolean;
		bloom?: boolean;
	} = {}
) => {
	const lastRingIndex = OWNED_VENUE_RING_CIRCLES.length - 1;

	return OWNED_VENUE_RING_CIRCLES.flatMap((circle, index) => {
		const nextCircle = OWNED_VENUE_RING_CIRCLES[index + 1];
		const outerT = lastRingIndex > 0 ? index / lastRingIndex : 0;
		const ringPhase = (radarPhase - index * 0.066 + 1) % 1;
		const rawPulse = animated
			? smoothstep(0.04, 0.22, ringPhase) * (1 - smoothstep(0.52, 0.98, ringPhase))
			: 0;
		const pulse = Math.pow(rawPulse, 1.45);
		const eased = animated ? smoothstep(0, 1, ringPhase) : 0;
		const travelKm = nextCircle
			? (nextCircle.radiusKm - circle.radiusKm) * 0.28
			: OWNED_VENUE_RADAR_OUTER_TRAVEL_KM;
		const ring = buildOwnedVenueCircleRing(center, circle.radiusKm + travelKm * eased);
		if (!ring) return [];

		const edgeFade = lastRingIndex > 0 ? lerp(1, 0.84, outerT) : 1;
		const outerFade = 1 - smoothstep(0.78, 1, outerT) * 0.7;
		const centerWeight = lastRingIndex > 0 ? 1 - smoothstep(0.25, 0.9, outerT) : 1;
		if (bloom && centerWeight <= 0) return [];

		const color = bloom
			? mixCssColorString(
					OWNED_VENUE_RADAR_IDLE_COLOR,
					OWNED_VENUE_GLOW_ACTIVE_COLOR,
					0.18 + pulse * 0.22
				)
			: OWNED_VENUE_RADAR_IDLE_COLOR;
		const opacity = bloom
			? clamp(circle.opacity * edgeFade * centerWeight * (0.012 + pulse * 0.065), 0, 0.11)
			: clamp(circle.opacity * edgeFade * outerFade * (0.24 + pulse * 0.2), 0, 0.66);
		const width = bloom
			? circle.width * (1.35 + pulse * 1.1)
			: circle.width * (0.94 + pulse * 0.12);

		return [
			{
				type: 'Feature' as const,
				id: bloom ? `owned-venue-bloom-${index}` : `owned-venue-ring-${index}`,
				properties: bloom ? { color, opacity, width } : { opacity, width },
				geometry: { type: 'LineString' as const, coordinates: ring },
			},
		];
	});
};


export const emptyFeatureCollection = (): GeoJSON.FeatureCollection => ({
	type: 'FeatureCollection',
	features: [],
});


export const buildOwnedVenueMapOverlayData = (center: LatLngLiteral) => {
	return {
		glow: {
			type: 'FeatureCollection' as const,
			features: buildOwnedVenueGlowFeatures(center),
		},
		rings: {
			type: 'FeatureCollection' as const,
			features: buildOwnedVenueRadarLineFeatures(center),
		},
		icon: {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					id: 'owned-venue-icon',
					properties: {},
					geometry: {
						type: 'Point' as const,
						coordinates: [center.lng, center.lat],
					},
				},
			],
		},
	};
};


// A venue-posted event to render on the shared map as a radar opportunity marker.
export type MapEvent = LatLngLiteral & { id: number; name?: string | null };


export const EVENT_STAR_ICON_IMAGE_NAME = 'murmur-event-star-icon-image';

export const EVENT_STAR_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	mapStackStarIconSvg
)}`;

export const EVENT_STAR_ICON_IMAGE_DIMENSIONS = { width: 54, height: 54 } as const;

export const CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME =
	'murmur-campaign-footprint-spark-icon-image';

export const CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS = { width: 32, height: 32 } as const;

export const CAMPAIGN_FOOTPRINT_SPARK_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
	<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x="7" y="7" width="18" height="18" rx="3.2" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" opacity="0.16"/>
		<rect x="9" y="9" width="14" height="14" rx="2.6" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" opacity="0.4"/>
		<rect x="10.75" y="10.75" width="10.5" height="10.5" rx="2" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" stroke="${CAMPAIGN_FOOTPRINT_COLOR}" stroke-width="0.7"/>
	</svg>
`)}`;


// Event opportunity popup (phase 1: shapes + lat/lng only). Outer red box, inner white
// box inset 5px from the top, and a bottom red strip showing the event coordinates.
// The card is authored at its natural "design" size, then uniformly scaled down so it
// reads at the same compact weight as the rest of the map chrome (result rows,
// tooltips). All inner content (MapEventPopupCard) is pixel-positioned against the
// design size and scales with it, so only EVENT_POPUP_SCALE needs tuning to resize.
export const EVENT_POPUP_SCALE = 0.75;

export const EVENT_POPUP_DESIGN_W = 356;

export const EVENT_POPUP_DESIGN_H = 457;

// On-screen footprint after scaling — used by the edge-aware placement math so the
// popup is positioned and clamped against its actual rendered size.
export const EVENT_POPUP_W = Math.round(EVENT_POPUP_DESIGN_W * EVENT_POPUP_SCALE);

export const EVENT_POPUP_H = Math.round(EVENT_POPUP_DESIGN_H * EVENT_POPUP_SCALE);

// Gap between the star marker and the popup edge, plus an approximate half-extent of the
// star glyph on screen (icon-size tops out ~0.66 × 54px ≈ 36px → ~14px half-extent at
// typical zoom). Used by the edge-aware placement math.
export const EVENT_POPUP_GAP = 14;

export const EVENT_POPUP_STAR_HALF = 14;

// Grace period before a hover-opened popup closes after the pointer leaves the star.
// Bridges the star→box gap so the cursor can travel into the (interactive) popup and
// hover/click it, instead of the popup vanishing the instant the star is no longer hit.
export const EVENT_POPUP_HOVER_CLOSE_DELAY_MS = 90;


// The opportunity markers reuse the owned-venue radar builders per event center,
// re-keying each feature id so features from different events never collide inside a
// shared source. This keeps the motion identical to the venue-portal radar.
export const buildEventsGlowFeatures = (events: MapEvent[], radarPhase = 0, animated = false) =>
	events.flatMap((event) =>
		buildOwnedVenueGlowFeatures(event, radarPhase, animated).map((feature) => ({
			...feature,
			id: `event-${event.id}-${feature.id}`,
		}))
	);


export const buildEventsRadarLineFeatures = (
	events: MapEvent[],
	radarPhase = 0,
	opts: { animated?: boolean; bloom?: boolean } = {}
) =>
	events.flatMap((event) =>
		buildOwnedVenueRadarLineFeatures(event, radarPhase, opts).map((feature) => ({
			...feature,
			id: `event-${event.id}-${feature.id}`,
		}))
	);


export const buildEventsIconFeatures = (events: MapEvent[]) =>
	events.map((event) => ({
		type: 'Feature' as const,
		id: `event-${event.id}-icon`,
		properties: { eventId: event.id },
		geometry: {
			type: 'Point' as const,
			coordinates: [event.lng, event.lat],
		},
	}));


export const buildEventsMapOverlayData = (events: MapEvent[]) => ({
	glow: {
		type: 'FeatureCollection' as const,
		features: buildEventsGlowFeatures(events),
	},
	rings: {
		type: 'FeatureCollection' as const,
		features: buildEventsRadarLineFeatures(events),
	},
	icon: {
		type: 'FeatureCollection' as const,
		features: buildEventsIconFeatures(events),
	},
});
