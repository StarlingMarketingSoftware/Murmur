'use client';

import {
	FC,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type RefObject,
	type UIEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { DashboardCalendarPopupLocation } from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPopupLocation';
import {
	type CalendarEventDraft,
	type TimeDropdownField,
	type TimeOption,
	DEFAULT_END_TIME,
	DEFAULT_START_TIME,
	MONTH_LABELS_SHORT,
	MONTH_LABELS_UPPER,
	TIME_OPTIONS,
	createDefaultEventDraft,
	formatCalendarDate,
	formatDurationLabel,
	getAdjustedEndOption,
	getCellBackground,
	getMonthGridSpec,
	getSameDayTimeRangeError,
	getTimeChoiceError,
	parseClockMinutes,
	parseIsoKey,
	toIsoKey,
	weekdayLabel,
} from '@/components/molecules/DashboardCalendarPanel/calendarShared';
import { useConfirmBookingRequest } from '@/hooks/queryHooks/useBookingRequests';
import {
	findBookingForConversation,
	useDeleteCalendarEntry,
	useGetCalendarEntries,
	useUpsertCalendarEntry,
} from '@/hooks/queryHooks/useCalendarEntries';
import type {
	GetCalendarEntryData,
	PatchCalendarEntryData,
} from '@/app/api/calendar/route';
import {
	formatVenueLocationFeature,
	VENUE_LOCATION_GEOCODE_TYPES,
} from '@/app/venue-portal/venueLocationFormat';
import type { ProfileAreaMapFeature } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';

export type BookingPrefillFields = {
	personName: string;
	company: string;
	address: string;
	latitude: number | null;
	longitude: number | null;
	contactId: number | null;
};

type InboxBookingCalendarDropdownProps = {
	campaignId: number;
	prefill: BookingPrefillFields;
	/** Date detected in the venue's reply (already upserted by the banner) or null. */
	initialFocusDateIso: string | null;
	autoExpandInitialDate: boolean;
	/** Anchor whose old absolute positioning the portaled dropdown mirrors. */
	anchorRef: RefObject<HTMLDivElement | null>;
	/** Excluded from click-outside — the banner toggles the dropdown itself. */
	bannerRef: RefObject<HTMLDivElement | null>;
	/**
	 * Booking-request confirm mode: everything works as usual (the artist places/
	 * edits their provisional entry), plus a footer "Confirm booking" bar that
	 * sends the placed entry through the booking-confirm endpoint (which also
	 * writes the venue's calendar) instead of leaving a bare calendar entry.
	 */
	confirmMode?: { bookingRequestId: number; onConfirmed: () => void };
	onClose: () => void;
};

type EditorDraft = {
	personName: string;
	company: string;
	startTime: string;
	endTime: string;
	notes: string;
};

type BookingPopupAnchor = {
	dateIso: string;
	// Panel-local CSS px (the dropdown scales with the campaign zoom, so no
	// portal/fixed-coordinate math is needed).
	left: number;
	top: number;
};

const FONT_FAMILY =
	'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

// The grid mirrors DashboardCalendarPanel's month mosaic: same palettes,
// borders, radii, and cell aspect (94.542 × 91.224), scaled to the dropdown.
const DASHBOARD_CELL_ASPECT = 91.224 / 94.542;
const GRID_BG = '#A3CEFF';
const CELL_BORDER = '1px solid #E0E0E0';
const CELL_RADIUS_PX = 10;
const OWN_BOOKING_CELL_BG = '#F14048';
const OTHER_BOOKING_CELL_BG = '#F59CA0';
const COLS = 7;
const ROWS = 6;
// Months rendered before/after the focus month — same window as the dashboard.
const MONTH_WINDOW_RADIUS = 6;
const SMOOTH_SCROLL_LERP = 0.14;
const WHEEL_SCROLL_MULTIPLIER = 1.12;
const WHEEL_SNAP_DELAY_MS = 150;
// Cumulative wheel |deltaY| required to dismiss an open event popup — smaller
// (trackpad-inertia) nudges are swallowed so they can't kill the popup mid-edit.
const POPUP_WHEEL_DISMISS_THRESHOLD_PX = 36;
// Dashboard event-popup dimensions (DashboardCalendarPanel POPUP_*_PX).
const POPUP_WIDTH_PX = 295;
const POPUP_HEIGHT_PX = 361;
const POPUP_CELL_GAP_PX = 10;
const PANEL_TOP_OFFSET_PX = 2;
const PANEL_Z_INDEX = 10000;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

type PortalPosition = {
	left: number;
	top: number;
	manualScale: number;
};

const getPortalPosition = (
	anchor: HTMLElement,
	dropdownWidth: number,
	leftShift: number
): PortalPosition => {
	const rect = anchor.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const html = document.documentElement;
	const htmlStyle = window.getComputedStyle(html);
	const htmlZoomRaw = htmlStyle.zoom;
	const parsedHtmlZoom = htmlZoomRaw ? parseFloat(htmlZoomRaw) : NaN;
	const htmlZoom =
		Number.isFinite(parsedHtmlZoom) && parsedHtmlZoom > 0 && parsedHtmlZoom !== 1
			? parsedHtmlZoom
			: null;
	const campaignZoomRaw = htmlStyle.getPropertyValue('--murmur-campaign-zoom');
	const parsedCampaignZoom = campaignZoomRaw ? parseFloat(campaignZoomRaw) : NaN;
	const bodyTransform = window.getComputedStyle(document.body).transform;
	const bodyIsScaled = bodyTransform != null && bodyTransform !== '' && bodyTransform !== 'none';

	if (htmlZoom != null) {
		return {
			left: centerX / htmlZoom - dropdownWidth / 2 - leftShift,
			top: rect.top / htmlZoom + PANEL_TOP_OFFSET_PX,
			manualScale: 1,
		};
	}

	if (bodyIsScaled && Number.isFinite(parsedCampaignZoom) && parsedCampaignZoom > 0) {
		return {
			left: centerX - (dropdownWidth / 2 + leftShift) * parsedCampaignZoom,
			top: rect.top + PANEL_TOP_OFFSET_PX * parsedCampaignZoom,
			manualScale: parsedCampaignZoom,
		};
	}

	return {
		left: centerX - dropdownWidth / 2 - leftShift,
		top: rect.top + PANEL_TOP_OFFSET_PX,
		manualScale: 1,
	};
};

const popupInputBaseStyle: CSSProperties = {
	width: '100%',
	minWidth: 0,
	border: 0,
	outline: 'none',
	background: 'transparent',
	boxShadow: 'none',
	fontFamily: FONT_FAMILY,
};

const popupTextStyle: CSSProperties = {
	fontFamily: FONT_FAMILY,
};

export const InboxBookingCalendarDropdown: FC<InboxBookingCalendarDropdownProps> = ({
	campaignId,
	prefill,
	initialFocusDateIso,
	autoExpandInitialDate,
	anchorRef,
	bannerRef,
	confirmMode,
	onClose,
}) => {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const smoothScrollTargetRef = useRef(0);
	const smoothScrollRafRef = useRef<number | null>(null);
	const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// The 13-month window is anchored on the focus month for the component's
	// lifetime; wheel scrolling moves through it like the dashboard calendar.
	const [anchorMonth] = useState<Date>(() => {
		const seed = initialFocusDateIso ? parseIsoKey(initialFocusDateIso) : new Date();
		return new Date(seed.getFullYear(), seed.getMonth(), 1);
	});
	const [activePopup, setActivePopup] = useState<BookingPopupAnchor | null>(null);
	const [activeTimeDropdownField, setActiveTimeDropdownField] =
		useState<TimeDropdownField | null>(null);
	const [timeRangeError, setTimeRangeError] = useState<string | null>(null);
	const [draft, setDraft] = useState<EditorDraft | null>(null);
	// Index of the month grid the window has (mostly) settled on; drives the title.
	const [titleMonthOffset, setTitleMonthOffset] = useState(MONTH_WINDOW_RADIUS);

	// ----- Geometry (dashboard cell proportions, scaled to the dropdown) -----
	// One moderate size for both the compact (501-wide) and expanded (863-wide)
	// detail tiers — per Figma the calendar reads the same in either view.
	const sidePadding = 16;
	const cellW = 80;
	const cellH = cellW * DASHBOARD_CELL_ASPECT;
	const gridWidth = cellW * COLS;
	const monthGridHeight = cellH * ROWS;
	const dropdownWidth = gridWidth + sidePadding * 2;
	// Slight left nudge off the box center so it reads as a dropdown over the
	// conversation rather than a centered modal (per Figma).
	const leftShift = 8;
	const [portalPosition, setPortalPosition] = useState<PortalPosition | null>(() => {
		if (typeof window === 'undefined' || typeof document === 'undefined') return null;
		const anchor = anchorRef.current;
		return anchor ? getPortalPosition(anchor, dropdownWidth, leftShift) : null;
	});
	const isPortalPositionReady = portalPosition != null;

	useLayoutEffect(() => {
		if (typeof window === 'undefined' || typeof document === 'undefined') return;
		const anchor = anchorRef.current;
		if (!anchor) return;

		let raf: number | null = null;
		let followRaf: number | null = null;

		const update = () => {
			const next = getPortalPosition(anchor, dropdownWidth, leftShift);
			setPortalPosition((prev) => {
				if (
					prev &&
					Math.abs(prev.left - next.left) < 0.25 &&
					Math.abs(prev.top - next.top) < 0.25 &&
					Math.abs(prev.manualScale - next.manualScale) < 0.001
				) {
					return prev;
				}
				return next;
			});
		};

		const schedule = () => {
			if (raf != null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				update();
			});
		};

		update();

		// The inbox root animates down when the booking banner appears; follow that
		// transform briefly so the portaled calendar stays visually attached.
		let framesLeft = 16;
		const followTransition = () => {
			update();
			framesLeft -= 1;
			if (framesLeft > 0) {
				followRaf = window.requestAnimationFrame(followTransition);
			}
		};
		followRaf = window.requestAnimationFrame(followTransition);

		window.addEventListener('resize', schedule, { passive: true });
		window.addEventListener('scroll', schedule, true);
		window.addEventListener('murmur:campaign-zoom-changed', schedule as EventListener);

		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(schedule);
			resizeObserver.observe(anchor);
		}

		return () => {
			window.removeEventListener('resize', schedule);
			window.removeEventListener('scroll', schedule, true);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				schedule as EventListener
			);
			resizeObserver?.disconnect();
			if (raf != null) window.cancelAnimationFrame(raf);
			if (followRaf != null) window.cancelAnimationFrame(followRaf);
		};
	}, [anchorRef, dropdownWidth, leftShift]);
	// Variable-height month blocks: each block owns only the weeks whose Sunday
	// falls in its month (getMonthGridSpec), so consecutive blocks tile without
	// repeating boundary weeks. Block tops are prefix sums of the week counts.
	const monthWeekCounts = Array.from(
		{ length: MONTH_WINDOW_RADIUS * 2 + 1 },
		(_, i) =>
			getMonthGridSpec(
				anchorMonth.getFullYear(),
				anchorMonth.getMonth() + i - MONTH_WINDOW_RADIUS
			).weekCount
	);
	const monthTopOffsets: number[] = [];
	let windowRowCount = 0;
	for (const weeks of monthWeekCounts) {
		monthTopOffsets.push(windowRowCount * cellH);
		windowRowCount += weeks;
	}
	const totalStackHeight = windowRowCount * cellH;
	// The viewport is one full 6-row monthGridHeight tall, taller than any 4-5
	// row block — clamp against the stack, not the last block's offset.
	const maxScrollTop = Math.max(0, totalStackHeight - monthGridHeight);
	// The focus month's first days can live in the previous block's trailing row
	// (that week is owned by the previous month); pull the window up one row so
	// the auto-opened popup's cell starts inside the viewport.
	const focusDateBeforeBlock =
		initialFocusDateIso != null &&
		parseIsoKey(initialFocusDateIso) <
			getMonthGridSpec(anchorMonth.getFullYear(), anchorMonth.getMonth()).startDate;
	const initialScrollTop = clamp(
		monthTopOffsets[MONTH_WINDOW_RADIUS] - (focusDateBeforeBlock ? cellH : 0),
		0,
		maxScrollTop
	);

	const { data: calendarEntriesData } = useGetCalendarEntries();
	const entries = useMemo(
		() => calendarEntriesData?.entries ?? [],
		[calendarEntriesData]
	);
	const upsertEntry = useUpsertCalendarEntry();
	const autosaveEntry = useUpsertCalendarEntry({ suppressToasts: true });
	const deleteEntry = useDeleteCalendarEntry();

	const entriesByDate = useMemo(
		() => new Map(entries.map((entry) => [entry.date, entry])),
		[entries]
	);
	const conversationEntry =
		findBookingForConversation(entries, campaignId, prefill.contactId) ?? null;
	const conversationEntryRef = useRef(conversationEntry);
	conversationEntryRef.current = conversationEntry;

	const isConversationEntry = (entry: GetCalendarEntryData): boolean =>
		entry.campaignId === campaignId && entry.contactId === prefill.contactId;

	// The popup edits the entry sitting on ITS date — not just the first
	// conversation match — so stray duplicates remain editable and deletable.
	const activeEntry = activePopup
		? (() => {
				const occupant = entriesByDate.get(activePopup.dateIso);
				return occupant && isConversationEntry(occupant) ? occupant : null;
			})()
		: null;
	const activeEntryRef = useRef(activeEntry);
	activeEntryRef.current = activeEntry;

	// Where this conversation's booking currently lives, tracked synchronously so
	// rapid move clicks delete the right date before the cache round-trip lands.
	const lastOwnDateRef = useRef<string | null>(null);
	const conversationEntryDateForRef = conversationEntry?.date ?? null;
	useEffect(() => {
		lastOwnDateRef.current = conversationEntryDateForRef;
	}, [conversationEntryDateForRef]);

	// Full PATCH body for this conversation's booking — provenance always included
	// so creates and soft-delete revivals stay linked to the conversation.
	const entryToUpsertInput = (entry: GetCalendarEntryData): PatchCalendarEntryData => ({
		date: entry.date,
		personName: entry.personName,
		company: entry.company,
		startTime: entry.startTime,
		endTime: entry.endTime,
		notes: entry.notes,
		address: entry.address,
		placeId: entry.placeId,
		latitude: entry.latitude,
		longitude: entry.longitude,
		drivingDuration: entry.drivingDuration,
		campaignId,
		contactId: prefill.contactId,
	});

	const buildPrefilledInput = (dateIso: string): PatchCalendarEntryData => ({
		date: dateIso,
		personName: prefill.personName,
		company: prefill.company,
		startTime: DEFAULT_START_TIME,
		endTime: DEFAULT_END_TIME,
		notes: '',
		address: prefill.address,
		placeId: null,
		latitude: prefill.latitude,
		longitude: prefill.longitude,
		drivingDuration: null,
		campaignId,
		contactId: prefill.contactId,
	});

	// Seed the editor draft from the popup's entry whenever it (re)appears or
	// moves. Time/location upserts keep the same id+date, so in-progress typing
	// survives their setQueryData round-trips.
	const activeEntryId = activeEntry?.id ?? null;
	const activeEntryDate = activeEntry?.date ?? null;
	useEffect(() => {
		const entry = activeEntryRef.current;
		if (!entry) {
			setDraft(null);
			return;
		}
		setDraft({
			personName: entry.personName,
			company: entry.company,
			startTime: entry.startTime || DEFAULT_START_TIME,
			endTime: entry.endTime || DEFAULT_END_TIME,
			notes: entry.notes,
		});
	}, [activeEntryId, activeEntryDate]);

	// Debounced autosave for the popup's text fields.
	const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingAutosaveRef = useRef<EditorDraft | null>(null);
	const autosaveMutateRef = useRef(autosaveEntry.mutate);
	autosaveMutateRef.current = autosaveEntry.mutate;

	const flushAutosave = () => {
		const pending = pendingAutosaveRef.current;
		const entry = activeEntryRef.current;
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		if (!pending || !entry) return;
		pendingAutosaveRef.current = null;
		autosaveMutateRef.current({ ...entryToUpsertInput(entry), ...pending });
	};
	const flushAutosaveRef = useRef(flushAutosave);
	flushAutosaveRef.current = flushAutosave;

	const scheduleAutosave = (next: EditorDraft) => {
		setDraft(next);
		pendingAutosaveRef.current = next;
		if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
		autosaveTimerRef.current = setTimeout(() => flushAutosaveRef.current(), 600);
	};

	// Confirm-mode footer action: commit in-flight edits, then send the placed
	// entry's final field set through the booking-confirm endpoint. Pending draft
	// values are merged in directly — flushAutosave's PATCH round-trip may not
	// have landed in the cache yet.
	const confirmBooking = useConfirmBookingRequest();
	const handleConfirmBooking = () => {
		const entry = conversationEntryRef.current;
		if (!entry || !confirmMode || confirmBooking.isPending) return;
		const pendingDraft =
			activeEntryRef.current?.date === entry.date ? pendingAutosaveRef.current : null;
		flushAutosave();
		confirmBooking.mutate(
			{
				requestId: confirmMode.bookingRequestId,
				data: { ...entryToUpsertInput(entry), ...(pendingDraft ?? {}) },
			},
			{ onSuccess: confirmMode.onConfirmed }
		);
	};

	useEffect(() => {
		return () => {
			flushAutosaveRef.current();
		};
	}, []);

	// One-shot forward geocode when the contact gave us an address but no pin
	// (ProfileAreaMapBox only geocodes on Enter in its own input).
	const geocodeAttemptedForRef = useRef<number | null>(null);
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
	useEffect(() => {
		const entry = activeEntryRef.current;
		if (!entry || !mapboxToken) return;
		if (!entry.address.trim() || entry.latitude != null) return;
		if (geocodeAttemptedForRef.current === entry.id) return;
		geocodeAttemptedForRef.current = entry.id;

		let cancelled = false;
		const run = async () => {
			try {
				const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
				url.searchParams.set('q', entry.address.trim());
				url.searchParams.set('limit', '1');
				url.searchParams.set('country', 'us');
				url.searchParams.set('access_token', mapboxToken);
				url.searchParams.set('types', VENUE_LOCATION_GEOCODE_TYPES);
				const res = await fetch(url.toString());
				if (!res.ok || cancelled) return;
				const data = (await res.json()) as { features?: ProfileAreaMapFeature[] };
				const feature = data.features?.[0];
				const coords = feature?.geometry?.coordinates;
				if (!feature || !coords || coords.length < 2 || cancelled) return;
				const [lng, lat] = coords;
				const latest = activeEntryRef.current;
				if (!latest || latest.id !== entry.id || latest.latitude != null) return;
				autosaveMutateRef.current({
					...entryToUpsertInput(latest),
					address: formatVenueLocationFeature(feature) || latest.address,
					latitude: lat,
					longitude: lng,
					placeId: feature.properties?.mapbox_id ?? null,
				});
			} catch {
				// Silent — the user can still search in the map header.
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeEntryId, mapboxToken]);

	// Click-outside + Escape close. The panel is portaled, but containment checks on
	// the panel ref (and the banner, which toggles us itself) still suffice.
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const activeTimeDropdownFieldRef = useRef(activeTimeDropdownField);
	activeTimeDropdownFieldRef.current = activeTimeDropdownField;
	const activePopupRef = useRef(activePopup);
	activePopupRef.current = activePopup;
	// Cumulative wheel delta while the popup is open; reset on every popup open.
	const popupWheelAccumRef = useRef(0);
	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (panelRef.current?.contains(target)) return;
			if (bannerRef.current?.contains(target)) return;
			onCloseRef.current();
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			if (activeTimeDropdownFieldRef.current) {
				setActiveTimeDropdownField(null);
				return;
			}
			if (activePopupRef.current) {
				// Flush synchronously BEFORE the close — the debounced autosave reads
				// activeEntryRef, which nulls on the render after the popup closes.
				flushAutosaveRef.current();
				setActivePopup(null);
				return;
			}
			onCloseRef.current();
		};
		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [bannerRef]);

	// ----- Dashboard-style smooth scroll: wheel → LERP toward target, then snap
	// to the nearest week-row boundary after the wheel goes quiet. -----

	const animateSmoothScroll = () => {
		const container = scrollContainerRef.current;
		if (!container) {
			smoothScrollRafRef.current = null;
			return;
		}
		const distance = smoothScrollTargetRef.current - container.scrollTop;
		if (Math.abs(distance) < 0.5) {
			container.scrollTop = smoothScrollTargetRef.current;
			smoothScrollRafRef.current = null;
			return;
		}
		container.scrollTop += distance * SMOOTH_SCROLL_LERP;
		smoothScrollRafRef.current = requestAnimationFrame(animateSmoothScroll);
	};
	const animateSmoothScrollRef = useRef(animateSmoothScroll);
	animateSmoothScrollRef.current = animateSmoothScroll;

	const snapToNearestRow = () => {
		const container = scrollContainerRef.current;
		if (!container || cellH <= 0) return;
		const reference =
			smoothScrollRafRef.current != null
				? smoothScrollTargetRef.current
				: container.scrollTop;
		const snapped = clamp(Math.round(reference / cellH) * cellH, 0, maxScrollTop);
		if (Math.abs(snapped - reference) < 0.5) return;
		smoothScrollTargetRef.current = snapped;
		if (smoothScrollRafRef.current == null) {
			smoothScrollRafRef.current = requestAnimationFrame(() =>
				animateSmoothScrollRef.current()
			);
		}
	};
	const snapToNearestRowRef = useRef(snapToNearestRow);
	snapToNearestRowRef.current = snapToNearestRow;

	// Re-align whenever the geometry changes (hot reload) —
	// a stale pixel offset would land the window mid-month.
	useLayoutEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		if (smoothScrollRafRef.current != null) {
			cancelAnimationFrame(smoothScrollRafRef.current);
			smoothScrollRafRef.current = null;
		}
		smoothScrollTargetRef.current = initialScrollTop;
		container.scrollTop = initialScrollTop;
	}, [initialScrollTop, isPortalPositionReady]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleWheel = (event: WheelEvent) => {
			if (event.ctrlKey) return;
			event.preventDefault();
			event.stopPropagation();

			// The popup anchors to a cell that is about to move — dismiss it, like
			// the dashboard's scroll-dismiss behavior. Small (inertia) deltas are
			// swallowed entirely — no scroll, no snap re-arm — so an accidental
			// nudge can't kill the popup mid-edit; the flush commits pending edits
			// and must run BEFORE the close (activeEntryRef nulls next render).
			// deltaMode 1 = line-based wheels (Firefox), ~3/tick.
			if (activePopupRef.current) {
				popupWheelAccumRef.current +=
					Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : 1);
				if (popupWheelAccumRef.current < POPUP_WHEEL_DISMISS_THRESHOLD_PX) return;
				flushAutosaveRef.current();
				setActivePopup(null);
				setActiveTimeDropdownField(null);
			}

			if (smoothScrollRafRef.current == null) {
				smoothScrollTargetRef.current = container.scrollTop;
			}
			smoothScrollTargetRef.current = clamp(
				smoothScrollTargetRef.current + event.deltaY * WHEEL_SCROLL_MULTIPLIER,
				0,
				maxScrollTop
			);
			if (smoothScrollRafRef.current == null) {
				smoothScrollRafRef.current = requestAnimationFrame(() =>
					animateSmoothScrollRef.current()
				);
			}
			if (wheelSnapTimeoutRef.current != null) {
				clearTimeout(wheelSnapTimeoutRef.current);
			}
			wheelSnapTimeoutRef.current = setTimeout(() => {
				wheelSnapTimeoutRef.current = null;
				snapToNearestRowRef.current();
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
	}, [isPortalPositionReady, maxScrollTop]);

	const handleScroll = (event: UIEvent<HTMLDivElement>) => {
		// Nearest block top by prefix-sum offset (blocks are 4-5 rows tall).
		const top = event.currentTarget.scrollTop;
		let nearest = 0;
		for (let i = 1; i < monthTopOffsets.length; i++) {
			if (Math.abs(monthTopOffsets[i] - top) < Math.abs(monthTopOffsets[nearest] - top)) {
				nearest = i;
			}
		}
		setTitleMonthOffset(nearest);
	};

	const titleMonthDate = new Date(
		anchorMonth.getFullYear(),
		anchorMonth.getMonth() + titleMonthOffset - MONTH_WINDOW_RADIUS,
		1
	);
	const today = new Date();

	// ----- Anchored event popup (the dashboard calendar's editor, panel-local) -----

	const openPopupForCell = (cellEl: HTMLElement, dateIso: string) => {
		const panel = panelRef.current;
		if (!panel) return;
		// Abandon any in-flight scroll settle (like the dashboard's openEventPopup):
		// with small wheel deltas swallowed while the popup is open, a pending snap
		// would otherwise move the grid under the popup's frozen panel-local coords.
		if (smoothScrollRafRef.current != null) {
			cancelAnimationFrame(smoothScrollRafRef.current);
			smoothScrollRafRef.current = null;
		}
		if (wheelSnapTimeoutRef.current != null) {
			clearTimeout(wheelSnapTimeoutRef.current);
			wheelSnapTimeoutRef.current = null;
		}
		if (scrollContainerRef.current) {
			smoothScrollTargetRef.current = scrollContainerRef.current.scrollTop;
		}
		popupWheelAccumRef.current = 0;
		const panelRect = panel.getBoundingClientRect();
		const cellRect = cellEl.getBoundingClientRect();
		// Both rects share every ancestor transform (campaign zoom/scale), so the
		// ratio against the panel's layout width converts visual px → local px.
		const scale = panelRect.width / dropdownWidth || 1;
		const cellLeft = (cellRect.left - panelRect.left) / scale;
		const cellRight = (cellRect.right - panelRect.left) / scale;
		const cellTop = (cellRect.top - panelRect.top) / scale;
		const panelHeight = panelRect.height / scale;

		// Apple-style placement, like the dashboard: prefer right of the cell,
		// flip left when there isn't room (the popup may overhang the panel edge).
		const left =
			cellRight + POPUP_CELL_GAP_PX + POPUP_WIDTH_PX <= dropdownWidth + 60
				? cellRight + POPUP_CELL_GAP_PX
				: cellLeft - POPUP_WIDTH_PX - POPUP_CELL_GAP_PX;
		const top = clamp(cellTop, 8, Math.max(panelHeight - POPUP_HEIGHT_PX - 8, 8));

		setActiveTimeDropdownField(null);
		setTimeRangeError(null);
		setActivePopup({ dateIso, left, top });
	};

	const handleDayCellClick = (
		event: React.MouseEvent<HTMLButtonElement>,
		date: Date
	) => {
		const iso = toIsoKey(date);
		const cellEl = event.currentTarget;
		const occupant = entriesByDate.get(iso);
		// Commit any pending popup edits up front — every branch below closes,
		// switches, or moves the popup, after which the debounced autosave no-ops.
		flushAutosave();
		if (occupant && !isConversationEntry(occupant)) return; // one booking per day
		if (occupant) {
			if (activePopup?.dateIso === iso) {
				setActivePopup(null);
				setActiveTimeDropdownField(null);
			} else {
				openPopupForCell(cellEl, iso);
			}
			return;
		}
		const sourceEntry = conversationEntryRef.current;
		const oldDate = lastOwnDateRef.current ?? sourceEntry?.date ?? null;
		if (sourceEntry) {
			// Move: keep all edited fields, change only the date; upsert first so a
			// failure never loses the booking, then clear the old date. oldDate is
			// tracked synchronously so rapid clicks can't orphan in-flight dates.
			upsertEntry.mutate({
				...entryToUpsertInput(sourceEntry),
				...(draft ?? {}),
				date: iso,
			});
			if (oldDate && oldDate !== iso) {
				deleteEntry.mutate({ date: oldDate });
			}
		} else {
			upsertEntry.mutate(buildPrefilledInput(iso));
		}
		lastOwnDateRef.current = iso;
		openPopupForCell(cellEl, iso);
	};

	// Auto-open the popup on the detected date once the initial scroll has
	// settled (double rAF so the cell's rect reflects the final scrollTop).
	const autoOpenDoneRef = useRef(false);
	useEffect(() => {
		if (!autoExpandInitialDate || !initialFocusDateIso) return;
		if (autoOpenDoneRef.current) return;
		let raf2: number | null = null;
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => {
				const cell = panelRef.current?.querySelector<HTMLElement>(
					`[data-booking-date="${initialFocusDateIso}"]`
				);
				if (cell) {
					openPopupForCell(cell, initialFocusDateIso);
					autoOpenDoneRef.current = true;
				}
			});
		});
		return () => {
			cancelAnimationFrame(raf1);
			if (raf2 != null) cancelAnimationFrame(raf2);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoExpandInitialDate, initialFocusDateIso, conversationEntry?.id, isPortalPositionReady]);

	// ----- Popup time picker (ported verbatim from the dashboard popup, but
	// operating on the conversation entry instead of a local drafts map) -----

	const timeDraftFor = (editor: EditorDraft, dateIso: string): CalendarEventDraft => ({
		...createDefaultEventDraft(parseIsoKey(dateIso)),
		startTime: editor.startTime,
		endTime: editor.endTime,
	});

	const activeTimeRangeError =
		draft != null ? getSameDayTimeRangeError(draft.startTime, draft.endTime) : null;
	const visibleTimeRangeError = activeTimeRangeError ?? timeRangeError;
	const hasTimeRangeError = visibleTimeRangeError != null;
	const durationLabel = draft
		? hasTimeRangeError
			? 'Pick Valid Time'
			: formatDurationLabel(draft.startTime, draft.endTime)
		: 'Duration';

	const selectTimeOption = (field: TimeDropdownField, option: TimeOption) => {
		const entry = activeEntryRef.current;
		if (!draft || !entry) return;
		const timeDraft = timeDraftFor(draft, entry.date);

		const nextError = getTimeChoiceError(field, option, timeDraft);
		if (nextError) {
			setTimeRangeError(nextError);
			return;
		}

		setTimeRangeError(null);
		let nextTimes: Pick<EditorDraft, 'startTime' | 'endTime'>;
		if (field === 'startTime') {
			const currentEndMinutes = parseClockMinutes(draft.endTime);
			if (currentEndMinutes != null && currentEndMinutes > option.minutes) {
				nextTimes = { startTime: option.label, endTime: draft.endTime };
			} else {
				const adjustedEnd = getAdjustedEndOption(option.minutes, timeDraft);
				if (!adjustedEnd) {
					setTimeRangeError('Start must leave room for an end time');
					return;
				}
				nextTimes = { startTime: option.label, endTime: adjustedEnd.label };
			}
		} else {
			nextTimes = { startTime: draft.startTime, endTime: option.label };
		}

		const nextDraft = { ...draft, ...nextTimes };
		setDraft(nextDraft);
		setActiveTimeDropdownField(null);
		// Times save immediately (discrete choice), carrying any pending text too.
		pendingAutosaveRef.current = null;
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		upsertEntry.mutate({ ...entryToUpsertInput(entry), ...nextDraft });
	};

	const renderTimeDropdown = (field: TimeDropdownField) => {
		const entry = activeEntryRef.current;
		if (!draft || !entry || activeTimeDropdownField !== field) return null;
		const timeDraft = timeDraftFor(draft, entry.date);
		const selectedMinutes = parseClockMinutes(draft[field]);

		return (
			<div
				className="inbox-booking-time-dropdown-scroll-wrapper"
				role="listbox"
				aria-label={field === 'startTime' ? 'Start time options' : 'End time options'}
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
					zIndex: 60,
				}}
			>
				<style>{`
					.inbox-booking-time-dropdown-scroll-wrapper *::-webkit-scrollbar {
						display: none !important;
						width: 0 !important;
						height: 0 !important;
						background: transparent !important;
					}
					.inbox-booking-time-dropdown-scroll-wrapper * {
						-ms-overflow-style: none !important;
						scrollbar-width: none !important;
					}
					.inbox-booking-time-option:hover {
						background: #D1D5DB !important;
					}
					.inbox-booking-time-option[data-invalid-time="true"]:hover {
						background: #FECACA !important;
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
						const optionError = getTimeChoiceError(field, option, timeDraft);
						const isInvalid = optionError != null;
						return (
							<button
								key={option.label}
								type="button"
								role="option"
								aria-selected={isSelected}
								aria-disabled={isInvalid}
								data-invalid-time={isInvalid ? 'true' : undefined}
								onMouseDown={(event) => event.preventDefault()}
								onClick={(event) => {
									event.stopPropagation();
									selectTimeOption(field, option);
								}}
								className="inbox-booking-time-option"
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
		const value = draft?.[field]?.trim() || (field === 'startTime' ? 'Start' : 'End');

		return (
			<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
				<button
					type="button"
					aria-label={ariaLabel}
					aria-haspopup="listbox"
					aria-expanded={isOpen}
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

	// Enter in a popup text field commits + closes the editor (the booked cell
	// stays as confirmation). Attached per-input (never on the dialog) so the
	// location box's own geocode-on-Enter keeps working. Flush runs synchronously
	// BEFORE the close — activeEntryRef nulls on the render after the popup closes.
	const handlePopupInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
		event.preventDefault();
		// Mirror the Escape layering: an open time dropdown closes first.
		if (activeTimeDropdownField) {
			setActiveTimeDropdownField(null);
			return;
		}
		flushAutosave();
		setActivePopup(null);
	};

	const handleDeleteBooking = () => {
		const entry = activeEntryRef.current;
		if (!entry) return;
		// Drop any pending autosave so it can't resurrect the row after the delete.
		pendingAutosaveRef.current = null;
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		deleteEntry.mutate({ date: entry.date });
		if (lastOwnDateRef.current === entry.date) {
			lastOwnDateRef.current = null;
		}
		setActivePopup(null);
		setActiveTimeDropdownField(null);
	};

	// The dashboard calendar's anchored event popup, verbatim layout (295×361
	// red card: name/company, date strip, time strip, notes, location box) —
	// wired to the conversation's persisted booking, plus a Delete action.
	const renderEventPopup = () => {
		const entry = activeEntry;
		if (!activePopup || !entry || !draft) {
			return null;
		}

		return (
			<div
				role="dialog"
				aria-label="Calendar event editor"
				style={{
					position: 'absolute',
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
					zIndex: 50,
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
						placeholder="New Event"
						value={draft.personName}
						onChange={(event) =>
							scheduleAutosave({ ...draft, personName: event.target.value })
						}
						onKeyDown={handlePopupInputKeyDown}
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
						value={draft.company}
						onChange={(event) =>
							scheduleAutosave({ ...draft, company: event.target.value })
						}
						onKeyDown={handlePopupInputKeyDown}
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
						{formatCalendarDate(parseIsoKey(entry.date))}
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
						{durationLabel}
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
						value={draft.notes}
						onChange={(event) =>
							scheduleAutosave({ ...draft, notes: event.target.value })
						}
						onKeyDown={handlePopupInputKeyDown}
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
					key={entry.id}
					address={entry.address}
					placeId={entry.placeId}
					lat={entry.latitude}
					lng={entry.longitude}
					drivingDuration={entry.drivingDuration}
					onUpdate={(partial) => {
						const latest = activeEntryRef.current;
						if (!latest) return;
						autosaveEntry.mutate({
							...entryToUpsertInput(latest),
							...(partial.address !== undefined && { address: partial.address }),
							...(partial.placeId !== undefined && { placeId: partial.placeId }),
							...(partial.lat !== undefined && { latitude: partial.lat }),
							...(partial.lng !== undefined && { longitude: partial.lng }),
							...(partial.drivingDuration !== undefined && {
								drivingDuration: partial.drivingDuration,
							}),
						});
					}}
				/>

				<button
					type="button"
					onClick={handleDeleteBooking}
					aria-label="Delete booking"
					style={{
						position: 'absolute',
						right: '9.5px',
						bottom: '10px',
						height: '22px',
						padding: '0 14px',
						borderRadius: '11px',
						border: '1.076px solid #FFFFFF',
						background: 'rgba(255, 255, 255, 0.16)',
						color: '#FFFFFF',
						fontFamily: FONT_FAMILY,
						fontSize: '12px',
						fontWeight: 600,
						lineHeight: '20px',
						cursor: 'pointer',
					}}
				>
					Delete
				</button>
			</div>
		);
	};

	// ----- Month grids (dashboard-literal mosaic, 13-month scroll window) -----

	const renderDayCell = (
		date: Date,
		gridMonthIndex: number,
		row: number,
		col: number
	) => {
		const iso = toIsoKey(date);
		const inPrimary = date.getMonth() === gridMonthIndex;
		const isToday =
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate();
		const occupant = entriesByDate.get(iso);
		const isOwn = occupant != null && isConversationEntry(occupant);
		const isOtherBooking = occupant != null && !isOwn;
		const isPopupCell = isOwn && activePopup?.dateIso === iso;
		const showBookingCard = occupant != null;
		const isHighlighted = isToday && !showBookingCard;

		const textColor = showBookingCard
			? '#FFFFFF'
			: isHighlighted
				? '#00AFE5'
				: inPrimary
					? '#00AFE5'
					: 'rgba(0, 0, 0, 0.22)';
		const cellBackground = showBookingCard
			? isOwn
				? OWN_BOOKING_CELL_BG
				: OTHER_BOOKING_CELL_BG
			: isHighlighted
				? '#38E497'
				: getCellBackground(gridMonthIndex, row, col);

		const label =
			date.getDate() === 1
				? `${MONTH_LABELS_SHORT[date.getMonth()]} 1`
				: String(date.getDate());

		return (
			<button
				key={`${row}-${col}-${iso}`}
				type="button"
				data-booking-date={iso}
				aria-label={`${isOwn ? 'Edit booking for' : 'Book'} ${formatCalendarDate(date)}`}
				aria-disabled={isOtherBooking}
				onClick={(event) => handleDayCellClick(event, date)}
				style={{
					width: '100%',
					height: `${cellH}px`,
					borderRadius: isHighlighted ? '9.747px' : `${CELL_RADIUS_PX}px`,
					border:
						isHighlighted || showBookingCard ? '1.175px solid #FFFFFF' : CELL_BORDER,
					backgroundColor: cellBackground,
					boxSizing: 'border-box',
					position: 'relative',
					padding: 0,
					cursor: isOtherBooking ? 'default' : 'pointer',
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
						fontFamily: FONT_FAMILY,
						fontSize: '12.172px',
						fontStyle: 'normal',
						fontWeight: isHighlighted ? 700 : 500,
						lineHeight: '16.229px',
						color: textColor,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						pointerEvents: 'none',
					}}
				>
					{label}
				</div>
				{showBookingCard && (
					<div
						style={{
							position: 'absolute',
							left: '9px',
							right: '8px',
							top: '33px',
							textAlign: 'left',
							color: '#FFFFFF',
							fontFamily: FONT_FAMILY,
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
							{occupant.personName.trim() || occupant.company.trim() || 'Untitled'}
						</div>
						<div
							style={{
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{(occupant.startTime || DEFAULT_START_TIME).replace(' ', '')}-
							{(occupant.endTime || DEFAULT_END_TIME).replace(' ', '')}
						</div>
					</div>
				)}
				{isPopupCell && (
					<div
						style={{
							position: 'absolute',
							bottom: '7px',
							left: '50%',
							marginLeft: '-3.5px',
							width: '7px',
							height: '7px',
							borderRadius: '50%',
							background: '#FFFFFF',
							pointerEvents: 'none',
						}}
					/>
				)}
			</button>
		);
	};

	const renderMonthGrid = (monthOffset: number) => {
		const monthStart = new Date(
			anchorMonth.getFullYear(),
			anchorMonth.getMonth() + monthOffset,
			1
		);
		const gridMonthYear = monthStart.getFullYear();
		const gridMonthIndex = monthStart.getMonth();
		const { startDate: gridStart, weekCount } = getMonthGridSpec(
			gridMonthYear,
			gridMonthIndex
		);

		return (
			<div
				key={`${gridMonthYear}-${gridMonthIndex}`}
				style={{
					width: '100%',
					height: `${weekCount * cellH}px`,
					display: 'grid',
					gridTemplateColumns: `repeat(${COLS}, 1fr)`,
					gridTemplateRows: `repeat(${weekCount}, ${cellH}px)`,
					gap: 0,
					alignContent: 'start',
					justifyContent: 'start',
					backgroundColor: GRID_BG,
				}}
			>
				{Array.from({ length: weekCount * COLS }, (_, gridIndex) => {
					const row = Math.floor(gridIndex / COLS);
					const col = gridIndex % COLS;
					const date = new Date(
						gridStart.getFullYear(),
						gridStart.getMonth(),
						gridStart.getDate() + gridIndex
					);
					return renderDayCell(date, gridMonthIndex, row, col);
				})}
			</div>
		);
	};

	if (typeof document === 'undefined' || !portalPosition) return null;

	return createPortal(
		<div
			ref={panelRef}
			data-campaign-interactive-surface
			role="dialog"
			aria-label={confirmMode ? 'Confirm booking' : 'Add booking to calendar'}
			style={{
				position: 'fixed',
				top: `${portalPosition.top}px`,
				left: `${portalPosition.left}px`,
				width: `${dropdownWidth}px`,
				zIndex: PANEL_Z_INDEX,
				transform:
					portalPosition.manualScale !== 1
						? `scale(${portalPosition.manualScale})`
						: undefined,
				transformOrigin: portalPosition.manualScale !== 1 ? 'top left' : undefined,
				borderRadius: '12px',
				border: '2px solid #000000',
				background: 'rgba(164, 221, 239, 0.94)',
				backdropFilter: 'blur(10px)',
				WebkitBackdropFilter: 'blur(10px)',
				boxSizing: 'border-box',
				padding: `12px ${sidePadding}px 16px`,
			}}
		>
			<div
				style={{
					height: '28px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily: 'Inter, sans-serif',
					fontSize: '16px',
					fontWeight: 700,
					color: '#000000',
				}}
			>
				{confirmMode ? 'Confirm booking' : 'Add booking to calendar'}
			</div>
			<div
				style={{
					borderRadius: '12px 12px 0 0',
					background: '#8FC2F5',
					padding: '4px 10px 0',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						height: '42px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<span
						style={{
							fontFamily: FONT_FAMILY,
							fontSize: '30px',
							fontWeight: 600,
							lineHeight: 1,
							color: '#FFFFFF',
						}}
					>
						{MONTH_LABELS_UPPER[titleMonthDate.getMonth()]}
						{titleMonthDate.getFullYear() !== today.getFullYear()
							? ` ${titleMonthDate.getFullYear()}`
							: ''}
					</span>
				</div>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: `repeat(${COLS}, 1fr)`,
						paddingBottom: '3px',
					}}
				>
					{Array.from({ length: COLS }, (_, day) => (
						<div
							key={`weekday-${day}`}
							style={{
								fontFamily: FONT_FAMILY,
								fontSize: '12px',
								fontWeight: 600,
								color: '#FFFFFF',
								paddingLeft: '6px',
							}}
						>
							{weekdayLabel(new Date(2026, 2, day + 1))}
						</div>
					))}
				</div>
			</div>
			{/* Dashboard-style month scroll window: 13 stacked month grids, wheel
			    scrolling with row snapping; the title above follows the settled month. */}
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				style={{
					width: '100%',
					height: `${monthGridHeight}px`,
					overflow: 'hidden',
					borderRadius: '0 0 12px 12px',
					background: GRID_BG,
				}}
			>
				<div
					style={{
						width: '100%',
						height: `${totalStackHeight}px`,
					}}
				>
					{Array.from({ length: MONTH_WINDOW_RADIUS * 2 + 1 }, (_, index) =>
						renderMonthGrid(index - MONTH_WINDOW_RADIUS)
					)}
				</div>
			</div>
			{confirmMode && (
				<button
					type="button"
					onClick={handleConfirmBooking}
					disabled={!conversationEntry || confirmBooking.isPending}
					style={{
						width: '100%',
						height: '30px',
						marginTop: '10px',
						borderRadius: '8px',
						border: '2px solid #000000',
						background: '#B7FFC5',
						fontFamily: 'Inter, sans-serif',
						fontSize: '13px',
						fontWeight: 700,
						color: '#000000',
						cursor: !conversationEntry || confirmBooking.isPending ? 'default' : 'pointer',
						opacity: !conversationEntry || confirmBooking.isPending ? 0.5 : 1,
					}}
				>
					{conversationEntry
						? `Confirm booking — ${formatCalendarDate(parseIsoKey(conversationEntry.date))}`
						: 'Pick a date to confirm'}
				</button>
			)}
			{renderEventPopup()}
		</div>,
		document.documentElement
	);
};

export default InboxBookingCalendarDropdown;
