'use client';

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { CuratedBlobMorphSource, LatLngLiteral } from './types';
import { getAmbientContactWhatFromTitle } from './ambientOverlayShared';
import { washOutHexColor } from './color';
import {
	ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR,
	AMBIENT_CONTACTS_UNCATEGORIZED_FILL_COLOR,
	BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE,
	RESULT_DOT_STROKE_COLOR_DEFAULT,
} from './constants';
import { darkenHexColor } from './mapExpressions';
import { getBookingTitlePrefixFromContactTitle, getPromotionOverlayWhatFromContactTitle, getResultDotColorForWhat } from './searchMode';
import { isCleanMapMarkerCategory } from '@/components/atoms/_svg/mapTooltipCategoryIcons';

export interface UseOverlayMarkerSourcesParams {
	allContactsOverlayVisibleContacts: ContactWithName[];
	bookingExtraVisibleContacts: ContactWithName[];
	ensureMapImageFromUrl: (
		imageName: string,
		url: string,
		dimensions?: { width: number; height: number }
	) => Promise<void>;
	getAllContactsOverlayContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	getBookingExtraContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	getMarkerPinUrl: (
		fillColor: string,
		strokeColor: string,
		searchWhat?: string | null,
		baseColor?: string
	) => string;
	getPromotionOverlayContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	hoveredBookingExtraCategory: string | null;
	imageNameFromUrl: (url: string) => string;
	isAmbientContactsEnabled: boolean;
	isAnySearch: boolean;
	isCompactOverlayActive: boolean;
	isCoordsInLockedState: (coords: LatLngLiteral) => boolean;
	isLightweightDetailMarkerMode: boolean;
	isLoading: boolean | undefined;
	isMapLoaded: boolean;
	isRadiusSearchActive: boolean;
	isStateLayerReady: boolean;
	lockedStateKey: string | null;
	lockedStateSelectionKeyRef: MutableRefObject<string | null>;
	map: mapboxgl.Map | null;
	promotionDotIdsRef: MutableRefObject<Set<number>>;
	promotionOverlayVisibleContacts: ContactWithName[];
	promotionPinIdsRef: MutableRefObject<Set<number>>;
	searchEngaged: boolean;
	selectedContacts: number[];
	selectedStateMorphSourceRef: MutableRefObject<CuratedBlobMorphSource | null>;
	uncategorizedContactMarkerHoverImageName: string;
	uncategorizedContactMarkerImageName: string;
	visibleContacts: ContactWithName[];
}

