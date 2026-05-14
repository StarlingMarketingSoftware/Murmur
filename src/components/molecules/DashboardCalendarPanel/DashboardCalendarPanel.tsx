'use client';

import {
	FC,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
	type UIEvent,
} from 'react';

export type DashboardCalendarMockState = {
	year?: number;
	monthIndex?: number;
	day?: number;
};

type DashboardCalendarPanelProps = {
	className?: string;
	mockState?: DashboardCalendarMockState;
};

type CalendarEventDraft = {
	personName: string;
	company: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
	address: string;
};

type ActiveCalendarPopup = {
	key: string;
	date: Date;
	left: number;
	top: number;
};

type CalendarScrollbarState =
	| { visible: false; direction: null; thumbTop: number }
	| { visible: true; direction: 'up' | 'down'; thumbTop: number };

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

const MONTH_LABELS_FULL = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

const toIsoKey = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
		date.getDate()
	).padStart(2, '0')}`;

const getOrdinalSuffix = (day: number): string => {
	const lastTwo = day % 100;
	if (lastTwo >= 11 && lastTwo <= 13) return 'th';

	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

const formatCalendarDate = (date: Date): string =>
	`${MONTH_LABELS_FULL[date.getMonth()]} ${date.getDate()}${getOrdinalSuffix(
		date.getDate()
	)} ${date.getFullYear()}`;

const createDefaultEventDraft = (date: Date): CalendarEventDraft => ({
	personName: '',
	company: '',
	date: formatCalendarDate(date),
	startTime: '9 am',
	endTime: '1 pm',
	notes: '',
	address: '',
});

const parseClockMinutes = (value: string): number | null => {
	const match = value
		.trim()
		.toLowerCase()
		.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = match[2] ? Number(match[2]) : 0;
	if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
		return null;
	}

	const meridiem = match[3];
	if (meridiem) {
		if (hours < 1 || hours > 12) return null;
		if (hours === 12) hours = 0;
		if (meridiem === 'pm') hours += 12;
	} else if (hours > 23) {
		return null;
	}

	return hours * 60 + minutes;
};

const formatDurationLabel = (startTime: string, endTime: string): string => {
	const startMinutes = parseClockMinutes(startTime);
	const endMinutes = parseClockMinutes(endTime);
	if (startMinutes == null || endMinutes == null) return 'Duration';

	let durationMinutes = endMinutes - startMinutes;
	if (durationMinutes < 0) durationMinutes += 24 * 60;

	const hours = Math.floor(durationMinutes / 60);
	const minutes = durationMinutes % 60;
	if (hours > 0 && minutes === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes} min`;
};

const hasDraftContent = (draft: CalendarEventDraft): boolean =>
	Boolean(
		draft.personName.trim() ||
			draft.company.trim() ||
			draft.notes.trim() ||
			draft.address.trim()
	);

const SMOOTH_SCROLL_LERP = 0.14;
const WHEEL_SCROLL_MULTIPLIER = 1.12;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

