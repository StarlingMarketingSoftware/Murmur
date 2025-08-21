'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { Button } from '@/components/ui/button';
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
		<AppLayout paddingTop="none">
			<NoMobilePage />
			{shouldHideContent && <div className="fixed inset-0 bg-white z-40" />}
			<div
				className={`hidden lg:block transition-opacity duration-200 ${
					shouldHideContent ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'
				}`}
				style={{
					WebkitTransition: 'opacity 0.2s',
					transition: 'opacity 0.2s',
				}}
			>
				<div className="flex justify-center">
					<CampaignName campaign={campaign} />
				</div>
				<div className="w-[1165px] mx-auto flex items-start gap-[47px] mt-4">
					<div className="w-[559px] flex flex-col">
						<Typography
							variant="h3"
							className="text-lg font-semibold font-secondary mb-2"
						>
							To:
						</Typography>
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
						<div className="mt-1">
							<ManageCampaignContactListDialog
								campaign={campaign}
								open={isContactListDialogOpen}
								onOpenChange={setIsContactListDialogOpen}
							/>
						</div>
					</div>

					<div className="w-[559px]">
						<Typography
							variant="h3"
							className="text-lg font-semibold font-secondary mb-2"
						>
							From:
						</Typography>
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
						<IdentityDialog
							triggerButton={
								<Button variant="action-link" className="mt-1">
									Change
								</Button>
							}
							campaign={campaign}
							title="User Settings"
							open={isIdentityDialogOpen}
							onOpenChange={setIsIdentityDialogOpen}
						/>
					</div>
				</div>

				<div className="mt-6 flex justify-center">
					<DraftingSection campaign={campaign} />
				</div>
				<div className="flex justify-center">
					<PrepareSendingSection campaign={campaign} />
				</div>
				<div className="flex justify-center">
					<SentEmailsTable campaign={campaign} />
				</div>
				<div className="flex justify-center mt-8">
					<Link href={urls.murmur.dashboard.index}>
						<Button className="font-bold px-8" size="lg" variant="light">
							Back to Dashboard
						</Button>
					</Link>
				</div>
			</div>
		</AppLayout>
	);
};

export default Murmur;
