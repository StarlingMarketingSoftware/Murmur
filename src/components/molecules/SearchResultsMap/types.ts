import { ContactWithName } from '@/types/contact';
import { MoodVisualConfig } from '@/lib/weather/moodConfig';

// ============================================================================
// Map / coordinates
// ============================================================================

export type LatLngLiteral = { lat: number; lng: number };
export type MarkerHoverMeta = { clientX: number; clientY: number };
export type GlobeSunPhase = 'night' | 'sunrise' | 'day' | 'sunset';
export type GlobeNightLightingLike = {
	nightT?: number | null;
	phase: GlobeSunPhase;
	phaseStartMs: number;
	phaseEndMs: number;
	transitionMs?: number;
	isLoading?: boolean;
};

// ============================================================================
// Geometry / clipping
// ============================================================================

export type ClippingCoord = [number, number]; // [lng, lat]
export type ClippingRing = ClippingCoord[];
export type ClippingPolygon = ClippingRing[];
export type ClippingMultiPolygon = ClippingPolygon[];

export type BoundingBox = {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
};
export type PreparedClippingPolygon = {
	polygon: ClippingPolygon;
	bbox: BoundingBox;
};

export type MapSelectionBounds = {
	south: number;
	west: number;
	north: number;
	east: number;
};
export type AreaSelectPayload = {
	/** Contact ids inside the rectangle selection (primary results + matching overlay markers). */
	contactIds: number[];
	/**
	 * Overlay contacts (not part of the primary `contacts` prop) that were selected, so the
	 * parent can render them in a side panel list.
	 */
	extraContacts: ContactWithName[];
};

// ============================================================================
// GeoJSON
// ============================================================================

export type GeoJsonGeometry =
	| {
			type: 'Polygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][];
	  }
	| {
			type: 'MultiPolygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][][];
	  };

export type GeoJsonFeatureCollection = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		id?: string | number;
		properties?: Record<string, unknown>;
		geometry: GeoJsonGeometry;
	}>;
};

export type OutlinePolygonFeatureCollection = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		properties: Record<string, unknown>;
		geometry: {
			type: 'Polygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][];
		};
	}>;
};

// ============================================================================
// Storm / lightning
// ============================================================================

export type StormLightningPulse = {
	offsetMs: number;
	peakOpacity: number;
	rampUpMs: number;
	holdMs: number;
	rampDownMs: number;
	glowOpacityMultiplier: number;
};

export type StormLightningEventKind = 'sheet' | 'strike' | 'dramatic';

export type StormLightningEvent = {
	id: number;
	startMs: number;
	endMs: number;
	kind: StormLightningEventKind;
	// Position in the dedicated lightning canvas coordinate system.
	x: number;
	y: number;
	coreScale: number;
	glowScale: number;
	sheetScaleX: number;
	sheetScaleY: number;
	rotationRad: number;
	sheetRotationRad: number;
	stampIndex: number;
	cellIndex: number;
	jitterX: number;
	jitterY: number;
	altitudePx: number;
	parallaxPhase: number;
	cloudOcclusion: number;
	sheetDriftX: number;
	sheetDriftY: number;
	pulses: StormLightningPulse[];
};

export type StormLightningCell = {
	x: number;
	y: number;
	weight: number;
	radiusPx: number;
};

// ============================================================================
// Snow
// ============================================================================

export type SnowParticle = {
	x: number;
	y: number;
	depth: number;
	size: number;
	opacity: number;
	fallSpeed: number;
	windSpeed: number;
	windSway: number;
	windPhase: number;
	gustResponsiveness: number;
	wobble: number;
	wobblePhase: number;
	stampIndex: number;
	turbulenceSeed: number;
	gustSeed: number;
	densitySeed: number;
	scaleJitter: number;
	stretch: number;
	rotation: number;
	rotationSpeed: number;
};

export type SnowCloudInteractionImpact = {
	// Snow-canvas coordinate system (full-world Mercator, SNOW_CANVAS_SIZE_PX²).
	x: number;
	y: number;
	// Radius in snow-canvas pixels (converted to clouds-canvas pixels at draw time).
	radiusPx: number;
	// 0..1 normalized strength derived from particle alpha.
	alpha01: number;
	// Horizontal drift proxy (snow-canvas px). Used to bias the refraction direction.
	driftXPx: number;
	depth: number;
};

// ============================================================================
// Curated blob
// ============================================================================

