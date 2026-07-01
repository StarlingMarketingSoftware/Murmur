'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import type {
	CuratedBlobMorphSource,
	DotWaveMeta,
} from './types';
import type { CampaignStatusMarkerStyle } from './markerStatusStyles';
import { washOutHexColor } from './color';
import {
	CURATED_STABLE_MARKER_MAX_DOTS,
	DOT_WAVE_DELAY_PROP,
	DOT_WAVE_EASING,
	DOT_WAVE_FADE_MS,
	DOT_WAVE_FRAME_MS,
	DOT_WAVE_SMOOTH_TRANSITION_MS,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE,
	RESULT_DOT_TRANSPARENT_STROKE_COLOR,
} from './constants';
import { computeDotWaveDelayMs, computeDotWaveTravelMs } from './dotWave';
import {
	darkenHexColor,
	getCategorizedDotGlowZoomFadedOpacity,
	getCategorizedDotZoomFadedOpacity,
	getNormalMarkerFadeOpacityExpr,
	getSelectedStateOrbZoomFadedOpacity,
} from './mapExpressions';
import { VENUE_DOT_RADIUS_SCALE, buildBaseMarkerVisibilityFilter, withFeatureFillOpacity, withFeatureStrokeOpacity } from './markerStatusStyles';
import { getResultDotColorForWhat, withCategorizedDotOpacity, withResultDotGlowOpacity } from './searchMode';
import { isCleanMapMarkerCategory } from '@/components/atoms/_svg/mapTooltipCategoryIcons';


export interface UseBaseDotsWaveControlParams {
	baseDotsWaveCancelRef: MutableRefObject<(() => void) | null>;
	campaignFootprintContactIdSet: Set<number>;
	campaignMarkerMode: 'category' | 'status';
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	visibleContactIdSetRef: MutableRefObject<Set<number>>;
}

export const useBaseDotsWaveControl = (params: UseBaseDotsWaveControlParams) => {
	const {
		baseDotsWaveCancelRef,
		campaignFootprintContactIdSet,
		campaignMarkerMode,
		isMapLoaded,
		map,
		visibleContactIdSetRef,
	} = params;
	const stopBaseDotsWaveAndRestoreSteadyRendering = useCallback(() => {
		if (!map || !isMapLoaded) return;

		const cancel = baseDotsWaveCancelRef.current;
		if (cancel) {
			cancel();
			baseDotsWaveCancelRef.current = null;
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseGlow)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity',
					getCategorizedDotGlowZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
				);
			}
			if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity',
					withFeatureFillOpacity(
						getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
					)
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity',
					withFeatureStrokeOpacity(
						getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
					)
				);
			}
			if (map.getLayer(MAPBOX_LAYER_IDS.baseFallbackIcons)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseFallbackIcons,
					'icon-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseFallbackIcons,
					'icon-opacity',
					getSelectedStateOrbZoomFadedOpacity(1, getNormalMarkerFadeOpacityExpr())
				);
			}
		} catch {
			// Ignore style timing races.
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
				// Restore the visibility filter (not `null`) so hit detection
				// stays scoped to the currently-sampled visibleContacts after
				// the wave completes. Otherwise off-screen-sampled-out features
				// would be hit-testable just because they're in the source.
				const visibleIds = Array.from(visibleContactIdSetRef.current);
				const visibilityFilter = buildBaseMarkerVisibilityFilter(
					visibleIds,
					map.getZoom() ?? 0,
					campaignFootprintContactIdSet
				);
				map.setFilter(MAPBOX_LAYER_IDS.baseHit, visibilityFilter);
			}
		} catch {
			// Ignore style timing races.
		}
	}, [map, isMapLoaded, campaignFootprintContactIdSet]);

	// Status mode renders every contact as a campaign-status dot, so the soft glow
	// halos beneath them read as fuzzy "residue" around the crisp status circles.
	// Hide those glow layers while in status mode; restore them for category mode.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const hideStatusGlow = campaignMarkerMode === 'status';
		const glowLayerIds = [
			MAPBOX_LAYER_IDS.baseGlow,
			MAPBOX_LAYER_IDS.markerConstellationNodeGlow,
		];
		for (const layerId of glowLayerIds) {
			if (!map.getLayer(layerId)) continue;
			try {
				map.setLayoutProperty(layerId, 'visibility', hideStatusGlow ? 'none' : 'visible');
			} catch {
				// Ignore style timing races.
			}
		}
		// The campaign heatmap glow is the colored replacement for that white halo,
		// so it shows exactly when the per-dot glow hides (status mode only).
		if (map.getLayer(MAPBOX_LAYER_IDS.campaignHeatmapGlow)) {
			try {
				map.setLayoutProperty(
					MAPBOX_LAYER_IDS.campaignHeatmapGlow,
					'visibility',
					hideStatusGlow ? 'visible' : 'none'
				);
			} catch {
				// Ignore style timing races.
			}
		}
	}, [map, isMapLoaded, campaignMarkerMode]);

	// If the user starts panning/zooming while the post-search reveal wave is running,
	// switch back to steady rendering so newly sampled viewport dots don't appear to vanish.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const onMoveStart = () => {
			if (!baseDotsWaveCancelRef.current) return;
			stopBaseDotsWaveAndRestoreSteadyRendering();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
		};
	}, [map, isMapLoaded, stopBaseDotsWaveAndRestoreSteadyRendering]);
	return { stopBaseDotsWaveAndRestoreSteadyRendering };
};


