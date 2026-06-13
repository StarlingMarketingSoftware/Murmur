import mapboxgl from 'mapbox-gl';
import { formatCssColor, parseCssColor, parseHexColor } from './color';
import {
	BASEMAP_LABEL_HALO_BLUR,
	BASEMAP_LABEL_HALO_COLOR,
	BASEMAP_LABEL_HALO_WIDTH,
	BASEMAP_LABEL_TEXT_COLOR,
	BASEMAP_SETTLEMENT_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_LABEL_FADE_START_ZOOM,
	BASEMAP_STREET_LABEL_FADE_END_ZOOM,
	BASEMAP_STREET_LABEL_FADE_START_ZOOM,
	MAP_DEFAULT_ZOOM,
	MAP_LAND_CREAM,
	MAP_LANDCOVER_GREEN,
	MAP_OCEAN_BLUE,
	MAP_WORLD_LAND_LAYER_ID,
	MAP_WORLD_LAND_LOCAL_DATA_URL,
	MAP_WORLD_LAND_LOCAL_LAYER_ID,
	MAP_WORLD_LAND_LOCAL_MAX_ZOOM,
	MAP_WORLD_LAND_LOCAL_SOURCE_ID,
	MAP_WORLD_LAND_SOURCE_ID,
	MAP_WORLD_LAND_SOURCE_LAYER,
	MAP_WORLD_LAND_TILESET_URL,
	MURMUR_GLOBE_LIGHT_POLAR_DEG,
	MURMUR_GLOBE_LIGHT_VIEWER_AZIMUTH_OFFSET_DEG,
	NIGHT_CLOSE_FOG_ALPHA_DAY,
	NIGHT_CLOSE_FOG_ALPHA_NIGHT,
	NIGHT_HIDE_ROADS_END_T,
	NIGHT_HIDE_ROADS_RESTORE_END_ZOOM,
	NIGHT_HIDE_ROADS_RESTORE_START_ZOOM,
	NIGHT_HIDE_ROADS_START_T,
	NIGHT_SPACE_COLOR_DAY,
	NIGHT_SPACE_COLOR_NIGHT,
	NIGHT_STAR_INTENSITY_DAY,
	NIGHT_STAR_INTENSITY_NIGHT,
	UNSUBSCRIBE_BURN_AMBIENT_LIGHT_COLOR,
	UNSUBSCRIBE_BURN_AMBIENT_LIGHT_INTENSITY,
	UNSUBSCRIBE_BURN_CLOSE_FOG_COLOR,
	UNSUBSCRIBE_BURN_HIGH_COLOR_HOT,
	UNSUBSCRIBE_BURN_HIGH_COLOR_MID,
	UNSUBSCRIBE_BURN_HORIZON_BLEND,
	UNSUBSCRIBE_BURN_KEY_LIGHT_COLOR,
	UNSUBSCRIBE_BURN_KEY_LIGHT_INTENSITY,
	UNSUBSCRIBE_BURN_LAND_HOT,
	UNSUBSCRIBE_BURN_LAND_MID,
	UNSUBSCRIBE_BURN_LANDCOVER_HOT,
	UNSUBSCRIBE_BURN_LANDCOVER_MID,
	UNSUBSCRIBE_BURN_OCEAN_HOT,
	UNSUBSCRIBE_BURN_OCEAN_MID,
	UNSUBSCRIBE_BURN_SPACE_COLOR,
	UNSUBSCRIBE_BURN_STAR_INTENSITY,
} from './constants';
import { clamp, lerp } from './math';
import { scaleMapboxOpacityExpr } from './searchMode';
import type {
	BasemapCartographyClipState,
	GeoJsonGeometry,
	ParsedCssColor,
} from './types';

// ============================================================================
// Unsubscribe burn ("globe on fire") mixing
// ============================================================================

// The unsubscribe flow drives a burnT factor (0 = normal, 1 = apocalypse).
// Burn is composed as the *outermost* lerp: each applier below computes its
// normal day/night/mood output first, then mixes that result toward the burn
// targets — so the pipeline's frequent reapplications repaint the burn rather
// than wiping it, and burnT=0 stays identical to the unburned look.

// Linear shaping: the fire must read clearly from the very first unsubscribe
// step (the step levels themselves define the dramatic arc), so no easing
// that would suppress the low end. Kept as the single shaping hook in case
// the curve needs tuning later.
export const unsubscribeBurnEase = (burnT: number) => clamp(burnT, 0, 1);

