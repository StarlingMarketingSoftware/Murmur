'use client';

import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { WebsiteFramableResult } from '@/app/api/website-framable/route';
import type {
	WebsitePreviewAnchorRect,
	WebsitePreviewPlacement,
	WebsitePreviewSize,
} from '@/contexts/WebsitePreviewContext';
import { normalizeWebsiteUrl, websiteHost } from '@/utils/websiteUrl';
import { getMurmurRootScale } from '@/utils/rootScale';

export interface WebsitePreviewOverlayProps {
	/** Normalized http(s) url to embed, or null when the overlay is closed. */
	url: string | null;
	/** Short label for the header (defaults to the url host). */
	label?: string;
	size?: WebsitePreviewSize;
	placement?: WebsitePreviewPlacement;
	/** Research card rect to dock beside; null centers the panel instead. */
	anchorRect?: WebsitePreviewAnchorRect | null;
	onClose: () => void;
}

type PreviewState =
	| { kind: 'checking' }
	| { kind: 'framable'; src: string }
	| { kind: 'screenshot'; src: string }
	| { kind: 'blocked' };

// If a "framable" iframe never fires `load` within this window, fall back. Catches
// sites that pass the header check but blank/JS-frame-bust once loaded.
const IFRAME_LOAD_TIMEOUT_MS = 8000;

// Render the site at a desktop logical width, then CSS-scale the whole iframe down
// to fit the (narrower) panel — so the site shows its desktop layout with no
// horizontal scrollbar, like a website thumbnail.
const PREVIEW_BASE_WIDTH_PX = 1280;

const GAP_PX = 16;
const MARGIN_PX = 16;
const MAX_PANEL_WIDTH_PX = 760;
const MAX_PANEL_HEIGHT_PX = 560;
const MIN_PANEL_WIDTH_PX = 360;
const MIN_PANEL_HEIGHT_PX = 320;
const LARGE_GAP_PX = 10;
const LARGE_MARGIN_PX = 10;
const LARGE_MAX_PANEL_WIDTH_PX = 940;
const LARGE_MAX_PANEL_HEIGHT_PX = 680;
const LARGE_MIN_PANEL_WIDTH_PX = 460;
const LARGE_MIN_PANEL_HEIGHT_PX = 380;
const LARGE_TOP_OFFSET_PX = 96;
const LOADING_PROGRESS_TICK_MS = 120;
const LOADING_PROGRESS_CAP = 0.96;
const LOADING_PROGRESS_EASE = 0.045;

const WebsitePreviewLoadingSurface: FC = () => {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setProgress((prev) =>
				prev >= LOADING_PROGRESS_CAP
					? prev
					: prev + (LOADING_PROGRESS_CAP - prev) * LOADING_PROGRESS_EASE
			);
		}, LOADING_PROGRESS_TICK_MS);
		return () => clearInterval(id);
	}, []);

	const display = Math.round(progress * 100);

	return (
		<div
			className="absolute inset-0 flex items-center justify-center bg-white"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="flex w-[200px] max-w-[60%] flex-col items-center gap-[9px]">
				<div className="h-[3px] w-full overflow-hidden rounded-full bg-black/15">
					<div
						className="h-full rounded-full bg-black transition-[width] duration-200 ease-out"
						style={{ width: `${display}%` }}
					/>
				</div>
				<div className="select-none text-xs tracking-[0.08em] text-black/60 tabular-nums">
					{display}%
				</div>
			</div>
		</div>
	);
};

