'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Loading-progress percentage shown over the cold-loading dashboard map. The real
// load is network-bound and exposes only one observable signal in the splash window
// (land-ready, passed in as `done`), so the in-between progress is simulated: it
// creeps asymptotically toward a sub-100 cap, so it naturally decelerates and parks
// in the mid/high-90s — the familiar "stuck at 97%" feel — then snaps to 100% and
// fades the instant the map actually paints (or the safety cap fires).
//
// Self-contained and portaled to <body>: its per-tick state lives here (never
// re-rendering the giant DashboardPageClient), and the portal dodges both the
// `main { isolation: isolate }` overlay cap and the mobile fixed-overlay z-index
// traps. Desktop and mobile differ only in placement (`isMobile`).

const REVEAL_DELAY_MS = 450; // don't flash the bar on fast/warm loads
const TICK_MS = 120;
const PROGRESS_CAP = 0.96; // never reach 100% on the simulated creep alone
const PROGRESS_EASE = 0.045; // approach factor per tick → decelerating curve

type BootProgressPhase = 'pending' | 'visible' | 'fading' | 'gone';

interface DashboardBootProgressProps {
	/** Route/landing gate — false renders nothing. Read once, on mount. */
	enabled: boolean;
	/** Real completion signal (land-ready / splash fade). Snaps the bar to 100%. */
	done: boolean;
	/** Centers over the dark map on mobile; sits below the hero logo on desktop. */
	isMobile: boolean;
	/** Fade-out duration; kept in lockstep with the splash's DASHBOARD_BOOT_FADE_MS. */
	fadeMs: number;
	/** Dismiss even if the map never paints (blocked tiles / error). */
	maxWaitMs: number;
}

export function DashboardBootProgress({
	enabled,
	done,
	isMobile,
	fadeMs,
	maxWaitMs,
}: DashboardBootProgressProps) {
	// Decide once, on mount, whether this instance may ever show: warm client-side
	// returns (map already painted → done) and off-landing routes get nothing, and
	// can't flip on later — so the bar never appears mid-session.
	const activeRef = useRef(enabled && !done);
	const startRef = useRef(Date.now());
	const [mounted, setMounted] = useState(false);
	const [phase, setPhase] = useState<BootProgressPhase>('pending');
	const [pct, setPct] = useState(0);

	// Client-only: createPortal needs a document.body to target.
	useEffect(() => {
		setMounted(true);
	}, []);

	// Reveal delay: stay invisible until loading has actually been slow, so a
	// fast/good-connection load (revealed almost immediately) never flashes a bar.
	useEffect(() => {
		if (!activeRef.current) return;
		const timer = setTimeout(() => {
			setPhase((p) => (p === 'pending' ? 'visible' : p));
		}, REVEAL_DELAY_MS);
		return () => clearTimeout(timer);
	}, []);

	// Simulated creep toward the cap; decelerates and parks in the mid-90s.
	useEffect(() => {
		if (!activeRef.current || (phase !== 'pending' && phase !== 'visible')) return;
		const id = setInterval(() => {
			setPct((prev) =>
				prev >= PROGRESS_CAP ? prev : prev + (PROGRESS_CAP - prev) * PROGRESS_EASE
			);
		}, TICK_MS);
		return () => clearInterval(id);
	}, [phase]);

	// Completion: the real `done` signal, or the safety cap. If the bar was never
	// revealed (still pending — a fast load) vanish silently; otherwise snap to 100%
	// and fade.
	useEffect(() => {
		if (!activeRef.current || (phase !== 'pending' && phase !== 'visible')) return;
		const finish = () => setPhase((p) => (p === 'visible' ? 'fading' : 'gone'));
		if (done) {
			finish();
			return;
		}
		const elapsed = Date.now() - startRef.current;
		const timer = setTimeout(finish, Math.max(0, maxWaitMs - elapsed));
		return () => clearTimeout(timer);
	}, [done, phase, maxWaitMs]);

	// Snap the fill to 100% as the fade begins.
	useEffect(() => {
		if (phase === 'fading') setPct(1);
	}, [phase]);

	// Drop from the DOM after the fade completes.
	useEffect(() => {
		if (phase !== 'fading') return;
		const timer = setTimeout(() => setPhase('gone'), fadeMs);
		return () => clearTimeout(timer);
	}, [phase, fadeMs]);

	if (!activeRef.current || !mounted) return null;
	if (phase === 'pending' || phase === 'gone') return null;

	const display = Math.round(pct * 100);

	return createPortal(
		<div
			aria-hidden="true"
			className={`dashboard-boot-progress${
				isMobile ? ' dashboard-boot-progress--mobile' : ''
			}${phase === 'fading' ? ' dashboard-boot-progress--fading' : ''}`}
		>
			<div className="dashboard-boot-progress-track">
				<div
					className="dashboard-boot-progress-fill"
					style={{ width: `${display}%` }}
				/>
			</div>
			<div className="dashboard-boot-progress-label">{display}%</div>
		</div>,
		document.body
	);
}
