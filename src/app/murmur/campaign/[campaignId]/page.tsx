'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { DraftingSection } from './emailAutomation/draft/DraftingSection';
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
				<div className="flex justify-center mt-4">
					<div className="flex flex-col gap-4 w-[400px]">
						<div className="flex items-center">
							<Typography
								variant="h3"
								className="text-lg font-semibold w-[60px] text-gray-600"
								style={{ fontFamily: 'Inter' }}
							>
								To:
							</Typography>
							<Typography className="ml-2 !text-[15px] text-gray-600" style={{ fontFamily: 'Inter', fontWeight: 'normal' }}>
								{campaign?.userContactLists?.map(list => list.name).join(', ') || 'No recipients selected'}
							</Typography>
							<Button 
								variant="action-link" 
								className="ml-2"
								onClick={() => setIsContactListDialogOpen(true)}
							>
								Change
							</Button>
						</div>

						<div className="flex items-center">
							<Typography
								variant="h3"
								className="text-lg font-semibold w-[60px] text-gray-600"
								style={{ fontFamily: 'Inter' }}
							>
								From:
							</Typography>
							<Typography className="ml-2 !text-[15px] text-gray-600" style={{ fontFamily: 'Inter', fontWeight: 'normal' }}>
								{campaign?.identity?.name}
							</Typography>
							<Button 
								variant="action-link" 
								className="ml-2"
								onClick={() => setIsIdentityDialogOpen(true)}
							>
								Change
							</Button>
						</div>
					</div>
				</div>
				
				<ManageCampaignContactListDialog
					campaign={campaign}
					open={isContactListDialogOpen}
					onOpenChange={setIsContactListDialogOpen}
				/>

				<IdentityDialog
					campaign={campaign}
					title="User Settings"
					open={isIdentityDialogOpen}
					onOpenChange={setIsIdentityDialogOpen}
				/>

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