export interface UseBaseDotsSourceParams {
	baseDotsLastDataKeyRef: MutableRefObject<string>;
	baseDotsLastSearchKeyRef: MutableRefObject<string>;
	baseDotsPendingDataSawLoadingRef: MutableRefObject<boolean>;
	baseDotsPendingDataSearchKeyRef: MutableRefObject<string | null>;
	baseDotsPrevContactsPropLengthRef: MutableRefObject<number>;
	baseDotsWaveCancelRef: MutableRefObject<(() => void) | null>;
	baseDotsWaveMetaRef: MutableRefObject<DotWaveMeta | null>;
	baseDotsWavePendingSearchKeyRef: MutableRefObject<string | null>;
	baseDotsWavePrevIsLoadingRef: MutableRefObject<boolean>;
	contacts: ContactWithName[];
	contactsPropLengthRef: MutableRefObject<number>;
	contactsWithCoords: ContactWithName[];
	disableDotWaveReveal: boolean;
	getCampaignStatusMarkerStyleForContact: (contactId: number) => CampaignStatusMarkerStyle | null;
	getContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	isBackgroundPresentation: boolean;
	isCompactOverlayActive: boolean;
	isCoordsInLockedState: (coords: LatLngLiteral) => boolean;
	isLoading: boolean | undefined;
	isMapLoaded: boolean;
	isStateLayerReady: boolean;
	lockedStateKey: string | null;
	lockedStateSelectionKeyRef: MutableRefObject<string | null>;
	map: mapboxgl.Map | null;
	searchEngaged: boolean;
	searchQuery: string | null | undefined;
	searchWhat: string | null | undefined;
	selectedStateMorphSourceRef: MutableRefObject<CuratedBlobMorphSource | null>;
	stopBaseDotsWaveAndRestoreSteadyRendering: () => void;
	uncategorizedContactMarkerHoverImageName: string;
	uncategorizedContactMarkerImageName: string;
	visibleContacts: ContactWithName[];
}

