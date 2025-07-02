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

const Dashboard = () => {
	const {
		form,
		onSubmit,
		isLoadingContacts,
		setSelectedRows,
		handleCreateCampaign,
		isPendingCreateCampaign,
		contacts,
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
					Let’s <strong>start</strong> by creating a campaign.
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
								isLoading={isLoadingContacts}
							>
								Search
							</Button>
						</div>
					</form>
				</Form>
			</div>
			{contacts && (
				<div className="mt-12 max-w-[1174px] mx-auto">
					<Typography variant="h2">Contacts</Typography>
					<Typography variant="h3">{contacts.length} contacts found</Typography>
					{contacts?.map((contact) => (
						<div key={contact.id} className="flex-row  w-full items-center gap-2">
							<Typography className="text-sm" font="secondary">
								{contact.name} | {contact.city} {contact.state} | {contact.company} |{' '}
								{contact.email} | {contact.headline} | {contact.title} | {contact.address}{' '}
								| {contact.website} | {contact.country} | {contact.linkedInUrl}
							</Typography>
						</div>
					))}
				</div>
			)}
			<ContactListTable setSelectedRows={setSelectedRows} />
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
			<CampaignsTable />
		</AppLayout>
	);
};

export default Dashboard;
