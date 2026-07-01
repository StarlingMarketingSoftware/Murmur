'use client';

import { useEffect, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import {
	CAMPAIGN_HEATMAP_DENSITY_SCALE_FULL_COUNT,
	CAMPAIGN_HEATMAP_DENSITY_SCALE_MIN,
	CAMPAIGN_HEATMAP_DENSITY_SCALE_START_COUNT,
	CAMPAIGN_HEATMAP_FADE_MS,
	MAPBOX_SOURCE_IDS,
} from './constants';
import { clamp, lerp, smoothstep } from './math';
import { emptyFeatureCollection } from './radarOverlays';
import type { CampaignContactMapStatus } from './markerStatusStyles';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';

export interface UseCampaignHeatmapParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	campaignMarkerMode: SearchResultsMapProps['campaignMarkerMode'];
	campaignHeatmapColor: string | null;
	campaignHeatmapStatusColors: SearchResultsMapProps['campaignHeatmapStatusColors'];
	campaignHeatmapAmbient: boolean;
	contactsWithCoords: ContactWithName[];
	selectedContacts: number[];
	coordsByContactId: Map<number, LatLngLiteral>;
	getContactCoords: (contact: ContactWithName) => LatLngLiteral | null;
	getCampaignStatusForContact: (contactId: number) => CampaignContactMapStatus;
	campaignHeatmapFadeRafRef: MutableRefObject<number | null>;
	campaignHeatmapFadeByIdRef: MutableRefObject<Map<number, number>>;
}

