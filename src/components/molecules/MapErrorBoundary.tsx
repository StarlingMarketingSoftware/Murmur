'use client';

import { Component, Fragment, type ReactNode } from 'react';

const MAX_AUTO_REMOUNTS = 3;
const REMOUNT_DELAY_MS = 400;

interface MapErrorBoundaryProps {
	children: ReactNode;
}

interface MapErrorBoundaryState {
	hasError: boolean;
	retryCount: number;
	resetKey: number;
}

/**
 * Guards the persistent (layout-level) Mapbox instance. The map is mounted ABOVE
 * the dashboard route segment, so a render throw inside it escapes
 * `dashboard/error.tsx` and would otherwise white-screen the whole app with Next's
 * generic crash page.
 *
 * On error we log, then auto-remount the map a few times by bumping `resetKey` — a
 * throw is usually a transient Mapbox state hiccup that clears on a fresh instance.
 * If it keeps failing we show a minimal, dismissible fallback instead of taking the
 * whole app down. `global-error.tsx` is the last-resort backstop beyond this.
 */
export class MapErrorBoundary extends Component<
	MapErrorBoundaryProps,
	MapErrorBoundaryState
> {
	private remountTimer: ReturnType<typeof setTimeout> | null = null;

	state: MapErrorBoundaryState = {
		hasError: false,
		retryCount: 0,
		resetKey: 0,
	};

	static getDerivedStateFromError(): Partial<MapErrorBoundaryState> {
		return { hasError: true };
	}

	componentDidCatch(error: unknown) {
		console.error('[persistent-map] render error', error);
		if (this.state.retryCount < MAX_AUTO_REMOUNTS) {
			this.remountTimer = setTimeout(() => {
				this.setState((prev) => ({
					hasError: false,
					retryCount: prev.retryCount + 1,
					resetKey: prev.resetKey + 1,
				}));
			}, REMOUNT_DELAY_MS);
		}
	}

	componentWillUnmount() {
		if (this.remountTimer != null) clearTimeout(this.remountTimer);
	}

	private handleManualReload = () => {
		if (typeof window !== 'undefined') window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			// Mid auto-remount: render nothing so the map slot stays empty until the
			// scheduled reset swaps a fresh instance back in.
			if (this.state.retryCount < MAX_AUTO_REMOUNTS) return null;
			// Auto-remounts exhausted: minimal fallback that keeps the rest of the app
			// usable. Container ignores pointer events; only the button is clickable.
			return (
				<div
					style={{
						position: 'fixed',
						left: 0,
						right: 0,
						bottom: 24,
						zIndex: 40,
						display: 'flex',
						justifyContent: 'center',
						pointerEvents: 'none',
					}}
				>
					<button
						type="button"
						onClick={this.handleManualReload}
						style={{ pointerEvents: 'auto' }}
						className="rounded-full border border-stone-300 bg-stone-50/95 px-4 py-2 text-sm font-medium text-stone-700 shadow backdrop-blur"
					>
						Map failed to load — tap to reload
					</button>
				</div>
			);
		}

		// Changing the key on the Fragment remounts the children (a fresh map) after
		// an auto-remount, without adding a DOM node around the fixed map layers.
		return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
	}
}
