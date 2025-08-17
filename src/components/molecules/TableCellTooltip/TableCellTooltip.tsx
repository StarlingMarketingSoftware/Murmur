import { FC, useRef, useState, useEffect } from 'react';

interface TableCellTooltipProps {
	text: string;
	maxLength?: number;
	positioning?: 'below-right' | 'below-left'; // Kept for backwards compatibility but not used
	onHover?: (text: string | null) => void;
}

export const TableCellTooltip: FC<TableCellTooltipProps> = ({
	text,
	maxLength = 40,
	positioning = 'below-right', // Kept for backwards compatibility
	onHover,
}) => {
	const textRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isHovering, setIsHovering] = useState(false);
	const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		const checkOverflow = () => {
			if (textRef.current) {
				const element = textRef.current;
				const isOverflow = element.scrollWidth > element.clientWidth || 
								  element.scrollHeight > element.clientHeight;
				setIsOverflowing(isOverflow);
			}
		};

		checkOverflow();
		// Check on resize
		window.addEventListener('resize', checkOverflow);
		
		// Check after a small delay to ensure layout is complete
		const timer = setTimeout(checkOverflow, 100);
		
		return () => {
			window.removeEventListener('resize', checkOverflow);
			clearTimeout(timer);
		};
	}, [text]);

	const handleMouseEnter = () => {
		if (isOverflowing) {
			setIsHovering(true);
			onHover?.(text);
		}
	};

	const handleMouseLeave = () => {
		setIsHovering(false);
		onHover?.(null);
	};

	// When hovering, measure the rendered overlay and position it with a tiny gap
	useEffect(() => {
		if (!isHovering || !containerRef.current) return;

		const updatePosition = () => {
			const container = containerRef.current!;
			
			// Find the table element
			const tableElement = container.closest('table');
			if (!tableElement) return;
			
			// Get the table's position
			const tableRect = tableElement.getBoundingClientRect();
			
			// STATIC POSITION: Right above the table, left-aligned for better readability
			// Text appears in a neat position above the table
			const tooltipTop = tableRect.top - 35; // 35px above the table top
			const tooltipLeft = tableRect.left; // Align with left edge of table
			
			// Apply the position
			setOverlayPosition({ top: tooltipTop, left: Math.max(10, tooltipLeft) });
		};
		
		// Update position immediately
		updatePosition();
		
		// Keep position updated on scroll/resize
		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', updatePosition);
		
		return () => {
			window.removeEventListener('scroll', updatePosition, true);
			window.removeEventListener('resize', updatePosition);
		};
	}, [isHovering]);

	// Hide the tooltip's own text display, as it's now shown statically
	return (
		<div 
			ref={containerRef}
			className="relative w-full"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div ref={textRef} className="truncate w-full cursor-default">
				{text}
			</div>
		</div>
	);
};