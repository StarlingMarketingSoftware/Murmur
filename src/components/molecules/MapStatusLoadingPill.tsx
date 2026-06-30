'use client';

import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	type MutableRefObject,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { DotLoader } from '@/components/atoms/DotLoader/DotLoader';

const DEFAULT_LOADING_WIDTH_PX = 84;
// Show dots the instant anything is loading. Pan/zoom overlay fetches are often
// short (a few hundred ms after the viewport-settle debounce), so any non-trivial
// show-delay here would swallow them entirely and the pill would only ever react to
// the long "from scratch" search loads. A zero delay makes it trigger readily for
// incremental pan-in loads, which is the desired behavior.
const DEFAULT_SHOW_DELAY_MS = 0;
// Once the dots appear, hold them briefly so a quick fetch still reads as an
// intentional pulse (and fades out) instead of a one-frame flicker.
const DEFAULT_MIN_VISIBLE_MS = 420;
const WIDTH_TRANSITION = 'width 220ms cubic-bezier(0.22, 1, 0.36, 1)';
const CONTENT_TRANSITION =
	'opacity 170ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

export interface MapStatusLoadingPillProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
	children: ReactNode;
	/** Raw loading signal. The component smooths brief spikes before showing dots. */
	isBusy?: boolean;
	/** Total pill width while the dots are shown, before any parent transform scale. */
	loadingWidthPx?: number;
	/** Delay before showing dots, preventing flicker on tiny background refetches. */
	showDelayMs?: number;
	/** Once dots appear, keep them visible briefly so the animation reads intentionally. */
	minVisibleMs?: number;
	/** Gap between the two normal-state content chunks. */
	contentGapPx?: number;
}

const clearTimer = (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
	if (timerRef.current) {
		clearTimeout(timerRef.current);
		timerRef.current = null;
	}
};

const useSmoothedBusy = (
	isBusy: boolean,
	showDelayMs: number,
	minVisibleMs: number
): boolean => {
	const [isVisible, setIsVisible] = useState(false);
	const visibleSinceRef = useRef<number | null>(null);
	const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		clearTimer(showTimerRef);
		clearTimer(hideTimerRef);

		if (isBusy) {
			if (isVisible) return;
			showTimerRef.current = setTimeout(() => {
				visibleSinceRef.current = Date.now();
				setIsVisible(true);
			}, showDelayMs);
			return () => clearTimer(showTimerRef);
		}

		if (!isVisible) return;

		const elapsedMs =
			visibleSinceRef.current == null ? minVisibleMs : Date.now() - visibleSinceRef.current;
		const remainingMs = Math.max(0, minVisibleMs - elapsedMs);
		hideTimerRef.current = setTimeout(() => {
			visibleSinceRef.current = null;
			setIsVisible(false);
		}, remainingMs);

		return () => clearTimer(hideTimerRef);
	}, [isBusy, isVisible, minVisibleMs, showDelayMs]);

	useEffect(() => {
		return () => {
			clearTimer(showTimerRef);
			clearTimer(hideTimerRef);
		};
	}, []);

	return isVisible;
};

const usePrefersReducedMotion = (): boolean => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return;
		}

		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
		updatePreference();

		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', updatePreference);
			return () => mediaQuery.removeEventListener('change', updatePreference);
		}

		mediaQuery.addListener(updatePreference);
		return () => mediaQuery.removeListener(updatePreference);
	}, []);

	return prefersReducedMotion;
};

export const MapStatusLoadingPill = ({
	children,
	isBusy = false,
	loadingWidthPx = DEFAULT_LOADING_WIDTH_PX,
	showDelayMs = DEFAULT_SHOW_DELAY_MS,
	minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
	contentGapPx = 8,
	style,
	...buttonProps
}: MapStatusLoadingPillProps) => {
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const contentRef = useRef<HTMLSpanElement | null>(null);
	const [normalWidthPx, setNormalWidthPx] = useState<number | null>(null);
	const prefersReducedMotion = usePrefersReducedMotion();
	const showLoadingDots = useSmoothedBusy(
		Boolean(isBusy),
		prefersReducedMotion ? 0 : showDelayMs,
		prefersReducedMotion ? 0 : minVisibleMs
	);

	useLayoutEffect(() => {
		const button = buttonRef.current;
		const content = contentRef.current;
		if (!button || !content || typeof window === 'undefined') return;

		const measure = () => {
			const computedStyle = window.getComputedStyle(button);
			const paddingLeft = Number.parseFloat(computedStyle.paddingLeft || '0') || 0;
			const paddingRight = Number.parseFloat(computedStyle.paddingRight || '0') || 0;
			setNormalWidthPx(Math.ceil(content.offsetWidth + paddingLeft + paddingRight));
		};

		measure();

		if (typeof ResizeObserver === 'undefined') return;
		const resizeObserver = new ResizeObserver(measure);
		resizeObserver.observe(content);
		return () => resizeObserver.disconnect();
	}, []);

	const requestedTransition =
		typeof style?.transition === 'string' && style.transition.length > 0
			? style.transition
			: undefined;
	const transition = prefersReducedMotion
		? requestedTransition
		: [requestedTransition, WIDTH_TRANSITION].filter(Boolean).join(', ');

	const buttonStyle: CSSProperties = {
		...style,
		position: 'relative',
		overflow: 'hidden',
		boxSizing: 'border-box',
		width: showLoadingDots
			? `${loadingWidthPx}px`
			: normalWidthPx != null
				? `${normalWidthPx}px`
				: style?.width,
		minWidth: showLoadingDots
			? `${loadingWidthPx}px`
			: normalWidthPx != null
				? `${normalWidthPx}px`
				: style?.minWidth,
		justifyContent: 'center',
		gap: 0,
		transition,
	};

	const contentTransition = prefersReducedMotion ? 'none' : CONTENT_TRANSITION;

	return (
		<button
			{...buttonProps}
			ref={buttonRef}
			aria-busy={showLoadingDots || undefined}
			style={buttonStyle}
		>
			<span
				ref={contentRef}
				aria-hidden={showLoadingDots || undefined}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: `${contentGapPx}px`,
					whiteSpace: 'nowrap',
					opacity: showLoadingDots ? 0 : 1,
					transform: showLoadingDots ? 'scale(0.96)' : 'scale(1)',
					transition: contentTransition,
					pointerEvents: 'none',
				}}
			>
				{children}
			</span>
			<span
				aria-hidden="true"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					opacity: showLoadingDots ? 1 : 0,
					transform: showLoadingDots ? 'scale(1)' : 'scale(0.92)',
					transition: contentTransition,
					pointerEvents: 'none',
				}}
			>
				<DotLoader size={5} color="foreground" />
			</span>
		</button>
	);
};
