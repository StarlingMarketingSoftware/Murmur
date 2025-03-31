'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import EmailAutomationSteps from './_components/emailAutomation/EmailAutomationSteps';
import { useCampaignDetail } from './useCampaignDetail';
import { useAppSelector } from '@/lib/redux/hooks';
import { TypographyH2 } from '@/components/ui/typography';
import PageHeading from '@/components/text/PageHeading';

const Murmur = () => {
	const { tab, handleTabChange } = useCampaignDetail();
	const campaignName = useAppSelector((state) => state.murmur.campaignName);
	return (
		<div className="max-w-[900px] mx-auto">
			<PageHeading>{campaignName}</PageHeading>
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
					<EmailAutomationSteps />
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
