'use client';

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { LatLngLiteral, PreparedClippingPolygon, RuntimeMoodVisualConfig } from './types';
import { drawCloudExtraPasses, getCloudsPolarFadeMask } from './clouds';
import {
	CLOUDS_CANVAS_SIZE_PX,
	CLOUDS_CANVAS_TEXTURE_URL,
	CLOUDS_DRIFT_AMPLITUDE_X_PX,
	CLOUDS_DRIFT_AMPLITUDE_Y_PX,
	CLOUDS_DRIFT_BASE_ZOOM,
	CLOUDS_DRIFT_LOOP_MS,
	CLOUDS_DRIFT_SPEED_X_PX_PER_S,
	CLOUDS_DRIFT_SPEED_Y_PX_PER_S,
	CLOUDS_DRIFT_TIME_SCALE,
	CLOUDS_DRIFT_UPDATE_MS,
	CLOUDS_DRIFT_ZOOM_SCALE_EXP,
	CLOUDS_DRIFT_ZOOM_SCALE_MAX,
	CLOUDS_DRIFT_ZOOM_SCALE_MIN,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX,
	CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED,
	CLOUDS_TURBULENCE_AMPLITUDE_X_PX,
	CLOUDS_TURBULENCE_LOOP_MS,
	CLOUDS_TURBULENCE_STRIP_PX,
	LIGHTNING_ALTITUDE_CLOSE_PX,
	LIGHTNING_ALTITUDE_GLOBE_PX,
	LIGHTNING_CANVAS_HEIGHT_PX,
	LIGHTNING_CANVAS_WIDTH_PX,
	LIGHTNING_CATCHLIGHT_OPACITY,
	LIGHTNING_CELL_RADIUS_CLOSE_PX,
	LIGHTNING_CELL_RADIUS_GLOBE_PX,
	LIGHTNING_CLUSTER_CHANCE_MAX,
	LIGHTNING_CLUSTER_CHANCE_MIN,
	LIGHTNING_DRAMATIC_STRIKE_CHANCE,
	LIGHTNING_FIRST_FLASH_MAX_INTERVAL_MS,
	LIGHTNING_FIRST_FLASH_MIN_INTERVAL_MS,
	LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM,
	LIGHTNING_MAX_ACTIVE_EVENTS,
	LIGHTNING_MAX_INTERVAL_MS,
	LIGHTNING_MERCATOR_MAX_LAT,
	LIGHTNING_MIN_INTERVAL_MS,
	LIGHTNING_OPACITY_MULTIPLIER,
	LIGHTNING_POTENTIAL_TEXTURE_URL,
	LIGHTNING_REGION_BIAS_CHANCE,
	LIGHTNING_RESTRIKE_MAX_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES,
	LIGHTNING_RESTRIKE_MIN_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES,
	LIGHTNING_SCALE_CLOSE_MAX,
	LIGHTNING_SCALE_CLOSE_MIN,
	LIGHTNING_SCALE_GLOBE_MAX,
	LIGHTNING_SCALE_GLOBE_MIN,
	LIGHTNING_SHEET_FLASH_CHANCE,
	LIGHTNING_STAMPS_COUNT,
	LIGHTNING_STORM_CELL_COUNT,
	LIGHTNING_US_BOUNDS,
	LIGHTNING_US_POSITION_TRIES,
	LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS,
	LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS,
	LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS,
	MAPBOX_SOURCE_IDS,
	MAP_DEFAULT_ZOOM,
	MAP_MIN_ZOOM,
	SAFARI_CLOUDS_DRIFT_UPDATE_MS,
	SAFARI_CLOUDS_IDLE_AFTER_MS,
	SAFARI_CLOUDS_IDLE_DRIFT_UPDATE_MS,
	SNOWFLAKE_STAMPS_COUNT,
	SNOW_BASE_FALL_PX_PER_S,
	SNOW_BASE_WIND_PX_PER_S,
	SNOW_CANVAS_SIZE_PX,
	SNOW_DENSITY_BAND_LOOP_MS,
	SNOW_EDDY_DRIFT_BASE_PX,
	SNOW_GUST_BAND_LOOP_MS,
	SNOW_GUST_PUSH_BASE_PX,
	SNOW_HIDE_AT_OR_ABOVE_ZOOM,
	SNOW_MAX_PARTICLES,
	SNOW_ROTATED_PARTICLE_DEPTH_MIN,
	SNOW_STAMP_ALPHA_MULTIPLIER,
	SNOW_STAMP_MAX_ALPHA,
	SNOW_STAMP_MAX_SIZE_PX,
	SNOW_STAMP_MIN_SIZE_PX,
	SNOW_TURBULENCE_LOOP_MS,
	SNOW_US_SIDE_CENTER_LNG,
	SNOW_US_SIDE_FADE_END_DEG,
	SNOW_US_SIDE_FADE_START_DEG,
	SNOW_WIND_SWAY_BASE_PX,
	defaultCenter,
} from './constants';
import {
	ensureLightningSourceAndLayer,
	ensureSnowSourceAndLayer,
} from './ensureMapboxSourcesAndLayers';
import { isLatLngInBbox } from './geometry';
import { LIGHTNING_STAMPS_URL, getLightningZoomedInT, getLightningZoomedOutBoostT } from './lightning';
import { uploadCanvasSourceOnce } from './mapInputFeel';
import {
	angularLngDistanceDeg,
	clamp,
	lerp,
	normalizeLngDeg,
	smoothstep,
} from './math';
import { CANVAS_PERF_MODE, IS_SAFARI } from './perfFlags';
import { pointInClippingPolygon } from './polygons';
import { SNOWFLAKE_STAMPS_URL } from './snow';
import {
	ClippingCoord,
	SnowCloudInteractionImpact,
	SnowParticle,
	StormLightningCell,
	StormLightningEvent,
	StormLightningEventKind,
	StormLightningPulse,
} from './types';
import type mapboxgl from 'mapbox-gl';

export interface UseWeatherCanvasAnimationParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	cloudsCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	cloudsCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	lightningCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	lightningCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	snowCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	snowCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	usStatesPolygonsRef: MutableRefObject<PreparedClippingPolygon[] | null>;
	// The active mood transition (null when idle) — the mood-gated asset
	// lifecycle reads its `to` config so assets exist before a fade-in becomes
	// visible.
	moodTransitionRef: MutableRefObject<{
		from: RuntimeMoodVisualConfig;
		to: RuntimeMoodVisualConfig;
		startMs: number;
		continuousMs: number;
		discreteMs: number;
	} | null>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
	weatherRegionCenterRef: MutableRefObject<LatLngLiteral | null>;
	snowCloudInteractionMultiplier: number;
	snowDebugEnabled: boolean;
}

