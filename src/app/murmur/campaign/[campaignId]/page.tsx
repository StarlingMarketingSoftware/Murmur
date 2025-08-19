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
import { PrepareSendingSection } from '@/components/organisms/_tables/PrepareSendingSection/PrepareSendingSection';
import { SentEmailsTable } from '@/components/organisms/_tables/SentEmailsTable/SentEmailsTable';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { ManageCampaignContactListDialog } from '@/components/organisms/_dialogs/ManageCampaignContactListDialog/ManageCampaignContactListDialog';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NoMobilePage } from '@/components/atoms/NoMobilePage/NoMobilePage';

const Murmur = () => {
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();

	const [isContactListDialogOpen, setIsContactListDialogOpen] = useState(false);
	const searchParams = useSearchParams();
	const silentLoad = searchParams.get('silent') === '1';

	if (isPendingCampaign || !campaign) {
		return silentLoad ? null : <Spinner />;
	}

	// Hide underlying content and show a white overlay when we require the user to set up an identity
	// or while the full-screen User Settings dialog is open. This prevents any visual "glimpses" and
	// ensures a premium, smooth transition with no scale effects.
	const shouldHideContent = isIdentityDialogOpen || !campaign.identityId;
	return (
		<AppLayout>
			<NoMobilePage />
			{shouldHideContent && (
				<div className="fixed inset-0 bg-white z-40" />
			)}
			<div className={`hidden lg:block transition-opacity duration-200 ${shouldHideContent ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}>
				<CampaignName campaign={campaign} />
				<Card className="mt-20 border-border !border-2">
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
									<ManageCampaignContactListDialog
										campaign={campaign}
										open={isContactListDialogOpen}
										onOpenChange={setIsContactListDialogOpen}
									/>
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
				<PrepareSendingSection campaign={campaign} />
				<SentEmailsTable campaign={campaign} />
				<Link href={urls.murmur.dashboard.index}>
					<Button className="w-full font-bold mt-8" size="lg" variant="light">
						Back to Dashboard
					</Button>
				</Link>
			</div>
		</AppLayout>
	);
};

export default Murmur;
