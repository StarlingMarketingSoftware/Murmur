'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLenis } from '@/contexts/ScrollContext';

/**
 * Scroll-to-map gesture for the desktop dashboard hero.
 *
 * The landing dashboard is hard scroll-locked (`html/body { overflow:hidden; height:100vh }`),
 * so there is no real scroll distance to drive a transition with. Instead we intercept the
 * wheel/touch gesture, accumulate it into a normalized progress `p ∈ [0,1]`, and scrub a
 * reversible "peek": the hero (logo / search bar / action grid), the landing panel below it
 * (Strategy box et al.) and the fixed Ask Anything bar fade out — top elements drift up,
 * bottom elements sink down — while the persistent
 * map dollies in via a pure-CSS scale (the `--map-scrub-scale` variable read by
 * PersistentDashboardMap). The Mapbox camera is never touched during the scrub — its zoom is
 * locked in background presentation, and driving it per-frame would fight that lock and the
 * decorative auto-spin.
 *
 * Past a commit threshold (or a strong downward fling) we call `onCommit`, which flips the app
 * into ambient browse mode + full-screen interactive map; the existing background→interactive
 * easeTo flies the camera in. Below the threshold on release, the scrub snaps back to the hero.
 *
 * Reduced motion: the scrub is skipped entirely; the first decisive downward gesture commits
 * instantly. Mobile / non-desktop are excluded by the caller (`enabled`) — Lenis is absent and
 * the hero tree differs there.
 */

type UseDashboardScrollToMapArgs = {
	/** True only in the locked landing-hero state (see shouldLockLandingDashboardScroll). */
	enabled: boolean;
	/** Flip into ambient browse mode + interactive map. Called at most once per armed gesture. */
	onCommit: () => void;
};

const SCRUB_DISTANCE_PX = 900; // gesture travel that maps to full progress
const COMMIT_THRESHOLD = 0.55; // release at/above this progress commits
const FLING_DELTA_PX = 140; // a single wheel sample larger than this is a "fling"
const FLING_MIN_PROGRESS = 0.25; // …but only once the user has clearly started
const SETTLE_MS = 90; // no gesture for this long = "stopped scrolling"
const SNAPBACK_MS = 500;
const COMMIT_FINISH_MS = 550;
const REDUCED_MOTION_TRIGGER_PX = 220;

const MAP_DOLLY_MAX = 0.03; // map scales up to 1.03x at full peek
const HERO_TRANSLATE_PX = 60;
const HERO_SCALE_DROP = 0.04;
const LOGO_TRANSLATE_PX = 90;
const ACTION_BAR_TRANSLATE_PX = 24;
const SEARCH_BAR_TRANSLATE_PX = 28; // drifts up with the logo
const PANEL_TRANSLATE_PX = 32; // landing panel (Strategy box et al.) sinks down
const ASK_BAR_TRANSLATE_PX = 16; // fixed bottom bar sinks toward the edge

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function smoothstep(edge0: number, edge1: number, x: number) {
	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}

