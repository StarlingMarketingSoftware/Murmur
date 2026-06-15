'use client';

import React, { useState } from 'react';
import HistoryLedgerIcon from '@/components/atoms/_svg/HistoryLedgerIcon';
import DashboardActionBarCalendarIcon from '@/components/atoms/_svg/DashboardActionBarCalendarIcon';

// Pill dimensions match the design SVG (116 × 31, rounded top, flat bottom).
export const CAMPAIGN_CORNER_PILL_WIDTH = 116;
export const CAMPAIGN_CORNER_PILL_HEIGHT = 31;

interface CampaignCornerPillProps {
	onHistoryClick: () => void;
	onCalendarClick: () => void;
	historyActive: boolean;
	calendarActive: boolean;
}

const ICON_COLOR_IDLE = 'rgba(0, 0, 0, 0.55)';
const ICON_COLOR_ACTIVE = '#000000';

/**
 * Glassy bottom-anchored tab pinned to the campaign page's bottom-right corner. Two
 * buttons: the history ledger (clock) and the calendar (dashboard calendar icon). The
 * parent owns which panel is open (active flags drive the icon highlight).
 */
export const CampaignCornerPill: React.FC<CampaignCornerPillProps> = ({
	onHistoryClick,
	onCalendarClick,
	historyActive,
	calendarActive,
}) => {
	const [hovered, setHovered] = useState<'history' | 'calendar' | null>(null);

	const buttonStyle: React.CSSProperties = {
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		cursor: 'pointer',
		border: 'none',
		background: 'transparent',
		height: '100%',
		transition: 'background-color 150ms ease',
	};

	return (
		<div
			className="pointer-events-auto"
			style={{
				width: CAMPAIGN_CORNER_PILL_WIDTH,
				height: CAMPAIGN_CORNER_PILL_HEIGHT,
				borderRadius: '20px 20px 0 0',
				background: 'rgba(247, 251, 250, 0.5)',
				backdropFilter: 'blur(8px)',
				WebkitBackdropFilter: 'blur(8px)',
				display: 'flex',
				alignItems: 'stretch',
				overflow: 'hidden',
			}}
		>
			<button
				type="button"
				aria-label="Open history ledger"
				aria-pressed={historyActive}
				style={{
					...buttonStyle,
					backgroundColor: historyActive ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
				}}
				onMouseEnter={() => setHovered('history')}
				onMouseLeave={() => setHovered(null)}
				onClick={onHistoryClick}
			>
				<HistoryLedgerIcon
					width={19}
					height={19}
					style={{ color: historyActive || hovered === 'history' ? ICON_COLOR_ACTIVE : ICON_COLOR_IDLE }}
				/>
			</button>
			<button
				type="button"
				aria-label="Open calendar"
				aria-pressed={calendarActive}
				style={{
					...buttonStyle,
					backgroundColor: calendarActive ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
				}}
				onMouseEnter={() => setHovered('calendar')}
				onMouseLeave={() => setHovered(null)}
				onClick={onCalendarClick}
			>
				<DashboardActionBarCalendarIcon
					width={22}
					height={17}
					style={{ color: calendarActive || hovered === 'calendar' ? ICON_COLOR_ACTIVE : ICON_COLOR_IDLE }}
				/>
			</button>
		</div>
	);
};

export default CampaignCornerPill;
