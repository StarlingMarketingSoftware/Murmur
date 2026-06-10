'use client';

import { useCallback, useRef, useState } from 'react';
import type { Event as VenueEvent } from '@prisma/client';
import { PayRangeMoneyIcon } from '@/components/atoms/_svg/PayRangeMoneyIcon';
import DashboardCalendarPanel from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPanel';
import {
	getProfileGenreIcon,
	profileGenreOptionRows,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { ProfileAreaMapBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	useCreateVenueEvent,
	useUpdateVenueEvent,
} from '@/hooks/queryHooks/useVenueEvents';
import { DASHBOARD_CALENDAR_NATIVE_WIDTH_PX, VENUE_TIME_OPTIONS } from '../constants';
import {
	buildVenueEventPayload,
	createVenueEventFormFromEvent,
	EMPTY_CREATE_EVENT_FORM,
	formatVenueCreateEventDate,
	formatVenueCreateEventDuration,
	formatVenueCreateEventIsoDate,
	formatVenueCreateEventTimeLabel,
	getNextVenueCreateEventEndTime,
	getVenueCreateEventTimeMinutes,
	VENUE_CREATE_EVENT_LABEL_CLASS,
	VENUE_CREATE_EVENT_SIZE_OPTIONS,
	type VenueCreateEventFormState,
	type VenueCreateEventLocation,
} from '../VenueCreateEventMapPanel';
import {
	formatVenueLocationFeature,
	VENUE_LOCATION_GEOCODE_TYPES,
} from '../venueLocationFormat';

type MobileVenueCreateBand = 'where' | 'who' | 'when' | null;
type MobileVenueCreateTimeField = 'startTime' | 'endTime';

// The dashboard calendar's native outer height in showFullMonth mode
// (6 rows × 91.224px cells + 2 × 4px outer padding) — the band scales
// against it the same way it scales width against
// DASHBOARD_CALENDAR_NATIVE_WIDTH_PX.
const CALENDAR_NATIVE_HEIGHT_PX = 6 * 91.224 + 8;

// Mobile band label chip — the shared desktop chip class positions its
// highlight against the nearest positioned ancestor, so anchor it to itself.
const BAND_LABEL_CLASS = `${VENUE_CREATE_EVENT_LABEL_CLASS} relative`;

const WHO_TOGGLE_BASE_CLASS =
	'flex h-[24px] items-center justify-center gap-[3px] rounded-[7px] border border-black px-[8px] font-inter text-[13px] font-medium leading-none text-black';

// Mobile counterpart of VenueCreateEventMapPanel: one tall stacked-band card
// over the map. Shares the desktop's form state + buildVenueEventPayload so
// both surfaces publish identical payloads. The parent remounts this
// component via key={editingEventId ?? 'new'}, so state seeds once.
export function MobileVenueCreateTab({
	event,
	onSaved,
}: {
	event: VenueEvent | null;
	onSaved: () => void;
}) {
	const [eventForm, setEventForm] = useState<VenueCreateEventFormState>(() =>
		event ? createVenueEventFormFromEvent(event) : EMPTY_CREATE_EVENT_FORM
	);
	const [activeBand, setActiveBand] = useState<MobileVenueCreateBand>(null);
	const [publishState, setPublishState] = useState<'idle' | 'missing-name'>('idle');
	const eventNameInputRef = useRef<HTMLInputElement | null>(null);
	const isEditing = event != null;

	const { mutate: createEvent, isPending: isCreatingEvent } = useCreateVenueEvent({
		onSuccess: onSaved,
	});
	const { mutate: updateEvent, isPending: isUpdatingEvent } = useUpdateVenueEvent({
		onSuccess: onSaved,
	});
	const isSavingEvent = isCreatingEvent || isUpdatingEvent;

	// Calendar scale: measure the band's inner width (ResizeObserver callback
	// ref) and scale the native-width calendar down to fit.
	const [calendarScale, setCalendarScale] = useState(0);
	const calendarResizeObserverRef = useRef<ResizeObserver | null>(null);
	const measureCalendarWrap = useCallback((node: HTMLDivElement | null) => {
		calendarResizeObserverRef.current?.disconnect();
		calendarResizeObserverRef.current = null;
		if (!node) return;
		const update = () =>
			setCalendarScale(node.clientWidth / DASHBOARD_CALENDAR_NATIVE_WIDTH_PX);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		calendarResizeObserverRef.current = observer;
	}, []);

	const updateEventField = (
		field: 'eventName' | 'pay' | 'details',
		value: string
	) => {
		setEventForm((current) => ({ ...current, [field]: value }));
		setPublishState('idle');
	};
	const updateEventLocation = (partial: Partial<VenueCreateEventLocation>) => {
		setEventForm((current) => ({
			...current,
			location: { ...current.location, ...partial },
		}));
		setPublishState('idle');
	};
	const selectEventDate = (date: Date) => {
		setEventForm((current) => ({
			...current,
			when: formatVenueCreateEventDate(date),
			whenDate: formatVenueCreateEventIsoDate(date),
		}));
		setPublishState('idle');
	};
	const updateEventTimeField = (field: MobileVenueCreateTimeField, value: string) => {
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
	const isWhoComplete = Boolean(
		eventForm.whoSize.trim() && eventForm.whoGenres.length > 0
	);
	// Auto-advance Who -> When on the incomplete -> complete transition (inline
	// equivalent of the desktop's wasWhoComplete ref effect).
	const selectEventSize = (size: string) => {
		setEventForm((current) => ({ ...current, whoSize: size }));
		setPublishState('idle');
		if (!isWhoComplete && eventForm.whoGenres.length > 0) {
			setActiveBand('when');
		}
	};
	const toggleEventGenre = (genre: string) => {
		const normalizedGenre = genre.toLowerCase();
		const hasGenre = eventForm.whoGenres.some(
			(currentGenre) => currentGenre.toLowerCase() === normalizedGenre
		);

		setEventForm((current) => ({
			...current,
			whoGenres: hasGenre
				? current.whoGenres.filter(
						(currentGenre) => currentGenre.toLowerCase() !== normalizedGenre
					)
				: [...current.whoGenres, genre],
		}));
		setPublishState('idle');
		if (!isWhoComplete && !hasGenre && eventForm.whoSize.trim()) {
			setActiveBand('when');
		}
	};

	const handlePublish = () => {
		if (!eventForm.eventName.trim()) {
			setPublishState('missing-name');
			eventNameInputRef.current?.focus();
			return;
		}
		if (isSavingEvent) return;

		const payload = buildVenueEventPayload(eventForm);

		if (isEditing && event) {
			updateEvent({ id: event.id, data: payload });
			return;
		}

		createEvent(payload);
	};

	const isWhereFilled = eventForm.location.address.trim().length > 0;
	const isWhoFilled = Boolean(
		eventForm.whoSize.trim() || eventForm.whoGenres.length > 0
	);
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
	const eventCalendarToday = new Date();

	const submitButtonLabel = isSavingEvent
		? isEditing
			? 'Saving…'
			: 'Publishing…'
		: isEditing
			? 'Save'
			: 'Publish';

	return (
		<div
			className="h-full overflow-y-auto"
			style={{
				overscrollBehavior: 'contain',
				WebkitOverflowScrolling: 'touch',
				padding: '10px 14px',
				paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
			}}
		>
			<div className="w-full overflow-hidden rounded-[12px] border-[2.374px] border-black bg-white">
				{/* Event Name */}
				<div className="border-b-[2px] border-black bg-[#BCF1FA] px-[12px] pb-[12px] pt-[8px]">
					<span className={BAND_LABEL_CLASS}>Event Name</span>
					<input
						ref={eventNameInputRef}
						aria-label="Event name"
						aria-invalid={publishState === 'missing-name'}
						value={eventForm.eventName}
						onChange={(changeEvent) =>
							updateEventField('eventName', changeEvent.target.value)
						}
						placeholder="Event name…"
						className="mt-[2px] w-full border-0 bg-transparent p-0 font-inter text-[20px] font-semibold leading-none text-black outline-none placeholder:text-black/35"
					/>
					{publishState === 'missing-name' && (
						<p className="mt-[4px] font-inter text-[12px] font-medium leading-none text-[#D3333E]">
							Give the event a name
						</p>
					)}
				</div>

				{/* Where */}
				<div className="border-b-[2px] border-black bg-[#A7E3EC] px-[12px] pb-[12px] pt-[8px]">
					<button
						type="button"
						onClick={() =>
							setActiveBand((current) => (current === 'where' ? null : 'where'))
						}
						className="block min-h-[44px] w-full text-left"
					>
						<span className={BAND_LABEL_CLASS}>Where</span>
						<span className="mt-[2px] flex h-[28px] w-fit max-w-full items-center rounded-[8px] bg-white px-[10px] font-inter text-[15px] font-medium leading-none text-black">
							<span className="min-w-0 truncate">
								{isWhereFilled ? eventForm.location.address : '+ Add location'}
							</span>
						</span>
					</button>
					{activeBand === 'where' && (
						<ProfileAreaMapBox
							area={eventForm.location.address}
							onAreaUpdate={(address) => updateEventLocation({ address })}
							initialCoordinates={
								eventForm.location.lat != null && eventForm.location.lng != null
									? { lat: eventForm.location.lat, lng: eventForm.location.lng }
									: null
							}
							onCoordinatesChange={({ lat, lng }) =>
								updateEventLocation({ lat, lng, placeId: null })
							}
							onFeatureSelect={(feature) => {
								updateEventLocation({
									placeId: feature.properties?.mapbox_id ?? null,
								});
								setActiveBand(null);
							}}
							className="mt-[8px] h-[170px] w-full rounded-[8px] border-[2px] opacity-100"
							headerLabel="Add Location"
							inputPlaceholder="Add Location"
							initiallyEditing
							reverseGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
							forwardGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
							formatGeocodeFeature={formatVenueLocationFeature}
						/>
					)}
				</div>

				{/* Who */}
				<div className="border-b-[2px] border-black bg-[#9FDAE4] px-[12px] pb-[12px] pt-[8px]">
					<button
						type="button"
						onClick={() => setActiveBand((current) => (current === 'who' ? null : 'who'))}
						className="block min-h-[44px] w-full text-left"
					>
						<span className={BAND_LABEL_CLASS}>Who</span>
						<span className="mt-[2px] flex min-h-[28px] flex-wrap items-center gap-[6px]">
							{isWhoFilled ? (
								<>
									{selectedEventGenres.map((genre) => {
										const SelectedIcon = getProfileGenreIcon(genre);

										return (
											<span
												key={genre}
												className="flex h-[24px] max-w-[130px] shrink-0 items-center justify-center gap-[3px] overflow-hidden rounded-[8px] bg-white px-[8px] font-inter text-[13px] font-medium leading-none text-black"
											>
												{SelectedIcon && (
													<SelectedIcon
														aria-hidden="true"
														className="h-[12px] w-auto shrink-0"
													/>
												)}
												<span className="min-w-0 truncate">{genre}</span>
											</span>
										);
									})}
									{remainingSelectedGenreCount > 0 && (
										<span className="flex h-[24px] shrink-0 items-center justify-center rounded-[8px] bg-white px-[8px] font-inter text-[13px] font-medium leading-none text-black">
											+{remainingSelectedGenreCount}
										</span>
									)}
									{selectedEventSizeLabel && (
										<span className="flex h-[24px] max-w-[130px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white px-[8px] font-inter text-[13px] font-medium leading-none text-black">
											<span className="min-w-0 truncate">{selectedEventSizeLabel}</span>
										</span>
									)}
								</>
							) : (
								<span className="flex h-[28px] items-center rounded-[8px] bg-white px-[10px] font-inter text-[15px] font-medium leading-none text-black">
									+ Who should apply
								</span>
							)}
						</span>
					</button>
					{activeBand === 'who' && (
						<div className="mt-[8px]">
							<div className="font-inter text-[13px] font-medium leading-none text-black">
								Size
							</div>
							<div className="mt-[6px] flex flex-wrap gap-[6px]">
								{VENUE_CREATE_EVENT_SIZE_OPTIONS.map((size) => {
									const isSelected = eventForm.whoSize === size.label;

									return (
										<button
											key={size.label}
											type="button"
											onClick={() => selectEventSize(size.label)}
											aria-pressed={isSelected}
											className={`${WHO_TOGGLE_BASE_CLASS} ${
												isSelected ? 'bg-[#D6FFED]' : 'bg-white'
											}`}
										>
											{size.label}
										</button>
									);
								})}
							</div>
							<div className="mt-[10px] font-inter text-[13px] font-medium leading-none text-black">
								Genre
							</div>
							<div className="mt-[6px] flex flex-col gap-[6px]">
								{profileGenreOptionRows.map((row) => (
									<div
										key={row.map((genre) => genre.label).join('-')}
										className="flex flex-wrap gap-[6px]"
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
													className={`${WHO_TOGGLE_BASE_CLASS} ${
														isSelected ? 'bg-[#D6FFED]' : 'bg-white'
													}`}
												>
													{Icon && (
														<Icon aria-hidden="true" className="h-[12px] w-auto shrink-0" />
													)}
													<span>{genre.label}</span>
												</button>
											);
										})}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* When */}
				<div className="border-b-[2px] border-black bg-[#93C9DF] px-[12px] pb-[12px] pt-[8px]">
					<button
						type="button"
						onClick={() =>
							setActiveBand((current) => (current === 'when' ? null : 'when'))
						}
						className="block min-h-[44px] w-full text-left"
					>
						<span className={BAND_LABEL_CLASS}>When</span>
						<span className="mt-[2px] flex h-[28px] w-fit max-w-full items-center gap-[8px] rounded-[8px] bg-white px-[10px] font-inter text-[15px] font-medium leading-none text-black">
							<span className="h-[14px] w-[14px] shrink-0 rounded-[4px] bg-[#FF6B74]" />
							<span className="min-w-0 truncate">
								{eventForm.when
									? `${eventForm.when}, ${eventTimeRangeLabel}`
									: '+ Pick a date'}
							</span>
						</span>
					</button>
					{activeBand === 'when' && (
						<>
							<div
								ref={measureCalendarWrap}
								className="mt-[8px] w-full overflow-hidden"
								style={{
									height:
										calendarScale > 0
											? `${CALENDAR_NATIVE_HEIGHT_PX * calendarScale}px`
											: undefined,
								}}
							>
								{calendarScale > 0 && (
									<div
										className="origin-top-left"
										style={{ transform: `scale(${calendarScale})` }}
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
								)}
							</div>
							<div className="mt-[8px] flex items-center gap-[8px]">
								<select
									aria-label="Start time"
									value={eventForm.startTime}
									onChange={(changeEvent) =>
										updateEventTimeField('startTime', changeEvent.target.value)
									}
									className="h-[32px] rounded-[6px] border border-black bg-white px-[6px] font-inter text-[14px] font-medium text-black"
								>
									{eventStartTimeOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{formatVenueCreateEventTimeLabel(option.value)}
										</option>
									))}
								</select>
								<span className="font-inter text-[14px] font-medium leading-none text-black">
									-
								</span>
								<select
									aria-label="End time"
									value={activeEventEndTimeValue}
									onChange={(changeEvent) =>
										updateEventTimeField('endTime', changeEvent.target.value)
									}
									className="h-[32px] rounded-[6px] border border-black bg-white px-[6px] font-inter text-[14px] font-medium text-black"
								>
									{eventEndTimeOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{formatVenueCreateEventTimeLabel(option.value)}
										</option>
									))}
								</select>
								<span className="rounded bg-white/55 px-[6px] py-[3px] font-inter text-[12px] font-medium leading-none text-black">
									{eventDurationLabel}
								</span>
							</div>
						</>
					)}
				</div>

				{/* Pay */}
				<div className="border-b-[2px] border-black bg-[#86B7DA] px-[12px] pb-[12px] pt-[8px]">
					<span className={BAND_LABEL_CLASS}>Pay</span>
					<label className="mt-[2px] flex h-[28px] w-[140px] cursor-text items-center gap-[4px] rounded-[8px] bg-white px-[10px]">
						<PayRangeMoneyIcon className="h-[20px] w-[20px] shrink-0" />
						<input
							aria-label="Pay"
							value={eventForm.pay}
							onChange={(changeEvent) => updateEventField('pay', changeEvent.target.value)}
							inputMode="decimal"
							placeholder="$150"
							className="min-w-0 flex-1 border-0 bg-transparent p-0 font-inter text-[16px] font-medium leading-none text-black outline-none placeholder:text-black/35"
						/>
					</label>
				</div>

				{/* Details */}
				<div className="bg-[#76AACE] px-[12px] pb-[12px] pt-[8px]">
					<span className={BAND_LABEL_CLASS}>Details</span>
					<textarea
						aria-label="Details"
						value={eventForm.details}
						onChange={(changeEvent) =>
							updateEventField('details', changeEvent.target.value)
						}
						placeholder="Describe the event, who you’re looking for, pay details…"
						className="mt-[4px] min-h-[180px] w-full resize-none rounded-[12px] border-0 bg-[#E8F1F8] p-[12px] font-inter text-[14px] font-medium leading-[20px] text-black outline-none placeholder:text-black/35"
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={handlePublish}
				disabled={isSavingEvent}
				className="flex h-[48px] w-full items-center justify-center rounded-full border-[1.5px] border-black bg-[#FF818A] font-inter text-[18px] font-semibold text-black active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
				style={{ marginTop: '12px' }}
			>
				{submitButtonLabel}
			</button>
			<p className="sr-only" aria-live="polite">
				{publishState === 'missing-name' ? 'Event name is required.' : ''}
			</p>
		</div>
	);
}
