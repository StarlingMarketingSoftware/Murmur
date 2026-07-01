'use client';

import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useGetContactsMapOverlay } from '@/hooks/queryHooks/useContacts';
import type { ContactWithName } from '@/types/contact';
import {
	ALL_CONTACTS_OVERLAY_LIMIT,
	ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM,
	AMBIENT_CONTACTS_OVERLAY_LIMIT,
	AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM,
	BOOKING_EXTRA_MARKERS_MIN_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_CANDIDATE_LIMIT,
	LIGHTWEIGHT_COMPACT_OVERLAY_FETCH_MIN_ZOOM,
	PROMOTION_OVERLAY_MARKERS_MIN_ZOOM,
} from './constants';
import { getBackgroundDotsQuantizationDeg } from './wasmGeo';
import { clamp } from './math';
import { coordinateKey, getLatLngFromContact, jitterDuplicateCoords } from './coordinates';
import {
	getBookingTitlePrefixFromContactTitle,
	isPromotionOverlayListTitle,
} from './searchMode';
import type {
	AllContactsOverlayFetchBbox,
	AllContactsOverlayFetchMode,
	AllContactsOverlayFetchPhase,
} from './ambientOverlayShared';
import type { BoundingBox, LatLngLiteral } from './types';
import type { SearchResultsMapProps } from './searchResultsMapProps';

export interface UseContactOverlayFetchingParams {
	bookingExtraFetchBbox: BoundingBox | null;
	setBookingExtraFetchBbox: Dispatch<SetStateAction<BoundingBox | null>>;
	promotionOverlayFetchBbox: BoundingBox | null;
	setPromotionOverlayFetchBbox: Dispatch<SetStateAction<BoundingBox | null>>;
	allContactsOverlayFetchBbox: AllContactsOverlayFetchBbox | null;
	setAllContactsOverlayFetchBbox: Dispatch<SetStateAction<AllContactsOverlayFetchBbox | null>>;
	allContactsOverlayBufferFetchBbox: AllContactsOverlayFetchBbox | null;
	setAllContactsOverlayBufferFetchBbox: Dispatch<SetStateAction<AllContactsOverlayFetchBbox | null>>;
	lastBookingExtraFetchKeyRef: MutableRefObject<string>;
	lastPromotionOverlayFetchKeyRef: MutableRefObject<string>;
	lastAllContactsOverlayVisibleFetchKeyRef: MutableRefObject<string>;
	lastAllContactsOverlayBufferFetchKeyRef: MutableRefObject<string>;
	isReadyForContactsOverlayRef: MutableRefObject<boolean>;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	baseContactIdSet: Set<number>;
	isAnySearch: boolean;
	isBookingSearch: boolean;
	isRadiusSearchActive: boolean;
	isCompactOverlayActive: boolean;
	isAmbientContactsEnabled: boolean;
	shouldFetchAmbientContacts: boolean;
	searchEngaged: boolean;
	onOverlayBusyChange: SearchResultsMapProps['onOverlayBusyChange'];
}

