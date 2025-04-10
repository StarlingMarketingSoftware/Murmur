'use client';

import { Card } from '@/components/ui/card';
import { CreateCampaignDialog } from './CreateCampaignDialog/CreateCampaignDialog';
import PageHeading from '@/components/text/PageHeading';
import MutedSubtext from '@/components/text/MutedSubtext';
import { CampaignsTable } from './CampaignsTable/CampaignsTable';

const Dashboard = () => {
	return (
		<div className="mt-0 mx-auto w-[900px]">
			<Card className="">
				<PageHeading>Welcome to Murmur</PageHeading>
				<MutedSubtext>{`Let's start by creating a campaign.`}</MutedSubtext>
				<CreateCampaignDialog />
			</Card>
			<CampaignsTable />
		</div>
	);
};

export default Dashboard;
