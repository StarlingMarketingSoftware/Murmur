import {
	BOOKING_CONTACT_TITLE_PREFIXES,
	PROMOTION_CONTACT_TITLE_PREFIXES,
} from '@/constants/contactCategories';
import { WeatherMood } from '@/lib/weather/regions';
import type { OutlinePolygonFeatureCollection, ParsedCssColor } from './types';

// ============================================================================
// Geometry / clipping
// ============================================================================

export const EMPTY_POLYGON_FC: OutlinePolygonFeatureCollection = {
	type: 'FeatureCollection',
	features: [],
};

// ============================================================================
// Curated blob & orb
// ============================================================================

export const CURATED_BLOB_MIN_REGION_POINTS = 2;
export const CURATED_BLOB_MAX_REGIONS = 8;
export const CURATED_BLOB_MAX_REGION_SPAN_KM = 650;
export const CURATED_BLOB_SHAPE_STEPS = 96;
export const CURATED_BLOB_OUTLINE_SMOOTHING_PASSES = 2;
export const CURATED_STABLE_MARKER_MAX_DOTS = 125;
export const CURATED_BLOB_KMEANS_MAX_ITER = 12;
export const CURATED_BLOB_LOBE_MIN_COUNT = 2;
export const CURATED_BLOB_LOBE_MAX_COUNT = 4;
export const CURATED_BLOB_LOBE_PADDING_KM = 36;
export const CURATED_BLOB_LOBE_MIN_RADIUS_KM = 52;
export const CURATED_BLOB_LOBE_MAX_RADIUS_KM = 240;
export const CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO = 0.55;
export const CURATED_BLOB_LOBE_RADIUS_JITTER = 0.065;
export const CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM = 26;
export const CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM = 7;
export const CURATED_BLOB_ORGANIC_WOBBLE = 0.028;
export const CURATED_ORB_SLOT_COUNT =
	CURATED_BLOB_MAX_REGIONS * CURATED_BLOB_LOBE_MAX_COUNT;

// Globe-zoom orb transition: a two-phase animation as the user zooms out.
//
// Phase 1 (dot ↔ gradient cross-dissolve): the curated contact markers fade
// out and the orb's radial-gradient bloom fades in. Tuned to start while the
// cluster still reads as multiple dots at intermediate zoom — by the time
// the user enters globe-curvature territory the dots are already gone,
// replaced by the soft glow.
export const CURATED_DOT_FADE_START_ZOOM = 4.2;
export const CURATED_DOT_FADE_END_ZOOM = 3.6;
// Non-constellation marker fade: zooming out from the default US-wide view, dots
// not connected to the frozen constellation graph fade out so the constellation
// reads cleanly without crowding from disconnected scattered markers. Members
// (any contact id present in a constellation edge) stay fully visible until the
// existing curated fade takes over below 4.2.
export const NON_CONSTELLATION_FADE_START_ZOOM = 6.0;
export const NON_CONSTELLATION_FADE_END_ZOOM = 5.1;
//
// Phase 2 (shape morph): the blob outline's vertices lerp toward a circle of
// the target radius. Picks up where Phase 1 ends so the user sees the dots
// dissolve first, then the surrounding outline visibly widen out into a
// clean circle as zoom continues to decrease.
export const CURATED_ORB_TRANSITION_START_ZOOM = 3.6;
export const CURATED_ORB_TRANSITION_END_ZOOM = 2.9;
// Sized to match the natural blob's farthest vertex exactly — no extra
// padding — so the morphed circle hugs the cluster's outer envelope rather
// than ballooning out past it. The morph still "widens" because inner
// vertices lerp outward to reach this radius; max-distance vertices stay
// put. Result: the final circle is snug around the gradient bloom (matches
// the Figma mock).
export const CURATED_ORB_RADIUS_PADDING_KM = 0;
// Floor: very tight clusters still need a readable orb, otherwise it shrinks
// to a dot at the moment the dots themselves are disappearing.
export const CURATED_ORB_MIN_RADIUS_KM = 90;
export const CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM = 38;
export const CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM = 72;
export const CURATED_ORB_GRADIENT_ROTATION_DEG = -38.746;
export const CURATED_ORB_SOURCE_VIEWBOX_HALF_WIDTH = 778 / 2;
export const CURATED_ORB_SOURCE_VIEWBOX_HALF_HEIGHT = 736 / 2;
export const CURATED_ORB_ELLIPSE_RX_RATIO =
	607.5 / CURATED_ORB_SOURCE_VIEWBOX_HALF_WIDTH;
export const CURATED_ORB_ELLIPSE_RY_RATIO =
	503 / CURATED_ORB_SOURCE_VIEWBOX_HALF_HEIGHT;
// The source SVG's gradient transform is scaled against its viewBox half-size
// (778x736), not the oversized ellipse axes, so the color band lands near the
// blob edge instead of collapsing outside the visible shape.
export const CURATED_ORB_GRADIENT_SCALE_X_RATIO =
	415.423 / CURATED_ORB_SOURCE_VIEWBOX_HALF_WIDTH;
export const CURATED_ORB_GRADIENT_SCALE_Y_RATIO =
	436.955 / CURATED_ORB_SOURCE_VIEWBOX_HALF_HEIGHT;
export const CURATED_ORB_COLOR_BLEND_OPACITY = 0.38;
export const CURATED_ORB_BLOOM_OPACITY = 1;

export const ORB_FADE_MARKER_FEATURE_EXPR: any = [
	'any',
	['boolean', ['get', 'isCurated'], false],
	['boolean', ['get', 'fadeWithSelectedStateOrb'], false],
];

export const SELECTED_STATE_ORB_FADE_MARKER_FEATURE_EXPR: any = [
	'boolean',
	['get', 'fadeWithSelectedStateOrb'],
	false,
];

