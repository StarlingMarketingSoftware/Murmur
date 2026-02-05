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
const HISTORY_ROW_WIDTH = 322;
const HISTORY_ROW_HEIGHT = 34;

// Badge colors by action type (static colors for non-draft types)
const BADGE_COLORS: Record<HistoryActionType, string> = {
	contacts: '#FEF3C7', // light yellow
	drafts: '#F5DADA', // fallback, dynamic colors used instead
	sent: '#BBF7D0', // light green
	received: '#BBF7D0', // light green
};

// Row background gradient colors - from white (bottom/newest) to pink (top/oldest)
const ROW_GRADIENT_COLORS = [
	'#FFFFFF',
	'#FFF6FA',
	'#FFEBF4',
	'#FFE1EE',
	'#FFCBE2',
	'#FFC3DE',
	'#FFBEDB',
	'#FFA5CD',
];

// Get row background color based on position
// After 3 entries total, rows start getting gradient colors from bottom to top
// Newest 3 rows (at bottom) stay white, older rows get progressively more pink
const getRowBackgroundColor = (rowIndex: number, totalRows: number): string => {
	if (totalRows <= 3) {
		return '#FFFFFF';
	}
	
	// Position from the bottom (0 = last row/newest, increasing = older)
	const positionFromBottom = totalRows - 1 - rowIndex;
	
	if (positionFromBottom < 3) {
		// Newest 3 rows stay white
		return '#FFFFFF';
	}
	
	// How far above the white zone this row is (0 = just above, increasing = older/higher)
	const positionAboveWhiteZone = positionFromBottom - 3;
	
	// Get color - higher position (older) gets more pink
	const colorIndex = Math.min(positionAboveWhiteZone, ROW_GRADIENT_COLORS.length - 1);
	
	return ROW_GRADIENT_COLORS[colorIndex];
};

// Interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, factor: number): string => {
	const hex1 = color1.replace('#', '');
	const hex2 = color2.replace('#', '');
	
	const r1 = parseInt(hex1.substring(0, 2), 16);
	const g1 = parseInt(hex1.substring(2, 4), 16);
	const b1 = parseInt(hex1.substring(4, 6), 16);
	
	const r2 = parseInt(hex2.substring(0, 2), 16);
	const g2 = parseInt(hex2.substring(2, 4), 16);
	const b2 = parseInt(hex2.substring(4, 6), 16);
	
	const r = Math.round(r1 + (r2 - r1) * factor);
	const g = Math.round(g1 + (g2 - g1) * factor);
	const b = Math.round(b1 + (b2 - b1) * factor);
	
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
};

// Get dynamic badge color based on count with 3 color stops
// Color stops: 0 -> low, 15 -> mid, 45+ -> high
const getGradientBadgeColor = (count: number, colorLow: string, colorMid: string, colorHigh: string): string => {
	if (count <= 0) {
		return colorLow;
	} else if (count >= 45) {
		return colorHigh;
	} else if (count <= 15) {
		// Interpolate between LOW and MID (0 to 15)
		const factor = count / 15;
		return interpolateColor(colorLow, colorMid, factor);
	} else {
		// Interpolate between MID and HIGH (15 to 45)
		const factor = (count - 15) / 30;
		return interpolateColor(colorMid, colorHigh, factor);
	}
};

// Contacts color stops: #F5DADA -> #F5A1A1 -> #EE7C7C
const getContactsBadgeColor = (count: number): string => {
	return getGradientBadgeColor(count, '#F5DADA', '#F5A1A1', '#EE7C7C');
};

// Drafts color stops: #FFECCA -> #FFDA97 -> #FFCE75
const getDraftsBadgeColor = (count: number): string => {
	return getGradientBadgeColor(count, '#FFECCA', '#FFDA97', '#FFCE75');
};

// Sent color stops: #DBF3D9 -> #BCEDB8 -> #64CE59
const getSentBadgeColor = (count: number): string => {
	return getGradientBadgeColor(count, '#DBF3D9', '#BCEDB8', '#64CE59');
};

// Received color stops: 1 -> #EAF2FA, 3-5 -> #C8E4FF, 6+ -> #83B5E7
const getReceivedBadgeColor = (count: number): string => {
	const COLOR_LOW = '#EAF2FA';    // 1 and below
	const COLOR_MID = '#C8E4FF';    // 3-5 (using 4 as midpoint)
	const COLOR_HIGH = '#83B5E7';   // 6 and above
	
	if (count <= 1) {
		return COLOR_LOW;
	} else if (count >= 6) {
		return COLOR_HIGH;
	} else if (count <= 4) {
		// Interpolate between LOW and MID (1 to 4)
		const factor = (count - 1) / 3;
		return interpolateColor(COLOR_LOW, COLOR_MID, factor);
	} else {
		// Interpolate between MID and HIGH (4 to 6)
		const factor = (count - 4) / 2;
		return interpolateColor(COLOR_MID, COLOR_HIGH, factor);
	}
};

