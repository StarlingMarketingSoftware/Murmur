'use client';

import { FC, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

type Props = {
	map: mapboxgl.Map | null;
	hideAtOrAboveZoom?: number;
};

const MIN_INTERVAL_MS = 8000;
const MAX_INTERVAL_MS = 25000;
const FLASH_PEAK_OPACITY = 0.3;
const FLASH_RAMP_UP_MS = 60;
const FLASH_RAMP_DOWN_MS = 180;

export const LightningOverlay: FC<Props> = ({ map, hideAtOrAboveZoom = 8 }) => {
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const rampTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const visibleRef = useRef<boolean>(true);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReducedMotion(mq.matches);
		const onChange = () => setReducedMotion(mq.matches);
		mq.addEventListener?.('change', onChange);
		return () => mq.removeEventListener?.('change', onChange);
	}, []);

	useEffect(() => {
		if (reducedMotion) return;

		const triggerFlash = () => {
			const el = overlayRef.current;
			if (!el || !visibleRef.current) {
				scheduleNext();
				return;
			}
			el.style.transition = `opacity ${FLASH_RAMP_UP_MS}ms ease-out`;
			el.style.opacity = String(FLASH_PEAK_OPACITY);
			const downId = setTimeout(() => {
				if (overlayRef.current) {
					overlayRef.current.style.transition = `opacity ${FLASH_RAMP_DOWN_MS}ms ease-in`;
					overlayRef.current.style.opacity = '0';
				}
			}, FLASH_RAMP_UP_MS);
			rampTimeoutsRef.current.push(downId);
			scheduleNext();
		};

		const scheduleNext = () => {
			const wait = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
			timeoutRef.current = setTimeout(triggerFlash, wait);
		};

		scheduleNext();
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			for (const id of rampTimeoutsRef.current) clearTimeout(id);
			rampTimeoutsRef.current = [];
		};
	}, [reducedMotion]);

	useEffect(() => {
		if (!map) return;
		const onZoom = () => {
			const zoom = map.getZoom() ?? 0;
			visibleRef.current = zoom < hideAtOrAboveZoom;
			if (!visibleRef.current && overlayRef.current) {
				overlayRef.current.style.opacity = '0';
			}
		};
		onZoom();
		map.on('zoom', onZoom);
		return () => {
			map.off('zoom', onZoom);
		};
	}, [map, hideAtOrAboveZoom]);

	return (
		<div
			ref={overlayRef}
			aria-hidden
			style={{
				position: 'absolute',
				inset: 0,
				pointerEvents: 'none',
				background: 'rgba(220, 230, 255, 1)',
				mixBlendMode: 'screen',
				opacity: 0,
				zIndex: 3,
			}}
		/>
	);
};