export const useBaseDotsSource = (params: UseBaseDotsSourceParams): void => {
	const {
		baseDotsLastDataKeyRef,
		baseDotsLastSearchKeyRef,
		baseDotsPendingDataSawLoadingRef,
		baseDotsPendingDataSearchKeyRef,
		baseDotsPrevContactsPropLengthRef,
		baseDotsWaveCancelRef,
		baseDotsWaveMetaRef,
		baseDotsWavePendingSearchKeyRef,
		baseDotsWavePrevIsLoadingRef,
		contacts,
		contactsPropLengthRef,
		contactsWithCoords,
		disableDotWaveReveal,
		getCampaignStatusMarkerStyleForContact,
		getContactCoords,
		isBackgroundPresentation,
		isCompactOverlayActive,
		isCoordsInLockedState,
		isLoading,
		isMapLoaded,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		searchEngaged,
		searchQuery,
		searchWhat,
		selectedStateMorphSourceRef,
		stopBaseDotsWaveAndRestoreSteadyRendering,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerImageName,
		visibleContacts,
	} = params;
	// Base result dots
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBase) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;
		if (isCompactOverlayActive && !searchEngaged) {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			baseDotsLastDataKeyRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}
		const searchKey = (searchQuery ?? '').trim();
		const loading = Boolean(isLoading);
		const hasLoadingSignal = typeof isLoading === 'boolean';
		const prevContactsLen = baseDotsPrevContactsPropLengthRef.current;
		baseDotsPrevContactsPropLengthRef.current = contacts.length;

		if (searchKey !== baseDotsLastSearchKeyRef.current) {
			baseDotsLastSearchKeyRef.current = searchKey;
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = loading;
		} else if (loading && baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSawLoadingRef.current = true;
		} else if (
			!loading &&
			searchKey.length > 0 &&
			prevContactsLen > 0 &&
			contacts.length === 0
		) {
			// Same-query refetch path: parent can momentarily clear contacts before
			// loading flips true. Arm the same empty-commit guard used for new queries.
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = false;
		}

		if (loading) {
			// Stop any in-flight reveal animation while loading/refetching.
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			// Keep currently-rendered dots visible during refetches to avoid zoom flicker.
			return;
		}

		if (!searchEngaged) {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			baseDotsLastDataKeyRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		const hasLockedStateSelection = Boolean(
			lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
		);
		const fadeWithSelectedStateOrb = Boolean(
			hasLockedStateSelection && selectedStateMorphSourceRef.current
		);

		type DotSeed = {
			id: number;
			lng: number;
			lat: number;
			fillColor: string;
			hoverFillColor: string;
			fillOpacity: number;
			strokeColor: string;
			strokeWidth: number;
			strokeOpacity: number;
			radiusScale: number;
			isCurated: boolean;
			isUncategorized: boolean;
			isVenue: boolean;
			statusMode: boolean;
			fadeWithSelectedStateOrb: boolean;
		};
		const dots: DotSeed[] = [];
		let minLng = Number.POSITIVE_INFINITY;
		let maxLng = Number.NEGATIVE_INFINITY;
		let minLat = Number.POSITIVE_INFINITY;
		let maxLat = Number.NEGATIVE_INFINITY;

		// Iterate the FULL contacts list (not the viewport-sampled `visibleContacts`)
		// so the GeoJSON source stays stable across pans/zooms. `setData` only fires
		// when the underlying contacts (or their fillColor inputs) actually change,
		// not on every moveend. The sampled viewport subset is enforced by `setFilter`
		// on the layers (see the visibility-filter useEffect below) — that's cheap
		// and doesn't trigger a layer rebuild, so fast zoom no longer causes the dot
		// layer to briefly clear and re-render ("disappear and reload").
		for (const contact of contactsWithCoords) {
			const coords = getContactCoords(contact);
			if (!coords) continue;
			const isOutsideLockedState = hasLockedStateSelection
				? !isCoordsInLockedState(coords)
				: false;
			const whatForContact = contact.curatedCategory ?? searchWhat ?? null;
			const statusMarkerStyle = getCampaignStatusMarkerStyleForContact(contact.id);
			const isUncategorized = statusMarkerStyle
				? false
				: !isCleanMapMarkerCategory(whatForContact);
			const isVenue = contact.venueId != null;
			const baseFillColor =
				statusMarkerStyle?.fillColor ?? getResultDotColorForWhat(whatForContact);
			const fillColor = isOutsideLockedState
				? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
				: baseFillColor;
			dots.push({
				id: contact.id,
				lng: coords.lng,
				lat: coords.lat,
				fillColor,
				// Status markers keep their fill on hover (darkening a near-white
				// "contacts" dot makes it vanish into the light map); they grow
				// instead. Non-status (search/category) dots keep the darken cue.
				hoverFillColor: statusMarkerStyle ? fillColor : darkenHexColor(fillColor),
				strokeColor:
					statusMarkerStyle?.strokeColor ?? RESULT_DOT_TRANSPARENT_STROKE_COLOR,
				strokeWidth: statusMarkerStyle?.strokeWidth ?? 0,
				strokeOpacity: statusMarkerStyle?.strokeOpacity ?? 0,
				fillOpacity: statusMarkerStyle?.fillOpacity ?? 1,
				radiusScale: isVenue
					? VENUE_DOT_RADIUS_SCALE
					: (statusMarkerStyle?.radiusScale ?? 1),
				isCurated: statusMarkerStyle ? false : Boolean(contact.curatedCategory),
				isUncategorized,
				isVenue,
				statusMode: Boolean(statusMarkerStyle),
				fadeWithSelectedStateOrb,
			});
			minLng = Math.min(minLng, coords.lng);
			maxLng = Math.max(maxLng, coords.lng);
			minLat = Math.min(minLat, coords.lat);
			maxLat = Math.max(maxLat, coords.lat);
		}

		// For a newly issued query/refetch, ignore transient empty pushes until
		// we've observed a loading phase for that same query key.
		if (
			dots.length === 0 &&
			hasLoadingSignal &&
			baseDotsPendingDataSearchKeyRef.current === searchKey &&
			!baseDotsPendingDataSawLoadingRef.current
		) {
			return;
		}

		// Guard against the one-render gap where isLoading just turned false but
		// visibleContacts hasn't been repopulated by recomputeViewportDots yet.
		// Without this, setData would briefly clear all dots before the next render
		// fills them back in, producing a visible disappear/reappear flicker.
		if (dots.length === 0 && contactsPropLengthRef.current > 0) {
			return;
		}

		// Fingerprint the data so we skip redundant setData calls that cause
		// Mapbox to briefly clear and re-render the same features (flicker).
		let dataKey = '';
		for (let i = 0; i < dots.length; i++) {
			const d = dots[i];
			dataKey +=
				(i > 0 ? ',' : '') +
				d.id +
				':' +
				d.fillColor +
				':' +
				d.strokeColor +
				':' +
				d.strokeWidth +
				':' +
				d.strokeOpacity +
				':' +
				d.radiusScale +
				':' +
				(d.isUncategorized ? 'u' : 'c') +
				':' +
				(d.isVenue ? 'v' : 'n') +
				':' +
				(d.statusMode ? 's' : 'n') +
				':' +
				(d.fadeWithSelectedStateOrb ? 'f' : 'n');
		}
		if (dataKey === baseDotsLastDataKeyRef.current) {
			return;
		}
		baseDotsLastDataKeyRef.current = dataKey;
		const isStableCuratedMarkerSet =
			dots.length > 0 &&
			dots.length <= CURATED_STABLE_MARKER_MAX_DOTS &&
			visibleContacts.length === dots.length &&
			visibleContacts.every((contact) => Boolean(contact.curatedCategory));

		// Interrupt the reveal wave before swapping source data; otherwise the in-flight
		// opacity expression can keep newly sampled dots hidden until old delays elapse.
		if (baseDotsWaveCancelRef.current) {
			stopBaseDotsWaveAndRestoreSteadyRendering();
		}

		const travelMs = computeDotWaveTravelMs(dots.length);
		let maxDelayMs = 0;
		const features: any[] = dots.map((dot) => {
			const delayMs = computeDotWaveDelayMs(
				dot.id,
				dot.lng,
				dot.lat,
				minLng,
				maxLng,
				minLat,
				maxLat,
				travelMs
			);
			maxDelayMs = Math.max(maxDelayMs, delayMs);
			return {
				type: 'Feature',
				id: dot.id,
				properties: {
					fillColor: dot.fillColor,
					hoverFillColor: dot.hoverFillColor,
					fillOpacity: dot.fillOpacity,
					strokeColor: dot.strokeColor,
					strokeWidth: dot.strokeWidth,
					strokeOpacity: dot.strokeOpacity,
					radiusScale: dot.radiusScale,
					[DOT_WAVE_DELAY_PROP]: delayMs,
					isCurated: dot.isCurated,
					isUncategorized: dot.isUncategorized,
					isVenue: dot.isVenue,
					statusMode: dot.statusMode,
					fadeWithSelectedStateOrb: dot.fadeWithSelectedStateOrb,
					fallbackIcon: dot.isUncategorized ? uncategorizedContactMarkerImageName : '',
					fallbackIconHover: dot.isUncategorized
						? uncategorizedContactMarkerHoverImageName
						: '',
				},
				geometry: { type: 'Point', coordinates: [dot.lng, dot.lat] },
			};
		});

		baseDotsWaveMetaRef.current = features.length > 0 ? { maxDelayMs } : null;

		// Prevent "show -> hide -> reveal" flicker: if the wave reveal is about to start
		// on this render, pre-prime frame 0 before updating source data so dots don't
		// flash visible for one frame and then disappear.
		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion =
			prefersReducedMotion || disableDotWaveReveal || isStableCuratedMarkerSet;
		// Prime the "hide then reveal" wave frame even during a cinematic camera ease.
		// The reveal itself is deferred until the camera settles (see the wave effect),
		// so the dots stay hidden through the fly and wave in together with the
		// constellation once the camera stops — instead of popping in mid-flight.
		const shouldPrimeWaveFrameZero =
			baseDotsWavePrevIsLoadingRef.current &&
			searchKey.length > 0 &&
			!isBackgroundPresentation &&
			!prefersReducedMotion &&
			baseDotsWavePendingSearchKeyRef.current === searchKey &&
			features.length > 0;
		if (shouldPrimeWaveFrameZero) {
			const expr0 = [
				'interpolate',
				DOT_WAVE_EASING,
				['-', 0, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseGlow)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseGlow,
						'circle-opacity',
						withCategorizedDotOpacity(withResultDotGlowOpacity(expr0))
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-opacity',
						withFeatureFillOpacity(withCategorizedDotOpacity(expr0))
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-stroke-opacity',
						withFeatureStrokeOpacity(expr0)
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.baseFallbackIcons)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseFallbackIcons,
						'icon-opacity',
						expr0
					);
				}
			} catch {
				// Ignore.
			}
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
					map.setFilter(MAPBOX_LAYER_IDS.baseHit, [
						'<=',
						['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
						-1,
					] as any);
				}
			} catch {
				// Ignore.
			}
		}
		source.setData({ type: 'FeatureCollection', features } as any);
		if (baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSearchKeyRef.current = null;
			baseDotsPendingDataSawLoadingRef.current = false;
		}
	}, [
		map,
		isMapLoaded,
		isLoading,
		searchEngaged,
		contacts.length,
		visibleContacts,
		lockedStateKey,
		isStateLayerReady,
		isCoordsInLockedState,
		searchQuery,
		isBackgroundPresentation,
		disableDotWaveReveal,
		getCampaignStatusMarkerStyleForContact,
		stopBaseDotsWaveAndRestoreSteadyRendering,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
		isCompactOverlayActive,
	]);
};