// The three contextual overlay marker sources — all-contacts gray dots,
// promotion dots/pins, booking extra pins — plus the booking hovered-category
// highlight filter. All share the locked-state/selected-orb fade pattern.
export const useOverlayMarkerSources = (params: UseOverlayMarkerSourcesParams): void => {
	const {
		allContactsOverlayVisibleContacts,
		bookingExtraVisibleContacts,
		ensureMapImageFromUrl,
		getAllContactsOverlayContactCoords,
		getBookingExtraContactCoords,
		getMarkerPinUrl,
		getPromotionOverlayContactCoords,
		hoveredBookingExtraCategory,
		imageNameFromUrl,
		isAmbientContactsEnabled,
		isAnySearch,
		isCompactOverlayActive,
		isCoordsInLockedState,
		isLightweightDetailMarkerMode,
		isLoading,
		isMapLoaded,
		isRadiusSearchActive,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		promotionDotIdsRef,
		promotionOverlayVisibleContacts,
		promotionPinIdsRef,
		searchEngaged,
		selectedContacts,
		selectedStateMorphSourceRef,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerImageName,
		visibleContacts,
	} = params;
	// All-contacts overlay (gray dots)
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersAllOverlay) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		// Compact (overview pill) mode never uses this dot source. A radius/curated search
		// normally empties it too — EXCEPT when the lightweight detail-marker mode is active,
		// where we DO populate it (outside the blob, in category colors) so the user can explore
		// contacts in cities away from the searched region. `recomputeViewportDots` already
		// excludes the in-blob contacts, and the color branch below keys on `isAmbientContactsEnabled`
		// (true in that mode), so it never paints the legacy gray styling.
		if (
			isCompactOverlayActive ||
			(isRadiusSearchActive && !isLightweightDetailMarkerMode)
		) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		if (isLoading) {
			// Preserve existing overlay dots while parent data is refetching.
			return;
		}

		// Gate on `isAnySearch` (a real, non-empty query) rather than the overloaded
		// `searchEngaged`, which defaults to `true` and is left at that default by the
		// campaign map. This mirrors the overlay's own populate gate (`isSearchAllContactsOverlay`)
		// so the gray dots clear deterministically when no dashboard search/ambient mode is active.
		if (!isAnySearch && !isAmbientContactsEnabled) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		const fadeWithSelectedStateOrb = Boolean(
			lockedStateKey &&
			lockedStateSelectionKeyRef.current === lockedStateKey &&
			selectedStateMorphSourceRef.current
		);
		const features: any[] = [];
		for (const contact of allContactsOverlayVisibleContacts) {
			const coords = getAllContactsOverlayContactCoords(contact);
			if (!coords) continue;
			const whatForMarker = getAmbientContactWhatFromTitle(contact.title);
			const isUncategorized = !isCleanMapMarkerCategory(whatForMarker);
			const fillColor = isAmbientContactsEnabled
				? whatForMarker
					? getResultDotColorForWhat(whatForMarker)
					: AMBIENT_CONTACTS_UNCATEGORIZED_FILL_COLOR
				: ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR;
			features.push({
				type: 'Feature',
				id: contact.id,
				properties: {
					fillColor,
					hoverFillColor: darkenHexColor(fillColor),
					fadeWithSelectedStateOrb,
					isUncategorized,
					category: whatForMarker ?? '',
					fallbackIcon: isUncategorized ? uncategorizedContactMarkerImageName : '',
					fallbackIconHover: isUncategorized
						? uncategorizedContactMarkerHoverImageName
						: '',
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}

		source.setData({ type: 'FeatureCollection', features } as any);
	}, [
		map,
		isMapLoaded,
		isRadiusSearchActive,
		isLoading,
		isAnySearch,
		isAmbientContactsEnabled,
		allContactsOverlayVisibleContacts,
		getAllContactsOverlayContactCoords,
		lockedStateKey,
		isStateLayerReady,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
		isCompactOverlayActive,
		isLightweightDetailMarkerMode,
	]);

	// Promotion overlay: split into in-state dots vs out-of-state pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const dotSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionDot) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pinSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!dotSource || !pinSource) return;

		if (isCompactOverlayActive || isRadiusSearchActive) {
			const empty = { type: 'FeatureCollection', features: [] } as any;
			dotSource.setData(empty);
			pinSource.setData(empty);
			promotionDotIdsRef.current = new Set();
			promotionPinIdsRef.current = new Set();
			return;
		}

		if (isLoading) {
			// Preserve existing promotion markers while parent data is refetching.
			return;
		}

		if (!searchEngaged) {
			const empty = { type: 'FeatureCollection', features: [] } as any;
			dotSource.setData(empty);
			pinSource.setData(empty);
			promotionDotIdsRef.current = new Set();
			promotionPinIdsRef.current = new Set();
			return;
		}

		let cancelled = false;

		const run = async () => {
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);
			const fadeWithSelectedStateOrb = Boolean(
				hasLockedStateSelection && selectedStateMorphSourceRef.current
			);

			const dotFeatures: any[] = [];
			const pinFeatures: any[] = [];
			const dotIds = new Set<number>();
			const pinIds = new Set<number>();
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of promotionOverlayVisibleContacts) {
				const coords = getPromotionOverlayContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const shouldUsePinStyle = !hasLockedStateSelection || isOutsideLockedState;

				const whatForMarker =
					getPromotionOverlayWhatFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				if (!shouldUsePinStyle) {
					dotIds.add(contact.id);
					dotFeatures.push({
						type: 'Feature',
						id: contact.id,
						properties: {
							fillColor: dotFillColor,
							hoverFillColor: darkenHexColor(dotFillColor),
							fadeWithSelectedStateOrb,
						},
						geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
					});
					continue;
				}

				pinIds.add(contact.id);
				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker
				);
				const hoverUrl = getMarkerPinUrl(
					darkenHexColor(pinFillColor),
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker
				);
				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);

				pinFeatures.push({
					type: 'Feature',
					id: contact.id,
					properties: { iconDefault, iconHover, fadeWithSelectedStateOrb },
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;

			dotSource.setData({ type: 'FeatureCollection', features: dotFeatures } as any);
			pinSource.setData({ type: 'FeatureCollection', features: pinFeatures } as any);
			promotionDotIdsRef.current = dotIds;
			promotionPinIdsRef.current = pinIds;
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isRadiusSearchActive,
		isLoading,
		searchEngaged,
		promotionOverlayVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getPromotionOverlayContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
		isCompactOverlayActive,
	]);

	// Booking extra pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBookingPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		if (isCompactOverlayActive || isRadiusSearchActive) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		if (isLoading) {
			// Preserve existing booking markers while parent data is refetching.
			return;
		}

		if (!searchEngaged) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		let cancelled = false;

		const run = async () => {
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);
			const fadeWithSelectedStateOrb = Boolean(
				hasLockedStateSelection && selectedStateMorphSourceRef.current
			);

			const features: any[] = [];
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of bookingExtraVisibleContacts) {
				const coords = getBookingExtraContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForMarker =
					getBookingTitlePrefixFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker,
					RESULT_DOT_STROKE_COLOR_DEFAULT
				);
				const hoverUrl = getMarkerPinUrl(
					darkenHexColor(pinFillColor),
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
					whatForMarker,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR
				);

				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);

				features.push({
					type: 'Feature',
					id: contact.id,
					properties: {
						iconDefault,
						iconHover,
						category: whatForMarker ?? '',
						fadeWithSelectedStateOrb,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;
			source.setData({ type: 'FeatureCollection', features } as any);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isRadiusSearchActive,
		isLoading,
		searchEngaged,
		bookingExtraVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getBookingExtraContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
		isCompactOverlayActive,
	]);

	// Keep Mapbox marker "selected" feature-state in sync with `selectedContacts`.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const selectedSet = new Set<number>(selectedContacts);

		const setSelectedSafe = (sourceId: string, id: number, selected: boolean) => {
			try {
				map.setFeatureState({ source: sourceId, id }, { selected });
			} catch {
				// Ignore (feature may not exist yet in the source).
			}
		};

		for (const c of visibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBase, c.id, selectedSet.has(c.id));
		}
		for (const c of bookingExtraVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBookingPin, c.id, selectedSet.has(c.id));
		}
		for (const id of promotionDotIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionDot, id, selectedSet.has(id));
		}
		for (const id of promotionPinIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionPin, id, selectedSet.has(id));
		}
		for (const c of allContactsOverlayVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersAllOverlay, c.id, selectedSet.has(c.id));
		}
	}, [
		map,
		isMapLoaded,
		selectedContacts,
		visibleContacts,
		bookingExtraVisibleContacts,
		allContactsOverlayVisibleContacts,
		promotionOverlayVisibleContacts,
	]);

	// Booking UX: highlight all booking extra pins of the hovered category.
	// Uses a single setFilter call on the hover layer instead of N setFeatureState calls,
	// so highlight/un-highlight is O(1) regardless of how many pins are in view.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const layer = MAPBOX_LAYER_IDS.bookingPinIconsHover;
		if (!map.getLayer(layer)) return;
		const cat = hoveredBookingExtraCategory;
		const categoryFilter: any = ['==', ['get', 'category'], cat ?? ''];
		// Match features whose `category` property equals the hovered category.
		// When no category is hovered, match nothing (empty string never stored as a real category).
		map.setFilter(layer, categoryFilter);
	}, [map, isMapLoaded, hoveredBookingExtraCategory]);
};
