'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { BoundingBox, CuratedBlobMorphSource } from './types';
import {
	CURATED_ORB_ELLIPSE_RX_RATIO,
	CURATED_ORB_ELLIPSE_RY_RATIO,
	CURATED_ORB_GRADIENT_ROTATION_DEG,
	CURATED_ORB_GRADIENT_SCALE_X_RATIO,
	CURATED_ORB_GRADIENT_SCALE_Y_RATIO,
	MAPBOX_SOURCE_IDS,
	MAP_DEFAULT_ZOOM,
	SELECTED_STATE_GRADIENT_BLOOM_OPACITY,
	SELECTED_STATE_GRADIENT_COLOR_OPACITY,
} from './constants';
import { computeGlobeFrontHemisphereOpacity } from './coordinates';
import { buildScreenPathFromLngLatMultiPolygon, morphCuratedBlobSourceToLngLat } from './curatedBlob';
import { createOutlineGeoJsonFromMultiPolygon } from './geometry';
import { computeCuratedOrbT } from './mapExpressions';
import { ClippingMultiPolygon } from './types';

export interface UseSelectedStateGradientParams {
	applySelectedStateGradientStateRef: MutableRefObject<(() => void) | null>;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	isLoading: boolean | undefined;
	isLoadingRef: MutableRefObject<boolean>;
	isMapLoaded: boolean;
	isStateLayerReady: boolean;
	lockedStateKey: string | null;
	lockedStateSelectionBboxRef: MutableRefObject<BoundingBox | null>;
	lockedStateSelectionKeyRef: MutableRefObject<string | null>;
	lockedStateSelectionMultiPolygonRef: MutableRefObject<ClippingMultiPolygon | null>;
	map: mapboxgl.Map | null;
	mapRef: MutableRefObject<mapboxgl.Map | null>;
	presentation: 'background' | 'interactive';
	presentationRef: MutableRefObject<'background' | 'interactive'>;
	selectedStateDisplayMultiPolygonRef: MutableRefObject<ClippingMultiPolygon | null>;
	selectedStateGradientBloomEllipseRef: MutableRefObject<SVGEllipseElement | null>;
	selectedStateGradientBloomRef: MutableRefObject<SVGRadialGradientElement | null>;
	selectedStateGradientClipPathRef: MutableRefObject<SVGPathElement | null>;
	selectedStateGradientEllipseRef: MutableRefObject<SVGEllipseElement | null>;
	selectedStateGradientRef: MutableRefObject<SVGRadialGradientElement | null>;
	selectedStateGradientSvgRef: MutableRefObject<SVGSVGElement | null>;
	selectedStateKeyRef: MutableRefObject<string | null>;
	selectedStateLastMorphTAppliedRef: MutableRefObject<number>;
	selectedStateMorphSourceRef: MutableRefObject<CuratedBlobMorphSource | null>;
	selectedStateOutlineSourceKeyRef: MutableRefObject<string>;
}

