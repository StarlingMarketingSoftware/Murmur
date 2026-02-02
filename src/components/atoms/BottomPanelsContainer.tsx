'use client';

import React, { useState, useRef, useCallback, type ReactNode } from 'react';
import LogsSvg from '@/components/atoms/_svg/logs';

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
const BUTTON_HEIGHT_COLLAPSED = 40;

// History panel dimensions
const HISTORY_PANEL_WIDTH = 343;
const HISTORY_PANEL_HEIGHT = 370;
const HISTORY_ROW_WIDTH = 332;
const HISTORY_ROW_HEIGHT = 34;

// Badge colors by action type
const BADGE_COLORS: Record<HistoryActionType, string> = {
	contacts: '#FEF3C7', // light yellow
	drafts: '#FECDD3', // light pink
	sent: '#BBF7D0', // light green
	received: '#BBF7D0', // light green
};

// Format timestamp for display
const formatTimestamp = (date: Date): string => {
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = date.toDateString() === yesterday.toDateString();

	if (isToday) {
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
	} else if (isYesterday) {
		return 'Yesterday';
	} else {
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
};

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
	const [activeFilter, setActiveFilter] = useState<HistoryActionType | 'all'>('all');
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
		setIsHistoryOpen((prev) => !prev);
	}, []);

	const handleCloseHistory = useCallback(() => {
		setIsHistoryOpen(false);
	}, []);

	// Filter and sort history actions
	const filteredActions = historyActions
		.filter((action) => activeFilter === 'all' || action.type === activeFilter)
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

	// Filter tabs - clicking a tab filters, clicking again deselects (shows all)
	const filterTabs: Array<{ key: HistoryActionType; label: string; activeColor: string }> = [
		{ key: 'contacts', label: 'contacts', activeColor: '#FC9798' },
		{ key: 'drafts', label: 'drafts', activeColor: '#FEDD90' },
		{ key: 'sent', label: 'sent', activeColor: '#91DBAA' },
		{ key: 'received', label: 'received', activeColor: '#94D2E9' },
	];

	const handleTabClick = useCallback((key: HistoryActionType) => {
		// If clicking the already-active filter, deselect it (show all)
		setActiveFilter((current) => current === key ? 'all' : key);
	}, []);

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
							...(cursorOnRightSide
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

				{/* History Panel */}
				{isHistoryOpen && (
					<>
						{/* Backdrop to close panel when clicking outside */}
						<div
							className="fixed inset-0 z-40"
							onClick={handleCloseHistory}
						/>
						<div
							className="absolute z-50 overflow-hidden"
							style={{
								width: HISTORY_PANEL_WIDTH,
								height: HISTORY_PANEL_HEIGHT,
								borderRadius: 8,
								border: '2px solid #000000',
								backgroundColor: '#FFFFFF',
								bottom: '100%',
								marginBottom: 10,
								// Align with the edge of the bottom boxes
								...(cursorOnRightSide
									? { right: 0 } // Right edge of panel aligns with right edge of rightmost box
									: { left: 0 }), // Left edge of panel aligns with left edge of leftmost box
							}}
						>
							{/* Header - white background */}
							<div
								className="flex items-center px-3 cursor-pointer"
								style={{
									height: 19,
									backgroundColor: '#FFFFFF',
								}}
								onClick={() => setActiveFilter('all')}
							>
								<span className="text-[14px] font-inter font-medium text-black">History</span>
							</div>

							{/* Filter Tabs - pink background */}
							<div
								className="flex items-center justify-around"
								style={{
									height: 25,
									backgroundColor: '#D66296',
								}}
							>
								{filterTabs.map((tab) => (
									<button
										key={tab.key}
										type="button"
										className={`text-[11px] font-inter transition-colors text-black text-center h-full ${
											activeFilter === tab.key
												? 'font-semibold'
												: 'font-normal'
										}`}
										style={{
											width: 68,
											borderLeft: '2px solid transparent',
											borderRight: '2px solid transparent',
											...(activeFilter === tab.key
												? {
													backgroundColor: tab.activeColor,
													borderLeft: '2px solid #000000',
													borderRight: '2px solid #000000',
												}
												: {}),
										}}
										onMouseEnter={(e) => {
											if (activeFilter !== tab.key) {
												e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
												e.currentTarget.style.borderLeft = '2px solid rgba(0,0,0,0.3)';
												e.currentTarget.style.borderRight = '2px solid rgba(0,0,0,0.3)';
											}
										}}
										onMouseLeave={(e) => {
											if (activeFilter !== tab.key) {
												e.currentTarget.style.backgroundColor = 'transparent';
												e.currentTarget.style.borderLeft = '2px solid transparent';
												e.currentTarget.style.borderRight = '2px solid transparent';
											}
										}}
										onClick={() => handleTabClick(tab.key)}
									>
										{tab.label}
									</button>
								))}
							</div>

							{/* Action Rows */}
							<div
								className="overflow-y-auto overflow-x-hidden p-[5px] flex flex-col gap-[4px]"
								style={{
									height: HISTORY_PANEL_HEIGHT - 19 - 25,
									backgroundColor: '#D66296',
								}}
								onClick={(e) => {
									// Only reset if clicking directly on the container, not on a row
									if (e.target === e.currentTarget) {
										setActiveFilter('all');
									}
								}}
							>
								{filteredActions.length === 0 ? (
									<div className="flex items-center justify-center h-full text-[13px] font-inter text-gray-600">
										No history yet
									</div>
								) : (
									filteredActions.map((action) => (
										<div
											key={action.id}
											className="flex items-center justify-between px-3 shrink-0"
											style={{
												width: HISTORY_ROW_WIDTH,
												height: HISTORY_ROW_HEIGHT,
												borderRadius: 8,
												backgroundColor: '#FDF2F8',
												border: '2px solid #000000',
											}}
										>
											{/* Badge and action type */}
											<div className="flex items-center gap-2">
												<span
													className="text-[12px] font-inter font-medium px-2 py-0.5 rounded"
													style={{
														backgroundColor: BADGE_COLORS[action.type],
														border: '1px solid rgba(0,0,0,0.1)',
													}}
												>
													+{action.count.toString().padStart(2, '0')}
												</span>
												<span className="text-[13px] font-inter font-medium text-black">
													{action.type}
												</span>
											</div>

											{/* Timestamp */}
											<span className="text-[12px] font-inter text-gray-600">
												{formatTimestamp(action.timestamp)}
											</span>
										</div>
									))
								)}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default BottomPanelsContainer;
