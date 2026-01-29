'use client';

import { FC, useState, useRef, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@prisma/client';
import { X } from 'lucide-react';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { useGetCampaigns, useDeleteCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useIsMobile } from '@/hooks/useIsMobile';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import EmptyMobile from '@/components/atoms/_svg/EmptyMobile';
import { urls } from '@/constants/urls';
import { mmdd } from '@/utils';

type InboxSubtab = 'messages' | 'campaigns';

const MESSAGES_CAMPAIGNS_TOGGLE_WIDTH_PX = 260;
const MESSAGES_CAMPAIGNS_TOGGLE_HEIGHT_PX = 48;
const MESSAGES_CAMPAIGNS_TOGGLE_GAP_PX = 12;
const MESSAGES_CAMPAIGNS_SELECTED_FILL = '#B3E5FF';
const MESSAGES_CAMPAIGNS_UNSELECTED_FILL = '#4DA6D7';

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
	/**
	 * Override the width used for responsive breakpoint decisions.
	 * Helpful when embedding inside fixed-size popups/modals.
	 */
	containerWidthPx?: number;
	/**
	 * Removes the default outer horizontal padding used in app pages.
	 * Useful when the parent container already controls spacing.
	 */
	noOuterPadding?: boolean;
	/**
	 * Optional dashboard "Inbox" sub-tab selection (Messages vs Campaigns).
	 * When provided, renders the Messages/Campaigns segmented toggle next to the search bar.
	 */
	inboxSubtab?: InboxSubtab;
	onInboxSubtabChange?: (next: InboxSubtab) => void;
};

type CampaignsInboxViewSkeletonProps = {
	hideSearchBar: boolean;
	containerHeight: string;
	inboxSubtab: InboxSubtab;
	onInboxSubtabChange?: (next: InboxSubtab) => void;
	noOuterPadding: boolean;
};

const MessagesCampaignsToggle: FC<{
	value: InboxSubtab;
	onChange: (next: InboxSubtab) => void;
	style?: CSSProperties;
}> = ({ value, onChange, style }) => {
	return (
		<div
			style={{
				width: `${MESSAGES_CAMPAIGNS_TOGGLE_WIDTH_PX}px`,
				height: `${MESSAGES_CAMPAIGNS_TOGGLE_HEIGHT_PX}px`,
				border: '3px solid #000000',
				borderRadius: '8px',
				overflow: 'hidden',
				display: 'flex',
				position: 'relative',
				...style,
			}}
		>
			<div
				aria-hidden
				style={{
					position: 'absolute',
					left: '50%',
					top: 0,
					bottom: 0,
					width: '3px',
					backgroundColor: '#000000',
					transform: 'translateX(-1.5px)',
					pointerEvents: 'none',
				}}
			/>
			<button
				type="button"
				onClick={() => onChange('messages')}
				aria-pressed={value === 'messages'}
				style={{
					flex: 1,
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 0,
					margin: 0,
					lineHeight: 1,
					border: 'none',
					outline: 'none',
					backgroundColor:
						value === 'messages'
							? MESSAGES_CAMPAIGNS_SELECTED_FILL
							: MESSAGES_CAMPAIGNS_UNSELECTED_FILL,
					color: '#000000',
					fontFamily: 'Inter, sans-serif',
					fontSize: '15px',
					fontWeight: 500,
					cursor: 'pointer',
					boxShadow: 'none',
					WebkitAppearance: 'none',
					appearance: 'none',
				}}
			>
				Messages
			</button>
			<button
				type="button"
				onClick={() => onChange('campaigns')}
				aria-pressed={value === 'campaigns'}
				style={{
					flex: 1,
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 0,
					margin: 0,
					lineHeight: 1,
					border: 'none',
					outline: 'none',
					backgroundColor:
						value === 'campaigns'
							? MESSAGES_CAMPAIGNS_SELECTED_FILL
							: MESSAGES_CAMPAIGNS_UNSELECTED_FILL,
					color: '#000000',
					fontFamily: 'Inter, sans-serif',
					fontSize: '15px',
					fontWeight: 500,
					cursor: 'pointer',
					boxShadow: 'none',
					WebkitAppearance: 'none',
					appearance: 'none',
				}}
			>
				Campaigns
			</button>
		</div>
	);
};