export interface UseBaseDotsVisibilityFilterParams {
	baseDotsWaveCancelRef: MutableRefObject<(() => void) | null>;
	campaignFootprintContactIdSet: Set<number>;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	visibleContacts: ContactWithName[];
}

export const useBaseDotsVisibilityFilter = (params: UseBaseDotsVisibilityFilterParams): void => {
	const {
		baseDotsWaveCancelRef,
		campaignFootprintContactIdSet,
		isMapLoaded,
		map,
		visibleContacts,
	} = params;
	// Drive base-marker visibility via `setFilter` (cheap, no layer rebuild)
	// instead of changing source data on every viewport change. The source
	// above contains the full `contactsWithCoords`; this filter narrows what
	// renders to the viewport-sampled subset (`visibleContacts`). Together
	// these eliminate the `setData`-induced layer clear that fast zoom used
	// to trigger ("disappear and reload").
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const visibleIds = visibleContacts.map((c) => c.id);

		const safeSet = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore style timing races.
			}
		};

		const applyFilters = () => {
			const visibilityFilter = buildBaseMarkerVisibilityFilter(
				visibleIds,
				map.getZoom() ?? 0,
				campaignFootprintContactIdSet
			);

			// While a wave reveal is active, leave baseHit's filter alone — the
			// wave manager owns it and will restore the visibility filter when
			// the wave completes (see stopBaseDotsWaveAndRestoreSteadyRendering).
			if (!baseDotsWaveCancelRef.current) {
				safeSet(MAPBOX_LAYER_IDS.baseHit, visibilityFilter);
			}
			safeSet(MAPBOX_LAYER_IDS.baseGlow, visibilityFilter);
			safeSet(MAPBOX_LAYER_IDS.baseDots, visibilityFilter);
			// baseFallbackIcons already filters by isUncategorized; AND with visibility.
			safeSet(MAPBOX_LAYER_IDS.baseFallbackIcons, [
				'all',
				['==', ['get', 'isUncategorized'], true],
				visibilityFilter,
			]);
			safeSet(MAPBOX_LAYER_IDS.baseFallbackIconsHover, [
				'all',
				['==', ['get', 'isUncategorized'], true],
				visibilityFilter,
			]);
		};

		applyFilters();
		map.on('zoomend', applyFilters);
		return () => {
			map.off('zoomend', applyFilters);
		};
	}, [map, isMapLoaded, visibleContacts, campaignFootprintContactIdSet]);
};


