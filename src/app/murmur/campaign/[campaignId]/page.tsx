'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { DraftingSection } from './DraftingSection/DraftingSection';
import { SentEmailsTable } from '@/components/organisms/_tables/SentEmailsTable/SentEmailsTable';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { NoMobilePage } from '@/components/atoms/NoMobilePage/NoMobilePage';
import { cn } from '@/utils';

const Murmur = () => {
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();

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
			{shouldHideContent && <div className="fixed inset-0 bg-background z-40" />}
			<div
				className={cn(
					'hidden lg:block transition-opacity duration-200',
					shouldHideContent ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'
				)}
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
								className="text-lg font-semibold w-[60px] text-gray-600 font-secondary"
							>
								To:
							</Typography>
							<Typography className="ml-2 !text-[15px] text-gray-600 font-secondary">
								{campaign?.userContactLists?.map((list) => list.name).join(', ') ||
									'No recipients selected'}
							</Typography>
						</div>

						<div
							className="flex items-center cursor-pointer select-none"
							onClick={() => setIsIdentityDialogOpen(true)}
						>
							<Typography
								variant="h3"
								className="text-lg font-semibold w-[60px] text-gray-600 font-secondary"
							>
								From:
							</Typography>
							<Typography className="ml-2 !text-[15px] text-gray-600 font-secondary hover:underline">
								{campaign?.identity?.name}
							</Typography>
						</div>
					</div>
				</div>

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