const CampaignsInboxViewSkeleton: FC<CampaignsInboxViewSkeletonProps> = ({
	hideSearchBar,
	containerHeight,
	inboxSubtab,
	onInboxSubtabChange,
	noOuterPadding,
}) => {
	const showMessagesCampaignsToggle = Boolean(onInboxSubtabChange);
	const searchBarRightOffset = showMessagesCampaignsToggle
		? `${14 + MESSAGES_CAMPAIGNS_TOGGLE_WIDTH_PX + MESSAGES_CAMPAIGNS_TOGGLE_GAP_PX}px`
		: '14px';

	const outerPaddingClass = noOuterPadding ? 'px-0' : 'px-4';

	return (
		<div className={`w-full max-w-[907px] mx-auto ${outerPaddingClass} flex justify-center`}>
			<div
				className="relative flex flex-col items-center w-full max-w-[907px] overflow-hidden"
				style={{
					height: containerHeight,
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: hideSearchBar ? '16px' : '76px',
					backgroundColor: '#4ca9db',
				}}
				aria-busy="true"
				aria-label="Loading campaigns"
			>
				<span className="sr-only">Loading campaigns</span>

				{/* Search Bar skeleton */}
				{!hideSearchBar && (
					<div
						className="animate-pulse"
						style={{
							position: 'absolute',
							top: '13px',
							left: '14px',
							right: searchBarRightOffset,
							maxWidth: '879px',
							height: '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: '16px',
						}}
					>
						<div className="w-[18px] h-[18px] rounded-[3px] bg-black/20" />
						<div className="ml-4 h-[14px] w-[180px] rounded-[4px] bg-black/15" />
					</div>
				)}

				{/* Messages/Campaigns toggle (dashboard inbox sub-tab) */}
				{!hideSearchBar && showMessagesCampaignsToggle && (
					<MessagesCampaignsToggle
						value={inboxSubtab}
						onChange={onInboxSubtabChange!}
						style={{
							position: 'absolute',
							top: '13px',
							right: '14px',
							zIndex: 10,
							pointerEvents: 'none',
						}}
					/>
				)}

				{/* Campaign row skeletons */}
				<div className="w-full flex flex-col items-center">
					{Array.from({ length: 5 }).map((_, idx) => (
						<div
							key={`campaign-skeleton-${idx}`}
							className="select-none mb-2 w-full max-w-[879px] overflow-hidden"
							style={{
								height: '78px',
								minHeight: '78px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#EAEAEA',
								display: 'flex',
								alignItems: 'center',
								padding: '0 16px',
							}}
						>
							<div className="flex items-center w-full gap-4 animate-pulse">
								{/* Campaign name */}
								<div className="flex flex-col gap-2 min-w-0 flex-[2]">
									<div className="h-[14px] bg-black/20 rounded w-[70%]" />
									<div className="h-[10px] bg-black/15 rounded w-[45%]" />
								</div>

								{/* Metrics */}
								<div className="flex-[3] flex justify-end">
									<div className="grid grid-cols-2 min-[880px]:grid-cols-4 gap-x-2 gap-y-2">
										{Array.from({ length: 4 }).map((__, metricIdx) => (
											<div
												key={`campaign-skeleton-metric-${idx}-${metricIdx}`}
												className="h-[20px] w-[70px] min-[880px]:w-[92px] rounded-[4px] bg-black/10 border border-black/25"
											/>
										))}
									</div>
								</div>

								{/* Delete icon placeholder */}
								<div className="w-[24px] h-[24px] rounded-[4px] bg-black/20" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
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
	containerWidthPx,
	noOuterPadding = false,
	inboxSubtab = 'campaigns',
	onInboxSubtabChange,
}) => {
	const router = useRouter();
	const isMobile = useIsMobile();
	const { isSignedIn } = useAuth();
	const [searchQuery, setSearchQuery] = useState('');
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const resolvedContainerHeight = containerHeight ?? '535px';
	const showMessagesCampaignsToggle = !hideSearchBar && Boolean(onInboxSubtabChange);
	const searchBarRightOffset = showMessagesCampaignsToggle
		? `${14 + MESSAGES_CAMPAIGNS_TOGGLE_WIDTH_PX + MESSAGES_CAMPAIGNS_TOGGLE_GAP_PX}px`
		: '14px';

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
			const width = containerWidthPx ?? window.innerWidth;
			setIsNarrowLayout(width <= 880);
			setHideVerticalDividers(width <= 602);
		};
		handleResize();
		if (containerWidthPx != null) return;
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [containerWidthPx]);

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
			<CampaignsInboxViewSkeleton
				hideSearchBar={hideSearchBar}
				containerHeight={resolvedContainerHeight}
				inboxSubtab={inboxSubtab}
				onInboxSubtabChange={onInboxSubtabChange}
				noOuterPadding={noOuterPadding}
			/>
		);
	}

	const outerPaddingClass = noOuterPadding ? 'px-0' : 'px-4';

	return (
		<div className={`w-full max-w-[907px] mx-auto ${outerPaddingClass} flex justify-center`}>
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
							right: searchBarRightOffset,
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

				{/* Messages/Campaigns toggle (dashboard inbox sub-tab) */}
				{showMessagesCampaignsToggle && (
					<MessagesCampaignsToggle
						value={inboxSubtab}
						onChange={onInboxSubtabChange!}
						style={{
							position: 'absolute',
							top: '13px',
							right: '14px',
							zIndex: 10,
						}}
					/>
				)}

				{/* Mobile Empty State - Show Murmur Logo */}
				{isMobile && filteredCampaigns.length === 0 && (
					<>
						{/* Clerk button in top right of box */}
						<div className="absolute top-3 right-3 z-10">
							{isSignedIn ? (
								<UserButton
									appearance={{
										elements: {
											avatarBox: 'w-7 h-7 ring-1 ring-black/10',
											userButtonTrigger:
												'opacity-80 hover:opacity-100 transition-opacity duration-300',
										},
									}}
								/>
							) : (
								<SignInButton mode="modal">
									<button className="px-3 py-1.5 text-[12px] font-medium tracking-[0.02em] text-white hover:text-gray-200 transition-all duration-300">
										Sign in
									</button>
								</SignInButton>
							)}
						</div>
						<div className="flex flex-col items-center justify-center w-full" style={{ marginTop: '20px' }}>
							<MurmurLogoNew width={280} height={95} />
							<p
								className="text-center mt-4 px-4"
								style={{
									fontFamily: 'Inter, sans-serif',
									fontWeight: 800,
									fontSize: '18px',
									color: '#FFFFFF',
								}}
							>
								OPEN MURMUR ON DESKTOP TO CREATE YOUR FIRST CAMPAIGN
							</p>
							<div className="mt-6 w-full flex justify-center px-4" style={{ marginLeft: '-20px' }}>
								<EmptyMobile style={{ width: '100%', maxWidth: '320px', height: 'auto' }} />
							</div>
							<p
								className="text-center mt-16 px-6"
								style={{
									fontFamily: 'Inter, sans-serif',
									fontWeight: 300,
									fontStyle: 'italic',
									fontSize: '20px',
									color: '#145B81',
								}}
							>
								Mobile Murmur is custom designed for managing existing campaigns
							</p>
						</div>
					</>
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
							className="cursor-pointer mb-2 w-full max-w-[879px] transition-all duration-200 hover:brightness-[0.97] hover:shadow-md"
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
						// On mobile, when fully empty, hide all placeholders including the "Create New Campaign" button
						if (isMobile && filteredCampaigns.length === 0) {
							return null;
						}
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
