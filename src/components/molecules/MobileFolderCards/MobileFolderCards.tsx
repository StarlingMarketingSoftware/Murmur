'use client';

import { FC, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@prisma/client';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { urls } from '@/constants/urls';
import {
	getCampaignFolderScheme,
	getCreatedFillColor,
	getDraftFillColor,
	getInboxDateLabel,
	getSentFillColor,
	getUpdatedFillColor,
	getVisibleInboxCount,
} from '@/components/molecules/CampaignsInboxView/campaignRowMetrics';

// Type matching what the campaigns API returns (same as CampaignsInboxView)
type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
	contactEmails?: string[];
};

const CARD_STYLE: CSSProperties = {
	width: '100%',
	height: '92px',
	minHeight: '92px',
	borderRadius: '9.496px',
	border: '2.374px solid #000000',
	position: 'relative',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'space-between',
	padding: '10px 12px',
	textAlign: 'left',
};

// 4 keyframe stops over 4.8s => 1.2s per scheme; negative delays start card i on
// scheme i so the skeleton stack reads as cycling through the folder pastels.
const SKELETON_WAVE_DURATION_S = 4.8;
const SKELETON_WAVE_STEP_S = 1.2;

const SKELETON_BLOCK_FILL = 'rgba(0,0,0,0.08)';

const PILL_STYLE: CSSProperties = {
	height: '24px',
	borderRadius: '12px',
	border: '1.5px solid #000000',
	padding: '0 10px',
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	fontFamily: 'Inter, sans-serif',
	fontSize: '14px',
	fontWeight: 500,
	lineHeight: 1,
	color: '#000000',
	whiteSpace: 'nowrap',
};

/** Mobile dashboard "Folders" tab: pastel campaign cards floating over the map. */
export const MobileFolderCards: FC<{ className?: string }> = ({ className }) => {
	const router = useRouter();
	const { data: campaigns, isLoading: isLoadingCampaigns } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails();

	return (
		<div
			className={className}
			style={{
				overflowY: 'auto',
				overscrollBehavior: 'contain',
				WebkitOverflowScrolling: 'touch',
				padding: '12px 16px 24px',
				display: 'flex',
				flexDirection: 'column',
				gap: '12px',
			}}
		>
			{isLoadingCampaigns
				? Array.from({ length: 3 }).map((_, idx) => (
						<div
							key={`mobile-folder-skeleton-${idx}`}
							className="mobile-folder-cards-loading-wave-card"
							style={{
								...CARD_STYLE,
								animationDelay: `${-(SKELETON_WAVE_DURATION_S - idx * SKELETON_WAVE_STEP_S)}s`,
							}}
							aria-hidden="true"
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									maxWidth: 'calc(100% - 200px)',
								}}
							>
								<span
									style={{
										width: '28px',
										height: '17px',
										borderRadius: '4px',
										backgroundColor: SKELETON_BLOCK_FILL,
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										width: '96px',
										height: '14px',
										borderRadius: '7px',
										backgroundColor: SKELETON_BLOCK_FILL,
									}}
								/>
							</div>

							<span style={{ height: '20px' }} />

							<div
								style={{
									position: 'absolute',
									right: '12px',
									top: '50%',
									transform: 'translateY(-50%)',
									display: 'flex',
									flexDirection: 'column',
									gap: '8px',
								}}
							>
								{[0, 1].map((rowIdx) => (
									<div
										key={rowIdx}
										style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
									>
										<span
											style={{
												width: '90px',
												height: '24px',
												borderRadius: '12px',
												backgroundColor: SKELETON_BLOCK_FILL,
											}}
										/>
										<span
											style={{
												width: '1.5px',
												height: '16px',
												backgroundColor: 'rgba(0,0,0,0.25)',
												flexShrink: 0,
											}}
										/>
										<span
											style={{
												width: '88px',
												height: '24px',
												borderRadius: '12px',
												backgroundColor: SKELETON_BLOCK_FILL,
											}}
										/>
									</div>
								))}
							</div>
						</div>
				  ))
				: (campaigns as CampaignWithCounts[] | undefined)?.map((campaign, index) => {
						const scheme = getCampaignFolderScheme(index);
						const draftCount = campaign.draftCount ?? 0;
						const sentCount = campaign.sentCount ?? 0;
						const updatedAt = new Date(campaign.updatedAt);
						const createdAt = new Date(campaign.createdAt);
						const visibleInboxCount = getVisibleInboxCount(
							campaign.contactEmails,
							inboundEmails
						);

						const draftLabel =
							draftCount.toString().padStart(2, '0') +
							(draftCount === 1 ? ' draft' : ' drafts');
						const sentLabel = sentCount.toString().padStart(2, '0') + ' sent';

						const pillRows = [
							{
								metric: { label: draftLabel, fill: getDraftFillColor(draftCount) },
								date: {
									label: getInboxDateLabel(updatedAt),
									fill: getUpdatedFillColor(updatedAt),
								},
							},
							{
								metric: { label: sentLabel, fill: getSentFillColor(sentCount) },
								date: {
									label: getInboxDateLabel(createdAt),
									fill: getCreatedFillColor(createdAt),
								},
							},
						];

						return (
							<button
								key={campaign.id}
								type="button"
								onClick={() =>
									router.push(
										`${urls.murmur.campaign.detail(campaign.id)}?tab=inbox&silent=1`
									)
								}
								style={{ ...CARD_STYLE, backgroundColor: scheme.card, cursor: 'pointer' }}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '10px',
										minWidth: 0,
										// Keep the name clear of the right-hand pill column
										maxWidth: 'calc(100% - 200px)',
									}}
								>
									<DashboardActionBarFolderIcon
										width={28}
										height={17}
										style={{ color: scheme.folder, flexShrink: 0 }}
									/>
									<span
										style={{
											fontFamily: 'Inter, sans-serif',
											fontSize: '20px',
											fontWeight: 700,
											color: '#000000',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{campaign.name}
									</span>
								</div>

								{visibleInboxCount > 0 ? (
									<span
										style={{
											alignSelf: 'flex-start',
											height: '20px',
											borderRadius: '6px',
											backgroundColor: '#CCF9D2',
											padding: '0 9px',
											display: 'inline-flex',
											alignItems: 'center',
											fontFamily: 'Inter, sans-serif',
											fontSize: '13px',
											fontWeight: 500,
											lineHeight: 1,
											color: '#000000',
											whiteSpace: 'nowrap',
										}}
									>
										{visibleInboxCount} new{' '}
										{visibleInboxCount === 1 ? 'message' : 'messages'}
									</span>
								) : (
									<span style={{ height: '20px' }} />
								)}

								<div
									style={{
										position: 'absolute',
										right: '12px',
										top: '50%',
										transform: 'translateY(-50%)',
										display: 'flex',
										flexDirection: 'column',
										gap: '8px',
									}}
								>
									{pillRows.map((row, rowIdx) => (
										<div
											key={rowIdx}
											style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
										>
											<span
												style={{
													...PILL_STYLE,
													width: '90px',
													backgroundColor: row.metric.fill,
												}}
											>
												{row.metric.label}
											</span>
											<span
												aria-hidden="true"
												style={{
													width: '1.5px',
													height: '16px',
													backgroundColor: '#000000',
													flexShrink: 0,
												}}
											/>
											<span
												style={{
													...PILL_STYLE,
													width: '88px',
													backgroundColor: row.date.fill,
												}}
											>
												{row.date.label}
											</span>
										</div>
									))}
								</div>
							</button>
						);
				  })}
		</div>
	);
};

export default MobileFolderCards;