export function useDashboardScrollToMap({
	enabled,
	onCommit,
}: UseDashboardScrollToMapArgs) {
	const lenis = useLenis();

	// Keep the latest onCommit without re-subscribing the listeners every render.
	const onCommitRef = useRef(onCommit);
	onCommitRef.current = onCommit;

	const committedRef = useRef(false);

	const runCommit = useCallback(() => {
		if (committedRef.current) return;
		committedRef.current = true;
		onCommitRef.current();
	}, []);

	useEffect(() => {
		if (!enabled || typeof window === 'undefined') return;

		const root = document.documentElement;
		const heroWrapper = document.querySelector<HTMLElement>('.hero-wrapper');
		const logo = document.querySelector<HTMLElement>('.premium-logo-container');
		const searchBar = document.querySelector<HTMLElement>('.search-bar-wrapper');
		const actionBar = document.querySelector<HTMLElement>('.dashboard-action-bar');
		const landingPanel = document.querySelector<HTMLElement>(
			'.dashboard-landing-panel'
		);
		const askBar = document.querySelector<HTMLElement>('.dashboard-ask-bar-scrub');
		const heroTargets = [
			heroWrapper,
			logo,
			searchBar,
			actionBar,
			landingPanel,
			askBar,
		].filter((el): el is HTMLElement => el != null);

		const reduceMotion =
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

		committedRef.current = false;
		let accumPx = 0;
		let progress = 0;
		let crossedCommit = false; // hysteresis: snapback threshold relaxes after crossing
		let settleTimer: ReturnType<typeof setTimeout> | null = null;
		let rafId: number | null = null;
		let touchY: number | null = null;

		const cancelTween = () => {
			if (rafId != null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};

		const tween = (
			durationMs: number,
			onUpdate: (e: number) => void,
			onDone?: () => void
		) => {
			cancelTween();
			const start = performance.now();
			const step = (now: number) => {
				const t = clamp01((now - start) / durationMs);
				onUpdate(easeOutCubic(t));
				if (t < 1) {
					rafId = requestAnimationFrame(step);
				} else {
					rafId = null;
					onDone?.();
				}
			};
			rafId = requestAnimationFrame(step);
		};

		const setOpacityTransform = (
			el: HTMLElement | null,
			opacity: number,
			transform?: string
		) => {
			if (!el) return;
			el.style.opacity = String(opacity);
			if (transform != null) el.style.transform = transform;
		};

		// Apply all scrub visuals as a pure function of progress p — fully reversible.
		const apply = (p: number) => {
			setOpacityTransform(
				heroWrapper,
				1 - smoothstep(0, 0.85, p),
				`translateY(${-HERO_TRANSLATE_PX * p}px) scale(${1 - HERO_SCALE_DROP * p})`
			);
			setOpacityTransform(
				logo,
				1 - smoothstep(0, 0.5, p),
				`translateY(${-LOGO_TRANSLATE_PX * p}px)`
			);
			setOpacityTransform(
				searchBar,
				1 - smoothstep(0.1, 0.7, p),
				`translateY(${-SEARCH_BAR_TRANSLATE_PX * p}px)`
			);
			setOpacityTransform(
				actionBar,
				1 - smoothstep(0, 0.45, p),
				`translateY(${ACTION_BAR_TRANSLATE_PX * p}px)`
			);
			setOpacityTransform(
				landingPanel,
				1 - smoothstep(0.05, 0.6, p),
				`translateY(${PANEL_TRANSLATE_PX * p}px)`
			);
			setOpacityTransform(
				askBar,
				1 - smoothstep(0.15, 0.6, p),
				`translateY(${ASK_BAR_TRANSLATE_PX * p}px)`
			);
			root.style.setProperty('--map-scrub-scale', `scale(${1 + MAP_DOLLY_MAX * p})`);
		};

		// Return the hero to the className/React-owned state (clears our inline overrides).
		const clearInlineStyles = () => {
			for (const el of heroTargets) {
				el.style.removeProperty('opacity');
				el.style.removeProperty('transform');
				el.style.removeProperty('will-change');
			}
			root.style.removeProperty('--map-scrub-scale');
		};

		const armWillChange = () => {
			for (const el of heroTargets) el.style.willChange = 'opacity, transform';
		};

		const snapBack = () => {
			const from = progress;
			if (from <= 0) {
				clearInlineStyles();
				return;
			}
			tween(
				SNAPBACK_MS,
				(e) => {
					progress = from * (1 - e);
					apply(progress);
				},
				() => {
					progress = 0;
					accumPx = 0;
					crossedCommit = false;
					clearInlineStyles();
				}
			);
		};

		const commit = () => {
			cancelTween();
			runCommit();
			// Finish the dissolve + resolve the dolly back to identity while the camera flies
			// in, then hand the hero back to its className-driven opacity-0 (set by isMapView).
			const heroFrom = heroTargets.map((el) => parseFloat(el.style.opacity || '1'));
			const scaleFrom = 1 + MAP_DOLLY_MAX * progress;
			tween(
				COMMIT_FINISH_MS,
				(e) => {
					heroTargets.forEach((el, i) => {
						el.style.opacity = String(lerp(heroFrom[i], 0, e));
					});
					root.style.setProperty(
						'--map-scrub-scale',
						`scale(${lerp(scaleFrom, 1, e)})`
					);
				},
				clearInlineStyles
			);
		};

		const scheduleSettle = () => {
			if (settleTimer) clearTimeout(settleTimer);
			settleTimer = setTimeout(() => {
				if (committedRef.current) return;
				const threshold = crossedCommit ? 0.45 : COMMIT_THRESHOLD;
				if (progress >= threshold) commit();
				else snapBack();
			}, SETTLE_MS);
		};

		// Translate a raw vertical delta (px, positive = scroll down) into the gesture.
		const onDelta = (deltaPx: number) => {
			if (committedRef.current) return;

			if (reduceMotion) {
				// No scrub choreography; a decisive downward push commits instantly.
				accumPx = Math.max(0, accumPx + deltaPx);
				if (accumPx >= REDUCED_MOTION_TRIGGER_PX) commit();
				return;
			}

			// Immediate fling commit on a strong downward sample once underway.
			if (deltaPx > FLING_DELTA_PX && progress >= FLING_MIN_PROGRESS) {
				commit();
				return;
			}

			cancelTween(); // user is driving again; drop any in-flight snapback
			if (progress === 0 && deltaPx > 0) armWillChange();

			accumPx = clamp01((accumPx + deltaPx) / SCRUB_DISTANCE_PX) * SCRUB_DISTANCE_PX;
			progress = accumPx / SCRUB_DISTANCE_PX;
			if (progress >= COMMIT_THRESHOLD) crossedCommit = true;
			apply(progress);
			scheduleSettle();
		};

		const normalizeWheel = (e: WheelEvent) => {
			// deltaMode: 0 = pixels, 1 = lines, 2 = pages.
			if (e.deltaMode === 1) return e.deltaY * 16;
			if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
			return e.deltaY;
		};

		const isTypingTarget = () => {
			const el = document.activeElement as HTMLElement | null;
			return (
				!!el &&
				(el.isContentEditable ||
					['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
			);
		};

		const onWheel = (e: WheelEvent) => {
			if (committedRef.current) return;
			// Don't yank the user to the map while they're typing in the search field.
			if (progress === 0 && isTypingTarget()) return;
			e.preventDefault();
			onDelta(normalizeWheel(e));
		};

		const onTouchStart = (e: TouchEvent) => {
			touchY = e.touches[0]?.clientY ?? null;
		};

		const onTouchMove = (e: TouchEvent) => {
			if (committedRef.current || touchY == null) return;
			const y = e.touches[0]?.clientY ?? touchY;
			const delta = touchY - y; // drag up (finger moves up) = scroll down = positive
			touchY = y;
			if (progress === 0 && isTypingTarget()) return;
			e.preventDefault();
			onDelta(delta);
		};

		const onTouchEnd = () => {
			touchY = null;
			if (!committedRef.current) scheduleSettle();
		};

		// Lenis is inert under the scroll lock, but stop it defensively so it can't also act on
		// these wheel events; restart on teardown.
		try {
			lenis?.stop?.();
		} catch {}

		window.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchmove', onTouchMove, { passive: false });
		window.addEventListener('touchend', onTouchEnd, { passive: true });

		return () => {
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchmove', onTouchMove);
			window.removeEventListener('touchend', onTouchEnd);
			if (settleTimer) clearTimeout(settleTimer);
			try {
				lenis?.start?.();
			} catch {}
			// Committing flips isMapView → enabled=false → this cleanup fires immediately. The
			// finishing tween started in commit() runs on its own rAF (cancelling listeners
			// doesn't stop it) and owns teardown via clearInlineStyles on completion, so leave
			// it alone. Only when we bailed mid-scrub do we cancel + reset the hero here.
			if (!committedRef.current) {
				cancelTween();
				clearInlineStyles();
			}
		};
	}, [enabled, lenis, runCommit]);
}
