'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { useDashboard } from './useDashboard';
import { urls } from '@/constants/urls';
import { isProblematicBrowser } from '@/utils/browserDetection';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import ConsoleLoader from '@/components/atoms/ConsoleLoader/ConsoleLoader';
import { Card, CardContent } from '@/components/ui/card';
import ContactTSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactTSVUploadDialog';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { useClerk } from '@clerk/nextjs';
import { useIsMobile } from '@/hooks/useIsMobile';

const Dashboard = () => {
	const { isSignedIn, openSignIn } = useClerk();
	const isMobile = useIsMobile();
	const [isMobileLandscape, setIsMobileLandscape] = useState(false);
	const [whyValue, setWhyValue] = useState('');
	const [whatValue, setWhatValue] = useState('');
	const [whereValue, setWhereValue] = useState('');
	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);

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
		isFreeTrial,
		canSearch,
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
		const combinedSearch = [whyValue, whatValue, whereValue].filter(Boolean).join(' ');
		if (combinedSearch) {
			form.setValue('searchText', combinedSearch);
		}
	}, [whyValue, whatValue, whereValue, form]);

	// Handle clicks outside to deactivate sections
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.search-sections-container')) {
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
																						placeholder="Search Destinations"
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
																						{whereValue || 'Search Destinations'}
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
																		<svg
																			width="26"
																			height="28"
																			viewBox="0 0 28 30"
																			fill="none"
																			xmlns="http://www.w3.org/2000/svg"
																		>
																			<path
																				d="M10.7681 16.6402L0.768066 28.6402M26.9998 10.5C26.9998 15.7467 22.5227 20 16.9998 20C11.477 20 6.99985 15.7467 6.99985 10.5C6.99985 5.25329 11.477 1 16.9998 1C22.5227 1 26.9998 5.25329 26.9998 10.5Z"
																				stroke="black"
																				strokeWidth="2"
																			/>
																		</svg>
																	</button>
																	{/* Mobile-only submit icon inside input */}
																	<button
																		type="submit"
																		className="search-input-icon-btn"
																		aria-label="Search"
																	>
																		<svg
																			width="17"
																			height="16"
																			viewBox="0 0 17 16"
																			fill="none"
																			xmlns="http://www.w3.org/2000/svg"
																			aria-hidden="true"
																		>
																			<path
																				d="M9.82227 0.848633C12.8952 0.848855 15.2988 3.17275 15.2988 5.93457C15.2988 8.69637 12.8952 11.0203 9.82227 11.0205C6.74914 11.0205 4.34475 8.69651 4.34473 5.93457C4.34473 3.17261 6.74912 0.848633 9.82227 0.848633Z"
																				stroke="#A0A0A0"
																				strokeWidth="1.56483"
																			/>
																			<line
																				x1="6.50289"
																				y1="9.18905"
																				x2="1.02598"
																				y2="15.4484"
																				stroke="#A0A0A0"
																				strokeWidth="1.56483"
																			/>
																		</svg>
																	</button>
																</div>
																{activeSection === 'why' && (
																	<div className="hidden md:flex flex-col items-center justify-center gap-[12px] absolute top-[calc(100%+10px)] left-[4px] w-[439px] h-[173px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[60]">
																		<div className="w-[410px] h-[68px] bg-white rounded-[12px] flex items-center px-[15px]">
																			<div className="w-[38px] h-[38px] bg-[#7AD47A] rounded-[8px] flex-shrink-0" />
																		</div>
																		<div className="w-[410px] h-[68px] bg-white rounded-[12px] flex items-center px-[15px]">
																			<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0" />
																		</div>
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
					<div className="results-search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 relative">
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
															className={`search-wave-container ${
																isLoadingContacts || isRefetchingContacts
																	? 'search-wave-loading'
																	: ''
															}`}
														>
															<button
																type="submit"
																className="results-search-icon-btn"
																aria-label="Search"
															>
																<svg
																	width="20"
																	height="21"
																	viewBox="0 0 20 21"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																	aria-hidden="true"
																>
																	<path
																		d="M12 1C15.9278 1 19 3.96996 19 7.5C19 11.03 15.9278 14 12 14C8.07223 14 5 11.03 5 7.5C5 3.96996 8.07223 1 12 1Z"
																		stroke="#A0A0A0"
																		strokeWidth="2"
																	/>
																	<line
																		x1="7.75258"
																		y1="11.6585"
																		x2="0.752577"
																		y2="19.6585"
																		stroke="#A0A0A0"
																		strokeWidth="2"
																	/>
																</svg>
															</button>
															<Input
																className={`search-wave-input results-search-input !border-2 !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-[#cfcfcf] ${
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
												scrollbarOffsetRight={-5}
												containerClassName="search-results-table h-[499px] rounded-[8px] border-[#737373] md:w-[1209px]"
												tableClassName="w-full"
												headerClassName="[&_tr]:border-[#737373]"
												theadCellClassName="border-[#737373] font-secondary text-[14px] font-medium"
												rowClassName="border-[#737373] row-hover-scroll"
												hidePagination
												onRowHover={
													isMobile ? undefined : (row) => setHoveredContact(row)
												}
												headerAction={
													!isMobile ? (
														<button
															onClick={handleSelectAll}
															className="text-[14px] font-secondary font-normal text-black hover:underline"
															type="button"
														>
															{isAllSelected ? 'Deselect All' : 'Select all'}
														</button>
													) : null
												}
												headerInlineAction={
													isMobile ? (
														<button
															onClick={handleSelectAll}
															className="text-[14px] font-secondary font-normal text-black hover:underline"
															type="button"
														>
															{isAllSelected ? 'Deselect All' : 'Select all'}
														</button>
													) : (
														<button
															type="button"
															onClick={handleCreateCampaign}
															disabled={selectedContacts.length === 0}
															className="font-secondary"
															style={{
																width: 'auto',
																height: '28px',
																background:
																	selectedContacts.length === 0
																		? 'rgba(93, 171, 104, 0.1)'
																		: 'rgba(93, 171, 104, 0.22)',
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
																padding: '0 12px',
																textAlign: 'center',
																cursor:
																	selectedContacts.length === 0 ? 'default' : 'pointer',
																opacity: selectedContacts.length === 0 ? 0.6 : 1,
															}}
														>
															Create Campaign
														</button>
													)
												}
											/>
										</CardContent>
									</Card>
									{/* Desktop button (non-sticky) */}
									{!isMobile && (
										<div className="flex items-center w-full">
											<Button
												onClick={handleCreateCampaign}
												isLoading={
													isPendingCreateCampaign || isPendingBatchUpdateContacts
												}
												variant="primary-light"
												bold
												className="w-full max-w-full h-[39px] mx-auto mt-5"
												disabled={selectedContacts.length === 0}
											>
												Create Campaign
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
													className="w-full h-[54px] min-h-[54px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#050505] transition-colors !opacity-100 disabled:!opacity-100"
													disabled={selectedContacts.length === 0}
												>
													Create Campaign
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
