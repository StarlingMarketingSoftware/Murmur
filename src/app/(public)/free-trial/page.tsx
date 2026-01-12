/* eslint-disable no-console */
'use client';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';

export default function FreeTrialPage() {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapRef.current) return;

		const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			console.warn(
				'Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. Add it to your environment to load Mapbox.'
			);
			return;
		}

		mapboxgl.accessToken = accessToken;

		// Lock the globe at a fixed zoom level (adjust if desired).
		const LOCKED_ZOOM = 2.2;

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: [-98.5795, 39.8283], // USA
			zoom: LOCKED_ZOOM,
			minZoom: LOCKED_ZOOM,
			maxZoom: LOCKED_ZOOM,
		});

		// Disable zoom controls/interactions (keeps the globe "fixed" at LOCKED_ZOOM).
		map.scrollZoom.disable();
		map.boxZoom.disable();
		map.doubleClickZoom.disable();
		map.dragPan.disable();
		map.dragRotate.disable();
		map.keyboard.disable();
		map.touchZoomRotate.disable();

		map.on('style.load', () => {
			// Ensure globe projection is enabled.
			map.setProjection({ name: 'globe' });

			// Keep the style's default atmosphere (globe colors),
			// but make the surrounding "space" black + starry.
			const existingFog = map.getFog() ?? {};
			map.setFog({
				...existingFog,
				// Remove atmospheric glow/halo entirely.
				color: 'rgb(0, 0, 0)',
				'high-color': 'rgb(0, 0, 0)',
				'space-color': 'rgb(0, 0, 0)',
				'star-intensity': 0.9,
				'horizon-blend': 0,
			});

			// Remove all words (labels) and administrative borders.
			const style = map.getStyle();
			for (const layer of style.layers ?? []) {
				const id = layer.id;

				// Text/icon labels
				if (layer.type === 'symbol') {
					map.setLayoutProperty(id, 'visibility', 'none');
					continue;
				}

				// Political/administrative boundaries (borders)
				const idLower = id.toLowerCase();
				if (
					layer.type === 'line' &&
					(idLower.includes('admin') ||
						idLower.includes('boundary') ||
						idLower.includes('border'))
				) {
					map.setLayoutProperty(id, 'visibility', 'none');
				}
			}

			// Auto-rotate the globe by shifting the center longitude.
			const secondsPerRevolution = 160;
			const distancePerSecond = 360 / secondsPerRevolution;
			const animationDurationMs = 1000;

			const normalizeLng = (lng: number) => {
				// Normalize to [-180, 180)
				const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
				return wrapped;
			};

			const spinGlobe = () => {
				const center = map.getCenter();
				center.lng = normalizeLng(center.lng - distancePerSecond);
				map.easeTo({
					center,
					duration: animationDurationMs,
					easing: (n) => n,
				});
			};

			map.on('moveend', spinGlobe);
			spinGlobe();
		});

		mapRef.current = map;

		return () => {
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);

	return (
		<div className="w-full h-[calc(100vh-3rem)]">
			<div ref={mapContainerRef} className="w-full h-full" />
		</div>
	);
}

