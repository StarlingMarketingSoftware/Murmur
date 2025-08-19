'use client';

import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { useDashboard } from './useDashboard';

import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import ConsoleLoader from '@/components/ui/console-loader';
import { Card, CardContent } from '@/components/ui/card';
import ContactTSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactTSVUploadDialog';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { useClerk, SignInButton } from '@clerk/nextjs';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAppComingSoon } from '@/components/molecules/MobileAppComingSoon/MobileAppComingSoon';

const Dashboard = () => {
	const { isSignedIn, openSignIn } = useClerk();
	const isMobile = useIsMobile();
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
		hoveredText,
	} = useDashboard();

	// Show mobile app coming soon page on mobile devices
	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return null;
	}

	if (isMobile) {
		return <MobileAppComingSoon />;
	}

	return (
		<AppLayout>
			<div className={`dashboard-container ${hasSearched ? 'search-active' : ''}`}>
				<div className="hero-wrapper">
					<div className="mt-4 flex justify-center w-full px-4">
						<div className="premium-hero-section text-center w-full max-w-[470px] h-[286px] overflow-hidden">
							<div className="premium-logo-container inline-block">
								<LogoIcon width="106px" height="84px" />
							</div>
							<Typography
								variant="h1"
								className="text-center mt-2 !text-[80px] leading-[0.8] premium-gradient-text"
								data-text="Murmur"
							>
								Murmur
							</Typography>
							<Typography
								font="secondary"
								className="mt-8 text-[19px] text-center premium-subtitle-gradient"
								color="light"
							>
								Let&apos;s <strong className="premium-accent">start</strong> by creating a
								campaign.
							</Typography>
							<Typography
								font="secondary"
								className="mt-4 text-[19px] text-center premium-subtitle-gradient"
								color="light"
							>
								Who do you want to contact?
							</Typography>
						</div>
					</div>
				</div>

				<div className={`search-bar-wrapper ${hasSearched ? 'search-bar-active' : ''}`}>
					<div className="search-bar-inner">
						{hasSearched && activeSearchQuery && (
							<div className="search-context-label">
								<span className="search-query-text">{activeSearchQuery}</span>
							</div>
						)}
						<Form {...form}>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!isSignedIn) {
										openSignIn();
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
															placeholder='Who do you want to send to?  i.e  "Music venues in North Carolina"'
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
													</div>
													{/* Buttons hidden during active search */}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{!hasSearched && (
									<div className="flex flex-row gap-4 items-center justify-between w-full flex-wrap">
										<div className="flex flex-row gap-4 items-center h-[39px] justify-start flex-shrink-0">
											<div
												className="exclude-contacts-box flex items-center"
												style={{
													backgroundColor: '#EFEFEF',
													width: '227px',
													height: '32px',
													borderRadius: '8px',
													display: 'flex',
													alignItems: 'center',
													paddingLeft: '16px',
													paddingRight: '16px',
													margin: 'auto 0',
												}}
											>
												<FormField
													control={form.control}
													name="excludeUsedContacts"
													render={({ field }) => (
														<FormItem className="flex flex-row items-center justify-between space-y-0 m-0 w-full gap-3">
															<div className="leading-none flex items-center">
																<FormLabel
																	className="font-bold cursor-pointer select-none whitespace-nowrap"
																	style={{ fontSize: '14px', lineHeight: '16px' }}
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
																		onChange={(e) => field.onChange(e.target.checked)}
																	/>
																	<div
																		className="peer-checked:after:translate-x-[10px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#050505] after:rounded-full after:h-[12px] after:w-[12px] after:transition-all"
																		style={{
																			width: '26px',
																			height: '16px',
																			backgroundColor: '#E5E5E5',
																			borderRadius: '9999px',
																			position: 'relative',
																			transition: 'background-color 0.2s',
																		}}
																	></div>
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
					</div>
				</div>

				{/* Elegant search query display with back button */}
				{hasSearched && activeSearchQuery && (
					<div className="search-query-display">
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

				{activeSearchQuery && (
					<>
						{isError ? (
							<div className="mt-10 w-full px-4">
								<Card className="w-full max-w-full mx-auto">
									<CardContent className="py-8">
										<div className="text-center">
											<Typography variant="h3" className="text-red-600 mb-2">
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
									<div className="select-prompt-container">
										<div className="select-prompt-text">
											Select who you want to contact
										</div>
										<div className="static-tooltip-container">
											{hoveredText && (
												<div className="static-tooltip-text">{hoveredText}</div>
											)}
										</div>
									</div>
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
												hidePagination
												headerAction={
													<button
														onClick={handleSelectAll}
														className="select-all-button"
														type="button"
													>
														{isAllSelected ? 'Unselect all' : 'Select all'}
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
					<div className="mt-32 campaigns-table-wrapper">
						<CampaignsTable />
					</div>
				)}
			</div>
		</AppLayout>
	);
};

export default Dashboard;
