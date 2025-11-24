'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Maintain a simple global counter so the most recently dragged box stays on top
let globalDraggableBoxZIndex = 1;

interface DraggableBoxProps {
	/** Stable id for debugging or future persistence */
	id: string;
	children: ReactNode;
	/** Optional className for the outer wrapper */
	className?: string;
	/** Initial offset in pixels (relative to natural layout position) */
	defaultPosition?: { x: number; y: number };
	/** CSS selector for an internal drag handle; if omitted and showHandle=true, a small top bar is rendered as the handle */
	/** CSS selector for an internal drag handle; if omitted and showHandle=true, a small top bar is rendered as the handle */
	dragHandleSelector?: string;
	/** When the drag ends, report which other draggable box (if any) was under the pointer */
	onDropOver?: (overId: string | null) => void;
	/** When false, dragging is disabled and transform is cleared */
	enabled?: boolean;
	/** Bump this token to force the box to reset to its default position */
	resetToken?: number | string;
}

/**
 * Lightweight draggable wrapper that translates its child using CSS transform.
 * - Keeps original layout space; visually moves element without reflow
 * - Uses header/selector as drag handle to avoid interfering with inner controls
 */
export const DraggableBox: FC<DraggableBoxProps> = ({
	id,
	children,
	className,
	defaultPosition,
	dragHandleSelector,
	onDropOver,
	enabled = true,
	resetToken,
}) => {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	// Resolve primitives first, then memoize object so identity only changes when values change
	const defaultX = defaultPosition?.x ?? 0;
	const defaultY = defaultPosition?.y ?? 0;
	const resolvedDefaultPosition = useMemo(
		() => ({ x: defaultX, y: defaultY }),
		[defaultX, defaultY]
	);
	const positionRef = useRef<{ x: number; y: number }>({ ...resolvedDefaultPosition });
	const [position, setPosition] = useState<{ x: number; y: number }>(
		resolvedDefaultPosition
	);
	const [isDragging, setIsDragging] = useState(false);
	const [stackZIndex, setStackZIndex] = useState<number>(0);
	const startRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

	const isInteractive = (el: HTMLElement | null): boolean => {
		if (!el) return false;
		// Explicit opt-out marker anywhere up the tree
		if (el.closest('[data-drag-ignore="true"], [data-drag-ignore]')) return true;
		const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];
		if (interactiveTags.includes(el.tagName)) return true;
		const role = el.getAttribute('role');
		if (role && ['button', 'link', 'textbox', 'slider'].includes(role)) return true;
		return !!el.closest(
			"button, a, input, textarea, select, [role='button'], [role='link'], [role='slider']"
		);
	};

	const onPointerMove = useCallback((e: PointerEvent) => {
		if (!startRef.current) return;
		const dx = e.clientX - startRef.current.px;
		const dy = e.clientY - startRef.current.py;
		const next = { x: startRef.current.x + dx, y: startRef.current.y + dy };
		positionRef.current = next;
		setPosition(next);
	}, []);

	const endDragging = useCallback(
		(e: PointerEvent) => {
			setIsDragging(false);
			startRef.current = null;
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', endDragging);

			// Determine what draggable box (if any) is under the pointer at drop time
			if (
				onDropOver &&
				e &&
				typeof e.clientX === 'number' &&
				typeof e.clientY === 'number'
			) {
				const elements = document.elementsFromPoint(
					e.clientX,
					e.clientY
				) as HTMLElement[];
				let overId: string | null = null;
				for (const el of elements) {
					const wrapper = el.closest?.('[data-draggable-box-id]') as HTMLElement | null;
					const attr = wrapper?.getAttribute?.('data-draggable-box-id') || null;
					if (attr && attr !== id) {
						overId = attr;
						break;
					}
				}
				onDropOver(overId);
				// Snap back to default position when using swap-on-drop behavior
				positionRef.current = { ...resolvedDefaultPosition };
				setPosition({ ...resolvedDefaultPosition });
			}
		},
		[id, onPointerMove, onDropOver, resolvedDefaultPosition]
	);

	const tryStartDrag = useCallback(
		(e: PointerEvent | MouseEvent) => {
			if (!enabled) return;
			if (!(e instanceof PointerEvent)) return;
			if (e.button !== 0) return; // left click only
			const target = e.target as HTMLElement | null;
			if (!target) return;

			// If a handle selector is provided, ensure the event originated within it
			if (dragHandleSelector) {
				const container = wrapperRef.current;
				const handleEl = container?.querySelector(
					dragHandleSelector
				) as HTMLElement | null;
				const isInHandle = !!target.closest(dragHandleSelector);
				if (!handleEl || !isInHandle) return;
				// Avoid starting drag when clicking interactive controls inside the handle
				if (isInteractive(target)) return;
			} else {
				// No explicit handle: allow dragging from wrapper but ignore interactive descendants
				if (isInteractive(target)) return;
			}

			// Start dragging
			// Bring this box to the front and persist that order
			setStackZIndex(++globalDraggableBoxZIndex);
			setIsDragging(true);
			startRef.current = {
				x: positionRef.current.x,
				y: positionRef.current.y,
				px: e.clientX,
				py: e.clientY,
			};
			try {
				(wrapperRef.current as HTMLDivElement)?.setPointerCapture(e.pointerId);
			} catch {}
			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', endDragging);
			e.preventDefault();
		},
		[dragHandleSelector, enabled, endDragging, onPointerMove]
	);

	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;
		if (!enabled) return;
		// Delegate pointerdown and let tryStartDrag decide whether to begin dragging
		const onPointerDown = (e: PointerEvent) => tryStartDrag(e);
		el.addEventListener('pointerdown', onPointerDown);
		return () => {
			el.removeEventListener('pointerdown', onPointerDown);
		};
	}, [enabled, tryStartDrag]);

	// When disabled, clear transform and reset position
	useEffect(() => {
		if (!enabled) {
			const isAlreadyAtDefault =
				positionRef.current.x === resolvedDefaultPosition.x &&
				positionRef.current.y === resolvedDefaultPosition.y;
			if (!isAlreadyAtDefault) {
				positionRef.current = { ...resolvedDefaultPosition };
				setPosition({ ...resolvedDefaultPosition });
			}
			setIsDragging(false);
		}
	}, [enabled, resolvedDefaultPosition]);

	// External reset trigger
	useEffect(() => {
		if (resetToken === undefined) return;
		positionRef.current = { ...resolvedDefaultPosition };
		setPosition({ ...resolvedDefaultPosition });
	}, [resetToken, resolvedDefaultPosition]);

	// Inline styles
	const style = useMemo<React.CSSProperties>(
		() => ({
			transform: enabled ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
			willChange: enabled && isDragging ? 'transform' : undefined,
			position: 'relative',
			zIndex: stackZIndex || undefined,
			userSelect: isDragging ? 'none' : undefined,
		}),
		[enabled, isDragging, position.x, position.y, stackZIndex]
	);

	return (
		<div ref={wrapperRef} style={style} data-draggable-box-id={id} className={className}>
			{/* No visual handle by default; dragging is activated from header selector (if provided) or non-interactive areas of the wrapper */}
			{children}
		</div>
	);
};

export default DraggableBox;
