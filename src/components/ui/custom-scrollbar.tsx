'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/utils';

interface CustomScrollbarProps {
	children: React.ReactNode;
	className?: string;
	thumbColor?: string;
	trackColor?: string;
	thumbWidth?: number;
	style?: React.CSSProperties;
	offsetRight?: number;
	contentClassName?: string;
	/** When true, show a full-height thumb even if there is no overflow. */
	alwaysShow?: boolean;
	/** When true, do not apply the Tailwind overflow-y-auto class to the inner container. */
	disableOverflowClass?: boolean;
	onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
	/** When true, fall back to the native browser scrollbar. */
	nativeScroll?: boolean;
	/** When true, prevent any horizontal scrolling/overflow inside the scroll container. */
	lockHorizontalScroll?: boolean;
}

export function CustomScrollbar({
	children,
	className,
	thumbColor = '#000000',
	trackColor = 'transparent',
	thumbWidth = 2,
	style,
	offsetRight = -4,
	contentClassName,
	alwaysShow = false,
	disableOverflowClass = false,
	onScroll,
	nativeScroll = false,
	lockHorizontalScroll = false,
}: CustomScrollbarProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const scrollThumbRef = useRef<HTMLDivElement>(null);
	const [thumbHeight, setThumbHeight] = useState(0);
	const [thumbTop, setThumbTop] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [scrollStartY, setScrollStartY] = useState(0);

	const updateScrollbar = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const scrollRatio = clientHeight / scrollHeight;

		// Hide scrollbar if content doesn't overflow
		if (scrollRatio >= 1) {
			if (alwaysShow) {
				setThumbHeight(clientHeight);
				setThumbTop(0);
			} else {
				setThumbHeight(0);
			}
			return;
		}

		// Calculate thumb height and position
		const calculatedThumbHeight = Math.max(scrollRatio * clientHeight, 30);
		const maxScrollTop = scrollHeight - clientHeight;
		const thumbPosition =
			(scrollTop / maxScrollTop) * (clientHeight - calculatedThumbHeight);

		setThumbHeight(calculatedThumbHeight);
		setThumbTop(thumbPosition);
	}, [alwaysShow]);

	const handleScroll = useCallback(() => {
		updateScrollbar();
	}, [updateScrollbar]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		setDragStartY(e.clientY);
		const container = scrollContainerRef.current;
		if (container) {
			setScrollStartY(container.scrollTop);
		}
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !scrollContainerRef.current) return;

			const deltaY = e.clientY - dragStartY;
			const container = scrollContainerRef.current;
			const { scrollHeight, clientHeight } = container;
			const maxScrollTop = scrollHeight - clientHeight;
			const scrollRatio = maxScrollTop / (clientHeight - thumbHeight);

			container.scrollTop = scrollStartY + deltaY * scrollRatio;
		},
		[isDragging, dragStartY, scrollStartY, thumbHeight]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Handle track clicks
	const handleTrackClick = useCallback((e: React.MouseEvent) => {
		const container = scrollContainerRef.current;
		const thumb = scrollThumbRef.current;
		if (!container || !thumb || e.target === thumb) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const clickY = e.clientY - rect.top;
		const { scrollHeight, clientHeight } = container;
		const maxScrollTop = scrollHeight - clientHeight;

		// Calculate target scroll position
		const targetRatio = clickY / clientHeight;
		container.scrollTop = targetRatio * maxScrollTop;
	}, []);

	// Forward wheel to internal container to ensure scrolling always works
	const handleWheel: React.WheelEventHandler<HTMLDivElement> = useCallback((e) => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const previousScrollTop = container.scrollTop;
		container.scrollTop += e.deltaY;
		if (container.scrollTop !== previousScrollTop) {
			e.stopPropagation();
		}
	}, []);

	useEffect(() => {
		if (nativeScroll) return;

		const container = scrollContainerRef.current;
		if (!container) return;

		// Initial calculation
		updateScrollbar();

		// Add scroll listener with passive flag
		container.addEventListener('scroll', handleScroll, { passive: true });

		// Add resize observer
		const resizeObserver = new ResizeObserver(updateScrollbar);
		resizeObserver.observe(container);

		// Add mutation observer for content changes
		const mutationObserver = new MutationObserver(updateScrollbar);
		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		});

		return () => {
			container.removeEventListener('scroll', handleScroll);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, [handleScroll, updateScrollbar, nativeScroll]);

	useEffect(() => {
		if (nativeScroll) return;

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'grabbing';
			document.body.style.userSelect = 'none';
		} else {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [isDragging, handleMouseMove, handleMouseUp, nativeScroll]);

	// If native scroll is enabled, render a simpler component
	if (nativeScroll) {
		return (
			<div
				ref={scrollContainerRef}
				className={cn(className, 'overflow-y-auto')}
				onScroll={onScroll}
				style={style}
			>
				{children}
			</div>
		);
	}

	return (
		<div className={cn('relative', className)} style={style} onWheel={handleWheel}>
			{/* Scrollable content container */}
			<div
				ref={scrollContainerRef}
				onScroll={onScroll}
				className={cn(
					'h-full scrollbar-hide hide-native-scrollbar',
					!disableOverflowClass && 'overflow-y-auto',
					contentClassName
				)}
				style={
					{
						// Hide native scrollbar
						scrollbarWidth: 'none',
						msOverflowStyle: 'none',
						// Control horizontal overflow/scrolling
						overflowX: lockHorizontalScroll ? 'hidden' : 'visible',
						overflowY: 'auto',
						// Prevent scroll chaining to parent/page and improve mobile scroll behavior
						overscrollBehavior: 'contain',
						WebkitOverflowScrolling: 'touch',
						touchAction: 'pan-y',
					} as React.CSSProperties
				}
			>
				{children}
			</div>

			{/* Custom scrollbar track */}
			{thumbHeight > 0 && (
				<div
					className="absolute top-0 right-0 h-full cursor-pointer"
					style={{
						width: `${thumbWidth}px`,
						backgroundColor: trackColor,
						right: `${offsetRight}px`,
						zIndex: 50,
					}}
					onClick={handleTrackClick}
				>
					{/* Custom scrollbar thumb */}
					<div
						ref={scrollThumbRef}
						className="absolute left-0 cursor-grab active:cursor-grabbing"
						style={{
							width: `${thumbWidth}px`,
							height: `${thumbHeight}px`,
							transform: `translateY(${thumbTop}px)`,
							backgroundColor: thumbColor,
							transition: 'none',
							willChange: 'transform',
						}}
						onMouseDown={handleMouseDown}
					/>
				</div>
			)}
		</div>
	);
}

// Global styles to hide native scrollbars
export const customScrollbarStyles = `
  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;
