'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import EmailAutomationSteps from './emailAutomation/EmailAutomationSteps';
import { useCampaignDetail } from './useCampaignDetail';
import Spinner from '@/components/ui/spinner';
import PageHeading from '@/components/atoms/_text/PageHeading';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';

const Murmur = () => {
	const { tab, handleTabChange, data, isPending } = useCampaignDetail();

	if (isPending || !data) {
		return <Spinner />;
	}
	return (
		<AppLayout>
			<PageHeading>{data?.name}</PageHeading>
			<Tabs
				defaultValue="murmur"
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsContent value="murmur">
					<EmailAutomationSteps campaign={data} />
				</TabsContent>
				<TabsContent value="inbox"></TabsContent>
			</Tabs>
		</AppLayout>
	);
};

export default Murmur;