// `mixCssColorString` only parses rgb()/rgba(); the basemap palette constants
// are hex, so the burn mixer accepts both.
const parseBurnColor = (value: string): ParsedCssColor | null => {
	const rgba = parseCssColor(value);
	if (rgba) return rgba;
	const hex = parseHexColor(value);
	return hex ? [hex.r, hex.g, hex.b, 1] : null;
};

const mixBurnColor = (from: string, to: string, t: number) => {
	const a = parseBurnColor(from);
	const b = parseBurnColor(to);
	if (!a || !b) return t < 0.5 ? from : to;
	const p = clamp(t, 0, 1);
	return formatCssColor([
		lerp(a[0], b[0], p),
		lerp(a[1], b[1], p),
		lerp(a[2], b[2], p),
		lerp(a[3], b[3], p),
	]);
};

// Three-stop ramp: base → mid (burnT 0.5) → hot (burnT 1).
const burnMixColor3 = (base: string, mid: string, hot: string, burnT: number) => {
	const b = unsubscribeBurnEase(burnT);
	return b <= 0.5 ? mixBurnColor(base, mid, b * 2) : mixBurnColor(mid, hot, (b - 0.5) * 2);
};

// ============================================================================
// Globe lighting (viewer-anchored softbox key + ambient)
// ============================================================================

export const applyMurmurGlobeLighting = (mapInstance: mapboxgl.Map, burnT = 0) => {
	try {
		const bearing =
			typeof mapInstance.getBearing === 'function' ? mapInstance.getBearing() : 0;
		const azimuth =
			(MURMUR_GLOBE_LIGHT_VIEWER_AZIMUTH_OFFSET_DEG + (bearing || 0) + 360) % 360;
		const polar = MURMUR_GLOBE_LIGHT_POLAR_DEG;
		const burn = unsubscribeBurnEase(burnT);

		(mapInstance as any).setLights?.([
			{
				id: 'murmur-ambient',
				type: 'ambient',
				properties: {
					color: mixBurnColor(
						'rgb(120, 150, 185)',
						UNSUBSCRIBE_BURN_AMBIENT_LIGHT_COLOR,
						burn
					),
					intensity: lerp(0.18, UNSUBSCRIBE_BURN_AMBIENT_LIGHT_INTENSITY, burn),
				},
			},
			{
				id: 'murmur-key',
				type: 'directional',
				properties: {
					color: mixBurnColor(
						'rgb(255, 244, 220)',
						UNSUBSCRIBE_BURN_KEY_LIGHT_COLOR,
						burn
					),
					intensity: lerp(1.6, UNSUBSCRIBE_BURN_KEY_LIGHT_INTENSITY, burn),
					direction: [azimuth, polar],
					'cast-shadows': true,
					'shadow-intensity': 0.95,
				},
			},
		]);
	} catch {
		// Non-fatal on older Mapbox styles that don't support setLights.
	}
};

// ============================================================================
// Palette + road opacity (night-aware)
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
// Visual night intentionally keeps the day basemap palette — the night look is
// driven by DOM overlays + globe lighting, not by recoloring tiles. This getter
// stays as a single source of truth for the basemap colors.
const getMapPalette = () => ({
	ocean: MAP_OCEAN_BLUE,
	land: MAP_LAND_CREAM,
	landcover: MAP_LANDCOVER_GREEN,
});

const getNightRoadHideT = (nightT: number, zoom: number) => {
	const night = clamp(nightT, 0, 1);
	if (night <= NIGHT_HIDE_ROADS_START_T) return 0;

	const t =
		night >= NIGHT_HIDE_ROADS_END_T
			? 1
			: (night - NIGHT_HIDE_ROADS_START_T) /
				(NIGHT_HIDE_ROADS_END_T - NIGHT_HIDE_ROADS_START_T);
	const nightHideT = t * t * (3 - 2 * t);

	if (zoom <= NIGHT_HIDE_ROADS_RESTORE_START_ZOOM) return nightHideT;
	if (zoom >= NIGHT_HIDE_ROADS_RESTORE_END_ZOOM) return 0;
	const zt =
		(zoom - NIGHT_HIDE_ROADS_RESTORE_START_ZOOM) /
		(NIGHT_HIDE_ROADS_RESTORE_END_ZOOM - NIGHT_HIDE_ROADS_RESTORE_START_ZOOM);
	const z2 = clamp(zt, 0, 1);
	const restoreT = z2 * z2 * (3 - 2 * z2);
	return nightHideT * (1 - restoreT);
};

