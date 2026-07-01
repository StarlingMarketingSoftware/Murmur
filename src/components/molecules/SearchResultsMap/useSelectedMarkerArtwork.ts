'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';


export interface UseSelectedMarkerArtworkParams {
	_unused?: never;
}

export const useSelectedMarkerArtwork = (params: UseSelectedMarkerArtworkParams): void => {
	void params;
	// Selected marker artwork. This source is separate from the normal dot/pin sources so
	// selected contacts can swap to the bespoke halo markers without rebuilding every marker.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersSelected) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		// Nothing selected: hard-clear the bespoke selected-marker source and cancel any
		// in-flight fade. This must run BEFORE the isLoading / signature short-circuits below.
		// When the selection empties during a refetch (e.g. right after "Add Contacts"
		// invalidates queries) or while a fade-out is interrupted, those short-circuits
		// otherwise strand phantom halo rings on the map with nothing selected.
		if (selectedContacts.length === 0) {
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
			selectedMarkerFadeByIdRef.current.clear();
			selectedMarkerScaleByIdRef.current.clear();
			selectedMarkerFeatureByIdRef.current = new Map();
			selectedMarkerBuildSignatureRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		if (isLoading) {
			// Preserve existing selected markers while parent data is refetching.
			return;
		}

		// Campaign status mode (Write/Drafts/Inbox) renders selection as the bigger
		// blue circle on the base dot itself — keep this bespoke halo artwork cleared
		// so it never fades the base dot out (its selectedMarkerT) or overlays the
		// dashboard pick-flow halo on top of the status-colored markers.
		if (
			campaignMarkerMode === 'status' ||
			(!searchEngaged && !isAmbientContactsEnabled)
		) {
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
			selectedMarkerFadeByIdRef.current.clear();
			selectedMarkerScaleByIdRef.current.clear();
			selectedMarkerFeatureByIdRef.current = new Map();
			selectedMarkerBuildSignatureRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		let cancelled = false;

		const run = async () => {
			const selectedSet = new Set<number>(selectedContacts);
			const seenIds = new Set<number>();
			const nextSelectedFeaturesById = new Map<number, any>();
			const selectedMarkerImagesToEnsure = new Map<string, string>();
			const fadeWithSelectedStateOrb = Boolean(
				lockedStateKey &&
				lockedStateSelectionKeyRef.current === lockedStateKey &&
				selectedStateMorphSourceRef.current
			);

			const addSelectedMarker = (
				contact: ContactWithName,
				coords: LatLngLiteral | null,
				whatForMarker?: string | null
			) => {
				if (!selectedSet.has(contact.id)) return;
				if (seenIds.has(contact.id)) return;
				if (!coords) return;

				const isUncategorized = !isCleanMapMarkerCategory(whatForMarker);
				const dashboardDraftingMarkerStyle = getDashboardDraftingMarkerStyleForContact(
					contact.id
				);
				const selectedIconAssets = dashboardDraftingMarkerStyle
					? isUncategorized
						? getSelectedUncategorizedContactMarkerAssets(
								dashboardDraftingMarkerStyle.strokeColor,
								dashboardDraftingMarkerStyle.centerFillColor,
								dashboardDraftingMarkerStyle.centerFillColor
							)
						: getSelectedCategorizedContactMarkerAssets(
								dashboardDraftingMarkerStyle.strokeColor,
								dashboardDraftingMarkerStyle.centerFillColor,
								dashboardDraftingMarkerStyle.centerFillColor
							)
					: isUncategorized
						? {
								imageName: selectedUncategorizedContactMarkerImageName,
								url: selectedUncategorizedContactMarkerUrl,
								hoverImageName: selectedUncategorizedContactMarkerHoverImageName,
								hoverUrl: selectedUncategorizedContactMarkerHoverUrl,
							}
						: getSelectedCategorizedContactMarkerAssets(
								getResultDotColorForWhat(whatForMarker)
							);
				selectedMarkerImagesToEnsure.set(
					selectedIconAssets.imageName,
					selectedIconAssets.url
				);
				selectedMarkerImagesToEnsure.set(
					selectedIconAssets.hoverImageName,
					selectedIconAssets.hoverUrl
				);
				seenIds.add(contact.id);
				nextSelectedFeaturesById.set(contact.id, {
					type: 'Feature',
					id: contact.id,
					properties: {
						selectedIcon: selectedIconAssets.imageName,
						selectedIconHover: selectedIconAssets.hoverImageName,
						isUncategorized,
						fadeWithSelectedStateOrb,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			};

			for (const contact of contactsWithCoords) {
				addSelectedMarker(
					contact,
					getContactCoords(contact),
					contact.curatedCategory ?? searchWhat ?? null
				);
			}

			// Read overlay arrays from refs (not the effect deps) so zoom-driven overlay
			// resamples don't re-trigger this effect and restart the fade animation.
			for (const contact of bookingExtraVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getBookingExtraContactCoords(contact),
					getBookingTitlePrefixFromContactTitle(contact.title) ?? null
				);
			}

			for (const contact of promotionOverlayVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getPromotionOverlayContactCoords(contact),
					getPromotionOverlayWhatFromContactTitle(contact.title) ?? null
				);
			}

			for (const contact of allContactsOverlayVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getAllContactsOverlayContactCoords(contact),
					getAmbientContactWhatFromTitle(contact.title)
				);
			}

			for (const entry of compactOverlayPillEntries) {
				addSelectedMarker(entry.contact, entry.coords, entry.whatForMarker);
			}

			// Fallback for selected contacts that aren't in the current map dataset/overlays
			// (e.g. curated selections kept visible after disengaging to the ambient atlas).
			// Deduped by seenIds, so contacts already added above keep their dot-aligned coords.
			for (const contact of selectedContactObjects) {
				addSelectedMarker(
					contact,
					getLatLngFromContact(contact),
					contact.curatedCategory ??
						searchWhat ??
						getAmbientContactWhatFromTitle(contact.title) ??
						null
				);
			}

			// Pure-zoom re-runs (overlay arrays changed reference but the selected
			// subset, its coords, and styling are identical) are no-ops. Skip the
			// rebuild + re-animation so selected halos stay stable while zooming.
			const signatureParts: string[] = [];
			for (const id of Array.from(nextSelectedFeaturesById.keys()).sort(
				(a, b) => a - b
			)) {
				const feature = nextSelectedFeaturesById.get(id);
				const [lng, lat] = feature.geometry.coordinates;
				const properties = feature.properties ?? {};
				signatureParts.push(
					`${id}:${properties.selectedIcon ?? ''}:${
						properties.selectedIconHover ?? ''
					}:${properties.isUncategorized ? 'u' : 'c'}:${
						properties.fadeWithSelectedStateOrb ? '1' : '0'
					}:${lng.toFixed(5)}:${lat.toFixed(5)}`
				);
			}
			const nextSignature = signatureParts.join(',');
			const selectedMarkerDimensions = {
				width: SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH,
				height: SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT,
			};
			await Promise.all(
				Array.from(selectedMarkerImagesToEnsure.entries()).map(([imageName, url]) =>
					ensureMapImageFromUrl(imageName, url, selectedMarkerDimensions)
				)
			);
			if (cancelled) return;

			if (
				nextSignature === selectedMarkerBuildSignatureRef.current &&
				selectedMarkerFadeRafRef.current == null
			) {
				return;
			}
			selectedMarkerBuildSignatureRef.current = nextSignature;

			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}

			const featureById = new Map<number, any>(selectedMarkerFeatureByIdRef.current);
			for (const [id, feature] of nextSelectedFeaturesById) {
				featureById.set(id, feature);
			}

			const fadeById = selectedMarkerFadeByIdRef.current;
			const scaleById = selectedMarkerScaleByIdRef.current;
			const targets = new Map<number, number>();
			for (const id of featureById.keys()) {
				targets.set(id, nextSelectedFeaturesById.has(id) ? 1 : 0);
			}

			if (targets.size === 0) {
				fadeById.clear();
				scaleById.clear();
				selectedMarkerFeatureByIdRef.current = new Map();
				selectedMarkerBuildSignatureRef.current = '';
				source.setData({ type: 'FeatureCollection', features: [] } as any);
				return;
			}

			const startFadeById = new Map<number, number>();
			const startScaleById = new Map<number, number>();
			for (const id of targets.keys()) {
				const isSelecting = nextSelectedFeaturesById.has(id);
				startFadeById.set(
					id,
					fadeById.get(id) ?? (isSelecting ? SELECTED_MARKER_ENTRY_OPACITY : 1)
				);
				startScaleById.set(
					id,
					scaleById.get(id) ?? (isSelecting ? SELECTED_MARKER_INITIAL_TRANSFORM_SCALE : 1)
				);
			}

			const setNormalMarkerAnimationState = (id: number, t: number) => {
				for (const sourceId of [
					MAPBOX_SOURCE_IDS.markersBase,
					MAPBOX_SOURCE_IDS.markersBookingPin,
					MAPBOX_SOURCE_IDS.markersPromotionDot,
					MAPBOX_SOURCE_IDS.markersPromotionPin,
					MAPBOX_SOURCE_IDS.markersAllOverlay,
				]) {
					try {
						map.setFeatureState({ source: sourceId, id }, { selectedMarkerT: t });
					} catch {
						// Feature may not be present in this source.
					}
				}
			};

			const writeFrame = (progress: number) => {
				const eased = 1 - Math.pow(1 - progress, 3);
				const features: any[] = [];

				for (const [id, target] of targets) {
					const feature = featureById.get(id);
					if (!feature) continue;
					const start = startFadeById.get(id) ?? target;
					const opacity = start + (target - start) * eased;
					const startScale = startScaleById.get(id) ?? 1;
					const targetScale = target > 0 ? 1 : SELECTED_MARKER_INITIAL_TRANSFORM_SCALE;
					const scale = startScale + (targetScale - startScale) * eased;

					if (progress >= 1 && target <= 0) {
						fadeById.delete(id);
						scaleById.delete(id);
						featureById.delete(id);
						setNormalMarkerAnimationState(id, 0);
						continue;
					}

					fadeById.set(id, opacity);
					scaleById.set(id, scale);
					setNormalMarkerAnimationState(id, opacity);
					features.push({
						...feature,
						properties: {
							...(feature.properties ?? {}),
							selectedMarkerOpacity: opacity,
							selectedMarkerScale: scale,
						},
					});
				}

				selectedMarkerFeatureByIdRef.current = featureById;
				source.setData({ type: 'FeatureCollection', features } as any);
			};

			const startMs = performance.now();
			writeFrame(0);

			const tick = () => {
				const progress = Math.min(
					1,
					(performance.now() - startMs) / SELECTED_MARKER_FADE_MS
				);
				writeFrame(progress);

				if (progress < 1) {
					selectedMarkerFadeRafRef.current = requestAnimationFrame(tick);
					return;
				}

				selectedMarkerFadeRafRef.current = null;
			};

			selectedMarkerFadeRafRef.current = requestAnimationFrame(tick);
		};

		void run();

		return () => {
			cancelled = true;
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		searchEngaged,
		isAmbientContactsEnabled,
		campaignMarkerMode,
		selectedContacts,
		selectedContactObjects,
		contactsWithCoords,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
		compactOverlayPillEntries,
		lockedStateKey,
		isStateLayerReady,
		ensureMapImageFromUrl,
		getDashboardDraftingMarkerStyleForContact,
		getSelectedCategorizedContactMarkerAssets,
		getSelectedUncategorizedContactMarkerAssets,
		selectedUncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
	]);};
