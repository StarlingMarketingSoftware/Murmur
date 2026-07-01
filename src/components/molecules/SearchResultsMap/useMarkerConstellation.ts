'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';


// Marker constellation: control helpers, the single source-data writer, the
// inConstellation dim sync, and the per-result-set composer.

export interface UseConstellationControlsParams {
	_unused?: never;
}

export const useConstellationControls = (params: UseConstellationControlsParams) => {
	void params;
	const stopMarkerConstellationReveal = useCallback(() => {
		const cancel = markerConstellationRevealCancelRef.current;
		if (cancel) {
			cancel();
			markerConstellationRevealCancelRef.current = null;
		}
	}, []);

	const setMarkerConstellationLineOpacity = useCallback(
		(coreOpacity: any, glowOpacity: any, transitionMs = 0) => {
			if (!map || !isMapLoaded) return;
			const transition = { duration: transitionMs, delay: 0 } as any;
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.markerConstellationCore)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationCore,
						'line-opacity-transition',
						transition
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationCore,
						'line-opacity',
						getMarkerConstellationZoomFadedOpacity(coreOpacity)
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.markerConstellationGlow)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationGlow,
						'line-opacity-transition',
						transition
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationGlow,
						'line-opacity',
						getMarkerConstellationZoomFadedOpacity(glowOpacity)
					);
				}
			} catch {
				// Ignore style timing races.
			}
		},
		[map, isMapLoaded]
	);

	const clearMarkerConstellation = useCallback(
		(includeSelected = true) => {
			stopMarkerConstellationReveal();
			if (markerConstellationDeferredMoveEndRef.current && map) {
				try {
					map.off('moveend', markerConstellationDeferredMoveEndRef.current);
				} catch {
					// Ignore style timing races.
				}
				markerConstellationDeferredMoveEndRef.current = null;
			}
			markerConstellationEdgesRef.current = [];
			markerConstellationUsesCategoryColorsRef.current = false;
			markerConstellationNodesRef.current = [];
			markerConstellationContactsByIdRef.current = new Map();
			markerConstellationNodeIdsRef.current = new Set();
			markerConstellationComposedSearchKeyRef.current = '';
			markerConstellationRevealDoneRef.current = true;
			markerConstellationLastDataKeyRef.current = '';
			markerConstellationIsStatusModeRef.current = false;
			setMarkerConstellationCompositionNonce((value) => value + 1);
			setMarkerConstellationLineOpacity(0, 0, 0);
			if (!map || !isMapLoaded) return;
			const lineSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const selectedLineSource = map.getSource(
				MAPBOX_SOURCE_IDS.markerConstellationSelected
			) as mapboxgl.GeoJSONSource | undefined;
			const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
				| mapboxgl.GeoJSONSource
				| undefined;
			try {
				const empty = { type: 'FeatureCollection', features: [] } as any;
				lineSource?.setData(empty);
				if (includeSelected) selectedLineSource?.setData(empty);
				nodeSource?.setData(empty);
			} catch {
				// Ignore style timing races.
			}
		},
		[map, isMapLoaded, stopMarkerConstellationReveal, setMarkerConstellationLineOpacity]
	);
	return { stopMarkerConstellationReveal, setMarkerConstellationLineOpacity, clearMarkerConstellation };
};

export interface UseConstellationWriterParams {
	_unused?: never;
}

