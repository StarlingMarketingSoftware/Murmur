'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@prisma/client';
import { X } from 'lucide-react';
import { useGetCampaigns, useDeleteCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { urls } from '@/constants/urls';
import { mmdd } from '@/utils';

// Type matching what the campaigns API returns (same as useCampaignsTable)
type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
	contactEmails?: string[];
	visibleInboxCount?: number;
};

type CampaignsInboxViewProps = {
	/** Hide the "Search Mail" input and show the table only. */
	hideSearchBar?: boolean;
	/** Override the outer container height (e.g. "600px" or "calc(100dvh - 120px)"). */
	containerHeight?: string;
};

// Color functions matching useCampaignsTable exactly
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

const getUpdatedFillColor = (updatedAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF';
	if (days <= 3) return '#FBEEEE';
	if (days <= 7) return '#F8DDDD';
	if (days <= 14) return '#F4CCCC';
	if (days <= 30) return '#F0BABA';
	if (days <= 45) return '#ECA9A9';
	if (days <= 60) return '#E99898';
	return '#E58787';
};

const getCreatedFillColor = (createdAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(createdAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF';
	if (days === 1) return '#F4F7FF';
	if (days <= 3) return '#E9F0FF';
	if (days <= 7) return '#DEE8FF';
	if (days <= 14) return '#D3E0FF';
	if (days <= 30) return '#C8D8FF';
	if (days <= 60) return '#BDD1FF';
	return '#B2C9FF';
};

export const CampaignsInboxView: FC<CampaignsInboxViewProps> = ({
	hideSearchBar = false,
	containerHeight,
}) => {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const resolvedContainerHeight = containerHeight ?? '535px';

	// Breakpoint state for 2x2 metric grid layout (≤ 880px)
	const [isNarrowLayout, setIsNarrowLayout] = useState(false);
	// Breakpoint state for hiding vertical dividers (≤ 602px)
	const [hideVerticalDividers, setHideVerticalDividers] = useState(false);

	// useGetCampaigns returns campaigns with draftCount and sentCount already computed by the API
	// This is the same data source used by CampaignsTable
	const { data: campaigns, isLoading: isLoadingCampaigns } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails();
	const { mutateAsync: deleteCampaign } = useDeleteCampaign();

	// Track window width for responsive layout
	useEffect(() => {
		const handleResize = () => {
			setIsNarrowLayout(window.innerWidth <= 880);
			setHideVerticalDividers(window.innerWidth <= 602);
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Clear timeouts on unmount
	useEffect(() => {
		return () => {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
		};
	}, []);

	// Use draftCount, sentCount, and contactEmails directly from the API response
	// Calculate visibleInboxCount: inbound emails where sender matches a contact email in the campaign
	const campaignsWithCounts: CampaignWithCounts[] =
		campaigns?.map((campaign: CampaignWithCounts) => {
			// Create a normalized set of contact emails for efficient lookup
			const contactEmailsSet = new Set(
				(campaign.contactEmails || [])
					.filter((email): email is string => Boolean(email))
					.map((email) => email.toLowerCase().trim())
			);

			// Count inbound emails where the sender matches a contact email in this campaign
			const visibleInboxCount =
				contactEmailsSet.size > 0 && inboundEmails
					? inboundEmails.filter((e) => {
							const sender = e.sender?.toLowerCase().trim();
							return sender && contactEmailsSet.has(sender);
					  }).length
					: 0;

			return {
				...campaign,
				// draftCount and sentCount come from the API response
				visibleInboxCount,
			};
		}) || [];

	// Filter campaigns by search query
	const filteredCampaigns = campaignsWithCounts.filter((campaign) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return campaign.name.toLowerCase().includes(query);
	});

	const handleRowClick = (campaign: CampaignWithCounts) => {
		if (campaign.id === confirmingCampaignId) {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			deleteCampaign(campaign.id);
			setConfirmingCampaignId(null);
		} else {
			router.push(`${urls.murmur.campaign.detail(campaign.id)}?tab=inbox&silent=1`);
		}
	};

	const handleDeleteClick = (e: React.MouseEvent, campaignId: number) => {
		e.stopPropagation();

		if (confirmationTimeoutRef.current) {
			clearTimeout(confirmationTimeoutRef.current);
		}

		if (campaignId === confirmingCampaignId) {
			deleteCampaign(campaignId);
			setConfirmingCampaignId(null);
		} else {
			setConfirmingCampaignId(campaignId);
			confirmationTimeoutRef.current = setTimeout(() => {
				setConfirmingCampaignId(null);
			}, 5000);
		}
	};

	if (isLoadingCampaigns) {
		return (
			<div className="w-full max-w-[907px] mx-auto px-4 flex justify-center">
				<div
					className="flex items-center justify-center w-full max-w-[907px]"
					style={{
						height: resolvedContainerHeight,
						border: '3px solid #000000',
						borderRadius: '8px',
						backgroundColor: '#4ca9db',
					}}
				>
					<div className="text-white font-medium">Loading campaigns...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[907px] mx-auto px-4 flex justify-center">
			<CustomScrollbar
				className="flex flex-col items-center relative w-full max-w-[907px]"
				contentClassName="flex flex-col items-center w-full"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-6}
				disableOverflowClass
				style={{
					height: resolvedContainerHeight,
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: hideSearchBar ? '16px' : '76px',
					backgroundColor: '#4ca9db',
				}}
			>
				{/* Search Bar */}
				{!hideSearchBar && (
					<div
						style={{
							position: 'absolute',
							top: '13px',
							left: '14px',
							right: '14px',
							maxWidth: '879px',
							height: '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: filteredCampaigns.length === 0 ? '#2995CE' : '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: '16px',
						}}
					>
						<SearchIconDesktop />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={
								filteredCampaigns.length === 0 && !searchQuery ? '' : 'Search Mail'
							}
							disabled={filteredCampaigns.length === 0 && !searchQuery}
							style={{
								flex: 1,
								height: '100%',
								border: 'none',
								outline: 'none',
								fontSize: '16px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: '16px',
								paddingRight: '16px',
								cursor:
									filteredCampaigns.length === 0 && !searchQuery ? 'default' : 'text',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>
				)}

				{/* Campaign Rows */}
				{filteredCampaigns.map((campaign) => {
					const isConfirming = campaign.id === confirmingCampaignId;
					const draftCount = campaign.draftCount ?? 0;
					const sentCount = campaign.sentCount ?? 0;
					const createdAt = new Date(campaign.createdAt);
					const updatedAt = new Date(campaign.updatedAt);

					const draftLabel =
						draftCount.toString().padStart(2, '0') +
						(draftCount === 1 ? ' draft' : ' drafts');
					const sentLabel = sentCount.toString().padStart(2, '0') + ' sent';

					const draftFill = getDraftFillColor(draftCount);
					const sentFill = getSentFillColor(sentCount);
					const updatedFill = getUpdatedFillColor(updatedAt);
					const createdFill = getCreatedFillColor(createdAt);

					const metrics = [
						{ label: draftLabel, fill: draftFill, hasSeparator: true },
						{ label: sentLabel, fill: sentFill, hasSeparator: true },
						{ label: mmdd(updatedAt), fill: updatedFill, hasSeparator: true },
						{ label: mmdd(createdAt), fill: createdFill, hasSeparator: false },
					];

					return (
						<div
							key={campaign.id}
							className="cursor-pointer mb-2 w-full max-w-[879px]"
							style={{
								height: '78px',
								minHeight: '78px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: isConfirming
									? '#DC3545'
									: campaign.visibleInboxCount && campaign.visibleInboxCount > 0
									? '#FFFFFF'
									: '#EAEAEA',
								display: 'flex',
								alignItems: 'center',
								padding: '0 16px',
								position: 'relative',
							}}
							onClick={() => handleRowClick(campaign)}
						>
							{/* Vertical divider at 203px from left */}
							{!hideVerticalDividers && (
								<div
									style={{
										position: 'absolute',
										left: '203px',
										top: '0',
										bottom: '0',
										width: '2px',
										backgroundColor: isConfirming ? 'transparent' : '#000000',
									}}
								/>
							)}
							{/* Vertical divider at 295px from left (92px to the right of first divider) */}
							{!hideVerticalDividers && (
								<div
									style={{
										position: 'absolute',
										left: '295px',
										top: '0',
										bottom: '0',
										width: '1px',
										backgroundColor: isConfirming ? 'transparent' : '#000000',
									}}
								/>
							)}
							{/* Campaign Name */}
							<div
								className={`flex flex-col min-w-0 ${hideVerticalDividers ? 'justify-start' : 'justify-center'}`}
								style={{ 
									width: hideVerticalDividers ? '110px' : '140px', 
									flexShrink: 0,
									marginTop: hideVerticalDividers ? '-15px' : undefined,
								}}
							>
								{/* Campaign name with fade-to-ellipsis effect */}
								<div
									style={{
										position: 'relative',
										maxHeight: hideVerticalDividers && campaign.visibleInboxCount && campaign.visibleInboxCount > 0 ? '1.25em' : '2.5em',
										overflow: 'hidden',
										lineHeight: '1.25',
									}}
								>
									<span
										className="font-bold text-[14px]"
										style={{
											color: isConfirming ? '#FFFFFF' : '#000000',
										}}
									>
										{campaign.name}
									</span>
									{/* Fade overlay */}
									<span
										style={{
											position: 'absolute',
											bottom: 0,
											right: 0,
											height: '1.25em',
											width: '25px',
											background: `linear-gradient(to right, transparent 0%, ${
												isConfirming
													? '#DC3545'
													: campaign.visibleInboxCount && campaign.visibleInboxCount > 0
													? '#FFFFFF'
													: '#EAEAEA'
											} 100%)`,
										}}
									/>
								</div>
								{/* New messages box below campaign name at narrow breakpoint */}
								{hideVerticalDividers && (campaign.visibleInboxCount ?? 0) > 0 && (
									<div
										style={{
											width: 'fit-content',
											maxWidth: '110px',
											height: '16px',
											padding: '0 7px',
											backgroundColor: isConfirming ? 'transparent' : '#CCF9D2',
											borderRadius: '4px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											marginTop: '3px',
											alignSelf: 'flex-start',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										<span
											className="text-[10px] font-medium leading-none"
											style={{ color: isConfirming ? '#FFFFFF' : '#000000' }}
										>
											{campaign.visibleInboxCount} new {campaign.visibleInboxCount === 1 ? 'message' : 'messages'}
										</span>
									</div>
								)}
							</div>

							{/* Visible Inbox Count - positioned absolutely between the two divider lines (203px to 295px) - hidden at narrow breakpoint */}
							{!hideVerticalDividers && (
								<div
									style={{
										position: 'absolute',
										left: '205px',
										top: '0',
										bottom: '0',
										width: '90px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor:
											campaign.visibleInboxCount && campaign.visibleInboxCount > 0
												? isConfirming
													? 'transparent'
													: '#EEFFF0'
												: 'transparent',
									}}
								>
									{campaign.visibleInboxCount && campaign.visibleInboxCount > 0 ? (
										<div
											className="flex flex-col items-center justify-center"
											style={{ color: isConfirming ? '#FFFFFF' : '#000000' }}
										>
											<span className="text-[12px] font-medium leading-tight">
												{campaign.visibleInboxCount} new
											</span>
											<span className="text-[12px] font-medium leading-tight">
												{campaign.visibleInboxCount === 1 ? 'message' : 'messages'}
											</span>
										</div>
									) : null}
								</div>
							)}

							{/* Metric Boxes - positioned after the second divider (295px), or after campaign name at narrow breakpoint */}
							{isNarrowLayout ? (
								/* 2x2 Grid layout for narrow screens (≤ 880px) - centered in right area */
								<div
									style={{
										position: 'absolute',
										left: hideVerticalDividers ? '140px' : '295px',
										right: '40px', // Leave space for delete button
										top: hideVerticalDividers ? '10px' : '0',
										bottom: hideVerticalDividers ? 'auto' : '0',
										display: 'flex',
										alignItems: hideVerticalDividers ? 'flex-start' : 'center',
										justifyContent: 'center',
									}}
								>
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: 'repeat(2, 1fr)',
											gridTemplateRows: 'repeat(2, 1fr)',
											gap: hideVerticalDividers ? '2px 6px' : '4px 8px',
										}}
									>
										{/* Row 1: drafts (0), updated (2) */}
										{/* Row 2: sent (1), created (3) */}
										{[metrics[0], metrics[2], metrics[1], metrics[3]].map((metric, index) => (
											<div
												key={index}
												className="metric-box inline-flex items-center justify-center leading-none truncate"
												style={{
													width: hideVerticalDividers ? '70px' : '92px',
													height: hideVerticalDividers ? '14px' : '20px',
													borderRadius: '4px',
													backgroundColor: isConfirming ? 'transparent' : metric.fill,
													borderColor: isConfirming ? '#A20000' : '#8C8C8C',
													borderWidth: '1px',
													borderStyle: 'solid',
													color: isConfirming ? '#FFFFFF' : 'inherit',
													fontSize: hideVerticalDividers ? '10px' : '14px',
												}}
											>
												{metric.label}
											</div>
										))}
									</div>
								</div>
							) : (
								/* 4x1 Horizontal layout for wider screens */
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										marginLeft: '160px',
										marginRight: '0px',
									}}
								>
									{metrics.map((metric, index) => (
										<div
											key={index}
											style={{
												display: 'flex',
												alignItems: 'center',
												paddingRight: metric.hasSeparator ? '15px' : '0',
												marginRight: metric.hasSeparator ? '15px' : '0',
											borderRight:
												metric.hasSeparator && !hideVerticalDividers
													? `2px solid ${isConfirming ? 'transparent' : '#000000'}`
													: 'none',
												height: '17px',
											}}
										>
											<div
												className="metric-box inline-flex items-center justify-center leading-none truncate"
												style={{
													width: '92px',
													height: '20px',
													borderRadius: '4px',
													backgroundColor: isConfirming ? 'transparent' : metric.fill,
													borderColor: isConfirming ? '#A20000' : '#8C8C8C',
													borderWidth: '1px',
													borderStyle: 'solid',
													color: isConfirming ? '#FFFFFF' : 'inherit',
													fontSize: '14px',
												}}
											>
												{metric.label}
											</div>
										</div>
									))}
								</div>
							)}

							{/* Delete Button */}
							<button
								type="button"
								onClick={(e) => handleDeleteClick(e, campaign.id)}
								className="ml-auto flex items-center justify-center hover:opacity-70 transition-opacity"
								style={{
									width: '24px',
									height: '24px',
									background: 'transparent',
									border: 'none',
									cursor: 'pointer',
									padding: 0,
								}}
								aria-label="Delete campaign"
							>
								<X
									className="w-[20px] h-[20px]"
									style={{ color: isConfirming ? '#FFFFFF' : '#000000' }}
								/>
							</button>
						</div>
					);
				})}

				{/* Empty Placeholder Rows */}
				{Array.from({ length: Math.max(0, 5 - filteredCampaigns.length) }).map(
					(_, idx) => {
						const isFirstInEmptyState = filteredCampaigns.length === 0 && idx === 0;
						return (
							<div
								key={`placeholder-${idx}`}
								className={`select-none mb-2 w-full max-w-[879px] ${
									isFirstInEmptyState
										? 'cursor-pointer hover:opacity-90 transition-opacity'
										: ''
								}`}
								style={{
									height: isFirstInEmptyState ? '58px' : '78px',
									minHeight: isFirstInEmptyState ? '58px' : '78px',
									border: '3px solid #000000',
									borderRadius: '8px',
									backgroundColor: isFirstInEmptyState
										? '#A7E1FF'
										: filteredCampaigns.length === 0
										? '#2995CE'
										: '#4ca9db',
									display: isFirstInEmptyState ? 'flex' : 'block',
									alignItems: 'center',
									justifyContent: 'center',
								}}
								onClick={
									isFirstInEmptyState
										? () => router.push(`${urls.murmur.dashboard.index}?tab=search`)
										: undefined
								}
							>
								{isFirstInEmptyState && (
									<span
										style={{
											fontSize: '16px',
											fontWeight: 600,
											color: '#000000',
											fontFamily: 'Inter, sans-serif',
										}}
									>
										Create New Campaign
									</span>
								)}
							</div>
						);
					}
				)}
			</CustomScrollbar>
		</div>
	);
};

export default CampaignsInboxView;
