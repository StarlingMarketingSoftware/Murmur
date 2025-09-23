import { useRef, useEffect, useState } from 'react';

export interface ScrollableTextProps {
	text: string;
	className?: string;
	scrollPixelsPerSecond?: number;
}

export const useScrollableText = (props: ScrollableTextProps) => {
	const { text, className, scrollPixelsPerSecond = 40 } = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const updateOverflowAndDuration = () => {
			if (containerRef.current && textRef.current) {
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				const overflowing = textWidth > containerWidth;
				setIsOverflowing(overflowing);
				if (overflowing) {
					// When text is duplicated, we scroll 50% of the total width
					// This creates a seamless loop as the second copy takes the place of the first
					const distance = textWidth + 50; // textWidth + gap
					// duration in seconds at fixed speed
					const durationSec = distance / scrollPixelsPerSecond;
					containerRef.current.style.setProperty('--scroll-duration', `${durationSec}s`);
				} else {
					containerRef.current.style.removeProperty('--scroll-duration');
				}
			}
		};

		updateOverflowAndDuration();
		window.addEventListener('resize', updateOverflowAndDuration);

		const resizeObserver = new ResizeObserver(updateOverflowAndDuration);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener('resize', updateOverflowAndDuration);
			resizeObserver.disconnect();
		};
	}, [text, scrollPixelsPerSecond]);

	return {
		containerRef,
		textRef,
		isOverflowing,
		className,
		text,
	};
};
