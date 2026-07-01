'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { LatLngLiteral } from './types';
import { hashStringToStableKey } from './color';
import { MARKER_HOVER_DARKEN_AMOUNT, darkenHexColor } from './mapExpressions';
import {
	CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS,
	CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME,
	CAMPAIGN_FOOTPRINT_SPARK_ICON_URL,
	EVENT_STAR_ICON_IMAGE_DIMENSIONS,
	EVENT_STAR_ICON_IMAGE_NAME,
	EVENT_STAR_ICON_URL,
	OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS,
	OWNED_VENUE_HOME_ICON_IMAGE_NAME,
	OWNED_VENUE_HOME_ICON_URL,
} from './radarOverlays';
import { MAP_MARKER_PIN_VIEWBOX_HEIGHT, MAP_MARKER_PIN_VIEWBOX_WIDTH, generateUncategorizedContactMarkerIconUrl } from '@/components/atoms/_svg/MapMarkerPinIcon';
import { generateSelectedCategorizedContactMarkerIconUrl } from '@/components/atoms/_svg/SelectedCategorizedContactMarkerIcon';
import { SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT, SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH } from '@/components/atoms/_svg/SelectedContactMarkerIcon';
import { generateSelectedUncategorizedContactMarkerIconUrl } from '@/components/atoms/_svg/SelectedUncategorizedContactMarkerIcon';

export interface UseMapMarkerImagesParams {
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	mapRef: MutableRefObject<mapboxgl.Map | null>;
}