// Docks the panel just to the side of the research card (over the map), in layout
// px — getBoundingClientRect is visual-space, so divide by the root scale (Chrome
// `zoom` on <html> / Safari transform on <body>) before using as fixed coords, the
// same conversion the campaign rail hover card uses.
const computePanelStyle = (
	anchorRect: WebsitePreviewAnchorRect | null,
	size: WebsitePreviewSize = 'default',
	placement: WebsitePreviewPlacement = 'auto'
): CSSProperties => {
	const isLarge = size === 'large';
	const gap = isLarge ? LARGE_GAP_PX : GAP_PX;
	const margin = isLarge ? LARGE_MARGIN_PX : MARGIN_PX;
	const maxWidth = isLarge ? LARGE_MAX_PANEL_WIDTH_PX : MAX_PANEL_WIDTH_PX;
	const maxHeight = isLarge ? LARGE_MAX_PANEL_HEIGHT_PX : MAX_PANEL_HEIGHT_PX;
	const minWidth = isLarge ? LARGE_MIN_PANEL_WIDTH_PX : MIN_PANEL_WIDTH_PX;
	const minHeight = isLarge ? LARGE_MIN_PANEL_HEIGHT_PX : MIN_PANEL_HEIGHT_PX;
	if (!anchorRect || typeof window === 'undefined') {
		return {
			position: 'fixed',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%, -50%)',
			width: `min(${maxWidth}px, ${isLarge ? '96vw' : '92vw'})`,
			height: `min(${maxHeight}px, ${isLarge ? '88dvh' : '82dvh'})`,
		};
	}

	const rootScale = getMurmurRootScale() || 1;
	const vw = window.innerWidth / rootScale;
	const vh = window.innerHeight / rootScale;
	const aLeft = anchorRect.left / rootScale;
	const aRight = (anchorRect.left + anchorRect.width) / rootScale;
	const aTop = anchorRect.top / rootScale;

	if (placement === 'left-slot') {
		const available = Math.max(1, aRight - margin);
		const width = Math.min(maxWidth, available);
		const height = Math.max(
			minHeight,
			Math.min(maxHeight, vh - 2 * margin)
		);
		let top = isLarge ? aTop - LARGE_TOP_OFFSET_PX : aTop;
		if (top + height > vh - margin) top = vh - margin - height;
		if (top < margin) top = margin;

		return {
			position: 'fixed',
			top: `${top}px`,
			right: `${Math.max(margin, vw - aRight)}px`,
			width: `${width}px`,
			height: `${height}px`,
		};
	}

	const spaceLeft = aLeft - margin;
	const spaceRight = vw - aRight - margin;
	// Prefer the side with more room — the campaign research card sits on the right,
	// so the panel lands over the map to its left.
	const dockLeft = spaceLeft >= spaceRight;
	const available = (dockLeft ? spaceLeft : spaceRight) - gap;

	const width = Math.max(minWidth, Math.min(maxWidth, available));
	const height = Math.max(
		minHeight,
		Math.min(maxHeight, vh - 2 * margin)
	);

	let top = isLarge ? aTop - LARGE_TOP_OFFSET_PX : aTop;
	if (top + height > vh - margin) top = vh - margin - height;
	if (top < margin) top = margin;

	return {
		position: 'fixed',
		top: `${top}px`,
		width: `${width}px`,
		height: `${height}px`,
		...(dockLeft
			? { right: `${vw - aLeft + gap}px` }
			: { left: `${aRight + gap}px` }),
	};
};

/**
 * Whether a campaign row-hover (`left-slot`) preview has room to dock cleanly over
 * the map. The preview sits in the clear strip to the LEFT of the campaign
 * workspace, whose live left edge is published as `--murmur-campaign-map-backdrop-start`
 * (layout px — the same coordinate space computePanelStyle works in, so no rootScale
 * conversion). When the window narrows the workspace marches left (and the strip
 * collapses to 0 in the centered stage), so the strip must stay at least as wide as
 * the panel's minimum width plus margins. Used to gate opening when already too
 * narrow; returns true when the var is absent (i.e. not on the campaign page) so
 * non-campaign callers are never gated.
 */
export const canDockLeftSlotPreview = (
	size: WebsitePreviewSize = 'default'
): boolean => {
	if (typeof window === 'undefined') return true;
	const isLarge = size === 'large';
	const margin = isLarge ? LARGE_MARGIN_PX : MARGIN_PX;
	const minWidth = isLarge ? LARGE_MIN_PANEL_WIDTH_PX : MIN_PANEL_WIDTH_PX;
	const raw = getComputedStyle(document.documentElement).getPropertyValue(
		'--murmur-campaign-map-backdrop-start'
	);
	const backdropStart = parseFloat(raw);
	if (!Number.isFinite(backdropStart)) return true;
	return backdropStart >= minWidth + 2 * margin;
};

/**
 * Shared, body-portaled panel that embeds a contact's website in a live iframe over
 * the map, docked beside the research card, with a graceful "Open in new tab"
 * fallback for sites that refuse framing. Mounted once by WebsitePreviewProvider;
 * opened via useWebsitePreview().
 *
 * Portals to document.body because globals.css `main { isolation: isolate }` traps
 * fixed overlays below the navbar, and the campaign map layer is pointer-events:none
 * with a data-* allowlist — a body portal escapes both. This is fully independent of
 * the billing/checkout UI.
 */
