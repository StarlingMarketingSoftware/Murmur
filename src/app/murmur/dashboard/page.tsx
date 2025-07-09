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
	FormMessage,
} from '@/components/ui/form';
import ContactListTable from '@/components/organisms/_tables/ContactListTable/ContactListTable';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';
import Spinner from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
		tabOptions,
		currentTab,
		setCurrentTab,
		setSelectedContactListRows,
		tableRef,
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

			<BlockTabs
				className="mt-12 text-center"
				options={tabOptions}
				activeValue={currentTab}
				onValueChange={(val) => setCurrentTab(val)}
			/>

			{currentTab === 'search' && (
				<>
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
													placeholder="Who do you want to send to?  i.e  “Wedding Planners in North Carolina”"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="flex items-center justify-end gap-2">
									<Button variant="light" className="">
										Import
									</Button>
									<Button
										variant="primary-light"
										type="submit"
										className=""
										isLoading={isLoadingContacts || isRefetchingContacts}
									>
										Search
									</Button>
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
								<Card>
									<CardHeader>
										<CardTitle>Contacts</CardTitle>
									</CardHeader>
									<CardContent>
										<CustomTable
											isSelectable
											setSelectedRows={setSelectedContacts}
											data={[...contacts, ...apolloContacts]}
											columns={columns}
											searchable={false}
											tableRef={tableRef}
										/>
									</CardContent>
								</Card>
							) : (
								<Spinner />
							)}

							<div className="flex items-center">
								<Button
									onClick={handleCreateCampaign}
									isLoading={isPendingCreateCampaign}
									variant="primary-light"
									className="w-8/10 mx-auto mt-5"
								>
									Create Campaign
								</Button>
							</div>
						</>
					)}
				</>
			)}

			{currentTab === 'list' && (
				<>
					<ContactListTable setSelectedRows={setSelectedContactListRows} />
				</>
			)}

			{/* <CampaignsTable /> */}
		</AppLayout>
	);
};

export default Dashboard;