// Per-feature opacity for the baseDots layer: curated dots and selected-state
// orb dots cross-fade out over the dot-fade zoom range (which runs ahead of the
// shape morph); other non-curated dots are unaffected. Mapbox
// requires `['zoom']` at the top of an interpolate/step (it can't appear
// inside `case`), so the per-feature branching lives at the lower stop
// and the upper stop is a flat 1.
//
// Non-constellation members additionally fade between
// NON_CONSTELLATION_FADE_START_ZOOM and NON_CONSTELLATION_FADE_END_ZOOM. The
// `inConstellation` feature-state defaults to true (visible) when unset so
// that newly written dots stay visible until the constellation composes.
export const CURATED_DOT_ZOOM_FADE_EXPR: any = [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	[
		'case',
		ORB_FADE_MARKER_FEATURE_EXPR,
		0,
		['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	],
	CURATED_DOT_FADE_START_ZOOM,
	['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	NON_CONSTELLATION_FADE_END_ZOOM,
	['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	NON_CONSTELLATION_FADE_START_ZOOM,
	1,
];

// ============================================================================
// Coordinate / earth utilities
// ============================================================================

// Deterministic "spiderfy" offset for exact/near-exact duplicate coordinates so markers don't fully overlap.
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399963...
export const DUPLICATE_JITTER_BASE_DEG = 0.0015; // ~167m latitude; visible at mid zoom levels

export const EARTH_RADIUS_KM = 6371;

// ============================================================================
// Viewport / dot sampling
// ============================================================================

// Hard cap for total dots rendered in the viewport (contacts + background dots).
// Rendering more than this tends to overload many machines at low zoom levels.
export const MAX_TOTAL_DOTS = 500;

// Padding applied to the viewport bbox when filtering markers into the source.
// Off-screen-but-near markers stay in the GeoJSON (clipped invisibly by Mapbox)
// so small pans and modest zoom changes don't cause `source.setData()` calls
// that briefly flash the dot layer. Aligned with the booking-extra fetch
// padding pattern (which already buffers fetch bounds for the same reason).
export const VIEWPORT_BBOX_PAD_FACTOR = 0.5;

// ============================================================================
// State badge color map (matches dashboard)
// ============================================================================

export const stateBadgeColorMap: Record<string, string> = {
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
	BC: '#E0E0E0',
	YT: '#E0E0E0',
};

// ============================================================================
// Map defaults / decorative framing
// ============================================================================

export const defaultCenter = {
	lat: 39.8283, // Center of US
	lng: -98.5795,
};

export const MAP_DEFAULT_ZOOM = 5;
// Let users zoom out further than the default US-wide view.
export const MAP_MIN_ZOOM = 2.25;
// Dashboard UX: allow state hover highlight one zoom step past the default zoom.
export const STATE_HOVER_HIGHLIGHT_MAX_ZOOM = MAP_DEFAULT_ZOOM + 1;

// Scroll/pinch zoom feel. Mapbox defaults (wheel 1/450, pinch 1/100) feel
// jumpy on a Mac trackpad — each tick traverses a lot of zoom, which reads
// as "aggressive." Lowering both rates produces a slower, more gradual,
// Apple-Maps-style glide. Mapbox's internal easing handles the in-between
// smoothing once each tick is small enough.
export const MAP_WHEEL_ZOOM_RATE = 1 / 700;
export const MAP_PINCH_ZOOM_RATE = 1 / 200;

// Decorative dashboard background framing. Keep these in sync with the background-mode
// camera settings so the initial mount doesn't "pop" after the map loads.
export const DASHBOARD_DECORATIVE_ZOOM = 4.0;
export const DASHBOARD_DECORATIVE_PITCH = 15;
export const DASHBOARD_DECORATIVE_OFFSET_PX: [number, number] = [0, 140]; // push center down -> see more top/horizon
export const DASHBOARD_DECORATIVE_CENTER: [number, number] = [
	defaultCenter.lng,
	defaultCenter.lat,
];

// ============================================================================
// Lighting overlay & gloom wash fade
// ============================================================================

// Softbox lighting overlay fades out as the user zooms in — the "lit sphere"
// read only makes sense at globe/continent distance. Fully on at globe zoom,
// linearly off by the time we're into state-level detail.
// Anchor the fade to the globe→flat-map transition: full at globe zoom, gone
// by the time the viewport is filled with flat map (no visible curvature).
export const LIGHTING_OVERLAY_FADE_START_ZOOM = 2.5;
export const LIGHTING_OVERLAY_FADE_END_ZOOM = 5;

// Dark "gloom wash" persists much further than the softbox/shadow overlays so
// stormy still feels overcast when the user zooms in to city detail.
// Held at full strength through country zoom, then linearly fades out as the
// clouds themselves disappear.
export const GLOOM_WASH_FADE_START_ZOOM = 8;
export const GLOOM_WASH_FADE_END_ZOOM = 10.5;

// ============================================================================
// Clouds overlay
// ============================================================================

// Clouds overlay: subtle patchy clouds for the zoomed-out globe view.
// Implemented as a local raster tile source so it stays glued to the globe as it rotates.
// NOTE: include a version query param to bust browser caches when we regenerate tiles.
export const CLOUDS_TILES_URL_TEMPLATE = '/maps/clouds/{z}/{x}/{y}.png?v=23';
export const CLOUDS_TILES_MAX_ZOOM = 3;
// Tune for "satellite-read" clarity without becoming a weather overlay.
// (Per-mood opacities now live in src/lib/weather/moodConfig.ts; the `normal`
// mood preserves the historical 0.78 / 0.66 values.)
// Keep clouds around slightly past the initial interactive view; fade by state-level zoom.
export const CLOUDS_OVERLAY_FADE_OUT_START_ZOOM = 8.0;
export const CLOUDS_OVERLAY_FADE_OUT_END_ZOOM = 10.5;
export const CLOUDS_CANVAS_TEXTURE_URL = '/maps/clouds/0/0/0.png?v=23';
export const CLOUDS_CANVAS_SIZE_PX = 512;

// ============================================================================
// Lightning
// ============================================================================

// Storm lightning assets: flash stamps + a low-res potential mask to bias
// flashes toward storm cores.
export const LIGHTNING_STAMPS_COUNT = 24;
export const LIGHTNING_STAMPS_VERSION = 5;
export const LIGHTNING_POTENTIAL_VERSION = 1;
export const LIGHTNING_POTENTIAL_TEXTURE_URL = `/maps/lightning_potential/0/0/0.png?v=${LIGHTNING_POTENTIAL_VERSION}`;
export const LIGHTNING_CANVAS_WIDTH_PX = 1024;
export const LIGHTNING_CANVAS_HEIGHT_PX = 1024;
// Keep lightning visible through the full clouds fade-out band so it's still present
// in typical "interactive" zoom ranges (it will naturally dim with raster-opacity).
export const LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM = CLOUDS_OVERLAY_FADE_OUT_END_ZOOM;
// Show a first flash quickly when stormy lightning turns on so it reads as "connected".
export const LIGHTNING_FIRST_FLASH_MIN_INTERVAL_MS = 180;
export const LIGHTNING_FIRST_FLASH_MAX_INTERVAL_MS = 950;
export const LIGHTNING_MIN_INTERVAL_MS = 1400;
export const LIGHTNING_MAX_INTERVAL_MS = 4200;
export const LIGHTNING_MAX_ACTIVE_EVENTS = 10;
export const LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS = 14;
export const LIGHTNING_MERCATOR_MAX_LAT = 85.051129;
export const LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM = MAP_MIN_ZOOM + 0.35;
export const LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM = 4.35;
export const LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS = 900;
export const LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS = 2600;
export const LIGHTNING_CLUSTER_CHANCE_MIN = 0.08;
export const LIGHTNING_CLUSTER_CHANCE_MAX = 0.18;
export const LIGHTNING_RESTRIKE_MIN_INTERVAL_MS = 95;
export const LIGHTNING_RESTRIKE_MAX_INTERVAL_MS = 320;
export const LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES = 1;
export const LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES = 2;
export const LIGHTNING_SCALE_ZOOM_START = 5.2;
export const LIGHTNING_SCALE_ZOOM_END = CLOUDS_OVERLAY_FADE_OUT_END_ZOOM;
export const LIGHTNING_US_BOUNDS: [number, number, number, number] = [
	-125.5, 24.0, -66.0, 50.0,
];
// Use the same world-Mercator geometry as the clouds canvas. Canvas sources only
// reliably render in this map when they span the full Mercator world (small
// regional canvases can fall out of the globe-projection sample path).
export const LIGHTNING_CANVAS_COORDINATES: [
	[number, number],
	[number, number],
	[number, number],
	[number, number],
] = [
	[-180, 85.051129],
	[180, 85.051129],
	[180, -85.051129],
	[-180, -85.051129],
];
export const LIGHTNING_STORM_CELL_COUNT = 6;
export const LIGHTNING_REGION_BIAS_CHANCE = 0.34;
// Cell radii in lightning-canvas pixels. The lightning canvas is full-world
// Mercator (LIGHTNING_CANVAS_WIDTH_PX × LIGHTNING_CANVAS_HEIGHT_PX), so CONUS
// occupies roughly 165 px wide × 80 px tall at 1024×1024.
export const LIGHTNING_CELL_RADIUS_GLOBE_PX = 28;
export const LIGHTNING_CELL_RADIUS_CLOSE_PX = 9;
export const LIGHTNING_DRAMATIC_STRIKE_CHANCE = 0.08;
export const LIGHTNING_SHEET_FLASH_CHANCE = 0.68;
export const LIGHTNING_ALTITUDE_GLOBE_PX = 13;
export const LIGHTNING_ALTITUDE_CLOSE_PX = 4;
export const LIGHTNING_CATCHLIGHT_OPACITY = 0.22;
// Stamp scale is relative to the full lightning canvas. The new stamps are 320 px
// wide; with these values a globe-zoom dramatic strike paints ~80 px wide across
// the whole world canvas — roughly half the CONUS footprint.
export const LIGHTNING_SCALE_GLOBE_MIN = 0.16;
export const LIGHTNING_SCALE_GLOBE_MAX = 0.32;
export const LIGHTNING_SCALE_CLOSE_MIN = 0.05;
export const LIGHTNING_SCALE_CLOSE_MAX = 0.11;
export const LIGHTNING_US_POSITION_TRIES = 72;
export const LIGHTNING_OPACITY_MULTIPLIER = 1.08;
export const LIGHTNING_LAYER_OPACITY = 0.92;

// ============================================================================
// Snow & cloud-snow interaction
// ============================================================================

export const SNOWFLAKE_STAMPS_COUNT = 20;
export const SNOWFLAKE_STAMPS_VERSION = 7;
export const SNOW_CANVAS_SIZE_PX = 1024;
export const SNOW_MAX_PARTICLES = 1800;
export const SNOW_LAYER_OPACITY = 1.0;
export const SNOW_HIDE_AT_OR_ABOVE_ZOOM = CLOUDS_OVERLAY_FADE_OUT_END_ZOOM;
export const SNOW_BASE_FALL_PX_PER_S = 9.2;
export const SNOW_BASE_WIND_PX_PER_S = 1.2;
export const SNOW_WIND_SWAY_BASE_PX = 3.4;
export const SNOW_GUST_PUSH_BASE_PX = 4.8;
export const SNOW_EDDY_DRIFT_BASE_PX = 2.2;
export const SNOW_TURBULENCE_LOOP_MS = 37_000;
export const SNOW_GUST_BAND_LOOP_MS = 29_000;
export const SNOW_DENSITY_BAND_LOOP_MS = 46_000;
export const SNOW_STAMP_MIN_SIZE_PX = 12;
export const SNOW_STAMP_MAX_SIZE_PX = 34;
export const SNOW_STAMP_ALPHA_MULTIPLIER = 1.72;
export const SNOW_STAMP_MAX_ALPHA = 0.96;
export const SNOW_ROTATED_PARTICLE_DEPTH_MIN = 0.82;
export const SNOW_US_SIDE_CENTER_LNG = defaultCenter.lng;
export const SNOW_US_SIDE_FADE_START_DEG = 78;
export const SNOW_US_SIDE_FADE_END_DEG = 94;
// Snow→cloud interaction: keep subtle (reads as atmospheric refraction, not holes).
export const CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX = 96;
export const CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS = 360;
export const CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED = 140;
export const CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX = 3.2;

// ============================================================================
// Contact-lights overlay (night dot tiles)
// ============================================================================

// Contact-lights overlay: dot-only night lights derived from contact coordinates.
// Implemented as local raster tiles (like clouds) so it stays glued to the globe.
// NOTE: include a version query param to bust browser caches when tiles regenerate.
export const CONTACT_LIGHTS_TILES_URL_TEMPLATE = '/maps/contact_lights/{z}/{x}/{y}.png?v=9';
// "Intro reveal" tiles: same dots, but alpha is biased west->east so a global fade-in reads
// like dots revealing left-to-right. We crossfade to the real tiles after the intro.
export const CONTACT_LIGHTS_REVEAL_TILES_URL_TEMPLATE =
	'/maps/contact_lights_reveal/{z}/{x}/{y}.png?v=9';
export const CONTACT_LIGHTS_TILES_MAX_ZOOM = 6;
// CONUS-ish bounds (limits Mapbox tile requests).
export const CONTACT_LIGHTS_TILES_BOUNDS: [number, number, number, number] = [
	-125.5, // lon min
	24.0, // lat min
	-66.0, // lon max
	50.0, // lat max
];

// ============================================================================
// Web Mercator constants & cloud canvas coordinates
// ============================================================================

export const WEB_MERCATOR_MAX_LAT = 85.051129;
// Full WebMercator bounds (lat clamp) so the texture maps cleanly across the globe.
export const CLOUDS_CANVAS_COORDINATES: [
	[number, number],
	[number, number],
	[number, number],
	[number, number],
] = [
	[-180, WEB_MERCATOR_MAX_LAT],
	[180, WEB_MERCATOR_MAX_LAT],
	[180, -WEB_MERCATOR_MAX_LAT],
	[-180, -WEB_MERCATOR_MAX_LAT],
];

// Latitude band over which the cloud/snow canvas alpha tapers to zero. Hides
// the Mercator-vs-globe distortion that otherwise smears the polar rows of the
// flat canvas into a visible ring around each pole. Mirrors the day-shade
// `polarTaperT` (see paintDayFarSideShadeCanvas) but starts a little earlier,
// since cloud texture detail makes the smear more visible than the shade's
// flat fill does.
export const CLOUDS_POLAR_TAPER_START_DEG = 55;
export const CLOUDS_POLAR_TAPER_END_DEG = 82;

// ============================================================================
// Day far-side shade
// ============================================================================

export const DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX = 512;
// Stored in the texture alpha; tuned to read as a clear "this side is in shadow"
// without becoming a night-mode look. The opacity multiplier below stacks on top.
export const DAY_FAR_SIDE_SHADE_MAX_ALPHA = 0.32;
export const DAY_FAR_SIDE_SHADE_OPACITY_MULTIPLIER = 1.0;
export const DAY_FAR_SIDE_SHADE_DAYTIME_DRIFT_DEG = 76;
export const DAY_FAR_SIDE_SHADE_FADE_START_DEG = 24;
export const DAY_FAR_SIDE_SHADE_FADE_END_DEG = 154;
export const DAY_FAR_SIDE_SHADE_FADE_POWER = 1.32;
export const DAY_FAR_SIDE_SHADE_REPAINT_MS = 4_000;
export const DAY_FAR_SIDE_SHADE_MIN_REPAINT_DELTA_DEG = 0.02;

// ============================================================================
// Sun transition
// ============================================================================

export const SUN_TRANSITION_CANVAS_SIZE_PX = 512;
export const SUN_TRANSITION_LAYER_MAX_OPACITY = 0.96;
export const SUN_TRANSITION_CLOUD_CATCHLIGHT_OPACITY_MULT = 0.28;
export const SUN_TRANSITION_SPACE_GLOW_OPACITY_MULT = 0.16;
export const SUN_TRANSITION_MAX_PIXEL_ALPHA = 0.62;
export const SUN_TRANSITION_COLOR_ALPHA_MULT = 1.42;
export const SUN_TRANSITION_CLOSE_FADE_START_ZOOM = 4.8;
export const SUN_TRANSITION_CLOSE_FADE_END_ZOOM = 6.1;
export const SUN_TRANSITION_PROGRESS_PAINT_STEPS = 520;
export const SUN_TRANSITION_SUNRISE_START_OFFSET_DEG = 54;
export const SUN_TRANSITION_SUNRISE_END_OFFSET_DEG = -48;
export const SUN_TRANSITION_SUNSET_START_OFFSET_DEG = -48;
export const SUN_TRANSITION_SUNSET_END_OFFSET_DEG = 54;

// ============================================================================
// Clouds drift / turbulence
// ============================================================================

// Clouds drift animation parameters.
// We animate the *canvas source* (not Mapbox raster paint), so units are in the canvas'
// pixel grid. We apply a light zoom-based scale so drift stays noticeable while clouds
// are still visible, without getting overly fast near fade-out.
// Target frame cadence for the clouds canvas animation. Keeping this near ~60fps
// helps the drift feel smooth without forcing Mapbox to repaint at very high rates.
export const CLOUDS_DRIFT_UPDATE_MS = 16;
export const CLOUDS_DRIFT_LOOP_MS = 180_000;
export const CLOUDS_DRIFT_BASE_ZOOM = 4.0;
export const CLOUDS_DRIFT_AMPLITUDE_X_PX = 12;
export const CLOUDS_DRIFT_AMPLITUDE_Y_PX = 4;
export const CLOUDS_DRIFT_SPEED_X_PX_PER_S = 0.35;
export const CLOUDS_DRIFT_SPEED_Y_PX_PER_S = 0.0;
// Global tuning knob: < 1 = slower clouds, > 1 = faster clouds.
export const CLOUDS_DRIFT_TIME_SCALE = 0.8;
// Inverse zoom scaling: at higher zoom levels the same world-distance covers more
// screen pixels, so we slow the underlying texture drift so on-screen speed stays
// roughly consistent (and doesn't feel "too fast" when zoomed in).
export const CLOUDS_DRIFT_ZOOM_SCALE_EXP = 1.0;
export const CLOUDS_DRIFT_ZOOM_SCALE_MIN = 0.01;
export const CLOUDS_DRIFT_ZOOM_SCALE_MAX = 4.0;
// Adds subtle "alive" motion within the cloud shapes by warping the texture slightly as
// it drifts. Keep extremely small so this reads as atmospheric turbulence (not pulsing).
export const CLOUDS_TURBULENCE_STRIP_PX = 32;
export const CLOUDS_TURBULENCE_LOOP_MS = 90_000;
export const CLOUDS_TURBULENCE_AMPLITUDE_X_PX = 1.3;
export const CLOUDS_EXTRA_PASS_OFFSETS: Array<[number, number]> = [
	[0.5, 0.5],
	[-0.31, 0.37],
	[0.18, -0.29],
	[-0.58, -0.14],
	[0.36, -0.47],
	[-0.12, 0.72],
	[0.64, -0.18],
	[-0.42, -0.54],
];

// ============================================================================
// Auto-fit / dashboard transition
// ============================================================================

export const AUTO_FIT_CONTACTS_MAX_ZOOM = 10;
export const AUTO_FIT_STATE_MAX_ZOOM = 5;
export const DEFAULT_MAX_ZOOM_FALLBACK = 22;

export const DASHBOARD_TO_INTERACTIVE_TRANSITION_MS = 7200;
export const DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING =
	'cubic-bezier(0.22, 1, 0.36, 1)';
export const DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS = 1800;

// ============================================================================
// Mapbox base style + globe lighting
// ============================================================================

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

// Viewer-anchored softbox lighting for the globe.
//
// Mapbox directional-light `direction: [azimuth, polar]` is defined in WORLD space
// (azimuth 0 = north, 90 = east, 180 = south, 270 = west). If we leave it static,
// rotating the camera's bearing makes the lit hemisphere drift across the screen.
//
// To make the "softbox" feel like it lives in the viewer's room (upper-left, slightly
// behind the viewer) instead of bolted to the Earth, we re-derive the world azimuth
// each time the camera bearing changes. At bearing 0, viewer-left = world-west (270°).
// When bearing rotates clockwise by B degrees, viewer-left in world space rotates by
// +B, so: azimuth = (270 + bearing) mod 360.
//
// Panning (changing center lat/lng) in globe projection doesn't rotate the viewport's
// up-axis relative to world-north, so no compensation is needed there — the light
// already stays on the viewer's left for free.
export const MURMUR_GLOBE_LIGHT_VIEWER_AZIMUTH_OFFSET_DEG = 270;
// Polar is measured from straight-up (0 = overhead). 75° sits the softbox low
// and side-on — this is what creates a clearly visible terminator across the
// globe rather than a flat, evenly-lit disc.
export const MURMUR_GLOBE_LIGHT_POLAR_DEG = 75;

// ============================================================================
// Map palette
// ============================================================================

// Mapbox Streets v12 has no "land" fill layer covering every continent — the cream land
// tone is just the background layer showing through gaps in landuse/landcover/water.
// That means *any* time tiles are streaming in (initial load, a sudden zoom-out, a pan
// into untiled territory), the background is all the user sees, and there is no single
// color that reads correctly for both land and water.
//
// Fix: paint the background permanently ocean-blue (so untiled sphere reads as water)
// and add a separate cream-colored fill layer sourced from Mapbox's free vector tileset
// `mapbox.country-boundaries-v1`, which has complete world coverage (every country, plus
// Antarctica) and is extremely lightweight. Country tiles cache at all zooms, so after
// the first paint the continents stay cream through every subsequent zoom/pan; water
// fills still draw blue on top, so lakes/rivers inside countries look right.
export const MAP_OCEAN_BLUE = '#62C7E3';
export const MAP_LAND_CREAM = '#F1EDE2';
export const MAP_LANDCOVER_GREEN = '#B3E6D7';

export const NIGHT_HIDE_ROADS_START_T = 0.18;
export const NIGHT_HIDE_ROADS_END_T = 0.42;
// Roads compete with the contact-lights overlay at globe zoom, but they matter for
// legibility at city zoom. Fade the road-hiding back out as the user zooms in.
export const NIGHT_HIDE_ROADS_RESTORE_START_ZOOM = 5.5;
export const NIGHT_HIDE_ROADS_RESTORE_END_ZOOM = 9.0;

// ============================================================================
// Night-aware atmosphere
// ============================================================================

// Night-aware atmosphere — layered on top of the mood-driven fog so the
// existing Mapbox stars/atmosphere read differently when night falls without
// adding any new overlay. Three coupled adjustments, all subtle:
//
//   * `star-intensity` ramps 0.9 → 1.0. Mapbox caps at 1, so we use the full
//     remaining headroom; the perceived glow comes from the stars hitting their
//     ceiling while the surrounding palette darkens.
//   * Close-fog `color` keeps the mood's hue but its alpha scales down at
//     night. This pulls the limb-hugging mist *off* the globe so the haze
//     stops reading as exhalation from the planet's surface.
//   * `space-color` lifts a hair from pure black toward a deeply cool void.
//     This is the atmospheric scatter the user wants — it sits in the space
//     around the globe (driven by Mapbox's camera/projection, so it adapts
//     to zoom and panning automatically — not an overlay we'd have to mask
//     against the earth).
export const NIGHT_STAR_INTENSITY_DAY = 0.85;
export const NIGHT_STAR_INTENSITY_NIGHT = 1.0;
export const NIGHT_SPACE_COLOR_DAY: ParsedCssColor = [0, 0, 0, 1];
export const NIGHT_SPACE_COLOR_NIGHT: ParsedCssColor = [7, 13, 24, 1];
export const NIGHT_CLOSE_FOG_ALPHA_DAY = 1.0;
export const NIGHT_CLOSE_FOG_ALPHA_NIGHT = 0.42;

// ============================================================================
// World-land fill layer
// ============================================================================

// IDs for the world-land fill layer (cream land coverage) sourced from Mapbox's
// free `country-boundaries-v1` tileset. Adding this layer means the background
// layer can stay permanently ocean-blue without blue leaking through in "bare
// land" areas between landuse/landcover polygons — on initial load, during
// zoom-outs, and during pans into untiled territory.
export const MAP_WORLD_LAND_SOURCE_ID = 'murmur-world-land';
export const MAP_WORLD_LAND_LAYER_ID = 'murmur-world-land-fill';
export const MAP_WORLD_LAND_TILESET_URL = 'mapbox://mapbox.country-boundaries-v1';
export const MAP_WORLD_LAND_SOURCE_LAYER = 'country_boundaries';

// Performance: the `within` filter is helpful when zoomed out (to hide Canada/Mexico labels/roads),
// but it adds overhead at high zoom where there are many more road/label features.
// Only apply the US-only basemap clipping up to this zoom level.
export const US_ONLY_BASEMAP_CLIP_MAX_ZOOM = 7;

// ============================================================================
// Mapbox source / layer ID maps
// ============================================================================

export const MAPBOX_SOURCE_IDS = {
	clouds: 'murmur-clouds',
	lightning: 'murmur-lightning',
	snow: 'murmur-snow',
	dayFarSideShade: 'murmur-day-far-side-shade',
	sunTransition: 'murmur-sun-transition',
	nightLights: 'murmur-night-lights',
	nightLightsReveal: 'murmur-night-lights-reveal',
	states: 'murmur-states',
	resultsOutline: 'murmur-results-outline',
	lockedOutline: 'murmur-locked-outline',
	curatedBlob: 'murmur-curated-blob',
	markerConstellation: 'murmur-marker-constellation',
	markerConstellationSelected: 'murmur-marker-constellation-selected',
	markerConstellationNodes: 'murmur-marker-constellation-nodes',
	selectionRect: 'murmur-selection-rect',
	selectedAreaRect: 'murmur-selected-area-rect',
	markersBase: 'murmur-markers-base',
	markersPromotionDot: 'murmur-markers-promo-dot',
	markersAllOverlay: 'murmur-markers-all-overlay',
	markersPromotionPin: 'murmur-markers-promo-pin',
	markersBookingPin: 'murmur-markers-booking-pin',
	markersSelected: 'murmur-markers-selected',
	stateLabels: 'murmur-state-labels',
} as const;

export const MAPBOX_LAYER_IDS = {
	// Globe overlays
	clouds: 'murmur-clouds-raster',
	lightning: 'murmur-lightning-raster',
	snow: 'murmur-snow-raster',
	dayFarSideShade: 'murmur-day-far-side-shade-raster',
	sunTransition: 'murmur-sun-transition-raster',
	sunTransitionCloudCatchlight: 'murmur-sun-transition-cloud-catchlight-raster',
	nightLightsSpaceGlow: 'murmur-night-lights-space-glow',
	nightLightsSpaceGlow2: 'murmur-night-lights-space-glow-2',
	nightLightsGlow: 'murmur-night-lights-glow',
	nightLightsCloseGlow: 'murmur-night-lights-close-glow',
	nightLights: 'murmur-night-lights-raster',
	nightLightsRevealGlow: 'murmur-night-lights-reveal-glow',
	nightLightsReveal: 'murmur-night-lights-reveal-raster',
	// States
	statesFillHit: 'murmur-states-fill-hit',
	statesFillHover: 'murmur-states-fill-hover',
	statesDividers: 'murmur-states-dividers',
	statesBordersInteractive: 'murmur-states-borders-interactive',
	statesLabels: 'murmur-states-labels',
	// Outlines
	resultsOutline: 'murmur-results-outline-line',
	lockedOutline: 'murmur-locked-outline-line',
	curatedBlobFill: 'murmur-curated-blob-fill',
	curatedBlobCore: 'murmur-curated-blob-core-line',
	markerConstellationGlow: 'murmur-marker-constellation-glow-line',
	markerConstellationCore: 'murmur-marker-constellation-core-line',
	markerConstellationSelectedGlow: 'murmur-marker-constellation-selected-glow-line',
	markerConstellationSelectedCore: 'murmur-marker-constellation-selected-core-line',
	markerConstellationNodeGlow: 'murmur-marker-constellation-node-glow',
	markerConstellationNodeDots: 'murmur-marker-constellation-node-dots',
	// Markers (hit layers are used for hover/click priority)
	markersAllHit: 'murmur-markers-all-hit',
	markersAllGlow: 'murmur-markers-all-glow',
	markersAllDots: 'murmur-markers-all-dots',
	markersAllFallbackIcons: 'murmur-markers-all-fallback-icons',
	markersAllFallbackIconsHover: 'murmur-markers-all-fallback-icons-hover',
	promotionPinHit: 'murmur-promo-pin-hit',
	promotionPinIcons: 'murmur-promo-pin-icons',
	promotionPinIconsHover: 'murmur-promo-pin-icons-hover',
	bookingPinHit: 'murmur-booking-pin-hit',
	bookingPinIcons: 'murmur-booking-pin-icons',
	bookingPinIconsMarkerHover: 'murmur-booking-pin-icons-marker-hover',
	bookingPinIconsHover: 'murmur-booking-pin-icons-hover',
	promotionDotHit: 'murmur-promo-dot-hit',
	promotionDotGlow: 'murmur-promo-dot-glow',
	promotionDotDots: 'murmur-promo-dot-dots',
	baseHit: 'murmur-base-hit',
	baseGlow: 'murmur-base-glow',
	baseDots: 'murmur-base-dots',
	baseFallbackIcons: 'murmur-base-fallback-icons',
	baseFallbackIconsHover: 'murmur-base-fallback-icons-hover',
	selectedMarkerIcons: 'murmur-selected-marker-icons',
	selectedMarkerIconsHover: 'murmur-selected-marker-icons-hover',
	// Rectangles
	selectedAreaRect: 'murmur-selected-area-rect-line',
	selectionRectFill: 'murmur-selection-rect-fill',
	selectionRectLine: 'murmur-selection-rect-line',
} as const;

// ============================================================================
// Dot reveal animation (search results)
// ============================================================================

// --- Dot reveal animation (search results) ---
// Compute a per-dot reveal delay (ms) based on longitude so dots fade in as a smooth left→right wave.
// We drive the animation by updating a single paint expression over time.
export const DOT_WAVE_DELAY_PROP = '__murmurWaveDelayMs';
export const DOT_WAVE_TRAVEL_MS_MIN = 900;
export const DOT_WAVE_TRAVEL_MS_MAX = 1600;
// Each dot fades up over this duration once the wave reaches it.
// A wide band means many dots coexist at different partial opacities, so no visible "edge".
export const DOT_WAVE_FADE_MS = 1200;
// Per-dot jitter range (ms). Large enough to separate dots at the same longitude into
// individually-timed reveals rather than batches that pop in together.
export const DOT_WAVE_JITTER_MS = 350;
// Throttle paint updates (~60fps) for smoothness.
export const DOT_WAVE_FRAME_MS = 16;
// Mapbox transition duration between throttled paint updates. Keep short so individual dot
// timings stay crisp rather than being temporally blurred into batches.
export const DOT_WAVE_SMOOTH_TRANSITION_MS = 25;
// Ease-out curve for per-dot opacity ramp. Dots gently emerge then settle into full opacity.
export const DOT_WAVE_EASING: any = ['cubic-bezier', 0.33, 0, 0.2, 1];

// ============================================================================
// Marker constellation
// ============================================================================

// --- Marker constellations (search results) ---
// Delicate background linework that is composed once per search from visible primary dots.
export const MARKER_CONSTELLATION_LINE_COLOR = '#4F555C';
export const MARKER_CONSTELLATION_HALO_COLOR = '#F6FAFC';
export const MARKER_CONSTELLATION_CORE_OPACITY = 0.56;
export const MARKER_CONSTELLATION_GLOW_OPACITY = 0.3;
export const MARKER_CONSTELLATION_SELECTED_LINE_COLOR = '#FFFFFF';
export const MARKER_CONSTELLATION_SELECTED_HALO_COLOR = '#E8F7FF';
export const MARKER_CONSTELLATION_SELECTED_CORE_OPACITY = 0.98;
export const MARKER_CONSTELLATION_SELECTED_GLOW_OPACITY = 0.34;
export const MARKER_CONSTELLATION_NODE_OPACITY = 0.76;
export const MARKER_CONSTELLATION_NODE_GLOW_OPACITY = 0.24;
export const MARKER_CONSTELLATION_MAX_POINTS = 180;
export const MARKER_CONSTELLATION_MAX_EDGES = 140;
export const MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM = MAP_DEFAULT_ZOOM;
export const MARKER_CONSTELLATION_MID_COMPOSE_ZOOM = 5.8;
export const MARKER_CONSTELLATION_DETAIL_COMPOSE_ZOOM = 7.4;
export const MARKER_CONSTELLATION_MIN_EDGE_PX = 18;
export const MARKER_CONSTELLATION_MAX_EDGE_PX = 185;
export const MARKER_CONSTELLATION_FALLBACK_GROUP_PX = 230;
export const MARKER_CONSTELLATION_SPARSE_FALLBACK_MAX_EDGE_PX = 360;
export const MARKER_CONSTELLATION_POINT_CLEARANCE_PX = 9;
// Fade-in for the initial reveal so lines materialize over the camera fly-in
// instead of popping in once it lands.
export const MARKER_CONSTELLATION_REVEAL_FADE_MS = 450;

export const MARKER_CONSTELLATION_EDGE_RANK_OPACITY_EXPR: any = [
	'interpolate',
	['linear'],
	['coalesce', ['get', 'rank'], 0],
	0,
	1,
	0.6,
	0.84,
	1,
	0.58,
];

export const MARKER_CONSTELLATION_NODE_RANK_OPACITY_EXPR: any = [
	'interpolate',
	['linear'],
	['coalesce', ['get', 'rank'], 0],
	0,
	1,
	0.7,
	0.86,
	1,
	0.68,
];

// ============================================================================
// State overlays
// ============================================================================

export const STATE_PROCESSED_GEOJSON_URL = '/geo/us-states-processed.json';
export const STATE_META_URL = '/geo/us-states-meta.json';
export const STATE_LABELS_URL = '/geo/us-states-labels.json';
export const STATE_OUTLINE_URL = '/geo/us-states-outline.json';
export const STATE_PREPARED_POLYGONS_URL = '/geo/us-states-prepared-polygons.json';
export const STATE_HIGHLIGHT_COLOR = '#5DAB68';
export const STATE_HIGHLIGHT_OPACITY = 0.68;
export const STATE_DIVIDER_COLOR = '#7A8799';
export const STATE_LABEL_COLOR = '#111827';
export const SELECTED_STATE_GRADIENT_COLOR_OPACITY = CURATED_ORB_COLOR_BLEND_OPACITY;
export const SELECTED_STATE_GRADIENT_BLOOM_OPACITY = 0.5;
// When zoomed out to a US-wide view, show subtle state divider lines (like Zillow).
// Keep these behind the blue/black search-area outlines.
export const STATE_DIVIDER_LINES_MAX_ZOOM = 8;
// Night mode keeps the same map palette as day, so state boundaries keep day contrast.
export const NIGHT_STATE_LINE_OPACITY_MUL_MIN = 1;
export const NIGHT_STATE_LINE_DARKEN_MAX = 0;

// ============================================================================
// Marker dot styling
// ============================================================================

// Marker dot colors by search "What" value (dashboard/drafting search).
export const DEFAULT_RESULT_DOT_COLOR = '#D21E1F';
export const RESULT_DOT_ZOOM_MIN = 4;
export const RESULT_DOT_ZOOM_MAX = 14;
export const RESULT_DOT_SCALE_MIN = 3;
export const RESULT_DOT_SCALE_MAX = 11;
// Overlay pins look too small when zoomed out; keep their circle readable without
// overpowering the search tray/category icons.
export const MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX = 16;
// Selected stroke weight should be thinner when zoomed out and approach ~3px when zoomed in.
export const RESULT_DOT_STROKE_WEIGHT_MIN_PX = 1.5;
export const RESULT_DOT_STROKE_WEIGHT_MAX_PX = 3;
export const RESULT_DOT_STROKE_COLOR_DEFAULT = '#FFFFFF';
export const RESULT_DOT_STROKE_COLOR_SELECTED = '#15C948';
export const RESULT_DOT_GLOW_COLOR = '#FFFFFF';
export const RESULT_DOT_GLOW_RADIUS_MIN_PX = 8;
export const RESULT_DOT_GLOW_RADIUS_MAX_PX = 16;
export const RESULT_DOT_GLOW_OPACITY = 0.72;

export const CATEGORIZED_DOT_ZOOM_FADE_EXPR: any = [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
			[
				'case',
				ORB_FADE_MARKER_FEATURE_EXPR,
				0,
				['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
			],
	],
	CURATED_DOT_FADE_START_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	],
	NON_CONSTELLATION_FADE_END_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	],
	NON_CONSTELLATION_FADE_START_ZOOM,
	['case', ['boolean', ['get', 'isUncategorized'], false], 0, 1],
];
export const CATEGORIZED_DOT_GLOW_ZOOM_FADE_EXPR: any = [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
			[
				'case',
				ORB_FADE_MARKER_FEATURE_EXPR,
				0,
				[
					'case',
				['boolean', ['feature-state', 'inConstellation'], true],
				RESULT_DOT_GLOW_OPACITY,
				0,
			],
		],
	],
	CURATED_DOT_FADE_START_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		[
			'case',
			['boolean', ['feature-state', 'inConstellation'], true],
			RESULT_DOT_GLOW_OPACITY,
			0,
		],
	],
	NON_CONSTELLATION_FADE_END_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		[
			'case',
			['boolean', ['feature-state', 'inConstellation'], true],
			RESULT_DOT_GLOW_OPACITY,
			0,
		],
	],
	NON_CONSTELLATION_FADE_START_ZOOM,
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		RESULT_DOT_GLOW_OPACITY,
	],
];
export const ALL_CONTACTS_DOT_GLOW_OPACITY = 0.54;
export const RESULT_DOT_GLOW_BLUR = 0.86;
export const RESULT_DOT_TRANSPARENT_STROKE_COLOR = 'rgba(255, 255, 255, 0)';
// Fill color for the hover tooltip SVG when the contact is selected.
export const TOOLTIP_FILL_COLOR_SELECTED = '#258530';
export const BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR = '#000000';

