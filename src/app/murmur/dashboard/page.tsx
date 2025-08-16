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
import { Checkbox } from '@/components/ui/checkbox';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import ConsoleLoader from '@/components/ui/console-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ContactTSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactTSVUploadDialog';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';

const Dashboard = () => {
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
		isError,
		error,
		hasSearched,
		handleResetSearch,
	} = useDashboard();
	return (
		<AppLayout>
			<div className={`dashboard-container ${hasSearched ? 'search-active' : ''}`}>
				<div className="hero-wrapper">
					<div className="mt-4 flex justify-center">
						<div className="premium-hero-section text-center" style={{ width: '470px', height: '286px', overflow: 'hidden' }}>
							<div className="premium-logo-container inline-block">
								<LogoIcon width="106px" height="84px" />
							</div>
							<Typography variant="h1" className="text-center mt-2 !text-[80px] leading-[0.8] premium-gradient-text" data-text="Murmur">
								Murmur
							</Typography>
							<Typography
								font="secondary"
								className="mt-12 text-[19px] text-center premium-subtitle-gradient"
								color="light"
							>
								Let&apos;s <strong className="premium-accent">start</strong> by creating a campaign.
							</Typography>
							<Typography
								font="secondary"
								className="mt-6 text-[19px] text-center premium-subtitle-gradient"
								color="light"
							>
								Who do you want to contact?
							</Typography>
						</div>
					</div>
				</div>

			<div
				className={`search-bar-wrapper ${hasSearched ? 'search-bar-active' : ''}`}
			>
				<div className="search-bar-inner">
					{hasSearched && activeSearchQuery && (
						<div className="search-context-label">
							<span className="search-query-text">{activeSearchQuery}</span>
						</div>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className={hasSearched ? 'search-form-active' : ''}>
						<FormField
							control={form.control}
							name="searchText"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div className={`search-input-group ${hasSearched ? 'search-input-group-active' : ''}`}>
											<div className={`search-wave-container ${isLoadingContacts || isRefetchingContacts ? 'search-wave-loading' : ''}`}>
												<Input
													className="search-wave-input !border-2 !border-black !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent"
													placeholder='Who do you want to send to?  i.e  "Music venues in North Carolina"'
													style={{ accentColor: 'transparent' }}
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
							<div className="flex flex-col md:flex-row gap-0 md:gap-4 items-center justify-between">
								<div className="flex flex-row gap-4 items-center">
									<FormField
										control={form.control}
										name="excludeUsedContacts"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel className="text-sm font-medium cursor-pointer">
														Exclude Used Contacts
													</FormLabel>
												</div>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="exactMatchesOnly"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel className="text-sm font-medium cursor-pointer">
														Exact Matches Only
													</FormLabel>
												</div>
											</FormItem>
										)}
									/>
								</div>
								<div className="flex items-center justify-end" style={{ width: '368px' }}>
									<div className="flex-1">
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
									</div>

									<div className="flex-1 flex justify-end">
										<Button
											variant="primary-light"
											type="submit"
											bold
											className="!w-[174px] !h-[39px] !text-[16px] !font-bold !rounded-[7px] gradient-button gradient-button-green"
											isLoading={isLoadingContacts || isRefetchingContacts}
										>
											Generate
										</Button>
									</div>
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
						<div className="mt-10">
							<Card className="max-w-[1174px] mx-auto">
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
					) : (isLoadingContacts || isRefetchingContacts) ? (
						<div className="mt-10 max-w-[1174px] mx-auto py-8">
							<ConsoleLoader searchQuery={activeSearchQuery} />
						</div>
					) : contacts && contacts.length > 0 ? (
						<>
							<Card className="border-0 shadow-none">
								<CardContent>
									<CustomTable
										initialSelectAll
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
									/>
								</CardContent>
							</Card>
							<div className="flex items-center">
								<Button
									onClick={handleCreateCampaign}
									isLoading={isPendingCreateCampaign || isPendingBatchUpdateContacts}
									variant="primary-light"
									bold
									className="w-8/10 mx-auto mt-5"
									disabled={selectedContacts.length === 0}
								>
									Create Campaign
								</Button>
							</div>
						</>
					) : hasSearched && (contacts === undefined || (Array.isArray(contacts) && contacts.length === 0)) ? (
						<div className="mt-10">
							<Card className="max-w-[1174px] mx-auto">
								<CardContent className="py-8">
									<div className="text-center">
										<Typography variant="h3" className="mb-2">
											No Results Found
										</Typography>
										<Typography className="text-gray-600">
											No contacts match your search criteria. Try a different search term.
										</Typography>
									</div>
								</CardContent>
							</Card>
						</div>
					) : null}
				</>
			)}

			<div className="mt-76">
				<CampaignsTable />
			</div>
			</div>
		</AppLayout>
	);
};

export default Dashboard;
