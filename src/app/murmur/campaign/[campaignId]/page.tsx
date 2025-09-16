'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { IdentityDialog } from '@/components/organisms/_dialogs/IdentityDialog/IdentityDialog';
import { CampaignName } from '@/components/organisms/CampaignName/CampaignName';
import { Typography } from '@/components/ui/typography';
import { DraftingSection } from './DraftingSection/DraftingSection';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { NoMobilePage } from '@/components/atoms/NoMobilePage/NoMobilePage';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useState } from 'react';

const Murmur = () => {
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();
	const isMobile = useIsMobile();

	const searchParams = useSearchParams();
	const silentLoad = searchParams.get('silent') === '1';
	const [identityDialogOrigin, setIdentityDialogOrigin] = useState<'campaign' | 'search'>(
		silentLoad ? 'search' : 'campaign'
	);
	const [isIdentityInfoOpen, setIsIdentityInfoOpen] = useState(false);

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
		<>
			<div className="max-w-[1250px] w-9/10 mx-auto lg:w-9/10">
				<div
					className={cn(
						'transition-opacity duration-200',
						shouldHideContent
							? 'opacity-0 pointer-events-none select-none'
							: 'opacity-100'
					)}
				>
					<div className="flex justify-center mt-1">
						<CampaignName campaign={campaign} />
					</div>
					<div className="flex justify-center mt-0.5">
						<div className="flex items-start gap-6">
							<div className="flex items-center">
								<Link href={urls.murmur.dashboard.index} className="block">
									<div className="w-[52px] h-[20.5px] bg-[#EEEEEE] rounded-[8px] flex items-center justify-start pl-1 transition-colors group hover:bg-[#696969]">
										<span className="font-inter font-normal text-[17px] leading-none text-black transition-colors group-hover:text-white">
											To
										</span>
									</div>
								</Link>
								<Typography className="ml-2 !text-[15px] text-gray-600 font-secondary">
									{campaign?.userContactLists?.map((list) => list.name).join(', ') ||
										'No recipients selected'}
								</Typography>
							</div>

							<div className="flex items-start">
								<button
									type="button"
									onClick={() => {
										setIdentityDialogOrigin('campaign');
										setIsIdentityDialogOpen(true);
									}}
									className="w-[52px] h-[20.5px] bg-[#EEEEEE] rounded-[8px] flex items-center justify-start pl-1 cursor-pointer transition-colors group hover:bg-[#696969]"
								>
									<span className="font-inter font-normal text-[17px] leading-none text-black transition-colors group-hover:text-white">
										From
									</span>
								</button>
								<div className="ml-2 flex flex-col items-start">
									<button
										type="button"
										className="!text-[15px] text-gray-600 font-secondary hover:underline cursor-pointer text-left"
										onClick={() => setIsIdentityInfoOpen((open) => !open)}
										aria-expanded={isIdentityInfoOpen}
									>
										{campaign?.identity?.name}
									</button>
									{isIdentityInfoOpen && (
										<div className="mt-1 text-left">
											{campaign?.identity?.email && (
												<div className="!text-[15px] text-gray-600 font-secondary">
													{campaign.identity.email}
												</div>
											)}
											{campaign?.identity?.website && (
												<a
													href={
														(campaign.identity.website || '').startsWith('http')
															? campaign.identity.website
															: `https://${campaign.identity.website}`
													}
													target="_blank"
													rel="noopener noreferrer"
													className="!text-[15px] text-gray-600 font-secondary hover:underline break-all"
												>
													{campaign.identity.website}
												</a>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="w-full h-[2px] bg-black mt-4" />

			<AppLayout paddingTop="none">
				<NoMobilePage />
				{shouldHideContent && <div className="fixed inset-0 bg-background z-40" />}
				{!isMobile && (
					<>
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
							<IdentityDialog
								campaign={campaign}
								title="User Settings"
								open={isIdentityDialogOpen}
								onOpenChange={setIsIdentityDialogOpen}
								backButtonText={
									identityDialogOrigin === 'search'
										? 'Back to Search Results'
										: 'Back to Campaign'
								}
							/>

							<div className="mt-6 flex justify-center">
								<DraftingSection campaign={campaign} />
							</div>
						</div>
					</>
				)}
			</AppLayout>
		</>
	);
};

export default Murmur;
