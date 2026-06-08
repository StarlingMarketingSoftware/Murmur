'use client';

import {
	type FocusEvent as ReactFocusEvent,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { PayRangeMoneyIcon } from '@/components/atoms/_svg/PayRangeMoneyIcon';
import DashboardCalendarPanel from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPanel';
import {
	DashboardCalendarPopupLocation,
	type CalendarPopupLocationFields,
} from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPopupLocation';
import { profileGenreOptionRows } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import {
	DASHBOARD_CALENDAR_NATIVE_WIDTH_PX,
	PROFILE_GENRE_OPTIONS,
	VENUE_MAP_OVERLAY_SCALE,
	VENUE_TIME_OPTIONS,
} from './constants';

type VenueCreateEventFormState = {
	eventName: string;
	location: CalendarPopupLocationFields;
	whoSize: string;
	whoGenres: string[];
	when: string;
	startTime: string;
	endTime: string;
	pay: string;
	details: string;
};
type VenueCreateEventTextField = Exclude<
	keyof VenueCreateEventFormState,
	'whoGenres' | 'location'
>;
type VenueCreateEventActiveField =
	| 'eventName'
	| 'where'
	| 'who'
	| 'when'
	| 'pay'
	| 'details'
	| null;

type VenueCreateEventTimeField = 'startTime' | 'endTime';
type VenueCreateEventWhenPopup = {
	left: number;
	top: number;
};

const VENUE_CREATE_EVENT_DEFAULT_START_TIME = '09:00';
const VENUE_CREATE_EVENT_DEFAULT_END_TIME = '13:00';
const VENUE_CREATE_EVENT_WHEN_POPUP_WIDTH_PX = 244;
const VENUE_CREATE_EVENT_WHEN_POPUP_HEIGHT_PX = 96;
const VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX = 12;
const VENUE_CREATE_EVENT_WHEN_POPUP_GAP_PX = 10;

const EMPTY_CREATE_EVENT_FORM: VenueCreateEventFormState = {
	eventName: '',
	location: { address: '', placeId: null, lat: null, lng: null, drivingDuration: null },
	whoSize: '',
	whoGenres: [],
	when: '',
	startTime: VENUE_CREATE_EVENT_DEFAULT_START_TIME,
	endTime: VENUE_CREATE_EVENT_DEFAULT_END_TIME,
	pay: '',
	details: '',
};
const VENUE_CREATE_EVENT_SIZE_OPTIONS = [
	{ label: 'Solo', width: 50 },
	{ label: 'Duo', width: 49 },
	{ label: 'Full Band', width: 77 },
	{ label: 'Other', width: 54 },
] as const;
const VENUE_CREATE_EVENT_LABEL_CLASS =
	'isolate inline-block font-inter text-[12.35px] font-black not-italic leading-[22.175px] text-[#55C47A] before:absolute before:left-[-3px] before:right-[-3px] before:top-[4px] before:bottom-[4px] before:-z-10 before:rounded-[3.6px] before:bg-[#D6FFED] before:content-[""]';
const VENUE_CREATE_EVENT_INPUT_CLASS =
	'w-full border-0 bg-transparent p-0 font-inter text-black outline-none placeholder:text-black/35';
const VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS =
	'font-inter text-[10.292px] font-medium not-italic leading-[18.479px] text-[#9A9A9A]';
const VENUE_CREATE_EVENT_CALENDAR_SCALE = 390 / DASHBOARD_CALENDAR_NATIVE_WIDTH_PX;
const VENUE_CREATE_EVENT_MONTH_LABELS = [
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

const clampVenueCreateEventValue = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const getVenueCreateEventOrdinalSuffix = (day: number) => {
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

const formatVenueCreateEventDate = (date: Date) =>
	`${VENUE_CREATE_EVENT_MONTH_LABELS[date.getMonth()]} ${date.getDate()}${getVenueCreateEventOrdinalSuffix(
		date.getDate()
	)} ${date.getFullYear()}`;

const getVenueCreateEventTimeMinutes = (value: string) => {
	const [rawHours, rawMinutes] = value.split(':');
	const hours = Number(rawHours);
	const minutes = Number(rawMinutes);

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
	return hours * 60 + minutes;
};

const formatVenueCreateEventTimeLabel = (value: string) => {
	const label =
		VENUE_TIME_OPTIONS.find((option) => option.value === value)?.label ?? value;
	return label.replace(':00 ', ' ');
};

const formatVenueCreateEventDuration = (startTime: string, endTime: string) => {
	const startMinutes = getVenueCreateEventTimeMinutes(startTime);
	const endMinutes = getVenueCreateEventTimeMinutes(endTime);
	if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
		return 'Pick valid time';
	}

	const totalMinutes = endMinutes - startMinutes;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const hourLabel = hours === 1 ? '1 hr' : `${hours} hrs`;

	if (minutes === 0) return hourLabel;
	if (hours === 0) return `${minutes} min`;
	return `${hourLabel} ${minutes} min`;
};

const getNextVenueCreateEventEndTime = (startTime: string) => {
	const startMinutes = getVenueCreateEventTimeMinutes(startTime);
	if (startMinutes == null) return VENUE_CREATE_EVENT_DEFAULT_END_TIME;

	return (
		VENUE_TIME_OPTIONS.find((option) => {
			const optionMinutes = getVenueCreateEventTimeMinutes(option.value);
			return optionMinutes != null && optionMinutes > startMinutes;
		})?.value ?? VENUE_CREATE_EVENT_DEFAULT_END_TIME
	);
};

export function VenueCreateEventMapPanel() {
	const [eventForm, setEventForm] = useState<VenueCreateEventFormState>(
		EMPTY_CREATE_EVENT_FORM
	);
	const [publishState, setPublishState] = useState<'idle' | 'missing-name' | 'published'>(
		'idle'
	);
	const [activeEventField, setActiveEventField] =
		useState<VenueCreateEventActiveField>(null);
	const [activeWhenPopup, setActiveWhenPopup] =
		useState<VenueCreateEventWhenPopup | null>(null);
	const createEventFormRef = useRef<HTMLFormElement | null>(null);
	const eventNameInputRef = useRef<HTMLInputElement | null>(null);
	const payInputRef = useRef<HTMLInputElement | null>(null);
	const detailsInputRef = useRef<HTMLTextAreaElement | null>(null);
	const activeEventFieldRef = useRef<HTMLElement | null>(null);
	const whenPopupRef = useRef<HTMLDivElement | null>(null);
	const setActiveEventFieldElement = useCallback((node: HTMLElement | null) => {
		activeEventFieldRef.current = node;
	}, []);
	const isWhoComplete = Boolean(
		eventForm.whoSize.trim() && eventForm.whoGenres.length > 0
	);
	const isEventNameFilled = eventForm.eventName.trim().length > 0;
	const isWhereFilled = eventForm.location.address.trim().length > 0;
	const isWhoFilled = Boolean(eventForm.whoSize.trim() || eventForm.whoGenres.length > 0);
	const isWhenFilled = eventForm.when.trim().length > 0;
	const isPayFilled = eventForm.pay.trim().length > 0;
	const isDetailsFilled = eventForm.details.trim().length > 0;
	const wasWhoCompleteRef = useRef(isWhoComplete);
	const updateEventField = (field: VenueCreateEventTextField, value: string) => {
		setEventForm((current) => ({ ...current, [field]: value }));
		setPublishState('idle');
	};
	const updateEventLocation = (partial: Partial<CalendarPopupLocationFields>) => {
		setEventForm((current) => ({
			...current,
			location: { ...current.location, ...partial },
		}));
		setPublishState('idle');
	};
	const openEventNameField = () => {
		setActiveEventField('eventName');
		requestAnimationFrame(() => eventNameInputRef.current?.focus());
	};
	const openWhereField = () => setActiveEventField('where');
	const openWhoField = () => setActiveEventField('who');
	const openWhenField = () => setActiveEventField('when');
	const openPayField = () => {
		setActiveEventField('pay');
		requestAnimationFrame(() => payInputRef.current?.focus());
	};
	const openDetailsField = (
		event?: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>
	) => {
		// Prevent a parent click handler (or a wrapping <label>) from also triggering the
		// Pay opener when the user is trying to open Details.
		event?.preventDefault();
		event?.stopPropagation();
		setActiveEventField('details');
		requestAnimationFrame(() => detailsInputRef.current?.focus());
	};
	const selectEventDate = (date: Date, event?: ReactMouseEvent<HTMLButtonElement>) => {
		setEventForm((current) => ({
			...current,
			when: formatVenueCreateEventDate(date),
		}));

		const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
		const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
		const maxLeft = Math.max(
			VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
			viewportWidth -
				VENUE_CREATE_EVENT_WHEN_POPUP_WIDTH_PX -
				VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX
		);
		const maxTop = Math.max(
			VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
			viewportHeight -
				VENUE_CREATE_EVENT_WHEN_POPUP_HEIGHT_PX -
				VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX
		);

		if (event) {
			const cellRect = event.currentTarget.getBoundingClientRect();
			const roomRight =
				viewportWidth - cellRect.right - VENUE_CREATE_EVENT_WHEN_POPUP_GAP_PX;
			const roomLeft = cellRect.left - VENUE_CREATE_EVENT_WHEN_POPUP_GAP_PX;
			const rawLeft =
				roomRight >=
					VENUE_CREATE_EVENT_WHEN_POPUP_WIDTH_PX +
						VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX || roomRight >= roomLeft
					? cellRect.right + VENUE_CREATE_EVENT_WHEN_POPUP_GAP_PX
					: cellRect.left -
						VENUE_CREATE_EVENT_WHEN_POPUP_WIDTH_PX -
						VENUE_CREATE_EVENT_WHEN_POPUP_GAP_PX;

			setActiveWhenPopup({
				left: clampVenueCreateEventValue(
					rawLeft,
					VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
					maxLeft
				),
				top: clampVenueCreateEventValue(
					cellRect.top +
						cellRect.height / 2 -
						VENUE_CREATE_EVENT_WHEN_POPUP_HEIGHT_PX / 2,
					VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
					maxTop
				),
			});
		} else {
			setActiveWhenPopup({
				left: clampVenueCreateEventValue(
					viewportWidth / 2 - VENUE_CREATE_EVENT_WHEN_POPUP_WIDTH_PX / 2,
					VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
					maxLeft
				),
				top: clampVenueCreateEventValue(
					viewportHeight / 2 - VENUE_CREATE_EVENT_WHEN_POPUP_HEIGHT_PX / 2,
					VENUE_CREATE_EVENT_WHEN_POPUP_MARGIN_PX,
					maxTop
				),
			});
		}

		setPublishState('idle');
	};
	const updateEventTimeField = (field: VenueCreateEventTimeField, value: string) => {
		setEventForm((current) => {
			if (field === 'startTime') {
				const startMinutes = getVenueCreateEventTimeMinutes(value);
				const endMinutes = getVenueCreateEventTimeMinutes(current.endTime);
				const needsAdjustedEnd =
					startMinutes != null && endMinutes != null && endMinutes <= startMinutes;

				return {
					...current,
					startTime: value,
					endTime: needsAdjustedEnd
						? getNextVenueCreateEventEndTime(value)
						: current.endTime,
				};
			}

			return { ...current, endTime: value };
		});
		setPublishState('idle');
	};
	const selectEventSize = (size: string) => {
		setEventForm((current) => ({ ...current, whoSize: size }));
		setPublishState('idle');
	};
	const toggleEventGenre = (genre: string) => {
		setEventForm((current) => {
			const normalizedGenre = genre.toLowerCase();
			const hasGenre = current.whoGenres.some(
				(currentGenre) => currentGenre.toLowerCase() === normalizedGenre
			);

			return {
				...current,
				whoGenres: hasGenre
					? current.whoGenres.filter(
							(currentGenre) => currentGenre.toLowerCase() !== normalizedGenre
						)
					: [...current.whoGenres, genre],
			};
		});
		setPublishState('idle');
	};
	useEffect(() => {
		const wasWhoComplete = wasWhoCompleteRef.current;
		wasWhoCompleteRef.current = isWhoComplete;

		// Auto-advance from Who -> When once the venue has picked both a size + at least
		// one genre. This removes the need to hit Enter after clicking the buttons.
		if (activeEventField === 'who' && !wasWhoComplete && isWhoComplete) {
			setActiveEventField('when');
		}
	}, [activeEventField, isWhoComplete]);
	const handleEventNameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.isComposing) return;
		event.preventDefault();
		if (!eventForm.eventName.trim()) {
			setPublishState('missing-name');
			return;
		}

		if (activeEventField === 'who') {
			openWhenField();
			return;
		}

		openWhereField();
	};
	useEffect(() => {
		if (activeEventField !== 'who') return;

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return;
			event.preventDefault();
			setActiveEventField('when');
		};

		document.addEventListener('keydown', handleDocumentKeyDown);
		return () => document.removeEventListener('keydown', handleDocumentKeyDown);
	}, [activeEventField]);
	useEffect(() => {
		if (activeEventField !== 'when') setActiveWhenPopup(null);
	}, [activeEventField]);
	useEffect(() => {
		if (!activeEventField) return;

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			const targetElement = target instanceof Element ? target : target.parentElement;
			if (activeEventFieldRef.current?.contains(target)) return;
			if (whenPopupRef.current?.contains(target)) return;
			if (
				createEventFormRef.current?.contains(target) &&
				targetElement?.closest('button, input, textarea, select, label')
			) {
				return;
			}

			setActiveEventField(null);
			setActiveWhenPopup(null);
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
	}, [activeEventField]);
	useEffect(() => {
		if (!activeWhenPopup) return;

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const popup = whenPopupRef.current;
			if (popup?.contains(event.target as Node)) return;
			setActiveWhenPopup(null);
		};
		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setActiveWhenPopup(null);
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown);
			document.removeEventListener('keydown', handleDocumentKeyDown);
		};
	}, [activeWhenPopup]);
	const handlePublishEvent = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!eventForm.eventName.trim()) {
			setPublishState('missing-name');
			setActiveEventField('eventName');
			requestAnimationFrame(() => eventNameInputRef.current?.focus());
			return;
		}

		setPublishState('published');
	};
	const isEventNameActive = activeEventField === 'eventName';
	const isWhereActive = activeEventField === 'where';
	const isWhoActive = activeEventField === 'who';
	const isWhenActive = activeEventField === 'when';
	const isPayActive = activeEventField === 'pay';
	const isDetailsActive = activeEventField === 'details';
	const eventCalendarToday = new Date();
	const selectedEventGenres = eventForm.whoGenres.slice(0, 2);
	const remainingSelectedGenreCount =
		eventForm.whoGenres.length - selectedEventGenres.length;
	const selectedEventSizeLabel =
		eventForm.whoSize === 'Solo' ? 'Solo Artist' : eventForm.whoSize;
	const selectedEventGenreSet = new Set(
		eventForm.whoGenres.map((genre) => genre.toLowerCase())
	);
	const eventStartMinutes = getVenueCreateEventTimeMinutes(eventForm.startTime);
	const eventStartTimeOptions = VENUE_TIME_OPTIONS.slice(0, -1);
	const eventEndTimeOptions = VENUE_TIME_OPTIONS.filter((option) => {
		const optionMinutes = getVenueCreateEventTimeMinutes(option.value);
		return (
			eventStartMinutes != null &&
			optionMinutes != null &&
			optionMinutes > eventStartMinutes
		);
	});
	const activeEventEndTimeValue = eventEndTimeOptions.some(
		(option) => option.value === eventForm.endTime
	)
		? eventForm.endTime
		: (eventEndTimeOptions[0]?.value ?? eventForm.endTime);
	const eventTimeRangeLabel = `${formatVenueCreateEventTimeLabel(
		eventForm.startTime
	)} - ${formatVenueCreateEventTimeLabel(activeEventEndTimeValue)}`;
	const eventDurationLabel = formatVenueCreateEventDuration(
		eventForm.startTime,
		activeEventEndTimeValue
	);
	const eventWhenSummary = isWhenFilled
		? `${eventForm.when}, ${eventTimeRangeLabel}`
		: '';

	return (
		// Snug to the right of the calendar cluster. The cluster (left-24, scale 0.7) puts the
		// 656px calendar's right edge at ~483px, so left-[500px] leaves a ~17px gap; top-[150px]
		// sits just below the calendar top (56 + 98×0.7 ≈ 125px) and clear of the profile card.
		<form
			ref={createEventFormRef}
			onSubmit={handlePublishEvent}
			className="fixed left-[500px] top-[150px] z-[99] h-[727px] w-[456px] origin-top-left rounded-[12px] border-[2px] border-black bg-white"
			style={{ transform: `scale(${VENUE_MAP_OVERLAY_SCALE})` }}
		>
			<div className="absolute left-[12px] top-[4px] font-inter text-[12.358px] font-medium leading-[16.477px] text-black">
				New Event
			</div>
			<div className="absolute left-[4px] top-[20px] h-[701px] w-[444px] rounded-[12px] border-[2px] border-black bg-white">
				<div className="absolute left-1/2 top-[19px] h-[637px] w-[420px] -translate-x-1/2 overflow-hidden rounded-[12px] border-[2px] border-black bg-white">
					{isEventNameActive ? (
						<>
							<div className="absolute inset-x-0 top-[104px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[166px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[228px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[290px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[352px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[414px] h-[2px] bg-black" />

							<label
								ref={setActiveEventFieldElement}
								className="absolute inset-x-0 top-0 block h-[104px] cursor-text bg-[#BCF1FA]"
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									placeholder="Enter Event Name"
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[17px] top-[30px] h-[32px] !w-[288px] rounded-[6px] bg-white px-[8px] text-[20px] font-medium leading-none placeholder:!text-black`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className="absolute inset-x-0 top-[106px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									Where
								</span>
							</button>
							<button
								type="button"
								onClick={openWhoField}
								className="absolute inset-x-0 top-[168px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									Who
								</span>
							</button>
							<button
								type="button"
								onClick={openWhenField}
								className="absolute inset-x-0 top-[230px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									When
								</span>
							</button>
							<button
								type="button"
								onClick={openPayField}
								className="absolute inset-x-0 top-[292px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									Pay
								</span>
							</button>
							<button
								type="button"
								onClick={openDetailsField}
								className="absolute inset-x-0 top-[354px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[17px] top-[2px]`}
								>
									Details
								</span>
							</button>
						</>
					) : isWhereActive ? (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[255px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[317px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[379px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[441px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<div
								ref={setActiveEventFieldElement}
								className="absolute inset-x-0 top-[55px] h-[200px] bg-[#A7DCE5]"
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[31px] top-[1px] z-10`}
								>
									Where
								</span>
								<div className="absolute left-[15px] top-[30px] h-[150px] w-[390px]">
									<DashboardCalendarPopupLocation
										layout="inline"
										address={eventForm.location.address}
										placeId={eventForm.location.placeId}
										lat={eventForm.location.lat}
										lng={eventForm.location.lng}
										drivingDuration={eventForm.location.drivingDuration}
										onUpdate={updateEventLocation}
									/>
								</div>
							</div>

							<button
								type="button"
								onClick={openWhoField}
								className="absolute inset-x-0 top-[257px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[20px]`}
								>
									Who
								</span>
							</button>
							<button
								type="button"
								onClick={openWhenField}
								className="absolute inset-x-0 top-[319px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[20px]`}
								>
									When
								</span>
							</button>
							<button
								type="button"
								onClick={openPayField}
								className="absolute inset-x-0 top-[381px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[20px]`}
								>
									Pay
								</span>
							</button>
							<button
								type="button"
								onClick={openDetailsField}
								className="absolute inset-x-0 top-[443px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[20px]`}
								>
									Details
								</span>
							</button>
						</>
					) : isWhoActive ? (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[108px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[372px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[434px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[496px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[558px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[22px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className={`absolute inset-x-0 top-[55px] h-[53px] text-left ${isWhereFilled ? 'bg-[#A7DCE5]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									Where
								</span>
								{isWhereFilled && (
									<div className="absolute left-[31px] right-[28px] top-[28px] flex h-[18px] items-center overflow-hidden rounded-[6px] bg-white px-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="min-w-0 truncate">{eventForm.location.address}</span>
									</div>
								)}
							</button>

							<div
								ref={setActiveEventFieldElement}
								className="absolute inset-x-0 top-[110px] h-[262px] bg-[#9FDAE4]"
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									Who
								</span>

								<section className="absolute inset-x-0 top-[37px] h-[60px] border-y-[2px] border-black bg-[#BCF1FA]">
									<h3 className="absolute left-[20px] top-[7px] font-inter text-[15px] font-medium leading-none text-black">
										Size
									</h3>
									<div className="absolute left-1/2 top-[29px] flex w-[258px] -translate-x-1/2 items-center justify-between">
										{VENUE_CREATE_EVENT_SIZE_OPTIONS.map((size) => {
											const isSelected = eventForm.whoSize === size.label;

											return (
												<button
													key={size.label}
													type="button"
													onClick={() => selectEventSize(size.label)}
													aria-pressed={isSelected}
													className={`flex h-[18px] shrink-0 appearance-none items-center justify-center rounded-[6px] border-0 px-[4px] font-inter text-[12px] font-medium leading-[18px] text-black transition-colors ${
														isSelected ? 'bg-[#D6FFED]' : 'bg-white hover:bg-[#D6FFED]'
													}`}
													style={{ width: `${size.width}px` }}
												>
													{size.label}
												</button>
											);
										})}
									</div>
								</section>

								<section className="absolute inset-x-0 top-[111px] h-[126px] border-y-[2px] border-black bg-[#BCF1FA]">
									<h3 className="absolute left-[20px] top-[7px] font-inter text-[15px] font-medium leading-none text-black">
										Genre
									</h3>
									<div className="absolute left-1/2 top-[32px] flex w-[278px] -translate-x-1/2 flex-col gap-[8px]">
										{profileGenreOptionRows.map((row) => (
											<div
												key={row.map((genre) => genre.label).join('-')}
												className="flex justify-between"
											>
												{row.map((genre) => {
													const Icon = genre.Icon;
													const isSelected = selectedEventGenreSet.has(
														genre.label.toLowerCase()
													);

													return (
														<button
															type="button"
															key={genre.label}
															onClick={() => toggleEventGenre(genre.label)}
															aria-pressed={isSelected}
															className={`flex h-[18px] appearance-none items-center justify-center gap-[2px] rounded-[6px] border-0 px-[4px] font-inter text-[12px] font-medium leading-[18px] text-black transition-colors ${
																isSelected
																	? 'bg-[#D6FFED]'
																	: 'bg-white hover:bg-[#D6FFED]'
															}`}
															style={{ width: `${genre.width * 0.81}px` }}
														>
															{Icon && (
																<Icon
																	aria-hidden="true"
																	className="h-[11px] w-auto shrink-0"
																/>
															)}
															<span>{genre.label}</span>
														</button>
													);
												})}
											</div>
										))}
									</div>
								</section>
							</div>

							<button
								type="button"
								onClick={openWhenField}
								className="absolute inset-x-0 top-[374px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									When
								</span>
							</button>
							<button
								type="button"
								onClick={openPayField}
								className="absolute inset-x-0 top-[436px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									Pay
								</span>
							</button>
							<button
								type="button"
								onClick={openDetailsField}
								className="absolute inset-x-0 top-[498px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[22px] top-[2px]`}
								>
									Details
								</span>
							</button>
						</>
					) : isWhenActive ? (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[108px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[163px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[523px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[580px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className={`absolute inset-x-0 top-[55px] h-[53px] text-left ${isWhereFilled ? 'bg-[#A7DCE5]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Where
								</span>
								{isWhereFilled && (
									<div className="absolute left-[41px] right-[28px] top-[28px] flex h-[18px] items-center overflow-hidden rounded-[6px] bg-white px-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="min-w-0 truncate">{eventForm.location.address}</span>
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openWhoField}
								className={`absolute inset-x-0 top-[110px] h-[53px] text-left ${isWhoFilled ? 'bg-[#9FDAE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} !absolute left-[28px] top-[2px] z-10`}
								>
									Who
								</span>
								<div className="absolute left-[41px] right-[28px] top-[28px] flex items-center gap-[6px] overflow-hidden">
									{selectedEventGenres.map((genre) => {
										const selectedOption = PROFILE_GENRE_OPTIONS.find(
											(option) => option.label === genre
										);
										const SelectedIcon = selectedOption?.Icon;

										return (
											<span
												key={genre}
												className="flex h-[18px] max-w-[106px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black"
											>
												{SelectedIcon && (
													<SelectedIcon
														aria-hidden="true"
														className="h-[11px] w-auto shrink-0"
													/>
												)}
												<span className="min-w-0 truncate">{genre}</span>
											</span>
										);
									})}
									{remainingSelectedGenreCount > 0 && (
										<span className="flex h-[18px] shrink-0 items-center justify-center rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black">
											+{remainingSelectedGenreCount}
										</span>
									)}
									{selectedEventSizeLabel && (
										<span className="flex h-[18px] max-w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white px-[6px] font-inter text-[12px] font-medium leading-none text-black">
											<span className="min-w-0 truncate">{selectedEventSizeLabel}</span>
										</span>
									)}
								</div>
							</button>

							<div
								ref={setActiveEventFieldElement}
								className={`absolute inset-x-0 top-[165px] h-[358px] overflow-hidden ${isWhenFilled ? 'bg-[#9FCCE4]' : 'bg-[#A7D3E5]'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px] z-10`}
								>
									When
								</span>
								<div
									className="absolute left-[15px] top-[24px] origin-top-left"
									style={{ transform: `scale(${VENUE_CREATE_EVENT_CALENDAR_SCALE})` }}
								>
									<DashboardCalendarPanel
										frameless
										showFullMonth
										onDateSelect={selectEventDate}
										mockState={{
											year: eventCalendarToday.getFullYear(),
											monthIndex: eventCalendarToday.getMonth(),
										}}
									/>
								</div>
							</div>

							<button
								type="button"
								onClick={openPayField}
								className="absolute inset-x-0 top-[525px] h-[55px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Pay
								</span>
							</button>
							<button
								type="button"
								onClick={openDetailsField}
								className="absolute inset-x-0 top-[582px] h-[55px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Details
								</span>
							</button>
						</>
					) : isPayActive ? (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[108px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[163px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[218px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[346px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[408px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className={`absolute inset-x-0 top-[55px] h-[53px] text-left ${isWhereFilled ? 'bg-[#A7DCE5]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Where
								</span>
								{isWhereFilled && (
									<div className="absolute left-[41px] right-[28px] top-[28px] flex h-[18px] items-center overflow-hidden rounded-[6px] bg-white px-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="min-w-0 truncate">{eventForm.location.address}</span>
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openWhoField}
								className={`absolute inset-x-0 top-[110px] h-[53px] text-left ${isWhoFilled ? 'bg-[#9FDAE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} !absolute left-[28px] top-[2px] z-10`}
								>
									Who
								</span>
								<div className="absolute left-[41px] right-[28px] top-[28px] flex items-center gap-[6px] overflow-hidden">
									{selectedEventGenres.map((genre) => {
										const selectedOption = PROFILE_GENRE_OPTIONS.find(
											(option) => option.label === genre
										);
										const SelectedIcon = selectedOption?.Icon;

										return (
											<span
												key={genre}
												className="flex h-[18px] max-w-[106px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black"
											>
												{SelectedIcon && (
													<SelectedIcon
														aria-hidden="true"
														className="h-[11px] w-auto shrink-0"
													/>
												)}
												<span className="min-w-0 truncate">{genre}</span>
											</span>
										);
									})}
									{remainingSelectedGenreCount > 0 && (
										<span className="flex h-[18px] shrink-0 items-center justify-center rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black">
											+{remainingSelectedGenreCount}
										</span>
									)}
									{selectedEventSizeLabel && (
										<span className="flex h-[18px] max-w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white px-[6px] font-inter text-[12px] font-medium leading-none text-black">
											<span className="min-w-0 truncate">{selectedEventSizeLabel}</span>
										</span>
									)}
								</div>
							</button>

							<button
								type="button"
								onClick={openWhenField}
								className={`absolute inset-x-0 top-[165px] h-[53px] text-left ${isWhenFilled ? 'bg-[#9FCCE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									When
								</span>
								{isWhenFilled && (
									<div className="absolute left-[41px] top-[28px] flex h-[18px] max-w-[245px] items-center rounded-[6px] bg-white pr-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="mr-[6px] h-[18px] w-[18px] shrink-0 rounded-[6px] bg-[#FE515F]" />
										<span className="min-w-0 truncate">{eventWhenSummary}</span>
									</div>
								)}
							</button>

							<label
								ref={setActiveEventFieldElement}
								className="absolute inset-x-0 top-[220px] block h-[126px] cursor-text bg-[#86B7DA]"
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Pay
								</span>
								<div className="absolute left-[28px] top-[41px] flex h-[18px] w-[191px] items-center rounded-[7.491px] bg-white pl-[5px] pr-[7px]">
									<PayRangeMoneyIcon className="h-[16px] w-[16px] shrink-0 translate-y-[0.25px]" />
									<input
										ref={payInputRef}
										aria-label="Pay"
										value={eventForm.pay}
										onChange={(event) => updateEventField('pay', event.target.value)}
										inputMode="decimal"
										placeholder="Enter Compensation"
										className="min-w-0 flex-1 border-0 bg-transparent p-0 font-inter text-[13px] font-medium italic leading-[18px] text-black outline-none placeholder:text-[#5f5f5f]"
									/>
								</div>
							</label>

							<button
								type="button"
								onClick={openDetailsField}
								className="absolute inset-x-0 top-[348px] h-[60px] bg-transparent p-0 text-left"
							>
								<span
									className={`${VENUE_CREATE_EVENT_COLLAPSED_ACTIVE_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Details
								</span>
							</button>
						</>
					) : isDetailsActive ? (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[108px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[163px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[218px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[273px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={() => setActiveEventField('eventName')}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className={`absolute inset-x-0 top-[55px] h-[53px] text-left ${isWhereFilled ? 'bg-[#A7DCE5]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Where
								</span>
								{isWhereFilled && (
									<div className="absolute left-[41px] right-[28px] top-[28px] flex h-[18px] items-center overflow-hidden rounded-[6px] bg-white px-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="min-w-0 truncate">{eventForm.location.address}</span>
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openWhoField}
								className={`absolute inset-x-0 top-[110px] h-[53px] text-left ${isWhoFilled ? 'bg-[#9FDAE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} !absolute left-[28px] top-[2px] z-10`}
								>
									Who
								</span>
								<div className="absolute left-[41px] right-[28px] top-[28px] flex items-center gap-[6px] overflow-hidden">
									{selectedEventGenres.map((genre) => {
										const selectedOption = PROFILE_GENRE_OPTIONS.find(
											(option) => option.label === genre
										);
										const SelectedIcon = selectedOption?.Icon;

										return (
											<span
												key={genre}
												className="flex h-[18px] max-w-[106px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black"
											>
												{SelectedIcon && (
													<SelectedIcon
														aria-hidden="true"
														className="h-[11px] w-auto shrink-0"
													/>
												)}
												<span className="min-w-0 truncate">{genre}</span>
											</span>
										);
									})}
									{remainingSelectedGenreCount > 0 && (
										<span className="flex h-[18px] shrink-0 items-center justify-center rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black">
											+{remainingSelectedGenreCount}
										</span>
									)}
									{selectedEventSizeLabel && (
										<span className="flex h-[18px] max-w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white px-[6px] font-inter text-[12px] font-medium leading-none text-black">
											<span className="min-w-0 truncate">{selectedEventSizeLabel}</span>
										</span>
									)}
								</div>
							</button>

							<button
								type="button"
								onClick={openWhenField}
								className={`absolute inset-x-0 top-[165px] h-[53px] text-left ${isWhenFilled ? 'bg-[#9FCCE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									When
								</span>
								{isWhenFilled && (
									<div className="absolute left-[41px] top-[28px] flex h-[18px] max-w-[245px] items-center rounded-[6px] bg-white pr-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="mr-[6px] h-[18px] w-[18px] shrink-0 rounded-[6px] bg-[#FE515F]" />
										<span className="min-w-0 truncate">{eventWhenSummary}</span>
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openPayField}
								className={`absolute inset-x-0 top-[220px] h-[53px] text-left ${isPayFilled ? 'bg-[#86B7DA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Pay
								</span>
								{isPayFilled && (
									<div className="absolute left-[41px] top-[28px] flex h-[18px] w-[191px] items-center overflow-hidden rounded-[7.491px] bg-white pl-[5px] pr-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<PayRangeMoneyIcon className="h-[16px] w-[16px] shrink-0 translate-y-[0.25px]" />
										<span className="min-w-0 flex-1 truncate">{eventForm.pay}</span>
									</div>
								)}
							</button>

							<label
								ref={setActiveEventFieldElement}
								className="absolute inset-x-0 bottom-0 top-[275px] block cursor-text bg-[#76AACE]"
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px] z-10`}
								>
									Details
								</span>
								<textarea
									ref={detailsInputRef}
									aria-label="Details"
									value={eventForm.details}
									onFocus={openDetailsField}
									onChange={(event) => updateEventField('details', event.target.value)}
									placeholder="Enter additional details about the event"
									className="absolute left-1/2 top-[43px] h-[283px] w-[374px] -translate-x-1/2 resize-none rounded-[7.491px] border-0 bg-[#D0E0EB] px-[9px] py-[8px] font-inter text-[15px] font-medium leading-[22px] text-black outline-none placeholder:text-black"
								/>
							</label>
						</>
					) : (
						<>
							<div className="absolute inset-x-0 top-[53px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[115px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[177px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[239px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[301px] h-[2px] bg-black" />
							<div className="absolute inset-x-0 top-[363px] h-[2px] bg-black" />

							<label
								className={`absolute inset-x-0 top-0 block h-[53px] cursor-text ${isEventNameFilled ? 'bg-[#BCF1FA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Event Name
								</span>
								<input
									ref={eventNameInputRef}
									aria-label="Event name"
									aria-invalid={publishState === 'missing-name'}
									value={eventForm.eventName}
									onFocus={openEventNameField}
									onChange={(event) => updateEventField('eventName', event.target.value)}
									onKeyDown={handleEventNameKeyDown}
									className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[27px] h-[22px] !w-auto text-[22px] font-medium leading-none placeholder:text-[#828282]`}
								/>
							</label>

							<button
								type="button"
								onClick={openWhereField}
								className={`absolute inset-x-0 top-[55px] h-[60px] text-left ${isWhereFilled ? 'bg-[#A7DCE5]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Where
								</span>
								{isWhereFilled && (
									<div className="absolute left-[41px] right-[28px] top-[34px] flex h-[18px] items-center overflow-hidden rounded-[6px] bg-white px-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="min-w-0 truncate">{eventForm.location.address}</span>
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openWhoField}
								className={`absolute inset-x-0 top-[117px] h-[60px] text-left ${isWhoFilled ? 'bg-[#9FDAE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} !absolute left-[28px] top-[2px] z-10`}
								>
									Who
								</span>
								{isWhoFilled && (
									<div className="absolute left-[41px] right-[28px] top-[34px] flex items-center gap-[6px] overflow-hidden">
										{selectedEventGenres.map((genre) => {
											const selectedOption = PROFILE_GENRE_OPTIONS.find(
												(option) => option.label === genre
											);
											const SelectedIcon = selectedOption?.Icon;

											return (
												<span
													key={genre}
													className="flex h-[18px] max-w-[106px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black"
												>
													{SelectedIcon && (
														<SelectedIcon
															aria-hidden="true"
															className="h-[11px] w-auto shrink-0"
														/>
													)}
													<span className="min-w-0 truncate">{genre}</span>
												</span>
											);
										})}
										{remainingSelectedGenreCount > 0 && (
											<span className="flex h-[18px] shrink-0 items-center justify-center rounded-[6px] bg-white px-[5px] font-inter text-[12px] font-medium leading-none text-black">
												+{remainingSelectedGenreCount}
											</span>
										)}
										{selectedEventSizeLabel && (
											<span className="flex h-[18px] max-w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white px-[6px] font-inter text-[12px] font-medium leading-none text-black">
												<span className="min-w-0 truncate">{selectedEventSizeLabel}</span>
											</span>
										)}
									</div>
								)}
							</button>

							<button
								type="button"
								onClick={openWhenField}
								className={`absolute inset-x-0 top-[179px] h-[60px] text-left ${isWhenFilled ? 'bg-[#9FCCE4]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									When
								</span>
								{isWhenFilled && (
									<div className="absolute left-[41px] top-[34px] flex h-[18px] max-w-[245px] items-center rounded-[6px] bg-white pr-[7px] font-inter text-[12px] font-medium leading-none text-black">
										<span className="mr-[6px] h-[18px] w-[18px] shrink-0 rounded-[6px] bg-[#FE515F]" />
										<span className="min-w-0 truncate">{eventWhenSummary}</span>
									</div>
								)}
							</button>

							<label
								className={`absolute inset-x-0 top-[241px] block h-[60px] cursor-text ${isPayFilled ? 'bg-[#86B7DA]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px]`}
								>
									Pay
								</span>
								{isPayFilled ? (
									<div className="absolute left-[28px] top-[34px] flex h-[18px] w-[191px] items-center rounded-[7.491px] bg-white pl-[5px] pr-[7px]">
										<PayRangeMoneyIcon className="h-[16px] w-[16px] shrink-0 translate-y-[0.25px]" />
										<input
											ref={payInputRef}
											aria-label="Pay"
											value={eventForm.pay}
											onFocus={openPayField}
											onChange={(event) => updateEventField('pay', event.target.value)}
											inputMode="decimal"
											className="min-w-0 flex-1 border-0 bg-transparent p-0 font-inter text-[13px] font-medium leading-[18px] text-black outline-none"
										/>
									</div>
								) : (
									<input
										ref={payInputRef}
										aria-label="Pay"
										value={eventForm.pay}
										onFocus={openPayField}
										onChange={(event) => updateEventField('pay', event.target.value)}
										inputMode="decimal"
										className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute left-[28px] right-[24px] top-[37px] h-[18px] !w-auto text-[15px] font-medium leading-none`}
									/>
								)}
							</label>

							<label
								className={`absolute inset-x-0 bottom-0 top-[303px] block cursor-text ${isDetailsFilled ? 'bg-[#76AACE]' : 'bg-white'}`}
							>
								<span
									className={`${VENUE_CREATE_EVENT_LABEL_CLASS} absolute left-[28px] top-[2px] z-10`}
								>
									Details
								</span>
								{isDetailsFilled ? (
									<textarea
										ref={detailsInputRef}
										aria-label="Details"
										value={eventForm.details}
										onFocus={openDetailsField}
										onChange={(event) => updateEventField('details', event.target.value)}
										placeholder="Enter additional details about the event"
										className="absolute bottom-[14px] left-1/2 top-[34px] w-[374px] -translate-x-1/2 resize-none rounded-[7.491px] border-0 bg-[#D0E0EB] px-[9px] py-[8px] font-inter text-[15px] font-medium leading-[22px] text-black outline-none placeholder:text-black"
									/>
								) : (
									<textarea
										ref={detailsInputRef}
										aria-label="Details"
										value={eventForm.details}
										onFocus={openDetailsField}
										onChange={(event) => updateEventField('details', event.target.value)}
										className={`${VENUE_CREATE_EVENT_INPUT_CLASS} absolute bottom-[18px] left-[28px] right-[24px] top-[76px] resize-none text-[15px] font-medium leading-[22px]`}
									/>
								)}
							</label>
						</>
					)}
				</div>

				<button
					type="submit"
					className="absolute bottom-[9.5px] left-1/2 flex h-[26px] w-[244px] -translate-x-1/2 items-center justify-center rounded-[12.084px] bg-[#F57D7D] font-inter text-[18.909px] font-medium not-italic leading-[18.391px] text-black transition-opacity hover:opacity-90 active:opacity-80"
				>
					Publish
				</button>
				<p className="sr-only" aria-live="polite">
					{publishState === 'missing-name'
						? 'Event name is required.'
						: publishState === 'published'
							? 'Event published locally.'
							: ''}
				</p>
			</div>
			{isWhenActive &&
				activeWhenPopup &&
				eventForm.when &&
				typeof window !== 'undefined' &&
				createPortal(
					<div
						ref={whenPopupRef}
						role="dialog"
						aria-label="Select event timeframe"
						className="fixed z-[2147483601] h-[96px] w-[244px] rounded-[9px] border border-white/90 bg-[rgba(229,96,98,0.88)] p-[9px] font-inter shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-[22px]"
						style={{ left: `${activeWhenPopup.left}px`, top: `${activeWhenPopup.top}px` }}
					>
						<div className="flex h-[27px] items-center rounded-[6px] bg-[#FFEFF0] px-[10px] text-[16px] font-bold leading-none text-black">
							<span className="min-w-0 truncate">{eventForm.when}</span>
						</div>
						<div className="mt-[8px] flex items-center justify-between gap-[8px]">
							<div className="flex h-[26px] min-w-0 flex-1 items-center justify-center gap-[4px] rounded-[7px] bg-[#8BF0F7] px-[5px] text-black">
								<select
									aria-label="Start time"
									value={eventForm.startTime}
									onChange={(event) =>
										updateEventTimeField('startTime', event.target.value)
									}
									className="h-[22px] w-[65px] appearance-none rounded-[5px] border-0 bg-transparent px-[2px] text-center text-[15px] font-semibold leading-none text-black outline-none"
								>
									{eventStartTimeOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{formatVenueCreateEventTimeLabel(option.value)}
										</option>
									))}
								</select>
								<span className="text-[15px] font-semibold leading-none text-black">
									-
								</span>
								<select
									aria-label="End time"
									value={activeEventEndTimeValue}
									onChange={(event) =>
										updateEventTimeField('endTime', event.target.value)
									}
									className="h-[22px] w-[65px] appearance-none rounded-[5px] border-0 bg-transparent px-[2px] text-center text-[15px] font-semibold leading-none text-black outline-none"
								>
									{eventEndTimeOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{formatVenueCreateEventTimeLabel(option.value)}
										</option>
									))}
								</select>
							</div>
							<div className="flex h-[26px] min-w-[52px] items-center justify-center rounded-[6px] bg-[#FFEFF0] px-[7px] text-center text-[15px] font-bold leading-none text-black">
								{eventDurationLabel}
							</div>
						</div>
					</div>,
					document.body
				)}
		</form>
	);
}