export const useSelectedStateGradient = (params: UseSelectedStateGradientParams) => {
	const {
		applySelectedStateGradientStateRef,
		interactiveFloorDeltaRef,
		isLoading,
		isLoadingRef,
		isMapLoaded,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionBboxRef,
		lockedStateSelectionKeyRef,
		lockedStateSelectionMultiPolygonRef,
		map,
		mapRef,
		presentation,
		presentationRef,
		selectedStateDisplayMultiPolygonRef,
		selectedStateGradientBloomEllipseRef,
		selectedStateGradientBloomRef,
		selectedStateGradientClipPathRef,
		selectedStateGradientEllipseRef,
		selectedStateGradientRef,
		selectedStateGradientSvgRef,
		selectedStateKeyRef,
		selectedStateLastMorphTAppliedRef,
		selectedStateMorphSourceRef,
		selectedStateOutlineSourceKeyRef,
	} = params;
	const getSelectedStateDisplayMultiPolygon = useCallback(
		(mapInstance: mapboxgl.Map): ClippingMultiPolygon | null => {
			const selection = lockedStateSelectionMultiPolygonRef.current;
			if (!selection?.length) return null;

			const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
			const t = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
			const morphSource = selectedStateMorphSourceRef.current;
			const shouldUseCircleMorph = Boolean(morphSource && t > 0.001);

			let displayMultiPolygon: ClippingMultiPolygon | null = null;
			if (!shouldUseCircleMorph) {
				// High zoom (no orb morph): the drawn outline is the raw state polygon. Keep the
				// display ref pointed at it (and invalidate the morph cache with NaN) so the
				// outside-region clip + perimeter hit-tests read the shape the user actually sees,
				// instead of a stale orb left over from a previous low-zoom frame.
				displayMultiPolygon = selection;
				selectedStateDisplayMultiPolygonRef.current = selection;
				selectedStateLastMorphTAppliedRef.current = Number.NaN;
			} else if (
				Number.isFinite(selectedStateLastMorphTAppliedRef.current) &&
				Math.abs(t - selectedStateLastMorphTAppliedRef.current) < 0.001 &&
				selectedStateDisplayMultiPolygonRef.current
			) {
				displayMultiPolygon = selectedStateDisplayMultiPolygonRef.current;
			} else if (morphSource) {
				displayMultiPolygon = morphCuratedBlobSourceToLngLat(morphSource, t);
				selectedStateDisplayMultiPolygonRef.current = displayMultiPolygon;
				selectedStateLastMorphTAppliedRef.current = t;
			}

			if (!displayMultiPolygon?.length) return null;

			const source = mapInstance.getSource(MAPBOX_SOURCE_IDS.lockedOutline) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const outlineKey = `${selectedStateKeyRef.current ?? ''}:${
				shouldUseCircleMorph ? t.toFixed(3) : 'state'
			}`;
			if (source && selectedStateOutlineSourceKeyRef.current !== outlineKey) {
				selectedStateOutlineSourceKeyRef.current = outlineKey;
				source.setData(createOutlineGeoJsonFromMultiPolygon(displayMultiPolygon) as any);
			}

			return displayMultiPolygon;
		},
		[]
	);

	const applySelectedStateGradientState = useCallback(() => {
		const m = mapRef.current;
		const overlay = selectedStateGradientSvgRef.current;
		if (!overlay) return;

		const ellipse = selectedStateGradientEllipseRef.current;
		const bloomEllipse = selectedStateGradientBloomEllipseRef.current;
		const gradient = selectedStateGradientRef.current;
		const bloomGradient = selectedStateGradientBloomRef.current;
		const clipPath = selectedStateGradientClipPathRef.current;

		const hide = () => {
			overlay.style.opacity = '0';
			clipPath?.setAttribute('d', '');
			ellipse?.setAttribute('opacity', '0');
			bloomEllipse?.setAttribute('opacity', '0');
		};

		if (!m || !ellipse || !bloomEllipse || !gradient || !bloomGradient || !clipPath) {
			hide();
			return;
		}

		if (presentationRef.current === 'background' || isLoadingRef.current) {
			hide();
			return;
		}

		const selectedKey = selectedStateKeyRef.current;
		const lockedKey = lockedStateSelectionKeyRef.current;
		const selection = lockedStateSelectionMultiPolygonRef.current;
		if (!selectedKey || selectedKey !== lockedKey || !selection?.length) {
			hide();
			return;
		}

		const displayMultiPolygon = getSelectedStateDisplayMultiPolygon(m);
		if (!displayMultiPolygon?.length) {
			hide();
			return;
		}

		const projectedClip = buildScreenPathFromLngLatMultiPolygon(m, displayMultiPolygon);
		if (!projectedClip) {
			hide();
			return;
		}

		const width = projectedClip.maxX - projectedClip.minX;
		const height = projectedClip.maxY - projectedClip.minY;
		if (
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width <= 0 ||
			height <= 0
		) {
			hide();
			return;
		}

		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const morphSource = selectedStateMorphSourceRef.current;
		const bbox = lockedStateSelectionBboxRef.current;
		const stateCenter =
			morphSource?.center ??
			(bbox
				? {
						lat: (bbox.minLat + bbox.maxLat) / 2,
						lng: (bbox.minLng + bbox.maxLng) / 2,
					}
				: null);
		const frontHemisphereOpacity = computeGlobeFrontHemisphereOpacity(
			m,
			stateCenter,
			morphSource?.radiusKm ?? null,
			zoom
		);
		if (frontHemisphereOpacity <= 0.006) {
			hide();
			return;
		}
		const bloomT = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
		const colorOpacity =
			SELECTED_STATE_GRADIENT_COLOR_OPACITY * (1 - bloomT) * frontHemisphereOpacity;
		const bloomOpacity =
			SELECTED_STATE_GRADIENT_BLOOM_OPACITY * bloomT * frontHemisphereOpacity;

		const halfWidth = width / 2;
		const halfHeight = height / 2;
		const centerX = projectedClip.minX + halfWidth;
		const centerY = projectedClip.minY + halfHeight;
		const bloomRadius = Math.max(halfWidth, halfHeight);

		ellipse.setAttribute('cx', centerX.toFixed(2));
		ellipse.setAttribute('cy', centerY.toFixed(2));
		bloomEllipse.setAttribute('cx', centerX.toFixed(2));
		bloomEllipse.setAttribute('cy', centerY.toFixed(2));
		ellipse.setAttribute('rx', (halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2));
		ellipse.setAttribute('ry', (halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2));
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
		ellipse.setAttribute('opacity', colorOpacity.toFixed(3));
		bloomEllipse.setAttribute('opacity', bloomOpacity.toFixed(3));
		overlay.style.opacity = '1';
	}, [getSelectedStateDisplayMultiPolygon]);
	applySelectedStateGradientStateRef.current = applySelectedStateGradientState;

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applySelectedStateGradientState();
		// Camera events only (not `render`): the gradient's inputs are all
		// camera-derived; non-camera triggers call the function directly.
		map.on('move', applySelectedStateGradientState);
		map.on('moveend', applySelectedStateGradientState);
		map.on('resize', applySelectedStateGradientState);
		return () => {
			map.off('move', applySelectedStateGradientState);
			map.off('moveend', applySelectedStateGradientState);
			map.off('resize', applySelectedStateGradientState);
		};
	}, [map, isMapLoaded, applySelectedStateGradientState]);

	useEffect(() => {
		applySelectedStateGradientState();
	}, [
		applySelectedStateGradientState,
		presentation,
		isLoading,
		lockedStateKey,
		isStateLayerReady,
	]);
	return { getSelectedStateDisplayMultiPolygon, applySelectedStateGradientState };

};
