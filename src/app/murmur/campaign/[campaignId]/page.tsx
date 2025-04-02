'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import EmailAutomationSteps from './_components/emailAutomation/EmailAutomationSteps';
import { useCampaignDetail } from './useCampaignDetail';
import PageHeading from '@/components/text/PageHeading';
import Spinner from '@/components/ui/spinner';

const Murmur = () => {
	const { tab, handleTabChange, data, isPending } = useCampaignDetail();

	if (isPending) {
		return <Spinner />;
	}
	return (
		<div className="max-w-[900px] mx-auto">
			<PageHeading>{data?.name}</PageHeading>
			<Tabs
				defaultValue="murmur"
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				{/* <TabsList className="grid grid-cols-2 mx-auto">
					<TabsTrigger value="murmur">Murmur</TabsTrigger>
					<TabsTrigger value="inbox">Inbox</TabsTrigger>
				</TabsList> */}
				<TabsContent value="murmur">
					<EmailAutomationSteps campaign={data} />
				</TabsContent>
				<TabsContent value="inbox">
					{/* <Card>
						<Inbox />
					</Card> */}
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Murmur;