export type CuratedBlobMercatorPoint = {
	id: number;
	coords: LatLngLiteral;
	x: number;
	y: number;
};

export type CuratedBlobCluster = {
	centroid: { x: number; y: number };
	points: CuratedBlobMercatorPoint[];
};

export type CuratedBlobMorphSource = {
	mercatorMultiPolygon: ClippingMultiPolygon;
	center: LatLngLiteral;
	centerMerc: { x: number; y: number };
	radiusMerc: number;
	radiusKm: number | null;
};

// ============================================================================
// Weather mood
// ============================================================================

export type RuntimeMoodVisualConfig = MoodVisualConfig & {
	warmSoftboxOpacityMultiplier: number;
	darkSoftboxOpacityMultiplier: number;
	lightningIntensity: number;
};

// ============================================================================
// Color
// ============================================================================

export type ParsedCssColor = [number, number, number, number];
export type RgbColor = { r: number; g: number; b: number };

// ============================================================================
// WASM geo module
// ============================================================================

export type WasmGeoModule = {
	lat_lng_to_world_pixel: (
		lat: number,
		lng: number,
		worldSize: number
	) => Float64Array | ArrayLike<number>;
	distance_point_to_segment_sq: (
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number
	) => number;
	point_in_ring: (px: number, py: number, ring: Float64Array) => boolean;
	is_point_near_segments: (
		x: number,
		y: number,
		segments: Float64Array,
		thresholdPx: number
	) => boolean;
	batch_lat_lng_to_world_pixel: (
		coords: Float64Array,
		worldSize: number
	) => Float64Array | ArrayLike<number>;
	pick_non_overlapping_indices: (
		xy: Float64Array,
		priority_order: Uint32Array,
		in_locked_order: Uint32Array,
		out_locked_order: Uint32Array,
		in_locked_mask: Uint8Array,
		max_primary_dots: number,
		in_locked_share: number,
		hard_cap_outside_by_in_locked: boolean,
		min_separation_sq: number,
		cell_size: number
	) => Uint32Array;
	stable_viewport_sample: (
		coords: Float64Array,
		ids: Uint32Array,
		minLat: number,
		maxLat: number,
		minLng: number,
		maxLng: number,
		slots: number,
		seed: number
	) => Uint32Array;
	union_multi_polygons?: (multiPolygons: ClippingMultiPolygon[]) => ClippingMultiPolygon;
};

// ============================================================================
// Viewport sampling
// ============================================================================

export type ScoredContact = { contact: ContactWithName; score: number };

export type WorldSegment = {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

// ============================================================================
// Marker constellation
// ============================================================================

export type MarkerConstellationCandidate = {
	fromId: number;
	toId: number;
	ax: number;
	ay: number;
	bx: number;
	by: number;
	length: number;
	score: number;
};

export type MarkerConstellationPointStats = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	centerX: number;
	centerY: number;
	spanX: number;
	spanY: number;
	diagonal: number;
};

export type MarkerConstellationLevel = 'wide' | 'mid' | 'detail';

export type MarkerConstellationPoint = {
	id: number;
	coords: LatLngLiteral;
	x: number;
	y: number;
	groupKey: string;
};

export type MarkerConstellationEdgeSeed = {
	fromId: number;
	toId: number;
};

export type MarkerConstellationEdge = {
	fromId: number;
	toId: number;
	level: MarkerConstellationLevel;
	rank: number;
	opacityScale: number;
};

export type MarkerConstellationNode = {
	id: number;
	level: MarkerConstellationLevel;
	rank: number;
	opacityScale: number;
};

export type MarkerConstellationFormation = {
	edges: MarkerConstellationEdge[];
	nodes: MarkerConstellationNode[];
	lowZoomNodeIds: Set<number>;
};

// ============================================================================
// Sun transition
// ============================================================================

export type SunTransitionVisualState = {
	phase: 'sunrise' | 'sunset';
	progress: number;
	intensity: number;
	centerLng: number;
	direction: 1 | -1;
};

// ============================================================================
// Dot wave
// ============================================================================

export type DotWaveMeta = {
	maxDelayMs: number;
};

// ============================================================================
// Basemap cartography
// ============================================================================

export type BasemapCartographyClipState = {
	layerIds: string[];
	originalFilters: Map<string, any | null>;
};

// ============================================================================
// Search mode
// ============================================================================

export type SearchMode = 'booking' | 'promotion';
