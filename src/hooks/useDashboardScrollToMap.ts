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

const SCRUB_DISTANCE_PX = 600; // gesture travel that maps to full progress (lower = less scroll to enter map)
const COMMIT_THRESHOLD = 0.99; // release at/above this progress commits
const FLING_DELTA_PX = 220; // a single wheel sample larger than this is a "fling"
const FLING_MIN_PROGRESS = 0.96; // …but only once the user has completed almost all of the scrub
// No gesture for this long = the user has genuinely stopped (not just a mid-gesture
// hesitation). Trackpad/inertial wheel streams routinely have 100ms+ gaps between
// samples, so this must comfortably exceed a natural pause or every hesitation would
// trigger a reversal. The eased follower (below) keeps that pause a smooth hold.
const SETTLE_MS = 220;
// Exponential-smoothing time constant for the render follower. The displayed progress
// eases toward the input target with alpha = 1 - exp(-dt / tau) each frame, which is
// frame-rate independent and absorbs noisy/bursty wheel deltas so the scrub never
// jitters with the raw input. Smaller = snappier, larger = smoother/laggier.
const FOLLOW_TAU_MS = 70;
const COMMIT_FINISH_MS = 760;
const REDUCED_MOTION_TRIGGER_PX = 220;
// Release-below-threshold snapback. This is a single deterministic, eased tween
// (not the exponential follower) so the page chrome AND the globe camera return
// to the hero in perfect lock-step over a known, slightly slow duration. The
// follower's ~exponential convergence read as the chrome "snapping instantly"
// while the globe lagged; a fixed eased tween makes both move together cleanly.
const SNAPBACK_MS = 700;

