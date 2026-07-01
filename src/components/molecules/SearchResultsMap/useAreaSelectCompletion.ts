'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import type { CompactOverlayPillEntry } from './compactOverlayPillPrimitives';
import { PROMOTION_OVERLAY_TITLE_PREFIXES } from './constants';
import { bookingTitlePrefixMatchesSearchWhatKey, getBookingTitlePrefixFromContactTitle, normalizeWhatKey, startsWithCaseInsensitive } from './searchMode';
import { MapSelectionBounds } from './types';
import { getClientPointFromDomEvent } from './wasmGeo';

// Area-select completion: resolves the drag rectangle into selected contact
// ids across every marker family, plus the "All in view" dashboard action.

export interface UseAreaSelectCompletionParams {
	allContactsOverlayCoordsByContactId: Map<number, LatLngLiteral>;
	allContactsOverlayVisibleContacts: ContactWithName[];
	baseContactIdSet: Set<number>;
	bookingExtraCoordsByContactId: Map<number, LatLngLiteral>;
	bookingExtraVisibleContacts: ContactWithName[];
	clearSelectionRect: () => void;
	compactOverlayPillEntries: CompactOverlayPillEntry[];
	contactsWithCoords: ContactWithName[];
	coordsByContactId: Map<number, LatLngLiteral>;
	getContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	isAreaSelecting: boolean;
	isBookingSearch: boolean;
	isPromotionSearch: boolean;
	lastSelectAllInViewNonceRef: MutableRefObject<number>;
	map: mapboxgl.Map | null;
	onAreaSelect: SearchResultsMapProps['onAreaSelect'];
	promotionOverlayCoordsByContactId: Map<number, LatLngLiteral>;
	promotionOverlayVisibleContacts: ContactWithName[];
	searchWhat: string | null | undefined;
	selectAllInViewNonce: number | undefined;
	selectionStartClientRef: MutableRefObject<{ x: number; y: number } | null>;
	selectionStartLatLngRef: MutableRefObject<LatLngLiteral | null>;
	visibleContacts: ContactWithName[];
}