// ============================================================================
// Hover & overlay marker thresholds
// ============================================================================

// Keep hover tooltip above all map markers so it never gets covered.
export const HOVER_TOOLTIP_Z_INDEX = 1_000_000;
// Minimum zoom level required to trigger hover tooltips and research highlights on markers.
// Below this zoom level, markers are too dense and small for hover interactions to be useful.
export const HOVER_INTERACTION_MIN_ZOOM = 8;
export const BOOKING_EXTRA_MARKERS_MIN_ZOOM = 8;
// Keep extra markers capped so map remains responsive.
export const BOOKING_EXTRA_MARKERS_MAX_DOTS = 160;
// Promotion searches: show state-wide radio list pins as overlay markers.
// Match booking's zoom threshold for consistent UX across modes.
export const PROMOTION_OVERLAY_MARKERS_MIN_ZOOM = 8;
// Defensive cap; expected to be ~2 per state.
export const PROMOTION_OVERLAY_MARKERS_MAX_PINS = 220;

// "All contacts" gray-dot overlay: only show when zoomed in *extremely* close.
export const ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM = 18;
export const ALL_CONTACTS_OVERLAY_LIMIT = 2000;
export const ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR = '#9CA3AF';
export const ALL_CONTACTS_OVERLAY_TOOLTIP_FILL_COLOR = '#6B7280';