// Viewport-driven contextual contact overlay fetching: booking extras, promotion
// pins, and the close-zoom/ambient all-contacts window (visible + buffer phases),
// including the dedupe/jitter coords pipeline and the overlay-busy reporting.
// Fetch-bbox state and last-fetch-key refs stay declared in SearchResultsMap.tsx:
// the search-transition and radius-search clear effects there tear them down.
export const useContactOverlayFetching = (params: UseContactOverlayFetchingParams) => {
	const {
		bookingExtraFetchBbox,
		setBookingExtraFetchBbox,
		promotionOverlayFetchBbox,
		setPromotionOverlayFetchBbox,
		allContactsOverlayFetchBbox,
		setAllContactsOverlayFetchBbox,
		allContactsOverlayBufferFetchBbox,
		setAllContactsOverlayBufferFetchBbox,
		lastBookingExtraFetchKeyRef,
		lastPromotionOverlayFetchKeyRef,
		lastAllContactsOverlayVisibleFetchKeyRef,
		lastAllContactsOverlayBufferFetchKeyRef,
		isReadyForContactsOverlayRef,
		interactiveFloorDeltaRef,
		baseContactIdSet,
		isAnySearch,
		isBookingSearch,
		isRadiusSearchActive,
		isCompactOverlayActive,
		isAmbientContactsEnabled,
		shouldFetchAmbientContacts,
		searchEngaged,
		onOverlayBusyChange,
	} = params;
	const updateBookingExtraFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run for booking-mode searches, and only once the user is zoomed in.
			// Never run during a radius search: its viewport-wide booking-extra pins are
			// the outdated contextual overlay we must not show alongside radius results.
			if (!isBookingSearch || isRadiusSearchActive || isCompactOverlayActive) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < BOOKING_EXTRA_MARKERS_MIN_ZOOM) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Pad the fetch bounds so panning within the current view doesn't immediately require refetching.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.35;
			const padLng = lngSpan * 0.35;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;

			if (nextKey === lastBookingExtraFetchKeyRef.current) return;
			lastBookingExtraFetchKeyRef.current = nextKey;
			setBookingExtraFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isBookingSearch, isRadiusSearchActive, isCompactOverlayActive]
	);

	const updatePromotionOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Radio stations are part of the general map overlay layer. Keep the
			// dedicated promotion-search selection/list behavior below, but fetch the
			// radio overlay for any engaged search so these category pins can appear
			// alongside the rest of the map context.
			// Suppress entirely during a radius search: these viewport-wide promotion
			// pins are part of the outdated contextual overlay we must not show
			// alongside radius results.
			if (
				!searchEngaged ||
				!isAnySearch ||
				isRadiusSearchActive ||
				isCompactOverlayActive
			) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < PROMOTION_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.1;
			const padLng = lngSpan * 0.1;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastPromotionOverlayFetchKeyRef.current) return;
			lastPromotionOverlayFetchKeyRef.current = nextKey;
			setPromotionOverlayFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isAnySearch, searchEngaged, isRadiusSearchActive, isCompactOverlayActive]
	);

	const updateAllContactsOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;
			const clearAllContactsFetchWindows = () => {
				if (
					lastAllContactsOverlayVisibleFetchKeyRef.current !== '' ||
					lastAllContactsOverlayBufferFetchKeyRef.current !== ''
				) {
					lastAllContactsOverlayVisibleFetchKeyRef.current = '';
					lastAllContactsOverlayBufferFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
					setAllContactsOverlayBufferFetchBbox(null);
				}
			};

			// Phase 4 gate: on cold boot, hold the (heaviest, top-most) contact-pin
			// fetch until the land + basemap + boundaries phases have resolved. This
			// is what stops pins racing ahead of the land beneath them. We deliberately
			// DON'T clear existing fetch windows here — clearing would tear down pins
			// that are already streaming once the gate opens; we simply defer the first
			// fetch. The gate latches open permanently after boot, so live searches and
			// pans are never throttled.
			if (!isReadyForContactsOverlayRef.current) {
				return;
			}

			// Search mode uses the close-zoom "all contacts" overlay. Disengaged mode uses
			// the regional ambient atlas. We also preload ambient while the empty-map prompt
			// is available so disengaging can render from cache immediately.
			// The active-search "all" overlay (viewport-wide gray context dots) is part of
			// the outdated contextual overlay, so it must never run during a radius search.
			// Ambient mode is a disengaged state (never concurrent with an active radius
			// search) and is intentionally left untouched.
			const overlayMode: AllContactsOverlayFetchMode | null = isCompactOverlayActive
				? isAmbientContactsEnabled
					? 'ambient'
					: null
				: shouldFetchAmbientContacts
					? 'ambient'
					: isAnySearch && !isRadiusSearchActive
						? 'all'
						: null;
			if (!overlayMode) {
				clearAllContactsFetchWindows();
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Ambient gate shifts with the interactive floor so the dot-free
			// fully-zoomed-out browse state survives on large monitors.
			// The compact pill overlay is its own zoomed-out browse gate (USA-centered
			// AND inside the compact zoom band), so it must keep fetching all the way
			// down to the globe floor — otherwise the ambient gate (which sits above
			// every interactive floor) clears its candidates and the pills vanish the
			// instant you fully zoom out. The "show only ~5 when fully zoomed out"
			// thinning happens at render time in compactOverlayPillEntries, not here.
			const minZoom = isCompactOverlayActive
				? LIGHTWEIGHT_COMPACT_OVERLAY_FETCH_MIN_ZOOM
				: overlayMode === 'ambient'
					? AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM + interactiveFloorDeltaRef.current
					: ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM;
			if (zoomRaw < minZoom) {
				clearAllContactsFetchWindows();
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// The visible window is intentionally unpadded in ambient mode so the first
			// request returns quickly. The padded buffer follows as a separate background
			// request and merges without clearing the visible chunk.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padFactor = overlayMode === 'ambient' ? 0.42 : 0.2;
			const padLat = latSpan * padFactor;
			const padLng = lngSpan * padFactor;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);

			const buildFetchBbox = (
				phase: AllContactsOverlayFetchPhase,
				boundsForPhase: BoundingBox
			): AllContactsOverlayFetchBbox => {
				const phaseQuant =
					overlayMode === 'ambient' && phase === 'visible'
						? Math.max(0.05, quant * 0.5)
						: quant;
				const qSouth = Math.floor(boundsForPhase.minLat / phaseQuant) * phaseQuant;
				const qWest = Math.floor(boundsForPhase.minLng / phaseQuant) * phaseQuant;
				const qNorth = Math.ceil(boundsForPhase.maxLat / phaseQuant) * phaseQuant;
				const qEast = Math.ceil(boundsForPhase.maxLng / phaseQuant) * phaseQuant;
				const seed = `${overlayMode}|${phase}|${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(4)}|${qEast.toFixed(4)}`;
				return {
					minLat: qSouth,
					minLng: qWest,
					maxLat: qNorth,
					maxLng: qEast,
					mode: overlayMode,
					phase,
					zoom: zoomRaw,
					seed,
				};
			};

			const visibleFetchBbox = buildFetchBbox('visible', {
				minLat: overlayMode === 'ambient' ? south : paddedSouth,
				minLng: overlayMode === 'ambient' ? west : paddedWest,
				maxLat: overlayMode === 'ambient' ? north : paddedNorth,
				maxLng: overlayMode === 'ambient' ? east : paddedEast,
			});

			if (visibleFetchBbox.seed !== lastAllContactsOverlayVisibleFetchKeyRef.current) {
				lastAllContactsOverlayVisibleFetchKeyRef.current = visibleFetchBbox.seed;
				setAllContactsOverlayFetchBbox(visibleFetchBbox);
			}

			if (overlayMode !== 'ambient' || isCompactOverlayActive) {
				if (lastAllContactsOverlayBufferFetchKeyRef.current !== '') {
					lastAllContactsOverlayBufferFetchKeyRef.current = '';
					setAllContactsOverlayBufferFetchBbox(null);
				}
				return;
			}

			const bufferFetchBbox = buildFetchBbox('buffer', {
				minLat: paddedSouth,
				minLng: paddedWest,
				maxLat: paddedNorth,
				maxLng: paddedEast,
			});

			if (bufferFetchBbox.seed !== lastAllContactsOverlayBufferFetchKeyRef.current) {
				lastAllContactsOverlayBufferFetchKeyRef.current = bufferFetchBbox.seed;
				setAllContactsOverlayBufferFetchBbox(bufferFetchBbox);
			}
		},
		[
			isAnySearch,
			shouldFetchAmbientContacts,
			isRadiusSearchActive,
			isCompactOverlayActive,
			isAmbientContactsEnabled,
		]
	);

	const allContactsOverlayFilters = useMemo(() => {
		if (!allContactsOverlayFetchBbox) return undefined;
		const isAmbient = allContactsOverlayFetchBbox.mode === 'ambient';
		return {
			mode: allContactsOverlayFetchBbox.mode,
			south: allContactsOverlayFetchBbox.minLat,
			west: allContactsOverlayFetchBbox.minLng,
			north: allContactsOverlayFetchBbox.maxLat,
			east: allContactsOverlayFetchBbox.maxLng,
			limit: isCompactOverlayActive
				? LIGHTWEIGHT_COMPACT_OVERLAY_CANDIDATE_LIMIT
				: isAmbient
					? 760
					: ALL_CONTACTS_OVERLAY_LIMIT,
			zoom: allContactsOverlayFetchBbox.zoom,
			seed: allContactsOverlayFetchBbox.seed,
			phase: allContactsOverlayFetchBbox.phase,
		};
	}, [allContactsOverlayFetchBbox, isCompactOverlayActive]);

	const allContactsOverlayBufferFilters = useMemo(() => {
		if (!allContactsOverlayBufferFetchBbox) return undefined;
		return {
			mode: allContactsOverlayBufferFetchBbox.mode,
			south: allContactsOverlayBufferFetchBbox.minLat,
			west: allContactsOverlayBufferFetchBbox.minLng,
			north: allContactsOverlayBufferFetchBbox.maxLat,
			east: allContactsOverlayBufferFetchBbox.maxLng,
			limit: AMBIENT_CONTACTS_OVERLAY_LIMIT,
			zoom: allContactsOverlayBufferFetchBbox.zoom,
			seed: allContactsOverlayBufferFetchBbox.seed,
			phase: allContactsOverlayBufferFetchBbox.phase,
		};
	}, [allContactsOverlayBufferFetchBbox]);

	const {
		data: allContactsOverlayVisibleRawContacts,
		isFetching: isAllContactsOverlayVisibleFetching,
	} = useGetContactsMapOverlay({
		filters: allContactsOverlayFilters,
		enabled: Boolean(allContactsOverlayFilters),
	});
	const {
		data: allContactsOverlayBufferRawContacts,
		isFetching: isAllContactsOverlayBufferFetching,
	} = useGetContactsMapOverlay({
		filters: allContactsOverlayBufferFilters,
		enabled: Boolean(
			!isCompactOverlayActive &&
			allContactsOverlayBufferFilters &&
			allContactsOverlayVisibleRawContacts !== undefined
		),
	});

	const allContactsOverlayRawContacts = useMemo(() => {
		const visible = allContactsOverlayFetchBbox
			? (allContactsOverlayVisibleRawContacts ?? [])
			: [];
		const buffer = allContactsOverlayBufferFetchBbox
			? (allContactsOverlayBufferRawContacts ?? [])
			: [];
		if (visible.length === 0) return buffer;
		if (buffer.length === 0) return visible;
		const byId = new Map<number, ContactWithName>();
		for (const contact of visible) byId.set(contact.id, contact);
		for (const contact of buffer) {
			if (!byId.has(contact.id)) byId.set(contact.id, contact);
		}
		return Array.from(byId.values());
	}, [
		allContactsOverlayFetchBbox,
		allContactsOverlayBufferFetchBbox,
		allContactsOverlayVisibleRawContacts,
		allContactsOverlayBufferRawContacts,
	]);

	const bookingExtraOverlayFilters = useMemo(() => {
		if (!bookingExtraFetchBbox) return undefined;
		return {
			mode: 'booking' as const,
			south: bookingExtraFetchBbox.minLat,
			west: bookingExtraFetchBbox.minLng,
			north: bookingExtraFetchBbox.maxLat,
			east: bookingExtraFetchBbox.maxLng,
			limit: 1200,
		};
	}, [bookingExtraFetchBbox]);

	const { data: bookingExtraRawContacts, isFetching: isBookingExtraOverlayFetching } =
		useGetContactsMapOverlay({
			filters: bookingExtraOverlayFilters,
			enabled: Boolean(bookingExtraOverlayFilters),
		});

	const promotionOverlayFilters = useMemo(() => {
		if (!promotionOverlayFetchBbox) return undefined;
		return {
			mode: 'promotion' as const,
			south: promotionOverlayFetchBbox.minLat,
			west: promotionOverlayFetchBbox.minLng,
			north: promotionOverlayFetchBbox.maxLat,
			east: promotionOverlayFetchBbox.maxLng,
			limit: 1200,
		};
	}, [promotionOverlayFetchBbox]);

	const { data: promotionOverlayRawContacts, isFetching: isPromotionOverlayFetching } =
		useGetContactsMapOverlay({
			filters: promotionOverlayFilters,
			enabled: Boolean(promotionOverlayFilters),
		});

	const isOverlayBusy = Boolean(
		isAllContactsOverlayVisibleFetching ||
			isAllContactsOverlayBufferFetching ||
			isBookingExtraOverlayFetching ||
			isPromotionOverlayFetching
	);

	useEffect(() => {
		onOverlayBusyChange?.(isOverlayBusy);
	}, [isOverlayBusy, onOverlayBusyChange]);

	useEffect(() => {
		return () => {
			onOverlayBusyChange?.(false);
		};
	}, [onOverlayBusyChange]);

	const bookingExtraContacts = useMemo(() => {
		if (!bookingExtraRawContacts || bookingExtraRawContacts.length === 0) return [];
		return bookingExtraRawContacts.filter((c) => {
			// Never duplicate primary result markers.
			if (baseContactIdSet.has(c.id)) return false;
			const prefix = getBookingTitlePrefixFromContactTitle(c.title);
			if (!prefix) return false;
			return true;
		});
	}, [bookingExtraRawContacts, baseContactIdSet]);

	const promotionOverlayContacts = useMemo(() => {
		if (!promotionOverlayRawContacts || promotionOverlayRawContacts.length === 0)
			return [];
		return promotionOverlayRawContacts.filter((c) => {
			// Client-side safety: only keep state-wide list titles.
			return isPromotionOverlayListTitle(c.title);
		});
	}, [promotionOverlayRawContacts]);

	const {
		contactsWithCoords: bookingExtraContactsWithCoords,
		coordsByContactId: bookingExtraCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of bookingExtraContacts) {
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
	}, [bookingExtraContacts]);

	const {
		contactsWithCoords: promotionOverlayContactsWithCoords,
		coordsByContactId: promotionOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of promotionOverlayContacts) {
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
	}, [promotionOverlayContacts]);

	const {
		contactsWithCoords: allContactsOverlayContactsWithCoords,
		coordsByContactId: allContactsOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		if (!allContactsOverlayRawContacts || allContactsOverlayRawContacts.length === 0) {
			return { contactsWithCoords, coordsByContactId };
		}

		for (const contact of allContactsOverlayRawContacts) {
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
	}, [allContactsOverlayRawContacts]);

	const getBookingExtraContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			bookingExtraCoordsByContactId.get(contact.id) ?? null,
		[bookingExtraCoordsByContactId]
	);

	const getPromotionOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			promotionOverlayCoordsByContactId.get(contact.id) ?? null,
		[promotionOverlayCoordsByContactId]
	);

	const getAllContactsOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			allContactsOverlayCoordsByContactId.get(contact.id) ?? null,
		[allContactsOverlayCoordsByContactId]
	);

	return {
		updateBookingExtraFetchBbox,
		updatePromotionOverlayFetchBbox,
		updateAllContactsOverlayFetchBbox,
		bookingExtraContacts,
		promotionOverlayContacts,
		bookingExtraContactsWithCoords,
		bookingExtraCoordsByContactId,
		promotionOverlayContactsWithCoords,
		promotionOverlayCoordsByContactId,
		allContactsOverlayContactsWithCoords,
		allContactsOverlayCoordsByContactId,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
	};
};
