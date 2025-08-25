import { useRef, useEffect, useState } from 'react';

export interface ScrollableTextProps {
	text: string;
	className?: string;
	style?: React.CSSProperties;
}

export const useScrollableText = (props: ScrollableTextProps) => {
	const { text, className, style } = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const checkOverflow = () => {
			if (containerRef.current && textRef.current) {
				// Check if the text width exceeds the container width
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				setIsOverflowing(textWidth > containerWidth);
			}
		};

		checkOverflow();
		// Recheck on window resize
		window.addEventListener('resize', checkOverflow);

		// Also check when text changes
		const observer = new ResizeObserver(checkOverflow);
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener('resize', checkOverflow);
			observer.disconnect();
		};
	}, [text]);

	return {
		containerRef,
		textRef,
		isOverflowing,
		style,
		className,
		text,
	};
};