// Disengaged-search ambient atlas: a browse layer for the empty-map state.
// It starts at North-America/globe zoom and ramps toward a 500-on-screen target
// without reusing the active search result markers.
export const AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM = 2.6;
export const AMBIENT_CONTACTS_OVERLAY_MARKERS_FULL_ZOOM = 5.05;
export const AMBIENT_CONTACTS_OVERLAY_MIN_DOTS = 180;
export const AMBIENT_CONTACTS_OVERLAY_TARGET_DOTS = MAX_TOTAL_DOTS;
export const AMBIENT_CONTACTS_OVERLAY_BUFFER_DOTS = 420;
export const AMBIENT_CONTACTS_OVERLAY_LIMIT = 1800;
export const AMBIENT_CONTACTS_UNCATEGORIZED_FILL_COLOR = '#5BB6DD';

export const BOOKING_EXTRA_TITLE_PREFIXES = BOOKING_CONTACT_TITLE_PREFIXES;

export const PROMOTION_OVERLAY_TITLE_PREFIXES = PROMOTION_CONTACT_TITLE_PREFIXES;

// ============================================================================
// Locked state marker bias
// ============================================================================

// When very zoomed out, we want the searched/locked state to visually "win" so the user
// can understand where the bulk of results are. As you zoom in, we ease back toward a
// more natural distribution.
export const LOCKED_STATE_MARKER_BIAS_ZOOM_START = RESULT_DOT_ZOOM_MIN; // 4
export const LOCKED_STATE_MARKER_BIAS_ZOOM_END = STATE_DIVIDER_LINES_MAX_ZOOM; // 8
export const LOCKED_STATE_MARKER_BIAS_SHARE_MAX = 0.92; // at zoom ~4
export const LOCKED_STATE_MARKER_BIAS_SHARE_MIN = 0.6; // by zoom ~8

