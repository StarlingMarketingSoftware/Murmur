'use client';

import { Card } from '@/components/ui/card';
import { CreateCampaignDialog } from '../../../components/organisms/_dialogs/CreateCampaignDialog/CreateCampaignDialog';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';

import PageHeading from '@/components/atoms/_text/PageHeading';
import MutedSubtext from '@/components/atoms/_text/MutedSubtext';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';

const Dashboard = () => {
	return (
		<AppLayout>
			<Card>
				<PageHeading>Welcome to Murmur</PageHeading>
				<MutedSubtext>{`Let's start by creating a campaign.`}</MutedSubtext>
				<CreateCampaignDialog />
			</Card>
			<CampaignsTable />
		</AppLayout>
	);
};

export default Dashboard;
