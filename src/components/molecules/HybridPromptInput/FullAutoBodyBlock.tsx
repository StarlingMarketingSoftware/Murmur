import { cn } from '@/utils';
import React, {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { Textarea } from '@/components/ui/textarea';
import { Typography } from '@/components/ui/typography';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import UndoIcon from '@/components/atoms/_svg/UndoIcon';
import UpscaleIcon from '@/components/atoms/_svg/UpscaleIcon';

export type FullAutoProfileFields = {
	name: string;
	genre: string;
	area: string;
	band: string;
	bio: string;
	links: string;
};

interface FullAutoBodyBlockProps {
	form: UseFormReturn<DraftingFormValues>;
	/**
	 * Index of the `full_automated` entry inside `hybridBlockPrompts`.
	 * The Custom Instructions textarea is stored at `hybridBlockPrompts.{fieldIndex}.value`.
	 */
	fieldIndex: number;
	profileFields?: FullAutoProfileFields | null;
	onGoToProfileTab?: () => void;
	onCustomInstructionsOpenChange?: (isOpen: boolean) => void;
	onGetSuggestions?: (prompt: string) => Promise<void>;
	promptQualityScore?: number | null;
	onUpscalePrompt?: () => Promise<void>;
	isUpscalingPrompt?: boolean;
	hasPreviousPrompt?: boolean;
	onUndoUpscalePrompt?: () => void;
	/**
	 * Mini panels often have fixed-height layouts; when true, keep the block at 233px
	 * and allow internal scrolling when Custom Instructions is expanded.
	 */
	constrainHeight?: boolean;
	className?: string;
}

type BookingForTab = 'Anytime' | 'Season' | 'Calendar';
type BookingForSeason = 'Spring' | 'Summer' | 'Fall' | 'Winter';

type ProfileChipItem = {
	key: string;
	text: string;
	bgClass: string;
	isEmpty: boolean;
};

export const FullAutoBodyBlock: FC<FullAutoBodyBlockProps> = ({
	form,
	fieldIndex,
	profileFields,
	onGoToProfileTab,
	onCustomInstructionsOpenChange,
	onGetSuggestions,
	promptQualityScore,
	onUpscalePrompt,
	isUpscalingPrompt,
	hasPreviousPrompt,
	onUndoUpscalePrompt,
	constrainHeight,
	className,
}) => {
	// Power mode from form (shared with HybridPromptInput + MiniEmailStructure)
	const selectedPowerMode = form.watch('powerMode') || 'normal';
	const setSelectedPowerMode = (mode: 'normal' | 'high') => {
		form.setValue('powerMode', mode, { shouldDirty: true });
	};

	// Full Auto: Custom Instructions expander
	const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(false);
	const customInstructionsRef = useRef<HTMLTextAreaElement | null>(null);
	const customInstructionsContainerRef = useRef<HTMLDivElement | null>(null);

	// Full Auto: Booking For dropdown
	const [isBookingForOpen, setIsBookingForOpen] = useState(false);
	const bookingForValue = form.watch('bookingFor') || 'Anytime';
	const setBookingForValue = useCallback(
		(value: string) => {
			form.setValue('bookingFor', value, { shouldDirty: true });
		},
		[form]
	);
	const [bookingForTab, setBookingForTab] = useState<BookingForTab>('Anytime');
	const [bookingForSeason, setBookingForSeason] = useState<BookingForSeason>('Spring');
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

	// Calendar dropdown: align the internal tab strip with narrow dropdown positioning
	const [bookingForTabStripLeft, setBookingForTabStripLeft] = useState<number | null>(null);
	const bookingForDropdownSize = useMemo(() => {
		if (bookingForTab === 'Calendar') return { width: 829, height: 468 };
		if (bookingForTab === 'Season') return { width: 317, height: 151 };
		return { width: 317, height: 46 };
	}, [bookingForTab]);

	const updateBookingForDropdownPosition = useCallback(() => {
		if (typeof window === 'undefined') return;
		const anchor = bookingForButtonRef.current;
		if (!anchor) return;

		const rect = anchor.getBoundingClientRect();
		const margin = 6;
		const viewportPadding = 8;
		// MiniEmailStructure usage: dropdown looked slightly too far right + a touch too high.
		// Nudge it left/down so it sits more naturally under the trigger.
		const offsetX = 65;
		const offsetY = 55;
		const calendarNudgeX = 100;

		// For Calendar, we want the internal Anytime/Season/Calendar tab strip to line up
		// with where it sits in the narrow dropdown (Anytime/Season). If we keep the
		// Calendar dropdown fully centered, the strip can end up clamped too far right
		// when the trigger is on the left (MiniEmailStructure), so we shift the whole
		// dropdown left/right as needed to preserve alignment (within the viewport).
		let left: number;
		if (bookingForTab === 'Calendar') {
			const tabStripWidth = 284;
			const narrowDropdownWidth = 317;
			const tabStripPadding = 8;
			const minTabStripLeft = tabStripPadding;
			const maxTabStripLeft = Math.max(
				minTabStripLeft,
				bookingForDropdownSize.width - tabStripWidth - tabStripPadding
			);

			const tabStripLeftInNarrowDropdown = (narrowDropdownWidth - tabStripWidth) / 2; // 16.5
			const desiredTabStripLeftGlobal = rect.left + offsetX + tabStripLeftInNarrowDropdown;

			// The tab strip can align iff:
			//   desiredTabStripLeftGlobal ∈ [left + minTabStripLeft, left + maxTabStripLeft]
			// ⇒ left ∈ [desired - maxTabStripLeft, desired - minTabStripLeft]
			const minLeftForAlignment = desiredTabStripLeftGlobal - maxTabStripLeft;
			const maxLeftForAlignment = desiredTabStripLeftGlobal - minTabStripLeft;

			const viewportMaxLeft = Math.max(
				viewportPadding,
				window.innerWidth - bookingForDropdownSize.width - viewportPadding
			);

			// Prefer centered, then clamp into the intersection of (alignment range ∩ viewport range).
			const preferredLeft =
				(window.innerWidth - bookingForDropdownSize.width) / 2 + calendarNudgeX;
			const minLeft = Math.max(viewportPadding, minLeftForAlignment);
			const maxLeft = Math.min(viewportMaxLeft, maxLeftForAlignment);
			if (minLeft <= maxLeft) {
				left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
			} else {
				// Fallback: viewport-constrained center.
				left = Math.min(Math.max(preferredLeft, viewportPadding), viewportMaxLeft);
			}
		} else {
			left = rect.left + offsetX;
		}
		let top = rect.bottom + margin + offsetY;

		const maxLeft = Math.max(
			viewportPadding,
			window.innerWidth - bookingForDropdownSize.width - viewportPadding
		);
		left = Math.min(Math.max(left, viewportPadding), maxLeft);

		// Calendar: keep tab strip aligned with where it sits in the narrow dropdown.
		if (bookingForTab === 'Calendar') {
			const tabStripWidth = 284;
			const narrowDropdownWidth = 317;
			const tabStripLeftInNarrowDropdown = (narrowDropdownWidth - tabStripWidth) / 2; // 16.5
			const desiredTabStripLeftGlobal = rect.left + offsetX + tabStripLeftInNarrowDropdown;
			let tabStripLeftInDropdown = desiredTabStripLeftGlobal - left;

			const tabStripPadding = 8;
			const minTabStripLeft = tabStripPadding;
			const maxTabStripLeft = Math.max(
				minTabStripLeft,
				bookingForDropdownSize.width - tabStripWidth - tabStripPadding
			);
			tabStripLeftInDropdown = Math.min(
				Math.max(tabStripLeftInDropdown, minTabStripLeft),
				maxTabStripLeft
			);

			setBookingForTabStripLeft(Math.round(tabStripLeftInDropdown));
		} else {
			setBookingForTabStripLeft(null);
		}

		const wouldOverflowBottom =
			top + bookingForDropdownSize.height > window.innerHeight - viewportPadding;
		const canOpenAbove = rect.top - margin - bookingForDropdownSize.height >= viewportPadding;
		if (wouldOverflowBottom && canOpenAbove) {
			top = rect.top - margin - bookingForDropdownSize.height - offsetY;
		}

		setBookingForDropdownPosition({
			top: Math.round(top),
			left: Math.round(left),
		});
	}, [bookingForDropdownSize.height, bookingForDropdownSize.width, bookingForTab]);

	// Focus textarea when Custom Instructions opens
	useEffect(() => {
		if (!isCustomInstructionsOpen) return;
		requestAnimationFrame(() => customInstructionsRef.current?.focus());
	}, [isCustomInstructionsOpen]);

	// Notify parent when Custom Instructions opens/closes
	useEffect(() => {
		onCustomInstructionsOpenChange?.(isCustomInstructionsOpen);
	}, [isCustomInstructionsOpen, onCustomInstructionsOpenChange]);

	// Ensure parent state resets when this block unmounts
	useEffect(() => {
		return () => {
			onCustomInstructionsOpenChange?.(false);
		};
	}, [onCustomInstructionsOpenChange]);

	// Close Custom Instructions when clicking away
	useEffect(() => {
		if (!isCustomInstructionsOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			const container = customInstructionsContainerRef.current;
			if (!target || !container) return;
			if (container.contains(target)) return;
			setIsCustomInstructionsOpen(false);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [isCustomInstructionsOpen]);

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

	const profileChipItems = useMemo<ProfileChipItem[]>(() => {
		const pf: FullAutoProfileFields = {
			name: profileFields?.name ?? '',
			genre: profileFields?.genre ?? '',
			area: profileFields?.area ?? '',
			band: profileFields?.band ?? '',
			bio: profileFields?.bio ?? '',
			links: profileFields?.links ?? '',
		};

		const truncate = (value: string, max: number) => {
			const v = value.trim();
			if (v.length <= max) return v;
			return v.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
		};

		const chips: ProfileChipItem[] = [];

		const name = pf.name.trim();
		const genre = pf.genre.trim();
		const area = pf.area.trim();
		const band = pf.band.trim();
		const bio = pf.bio.trim();
		const linksRaw = pf.links.trim();

		chips.push({
			key: 'profile-name',
			text: name ? `Nme. ${truncate(name, 28)}` : 'Nme.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !name,
		});
		chips.push({
			key: 'profile-genre',
			text: genre ? `Gnre. ${truncate(genre, 22)}` : 'Gnre.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !genre,
		});
		chips.push({
			key: 'profile-area',
			text: area ? `Area. ${truncate(area, 30)}` : 'Area.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !area,
		});
		chips.push({
			key: 'profile-band',
			text: band ? `Artst Nme. ${truncate(band, 30)}` : 'Artst Nme.',
			bgClass: 'bg-[#CFF5F5]',
			isEmpty: !band,
		});
		chips.push({
			key: 'profile-bio',
			text: bio ? `Bio. “${truncate(bio, 48)}”` : 'Bio.',
			bgClass: 'bg-[#CFF5F5]',
			isEmpty: !bio,
		});

		const links = linksRaw
			.split(/\r?\n|,/g)
			.map((s) => s.trim())
			.filter(Boolean);

		if (links.length === 0) {
			chips.push({
				key: 'profile-link-0',
				text: 'Link.',
				bgClass: 'bg-[#C7F2C9]',
				isEmpty: true,
			});
		} else {
			for (let i = 0; i < links.length; i++) {
				const link = links[i];
				chips.push({
					key: `profile-link-${i}`,
					text: `Link. ${truncate(link, 42)}`,
					bgClass: 'bg-[#C7F2C9]',
					isEmpty: false,
				});
			}
		}

		return chips;
	}, [profileFields]);

	// Prompt score helpers (display only)
	const clampedPromptScore = useMemo(() => {
		if (typeof promptQualityScore !== 'number') return null;
		return Math.max(70, Math.min(98, Math.round(promptQualityScore)));
	}, [promptQualityScore]);
	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	const BookingForControl = () => (
		<div ref={bookingForContainerRef} className="relative mt-[10px]">
			<button
				ref={bookingForButtonRef}
				type="button"
				data-hover-description="What timeframe are you booking in. There's a calendar in there as well as picking seasons"
				onClick={() => {
					clearBookingForCloseTimeout();
					if (isBookingForOpen) {
						setIsBookingForOpen(false);
						return;
					}

					const isSeasonSelection =
						bookingForValue === 'Spring' ||
						bookingForValue === 'Summer' ||
						bookingForValue === 'Fall' ||
						bookingForValue === 'Winter';

					// Prefer the last selected tab when reopening the dropdown.
					// This lets Calendar keep the previous "Booking For" label until a date is selected.
					if (bookingForTab === 'Calendar') {
						setBookingForTab('Calendar');
					} else if (bookingForTab === 'Season') {
						if (isSeasonSelection) {
							setBookingForSeason(bookingForValue as BookingForSeason);
						}
						setBookingForTab('Season');
					} else if (bookingForCalendarStartDate != null) {
						setBookingForTab('Calendar');
					} else if (isSeasonSelection) {
						setBookingForSeason(bookingForValue as BookingForSeason);
						setBookingForTab('Season');
					} else {
						setBookingForTab('Anytime');
					}

					setIsBookingForOpen(true);
				}}
				className="min-w-[203px] h-[28px] bg-white rounded-[8px] border-2 border-black inline-flex items-center justify-between gap-2 px-4 whitespace-nowrap"
				aria-haspopup="dialog"
				aria-expanded={isBookingForOpen}
			>
				<span className="font-inter font-normal text-[14px] leading-[14px] text-black whitespace-nowrap">
					Booking For
				</span>
				<span className="font-inter font-bold text-[14px] leading-[14px] text-black mr-1 whitespace-nowrap">
					{bookingForValue}
				</span>
			</button>

			{isBookingForOpen &&
				bookingForDropdownPosition &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={bookingForDropdownRef}
						style={{
							position: 'fixed',
							top: bookingForDropdownPosition.top,
							left: bookingForDropdownPosition.left,
							width: bookingForDropdownSize.width,
							height: bookingForDropdownSize.height,
						}}
						className={cn(
							'z-[9999] rounded-[6px]',
							bookingForTab === 'Season'
								? bookingForSeason === 'Spring'
									? 'bg-[#9BD2FF]'
									: bookingForSeason === 'Summer'
										? 'bg-[#7ADF85]'
										: bookingForSeason === 'Fall'
											? 'bg-[#D77C2C]'
											: 'bg-[#1960AC]'
								: 'bg-[#F5F5F5]',
							'border-2 border-black',
							'flex flex-col overflow-hidden'
						)}
						onMouseEnter={clearBookingForCloseTimeout}
						onMouseLeave={scheduleBookingForCloseTimeout}
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
									bookingForTab === 'Calendar' && bookingForTabStripLeft != null
										? 'justify-start'
										: 'justify-center'
								)}
								style={
									bookingForTab === 'Calendar' && bookingForTabStripLeft != null
										? { paddingLeft: bookingForTabStripLeft }
										: undefined
								}
							>
								<div className="w-[284px] grid grid-cols-3 items-center gap-[8px]">
									{(['Anytime', 'Season', 'Calendar'] as const).map((opt) => {
										const isSelected = bookingForTab === opt;
										return (
											<button
												key={opt}
												type="button"
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
													isSelected
														? opt === 'Season'
															? 'bg-[#F5F5F5] font-semibold'
															: 'bg-[#C2C2C2] font-semibold'
														: 'bg-transparent font-normal hover:bg-black/5'
												)}
												role="button"
												aria-pressed={isSelected}
											>
												{opt}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{bookingForTab === 'Season' && (
							<div className="flex-1 flex flex-col items-center justify-center gap-[10px] pb-[10px]">
								{(['Spring', 'Summer', 'Fall', 'Winter'] as const).map((season) => {
									const isSelectedSeason = bookingForSeason === season;
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
											className={cn(
												'font-inter text-[14px] leading-[16px]',
												isSelectedSeason
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
																return next.getTime() < minBaseMonth.getTime() ? prev : next;
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
																return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
															});
														}}
														className="shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
														aria-label="Next month"
													>
														<RightArrow width={8} height={16} color="#000000" opacity={1} />
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
																if (!cellDate) return <div key={idx} aria-hidden="true" />;

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
					</div>,
					document.body
				)}
		</div>
	);

	return (
		<div
			className={cn(
				'relative rounded-md overflow-visible border border-gray-300 bg-[#51A2E4]',
				constrainHeight
					? 'h-[233px] flex flex-col'
					: isCustomInstructionsOpen
						? 'h-auto min-h-[233px]'
						: 'h-[233px]',
				className
			)}
			data-block-type="full"
		>
			{/* Header background fill (Body + power mode toggles) */}
			<div className="w-full px-1 pt-1 pb-1">
				<div className="rounded-t-[6px] overflow-hidden">
					<div className="h-[27px] bg-[#B9DAF5] flex items-stretch">
						{/* Body label section */}
						<div className="flex-1 flex items-center pl-[16px]">
							<Typography
								variant="h4"
								className="font-inter font-semibold text-[17px] text-[#000000]"
							>
								Body
							</Typography>
						</div>
						{/* Divider - black when Normal Power selected */}
						<div
							className={cn(
								'w-[1px] flex-shrink-0 transition-colors',
								selectedPowerMode === 'normal' ? 'bg-[#000000]' : 'bg-[#51A2E4]'
							)}
						/>
						{/* Normal Power section */}
						<button
							type="button"
							onClick={() => setSelectedPowerMode('normal')}
							className={cn(
								'w-[101px] flex items-center justify-center cursor-pointer border-0 p-0 m-0 transition-colors flex-shrink-0 outline-none focus:outline-none',
								selectedPowerMode === 'normal' ? 'bg-[#8DBFE8]' : 'bg-transparent'
							)}
						>
							<span
								className={cn(
									'font-inter font-normal italic text-[14px] transition-colors',
									selectedPowerMode === 'normal' ? 'text-[#000000]' : 'text-[#9E9E9E]'
								)}
							>
								Normal Power
							</span>
						</button>
						{/* Divider - black when either Normal Power or High selected */}
						<div
							className={cn(
								'w-[1px] flex-shrink-0 transition-colors',
								selectedPowerMode === 'normal' || selectedPowerMode === 'high'
									? 'bg-[#000000]'
									: 'bg-[#51A2E4]'
							)}
						/>
						{/* High section */}
						<button
							type="button"
							onClick={() => setSelectedPowerMode('high')}
							className={cn(
								'w-[46px] flex items-center justify-center cursor-pointer border-0 p-0 m-0 transition-colors flex-shrink-0 outline-none focus:outline-none',
								selectedPowerMode === 'high' ? 'bg-[#8DBFE8]' : 'bg-transparent'
							)}
						>
							<span
								className={cn(
									'font-inter font-normal italic text-[14px] transition-colors',
									selectedPowerMode === 'high' ? 'text-[#000000]' : 'text-[#9E9E9E]'
								)}
							>
								High
							</span>
						</button>
						{/* Divider - black when High selected */}
						<div
							className={cn(
								'w-[1px] flex-shrink-0 transition-colors',
								selectedPowerMode === 'high' ? 'bg-[#000000]' : 'bg-[#51A2E4]'
							)}
						/>
						{/* Right empty section */}
						<div className="w-[31px] flex-shrink-0" />
					</div>
				</div>
			</div>

			{/* Body content */}
			<div
				className={cn(
					'min-h-[60px] w-full px-1 pb-1',
					constrainHeight && 'flex-1 min-h-0'
				)}
			>
				<div
					className={cn(
						'w-full bg-[#58A6E5] rounded-b-[6px] p-2 flex justify-center',
						constrainHeight && 'h-full overflow-y-auto'
					)}
				>
					<div className="w-[448px] max-w-full flex flex-col items-start">
						<div
							className={cn(
								'w-full h-[104px] bg-white rounded-[8px] border border-black px-2 pt-1 pb-2 overflow-y-auto overflow-x-hidden hide-native-scrollbar',
								onGoToProfileTab ? 'cursor-pointer' : 'cursor-default'
							)}
							role={onGoToProfileTab ? 'button' : undefined}
							tabIndex={onGoToProfileTab ? 0 : undefined}
							aria-label="Open Profile"
							onClick={(e) => {
								e.stopPropagation();
								onGoToProfileTab?.();
							}}
							onKeyDown={(e) => {
								if (!onGoToProfileTab) return;
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									e.stopPropagation();
									onGoToProfileTab();
								}
							}}
						>
							<div className="font-inter font-normal text-[13px] leading-[16px] text-black mb-[7px]">
								Profile
							</div>
							<div className="flex flex-wrap gap-x-[6px] gap-y-[10px] content-start">
								{profileChipItems.map((chip) => (
									<span
										key={chip.key}
										className={cn(
											'inline-flex items-center rounded-[5px] px-[5px] py-[0.5px] font-inter font-normal text-[10px] leading-[12px] max-[480px]:text-[8px] max-[480px]:leading-[10px] text-black max-w-full whitespace-nowrap',
											chip.bgClass,
											chip.isEmpty && 'opacity-50'
										)}
									>
										{chip.text}
									</span>
								))}
							</div>
						</div>

						{/* Booking For box - rendered before Custom Instructions when closed */}
						{!isCustomInstructionsOpen && <BookingForControl />}

						{/* Custom Instructions */}
						<div ref={customInstructionsContainerRef} className="mt-[14px] w-full">
							{(() => {
								const fieldProps = form.register(`hybridBlockPrompts.${fieldIndex}.value`);

								if (!isCustomInstructionsOpen) {
									return (
										<button
											type="button"
											onClick={() => setIsCustomInstructionsOpen(true)}
											className={cn(
												'w-[157px] h-[22px] bg-[#95CFFF] rounded-[8px] border-2 border-black',
												'flex items-center justify-center gap-1 px-2',
												'font-inter font-semibold text-[11px] leading-none text-black',
												'hover:brightness-[0.98] active:brightness-[0.95]'
											)}
											aria-label="Custom Instructions"
											aria-expanded={false}
										>
											<span aria-hidden="true">+</span>
											<span>Custom Instructions</span>
										</button>
									);
								}

								return (
									<div
										className={cn(
											'w-full rounded-[8px] border-2 border-black overflow-hidden',
											'flex flex-col bg-[#95CFFF]'
										)}
										aria-label="Custom Instructions"
									>
										<div className="h-[22px] flex items-center justify-between px-2">
											<span className="font-inter font-semibold text-[11px] leading-none text-black">
												Custom Instructions
											</span>
											<button
												type="button"
												onClick={() => setIsCustomInstructionsOpen(false)}
												className={cn(
													'h-[18px] w-[22px] rounded-[4px]',
													'flex items-center justify-center bg-transparent',
													'hover:bg-black/10 active:bg-black/15'
												)}
												aria-label="Collapse Custom Instructions"
											>
												<span className="text-[14px] leading-none">−</span>
											</button>
										</div>
										<div className="h-[72px] border-t-2 border-black bg-white">
											<Textarea
												placeholder="Type anything you want to include"
												className={cn(
													'h-full w-full border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
													'bg-white',
													'px-3 py-2 resize-none overflow-y-auto',
													'font-inter text-[12px] leading-[14px] text-black',
													'max-[480px]:text-[10px]'
												)}
												{...fieldProps}
												onClick={(e) => e.stopPropagation()}
												onKeyDown={async (e) => {
													// Enter scores prompt; Shift+Enter inserts newline
													if (e.key !== 'Enter') return;
													if (e.shiftKey) return;
													// @ts-expect-error - React KeyboardEvent doesn't always expose isComposing in types
													if (e.isComposing || (e.nativeEvent as any)?.isComposing) return;

													e.preventDefault();
													e.stopPropagation();

													const currentValue =
														form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) || '';
													await onGetSuggestions?.(currentValue);
												}}
												ref={(el) => {
													fieldProps.ref(el);
													customInstructionsRef.current = el;
												}}
											/>
										</div>
										{/* Prompt rating + Upscale controls */}
										<div className="h-[23px] bg-white px-3 flex items-start gap-[6px]">
											{/* Score (159 x 20) */}
											<div className="w-[159px] h-[20px] box-border bg-[#D7F0FF] border-2 border-black rounded-[8px] flex items-center gap-[6px] px-[6px]">
												<div className="w-[92px] h-[12px] box-border bg-white border-2 border-black rounded-[8px] overflow-hidden shrink-0">
													<div
														className="h-full bg-[#36B24A] rounded-full transition-[width] duration-200"
														style={{ width: `${promptScoreFillPercent}%` }}
													/>
												</div>
												<span className="font-inter font-semibold text-[12px] leading-none text-black flex-1 text-center tabular-nums truncate">
													{clampedPromptScore ?? ''}
												</span>
											</div>

											{/* Undo (20 x 20) */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (!hasPreviousPrompt) return;
													onUndoUpscalePrompt?.();
												}}
												disabled={!hasPreviousPrompt}
												className={cn(
													'w-[20px] h-[20px] box-border rounded-[6px] border-2 border-black bg-[#D7F0FF] flex items-center justify-center p-0',
													hasPreviousPrompt
														? 'cursor-pointer hover:brightness-[0.98] active:brightness-[0.95]'
														: 'cursor-not-allowed'
												)}
												aria-label="Undo Upscale"
											>
												<UndoIcon width="14" height="14" />
											</button>

											{/* Upscale (73 x 20) */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (!onUpscalePrompt) return;
													if (isUpscalingPrompt) return;
													void onUpscalePrompt();
												}}
												disabled={!onUpscalePrompt || Boolean(isUpscalingPrompt)}
												className={cn(
													'w-[73px] h-[20px] box-border rounded-[8px] border-2 border-black bg-[#D7F0FF] flex items-center justify-between gap-[4px] px-[4px] py-0',
													isUpscalingPrompt
														? 'cursor-wait opacity-80'
														: 'cursor-pointer hover:brightness-[0.98] active:brightness-[0.95]'
												)}
												aria-label="Upscale Prompt"
											>
												<span className="font-inter font-semibold text-[11px] leading-none text-black whitespace-nowrap">
													{isUpscalingPrompt ? '...' : 'Upscale'}
												</span>
												<UpscaleIcon width="14" height="14" />
											</button>
										</div>
									</div>
								);
							})()}
						</div>

						{/* Booking For box - rendered after Custom Instructions when open */}
						{isCustomInstructionsOpen && <BookingForControl />}
					</div>
				</div>
			</div>
		</div>
	);
};