// When a search/locked state is active, de-emphasize out-of-state markers by making them
// look like they'd be at 50% opacity on a white background (but keep fillOpacity=1).
export const OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE = 0.5;

// ============================================================================
// Manual dev overrides + mood transition
// ============================================================================

// MANUAL WEATHER MOOD OVERRIDE FOR TESTING.
// Set to one of: 'sunny' | 'normal' | 'cloudy' | 'stormy' | 'snowy'
// Set back to null to use the real weather mood from the user's region.
export const MANUAL_WEATHER_MOOD_OVERRIDE: WeatherMood | null = null;

// MANUAL TEMPERATURE OVERRIDE FOR TESTING (Fahrenheit).
// Set to a number (e.g. 92) to test the > 80°F brightness lift.
// Set back to null to use the real temperature from the user's region.
export const MANUAL_WEATHER_TEMPERATURE_OVERRIDE_F: number | null = null;

// MANUAL NIGHT OVERRIDE FOR TESTING.
// Set to a number between 0 and 1 (e.g. 1 for deep night, 0 for full day).
// Set back to null to use the real regional day/night cycle.
export const MANUAL_NIGHT_T_OVERRIDE: number | null = null;

export const MOOD_CONTINUOUS_TRANSITION_MS = 90_000;
export const MOOD_DISCRETE_EFFECT_FADE_MS = 8_000;
export const MOOD_TRANSITION_PAINT_FRAME_MS = 16;

