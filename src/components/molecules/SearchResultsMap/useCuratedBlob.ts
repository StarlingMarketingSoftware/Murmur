'use client';

import { useCallback, useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { CuratedBlobMorphSource, LatLngLiteral } from './types';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import {
	CURATED_BLOB_LOBE_MAX_COUNT,
	CURATED_BLOB_LOBE_MAX_RADIUS_KM,
	CURATED_BLOB_LOBE_MIN_COUNT,
	CURATED_BLOB_LOBE_MIN_RADIUS_KM,
	CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO,
	CURATED_BLOB_LOBE_PADDING_KM,
	CURATED_BLOB_LOBE_RADIUS_JITTER,
	CURATED_BLOB_MAX_REGIONS,
	CURATED_BLOB_MAX_REGION_SPAN_KM,
	CURATED_BLOB_MIN_REGION_POINTS,
	CURATED_BLOB_ORGANIC_WOBBLE,
	CURATED_BLOB_OUTLINE_SMOOTHING_PASSES,
	CURATED_BLOB_SHAPE_STEPS,
	CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM,
	CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM,
	CURATED_ORB_BLOOM_OPACITY,
	CURATED_ORB_COLOR_BLEND_OPACITY,
	CURATED_ORB_ELLIPSE_RX_RATIO,
	CURATED_ORB_ELLIPSE_RY_RATIO,
	CURATED_ORB_GRADIENT_ROTATION_DEG,
	CURATED_ORB_GRADIENT_SCALE_X_RATIO,
	CURATED_ORB_GRADIENT_SCALE_Y_RATIO,
	CURATED_ORB_SLOT_COUNT,
	CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM,
	CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM,
	MAPBOX_SOURCE_IDS,
	MAP_DEFAULT_ZOOM,
} from './constants';
import { computeGlobeFrontHemisphereOpacity } from './coordinates';
import {
	buildCuratedBlobClusterLobeMultiPolygons,
	buildMercatorCircleMultiPolygon,
	buildScreenPathFromLngLatMultiPolygon,
	createCuratedBlobMorphSourcesFromMercatorMultiPolygon,
	mercatorMultiPolygonToLngLat,
	pickAdaptiveCuratedBlobClusters,
	projectCuratedBlobPoint,
	smoothCuratedBlobMultiPolygon,
} from './curatedBlob';
import { createOutlineGeoJsonFromMultiPolygon } from './geometry';
import { computeCuratedOrbT } from './mapExpressions';
import { ClippingMultiPolygon, CuratedBlobMercatorPoint } from './types';
import { ensureWasmGeoModuleLoaded, logWasmGeoRuntimeError } from './wasmGeo';

// Curated "For You" blob: async outline builder (wasm/JS clipping), the
// screen-space orb/morph appliers (published render-phase into the late-binding
// apply*Refs — the sanctioned cross-cluster seam), and the camera binding.

export interface UseCuratedBlobBuilderParams {
	applyBlobMorphRef: MutableRefObject<(() => void) | null>;
	applyCuratedOrbStateRef: MutableRefObject<(() => void) | null>;
	clearCuratedBlobOutline: () => void;
	contactsWithCoords: ContactWithName[];
	curatedBlobOrbTargetsRef: MutableRefObject<Array<{ center: LatLngLiteral; radiusKm: number | null }>>;
	curatedBlobSignatureRef: MutableRefObject<string>;
	getContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	isLoading: boolean | undefined;
	isMapLoaded: boolean;
	lastBlobMorphTAppliedRef: MutableRefObject<number>;
	map: mapboxgl.Map | null;
	naturalBlobMorphSourceRef: MutableRefObject<CuratedBlobMorphSource[] | null>;
	radiusOverlay: SearchResultsMapProps['radiusOverlay'];
	radiusOverlayRef: MutableRefObject<SearchResultsMapProps['radiusOverlay']>;
	searchEngaged: boolean;
	searchQuery: string | null | undefined;
	setHasCuratedBlobOutline: Dispatch<SetStateAction<boolean>>;
	updateCuratedBlobProtectedMarkerIds: (ids: Set<number>) => void;
}

export const useCuratedBlobBuilder = (params: UseCuratedBlobBuilderParams): void => {
	const {
		applyBlobMorphRef,
		applyCuratedOrbStateRef,
		clearCuratedBlobOutline,
		contactsWithCoords,
		curatedBlobOrbTargetsRef,
		curatedBlobSignatureRef,
		getContactCoords,
		isLoading,
		isMapLoaded,
		lastBlobMorphTAppliedRef,
		map,
		naturalBlobMorphSourceRef,
		radiusOverlay,
		radiusOverlayRef,
		searchEngaged,
		searchQuery,
		setHasCuratedBlobOutline,
		updateCuratedBlobProtectedMarkerIds,
	} = params;
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// Curated blob UI is reserved for active search mode.
		// Campaign pages can still color markers via `contact.curatedCategory`, but should not
		// render the search-only blob geometry.
		const searchKey = (searchQuery ?? '').trim();
		if (!searchKey) {
			clearCuratedBlobOutline();
			return;
		}

		if (isLoading || !searchEngaged) {
			clearCuratedBlobOutline();
			return;
		}

		const curatedDots = contactsWithCoords
			.map((contact) => ({
				id: contact.id,
				isCurated: Boolean(contact.curatedCategory),
				coords: getContactCoords(contact),
			}))
			.filter(
				(
					dot
				): dot is {
					id: number;
					isCurated: true;
					coords: LatLngLiteral;
				} => dot.isCurated && dot.coords != null
			)
			.sort((a, b) => a.id - b.id);

		if (curatedDots.length === 0) {
			clearCuratedBlobOutline();
			return;
		}

		const signature = curatedDots
			.map((dot) => `${dot.id}:${dot.coords.lng.toFixed(5)}:${dot.coords.lat.toFixed(5)}`)
			.join('|');
		const radiusOverlaySig = radiusOverlayRef.current
			? `r:${radiusOverlayRef.current.center.lat.toFixed(5)}:${radiusOverlayRef.current.center.lng.toFixed(5)}:${radiusOverlayRef.current.radiusMiles}`
			: 'r:none';
		const nextSignature = `v12:${CURATED_BLOB_MIN_REGION_POINTS}:${CURATED_BLOB_MAX_REGIONS}:${CURATED_BLOB_MAX_REGION_SPAN_KM}:${CURATED_BLOB_SHAPE_STEPS}:${CURATED_BLOB_OUTLINE_SMOOTHING_PASSES}:${CURATED_BLOB_LOBE_MIN_COUNT}:${CURATED_BLOB_LOBE_MAX_COUNT}:${CURATED_BLOB_LOBE_PADDING_KM}:${CURATED_BLOB_LOBE_MIN_RADIUS_KM}:${CURATED_BLOB_LOBE_MAX_RADIUS_KM}:${CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO}:${CURATED_BLOB_LOBE_RADIUS_JITTER}:${CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM}:${CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM}:${CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM}:${CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM}:${CURATED_BLOB_ORGANIC_WOBBLE}:${radiusOverlaySig}:${signature}`;
		if (nextSignature === curatedBlobSignatureRef.current) return;

		let cancelled = false;

		const updateCuratedBlob = async () => {
			const radiusOv = radiusOverlayRef.current;
			const protectedMarkerIds = new Set<number>();
			let lobeMultiPolygons: ClippingMultiPolygon[];

			if (radiusOv) {
				// Radius mode: one circular blob at the radius center, sized to the
				// committed search radius. Reuses the same blob/orb visuals as a single circle.
				const circle = buildMercatorCircleMultiPolygon(
					radiusOv.center,
					radiusOv.radiusMiles * 1.609344,
					CURATED_BLOB_SHAPE_STEPS,
					0,
					0
				);
				if (!circle) {
					if (!cancelled) clearCuratedBlobOutline();
					return;
				}
				lobeMultiPolygons = [circle];
				for (const dot of curatedDots) protectedMarkerIds.add(dot.id);
			} else {
				const mercatorPoints = curatedDots
					.map((dot) => projectCuratedBlobPoint(dot.id, dot.coords))
					.filter((point): point is CuratedBlobMercatorPoint => point != null);

				if (mercatorPoints.length === 0) {
					if (!cancelled) clearCuratedBlobOutline();
					return;
				}

				const clusters = pickAdaptiveCuratedBlobClusters(mercatorPoints);
				for (const cluster of clusters) {
					for (const point of cluster.points) {
						protectedMarkerIds.add(point.id);
					}
				}
				lobeMultiPolygons = clusters.flatMap((cluster, index) =>
					buildCuratedBlobClusterLobeMultiPolygons(cluster, index)
				);
			}

			if (lobeMultiPolygons.length === 0) {
				if (!cancelled) clearCuratedBlobOutline();
				return;
			}

			let unionedMercatorMultiPolygon: ClippingMultiPolygon | null =
				lobeMultiPolygons.length === 1 ? lobeMultiPolygons[0] : null;
			if (!unionedMercatorMultiPolygon) {
				const wasmGeo = await ensureWasmGeoModuleLoaded();
				if (typeof wasmGeo?.union_multi_polygons === 'function') {
					try {
						const out = wasmGeo.union_multi_polygons(lobeMultiPolygons);
						if (Array.isArray(out) && out.length) unionedMercatorMultiPolygon = out;
					} catch (err) {
						logWasmGeoRuntimeError(err);
					}
				}
			}

			if (!unionedMercatorMultiPolygon) {
				try {
					const { unionClippingMultiPolygons } = await import('@/utils/polygonClipping');
					unionedMercatorMultiPolygon = unionClippingMultiPolygons(...lobeMultiPolygons);
				} catch (err) {
					console.error('Failed to union curated blob lobes', err);
				}
			}

			const naturalMercatorMultiPolygon = smoothCuratedBlobMultiPolygon(
				unionedMercatorMultiPolygon?.length
					? unionedMercatorMultiPolygon
					: lobeMultiPolygons.flat(),
				CURATED_BLOB_OUTLINE_SMOOTHING_PASSES
			);
			const morphSources = createCuratedBlobMorphSourcesFromMercatorMultiPolygon(
				naturalMercatorMultiPolygon
			);

			if (morphSources.length === 0) {
				if (!cancelled) clearCuratedBlobOutline();
				return;
			}

			if (cancelled) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.curatedBlob) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source) return;

			curatedBlobOrbTargetsRef.current = morphSources.map((shapeSource) => ({
				center: shapeSource.center,
				radiusKm: shapeSource.radiusKm,
			}));
			updateCuratedBlobProtectedMarkerIds(protectedMarkerIds);
			naturalBlobMorphSourceRef.current = morphSources;
			lastBlobMorphTAppliedRef.current = Number.NaN;
			curatedBlobSignatureRef.current = nextSignature;
			// applyBlobMorph (below) commits the lngLat geometry into
			// curatedBlobLngLatMultiPolygonRef; mirror its presence reactively so the
			// outside-blob clip + perimeter logic can engage now that an outline exists.
			setHasCuratedBlobOutline(true);

			// Apply the current morph state (which depends on current zoom).
			// At t=0 this writes the natural geometry; otherwise it writes the
			// vertex-lerped morph toward the circle.
			applyBlobMorphRef.current?.();
			applyCuratedOrbStateRef.current?.();
		};

		void updateCuratedBlob();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		searchQuery,
		isLoading,
		searchEngaged,
		contactsWithCoords,
		radiusOverlay,
		clearCuratedBlobOutline,
		updateCuratedBlobProtectedMarkerIds,
	]);
};

