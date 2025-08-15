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
	} = useDashboard();
	return (
		<AppLayout>
			<div className="mt-32">
				<LogoIcon width="106px" height="84px" />
				<Typography variant="h1" className="text-center mt-3 !text-[80px] leading-[0.8]">
					Murmur
				</Typography>
				<Typography
					font="secondary"
					className="mt-18 text-[19px] text-center"
					color="light"
				>
					Let&apos;s <strong>start</strong> by creating a campaign.
				</Typography>
				<Typography
					font="secondary"
					className="mt-7 text-[19px] text-center"
					color="light"
				>
					Who do you want to contact?
				</Typography>
			</div>

			<div className="mt-12 max-w-[1174px] mx-auto">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="searchText"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div className={`search-wave-container ${isLoadingContacts || isRefetchingContacts ? 'search-wave-loading' : ''}`}>
											<Input
												className="search-wave-input !border-none"
												placeholder='Who do you want to send to?  i.e  "Music venues in North Carolina"'
												{...field}
											/>
											<div className="search-wave-overlay" />
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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
							<div className="flex items-center justify-end gap-2">
								{isFreeTrial ? (
									<UpgradeSubscriptionDrawer
										message="Importing contacts is only available on paid plans. Please upgrade your plan to proceed."
										triggerButtonText="Import"
										buttonVariant="light"
									/>
								) : (
									<ContactTSVUploadDialog
										isAdmin={false}
										triggerText="Import"
										buttonVariant="light"
									/>
								)}

								<Button
									variant="primary-light"
									type="submit"
									bold
									className="px-10 md:px-20 gradient-button gradient-button-green"
									isLoading={isLoadingContacts || isRefetchingContacts}
								>
									Generate
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</div>

			{activeSearchQuery && (
				<>
					{contacts ? (
						<>
							<Card>
								<CardHeader>
									<CardTitle>Contacts</CardTitle>
								</CardHeader>
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
					) : (
						<div className="mt-10">
							<div className="max-w-[1174px] mx-auto">
								{/* Subtle container that echoes Card design but lighter */}
								<div className="relative">
									{/* Ultra-subtle top border to anchor the space */}
									<div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-gray-200/50 to-transparent" />
									
									<ConsoleLoader searchQuery={activeSearchQuery} />
									
									{/* Bottom fade to transition to campaigns table */}
									<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
								</div>
							</div>
						</div>
					)}
				</>
			)}

			<div className="mt-76">
				<CampaignsTable />
			</div>
		</AppLayout>
	);
};

export default Dashboard;
