'use client';

import { useCampaignDetail } from './useCampaignDetail';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
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
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { useState } from 'react';

// Reuse dashboard metric colors for consistency
const getDraftFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v <= 6.25) return '#FFFBF3';
	if (v <= 12.5) return '#FFF7E7';
	if (v <= 18.75) return '#FFF3DB';
	if (v <= 25) return '#FFEFCE';
	if (v <= 31.25) return '#FFEBC2';
	if (v <= 37.5) return '#FFE7B6';
	return '#FFE3AA';
};

const getSentFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v > 1) return '#F3FCF1';
	return '#FFFFFF';
};

// Contacts tint — light red when there are contacts, otherwise white (keeps visual parity with dashboard-style metric boxes)
const getContactsFillColor = (value: number): string =>
	value > 0 ? '#FBEEEE' : '#FFFFFF';

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
	const [activeView, setActiveView] = useState<'testing' | 'drafting'>('testing');

	// Header counts
	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: headerContacts } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0,
	});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
	});

	const contactsCount = headerContacts?.length || 0;
	const draftCount = (headerEmails || []).filter(
		(e) => e.status === EmailStatus.draft
	).length;
	const sentCount = (headerEmails || []).filter(
		(e) => e.status === EmailStatus.sent
	).length;

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
			{/* Header section with white background */}
			<div className="bg-white">
				<div className="relative">
					<Link
						href={urls.murmur.dashboard.index}
						className="absolute top-0 left-8 flex items-center gap-1 text-[15px] font-inter font-normal no-underline hover:no-underline z-10 group text-black hover:text-gray-500"
						title="Back to Home"
						style={{ paddingTop: '5px' }}
					>
						<svg
							width="18"
							height="11"
							viewBox="0 0 27 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="inline-block"
						>
							<path
								d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
								fill="currentColor"
							/>
						</svg>
						<span>Back to Home</span>
					</Link>
					<div className="max-w-[1250px] w-9/10 mx-auto lg:w-9/10">
						<div
							className={cn(
								'transition-opacity duration-200',
								shouldHideContent
									? 'opacity-0 pointer-events-none select-none'
									: 'opacity-100'
							)}
						>
							<div className="flex justify-center">
								<CampaignName campaign={campaign} />
							</div>
							<div className="flex justify-center">
								<div className="flex flex-col items-center">
									<div className="flex items-start gap-6">
										<div className="flex items-center">
											<Link href={urls.murmur.dashboard.index} className="block">
												<div
													className="bg-[#EEEEEE] flex items-center justify-start pl-1 transition-colors group hover:bg-[#696969]"
													style={{
														width: '36.06px',
														height: '14.21px',
														borderRadius: '5.55px',
													}}
												>
													<span className="font-inter font-normal text-[10px] leading-none text-black transition-colors group-hover:text-white">
														To
													</span>
												</div>
											</Link>
											<Typography
												className="ml-2 text-gray-600 font-inter font-extralight"
												style={{ fontSize: '11.79px' }}
											>
												{campaign?.userContactLists
													?.map((list) => list.name)
													.join(', ') || 'No recipients selected'}
											</Typography>
										</div>

										<div className="flex items-start">
											<button
												type="button"
												onClick={() => {
													setIdentityDialogOrigin('campaign');
													setIsIdentityDialogOpen(true);
												}}
												className="bg-[#EEEEEE] flex items-center justify-start pl-1 cursor-pointer transition-colors group hover:bg-[#696969]"
												style={{
													width: '36.06px',
													height: '14.21px',
													borderRadius: '5.55px',
												}}
											>
												<span className="font-inter font-normal text-[10px] leading-none text-black transition-colors group-hover:text-white">
													From
												</span>
											</button>
											<div className="ml-2 flex flex-col items-start">
												<button
													type="button"
													className="text-gray-600 font-inter font-extralight hover:underline cursor-pointer text-left"
													style={{ fontSize: '11.79px' }}
													onClick={() => setIsIdentityInfoOpen((open) => !open)}
													aria-expanded={isIdentityInfoOpen}
												>
													{campaign?.identity?.name}
												</button>
												{isIdentityInfoOpen && (
													<div className="mt-1 text-left">
														{campaign?.identity?.email && (
															<div
																className="text-gray-600 font-inter font-extralight"
																style={{ fontSize: '11.79px' }}
															>
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
																className="text-gray-600 font-inter font-extralight hover:underline break-all"
																style={{ fontSize: '11.79px' }}
															>
																{campaign.identity.website}
															</a>
														)}
													</div>
												)}
											</div>
										</div>
									</div>
									{/* Metric boxes below To/From */}
									<div className="mt-2 flex items-center gap-5">
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getContactsFillColor(contactsCount),
												borderWidth: '1.3px',
												minWidth: '80.38px',
												height: '19px',
												fontSize: '11.7px',
											}}
										>
											{`${String(contactsCount).padStart(2, '0')} contacts`}
										</div>
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getDraftFillColor(draftCount),
												borderWidth: '1.3px',
												minWidth: '80.38px',
												height: '19px',
												fontSize: '11.7px',
											}}
										>
											{`${String(draftCount).padStart(2, '0')} drafts`}
										</div>
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getSentFillColor(sentCount),
												borderWidth: '1.3px',
												minWidth: '80.38px',
												height: '19px',
												fontSize: '11.7px',
											}}
										>
											{`${String(sentCount).padStart(2, '0')} sent`}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Container with background that starts after the divider */}
			<div
				className="relative min-h-screen mt-2 border-t-2 border-black"
				style={{ backgroundColor: 'rgba(222, 242, 225, 0.65)' }}
			>
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

							{/* View tabs - text-only Inter font */}
							<div className="mt-4 flex justify-center">
								<div className="w-full max-w-[1250px] px-6">
									<div className="flex gap-6 justify-center">
										<button
											type="button"
											className={cn(
												'font-inter text-[20px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
												activeView === 'testing'
													? 'text-black font-semibold'
													: 'text-[#6B6B6B] hover:text-black'
											)}
											onClick={() => setActiveView('testing')}
										>
											Testing
										</button>
										<button
											type="button"
											className={cn(
												'font-inter text-[20px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
												activeView === 'drafting'
													? 'text-black font-semibold'
													: 'text-[#6B6B6B] hover:text-black'
											)}
											onClick={() => setActiveView('drafting')}
										>
											Drafting
										</button>
									</div>
								</div>
							</div>

							<div className="mt-6 flex justify-center">
								<DraftingSection campaign={campaign} view={activeView} />
							</div>
						</div>
					</>
				)}
			</div>
		</>
	);
};

export default Murmur;
