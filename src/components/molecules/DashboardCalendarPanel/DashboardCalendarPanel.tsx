import { FC } from 'react';

export type DashboardCalendarMockState = {
	year?: number;
	monthIndex?: number;
	day?: number;
};

type DashboardCalendarPanelProps = {
	className?: string;
	mockState?: DashboardCalendarMockState;
};

const MONTH_LABELS_UPPER = [
	'JAN',
	'FEB',
	'MAR',
	'APR',
	'MAY',
	'JUN',
	'JUL',
	'AUG',
	'SEP',
	'OCT',
	'NOV',
	'DEC',
] as const;

const MONTH_LABELS_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

// Static, aesthetic-only calendar panel for the dashboard action bar.
// Non-interactive by design (first iteration). Accepts an optional mockState
// override (used by `?calendarDebug=1` to preview every month/year layout).
export const DashboardCalendarPanel: FC<DashboardCalendarPanelProps> = ({
	className,
	mockState,
}) => {
	// Layout constants (hard dashboard sizing)
	const OUTER_WIDTH_PX = 662;
	const OUTER_HEIGHT_PX = 372;
	const OUTER_RADIUS_PX = 22;
	const OUTER_BG = 'rgba(164, 221, 239, 0.8)'; // #A4DDEF @ 0.8
	const OUTER_STROKE_W_PX = 1.424;

	const GRID_WIDTH_PX = 658; // hard requirement
	const COLS = 7;
	const ROWS = 6;
	const CELL_W_PX = 94; // 7 * 94 = 658
	const CELL_H_PX = 91;
	const CELL_RADIUS_PX = 10;
	const CELL_BORDER = '1px solid #E0E0E0';
	const GRID_BG = '#A3CEFF'; // shows through rounded cell corners
	const INNER_STROKE_W_PX = 1.5;

	// Active month/year + optional highlighted day (defaults to Jan 2026 — the
	// original static design baseline).
	const inMonthYear = mockState?.year ?? 2026;
	const rawMonthIndex = mockState?.monthIndex ?? 0;
	const inMonthIndex = ((rawMonthIndex % 12) + 12) % 12;
	const highlightDay = mockState?.day;
	const inMonthStart = new Date(inMonthYear, inMonthIndex, 1);
	const calendarStartDate = new Date(
		inMonthYear,
		inMonthIndex,
		1 - inMonthStart.getDay()
	);
	const monthLabel = MONTH_LABELS_UPPER[inMonthIndex];
	const monthShort = MONTH_LABELS_SHORT[inMonthIndex];
	const monthLabelStyle = {
		color: '#343434',
		fontFamily:
			'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
		fontSize: '32.733px',
		fontStyle: 'normal' as const,
		fontWeight: 600,
		lineHeight: '43.644px',
	};

	const IN_MONTH_TEXT = {
		color: '#00AFE5',
		fontFamily:
			'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
		fontSize: '12.172px',
		fontStyle: 'normal' as const,
		fontWeight: 500,
		lineHeight: '16.229px',
	};
	const OUTSIDE_MONTH_TEXT_COLOR = 'rgba(0, 0, 0, 0.22)';

	const weekdayLabel = (date: Date): string => {
		// Match screenshot abbreviations.
		const d = date.getDay();
		if (d === 0) return 'Sun';
		if (d === 1) return 'Mon';
		if (d === 2) return 'Tues';
		if (d === 3) return 'Wed';
		if (d === 4) return 'Thurs';
		if (d === 5) return 'Fri';
		return 'Sat';
	};

	const addDays = (d: Date, days: number): Date =>
		new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

	const getCellDateForGridIndex = (gridIndex: number): Date =>
		addDays(calendarStartDate, gridIndex);

	const isInPrimaryMonth = (date: Date): boolean =>
		date.getFullYear() === inMonthYear && date.getMonth() === inMonthIndex;

	// Month-specific diagonal color palettes (6-color band per month).
	const MONTH_COLOR_PALETTES = [
		// January
		['#FFFFFF', '#F5FEFF', '#E7FCFF', '#DBFAFF', '#C7EFF6', '#AEE9F2'],
		// February
		['#FFFFFF', '#F5FBFF', '#E7F5FF', '#DBF0FF', '#C7E1F6', '#AED5F2'],
		// March
		['#FFFFFF', '#F5F7FF', '#E7EDFF', '#DBE3FF', '#C7D1F6', '#AEBDF2'],
		// April
		['#FFFFFF', '#F6F5FF', '#EBE7FF', '#E0DBFF', '#CDC7F6', '#B7AEF2'],
		// May
		['#FFFFFF', '#FAF5FF', '#F3E7FF', '#ECDBFF', '#DDC7F6', '#CFAEF2'],
		// June
		['#FFFFFF', '#FFF5FF', '#FFE7FE', '#FFDBFE', '#F6C7F4', '#F2AEEF'],
		// July
		['#FFFFFF', '#FFF5F7', '#FFE7ED', '#FFDBE4', '#F6C7D2', '#F2AEBE'],
		// August
		['#FFFFFF', '#FFF9F5', '#FFF1E7', '#FFE9DB', '#F6D9C7', '#F2C9AE'],
		// September
		['#FFFFFF', '#FFFCF5', '#FFF9E7', '#FFF5DB', '#F6E9C7', '#F2E0AE'],
		// October
		['#FFFFFF', '#FDFFF5', '#FBFFE7', '#F9FFDB', '#EEF6C7', '#E6F2AE'],
		// November
		['#FFFFFF', '#F7FFF5', '#EDFFE7', '#E4FFDB', '#D2F6C7', '#BFF2AE'],
		// December
		['#FFFFFF', '#F5FFFA', '#E7FFF3', '#DBFFED', '#C7F6DE', '#AEF2D0'],
	] as const;

	const getCellBackground = (row: number, col: number): string => {
		const d = row + col;
		const palette = MONTH_COLOR_PALETTES[inMonthIndex];
		return palette[d % palette.length] ?? '#FFFFFF';
	};

	return (
		<div
			data-dashboard-calendar-panel="true"
			className={className}
			style={{
				width: `${OUTER_WIDTH_PX}px`,
				height: `${OUTER_HEIGHT_PX}px`,
				borderRadius: `${OUTER_RADIUS_PX}px`,
				overflow: 'hidden',
				backgroundColor: OUTER_BG,
				boxShadow: `inset 0 0 0 ${OUTER_STROKE_W_PX}px rgba(255, 255, 255, 0.8)`,
				padding: '2px',
				boxSizing: 'border-box',
			}}
		>
			<div
				aria-label="Dashboard calendar"
				style={{
					width: `${GRID_WIDTH_PX}px`,
					borderRadius: `${OUTER_RADIUS_PX}px`,
					// Black stroke without consuming layout space.
					boxShadow: `0 0 0 ${INNER_STROKE_W_PX}px #000000`,
					overflow: 'hidden',
					boxSizing: 'border-box',
					display: 'grid',
					gridTemplateColumns: `repeat(${COLS}, ${CELL_W_PX}px)`,
					gridTemplateRows: `repeat(${ROWS}, ${CELL_H_PX}px)`,
					gap: 0,
					alignContent: 'start',
					justifyContent: 'start',
					backgroundColor: GRID_BG,
				}}
			>
				{/* Cell 0: month label only */}
				<div
					style={{
						width: `${CELL_W_PX}px`,
						height: `${CELL_H_PX}px`,
						borderRadius: `${CELL_RADIUS_PX}px`,
						border: CELL_BORDER,
						backgroundColor: getCellBackground(0, 0),
						boxSizing: 'border-box',
						padding: '10px 10px',
						...monthLabelStyle,
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'flex-start',
					}}
				>
					{monthLabel}
				</div>

				{/* Remaining 41 day cells */}
				{Array.from({ length: ROWS * COLS - 1 }, (_, idx) => {
					const gridIndex = idx + 1;
					const row = Math.floor(gridIndex / COLS);
					const col = gridIndex % COLS;
					const date = getCellDateForGridIndex(gridIndex);
					const inPrimary = isInPrimaryMonth(date);
					const isTopRow = row === 0;
					const isFirstOfMonth =
						date.getFullYear() === inMonthYear &&
						date.getMonth() === inMonthIndex &&
						date.getDate() === 1;
					const isHighlighted =
						inPrimary && highlightDay != null && date.getDate() === highlightDay;

					const textColor = inPrimary ? IN_MONTH_TEXT.color : OUTSIDE_MONTH_TEXT_COLOR;

					let label = String(date.getDate());
					if (isTopRow) {
						label = `${weekdayLabel(date)} ${date.getDate()}`;
					}
					if (isFirstOfMonth) {
						label = `${monthShort} ${weekdayLabel(date)} 1`;
					}

					const isoKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
						date.getDate()
					).padStart(2, '0')}`;
					return (
						<div
							key={`${row}-${col}-${isoKey}`}
							style={{
								width: `${CELL_W_PX}px`,
								height: `${CELL_H_PX}px`,
								borderRadius: `${CELL_RADIUS_PX}px`,
								border: CELL_BORDER,
								backgroundColor: getCellBackground(row, col),
								boxSizing: 'border-box',
								position: 'relative',
								outline: isHighlighted ? '2px solid #00AFE5' : 'none',
								outlineOffset: isHighlighted ? '-2px' : undefined,
							}}
						>
							<div
								style={{
									position: 'absolute',
									top: '10px',
									left: '12px',
									right: '12px',
									textAlign: 'right',
									...IN_MONTH_TEXT,
									color: textColor,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									pointerEvents: 'none',
									fontWeight: isHighlighted ? 700 : IN_MONTH_TEXT.fontWeight,
								}}
							>
								{label}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default DashboardCalendarPanel;