export const WebsitePreviewOverlay: FC<WebsitePreviewOverlayProps> = ({
	url,
	label,
	size = 'default',
	placement = 'auto',
	anchorRect,
	onClose,
}) => {
	const [state, setState] = useState<PreviewState>({ kind: 'checking' });
	const [contentReady, setContentReady] = useState(false);
	const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
	const bodyRef = useRef<HTMLDivElement | null>(null);
	const [bodySize, setBodySize] = useState<{ w: number; h: number } | null>(null);

	// Track the inner viewport size (layout px) so the iframe can be rendered at a
	// fixed desktop width and scaled to fit it.
	useEffect(() => {
		if (!url) return;
		const el = bodyRef.current;
		if (!el) return;
		const measure = () => setBodySize({ w: el.clientWidth, h: el.clientHeight });
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [url]);

	// Esc closes.
	useEffect(() => {
		if (!url) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [url, onClose]);

	// Click-off closes — capture the dismissing press before the map/right rail can
	// react to it. Website triggers are ignored so switching previews stays one-click.
	useEffect(() => {
		if (!url) return;
		const onDocPointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;
			if (panelRef.current?.contains(target)) return;
			if (target.closest('[data-website-preview-trigger]')) return;
			e.preventDefault();
			e.stopPropagation();
			onClose();
		};
		document.addEventListener('pointerdown', onDocPointerDown, true);
		return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
	}, [url, onClose]);

	// Wheel-off closes when the gesture starts on the map behind the floating preview.
	useEffect(() => {
		if (!url) return;
		const onDocWheel = (e: WheelEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;
			if (panelRef.current?.contains(target)) return;
			if (!target.closest('[data-website-preview-scroll-dismiss]')) return;
			e.preventDefault();
			e.stopPropagation();
			onClose();
		};
		document.addEventListener('wheel', onDocWheel, {
			capture: true,
			passive: false,
		});
		return () => document.removeEventListener('wheel', onDocWheel, true);
	}, [url, onClose]);

	// Left-slot previews dock over the campaign map using an anchor rect captured at
	// open that can't be re-derived (the hover card is gone). Rather than let the fixed
	// panel drift and overlap the workspace as the window changes, hide it the moment
	// the viewport resizes. One-shot: the first resize detaches the listener and defers
	// the actual close to the next frame, so it fires exactly once per drag and never
	// runs the close (a context state change) reentrantly inside the resize handler —
	// the same tick the campaign page recomputes its zoom/scroll layout. Scoped to
	// left-slot so auto-placed previews (dashboard / Sent / full panel) are unaffected.
	useEffect(() => {
		if (!url || placement !== 'left-slot') return;
		let rafId = 0;
		const handleResize = () => {
			window.removeEventListener('resize', handleResize);
			rafId = requestAnimationFrame(() => onClose());
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [url, placement, onClose]);

	// Pre-check framability whenever the url changes; abort in-flight on change/close.
	useEffect(() => {
		if (!url) return;
		setState({ kind: 'checking' });
		const controller = new AbortController();
		(async () => {
			try {
				const res = await fetch(
					`/api/website-framable?url=${encodeURIComponent(url)}`,
					{ signal: controller.signal }
				);
				if (!res.ok) {
					setState({ kind: 'blocked' });
					return;
				}
				const data = (await res.json()) as WebsiteFramableResult;
				const src = data.finalUrl || url;
				// Defense-in-depth: never embed our OWN origin in a scripted iframe — a
				// remote site that 30x-redirects to a murmur-origin URL would otherwise turn
				// a third-party preview into a same-origin frame. Also re-assert the
				// http(s)/host/port gate on the post-redirect URL the server chose.
				let safeCrossOrigin = false;
				try {
					safeCrossOrigin =
						!!normalizeWebsiteUrl(src) && new URL(src).host !== window.location.host;
				} catch {
					safeCrossOrigin = false;
				}
				if (data.framable && safeCrossOrigin) {
					setState({ kind: 'framable', src });
					return;
				}
				setState(
					!data.framable && safeCrossOrigin
						? { kind: 'screenshot', src }
						: { kind: 'blocked' }
				);
			} catch {
				if (controller.signal.aborted) return;
				setState({ kind: 'blocked' });
			}
		})();
		return () => controller.abort();
	}, [url]);

	useEffect(() => {
		setContentReady(false);
	}, [url, state.kind]);

	// Load-timeout backstop while showing the iframe.
	useEffect(() => {
		if (state.kind !== 'framable') return;
		loadTimerRef.current = setTimeout(() => {
			setState((current) =>
				current.kind === 'framable' ? { kind: 'screenshot', src: current.src } : current
			);
		}, IFRAME_LOAD_TIMEOUT_MS);
		return () => {
			if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
			loadTimerRef.current = null;
		};
	}, [state.kind, url]);

	if (!url || typeof window === 'undefined') return null;

	const headerLabel = label || websiteHost(url) || url;
	const panelStyle = computePanelStyle(anchorRect ?? null, size, placement);

	// Scale the desktop-width iframe down to the panel's inner width (no horizontal
	// scrollbar). Height is divided back out so the scaled frame fills the panel.
	const previewScale =
		bodySize && bodySize.w > 0 ? bodySize.w / PREVIEW_BASE_WIDTH_PX : 1;
	const iframeStyle: CSSProperties = bodySize
		? {
				width: `${PREVIEW_BASE_WIDTH_PX}px`,
				height: `${bodySize.h / previewScale}px`,
				transform: `scale(${previewScale})`,
				transformOrigin: 'top left',
			}
		: { width: '100%', height: '100%' };

	const onIframeLoad = () => {
		if (loadTimerRef.current) {
			clearTimeout(loadTimerRef.current);
			loadTimerRef.current = null;
		}
		setContentReady(true);
	};
	const showLoadingSurface =
		state.kind === 'checking' ||
		((state.kind === 'framable' || state.kind === 'screenshot') &&
			!contentReady);

	return createPortal(
		// No backdrop / no page dimming — this is a floating panel over the map, not a
		// modal. Close via click-off or Esc.
		<div
			ref={panelRef}
			className="z-[10000] flex flex-col overflow-hidden rounded-[22px] border-[3px] border-black bg-white"
			style={panelStyle}
			role="dialog"
			aria-label={`Website preview: ${headerLabel}`}
		>
			{/* No header chrome — the box is just the site. Close via click-off or Esc. */}
			<div
				ref={bodyRef}
				className="relative min-h-0 w-full flex-1 overflow-hidden bg-[#02040d]"
			>
				{showLoadingSurface && <WebsitePreviewLoadingSurface />}
				{/* Least-privilege sandbox: allow-scripts only — never allow-same-origin (with allow-scripts that would let a same-origin frame script the parent; we also refuse to embed our own origin in the check above), no forms/popups. */}
				{state.kind === 'framable' && (
					<iframe
						key={state.src}
						src={state.src}
						title={`Preview of ${headerLabel}`}
						onLoad={onIframeLoad}
						className={`absolute left-0 top-0 z-10 border-0 bg-white transition-opacity duration-700 ease-out ${
							contentReady ? 'opacity-100' : 'pointer-events-none opacity-0'
						}`}
						style={iframeStyle}
						sandbox="allow-scripts"
						referrerPolicy="no-referrer"
						loading="lazy"
					/>
				)}
				{state.kind === 'screenshot' && (
					<>
						<a
							href={state.src}
							target="_blank"
							rel="noopener noreferrer"
							className={`absolute inset-0 z-10 block transition-opacity duration-700 ease-out ${
								contentReady ? 'opacity-100' : 'pointer-events-none opacity-0'
							}`}
							aria-label={`Open ${headerLabel} in new tab`}
						>
							<Image
								key={state.src}
								src={`/api/website-screenshot?url=${encodeURIComponent(state.src)}`}
								alt={`Preview of ${headerLabel}`}
								onLoad={() => setContentReady(true)}
								onError={() => setState({ kind: 'blocked' })}
								fill
								unoptimized
								sizes="(max-width: 940px) 100vw, 940px"
								className="object-cover"
							/>
							<div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white via-white/90 to-transparent px-4 pb-4 pt-12">
								<span className="rounded-[8px] border-[2px] border-black bg-white px-4 py-2 text-sm font-semibold text-black">
									Open in new tab ↗
								</span>
							</div>
						</a>
					</>
				)}
				{state.kind === 'blocked' && (
					<div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
						<div className="text-sm font-semibold text-black">
							This site can&apos;t be previewed here
						</div>
						<div className="max-w-full truncate text-sm text-gray-600">
							{websiteHost(url) || url}
						</div>
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-[8px] border-[2px] border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
						>
							Open in new tab ↗
						</a>
					</div>
				)}
			</div>
		</div>,
		document.body
	);
};
