'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import {
	getWineBeerSpiritsLabel,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

export type LandingMapPanelContact = {
	id: number;
	firstName?: string | null;
	lastName?: string | null;
	name?: string | null;
	company?: string | null;
	title?: string | null;
	headline?: string | null;
	city?: string | null;
	state?: string | null;
	/**
	 * Optional flag for showing the small dot at left (this mirrors the dashboard
	 * map panel’s “used contact” indicator).
	 */
	isUsed?: boolean;
};

type Props = {
	contacts: LandingMapPanelContact[];
	/**
	 * When true, shows the same skeleton rows used in the dashboard map panel.
	 */
	isLoading?: boolean;
	/**
	 * Optional initial selected IDs (useful once you wire in real data).
	 */
	initialSelectedContactIds?: number[];
	/**
	 * Allows overriding positioning (defaults match the dashboard side panel).
	 */
	containerClassName?: string;
	containerStyle?: CSSProperties;
};

export function LandingPageMapResultsSidePanel({
	contacts,
	isLoading = false,
	initialSelectedContactIds,
	containerClassName,
	containerStyle,
}: Props) {
	// Marketing-only: when the user clicks "Select all", show a bigger (fixed) selection count.
	const SELECT_ALL_DISPLAY_COUNT = 751;

	const [selectedContacts, setSelectedContacts] = useState<number[]>(() => initialSelectedContactIds ?? []);
	const [hoveredMapPanelContactId, setHoveredMapPanelContactId] = useState<number | null>(null);
	// Once the user hits "Select all", keep counting down from the marketing total instead of
	// snapping back to the small demo list count.
	const [isSelectAllCountMode, setIsSelectAllCountMode] = useState(false);

	// ── Row cascade animation ────────────────────────────────────────────────
	const panelRowsRef = useRef<HTMLDivElement>(null);
	const prevIsLoadingRef = useRef(isLoading);
	const cascadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Match the map panel skeleton wave animation so the cascade feels like it
	// "resolves" the wave into real results.
	const WAVE_BASE_BG = '#C5F0FF';
	const WAVE_DURATION_SECONDS = 2.5;
	const WAVE_ROW_STEP_DELAY_SECONDS = 0.1;
	const CASCADE_INITIAL_DELAY_MS = 120;
	const CASCADE_STAGGER_MS = 100;
	const CASCADE_MAX_ROWS = 14;

	useLayoutEffect(() => {
		const wasLoading = prevIsLoadingRef.current;
		prevIsLoadingRef.current = isLoading;
		if (!wasLoading || isLoading) return;

		for (const t of cascadeTimersRef.current) clearTimeout(t);
		cascadeTimersRef.current = [];

		const container = panelRowsRef.current;
		if (!container) return;
		const rows = Array.from(container.children).slice(0, CASCADE_MAX_ROWS) as HTMLElement[];
		if (rows.length === 0) return;

		rows.forEach((row, idx) => {
			// Preserve the real background (set by React) so we can restore it.
			row.dataset.cascadeBg = row.style.backgroundColor;
			// Keep the normal outline; remove any stale inline override.
			row.style.borderColor = '';

			// Continue the wave background animation used by the skeleton rows.
			row.style.backgroundColor = WAVE_BASE_BG;
			row.style.animation = `mapResultsPanelLoadingWave ${WAVE_DURATION_SECONDS}s ease-in-out infinite`;
			row.style.animationDelay = `${-(WAVE_DURATION_SECONDS - idx * WAVE_ROW_STEP_DELAY_SECONDS)}s`;
			row.style.willChange = 'background-color';

			for (const child of Array.from(row.children) as HTMLElement[]) {
				child.style.visibility = '';
				child.style.transition = 'opacity 200ms ease-out';
				child.style.opacity = '0';
			}
		});

		rows.forEach((row, idx) => {
			const timer = setTimeout(() => {
				const targetBg =
					row.dataset.cascadeBg && row.dataset.cascadeBg.length > 0 ? row.dataset.cascadeBg : '#FFFFFF';
				delete row.dataset.cascadeBg;

				const waveBg = getComputedStyle(row).backgroundColor;
				row.style.animation = '';
				row.style.animationDelay = '';
				row.style.willChange = '';
				row.style.backgroundColor = waveBg;

				// Let the browser register the frozen wave bg, then transition to final.
				requestAnimationFrame(() => {
					row.style.backgroundColor = targetBg;
					for (const child of Array.from(row.children) as HTMLElement[]) {
						child.style.opacity = '1';
					}
				});
			}, CASCADE_INITIAL_DELAY_MS + idx * CASCADE_STAGGER_MS);
			cascadeTimersRef.current.push(timer);
		});
	}, [isLoading]);

	// If the caller provides initial selections later (after mount), sync once.
	useEffect(() => {
		if (!initialSelectedContactIds) return;
		setSelectedContacts(initialSelectedContactIds);
	}, [initialSelectedContactIds]);

	const contactIdSet = useMemo(() => new Set<number>(contacts.map((c) => c.id)), [contacts]);
	const isAllPanelContactsSelected = useMemo(() => {
		if (!contacts.length) return false;
		const selectedSet = new Set<number>(selectedContacts);
		for (const id of contactIdSet) {
			if (!selectedSet.has(id)) return false;
		}
		return true;
	}, [contacts.length, contactIdSet, selectedContacts]);

	const deselectedVisibleCount = useMemo(() => {
		if (!isSelectAllCountMode) return 0;
		if (!contacts.length) return 0;
		const selectedSet = new Set<number>(selectedContacts);
		let count = 0;
		for (const c of contacts) {
			if (!selectedSet.has(c.id)) count++;
		}
		return count;
	}, [contacts, isSelectAllCountMode, selectedContacts]);

	const selectedCountDisplay = isSelectAllCountMode
		? Math.max(0, SELECT_ALL_DISPLAY_COUNT - deselectedVisibleCount)
		: selectedContacts.length;

	const handleSelectAll = () => {
		if (!contacts.length) return;
		if (isAllPanelContactsSelected) {
			const selectedSet = new Set<number>(selectedContacts);
			for (const c of contacts) selectedSet.delete(c.id);
			setSelectedContacts(Array.from(selectedSet));
			setIsSelectAllCountMode(false);
			return;
		}
		const selectedSet = new Set<number>(selectedContacts);
		for (const c of contacts) selectedSet.add(c.id);
		setSelectedContacts(Array.from(selectedSet));
		setIsSelectAllCountMode(true);
	};

	return (
		<div
			className={
				containerClassName ??
				'absolute top-1/2 -translate-y-1/2 right-[10px] rounded-[12px] flex flex-col z-50'
			}
			style={{
				width: '433px',
				height: 800,
				maxHeight: 'calc(100% - 20px)',
				backgroundColor: 'rgba(175, 214, 239, 0.8)',
				border: '3px solid #143883',
				overflow: 'hidden',
				...containerStyle,
			}}
		>
			{/* Header area for right-hand panel (same color as panel) */}
			<div className="w-full h-[49px] flex-shrink-0 flex items-center justify-center px-4 relative">
				{/* Map label button in top-left of panel header */}
				<button
					type="button"
					className="absolute left-[10px] top-[7px] flex items-center justify-center cursor-pointer"
					style={{
						width: '53px',
						height: '19px',
						backgroundColor: '#CDEFC3',
						borderRadius: '4px',
						border: '2px solid #000000',
						fontFamily:
							'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
						fontSize: '13px',
						fontWeight: 600,
						lineHeight: '1',
					}}
				>
					Map
				</button>

				<span className="font-inter text-[13px] font-medium text-black relative -translate-y-[2px]">
					{selectedCountDisplay} selected
				</span>

				<button
					type="button"
					onClick={handleSelectAll}
					disabled={isLoading}
					className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-1/2 translate-y-[4px] ${
						isLoading ? 'opacity-60 pointer-events-none' : 'hover:underline'
					}`}
				>
					{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
				</button>
			</div>

			<CustomScrollbar
				className="flex-1 min-h-0"
				contentClassName="p-[6px] pb-[14px] space-y-[7px]"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-6}
				disableOverflowClass
			>
				{isLoading ? (
					<MapResultsPanelSkeleton variant="desktop" rows={Math.max(contacts.length, 14)} />
				) : (
					<div ref={panelRowsRef} className="space-y-[7px]">
					{contacts.map((contact) => {
						const isSelected = selectedContacts.includes(contact.id);
						const isHovered = hoveredMapPanelContactId === contact.id;
						const isUsed = Boolean(contact.isUsed);

						const firstName = contact.firstName || '';
						const lastName = contact.lastName || '';
						const fullName = contact.name || `${firstName} ${lastName}`.trim();
						const company = contact.company || '';
						const headline = contact.headline || contact.title || '';
						const shouldUseTwoLineLeft = Boolean(fullName) && Boolean(company);

						// These flags exist in the dashboard panel to reflect the active "What" search.
						// Landing uses title/headline inference only, but we keep the exact logic shape.
						const isRestaurantsSearchForContact = false;
						const isCoffeeShopsSearchForContact = false;
						const isMusicVenuesSearchForContact = false;
						const isMusicFestivalsSearchForContact = false;
						const isWeddingPlannersSearchForContact = false;

						const stateAbbr = getStateAbbreviation(contact.state || '') || '';
						const city = contact.city || '';

						return (
							<div
								key={contact.id}
								data-contact-id={contact.id}
								className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
								style={{
									// Hover should be a subtle darken, not "selected" blue.
									// Category-specific selection colors.
									backgroundColor: isSelected
										? isRestaurantsSearchForContact || isRestaurantTitle(headline)
											? isHovered
												? '#C5F5D1'
												: '#D7FFE1'
											: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
												? isHovered
													? '#DDF4CC'
													: '#EDFEDC'
												: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
													? isHovered
														? '#C5E8FF'
														: '#D7F0FF'
													: isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline)
														? isHovered
															? '#ADD4FF'
															: '#BFDCFF'
														: isWeddingPlannersSearchForContact ||
															  isWeddingPlannerTitle(headline) ||
															  isWeddingVenueTitle(headline)
															? isHovered
																? '#F5EDCE'
																: '#FFF8DC'
															: isWineBeerSpiritsTitle(headline)
																? isHovered
																	? '#C8CBFF'
																	: '#DADDFF'
																: isHovered
																	? '#BFE3FF'
																	: '#C9EAFF'
										: isHovered
											? '#F3F4F6'
											: '#FFFFFF',
								}}
								onClick={() => {
									if (isSelected) {
										setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
									} else {
										setSelectedContacts([...selectedContacts, contact.id]);
									}
								}}
								onMouseEnter={() => setHoveredMapPanelContactId(contact.id)}
								onMouseLeave={() =>
									setHoveredMapPanelContactId((prev) => (prev === contact.id ? null : prev))
								}
							>
								{/* Centered used contact dot */}
								{shouldUseTwoLineLeft && isUsed && (
									<span
										className="absolute shrink-0"
										style={{
											width: '16px',
											height: '16px',
											borderRadius: '50%',
											border: '1px solid #000000',
											backgroundColor: '#DAE6FE',
											left: '12px',
											top: '50%',
											transform: 'translateY(-50%)',
										}}
									/>
								)}

								{shouldUseTwoLineLeft ? (
									<>
										{/* Top Left - Name */}
										<div className="pl-3 pr-1 flex items-center h-[23px]">
											{isUsed && (
												<span
													className="inline-block shrink-0 mr-2"
													style={{ width: '16px', height: '16px' }}
												/>
											)}
											<div className="font-bold text-[11px] w-full truncate leading-tight">
												{fullName}
											</div>
										</div>

										{/* Top Right - Title/Headline */}
										<div className="pr-2 pl-1 flex items-center h-[23px]">
											{headline ||
											isMusicVenuesSearchForContact ||
											isRestaurantsSearchForContact ||
											isCoffeeShopsSearchForContact ||
											isMusicFestivalsSearchForContact ||
											isWeddingPlannersSearchForContact ? (
												<div
													className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
													style={{
														backgroundColor:
															isRestaurantsSearchForContact || isRestaurantTitle(headline)
																? '#C3FBD1'
																: isCoffeeShopsSearchForContact ||
																	  isCoffeeShopTitle(headline)
																	? '#D6F1BD'
																	: isMusicVenuesSearchForContact ||
																		  isMusicVenueTitle(headline)
																		? '#B7E5FF'
																		: isMusicFestivalsSearchForContact ||
																			  isMusicFestivalTitle(headline)
																			? '#C1D6FF'
																			: isWeddingPlannersSearchForContact ||
																				  isWeddingPlannerTitle(headline) ||
																				  isWeddingVenueTitle(headline)
																				? '#FFF8DC'
																				: isWineBeerSpiritsTitle(headline)
																					? '#BFC4FF'
																					: '#E8EFFF',
													}}
												>
													{(isRestaurantsSearchForContact || isRestaurantTitle(headline)) && (
														<RestaurantsIcon size={12} className="flex-shrink-0" />
													)}
													{(isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)) && (
														<CoffeeShopsIcon size={7} />
													)}
													{(isMusicVenuesSearchForContact || isMusicVenueTitle(headline)) && (
														<MusicVenuesIcon size={12} className="flex-shrink-0" />
													)}
													{(isMusicFestivalsSearchForContact ||
														isMusicFestivalTitle(headline)) && (
														<FestivalsIcon size={12} className="flex-shrink-0" />
													)}
													{(isWeddingPlannersSearchForContact ||
														isWeddingPlannerTitle(headline) ||
														isWeddingVenueTitle(headline)) && <WeddingPlannersIcon size={12} />}
													{isWineBeerSpiritsTitle(headline) && (
														<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
													)}
													<span className="text-[10px] text-black leading-none truncate">
														{isRestaurantsSearchForContact || isRestaurantTitle(headline)
															? 'Restaurant'
															: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
																? 'Coffee Shop'
																: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
																	? 'Music Venue'
																	: isMusicFestivalsSearchForContact ||
																		  isMusicFestivalTitle(headline)
																		? 'Music Festival'
																		: isWeddingVenueTitle(headline)
																			? 'Wedding Venue'
																			: isWeddingPlannersSearchForContact ||
																				  isWeddingPlannerTitle(headline)
																				? 'Wedding Planner'
																				: isWineBeerSpiritsTitle(headline)
																					? getWineBeerSpiritsLabel(headline)
																					: headline}
													</span>
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>

										{/* Bottom Left - Company */}
										<div className="pl-3 pr-1 flex items-center h-[22px]">
											{isUsed && (
												<span
													className="inline-block shrink-0 mr-2"
													style={{ width: '16px', height: '16px' }}
												/>
											)}
											<div className="text-[11px] text-black w-full truncate leading-tight">
												{company}
											</div>
										</div>

										{/* Bottom Right - Location */}
										<div className="pr-2 pl-1 flex items-center h-[22px]">
											{city || stateAbbr ? (
												<div className="flex items-center gap-1 w-full">
													{stateAbbr && (
														<span
															className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
															style={{
																backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
																borderColor: '#000000',
															}}
														>
															{stateAbbr}
														</span>
													)}
													{city && (
														<span className="text-[10px] text-black leading-none truncate">
															{city}
														</span>
													)}
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>
									</>
								) : (
									<>
										{/* Single-line left label spans both rows (centers vertically) */}
										<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
											{isUsed && (
												<span
													className="inline-block shrink-0 mr-2"
													style={{
														width: '16px',
														height: '16px',
														borderRadius: '50%',
														border: '1px solid #000000',
														backgroundColor: '#DAE6FE',
													}}
												/>
											)}
											<div className="font-bold text-[11px] w-full truncate leading-tight">
												{company || fullName || '—'}
											</div>
										</div>

										{/* Top Right - Title/Headline */}
										<div className="pr-2 pl-1 flex items-center h-[23px]">
											{headline ||
											isMusicVenuesSearchForContact ||
											isRestaurantsSearchForContact ||
											isCoffeeShopsSearchForContact ||
											isMusicFestivalsSearchForContact ||
											isWeddingPlannersSearchForContact ? (
												<div
													className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
													style={{
														backgroundColor:
															isRestaurantsSearchForContact || isRestaurantTitle(headline)
																? '#C3FBD1'
																: isCoffeeShopsSearchForContact ||
																	  isCoffeeShopTitle(headline)
																	? '#D6F1BD'
																	: isMusicVenuesSearchForContact ||
																		  isMusicVenueTitle(headline)
																		? '#B7E5FF'
																		: isMusicFestivalsSearchForContact ||
																			  isMusicFestivalTitle(headline)
																			? '#C1D6FF'
																			: isWeddingPlannersSearchForContact ||
																				  isWeddingPlannerTitle(headline) ||
																				  isWeddingVenueTitle(headline)
																				? '#FFF8DC'
																				: isWineBeerSpiritsTitle(headline)
																					? '#BFC4FF'
																					: '#E8EFFF',
													}}
												>
													{(isRestaurantsSearchForContact || isRestaurantTitle(headline)) && (
														<RestaurantsIcon size={12} className="flex-shrink-0" />
													)}
													{(isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)) && (
														<CoffeeShopsIcon size={7} />
													)}
													{(isMusicVenuesSearchForContact || isMusicVenueTitle(headline)) && (
														<MusicVenuesIcon size={12} className="flex-shrink-0" />
													)}
													{(isMusicFestivalsSearchForContact ||
														isMusicFestivalTitle(headline)) && (
														<FestivalsIcon size={12} className="flex-shrink-0" />
													)}
													{(isWeddingPlannersSearchForContact ||
														isWeddingPlannerTitle(headline) ||
														isWeddingVenueTitle(headline)) && <WeddingPlannersIcon size={12} />}
													{isWineBeerSpiritsTitle(headline) && (
														<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
													)}
													<span className="text-[10px] text-black leading-none truncate">
														{isRestaurantsSearchForContact || isRestaurantTitle(headline)
															? 'Restaurant'
															: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
																? 'Coffee Shop'
																: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
																	? 'Music Venue'
																	: isMusicFestivalsSearchForContact ||
																		  isMusicFestivalTitle(headline)
																		? 'Music Festival'
																		: isWeddingVenueTitle(headline)
																			? 'Wedding Venue'
																			: isWeddingPlannersSearchForContact ||
																				  isWeddingPlannerTitle(headline)
																				? 'Wedding Planner'
																				: isWineBeerSpiritsTitle(headline)
																					? getWineBeerSpiritsLabel(headline)
																					: headline}
													</span>
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>

										{/* Bottom Right - Location */}
										<div className="pr-2 pl-1 flex items-center h-[22px]">
											{city || stateAbbr ? (
												<div className="flex items-center gap-1 w-full">
													{stateAbbr && (
														<span
															className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
															style={{
																backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
																borderColor: '#000000',
															}}
														>
															{stateAbbr}
														</span>
													)}
													{city && (
														<span className="text-[10px] text-black leading-none truncate">
															{city}
														</span>
													)}
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>
									</>
								)}
							</div>
						);
					})}
					</div>
				)}
			</CustomScrollbar>
		</div>
	);
}

