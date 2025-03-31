'use client';

import { Card } from '@/components/ui/card';
import { CreateCampaignDialog } from './CreateCampaignDialog';
import PageHeading from '@/components/text/PageHeading';
import MutedSubtext from '@/components/text/MutedSubtext';

const Dashboard = () => {
	return (
		<Card className="w-[900px] mx-auto mt-10">
			<PageHeading>Welcome to Murmur</PageHeading>
			<MutedSubtext>{`Let's start by creating a campaign.`}</MutedSubtext>
			<CreateCampaignDialog />
		</Card>
	);
};

export default Dashboard;