// ============================================================================
// Hot temperature wash
// ============================================================================

// Threshold above which the globe gets a uniform warm brightness lift on top
// of the active mood (only applies when the mood uses a bright screen-blend
// softbox — applying a brightening wash to the dark-pool moods would defeat
// the stormy gloom).
export const HOT_TEMPERATURE_THRESHOLD_F = 80;
// Uniform warm-white wash opacity when "hot". Multiplied by the same zoom
// fade as the other lighting overlays so the wash disappears at city zoom.
export const HOT_WASH_OPACITY = 0.13;

// ============================================================================
// Night lighting (moon backlight)
// ============================================================================

// Night lighting (moon backlight).
// Implemented as DOM overlays (screen + multiply) so the lighting stays viewer-anchored
// and can be art-directed independently of the basemap.
export const NIGHT_GLOOM_WASH_OPACITY = 0;
export const NIGHT_MOONLIGHT_KEY_OPACITY = 0.48;
export const NIGHT_LOWER_LEFT_SHADOW_OPACITY = 0.94;
export const NIGHT_WARM_KEY_MIN_MUL = 0.04;
// Neutral night-only dimmer. This darkens the normal day-colored basemap without
// shifting land/ocean hues back toward a separate night palette.
export const NIGHT_DARK_WASH_OPACITY = 0.17;
// Keep the night basemap visually matched to the normal day map.
export const NIGHT_FACE_SHADE_OPACITY = 0;
// US night visibility: dot-only contact-lights tiles (not a heatmap). Kept
// well below 1 so the lights read as a soft glow rather than a stark
// NASA-earth-at-night photo (which feels eerie/lonely on its own).
export const NIGHT_US_LIGHTS_OPACITY = 0.55;
export const NIGHT_MOON_RIM_OPACITY = 0;
export const NIGHT_SHADOW_OVERLAY_MUL_MIN = 0.18;

