'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Maintain a simple global counter so the most recently dragged box stays on top
let globalDraggableBoxZIndex = 1;

interface DraggableBoxProps {
	/** Stable id for debugging or future persistence */
	id: string;
	children: ReactNode;
	/** Initial offset in pixels (relative to natural layout position) */
	defaultPosition?: { x: number; y: number };
	/** CSS selector for an internal drag handle; if omitted and showHandle=true, a small top bar is rendered as the handle */
	/** CSS selector for an internal drag handle; if omitted and showHandle=true, a small top bar is rendered as the handle */
	dragHandleSelector?: string;
	/** When false, dragging is disabled and transform is cleared */
	enabled?: boolean;
}

/**
 * Lightweight draggable wrapper that translates its child using CSS transform.
 * - Keeps original layout space; visually moves element without reflow
 * - Uses header/selector as drag handle to avoid interfering with inner controls
 */
export const DraggableBox: FC<DraggableBoxProps> = ({
	id,
	children,
	defaultPosition = { x: 0, y: 0 },
	dragHandleSelector,
	enabled = true,
}) => {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const positionRef = useRef<{ x: number; y: number }>({ ...defaultPosition });
	const [position, setPosition] = useState<{ x: number; y: number }>(defaultPosition);
	const [isDragging, setIsDragging] = useState(false);
	const [stackZIndex, setStackZIndex] = useState<number>(0);
	const startRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

	const isInteractive = (el: HTMLElement | null): boolean => {
		if (!el) return false;
		const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];
		if (interactiveTags.includes(el.tagName)) return true;
		const role = el.getAttribute('role');
		if (role && ['button', 'link', 'textbox'].includes(role)) return true;
		return !!el.closest(
			"button, a, input, textarea, select, [role='button'], [role='link']"
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

	const endDragging = useCallback(() => {
		setIsDragging(false);
		startRef.current = null;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', endDragging);
	}, [onPointerMove]);

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
			positionRef.current = { ...defaultPosition };
			setPosition({ ...defaultPosition });
			setIsDragging(false);
		}
		// include full object for correctness (eslint satisfies)
	}, [enabled, defaultPosition]);

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
		<div ref={wrapperRef} style={style} data-draggable-box-id={id}>
			{/* No visual handle by default; dragging is activated from header selector (if provided) or non-interactive areas of the wrapper */}
			{children}
		</div>
	);
};

export default DraggableBox;
