'use client';

import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { Input } from '@/components/ui/input';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { US_STATES } from '@/constants/usStates';
import { getCityIconProps } from '@/utils/cityIcons';
import { buildAllUsStateNames } from '@/utils/usStates';
import { gsap } from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';

type ActiveSection = 'why' | 'what' | 'where' | null;

type Props = {
	initialWhy?: string;
	initialWhat?: string;
	initialWhere?: string;
	/**
	 * When true, the inputs can be focused (to show the indicator animation),
	 * but their values cannot be edited.
	 */
	readOnly?: boolean;
};

export function LandingPageMapMiniSearchBar({
	initialWhy = '[Promotion]',
	initialWhat = 'Radio Stations',
	initialWhere = 'New York',
	readOnly = true,
}: Props) {
	const [whyValue, setWhyValue] = useState(initialWhy);
	const [whatValue, setWhatValue] = useState(initialWhat);
	const [whereValue, setWhereValue] = useState(initialWhere);
	const [activeSection, setActiveSection] = useState<ActiveSection>(null);
	const [, setIsNearMeLocation] = useState(false);

	const [userLocationName, setUserLocationName] = useState<string | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	const rootRef = useRef<HTMLDivElement>(null);
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Mini search bar (map view results) indicator refs (copied from dashboard map view)
	const miniActiveSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevMiniActiveSectionRef = useRef<'why' | 'what' | 'where' | null>(null);

	// Close active section when clicking outside.
	useEffect(() => {
		if (!activeSection) return;
		const onMouseDown = (event: MouseEvent) => {
			const root = rootRef.current;
			if (!root) return;
			if (!root.contains(event.target as Node)) {
				setActiveSection(null);
			}
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => document.removeEventListener('mousedown', onMouseDown);
	}, [activeSection]);

	// Animation for the mini search bar pill indicator (copied from dashboard map view)
	useEffect(() => {
		const indicator = miniActiveSectionIndicatorRef.current;
		if (!indicator) return;

		// Prevent overlapping tweens when the user clicks quickly
		gsap.killTweensOf(indicator);

		// xPercent shifts by the indicator's own width (which is 1/3 of the container)
		const xPercentForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
			}
		};

		const transformOriginForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 'left center';
				case 'where':
					return 'right center';
				case 'what':
				default:
					return 'center center';
			}
		};

		// Hide when no active section (default state shows dividers)
		if (!activeSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			prevMiniActiveSectionRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevMiniActiveSectionRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		if (!prevSection) {
			const origin = transformOriginForSection(activeSection);

			// Start as a full-width highlight (scaleX: 3 because the indicator is 1/3 width),
			gsap.set(indicator, {
				xPercent: nextXPercent,
				opacity: 1,
				scaleX: 3,
				transformOrigin: origin,
			});
			gsap.to(indicator, {
				scaleX: 1,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevMiniActiveSectionRef.current = activeSection;
			return;
		}

		// Between tabs, slide with requested timing/ease (width/height remain constant)
		gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
		gsap.to(indicator, {
			xPercent: nextXPercent,
			duration: 0.6,
			ease: 'power2.out',
			overwrite: 'auto',
		});
		gsap.to(indicator, {
			opacity: 1,
			duration: 0.15,
			ease: 'power2.out',
			overwrite: 'auto',
		});

		prevMiniActiveSectionRef.current = activeSection;
	}, [activeSection]);

	// Mirror dashboard behavior: focus input when selecting What/Where.
	useEffect(() => {
		if (activeSection === 'what' && whatInputRef.current) {
			whatInputRef.current.focus();
		} else if (activeSection === 'where' && whereInputRef.current) {
			whereInputRef.current.focus();
		}
	}, [activeSection]);

	const isPromotion = whyValue === '[Promotion]';

	const requestUserLocationName = async (): Promise<string | null> => {
		if (isLoadingLocation) return null;

		const setLoading = (value: boolean) => {
			if (isMountedRef.current) setIsLoadingLocation(value);
		};
		const setLocationName = (value: string) => {
			if (isMountedRef.current) setUserLocationName(value);
		};

		setLoading(true);

		try {
			if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
				setLocationName('Geolocation not supported');
				return null;
			}

			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject);
			});

			try {
				const { latitude, longitude } = position.coords;
				const response = await fetch(
					`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
				);
				const data = await response.json();
				const city =
					data.address?.city || data.address?.town || data.address?.village || data.address?.hamlet;
				const state = data.address?.state as string | undefined;

				const stateAbbr =
					state != null ? US_STATES.find((s) => s.name === state)?.abbr ?? state : null;

				const label =
					city && stateAbbr
						? `${city}, ${stateAbbr}`
						: city
							? city
							: stateAbbr
								? stateAbbr
								: 'Current Location';

				setLocationName(label);
				return label;
			} catch (error) {
				console.error('Error getting location:', error);
				setLocationName('Unable to find location');
				return null;
			}
		} catch (error) {
			console.error('Geolocation error:', error);
			setLocationName('Location access needed');
			return null;
		} finally {
			setLoading(false);
		}
	};

	const handleNearMeClick = async () => {
		if (isLoadingLocation) return;

		const unusable = new Set(['Location access needed', 'Unable to find location', 'Geolocation not supported']);
		const existing = userLocationName && !unusable.has(userLocationName) ? userLocationName : null;
		const label = existing ?? (await requestUserLocationName());
		if (label) setWhereAndClose(label, true);
	};

	const DEFAULT_STATE_SUGGESTIONS = useMemo(
		() => [
			{
				label: 'New York',
				promotionDescription: 'reach out to radio stations, playlists, and more',
				generalDescription: 'contact venues, restaurants and more, to book shows',
			},
			{
				label: 'Pennsylvania',
				promotionDescription: 'reach out to radio stations, playlists, and more',
				generalDescription: 'contact venues, restaurants and more, to book shows',
			},
			{
				label: 'California',
				promotionDescription: 'reach out to radio stations, playlists, and more',
				generalDescription: 'contact venues, restaurants and more, to book shows',
			},
		],
		[]
	);

	const setWhereAndClose = (value: string, nearMe: boolean) => {
		setWhereValue(value);
		setIsNearMeLocation(nearMe);
		setActiveSection(null);
	};

	const filteredStateNames = useMemo(() => {
		const q = whereValue.trim().toLowerCase();
		if (!q) return [];
		return US_STATES.filter(({ name, abbr }) => {
			const nameLc = name.toLowerCase();
			const abbrLc = abbr.toLowerCase();
			return nameLc.includes(q) || abbrLc.startsWith(q);
		}).map((s) => s.name);
	}, [whereValue]);

	const allStateNamesExcludingDefaults = useMemo(() => {
		const defaultNames = DEFAULT_STATE_SUGGESTIONS.map((s) => s.label);
		const defaultSet = new Set(defaultNames.map((s) => s.toLowerCase()));
		return buildAllUsStateNames(defaultNames).filter((name) => !defaultSet.has(name.toLowerCase()));
	}, [DEFAULT_STATE_SUGGESTIONS]);

	const renderDesktopSearchDropdowns = () => {
		if (!activeSection) return null;

		// Match the active-section pill timing (0.6s) and easing.
		const dropdownEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
		const dropdownTransition = `left 0.6s ${dropdownEase}, height 0.6s ${dropdownEase}`;
		// Slightly faster than the pill
		const dropdownFadeTransition = `opacity 0.35s ${dropdownEase}`;

		const dropdownHeight =
			activeSection === 'why'
				? 173
				: activeSection === 'what'
					? whyValue === '[Promotion]'
						? 92
						: 404
					: 370;

		// Slide the dropdown between segments like the dashboard:
		// left, center, right (clamped so it never goes negative).
		const dropdownLeft =
			activeSection === 'why'
				? '0px'
				: activeSection === 'what'
					? 'max(0px, calc((100% - 439px) / 2))'
					: 'max(0px, calc(100% - 439px))';

		return (
			<div
				className="search-dropdown-menu w-[439px] max-w-[calc(100vw-16px)] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] relative overflow-hidden"
				style={{
					position: 'absolute',
					top: 'calc(100% + 10px)',
					left: dropdownLeft,
					height: dropdownHeight,
					transition: dropdownTransition,
					willChange: 'left, height',
				}}
			>
				{/* Why */}
				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'why' ? 1 : 0,
						pointerEvents: activeSection === 'why' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div className="flex flex-col items-center justify-start gap-[12px] w-full h-full py-[12px]">
						<div
							className={`w-[410px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
								whyValue === '[Booking]'
									? 'bg-[#DBECFF] border-[#000000]'
									: 'bg-white hover:bg-[#f0f0f0] border-transparent'
							}`}
							onClick={() => {
								setWhyValue('[Booking]');
								setActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<BookingIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Booking
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									contact venues, restaurants and more, to book shows
								</div>
							</div>
						</div>
						<div
							className={`w-[410px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
								whyValue === '[Promotion]'
									? 'bg-[#DBECFF] border-[#000000]'
									: 'bg-white hover:bg-[#f0f0f0] border-transparent'
							}`}
							onClick={() => {
								setWhyValue('[Promotion]');
								setActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#7AD47A] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<PromotionIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Promotion
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									reach out to radio stations, playlists, and more to get your music played
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* What */}
				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'what' ? 1 : 0,
						pointerEvents: activeSection === 'what' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					{whyValue === '[Promotion]' ? (
						<div className="flex flex-col items-center justify-start gap-[10px] w-full h-full py-[12px]">
							<div
								className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
									whatValue === 'Radio Stations'
										? 'bg-[#DBECFF] border-[#000000]'
										: 'bg-white hover:bg-[#f0f0f0] border-transparent'
								}`}
								onClick={() => {
									setWhatValue('Radio Stations');
									// Match map-view behavior: close after selecting "What".
									setActiveSection(null);
								}}
							>
								<div className="w-[38px] h-[38px] bg-[#56DA73] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<RadioStationsIcon />
								</div>
								<div className="ml-[12px] flex flex-col">
									<div className="text-[20px] font-medium leading-none text-black font-inter">
										Radio Stations
									</div>
									<div className="text-[12px] leading-tight text-black mt-[4px]">
										Reach out to radio stations
									</div>
								</div>
							</div>
						</div>
					) : (
						<div id="what-dropdown-container" className="w-full h-full">
							<style jsx global>{`
								#what-dropdown-container .scrollbar-hide {
									scrollbar-width: none !important;
									scrollbar-color: transparent transparent !important;
									-ms-overflow-style: none !important;
								}
								#what-dropdown-container .scrollbar-hide::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
								}
							`}</style>
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center gap-[10px] py-[12px]"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Wine, Beer, and Spirits'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Wine, Beer, and Spirits');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WineBeerSpiritsIcon size={22} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wine, Beer, and Spirits
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Restaurants'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Restaurants');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#77DD91] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<RestaurantsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Restaurants
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Land steady dinner and brunch gigs
										</div>
									</div>
								</div>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Coffee Shops'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Coffee Shops');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#A9DE78] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<CoffeeShopsIcon size={7} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Coffee Shops
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Book intimate daytime performances
										</div>
									</div>
								</div>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Festivals'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Festivals');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<FestivalsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Festivals
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Wedding Planners'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Wedding Planners');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WeddingPlannersIcon size={22} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wedding Planners
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Get hired for ceremonies & receptions
										</div>
									</div>
								</div>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										whatValue === 'Music Venues'
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										setWhatValue('Music Venues');
										setActiveSection(null);
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#71C9FD] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<MusicVenuesIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Music Venues
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Reach talent buyers for live shows
										</div>
									</div>
								</div>
							</CustomScrollbar>
						</div>
					)}
				</div>

				{/* Where */}
				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'where' ? 1 : 0,
						pointerEvents: activeSection === 'where' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div id="where-dropdown-container" className="w-full h-full">
						<style jsx global>{`
							#where-dropdown-container .scrollbar-hide {
								scrollbar-width: none !important;
								scrollbar-color: transparent transparent !important;
								-ms-overflow-style: none !important;
							}
							#where-dropdown-container .scrollbar-hide::-webkit-scrollbar {
								display: none !important;
								width: 0 !important;
								height: 0 !important;
								background: transparent !important;
								-webkit-appearance: none !important;
							}
						`}</style>

						{whereValue.length >= 1 ? (
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								{filteredStateNames.length > 0 ? (
									filteredStateNames.map((stateName) => {
										const { icon, backgroundColor } = getCityIconProps('', stateName);
										return (
											<div
												key={stateName}
												className={`w-[415px] max-w-[calc(100%-24px)] min-h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2 border ${
													whereValue === stateName
														? 'bg-[#DBECFF] border-[#000000]'
														: 'bg-white hover:bg-[#f0f0f0] border-transparent'
												}`}
												onClick={() => setWhereAndClose(stateName, false)}
											>
												<div
													className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
													style={{ backgroundColor }}
												>
													{icon}
												</div>
												<div className="ml-[12px] flex flex-col">
													<div className="text-[20px] font-medium leading-none text-black font-inter">
														{stateName}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														Search contacts in {stateName}
													</div>
												</div>
											</div>
										);
									})
								) : (
									<div className="text-black font-medium font-secondary">No locations found</div>
								)}
							</CustomScrollbar>
						) : (
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								<div
									className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
										userLocationName && whereValue === userLocationName
											? 'bg-[#DBECFF] border-[#000000]'
											: 'bg-white hover:bg-[#f0f0f0] border-transparent'
									}`}
									onClick={() => {
										void handleNearMeClick();
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#D0E6FF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<NearMeIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Near Me
										</div>
										<div
											className={`text-[12px] leading-tight mt-[4px] select-none ${
												userLocationName || isLoadingLocation
													? 'text-black/60'
													: 'text-transparent'
											}`}
										>
											{isLoadingLocation ? 'Locating...' : userLocationName || 'Placeholder'}
										</div>
									</div>
								</div>

								{DEFAULT_STATE_SUGGESTIONS.map(
									({ label, promotionDescription, generalDescription }) => {
										const { icon, backgroundColor } = getCityIconProps('', label);
										return (
											<div
												key={label}
												className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
													whereValue === label
														? 'bg-[#DBECFF] border-[#000000]'
														: 'bg-white hover:bg-[#f0f0f0] border-transparent'
												}`}
												onClick={() => setWhereAndClose(label, false)}
											>
												<div
													className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
													style={{ backgroundColor }}
												>
													{icon}
												</div>
												<div className="ml-[12px] flex flex-col">
													<div className="text-[20px] font-medium leading-none text-black font-inter">
														{label}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														{isPromotion ? promotionDescription : generalDescription}
													</div>
												</div>
											</div>
										);
									}
								)}

								{allStateNamesExcludingDefaults.map((stateName) => {
									const { icon, backgroundColor } = getCityIconProps('', stateName);
									return (
										<div
											key={stateName}
											className={`w-[415px] max-w-[calc(100%-24px)] h-[68px] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 border ${
												whereValue === stateName
													? 'bg-[#DBECFF] border-[#000000]'
													: 'bg-white hover:bg-[#f0f0f0] border-transparent'
											}`}
											onClick={() => setWhereAndClose(stateName, false)}
										>
											<div
												className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
												style={{ backgroundColor }}
											>
												{icon}
											</div>
											<div className="ml-[12px] flex flex-col">
												<div className="text-[20px] font-medium leading-none text-black font-inter">
													{stateName}
												</div>
												<div className="text-[12px] leading-tight text-black mt-[4px]">
													Search contacts in {stateName}
												</div>
											</div>
										</div>
									);
								})}
							</CustomScrollbar>
						)}
					</div>
				</div>
			</div>
		);
	};

	const searchTextValue = useMemo(() => {
		const formattedWhere = whereValue.trim() ? `(${whereValue.trim()})` : '';
		return [whyValue, whatValue, formattedWhere].filter(Boolean).join(' ').trim();
	}, [whyValue, whatValue, whereValue]);

	return (
		<div ref={rootRef} className="results-search-input-group">
			<div className="search-wave-container relative">
				<Input
					className={`search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black !pr-[12px] ${
						activeSection ? '!bg-[#F3F3F3]' : '!bg-white'
					} text-center text-transparent placeholder:text-transparent`}
					placeholder=""
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					readOnly
					value={searchTextValue}
					aria-label="Search"
				/>

				{/* 3-part mini search tray overlay (Why / What / Where) */}
				<div
					className={`absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center rounded-[6px] z-10 group ${
						activeSection ? 'bg-[#F3F3F3] border border-transparent' : 'bg-white border border-black'
					}`}
					style={{
						width: 'calc(100% - 12px)',
						height: '38px',
					}}
				>
					{/* Sliding active section indicator for mini search bar */}
					<div
						ref={miniActiveSectionIndicatorRef}
						className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[6px] pointer-events-none z-0"
						style={{ opacity: 0, willChange: 'transform' }}
					/>

					{/* Why */}
					<div
						className={`flex-1 flex items-center justify-start border-r border-transparent ${
							!activeSection ? 'group-hover:border-black/10' : ''
						} h-full min-w-0 relative pl-[16px] pr-1 mini-search-section-why`}
						onClick={() => setActiveSection('why')}
					>
						<div className="w-full h-full flex items-center text-left text-[13px] font-bold font-secondary truncate p-0 relative z-10 cursor-pointer">
							{whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Why'}
						</div>
					</div>

					{/* What */}
					<div
						className={`flex-1 flex items-center justify-start border-r border-transparent ${
							!activeSection ? 'group-hover:border-black/10' : ''
						} h-full min-w-0 relative pl-[16px] pr-1 mini-search-section-what`}
						onClick={() => setActiveSection('what')}
					>
						<input
							ref={whatInputRef}
							value={whatValue}
							readOnly={readOnly}
							onChange={(e) => setWhatValue(e.target.value)}
							className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
							style={{
								maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
								WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
							}}
							placeholder="What"
							onFocus={(e) => {
								setActiveSection('what');
								const target = e.target;
								setTimeout(() => target.setSelectionRange(0, 0), 0);
							}}
						/>
					</div>

					{/* Where */}
					<div
						className="flex-1 flex items-center justify-end h-full min-w-0 relative pr-[12px] pl-[16px] mini-search-section-where"
						onClick={() => setActiveSection('where')}
					>
						<input
							ref={whereInputRef}
							value={whereValue}
							readOnly={readOnly}
							onChange={(e) => setWhereValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									setActiveSection(null);
								}
							}}
							className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
							style={{
								maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
								WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
							}}
							placeholder="Where"
							onFocus={(e) => {
								setActiveSection('where');
								const target = e.target;
								setTimeout(() => target.setSelectionRange(0, target.value.length), 0);
							}}
						/>
					</div>
				</div>
			</div>

			{renderDesktopSearchDropdowns()}
		</div>
	);
}

