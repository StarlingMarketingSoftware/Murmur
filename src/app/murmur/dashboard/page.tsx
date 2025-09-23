'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
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
	// Mobile-friendly sizing for hero logo and subtitle; desktop remains unchanged
	const logoWidth = isMobile ? '190px' : '300px';
	const logoHeight = isMobile ? '50px' : '79px';
	const subtitleFontSize = isMobile ? '11px' : '15px';
	const hasProblematicBrowser = isProblematicBrowser();
	const searchContainerRef = useRef<HTMLDivElement>(null);
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

	useEffect(() => {
		// Small delay to ensure DOM is ready
		const timer = setTimeout(() => {
			// Animate all overlays present (initial and results views)
			const overlays = Array.from(
				document.querySelectorAll('.search-wave-overlay')
			) as HTMLElement[];
			console.log('Found overlays:', overlays.length);
			if (overlays.length === 0) {
				console.log('No overlays found, trying again...');
				return;
			}

			const timelines: gsap.core.Tween[] = [];
			const enterHandlers: Array<() => void> = [];
			const leaveHandlers: Array<() => void> = [];

			overlays.forEach((overlay, index) => {
				console.log(`Animating overlay ${index}:`, overlay);
				// Make sure the overlay is visible
				gsap.set(overlay, {
					backgroundPosition: '100% 0',
					opacity: 1,
					visibility: 'visible',
				});
				const tl = gsap.to(overlay, {
					backgroundPosition: '-100% 0',
					duration: 3, // 3 second loop
					repeat: -1,
					ease: 'none',
					onStart: function () {
						console.log('Animation started for overlay', index);
					},
				});
				timelines.push(tl);

				const container = overlay.parentElement;
				const handleMouseEnter = () => gsap.to(tl, { timeScale: 2, duration: 0.3 });
				const handleMouseLeave = () => gsap.to(tl, { timeScale: 1, duration: 0.3 });
				if (container) {
					container.addEventListener('mouseenter', handleMouseEnter);
					container.addEventListener('mouseleave', handleMouseLeave);
					enterHandlers.push(handleMouseEnter);
					leaveHandlers.push(handleMouseLeave);
				} else {
					enterHandlers.push(() => {});
					leaveHandlers.push(() => {});
				}
			});

			// Store cleanup function
			(window as any).cleanupSearchAnimations = () => {
				overlays.forEach((overlay, i) => {
					const container = overlay.parentElement;
					if (container) {
						container.removeEventListener('mouseenter', enterHandlers[i]);
						container.removeEventListener('mouseleave', leaveHandlers[i]);
					}
				});
				timelines.forEach((tl) => tl.kill());
			};
		}, 100); // 100ms delay

		return () => {
			clearTimeout(timer);
			if ((window as any).cleanupSearchAnimations) {
				(window as any).cleanupSearchAnimations();
				delete (window as any).cleanupSearchAnimations;
			}
		};
	}, [hasSearched]);
	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return null;
	}

	return (
		<AppLayout>
			<div
				className={`relative min-h-screen transition-all duration-500 dashboard-main-offset pb-[100px] w-full max-w-full ${
					hasSearched ? 'search-active' : ''
				}`}
			>
				<div className="hero-wrapper flex flex-col justify-center items-center">
					<div className="w-full">
						<div
							className="flex justify-center items-center w-full px-4"
							style={{ marginBottom: '0.75rem', marginTop: isMobile ? '20px' : '0' }}
						>
							<div className="premium-hero-section flex flex-col items-center justify-center w-full max-w-[600px]">
								<div
									className="premium-logo-container flex items-center justify-center"
									style={{ width: logoWidth, height: logoHeight }}
								>
									<MurmurLogoNew width={logoWidth} height={logoHeight} />
								</div>
								<Typography
									font="secondary"
									className="mt-3 text-center premium-subtitle-gradient w-full"
									style={{ fontSize: subtitleFontSize, lineHeight: '1.3' }}
									color="light"
								>
									Let&apos;s <strong style={{ color: '#248531' }}>start</strong> by
									finding contacts.
								</Typography>
							</div>
						</div>

						<div
							className={`search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 ${
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
																className={`search-input-group ${
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
																		className="search-wave-input !border-2 !border-black !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent"
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
																	<div className="search-wave-overlay" />
																	<div
																		className="custom-placeholder"
																		aria-hidden="true"
																		style={{
																			opacity:
																				(field.value?.trim()?.length ?? 0) > 0 ? 0 : 1,
																		}}
																	>
																		<span className="custom-placeholder-bold">
																			Type who you want to contact, then click generate
																		</span>
																		<span> </span>
																		<span className="custom-placeholder-regular">
																			i.e.
																		</span>
																		<span> </span>
																		<span className="custom-placeholder-italic">
																			“Music Venues in North Carolina”
																		</span>
																	</div>
																</div>
															</div>
														</FormControl>
													</FormItem>
												)}
											/>
											{!hasSearched && (
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
													<div className="flex items-center justify-end flex-shrink-0 ml-auto">
														{isFreeTrial ? (
															<UpgradeSubscriptionDrawer
																message="Importing contacts is only available on paid plans. Please upgrade your plan to proceed."
																triggerButtonText="Import"
																buttonVariant="light"
																className="!w-[174px] !h-[39px] !text-[16px] !font-bold !rounded-[7px]"
															/>
														) : (
															<ContactTSVUploadDialog
																isAdmin={false}
																triggerText="Import"
																buttonVariant="light"
																className="!w-[174px] !h-[39px] !text-[16px] !font-bold !rounded-[7px]"
																fullScreen
															/>
														)}
														<div className="w-[19px]"></div>
														{!canSearch ? (
															<UpgradeSubscriptionDrawer
																message="Searching for contacts requires an active subscription or free trial. Please upgrade your plan to proceed."
																triggerButtonText="Generate"
																buttonVariant="primary-light"
																className="!w-[174px] !h-[39px] !text-[16px] !font-bold !rounded-[7px] gradient-button gradient-button-green"
															/>
														) : (
															<Button
																variant="primary-light"
																type="submit"
																bold
																className="!w-[174px] !h-[39px] !text-[16px] !font-bold !rounded-[7px] gradient-button gradient-button-green"
																isLoading={isLoadingContacts || isRefetchingContacts}
															>
																Generate
															</Button>
														)}
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
									onClick={handleResetSearch}
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
															<div className="search-wave-overlay" />
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
						{hoveredContact && (
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
							<div className="flex justify-center w-full px-4">
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
												useCustomScrollbar
												scrollbarOffsetRight={-5}
												containerClassName="search-results-table w-[1209px] h-[499px] rounded-[8px] border-[#737373]"
												tableClassName="w-full"
												headerClassName="[&_tr]:border-[#737373]"
												theadCellClassName="border-[#737373] font-secondary text-[14px] font-medium"
												rowClassName="border-[#737373] row-hover-scroll"
												hidePagination
												onRowHover={(row) => setHoveredContact(row)}
												headerAction={
													<button
														onClick={handleSelectAll}
														className="text-[14px] font-secondary font-normal text-black hover:underline"
														type="button"
													>
														{isAllSelected ? 'Deselect All' : 'Select all'}
													</button>
												}
												headerInlineAction={
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
												}
											/>
										</CardContent>
									</Card>
									<div className="flex items-center w-full">
										<Button
											onClick={handleCreateCampaign}
											isLoading={isPendingCreateCampaign || isPendingBatchUpdateContacts}
											variant="primary-light"
											bold
											className="w-full max-w-full h-[39px] mx-auto mt-5"
											disabled={selectedContacts.length === 0}
										>
											Create Campaign
										</Button>
									</div>
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
					<div className="campaigns-table-wrapper">
						<div className="absolute top-0 left-0 right-0 h-8 z-[5] pointer-events-none bg-gradient-to-b from-white to-transparent" />
						<CampaignsTable />
					</div>
				)}
			</div>
		</AppLayout>
	);
};

export default Dashboard;