// Per-map cache: snapshot the original `line-opacity` paint expression for each
// road layer the first time we touch it, so we can scale the original expression
// rather than overwriting it with a literal (which would lose Mapbox's built-in
// per-zoom opacity ramps).
const basemapRoadOpacityBaseByMap = new WeakMap<
	mapboxgl.Map,
	Map<string, any | null>
>();

const getBasemapRoadOpacityBase = (mapInstance: mapboxgl.Map, layerId: string) => {
	let byLayerId = basemapRoadOpacityBaseByMap.get(mapInstance);
	if (!byLayerId) {
		byLayerId = new Map();
		basemapRoadOpacityBaseByMap.set(mapInstance, byLayerId);
	}

	if (byLayerId.has(layerId)) return byLayerId.get(layerId) ?? null;

	try {
		const base = mapInstance.getPaintProperty(layerId, 'line-opacity') as any;
		byLayerId.set(layerId, base == null ? null : base);
		return base == null ? null : base;
	} catch {
		byLayerId.set(layerId, null);
		return null;
	}
};

// ============================================================================
// Fog + atmosphere (night-aware)
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
export const applyMapboxFogForMoodAndNight = (
	mapInstance: mapboxgl.Map,
	cfg: { fogColor: string; fogHighColor: string; fogHorizonBlend: number },
	nightT: number,
	burnT = 0
) => {
	try {
		const t = clamp(nightT, 0, 1);
		const existingFog = (mapInstance as any).getFog?.() ?? {};

		const starIntensity = lerp(NIGHT_STAR_INTENSITY_DAY, NIGHT_STAR_INTENSITY_NIGHT, t);
		const spaceColor = formatCssColor([
			lerp(NIGHT_SPACE_COLOR_DAY[0], NIGHT_SPACE_COLOR_NIGHT[0], t),
			lerp(NIGHT_SPACE_COLOR_DAY[1], NIGHT_SPACE_COLOR_NIGHT[1], t),
			lerp(NIGHT_SPACE_COLOR_DAY[2], NIGHT_SPACE_COLOR_NIGHT[2], t),
			1,
		]);

		// Scale only the alpha of the mood's chosen close-fog color so the hue
		// remains the mood's; we are dialing how *present* the limb mist is, not
		// recoloring it.
		const baseClose = parseCssColor(cfg.fogColor);
		const alphaScale = lerp(NIGHT_CLOSE_FOG_ALPHA_DAY, NIGHT_CLOSE_FOG_ALPHA_NIGHT, t);
		const closeFogColor = baseClose
			? formatCssColor([baseClose[0], baseClose[1], baseClose[2], baseClose[3] * alphaScale])
			: cfg.fogColor;

		// Unsubscribe burn: mix the composed values toward the burning
		// atmosphere. The rim (`high-color`) ramps deep-red then white-hot.
		const burn = unsubscribeBurnEase(burnT);

		(mapInstance as any).setFog?.({
			...existingFog,
			color: mixBurnColor(closeFogColor, UNSUBSCRIBE_BURN_CLOSE_FOG_COLOR, burn),
			'high-color': burnMixColor3(
				cfg.fogHighColor,
				UNSUBSCRIBE_BURN_HIGH_COLOR_MID,
				UNSUBSCRIBE_BURN_HIGH_COLOR_HOT,
				burnT
			),
			'horizon-blend': lerp(cfg.fogHorizonBlend, UNSUBSCRIBE_BURN_HORIZON_BLEND, burn),
			'star-intensity': lerp(starIntensity, UNSUBSCRIBE_BURN_STAR_INTENSITY, burn),
			'space-color': mixBurnColor(spaceColor, UNSUBSCRIBE_BURN_SPACE_COLOR, burn),
		});
	} catch {
		// Non-fatal.
	}
};

// ============================================================================
// Land/water/road palette application (per render frame)
// ============================================================================

