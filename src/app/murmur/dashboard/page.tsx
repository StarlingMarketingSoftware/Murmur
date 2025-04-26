'use client';

import { Card } from '@/components/ui/card';
import { CreateCampaignDialog } from '../../../components/organisms/_dialogs/CreateCampaignDialog/CreateCampaignDialog';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';

import { useDashboard } from './useDashboard';
import PageHeading from '@/components/atoms/_text/PageHeading';
import MutedSubtext from '@/components/atoms/_text/MutedSubtext';

const Dashboard = () => {
	useDashboard();
	// const { isLoaded, isSignedIn } = useDashboard();

	// if (!isLoaded || !isSignedIn) {
	// 	return <Spinner />;
	// }

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