// City-lights persistence: this is primarily a "zoomed out / from space" aesthetic.
// Fade out aggressively as we approach state/city zoom so it doesn't compete with markers.
export const NIGHT_LIGHTS_FADE_START_ZOOM = 3.7;
// Keep visible through a "medium" multi-state view, then drop off quickly before city-level zoom.
export const NIGHT_LIGHTS_FADE_END_ZOOM = 6.65;
// When the map first mounts, the lights tiles can appear in patches as they stream
// in. We keep the overlay hidden until the raster source reports "loaded", then
// fade it in so the first impression feels deliberate.
export const NIGHT_LIGHTS_LOAD_POLL_MS = 120;
export const NIGHT_LIGHTS_LOAD_FADE_MS = 750;
// Zoom interaction: hide while tiles stream, then fade back in quickly.
export const NIGHT_LIGHTS_ZOOM_LOAD_POLL_MS = 90;
export const NIGHT_LIGHTS_ZOOM_LOAD_FADE_MS = 320;
export const NIGHT_LIGHTS_ZOOM_LOAD_OUT_FADE_MS = 140;
// Keep lights present during zoom gestures (no "blink"), but dim slightly so
// intermediate overzoomed raster state is less noticeable.
export const NIGHT_LIGHTS_ZOOM_LOAD_DIM_FLOOR = 0.72;
// Intro animation: reveal left-to-right, then crossfade to the real tiles.
export const NIGHT_LIGHTS_INTRO_REVEAL_MS = 900;
export const NIGHT_LIGHTS_INTRO_CROSSFADE_MS = 260;