export const useCampaignHeatmap = ({
	map,
	isMapLoaded,
	campaignMarkerMode,
	campaignHeatmapColor,
	campaignHeatmapStatusColors,
	campaignHeatmapAmbient,
	contactsWithCoords,
	selectedContacts,
	coordsByContactId,
	getContactCoords,
	getCampaignStatusForContact,
	campaignHeatmapFadeRafRef,
	campaignHeatmapFadeByIdRef,
}: UseCampaignHeatmapParams): void => {
	// --- Campaign selection heatmap glow -------------------------------------
	// The heatmap envelops the currently-selected contacts (intersected with the
	// tab's on-map set so off-tab/coordless ids are dropped). Ambient tab views
	// glow the whole visible set when nothing is selected.
	const heatmapContactIds = useMemo<number[]>(() => {
		if (
			campaignMarkerMode !== 'status' ||
			(!campaignHeatmapColor && !campaignHeatmapStatusColors)
		) {
			return [];
		}
		const onMapIds = contactsWithCoords.map((c) => c.id);
		if (selectedContacts.length === 0) return campaignHeatmapAmbient ? onMapIds : [];
		const onMap = new Set(onMapIds);
		return selectedContacts.filter((id) => onMap.has(id));
	}, [
		campaignMarkerMode,
		campaignHeatmapColor,
		campaignHeatmapStatusColors,
		campaignHeatmapAmbient,
		contactsWithCoords,
		selectedContacts,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.campaignHeatmap) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		const cancelFade = () => {
			if (campaignHeatmapFadeRafRef.current != null) {
				cancelAnimationFrame(campaignHeatmapFadeRafRef.current);
				campaignHeatmapFadeRafRef.current = null;
			}
		};

		// Off unless in status mode with a tint supplied.
		if (
			campaignMarkerMode !== 'status' ||
			(!campaignHeatmapColor && !campaignHeatmapStatusColors)
		) {
			cancelFade();
			campaignHeatmapFadeByIdRef.current.clear();
			source.setData(emptyFeatureCollection());
			return;
		}

		// The source carries the full tab set so members can crossfade in and out:
		// each contact's target glowFade is 1 when it's in the heatmap set and 0
		// otherwise. Animate from the last rendered value toward the target, then
		// go idle (the GPU re-projects the static layer on pan/zoom for free).
		const targetSet = new Set(heatmapContactIds);
		const startById = campaignHeatmapFadeByIdRef.current;
		// Base density scaling on whichever set is larger: the new target set or the
		// currently visible fading set. That avoids a bright flash when moving from a
		// dense ambient heatmap to a tiny selection — outgoing contacts keep the dense
		// attenuation while they fade away, then the remaining small selection can read
		// normally once the crossfade reaches its final frame.
		const previousVisibleCount = Array.from(startById.values()).filter(
			(fade) => fade > 0.001
		).length;
		const densityBasisCount = Math.max(targetSet.size, previousVisibleCount);
		const getGlowDensityScale = (basisCount: number) => {
			const densityScaleT =
				basisCount <= CAMPAIGN_HEATMAP_DENSITY_SCALE_START_COUNT
					? 0
					: smoothstep(
							0,
							1,
							clamp(
								(Math.sqrt(basisCount) -
									Math.sqrt(CAMPAIGN_HEATMAP_DENSITY_SCALE_START_COUNT)) /
									(Math.sqrt(CAMPAIGN_HEATMAP_DENSITY_SCALE_FULL_COUNT) -
										Math.sqrt(CAMPAIGN_HEATMAP_DENSITY_SCALE_START_COUNT)),
								0,
								1
							)
						);
			return lerp(1, CAMPAIGN_HEATMAP_DENSITY_SCALE_MIN, densityScaleT);
		};
		const crossfadeGlowDensityScale = getGlowDensityScale(densityBasisCount);
		const targetGlowDensityScale = getGlowDensityScale(targetSet.size);
		const coordsById = new Map<number, LatLngLiteral>();
		for (const contact of contactsWithCoords) {
			const coords = getContactCoords(contact);
			if (coords) coordsById.set(contact.id, coords);
		}

		const needsAnim = Array.from(coordsById.keys()).some((id) => {
			const start = startById.get(id) ?? 0;
			const target = targetSet.has(id) ? 1 : 0;
			return Math.abs(start - target) > 0.001;
		});

		const writeFrame = (eased: number) => {
			const glowDensityScale =
				eased >= 1 ? targetGlowDensityScale : crossfadeGlowDensityScale;
			const nextById = new Map<number, number>();
			const features: GeoJSON.Feature[] = [];
			coordsById.forEach((coords, id) => {
				const start = startById.get(id) ?? 0;
				const target = targetSet.has(id) ? 1 : 0;
				const fade = eased >= 1 ? target : start + (target - start) * eased;
				nextById.set(id, fade);
				if (fade <= 0.001) return; // fully faded out — omit (opacity 0)
				features.push({
					type: 'Feature' as const,
					id,
					properties: {
						glowColor:
							campaignHeatmapStatusColors?.[getCampaignStatusForContact(id)] ??
							campaignHeatmapColor ??
							'#FFA5A5',
						glowFade: fade,
						glowDensityScale,
					},
					geometry: { type: 'Point' as const, coordinates: [coords.lng, coords.lat] },
				});
			});
			campaignHeatmapFadeByIdRef.current = nextById;
			source.setData({ type: 'FeatureCollection' as const, features });
		};

		cancelFade();

		if (!needsAnim) {
			writeFrame(1);
			return;
		}

		const startMs = performance.now();
		writeFrame(0);
		const tick = () => {
			const progress = Math.min(
				1,
				(performance.now() - startMs) / CAMPAIGN_HEATMAP_FADE_MS
			);
			writeFrame(smoothstep(0, 1, progress));
			if (progress < 1) {
				campaignHeatmapFadeRafRef.current = requestAnimationFrame(tick);
				return;
			}
			campaignHeatmapFadeRafRef.current = null;
		};
		campaignHeatmapFadeRafRef.current = requestAnimationFrame(tick);

		return cancelFade;
	}, [
		map,
		isMapLoaded,
		campaignMarkerMode,
		campaignHeatmapColor,
		campaignHeatmapStatusColors,
		heatmapContactIds,
		contactsWithCoords,
		coordsByContactId,
		getCampaignStatusForContact,
	]);
};
