'use client';

import React, { useState, useRef, useCallback, type ReactNode } from 'react';
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
	const innerRef = useRef<HTMLDivElement>(null);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		setCursorOnRightSide(e.clientX > centerX);
	}, []);

	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

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

	// Clicking a ledger box (the "+NN" batch boxes inside the panels) opens the
	// History panel, anchored to the side the box was clicked on.
	const handleLedgerBoxClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!(e.target as HTMLElement).closest('[data-history-ledger-box]')) return;
			// Captured before the panel's own onClick (which navigates to that tab),
			// so a ledger-box click only opens History and doesn't change tabs.
			e.stopPropagation();
			const rect = containerRef.current?.getBoundingClientRect();
			const onRight = rect ? e.clientX > rect.left + rect.width / 2 : cursorOnRightSide;
			setLockedSide(onRight ? 'right' : 'left');
			setIsHovered(true);
			setIsHistoryOpen(true);
		},
		[cursorOnRightSide]
	);

	return (
		<div
			ref={containerRef}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
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
				ref={innerRef}
				className={`relative ${className}`}
				{...rest}
				onClickCapture={handleLedgerBoxClick}
			>
				{children}

				{/* Logs button - appears on left or right based on cursor position */}
				{(isHovered || isHistoryOpen) && (
					<div
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
						className="absolute z-50"
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
