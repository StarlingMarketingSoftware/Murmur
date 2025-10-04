'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export function GlobalScrollbar() {
	const scrollThumbRef = useRef<HTMLDivElement>(null);
	const thumbHeightRef = useRef(0);
	const thumbTopRef = useRef(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [scrollStartY, setScrollStartY] = useState(0);
	const [isVisible, setIsVisible] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);
	const rafRef = useRef<number | undefined>(undefined);
	const isMobile = useIsMobile();
	const [isMobilePortrait, setIsMobilePortrait] = useState<boolean | null>(null);

	const updateScrollbar = useCallback(() => {
		const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
		const scrollRatio = clientHeight / scrollHeight;

		// Hide scrollbar if content doesn't overflow
		if (scrollRatio >= 1) {
			thumbHeightRef.current = 0;
			if (scrollThumbRef.current) {
				scrollThumbRef.current.style.display = 'none';
			}
			return;
		}

		// Calculate thumb height and position
		const calculatedThumbHeight = Math.max(scrollRatio * clientHeight, 30);
		const maxScrollTop = scrollHeight - clientHeight;
		const thumbPosition =
			(scrollTop / maxScrollTop) * (clientHeight - calculatedThumbHeight);

		thumbHeightRef.current = calculatedThumbHeight;
		thumbTopRef.current = thumbPosition;

		// Update DOM directly for better performance
		if (scrollThumbRef.current) {
			scrollThumbRef.current.style.display = 'block';
			scrollThumbRef.current.style.height = `${calculatedThumbHeight}px`;
			scrollThumbRef.current.style.transform = `translateY(${thumbPosition}px)`;
		}
	}, []);

	const handleScroll = useCallback(() => {
		// Cancel any pending animation frame
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
		}

		// Use requestAnimationFrame for smooth updates
		rafRef.current = requestAnimationFrame(() => {
			updateScrollbar();
			setIsVisible(true);

			// Clear existing timeout
			if (visibilityTimeoutRef.current) {
				clearTimeout(visibilityTimeoutRef.current);
			}

			// Hide scrollbar after 1 second of no scrolling
			visibilityTimeoutRef.current = setTimeout(() => {
				setIsVisible(false);
			}, 1000);
		});
	}, [updateScrollbar]);

	// Check if we're in mobile portrait mode
	useEffect(() => {
		const checkOrientation = () => {
			if (typeof window !== 'undefined') {
				const isPortrait = window.innerHeight > window.innerWidth;
				const isMobileDevice = isMobile === true;
				setIsMobilePortrait(isMobileDevice && isPortrait);
			}
		};

		// Check on mount
		checkOrientation();

		// Check on resize and orientation change
		window.addEventListener('resize', checkOrientation);
		window.addEventListener('orientationchange', checkOrientation);

		return () => {
			window.removeEventListener('resize', checkOrientation);
			window.removeEventListener('orientationchange', checkOrientation);
		};
	}, [isMobile]);

	// Detect when any app dialog is open (e.g. IdentityDialog) and hide the global scrollbar
	useEffect(() => {
		const checkDialogOpen = () => {
			try {
				const el = document.querySelector(
					'[data-slot="dialog-content"][data-state="open"]'
				);
				setIsDialogOpen(!!el);
			} catch {
				setIsDialogOpen(false);
			}
		};

		checkDialogOpen();
		const observer = new MutationObserver(() => {
			checkDialogOpen();
		});
		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		setDragStartY(e.clientY);
		setScrollStartY(document.documentElement.scrollTop);
		setIsVisible(true);
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return;

			const deltaY = e.clientY - dragStartY;
			const { scrollHeight, clientHeight } = document.documentElement;
			const maxScrollTop = scrollHeight - clientHeight;
			const scrollRatio = maxScrollTop / (clientHeight - thumbHeightRef.current);

			document.documentElement.scrollTop = scrollStartY + deltaY * scrollRatio;
		},
		[isDragging, dragStartY, scrollStartY]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Handle track clicks
	const handleTrackClick = useCallback((e: React.MouseEvent) => {
		const thumb = scrollThumbRef.current;
		if (!thumb || e.target === thumb) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const clickY = e.clientY - rect.top;
		const { scrollHeight, clientHeight } = document.documentElement;
		const maxScrollTop = scrollHeight - clientHeight;

		// Calculate target scroll position
		const targetRatio = clickY / clientHeight;
		document.documentElement.scrollTop = targetRatio * maxScrollTop;
	}, []);

	useEffect(() => {
		// Initial calculation
		updateScrollbar();

		// Add scroll listener with passive flag for better performance
		window.addEventListener('scroll', handleScroll, { passive: true });

		// Add resize observer
		const resizeObserver = new ResizeObserver(updateScrollbar);
		resizeObserver.observe(document.documentElement);
		resizeObserver.observe(document.body);

		// Add mutation observer for content changes with debounce
		let mutationTimeout: ReturnType<typeof setTimeout>;
		const mutationObserver = new MutationObserver(() => {
			clearTimeout(mutationTimeout);
			mutationTimeout = setTimeout(updateScrollbar, 10);
		});
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: false, // Reduce overhead by not watching attribute changes
			characterData: false,
		});

		return () => {
			window.removeEventListener('scroll', handleScroll);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			clearTimeout(mutationTimeout);
			if (visibilityTimeoutRef.current) {
				clearTimeout(visibilityTimeoutRef.current);
			}
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [handleScroll, updateScrollbar]);

	useEffect(() => {
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
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Initial render
	useEffect(() => {
		updateScrollbar();
	}, [updateScrollbar]);

	// Do not render the global scrollbar while a dialog is open or on mobile portrait view
	if (isDialogOpen || isMobilePortrait) {
		return null;
	}

	return (
		<div
			className="fixed top-0 right-0 h-screen cursor-pointer z-[9999]"
			style={{
				width: '2px',
				backgroundColor: 'transparent',
				opacity: isVisible || isDragging ? 1 : 0.7,
				transition: 'opacity 0.2s ease',
			}}
			onClick={handleTrackClick}
			onMouseEnter={() => setIsVisible(true)}
		>
			{/* Custom scrollbar thumb */}
			<div
				ref={scrollThumbRef}
				className="absolute left-0 cursor-grab active:cursor-grabbing will-change-transform"
				style={{
					width: '2px',
					backgroundColor: '#000000',
					transform: 'translateY(0)',
					transition: 'none',
				}}
				onMouseDown={handleMouseDown}
			/>
		</div>
	);
}
