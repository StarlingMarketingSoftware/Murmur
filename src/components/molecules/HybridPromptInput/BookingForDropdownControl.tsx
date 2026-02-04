import { cn } from '@/utils';
import type { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import type { UseFormReturn } from 'react-hook-form';
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type FC,
} from 'react';
import { createPortal } from 'react-dom';
 
type BookingForTab = 'Anytime' | 'Season' | 'Calendar';
type BookingForSeason = 'Spring' | 'Summer' | 'Fall' | 'Winter';
 
const BOOKING_FOR_TAB_CHROME_TRANSITION = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
 
const BOOKING_FOR_SEASON_STYLES: Record<BookingForSeason, { bgClass: string; textClass: string }> = {
	Spring: { bgClass: 'bg-[#9BD2FF]', textClass: 'text-black' },
	Summer: { bgClass: 'bg-[#7ADF85]', textClass: 'text-black' },
	Fall: { bgClass: 'bg-[#D77C2C]', textClass: 'text-white' },
	Winter: { bgClass: 'bg-[#1960AC]', textClass: 'text-white' },
};
 
const isBookingForSeason = (value: string): value is BookingForSeason =>
	value === 'Spring' || value === 'Summer' || value === 'Fall' || value === 'Winter';
 
type UseBookingForDropdownControllerArgs = {
	form: UseFormReturn<DraftingFormValues>;
	defaultTriggerBgClass?: string;
	defaultTriggerTextClass?: string;
	/**
	 * When true, calls to setValue('bookingFor', ...) will set shouldDirty: true.
	 * Useful for forms that track unsaved changes based on dirty state.
	 */
	shouldDirty?: boolean;
};
 
