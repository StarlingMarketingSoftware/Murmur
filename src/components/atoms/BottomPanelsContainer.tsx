'use client';

import React, {
	useState,
	useRef,
	useCallback,
	useLayoutEffect,
	type ReactNode,
} from 'react';
import LogsSvg from '@/components/atoms/_svg/logs';
import { HistoryLedgerPanel } from '@/components/atoms/HistoryLedgerPanel';

export type HistoryActionType = 'contacts' | 'drafts' | 'sent' | 'received';

export interface HistoryAction {
	id: string;
	type: HistoryActionType;
	count: number;
	timestamp: Date;
}

interface BottomPanelsContainerProps {
	children: ReactNode;
	className?: string;
	collapsed?: boolean;
	historyActions?: HistoryAction[];
	'data-campaign-bottom-anchor'?: boolean;
}

// Horizontal padding to extend hover area beyond the boxes
const HOVER_PADDING = 157;
// Gap between the logs button and the edge box
const BUTTON_GAP = 13;
// Logs button dimensions
const BUTTON_WIDTH = 28;
const BUTTON_HEIGHT_EXPANDED = 116;
const BUTTON_HEIGHT_COLLAPSED = 45;

/**
 * Wrapper component for the bottom panels (Contacts, Drafts, Sent, Inbox).
 * Shows a logs button on hover that appears on the left or right side
 * depending on cursor position relative to center.
 */
export const BottomPanelsContainer: React.FC<BottomPanelsContainerProps> = ({
	children,
	className = '',
	collapsed = false,
	historyActions = [],
	...rest
}) => {
	const buttonHeight = collapsed ? BUTTON_HEIGHT_COLLAPSED : BUTTON_HEIGHT_EXPANDED;
	const [isHovered, setIsHovered] = useState(false);
	const [isButtonHovered, setIsButtonHovered] = useState(false);
	const [cursorOnRightSide, setCursorOnRightSide] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [lockedSide, setLockedSide] = useState<'left' | 'right' | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);

	const syncHoverFromPoint = useCallback((x: number, y: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const isInside =
			x >= rect.left &&
			x <= rect.right &&
			y >= rect.top &&
			y <= rect.bottom;
		setIsHovered(isInside);
		if (!isInside) return;
		const centerX = rect.left + rect.width / 2;
		setCursorOnRightSide(x > centerX);
	}, []);

	const trackPointerPosition = useCallback((x: number, y: number) => {
		lastPointerPositionRef.current = { x, y };
		syncHoverFromPoint(x, y);
	}, [syncHoverFromPoint]);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		trackPointerPosition(e.clientX, e.clientY);
	}, [trackPointerPosition]);

	const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		trackPointerPosition(e.clientX, e.clientY);
	}, [trackPointerPosition]);

	useLayoutEffect(() => {
		const lastPointerPosition = lastPointerPositionRef.current;
		if (!lastPointerPosition) return;
		syncHoverFromPoint(lastPointerPosition.x, lastPointerPosition.y);
	}, [children, collapsed, syncHoverFromPoint]);

	const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		trackPointerPosition(e.clientX, e.clientY);
	}, [trackPointerPosition]);

	const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		trackPointerPosition(e.clientX, e.clientY);
	}, [trackPointerPosition]);

	const handleLogsClick = useCallback(() => {
		setIsHistoryOpen((prev) => {
			if (!prev) {
				// Opening the panel - lock in the current side
				setLockedSide(cursorOnRightSide ? 'right' : 'left');
			} else {
				// Closing the panel - clear the locked side and hide button
				setLockedSide(null);
				setIsHovered(false);
			}
			return !prev;
		});
	}, [cursorOnRightSide]);

	const handleCloseHistory = useCallback(() => {
		setIsHistoryOpen(false);
		setLockedSide(null);
		setIsHovered(false); // Hide button at same time as panel
	}, []);

	return (
		<div
			ref={containerRef}
			className="pointer-events-auto"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
			onPointerDown={handlePointerDown}
			style={{
				// Extend hover area to the left and right
				paddingLeft: HOVER_PADDING,
				paddingRight: HOVER_PADDING,
				marginLeft: -HOVER_PADDING,
				marginRight: -HOVER_PADDING,
			}}
		>
			{/* The actual content (3 boxes) with original styling - relative for button positioning */}
			<div
				className={`relative ${className}`}
				{...rest}
			>
				{children}

				{/* Logs button - appears on left or right based on cursor position */}
				{(isHovered || isButtonHovered || isHistoryOpen) && (
					<div
						data-history-toggle
						className="absolute flex items-center justify-center pointer-events-auto cursor-pointer transition-colors duration-150"
						style={{
							width: BUTTON_WIDTH,
							height: buttonHeight,
							borderRadius: 8,
							border: '2px solid #000000',
							backgroundColor: isButtonHovered || isHistoryOpen ? '#D66296' : 'transparent',
							top: 0,
							// Use locked side when panel is open, otherwise follow cursor
							...((lockedSide === 'right' || (lockedSide === null && cursorOnRightSide))
								? { right: -BUTTON_WIDTH - BUTTON_GAP }
								: { left: -BUTTON_WIDTH - BUTTON_GAP }),
						}}
						onMouseEnter={() => setIsButtonHovered(true)}
						onMouseLeave={() => setIsButtonHovered(false)}
						onClick={handleLogsClick}
					>
						<LogsSvg width={18} height={18} />
					</div>
				)}

				{/* History Panel - anchored above the boxes, aligned to the locked side */}
				{isHistoryOpen && (
					<div
						className="absolute z-[80]"
						style={{
							bottom: '100%',
							marginBottom: 10,
							// Align with the edge of the bottom boxes - use locked side
							...(lockedSide === 'right' ? { right: 0 } : { left: 0 }),
						}}
					>
						<HistoryLedgerPanel historyActions={historyActions} onClose={handleCloseHistory} />
					</div>
				)}
			</div>
		</div>
	);
};

export default BottomPanelsContainer;
