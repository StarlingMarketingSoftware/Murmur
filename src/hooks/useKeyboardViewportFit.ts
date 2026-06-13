'use client';

import { RefObject, useEffect } from 'react';

/**
 * Fit a fixed overlay to the visual viewport while the iOS keyboard is up —
 * dvh doesn't track the keyboard, so without this the overlay's bottom content
 * hides behind it. top=offsetTop follows iOS panning the visual viewport for a
 * focused input. Sibling of useKeyboardViewportShrink (MobileDashboardSearch),
 * which has a different contract (height-only + data attribute).
 */
export function useKeyboardViewportFit(
	ref: RefObject<HTMLElement | null>,
	enabled: boolean
) {
	useEffect(() => {
		if (!enabled || typeof window === 'undefined' || !window.visualViewport) return;
		const viewport = window.visualViewport;
		const node = ref.current;
		if (!node) return;
		const update = () => {
			const isKeyboardOpen =
				viewport.height < window.innerHeight - 1 && viewport.scale < 1.05;
			if (isKeyboardOpen) {
				node.style.top = `${viewport.offsetTop}px`;
				node.style.height = `${viewport.height}px`;
			} else {
				node.style.top = '';
				node.style.height = '';
			}
		};
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
			node.style.top = '';
			node.style.height = '';
		};
	}, [ref, enabled]);
}