export const applyNightLandPalette = (
	mapInstance: mapboxgl.Map,
	nightT: number,
	burnT = 0
) => {
	const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
	const basePalette = getMapPalette();
	// Unsubscribe burn: char the continents (cream → gray-brown → charcoal)
	// while the ocean holds its teal early on, per the reference design.
	const palette =
		burnT > 0
			? {
					ocean: burnMixColor3(
						basePalette.ocean,
						UNSUBSCRIBE_BURN_OCEAN_MID,
						UNSUBSCRIBE_BURN_OCEAN_HOT,
						burnT
					),
					land: burnMixColor3(
						basePalette.land,
						UNSUBSCRIBE_BURN_LAND_MID,
						UNSUBSCRIBE_BURN_LAND_HOT,
						burnT
					),
					landcover: burnMixColor3(
						basePalette.landcover,
						UNSUBSCRIBE_BURN_LANDCOVER_MID,
						UNSUBSCRIBE_BURN_LANDCOVER_HOT,
						burnT
					),
				}
			: basePalette;
	const roadOpacityMul = 1 - getNightRoadHideT(nightT, zoom);

	try {
		if (mapInstance.getLayer(MAP_WORLD_LAND_LAYER_ID)) {
			mapInstance.setPaintProperty(MAP_WORLD_LAND_LAYER_ID, 'fill-color', palette.land);
		}
		if (mapInstance.getLayer(MAP_WORLD_LAND_LOCAL_LAYER_ID)) {
			mapInstance.setPaintProperty(
				MAP_WORLD_LAND_LOCAL_LAYER_ID,
				'fill-color',
				palette.land
			);
		}
	} catch {
		// Non-fatal.
	}

	try {
		const style = mapInstance.getStyle();
		for (const layer of style.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id || id.startsWith('murmur-')) continue;

			const type = (layer as any).type as string | undefined;
			const sourceLayer = (layer as any)['source-layer'] as string | undefined;
			const idLower = id.toLowerCase();

			try {
				if (type === 'background') {
					mapInstance.setPaintProperty(id, 'background-color', palette.ocean);
				} else if (
					type === 'fill' &&
					(idLower === 'water' || idLower.startsWith('water'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.ocean);
				} else if (
					type === 'fill' &&
					(idLower.includes('landcover') ||
						idLower.includes('national-park') ||
						idLower.includes('pitch') ||
						idLower === 'park' ||
						idLower.startsWith('park'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.landcover);
				} else if (
					type === 'fill' &&
					(idLower.includes('landuse') || idLower === 'land')
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.land);
				} else if (
					type === 'line' &&
					(sourceLayer === 'road' ||
						idLower.includes('road') ||
						idLower.includes('motorway') ||
						idLower.includes('highway') ||
						idLower.includes('bridge') ||
						idLower.includes('tunnel'))
				) {
					const baseOpacity = getBasemapRoadOpacityBase(mapInstance, id);
					if (roadOpacityMul <= 0.001) {
						mapInstance.setPaintProperty(id, 'line-opacity', 0);
					} else if (baseOpacity == null) {
						mapInstance.setPaintProperty(id, 'line-opacity', roadOpacityMul);
					} else if (roadOpacityMul >= 0.999) {
						mapInstance.setPaintProperty(id, 'line-opacity', baseOpacity);
					} else {
						mapInstance.setPaintProperty(
							id,
							'line-opacity',
							scaleMapboxOpacityExpr(baseOpacity, roadOpacityMul)
						);
					}
				}
			} catch {
				// Data-driven color expression we can't override — skip.
			}
		}
	} catch {
		// Non-fatal.
	}
};

// ============================================================================
// One-time basemap setup (projection, fog, palette, label/border hides)
// ============================================================================

// Which base-style symbol layers we re-enable: city/town labels and the road
// label. Everything else (POI, transit, airport, natural, water, country,
// continent, Mapbox's own state label) stays hidden. Robust to Streets v12
// naming via id substring + `source-layer`.
const classifyBasemapLabelLayer = (
	idLower: string,
	sourceLayer: string | undefined
): 'settlement' | 'street' | null => {
	const src = (sourceLayer ?? '').toLowerCase();

	// Street/road name labels (v12: `road-label-simple`, source-layer `road`).
	// Exclude route shields / road numbers.
	if (
		(src === 'road' || idLower.includes('road-label')) &&
		idLower.includes('label') &&
		!idLower.includes('shield') &&
		!idLower.includes('number')
	) {
		return 'street';
	}

	// Settlement (city / town / village) labels (v12: settlement-*-label,
	// source-layer `place_label`). Exclude the larger geo labels that also live
	// in place_label (country/continent/state/marine).
	if (
		idLower.includes('settlement') ||
		((src === 'place_label' || idLower.includes('place-label')) &&
			!idLower.includes('country') &&
			!idLower.includes('continent') &&
			!idLower.includes('state') &&
			!idLower.includes('marine'))
	) {
		return 'settlement';
	}

	return null;
};

