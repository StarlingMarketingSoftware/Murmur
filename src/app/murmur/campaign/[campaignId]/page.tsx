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
						prefetch
						className={cn(
							'absolute left-8 flex items-center text-[15px] font-inter font-normal no-underline hover:no-underline z-[100] group text-[#060606] hover:text-gray-500',
							isMobile && 'hidden'
						)}
						title="Back to Home"
						onClick={(e) => {
							e.preventDefault();
							if (typeof window !== 'undefined') {
								window.location.assign(urls.murmur.dashboard.index);
							}
						}}
						style={{
							top: '41px',
							transform: 'translateY(-50%)',
							gap: '20px',
							fontWeight: 400,
						}}
					>
						<svg
							width="16"
							height="10"
							viewBox="0 0 27 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="inline-block align-middle"
						>
							<path
								d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
								fill="currentColor"
							/>
						</svg>
						<span>Back to Home</span>
					</Link>
					{isMobile && !shouldHideContent && null}
					<div className="max-w-[1250px] w-9/10 mx-auto lg:w-9/10">
						<div
							className={cn(
								'transition-opacity duration-200',
								shouldHideContent
									? 'opacity-0 pointer-events-none select-none'
									: 'opacity-100'
							)}
						>
							<div className="flex flex-col items-center" style={{ paddingTop: '18px' }}>
								<div
									className={cn(
										isMobile
											? 'mx-auto flex items-center justify-between'
											: 'relative w-full flex items-center justify-center'
									)}
									style={isMobile ? { width: '94.67%' } : undefined}
								>
									{/* Slight mobile-only vertical nudge to sit closer to the box */}
									<div
										className="campaign-title-landscape"
										style={isMobile ? { transform: 'translateY(3px)' } : undefined}
									>
										<CampaignName campaign={campaign} />
									</div>

									{/* Mobile landscape inline controls: hidden by default; shown via CSS in landscape */}
									{isMobile && (
										<div className="mobile-landscape-inline-controls">
											{/* Metrics */}
											<div
												className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
												style={{
													backgroundColor: getContactsFillColor(contactsCount),
													borderWidth: '1.3px',
													width: '84px',
													height: '20px',
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
													width: '84px',
													height: '20px',
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
													width: '84px',
													height: '20px',
													fontSize: '11.7px',
												}}
											>
												{`${String(sentCount).padStart(2, '0')} sent`}
											</div>

											{/* To */}
											<Link
												href={urls.murmur.dashboard.index}
												prefetch
												onClick={(e) => {
													e.preventDefault();
													if (typeof window !== 'undefined') {
														window.location.assign(urls.murmur.dashboard.index);
													}
												}}
												className="block"
											>
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

											{/* From */}
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

											{/* Inline view tabs */}
											<div className="flex items-center gap-3 ml-2">
												<button
													type="button"
													className={cn(
														'font-inter text-[16px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
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
														'font-inter text-[16px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
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
									)}
									{isMobile && !shouldHideContent && (
										<button
											onClick={() => {
												if (typeof window !== 'undefined') {
													window.location.assign(urls.murmur.dashboard.index);
												}
											}}
											title="Home"
											aria-label="Back to Home"
											className="z-[100] inline-flex items-center justify-center rounded-[6px] bg-[#EEEEEE] text-black shadow-[0_2px_10px_rgba(0,0,0,0.15)] active:scale-95 transition-all duration-200"
											style={{
												width: '23px',
												height: '17px',
												transform: 'translateY(2px)',
												WebkitTapHighlightColor: 'transparent',
											}}
										>
											<svg
												width="11"
												height="11"
												viewBox="0 0 11 11"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M8.0564 5.64955V8.90431H2.80971V5.64955H8.0564ZM9.20009 4.50586H1.66602V10.048H9.20009V4.50586Z"
													fill="black"
												/>
												<path
													d="M5.43871 1.74879L8.05729 4.40787H2.84396L5.4411 1.74879M5.43395 0.114258L0.127686 5.55157H10.7879L5.43633 0.114258H5.43395Z"
													fill="black"
												/>
											</svg>
										</button>
									)}
								</div>

								{/* Mobile Layout - Single Container with all elements (portrait only) */}
								{isMobile ? (
									<div
										data-slot="mobile-header-controls"
										className="flex items-center justify-between px-1 border border-[#000000] bg-white"
										style={{
											marginTop: '14px',
											height: '29px',
											width: '94.67%', // This will be 355px on 375px viewport
											maxWidth: '100%',
											borderWidth: '1.3px',
											gap: '3px',
										}}
									>
										{/* Contacts box - keeping exact styling */}
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getContactsFillColor(contactsCount),
												borderWidth: '1.3px',
												width: '84px',
												height: '20px',
												fontSize: '11.7px',
											}}
										>
											{`${String(contactsCount).padStart(2, '0')} contacts`}
										</div>

										{/* Drafts box - keeping exact styling */}
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getDraftFillColor(draftCount),
												borderWidth: '1.3px',
												width: '84px',
												height: '20px',
												fontSize: '11.7px',
											}}
										>
											{`${String(draftCount).padStart(2, '0')} drafts`}
										</div>

										{/* Sent box - keeping exact styling */}
										<div
											className="metric-box inline-flex items-center justify-center rounded-[8px] border border-[#000000] px-2.5 leading-none truncate font-inter font-semibold"
											style={{
												backgroundColor: getSentFillColor(sentCount),
												borderWidth: '1.3px',
												width: '84px',
												height: '20px',
												fontSize: '11.7px',
											}}
										>
											{`${String(sentCount).padStart(2, '0')} sent`}
										</div>

										{/* To button - keeping exact gray styling */}
										<Link
											href={urls.murmur.dashboard.index}
											prefetch
											onClick={(e) => {
												e.preventDefault();
												if (typeof window !== 'undefined') {
													window.location.assign(urls.murmur.dashboard.index);
												}
											}}
											className="block"
										>
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

										{/* From button - keeping exact gray styling */}
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
									</div>
								) : (
									/* Desktop Layout - Keep existing unchanged */
									<div
										className="flex flex-col items-center"
										style={{ marginTop: '14px' }}
									>
										<div className="flex items-start gap-6">
											<div className="flex items-center">
												<Link
													href={urls.murmur.dashboard.index}
													prefetch
													onClick={(e) => {
														e.preventDefault();
														if (typeof window !== 'undefined') {
															window.location.assign(urls.murmur.dashboard.index);
														}
													}}
													className="block relative z-[100]"
												>
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
										<div
											className="flex items-center gap-5"
											style={{ marginTop: '13px' }}
										>
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
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Container with background that starts after the divider */}
			<div
				data-slot="campaign-content"
				className="relative min-h-screen mt-2 border-t-0 md:border-t-2 border-black"
				style={{ backgroundColor: isMobile ? '#FFFFFF' : 'rgba(222, 242, 225, 0.65)' }}
			>
				{shouldHideContent && (
					<div
						className={cn(
							'fixed inset-0 z-40 pointer-events-none',
							isMobile ? 'bg-white' : 'bg-background'
						)}
					/>
				)}
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

					{/* View tabs - text-only Inter font (hidden in mobile landscape via local styles) */}
					<div className="mt-4 flex justify-center mobile-landscape-hide">
						<div className="w-full max-w-[1250px] px-6">
							<div className="flex gap-6 justify-center">
								<button
									type="button"
									className={cn(
										'font-inter text-[20px] max-[480px]:text-[12px] max-[480px]:font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
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
										'font-inter text-[20px] max-[480px]:text-[12px] max-[480px]:font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
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
						<DraftingSection
							campaign={campaign}
							view={activeView}
							goToDrafting={() => setActiveView('drafting')}
						/>
					</div>
					{/* using this to hide the default boxes in the drafting tab so we can add in a UI specific to mobile
							and to define mobile landscape header layout without touching globals */}
					<style jsx global>{`
						body.murmur-mobile [data-drafting-container] {
							display: none !important;
						}

						/* Default: hide the inline header controls (used only in landscape) */
						body.murmur-mobile .mobile-landscape-inline-controls {
							display: none !important;
						}

						/* Mobile portrait: fix signature block height */
						@media (max-width: 480px) and (orientation: portrait) {
							body.murmur-mobile [data-hpi-signature-card] {
								min-height: 68px !important;
							}
							body.murmur-mobile .signature-textarea {
								height: 44px !important;
								min-height: 44px !important;
								max-height: 44px !important;
								font-size: 12px !important;
								line-height: 1.2 !important;
								padding: 2px 0 0 2px !important;
								overflow: hidden !important;
								resize: none !important;
							}
						}

						/* Mobile landscape: inline header controls and title clipping */
						@media (orientation: landscape) {
							body.murmur-mobile .mobile-landscape-inline-controls {
								display: inline-flex !important;
								gap: 8px;
								align-items: center;
							}
							body.murmur-mobile .campaign-title-landscape {
								max-width: 200px;
								overflow: hidden;
								white-space: nowrap;
								text-overflow: ellipsis;
							}

							/* Make the preview panel mimic portrait style by hiding its outer chrome */
							body.murmur-mobile [data-drafting-preview-panel] {
								background: transparent !important;
								border: 0 !important;
								scale: 1 !important;
								border-radius: 0 !important;
							}
							body.murmur-mobile [data-drafting-preview-header] {
								display: none !important;
							}
						}

						/* At 667px landscape, adjust spacing for less cramped layout */
						@media (max-width: 667px) and (orientation: landscape) {
							body.murmur-mobile .campaign-title-landscape {
								margin-left: -8px;
							}
							/* Home button on the right - push it out slightly */
							body.murmur-mobile button[title='Home'] {
								margin-right: -4px;
							}
						}

						@media (orientation: landscape) {
							/* Hide portrait container and bottom tabs while in landscape */
							body.murmur-mobile [data-slot='mobile-header-controls'] {
								display: none !important;
							}
							body.murmur-mobile .mobile-landscape-hide {
								display: none !important;
							}
							/* Mobile landscape: shrink the Hybrid Prompt Input to its minimal functional height */
							body.murmur-mobile [data-hpi-container] {
								min-height: unset !important;
								margin-bottom: 6px !important;
							}
							body.murmur-mobile [data-hpi-left-panel] {
								padding-top: 6px !important;
								padding-bottom: 6px !important;
							}
							body.murmur-mobile [data-hpi-content] {
								padding-top: 6px !important;
								padding-bottom: 0 !important;
								gap: 8px !important;
							}
							/* Reduce space below the subject bar and above first block */
							body.murmur-mobile
								[data-hpi-left-panel]
								[data-slot='form-item']:first-of-type {
								margin-bottom: 2px !important;
							}
							body.murmur-mobile [data-hpi-content] {
								padding-top: 2px !important;
								gap: 6px !important;
							}
							/* Subject bar: minimal but legible */
							body.murmur-mobile .subject-bar {
								height: 24px !important;
								min-height: 24px !important;
								max-height: 24px !important;
							}
							/* Full Auto textarea: reduce height and hide example for space */
							body.murmur-mobile .full-auto-textarea {
								height: 110px !important;
								min-height: 110px !important;
							}
							body.murmur-mobile .full-auto-placeholder-example {
								display: none !important;
							}
							/* Signature area: single-line compact */
							body.murmur-mobile [data-hpi-footer] {
								margin-top: 2px !important;
							}
							/* Reduce space between last block and signature */
							body.murmur-mobile [data-hpi-content] [data-block-type]:last-of-type {
								margin-bottom: 2px !important;
							}
							body.murmur-mobile [data-hpi-signature-card] {
								min-height: 42px !important;
								padding-top: 4px !important;
								padding-bottom: 4px !important;
								display: flex !important;
								align-items: center !important;
								gap: 8px !important;
							}
							body.murmur-mobile [data-hpi-signature-card] [data-slot='form-label'] {
								margin: 0 8px 0 0 !important;
								white-space: nowrap !important;
							}
							body.murmur-mobile .signature-textarea {
								height: 30px !important;
								min-height: 30px !important;
								max-height: 30px !important;
								overflow: hidden !important;
								resize: none !important;
								flex: 1 1 auto !important;
								min-width: 0 !important;
								font-size: 10px !important;
								line-height: 1.2 !important;
								padding: 2px 0 0 2px !important;
							}
							/* Blocks: tighten vertical chrome */
							body.murmur-mobile [data-block-type] {
								margin-top: 6px !important;
								margin-bottom: 6px !important;
							}
							body.murmur-mobile [data-block-type='text'] {
								min-height: 44px !important;
							}
							body.murmur-mobile [data-drag-handle] {
								height: 24px !important;
							}
							/* Show sticky Test; hide in-box Test */
							body.murmur-mobile .mobile-sticky-test-button {
								display: block !important;
							}
							body.murmur-mobile .w-full > .flex.justify-center.mb-4.w-full {
								display: none !important;
							}
						}

						/* Ensure the divider below the header is visible in mobile landscape at all widths */
						@media (orientation: landscape) {
							body.murmur-mobile [data-slot='campaign-content'] {
								border-top-width: 2px !important;
								border-top-style: solid !important;
								border-top-color: #000000 !important;
							}
						}
					`}</style>
				</div>
			</div>
		</>
	);
};

export default Murmur;