export const useConstellationWriter = (params: UseConstellationWriterParams) => {
	void params;
	const writeMarkerConstellationSourceData = useCallback(
		(contactsForVisibility?: ContactWithName[]): void => {
			if (!map || !isMapLoaded) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const selectedLineSource = map.getSource(
				MAPBOX_SOURCE_IDS.markerConstellationSelected
			) as mapboxgl.GeoJSONSource | undefined;
			const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source && !selectedLineSource && !nodeSource) return;

			const contactsById =
				contactsForVisibility != null
					? new Map<number, ContactWithName>(
							contactsForVisibility.map((contact) => [contact.id, contact])
						)
					: markerConstellationContactsByIdRef.current;
			const selectedSet = new Set<number>(selectedContacts);

			const features: any[] = [];
			const dataKeyParts: string[] = [];
			for (const edge of markerConstellationEdgesRef.current) {
				if (selectedSet.has(edge.fromId) || selectedSet.has(edge.toId)) continue;
				const fromContact = contactsById.get(edge.fromId);
				const toContact = contactsById.get(edge.toId);
				if (!fromContact || !toContact) continue;

				const fromCoords = getContactCoords(fromContact);
				const toCoords = getContactCoords(toContact);
				if (!fromCoords || !toCoords) continue;

				let lineColor: string | null = null;
				let lineGlowColor: string | null = null;
				let useSelectedLineWidth = false;
				const campaignStatusLineStyle = getCampaignStatusLineStyleForContacts(
					fromContact.id,
					toContact.id
				);
				if (campaignStatusLineStyle) {
					lineColor = campaignStatusLineStyle.lineColor;
					lineGlowColor = campaignStatusLineStyle.lineColor;
					useSelectedLineWidth = true;
				}
				if (
					!campaignStatusLineStyle &&
					markerConstellationUsesCategoryColorsRef.current
				) {
					const fromCategory = fromContact.curatedCategory ?? null;
					const toCategory = toContact.curatedCategory ?? null;
					const fromCategoryKey = fromCategory
						? normalizeWhatKey(fromCategory)
						: '__general__';
					const toCategoryKey = toCategory ? normalizeWhatKey(toCategory) : '__general__';
					if (fromCategoryKey === toCategoryKey) {
						lineColor = fromCategory
							? getResultDotColorForWhat(fromCategory)
							: GENERAL_CONTACT_CONSTELLATION_LINE_COLOR;
						lineGlowColor = fromCategory ? lineColor : MARKER_CONSTELLATION_HALO_COLOR;
					}
				}

				const rank = useSelectedLineWidth ? 0 : edge.rank;
				const opacityScale = useSelectedLineWidth ? 1 : edge.opacityScale;
				const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
				const featureId = `${edge.level}:${edgeId}`;
				dataKeyParts.push(
					`e:${featureId}:${lineColor ?? ''}:${useSelectedLineWidth ? 'selected' : 'normal'}:${rank.toFixed(3)}:${opacityScale.toFixed(2)}`
				);
				features.push({
					type: 'Feature',
					id: featureId,
					properties: {
						level: edge.level,
						rank,
						opacityScale,
						...(lineColor
							? {
									lineColor,
									lineGlowColor: lineGlowColor ?? lineColor,
									useSelectedLineWidth,
								}
							: {}),
					},
					geometry: {
						type: 'LineString',
						coordinates: [
							[fromCoords.lng, fromCoords.lat],
							[toCoords.lng, toCoords.lat],
						],
					},
				});
			}

			const nodeFeatures: any[] = [];
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);
			for (const node of markerConstellationNodesRef.current) {
				if (selectedSet.has(node.id)) continue;
				const contact = contactsById.get(node.id);
				if (!contact) continue;
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForContact = contact.curatedCategory ?? searchWhat ?? null;
				const statusMarkerStyle = getCampaignStatusMarkerStyleForContact(contact.id);
				const baseFillColor =
					statusMarkerStyle?.fillColor ?? getResultDotColorForWhat(whatForContact);
				const fillColor = isOutsideLockedState
					? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
					: baseFillColor;
				const strokeColor =
					statusMarkerStyle?.strokeColor ?? MARKER_CONSTELLATION_HALO_COLOR;
				const strokeWidth = statusMarkerStyle?.strokeWidth;
				const strokeOpacity = statusMarkerStyle?.strokeOpacity;
				const radiusScale = statusMarkerStyle?.radiusScale;
				const fillOpacity = statusMarkerStyle?.fillOpacity;
				const featureId = `${node.level}:${node.id}`;
				dataKeyParts.push(
					`n:${featureId}:${fillColor}:${strokeColor}:${strokeWidth ?? ''}:${
						strokeOpacity ?? ''
					}:${radiusScale ?? ''}:${node.rank.toFixed(3)}:${node.opacityScale.toFixed(2)}`
				);
				nodeFeatures.push({
					type: 'Feature',
					id: featureId,
					properties: {
						fillColor,
						strokeColor,
						...(strokeWidth != null ? { strokeWidth } : {}),
						...(strokeOpacity != null ? { strokeOpacity } : {}),
						...(radiusScale != null ? { radiusScale } : {}),
						...(fillOpacity != null ? { fillOpacity } : {}),
						level: node.level,
						rank: node.rank,
						opacityScale: node.opacityScale,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			const selectedPointById = new Map<number, LatLngLiteral>();
			const addSelectedPoint = (
				contact: ContactWithName,
				coords: LatLngLiteral | null
			) => {
				if (!selectedSet.has(contact.id)) return;
				if (!coords) return;
				if (selectedPointById.has(contact.id)) return;
				selectedPointById.set(contact.id, coords);
			};
			if (selectedSet.size >= 2) {
				for (const contact of contactsById.values()) {
					addSelectedPoint(contact, getContactCoords(contact));
				}
				for (const contact of contactsWithCoords) {
					addSelectedPoint(contact, getContactCoords(contact));
				}
				for (const contact of bookingExtraVisibleContacts) {
					addSelectedPoint(contact, getBookingExtraContactCoords(contact));
				}
				for (const contact of promotionOverlayVisibleContacts) {
					addSelectedPoint(contact, getPromotionOverlayContactCoords(contact));
				}
				for (const contact of allContactsOverlayVisibleContacts) {
					addSelectedPoint(contact, getAllContactsOverlayContactCoords(contact));
				}
			}

			const selectedLineFeatures: any[] = [];
			const selectedPointSeeds: Array<{ id: number; coords: LatLngLiteral }> = [];
			const seenSelectedIds = new Set<number>();
			for (const id of selectedContacts) {
				if (seenSelectedIds.has(id)) continue;
				seenSelectedIds.add(id);
				const selectedCoords = selectedPointById.get(id);
				if (!selectedCoords) continue;
				selectedPointSeeds.push({ id, coords: selectedCoords });
			}
			selectedPointSeeds.sort((a, b) => a.id - b.id);

			if (selectedPointSeeds.length < 2) {
				selectedConstellationEdgesRef.current = [];
				selectedConstellationGraphKeyRef.current = '';
			} else {
				const selectedGraphKey = selectedPointSeeds
					.map((point) =>
						[point.id, point.coords.lng.toFixed(5), point.coords.lat.toFixed(5)].join(':')
					)
					.join(',');

				if (selectedConstellationGraphKeyRef.current !== selectedGraphKey) {
					let selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					try {
						selectedComposeZoom = Math.max(
							MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
							map.getZoom() ?? MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM
						);
					} catch {
						selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					}
					if (!Number.isFinite(selectedComposeZoom)) {
						selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					}

					const selectedWorldSize = 512 * Math.pow(2, selectedComposeZoom);
					const selectedGraphPoints: MarkerConstellationPoint[] = [];
					for (const point of selectedPointSeeds) {
						const projected = latLngToWorldPixel(point.coords, selectedWorldSize);
						if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
							continue;
						}
						selectedGraphPoints.push({
							id: point.id,
							coords: point.coords,
							x: projected.x,
							y: projected.y,
							groupKey: 'selected',
						});
					}

					const selectedGraphSeed = hashStringToUint32(selectedGraphKey).toString(36);
					selectedConstellationEdgesRef.current = buildSelectedMarkerConstellationEdges(
						selectedGraphPoints,
						`selected|${selectedGraphPoints.length}|${selectedGraphSeed}`
					);
					selectedConstellationGraphKeyRef.current = selectedGraphKey;
				}

				for (const edge of selectedConstellationEdgesRef.current) {
					const fromCoords = selectedPointById.get(edge.fromId);
					const toCoords = selectedPointById.get(edge.toId);
					if (!fromCoords || !toCoords) continue;

					const edgeIndex = selectedLineFeatures.length;
					const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
					const featureId = `selected:${edgeIndex}:${edgeId}`;
					const fromDraftingStatus = getDashboardDraftingStatusForContact(edge.fromId);
					const toDraftingStatus = getDashboardDraftingStatusForContact(edge.toId);
					const isDraftedLine =
						fromDraftingStatus === 'drafted' && toDraftingStatus === 'drafted';
					dataKeyParts.push(
						`s:${featureId}:${isDraftedLine ? DASHBOARD_DRAFTING_DRAFT_LINE_COLOR : ''}`
					);
					selectedLineFeatures.push({
						type: 'Feature',
						id: featureId,
						properties: {
							selectedLineOpacity: selectedConstellationLineOpacityRef.current,
							// Campaign status mode recolors the selected lines blue to match the
							// blue selected circles (dashboard pick-flow keeps the white lines).
							statusMode: campaignMarkerMode === 'status',
							...(isDraftedLine
								? {
										lineColor: DASHBOARD_DRAFTING_DRAFT_LINE_COLOR,
										lineGlowColor: DASHBOARD_DRAFTING_DRAFT_LINE_COLOR,
									}
								: {}),
							fromId: edge.fromId,
							toId: edge.toId,
						},
						geometry: {
							type: 'LineString',
							coordinates: [
								[fromCoords.lng, fromCoords.lat],
								[toCoords.lng, toCoords.lat],
							],
						},
					});
				}
			}

			const dataKey = dataKeyParts.join(',');
			markerConstellationLastDataKeyRef.current = dataKey;

			try {
				source?.setData({ type: 'FeatureCollection', features } as any);
				selectedLineSource?.setData({
					type: 'FeatureCollection',
					features: selectedLineFeatures,
				} as any);
				nodeSource?.setData({ type: 'FeatureCollection', features: nodeFeatures } as any);
			} catch {
				// Ignore style timing races.
			}
		},
		[
			map,
			isMapLoaded,
			selectedContacts,
			contactsWithCoords,
			bookingExtraVisibleContacts,
			promotionOverlayVisibleContacts,
			allContactsOverlayVisibleContacts,
			getCampaignStatusLineStyleForContacts,
			getCampaignStatusMarkerStyleForContact,
			getDashboardDraftingStatusForContact,
			getBookingExtraContactCoords,
			getPromotionOverlayContactCoords,
			getAllContactsOverlayContactCoords,
			lockedStateKey,
			isCoordsInLockedState,
			campaignMarkerMode,
		]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		if (selectedConstellationLineFadeRafRef.current != null) {
			cancelAnimationFrame(selectedConstellationLineFadeRafRef.current);
			selectedConstellationLineFadeRafRef.current = null;
		}

		const hasSelectedPath = selectedContacts.length >= 2;
		const hadSelectedPath = selectedConstellationHadPathRef.current;
		selectedConstellationHadPathRef.current = hasSelectedPath;

		if (!hasSelectedPath) {
			selectedConstellationLineOpacityRef.current = 0;
			writeMarkerConstellationSourceData();
			return;
		}

		if (hadSelectedPath) {
			selectedConstellationLineOpacityRef.current = 1;
			writeMarkerConstellationSourceData();
			return;
		}

		let cancelled = false;
		const start = performance.now();
		const durationMs = 220;

		const tick = (now: number) => {
			if (cancelled) return;
			const rawT = clamp((now - start) / durationMs, 0, 1);
			const easedT = 1 - Math.pow(1 - rawT, 3);
			selectedConstellationLineOpacityRef.current = easedT;
			writeMarkerConstellationSourceData();

			if (rawT < 1) {
				selectedConstellationLineFadeRafRef.current = requestAnimationFrame(tick);
			} else {
				selectedConstellationLineFadeRafRef.current = null;
			}
		};

		selectedConstellationLineOpacityRef.current = 0;
		writeMarkerConstellationSourceData();
		selectedConstellationLineFadeRafRef.current = requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			if (selectedConstellationLineFadeRafRef.current != null) {
				cancelAnimationFrame(selectedConstellationLineFadeRafRef.current);
				selectedConstellationLineFadeRafRef.current = null;
			}
		};
	}, [map, isMapLoaded, selectedContacts, writeMarkerConstellationSourceData]);

	const startMarkerConstellationReveal = useCallback(() => {
		stopMarkerConstellationReveal();

		if (!map || !isMapLoaded) return;
		if (markerConstellationEdgesRef.current.length === 0) {
			markerConstellationRevealDoneRef.current = true;
			setMarkerConstellationLineOpacity(0, 0, 0);
			return;
		}

		markerConstellationRevealDoneRef.current = true;
		const coreOpacity = markerConstellationIsStatusModeRef.current
			? CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY
			: MARKER_CONSTELLATION_CORE_OPACITY;
		const glowOpacity = markerConstellationIsStatusModeRef.current
			? CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY
			: MARKER_CONSTELLATION_GLOW_OPACITY;
		setMarkerConstellationLineOpacity(
			coreOpacity,
			glowOpacity,
			MARKER_CONSTELLATION_REVEAL_FADE_MS
		);
		return;
	}, [
		map,
		isMapLoaded,
		stopMarkerConstellationReveal,
		setMarkerConstellationLineOpacity,
	]);
	return { writeMarkerConstellationSourceData, startMarkerConstellationReveal };
};