export const applyFreeTrialMapVisualTuning = (mapInstance: mapboxgl.Map) => {
	// Projection
	try {
		mapInstance.setProjection({ name: 'globe' } as any);
	} catch {
		// Non-fatal.
	}

	// Fog / atmosphere (subtle glow) — cooler, less saturated to match a Google-Earth-style tone.
	try {
		const existingFog = (mapInstance as any).getFog?.() ?? {};
		(mapInstance as any).setFog?.({
			...existingFog,
			color: 'rgba(180, 210, 215, 0.32)',
			'high-color': 'rgb(18, 44, 78)',
			'space-color': 'rgb(0, 0, 0)',
			'star-intensity': 0.9,
			'horizon-blend': 0.022,
		});
	} catch {
		// Non-fatal.
	}

	// Softbox key light, anchored to the viewer (not to the world). See
	// applyMurmurGlobeLighting for the bearing-compensation trick that keeps the
	// light on the viewer's upper-left regardless of how the globe is spun.
	applyMurmurGlobeLighting(mapInstance);

	// Basemap layer cleanup (hide words + borders; keep our layers) + cooler palette recolor.
	try {
		const style = mapInstance.getStyle();
		for (const layer of style.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id) continue;
			if (id.startsWith('murmur-')) continue;

			const type = (layer as any).type as string | undefined;
			const sourceLayer = (layer as any)['source-layer'] as string | undefined;
			const idLower = id.toLowerCase();

			// Text/icon labels — keep city/town + street labels, hide everything else.
			if (type === 'symbol') {
				const kind = classifyBasemapLabelLayer(idLower, sourceLayer);
				if (kind === null) {
					mapInstance.setLayoutProperty(id, 'visibility', 'none');
					continue;
				}

				// Keep visible + restyle for contrast against cream land / gray roads,
				// and gate to zoomed-in only via a Mapbox-native text-opacity ramp (so
				// it updates per-zoom with no extra render-frame hook).
				try {
					mapInstance.setLayoutProperty(id, 'visibility', 'visible');
					mapInstance.setPaintProperty(id, 'text-color', BASEMAP_LABEL_TEXT_COLOR);
					mapInstance.setPaintProperty(id, 'text-halo-color', BASEMAP_LABEL_HALO_COLOR);
					mapInstance.setPaintProperty(id, 'text-halo-width', BASEMAP_LABEL_HALO_WIDTH);
					mapInstance.setPaintProperty(id, 'text-halo-blur', BASEMAP_LABEL_HALO_BLUR);

					const [startZoom, endZoom] =
						kind === 'street'
							? [
									BASEMAP_STREET_LABEL_FADE_START_ZOOM,
									BASEMAP_STREET_LABEL_FADE_END_ZOOM,
								]
							: [
									BASEMAP_SETTLEMENT_LABEL_FADE_START_ZOOM,
									BASEMAP_SETTLEMENT_LABEL_FADE_END_ZOOM,
								];
					const fade = [
						'interpolate',
						['linear'],
						['zoom'],
						startZoom,
						0,
						endZoom,
						1,
					] as any;
					mapInstance.setPaintProperty(id, 'text-opacity', fade);
					// Settlement layers also carry an icon (the city-center dot). Fade it
					// on the same ramp so the dots don't litter the zoomed-out overview.
					mapInstance.setPaintProperty(id, 'icon-opacity', fade);
					// The opacity ramp hides the labels below startZoom, but the layers are
					// still "visible" there — glyphs get fetched and symbol layout/placement
					// runs in tiles where nothing is legible (boot zoom 4 included). Also
					// cull by zoom range so that work disappears entirely. Floor matters:
					// tiles lay out at their integer tile zoom, so a 6.5 minzoom would skip
					// layout in z6 tiles and break the 6.5→8 fade-in.
					const live = mapInstance.getLayer(id) as
						| { minzoom?: number; maxzoom?: number }
						| undefined;
					mapInstance.setLayerZoomRange(
						id,
						Math.max(live?.minzoom ?? 0, Math.floor(startZoom)),
						live?.maxzoom ?? 24
					);
				} catch {
					// Data-driven property we can't override — leave the layer as-is.
				}
				continue;
			}

			// Political/administrative boundaries (borders)
			if (
				type === 'line' &&
				(idLower.includes('admin') ||
					idLower.includes('boundary') ||
					idLower.includes('border'))
			) {
				mapInstance.setLayoutProperty(id, 'visibility', 'none');
				continue;
			}

			// Roads / highways — recolor to a soft light gray (lighter than state borders).
			if (
				type === 'line' &&
				(sourceLayer === 'road' ||
					idLower.includes('road') ||
					idLower.includes('motorway') ||
					idLower.includes('highway') ||
					idLower.includes('bridge') ||
					idLower.includes('tunnel'))
			) {
				try {
					mapInstance.setPaintProperty(id, 'line-color', '#E5E9EC');
				} catch {
					// Data-driven color expression we can't override — skip.
				}
				continue;
			}

			// Tone: shift the base palette toward a cooler, softer look (muted teal water,
			// warm cream land, sage vegetation). Wrapped per-layer so data-driven expressions
			// we can't overwrite just get skipped.
			try {
				if (type === 'background') {
					// Permanently ocean-blue so any untiled sphere (initial load, zoom-outs,
					// pans into untiled areas) reads as water. The cream land tone comes
					// from the `murmur-world-land-fill` layer added in ensureMapboxSourcesAndLayers.
					mapInstance.setPaintProperty(id, 'background-color', MAP_OCEAN_BLUE);
				} else if (
					type === 'fill' &&
					(idLower === 'water' || idLower.startsWith('water'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_OCEAN_BLUE);
				} else if (
					type === 'fill' &&
					(idLower.includes('landcover') ||
						idLower.includes('national-park') ||
						idLower.includes('pitch') ||
						idLower === 'park' ||
						idLower.startsWith('park'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LANDCOVER_GREEN);
				} else if (type === 'fill' && idLower.includes('landuse')) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LAND_CREAM);
				} else if (type === 'fill' && idLower === 'land') {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LAND_CREAM);
				}
			} catch {
				// Layer color isn't a plain literal — leave as-is.
			}
		}
	} catch {
		// Non-fatal.
	}
};

