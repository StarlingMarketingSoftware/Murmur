'use client';

import { useEffect, useMemo } from 'react';
import type mapboxgl from 'mapbox-gl';
import {
	CAMPAIGN_FOOTPRINT_MAX_POINTS,
	MAPBOX_SOURCE_IDS,
	MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
} from './constants';
import { emptyFeatureCollection } from './radarOverlays';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import { coordinateKey, getLatLngFromContact, jitterDuplicateCoords } from './coordinates';
import { hashStringToUint32, latLngToWorldPixel } from './wasmGeo';
import {
	buildBeautyMarkerConstellationFormation,
	markerConstellationPairKey,
} from './markerConstellation';
import type { MarkerConstellationPoint } from './types';

export interface UseCampaignFootprintParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	isBackgroundPresentation: boolean;
	searchEngaged: boolean;
	campaignFootprintContacts: ContactWithName[];
}

// Campaign footprint: the active campaign's real contacts rendered as a subtle
// non-interactive constellation under search results (browse state only).
export const useCampaignFootprint = ({
	map,
	isMapLoaded,
	isBackgroundPresentation,
	searchEngaged,
	campaignFootprintContacts,
}: UseCampaignFootprintParams) => {
	const { campaignFootprintContactsWithCoords, campaignFootprintCoordsByContactId } =
		useMemo(() => {
			const coordsByContactId = new Map<number, LatLngLiteral>();
			const contactsWithCoords: ContactWithName[] = [];
			const groups = new Map<string, number[]>();
			const seenContactIds = new Set<number>();

			for (const contact of campaignFootprintContacts) {
				if (seenContactIds.has(contact.id)) continue;
				seenContactIds.add(contact.id);
				const coords = getLatLngFromContact(contact);
				if (!coords) continue;
				coordsByContactId.set(contact.id, coords);
				contactsWithCoords.push(contact);
				const key = coordinateKey(coords);
				const existing = groups.get(key);
				if (existing) existing.push(contact.id);
				else groups.set(key, [contact.id]);
			}

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

			return {
				campaignFootprintContactsWithCoords: contactsWithCoords,
				campaignFootprintCoordsByContactId: coordsByContactId,
			};
		}, [campaignFootprintContacts]);
	const campaignFootprintContactIdSet = useMemo(
		() => new Set(campaignFootprintContactsWithCoords.map((contact) => contact.id)),
		[campaignFootprintContactsWithCoords]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const pointSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintPoints) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const lineSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintLines) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintNodes) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!pointSource || !lineSource || !nodeSource) return;

		const clearFootprint = () => {
			const empty = emptyFeatureCollection();
			pointSource.setData(empty);
			lineSource.setData(empty);
			nodeSource.setData(empty);
		};

		// Hide the footprint whenever a search is engaged (typed query or a curated
		// "For You" search) so it never clutters the live result dots/lines. It only
		// shows in the disengaged/browse state.
		if (
			isBackgroundPresentation ||
			searchEngaged ||
			campaignFootprintContactsWithCoords.length === 0
		) {
			clearFootprint();
			return;
		}

		const pointFeatures: GeoJSON.Feature[] = [];
		for (const contact of campaignFootprintContactsWithCoords) {
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			pointFeatures.push({
				type: 'Feature',
				id: contact.id,
				properties: { contactId: contact.id },
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}

		let contactsForConstellation = campaignFootprintContactsWithCoords.slice();
		if (contactsForConstellation.length > CAMPAIGN_FOOTPRINT_MAX_POINTS) {
			contactsForConstellation = contactsForConstellation
				.map((contact) => ({
					contact,
					score: hashStringToUint32(`campaign-footprint|${contact.id}`),
				}))
				.sort((a, b) => a.score - b.score)
				.slice(0, CAMPAIGN_FOOTPRINT_MAX_POINTS)
				.map(({ contact }) => contact);
		}
		contactsForConstellation.sort((a, b) => a.id - b.id);

		const constellationWorldSize =
			512 * Math.pow(2, MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM);
		const constellationPoints: MarkerConstellationPoint[] = [];
		for (const contact of contactsForConstellation) {
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			const projected = latLngToWorldPixel(coords, constellationWorldSize);
			if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;
			constellationPoints.push({
				id: contact.id,
				coords,
				x: projected.x,
				y: projected.y,
				groupKey: 'campaign-footprint',
			});
		}

		const formation =
			constellationPoints.length >= 2
				? buildBeautyMarkerConstellationFormation(
						constellationPoints,
						'campaign-footprint',
						MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM
					)
				: { edges: [], nodes: [], lowZoomNodeIds: new Set<number>() };

		const lineFeatures: GeoJSON.Feature[] = [];
		for (const edge of formation.edges) {
			const fromCoords = campaignFootprintCoordsByContactId.get(edge.fromId);
			const toCoords = campaignFootprintCoordsByContactId.get(edge.toId);
			if (!fromCoords || !toCoords) continue;
			const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
			const lineOpacity = Math.max(0.36, (1 - edge.rank * 0.34) * edge.opacityScale);
			lineFeatures.push({
				type: 'Feature',
				id: `campaign-footprint:${edge.level}:${edgeId}`,
				properties: { level: edge.level, lineOpacity },
				geometry: {
					type: 'LineString',
					coordinates: [
						[fromCoords.lng, fromCoords.lat],
						[toCoords.lng, toCoords.lat],
					],
				},
			});
		}

		const nodeFeatureById = new Map<number, GeoJSON.Feature>();
		for (const node of formation.nodes) {
			const coords = campaignFootprintCoordsByContactId.get(node.id);
			if (!coords) continue;
			const nodeOpacity = Math.max(0.46, (1 - node.rank * 0.26) * node.opacityScale);
			nodeFeatureById.set(node.id, {
				type: 'Feature',
				id: `campaign-footprint:${node.level}:${node.id}`,
				properties: {
					level: node.level,
					nodeOpacity,
					closeNodeGlowOpacity: 0.9,
					closeSparkOpacity: 1,
					sparkRotation: hashStringToUint32(`campaign-footprint-spark|${node.id}`) % 90,
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}
		for (const contact of campaignFootprintContactsWithCoords) {
			if (nodeFeatureById.has(contact.id)) continue;
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			nodeFeatureById.set(contact.id, {
				type: 'Feature',
				id: `campaign-footprint:contact:${contact.id}`,
				properties: {
					level: 'detail',
					nodeOpacity: 0.46,
					closeNodeGlowOpacity: 0.9,
					closeSparkOpacity: 1,
					sparkRotation:
						hashStringToUint32(`campaign-footprint-spark|${contact.id}`) % 90,
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}
		const nodeFeatures = Array.from(nodeFeatureById.values());

		pointSource.setData({ type: 'FeatureCollection', features: pointFeatures });
		lineSource.setData({ type: 'FeatureCollection', features: lineFeatures });
		nodeSource.setData({ type: 'FeatureCollection', features: nodeFeatures });
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		searchEngaged,
		campaignFootprintContactsWithCoords,
		campaignFootprintCoordsByContactId,
	]);

	return { campaignFootprintContactIdSet };
};