export interface UseConstellationDimSyncParams {
	_unused?: never;
}

export const useConstellationDimSync = (params: UseConstellationDimSyncParams): void => {
	void params;
	// Sync `inConstellation` feature-state on the base markers source so the
	// zoom-fade paint expressions can dim non-constellation dots at low zoom.
	// Default (unset) reads as visible; only contacts NOT in the frozen
	// constellation node set are explicitly marked false.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		try {
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersBase });
		} catch {
			// Ignore style timing races.
		}

		const nodeIds = markerConstellationNodeIdsRef.current;
		const blobProtectedIds = curatedBlobProtectedMarkerIdsRef.current;
		if (nodeIds.size === 0 && blobProtectedIds.size === 0) return;

		for (const contact of visibleContacts) {
			if (nodeIds.has(contact.id)) continue;
			if (blobProtectedIds.has(contact.id)) continue;
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.markersBase, id: contact.id },
					{ inConstellation: false }
				);
			} catch {
				// Ignore style timing races.
			}
		}
	}, [
		map,
		isMapLoaded,
		visibleContacts,
		markerConstellationCompositionNonce,
		curatedBlobProtectedMarkerIdsNonce,
	]);};

export interface UseConstellationComposerParams {
	_unused?: never;
}

export const useConstellationComposer = (params: UseConstellationComposerParams): void => {
	void params;
	// Keep the frozen constellation's rendered line source synced after style/coordinate changes.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (!markerConstellationComposedSearchKeyRef.current) return;
		writeMarkerConstellationSourceData();
		if (markerConstellationRevealDoneRef.current) {
			const coreOpacity = markerConstellationIsStatusModeRef.current
				? CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY
				: MARKER_CONSTELLATION_CORE_OPACITY;
			const glowOpacity = markerConstellationIsStatusModeRef.current
				? CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY
				: MARKER_CONSTELLATION_GLOW_OPACITY;
			setMarkerConstellationLineOpacity(
				markerConstellationEdgesRef.current.length > 0 ? coreOpacity : 0,
				markerConstellationEdgesRef.current.length > 0 ? glowOpacity : 0,
				0
			);
		}
	}, [
		map,
		isMapLoaded,
		writeMarkerConstellationSourceData,
		setMarkerConstellationLineOpacity,
	]);

	// Compose marker constellations once per result set from the camera-independent
	// pool of result contacts so lines can fade in over the autoFit fly-in.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const searchKey = (searchQuery ?? '').trim();
		const isSearchMode = searchKey.length > 0;
		const isCategoryConstellationMode = categoryConstellationsEnabled && !isSearchMode;
		const isStatusConstellationMode =
			isCategoryConstellationMode && campaignMarkerMode === 'status';
		const shouldComposeConstellation = isSearchMode || isCategoryConstellationMode;
		const constellationKey = isSearchMode
			? searchKey
			: isCategoryConstellationMode
				? isStatusConstellationMode
					? '__status-constellations__'
					: '__category-constellations__'
				: '';
		const loading = Boolean(isLoading);

		if (!shouldComposeConstellation || isBackgroundPresentation || !searchEngaged) {
			markerConstellationLastSearchKeyRef.current = constellationKey;
			clearMarkerConstellation(!isAmbientContactsEnabled);
			return;
		}

		if (constellationKey !== markerConstellationLastSearchKeyRef.current) {
			markerConstellationLastSearchKeyRef.current = constellationKey;
			clearMarkerConstellation();
		}

		if (loading) {
			const composedKey = markerConstellationComposedSearchKeyRef.current;
			const hasComposedForCurrentSearch =
				composedKey === constellationKey ||
				composedKey.startsWith(`${constellationKey}|results:`);
			if (!hasComposedForCurrentSearch) {
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
			}
			return;
		}

		if (contactsWithCoords.length < 2) return;

		const resultSignature = contactsWithCoords
			.map((contact) => {
				const coords = getContactCoords(contact);
				if (!coords) return null;
				const groupSignature = isStatusConstellationMode
					? getCampaignStatusForContact(contact.id)
					: (contact.curatedCategory ?? '');
				return `${contact.id}:${groupSignature}:${coords.lng.toFixed(
					5
				)}:${coords.lat.toFixed(5)}`;
			})
			.filter((part): part is string => part != null)
			.sort()
			.join(',');
		if (!resultSignature) return;

		const resultKey = `${constellationKey}|results:${resultSignature}`;
		const formationVersion = isStatusConstellationMode
			? 'status-v1'
			: isCategoryConstellationMode
				? 'category-v2'
				: 'beauty-v2';
		if (
			markerConstellationComposedSearchKeyRef.current.startsWith(
				`${resultKey}|${formationVersion}:`
			)
		) {
			return;
		}

		// Constellation topology projects to a stable Mercator pixel grid
		// (MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM), so the graph itself doesn't
		// depend on the camera. Source from contactsWithCoords (camera-independent)
		// and compose immediately so the lines fade in over the autoFit fly-in
		// instead of popping in once it lands. The retry-on-moveend path below is
		// kept as a safety net for the rare zero-edges fallback.
		const ensureDeferredMoveEndListener = () => {
			if (markerConstellationDeferredMoveEndRef.current) return;
			const onMoveEnd = () => {
				if (markerConstellationDeferredMoveEndRef.current === onMoveEnd) {
					markerConstellationDeferredMoveEndRef.current = null;
				}
				setMarkerConstellationIdleNonce((value) => value + 1);
			};
			markerConstellationDeferredMoveEndRef.current = onMoveEnd;
			map.once('moveend', onMoveEnd);
		};

		let cancelled = false;
		// rAF-defer one frame so the dot first-paint isn't blocked by the
		// O(N²) edge builder that runs below.
		const rafId = requestAnimationFrame(() => {
			if (cancelled) return;

			const curatedBlobGroupKeyByContactId = new Map<number, string>();
			if (!isCategoryConstellationMode) {
				const curatedBlobPoints = contactsWithCoords
					.map((contact) => {
						if (!contact.curatedCategory) return null;
						const coords = getContactCoords(contact);
						if (!coords) return null;
						return projectCuratedBlobPoint(contact.id, coords);
					})
					.filter((point): point is CuratedBlobMercatorPoint => point != null);

				if (curatedBlobPoints.length >= 2) {
					const clusters = pickAdaptiveCuratedBlobClusters(curatedBlobPoints);
					clusters.forEach((cluster, index) => {
						for (const point of cluster.points) {
							curatedBlobGroupKeyByContactId.set(point.id, `blob:${index}`);
						}
					});
				}
			}

			// When a state is locked, prefer in-state contacts so the 180-point cap
			// doesn't get dominated by out-of-state contacts at low zoom — this
			// mirrors the in/out balance that visibleContacts uses.
			let contactsForConstellation: ContactWithName[];
			if (lockedStateKey) {
				const insideState: ContactWithName[] = [];
				for (const contact of contactsWithCoords) {
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					if (contactStateKey === lockedStateKey) {
						insideState.push(contact);
					} else if (!contactStateKey) {
						const coords = getContactCoords(contact);
						if (coords && isCoordsInLockedState(coords)) insideState.push(contact);
					}
				}
				contactsForConstellation =
					insideState.length >= 2 ? insideState : contactsWithCoords.slice();
			} else {
				contactsForConstellation = contactsWithCoords.slice();
			}

			if (contactsForConstellation.length > MARKER_CONSTELLATION_MAX_POINTS) {
				contactsForConstellation = contactsForConstellation
					.map((contact) => ({
						contact,
						score: hashStringToUint32(`${constellationKey}|constellation|${contact.id}`),
					}))
					.sort((a, b) => a.score - b.score)
					.slice(0, MARKER_CONSTELLATION_MAX_POINTS)
					.map(({ contact }) => contact);
			}
			contactsForConstellation.sort((a, b) => a.id - b.id);

			let currentZoom = MAP_DEFAULT_ZOOM;
			try {
				currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			} catch {
				currentZoom = MAP_DEFAULT_ZOOM;
			}
			if (!Number.isFinite(currentZoom)) currentZoom = MAP_DEFAULT_ZOOM;
			// Constellation topology is frozen once per result set. If a search starts
			// from the low-zoom globe, current screen pixels collapse nearby contacts
			// enough that the edge builder can cache an empty formation. Compose in a
			// stable Mercator pixel space with a normal-map zoom floor instead.
			const constellationComposeZoom = Math.max(
				MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
				currentZoom
			);
			const constellationWorldSize = 512 * Math.pow(2, constellationComposeZoom);

			let points: MarkerConstellationPoint[] = [];
			const contactsByPointId = new Map<number, ContactWithName>();
			for (const contact of contactsForConstellation) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				let groupKey: string;
				if (isCategoryConstellationMode) {
					if (isStatusConstellationMode) {
						groupKey = `status:${getCampaignStatusForContact(contact.id)}`;
					} else {
						const categoryKey = contact.curatedCategory
							? normalizeWhatKey(contact.curatedCategory)
							: '';
						groupKey = categoryKey ? `category:${categoryKey}` : 'general';
					}
				} else {
					const curatedGroupKey = curatedBlobGroupKeyByContactId.get(contact.id);
					if (curatedBlobGroupKeyByContactId.size > 0 && !curatedGroupKey) continue;
					groupKey = curatedGroupKey ?? 'fallback:pending';
				}

				const projected = latLngToWorldPixel(coords, constellationWorldSize);
				if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;

				points.push({
					id: contact.id,
					coords,
					x: projected.x,
					y: projected.y,
					groupKey,
				});
				contactsByPointId.set(contact.id, contact);
			}

			if (
				!isCategoryConstellationMode &&
				curatedBlobGroupKeyByContactId.size === 0 &&
				points.length >= 2
			) {
				const fallbackGroupKeyById = buildFallbackMarkerConstellationGroupKeys(points);
				points = points.map((point) => ({
					...point,
					groupKey: fallbackGroupKeyById.get(point.id) ?? `fallback:${point.id}`,
				}));
			}

			const pointsSignature = points
				.map(
					(point) =>
						`${point.id}:${point.groupKey}:${point.coords.lng.toFixed(
							5
						)}:${point.coords.lat.toFixed(5)}`
				)
				.join(',');
			const compositionKey = `${resultKey}|${formationVersion}:${pointsSignature}`;
			if (markerConstellationComposedSearchKeyRef.current === compositionKey) return;

			if (points.length < 2) {
				// No projectable points. Don't cache — leave composedKey unset so a
				// later contactsWithCoords update can retry.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			const seed = `${constellationKey}|${formationVersion}|${points
				.map((point) => point.id)
				.join(',')}`;
			const formation = isCategoryConstellationMode
				? buildCategoryMarkerConstellationFormation(points, seed)
				: buildBeautyMarkerConstellationFormation(points, seed, constellationComposeZoom);

			if (formation.edges.length === 0 && formation.nodes.length === 0) {
				// No drawable formation. Leave composedKey unset so the next idle update
				// can retry after a pan/zoom or a denser coordinate update.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = contactsByPointId;
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			stopMarkerConstellationReveal();
			markerConstellationEdgesRef.current = formation.edges;
			markerConstellationUsesCategoryColorsRef.current =
				isCategoryConstellationMode && !isStatusConstellationMode;
			markerConstellationNodesRef.current = formation.nodes;
			markerConstellationContactsByIdRef.current = contactsByPointId;
			markerConstellationNodeIdsRef.current = formation.lowZoomNodeIds;
			markerConstellationComposedSearchKeyRef.current = compositionKey;
			markerConstellationRevealDoneRef.current = false;
			markerConstellationLastDataKeyRef.current = '';
			markerConstellationIsStatusModeRef.current = isStatusConstellationMode;
			setMarkerConstellationCompositionNonce((value) => value + 1);
			setMarkerConstellationLineOpacity(0, 0, 0);
			writeMarkerConstellationSourceData();
			// Defer the line fade-in until the cinematic camera ease settles so the
			// constellation reveals together with the dot-wave instead of fading in
			// over the fly. The lines are already at opacity 0 above, so they stay
			// invisible through the fly; reveal on `moveend` only if this composition is
			// still the active one.
			let constellationCameraMoving = false;
			try {
				constellationCameraMoving = map.isMoving();
			} catch {
				constellationCameraMoving = false;
			}
			if (constellationCameraMoving) {
				const revealCompositionKey = compositionKey;
				try {
					map.once('moveend', () => {
						if (cancelled) return;
						if (
							markerConstellationComposedSearchKeyRef.current ===
								revealCompositionKey &&
							!markerConstellationRevealDoneRef.current
						) {
							startMarkerConstellationReveal();
						}
					});
				} catch {
					startMarkerConstellationReveal();
				}
			} else {
				startMarkerConstellationReveal();
			}
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		isBackgroundPresentation,
		searchEngaged,
		isAmbientContactsEnabled,
		campaignMarkerMode,
		categoryConstellationsEnabled,
		searchQuery,
		contactsWithCoords,
		getCampaignStatusForContact,
		lockedStateKey,
		isCoordsInLockedState,
		markerConstellationIdleNonce,
		clearMarkerConstellation,
		stopMarkerConstellationReveal,
		setMarkerConstellationLineOpacity,
		writeMarkerConstellationSourceData,
		startMarkerConstellationReveal,
		isCompactOverlayActive,
	]);

	useOverlayMarkerSources({
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
	});

	// Give the DOM tooltip a real hover target around the SVG so moving from the};
