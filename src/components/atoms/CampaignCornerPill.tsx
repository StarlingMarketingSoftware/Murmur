'use client';

import React, { useState } from 'react';
import HistoryLedgerIcon from '@/components/atoms/_svg/HistoryLedgerIcon';
import DashboardActionBarCalendarIcon from '@/components/atoms/_svg/DashboardActionBarCalendarIcon';
import { wmoCodeToLabel } from '@/lib/weather/wmoToLabel';

// Compact (icons-only) pill matches the design SVG (116 × 31, rounded top, flat
// bottom). In the expanded workspace the pill instead hugs its content — the
// weather readout plus the two icons — so its width is content-driven.
export const CAMPAIGN_CORNER_PILL_WIDTH = 116;
export const CAMPAIGN_CORNER_PILL_HEIGHT = 31;

interface CampaignCornerPillProps {
	onHistoryClick: () => void;
	onCalendarClick: () => void;
	historyActive: boolean;
	calendarActive: boolean;
	temperatureF: number | null;
	weatherCode: number | null;
	// Only the expanded workspace shows the widened weather pill. The compact /
	// narrow layouts keep the original icons-only design.
	expanded: boolean;
}

// Reads like the initial dashboard's hero weather strip, but frosted: a
// translucent black so it blends softly into the glass rather than reading solid.
const WEATHER_TEXT_STYLE: React.CSSProperties = {
	color: 'rgba(0, 0, 0, 0.55)',
	fontFamily: 'var(--font-inter), Inter, sans-serif',
	fontSize: '16.562px',
	fontWeight: 500,
	lineHeight: '20.331px',
	whiteSpace: 'nowrap',
};

// Shared glass shape: rounded top, flat bottom, blur. Fill opacity is set per
// mode (the weather pill is more frosted than the original compact pill).
const PILL_BASE: React.CSSProperties = {
	height: CAMPAIGN_CORNER_PILL_HEIGHT,
	borderRadius: '20px 20px 0 0',
	backdropFilter: 'blur(8px)',
	WebkitBackdropFilter: 'blur(8px)',
	display: 'flex',
	alignItems: 'center',
	overflow: 'hidden',
};
const PILL_GLASS_COMPACT = 'rgba(247, 251, 250, 0.5)';
const PILL_GLASS_WEATHER = 'rgba(247, 251, 250, 0.35)';

// Compact pill keeps the original idle icons; the weather pill stays soft/frosted.
const ICON_COLOR_IDLE = 'rgba(0, 0, 0, 0.55)';
const ICON_COLOR_IDLE_WEATHER = 'rgba(0, 0, 0, 0.38)';
const ICON_COLOR_ACTIVE = '#000000';

/**
 * Glassy bottom-anchored tab pinned to the campaign page's bottom-right corner. Two
 * buttons: the history ledger (clock) and the calendar (dashboard calendar icon). The
 * parent owns which panel is open (active flags drive the icon highlight). In the
 * expanded workspace it also fronts a weather readout matching the dashboard.
 */
export const CampaignCornerPill: React.FC<CampaignCornerPillProps> = ({
	onHistoryClick,
	onCalendarClick,
	historyActive,
	calendarActive,
	temperatureF,
	weatherCode,
	expanded,
}) => {
	const [hovered, setHovered] = useState<'history' | 'calendar' | null>(null);

	const conditionLabel = weatherCode != null ? wmoCodeToLabel(weatherCode) : '';
	const weatherText =
		temperatureF != null && conditionLabel
			? `${Math.round(temperatureF)}°, ${conditionLabel}`
			: null;
	// Show the weather readout only in the expanded workspace, and only once we
	// actually have weather (otherwise keep the original compact icons-only pill).
	const showWeather = expanded && weatherText != null;

	// The weather pill uses slightly larger, softer (frosted) icons; the compact
	// pill keeps the original sizes and idle color.
	const idleColor = showWeather ? ICON_COLOR_IDLE_WEATHER : ICON_COLOR_IDLE;
	const clockSize = showWeather ? 20 : 19;
	const calendarSize = showWeather ? { width: 24, height: 18 } : { width: 22, height: 17 };

	const historyButton = (style: React.CSSProperties) => (
		<button
			data-history-toggle
			type="button"
			aria-label="Open history ledger"
			aria-pressed={historyActive}
			style={{
				...style,
				backgroundColor: historyActive ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
			}}
			onMouseEnter={() => setHovered('history')}
			onMouseLeave={() => setHovered(null)}
			onClick={onHistoryClick}
		>
			<HistoryLedgerIcon
				width={clockSize}
				height={clockSize}
				style={{ color: historyActive || hovered === 'history' ? ICON_COLOR_ACTIVE : idleColor }}
			/>
		</button>
	);

	const calendarButton = (style: React.CSSProperties) => (
		<button
			type="button"
			aria-label="Open calendar"
			aria-pressed={calendarActive}
			style={{
				...style,
				backgroundColor: calendarActive ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
			}}
			onMouseEnter={() => setHovered('calendar')}
			onMouseLeave={() => setHovered(null)}
			onClick={onCalendarClick}
		>
			<DashboardActionBarCalendarIcon
				width={calendarSize.width}
				height={calendarSize.height}
				style={{ color: calendarActive || hovered === 'calendar' ? ICON_COLOR_ACTIVE : idleColor }}
			/>
		</button>
	);

	if (showWeather) {
		// Content-hugging pill: weather text, a generous gap, then the two icons
		// snug together on the right. Width follows the label so short conditions
		// ("Clear") don't strand the icons in a far corner.
		const iconButton: React.CSSProperties = {
			flex: 'none',
			width: 32,
			height: CAMPAIGN_CORNER_PILL_HEIGHT,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			cursor: 'pointer',
			border: 'none',
			background: 'transparent',
			borderRadius: 10,
			transition: 'background-color 150ms ease',
		};
		return (
			<div
				className="pointer-events-auto"
				style={{
					...PILL_BASE,
					background: PILL_GLASS_WEATHER,
					paddingLeft: 18,
					paddingRight: 12,
				}}
			>
				<span style={WEATHER_TEXT_STYLE}>{weatherText}</span>
				<div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 20 }}>
					{historyButton(iconButton)}
					{calendarButton(iconButton)}
				</div>
			</div>
		);
	}

	// Original compact pill: two equal-width icon buttons across the 116px glass.
	const compactButton: React.CSSProperties = {
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
				...PILL_BASE,
				background: PILL_GLASS_COMPACT,
				width: CAMPAIGN_CORNER_PILL_WIDTH,
				alignItems: 'stretch',
			}}
		>
			{historyButton(compactButton)}
			{calendarButton(compactButton)}
		</div>
	);
};

export default CampaignCornerPill;
