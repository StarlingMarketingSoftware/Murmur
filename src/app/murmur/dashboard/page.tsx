'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { useDashboard } from './useDashboard';
import { urls } from '@/constants/urls';
import { isProblematicBrowser } from '@/utils/browserDetection';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { SearchIconMobile } from '@/components/atoms/_svg/SearchIconMobile';
import { SearchIconResults } from '@/components/atoms/_svg/SearchIconResults';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import { SuburbsIcon } from '@/components/atoms/_svg/SuburbsIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import ConsoleLoader from '@/components/atoms/ConsoleLoader/ConsoleLoader';
import { Card, CardContent } from '@/components/ui/card';

import { useClerk } from '@clerk/nextjs';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetLocations } from '@/hooks/queryHooks/useContacts';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

const DEFAULT_STATE_SUGGESTIONS = [
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
];

const Dashboard = () => {
	const { isSignedIn, openSignIn } = useClerk();
	const isMobile = useIsMobile();
	const [isMobileLandscape, setIsMobileLandscape] = useState(false);
	const [whyValue, setWhyValue] = useState('');
	const [whatValue, setWhatValue] = useState('');
	const [whereValue, setWhereValue] = useState('');
	const hasWhereValue = whereValue.trim().length > 0;
	const isPromotion = whyValue === '[Promotion]';
	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);
	const [userLocationName, setUserLocationName] = useState<string | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	const debouncedWhereValue = useDebounce(whereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state-first'
	);

	useEffect(() => {
		if (activeSection === 'where' && !userLocationName && !isLoadingLocation) {
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
		}
	}, [activeSection, userLocationName, isLoadingLocation]);

	useEffect(() => {
		if (isMobile !== true) {
			setIsMobileLandscape(false);
			return;
		}

		const check = () => {
			if (typeof window !== 'undefined') {
				setIsMobileLandscape(window.innerWidth > window.innerHeight);
			}
		};

		check();
		window.addEventListener('resize', check);
		window.addEventListener('orientationchange', check);
		return () => {
			window.removeEventListener('resize', check);
			window.removeEventListener('orientationchange', check);
		};
	}, [isMobile]);

	// Mobile-friendly sizing for hero logo and subtitle; desktop remains unchanged
	const logoWidth = isMobile ? '190px' : '300px';
	const logoHeight = isMobile ? '50px' : '79px';
	const hasProblematicBrowser = isProblematicBrowser();
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const whyInputRef = useRef<HTMLInputElement>(null);
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const {
		form,
		onSubmit,
		isLoadingContacts,
		handleCreateCampaign,
		isPendingCreateCampaign,
		contacts,
		columns,
		setSelectedContacts,
		isRefetchingContacts,
		activeSearchQuery,
		tableRef,
		selectedContacts,
		isPendingBatchUpdateContacts,
		isError,
		error,
		hasSearched,
		handleResetSearch,
		handleSelectAll,
		isAllSelected,
		setHoveredContact,
		hoveredContact,
	} = useDashboard();

	// Clear hover state on mobile to prevent stuck hover
	useEffect(() => {
		if (isMobile) {
			setHoveredContact(null);
		}
	}, [isMobile, setHoveredContact]);

	// Combine section values into main search field
	useEffect(() => {
		const formattedWhere =
			whereValue && whereValue.trim().length > 0 ? `(${whereValue})` : '';
		const combinedSearch = [whyValue, whatValue, formattedWhere]
			.filter(Boolean)
			.join(' ');
		if (combinedSearch) {
			form.setValue('searchText', combinedSearch);
		}
	}, [whyValue, whatValue, whereValue, form]);

	// Handle clicks outside to deactivate sections
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				!target.closest('.search-sections-container') &&
				!target.closest('.search-dropdown-menu')
			) {
				setActiveSection(null);
			}
		};

		if (activeSection) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [activeSection]);

	// Focus input when section becomes active
	useEffect(() => {
		if (activeSection === 'why' && whyInputRef.current) {
			whyInputRef.current.focus();
		} else if (activeSection === 'what' && whatInputRef.current) {
			whatInputRef.current.focus();
		} else if (activeSection === 'where' && whereInputRef.current) {
			whereInputRef.current.focus();
		}
	}, [activeSection]);

	// Enhanced reset search that also clears section values
	const handleEnhancedResetSearch = () => {
		handleResetSearch();
		setWhyValue('');
		setWhatValue('');
		setWhereValue('');
		setActiveSection(null);
	};

	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return null;
	}

	// Reduce extra white space above the fixed mobile action button by
	// only adding bottom padding when needed and using a smaller value on mobile
	const bottomPadding = isMobile && hasSearched ? 'pb-[64px]' : 'pb-0 md:pb-[100px]';

	return (
		<AppLayout>
			<div
				className={`relative min-h-screen transition-all duration-500 dashboard-main-offset w-full max-w-full ${bottomPadding} ${
					hasSearched ? 'search-active' : ''
				}`}
			>
				<div className="hero-wrapper flex flex-col justify-center items-center !z-[40]">
					<div className="w-full">
						<div
							className="flex justify-center items-center w-full px-4"
							style={{ marginBottom: '0.75rem', marginTop: '50px' }}
						>
							<div className="premium-hero-section flex flex-col items-center justify-center w-full max-w-[600px]">
								<div
									className="premium-logo-container flex items-center justify-center"
									style={{ width: logoWidth, height: logoHeight }}
								>
									<MurmurLogoNew width={logoWidth} height={logoHeight} />
								</div>
							</div>
						</div>

						<div
							className={`search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 !z-[50] ${
								hasSearched ? 'search-bar-active' : ''
							}`}
						>
							<div className="search-bar-inner">
								{hasSearched && activeSearchQuery && (
									<div className="search-context-label">
										<span className="search-query-text">{activeSearchQuery}</span>
									</div>
								)}
								{!hasSearched && (
									<Form {...form}>
										<form
											onSubmit={(e) => {
												e.preventDefault();
												if (!isSignedIn) {
													if (hasProblematicBrowser) {
														// For Edge/Safari, navigate to sign-in page
														console.log(
															'[Dashboard] Edge/Safari detected, navigating to sign-in page'
														);
														if (typeof window !== 'undefined') {
															sessionStorage.setItem(
																'redirectAfterSignIn',
																window.location.pathname
															);
														}
														window.location.href = urls.signIn.index;
													} else {
														openSignIn();
													}
												} else {
													form.handleSubmit(onSubmit)(e);
												}
											}}
											className={hasSearched ? 'search-form-active' : ''}
										>
											<FormField
												control={form.control}
												name="searchText"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<div
																ref={searchContainerRef}
																className={`search-input-group relative ${
																	hasSearched ? 'search-input-group-active' : ''
																}`}
															>
																<div
																	className={`search-wave-container ${
																		isLoadingContacts || isRefetchingContacts
																			? 'search-wave-loading'
																			: ''
																	}`}
																>
																	<Input
																		className="search-wave-input !border-2 !border-black !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent md:!h-[72px] md:pr-[80px]"
																		placeholder=""
																		style={{
																			accentColor: 'transparent',
																		}}
																		autoComplete="off"
																		autoCorrect="off"
																		autoCapitalize="off"
																		spellCheck="false"
																		{...field}
																	/>
																	{/* New 532x64px element - Added border-black and z-20 */}
																	<div
																		className={`search-sections-container hidden md:block absolute left-[4px] top-1/2 -translate-y-1/2 w-[532px] h-[64px] rounded-[8px] border z-20 font-secondary ${
																			activeSection
																				? 'bg-[#EFEFEF] border-transparent'
																				: 'bg-white border-black'
																		}`}
																	>
																		<div
																			className={`absolute left-[172px] top-0 bottom-0 w-[2px] bg-black/10 ${
																				activeSection ? 'hidden' : ''
																			}`}
																		/>
																		<div
																			className={`absolute left-[332px] top-0 bottom-0 w-[2px] bg-black/10 ${
																				activeSection ? 'hidden' : ''
																			}`}
																		/>
																		{/* Why Section */}
																		<div
																			className={`absolute left-0 top-[-1px] h-[64px] cursor-pointer border ${
																				activeSection === 'why'
																					? 'w-[174px] bg-white border-black z-30 rounded-[8px]'
																					: `w-[172px] border-transparent ${
																							activeSection
																								? 'hover:bg-[#F9F9F9]'
																								: 'hover:bg-black/5'
																					  } rounded-l-[8px]`
																			}`}
																			onClick={() => setActiveSection('why')}
																		>
																			<div className="absolute left-[24px] top-[10px] font-bold text-black text-[22px] leading-none">
																				Why
																			</div>
																			<div className="absolute left-[24px] top-[42px] w-[144px] h-[12px]">
																				{activeSection === 'why' ? (
																					<input
																						ref={whyInputRef}
																						type="text"
																						value={whyValue}
																						onChange={(e) => setWhyValue(e.target.value)}
																						onKeyDown={(e) => {
																							if (e.key === 'Enter') {
																								e.preventDefault();
																								setActiveSection(null);
																							}
																						}}
																						className="absolute top-0 left-0 w-full font-semibold text-black text-[12px] bg-transparent outline-none border-none"
																						style={{
																							height: '12px',
																							lineHeight: '12px',
																							padding: '0',
																							margin: '0',
																							transform: 'translateY(-1px)',
																							fontFamily:
																								'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																						}}
																						placeholder="Choose Type of Search"
																						onClick={(e) => e.stopPropagation()}
																					/>
																				) : (
																					<div
																						className="absolute top-0 left-0 font-semibold text-black/42 text-[12px] whitespace-nowrap"
																						style={{
																							height: '12px',
																							lineHeight: '12px',
																							padding: '0',
																							margin: '0',
																						}}
																					>
																						{whyValue || 'Choose Type of Search'}
																					</div>
																				)}
																			</div>
																		</div>
																		{/* What Section */}
																		<div
																			className={`absolute left-[172px] top-[-1px] h-[64px] cursor-pointer border ${
																				activeSection === 'what'
																					? 'w-[161px] bg-white border-black z-30 rounded-[8px]'
																					: `w-[160px] border-transparent ${
																							activeSection
																								? 'hover:bg-[#F9F9F9]'
																								: 'hover:bg-black/5'
																					  }`
																			}`}
																			onClick={() => setActiveSection('what')}
																		>
																			<div className="absolute left-[24px] top-[10px] font-bold text-black text-[22px] leading-none">
																				What
																			</div>
																			<div className="absolute left-[24px] top-[42px] w-[124px] h-[12px]">
																				{activeSection === 'what' ? (
																					<input
																						ref={whatInputRef}
																						type="text"
																						value={whatValue}
																						onChange={(e) => setWhatValue(e.target.value)}
																						onKeyDown={(e) => {
																							if (e.key === 'Enter') {
																								e.preventDefault();
																								setActiveSection(null);
																							}
																						}}
																						className="absolute top-0 left-0 w-full font-semibold text-black text-[12px] bg-transparent outline-none border-none"
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
																						className="absolute top-0 left-0 font-semibold text-black/42 text-[12px] whitespace-nowrap hover:text-black/60 transition-colors"
																						style={{
																							height: '12px',
																							lineHeight: '12px',
																							padding: '0',
																							margin: '0',
																						}}
																					>
																						{whatValue || 'Add Recipients'}
																					</div>
																				)}
																			</div>
																		</div>
																		{/* Where Section */}
																		<div
																			className={`absolute left-[332px] top-[-1px] h-[64px] cursor-pointer border ${
																				activeSection === 'where'
																					? 'w-[201px] bg-white border-black z-30 rounded-[8px]'
																					: `w-[200px] border-transparent ${
																							activeSection
																								? 'hover:bg-[#F9F9F9]'
																								: 'hover:bg-black/5'
																					  } rounded-r-[8px]`
																			}`}
																			onClick={() => setActiveSection('where')}
																		>
																			<div className="absolute left-[24px] top-[10px] font-bold text-black text-[22px] leading-none">
																				Where
																			</div>
																			<div className="absolute left-[24px] top-[42px] w-[156px] h-[12px]">
																				{activeSection === 'where' ? (
																					<div className="absolute top-0 left-0 w-full h-full flex items-center gap-[2px]">
																						<span
																							className="font-semibold text-black text-[12px] leading-none"
																							style={{
																								opacity: hasWhereValue ? 1 : 0,
																								transform: 'translateY(-1px)',
																							}}
																						>
																							(
																						</span>
																						<input
																							ref={whereInputRef}
																							type="text"
																							value={whereValue}
																							onChange={(e) =>
																								setWhereValue(e.target.value)
																							}
																							onKeyDown={(e) => {
																								if (e.key === 'Enter') {
																									e.preventDefault();
																									setActiveSection(null);
																								}
																							}}
																							className="flex-1 font-semibold text-black text-[12px] bg-transparent outline-none border-none"
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
																						<span
																							className="font-semibold text-black text-[12px] leading-none"
																							style={{
																								opacity: hasWhereValue ? 1 : 0,
																								transform: 'translateY(-1px)',
																							}}
																						>
																							)
																						</span>
																					</div>
																				) : (
																					<div
																						className="absolute top-0 left-0 font-semibold text-black/42 text-[12px] whitespace-nowrap hover:text-black/60 transition-colors"
																						style={{
																							height: '12px',
																							lineHeight: '12px',
																							padding: '0',
																							margin: '0',
																						}}
																					>
																						{hasWhereValue
																							? `(${whereValue})`
																							: 'Search States'}
																					</div>
																				)}
																			</div>
																		</div>
																	</div>
																	{/* Desktop Search Button */}
																	<button
																		type="submit"
																		className="hidden md:flex absolute right-[6px] items-center justify-center w-[58px] h-[62px] transition-colors z-40 cursor-pointer group"
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
																		}}
																		onMouseEnter={(e) => {
																			e.currentTarget.style.backgroundColor =
																				'rgba(93, 171, 104, 0.65)';
																		}}
																		onMouseLeave={(e) => {
																			e.currentTarget.style.backgroundColor =
																				'rgba(93, 171, 104, 0.49)';
																		}}
																	>
																		<SearchIconDesktop />
																	</button>
																	{/* Mobile-only submit icon inside input */}
																	<button
																		type="submit"
																		className="search-input-icon-btn"
																		aria-label="Search"
																	>
																		<SearchIconMobile />
																	</button>
																</div>
																{activeSection === 'why' && (
																	<div className="search-dropdown-menu hidden md:flex flex-col items-center justify-center gap-[12px] absolute top-[calc(100%+10px)] left-[4px] w-[439px] h-[173px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[60]">
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
																					reach out to radio stations, playlists, and more
																					to get your music played
																				</div>
																			</div>
																		</div>
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
																					contact venues, resturants and more, to book
																					shows
																				</div>
																			</div>
																		</div>
																	</div>
																)}
																{activeSection === 'what' &&
																	whyValue === '[Promotion]' && (
																		<div className="search-dropdown-menu hidden md:flex flex-col items-center justify-center gap-[10px] absolute top-[calc(100%+10px)] left-[176px] w-[439px] h-[92px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[60]">
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
																	)}
																{activeSection === 'what' &&
																	whyValue !== '[Promotion]' && (
																		<div className="search-dropdown-menu hidden md:flex flex-col items-center justify-center gap-[10px] absolute top-[calc(100%+10px)] left-[176px] w-[439px] h-[404px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[60]">
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
																					setWhatValue('Wedding Planners');
																					setActiveSection('where');
																				}}
																			>
																				<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
																					<WeddingPlannersIcon />
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
																		</div>
																	)}
																{activeSection === 'where' && (
																	<div
																		id="where-dropdown-container"
																		className={`search-dropdown-menu hidden md:block absolute top-[calc(100%+10px)] left-[98px] w-[439px] h-[370px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[60]`}
																		style={{ overflow: 'visible' }}
																	>
																		<style jsx global>{`
																			#where-dropdown-container .scrollbar-hide {
																				scrollbar-width: none !important;
																				scrollbar-color: transparent transparent !important;
																				-ms-overflow-style: none !important;
																			}
																			#where-dropdown-container
																				.scrollbar-hide::-webkit-scrollbar {
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
																				{isLoadingLocations ? (
																					<div className="flex items-center justify-center h-full">
																						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
																					</div>
																				) : locationResults &&
																				  locationResults.length > 0 ? (
																					locationResults.map((loc, idx) => {
																						const { icon, backgroundColor } =
																							getCityIconProps(loc.city, loc.state);
																						return (
																							<div
																								key={`${loc.city}-${loc.state}-${idx}`}
																								className="w-[415px] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2"
																								onClick={() => {
																									setWhereValue(loc.label);
																									setActiveSection(null);
																								}}
																							>
																								<div
																									className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
																									style={{ backgroundColor }}
																								>
																									{icon}
																								</div>
																								<div className="ml-[12px] flex flex-col">
																									<div className="text-[20px] font-medium leading-none text-black font-inter">
																										{loc.label}
																									</div>
																									<div className="text-[12px] leading-tight text-black mt-[4px]">
																										Search contacts in{' '}
																										{loc.city || loc.state}
																									</div>
																								</div>
																							</div>
																						);
																					})
																				) : (
																					<div className="text-black font-medium font-secondary">
																						No locations found
																					</div>
																				)}
																			</CustomScrollbar>
																		) : (
																			<div className="flex flex-col items-center justify-center gap-[20px] w-full h-full">
																				<div
																					className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
																					onClick={() => {
																						if (userLocationName && !isLoadingLocation) {
																							setWhereValue(userLocationName);
																							setActiveSection(null);
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
																							{isLoadingLocation
																								? 'Locating...'
																								: userLocationName || 'Placeholder'}
																						</div>
																					</div>
																				</div>
																				{DEFAULT_STATE_SUGGESTIONS.map(
																					({
																						label,
																						promotionDescription,
																						generalDescription,
																					}) => (
																						<div
																							key={label}
																							className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
																							onClick={() => {
																								setWhereValue(label);
																								setActiveSection(null);
																							}}
																						>
																							<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
																								<SuburbsIcon />
																							</div>
																							<div className="ml-[12px] flex flex-col">
																								<div className="text-[20px] font-medium leading-none text-black font-inter">
																									{label}
																								</div>
																								<div className="text-[12px] leading-tight text-black mt-[4px]">
																									{isPromotion
																										? promotionDescription
																										: generalDescription}
																								</div>
																							</div>
																						</div>
																					)
																				)}
																			</div>
																		)}
																	</div>
																)}
															</div>
														</FormControl>
													</FormItem>
												)}
											/>
											{false && !hasSearched && (
												<div className="flex flex-row gap-4 items-center justify-between w-full flex-wrap">
													<div className="flex flex-row gap-4 items-center h-[39px] justify-start flex-shrink-0">
														<div
															className="exclude-contacts-box bg-[#EFEFEF] w-[227px] h-[32px] rounded-[8px] flex items-center px-4 my-auto"
															style={
																isMobile
																	? ({
																			width: '124px',
																			height: '16px',
																			padding: '0 6px',
																			borderRadius: '6px',
																	  } as React.CSSProperties)
																	: undefined
															}
														>
															<FormField
																control={form.control}
																name="excludeUsedContacts"
																render={({ field }) => (
																	<FormItem className="flex flex-row items-center justify-between space-y-0 m-0 w-full gap-3">
																		<div className="leading-none flex items-center">
																			<FormLabel
																				className="font-bold cursor-pointer select-none whitespace-nowrap"
																				style={
																					isMobile
																						? ({
																								fontSize: '8px',
																								lineHeight: '10px',
																								fontFamily:
																									'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																								fontWeight: 700,
																								letterSpacing: '0',
																								whiteSpace: 'nowrap',
																						  } as React.CSSProperties)
																						: ({
																								fontSize: '14px',
																								lineHeight: '16px',
																						  } as React.CSSProperties)
																				}
																			>
																				Exclude Used Contacts
																			</FormLabel>
																		</div>
																		<FormControl>
																			<label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
																				<input
																					type="checkbox"
																					className="sr-only peer"
																					checked={field.value}
																					onChange={(e) =>
																						field.onChange(e.target.checked)
																					}
																				/>
																				<div
																					className={`toggle-switch-track w-[26px] h-4 rounded-full relative overflow-hidden transition-colors duration-200 shadow-none drop-shadow-none ${
																						field.value ? 'toggle-on' : 'toggle-off'
																					}`}
																					style={
																						{
																							'--toggle-bg': field.value
																								? '#5dab68'
																								: '#E5E5E5',
																							backgroundColor: 'var(--toggle-bg)',
																							background: 'var(--toggle-bg)',
																							...(isMobile
																								? ({
																										width: '13px',
																										minWidth: '13px',
																										height: '8px',
																										borderRadius: '9999px',
																								  } as React.CSSProperties)
																								: {}),
																						} as React.CSSProperties
																					}
																					data-checked={field.value}
																					data-debug={JSON.stringify({
																						value: field.value,
																						type: typeof field.value,
																					})}
																				>
																					<div
																						className={`absolute transform transition-transform duration-200 ease-in-out ${
																							field.value ? 'bg-white' : 'bg-[#050505]'
																						} rounded-full shadow-none drop-shadow-none`}
																						style={
																							isMobile
																								? ({
																										width: '6px',
																										height: '6px',
																										left: '2px',
																										top: '50%',
																										transform: `translateX(${
																											field.value ? 3 : 0
																										}px) translateY(-50%)`,
																								  } as React.CSSProperties)
																								: ({
																										top: '50%',
																										left: '2px',
																										width: '12px',
																										height: '12px',
																										transform: `translateX(${
																											field.value ? 10 : 0
																										}px) translateY(-50%)`,
																								  } as React.CSSProperties)
																						}
																					/>
																				</div>
																			</label>
																		</FormControl>
																	</FormItem>
																)}
															/>
														</div>
													</div>
												</div>
											)}
										</form>
									</Form>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Search query display with back button */}
				{hasSearched &&
					activeSearchQuery &&
					(isLoadingContacts || isRefetchingContacts) && (
						<div className="search-query-display mt-8">
							<div className="search-query-display-inner">
								<button
									onClick={handleEnhancedResetSearch}
									className="search-back-button"
									aria-label="Back to search"
								>
									<svg
										width="20"
										height="20"
										viewBox="0 0 20 20"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className="search-back-icon"
									>
										<path
											d="M12 16L6 10L12 4"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									<span className="search-back-text">Back</span>
								</button>
								<div className="search-query-display-text">
									<span className="search-query-quote-left">&ldquo;</span>
									{activeSearchQuery}
									<span className="search-query-quote-right">&rdquo;</span>
								</div>
							</div>
						</div>
					)}

				{hasSearched && !isLoadingContacts && !isRefetchingContacts && (
					<div className="results-search-bar-wrapper w-full max-w-[531px] mx-auto px-4 relative">
						<div
							className={`results-search-bar-inner ${hoveredContact ? 'invisible' : ''}`}
						>
							<Form {...form}>
								<form
									onSubmit={(e) => {
										e.preventDefault();
										if (!isSignedIn) {
											if (hasProblematicBrowser) {
												console.log(
													'[Dashboard] Edge/Safari detected, navigating to sign-in page'
												);
												if (typeof window !== 'undefined') {
													sessionStorage.setItem(
														'redirectAfterSignIn',
														window.location.pathname
													);
												}
												window.location.href = urls.signIn.index;
											} else {
												openSignIn();
											}
										} else {
											form.handleSubmit(onSubmit)(e);
										}
									}}
									className="results-search-form"
								>
									<FormField
										control={form.control}
										name="searchText"
										render={({ field }) => (
											<FormItem className="w-full">
												<FormControl>
													<div className="results-search-input-group">
														<div
															className={`search-wave-container relative ${
																isLoadingContacts || isRefetchingContacts
																	? 'search-wave-loading'
																	: ''
															}`}
														>
															<Input
																className={`search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black !pr-[60px] ${
																	field.value === activeSearchQuery &&
																	(field.value?.trim()?.length ?? 0) > 0
																		? 'text-center'
																		: 'text-left'
																}`}
																placeholder='Refine your search... e.g. "Music venues in North Carolina"'
																style={{ accentColor: 'transparent' }}
																autoComplete="off"
																autoCorrect="off"
																autoCapitalize="off"
																spellCheck="false"
																{...field}
															/>
															<button
																type="submit"
																className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors cursor-pointer z-20 hover:bg-[#a3d9a5]"
																style={{
																	width: '48px',
																	height: '37px',
																	backgroundColor: '#B8E4BE',
																	border: '1px solid #5DAB68',
																	borderTopRightRadius: '6px',
																	borderBottomRightRadius: '6px',
																	borderTopLeftRadius: '0',
																	borderBottomLeftRadius: '0',
																}}
																aria-label="Search"
															>
																<div
																	style={{ transform: 'scale(0.75)', display: 'flex' }}
																>
																	<SearchIconDesktop />
																</div>
															</button>
														</div>
													</div>
												</FormControl>
											</FormItem>
										)}
									/>
									{/* Generate action removed; awaiting left-side SVG submit icon */}
								</form>
								<div className="w-full text-center mt-2">
									<span
										className="font-secondary"
										style={{ fontSize: '13px', fontWeight: 400, color: '#7f7f7f' }}
									>
										Select who you want to contact.
									</span>
								</div>
							</Form>
						</div>
						{hoveredContact && !isMobile && (
							<div className="absolute inset-0 z-[90] flex items-start justify-center pointer-events-none bg-white">
								<div className="w-full max-w-[1132px] mx-auto px-4 py-3 text-center">
									<div className="font-secondary font-bold text-[19px] leading-tight truncate">
										{`${hoveredContact.firstName || ''} ${
											hoveredContact.lastName || ''
										}`.trim() ||
											hoveredContact.name ||
											hoveredContact.company ||
											'—'}
									</div>
									<div className="mt-1 w-full flex justify-center">
										<div
											className="inline-flex items-center justify-center h-[19px] rounded-[8px] px-2 whitespace-nowrap"
											style={{
												backgroundColor: '#E8EFFF',
												border: '0.7px solid #000000',
											}}
										>
											<span className="text-[14px] leading-none font-secondary font-medium">
												{hoveredContact.title || '—'}
											</span>
										</div>
									</div>
									{((hoveredContact.firstName && hoveredContact.firstName.length > 0) ||
										(hoveredContact.lastName && hoveredContact.lastName.length > 0) ||
										(hoveredContact.name && hoveredContact.name.length > 0)) &&
									hoveredContact.company ? (
										<div
											className="mt-1 text-[14px] leading-tight truncate"
											style={{ color: '#838383' }}
										>
											{hoveredContact.company}
										</div>
									) : null}
									<div
										className="mt-1 text-[14px] leading-tight truncate"
										style={{ color: '#838383' }}
									>
										{[hoveredContact.city, hoveredContact.state]
											.filter(Boolean)
											.join(', ') || '—'}
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{activeSearchQuery && (
					<>
						{isError ? (
							<div className="mt-10 w-full px-4">
								<Card className="w-full max-w-full mx-auto">
									<CardContent className="py-8">
										<div className="text-center">
											<Typography variant="h3" className="text-destructive mb-2">
												Search Failed
											</Typography>
											<Typography className="text-gray-600 mb-4">
												{error instanceof Error && error.message.includes('timeout')
													? 'The search took too long to complete. Please try a more specific query.'
													: error instanceof Error
													? error.message
													: 'Unable to complete your search. Please try again.'}
											</Typography>
											<Button
												onClick={() => form.handleSubmit(onSubmit)()}
												variant="primary-light"
												className="mt-4"
											>
												Retry Search
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						) : isLoadingContacts || isRefetchingContacts ? (
							<div className="mt-10 w-full px-4 py-8">
								<ConsoleLoader searchQuery={activeSearchQuery} />
							</div>
						) : contacts && contacts.length > 0 ? (
							<div className="flex justify-center w-full px-0 sm:px-4">
								<div className="w-full max-w-full results-appear results-align">
									<Card className="border-0 shadow-none !p-0 w-full">
										<CardContent className="!p-0 w-full">
											<CustomTable
												initialSelectAll={false}
												isSelectable
												setSelectedRows={setSelectedContacts}
												data={contacts}
												columns={columns}
												searchable={false}
												tableRef={tableRef}
												rowsPerPage={100}
												displayRowsPerPage={false}
												constrainHeight
												useCustomScrollbar={!isMobileLandscape}
												scrollbarOffsetRight={-7}
												containerClassName="search-results-table h-[571px] rounded-[8px] border-[#143883] md:w-[1004px] border-[3px]"
												tableClassName="w-[calc(100%-12px)] mx-auto border-separate border-spacing-y-[6px]"
												headerClassName="[&_tr]:border-[#737373]"
												theadCellClassName="border-[#737373] font-secondary text-[14px] font-medium"
												rowClassName="border-[#737373] row-hover-scroll bg-white odd:bg-white even:bg-white rounded-[8px] [&>td:first-child]:rounded-l-[8px] [&>td:last-child]:rounded-r-[8px] [&>td]:border-y-2 [&>td:first-child]:border-l-2 [&>td:last-child]:border-r-2 border-none !h-[58px] min-h-[58px] [&>td]:!h-[58px] [&>td]:!py-0"
												stickyHeaderClassName="bg-[#AFD6EF]"
												hidePagination
												onRowHover={
													isMobile ? undefined : (row) => setHoveredContact(row)
												}
												headerAction={
													!isMobile ? (
														<button
															type="button"
															onClick={handleCreateCampaign}
															disabled={selectedContacts.length === 0}
															className="font-secondary"
															style={{
																width: '127px',
																height: '31px',
																background:
																	selectedContacts.length === 0
																		? 'rgba(93, 171, 104, 0.1)'
																		: '#B8E4BE',
																border: '2px solid #000000',
																color:
																	selectedContacts.length === 0
																		? 'rgba(0, 0, 0, 0.4)'
																		: '#000000',
																fontSize: '13px',
																fontWeight: 500,
																borderRadius: '8px',
																lineHeight: 'normal',
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																padding: '0',
																textAlign: 'center',
																whiteSpace: 'nowrap',
																cursor:
																	selectedContacts.length === 0 ? 'default' : 'pointer',
																opacity: selectedContacts.length === 0 ? 0.6 : 1,
															}}
														>
															Create Campaign
														</button>
													) : null
												}
												headerInlineAction={
													<button
														onClick={handleSelectAll}
														className="text-[14px] font-secondary font-normal text-black hover:underline"
														type="button"
													>
														{isAllSelected ? 'Deselect All' : 'Select all'}
													</button>
												}
											/>
										</CardContent>
									</Card>
									{/* Desktop button (non-sticky) */}
									{!isMobile && (
										<div className="flex items-center justify-center w-full">
											<Button
												isLoading={
													isPendingCreateCampaign || isPendingBatchUpdateContacts
												}
												variant="primary-light"
												bold
												className="relative w-[984px] h-[39px] mx-auto mt-5 !bg-[#5DAB68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] overflow-hidden"
												onClick={() => {
													if (selectedContacts.length === 0) return;
													handleCreateCampaign();
												}}
											>
												<span className="relative z-20">Add to Campaign</span>
												<div
													className="absolute inset-y-0 right-0 w-[65px] z-20 flex items-center justify-center bg-[#74D178] cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														handleSelectAll();
													}}
												>
													<span className="text-black text-[14px] font-medium">All</span>
												</div>
												<span
													aria-hidden="true"
													className="pointer-events-none absolute inset-y-0 right-[65px] w-[2px] bg-[#349A37] z-10"
												/>
											</Button>
										</div>
									)}

									{/* Mobile sticky button at bottom */}
									{isMobile &&
										typeof window !== 'undefined' &&
										createPortal(
											<div className="mobile-sticky-cta">
												<Button
													onClick={handleCreateCampaign}
													isLoading={
														isPendingCreateCampaign || isPendingBatchUpdateContacts
													}
													variant="primary-light"
													bold
													className="w-full h-[54px] min-h-[54px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] transition-colors !opacity-100 disabled:!opacity-100"
													disabled={selectedContacts.length === 0}
												>
													Add to Campaign
												</Button>
											</div>,
											document.body
										)}
								</div>
							</div>
						) : hasSearched &&
						  (contacts === undefined ||
								(Array.isArray(contacts) && contacts.length === 0)) ? (
							<div className="mt-10 w-full px-4">
								<Card className="w-full max-w-full mx-auto">
									<CardContent className="py-8">
										<div className="text-center">
											<Typography variant="h3" className="mb-2">
												No Results Found
											</Typography>
											<Typography className="text-gray-600">
												No contacts match your search criteria. Try a different search
												term.
											</Typography>
										</div>
									</CardContent>
								</Card>
							</div>
						) : null}
					</>
				)}

				{!hasSearched && (
					<div className="campaigns-table-wrapper w-full max-w-[960px] mx-auto px-4">
						<CampaignsTable />
					</div>
				)}
			</div>
		</AppLayout>
	);
};

export default Dashboard;