// Get badge color based on action type and count
const getBadgeColor = (type: HistoryActionType, count: number): string => {
	if (type === 'contacts') {
		return getContactsBadgeColor(count);
	}
	if (type === 'drafts') {
		return getDraftsBadgeColor(count);
	}
	if (type === 'sent') {
		return getSentBadgeColor(count);
	}
	if (type === 'received') {
		return getReceivedBadgeColor(count);
	}
	return BADGE_COLORS[type];
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
	const [lockedSide, setLockedSide] = useState<'left' | 'right' | null>(null);
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

	// Filter and sort history actions (oldest at top, newest at bottom)
	const filteredActions = historyActions
		.filter((action) => activeFilter === 'all' || action.type === activeFilter)
		.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	// Calculate dynamic panel height based on number of filtered actions
	// Header: 19px, Tabs: 25px, Content padding: 5px top, 70px bottom
	// Each row: 34px height + 4px gap (except last row has no gap after)
	const HEADER_HEIGHT = 19;
	const TABS_HEIGHT = 25;
	const CONTENT_PADDING_TOP = 5;
	const CONTENT_PADDING_BOTTOM = 70;
	const ROW_GAP = 4;
	
	const rowsHeight = filteredActions.length > 0 
		? (filteredActions.length * HISTORY_ROW_HEIGHT) + ((filteredActions.length - 1) * ROW_GAP)
		: 0;
	const contentHeight = CONTENT_PADDING_TOP + rowsHeight + CONTENT_PADDING_BOTTOM;
	const calculatedPanelHeight = HEADER_HEIGHT + TABS_HEIGHT + contentHeight;
	const dynamicPanelHeight = Math.min(calculatedPanelHeight, HISTORY_PANEL_HEIGHT);

	// Filter tabs - clicking a tab filters, clicking again deselects (shows all)
	// Only show tabs that have at least one item in historyActions
	const allFilterTabs: Array<{ key: HistoryActionType; label: string; activeColor: string }> = [
		{ key: 'contacts', label: 'contacts', activeColor: '#FC9798' },
		{ key: 'drafts', label: 'drafts', activeColor: '#FEDD90' },
		{ key: 'sent', label: 'sent', activeColor: '#91DBAA' },
		{ key: 'received', label: 'received', activeColor: '#94D2E9' },
	];
	
	const filterTabs = allFilterTabs.filter((tab) => 
		historyActions.some((action) => action.type === tab.key)
	);

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

				{/* History Panel */}
				{isHistoryOpen && (
					<>
						{/* Backdrop to close panel when clicking outside */}
						<div
							className="fixed inset-0 z-40"
							onClick={handleCloseHistory}
						/>
						<div
							className="absolute z-50 overflow-hidden animate-inbox-pop-in"
							style={{
								width: HISTORY_PANEL_WIDTH,
								height: dynamicPanelHeight,
								borderRadius: 8,
								border: '2px solid #000000',
								backgroundColor: '#FFFFFF',
								bottom: '100%',
								marginBottom: 10,
								// Align with the edge of the bottom boxes - use locked side
								...(lockedSide === 'right'
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
								className="flex items-center justify-center gap-[16px]"
								style={{
									height: 25,
									backgroundColor: '#D66296',
									borderBottom: '2px solid #000000',
								}}
							>
								{filterTabs.map((tab) => (
									<button
										key={tab.key}
										type="button"
										className={`text-[11px] font-inter text-black text-center h-full ${
											activeFilter === tab.key
												? 'font-semibold'
												: 'font-normal'
										}`}
										style={{
											width: 68,
											borderLeft: '2px solid transparent',
											borderRight: '2px solid transparent',
											transform: 'none',
											transition: 'background-color 200ms ease-in-out, border-color 200ms ease-in-out',
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
												if (tab.key === 'contacts') {
													e.currentTarget.style.backgroundColor = '#EF8EA3';
												} else if (tab.key === 'drafts') {
													e.currentTarget.style.backgroundColor = '#ECD08D';
												} else if (tab.key === 'sent') {
													e.currentTarget.style.backgroundColor = '#9FD0AF';
												} else if (tab.key === 'received') {
													e.currentTarget.style.backgroundColor = '#92BFD0';
												}
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
								className="overflow-y-auto overflow-x-hidden flex flex-col gap-[4px]"
								style={{
									height: dynamicPanelHeight - HEADER_HEIGHT - TABS_HEIGHT,
									backgroundColor: '#D66296',
									paddingTop: CONTENT_PADDING_TOP,
									paddingLeft: 5,
									paddingRight: 5,
									paddingBottom: CONTENT_PADDING_BOTTOM,
								}}
								onClick={(e) => {
									// Only reset if clicking directly on the container, not on a row
									if (e.target === e.currentTarget) {
										setActiveFilter('all');
									}
								}}
							>
								{/* Render action rows */}
								{filteredActions.map((action, index) => (
									<div
										key={action.id}
										className="flex items-center justify-between px-3 shrink-0"
										style={{
											width: HISTORY_ROW_WIDTH,
											height: HISTORY_ROW_HEIGHT,
											borderRadius: 8,
											backgroundColor: getRowBackgroundColor(index, filteredActions.length),
											border: '2px solid #000000',
										}}
									>
										{/* Badge and action type */}
										<div className="flex items-center gap-2">
											<span
												className="text-[12px] font-inter font-medium flex items-center justify-center"
												style={{
													width: 46,
													height: 18,
													borderRadius: 4,
													backgroundColor: getBadgeColor(action.type, action.count),
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
										<span className="text-[12px] font-inter text-black">
											{formatTimestamp(action.timestamp)}
										</span>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default BottomPanelsContainer;