export const useAreaSelectCompletion = (params: UseAreaSelectCompletionParams) => {
	const {
		allContactsOverlayCoordsByContactId,
		allContactsOverlayVisibleContacts,
		baseContactIdSet,
		bookingExtraCoordsByContactId,
		bookingExtraVisibleContacts,
		clearSelectionRect,
		compactOverlayPillEntries,
		contactsWithCoords,
		coordsByContactId,
		getContactCoords,
		isAreaSelecting,
		isBookingSearch,
		isPromotionSearch,
		lastSelectAllInViewNonceRef,
		map,
		onAreaSelect,
		promotionOverlayCoordsByContactId,
		promotionOverlayVisibleContacts,
		searchWhat,
		selectAllInViewNonce,
		selectionStartClientRef,
		selectionStartLatLngRef,
		visibleContacts,
	} = params;
	const completeAreaSelection = useCallback(
		(end: { lat: number; lng: number }, endClient: { x: number; y: number } | null) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) {
				clearSelectionRect();
				return;
			}

			// Ignore tiny "click" selections (treat as cancel).
			const startClient = selectionStartClientRef.current;
			const dx = startClient && endClient ? Math.abs(endClient.x - startClient.x) : 0;
			const dy = startClient && endClient ? Math.abs(endClient.y - startClient.y) : 0;
			const movedEnough = dx >= 6 || dy >= 6;

			clearSelectionRect();

			if (!movedEnough) return;

			const bounds: MapSelectionBounds = {
				south: Math.min(start.lat, end.lat),
				west: Math.min(start.lng, end.lng),
				north: Math.max(start.lat, end.lat),
				east: Math.max(start.lng, end.lng),
			};

			const isCoordsInBounds = (coords: LatLngLiteral | null | undefined): boolean => {
				if (!coords) return false;
				return (
					coords.lat >= bounds.south &&
					coords.lat <= bounds.north &&
					coords.lng >= bounds.west &&
					coords.lng <= bounds.east
				);
			};

			// Build a selection payload so the dashboard can select contacts without triggering a new search.
			const selectedIds = new Set<number>();
			for (const contact of contactsWithCoords) {
				const coords = coordsByContactId.get(contact.id) ?? null;
				if (!isCoordsInBounds(coords)) continue;
				selectedIds.add(contact.id);
			}

			const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;

			const extraContactsById = new Map<number, ContactWithName>();

			// Include booking overlay pins only when they match the active "What" (category) and are visible.
			if (
				isBookingSearch &&
				normalizedSearchWhat &&
				bookingExtraVisibleContacts.length > 0
			) {
				for (const contact of bookingExtraVisibleContacts) {
					const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
					if (!prefix) continue;
					if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
						continue;
					const coords = bookingExtraCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include promotion overlay pins only when they match the active "What" (category) and are visible.
			if (
				isPromotionSearch &&
				normalizedSearchWhat &&
				promotionOverlayVisibleContacts.length > 0
			) {
				for (const contact of promotionOverlayVisibleContacts) {
					const title = contact.title ?? '';
					const matchedPrefix =
						PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
							startsWithCaseInsensitive(title, p)
						) ?? null;
					if (!matchedPrefix) continue;
					if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
					const coords = promotionOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include "all contacts" high-zoom gray dots (no category filtering).
			if (allContactsOverlayVisibleContacts.length > 0) {
				for (const contact of allContactsOverlayVisibleContacts) {
					const coords = allContactsOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			if (compactOverlayPillEntries.length > 0) {
				for (const entry of compactOverlayPillEntries) {
					if (!isCoordsInBounds(entry.coords)) continue;
					selectedIds.add(entry.contact.id);
					if (!baseContactIdSet.has(entry.contact.id)) {
						extraContactsById.set(entry.contact.id, entry.contact);
					}
				}
			}

			onAreaSelect?.(bounds, {
				contactIds: Array.from(selectedIds),
				extraContacts: Array.from(extraContactsById.values()),
			});
		},
		[
			isAreaSelecting,
			clearSelectionRect,
			onAreaSelect,
			contactsWithCoords,
			coordsByContactId,
			isBookingSearch,
			bookingExtraVisibleContacts,
			bookingExtraCoordsByContactId,
			isPromotionSearch,
			promotionOverlayVisibleContacts,
			promotionOverlayCoordsByContactId,
			allContactsOverlayVisibleContacts,
			allContactsOverlayCoordsByContactId,
			compactOverlayPillEntries,
			baseContactIdSet,
		]
	);

	const handleMapMouseUp = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			completeAreaSelection(
				{ lat: e.lngLat.lat, lng: e.lngLat.lng },
				getClientPointFromDomEvent(e.originalEvent)
			);
		},
		[completeAreaSelection]
	);

	const handleMapTouchEnd = useCallback(
		(e: mapboxgl.MapTouchEvent) => {
			if (!isAreaSelecting) return;
			// `touches` is empty on touchend — the lifted finger lives in `changedTouches`.
			const changed = e.originalEvent.changedTouches;
			const endClient =
				changed && changed.length > 0
					? { x: changed[0].clientX, y: changed[0].clientY }
					: getClientPointFromDomEvent(e.originalEvent);
			completeAreaSelection({ lat: e.lngLat.lat, lng: e.lngLat.lng }, endClient);
		},
		[isAreaSelecting, completeAreaSelection]
	);

	// Dashboard UX: "All" button selects all markers currently visible in the viewport that
	// match the active search category (including overlay pins when visible).
	useEffect(() => {
		if (!selectAllInViewNonce) return;
		if (selectAllInViewNonce === lastSelectAllInViewNonceRef.current) return;
		if (!map) return;
		if (typeof onAreaSelect !== 'function') return;

		const viewportBounds = map.getBounds();
		if (!viewportBounds) return;
		const sw = viewportBounds.getSouthWest();
		const ne = viewportBounds.getNorthEast();
		const west = sw.lng;
		const east = ne.lng;

		// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
		if (east < west) return;

		const bounds: MapSelectionBounds = {
			south: sw.lat,
			west,
			north: ne.lat,
			east,
		};

		const selectedIds = new Set<number>();

		// Base results: only select dots currently rendered in the viewport. Curated
		// searches may keep the full small result set in the marker source for zoom stability.
		for (const contact of visibleContacts) {
			const coords = getContactCoords(contact);
			if (!coords) continue;
			if (
				coords.lat < bounds.south ||
				coords.lat > bounds.north ||
				coords.lng < bounds.west ||
				coords.lng > bounds.east
			) {
				continue;
			}
			selectedIds.add(contact.id);
		}

		const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;
		const extraContactsById = new Map<number, ContactWithName>();

		// Booking overlay pins: select only the visible pins that match the active category.
		if (
			isBookingSearch &&
			normalizedSearchWhat &&
			bookingExtraVisibleContacts.length > 0
		) {
			for (const contact of bookingExtraVisibleContacts) {
				const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
				if (!prefix) continue;
				if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
					continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// Promotion overlay pins: select only the visible pins that match the active category.
		if (
			isPromotionSearch &&
			normalizedSearchWhat &&
			promotionOverlayVisibleContacts.length > 0
		) {
			for (const contact of promotionOverlayVisibleContacts) {
				const title = contact.title ?? '';
				const matchedPrefix =
					PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
						startsWithCaseInsensitive(title, p)
					) ?? null;
				if (!matchedPrefix) continue;
				if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// All-contacts gray overlay: select all visible gray dots in the viewport.
		if (allContactsOverlayVisibleContacts.length > 0) {
			for (const contact of allContactsOverlayVisibleContacts) {
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		if (compactOverlayPillEntries.length > 0) {
			for (const entry of compactOverlayPillEntries) {
				selectedIds.add(entry.contact.id);
				if (!baseContactIdSet.has(entry.contact.id)) {
					extraContactsById.set(entry.contact.id, entry.contact);
				}
			}
		}

		onAreaSelect(bounds, {
			contactIds: Array.from(selectedIds),
			extraContacts: Array.from(extraContactsById.values()),
		});

		// Ensure this runs once per dashboard click, even as viewport-driven state changes.
		lastSelectAllInViewNonceRef.current = selectAllInViewNonce;
	}, [
		selectAllInViewNonce,
		map,
		onAreaSelect,
		visibleContacts,
		isBookingSearch,
		bookingExtraVisibleContacts,
		isPromotionSearch,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
		compactOverlayPillEntries,
		baseContactIdSet,
	]);
	return { completeAreaSelection, handleMapMouseUp, handleMapTouchEnd };

};