// ============================================================================
// World-land fill (cream continents under the ocean-blue background)
// ============================================================================

// Adds the local back-stop fill directly beneath the tileset fill (or, when the
// tileset layer is missing, beneath the first non-background basemap layer).
const ensureLocalWorldLandLayer = (mapInstance: mapboxgl.Map) => {
	try {
		if (!mapInstance.getSource(MAP_WORLD_LAND_LOCAL_SOURCE_ID)) return;
		if (mapInstance.getLayer(MAP_WORLD_LAND_LOCAL_LAYER_ID)) return;

		let beforeId: string | undefined;
		if (mapInstance.getLayer(MAP_WORLD_LAND_LAYER_ID)) {
			beforeId = MAP_WORLD_LAND_LAYER_ID;
		} else {
			const style = mapInstance.getStyle();
			for (const layer of style?.layers ?? []) {
				const id = (layer as any)?.id as string | undefined;
				if (!id) continue;
				if (id.startsWith('murmur-')) continue;
				if ((layer as any)?.type === 'background') continue;
				beforeId = id;
				break;
			}
		}

		mapInstance.addLayer(
			{
				id: MAP_WORLD_LAND_LOCAL_LAYER_ID,
				type: 'fill',
				source: MAP_WORLD_LAND_LOCAL_SOURCE_ID,
				paint: {
					'fill-color': MAP_LAND_CREAM,
					'fill-antialias': true,
				},
			} as any,
			beforeId
		);
	} catch {
		// Non-fatal.
	}
};