// The clouds/lightning/snow canvas weather subsystem: texture bakes, the storm
// lightning simulation, snow particles + through-cloud interaction, and the one
// drift rAF loop, all inside a single [map, isMapLoaded] effect (its internal
// draw() -> drawLightning() -> drawSnow() order is load-bearing — never split).
// The ~49 texture/sim refs below are exclusively owned here; the canvas + ctx
// element refs stay in SearchResultsMap.tsx (map construction creates them and
// the layer registration binds them as sources).
export const useWeatherCanvasAnimation = (params: UseWeatherCanvasAnimationParams): void => {
	const {
		map,
		isMapLoaded,
		cloudsCanvasRef,
		cloudsCanvasCtxRef,
		lightningCanvasRef,
		lightningCanvasCtxRef,
		snowCanvasRef,
		snowCanvasCtxRef,
		interactiveFloorDeltaRef,
		usStatesPolygonsRef,
		moodTransitionRef,
		weatherMoodConfigRef,
		weatherRegionCenterRef,
		snowCloudInteractionMultiplier,
		snowDebugEnabled,
	} = params;
	const cloudsTextureImageRef = useRef<HTMLImageElement | null>(null);
	const cloudsTextureLoadPromiseRef = useRef<Promise<HTMLImageElement> | null>(null);
	const cloudsTextureScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureHazeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTexturePatternHazeRef = useRef<CanvasPattern | null>(null);
	const cloudsTexturePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTexturePatternSecondaryRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureSecondaryCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureSecondaryReadyRef = useRef<boolean>(false);
	const cloudsTextureStormCorePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureStormCoreCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureStormEdgePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureStormEdgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureStormReadyRef = useRef<boolean>(false);
	const cloudsTextureStormCoreGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(
		null
	);
	const cloudsTextureStormEdgeGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(
		null
	);
	const cloudsTextureGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(null);
	// Indexed by group (null = empty group). Retained so the per-group storm masks
	// can be rebuilt from getImageData if a storm mood re-enters after release.
	const cloudsTextureGroupCanvasesRef = useRef<(HTMLCanvasElement | null)[] | null>(
		null
	);
	// Per-group "mask build attempted" flags for the incremental (one group per
	// frame) storm-mask builder; null until a storm/cloudy mood first needs them.
	const cloudsTextureStormGroupMasksBuiltRef = useRef<boolean[] | null>(null);
	const cloudsTextureGroupReadyRef = useRef<boolean>(false);
	const cloudsTextureGroupDebugLoggedRef = useRef<boolean>(false);
	const cloudsTextureGroupDebugActiveLoggedRef = useRef<boolean>(false);
	const cloudsDriftGroupOffsetsRef = useRef<{ x: number; y: number }[]>([
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
	]);
	const cloudsDriftRafRef = useRef<number | null>(null);
	const cloudsDriftLastFrameMsRef = useRef<number>(0);
	const cloudsDriftLastCameraMoveMsRef = useRef<number>(0);
	const cloudsDriftOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const cloudsDriftOffsetSecondaryRef = useRef<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const cloudsDriftSimTimeMsRef = useRef<number>(0);
	const lightningStampImagesRef = useRef<HTMLImageElement[] | null>(null);
	const lightningStampLoadPromiseRef = useRef<Promise<HTMLImageElement[]> | null>(null);
	const lightningPotentialU8Ref = useRef<Uint8Array | null>(null);
	const lightningPotentialLoadPromiseRef = useRef<Promise<Uint8Array> | null>(null);
	const lightningEventsRef = useRef<StormLightningEvent[]>([]);
	const lightningStormCellsRef = useRef<StormLightningCell[] | null>(null);
	const lightningStormCellsKeyRef = useRef<string>('');
	const lightningNextFlashAtMsRef = useRef<number>(0);
	const lightningBurstRemainingRef = useRef<number>(0);
	const lightningRestrikeCellRef = useRef<StormLightningCell | null>(null);
	const lightningEventIdRef = useRef<number>(1);
	const lightningWasEnabledRef = useRef<boolean>(false);
	const lightningUploadWasActiveRef = useRef<boolean>(false);
	const snowUploadWasActiveRef = useRef<boolean>(false);
	const snowStampImagesRef = useRef<HTMLImageElement[] | null>(null);
	const snowStampLoadPromiseRef = useRef<Promise<HTMLImageElement[]> | null>(null);
	const snowParticlesRef = useRef<SnowParticle[] | null>(null);
	const cloudsSnowInteractionScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsSnowInteractionScratchCtxRef = useRef<CanvasRenderingContext2D | null>(
		null
	);
	const cloudsSnowInteractionThinStampRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsSnowInteractionGlowStampRef = useRef<HTMLCanvasElement | null>(null);
	// Subtle cloud drift so the overlay feels "alive" (especially in background globe mode).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}

		// Respect Reduce Motion by slowing the drift instead of fully disabling it.
		const motionScale = prefersReducedMotion ? 0.5 : 1;

		const cloudsCanvas = cloudsCanvasRef.current;
		const cloudsCtx = cloudsCanvasCtxRef.current;
		if (!cloudsCanvas || !cloudsCtx) return;

		// If we fell back to raster tiles (no canvas source), there is nothing to animate.
		const cloudsSource: any = (() => {
			try {
				return map.getSource(MAPBOX_SOURCE_IDS.clouds);
			} catch {
				return null;
			}
		})();
		const isCanvasSource = Boolean(
			cloudsSource && typeof cloudsSource.getCanvas === 'function'
		);
		if (!isCanvasSource) return;

		// Ensure Mapbox is actively sampling the canvas each frame.
		// In perf mode, the tick below re-uploads after each draw instead; keep the
		// source paused between ticks so the map can idle.
		try {
			cloudsSource.play?.();
			if (CANVAS_PERF_MODE) cloudsSource.pause?.();
		} catch {
			// Ignore.
		}

		// Mirror the same play() guarantee for the dedicated lightning canvas source.
		// In perf mode, skipped — the tick uploads the lightning/snow canvases only while
		// their weather visuals are actually active.
		if (!CANVAS_PERF_MODE) {
			try {
				const lightningSource: { play?: () => void } | null = (() => {
					try {
						return map.getSource(MAPBOX_SOURCE_IDS.lightning) as {
							play?: () => void;
						} | null;
					} catch {
						return null;
					}
				})();
				lightningSource?.play?.();
			} catch {
				// Ignore.
			}

			try {
				const snowSource: { play?: () => void } | null = (() => {
					try {
						return map.getSource(MAPBOX_SOURCE_IDS.snow) as { play?: () => void } | null;
					} catch {
						return null;
					}
				})();
				snowSource?.play?.();
			} catch {
				// Ignore.
			}
		}

		const loadTexture = (): Promise<HTMLImageElement> => {
			if (cloudsTextureImageRef.current)
				return Promise.resolve(cloudsTextureImageRef.current);
			if (cloudsTextureLoadPromiseRef.current) return cloudsTextureLoadPromiseRef.current;

			cloudsTextureLoadPromiseRef.current = new Promise((resolve, reject) => {
				try {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.decoding = 'async';
					img.onload = () => {
						const finalize = () => {
							cloudsTextureImageRef.current = img;
							resolve(img);
						};
						try {
							if (typeof img.decode === 'function') {
								img.decode().then(finalize).catch(finalize);
							} else {
								finalize();
							}
						} catch {
							finalize();
						}
					};
					img.onerror = () => reject(new Error('Failed to load clouds texture'));
					img.src = CLOUDS_CANVAS_TEXTURE_URL;
				} catch (e) {
					reject(e);
				}
			});

			return cloudsTextureLoadPromiseRef.current;
		};

		const loadImage = (src: string): Promise<HTMLImageElement> =>
			new Promise((resolve, reject) => {
				try {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.decoding = 'async';
					img.onload = () => {
						const finalize = () => resolve(img);
						try {
							if (typeof img.decode === 'function') {
								img.decode().then(finalize).catch(finalize);
							} else {
								finalize();
							}
						} catch {
							finalize();
						}
					};
					img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
					img.src = src;
				} catch (e) {
					reject(e);
				}
			});

		const loadLightningStamps = (): Promise<HTMLImageElement[]> => {
			if (lightningStampImagesRef.current) {
				return Promise.resolve(lightningStampImagesRef.current);
			}
			if (lightningStampLoadPromiseRef.current)
				return lightningStampLoadPromiseRef.current;

			lightningStampLoadPromiseRef.current = Promise.all(
				Array.from({ length: LIGHTNING_STAMPS_COUNT }, (_, i) =>
					loadImage(LIGHTNING_STAMPS_URL(i))
				)
			).then((imgs) => {
				lightningStampImagesRef.current = imgs;
				return imgs;
			});

			return lightningStampLoadPromiseRef.current;
		};

		const loadSnowStamps = (): Promise<HTMLImageElement[]> => {
			if (snowStampImagesRef.current) {
				return Promise.resolve(snowStampImagesRef.current);
			}
			if (snowStampLoadPromiseRef.current) return snowStampLoadPromiseRef.current;

			snowStampLoadPromiseRef.current = Promise.all(
				Array.from({ length: SNOWFLAKE_STAMPS_COUNT }, (_, i) =>
					loadImage(SNOWFLAKE_STAMPS_URL(i))
				)
			).then((imgs) => {
				snowStampImagesRef.current = imgs;
				return imgs;
			});

			return snowStampLoadPromiseRef.current;
		};

		const loadLightningPotential = (): Promise<Uint8Array> => {
			if (lightningPotentialU8Ref.current) {
				return Promise.resolve(lightningPotentialU8Ref.current);
			}
			if (lightningPotentialLoadPromiseRef.current)
				return lightningPotentialLoadPromiseRef.current;

			lightningPotentialLoadPromiseRef.current = loadImage(
				LIGHTNING_POTENTIAL_TEXTURE_URL
			)
				.then((img) => {
					if (typeof document === 'undefined') throw new Error('no document');

					let scratchCanvas = cloudsTextureScratchCanvasRef.current;
					if (!scratchCanvas) {
						scratchCanvas = document.createElement('canvas');
						scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
						scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
						cloudsTextureScratchCanvasRef.current = scratchCanvas;
					}

					const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const ctx = scratchCanvas.getContext('2d');
					if (!ctx) throw new Error('no 2d ctx');

					try {
						ctx.imageSmoothingEnabled = false;
					} catch {
						// Ignore.
					}

					ctx.clearRect(0, 0, w, h);
					ctx.drawImage(img, 0, 0, w, h);

					let imageData: ImageData | null = null;
					try {
						imageData = ctx.getImageData(0, 0, w, h);
					} catch {
						imageData = null;
					}
					if (!imageData) throw new Error('no image data');

					const src = imageData.data;
					const out = new Uint8Array(w * h);
					for (let p = 0, j = 3; p < out.length; p++, j += 4) out[p] = src[j];
					lightningPotentialU8Ref.current = out;
					return out;
				})
				.catch(() => {
					// Non-fatal; fall back to a uniform field (flashes can occur anywhere).
					const fallback = new Uint8Array(CLOUDS_CANVAS_SIZE_PX * CLOUDS_CANVAS_SIZE_PX);
					fallback.fill(255);
					lightningPotentialU8Ref.current = fallback;
					return fallback;
				});

			return lightningPotentialLoadPromiseRef.current;
		};

		let canceled = false;
		cloudsDriftOffsetRef.current = { x: 0, y: 0 };
		cloudsDriftOffsetSecondaryRef.current = { x: 0, y: 0 };
		cloudsDriftSimTimeMsRef.current = 0;
		// Lightweight deterministic noise helpers (shader-style hash + smooth interpolation).
		// Used to add gentle randomness without introducing pulsing opacity.
		const fract = (x: number) => x - Math.floor(x);
		const smoothstep01 = (t: number) => t * t * (3 - 2 * t);
		const hash01 = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
		const noise1D = (x: number) => {
			const i = Math.floor(x);
			const f = x - i;
			const a = hash01(i);
			const b = hash01(i + 1);
			const u = smoothstep01(f);
			return a + (b - a) * u;
		};

		const computePulseOpacity = (tMs: number, pulse: StormLightningPulse): number => {
			if (tMs < pulse.offsetMs) return 0;
			const local = tMs - pulse.offsetMs;
			if (local <= pulse.rampUpMs) {
				const t = pulse.rampUpMs > 0 ? local / pulse.rampUpMs : 1;
				return pulse.peakOpacity * clamp(t, 0, 1);
			}
			if (local <= pulse.rampUpMs + pulse.holdMs) return pulse.peakOpacity;
			const downT = local - pulse.rampUpMs - pulse.holdMs;
			if (downT >= pulse.rampDownMs) return 0;
			const t = pulse.rampDownMs > 0 ? 1 - downT / pulse.rampDownMs : 0;
			return pulse.peakOpacity * clamp(t, 0, 1);
		};

		const getCurrentLightningZoom = () => {
			try {
				return map.getZoom?.() ?? MAP_DEFAULT_ZOOM;
			} catch {
				return MAP_DEFAULT_ZOOM;
			}
		};

		const scheduleNextLightning = (
			nowMs: number,
			opts?: { fast?: boolean; zoom?: number }
		) => {
			const fast = Boolean(opts?.fast);
			const cfg = weatherMoodConfigRef.current;
			if (fast) {
				lightningBurstRemainingRef.current = 0;
				lightningRestrikeCellRef.current = null;
			}
			if (!fast && lightningBurstRemainingRef.current > 0) {
				lightningBurstRemainingRef.current -= 1;
				const wait =
					LIGHTNING_RESTRIKE_MIN_INTERVAL_MS +
					Math.random() *
						(LIGHTNING_RESTRIKE_MAX_INTERVAL_MS - LIGHTNING_RESTRIKE_MIN_INTERVAL_MS);
				lightningNextFlashAtMsRef.current = nowMs + wait;
				return;
			}
			lightningRestrikeCellRef.current = null;

			const baseMin = fast
				? LIGHTNING_FIRST_FLASH_MIN_INTERVAL_MS
				: LIGHTNING_MIN_INTERVAL_MS;
			const baseMax = fast
				? LIGHTNING_FIRST_FLASH_MAX_INTERVAL_MS
				: LIGHTNING_MAX_INTERVAL_MS;
			const boostT = getLightningZoomedOutBoostT(
				opts?.zoom ?? getCurrentLightningZoom(),
				interactiveFloorDeltaRef.current
			);
			const min = baseMin + (LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS - baseMin) * boostT;
			const max = baseMax + (LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS - baseMax) * boostT;
			const wait = min + Math.random() * Math.max(0, max - min);
			const clusterChance = lerp(
				LIGHTNING_CLUSTER_CHANCE_MIN,
				LIGHTNING_CLUSTER_CHANCE_MAX,
				clamp(cfg.lightningBurstiness, 0, 1)
			);
			if (!fast && Math.random() < clusterChance) {
				lightningBurstRemainingRef.current =
					LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES +
					Math.floor(
						Math.random() *
							(LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES -
								LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES +
								1)
					);
			}
			lightningNextFlashAtMsRef.current = nowMs + wait;
		};

		const lightningPotentialAlphaAt = (x: number, y: number, w: number, h: number) => {
			const potential = lightningPotentialU8Ref.current;
			if (!potential) return 255;
			const xi = ((Math.floor(x) % w) + w) % w;
			const yi = clamp(Math.floor(y), 0, h - 1);
			return potential[yi * w + xi] ?? 0;
		};

		const lngLatToLightningCanvasPoint = (
			lng: number,
			lat: number,
			w: number,
			h: number
		): { x: number; y: number } | null => {
			if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
			const xNorm = ((((lng + 180) / 360) % 1) + 1) % 1;
			const latClamped = clamp(
				lat,
				-LIGHTNING_MERCATOR_MAX_LAT,
				LIGHTNING_MERCATOR_MAX_LAT
			);
			const latRad = (latClamped * Math.PI) / 180;
			const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2;
			if (!Number.isFinite(mercatorY)) return null;
			return { x: xNorm * w, y: clamp(mercatorY, 0, 1) * h };
		};

		const lightningCanvasPointToLngLat = (
			x: number,
			y: number,
			w: number,
			h: number
		): { lng: number; lat: number } | null => {
			if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) return null;
			const lng = (((((x / w) * 360 - 180 + 180) % 360) + 360) % 360) - 180;
			const mercatorY = clamp(y / h, 0, 1);
			const latRad = 2 * Math.atan(Math.exp((1 - 2 * mercatorY) * Math.PI)) - Math.PI / 2;
			const lat = (latRad * 180) / Math.PI;
			return Number.isFinite(lat) && Number.isFinite(lng) ? { lng, lat } : null;
		};

		const isLngLatInLightningUsBounds = (lng: number, lat: number) => {
			const [west, south, east, north] = LIGHTNING_US_BOUNDS;
			return lng >= west && lng <= east && lat >= south && lat <= north;
		};

		const isLngLatInLightningUsRegion = (lng: number, lat: number) => {
			if (!isLngLatInLightningUsBounds(lng, lat)) return false;
			const prepared = usStatesPolygonsRef.current;
			if (!prepared || prepared.length === 0) return true;

			const point: ClippingCoord = [lng, lat];
			for (const { polygon, bbox } of prepared) {
				if (bbox && !isLatLngInBbox(lat, lng, bbox)) continue;
				if (pointInClippingPolygon(point, polygon)) return true;
			}
			return false;
		};

		const randomLightningUsCanvasPoint = (
			w: number,
			h: number
		): { x: number; y: number; alpha: number } => {
			const [west, south, east, north] = LIGHTNING_US_BOUNDS;
			let best: { x: number; y: number; alpha: number } | null = null;
			for (let i = 0; i < LIGHTNING_US_POSITION_TRIES; i++) {
				const lng = lerp(west, east, Math.random());
				const lat = lerp(south, north, Math.random());
				if (!isLngLatInLightningUsRegion(lng, lat)) continue;
				const point = lngLatToLightningCanvasPoint(lng, lat, w, h);
				if (!point) continue;
				const alpha = lightningPotentialAlphaAt(
					point.x,
					point.y,
					CLOUDS_CANVAS_SIZE_PX,
					CLOUDS_CANVAS_SIZE_PX
				);
				if (!best || alpha > best.alpha) best = { ...point, alpha };
				const acceptance = 0.12 + Math.pow(alpha / 255, 1.35) * 0.88;
				if (alpha >= 8 && Math.random() < acceptance) {
					return { ...point, alpha };
				}
			}
			return best ?? { x: w * 0.5, y: h * 0.5, alpha: 128 };
		};

		const getLightningAnchorCanvasPoint = (
			w: number,
			h: number
		): { x: number; y: number } | null => {
			const weatherCenter = weatherRegionCenterRef.current;
			if (
				weatherCenter &&
				Number.isFinite(weatherCenter.lat) &&
				Number.isFinite(weatherCenter.lng) &&
				isLngLatInLightningUsBounds(weatherCenter.lng, weatherCenter.lat)
			) {
				const point = lngLatToLightningCanvasPoint(
					weatherCenter.lng,
					weatherCenter.lat,
					w,
					h
				);
				if (point) return point;
			}

			return lngLatToLightningCanvasPoint(defaultCenter.lng, defaultCenter.lat, w, h);
		};

		const buildLightningStormCells = (w: number, h: number): StormLightningCell[] => {
			const weatherCenter = weatherRegionCenterRef.current;
			const key = `${w}x${h}:${weatherCenter?.lat?.toFixed(2) ?? 'none'}:${
				weatherCenter?.lng?.toFixed(2) ?? 'none'
			}`;
			if (lightningStormCellsKeyRef.current === key && lightningStormCellsRef.current) {
				return lightningStormCellsRef.current;
			}

			const cells: StormLightningCell[] = [];
			const anchor = getLightningAnchorCanvasPoint(w, h);
			if (anchor) {
				cells.push({
					x: anchor.x,
					y: anchor.y,
					weight: 1.25,
					radiusPx: LIGHTNING_CELL_RADIUS_GLOBE_PX * 0.92,
				});
			}

			while (cells.length < LIGHTNING_STORM_CELL_COUNT) {
				const point = randomLightningUsCanvasPoint(w, h);
				cells.push({
					x: point.x,
					y: point.y,
					weight: 0.55 + (point.alpha / 255) * 1.35 + Math.random() * 0.35,
					radiusPx: lerp(
						LIGHTNING_CELL_RADIUS_GLOBE_PX * 0.7,
						LIGHTNING_CELL_RADIUS_GLOBE_PX * 1.4,
						Math.random()
					),
				});
			}

			lightningStormCellsKeyRef.current = key;
			lightningStormCellsRef.current = cells;
			return cells;
		};

		const pickLightningCell = (
			w: number,
			h: number
		): { cell: StormLightningCell; index: number } => {
			const restrikeCell = lightningRestrikeCellRef.current;
			if (lightningBurstRemainingRef.current > 0 && restrikeCell) {
				return { cell: restrikeCell, index: -1 };
			}

			const cfg = weatherMoodConfigRef.current;
			const cells = buildLightningStormCells(w, h);
			const weatherBiasChance =
				LIGHTNING_REGION_BIAS_CHANCE * (1 - clamp(cfg.lightningSpread, 0, 1) * 0.72);
			if (cells[0] && Math.random() < weatherBiasChance) {
				return { cell: cells[0], index: 0 };
			}

			const total = cells.reduce((sum, cell, index) => {
				const weatherPenalty = index === 0 ? 0.8 : 1;
				return sum + Math.max(0.01, cell.weight * weatherPenalty);
			}, 0);
			let r = Math.random() * Math.max(0.01, total);
			for (let i = 0; i < cells.length; i++) {
				const weight = cells[i].weight * (i === 0 ? 0.8 : 1);
				r -= weight;
				if (r <= 0) return { cell: cells[i], index: i };
			}
			return { cell: cells[cells.length - 1], index: cells.length - 1 };
		};

		const pickLocalizedLightningPosition = (
			w: number,
			h: number,
			zoom: number
		): {
			x: number;
			y: number;
			cell: StormLightningCell;
			cellIndex: number;
			potentialAlpha: number;
		} => {
			const { cell, index: cellIndex } = pickLightningCell(w, h);

			const zoomT = getLightningZoomedInT(zoom);
			const spread = clamp(weatherMoodConfigRef.current.lightningSpread, 0, 1);
			const radius =
				lerp(LIGHTNING_CELL_RADIUS_GLOBE_PX, LIGHTNING_CELL_RADIUS_CLOSE_PX, zoomT) *
				lerp(0.88, 1.34, spread) *
				lerp(0.75, 1.15, Math.random()) *
				lerp(0.85, 1.15, clamp(cell.radiusPx / LIGHTNING_CELL_RADIUS_GLOBE_PX, 0, 1.4));
			let best: { x: number; y: number; alpha: number } | null = null;

			for (let i = 0; i < LIGHTNING_US_POSITION_TRIES; i++) {
				const angle = Math.random() * Math.PI * 2;
				const distance = Math.sqrt(Math.random()) * Math.max(4, radius);
				const x = clamp(cell.x + Math.cos(angle) * distance, 0, w);
				const y = clamp(cell.y + Math.sin(angle) * distance, 0, h);
				const lngLat = lightningCanvasPointToLngLat(x, y, w, h);
				if (!lngLat || !isLngLatInLightningUsRegion(lngLat.lng, lngLat.lat)) continue;
				const alpha = lightningPotentialAlphaAt(
					((x / w) * CLOUDS_CANVAS_SIZE_PX) % CLOUDS_CANVAS_SIZE_PX,
					(y / h) * CLOUDS_CANVAS_SIZE_PX,
					CLOUDS_CANVAS_SIZE_PX,
					CLOUDS_CANVAS_SIZE_PX
				);
				if (!best || alpha > best.alpha) best = { x, y, alpha };

				const acceptance = 0.1 + Math.pow(alpha / 255, 1.2) * 0.9;
				if (alpha >= 8 && Math.random() < acceptance) {
					return { x, y, cell, cellIndex, potentialAlpha: alpha };
				}
			}

			const fallback = best ?? cell;
			return {
				x: fallback.x,
				y: fallback.y,
				cell,
				cellIndex,
				potentialAlpha: 'alpha' in fallback ? fallback.alpha : 128,
			};
		};

		const pickLightningPosition = (
			w: number,
			h: number,
			zoom: number
		): {
			x: number;
			y: number;
			cell: StormLightningCell;
			cellIndex: number;
			potentialAlpha: number;
		} => {
			return pickLocalizedLightningPosition(w, h, zoom);
		};

		const spawnLightningEvent = (
			nowMs: number,
			w: number,
			h: number
		): StormLightningCell | null => {
			const stamps = lightningStampImagesRef.current;
			if (!Array.isArray(stamps) || stamps.length === 0) return null;

			const zoom = getCurrentLightningZoom();
			const boostT = getLightningZoomedOutBoostT(zoom, interactiveFloorDeltaRef.current);
			const maxActiveEvents = Math.round(
				LIGHTNING_MAX_ACTIVE_EVENTS +
					(LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS - LIGHTNING_MAX_ACTIVE_EVENTS) * boostT
			);
			const events = lightningEventsRef.current;
			if (events.length >= maxActiveEvents) return null;

			const { x, y, cell, cellIndex, potentialAlpha } = pickLightningPosition(w, h, zoom);
			const stampIndex = Math.floor(Math.random() * stamps.length);
			const zoomT = getLightningZoomedInT(zoom);
			const cloudOcclusion = clamp(potentialAlpha / 255, 0, 1);
			const baseScale =
				lerp(LIGHTNING_SCALE_GLOBE_MIN, LIGHTNING_SCALE_CLOSE_MIN, zoomT) +
				Math.random() *
					lerp(
						LIGHTNING_SCALE_GLOBE_MAX - LIGHTNING_SCALE_GLOBE_MIN,
						LIGHTNING_SCALE_CLOSE_MAX - LIGHTNING_SCALE_CLOSE_MIN,
						zoomT
					);
			const kindRoll = Math.random();
			const kind: StormLightningEventKind =
				kindRoll < LIGHTNING_DRAMATIC_STRIKE_CHANCE
					? 'dramatic'
					: kindRoll < LIGHTNING_DRAMATIC_STRIKE_CHANCE + LIGHTNING_SHEET_FLASH_CHANCE
						? 'sheet'
						: 'strike';
			const kindScale = kind === 'dramatic' ? 1.46 : kind === 'sheet' ? 1.28 : 1;
			const coreScale = baseScale * kindScale;
			const glowScale =
				coreScale * (kind === 'dramatic' ? 3.3 : kind === 'sheet' ? 4.6 : 2.75);
			const altitudePx =
				lerp(LIGHTNING_ALTITUDE_GLOBE_PX, LIGHTNING_ALTITUDE_CLOSE_PX, zoomT) *
				(kind === 'dramatic' ? 1.15 : kind === 'sheet' ? 1.35 : 0.85) *
				lerp(0.75, 1.25, Math.random());
			const rotationRad = (Math.random() - 0.5) * 0.55;
			const sheetRotationRad = (Math.random() - 0.5) * 0.9;
			const sheetScaleX =
				glowScale * (kind === 'sheet' ? lerp(1.85, 2.65, Math.random()) : 1.45);
			const sheetScaleY =
				glowScale * (kind === 'sheet' ? lerp(0.62, 0.95, Math.random()) : 0.86);
			const parallaxPhase = Math.random() * Math.PI * 2;

			const pulseCount = kind === 'dramatic' || Math.random() < 0.28 ? 3 : 2;
			const pulses: StormLightningPulse[] = [];
			for (let p = 0; p < pulseCount; p++) {
				const offsetMs = p === 0 ? 0 : 82 + p * (62 + Math.random() * 48);
				const basePeak = kind === 'dramatic' ? 0.78 : kind === 'sheet' ? 0.5 : 0.62;
				const peakOpacity = p === 0 ? basePeak : basePeak * (p === 1 ? 0.48 : 0.28);
				pulses.push({
					offsetMs,
					peakOpacity,
					rampUpMs: p === 0 ? 12 : 22,
					holdMs: p === 0 ? 18 : 8,
					rampDownMs: kind === 'sheet' ? 640 : kind === 'dramatic' ? 500 : 400,
					glowOpacityMultiplier:
						kind === 'sheet' ? 1.55 : kind === 'dramatic' ? 1.36 : 1.08,
				});
			}
			const endMs =
				nowMs +
				Math.max(
					0,
					...pulses.map((p) => p.offsetMs + p.rampUpMs + p.holdMs + p.rampDownMs)
				);

			events.push({
				id: lightningEventIdRef.current++,
				startMs: nowMs,
				endMs,
				kind,
				x,
				y,
				coreScale,
				glowScale,
				sheetScaleX,
				sheetScaleY,
				rotationRad,
				sheetRotationRad,
				stampIndex,
				cellIndex,
				jitterX: (Math.random() - 0.5) * 5,
				jitterY: (Math.random() - 0.5) * 5,
				altitudePx,
				parallaxPhase,
				cloudOcclusion,
				sheetDriftX: (Math.random() - 0.5) * altitudePx * 0.9,
				sheetDriftY: -altitudePx * lerp(0.6, 1.15, Math.random()),
				pulses,
			});
			if (lightningBurstRemainingRef.current > 0) {
				lightningRestrikeCellRef.current = cell;
			}
			return cell;
		};

		const drawLightning = (nowMs: number) => {
			const lightningCanvas = lightningCanvasRef.current;
			const lightningCtx = lightningCanvasCtxRef.current;
			if (!lightningCanvas || !lightningCtx) return;

			const w = lightningCanvas.width || LIGHTNING_CANVAS_WIDTH_PX;
			const h = lightningCanvas.height || LIGHTNING_CANVAS_HEIGHT_PX;
			try {
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}
			lightningCtx.clearRect(0, 0, w, h);

			const currentZoom = getCurrentLightningZoom();
			const zoomOk = currentZoom < LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM;
			const lightningIntensity = clamp(
				weatherMoodConfigRef.current.lightningIntensity,
				0,
				1
			);
			const canSpawnLightning =
				Boolean(weatherMoodConfigRef.current.lightning) && lightningIntensity > 0.001;

			const enabled = !prefersReducedMotion && lightningIntensity > 0.001 && zoomOk;

			if (!enabled) {
				lightningWasEnabledRef.current = false;
				if (lightningIntensity <= 0.001) {
					lightningEventsRef.current = [];
					lightningNextFlashAtMsRef.current = 0;
					lightningBurstRemainingRef.current = 0;
					lightningRestrikeCellRef.current = null;
				}
				return;
			}

			const justEnabled = !lightningWasEnabledRef.current;
			lightningWasEnabledRef.current = true;

			const stamps = lightningStampImagesRef.current;
			if (!Array.isArray(stamps) || stamps.length === 0) return;

			// Expire old events (tiny list; mutate in place).
			{
				const events = lightningEventsRef.current;
				for (let i = events.length - 1; i >= 0; i--) {
					if (events[i].endMs <= nowMs) events.splice(i, 1);
				}
			}

			if (!canSpawnLightning) {
				lightningNextFlashAtMsRef.current = 0;
				lightningBurstRemainingRef.current = 0;
			} else if (!lightningNextFlashAtMsRef.current) {
				scheduleNextLightning(nowMs, { fast: justEnabled, zoom: currentZoom });
			}
			if (canSpawnLightning && nowMs >= lightningNextFlashAtMsRef.current) {
				// Stamps now load lazily on mood entry; if a flash slot fires while
				// the fetch is still in flight, retry on the short first-flash
				// cadence instead of burning a full normal interval — keeps the
				// first storm flash prompt on cold caches without preloading.
				if (
					!Array.isArray(lightningStampImagesRef.current) ||
					lightningStampImagesRef.current.length === 0
				) {
					scheduleNextLightning(nowMs, { fast: true, zoom: currentZoom });
					return;
				}
				const spawnCount =
					Math.random() <
					0.08 *
						getLightningZoomedOutBoostT(currentZoom, interactiveFloorDeltaRef.current)
						? 2
						: 1;
				let lastCell: StormLightningCell | null = null;
				for (let i = 0; i < spawnCount; i++) {
					const spawnedCell = spawnLightningEvent(
						nowMs + i * (55 + Math.random() * 70),
						w,
						h
					);
					if (spawnedCell) lastCell = spawnedCell;
				}
				scheduleNextLightning(nowMs, { zoom: currentZoom });
				if (lightningBurstRemainingRef.current > 0 && lastCell) {
					lightningRestrikeCellRef.current = lastCell;
				}
			}

			const events = lightningEventsRef.current;
			if (events.length === 0) return;

			const drawStamp = (
				stamp: HTMLImageElement,
				x: number,
				y: number,
				scale: number,
				rotation: number,
				alpha: number
			) => {
				const sw = stamp.naturalWidth || stamp.width || 256;
				const sh = stamp.naturalHeight || stamp.height || 256;
				const dw = sw * scale;
				const dh = sh * scale;

				lightningCtx.globalAlpha = alpha;
				lightningCtx.translate(x, y);
				lightningCtx.rotate(rotation);
				lightningCtx.drawImage(stamp, -dw * 0.5, -dh * 0.5, dw, dh);
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			};

			const drawEllipticalGlow = (
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				radiusX: number,
				radiusY: number,
				rotation: number,
				alpha: number,
				color: [number, number, number]
			) => {
				if (alpha <= 0.001 || radiusX <= 0 || radiusY <= 0) return;
				ctx.save();
				try {
					ctx.translate(x, y);
					ctx.rotate(rotation);
					ctx.scale(radiusX, radiusY);
					const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
					const r = Math.round(color[0]);
					const g = Math.round(color[1]);
					const b = Math.round(color[2]);
					gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
					gradient.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${alpha * 0.48})`);
					gradient.addColorStop(0.68, `rgba(${r}, ${g}, ${b}, ${alpha * 0.12})`);
					gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
					ctx.fillStyle = gradient;
					ctx.beginPath();
					ctx.arc(0, 0, 1, 0, Math.PI * 2);
					ctx.fill();
				} catch {
					// Ignore.
				} finally {
					ctx.restore();
				}
			};

			const drawCloudCatchlight = (
				x: number,
				y: number,
				radiusX: number,
				radiusY: number,
				rotation: number,
				alpha: number,
				color: [number, number, number]
			) => {
				if (alpha <= 0.001) return;
				const cw = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const ch = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const cx = (x / w) * cw;
				const cy = (y / h) * ch;
				const rx = (radiusX / w) * cw;
				const ry = (radiusY / h) * ch;
				const prevOp = cloudsCtx.globalCompositeOperation;
				const prevAlpha = cloudsCtx.globalAlpha;
				cloudsCtx.globalCompositeOperation = 'lighter';
				cloudsCtx.globalAlpha = 1;
				drawEllipticalGlow(cloudsCtx, cx, cy, rx, ry, rotation, alpha, color);
				cloudsCtx.globalCompositeOperation = prevOp;
				cloudsCtx.globalAlpha = prevAlpha;
			};

			lightningCtx.save();
			try {
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}
			const prevOp = lightningCtx.globalCompositeOperation;
			const prevFilter = lightningCtx.filter;
			const prevShadowBlur = lightningCtx.shadowBlur;
			const prevShadowColor = lightningCtx.shadowColor;
			const tint = weatherMoodConfigRef.current.lightningTint;
			const tintColor = `rgba(${Math.round(tint[0])}, ${Math.round(
				tint[1]
			)}, ${Math.round(tint[2])}, 0.72)`;
			lightningCtx.globalCompositeOperation = 'lighter';

			for (const e of events) {
				const t = nowMs - e.startMs;
				let a = 0;
				let glowA = 0;
				for (const p of e.pulses) {
					const pulseA = computePulseOpacity(t, p);
					a += pulseA;
					glowA += pulseA * p.glowOpacityMultiplier;
				}
				if (a <= 0.001) continue;
				a = clamp(a * LIGHTNING_OPACITY_MULTIPLIER * lightningIntensity, 0, 0.95);
				const occlusion = clamp(e.cloudOcclusion, 0, 1);
				glowA = clamp(glowA * (0.34 + occlusion * 0.38) * lightningIntensity, 0, 0.86);

				const stamp = stamps[e.stampIndex % stamps.length];
				const sw = stamp.naturalWidth || stamp.width || 256;
				const pulseDriftT = clamp(t / Math.max(1, e.endMs - e.startMs), 0, 1);
				const altitudeX =
					Math.cos(e.parallaxPhase) * e.altitudePx * 0.32 + e.altitudePx * 0.24;
				const altitudeY = -e.altitudePx * (0.72 + Math.sin(e.parallaxPhase) * 0.18);
				const sheetX = e.x + altitudeX + e.sheetDriftX * pulseDriftT;
				const sheetY = e.y + altitudeY + e.sheetDriftY * pulseDriftT;
				const coreX = e.x + altitudeX * 0.42 + e.jitterX * pulseDriftT;
				const coreY = e.y + altitudeY * 0.34 + e.jitterY * pulseDriftT;
				const sheetRadiusX = sw * e.sheetScaleX;
				const sheetRadiusY = sw * e.sheetScaleY;
				const sheetAlpha =
					glowA * (e.kind === 'sheet' ? 1.12 : e.kind === 'dramatic' ? 0.9 : 0.72);
				const boltAlpha =
					e.kind === 'sheet'
						? a * 0.06 * (1 - occlusion * 0.45)
						: a * lerp(0.86, 0.42, occlusion);

				drawCloudCatchlight(
					sheetX,
					sheetY,
					sheetRadiusX * 0.58,
					sheetRadiusY * 0.7,
					e.sheetRotationRad,
					sheetAlpha * LIGHTNING_CATCHLIGHT_OPACITY,
					tint
				);

				drawEllipticalGlow(
					lightningCtx,
					sheetX,
					sheetY,
					sheetRadiusX,
					sheetRadiusY,
					e.sheetRotationRad,
					sheetAlpha * 0.72,
					tint
				);
				drawEllipticalGlow(
					lightningCtx,
					sheetX + altitudeX * 0.35,
					sheetY + altitudeY * 0.25,
					sheetRadiusX * 0.46,
					sheetRadiusY * 0.55,
					e.sheetRotationRad + 0.2,
					sheetAlpha * 0.45,
					[255, 252, 242]
				);

				try {
					lightningCtx.filter = 'blur(2.4px)';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 18 : 10;
				lightningCtx.shadowColor = tintColor;
				if (e.kind !== 'sheet') {
					drawStamp(stamp, coreX, coreY, e.glowScale, e.rotationRad, glowA * 0.42);
				}
				try {
					lightningCtx.filter = 'blur(0.7px)';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 10 : 5;
				if (e.kind !== 'sheet') {
					drawStamp(stamp, coreX, coreY, e.glowScale * 0.54, e.rotationRad, glowA * 0.5);
				}
				try {
					lightningCtx.filter = 'none';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 4 : 1.5;
				drawStamp(stamp, coreX, coreY, e.coreScale, e.rotationRad, boltAlpha);
			}

			lightningCtx.globalCompositeOperation = prevOp;
			try {
				lightningCtx.filter = prevFilter;
			} catch {
				// Ignore.
			}
			lightningCtx.shadowBlur = prevShadowBlur;
			lightningCtx.shadowColor = prevShadowColor;
			lightningCtx.restore();
		};

		const buildSnowParticles = (): SnowParticle[] => {
			if (snowParticlesRef.current) return snowParticlesRef.current;

			const particles = Array.from({ length: SNOW_MAX_PARTICLES }, (_, i) => {
				const seed = 9000.5 + i * 131.7;
				const depth = Math.pow(hash01(seed + 3.1), 0.72);
				return {
					x: hash01(seed + 11.3) * SNOW_CANVAS_SIZE_PX,
					y: hash01(seed + 23.7) * SNOW_CANVAS_SIZE_PX,
					depth,
					size: lerp(0.56, 1.42, depth) * lerp(0.78, 1.14, hash01(seed + 37.9)),
					opacity: lerp(0.22, 0.58, depth) * lerp(0.66, 1.0, hash01(seed + 49.2)),
					fallSpeed: lerp(0.52, 1.45, depth) * lerp(0.8, 1.16, hash01(seed + 61.5)),
					windSpeed:
						lerp(0.18, 0.95, hash01(seed + 73.4)) * (hash01(seed + 83.9) < 0.44 ? -1 : 1),
					windSway: lerp(0.45, 1.4, hash01(seed + 89.6)) * lerp(0.72, 1.28, depth),
					windPhase: hash01(seed + 92.8) * Math.PI * 2,
					gustResponsiveness:
						lerp(0.34, 1.18, hash01(seed + 94.2)) * lerp(0.78, 1.24, depth),
					wobble: lerp(0.7, 4.2, depth) * lerp(0.7, 1.2, hash01(seed + 97.6)),
					wobblePhase: hash01(seed + 109.8) * Math.PI * 2,
					stampIndex: Math.floor(hash01(seed + 121.1) * SNOWFLAKE_STAMPS_COUNT),
					turbulenceSeed: hash01(seed + 133.6) * 900,
					gustSeed: hash01(seed + 147.4) * 900,
					densitySeed: hash01(seed + 159.8),
					scaleJitter: lerp(0.86, 1.16, hash01(seed + 171.2)),
					stretch: lerp(0.92, 1.08, hash01(seed + 183.5)),
					rotation: hash01(seed + 197.1) * Math.PI * 2,
					rotationSpeed: lerp(-0.018, 0.018, hash01(seed + 211.6)),
				};
			});

			snowParticlesRef.current = particles;
			return particles;
		};

		const ensureCloudsSnowInteractionAssets = (cw: number, ch: number) => {
			if (typeof document === 'undefined') return null;

			let scratchCanvas = cloudsSnowInteractionScratchCanvasRef.current;
			if (!scratchCanvas) {
				scratchCanvas = document.createElement('canvas');
				cloudsSnowInteractionScratchCanvasRef.current = scratchCanvas;
				cloudsSnowInteractionScratchCtxRef.current = scratchCanvas.getContext('2d');
			}
			if (!scratchCanvas) return null;
			if (scratchCanvas.width !== cw) scratchCanvas.width = cw;
			if (scratchCanvas.height !== ch) scratchCanvas.height = ch;

			let scratchCtx = cloudsSnowInteractionScratchCtxRef.current;
			if (!scratchCtx) {
				scratchCtx = scratchCanvas.getContext('2d');
				cloudsSnowInteractionScratchCtxRef.current = scratchCtx;
			}
			if (!scratchCtx) return null;

			try {
				scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
				scratchCtx.imageSmoothingEnabled = true;
				scratchCtx.imageSmoothingQuality = 'high';
			} catch {
				// Ignore.
			}

			const createRadialStamp = (rgb: [number, number, number]) => {
				const canvas = document.createElement('canvas');
				canvas.width = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				canvas.height = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				const ctx = canvas.getContext('2d');
				if (!ctx) return null;
				const s = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				const [r, g, b] = rgb;
				const gradient = ctx.createRadialGradient(
					s * 0.5,
					s * 0.5,
					0,
					s * 0.5,
					s * 0.5,
					s * 0.5
				);
				gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
				gradient.addColorStop(0.24, `rgba(${r}, ${g}, ${b}, 0.58)`);
				gradient.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.16)`);
				gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
				ctx.clearRect(0, 0, s, s);
				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, s, s);
				return canvas;
			};

			if (!cloudsSnowInteractionThinStampRef.current) {
				cloudsSnowInteractionThinStampRef.current = createRadialStamp([0, 0, 0]);
			}
			if (!cloudsSnowInteractionGlowStampRef.current) {
				cloudsSnowInteractionGlowStampRef.current = createRadialStamp([250, 252, 255]);
			}

			const thinStamp = cloudsSnowInteractionThinStampRef.current;
			const glowStamp = cloudsSnowInteractionGlowStampRef.current;
			if (!thinStamp || !glowStamp) return null;
			return { scratchCanvas, scratchCtx, thinStamp, glowStamp };
		};

		const applySnowCloudInteraction = (
			impacts: SnowCloudInteractionImpact[],
			snowW: number,
			snowH: number,
			strength: number
		) => {
			if (impacts.length === 0) return;
			if (strength <= 0.001) return;

			const cw = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
			const ch = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
			const assets = ensureCloudsSnowInteractionAssets(cw, ch);
			if (!assets) return;
			const { scratchCanvas, scratchCtx, thinStamp, glowStamp } = assets;

			// Snapshot clouds so we can re-sample without feedback while distorting.
			scratchCtx.clearRect(0, 0, cw, ch);
			scratchCtx.drawImage(cloudsCanvas, 0, 0, cw, ch);

			const scaleX = cw / Math.max(1, snowW);
			const scaleY = ch / Math.max(1, snowH);
			const scale = (scaleX + scaleY) * 0.5;
			const maxShift = CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX;

			const prevAlpha = cloudsCtx.globalAlpha;
			const prevOp = cloudsCtx.globalCompositeOperation;
			let prevFilter: string | null = null;
			try {
				prevFilter = cloudsCtx.filter;
			} catch {
				prevFilter = null;
			}

			try {
				cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}

			// Pass 1: tiny refraction shear in-place (keeps it feeling like distortion, not a reveal).
			try {
				cloudsCtx.globalCompositeOperation = 'source-over';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'blur(0.95px)';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
				const a = alpha * 0.18;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 8, 38);
				const driftBias = Math.tanh((impact.driftXPx * scaleX) / 6);
				const warpX = clamp(driftBias * maxShift, -maxShift, maxShift);
				const warpY = -clamp((0.65 + impact.depth) * 0.9, 0.6, 1.9);

				const srcX0 = cx - r;
				const srcY0 = cy - r;
				const srcW = r * 2;
				const srcH = r * 2;
				const srcX = clamp(srcX0, 0, cw - srcW);
				const srcY = clamp(srcY0, 0, ch - srcH);
				const srcDx = srcX - srcX0;
				const srcDy = srcY - srcY0;

				cloudsCtx.save();
				cloudsCtx.beginPath();
				cloudsCtx.ellipse(cx, cy, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
				cloudsCtx.clip();
				cloudsCtx.globalAlpha = a;
				cloudsCtx.drawImage(
					scratchCanvas,
					srcX,
					srcY,
					srcW,
					srcH,
					cx - r + warpX + srcDx,
					cy - r + warpY + srcDy,
					srcW,
					srcH
				);
				cloudsCtx.restore();
			}

			// Pass 2: feathered thinning so the snow layer reads through cloud density.
			// We draw a trailing column per impact (from impact up into the cloud deck) so the
			// entire fall path of each flake reads as a gentle, vertical parting of clouds.
			try {
				cloudsCtx.globalCompositeOperation = 'destination-out';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'none';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
				const a = alpha * 0.56;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 9, 44);
				const drift = clamp(Math.tanh((impact.driftXPx * scaleX) / 12) * 1.8, -1.8, 1.8);

				// Trailing vertical column — three staggered stamps so the wake feels
				// continuous and "snow-shaped" rather than a circular punch.
				const columnW = r * 2.15;
				const columnHBase = r * 3.2;
				const columns = [
					{ dyMul: -0.25, alphaMul: 1.0, scaleMul: 1.0 },
					{ dyMul: -1.1, alphaMul: 0.78, scaleMul: 1.08 },
					{ dyMul: -2.0, alphaMul: 0.52, scaleMul: 1.18 },
					{ dyMul: -2.9, alphaMul: 0.3, scaleMul: 1.28 },
				];
				for (const seg of columns) {
					cloudsCtx.globalAlpha = a * seg.alphaMul;
					const segW = columnW * seg.scaleMul;
					const segH = columnHBase * seg.scaleMul;
					const segX = cx + drift * Math.abs(seg.dyMul) * 0.45;
					const segY = cy + r * seg.dyMul;
					cloudsCtx.drawImage(
						thinStamp,
						segX - segW * 0.5,
						segY - segH * 0.5,
						segW,
						segH
					);
				}
			}

			// Pass 3: a faint cool bloom so the “through-cloud” snow reads without getting literal.
			try {
				cloudsCtx.globalCompositeOperation = 'lighter';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'blur(1.25px)';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
				const a = alpha * 0.13;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 8, 38);

				cloudsCtx.globalAlpha = a;
				const glowW = r * 2.4;
				const glowH = r * 3.65;
				const glowY = cy - r * 0.62;
				cloudsCtx.drawImage(
					glowStamp,
					cx - glowW * 0.5,
					glowY - glowH * 0.5,
					glowW,
					glowH
				);
			}

			cloudsCtx.globalAlpha = prevAlpha;
			cloudsCtx.globalCompositeOperation = prevOp;
			if (prevFilter != null) {
				try {
					cloudsCtx.filter = prevFilter;
				} catch {
					// Ignore.
				}
			}
		};

		const drawSnow = (tMs: number) => {
			const snowCanvas = snowCanvasRef.current;
			const snowCtx = snowCanvasCtxRef.current;
			if (!snowCanvas || !snowCtx) return;

			const w = snowCanvas.width || SNOW_CANVAS_SIZE_PX;
			const h = snowCanvas.height || SNOW_CANVAS_SIZE_PX;
			try {
				snowCtx.setTransform(1, 0, 0, 1, 0, 0);
				snowCtx.imageSmoothingEnabled = true;
				snowCtx.imageSmoothingQuality = 'high';
			} catch {
				// Ignore.
			}
			snowCtx.clearRect(0, 0, w, h);

			const cfg = weatherMoodConfigRef.current;
			if (cfg.snowOpacity <= 0.001 || cfg.snowDensity <= 0.001) return;
			const stamps = snowStampImagesRef.current;
			const hasStamps = Array.isArray(stamps) && stamps.length > 0;

			let currentZoom = MAP_DEFAULT_ZOOM;
			try {
				currentZoom = map.getZoom?.() ?? MAP_DEFAULT_ZOOM;
			} catch {
				currentZoom = MAP_DEFAULT_ZOOM;
			}
			if (currentZoom >= SNOW_HIDE_AT_OR_ABOVE_ZOOM) return;

			const particles = buildSnowParticles();
			const densityScale = prefersReducedMotion ? 0.55 : 1;
			const visibleCount = Math.min(
				particles.length,
				Math.max(
					0,
					Math.round(particles.length * clamp(cfg.snowDensity, 0, 1) * densityScale)
				)
			);
			if (visibleCount <= 0) return;

			const interactionTarget = prefersReducedMotion
				? CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED
				: CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS;
			const interactionStride = Math.max(
				1,
				Math.floor(visibleCount / Math.max(1, interactionTarget))
			);
			const impacts: SnowCloudInteractionImpact[] = [];

			const tS = tMs / 1000;
			const motionMul = prefersReducedMotion ? 0.42 : 1;
			const turbulenceMul = prefersReducedMotion ? 0.36 : 1;
			const fallPx = SNOW_BASE_FALL_PX_PER_S * clamp(cfg.snowFallSpeed, 0, 2) * motionMul;
			const windPx = SNOW_BASE_WIND_PX_PER_S * clamp(cfg.snowWind, -2, 2) * motionMul;
			const parallax = clamp(cfg.snowDepthParallax, 0, 1.5);
			const turbulenceT = tMs / SNOW_TURBULENCE_LOOP_MS;
			const gustT = tMs / SNOW_GUST_BAND_LOOP_MS;
			const densityT = tMs / SNOW_DENSITY_BAND_LOOP_MS;
			const wrap = (value: number, span: number, margin: number) =>
				((((value + margin) % (span + margin * 2)) + span + margin * 2) %
					(span + margin * 2)) -
				margin;

			snowCtx.save();
			try {
				snowCtx.globalCompositeOperation = 'source-over';
				try {
					snowCtx.filter = 'none';
				} catch {
					// Ignore.
				}

				for (let i = 0; i < visibleCount; i++) {
					const p = particles[i];
					const stamp = hasStamps ? stamps[p.stampIndex % stamps.length] : null;
					const depthScale = lerp(0.86, 1.12, p.depth * parallax);
					const pointRadius = p.size * depthScale;
					const stampSize = clamp(
						pointRadius * 11.2 * p.scaleJitter,
						SNOW_STAMP_MIN_SIZE_PX,
						SNOW_STAMP_MAX_SIZE_PX
					);
					const drawW = stampSize;
					const drawH = stampSize * p.stretch;
					const margin = Math.max(drawW, drawH) * 0.6 + 6;

					const baseX = wrap(
						p.x + tS * windPx * p.windSpeed * (0.55 + p.depth),
						w,
						margin
					);
					const baseY = wrap(
						p.y + tS * fallPx * p.fallSpeed * (0.62 + p.depth * 0.76),
						h,
						margin
					);

					const localDriftA =
						(noise1D(turbulenceT * lerp(0.72, 1.55, p.depth) + p.turbulenceSeed) - 0.5) *
						2;
					const localDriftB =
						(noise1D(turbulenceT * lerp(1.35, 2.35, p.depth) + p.gustSeed + 17.3) - 0.5) *
						2;
					const gustBand =
						(noise1D(baseY * 0.0042 + baseX * 0.0014 + gustT * 1.2 + 210.3) - 0.5) * 2;
					const gustFine =
						(noise1D(baseY * 0.011 - baseX * 0.002 + gustT * 2.1 + p.gustSeed) - 0.5) * 2;
					const windSway =
						Math.sin(
							tS * lerp(0.42, 0.95, p.depth) +
								baseY * lerp(0.006, 0.014, p.depth) +
								p.windPhase
						) *
						SNOW_WIND_SWAY_BASE_PX *
						p.windSway *
						(0.52 + parallax * 0.42);
					const gustPush =
						gustBand *
						SNOW_GUST_PUSH_BASE_PX *
						p.gustResponsiveness *
						lerp(0.45, 1.18, p.depth) *
						(0.46 + parallax * 0.36);
					const eddyDrift =
						(localDriftA - localDriftB) *
						SNOW_EDDY_DRIFT_BASE_PX *
						p.windSway *
						lerp(0.35, 1.05, p.depth);
					const verticalFlutter =
						(noise1D(turbulenceT * lerp(1.1, 2.1, p.depth) + p.turbulenceSeed + 43.8) -
							0.5) *
						2;
					const driftX =
						((localDriftA * 0.68 + localDriftB * 0.32) *
							p.wobble *
							(0.28 + parallax * 0.36) +
							gustBand * lerp(0.35, 2.2, p.depth) * (0.34 + parallax * 0.38) +
							gustFine * lerp(0.12, 0.65, p.depth) +
							windSway +
							gustPush +
							eddyDrift) *
						turbulenceMul;
					const x = wrap(baseX + driftX, w, margin);
					const y = wrap(
						baseY + verticalFlutter * lerp(0.12, 0.78, p.depth) * turbulenceMul,
						h,
						margin
					);
					const lng = normalizeLngDeg((x / w) * 360 - 180);
					const usSideAlpha =
						1 -
						smoothstep(
							SNOW_US_SIDE_FADE_START_DEG,
							SNOW_US_SIDE_FADE_END_DEG,
							angularLngDistanceDeg(lng, SNOW_US_SIDE_CENTER_LNG)
						);
					if (usSideAlpha <= 0.006) continue;

					const densityCoord = y * 0.0056 + x * 0.0018 + densityT;
					const densityField =
						noise1D(densityCoord + 31.7) * 0.68 +
						noise1D(densityCoord * 1.9 + 409.1) * 0.32;
					const particlePresence = clamp(
						(densityField + 0.42 - p.densitySeed * 0.7) / 0.38,
						0,
						1
					);
					const densityAlpha = clamp(
						lerp(0.55, 1.12, densityField) * particlePresence,
						0,
						1.12
					);
					const flakeAlpha = clamp(
						p.opacity *
							lerp(0.72, 1.08, p.depth) *
							densityAlpha *
							usSideAlpha *
							SNOW_STAMP_ALPHA_MULTIPLIER,
						0,
						SNOW_STAMP_MAX_ALPHA
					);
					if (flakeAlpha <= 0.006) continue;

					if (
						impacts.length < interactionTarget &&
						i % interactionStride === 0 &&
						x >= 0 &&
						x <= w &&
						y >= 0 &&
						y <= h
					) {
						const alpha01 = clamp(
							flakeAlpha / Math.max(0.001, SNOW_STAMP_MAX_ALPHA),
							0,
							1
						);
						const radiusPx = clamp(
							Math.max(drawW, drawH) * (1.25 + p.depth * 1.55),
							16,
							72
						);
						impacts.push({
							x,
							y,
							radiusPx,
							alpha01,
							driftXPx: driftX,
							depth: p.depth,
						});
					}

					if (snowDebugEnabled) {
						snowCtx.globalAlpha = 1;
						snowCtx.fillStyle = 'rgb(255, 0, 200)';
						snowCtx.beginPath();
						snowCtx.arc(x, y, Math.max(3, drawW * 0.35), 0, Math.PI * 2);
						snowCtx.fill();
					} else if (stamp) {
						snowCtx.globalAlpha = flakeAlpha;
						if (p.depth >= SNOW_ROTATED_PARTICLE_DEPTH_MIN) {
							snowCtx.translate(x, y);
							snowCtx.rotate(
								p.rotation + p.wobblePhase * 0.04 + tS * p.rotationSpeed * turbulenceMul
							);
							snowCtx.drawImage(stamp, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
							snowCtx.setTransform(1, 0, 0, 1, 0, 0);
						} else {
							snowCtx.drawImage(stamp, x - drawW * 0.5, y - drawH * 0.5, drawW, drawH);
						}
					} else {
						const fallbackSize = clamp(stampSize * 0.16, 1.1, 2.8);
						snowCtx.globalAlpha = flakeAlpha;
						snowCtx.fillStyle = 'rgb(246, 252, 255)';
						snowCtx.beginPath();
						snowCtx.ellipse(x, y, fallbackSize * 0.55, fallbackSize, 0, 0, Math.PI * 2);
						snowCtx.fill();
					}
				}

				// Snow is intentionally layered under clouds; to avoid it feeling “buried,”
				// we add a subtle, snow-driven distortion/thinning pass to the clouds canvas.
				const cloudsPresence =
					1 -
					smoothstep(
						CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
						CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
						currentZoom
					);
				const interactionStrength =
					clamp(cfg.snowOpacity, 0, 1) *
					clamp(cfg.snowDensity, 0, 1) *
					clamp(cloudsPresence, 0, 1) *
					(prefersReducedMotion ? 0.6 : 1) *
					snowCloudInteractionMultiplier;
				try {
					applySnowCloudInteraction(impacts, w, h, interactionStrength);
				} catch {
					// Non-fatal; snowy mood can still render as just particles under clouds.
				}
			} catch {
				// Non-fatal; the snowy mood can render as just cold clouds/fog.
			} finally {
				snowCtx.restore();
			}

			// Polar fade: same Mercator-vs-globe distortion the cloud canvas
			// gets, since snow shares CLOUDS_CANVAS_COORDINATES. Reuses the
			// shared mask so flakes near the poles fade out cleanly.
			const polarMask = getCloudsPolarFadeMask(h);
			if (polarMask) {
				try {
					snowCtx.setTransform(1, 0, 0, 1, 0, 0);
					snowCtx.globalAlpha = 1;
					snowCtx.globalCompositeOperation = 'destination-in';
					snowCtx.drawImage(polarMask, 0, 0, w, h);
					snowCtx.globalCompositeOperation = 'source-over';
				} catch {
					// Ignore.
				}
			}
		};

		const driftLoopS = CLOUDS_DRIFT_LOOP_MS / 1000;
		const meanderSpeedBaseX =
			driftLoopS > 0 ? (CLOUDS_DRIFT_AMPLITUDE_X_PX / driftLoopS) * 2.2 : 0;
		const meanderSpeedBaseY =
			driftLoopS > 0 ? (CLOUDS_DRIFT_AMPLITUDE_Y_PX / driftLoopS) * 2.2 : 0;

		const buildStormCloudMaskData = (
			src: Uint8ClampedArray,
			w: number,
			h: number
		): {
			coreData: Uint8ClampedArray<ArrayBuffer>;
			edgeData: Uint8ClampedArray<ArrayBuffer>;
			corePixels: number;
			edgePixels: number;
		} => {
			const coreData = new Uint8ClampedArray(new ArrayBuffer(src.length));
			const edgeData = new Uint8ClampedArray(new ArrayBuffer(src.length));
			let corePixels = 0;
			let edgePixels = 0;

			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const idx = (y * w + x) * 4;
					const a = src[idx + 3] / 255;
					if (a <= 0.001) continue;

					// Dense cloud centers become localized storm shadows; feathered
					// mid-alpha edges become a light rim so storm clouds are not flat black.
					const core = Math.pow(smoothstep(0.42, 0.92, a), 1.28);
					const edge =
						Math.pow(smoothstep(0.07, 0.34, a), 0.9) * (1 - smoothstep(0.48, 0.86, a));

					if (core > 0.002) {
						const coreNoise = 0.78 + hash01(x * 13.17 + y * 31.73 + 204.9) * 0.22;
						const c = core * coreNoise;
						const v = Math.round(82 - c * 42);
						coreData[idx] = v;
						coreData[idx + 1] = Math.max(0, v + 4);
						coreData[idx + 2] = Math.min(255, v + 14);
						coreData[idx + 3] = Math.round(clamp(c * 255, 0, 255));
						corePixels++;
					}

					if (edge > 0.002) {
						const edgeNoise = 0.82 + hash01(x * 19.23 + y * 7.91 + 603.1) * 0.18;
						const e = edge * edgeNoise;
						const v = Math.round(222 + e * 26);
						edgeData[idx] = Math.min(255, v - 4);
						edgeData[idx + 1] = Math.min(255, v + 1);
						edgeData[idx + 2] = Math.min(255, v + 6);
						edgeData[idx + 3] = Math.round(clamp(e * 210, 0, 255));
						edgePixels++;
					}
				}
			}

			return { coreData, edgeData, corePixels, edgePixels };
		};

		const putStormMaskPattern = (
			canvas: HTMLCanvasElement,
			data: Uint8ClampedArray<ArrayBuffer>,
			w: number,
			h: number
		): CanvasPattern | null => {
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			try {
				ctx.putImageData(new ImageData(data, w, h), 0, 0);
				return cloudsCtx.createPattern(canvas, 'repeat');
			} catch {
				return null;
			}
		};

		const ensureStormCloudTextures = (img: HTMLImageElement) => {
			if (cloudsTextureStormReadyRef.current) return;
			cloudsTextureStormReadyRef.current = false;

			try {
				if (typeof document === 'undefined') return;

				let scratchCanvas = cloudsTextureScratchCanvasRef.current;
				if (!scratchCanvas) {
					scratchCanvas = document.createElement('canvas');
					scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureScratchCanvasRef.current = scratchCanvas;
				}

				const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const scratchCtx = scratchCanvas.getContext('2d');
				if (!scratchCtx) return;

				try {
					scratchCtx.imageSmoothingEnabled = true;
					scratchCtx.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				scratchCtx.clearRect(0, 0, w, h);
				scratchCtx.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = scratchCtx.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				let coreCanvas = cloudsTextureStormCoreCanvasRef.current;
				if (!coreCanvas) {
					coreCanvas = document.createElement('canvas');
					coreCanvas.width = w;
					coreCanvas.height = h;
					cloudsTextureStormCoreCanvasRef.current = coreCanvas;
				}

				let edgeCanvas = cloudsTextureStormEdgeCanvasRef.current;
				if (!edgeCanvas) {
					edgeCanvas = document.createElement('canvas');
					edgeCanvas.width = w;
					edgeCanvas.height = h;
					cloudsTextureStormEdgeCanvasRef.current = edgeCanvas;
				}

				const { coreData, edgeData, corePixels, edgePixels } = buildStormCloudMaskData(
					imageData.data,
					w,
					h
				);
				cloudsTextureStormCorePatternRef.current =
					corePixels > 0 ? putStormMaskPattern(coreCanvas, coreData, w, h) : null;
				cloudsTextureStormEdgePatternRef.current =
					edgePixels > 0 ? putStormMaskPattern(edgeCanvas, edgeData, w, h) : null;
				cloudsTextureStormReadyRef.current = Boolean(
					cloudsTextureStormCorePatternRef.current ||
					cloudsTextureStormEdgePatternRef.current
				);
			} catch {
				cloudsTextureStormReadyRef.current = false;
				cloudsTextureStormCorePatternRef.current = null;
				cloudsTextureStormEdgePatternRef.current = null;
			}
		};

		// Secondary clouds texture: a thinner/sparser variant so we can composite a second
		// independently-drifting layer without it reading like two identical "blankets".
		const ensureSecondaryCloudsTexture = (img: HTMLImageElement) => {
			// If we've already built the secondary texture/pattern, don't redo work.
			if (cloudsTexturePatternSecondaryRef.current) return;
			if (
				cloudsTextureSecondaryReadyRef.current &&
				cloudsTextureSecondaryCanvasRef.current
			)
				return;

			cloudsTextureSecondaryReadyRef.current = false;

			try {
				let secondaryCanvas = cloudsTextureSecondaryCanvasRef.current;
				if (!secondaryCanvas && typeof document !== 'undefined') {
					secondaryCanvas = document.createElement('canvas');
					secondaryCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					secondaryCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureSecondaryCanvasRef.current = secondaryCanvas;
				}
				if (!secondaryCanvas) return;

				const w = secondaryCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = secondaryCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const ctx2 = secondaryCanvas.getContext('2d');
				if (!ctx2) return;

				try {
					ctx2.imageSmoothingEnabled = true;
					ctx2.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				ctx2.clearRect(0, 0, w, h);
				ctx2.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = ctx2.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				// Tileable coarse mask noise (wraps on a small grid) so the secondary layer
				// doesn't add uniform density everywhere.
				// Coarse, tileable mask (wraps at the texture boundary). Keep this fairly low
				// frequency so it reads as distinct cloud systems rather than fine noise.
				const maskGrid = 10;
				const maskVals = new Float32Array(maskGrid * maskGrid);
				for (let gy = 0; gy < maskGrid; gy++) {
					for (let gx = 0; gx < maskGrid; gx++) {
						const n = gx * 127.1 + gy * 311.7 + 74.7;
						maskVals[gy * maskGrid + gx] = hash01(n);
					}
				}
				const maskNoise2D = (u: number, v: number) => {
					// u/v in "grid space" (0..maskGrid).
					const x0 = Math.floor(u);
					const y0 = Math.floor(v);
					const fx = u - x0;
					const fy = v - y0;
					const ix0 = ((x0 % maskGrid) + maskGrid) % maskGrid;
					const iy0 = ((y0 % maskGrid) + maskGrid) % maskGrid;
					const ix1 = (ix0 + 1) % maskGrid;
					const iy1 = (iy0 + 1) % maskGrid;
					const a00 = maskVals[iy0 * maskGrid + ix0];
					const a10 = maskVals[iy0 * maskGrid + ix1];
					const a01 = maskVals[iy1 * maskGrid + ix0];
					const a11 = maskVals[iy1 * maskGrid + ix1];
					const sx = smoothstep01(fx);
					const sy = smoothstep01(fy);
					const xA = a00 + (a10 - a00) * sx;
					const xB = a01 + (a11 - a01) * sx;
					return xA + (xB - xA) * sy;
				};

				const data = imageData.data;
				// Keep only denser cores (removes haze), then gate by the coarse mask.
				const alphaFloor = 0.08;
				const alphaPower = 2.2;
				const maskThreshold = 0.52;
				const maskPower = 1.35;
				const invAlphaDenom = 1 / Math.max(1e-6, 1 - alphaFloor);
				const invMaskDenom = 1 / Math.max(1e-6, 1 - maskThreshold);

				for (let y = 0; y < h; y++) {
					const v = (y / h) * maskGrid;
					for (let x = 0; x < w; x++) {
						const idx = (y * w + x) * 4;
						const a = data[idx + 3] / 255;
						let a2 = Math.max(0, (a - alphaFloor) * invAlphaDenom);
						a2 = Math.pow(a2, alphaPower);

						const n = maskNoise2D((x / w) * maskGrid, v);
						let g = Math.max(0, (n - maskThreshold) * invMaskDenom);
						g = Math.pow(g, maskPower);

						const outA = Math.min(1, a2 * g * 1.15);
						data[idx + 3] = Math.round(outA * 255);
					}
				}

				let applied = false;
				try {
					ctx2.putImageData(imageData, 0, 0);
					applied = true;
				} catch {
					applied = false;
				}
				cloudsTextureSecondaryReadyRef.current = applied;

				try {
					cloudsTexturePatternSecondaryRef.current = cloudsCtx.createPattern(
						secondaryCanvas,
						'repeat'
					);
				} catch {
					cloudsTexturePatternSecondaryRef.current = null;
				}
			} catch {
				// Ignore.
			}
		};

		// Split the base clouds texture into multiple tileable "groups" so different
		// cloud structures can drift at noticeably different speeds without the
		// whole layer reading like a single translating sheet.
		const ensureCloudsGroupPatterns = (img: HTMLImageElement) => {
			const existingPatterns = cloudsTextureGroupPatternsRef.current;
			const desiredGroupCount = cloudsDriftGroupOffsetsRef.current.length;
			if (
				cloudsTextureGroupReadyRef.current &&
				Array.isArray(existingPatterns) &&
				existingPatterns.length === desiredGroupCount &&
				cloudsTexturePatternHazeRef.current
			)
				return;

			cloudsTextureGroupReadyRef.current = false;

			try {
				// Use (and reuse) a scratch canvas to read pixels from the base texture.
				// Important: do NOT reuse the secondary texture canvas (it has different pixels).
				let scratchCanvas = cloudsTextureScratchCanvasRef.current;
				if (!scratchCanvas && typeof document !== 'undefined') {
					scratchCanvas = document.createElement('canvas');
					scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureScratchCanvasRef.current = scratchCanvas;
				}
				if (!scratchCanvas) return;

				const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const scratchCtx = scratchCanvas.getContext('2d');
				if (!scratchCtx) return;

				try {
					scratchCtx.imageSmoothingEnabled = true;
					scratchCtx.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				scratchCtx.clearRect(0, 0, w, h);
				scratchCtx.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = scratchCtx.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				const src = imageData.data;
				// Exclude the very faint haze from the motion groups; it tends to connect
				// distant clouds into a single structure and makes group motion read uniform.
				const alphaGate = 18;

				// Build a "haze-only" texture (alpha below alphaGate). This lets us keep
				// slow global motion without anchoring the dense cloud cores.
				try {
					let hazeCanvas = cloudsTextureHazeCanvasRef.current;
					if (!hazeCanvas && typeof document !== 'undefined') {
						hazeCanvas = document.createElement('canvas');
						hazeCanvas.width = w;
						hazeCanvas.height = h;
						cloudsTextureHazeCanvasRef.current = hazeCanvas;
					}
					const hazeCtx = hazeCanvas ? hazeCanvas.getContext('2d') : null;
					if (hazeCanvas && hazeCtx) {
						const hazeData = new Uint8ClampedArray(new ArrayBuffer(src.length));
						for (let i = 0; i < src.length; i += 4) {
							const a = src[i + 3];
							if (a && a < alphaGate) {
								hazeData[i] = src[i];
								hazeData[i + 1] = src[i + 1];
								hazeData[i + 2] = src[i + 2];
								hazeData[i + 3] = a;
							}
						}

						try {
							hazeCtx.putImageData(new ImageData(hazeData, w, h), 0, 0);
							cloudsTexturePatternHazeRef.current = cloudsCtx.createPattern(
								hazeCanvas,
								'repeat'
							);
						} catch {
							cloudsTexturePatternHazeRef.current = null;
						}
					}
				} catch {
					cloudsTexturePatternHazeRef.current = null;
				}

				const groupCount = Math.max(1, cloudsDriftGroupOffsetsRef.current.length);
				const groupDatas: Uint8ClampedArray<ArrayBuffer>[] = Array.from(
					{ length: groupCount },
					() => new Uint8ClampedArray(new ArrayBuffer(src.length))
				);
				const groupPixelCounts = new Uint32Array(groupCount);

				// Connected-components over alphaGate pixels (with wraparound) so each cloud
				// structure is assigned to a single speed group (cloud-to-cloud variation).
				const pixelCount = w * h;
				const visited = new Uint8Array(pixelCount);
				const stack = new Int32Array(pixelCount);
				const componentPixels: number[] = [];

				const halfIndex = Math.floor(groupCount / 2);
				const slowMax = Math.max(0, halfIndex - 1);
				const fastMin = Math.min(groupCount - 1, halfIndex);

				let compId = 0;
				for (let start = 0; start < pixelCount; start++) {
					if (visited[start]) continue;
					const a0 = src[start * 4 + 3];
					if (a0 < alphaGate) continue;

					let sp = 0;
					stack[sp++] = start;
					visited[start] = 1;
					componentPixels.length = 0;

					while (sp > 0) {
						const p = stack[--sp];
						componentPixels.push(p);

						const x = p % w;
						const y = (p / w) | 0;

						const left = x > 0 ? p - 1 : p + (w - 1);
						const right = x + 1 < w ? p + 1 : p - (w - 1);
						const up = y > 0 ? p - w : p + (h - 1) * w;
						const down = y + 1 < h ? p + w : p - (h - 1) * w;

						if (!visited[left] && src[left * 4 + 3] >= alphaGate) {
							visited[left] = 1;
							stack[sp++] = left;
						}
						if (!visited[right] && src[right * 4 + 3] >= alphaGate) {
							visited[right] = 1;
							stack[sp++] = right;
						}
						if (!visited[up] && src[up * 4 + 3] >= alphaGate) {
							visited[up] = 1;
							stack[sp++] = up;
						}
						if (!visited[down] && src[down * 4 + 3] >= alphaGate) {
							visited[down] = 1;
							stack[sp++] = down;
						}
					}

					const size = componentPixels.length;
					const r = hash01(compId * 91.7 + size * 0.013 + 501.9);
					const r2 = hash01(compId * 37.1 + size * 0.021 + 911.3);
					let bucket = 0;
					// Keep big cloud masses biased toward the slower half, but still distribute
					// across multiple buckets so the motion reads as cloud-to-cloud variation.
					if (size >= 9000) {
						// Small chance that a big cloud system is part of a faster flow.
						if (r2 < 0.15) {
							const span = Math.max(1, groupCount - fastMin);
							bucket = fastMin + Math.min(span - 1, Math.floor(r * span));
						} else {
							const span = Math.max(1, slowMax + 1);
							bucket = Math.min(slowMax, Math.floor(r * span));
						}
					} else if (size <= 420) {
						const span = Math.max(1, groupCount - fastMin);
						bucket = fastMin + Math.min(span - 1, Math.floor(r * span));
					} else {
						bucket = Math.min(groupCount - 1, Math.floor(r * groupCount));
					}

					const out = groupDatas[bucket];
					for (let i = 0; i < size; i++) {
						const p = componentPixels[i];
						const idx = p * 4;
						out[idx] = src[idx];
						out[idx + 1] = src[idx + 1];
						out[idx + 2] = src[idx + 2];
						out[idx + 3] = src[idx + 3];
					}
					groupPixelCounts[bucket] += size;
					compId++;
				}

				const groupCanvases: (HTMLCanvasElement | null)[] = [];
				const groupPatterns: (CanvasPattern | null)[] = [];

				for (let g = 0; g < groupCount; g++) {
					if (typeof document === 'undefined') {
						groupCanvases.push(null);
						groupPatterns.push(null);
						continue;
					}
					if (!groupPixelCounts[g]) {
						groupCanvases.push(null);
						groupPatterns.push(null);
						continue;
					}

					const c = document.createElement('canvas');
					c.width = w;
					c.height = h;
					const ctx = c.getContext('2d');
					if (!ctx) {
						groupCanvases.push(null);
						groupPatterns.push(null);
						continue;
					}

					let applied = false;
					try {
						ctx.putImageData(new ImageData(groupDatas[g], w, h), 0, 0);
						applied = true;
					} catch {
						applied = false;
					}
					if (!applied) {
						groupCanvases.push(null);
						groupPatterns.push(null);
						continue;
					}

					groupCanvases.push(c);
					try {
						groupPatterns.push(cloudsCtx.createPattern(c, 'repeat'));
					} catch {
						groupPatterns.push(null);
					}
				}

				// Per-group storm core/edge masks are NOT built here: normal/sunny moods
				// never sample them (their opacities are 0). They're built lazily — one
				// group per frame, hidden under the mood fade — by
				// ensureStormGroupMasksStep() when a storm/cloudy mood first needs them.
				cloudsTextureGroupCanvasesRef.current = groupCanvases;
				cloudsTextureGroupPatternsRef.current = groupPatterns;
				cloudsTextureGroupReadyRef.current = groupPatterns.some(Boolean);
				if (
					cloudsTextureGroupReadyRef.current &&
					!cloudsTextureGroupDebugLoggedRef.current &&
					typeof process !== 'undefined' &&
					process.env?.NODE_ENV !== 'production'
				) {
					cloudsTextureGroupDebugLoggedRef.current = true;
					try {
						console.info('[SearchResultsMap] clouds groups ready', {
							groups: groupCount,
							nonEmpty: Array.from(groupPixelCounts).filter(Boolean).length,
							pixels: Array.from(groupPixelCounts),
							haze: Boolean(cloudsTexturePatternHazeRef.current),
						});
					} catch {
						// Ignore.
					}
				}
			} catch {
				cloudsTextureGroupReadyRef.current = false;
				cloudsTextureStormCoreGroupPatternsRef.current = null;
				cloudsTextureStormEdgeGroupPatternsRef.current = null;
			}
		};

		// ---- Mood-gated weather asset lifecycle -------------------------------
		// The heavyweight weather assets (storm masks, secondary cloud texture,
		// lightning stamps + potential map, snow stamps) are sampled only by some
		// moods; normal/sunny zero out every consumer. Build them only when the
		// live blended config OR the active transition's target needs them (so
		// they exist before the fade-in becomes visible), and release them once a
		// completed transition lands on a mood that doesn't.

		type WeatherAssetNeeds = {
			stormMasks: boolean;
			secondary: boolean;
			lightning: boolean;
			snow: boolean;
		};

		const weatherAssetNeedsFor = (
			cfg: RuntimeMoodVisualConfig | null | undefined
		): WeatherAssetNeeds => ({
			stormMasks: Boolean(
				cfg && (cfg.cloudCoreShadowOpacity > 0.001 || cfg.cloudEdgeLiftOpacity > 0.001)
			),
			secondary: Boolean(cfg && cfg.cloudSecondaryLayerOpacity > 0.001),
			lightning: Boolean(cfg && (cfg.lightning || cfg.lightningIntensity > 0.001)),
			snow: Boolean(cfg && cfg.snowOpacity > 0.001 && cfg.snowDensity > 0.001),
		});

		const currentWeatherAssetNeeds = (): WeatherAssetNeeds => {
			const live = weatherAssetNeedsFor(weatherMoodConfigRef.current);
			const target = weatherAssetNeedsFor(moodTransitionRef.current?.to);
			return {
				stormMasks: live.stormMasks || target.stormMasks,
				secondary: live.secondary || target.secondary,
				lightning: live.lightning || target.lightning,
				snow: live.snow || target.snow,
			};
		};

		// Build ONE missing per-group storm mask pair per call (each is a linear
		// pass over the 512² group canvas, ~10-20ms) so the work spreads across
		// frames while the mood fade still has the masks at near-zero opacity.
		const ensureStormGroupMasksStep = () => {
			const groupCanvases = cloudsTextureGroupCanvasesRef.current;
			const groupPatterns = cloudsTextureGroupPatternsRef.current;
			if (!Array.isArray(groupCanvases) || !Array.isArray(groupPatterns)) return;
			const count = groupPatterns.length;

			let built = cloudsTextureStormGroupMasksBuiltRef.current;
			if (!built || built.length !== count) {
				built = new Array<boolean>(count).fill(false);
				cloudsTextureStormGroupMasksBuiltRef.current = built;
				cloudsTextureStormCoreGroupPatternsRef.current = new Array<CanvasPattern | null>(
					count
				).fill(null);
				cloudsTextureStormEdgeGroupPatternsRef.current = new Array<CanvasPattern | null>(
					count
				).fill(null);
			}
			const cores = cloudsTextureStormCoreGroupPatternsRef.current;
			const edges = cloudsTextureStormEdgeGroupPatternsRef.current;
			if (!cores || !edges) return;

			for (let g = 0; g < count; g++) {
				if (built[g]) continue;
				// Mark attempted up front so a failing group is never retried per-frame.
				built[g] = true;
				const canvas = groupCanvases[g];
				if (!canvas) continue; // empty group — nothing to mask, keep scanning
				try {
					const ctx = canvas.getContext('2d');
					if (!ctx) continue;
					const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const { coreData, edgeData, corePixels, edgePixels } = buildStormCloudMaskData(
						imageData.data,
						canvas.width,
						canvas.height
					);
					if (typeof document !== 'undefined') {
						if (corePixels > 0) {
							const coreCanvas = document.createElement('canvas');
							coreCanvas.width = canvas.width;
							coreCanvas.height = canvas.height;
							cores[g] = putStormMaskPattern(
								coreCanvas,
								coreData,
								canvas.width,
								canvas.height
							);
						}
						if (edgePixels > 0) {
							const edgeCanvas = document.createElement('canvas');
							edgeCanvas.width = canvas.width;
							edgeCanvas.height = canvas.height;
							edges[g] = putStormMaskPattern(
								edgeCanvas,
								edgeData,
								canvas.width,
								canvas.height
							);
						}
					}
				} catch {
					// Leave this group's masks null (matches today's failure handling).
				}
				return; // one real build per frame
			}
		};

		const releaseUnneededWeatherAssets = (needs: WeatherAssetNeeds) => {
			if (!needs.stormMasks) {
				if (
					cloudsTextureStormReadyRef.current ||
					cloudsTextureStormCorePatternRef.current ||
					cloudsTextureStormEdgePatternRef.current ||
					cloudsTextureStormGroupMasksBuiltRef.current
				) {
					cloudsTextureStormCorePatternRef.current = null;
					cloudsTextureStormEdgePatternRef.current = null;
					cloudsTextureStormCoreCanvasRef.current = null;
					cloudsTextureStormEdgeCanvasRef.current = null;
					cloudsTextureStormReadyRef.current = false;
					cloudsTextureStormCoreGroupPatternsRef.current = null;
					cloudsTextureStormEdgeGroupPatternsRef.current = null;
					cloudsTextureStormGroupMasksBuiltRef.current = null;
				}
			}
			// The secondary texture doubles as the non-group fallback layer, so it is
			// only releasable while the group pipeline is healthy.
			if (!needs.secondary && cloudsTextureGroupReadyRef.current) {
				if (
					cloudsTexturePatternSecondaryRef.current ||
					cloudsTextureSecondaryCanvasRef.current
				) {
					cloudsTexturePatternSecondaryRef.current = null;
					cloudsTextureSecondaryCanvasRef.current = null;
					cloudsTextureSecondaryReadyRef.current = false;
				}
			}
			if (!needs.lightning) {
				if (lightningStampImagesRef.current || lightningPotentialU8Ref.current) {
					lightningStampImagesRef.current = null;
					lightningStampLoadPromiseRef.current = null;
					lightningPotentialU8Ref.current = null;
					lightningPotentialLoadPromiseRef.current = null;
				}
			}
			if (!needs.snow) {
				if (snowStampImagesRef.current) {
					snowStampImagesRef.current = null;
					snowStampLoadPromiseRef.current = null;
				}
				// Snow-interaction scratch + stamp canvases rebuild lazily on next snow;
				// canvas and ctx refs must be dropped together.
				if (cloudsSnowInteractionScratchCanvasRef.current) {
					cloudsSnowInteractionScratchCanvasRef.current = null;
					cloudsSnowInteractionScratchCtxRef.current = null;
					cloudsSnowInteractionThinStampRef.current = null;
					cloudsSnowInteractionGlowStampRef.current = null;
				}
			}
		};

		const ensureWeatherAssetsForNeeds = (img: HTMLImageElement) => {
			const needs = currentWeatherAssetNeeds();
			// Secondary also serves as the fallback second layer when the group
			// pipeline failed, where it draws at ≥0.52 alpha — keep that path warm.
			if (needs.secondary || !cloudsTextureGroupReadyRef.current) {
				ensureSecondaryCloudsTexture(img);
			}
			if (needs.stormMasks) {
				if (cloudsTextureGroupReadyRef.current) {
					ensureStormGroupMasksStep();
				} else {
					ensureStormCloudTextures(img);
				}
			}
			if (needs.lightning) {
				// Lazy pipeline: canvas+source+layer come into existence at fade
				// start (opacity ≈ 0), same guarantee as the stamp assets below.
				ensureLightningSourceAndLayer(map, {
					lightningCanvasRef,
					lightningCanvasCtxRef,
					weatherMoodConfigRef,
				});
				loadLightningStamps().catch(() => {
					// Non-fatal.
				});
				loadLightningPotential().catch(() => {
					// Non-fatal.
				});
			}
			if (needs.snow) {
				ensureSnowSourceAndLayer(map, {
					snowCanvasRef,
					snowCanvasCtxRef,
					weatherMoodConfigRef,
				});
				loadSnowStamps().catch(() => {
					// Non-fatal.
				});
			}
			releaseUnneededWeatherAssets(needs);
		};
		// -----------------------------------------------------------------------

		const draw = (
			img: HTMLImageElement,
			pattern: CanvasPattern | null,
			tMs: number,
			dt: number
		) => {
			let zoomForScale = CLOUDS_DRIFT_BASE_ZOOM;
			try {
				const z =
					typeof map.getZoom === 'function' ? map.getZoom() : CLOUDS_DRIFT_BASE_ZOOM;
				zoomForScale = clamp(z, MAP_MIN_ZOOM, CLOUDS_OVERLAY_FADE_OUT_END_ZOOM);
			} catch {
				zoomForScale = CLOUDS_DRIFT_BASE_ZOOM;
			}
			const zoomScaleRaw = Math.pow(
				2,
				(CLOUDS_DRIFT_BASE_ZOOM - zoomForScale) * CLOUDS_DRIFT_ZOOM_SCALE_EXP
			);
			const zoomScale = clamp(
				zoomScaleRaw,
				CLOUDS_DRIFT_ZOOM_SCALE_MIN,
				CLOUDS_DRIFT_ZOOM_SCALE_MAX
			);
			const speedScale = zoomScale * motionScale;

			// Drift is implemented as a canvas-source animation. We composite two
			// independently-drifting layers so some cloud structures move at different speeds.
			const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
			const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
			const moodCfg = weatherMoodConfigRef.current;
			const stormWindMult = clamp(moodCfg.cloudStormWindMultiplier, 0.25, 3);
			const extraPasses = moodCfg.cloudExtraPasses;
			const extraPassAlpha = moodCfg.cloudExtraPassAlpha;
			const extraPassSpread = clamp(moodCfg.cloudLayerSpread, 0.35, 2.5);
			const configuredSecondaryAlpha = clamp(moodCfg.cloudSecondaryLayerOpacity, 0, 1);
			const hazeLayerAlpha = clamp(moodCfg.cloudHazeLayerOpacity, 0, 1);
			const fineVeilAlpha = clamp(moodCfg.cloudFineVeilOpacity, 0, 1);
			const stormCoreOpacity = clamp(moodCfg.cloudCoreShadowOpacity, 0, 1);
			const stormEdgeOpacity = clamp(moodCfg.cloudEdgeLiftOpacity, 0, 1);

			// Macro meander (base layer): smooth randomness applied as velocity so zoom changes
			// do not introduce positional jumps.
			const meanderT = tMs / CLOUDS_DRIFT_LOOP_MS;
			const meanderNoiseX1 =
				noise1D(meanderT + 10.3) * 0.72 + noise1D(meanderT * 1.9 + 33.7) * 0.28;
			const meanderNoiseY1 =
				noise1D(meanderT + 50.3) * 0.72 + noise1D(meanderT * 1.9 + 73.7) * 0.28;
			const meanderUnitX1 = (meanderNoiseX1 - 0.5) * 2;
			const meanderUnitY1 = (meanderNoiseY1 - 0.5) * 2;

			const moodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
			const velX1 =
				(CLOUDS_DRIFT_SPEED_X_PX_PER_S * moodDriftMult +
					meanderUnitX1 * meanderSpeedBaseX) *
				speedScale;
			const velY1 =
				(CLOUDS_DRIFT_SPEED_Y_PX_PER_S * moodDriftMult +
					meanderUnitY1 * meanderSpeedBaseY) *
				speedScale;

			const offset1 = cloudsDriftOffsetRef.current;
			offset1.x += velX1 * dt;
			offset1.y += velY1 * dt;
			offset1.x = ((offset1.x % w) + w) % w;
			offset1.y = ((offset1.y % h) + h) % h;

			const x0 = -offset1.x;
			const y0 = -offset1.y;

			const groupPatterns = cloudsTextureGroupReadyRef.current
				? cloudsTextureGroupPatternsRef.current
				: null;
			const groupOffsets = cloudsDriftGroupOffsetsRef.current;
			const groupCount = Array.isArray(groupPatterns)
				? Math.min(groupPatterns.length, groupOffsets.length)
				: 0;
			const useGroups =
				groupCount > 0 && Array.isArray(groupPatterns) && groupPatterns.some(Boolean);
			const hazePattern = cloudsTexturePatternHazeRef.current;
			const useHazeSplit = useGroups && Boolean(hazePattern);

			if (
				useGroups &&
				!cloudsTextureGroupDebugActiveLoggedRef.current &&
				typeof process !== 'undefined' &&
				process.env?.NODE_ENV !== 'production'
			) {
				cloudsTextureGroupDebugActiveLoggedRef.current = true;
				try {
					console.info('[SearchResultsMap] clouds groups active', {
						useHazeSplit,
						groupCount,
						speedMults: [0.06, 0.18, 0.42, 0.85, 1.4, 2.2, 3.2, 4.6],
					});
				} catch {
					// Ignore.
				}
			}

			// When groups are active we shift most of the visible cloud density into the
			// group layers (so motion is structure-to-structure), and keep a lighter base
			// layer underneath for continuity.
			const baseLayerAlpha = useHazeSplit ? 1 : useGroups ? 0.22 : 1;
			const groupsLayerAlpha = useHazeSplit ? 1 : useGroups ? 1 - baseLayerAlpha : 0;

			if (useGroups) {
				// Per-group velocity fields (different speeds + slight direction offsets).
				const speedMults = [0.06, 0.18, 0.42, 0.85, 1.4, 2.2, 3.2, 4.6];
				const meanderMults = [0.35, 0.55, 0.8, 1.0, 1.25, 1.6, 2.0, 2.4];
				const ySpeeds = [-0.06, -0.03, -0.015, 0.0, 0.02, 0.04, 0.07, 0.1];

				for (let g = 0; g < groupCount; g++) {
					const off = groupOffsets[g];
					const seed = 410.3 + g * 97.7;
					const meanderNoiseX =
						noise1D(meanderT + seed) * 0.72 + noise1D(meanderT * 1.9 + seed * 0.7) * 0.28;
					const meanderNoiseY =
						noise1D(meanderT + seed + 40.0) * 0.72 +
						noise1D(meanderT * 1.9 + seed * 0.7 + 80.0) * 0.28;
					const meanderUnitX = (meanderNoiseX - 0.5) * 2;
					const meanderUnitY = (meanderNoiseY - 0.5) * 2;

					const speedMult = speedMults[g] ?? 1;
					const meanderMult = meanderMults[g] ?? 1;
					const ySpeed = ySpeeds[g] ?? 0;

					const groupMoodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
					const velX =
						(CLOUDS_DRIFT_SPEED_X_PX_PER_S * speedMult * groupMoodDriftMult +
							meanderUnitX * meanderSpeedBaseX * meanderMult) *
						speedScale;
					const velY =
						(ySpeed * groupMoodDriftMult +
							meanderUnitY * meanderSpeedBaseY * meanderMult) *
						speedScale;

					off.x += velX * dt;
					off.y += velY * dt;
					off.x = ((off.x % w) + w) % w;
					off.y = ((off.y % h) + h) % h;
				}
			}

			// Secondary layer: slightly faster + different meander phase so the motion reads
			// as multiple cloud structures moving independently.
			// Make the secondary layer noticeably different in motion so the eye can
			// separate cloud systems moving at different speeds.
			const L2_SPEED_MULT = 2.85;
			const L2_MEANDER_MULT = 1.6;
			const L2_SPEED_Y_PX_PER_S = 0.07;
			const meanderNoiseX2 =
				noise1D(meanderT + 210.3) * 0.72 + noise1D(meanderT * 1.9 + 233.7) * 0.28;
			const meanderNoiseY2 =
				noise1D(meanderT + 250.3) * 0.72 + noise1D(meanderT * 1.9 + 273.7) * 0.28;
			const meanderUnitX2 = (meanderNoiseX2 - 0.5) * 2;
			const meanderUnitY2 = (meanderNoiseY2 - 0.5) * 2;

			const layer2MoodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
			const velX2 =
				(CLOUDS_DRIFT_SPEED_X_PX_PER_S * L2_SPEED_MULT * layer2MoodDriftMult +
					meanderUnitX2 * meanderSpeedBaseX * L2_MEANDER_MULT) *
				speedScale;
			const velY2 =
				(L2_SPEED_Y_PX_PER_S * layer2MoodDriftMult +
					meanderUnitY2 * meanderSpeedBaseY * L2_MEANDER_MULT) *
				speedScale;

			const offset2 = cloudsDriftOffsetSecondaryRef.current;
			offset2.x += velX2 * dt;
			offset2.y += velY2 * dt;
			offset2.x = ((offset2.x % w) + w) % w;
			offset2.y = ((offset2.y % h) + h) % h;

			const x1 = -offset2.x;
			const y1 = -offset2.y;

			// Ensure canvas ops are in screen-space coordinates for clear/clip.
			try {
				cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
				cloudsCtx.globalAlpha = 1;
				cloudsCtx.globalCompositeOperation = 'source-over';
			} catch {
				// Ignore.
			}
			cloudsCtx.clearRect(0, 0, w, h);

			const secondaryPattern = cloudsTexturePatternSecondaryRef.current;
			const secondaryCanvas = cloudsTextureSecondaryCanvasRef.current;
			const secondaryReady =
				Boolean(secondaryPattern) || cloudsTextureSecondaryReadyRef.current;
			const layer2Alpha = useGroups
				? secondaryReady
					? configuredSecondaryAlpha
					: 0
				: secondaryReady
					? Math.max(0.52, configuredSecondaryAlpha)
					: Math.max(0.22, configuredSecondaryAlpha);
			const layer2Pattern = secondaryReady ? secondaryPattern : pattern;
			const layer2Source: CanvasImageSource =
				secondaryReady && secondaryCanvas ? secondaryCanvas : img;

			// Micro turbulence: subtly warp the texture so the cloud shapes feel "alive".
			// Implemented as a gentle X-shear field that changes smoothly over time.
			const stripH = CLOUDS_TURBULENCE_STRIP_PX;
			const stripCount = Math.max(1, Math.ceil(h / stripH));

			const turbulenceUnit = (
				boundaryIndex: number,
				t: number,
				seedA: number,
				seedB: number
			) => {
				const n1 = noise1D(boundaryIndex * 0.91 + t + seedA);
				const n2 = noise1D(boundaryIndex * 1.77 + t * 0.37 + seedB);
				const n = n1 * 0.72 + n2 * 0.28;
				return (n - 0.5) * 2;
			};

			const turbulenceT1 = tMs / CLOUDS_TURBULENCE_LOOP_MS;
			const moodTurbMult = moodCfg.cloudTurbulenceMultiplier * stormWindMult;
			const turbulenceAmp1 =
				CLOUDS_TURBULENCE_AMPLITUDE_X_PX * speedScale * 0.75 * moodTurbMult;
			// Phase + slightly stronger turbulence on the faster layer so it doesn't feel locked
			// to the base drift field.
			const turbulenceT2 = (tMs + 17_000) / CLOUDS_TURBULENCE_LOOP_MS;
			const turbulenceAmp2 =
				CLOUDS_TURBULENCE_AMPLITUDE_X_PX * speedScale * 0.75 * 1.25 * moodTurbMult;
			const stormCorePattern = cloudsTextureStormCorePatternRef.current;
			const stormEdgePattern = cloudsTextureStormEdgePatternRef.current;
			const stormCoreGroupPatterns = cloudsTextureStormCoreGroupPatternsRef.current;
			const stormEdgeGroupPatterns = cloudsTextureStormEdgeGroupPatternsRef.current;

			for (let stripIndex = 0; stripIndex < stripCount; stripIndex++) {
				const yStart = stripIndex * stripH;
				const stripHeight = Math.min(stripH, h - yStart);
				if (stripHeight <= 0) continue;

				cloudsCtx.save();
				cloudsCtx.beginPath();
				cloudsCtx.rect(0, yStart, w, stripHeight);
				cloudsCtx.clip();

				// Base layer
				{
					const dxTop =
						turbulenceUnit(stripIndex, turbulenceT1, 10.7, 97.2) * turbulenceAmp1;
					const dxBottom =
						turbulenceUnit(stripIndex + 1, turbulenceT1, 10.7, 97.2) * turbulenceAmp1;
					const shear = (dxBottom - dxTop) / stripHeight;
					const translateX = dxTop - shear * yStart;

					const fillPatternAt = (
						fillPattern: CanvasPattern,
						x: number,
						y: number,
						alpha: number,
						extraPassCount = 0,
						extraPassOffset = 0,
						passSpread = extraPassSpread
					) => {
						if (alpha <= 0.001) return;
						cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
						cloudsCtx.globalAlpha = alpha;
						cloudsCtx.translate(x, y);
						cloudsCtx.fillStyle = fillPattern;
						cloudsCtx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
						drawCloudExtraPasses(
							cloudsCtx,
							w,
							h,
							extraPassCount,
							extraPassOffset,
							extraPassAlpha,
							passSpread
						);
					};

					const basePattern = useHazeSplit ? hazePattern : pattern;
					if (basePattern) {
						// CanvasPattern repeat is much cheaper than multiple drawImage calls and
						// helps keep the animation smooth under load.
						// Mood-driven extra density: re-fill the same pattern with offsets so the
						// same texture covers more of the canvas (no Python re-bake needed).
						fillPatternAt(basePattern, x0, y0, baseLayerAlpha, extraPasses);
					} else {
						// Fill the canvas with wrapped draws (extra copy in X to avoid edge gaps under shear).
						cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
						cloudsCtx.globalAlpha = baseLayerAlpha;
						for (let x = x0 - w; x < w + w; x += w) {
							for (let y = y0; y < h; y += h) {
								cloudsCtx.drawImage(img, x, y, w, h);
							}
						}
					}

					if (useHazeSplit && hazePattern && hazeLayerAlpha > 0.001) {
						fillPatternAt(
							hazePattern,
							x0 + w * 0.37,
							y0 - h * 0.22,
							hazeLayerAlpha,
							Math.min(extraPasses, 2),
							3,
							extraPassSpread * 1.18
						);
					}

					const fineVeilPattern = hazePattern ?? secondaryPattern ?? pattern;
					if (fineVeilPattern && fineVeilAlpha > 0.001) {
						fillPatternAt(
							fineVeilPattern,
							x0 - w * 0.19,
							y0 + h * 0.31,
							fineVeilAlpha,
							Math.min(extraPasses * 0.35, 1.65),
							5,
							extraPassSpread * 1.28
						);
					}

					if (!useGroups) {
						if (stormEdgePattern) {
							fillPatternAt(stormEdgePattern, x0, y0, stormEdgeOpacity * baseLayerAlpha);
						}
						if (stormCorePattern) {
							fillPatternAt(stormCorePattern, x0, y0, stormCoreOpacity * baseLayerAlpha);
						}
					}

					// Group overlays: independently-drifting subsets of the same texture so
					// different cloud structures move at different speeds.
					if (useGroups && Array.isArray(groupPatterns)) {
						for (let g = 0; g < groupCount; g++) {
							const gp = groupPatterns[g];
							if (!gp) continue;
							const off = groupOffsets[g];
							const xg = -off.x;
							const yg = -off.y;

							// Mood-driven extra density (matches base layer pass count).
							fillPatternAt(gp, xg, yg, groupsLayerAlpha, extraPasses, g);

							const stormEdgeGroupPattern = stormEdgeGroupPatterns?.[g];
							if (stormEdgeGroupPattern) {
								fillPatternAt(
									stormEdgeGroupPattern,
									xg,
									yg,
									stormEdgeOpacity * groupsLayerAlpha
								);
							}

							const stormCoreGroupPattern = stormCoreGroupPatterns?.[g];
							if (stormCoreGroupPattern) {
								fillPatternAt(
									stormCoreGroupPattern,
									xg,
									yg,
									stormCoreOpacity * groupsLayerAlpha
								);
							}
						}
					}
				}

				// Faster secondary layer (subtle)
				if (layer2Alpha > 0.001) {
					const dxTop =
						turbulenceUnit(stripIndex, turbulenceT2, 110.7, 197.2) * turbulenceAmp2;
					const dxBottom =
						turbulenceUnit(stripIndex + 1, turbulenceT2, 110.7, 197.2) * turbulenceAmp2;
					const shear = (dxBottom - dxTop) / stripHeight;
					const translateX = dxTop - shear * yStart;

					cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
					cloudsCtx.globalAlpha = layer2Alpha;

					if (layer2Pattern) {
						cloudsCtx.translate(x1, y1);
						cloudsCtx.fillStyle = layer2Pattern;
						cloudsCtx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
					} else {
						for (let x = x1 - w; x < w + w; x += w) {
							for (let y = y1; y < h; y += h) {
								cloudsCtx.drawImage(layer2Source, x, y, w, h);
							}
						}
					}
				}

				cloudsCtx.restore();
			}

			// Polar fade: zero out alpha in the rows that the globe projection
			// would otherwise smear into a distortion ring around each pole.
			// `destination-in` preserves the existing cloud composite exactly,
			// just attenuated where the projection breaks down.
			const polarMask = getCloudsPolarFadeMask(h);
			if (polarMask) {
				try {
					cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
					cloudsCtx.globalAlpha = 1;
					cloudsCtx.globalCompositeOperation = 'destination-in';
					cloudsCtx.drawImage(polarMask, 0, 0, w, h);
					cloudsCtx.globalCompositeOperation = 'source-over';
				} catch {
					// Ignore.
				}
			}
		};

		const driftUpdateMs = IS_SAFARI
			? SAFARI_CLOUDS_DRIFT_UPDATE_MS
			: CLOUDS_DRIFT_UPDATE_MS;
		const tick = (now: number, img: HTMLImageElement, pattern: CanvasPattern | null) => {
			if (canceled) return;

			// Every drift tick can force a whole-map repaint (triggerRepaint below). Skip
			// ticks entirely while the weather visuals are invisible (deep zoom in moods
			// with no deep-zoom cloud veil; lightning and snow are also hidden at
			// CLOUDS_OVERLAY_FADE_OUT_END_ZOOM), and at rest drop the cadence —
			// sub-pixel drift at 10fps reads the same.
			let effectiveDriftMs = driftUpdateMs;
			if (CANVAS_PERF_MODE) {
				const cfg = weatherMoodConfigRef.current;
				let zoom: number | null = null;
				try {
					zoom = map.getZoom();
				} catch {
					zoom = null;
				}
				if (
					zoom != null &&
					zoom >= CLOUDS_OVERLAY_FADE_OUT_END_ZOOM &&
					cfg.cloudDeepZoomOpacity <= 0.001 &&
					lightningEventsRef.current.length === 0 &&
					!lightningUploadWasActiveRef.current &&
					!snowUploadWasActiveRef.current
				) {
					// Run the mood-gated asset lifecycle even while idling: a
					// storm→normal fade crosses this skip's opacity gate (~8s) long
					// before the 90s continuous fade flips the storm-asset needs off,
					// so without this the release would never fire during a deep-zoom
					// dwell and the retired masks/stamps (~17MB) would stay resident
					// until the user happened to zoom back out. Cheap boolean checks
					// when nothing changed; builds only run when a mood actually
					// needs assets (which also disengages this skip via the mood's
					// nonzero deep-zoom opacity floor).
					try {
						ensureWeatherAssetsForNeeds(img);
					} catch {
						// Ignore.
					}
					// Keep dt sane for the eventual resume, keep the rAF chain
					// alive, do no draw/upload/repaint work: the map truly idles.
					cloudsDriftLastFrameMsRef.current = now;
					cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
					return;
				}
				try {
					if (
						!map.isMoving() &&
						now - cloudsDriftLastCameraMoveMsRef.current > SAFARI_CLOUDS_IDLE_AFTER_MS
					) {
						effectiveDriftMs = SAFARI_CLOUDS_IDLE_DRIFT_UPDATE_MS;
					}
				} catch {
					// Keep the normal cadence.
				}
			}

			const last = cloudsDriftLastFrameMsRef.current;
			if (!last || now - last >= effectiveDriftMs) {
				const dtS = last ? (now - last) / 1000 : 0;
				cloudsDriftLastFrameMsRef.current = now;
				const dtReal = clamp(dtS, 0, 0.25);
				const dt = dtReal * CLOUDS_DRIFT_TIME_SCALE;
				cloudsDriftSimTimeMsRef.current += dt * 1000;
				// Mood-gated asset lifecycle: cheap boolean checks per frame; builds or
				// releases only when the needed-asset set actually changes (e.g. a mood
				// transition starts or completes).
				try {
					ensureWeatherAssetsForNeeds(img);
				} catch {
					// Ignore.
				}
				try {
					draw(img, pattern, cloudsDriftSimTimeMsRef.current, dt);
				} catch {
					// Ignore.
				}
				try {
					drawLightning(now);
				} catch {
					// Ignore.
				}
				try {
					drawSnow(cloudsDriftSimTimeMsRef.current);
				} catch {
					// Ignore.
				}
				if (CANVAS_PERF_MODE) {
					// Upload this tick's content, then leave the sources paused so the map
					// idles between ticks instead of re-uploading every canvas every frame.
					uploadCanvasSourceOnce(cloudsSource);

					// Lightning/snow upload only while visually active, plus one trailing
					// tick so the final cleared canvas reaches the GPU (drawLightning and
					// drawSnow clearRect every tick).
					const cfg = weatherMoodConfigRef.current;
					const lightningActive = lightningEventsRef.current.length > 0;
					if (lightningActive || lightningUploadWasActiveRef.current) {
						try {
							uploadCanvasSourceOnce(
								map.getSource(MAPBOX_SOURCE_IDS.lightning) as {
									play?: () => void;
									pause?: () => void;
								} | null
							);
						} catch {
							// Ignore.
						}
					}
					lightningUploadWasActiveRef.current = lightningActive;

					const snowActive = cfg.snowOpacity > 0.001 && cfg.snowDensity > 0.001;
					if (snowActive || snowUploadWasActiveRef.current) {
						try {
							uploadCanvasSourceOnce(
								map.getSource(MAPBOX_SOURCE_IDS.snow) as {
									play?: () => void;
									pause?: () => void;
								} | null
							);
						} catch {
							// Ignore.
						}
					}
					snowUploadWasActiveRef.current = snowActive;
				}
				// In some Mapbox GL configurations `animate: true` is not enough to force
				// continuous sampling; request repaint after every animated canvas is current.
				try {
					map.triggerRepaint();
				} catch {
					// Ignore.
				}
			}

			cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
		};

		// Cancel any in-flight drift loop before starting.
		if (cloudsDriftRafRef.current != null) {
			cancelAnimationFrame(cloudsDriftRafRef.current);
			cloudsDriftRafRef.current = null;
		}

		loadTexture()
			.then((img) => {
				if (canceled) return;
				const initialNow = performance.now();
				cloudsDriftOffsetRef.current = { x: 0, y: 0 };
				// Seed a non-zero initial offset so the secondary layer reads as a distinct
				// cloud system immediately (rather than starting perfectly aligned and only
				// diverging after minutes of drift).
				{
					const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const sx = hash01(901.7);
					const sy = hash01(1902.3);
					cloudsDriftOffsetSecondaryRef.current = { x: sx * w, y: sy * h };
				}
				cloudsDriftSimTimeMsRef.current = 0;
				cloudsDriftLastFrameMsRef.current = initialNow;
				if (!cloudsTexturePatternRef.current) {
					try {
						cloudsTexturePatternRef.current = cloudsCtx.createPattern(img, 'repeat');
					} catch {
						cloudsTexturePatternRef.current = null;
					}
				}
				// Build the always-needed patterns (base/groups/haze) first, then let the
				// mood-gated pass decide which heavyweight extras this session needs —
				// normal/sunny sessions skip the storm/secondary/lightning/snow assets
				// entirely (the per-frame ensure in tick() builds them if a mood arrives).
				ensureCloudsGroupPatterns(img);
				ensureWeatherAssetsForNeeds(img);
				// Seed group offsets so the independently-drifting structures start de-phased
				// immediately (no initial "locked" look).
				{
					const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const groupOffsets = cloudsDriftGroupOffsetsRef.current;
					for (let g = 0; g < groupOffsets.length; g++) {
						const sx = hash01(5000.7 + g * 91.3);
						const sy = hash01(6000.2 + g * 113.9);
						groupOffsets[g].x = sx * w;
						groupOffsets[g].y = sy * h;
					}
				}
				const pattern = cloudsTexturePatternRef.current;
				draw(img, pattern, 0, 0);
				cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
			})
			.catch(() => {
				// If the texture fails to load, just leave clouds static.
			});

		// Stamp camera motion so the Safari idle drift cadence can re-engage the
		// normal cadence the moment the user (or an ease) moves the camera.
		const stampCameraMove = () => {
			cloudsDriftLastCameraMoveMsRef.current = performance.now();
		};
		stampCameraMove();
		map.on('move', stampCameraMove);

		return () => {
			canceled = true;
			map.off('move', stampCameraMove);
			lightningWasEnabledRef.current = false;
			lightningEventsRef.current = [];
			lightningNextFlashAtMsRef.current = 0;
			try {
				cloudsSource.pause?.();
			} catch {
				// Ignore.
			}
			try {
				(
					map.getSource(MAPBOX_SOURCE_IDS.snow) as { pause?: () => void } | undefined
				)?.pause?.();
			} catch {
				// Ignore.
			}
			if (cloudsDriftRafRef.current != null) {
				cancelAnimationFrame(cloudsDriftRafRef.current);
				cloudsDriftRafRef.current = null;
			}
		};
	}, [map, isMapLoaded]);
};