export interface UseCuratedBlobOrbParams {
	applyBlobMorphRef: MutableRefObject<(() => void) | null>;
	applyCuratedOrbStateRef: MutableRefObject<(() => void) | null>;
	curatedBlobLngLatMultiPolygonRef: MutableRefObject<ClippingMultiPolygon | null>;
	curatedBlobLngLatShapeMultiPolygonsRef: MutableRefObject<ClippingMultiPolygon[]>;
	curatedBlobOrbTargetsRef: MutableRefObject<Array<{ center: LatLngLiteral; radiusKm: number | null }>>;
	curatedOrbBloomEllipseRefs: MutableRefObject<Array<SVGEllipseElement | null>>;
	curatedOrbBloomGradientRefs: MutableRefObject<Array<SVGRadialGradientElement | null>>;
	curatedOrbClipPathRefs: MutableRefObject<Array<SVGPathElement | null>>;
	curatedOrbEllipseRefs: MutableRefObject<Array<SVGEllipseElement | null>>;
	curatedOrbGradientRefs: MutableRefObject<Array<SVGRadialGradientElement | null>>;
	curatedOrbRef: MutableRefObject<SVGSVGElement | null>;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	lastBlobMorphTAppliedRef: MutableRefObject<number>;
	mapRef: MutableRefObject<mapboxgl.Map | null>;
	naturalBlobMorphSourceRef: MutableRefObject<CuratedBlobMorphSource[] | null>;
}