// Aesthetic calendar panel for the dashboard action bar. Accepts an optional
// mockState override (used by `?calendarDebug=1` to preview every layout).
export const DashboardCalendarPanel: FC<DashboardCalendarPanelProps> = ({
	className,
	mockState,
}) => {
	// Layout constants (hard dashboard sizing)
	const OUTER_WIDTH_PX = 662;
	const INNER_WIDTH_PX = 654;
	const INNER_HEIGHT_PX = 373;
	const OUTER_PADDING_PX = (OUTER_WIDTH_PX - INNER_WIDTH_PX) / 2;
	const OUTER_HEIGHT_PX = INNER_HEIGHT_PX + OUTER_PADDING_PX * 2;
	const OUTER_RADIUS_PX = 22;
	const OUTER_BG = 'rgba(164, 221, 239, 0.8)'; // #A4DDEF @ 0.8
	const OUTER_STROKE_W_PX = 1.424;

	const COLS = 7;
	const ROWS = 6;
	// Each month exactly fills the inner viewport; wheel scroll snaps between months
	// rendered in the stack below.
	const CELL_H_PX = INNER_HEIGHT_PX / ROWS;
	const MONTH_GRID_HEIGHT_PX = ROWS * CELL_H_PX;
	const CELL_RADIUS_PX = 10;
	const CELL_BORDER = '1px solid #E0E0E0';
	const GRID_BG = '#A3CEFF'; // shows through rounded cell corners
	const INNER_STROKE_W_PX = 0.717;
	// Months rendered before and after the current month, enabling wheel scrolling
	// between adjacent months. 6 → half a year of history + lookahead in each direction.
	const MONTH_WINDOW_RADIUS = 6;
	const INITIAL_SCROLL_TOP_PX = MONTH_WINDOW_RADIUS * MONTH_GRID_HEIGHT_PX;
	const CURRENT_MONTH_MAX_SCROLL_TOP_PX =
		INITIAL_SCROLL_TOP_PX + MONTH_GRID_HEIGHT_PX - INNER_HEIGHT_PX;
	const TOTAL_SCROLL_HEIGHT_PX =
		(MONTH_WINDOW_RADIUS * 2 + 1) * MONTH_GRID_HEIGHT_PX;
	const MAX_SCROLL_TOP_PX = TOTAL_SCROLL_HEIGHT_PX - INNER_HEIGHT_PX;
	const SCROLLBAR_THUMB_HEIGHT_PX = 30;
	const SCROLLBAR_TRACK_HEIGHT_PX = INNER_HEIGHT_PX;
	const SCROLLBAR_TRAVEL_PX = SCROLLBAR_TRACK_HEIGHT_PX - SCROLLBAR_THUMB_HEIGHT_PX;
	const POPUP_WIDTH_PX = 295;
	const POPUP_HEIGHT_PX = 361;

	// Active month/year + optional highlighted day (defaults to Jan 2026 — the
	// original static design baseline).
	const inMonthYear = mockState?.year ?? 2026;
	const rawMonthIndex = mockState?.monthIndex ?? 0;
	const inMonthIndex = ((rawMonthIndex % 12) + 12) % 12;
	const highlightDay = mockState?.day;
	const panelRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const smoothScrollTargetRef = useRef(INITIAL_SCROLL_TOP_PX);
	const smoothScrollRafRef = useRef<number | null>(null);
	const dragStateRef = useRef<{
		direction: 'up' | 'down';
		startClientY: number;
		startScrollTop: number;
	} | null>(null);
	const [scrollTop, setScrollTop] = useState(INITIAL_SCROLL_TOP_PX);
	const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
	const [activePopup, setActivePopup] = useState<ActiveCalendarPopup | null>(null);
	const [eventDrafts, setEventDrafts] = useState<Record<string, CalendarEventDraft>>({});

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

	const getCellDateForGridIndex = (calendarGridStartDate: Date, gridIndex: number): Date =>
		addDays(calendarGridStartDate, gridIndex);

	const isInPrimaryMonth = (date: Date, year: number, monthIndex: number): boolean =>
		date.getFullYear() === year && date.getMonth() === monthIndex;

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

	const getCellBackground = (monthIndex: number, row: number, col: number): string => {
		const d = row + col;
		const palette = MONTH_COLOR_PALETTES[monthIndex];
		return palette[d % palette.length] ?? '#FFFFFF';
	};

	const getScrollbarState = (nextScrollTop: number): CalendarScrollbarState => {
		if (nextScrollTop < INITIAL_SCROLL_TOP_PX - 1) {
			const progress = clamp(
				(INITIAL_SCROLL_TOP_PX - nextScrollTop) / INITIAL_SCROLL_TOP_PX,
				0,
				1
			);

			return {
				visible: true,
				direction: 'up',
				thumbTop: (1 - progress) * SCROLLBAR_TRAVEL_PX,
			};
		}

		if (nextScrollTop > CURRENT_MONTH_MAX_SCROLL_TOP_PX + 1) {
			const maxBeyondCurrent = Math.max(
				MAX_SCROLL_TOP_PX - CURRENT_MONTH_MAX_SCROLL_TOP_PX,
				1
			);
			const progress = clamp(
				(nextScrollTop - CURRENT_MONTH_MAX_SCROLL_TOP_PX) / maxBeyondCurrent,
				0,
				1
			);

			return {
				visible: true,
				direction: 'down',
				thumbTop: progress * SCROLLBAR_TRAVEL_PX,
			};
		}

		return { visible: false, direction: null, thumbTop: 0 };
	};

	const scrollbarState = getScrollbarState(scrollTop);

	useLayoutEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		if (smoothScrollRafRef.current != null) {
			cancelAnimationFrame(smoothScrollRafRef.current);
			smoothScrollRafRef.current = null;
		}
		smoothScrollTargetRef.current = INITIAL_SCROLL_TOP_PX;
		container.scrollTop = INITIAL_SCROLL_TOP_PX;
		setScrollTop(INITIAL_SCROLL_TOP_PX);
	}, [INITIAL_SCROLL_TOP_PX, inMonthIndex, inMonthYear]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		// Single-month mode (no internal scroll): don't intercept wheel events.
		if (MAX_SCROLL_TOP_PX <= 0) return;

		const animateSmoothScroll = () => {
			const activeContainer = scrollContainerRef.current;
			if (!activeContainer) {
				smoothScrollRafRef.current = null;
				return;
			}

			const distance = smoothScrollTargetRef.current - activeContainer.scrollTop;
			if (Math.abs(distance) < 0.5) {
				activeContainer.scrollTop = smoothScrollTargetRef.current;
				smoothScrollRafRef.current = null;
				return;
			}

			activeContainer.scrollTop += distance * SMOOTH_SCROLL_LERP;
			smoothScrollRafRef.current = requestAnimationFrame(animateSmoothScroll);
		};

		const handleWheel = (event: WheelEvent) => {
			if (event.ctrlKey) return;

			event.preventDefault();
			event.stopPropagation();

			if (smoothScrollRafRef.current == null) {
				smoothScrollTargetRef.current = container.scrollTop;
			}

			smoothScrollTargetRef.current = clamp(
				smoothScrollTargetRef.current + event.deltaY * WHEEL_SCROLL_MULTIPLIER,
				0,
				MAX_SCROLL_TOP_PX
			);

			if (smoothScrollRafRef.current == null) {
				smoothScrollRafRef.current = requestAnimationFrame(animateSmoothScroll);
			}
		};

		container.addEventListener('wheel', handleWheel, { passive: false });

		return () => {
			container.removeEventListener('wheel', handleWheel);
			if (smoothScrollRafRef.current != null) {
				cancelAnimationFrame(smoothScrollRafRef.current);
				smoothScrollRafRef.current = null;
			}
		};
	}, [MAX_SCROLL_TOP_PX]);

	useEffect(() => {
		if (!isDraggingScrollbar) return;

		const handleMouseMove = (event: MouseEvent) => {
			const container = scrollContainerRef.current;
			const dragState = dragStateRef.current;
			if (!container || !dragState) return;

			const dragDeltaY = event.clientY - dragState.startClientY;
			const directionRange =
				dragState.direction === 'down'
					? Math.max(MAX_SCROLL_TOP_PX - CURRENT_MONTH_MAX_SCROLL_TOP_PX, 1)
					: Math.max(INITIAL_SCROLL_TOP_PX, 1);
			const scrollDelta = (dragDeltaY / SCROLLBAR_TRAVEL_PX) * directionRange;

			if (dragState.direction === 'down') {
				const startBeyondCurrent = Math.max(
					dragState.startScrollTop - CURRENT_MONTH_MAX_SCROLL_TOP_PX,
					0
				);
				container.scrollTop =
					CURRENT_MONTH_MAX_SCROLL_TOP_PX +
					clamp(startBeyondCurrent + scrollDelta, 0, directionRange);
			} else {
				const startBeyondCurrent = Math.max(
					INITIAL_SCROLL_TOP_PX - dragState.startScrollTop,
					0
				);
				container.scrollTop =
					INITIAL_SCROLL_TOP_PX -
					clamp(startBeyondCurrent - scrollDelta, 0, directionRange);
			}
		};

		const handleMouseUp = () => {
			dragStateRef.current = null;
			setIsDraggingScrollbar(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [
		CURRENT_MONTH_MAX_SCROLL_TOP_PX,
		INITIAL_SCROLL_TOP_PX,
		MAX_SCROLL_TOP_PX,
		SCROLLBAR_TRAVEL_PX,
		isDraggingScrollbar,
	]);

	const handleCalendarScroll = (event: UIEvent<HTMLDivElement>) => {
		setScrollTop(event.currentTarget.scrollTop);
	};

	const handleScrollbarThumbMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (!scrollbarState.visible) return;

		event.preventDefault();
		event.stopPropagation();
		if (smoothScrollRafRef.current != null) {
			cancelAnimationFrame(smoothScrollRafRef.current);
			smoothScrollRafRef.current = null;
		}
		smoothScrollTargetRef.current = scrollTop;
		dragStateRef.current = {
			direction: scrollbarState.direction,
			startClientY: event.clientY,
			startScrollTop: scrollTop,
		};
		setIsDraggingScrollbar(true);
	};

	const handleScrollbarTrackMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
		const container = scrollContainerRef.current;
		if (!container || !scrollbarState.visible || event.target !== event.currentTarget) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const clickProgress = clamp((event.clientY - rect.top) / rect.height, 0, 1);

		if (scrollbarState.direction === 'down') {
			const maxBeyondCurrent = Math.max(
				MAX_SCROLL_TOP_PX - CURRENT_MONTH_MAX_SCROLL_TOP_PX,
				1
			);
			smoothScrollTargetRef.current =
				CURRENT_MONTH_MAX_SCROLL_TOP_PX + clickProgress * maxBeyondCurrent;
			container.scrollTop = CURRENT_MONTH_MAX_SCROLL_TOP_PX + clickProgress * maxBeyondCurrent;
		} else {
			smoothScrollTargetRef.current =
				INITIAL_SCROLL_TOP_PX - (1 - clickProgress) * INITIAL_SCROLL_TOP_PX;
			container.scrollTop = INITIAL_SCROLL_TOP_PX - (1 - clickProgress) * INITIAL_SCROLL_TOP_PX;
		}
	};

	const activeDraft = activePopup
		? eventDrafts[activePopup.key] ?? createDefaultEventDraft(activePopup.date)
		: null;
	const activeDurationLabel = activeDraft
		? formatDurationLabel(activeDraft.startTime, activeDraft.endTime)
		: 'Duration';

	const updateActiveDraft = <K extends keyof CalendarEventDraft>(
		field: K,
		value: CalendarEventDraft[K]
	) => {
		if (!activePopup) return;

		const { key, date } = activePopup;
		setEventDrafts((drafts) => ({
			...drafts,
			[key]: {
				...(drafts[key] ?? createDefaultEventDraft(date)),
				[field]: value,
			},
		}));
	};

	const openEventPopup = (
		event: ReactMouseEvent<HTMLButtonElement>,
		key: string,
		date: Date
	) => {
		const panelRect = panelRef.current?.getBoundingClientRect();
		const cellRect = event.currentTarget.getBoundingClientRect();
		const rawLeft = panelRect ? cellRect.left - panelRect.left : OUTER_PADDING_PX;
		const rawTop = panelRect ? cellRect.top - panelRect.top : OUTER_PADDING_PX;

		setActivePopup({
			key,
			date,
			left: clamp(rawLeft, 4, OUTER_WIDTH_PX - POPUP_WIDTH_PX - 4),
			top: clamp(rawTop, 4, OUTER_HEIGHT_PX - POPUP_HEIGHT_PX - 4),
		});
	};

	const popupInputBaseStyle: CSSProperties = {
		width: '100%',
		minWidth: 0,
		border: 0,
		outline: 'none',
		background: 'transparent',
		boxShadow: 'none',
		fontFamily:
			'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
	};

	const popupTextStyle: CSSProperties = {
		fontFamily:
			'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
		fontStyle: 'normal',
	};

	const renderMonthGrid = (monthOffset: number) => {
		const monthStart = new Date(inMonthYear, inMonthIndex + monthOffset, 1);
		const gridMonthYear = monthStart.getFullYear();
		const gridMonthIndex = monthStart.getMonth();
		const gridCalendarStartDate = new Date(
			gridMonthYear,
			gridMonthIndex,
			1 - monthStart.getDay()
		);
		const gridMonthLabel = MONTH_LABELS_UPPER[gridMonthIndex];
		const gridMonthShort = MONTH_LABELS_SHORT[gridMonthIndex];

		return (
			<div
				key={`${gridMonthYear}-${gridMonthIndex}`}
				style={{
					width: '100%',
					height: `${MONTH_GRID_HEIGHT_PX}px`,
					display: 'grid',
					gridTemplateColumns: `repeat(${COLS}, 1fr)`,
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
						width: '100%',
						height: `${CELL_H_PX}px`,
						borderRadius: `${CELL_RADIUS_PX}px`,
						border: CELL_BORDER,
						backgroundColor: getCellBackground(gridMonthIndex, 0, 0),
						boxSizing: 'border-box',
						padding: '9px 9px',
						...monthLabelStyle,
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'flex-start',
					}}
				>
					{gridMonthLabel}
				</div>

				{/* Remaining 41 day cells */}
				{Array.from({ length: ROWS * COLS - 1 }, (_, idx) => {
					const gridIndex = idx + 1;
					const row = Math.floor(gridIndex / COLS);
					const col = gridIndex % COLS;
					const date = getCellDateForGridIndex(gridCalendarStartDate, gridIndex);
					const inPrimary = isInPrimaryMonth(date, gridMonthYear, gridMonthIndex);
					const isTopRow = row === 0;
					const isFirstOfMonth =
						date.getFullYear() === gridMonthYear &&
						date.getMonth() === gridMonthIndex &&
						date.getDate() === 1;
					const isHighlighted =
						monthOffset === 0 &&
						inPrimary &&
						highlightDay != null &&
						date.getDate() === highlightDay;

					const isoKey = toIsoKey(date);
					const draft = eventDrafts[isoKey];
					const defaultDraft = createDefaultEventDraft(date);
					const showDraftSummary =
						draft != null &&
						(hasDraftContent(draft) ||
							draft.date !== defaultDraft.date ||
							draft.startTime.trim() !== defaultDraft.startTime ||
							draft.endTime.trim() !== defaultDraft.endTime);
					const textColor = showDraftSummary
						? '#FFFFFF'
						: inPrimary
							? IN_MONTH_TEXT.color
							: OUTSIDE_MONTH_TEXT_COLOR;
					const cellBackground = showDraftSummary
						? '#F14048'
						: getCellBackground(gridMonthIndex, row, col);

					let label = String(date.getDate());
					if (isTopRow) {
						label = `${weekdayLabel(date)} ${date.getDate()}`;
					}
					if (isFirstOfMonth) {
						label = `${gridMonthShort} ${weekdayLabel(date)} 1`;
					}

					return (
						<button
							key={`${row}-${col}-${isoKey}`}
							type="button"
							aria-label={`Edit event for ${formatCalendarDate(date)}`}
							onClick={(event) => openEventPopup(event, isoKey, date)}
							style={{
								width: '100%',
								height: `${CELL_H_PX}px`,
								borderRadius: `${CELL_RADIUS_PX}px`,
								border: showDraftSummary ? '1.175px solid #FFFFFF' : CELL_BORDER,
								backgroundColor: cellBackground,
								boxSizing: 'border-box',
								position: 'relative',
								padding: 0,
								cursor: 'pointer',
								font: 'inherit',
								appearance: 'none',
								WebkitAppearance: 'none',
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
							{showDraftSummary && (
								<div
									style={{
										position: 'absolute',
										left: '9px',
										right: '8px',
										top: '33px',
										textAlign: 'left',
										color: '#FFFFFF',
										fontFamily:
											'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
										fontSize: '12.25px',
										fontWeight: 600,
										lineHeight: '13.25px',
										overflow: 'hidden',
										pointerEvents: 'none',
									}}
								>
									<div
										style={{
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{draft.personName.trim() || draft.company.trim() || 'Untitled'}
									</div>
									<div
										style={{
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{draft.startTime.trim()}-{draft.endTime.trim()}
									</div>
								</div>
							)}
						</button>
					);
				})}
			</div>
		);
	};

	return (
		<div
			ref={panelRef}
			data-dashboard-calendar-panel="true"
			className={className}
			style={{
				width: `${OUTER_WIDTH_PX}px`,
				height: `${OUTER_HEIGHT_PX}px`,
				borderRadius: `${OUTER_RADIUS_PX}px`,
				overflow: 'visible',
				backgroundColor: OUTER_BG,
				boxShadow: `inset 0 0 0 ${OUTER_STROKE_W_PX}px rgba(255, 255, 255, 0.8)`,
				padding: `${OUTER_PADDING_PX}px`,
				boxSizing: 'border-box',
				position: 'relative',
			}}
		>
			<div
				aria-label="Dashboard calendar"
				style={{
					width: `${INNER_WIDTH_PX}px`,
					height: `${INNER_HEIGHT_PX}px`,
					borderRadius: `${OUTER_RADIUS_PX}px`,
					border: `${INNER_STROKE_W_PX}px solid #000000`,
					overflow: 'hidden',
					boxSizing: 'border-box',
					backgroundColor: GRID_BG,
				}}
			>
				<div
					ref={scrollContainerRef}
					onScroll={handleCalendarScroll}
					style={
						{
							width: '100%',
							height: '100%',
							overflowY: 'hidden',
							overflowX: 'hidden',
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
							overscrollBehavior: 'contain',
							WebkitOverflowScrolling: 'touch',
							touchAction: 'pan-y',
						} as CSSProperties
					}
				>
					<div
						style={{
							width: '100%',
							height: `${TOTAL_SCROLL_HEIGHT_PX}px`,
						}}
					>
						{Array.from({ length: MONTH_WINDOW_RADIUS * 2 + 1 }, (_, index) =>
							renderMonthGrid(index - MONTH_WINDOW_RADIUS)
						)}
					</div>
				</div>
			</div>

			{activePopup && activeDraft && (
				<div
					aria-label="Calendar event editor"
					style={{
						position: 'absolute',
						left: `${activePopup.left}px`,
						top: `${activePopup.top}px`,
						width: `${POPUP_WIDTH_PX}px`,
						height: `${POPUP_HEIGHT_PX}px`,
						borderRadius: '9px',
						border: '1.076px solid #FFFFFF',
						background: 'rgba(229, 96, 98, 0.8)',
						boxSizing: 'border-box',
						overflow: 'hidden',
						zIndex: 45,
					}}
				>
					<div
						style={{
							position: 'absolute',
							left: '12px',
							top: '9px',
							right: '12px',
							height: '44px',
							display: 'flex',
							flexDirection: 'column',
							gap: '2px',
						}}
					>
						<input
							aria-label="Person or thing"
							placeholder="Name"
							value={activeDraft.personName}
							onChange={(event) => updateActiveDraft('personName', event.target.value)}
							style={{
								...popupInputBaseStyle,
								...popupTextStyle,
								height: '21px',
								color: '#FFFFFF',
								fontSize: '16px',
								fontWeight: 700,
								lineHeight: '19px',
							}}
						/>
						<input
							aria-label="Company"
							placeholder="Company"
							value={activeDraft.company}
							onChange={(event) => updateActiveDraft('company', event.target.value)}
							style={{
								...popupInputBaseStyle,
								...popupTextStyle,
								height: '21px',
								color: '#FFFFFF',
								fontSize: '15px',
								fontWeight: 400,
								lineHeight: '18px',
							}}
						/>
					</div>

					<div
						style={{
							position: 'absolute',
							left: '1px',
							top: '59px',
							width: '293px',
							height: '23px',
							background: '#FFEFF0',
							boxSizing: 'border-box',
							padding: '0 11px',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<input
							aria-label="Event date"
							value={activeDraft.date}
							onChange={(event) => updateActiveDraft('date', event.target.value)}
							style={{
								...popupInputBaseStyle,
								...popupTextStyle,
								color: '#000000',
								fontSize: '16px',
								fontWeight: 700,
								lineHeight: '20px',
							}}
						/>
					</div>

					<div
						style={{
							position: 'absolute',
							left: '1px',
							top: '84px',
							width: '293px',
							height: '23px',
							background: '#FFEFF0',
							boxSizing: 'border-box',
							padding: '0 12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<div
							style={{
								height: '17px',
								borderRadius: '7px',
								background: '#8BF0F7',
								padding: '0 5px',
								display: 'flex',
								alignItems: 'center',
								gap: '4px',
								boxSizing: 'border-box',
							}}
						>
							<input
								aria-label="Start time"
								value={activeDraft.startTime}
								onChange={(event) => updateActiveDraft('startTime', event.target.value)}
								style={{
									...popupInputBaseStyle,
									...popupTextStyle,
									width: '40px',
									color: '#000000',
									fontSize: '16px',
									fontWeight: 500,
									lineHeight: '16px',
									textAlign: 'center',
								}}
							/>
							<span
								style={{
									...popupTextStyle,
									color: '#000000',
									fontSize: '16px',
									fontWeight: 500,
									lineHeight: '16px',
								}}
							>
								-
							</span>
							<input
								aria-label="End time"
								value={activeDraft.endTime}
								onChange={(event) => updateActiveDraft('endTime', event.target.value)}
								style={{
									...popupInputBaseStyle,
									...popupTextStyle,
									width: '40px',
									color: '#000000',
									fontSize: '16px',
									fontWeight: 500,
									lineHeight: '16px',
									textAlign: 'center',
								}}
							/>
						</div>
						<div
							aria-live="polite"
							style={{
								...popupTextStyle,
								color: '#000000',
								fontSize: '16px',
								fontWeight: 700,
								lineHeight: '20px',
								minWidth: '74px',
								textAlign: 'center',
							}}
						>
							{activeDurationLabel}
						</div>
					</div>

					<div
						style={{
							position: 'absolute',
							left: '9.5px',
							top: '121px',
							width: '276px',
							height: '29px',
							borderRadius: '7.534px',
							border: '1.076px solid #FFFFFF',
							boxSizing: 'border-box',
							padding: '0 12px',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<input
							aria-label="Event notes"
							placeholder="+ Notes"
							value={activeDraft.notes}
							onChange={(event) => updateActiveDraft('notes', event.target.value)}
							style={{
								...popupInputBaseStyle,
								...popupTextStyle,
								color: '#FFFFFF',
								fontSize: '16px',
								fontWeight: 400,
								lineHeight: '20px',
							}}
						/>
					</div>

					<div
						style={{
							position: 'absolute',
							left: '5.5px',
							top: '164px',
							width: '284.144px',
							height: '149.606px',
							borderRadius: '9.687px 9.687px 0 0',
							border: '1.643px solid #000000',
							boxSizing: 'border-box',
							overflow: 'hidden',
							background: '#FFFFFF',
						}}
					>
						<div
							style={{
								height: '27px',
								background: '#FFFFFF',
								borderBottom: '1.643px solid #000000',
								boxSizing: 'border-box',
								padding: '0 10px',
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<input
								aria-label="Event address"
								placeholder="Address"
								value={activeDraft.address}
								onChange={(event) => updateActiveDraft('address', event.target.value)}
								style={{
									...popupInputBaseStyle,
									...popupTextStyle,
									color: '#000000',
									fontSize: '13px',
									fontWeight: 700,
									lineHeight: '16px',
								}}
							/>
						</div>
						<div
							aria-hidden="true"
							style={{
								position: 'relative',
								height: 'calc(100% - 27px)',
								background:
									'linear-gradient(135deg, rgba(63, 191, 214, 0.9) 0%, rgba(63, 191, 214, 0.9) 28%, transparent 28%), linear-gradient(35deg, rgba(178, 233, 207, 0.95) 0%, rgba(178, 233, 207, 0.95) 68%, rgba(134, 219, 185, 0.95) 68%), linear-gradient(110deg, transparent 0 47%, rgba(255, 255, 255, 0.55) 47% 50%, transparent 50%), #B1E6CE',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: '50%',
									top: '34px',
									width: '28px',
									height: '28px',
									transform: 'translateX(-50%) rotate(45deg)',
									borderRadius: '50% 50% 50% 0',
									background: '#F56E75',
									border: '2px solid #000000',
									boxSizing: 'border-box',
								}}
							/>
							<div
								style={{
									position: 'absolute',
									left: '50%',
									top: '42px',
									width: '10px',
									height: '10px',
									transform: 'translateX(-50%)',
									borderRadius: '999px',
									background: '#FFFFFF',
									border: '2px solid #000000',
									boxSizing: 'border-box',
								}}
							/>
							<div
								style={{
									position: 'absolute',
									left: 0,
									right: 0,
									bottom: '17px',
									textAlign: 'center',
									...popupTextStyle,
									color: '#000000',
									fontSize: '12px',
									fontWeight: 600,
									lineHeight: '14px',
								}}
							>
								Map preview later
							</div>
						</div>
					</div>
				</div>
			)}

			{scrollbarState.visible && (
				<div
					style={{
						position: 'absolute',
						top: `${OUTER_PADDING_PX}px`,
						right: '-4px',
						width: '2px',
						height: `${SCROLLBAR_TRACK_HEIGHT_PX}px`,
						backgroundColor: 'transparent',
						cursor: 'pointer',
						zIndex: 50,
					}}
					onMouseDown={handleScrollbarTrackMouseDown}
				>
					<div
						style={{
							position: 'absolute',
							left: 0,
							width: '2px',
							height: `${SCROLLBAR_THUMB_HEIGHT_PX}px`,
							transform: `translateY(${scrollbarState.thumbTop}px)`,
							backgroundColor: '#000000',
							cursor: isDraggingScrollbar ? 'grabbing' : 'grab',
							willChange: 'transform',
						}}
						onMouseDown={handleScrollbarThumbMouseDown}
					/>
				</div>
			)}
		</div>
	);
};

export default DashboardCalendarPanel;