// Mapbox marker image loading: SVG-data-URI rasterization (loadImage can't do
// data: SVG URIs), idempotent addImage with pending-load dedupe, the selected
// categorized/uncategorized marker asset getters, and the ensure-image effects
// for the static icons (owned-venue home, event star, footprint spark).
export const useMapMarkerImages = (params: UseMapMarkerImagesParams) => {
	const {
		isMapLoaded,
		map,
		mapRef,
	} = params;
	// ---- Mapbox marker sources (rendered via layers) ----
	const pendingMapImageLoadsRef = useRef<Map<string, Promise<void>>>(new Map());

	// Rasterize an SVG data-URI to an ImageData via an off-screen canvas.
	// Mapbox GL's `map.loadImage()` doesn't reliably handle `data:image/svg+xml` URIs,
	// so we render the SVG into an <img> → canvas → ImageData and then call `addImage`.
	const rasterizeSvgDataUri = useCallback(
		(
			dataUri: string,
			width: number,
			height: number
		): Promise<{ width: number; height: number; data: Uint8ClampedArray }> => {
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Canvas 2D context unavailable'));
						return;
					}
					ctx.drawImage(img, 0, 0, width, height);
					const imageData = ctx.getImageData(0, 0, width, height);
					resolve({ width, height, data: imageData.data });
				};
				img.onerror = (e) => reject(e);
				img.src = dataUri;
			});
		},
		[]
	);

	const ensureMapImageFromUrl = useCallback(
		(
			imageName: string,
			url: string,
			dimensions: { width: number; height: number } = {
				width: MAP_MARKER_PIN_VIEWBOX_WIDTH,
				height: MAP_MARKER_PIN_VIEWBOX_HEIGHT,
			}
		): Promise<void> => {
			const mapInstance = mapRef.current;
			if (!mapInstance || !isMapLoaded) return Promise.resolve();
			if (mapInstance.hasImage(imageName)) return Promise.resolve();

			const pending = pendingMapImageLoadsRef.current.get(imageName);
			if (pending) return pending;

			// SVG data-URIs need manual rasterization; raster URLs can use loadImage directly.
			const isSvgDataUri = url.startsWith('data:image/svg');

			const promise = isSvgDataUri
				? (async () => {
						try {
							// Render at 2× for retina crispness.
							const scale = 2;
							const w = dimensions.width * scale;
							const h = dimensions.height * scale;
							const imgData = await rasterizeSvgDataUri(url, w, h);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) return;
							if (!latestMap.hasImage(imageName)) {
								latestMap.addImage(imageName, imgData, { pixelRatio: scale });
							}
						} catch (err) {
							console.error('Failed to rasterize SVG marker image', { imageName, err });
						} finally {
							pendingMapImageLoadsRef.current.delete(imageName);
						}
					})()
				: new Promise<void>((resolve) => {
						mapInstance.loadImage(url, (err, image) => {
							pendingMapImageLoadsRef.current.delete(imageName);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) {
								resolve();
								return;
							}
							if (err || !image) {
								console.error('Failed to load Mapbox marker image', { imageName, err });
								resolve();
								return;
							}
							try {
								if (!latestMap.hasImage(imageName)) {
									latestMap.addImage(imageName, image);
								}
							} catch {
								// Ignore.
							}
							resolve();
						});
					});

			pendingMapImageLoadsRef.current.set(imageName, promise);
			return promise;
		},
		[isMapLoaded, rasterizeSvgDataUri]
	);

	const imageNameFromUrl = useCallback(
		(url: string) => `murmur-marker-${hashStringToStableKey(url)}`,
		[]
	);
	const selectedCategorizedContactMarkerAssetCacheRef = useRef<
		Map<
			string,
			{
				imageName: string;
				url: string;
				hoverImageName: string;
				hoverUrl: string;
			}
		>
	>(new Map());
	const getSelectedCategorizedContactMarkerAssets = useCallback(
		(accentColor: string, centerFillColor = 'white', hoverCenterFillColor?: string) => {
			const key = `${accentColor.trim()}|${centerFillColor.trim()}|${
				hoverCenterFillColor?.trim() ?? '__default_hover_center__'
			}`;
			const cached = selectedCategorizedContactMarkerAssetCacheRef.current.get(key);
			if (cached) return cached;

			const accent = accentColor.trim();
			const center = centerFillColor.trim();
			const url = generateSelectedCategorizedContactMarkerIconUrl(accent, center);
			const hoverColor = darkenHexColor(accent, MARKER_HOVER_DARKEN_AMOUNT);
			const hoverUrl = generateSelectedCategorizedContactMarkerIconUrl(
				hoverColor,
				hoverCenterFillColor ?? hoverColor
			);
			const assets = {
				imageName: imageNameFromUrl(url),
				url,
				hoverImageName: imageNameFromUrl(hoverUrl),
				hoverUrl,
			};
			selectedCategorizedContactMarkerAssetCacheRef.current.set(key, assets);
			return assets;
		},
		[imageNameFromUrl]
	);
	const selectedUncategorizedContactMarkerAssetCacheRef = useRef<
		Map<
			string,
			{
				imageName: string;
				url: string;
				hoverImageName: string;
				hoverUrl: string;
			}
		>
	>(new Map());
	const getSelectedUncategorizedContactMarkerAssets = useCallback(
		(
			accentColor = '#50A5C9',
			centerFillColor = 'white',
			hoverCenterFillColor?: string
		) => {
			const key = `${accentColor.trim()}|${centerFillColor.trim()}|${
				hoverCenterFillColor?.trim() ?? '__default_hover_center__'
			}`;
			const cached = selectedUncategorizedContactMarkerAssetCacheRef.current.get(key);
			if (cached) return cached;

			const accent = accentColor.trim();
			const center = centerFillColor.trim();
			const url = generateSelectedUncategorizedContactMarkerIconUrl(accent, center);
			const hoverColor = darkenHexColor(accent, MARKER_HOVER_DARKEN_AMOUNT);
			const hoverUrl = generateSelectedUncategorizedContactMarkerIconUrl(
				hoverColor,
				hoverCenterFillColor ?? hoverColor
			);
			const assets = {
				imageName: imageNameFromUrl(url),
				url,
				hoverImageName: imageNameFromUrl(hoverUrl),
				hoverUrl,
			};
			selectedUncategorizedContactMarkerAssetCacheRef.current.set(key, assets);
			return assets;
		},
		[imageNameFromUrl]
	);

	const uncategorizedContactMarkerUrl = useMemo(
		() => generateUncategorizedContactMarkerIconUrl(),
		[]
	);
	const uncategorizedContactMarkerHoverUrl = useMemo(
		() =>
			generateUncategorizedContactMarkerIconUrl(
				darkenHexColor('#5BB6DD', MARKER_HOVER_DARKEN_AMOUNT)
			),
		[]
	);
	const uncategorizedContactMarkerImageName = useMemo(
		() => imageNameFromUrl(uncategorizedContactMarkerUrl),
		[imageNameFromUrl, uncategorizedContactMarkerUrl]
	);
	const uncategorizedContactMarkerHoverImageName = useMemo(
		() => imageNameFromUrl(uncategorizedContactMarkerHoverUrl),
		[imageNameFromUrl, uncategorizedContactMarkerHoverUrl]
	);
	const selectedUncategorizedContactMarkerUrl = useMemo(
		() => generateSelectedUncategorizedContactMarkerIconUrl(),
		[]
	);
	const selectedUncategorizedContactMarkerHoverUrl = useMemo(() => {
		const hoverColor = darkenHexColor('#50A5C9', MARKER_HOVER_DARKEN_AMOUNT);
		return generateSelectedUncategorizedContactMarkerIconUrl(hoverColor, hoverColor);
	}, []);
	const selectedUncategorizedContactMarkerImageName = useMemo(
		() => imageNameFromUrl(selectedUncategorizedContactMarkerUrl),
		[imageNameFromUrl, selectedUncategorizedContactMarkerUrl]
	);
	const selectedUncategorizedContactMarkerHoverImageName = useMemo(
		() => imageNameFromUrl(selectedUncategorizedContactMarkerHoverUrl),
		[imageNameFromUrl, selectedUncategorizedContactMarkerHoverUrl]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		void ensureMapImageFromUrl(
			uncategorizedContactMarkerImageName,
			uncategorizedContactMarkerUrl
		);
		void ensureMapImageFromUrl(
			uncategorizedContactMarkerHoverImageName,
			uncategorizedContactMarkerHoverUrl
		);
	}, [
		map,
		isMapLoaded,
		ensureMapImageFromUrl,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerUrl,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerHoverUrl,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const selectedMarkerDimensions = {
			width: SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH,
			height: SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT,
		};
		void ensureMapImageFromUrl(
			selectedUncategorizedContactMarkerImageName,
			selectedUncategorizedContactMarkerUrl,
			selectedMarkerDimensions
		);
		void ensureMapImageFromUrl(
			selectedUncategorizedContactMarkerHoverImageName,
			selectedUncategorizedContactMarkerHoverUrl,
			selectedMarkerDimensions
		);
	}, [
		map,
		isMapLoaded,
		ensureMapImageFromUrl,
		selectedUncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		void ensureMapImageFromUrl(
			OWNED_VENUE_HOME_ICON_IMAGE_NAME,
			OWNED_VENUE_HOME_ICON_URL,
			OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS
		);
		void ensureMapImageFromUrl(
			EVENT_STAR_ICON_IMAGE_NAME,
			EVENT_STAR_ICON_URL,
			EVENT_STAR_ICON_IMAGE_DIMENSIONS
		);
		void ensureMapImageFromUrl(
			CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME,
			CAMPAIGN_FOOTPRINT_SPARK_ICON_URL,
			CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS
		);
	}, [map, isMapLoaded, ensureMapImageFromUrl]);

	return {
		ensureMapImageFromUrl,
		imageNameFromUrl,
		getSelectedCategorizedContactMarkerAssets,
		getSelectedUncategorizedContactMarkerAssets,
		uncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
	};
};