export const useBookingForDropdownController = ({
	form,
	defaultTriggerBgClass = 'bg-white',
	defaultTriggerTextClass = 'text-black',
	shouldDirty = false,
}: UseBookingForDropdownControllerArgs) => {
	const [isBookingForOpen, setIsBookingForOpen] = useState(false);
	const bookingForValue = form.watch('bookingFor') || 'Anytime';
	const bookingForSeasonFromValue = isBookingForSeason(bookingForValue) ? bookingForValue : null;
	const bookingForTriggerBgClass = bookingForSeasonFromValue
		? BOOKING_FOR_SEASON_STYLES[bookingForSeasonFromValue].bgClass
		: defaultTriggerBgClass;
	const bookingForTriggerTextClass = bookingForSeasonFromValue
		? BOOKING_FOR_SEASON_STYLES[bookingForSeasonFromValue].textClass
		: defaultTriggerTextClass;
	const setBookingForValue = useCallback(
		(value: string) => {
			form.setValue('bookingFor', value, shouldDirty ? { shouldDirty: true } : undefined);
		},
		[form, shouldDirty]
	);
 
	const [bookingForTab, setBookingForTab] = useState<BookingForTab>('Anytime');
	const [hoveredBookingForTab, setHoveredBookingForTab] = useState<BookingForTab | null>(null);
	const [bookingForSeason, setBookingForSeason] = useState<BookingForSeason>('Spring');
	const [hoveredBookingForSeason, setHoveredBookingForSeason] =
		useState<BookingForSeason | null>(null);
	const bookingForPreviewSeason = hoveredBookingForSeason ?? bookingForSeason;
	const [bookingForCalendarBaseMonth, setBookingForCalendarBaseMonth] = useState<Date>(() => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	});
	const [bookingForCalendarStartDate, setBookingForCalendarStartDate] = useState<Date | null>(null);
	const [bookingForCalendarEndDate, setBookingForCalendarEndDate] = useState<Date | null>(null);
 
	const bookingForContainerRef = useRef<HTMLDivElement | null>(null);
	const bookingForButtonRef = useRef<HTMLButtonElement | null>(null);
	const bookingForDropdownRef = useRef<HTMLDivElement | null>(null);
	const bookingForCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [bookingForDropdownPosition, setBookingForDropdownPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
 
	const clearBookingForCloseTimeout = useCallback(() => {
		if (bookingForCloseTimeoutRef.current == null) return;
		clearTimeout(bookingForCloseTimeoutRef.current);
		bookingForCloseTimeoutRef.current = null;
	}, []);
 
	const scheduleBookingForCloseTimeout = useCallback(() => {
		clearBookingForCloseTimeout();
		bookingForCloseTimeoutRef.current = setTimeout(() => {
			setIsBookingForOpen(false);
		}, 1000);
	}, [clearBookingForCloseTimeout]);
 
	const closeBookingForDropdown = useCallback(() => {
		clearBookingForCloseTimeout();
		setIsBookingForOpen(false);
	}, [clearBookingForCloseTimeout]);
 
	useEffect(() => {
		if (!isBookingForOpen) {
			setHoveredBookingForTab(null);
		}
		if (!isBookingForOpen || bookingForTab !== 'Season') {
			setHoveredBookingForSeason(null);
		}
	}, [isBookingForOpen, bookingForTab]);
 
	// Used to nudge the internal 3-way tab strip inside the Calendar dropdown so it aligns
	// with where the strip sits in the narrower Anytime/Season dropdown.
	const [bookingForTabStripLeft, setBookingForTabStripLeft] = useState<number | null>(null);
	const bookingForDropdownSize = useMemo(() => {
		if (bookingForTab === 'Calendar') return { width: 829, height: 468 };
		if (bookingForTab === 'Season') return { width: 317, height: 151 };
		return { width: 317, height: 46 };
	}, [bookingForTab]);
 
	const updateBookingForDropdownPosition = useCallback(() => {
		if (typeof window === 'undefined') return;
		// Use the container's position to match static positioning (which uses left: 0 relative to container)
		const container = bookingForContainerRef.current;
		const button = bookingForButtonRef.current;
		if (!container || !button) return;
 
		// Get the page zoom factor. Murmur uses `zoom: 0.9` (or similar) on <html>.
		// getBoundingClientRect() returns zoomed coordinates, but position: fixed uses unzoomed.
		// We need to divide by zoom to convert.
		const getZoomFactor = (): number => {
			const html = document.documentElement;
			const computed = window.getComputedStyle(html);
			const zoom = computed.zoom;
			if (zoom && zoom !== 'normal') {
				const zoomValue = parseFloat(zoom);
				if (Number.isFinite(zoomValue) && zoomValue > 0) return zoomValue;
			}
			return 1;
		};
		const zoom = getZoomFactor();
 
		const containerRect = container.getBoundingClientRect();
		const buttonRect = button.getBoundingClientRect();
		const margin = 6;
		const viewportPadding = 8;
 
		// For Calendar, we want the tabs CENTERED in the Calendar box,
		// but the whole Calendar shifted left so those centered tabs roughly align with Anytime/Season tabs.
		//
		// Anytime/Season (317px): tabs (284px) centered = tab center at 158.5px from dropdown left
		// Calendar (829px): tabs centered = tab center at 414.5px from dropdown left
		// Base shift: (414.5 - 158.5) = 256px, but we offset 20px right for better visual balance
		const tabStripWidth = 284;
		const narrowDropdownWidth = 317;
		const calendarWidth = bookingForDropdownSize.width; // 829
		const narrowTabCenter = narrowDropdownWidth / 2; // 158.5
		const calendarTabCenter = calendarWidth / 2; // 414.5
		const calendarShift = calendarTabCenter - narrowTabCenter - 20; // 236 (20px less shift = 20px right)
 
		// Convert zoomed coordinates to unzoomed for fixed positioning
		const baseLeft = containerRect.left / zoom;
		let left = bookingForTab === 'Calendar' ? baseLeft - calendarShift : baseLeft;
		let top = (buttonRect.bottom + margin) / zoom;
 
		// Make sure it doesn't overflow viewport edges (in unzoomed coordinates)
		const viewportWidth = window.innerWidth / zoom;
		const viewportHeight = window.innerHeight / zoom;
		const maxLeft = Math.max(
			viewportPadding,
			viewportWidth - bookingForDropdownSize.width - viewportPadding
		);
		left = Math.min(left, maxLeft);
		left = Math.max(left, viewportPadding);
 
		// For Calendar, adjust tab position to compensate for the 20px right shift of the box.
		// Tabs centered in Calendar would be at (829-284)/2 = 272.5px from Calendar left.
		// To shift tabs 20px LEFT (to align with Anytime/Season), use paddingLeft of 272.5 - 20 = 252.5px
		if (bookingForTab === 'Calendar') {
			const centeredTabsLeft = (calendarWidth - tabStripWidth) / 2; // 272.5
			setBookingForTabStripLeft(Math.round(centeredTabsLeft - 20)); // 252.5, shifts tabs 20px left of center
		} else {
			setBookingForTabStripLeft(null);
		}
 
		// Check if would overflow bottom, flip above if possible
		const wouldOverflowBottom =
			top + bookingForDropdownSize.height > viewportHeight - viewportPadding;
		const canOpenAbove =
			buttonRect.top / zoom - margin - bookingForDropdownSize.height >= viewportPadding;
		if (wouldOverflowBottom && canOpenAbove) {
			top = buttonRect.top / zoom - margin - bookingForDropdownSize.height;
		}
 
		setBookingForDropdownPosition({
			top: Math.round(top),
			left: Math.round(left),
		});
	}, [bookingForDropdownSize.height, bookingForDropdownSize.width, bookingForTab]);
 
	// Close Booking For dropdown when clicking away
	useEffect(() => {
		if (!isBookingForOpen) return;
 
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
 
			const container = bookingForContainerRef.current;
			const dropdown = bookingForDropdownRef.current;
 
			if (container?.contains(target)) return;
			if (dropdown?.contains(target)) return;
			clearBookingForCloseTimeout();
			setIsBookingForOpen(false);
		};
 
		document.addEventListener('pointerdown', handlePointerDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [clearBookingForCloseTimeout, isBookingForOpen]);
 
	useEffect(() => {
		if (!isBookingForOpen) {
			clearBookingForCloseTimeout();
			setBookingForDropdownPosition(null);
			setBookingForTabStripLeft(null);
		}
	}, [clearBookingForCloseTimeout, isBookingForOpen]);
 
	useEffect(() => {
		return () => clearBookingForCloseTimeout();
	}, [clearBookingForCloseTimeout]);
 
	// Prevent navigating the calendar into months that are entirely in the past.
	useEffect(() => {
		if (!isBookingForOpen) return;
		if (bookingForTab !== 'Calendar') return;
 
		const now = new Date();
		const minBaseMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		setBookingForCalendarBaseMonth((prev) =>
			prev.getTime() < minBaseMonth.getTime() ? minBaseMonth : prev
		);
	}, [isBookingForOpen, bookingForTab]);
 
	useLayoutEffect(() => {
		if (!isBookingForOpen) return;
		updateBookingForDropdownPosition();
	}, [isBookingForOpen, bookingForTab, updateBookingForDropdownPosition]);
 
	useEffect(() => {
		if (!isBookingForOpen) return;
		if (typeof window === 'undefined') return;
 
		const handle = () => updateBookingForDropdownPosition();
		window.addEventListener('resize', handle);
		// capture=true so we also reposition when any scrollable ancestor scrolls
		window.addEventListener('scroll', handle, true);
		return () => {
			window.removeEventListener('resize', handle);
			window.removeEventListener('scroll', handle, true);
		};
	}, [isBookingForOpen, updateBookingForDropdownPosition]);
 
	const handleBookingForTriggerClick = useCallback(() => {
		clearBookingForCloseTimeout();
		if (isBookingForOpen) {
			setIsBookingForOpen(false);
			return;
		}
 
		const isSeasonSelection = isBookingForSeason(bookingForValue);
 
		// Prefer the last selected tab when reopening the dropdown.
		// This lets Calendar keep the previous "Booking For" label until a date is selected.
		if (bookingForTab === 'Calendar') {
			setBookingForTab('Calendar');
		} else if (bookingForTab === 'Season') {
			if (isSeasonSelection) {
				setBookingForSeason(bookingForValue);
			}
			setBookingForTab('Season');
		} else if (bookingForCalendarStartDate != null) {
			setBookingForTab('Calendar');
		} else if (isSeasonSelection) {
			setBookingForSeason(bookingForValue);
			setBookingForTab('Season');
		} else {
			setBookingForTab('Anytime');
		}
 
		setIsBookingForOpen(true);
	}, [
		bookingForCalendarStartDate,
		bookingForTab,
		bookingForValue,
		clearBookingForCloseTimeout,
		isBookingForOpen,
	]);
 
	return {
		BOOKING_FOR_SEASON_STYLES,
		BOOKING_FOR_TAB_CHROME_TRANSITION,
		isBookingForOpen,
		setIsBookingForOpen,
		closeBookingForDropdown,
		handleBookingForTriggerClick,
		bookingForValue,
		bookingForSeasonFromValue,
		bookingForTriggerBgClass,
		bookingForTriggerTextClass,
		setBookingForValue,
		bookingForTab,
		setBookingForTab,
		hoveredBookingForTab,
		setHoveredBookingForTab,
		bookingForSeason,
		setBookingForSeason,
		hoveredBookingForSeason,
		setHoveredBookingForSeason,
		bookingForPreviewSeason,
		bookingForCalendarBaseMonth,
		setBookingForCalendarBaseMonth,
		bookingForCalendarStartDate,
		setBookingForCalendarStartDate,
		bookingForCalendarEndDate,
		setBookingForCalendarEndDate,
		bookingForContainerRef,
		bookingForButtonRef,
		bookingForDropdownRef,
		clearBookingForCloseTimeout,
		scheduleBookingForCloseTimeout,
		bookingForDropdownPosition,
		bookingForDropdownSize,
		bookingForTabStripLeft,
	} as const;
};
 
export type BookingForDropdownController = ReturnType<typeof useBookingForDropdownController>;
 
type BookingForDropdownControlProps = {
	controller: BookingForDropdownController;
	/**
	 * When true, the Calendar dropdown is scaled/positioned to align correctly
	 * with a parent container that is visually scaled (e.g. landing page demos).
	 */
	useStaticDropdownPosition?: boolean;
	dataHoverDescription?: string;
	/**
	 * Controls the right padding on the trigger content wrapper.
	 * Defaults to the Full Auto "closed custom instructions" layout.
	 */
	triggerContentPaddingRightClassName?: string;
};
 
export const BookingForDropdownControl: FC<BookingForDropdownControlProps> = ({
	controller,
	useStaticDropdownPosition = false,
	dataHoverDescription = "What timeframe are you booking in. There's a calendar in there as well as picking seasons",
	triggerContentPaddingRightClassName = 'pr-12',
}) => {
	const {
		BOOKING_FOR_SEASON_STYLES: BOOKING_FOR_SEASON_STYLES_LOCAL,
		isBookingForOpen,
		handleBookingForTriggerClick,
		bookingForValue,
		bookingForSeasonFromValue,
		bookingForTriggerBgClass,
		bookingForTriggerTextClass,
		setBookingForValue,
		bookingForTab,
		setBookingForTab,
		hoveredBookingForTab,
		setHoveredBookingForTab,
		bookingForSeason,
		setBookingForSeason,
		hoveredBookingForSeason,
		setHoveredBookingForSeason,
		bookingForPreviewSeason,
		bookingForCalendarBaseMonth,
		setBookingForCalendarBaseMonth,
		bookingForCalendarStartDate,
		setBookingForCalendarStartDate,
		bookingForCalendarEndDate,
		setBookingForCalendarEndDate,
		bookingForContainerRef,
		bookingForButtonRef,
		bookingForDropdownRef,
		clearBookingForCloseTimeout,
		scheduleBookingForCloseTimeout,
		bookingForDropdownPosition,
		bookingForDropdownSize,
		bookingForTabStripLeft,
	} = controller;
 
	return (
		<div ref={bookingForContainerRef} className="relative mt-[10px] w-full">
			<button
				ref={bookingForButtonRef}
				type="button"
				data-hover-description={dataHoverDescription}
				onClick={handleBookingForTriggerClick}
				className={cn(
					'w-full h-[28px] rounded-[8px] border-2 border-black flex items-center px-4 whitespace-nowrap',
					bookingForTriggerBgClass
				)}
				aria-haspopup="dialog"
				aria-expanded={isBookingForOpen}
			>
				<div
					className={cn(
						'inline-flex min-w-[203px] items-center justify-between gap-2',
						triggerContentPaddingRightClassName
					)}
				>
					<span
						className={cn(
							'font-inter font-normal text-[14px] leading-[14px] whitespace-nowrap',
							bookingForTriggerTextClass
						)}
					>
						Booking For
					</span>
					<span
						className={cn(
							'font-inter font-bold text-[14px] leading-[14px] mr-1 whitespace-nowrap',
							bookingForTriggerTextClass
						)}
					>
						{bookingForValue}
					</span>
				</div>
			</button>
 
			{isBookingForOpen &&
				(bookingForDropdownPosition || bookingForTab !== 'Calendar') &&
				(() => {
					// Anytime/Season use static (absolute) positioning - they fit in the container.
					// Calendar uses portal with fixed positioning so it's not clipped by overflow.
					const useStatic = bookingForTab !== 'Calendar';
 
					// For Calendar in landing page mode, calculate position to align tabs with button
					// Note: In landing mode the entire HybridPromptInput panel is scaled down (see `LandingDraftingDemo`).
					// The Calendar dropdown is portaled to `document.body`, so we must:
					// - Scale the Calendar dropdown by the same factor, and
					// - Compute its fixed position in *screen* pixels so the tab strip doesn't "jump".
					const landingScale = (() => {
						// If the panel isn't scaled, this should be ~1.
						const anchor = bookingForButtonRef.current;
						if (!anchor) return 1;
						const unscaledWidth = anchor.offsetWidth;
						if (!unscaledWidth) return 1;
						const scaledWidth = anchor.getBoundingClientRect().width;
						const scale = scaledWidth / unscaledWidth;
						return Number.isFinite(scale) && scale > 0 ? scale : 1;
					})();
					// For landing page, position Calendar so centered tabs align with Anytime/Season tabs.
					// With transformOrigin: 'top left', the left edge stays in place during scaling.
					const getCalendarLandingPosition = () => {
						if (!useStaticDropdownPosition || bookingForTab !== 'Calendar') {
							return null;
						}
						const containerRect = bookingForContainerRef.current?.getBoundingClientRect();
						if (!containerRect) return null;
 
						// Anytime/Season tabs are centered in 317px at 16.5px from dropdown left
						// Calendar tabs are centered in 829px at 272.5px from dropdown left
						// To align: Calendar left = container left - (272.5 - 16.5) = container left - 256
						// Fine-tuned to 250px for better visual alignment
						const tabsAlignShift = 250 * landingScale;
 
						return {
							top: containerRect.bottom + 6 * landingScale,
							left: containerRect.left - tabsAlignShift,
						};
					};
					const calendarPos = getCalendarLandingPosition();
 
					const dropdownContent = (
						<div
							ref={bookingForDropdownRef}
							style={
								useStatic
									? {
											position: 'absolute',
											top: '100%',
											left: 0,
											marginTop: 6,
											width: bookingForDropdownSize.width,
											height: bookingForDropdownSize.height,
									  }
									: {
											position: 'fixed',
											top: calendarPos?.top ?? bookingForDropdownPosition?.top ?? 0,
											left: calendarPos?.left ?? bookingForDropdownPosition?.left ?? 0,
											width: bookingForDropdownSize.width,
											height: bookingForDropdownSize.height,
											// Scale down Calendar in landing page mode to match the scaled container
											...(useStaticDropdownPosition && bookingForTab === 'Calendar'
												? {
														transform: `scale(${landingScale})`,
														transformOrigin: 'top left',
												  }
												: {}),
									  }
							}
							className={cn(
								'z-[9999] rounded-[6px]',
								bookingForTab === 'Season'
									? BOOKING_FOR_SEASON_STYLES_LOCAL[bookingForPreviewSeason].bgClass
									: 'bg-[#F5F5F5]',
								'border-2 border-black',
								'flex flex-col overflow-hidden'
							)}
							onMouseEnter={clearBookingForCloseTimeout}
							onMouseLeave={() => {
								setHoveredBookingForTab(null);
								setHoveredBookingForSeason(null);
								scheduleBookingForCloseTimeout();
							}}
							role="dialog"
							aria-label="Booking For"
						>
							<div className="relative h-[46px]">
								{bookingForTab === 'Season' && (
									<div
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 flex items-center justify-center"
									>
										<div className="w-[284px] h-[32px] bg-[#E2E2E2] opacity-30 rounded-[6px]" />
									</div>
								)}
 
								<div
									className={cn(
										'relative z-[1] h-full flex items-center',
										// On landing page (useStaticDropdownPosition), always center tabs
										// On campaign page, use paddingLeft to align tabs
										!useStaticDropdownPosition && bookingForTabStripLeft != null
											? 'justify-start'
											: 'justify-center'
									)}
									style={
										!useStaticDropdownPosition && bookingForTabStripLeft != null
											? { paddingLeft: bookingForTabStripLeft }
											: undefined
									}
								>
									<div
										className="w-[284px] grid grid-cols-3 items-center gap-[8px]"
										onMouseLeave={() => setHoveredBookingForTab(null)}
									>
										{(['Anytime', 'Season', 'Calendar'] as const).map((opt) => {
											const isSelected = bookingForTab === opt;
											const isDimmed =
												hoveredBookingForTab !== null && hoveredBookingForTab !== opt;
											const isHovered = hoveredBookingForTab === opt;
											return (
												<button
													key={opt}
													type="button"
													onMouseEnter={() => setHoveredBookingForTab(opt)}
													onClick={() => {
														if (opt === 'Season') {
															setBookingForTab('Season');
															return;
														}
 
														if (opt === 'Anytime') {
															setBookingForValue('Anytime');
															setBookingForCalendarStartDate(null);
															setBookingForCalendarEndDate(null);
															setBookingForTab('Anytime');
															return;
														}
 
														// Calendar
														setBookingForTab('Calendar');
													}}
													className={cn(
														'h-[28px] w-[81px] rounded-[6px] font-inter text-[14px] leading-[14px] text-black',
														'flex items-center justify-center text-center justify-self-center',
														isSelected ? 'font-semibold' : 'font-normal'
													)}
													style={{
														backgroundColor: isDimmed
															? '#FFFFFF'
															: isSelected
																? opt === 'Season'
																	? '#F5F5F5'
																	: '#C2C2C2'
																: isHovered
																	? 'rgba(0,0,0,0.05)'
																	: 'transparent',
														boxShadow:
															hoveredBookingForTab !== null
																? 'inset 0 0 0 1px #000000'
																: 'inset 0 0 0 1px rgba(0,0,0,0)',
														transition: `background-color ${BOOKING_FOR_TAB_CHROME_TRANSITION}, box-shadow ${BOOKING_FOR_TAB_CHROME_TRANSITION}`,
													}}
													role="button"
													aria-pressed={isSelected}
												>
													<span
														style={{
															opacity: isDimmed ? 0 : 1,
															transition: `opacity ${BOOKING_FOR_TAB_CHROME_TRANSITION}`,
														}}
													>
														{opt}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							</div>
 
							{bookingForTab === 'Season' && (
								<div className="flex-1 flex flex-col items-center justify-center gap-[10px] pb-[10px]">
									{(['Spring', 'Summer', 'Fall', 'Winter'] as const).map((season) => {
										const isSelectedSeason = bookingForSeasonFromValue === season;
										const isHoveredSeason = hoveredBookingForSeason === season;
										const isActiveSeason = isSelectedSeason || isHoveredSeason;
										return (
											<button
												key={season}
												type="button"
												onClick={() => {
													setBookingForSeason(season);
													setBookingForValue(season);
													setBookingForCalendarStartDate(null);
													setBookingForCalendarEndDate(null);
												}}
												onMouseEnter={() => setHoveredBookingForSeason(season)}
												onMouseLeave={() => setHoveredBookingForSeason(null)}
												className={cn(
													'font-inter text-[14px] leading-[16px]',
													isActiveSeason
														? 'font-semibold text-white'
														: 'font-normal text-black opacity-90 hover:opacity-100'
												)}
											>
												{season}
											</button>
										);
									})}
								</div>
							)}
 
							{bookingForTab === 'Calendar' && (
								<div
									className="flex-1 w-full p-[14px]"
									data-hover-description="Pick a date range that you want to book within. This will be included in the drafting"
								>
									<div className="w-full h-full flex flex-col gap-[16px]">
										{/* Top row */}
										<div
											className="w-full flex items-center justify-center gap-[24px]"
											data-hover-description-suppress="true"
										>
											{(() => {
												const now = new Date();
												const minBaseMonth = new Date(now.getFullYear(), now.getMonth(), 1);
												const isPrevDisabled =
													bookingForCalendarBaseMonth.getTime() <= minBaseMonth.getTime();
 
												const currentMonth = new Intl.DateTimeFormat(undefined, {
													month: 'long',
												}).format(bookingForCalendarBaseMonth);
												const nextMonthDate = new Date(
													bookingForCalendarBaseMonth.getFullYear(),
													bookingForCalendarBaseMonth.getMonth() + 1,
													1
												);
												const nextMonth = new Intl.DateTimeFormat(undefined, {
													month: 'long',
												}).format(nextMonthDate);
 
												return (
													<div className="w-full flex items-center justify-center gap-[12px]">
														<button
															type="button"
															disabled={isPrevDisabled}
															data-hover-description-suppress="true"
															onClick={() => {
																setBookingForCalendarBaseMonth((prev) => {
																	const next = new Date(
																		prev.getFullYear(),
																		prev.getMonth() - 1,
																		1
																	);
																	return next.getTime() < minBaseMonth.getTime()
																		? prev
																		: next;
																});
															}}
															className="shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:hover:opacity-100"
															aria-label="Previous month"
														>
															<LeftArrow
																width={8}
																height={16}
																color={isPrevDisabled ? '#A0A0A0' : '#000000'}
																opacity={isPrevDisabled ? 0.6 : 1}
															/>
														</button>
 
														<div className="flex items-center justify-center gap-[24px]">
															<div
																className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]"
																data-hover-description-suppress="true"
															>
																<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																	{currentMonth}
																</span>
															</div>
															<div
																className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]"
																data-hover-description-suppress="true"
															>
																<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																	{nextMonth}
																</span>
															</div>
														</div>
 
														<button
															type="button"
															data-hover-description-suppress="true"
															onClick={() => {
																setBookingForCalendarBaseMonth((prev) => {
																	return new Date(
																		prev.getFullYear(),
																		prev.getMonth() + 1,
																		1
																	);
																});
															}}
															className="shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
															aria-label="Next month"
														>
															<RightArrow
																width={8}
																height={16}
																color="#000000"
																opacity={1}
															/>
														</button>
													</div>
												);
											})()}
										</div>
 
										{/* Bottom row */}
										<div
											className="w-full flex items-center justify-center gap-[24px]"
											data-hover-description-suppress="true"
										>
											{(() => {
												const now = new Date();
												const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
												const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
 
												const formatMonthDay = (date: Date) => {
													return new Intl.DateTimeFormat('en-US', {
														month: 'short',
														day: 'numeric',
													}).format(date);
												};
 
												const handleSelectCalendarDate = (date: Date) => {
													// Prevent selecting past dates
													if (date.getTime() < today.getTime()) return;
 
													// First click (or restarting selection)
													if (
														bookingForCalendarStartDate == null ||
														bookingForCalendarEndDate != null
													) {
														setBookingForCalendarStartDate(date);
														setBookingForCalendarEndDate(null);
														setBookingForValue(formatMonthDay(date));
														return;
													}
 
													// Second click completes the range
													const start = bookingForCalendarStartDate;
													if (date.getTime() < start.getTime()) {
														setBookingForCalendarStartDate(date);
														setBookingForCalendarEndDate(start);
														setBookingForValue(
															`${formatMonthDay(date)} - ${formatMonthDay(start)}`
														);
														return;
													}
 
													setBookingForCalendarEndDate(date);
													if (date.getTime() === start.getTime()) {
														setBookingForValue(formatMonthDay(start));
													} else {
														setBookingForValue(
															`${formatMonthDay(start)} - ${formatMonthDay(date)}`
														);
													}
												};
 
												const renderMonthGrid = (monthDate: Date) => {
													const year = monthDate.getFullYear();
													const month = monthDate.getMonth();
													const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
													const daysInMonth = new Date(year, month + 1, 0).getDate();
 
													const cells = Array.from({ length: 42 }, (_, idx) => {
														const dayNumber = idx - firstDayOfWeek + 1;
														if (dayNumber < 1 || dayNumber > daysInMonth) return null;
														return new Date(year, month, dayNumber);
													});
 
													return (
														<div
															className="w-[364px] h-[312px] rounded-[8px] bg-[#E2E2E2] p-[18px] flex flex-col"
															data-hover-description-suppress="true"
														>
															<div className="grid grid-cols-7 text-center">
																{weekDays.map((d) => (
																	<div
																		key={d}
																		className="font-inter font-medium text-[12px] leading-[12px] text-black/35"
																	>
																		{d}
																	</div>
																))}
															</div>
 
															<div className="mt-[18px] grid grid-cols-7 grid-rows-6 flex-1">
																{cells.map((cellDate, idx) => {
																	if (!cellDate) {
																		return <div key={idx} aria-hidden="true" />;
																	}
 
																	const cellDayStart = new Date(
																		cellDate.getFullYear(),
																		cellDate.getMonth(),
																		cellDate.getDate()
																	);
																	const isPast = cellDayStart.getTime() < today.getTime();
 
																	const hasRange =
																		bookingForCalendarStartDate != null &&
																		bookingForCalendarEndDate != null &&
																		bookingForCalendarStartDate.getTime() !==
																			bookingForCalendarEndDate.getTime();
																	const rangeStart = bookingForCalendarStartDate;
																	const rangeEnd = bookingForCalendarEndDate;
 
																	const isStartSelected =
																		rangeStart != null &&
																		cellDayStart.getTime() === rangeStart.getTime();
																	const isEndSelected =
																		rangeEnd != null &&
																		cellDayStart.getTime() === rangeEnd.getTime();
 
																	const isInRange =
																		hasRange &&
																		rangeStart != null &&
																		rangeEnd != null &&
																		cellDayStart.getTime() > rangeStart.getTime() &&
																		cellDayStart.getTime() < rangeEnd.getTime();
 
																	const isInRangeInclusive =
																		hasRange &&
																		rangeStart != null &&
																		rangeEnd != null &&
																		cellDayStart.getTime() >= rangeStart.getTime() &&
																		cellDayStart.getTime() <= rangeEnd.getTime();
 
																	const prevDay = new Date(
																		cellDayStart.getFullYear(),
																		cellDayStart.getMonth(),
																		cellDayStart.getDate() - 1
																	);
																	const nextDay = new Date(
																		cellDayStart.getFullYear(),
																		cellDayStart.getMonth(),
																		cellDayStart.getDate() + 1
																	);
																	const prevInRange =
																		isInRangeInclusive &&
																		rangeStart != null &&
																		rangeEnd != null &&
																		prevDay.getTime() >= rangeStart.getTime() &&
																		prevDay.getTime() <= rangeEnd.getTime();
																	const nextInRange =
																		isInRangeInclusive &&
																		rangeStart != null &&
																		rangeEnd != null &&
																		nextDay.getTime() >= rangeStart.getTime() &&
																		nextDay.getTime() <= rangeEnd.getTime();
 
																	const isRowStart = idx % 7 === 0;
																	const isRowEnd = idx % 7 === 6;
																	const isRangeLeftCap =
																		isInRangeInclusive && (isRowStart || !prevInRange);
																	const isRangeRightCap =
																		isInRangeInclusive && (isRowEnd || !nextInRange);
 
																	return (
																		<button
																			key={idx}
																			className={cn(
																				'relative w-full h-full flex items-center justify-center group',
																				'bg-transparent border-0 p-0',
																				isPast ? 'cursor-not-allowed' : 'cursor-pointer'
																			)}
																			type="button"
																			disabled={isPast}
																			data-hover-description-suppress="true"
																			onClick={() => handleSelectCalendarDate(cellDayStart)}
																			aria-label={new Intl.DateTimeFormat('en-US', {
																				month: 'long',
																				day: 'numeric',
																				year: 'numeric',
																			}).format(cellDayStart)}
																		>
																			{/* Range pill background */}
																			{isInRangeInclusive && (
																				<div
																					aria-hidden="true"
																					className={cn(
																						'absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[34px] bg-white/55',
																						isRangeLeftCap && 'rounded-l-full',
																						isRangeRightCap && 'rounded-r-full'
																					)}
																				/>
																			)}
 
																			{/* Day circle / number */}
																			<div
																				className={cn(
																					'relative z-[1] w-[34px] h-[34px] rounded-full flex items-center justify-center',
																					'border border-transparent transition-colors',
																					'font-inter text-[16px] leading-[16px]',
																					!isPast &&
																						!isStartSelected &&
																						!isEndSelected &&
																						'group-hover:border-black',
																					(isStartSelected || isEndSelected) &&
																						'bg-black text-white',
																					isEndSelected &&
																						hasRange &&
																						'ring-2 ring-white ring-offset-2 ring-offset-black',
																					!isStartSelected &&
																						!isEndSelected &&
																						(isInRange
																							? 'text-black'
																							: isPast
																								? 'text-black/25'
																								: 'text-black')
																				)}
																			>
																				{cellDate.getDate()}
																			</div>
																		</button>
																	);
																})}
															</div>
														</div>
													);
												};
 
												const nextMonthBase = new Date(
													bookingForCalendarBaseMonth.getFullYear(),
													bookingForCalendarBaseMonth.getMonth() + 1,
													1
												);
 
												return (
													<>
														{renderMonthGrid(bookingForCalendarBaseMonth)}
														{renderMonthGrid(nextMonthBase)}
													</>
												);
											})()}
										</div>
									</div>
								</div>
							)}
						</div>
					);
					return useStatic
						? dropdownContent
						: typeof document !== 'undefined'
							// Portal to <html> instead of <body> because Murmur uses
							// body { transform: scale() } on Firefox, which would offset
							// position: fixed children.
							? createPortal(dropdownContent, document.documentElement)
							: null;
				})()}
		</div>
	);
};
