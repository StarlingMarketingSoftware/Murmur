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
import Spinner from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ContactTSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactTSVUploadDialog';

const Dashboard = () => {
	const {
		apolloContacts,
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
										<Input
											className="!border-foreground"
											placeholder="Who do you want to send to?  i.e  “Wedding Planners in North Carolina”"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex flex-row gap-4 items-center justify-between">
							<div className="flex flex-row gap-4 items-center">
								<FormField
									control={form.control}
									name="location"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input
													className=""
													placeholder="Location (optional)"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

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
								<ContactTSVUploadDialog
									isPrivate
									triggerText="Import"
									buttonVariant="light"
								/>
								<Button
									variant="primary-light"
									type="submit"
									bold
									className="px-20"
									isLoading={isLoadingContacts || isRefetchingContacts}
								>
									Search
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</div>

			{activeSearchQuery && (
				<>
					{/* <div className="flex items-center justify-center mt-5">
								<Button
									onClick={handleImportApolloContacts}
									variant="light"
									className=""
									isLoading={isPendingImportApolloContacts}
								>
									Get More Contacts
								</Button>
							</div> */}
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
										data={[...contacts, ...apolloContacts]}
										columns={columns}
										searchable={false}
										tableRef={tableRef}
										rowsPerPage={100}
										displayRowsPerPage={false}
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
						<Spinner />
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
