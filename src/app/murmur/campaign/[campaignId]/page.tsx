'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Typography } from '@/components/ui/typography';
import { DraftingSection } from './DraftingSection/DraftingSection';
import { SentEmailsTable } from '@/components/organisms/_tables/SentEmailsTable/SentEmailsTable';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { NoMobilePage } from '@/components/atoms/NoMobilePage/NoMobilePage';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

const Murmur = () => {
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();
	const isMobile = useIsMobile();

	const searchParams = useSearchParams();
	const silentLoad = searchParams.get('silent') === '1';

	if (isPendingCampaign || !campaign) {
		return silentLoad ? null : <Spinner />;
	}

	if (isMobile === null) {
		return null;
	}

	// Hide underlying content and show a white overlay when we require the user to set up an identity
	// or while the full-screen User Settings dialog is open. This prevents any visual "glimpses" and
	// ensures a premium, smooth transition with no scale effects.
	const shouldHideContent = isIdentityDialogOpen || !campaign.identityId;
	return (
		<AppLayout paddingTop="none">
			<NoMobilePage />
			{shouldHideContent && <div className="fixed inset-0 bg-background z-40" />}
			{!isMobile && (
				<div
					className={cn(
						'transition-opacity duration-200',
						shouldHideContent
							? 'opacity-0 pointer-events-none select-none'
							: 'opacity-100'
					)}
					style={{
						WebkitTransition: 'opacity 0.2s',
						transition: 'opacity 0.2s',
					}}
				>
					<div className="flex justify-center mt-1">
						<CampaignName campaign={campaign} />
					</div>
					<div className="flex justify-center mt-0.5">
						<div className="flex flex-col gap-2 w-[400px]">
							<div className="flex items-center">
								<Link href={urls.murmur.dashboard.index} className="block">
									<div className="w-[52px] h-[20.5px] bg-[#EEEEEE] rounded-[8px] flex items-center justify-start pl-1">
										<span className="font-inter font-normal text-[17px] leading-none text-black">
											To
										</span>
									</div>
								</Link>
								<Typography className="ml-2 !text-[15px] text-gray-600 font-secondary">
									{campaign?.userContactLists?.map((list) => list.name).join(', ') ||
										'No recipients selected'}
								</Typography>
							</div>

							<div className="flex items-center">
								<button
									type="button"
									onClick={() => setIsIdentityDialogOpen(true)}
									className="w-[52px] h-[20.5px] bg-[#EEEEEE] rounded-[8px] flex items-center justify-start pl-1 cursor-pointer"
								>
									<span className="font-inter font-normal text-[17px] leading-none text-black">
										From
									</span>
								</button>
								<Typography
									className="ml-2 !text-[15px] text-gray-600 font-secondary hover:underline"
									onClick={() => setIsIdentityDialogOpen(true)}
								>
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
				</div>
			)}
		</AppLayout>
	);
};

export default Murmur;
