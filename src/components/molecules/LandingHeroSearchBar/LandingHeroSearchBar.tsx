'use client';

import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { Input } from '@/components/ui/input';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { US_STATES } from '@/constants/usStates';
import { getCityIconProps } from '@/utils/cityIcons';
import { buildAllUsStateNames } from '@/utils/usStates';
import { gsap } from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Visual-only copy of the dashboard's initial search bar.
 * Intentionally does not trigger any search behavior yet.
 */
export const LandingHeroSearchBar = () => {
	// Dashboard is scaled down via `html.murmur-compact { zoom: 0.9 }`.
	// We scale this component to match the perceived size on the dashboard.
	const SCALE = 0.9;

	type ActiveSection = 'why' | 'what' | 'where' | null;

	const [whyValue, setWhyValue] = useState('');
	const [whatValue, setWhatValue] = useState('');
	const [whereValue, setWhereValue] = useState('');
	const [activeSection, setActiveSection] = useState<ActiveSection>(null);
	const [isNearMeLocation, setIsNearMeLocation] = useState(false);

	const [userLocationName, setUserLocationName] = useState<string | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	const searchContainerRef = useRef<HTMLDivElement>(null);
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const activeSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevActiveSectionForIndicatorRef = useRef<Exclude<ActiveSection, null> | null>(null);

	const hasWhereValue = whereValue.trim().length > 0;
	const isPromotion = whyValue === '[Promotion]';

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(event.target as Node)
			) {
				setActiveSection(null);
			}
		};

		if (activeSection) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [activeSection]);

	// Animate the active section "pill" sliding between tabs (Why/What/Where)
	useEffect(() => {
		const indicator = activeSectionIndicatorRef.current;
		if (!indicator) return;

		gsap.killTweensOf(indicator);

		const xPercentForSection = (section: Exclude<ActiveSection, null>) => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
			}
		};

		const transformOriginForSection = (section: Exclude<ActiveSection, null>) => {
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
			prevActiveSectionForIndicatorRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevActiveSectionForIndicatorRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		if (!prevSection) {
			const origin = transformOriginForSection(activeSection);

			// Start as full-width highlight (scaleX: 3 because indicator is 1/3 width),
			// then shrink toward the selected segment's side/center.
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
			prevActiveSectionForIndicatorRef.current = activeSection;
			return;
		}

		// Between tabs, slide
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

		prevActiveSectionForIndicatorRef.current = activeSection;
	}, [activeSection]);

	// Fetch "Near Me" label only when the user opens the Where dropdown.
	useEffect(() => {
		if (activeSection !== 'where' || userLocationName || isLoadingLocation) return;

		setIsLoadingLocation(true);
		if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				async (position) => {
					try {
						const { latitude, longitude } = position.coords;
						const response = await fetch(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						);
						const data = await response.json();
						const city =
							data.address?.city ||
							data.address?.town ||
							data.address?.village ||
							data.address?.hamlet;
						const state = data.address?.state;

						const stateToAbbr: Record<string, string> = {
							Alabama: 'AL',
							Alaska: 'AK',
							Arizona: 'AZ',
							Arkansas: 'AR',
							California: 'CA',
							Colorado: 'CO',
							Connecticut: 'CT',
							Delaware: 'DE',
							Florida: 'FL',
							Georgia: 'GA',
							Hawaii: 'HI',
							Idaho: 'ID',
							Illinois: 'IL',
							Indiana: 'IN',
							Iowa: 'IA',
							Kansas: 'KS',
							Kentucky: 'KY',
							Louisiana: 'LA',
							Maine: 'ME',
							Maryland: 'MD',
							Massachusetts: 'MA',
							Michigan: 'MI',
							Minnesota: 'MN',
							Mississippi: 'MS',
							Missouri: 'MO',
							Montana: 'MT',
							Nebraska: 'NE',
							Nevada: 'NV',
							'New Hampshire': 'NH',
							'New Jersey': 'NJ',
							'New Mexico': 'NM',
							'New York': 'NY',
							'North Carolina': 'NC',
							'North Dakota': 'ND',
							Ohio: 'OH',
							Oklahoma: 'OK',
							Oregon: 'OR',
							Pennsylvania: 'PA',
							'Rhode Island': 'RI',
							'South Carolina': 'SC',
							'South Dakota': 'SD',
							Tennessee: 'TN',
							Texas: 'TX',
							Utah: 'UT',
							Vermont: 'VT',
							Virginia: 'VA',
							Washington: 'WA',
							'West Virginia': 'WV',
							Wisconsin: 'WI',
							Wyoming: 'WY',
						};

						const stateAbbr = state ? stateToAbbr[state] || state : null;

						if (city && stateAbbr) {
							setUserLocationName(`${city}, ${stateAbbr}`);
						} else if (city) {
							setUserLocationName(city);
						} else if (stateAbbr) {
							setUserLocationName(stateAbbr);
						} else {
							setUserLocationName('Current Location');
						}
					} catch (error) {
						console.error('Error getting location:', error);
						setUserLocationName('Unable to find location');
					} finally {
						setIsLoadingLocation(false);
					}
				},
				(error) => {
					console.error('Geolocation error:', error);
					setUserLocationName('Location access needed');
					setIsLoadingLocation(false);
				}
			);
		} else {
			setUserLocationName('Geolocation not supported');
			setIsLoadingLocation(false);
		}
	}, [activeSection, userLocationName, isLoadingLocation]);

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

		const dropdownLeft = activeSection === 'why' ? 4 : activeSection === 'what' ? 176 : 98;

		return (
			<div
				className="search-dropdown-menu hidden md:block w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] relative overflow-hidden"
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
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
								className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								onClick={() => {
									setWhatValue('Radio Stations');
									setActiveSection('where');
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Wine, Beer, and Spirits');
										setActiveSection('where');
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Restaurants');
										setActiveSection('where');
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Coffee Shops');
										setActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#A9DE78] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<CoffeeShopsIcon />
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Festivals');
										setActiveSection('where');
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Wedding Planners');
										setActiveSection('where');
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Music Venues');
										setActiveSection('where');
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
												className="w-[415px] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										if (userLocationName && !isLoadingLocation) {
											setWhereAndClose(userLocationName, true);
										}
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
												className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
											className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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

	return (
		<div className="origin-center" style={{ transform: `scale(${SCALE})` }}>
			<div className="search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 !z-[50]">
				<div className="search-bar-inner">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							setActiveSection(null);
						}}
					>
						<div className="search-input-group relative" ref={searchContainerRef}>
							<div className="search-wave-container" style={{ transition: 'none' }}>
								<Input
									className="search-wave-input !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !h-[72px] !border-2 !border-black pr-[70px] md:pr-[80px]"
									placeholder=""
									style={{
										accentColor: 'transparent',
										transition: 'none',
									}}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck={false}
								/>

								{/* 3-section dashboard-style UI overlay (Why / What / Where) */}
								<div
									className={`search-sections-container absolute left-[4px] right-[68px] top-1/2 -translate-y-1/2 h-[64px] rounded-[8px] z-20 font-secondary flex items-center ${
										activeSection ? 'bg-[#EFEFEF] border border-transparent' : 'bg-white border border-black'
									}`}
									style={{ transition: 'none' }}
								>
									{/* Sliding active tab indicator */}
									<div
										ref={activeSectionIndicatorRef}
										className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[8px] pointer-events-none z-10"
										style={{ opacity: 0, willChange: 'transform' }}
									/>

									{/* Why */}
									<div
										className={`relative h-full cursor-pointer border flex-1 min-w-0 ${
											activeSection === 'why'
												? 'bg-transparent border-transparent rounded-[8px]'
												: `border-transparent ${
														activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
												  } rounded-l-[8px]`
										}`}
										onClick={() => setActiveSection(activeSection === 'why' ? null : 'why')}
									>
										<div className="absolute z-20 left-[24px] top-[10px] text-[22px] font-bold text-black leading-none">
											Why
										</div>
										<div className="absolute z-20 left-[24px] right-[4px] top-[42px] h-[12px] overflow-hidden">
											<div
												className="absolute top-0 left-0 font-semibold text-[12px] whitespace-nowrap"
												style={{
													height: '12px',
													lineHeight: '12px',
													padding: '0',
													margin: '0',
													color:
														whyValue && whyValue.trim().length > 0
															? '#000000'
															: 'rgba(0, 0, 0, 0.42)',
												}}
											>
												{whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Choose Type of Search'}
											</div>
										</div>
									</div>

									<div
										className={`w-[2px] h-full bg-black/10 flex-shrink-0 ${
											activeSection ? 'hidden' : ''
										}`}
									/>

									{/* What */}
									<div
										className={`relative h-full cursor-pointer border overflow-hidden flex-1 min-w-0 ${
											activeSection === 'what'
												? 'bg-transparent border-transparent rounded-[8px]'
												: `border-transparent ${
														activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
												  }`
										}`}
										onClick={() => setActiveSection('what')}
									>
										<div className="absolute z-20 left-[24px] top-[10px] text-[22px] font-bold text-black leading-none">
											What
										</div>
										<div className="absolute z-20 left-[24px] right-[8px] top-[42px] h-[12px] overflow-hidden">
											{activeSection === 'what' ? (
												<input
													ref={whatInputRef}
													type="text"
													value={whatValue}
													onChange={(e) => setWhatValue(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															setActiveSection('where');
														}
													}}
													className="absolute z-20 top-0 left-0 w-full font-semibold text-black text-[12px] bg-transparent outline-none border-none"
													style={{
														height: '12px',
														lineHeight: '12px',
														padding: '0',
														margin: '0',
														transform: 'translateY(-1px)',
														fontFamily:
															'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
													}}
													placeholder="Add Recipients"
													onClick={(e) => e.stopPropagation()}
												/>
											) : (
												<div
													className="absolute z-20 top-0 left-0 w-full font-semibold text-[12px] whitespace-nowrap overflow-hidden hover:text-black/60 transition-colors"
													style={{
														height: '12px',
														lineHeight: '12px',
														padding: '0',
														margin: '0',
														color: whatValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
														maskImage:
															'linear-gradient(to right, black 80%, transparent 100%)',
														WebkitMaskImage:
															'linear-gradient(to right, black 80%, transparent 100%)',
													}}
												>
													{whatValue || 'Add Recipients'}
												</div>
											)}
										</div>
									</div>

									<div
										className={`w-[2px] h-full bg-black/10 flex-shrink-0 ${
											activeSection ? 'hidden' : ''
										}`}
									/>

									{/* Where */}
									<div
										className={`relative h-full cursor-pointer border overflow-hidden flex-1 min-w-0 ${
											activeSection === 'where'
												? 'bg-transparent border-transparent rounded-[8px]'
												: `border-transparent ${
														activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
												  } rounded-r-[8px]`
										}`}
										onClick={() => setActiveSection('where')}
									>
										<div className="absolute z-20 left-[24px] top-[10px] text-[22px] font-bold text-black leading-none">
											Where
										</div>
										<div className="absolute z-20 left-[24px] right-[8px] top-[42px] h-[12px] overflow-hidden">
											{activeSection === 'where' ? (
												<div className="absolute z-20 top-0 left-0 w-full h-full flex items-center gap-[2px]">
													<input
														ref={whereInputRef}
														type="text"
														value={whereValue}
														onChange={(e) => {
															setWhereValue(e.target.value);
															setIsNearMeLocation(false);
														}}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																setActiveSection(null);
															}
														}}
														className="z-20 flex-1 font-semibold text-black text-[12px] bg-transparent outline-none border-none"
														style={{
															height: '12px',
															lineHeight: '12px',
															padding: '0',
															margin: '0',
															transform: 'translateY(-1px)',
															fontFamily:
																'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
														}}
														placeholder="Search States"
														onClick={(e) => e.stopPropagation()}
													/>
												</div>
											) : (
												<div
													className="absolute z-20 top-0 left-0 w-full font-semibold text-[12px] whitespace-nowrap overflow-hidden hover:text-black/60 transition-colors"
													style={{
														height: '12px',
														lineHeight: '12px',
														padding: '0',
														margin: '0',
														color: hasWhereValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
														maskImage:
															'linear-gradient(to right, black 80%, transparent 100%)',
														WebkitMaskImage:
															'linear-gradient(to right, black 80%, transparent 100%)',
													}}
												>
													{hasWhereValue ? whereValue : 'Search States'}
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Search button (still not wired up to search) */}
								<button
									type="submit"
									className="flex absolute right-[6px] items-center justify-center w-[58px] h-[62px] z-40 cursor-pointer group"
									style={{
										top: '50%',
										transform: 'translateY(-50%)',
										backgroundColor: 'rgba(93, 171, 104, 0.49)',
										borderTopRightRadius: '7px',
										borderBottomRightRadius: '7px',
										borderTopLeftRadius: '0',
										borderBottomLeftRadius: '0',
										border: '1px solid #5DAB68',
										borderLeft: '1px solid #5DAB68',
										transition: 'none',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor = 'rgba(93, 171, 104, 0.65)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = 'rgba(93, 171, 104, 0.49)';
									}}
									aria-label="Search"
								>
									<SearchIconDesktop width={26} height={28} />
								</button>
							</div>

							{renderDesktopSearchDropdowns()}
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

