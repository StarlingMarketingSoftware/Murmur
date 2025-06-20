'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import EmailAutomationSteps from './emailAutomation/EmailAutomationSteps';
import { useCampaignDetail } from './useCampaignDetail';
import Spinner from '@/components/ui/spinner';
import PageHeading from '@/components/atoms/_text/PageHeading';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';

const Murmur = () => {
	const {
		tab,
		handleTabChange,
		campaign,
		isPendingCampaign,
		setIsIdentityDialogOpen,
		isIdentityDialogOpen,
	} = useCampaignDetail();

	if (isPendingCampaign || !campaign) {
		return <Spinner />;
	}
	return (
		<AppLayout>
			<IdentityDialog
				campaign={campaign}
				title="User Settings"
				open={isIdentityDialogOpen}
				onOpenChange={setIsIdentityDialogOpen}
			/>
			<PageHeading>{campaign?.name}</PageHeading>
			<Tabs
				defaultValue="murmur"
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsContent value="murmur">
					<EmailAutomationSteps campaign={campaign} />
				</TabsContent>
			</Tabs>
		</AppLayout>
	);
};

export default Murmur;
