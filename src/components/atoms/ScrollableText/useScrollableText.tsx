import { useRef, useEffect, useState } from 'react';

export interface ScrollableTextProps {
	text: string;
	className?: string;
	style?: React.CSSProperties;
	// Optional: override default pixels-per-second speed
	scrollPixelsPerSecond?: number;
}

export const useScrollableText = (props: ScrollableTextProps) => {
	const { text, className, style, scrollPixelsPerSecond = 40 } = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const updateOverflowAndDuration = () => {
			if (containerRef.current && textRef.current) {
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				const overflowing = textWidth > containerWidth;
				setIsOverflowing(overflowing);
				if (overflowing) {
					// distance to travel = full text width + gap (50px)
					const distance = textWidth + 50;
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
		style,
		className,
		text,
	};
};