export const ensureWorldLandFill = (mapInstance: mapboxgl.Map) => {
	try {
		if (!mapInstance.getSource(MAP_WORLD_LAND_SOURCE_ID)) {
			mapInstance.addSource(MAP_WORLD_LAND_SOURCE_ID, {
				type: 'vector',
				url: MAP_WORLD_LAND_TILESET_URL,
			} as any);
		}
	} catch {
		// If source add fails (offline / token scoped out) the background stays
		// ocean-blue everywhere, which is a graceful degradation (the local
		// back-stop below still paints the continents).
	}

	// Local land back-stop (see MAP_WORLD_LAND_LOCAL_* constants): same cream,
	// inserted directly beneath the tileset fill so it only ever shows where
	// country-boundaries tiles haven't painted yet.
	try {
		if (!mapInstance.getSource(MAP_WORLD_LAND_LOCAL_SOURCE_ID)) {
			mapInstance.addSource(MAP_WORLD_LAND_LOCAL_SOURCE_ID, {
				type: 'geojson',
				data: MAP_WORLD_LAND_LOCAL_DATA_URL,
				maxzoom: MAP_WORLD_LAND_LOCAL_MAX_ZOOM,
			} as any);
		}
	} catch {
		// Non-fatal.
	}

	if (mapInstance.getLayer(MAP_WORLD_LAND_LAYER_ID)) {
		ensureLocalWorldLandLayer(mapInstance);
		return;
	}

	// Insert the land fill as the first layer above `background` so every other
	// Mapbox layer (water, landuse, roads, labels) draws on top. We can't assume
	// any particular layer name exists, so we look up the first non-background,
	// non-`murmur-` layer and insert before it.
	let beforeId: string | undefined;
	try {
		const style = mapInstance.getStyle();
		for (const layer of style?.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id) continue;
			if (id.startsWith('murmur-')) continue;
			if ((layer as any)?.type === 'background') continue;
			beforeId = id;
			break;
		}
	} catch {
		// Fall through — we'll just append without a `before` target.
	}

	try {
		mapInstance.addLayer(
			{
				id: MAP_WORLD_LAND_LAYER_ID,
				type: 'fill',
				source: MAP_WORLD_LAND_SOURCE_ID,
				'source-layer': MAP_WORLD_LAND_SOURCE_LAYER,
				paint: {
					'fill-color': MAP_LAND_CREAM,
					'fill-antialias': true,
				},
			} as any,
			beforeId
		);
	} catch {
		// Non-fatal.
	}

	ensureLocalWorldLandLayer(mapInstance);
};

// ============================================================================
// US-only basemap clipping (low-zoom: clip basemap labels/roads to US shape)
// ============================================================================

const getBasemapCartographyLayerIds = (mapInstance: mapboxgl.Map): string[] => {
	const layers = mapInstance.getStyle()?.layers ?? [];
	const ids: string[] = [];

	for (const layer of layers as any[]) {
		const id = layer?.id as string | undefined;
		if (!id) continue;
		// Never touch our custom layers.
		if (id.startsWith('murmur-')) continue;

		const type = layer?.type as string | undefined;
		if (type === 'symbol') {
			ids.push(id);
			continue;
		}
		if (type === 'line') {
			// Only clip *roads* (not coastlines/admin boundaries/etc) to avoid extra work.
			const sourceLayer = (layer?.['source-layer'] as string | undefined) ?? '';
			if (sourceLayer === 'road' || id.includes('road')) {
				ids.push(id);
			}
		}
	}

	return ids;
};

export const applyUsOnlyBasemapCartography = (
	mapInstance: mapboxgl.Map,
	usGeometry: Extract<GeoJsonGeometry, { type: 'MultiPolygon' }>,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) {
		clipState.layerIds = getBasemapCartographyLayerIds(mapInstance);
	}

	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) {
				const original = mapInstance.getFilter(id) as any;
				clipState.originalFilters.set(id, original ?? null);
			}

			const existingFilter = clipState.originalFilters.get(id) as any;
			const withinFilter = ['within', usGeometry] as any;
			const nextFilter = existingFilter
				? (['all', existingFilter, withinFilter] as any)
				: withinFilter;
			mapInstance.setFilter(id, nextFilter);
		} catch {
			// Ignore layers that disappear or can't be mutated.
		}
	}
};

export const restoreBasemapCartography = (
	mapInstance: mapboxgl.Map,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) return;
	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) continue;
			const original = clipState.originalFilters.get(id) ?? null;
			mapInstance.setFilter(id, original);
		} catch {
			// Ignore.
		}
	}
};
