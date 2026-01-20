'use client';

import { FC, useCallback, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import ContactsPanel from '@/components/atoms/_svg/ContactsPanel';
import WritingPanel from '@/components/atoms/_svg/WritingPanel';
import DraftsPanel from '@/components/atoms/_svg/DraftsPanel';
import SentPanel from '@/components/atoms/_svg/SentPanel';
import InboxPanel from '@/components/atoms/_svg/InboxPanel';
import { cn } from '@/utils';

type CampaignRightPanelTab = 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox';

interface CampaignRightPanelProps {
	className?: string;
	view?: 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all';
	onTabChange?: (tab: CampaignRightPanelTab) => void;
	/**
	 * Duration (ms) used to animate the active highlight between tabs.
	 * Pass the same duration as the main view transition so they stay in sync.
	 */
	transitionDurationMs?: number;
	/**
	 * When true, indicates the main campaign view transition has begun fading out the previous view.
	 * Used to sync the All-tab teleport fade with the page crossfade timing.
	 */
	isViewTransitionFading?: boolean;
}

const ACTIVE_HIGHLIGHT_WIDTH_PX = 99;
const ACTIVE_HIGHLIGHT_HEIGHT_PX = 72;

export const CampaignRightPanel: FC<CampaignRightPanelProps> = ({
	className,
	view,
	onTabChange,
	transitionDurationMs = 180,
	isViewTransitionFading,
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const prevRectRef = useRef<DOMRect | null>(null);
	const prevViewRef = useRef<CampaignRightPanelProps['view']>(view);
	const prevLeftPositionRef = useRef<string | null>(null);
	const pendingAllDxRef = useRef<number | null>(null);

	const listRef = useRef<HTMLDivElement | null>(null);
	const highlightRef = useRef<HTMLDivElement | null>(null);
	const hasPositionedHighlightOnceRef = useRef(false);
	// Track the last computed target Y so we can reliably animate *from* the prior tab position.
	// This prevents "teleport" cases where some layout event snaps the highlight before the tween starts.
	const lastHighlightYRef = useRef<number | null>(null);

	const contactsRef = useRef<HTMLDivElement | null>(null);
	const testingRef = useRef<HTMLDivElement | null>(null);
	const draftingRef = useRef<HTMLDivElement | null>(null);
	const sentRef = useRef<HTMLDivElement | null>(null);
	const inboxRef = useRef<HTMLDivElement | null>(null);

	// Position to the right of the rightmost panel based on view
	const getLeftPosition = () => {
		if (view === 'all') {
			// All view: 4 columns (330px each) + 3 gaps (30px) = 1410px total, centered
			// Right edge at 50% + 705px, so position at 50% + 705px + 39px
			return 'calc(50% + 744px)';
		}
		if (view === 'inbox') {
			// Inbox view: research panel (259px) at offset 453.5px + 32px
			return 'calc(50% + 453.5px + 32px + 259px + 20px)';
		}
		// Other views: standard research panel (375px) at offset 250px + 32px
		return 'calc(50% + 250px + 32px + 375px + 20px)';
	};
	
	const leftPosition = getLeftPosition();

	// Animate position changes with the same timing/ease as the Inbox morphs (GSAP `power2.inOut`).
	// We update `left` immediately, then use a FLIP-style `x` transform so motion stays crisp and
	// perfectly in sync with the research/main box ghosts (which are transform-based).
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		// Important: `isViewTransitionFading` toggles after the new view paints (to begin the crossfade).
		// We *don't* want that signal to interrupt an in-flight horizontal slide, so only run the FLIP
		// positioning logic when the computed `left` position actually changes.
		const prevLeftPosition = prevLeftPositionRef.current;
		prevLeftPositionRef.current = leftPosition;
		if (prevLeftPosition === leftPosition) return;

		const prevView = prevViewRef.current;
		prevViewRef.current = view;

		const isAllTransition = Boolean(
			view &&
				prevView &&
				view !== prevView &&
				(view === 'all' || prevView === 'all')
		);

		// Ensure measurements are taken in the "final layout" state.
		gsap.killTweensOf(el);
		gsap.set(el, { x: 0, autoAlpha: 1 });

		const nextRect = el.getBoundingClientRect();
		const prevRect = prevRectRef.current;
		prevRectRef.current = nextRect;

		if (!prevRect) return;
		const dx = prevRect.left - nextRect.left;

		// Only for the All tab: replace the horizontal slide with a fade-out -> teleport -> fade-in.
		// This keeps the panel feeling stable when All's layout shifts the panel much farther right.
		if (isAllTransition) {
			// Hold the panel visually at the previous position (FLIP), but don't animate the motion.
			gsap.set(el, { x: dx, autoAlpha: 1 });

			// If the page transition isn't exposing the new view yet, keep the panel "parked"
			// at its old position. We'll fade/teleport when the main crossfade starts.
			pendingAllDxRef.current = dx;

			// Back-compat: if no crossfade signal is provided, run the fade immediately.
			if (typeof isViewTransitionFading === 'undefined') {
				const reducedMotion =
					typeof window !== 'undefined' &&
					window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
				if (reducedMotion) {
					gsap.set(el, { x: 0, autoAlpha: 1 });
					pendingAllDxRef.current = null;
					return;
				}

				const totalSeconds = Math.max(0, transitionDurationMs) / 1000;
				const halfSeconds = totalSeconds / 2;
				gsap.timeline({ defaults: { overwrite: 'auto' } })
					.to(el, { autoAlpha: 0, duration: halfSeconds, ease: 'power1.out' })
					.set(el, { x: 0 })
					.to(el, { autoAlpha: 1, duration: halfSeconds, ease: 'power1.in' });
				pendingAllDxRef.current = null;
			}
			return;
		}

		// Clear any pending All-tab fade once we're on a normal transition path.
		pendingAllDxRef.current = null;

		if (Math.abs(dx) < 0.5) return;

		// Default: slide between positions.
		gsap.set(el, { x: dx, autoAlpha: 1 });
		gsap.to(el, {
			x: 0,
			duration: 0.35,
			ease: 'power2.inOut',
			overwrite: 'auto',
		});
	}, [leftPosition, isViewTransitionFading, transitionDurationMs]);

	// When the main view crossfade begins, run the queued All-tab fade so it stays in sync.
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		if (!isViewTransitionFading) return;

		const dx = pendingAllDxRef.current;
		if (dx == null) return;
		pendingAllDxRef.current = null;

		// Hold at old position, then fade/teleport/fade in.
		gsap.killTweensOf(el);
		gsap.set(el, { x: dx, autoAlpha: 1 });

		const reducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
		if (reducedMotion) {
			gsap.set(el, { x: 0, autoAlpha: 1 });
			return;
		}

		const totalSeconds = Math.max(0, transitionDurationMs) / 1000;
		const halfSeconds = totalSeconds / 2;
		gsap.timeline({ defaults: { overwrite: 'auto' } })
			.to(el, { autoAlpha: 0, duration: halfSeconds, ease: 'power1.out' })
			.set(el, { x: 0 })
			.to(el, { autoAlpha: 1, duration: halfSeconds, ease: 'power1.in' });
	}, [isViewTransitionFading, transitionDurationMs]);

	const getActiveTabEl = useCallback((): HTMLDivElement | null => {
		switch (view) {
			case 'contacts':
				return contactsRef.current;
			case 'testing':
				return testingRef.current;
			case 'drafting':
				return draftingRef.current;
			case 'sent':
				return sentRef.current;
			case 'inbox':
				return inboxRef.current;
			default:
				return null;
		}
	}, [view]);

	const positionActiveHighlight = useCallback(
		(shouldAnimate: boolean) => {
			const listEl = listRef.current;
			const highlightEl = highlightRef.current;
			if (!listEl || !highlightEl) return;

			const activeTabEl = getActiveTabEl();
			if (!activeTabEl) {
				gsap.killTweensOf(highlightEl);
				gsap.set(highlightEl, { opacity: 0 });
				return;
			}

			const reducedMotion =
				typeof window !== 'undefined' &&
				window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

			// Use layout metrics (offsetTop/offsetHeight) instead of getBoundingClientRect().
			// This keeps positioning correct under `html { zoom: ... }` and fallback `body { transform: scale(...) }`.
			const getOffsetTopWithin = (el: HTMLElement, ancestor: HTMLElement): number => {
				let top = 0;
				let node: HTMLElement | null = el;
				// Walk up offsetParents until we reach the intended ancestor.
				while (node && node !== ancestor) {
					top += node.offsetTop;
					node = node.offsetParent as HTMLElement | null;
				}
				return top;
			};

			const activeTop = getOffsetTopWithin(activeTabEl, listEl);
			const targetY =
				activeTop + activeTabEl.offsetHeight / 2 - ACTIVE_HIGHLIGHT_HEIGHT_PX / 2;

			gsap.killTweensOf(highlightEl);
			// Capture the current Y *after* killing tweens so we can smoothly retarget mid-flight.
			// (If some external layout event snapped the highlight to the target, we can still force
			// the animation to start from the previous targetY so the slide is always visible.)
			const currentYRaw = gsap.getProperty(highlightEl, 'y');
			const currentY =
				typeof currentYRaw === 'number' ? currentYRaw : parseFloat(String(currentYRaw)) || 0;

			// Pin the start position explicitly so setting xPercent can't inadvertently reset Y
			// (which can make rapid tab flips look like a teleport, especially when targeting the top tab).
			gsap.set(highlightEl, { opacity: 1, xPercent: -50, y: currentY });

			if (!shouldAnimate || reducedMotion) {
				gsap.set(highlightEl, { y: targetY });
				lastHighlightYRef.current = targetY;
				return;
			}

			const prevTargetY = lastHighlightYRef.current;
			const shouldForceFromPrev =
				prevTargetY != null &&
				Math.abs(currentY - targetY) < 0.5 &&
				Math.abs(prevTargetY - targetY) > 0.5;
			if (shouldForceFromPrev) {
				gsap.set(highlightEl, { y: prevTargetY });
			}

			gsap.to(highlightEl, {
				y: targetY,
				duration: Math.max(0, transitionDurationMs) / 1000,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			lastHighlightYRef.current = targetY;
		},
		[getActiveTabEl, transitionDurationMs]
	);

	useLayoutEffect(() => {
		const shouldAnimate = hasPositionedHighlightOnceRef.current;
		positionActiveHighlight(shouldAnimate);
		hasPositionedHighlightOnceRef.current = true;
	}, [positionActiveHighlight, view]);

	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		// If a layout/viewport adjustment fires during a tab switch, we still want to *animate* the
		// highlight rather than snapping it (snapping can cancel the slide and looks "random").
		const onResize = () => positionActiveHighlight(hasPositionedHighlightOnceRef.current);
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [positionActiveHighlight]);
	
	// Keep highlight aligned when campaign zoom changes (this doesn't always trigger a window resize).
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		const onZoomChanged = () => positionActiveHighlight(hasPositionedHighlightOnceRef.current);
		window.addEventListener('murmur:campaign-zoom-changed', onZoomChanged as EventListener);
		return () =>
			window.removeEventListener('murmur:campaign-zoom-changed', onZoomChanged as EventListener);
	}, [positionActiveHighlight]);
	
	return (
		<div
			ref={containerRef}
			data-slot="campaign-right-panel"
			className={cn(
				'absolute top-[50px]',
				'pointer-events-none',
				'z-0',
				'overflow-visible',
				className
			)}
			style={{
				left: leftPosition,
				willChange: 'transform',
			}}
		>
			<div
				ref={listRef}
				className="relative flex flex-col items-center overflow-visible pt-[140px]"
				data-hover-description="Side panel navigation; get to other tabs with this"
			>
				{/* Single active highlight that slides between tabs (instead of teleporting) */}
				<div
					ref={highlightRef}
					aria-hidden="true"
					style={{
						position: 'absolute',
						top: 0,
						left: '50%',
						width: `${ACTIVE_HIGHLIGHT_WIDTH_PX}px`,
						height: `${ACTIVE_HIGHLIGHT_HEIGHT_PX}px`,
						backgroundColor: '#A6E2A8',
						borderRadius: '4px',
						border: '1px solid #000000',
						zIndex: 0,
						pointerEvents: 'none',
						willChange: 'transform',
						opacity: 0,
					}}
				/>
				{/* Border box for All tab - centered around the 6 SVG icons */}
				{view === 'all' && (
					<div
						style={{
							position: 'absolute',
							top: '122px',
							left: '50%',
							transform: 'translateX(-50%)',
							width: '112px',
							height: '450px',
							backgroundColor: 'transparent',
							borderRadius: '8px',
							border: '2px solid #D0D0D0',
							zIndex: -1,
						}}
					/>
				)}
				<div 
					ref={contactsRef}
					className="relative z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
					onClick={() => onTabChange?.('contacts')}
				>
					<ContactsPanel style={{ display: 'block', position: 'relative', opacity: view === 'testing' || view === 'drafting' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					ref={testingRef}
					className="relative z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('testing')}
				>
					<WritingPanel style={{ display: 'block', position: 'relative', opacity: view === 'contacts' || view === 'drafting' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					ref={draftingRef}
					className="relative z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('drafting')}
				>
					<DraftsPanel style={{ display: 'block', position: 'relative', opacity: view === 'contacts' || view === 'testing' || view === 'sent' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					ref={sentRef}
					className="relative z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('sent')}
				>
					<SentPanel style={{ display: 'block', position: 'relative', opacity: view === 'contacts' || view === 'testing' || view === 'drafting' || view === 'inbox' ? 0.3 : 1 }} />
				</div>
				<div 
					ref={inboxRef}
					className="relative z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
					style={{ marginTop: '25px' }}
					onClick={() => onTabChange?.('inbox')}
				>
					<InboxPanel style={{ display: 'block', position: 'relative', opacity: view === 'contacts' || view === 'testing' || view === 'drafting' || view === 'sent' ? 0.3 : 1 }} />
				</div>
			</div>
		</div>
	);
};

