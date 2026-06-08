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
import { createPortal } from 'react-dom';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { DashboardCalendarPopupLocation } from './DashboardCalendarPopupLocation';

export type DashboardCalendarMockState = {
	year?: number;
	monthIndex?: number;
	day?: number;
};

type DashboardCalendarPanelProps = {
	className?: string;
	frameless?: boolean;
	mockState?: DashboardCalendarMockState;
	onDateSelect?: (date: Date, event: ReactMouseEvent<HTMLButtonElement>) => void;
	showFullMonth?: boolean;
};

type CalendarEventDraft = {
	personName: string;
	company: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
	address: string;
	placeId: string | null;
	lat: number | null;
	lng: number | null;
	drivingDuration: string | null;
};

type ActiveCalendarPopup = {
	key: string;
	date: Date;
	// Viewport-relative coordinates — popup renders via portal with position: fixed.
	left: number;
	top: number;
	placement: 'right' | 'left';
};

type CalendarScrollbarState =
	| { visible: false; direction: null; thumbTop: number }
	| { visible: true; direction: 'up' | 'down'; thumbTop: number };

type TimeDropdownField = 'startTime' | 'endTime';

type TimeOption = {
	label: string;
	minutes: number;
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

const TIME_OPTIONS: TimeOption[] = Array.from({ length: 24 }, (_, index) => {
	const totalMinutes = index * 60;
	const hours24 = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const hours12 = hours24 % 12 || 12;
	const meridiem = hours24 < 12 ? 'am' : 'pm';
	const minuteLabel = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;

	return {
		label: `${hours12}${minuteLabel} ${meridiem}`,
		minutes: totalMinutes,
	};
});

const createDefaultEventDraft = (date: Date): CalendarEventDraft => ({
	personName: '',
	company: '',
	date: formatCalendarDate(date),
	startTime: '9 am',
	endTime: '1 pm',
	notes: '',
	address: '',
	placeId: null,
	lat: null,
	lng: null,
	drivingDuration: null,
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

const getSameDayTimeRangeError = (startTime: string, endTime: string): string | null => {
	const startMinutes = parseClockMinutes(startTime);
	const endMinutes = parseClockMinutes(endTime);
	if (startMinutes == null || endMinutes == null) return null;

	return endMinutes <= startMinutes ? 'Time range must stay within one day' : null;
};

const formatDurationLabel = (startTime: string, endTime: string): string => {
	const startMinutes = parseClockMinutes(startTime);
	const endMinutes = parseClockMinutes(endTime);
	if (startMinutes == null || endMinutes == null) return 'Duration';

	const durationMinutes = endMinutes - startMinutes;
	if (durationMinutes <= 0) return 'Pick Valid Time';

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
// Quiet period after the last wheel event before we ease to the nearest month boundary.
const WHEEL_SNAP_DELAY_MS = 150;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

// Aesthetic calendar panel for the dashboard action bar. Accepts an optional
// mockState override (used by `?calendarDebug=1` to preview every layout).
export const DashboardCalendarPanel: FC<DashboardCalendarPanelProps> = ({
	className,
	frameless = false,
	mockState,
	onDateSelect,
	showFullMonth = false,
}) => {
	// Layout constants (hard dashboard sizing)
	const COLS = 7;
	const ROWS = 6;
	const CELL_W_PX = 94.542;
	const CELL_H_PX = 91.224;
	const INNER_WIDTH_PX = COLS * CELL_W_PX;
	// Default dashboard viewport shows ~4 rows plus a sliver of row 5; compact venue
	// usage can opt into the full six-row month while keeping the same calendar UI.
	const INNER_HEIGHT_PX = showFullMonth ? ROWS * CELL_H_PX : 373;
	const OUTER_PADDING_PX = 4;
	const OUTER_WIDTH_PX = INNER_WIDTH_PX + OUTER_PADDING_PX * 2;
	const OUTER_HEIGHT_PX = INNER_HEIGHT_PX + OUTER_PADDING_PX * 2;
	const OUTER_RADIUS_PX = 22;
	const OUTER_BG = 'rgba(164, 221, 239, 0.8)'; // #A4DDEF @ 0.8
	const OUTER_STROKE_W_PX = 1.424;

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
	const TOTAL_SCROLL_HEIGHT_PX = (MONTH_WINDOW_RADIUS * 2 + 1) * MONTH_GRID_HEIGHT_PX;
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
	// Highlight reflects today's date. In debug mode, mockState stands in for "today"
	// so previews of arbitrary dates exercise the same highlight code path.
	const effectiveToday =
		mockState?.year != null && mockState?.monthIndex != null && mockState?.day != null
			? new Date(mockState.year, ((mockState.monthIndex % 12) + 12) % 12, mockState.day)
			: new Date();
	const panelRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const popupPersonNameInputRef = useRef<HTMLInputElement>(null);
	const timePickerRef = useRef<HTMLDivElement>(null);
	const timeDropdownMenuRef = useRef<HTMLDivElement>(null);
	const smoothScrollTargetRef = useRef(INITIAL_SCROLL_TOP_PX);
	const smoothScrollRafRef = useRef<number | null>(null);
	const dragStateRef = useRef<{
		direction: 'up' | 'down';
		startClientY: number;
		startScrollTop: number;
	} | null>(null);
	const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [scrollTop, setScrollTop] = useState(INITIAL_SCROLL_TOP_PX);
	const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
	const [activePopup, setActivePopup] = useState<ActiveCalendarPopup | null>(null);
	const [activeTimeDropdownField, setActiveTimeDropdownField] =
		useState<TimeDropdownField | null>(null);
	const [timeRangeError, setTimeRangeError] = useState<string | null>(null);
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

	const getCellDateForGridIndex = (
		calendarGridStartDate: Date,
		gridIndex: number
	): Date => addDays(calendarGridStartDate, gridIndex);

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

	// Gently align the smooth-scroll target with the nearest row boundary, so the
	// calendar settles on a clean week-row after wheel/drag input finishes.
	const snapToNearestRow = () => {
		if (MAX_SCROLL_TOP_PX <= 0 || CELL_H_PX <= 0) return;
		const container = scrollContainerRef.current;
		if (!container) return;

		const reference =
			smoothScrollRafRef.current != null
				? smoothScrollTargetRef.current
				: container.scrollTop;
		const snapped = clamp(
			Math.round(reference / CELL_H_PX) * CELL_H_PX,
			0,
			MAX_SCROLL_TOP_PX
		);
		if (Math.abs(snapped - reference) < 0.5) return;

		smoothScrollTargetRef.current = snapped;
		if (smoothScrollRafRef.current == null) {
			smoothScrollRafRef.current = requestAnimationFrame(animateSmoothScroll);
		}
	};

	useLayoutEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		if (smoothScrollRafRef.current != null) {
			cancelAnimationFrame(smoothScrollRafRef.current);
			smoothScrollRafRef.current = null;
		}
		if (wheelSnapTimeoutRef.current != null) {
			clearTimeout(wheelSnapTimeoutRef.current);
			wheelSnapTimeoutRef.current = null;
		}
		smoothScrollTargetRef.current = INITIAL_SCROLL_TOP_PX;
		container.scrollTop = INITIAL_SCROLL_TOP_PX;
		setScrollTop(INITIAL_SCROLL_TOP_PX);
	}, [INITIAL_SCROLL_TOP_PX, INNER_HEIGHT_PX, inMonthIndex, inMonthYear]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		// If there is no internal scroll capacity, leave wheel events alone.
		if (MAX_SCROLL_TOP_PX <= 0) return;

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

			if (wheelSnapTimeoutRef.current != null) {
				clearTimeout(wheelSnapTimeoutRef.current);
			}
			wheelSnapTimeoutRef.current = setTimeout(() => {
				wheelSnapTimeoutRef.current = null;
				snapToNearestRow();
			}, WHEEL_SNAP_DELAY_MS);
		};

		container.addEventListener('wheel', handleWheel, { passive: false });

		return () => {
			container.removeEventListener('wheel', handleWheel);
			if (smoothScrollRafRef.current != null) {
				cancelAnimationFrame(smoothScrollRafRef.current);
				smoothScrollRafRef.current = null;
			}
			if (wheelSnapTimeoutRef.current != null) {
				clearTimeout(wheelSnapTimeoutRef.current);
				wheelSnapTimeoutRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
			const container = scrollContainerRef.current;
			if (container) {
				smoothScrollTargetRef.current = container.scrollTop;
			}
			dragStateRef.current = null;
			setIsDraggingScrollbar(false);
			snapToNearestRow();
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
		// The dependency list covers the layout constants used by snapToNearestRow.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		CURRENT_MONTH_MAX_SCROLL_TOP_PX,
		INITIAL_SCROLL_TOP_PX,
		MAX_SCROLL_TOP_PX,
		SCROLLBAR_TRAVEL_PX,
		isDraggingScrollbar,
	]);

	// While the popup is open: dismiss on outside mousedown, Escape, or any window-level
	// scroll/resize (the popup anchors to a cell that may have moved).
	useEffect(() => {
		if (!activePopup) return;

		const handleMouseDown = (event: MouseEvent) => {
			const popup = popupRef.current;
			if (!popup) return;
			const target = event.target as Node | null;
			if (!target) return;
			const eventPath = event.composedPath();
			if (popup.contains(target) || eventPath.includes(popup)) return;
			// Switching to a different cell? Let its click handler take over instead of
			// closing first (avoids a single-frame flash between popups).
			const panel = panelRef.current;
			if (panel && panel.contains(target)) {
				const targetEl = target as HTMLElement;
				if (targetEl.closest('button[data-dashboard-calendar-cell="true"]')) {
					return;
				}
			}
			setActiveTimeDropdownField(null);
			setActivePopup(null);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				if (activeTimeDropdownField) {
					setActiveTimeDropdownField(null);
					return;
				}
				setActivePopup(null);
			}
		};

		const handleDismiss = () => {
			setActiveTimeDropdownField(null);
			setActivePopup(null);
		};

		const handleScrollDismiss = (event: Event) => {
			const target = event.target as Node | null;
			if (target && popupRef.current?.contains(target)) return;
			handleDismiss();
		};

		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		window.addEventListener('resize', handleDismiss);
		// Capture-phase scroll listener catches scroll on any ancestor (including the
		// calendar's internal scroll container during wheel-snap between months), while
		// allowing internal popup controls like the time dropdown to scroll normally.
		window.addEventListener('scroll', handleScrollDismiss, true);

		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('resize', handleDismiss);
			window.removeEventListener('scroll', handleScrollDismiss, true);
		};
	}, [activePopup, activeTimeDropdownField]);

	useEffect(() => {
		if (!activeTimeDropdownField) return;

		const handleMouseDown = (event: MouseEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (timePickerRef.current?.contains(target)) return;
			setActiveTimeDropdownField(null);
		};

		document.addEventListener('mousedown', handleMouseDown);
		return () => document.removeEventListener('mousedown', handleMouseDown);
	}, [activeTimeDropdownField]);

	// Focus the name input when a popup opens.
	useEffect(() => {
		if (!activePopup) return;
		const id = requestAnimationFrame(() => {
			popupPersonNameInputRef.current?.focus();
		});
		return () => cancelAnimationFrame(id);
	}, [activePopup]);

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
		if (!container || !scrollbarState.visible || event.target !== event.currentTarget)
			return;

		const rect = event.currentTarget.getBoundingClientRect();
		const clickProgress = clamp((event.clientY - rect.top) / rect.height, 0, 1);

		if (scrollbarState.direction === 'down') {
			const maxBeyondCurrent = Math.max(
				MAX_SCROLL_TOP_PX - CURRENT_MONTH_MAX_SCROLL_TOP_PX,
				1
			);
			smoothScrollTargetRef.current =
				CURRENT_MONTH_MAX_SCROLL_TOP_PX + clickProgress * maxBeyondCurrent;
			container.scrollTop =
				CURRENT_MONTH_MAX_SCROLL_TOP_PX + clickProgress * maxBeyondCurrent;
		} else {
			smoothScrollTargetRef.current =
				INITIAL_SCROLL_TOP_PX - (1 - clickProgress) * INITIAL_SCROLL_TOP_PX;
			container.scrollTop =
				INITIAL_SCROLL_TOP_PX - (1 - clickProgress) * INITIAL_SCROLL_TOP_PX;
		}

		snapToNearestRow();
	};

	const activeDraft = activePopup
		? (eventDrafts[activePopup.key] ?? createDefaultEventDraft(activePopup.date))
		: null;
	const activeTimeRangeError = activeDraft
		? getSameDayTimeRangeError(activeDraft.startTime, activeDraft.endTime)
		: null;
	const visibleTimeRangeError = activeTimeRangeError ?? timeRangeError;
	const hasTimeRangeError = visibleTimeRangeError != null;
	const activeDurationLabel = activeDraft
		? hasTimeRangeError
			? 'Pick Valid Time'
			: formatDurationLabel(activeDraft.startTime, activeDraft.endTime)
		: 'Duration';

	useLayoutEffect(() => {
		if (!activeTimeDropdownField) return;

		const rafId = requestAnimationFrame(() => {
			const selected = timeDropdownMenuRef.current?.querySelector(
				'[data-selected-time="true"]'
			) as HTMLElement | null;
			selected?.scrollIntoView({ block: 'center' });
		});

		return () => cancelAnimationFrame(rafId);
	}, [activeTimeDropdownField, activeDraft?.endTime, activeDraft?.startTime]);

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

	const updateActiveDraftFields = (partial: Partial<CalendarEventDraft>) => {
		if (!activePopup) return;
		const { key, date } = activePopup;
		setEventDrafts((drafts) => ({
			...drafts,
			[key]: {
				...(drafts[key] ?? createDefaultEventDraft(date)),
				...partial,
			},
		}));
	};

	const getAdjustedEndOption = (
		startMinutes: number,
		draft: CalendarEventDraft
	): TimeOption | null => {
		const laterOptions = TIME_OPTIONS.filter((option) => option.minutes > startMinutes);
		if (laterOptions.length === 0) return null;

		const currentStartMinutes = parseClockMinutes(draft.startTime);
		const currentEndMinutes = parseClockMinutes(draft.endTime);
		const currentDurationMinutes =
			currentStartMinutes != null &&
			currentEndMinutes != null &&
			currentEndMinutes > currentStartMinutes
				? currentEndMinutes - currentStartMinutes
				: 60;

		return (
			laterOptions.find(
				(option) => option.minutes >= startMinutes + currentDurationMinutes
			) ?? laterOptions[laterOptions.length - 1]
		);
	};

	const getTimeChoiceError = (
		field: TimeDropdownField,
		option: TimeOption,
		draft: CalendarEventDraft
	): string | null => {
		if (field === 'startTime') {
			return getAdjustedEndOption(option.minutes, draft) == null
				? 'Start must leave room for an end time'
				: null;
		}

		const startMinutes = parseClockMinutes(draft.startTime);
		return startMinutes != null && option.minutes <= startMinutes
			? 'End must be after start'
			: null;
	};

	const selectTimeOption = (field: TimeDropdownField, option: TimeOption) => {
		if (!activeDraft) return;

		const nextError = getTimeChoiceError(field, option, activeDraft);
		if (nextError) {
			setTimeRangeError(nextError);
			return;
		}

		setTimeRangeError(null);
		if (field === 'startTime') {
			const currentEndMinutes = parseClockMinutes(activeDraft.endTime);
			if (currentEndMinutes != null && currentEndMinutes > option.minutes) {
				updateActiveDraft('startTime', option.label);
			} else {
				const adjustedEndOption = getAdjustedEndOption(option.minutes, activeDraft);
				if (!adjustedEndOption) {
					setTimeRangeError('Start must leave room for an end time');
					return;
				}

				updateActiveDraftFields({
					startTime: option.label,
					endTime: adjustedEndOption.label,
				});
			}
		} else {
			updateActiveDraft('endTime', option.label);
		}
		setActiveTimeDropdownField(null);
	};

	const VIEWPORT_MARGIN_PX = 12;
	const POPUP_CELL_GAP_PX = 10;

	const openEventPopup = (
		event: ReactMouseEvent<HTMLButtonElement>,
		key: string,
		date: Date
	) => {
		const cellRect = event.currentTarget.getBoundingClientRect();
		const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
		const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;

		// Apple-style placement: prefer right of the cell, flip to the left when there
		// isn't room. The popup is allowed to overhang the panel edges; it's only
		// clamped to the viewport so nothing gets cut off the screen.
		const roomRight = viewportWidth - cellRect.right - POPUP_CELL_GAP_PX;
		const roomLeft = cellRect.left - POPUP_CELL_GAP_PX;

		let placement: 'right' | 'left';
		let left: number;
		if (roomRight >= POPUP_WIDTH_PX + VIEWPORT_MARGIN_PX) {
			placement = 'right';
			left = cellRect.right + POPUP_CELL_GAP_PX;
		} else if (roomLeft >= POPUP_WIDTH_PX + VIEWPORT_MARGIN_PX) {
			placement = 'left';
			left = cellRect.left - POPUP_WIDTH_PX - POPUP_CELL_GAP_PX;
		} else if (roomRight >= roomLeft) {
			placement = 'right';
			left = clamp(
				cellRect.right + POPUP_CELL_GAP_PX,
				VIEWPORT_MARGIN_PX,
				viewportWidth - POPUP_WIDTH_PX - VIEWPORT_MARGIN_PX
			);
		} else {
			placement = 'left';
			left = clamp(
				cellRect.left - POPUP_WIDTH_PX - POPUP_CELL_GAP_PX,
				VIEWPORT_MARGIN_PX,
				viewportWidth - POPUP_WIDTH_PX - VIEWPORT_MARGIN_PX
			);
		}

		const top = clamp(
			cellRect.top,
			VIEWPORT_MARGIN_PX,
			Math.max(viewportHeight - POPUP_HEIGHT_PX - VIEWPORT_MARGIN_PX, VIEWPORT_MARGIN_PX)
		);

		setActiveTimeDropdownField(null);
		setTimeRangeError(null);
		setActivePopup({ key, date, left, top, placement });
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

	const renderTimeDropdown = (field: TimeDropdownField) => {
		if (!activeDraft || activeTimeDropdownField !== field) return null;

		const selectedMinutes = parseClockMinutes(activeDraft[field]);
		const dropdownLabel =
			field === 'startTime' ? 'Start time options' : 'End time options';

		return (
			<div
				ref={timeDropdownMenuRef}
				id={`dashboard-calendar-${field}-time-dropdown`}
				className="dashboard-calendar-time-dropdown-scroll-wrapper"
				role="listbox"
				aria-label={dropdownLabel}
				style={{
					position: 'absolute',
					top: 'calc(100% + 8px)',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '80px',
					height: '161px',
					borderRadius: '8px',
					background: '#E0E0E0',
					boxShadow: '0 8px 18px rgba(0, 0, 0, 0.14)',
					overflow: 'visible',
					zIndex: 2147483602,
				}}
			>
				<style>{`
					.dashboard-calendar-time-dropdown-scroll-wrapper *::-webkit-scrollbar {
						display: none !important;
						width: 0 !important;
						height: 0 !important;
						background: transparent !important;
					}
					.dashboard-calendar-time-dropdown-scroll-wrapper * {
						-ms-overflow-style: none !important;
						scrollbar-width: none !important;
					}
					.dashboard-calendar-time-option:hover {
						background: #D1D5DB !important;
					}
					.dashboard-calendar-time-option[data-invalid-time="true"]:hover {
						background: #FECACA !important;
					}
					.dashboard-calendar-time-option:focus-visible {
						outline: 1px solid #000000;
						outline-offset: -2px;
					}
				`}</style>
				<CustomScrollbar
					className="w-full h-full"
					thumbColor="#000000"
					thumbWidth={2}
					offsetRight={-6}
					lockHorizontalScroll
				>
					{TIME_OPTIONS.map((option) => {
						const isSelected = selectedMinutes === option.minutes;
						const optionError = getTimeChoiceError(field, option, activeDraft);
						const isInvalid = optionError != null;
						return (
							<button
								key={option.label}
								type="button"
								role="option"
								aria-selected={isSelected}
								aria-disabled={isInvalid}
								aria-label={
									optionError ? `${option.label}, ${optionError}` : option.label
								}
								data-selected-time={isSelected ? 'true' : undefined}
								data-invalid-time={isInvalid ? 'true' : undefined}
								onMouseDown={(event) => event.preventDefault()}
								onClick={(event) => {
									event.stopPropagation();
									selectTimeOption(field, option);
								}}
								className="dashboard-calendar-time-option"
								style={{
									width: '100%',
									height: '24px',
									border: 0,
									background: isInvalid
										? '#FEE2E2'
										: isSelected
											? '#D1D5DB99'
											: 'transparent',
									color: isInvalid ? '#B00020' : '#000000',
									cursor: isInvalid ? 'not-allowed' : 'pointer',
									fontFamily: 'Inter, system-ui, sans-serif',
									fontSize: '12px',
									fontWeight: isSelected || isInvalid ? 600 : 400,
									lineHeight: '12px',
									padding: '0 8px',
									textAlign: 'center',
									whiteSpace: 'nowrap',
								}}
							>
								{option.label}
							</button>
						);
					})}
				</CustomScrollbar>
			</div>
		);
	};

	const renderTimeSelector = (field: TimeDropdownField, ariaLabel: string) => {
		const isOpen = activeTimeDropdownField === field;
		const value =
			activeDraft?.[field]?.trim() || (field === 'startTime' ? 'Start' : 'End');

		return (
			<div
				style={{
					position: 'relative',
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<button
					type="button"
					aria-label={ariaLabel}
					aria-haspopup="listbox"
					aria-expanded={isOpen}
					aria-controls={`dashboard-calendar-${field}-time-dropdown`}
					onMouseDown={(event) => event.preventDefault()}
					onClick={(event) => {
						event.stopPropagation();
						setActiveTimeDropdownField((current) => (current === field ? null : field));
					}}
					style={{
						...popupTextStyle,
						minWidth: '40px',
						height: '17px',
						border: 0,
						borderRadius: '5px',
						background: isOpen ? 'rgba(255, 255, 255, 0.36)' : 'transparent',
						color: hasTimeRangeError ? '#FFFFFF' : '#000000',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '16px',
						fontWeight: 500,
						lineHeight: '16px',
						outline: 'none',
						padding: '0 3px',
						textAlign: 'center',
						whiteSpace: 'nowrap',
						transition: 'background-color 80ms ease-out',
					}}
				>
					{value}
				</button>
				{renderTimeDropdown(field)}
			</div>
		);
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
					const isToday =
						inPrimary &&
						date.getFullYear() === effectiveToday.getFullYear() &&
						date.getMonth() === effectiveToday.getMonth() &&
						date.getDate() === effectiveToday.getDate();

					const isoKey = toIsoKey(date);
					const draft = eventDrafts[isoKey];
					const defaultDraft = createDefaultEventDraft(date);
					const showDraftSummary =
						draft != null &&
						(hasDraftContent(draft) ||
							draft.date !== defaultDraft.date ||
							draft.startTime.trim() !== defaultDraft.startTime ||
							draft.endTime.trim() !== defaultDraft.endTime);
					// A draft on today's cell still shows the red event card; the green
					// "today" pill only appears when the cell has no scheduled event.
					const isHighlighted = isToday && !showDraftSummary;
					const textColor = showDraftSummary
						? '#FFFFFF'
						: isHighlighted
							? '#00AFE5'
							: inPrimary
								? IN_MONTH_TEXT.color
								: OUTSIDE_MONTH_TEXT_COLOR;
					const cellBackground = showDraftSummary
						? '#F14048'
						: isHighlighted
							? '#38E497'
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
							data-dashboard-calendar-cell="true"
							aria-label={`${onDateSelect ? 'Select' : 'Edit event for'} ${formatCalendarDate(date)}`}
							onClick={(event) => {
								if (onDateSelect) {
									onDateSelect(date, event);
									return;
								}

								openEventPopup(event, isoKey, date);
							}}
							style={{
								width: '100%',
								height: `${CELL_H_PX}px`,
								borderRadius: isHighlighted ? '9.747px' : `${CELL_RADIUS_PX}px`,
								border:
									isHighlighted || showDraftSummary
										? '1.175px solid #FFFFFF'
										: CELL_BORDER,
								backgroundColor: cellBackground,
								boxSizing: 'border-box',
								position: 'relative',
								padding: 0,
								cursor: 'pointer',
								font: 'inherit',
								appearance: 'none',
								WebkitAppearance: 'none',
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
				backgroundColor: frameless ? 'transparent' : OUTER_BG,
				boxShadow: frameless
					? 'none'
					: `inset 0 0 0 ${OUTER_STROKE_W_PX}px rgba(255, 255, 255, 0.8)`,
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
					border: frameless ? 0 : `${INNER_STROKE_W_PX}px solid #000000`,
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

			{activePopup &&
				activeDraft &&
				typeof window !== 'undefined' &&
				createPortal(
					<div
						ref={popupRef}
						role="dialog"
						aria-modal="false"
						aria-label="Calendar event editor"
						style={{
							position: 'fixed',
							left: `${activePopup.left}px`,
							top: `${activePopup.top}px`,
							width: `${POPUP_WIDTH_PX}px`,
							height: `${POPUP_HEIGHT_PX}px`,
							borderRadius: '9px',
							border: '1.076px solid rgba(255, 255, 255, 0.9)',
							background: 'rgba(229, 96, 98, 0.82)',
							backdropFilter: 'blur(22px) saturate(180%)',
							WebkitBackdropFilter: 'blur(22px) saturate(180%)',
							boxSizing: 'border-box',
							overflow: 'visible',
							zIndex: 2147483600,
							transformOrigin:
								activePopup.placement === 'right' ? 'left center' : 'right center',
							animation:
								'dashboardCalendarPopupEnter 160ms cubic-bezier(0.22, 1, 0.36, 1)',
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
								ref={popupPersonNameInputRef}
								aria-label="Person or thing"
								placeholder="New Event"
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
								placeholder="Add Business"
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
							<div
								aria-label="Event date"
								style={{
									...popupTextStyle,
									width: '100%',
									color: '#000000',
									fontSize: '16px',
									fontWeight: 700,
									lineHeight: '20px',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{activeDraft.date}
							</div>
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
								ref={timePickerRef}
								aria-invalid={hasTimeRangeError}
								title={visibleTimeRangeError ?? undefined}
								style={{
									height: '17px',
									borderRadius: '7px',
									background: hasTimeRangeError ? '#FF3B30' : '#8BF0F7',
									boxShadow: hasTimeRangeError
										? '0 0 0 1px rgba(176, 0, 32, 0.7)'
										: undefined,
									padding: '0 5px',
									display: 'flex',
									alignItems: 'center',
									gap: '4px',
									boxSizing: 'border-box',
								}}
							>
								{renderTimeSelector('startTime', 'Start time')}
								<span
									style={{
										...popupTextStyle,
										color: hasTimeRangeError ? '#FFFFFF' : '#000000',
										fontSize: '16px',
										fontWeight: 500,
										lineHeight: '16px',
									}}
								>
									-
								</span>
								{renderTimeSelector('endTime', 'End time')}
							</div>
							<div
								aria-live="polite"
								style={{
									...popupTextStyle,
									color: hasTimeRangeError ? '#B00020' : '#000000',
									fontSize: hasTimeRangeError ? '11px' : '16px',
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

						<DashboardCalendarPopupLocation
							key={activePopup.key}
							address={activeDraft.address}
							placeId={activeDraft.placeId}
							lat={activeDraft.lat}
							lng={activeDraft.lng}
							drivingDuration={activeDraft.drivingDuration}
							onUpdate={updateActiveDraftFields}
						/>
					</div>,
					document.body
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