// CSS "dolly" overlay scale at full peek. The real Mapbox camera now zooms in
// lock-step with the scrub (4→5), so this compositor scale only needs to add a
// faint extra push — kept small so the commit-time reversal back to 1.0 is
// imperceptible (a larger reversal is what read as "snapping back into place").
const MAP_DOLLY_MAX = 0.012; // map scales up to 1.012x at full peek
const HERO_TRANSLATE_PX = 60;
const HERO_SCALE_DROP = 0.04;
const LOGO_TRANSLATE_PX = 90;
const ACTION_BAR_TRANSLATE_PX = 24;
const SEARCH_BAR_TRANSLATE_PX = 28; // drifts up with the logo
const PANEL_TRANSLATE_PX = 32; // landing panel (Strategy box et al.) sinks down
const ASK_BAR_TRANSLATE_PX = 16; // fixed bottom bar sinks toward the edge
const MAP_CAMERA_SCRUB_EVENT = 'murmur:dashboard-map-camera-scrub';

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
// Gentle (near-zero velocity) start *and* end. The commit dissolve continues
// straight out of the user's scrub — which releases at ~zero velocity — so an
// ease-out curve (max velocity at t=0) would lurch. Easing in from rest keeps
// the dolly/fade resolve continuous with the gesture for a smooth, undetectable
// hand-off into the map.
const easeInOutCubic = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
		// Two-track progress so a mid-gesture hesitation never bounces:
		//  • targetProgress — where the *input* wants to be (driven directly by wheel/touch).
		//  • renderProgress — what is actually *displayed*; eased toward the target every frame
		//    by a single follower rAF. Holding still simply lets render converge on target and
		//    sit there (the loop parks itself), so a pause is a smooth hold, never a reversal.
		let targetProgress = 0;
		let renderProgress = 0;
		let crossedCommit = false; // hysteresis: snapback threshold relaxes after crossing
		let settleTimer: ReturnType<typeof setTimeout> | null = null;
		let rafId: number | null = null; // commit dissolve tween
		let followId: number | null = null; // render follower loop
		let lastFollowFrame = 0;
		let touchY: number | null = null;

		const cancelTween = () => {
			if (rafId != null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};

		const cancelFollower = () => {
			if (followId != null) {
				cancelAnimationFrame(followId);
				followId = null;
			}
		};

		const tween = (
			durationMs: number,
			onUpdate: (e: number) => void,
			onDone?: () => void,
			easing: (t: number) => number = easeOutCubic
		) => {
			cancelTween();
			const start = performance.now();
			const step = (now: number) => {
				const t = clamp01((now - start) / durationMs);
				onUpdate(easing(t));
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

		const dispatchMapCameraScrub = (
			progress: number,
			phase: 'scrub' | 'commit' = 'scrub'
		) => {
			window.dispatchEvent(
				new CustomEvent(MAP_CAMERA_SCRUB_EVENT, {
					detail: {
						progress: clamp01(progress),
						phase,
					},
				})
			);
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
			// Keep the real Mapbox camera in lock-step with the visual scrub (pitch,
			// zoom, offset, and center). Without this, the UI arrives in map mode first
			// and the camera then "fixes itself" afterward, which reads as a jarring
			// secondary shift.
			dispatchMapCameraScrub(p);
		};

		// Return the hero to the className/React-owned state (clears our inline overrides).
		const clearInlineStyles = () => {
			for (const el of heroTargets) {
				el.style.removeProperty('opacity');
				el.style.removeProperty('transform');
				el.style.removeProperty('transition');
				el.style.removeProperty('will-change');
			}
			root.style.removeProperty('--map-scrub-scale');
		};

		const armWillChange = () => {
			for (const el of heroTargets) {
				// The landing hero/search chrome has long CSS transitions for normal
				// search-state changes. During scroll scrubbing we own opacity/transform
				// every rAF; leaving those transitions enabled makes the browser restart a
				// transition on each frame, which reads as lag/flicker when the user pauses.
				// Disable transitions only for the scrub, then remove the inline override in
				// clearInlineStyles so React/CSS regain control afterward.
				el.style.transition = 'none';
				el.style.willChange = 'opacity, transform';
			}
		};

		// Single render follower: eases renderProgress toward targetProgress every frame using
		// frame-rate-independent exponential smoothing. This is the *only* thing that calls
		// apply() during the live gesture, so the visuals are always a smooth function of a
		// continuous value — a stuttery/bursty input stream (or a brief hesitation, which simply
		// holds the target constant) can never make the scrub jump or reverse. The loop parks
		// itself once render has converged on target, and on a convergence-to-zero it performs
		// the snapback cleanup. It never fights `apply` from the wheel handler because the wheel
		// handler no longer paints — it only moves the target.
		const startFollower = () => {
			if (followId != null) return;
			lastFollowFrame = performance.now();
			const step = (now: number) => {
				const dt = Math.max(0, now - lastFollowFrame);
				lastFollowFrame = now;
				const alpha = 1 - Math.exp(-dt / FOLLOW_TAU_MS);
				renderProgress += (targetProgress - renderProgress) * alpha;
				if (Math.abs(targetProgress - renderProgress) < 0.0005) {
					renderProgress = targetProgress;
					apply(renderProgress);
					followId = null;
					if (targetProgress <= 0) {
						// Fully snapped back to the hero — release everything to the CSS layer.
						accumPx = 0;
						crossedCommit = false;
						clearInlineStyles();
					}
					return;
				}
				apply(renderProgress);
				followId = requestAnimationFrame(step);
			};
			followId = requestAnimationFrame(step);
		};

		// Reverse the scrub on release-below-threshold. Unlike the live follower (which
		// converges exponentially and reads as an instant "snap"), this is a single
		// deterministic eased tween over SNAPBACK_MS. Because every frame calls the same
		// apply() — which moves the page chrome AND dispatches the camera-scrub progress —
		// the hero elements and the globe camera glide home together, in lock-step, at the
		// same eased rate. That synchronization + the slightly slower duration is exactly
		// the "clean, together" snap-back the user asked for.
		const snapBack = () => {
			// Stop the live follower so it can't also paint and fight the tween.
			cancelFollower();
			const from = renderProgress;
			if (from <= 0) {
				targetProgress = 0;
				renderProgress = 0;
				accumPx = 0;
				crossedCommit = false;
				cancelTween();
				clearInlineStyles();
				return;
			}
			// Intent is home; the tween supplies the displayed value en route.
			targetProgress = 0;
			tween(
				SNAPBACK_MS,
				(e) => {
					renderProgress = from * (1 - e);
					apply(renderProgress);
				},
				() => {
					renderProgress = 0;
					accumPx = 0;
					crossedCommit = false;
					clearInlineStyles();
				},
				easeInOutCubic
			);
		};

		const commit = () => {
			cancelTween();
			cancelFollower();
			// Commit at the same final camera state the scroll has been approaching, so
			// the presentation flip does not need a separate visible camera correction.
			dispatchMapCameraScrub(1, 'commit');
			runCommit();
			// Finish the dissolve + resolve the dolly back to identity while the camera flies
			// in, then hand the hero back to its className-driven opacity-0 (set by isMapView).
			const heroFrom = heroTargets.map((el) => parseFloat(el.style.opacity || '1'));
			const scaleFrom = 1 + MAP_DOLLY_MAX * renderProgress;
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
				clearInlineStyles,
				// Continue the dolly/fade gently out of the scrub's near-zero release
				// velocity instead of snapping to full speed (ease-out) — this is the
				// hand-off the user described as a "jarring shift".
				easeInOutCubic
			);
		};

		const scheduleSettle = () => {
			if (settleTimer) clearTimeout(settleTimer);
			settleTimer = setTimeout(() => {
				if (committedRef.current) return;
				// Decide on the user's *intended* position (the target), not the still-easing
				// render value, so the verdict matches where they actually scrolled to.
				const threshold = crossedCommit ? 0.9 : COMMIT_THRESHOLD;
				if (targetProgress >= threshold) commit();
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
			if (deltaPx > FLING_DELTA_PX && targetProgress >= FLING_MIN_PROGRESS) {
				commit();
				return;
			}

			// User is driving again: arm the compositor layers once (and keep them armed for
			// the whole gesture — re-arming every sample is what caused the layer thrash flicker)
			// and aim the target. The follower paints; we never call apply() synchronously here,
			// so noisy per-sample deltas can't translate into visible stutter.
			if (accumPx === 0 && renderProgress === 0 && deltaPx > 0) armWillChange();

			// If a release-snapback tween is mid-glide and the user scrubs again in either
			// direction, hand control back to the live follower from the *displayed* position.
			// Cancelling the tween here (it owns rafId) prevents the two loops from both
			// painting and fighting — the gesture then continues as one motion from wherever
			// the globe/chrome currently are.
			if (rafId != null && deltaPx !== 0) {
				cancelTween();
				accumPx = renderProgress * SCRUB_DISTANCE_PX;
			}

			// If a snapback is mid-glide (the target was pulled below what's on screen) and the
			// user starts scrubbing again, resume from the *displayed* position instead of from
			// the snapback's lowered target. Re-seating the accumulator on the live render value
			// makes a hesitate-then-continue feel like one continuous motion — no reset, no jump.
			if (deltaPx > 0 && targetProgress < renderProgress) {
				accumPx = renderProgress * SCRUB_DISTANCE_PX;
			}

			accumPx = clamp01((accumPx + deltaPx) / SCRUB_DISTANCE_PX) * SCRUB_DISTANCE_PX;
			targetProgress = accumPx / SCRUB_DISTANCE_PX;
			if (targetProgress >= COMMIT_THRESHOLD) crossedCommit = true;
			startFollower();
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
			if (targetProgress === 0 && isTypingTarget()) return;
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
			if (targetProgress === 0 && isTypingTarget()) return;
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
				cancelFollower();
				clearInlineStyles();
			}
		};
	}, [enabled, lenis, runCommit]);
}