export const useCuratedBlobOrb = (params: UseCuratedBlobOrbParams) => {
	const {
		applyBlobMorphRef,
		applyCuratedOrbStateRef,
		curatedBlobLngLatMultiPolygonRef,
		curatedBlobLngLatShapeMultiPolygonsRef,
		curatedBlobOrbTargetsRef,
		curatedOrbBloomEllipseRefs,
		curatedOrbBloomGradientRefs,
		curatedOrbClipPathRefs,
		curatedOrbEllipseRefs,
		curatedOrbGradientRefs,
		curatedOrbRef,
		interactiveFloorDeltaRef,
		lastBlobMorphTAppliedRef,
		mapRef,
		naturalBlobMorphSourceRef,
	} = params;
	// Curated cluster orbs: project each current morphed blob to screen space,
	// then fit one SVG gradient to each projected blob bounds.
	const applyCuratedOrbState = useCallback(() => {
		const m = mapRef.current;
		const orb = curatedOrbRef.current;
		if (!m || !orb) return;
		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const bloomT = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
		const colorOpacity = CURATED_ORB_COLOR_BLEND_OPACITY * (1 - bloomT);
		const bloomOpacity = CURATED_ORB_BLOOM_OPACITY * bloomT;
		const shapeMultiPolygons = curatedBlobLngLatShapeMultiPolygonsRef.current;
		const targets = curatedBlobOrbTargetsRef.current;
		let hasVisibleSlot = false;

		for (let i = 0; i < CURATED_ORB_SLOT_COUNT; i++) {
			const ellipse = curatedOrbEllipseRefs.current[i];
			const bloomEllipse = curatedOrbBloomEllipseRefs.current[i];
			const gradient = curatedOrbGradientRefs.current[i];
			const bloomGradient = curatedOrbBloomGradientRefs.current[i];
			const clipPath = curatedOrbClipPathRefs.current[i];
			const hideSlot = () => {
				clipPath?.setAttribute('d', '');
				ellipse?.setAttribute('opacity', '0');
				bloomEllipse?.setAttribute('opacity', '0');
			};
			if (!ellipse || !bloomEllipse || !gradient || !bloomGradient || !clipPath) {
				continue;
			}

			const shapeMultiPolygon = shapeMultiPolygons[i];
			if (!shapeMultiPolygon?.length) {
				hideSlot();
				continue;
			}

			const target = targets[i];
			const frontHemisphereOpacity = computeGlobeFrontHemisphereOpacity(
				m,
				target?.center ?? null,
				target?.radiusKm ?? null,
				zoom
			);
			if (frontHemisphereOpacity <= 0.006) {
				hideSlot();
				continue;
			}

			const projectedClip = buildScreenPathFromLngLatMultiPolygon(m, shapeMultiPolygon);
			if (!projectedClip) {
				hideSlot();
				continue;
			}

			const width = projectedClip.maxX - projectedClip.minX;
			const height = projectedClip.maxY - projectedClip.minY;
			if (
				!Number.isFinite(width) ||
				!Number.isFinite(height) ||
				width <= 0 ||
				height <= 0
			) {
				hideSlot();
				continue;
			}

			const halfWidth = width / 2;
			const halfHeight = height / 2;
			const centerX = projectedClip.minX + halfWidth;
			const centerY = projectedClip.minY + halfHeight;
			ellipse.setAttribute('cx', centerX.toFixed(2));
			ellipse.setAttribute('cy', centerY.toFixed(2));
			bloomEllipse.setAttribute('cx', centerX.toFixed(2));
			bloomEllipse.setAttribute('cy', centerY.toFixed(2));
			ellipse.setAttribute('rx', (halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2));
			ellipse.setAttribute('ry', (halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2));
			const bloomRadius = Math.max(halfWidth, halfHeight);
			bloomEllipse.setAttribute('rx', bloomRadius.toFixed(2));
			bloomEllipse.setAttribute('ry', bloomRadius.toFixed(2));
			gradient.setAttribute(
				'gradientTransform',
				`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) rotate(${CURATED_ORB_GRADIENT_ROTATION_DEG}) scale(${(
					halfWidth * CURATED_ORB_GRADIENT_SCALE_X_RATIO
				).toFixed(2)} ${(halfHeight * CURATED_ORB_GRADIENT_SCALE_Y_RATIO).toFixed(2)})`
			);
			bloomGradient.setAttribute(
				'gradientTransform',
				`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) scale(${bloomRadius.toFixed(2)})`
			);
			clipPath.setAttribute('d', projectedClip.d);
			ellipse.setAttribute('opacity', (colorOpacity * frontHemisphereOpacity).toFixed(3));
			bloomEllipse.setAttribute(
				'opacity',
				(bloomOpacity * frontHemisphereOpacity).toFixed(3)
			);
			hasVisibleSlot = true;
		}

		orb.style.opacity = hasVisibleSlot ? '1' : '0';
	}, []);
	applyCuratedOrbStateRef.current = applyCuratedOrbState;

	// Vertex-by-vertex morph of the curated blob outline toward a circle of
	// `radiusMerc` around `centerMerc`. Each vertex moves along its own ray
	// from the centroid, so a non-circular blob smoothly widens out into the
	// target circle as `t` grows from 0 → 1. Even when the morph geometry
	// itself is unchanged, the SVG clip must still be reprojected on every
	// render frame so it stays locked to Mapbox's fast camera transforms.
	const applyBlobMorph = useCallback(() => {
		const m = mapRef.current;
		if (!m) return;
		const morphSources = naturalBlobMorphSourceRef.current;
		const source = m.getSource(MAPBOX_SOURCE_IDS.curatedBlob) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;
		if (!morphSources?.length) {
			lastBlobMorphTAppliedRef.current = Number.NaN;
			curatedBlobLngLatMultiPolygonRef.current = null;
			curatedBlobLngLatShapeMultiPolygonsRef.current = [];
			return;
		}
		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const t = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
		if (Math.abs(t - lastBlobMorphTAppliedRef.current) < 0.001) {
			applyCuratedOrbStateRef.current?.();
			return;
		}
		lastBlobMorphTAppliedRef.current = t;

		const morphedShapes = morphSources.map(
			({ mercatorMultiPolygon, centerMerc, radiusMerc }) =>
				t <= 0
					? mercatorMultiPolygon
					: mercatorMultiPolygon.map((polygon) =>
							polygon.map((ring) =>
								ring.map((point): [number, number] => {
									const dx = point[0] - centerMerc.x;
									const dy = point[1] - centerMerc.y;
									if (dx === 0 && dy === 0) return [point[0], point[1]];
									const angle = Math.atan2(dy, dx);
									const tx = centerMerc.x + Math.cos(angle) * radiusMerc;
									const ty = centerMerc.y + Math.sin(angle) * radiusMerc;
									return [point[0] + (tx - point[0]) * t, point[1] + (ty - point[1]) * t];
								})
							)
						)
		);
		const lngLatShapes = morphedShapes.map(mercatorMultiPolygonToLngLat);
		const lngLat = lngLatShapes.flat();
		curatedBlobLngLatShapeMultiPolygonsRef.current = lngLatShapes;
		curatedBlobLngLatMultiPolygonRef.current = lngLat;
		const fc = createOutlineGeoJsonFromMultiPolygon(lngLat);
		try {
			source.setData(fc as GeoJSON.FeatureCollection);
		} catch {
			// Non-fatal; the source can be transiently invalid mid camera churn. The
			// orb resyncs on the next move/idle frame.
		}
		applyCuratedOrbStateRef.current?.();
	}, []);
	applyBlobMorphRef.current = applyBlobMorph;
	return { applyCuratedOrbState, applyBlobMorph };

};

export interface UseCuratedBlobMorphBindingParams {
	applyBlobMorph: () => void;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
}

export const useCuratedBlobMorphBinding = (params: UseCuratedBlobMorphBindingParams): void => {
	const {
		applyBlobMorph,
		isMapLoaded,
		map,
	} = params;
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applyBlobMorph();
		// `move` fires on every camera-change frame, which keeps the DOM SVG clip
		// in the same cadence as Mapbox's camera transform during quick pinch/
		// scroll zooms — without also running on every non-camera repaint (e.g.
		// the clouds-drift ticks) the way `render` did. All non-camera triggers
		// invoke applyBlobMorph directly.
		map.on('move', applyBlobMorph);
		map.on('moveend', applyBlobMorph);
		map.on('resize', applyBlobMorph);
		return () => {
			map.off('move', applyBlobMorph);
			map.off('moveend', applyBlobMorph);
			map.off('resize', applyBlobMorph);
		};
	}, [map, isMapLoaded, applyBlobMorph]);
};
