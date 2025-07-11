'use client';

import { useCampaignDetail } from './useCampaignDetail';
import Spinner from '@/components/ui/spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DraftingSection } from './emailAutomation/draft/DraftingSection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Murmur = () => {
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();

	if (isPendingCampaign || !campaign) {
		return <Spinner />;
	}
	return (
		<AppLayout>
			<CampaignName campaign={campaign} />
			<Card className="mt-38 border-border !border-2">
				<CardContent>
					<div className="flex gap-24">
						<div className="">
							<div className="flex gap-8 mb-6 items-center">
								<Typography variant="h2" className="">
									User Settings
								</Typography>
								<IdentityDialog
									triggerButton={<Button variant="action-link">Change</Button>}
									campaign={campaign}
									title="User Settings"
									open={isIdentityDialogOpen}
									onOpenChange={setIsIdentityDialogOpen}
								/>
							</div>
							<Typography className="font-bold !text-[15px]">
								{campaign?.identity?.name}
							</Typography>
							<Typography className="font-bold font-secondary !text-[13px]">
								{campaign?.identity?.email}
							</Typography>
							<Typography
								className={twMerge(
									'font-secondary !text-[13px]',
									!campaign?.identity?.website && '!text-muted italic'
								)}
							>
								{campaign?.identity?.website || 'No website'}
							</Typography>
						</div>

						<div className="flex flex-col">
							<div className="flex gap-8 mb-6 items-center">
								<Typography variant="h2">Lists Selected</Typography>
								<Button variant="action-link">Change</Button>
							</div>
							{campaign?.userContactLists?.map((contactList) => (
								<Typography key={contactList.id} className="font-bold !text-[15px]">
									{contactList?.name}
								</Typography>
							))}
							{campaign?.userContactLists.length === 0 && (
								<Alert variant="warning" className="max-w-72">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>No Recipients</AlertTitle>
									<AlertDescription>
										You have not selected any recipients for this campaign.
									</AlertDescription>
								</Alert>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<Typography
				variant="p"
				font="secondary"
				className="mt-13 text-[19px] text-center"
				color="light"
			>
				What do you want to say?
			</Typography>

			<Typography variant="h2" className="mt-13">
				Drafting
			</Typography>
			<Separator className="!w-1/2" />
			<DraftingSection campaign={campaign} />
		</AppLayout>
	);
};

export default Murmur;