export interface UseBaseDotsWaveRevealParams {
	baseDotsWaveAwaitingSettleRef: MutableRefObject<boolean>;
	baseDotsWaveCancelRef: MutableRefObject<(() => void) | null>;
	baseDotsWaveLastSearchKeyRef: MutableRefObject<string>;
	baseDotsWaveMetaRef: MutableRefObject<DotWaveMeta | null>;
	baseDotsWaveMoveEndArmedRef: MutableRefObject<boolean>;
	baseDotsWavePendingSearchKeyRef: MutableRefObject<string | null>;
	baseDotsWavePrevIsLoadingRef: MutableRefObject<boolean>;
	baseDotsWaveSettleNonce: number;
	campaignFootprintContactIdSet: Set<number>;
	disableDotWaveReveal: boolean;
	isBackgroundPresentation: boolean;
	isLoading: boolean | undefined;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	searchQuery: string | null | undefined;
	setBaseDotsWaveSettleNonce: Dispatch<SetStateAction<number>>;
	visibleContactIdSetRef: MutableRefObject<Set<number>>;
}

export const useBaseDotsWaveReveal = (params: UseBaseDotsWaveRevealParams): void => {
	const {
		baseDotsWaveAwaitingSettleRef,
		baseDotsWaveCancelRef,
		baseDotsWaveLastSearchKeyRef,
		baseDotsWaveMetaRef,
		baseDotsWaveMoveEndArmedRef,
		baseDotsWavePendingSearchKeyRef,
		baseDotsWavePrevIsLoadingRef,
		baseDotsWaveSettleNonce,
		campaignFootprintContactIdSet,
		disableDotWaveReveal,
		isBackgroundPresentation,
		isLoading,
		isMapLoaded,
		map,
		searchQuery,
		setBaseDotsWaveSettleNonce,
		visibleContactIdSetRef,
	} = params;
	// Wave reveal for base dots on each completed search (left → right).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const safeSetFilter = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore.
			}
		};
		const safeSetPaint = (layerId: string, prop: string, value: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				// Mapbox types are a strict union of paint keys; we intentionally set a small dynamic set.
				(map as any).setPaintProperty(layerId, prop, value);
			} catch {
				// Ignore.
			}
		};

		const stopRunningWave = () => {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
		};

		const restoreBaseDotsRendering = (transitionMs = 0) => {
			// Reset base dots to normal rendering (no animated expression).
			// IMPORTANT: set transitions *before* opacity changes.
			const transition = { duration: transitionMs, delay: 0 } as any;
			safeSetPaint(MAPBOX_LAYER_IDS.baseGlow, 'circle-opacity-transition', transition);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseGlow,
				'circle-opacity',
				getCategorizedDotGlowZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
			);
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity-transition', transition);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-stroke-opacity-transition',
				transition
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-opacity',
				withFeatureFillOpacity(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
				)
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-stroke-opacity',
				withFeatureStrokeOpacity(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
				)
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity-transition',
				transition
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity',
				getSelectedStateOrbZoomFadedOpacity(1, getNormalMarkerFadeOpacityExpr())
			);
			safeSetFilter(
				MAPBOX_LAYER_IDS.baseHit,
				buildBaseMarkerVisibilityFilter(
					Array.from(visibleContactIdSetRef.current),
					map.getZoom() ?? 0,
					campaignFootprintContactIdSet
				)
			);
		};

		const loading = Boolean(isLoading);
		const searchKey = (searchQuery ?? '').trim();
		const isSearchMode = searchKey.length > 0;
		const prevLoading = baseDotsWavePrevIsLoadingRef.current;
		const isNewSearchKey =
			isSearchMode && baseDotsWaveLastSearchKeyRef.current !== searchKey;

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion = prefersReducedMotion || disableDotWaveReveal;

		// During loading (or in decorative mode), keep everything stable and avoid running reveal.
		if (loading || isBackgroundPresentation || !isSearchMode || prefersReducedMotion) {
			// Only schedule a wave when a *new* search actually enters a loading state.
			// This prevents zoom/viewport refetches from triggering a full hide→reveal cycle.
			if (loading && isNewSearchKey) {
				// A brand-new search just entered loading: arm the reveal wave for this
				// key. Even for fullscreen map-view searches with a long cinematic camera
				// ease, the wave is now deferred until the camera settles (with the dots
				// primed hidden in the meantime), so it no longer flickers mid-sweep —
				// keep it armed instead of marking it "handled". Reset any prior deferral
				// state so a superseded search can't resume.
				baseDotsWavePendingSearchKeyRef.current = searchKey;
				baseDotsWaveAwaitingSettleRef.current = false;
			}

			stopRunningWave();
			restoreBaseDotsRendering(0);
			baseDotsWavePrevIsLoadingRef.current = loading;
			// When not in search mode, allow future searches to animate again.
			if (!isSearchMode) {
				baseDotsWaveLastSearchKeyRef.current = '';
				baseDotsWavePendingSearchKeyRef.current = null;
			} else if (!loading && baseDotsWavePendingSearchKeyRef.current === searchKey) {
				// If we decided not to animate for this search (decorative mode / reduced motion),
				// mark it as handled so it doesn't unexpectedly animate later.
				baseDotsWaveLastSearchKeyRef.current = searchKey;
				baseDotsWavePendingSearchKeyRef.current = null;
			}
			return;
		}

		const shouldStartWave =
			prevLoading && !loading && baseDotsWavePendingSearchKeyRef.current === searchKey;
		baseDotsWavePrevIsLoadingRef.current = loading;

		// A wave can also resume here after being deferred for the camera ease below:
		// on that moveend-triggered re-entry `prevLoading` is already false, so
		// `shouldStartWave` is false even though the (still-pending) wave should run.
		const isAwaitingSettleResume =
			baseDotsWaveAwaitingSettleRef.current &&
			!loading &&
			baseDotsWavePendingSearchKeyRef.current === searchKey;

		if (!shouldStartWave && !isAwaitingSettleResume) return;

		// If the map camera is still moving/easing (common in cinematic search sweeps),
		// defer the reveal until it settles. The dots are already primed hidden
		// (frame 0) by the base-dots source effect, so they stay invisible through the
		// fly and wave in together with the constellation on `moveend` — instead of
		// popping in mid-flight. Keep the wave armed (pending key intact) and re-enter
		// via the settle nonce once the camera stops.
		let isCameraMoving = false;
		try {
			isCameraMoving = map.isMoving();
		} catch {
			isCameraMoving = false;
		}
		if (isCameraMoving) {
			stopRunningWave();
			baseDotsWaveAwaitingSettleRef.current = true;
			if (!baseDotsWaveMoveEndArmedRef.current) {
				baseDotsWaveMoveEndArmedRef.current = true;
				try {
					map.once('moveend', () => {
						baseDotsWaveMoveEndArmedRef.current = false;
						setBaseDotsWaveSettleNonce((value) => value + 1);
					});
				} catch {
					baseDotsWaveMoveEndArmedRef.current = false;
				}
			}
			return;
		}
		baseDotsWaveAwaitingSettleRef.current = false;

		stopRunningWave();

		const meta = baseDotsWaveMetaRef.current;
		if (!meta || !Number.isFinite(meta.maxDelayMs) || meta.maxDelayMs <= 0) {
			restoreBaseDotsRendering(0);
			baseDotsWaveLastSearchKeyRef.current = searchKey;
			baseDotsWavePendingSearchKeyRef.current = null;
			return;
		}
		baseDotsWaveLastSearchKeyRef.current = searchKey;
		baseDotsWavePendingSearchKeyRef.current = null;

		// Enable smooth transitions between throttled paint updates.
		// A duration slightly longer than the frame interval lets Mapbox interpolate
		// between our discrete expression snapshots, eliminating visible stepping.
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseGlow, 'circle-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);

		const buildOpacityExpr = (nowMs: number) => {
			return [
				'interpolate',
				DOT_WAVE_EASING,
				['-', nowMs, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
		};

		// Start non-interactive; we'll enable hits as the wave reaches dots.
		safeSetFilter(MAPBOX_LAYER_IDS.baseHit, [
			'<=',
			['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
			-1,
		] as any);

		let cancelled = false;
		let rafId: number | null = null;
		let lastPaintUpdateAt = -Infinity;
		let lastHitUpdateAt = -Infinity;
		const start = performance.now();
		const totalMs = meta.maxDelayMs + DOT_WAVE_FADE_MS + 120;

		const cancel = () => {
			cancelled = true;
			if (rafId != null) cancelAnimationFrame(rafId);
			rafId = null;
		};

		const tick = () => {
			if (cancelled) return;
			const now = performance.now();
			const t = now - start;

			if (t - lastPaintUpdateAt >= DOT_WAVE_FRAME_MS) {
				const expr = buildOpacityExpr(t);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity',
					withCategorizedDotOpacity(withResultDotGlowOpacity(expr))
				);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity',
					withFeatureFillOpacity(withCategorizedDotOpacity(expr))
				);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity',
					withFeatureStrokeOpacity(expr)
				);
				safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity', expr);
				lastPaintUpdateAt = t;
			}

			// Don't churn filters at 60fps; updating every ~90ms is plenty for hit gating.
			if (t - lastHitUpdateAt >= 90) {
				safeSetFilter(MAPBOX_LAYER_IDS.baseHit, [
					'all',
					['<=', ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0], t],
					buildBaseMarkerVisibilityFilter(
						Array.from(visibleContactIdSetRef.current),
						map.getZoom() ?? 0,
						campaignFootprintContactIdSet
					),
				] as any);
				lastHitUpdateAt = t;
			}

			if (t < totalMs) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			// Finished: hand off smoothly to steady-state rendering/interactivity.
			restoreBaseDotsRendering(90);
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
		baseDotsWaveCancelRef.current = cancel;

		// Prime frame 0 (all hidden) before the first rAF callback.
		const expr0 = buildOpacityExpr(0);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseGlow,
			'circle-opacity',
			withCategorizedDotOpacity(withResultDotGlowOpacity(expr0))
		);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-opacity',
			withFeatureFillOpacity(withCategorizedDotOpacity(expr0))
		);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-stroke-opacity',
			withFeatureStrokeOpacity(expr0)
		);
		safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity', expr0);

		rafId = requestAnimationFrame(tick);

		return () => {
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		isBackgroundPresentation,
		searchQuery,
		disableDotWaveReveal,
		campaignFootprintContactIdSet,
		baseDotsWaveSettleNonce,
	]);
};