// Zoomed-out visibility: at the minimum zoom the US is only a few screen pixels wide,
// so we apply a small opacity lift so the dots still read as a faint glow.
export const NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM = MAP_MIN_ZOOM;
export const NIGHT_LIGHTS_ZOOM_OUT_LIFT_END_ZOOM = NIGHT_LIGHTS_FADE_START_ZOOM;
export const NIGHT_LIGHTS_ZOOM_OUT_LIFT_MAX = 0.62;
// Extra "bloom" pass: a low-zoom glow layer that makes the US read as sparkling
// from far zoom without turning the crisp dot layer into a blur.
export const NIGHT_LIGHTS_GLOW_OPACITY_MULT = 0.75;
// Fade the glow out by "medium" zoom so the pattern reads as city clusters, not
// a noisy texture. (We still keep the crisp dot layer.)
export const NIGHT_LIGHTS_GLOW_FADE_START_ZOOM = 3.2;
export const NIGHT_LIGHTS_GLOW_FADE_END_ZOOM = 4.2;
// Extra "space" glow: a short-lived boost that makes the US read from fully zoomed-out
// view, then disappears before any state-level interaction.
export const NIGHT_LIGHTS_SPACE_GLOW_OPACITY_MULT = 1.55;
// A second space-only pass (same tiles) to push the glow to be visible from "space"
// without changing the dot tile generation.
export const NIGHT_LIGHTS_SPACE_GLOW_EXTRA_PASS_OPACITY_MUL = 0.85;
export const NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM = MAP_MIN_ZOOM;
export const NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM = 3.55;

// Zoomed-in behavior: instead of many crisp points at mid zoom (which can read as "hair"),
// crossfade toward a very subtle, local glow pass.
export const NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM = 4.05;
export const NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM = 4.55;
export const NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM = 4.05;
export const NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM = 4.35;
export const NIGHT_LIGHTS_CLOSE_GLOW_OPACITY_MULT = 0.55;

// ============================================================================
// Night DOM overlay backgrounds
// ============================================================================

// Night key light: a cool, white-blue ambient wash from the upper-right so full
// night has its own moonlit direction instead of borrowing the daytime sun wash.
export const NIGHT_MOONLIGHT_KEY_BG = [
	'radial-gradient(ellipse 178% 150% at 112% -18%, rgba(255, 255, 255, 0.20) 0%, rgba(240, 250, 255, 0.15) 28%, rgba(219, 237, 255, 0.09) 55%, rgba(191, 216, 244, 0.035) 84%, rgba(191, 216, 244, 0) 100%)',
	'radial-gradient(ellipse 124% 104% at 86% 8%, rgba(247, 252, 255, 0.07) 0%, rgba(224, 240, 255, 0.052) 46%, rgba(206, 226, 248, 0.024) 78%, rgba(206, 226, 248, 0) 100%)',
	'radial-gradient(ellipse 152% 112% at 74% 30%, rgba(214, 231, 255, 0.034) 0%, rgba(186, 210, 238, 0.02) 58%, rgba(186, 210, 238, 0) 92%)',
].join(', ');

// Night counter-shade: a broad lower-left dark pool, opposite the daytime
// upper-left key / lower-right shadow so night reads as a distinct composition.
export const NIGHT_LOWER_LEFT_SHADOW_BG = [
	'radial-gradient(ellipse 162% 154% at -20% 114%, rgba(0, 3, 14, 0.80) 0%, rgba(2, 8, 26, 0.61) 28%, rgba(6, 15, 38, 0.38) 54%, rgba(10, 22, 50, 0.15) 78%, rgba(10, 22, 50, 0) 100%)',
	'radial-gradient(ellipse 100% 86% at 14% 80%, rgba(1, 5, 18, 0.32) 0%, rgba(5, 13, 34, 0.18) 48%, rgba(5, 13, 34, 0) 84%)',
].join(', ');

// Standby shade paint for the night overlay. The overlay opacity is kept at 0 so
// the visible night map stays matched to the normal daytime palette.
export const NIGHT_FACE_SHADE_BG =
	'radial-gradient(ellipse 145% 145% at 58% 60%, rgba(14, 22, 42, 0.32) 0%, rgba(14, 22, 42, 0.27) 30%, rgba(14, 22, 42, 0.17) 54%, rgba(14, 22, 42, 0.07) 70%, rgba(14, 22, 42, 0) 84%, rgba(14, 22, 42, 0) 100%)';

// Cinematic vignette: a viewport-anchored darkening at the corners that pulls the
// eye toward the globe at night. Multiplied so it composites with the deep-space
// color and the night map without crushing to pure black. The center is fully
// transparent for ~40% of the radius so the globe itself stays untouched.
export const NIGHT_VIGNETTE_OPACITY = 0.95;
export const NIGHT_VIGNETTE_BG =
	'radial-gradient(ellipse 110% 110% at 50% 50%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 38%, rgba(2, 6, 16, 0.10) 58%, rgba(1, 4, 12, 0.26) 78%, rgba(0, 2, 8, 0.46) 92%, rgba(0, 1, 5, 0.58) 100%)';

// Rear rim light: edge-weighted cool-white glow that reads as the moon sitting
// behind the Earth (not perfectly centered, shifted toward upper-left bias).
export const NIGHT_MOON_RIM_BG = [
	'radial-gradient(ellipse 178% 178% at 58% 60%, rgba(235, 248, 255, 0) 0%, rgba(235, 248, 255, 0) 62%, rgba(225, 242, 255, 0.05) 76%, rgba(232, 247, 255, 0.18) 86%, rgba(248, 253, 255, 0.62) 94%, rgba(248, 253, 255, 0.14) 100%)',
	'radial-gradient(ellipse 128% 128% at 58% 60%, rgba(235, 248, 255, 0) 0%, rgba(235, 248, 255, 0) 72%, rgba(226, 244, 255, 0.08) 82%, rgba(242, 251, 255, 0.50) 91%, rgba(255, 255, 255, 0.06) 97%, rgba(235, 248, 255, 0) 100%)',
	'radial-gradient(ellipse 78% 78% at 14% 14%, rgba(255, 255, 255, 0.14) 0%, rgba(230, 246, 255, 0.06) 26%, rgba(255, 255, 255, 0) 48%)',
].join(', ');

export const SUN_TRANSITION_SPACE_GLOW_BG = [
	'radial-gradient(ellipse 78% 58% at 8% 6%, rgba(255, 198, 116, 0.34) 0%, rgba(255, 162, 102, 0.18) 28%, rgba(255, 162, 102, 0.06) 54%, rgba(255, 162, 102, 0) 76%)',
	'radial-gradient(ellipse 58% 44% at 18% 14%, rgba(217, 86, 184, 0.18) 0%, rgba(142, 88, 210, 0.09) 42%, rgba(142, 88, 210, 0) 78%)',
	'radial-gradient(ellipse 120% 84% at -18% -14%, rgba(255, 238, 182, 0.13) 0%, rgba(255, 210, 150, 0.06) 48%, rgba(255, 210, 150, 0) 82%)',
].join(', ');

// NOTE: Night lights are generated offline as raster dot tiles (see scripts/generate_contact_lights_tiles.py).
