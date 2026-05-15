'use client';

import { FC, useMemo, useState } from 'react';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils/ui';
import {
	getWineBeerSpiritsLabel,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';

export type OpportunityStatus = 'booked' | 'closed' | 'in-progress';

type OpportunityRow = {
	id: number;
	status: OpportunityStatus;
	contactLabel: string;
	exchangeCount: number;
	folder: string;
	categoryTitle: string;
	city: string;
	location: string;
	stateAbbr: string;
	opportunityType: string;
	opportunityDate: string;
	lastMessage: string;
	lastReceivedLabel: string;
};

export type OpportunitiesMockRow = {
	status?: OpportunityStatus;
	contactLabel?: string;
	exchangeCount?: number;
	folder?: string;
	category?: string;
	location?: string;
	stateAbbr?: string;
	opportunityType?: string;
	opportunityDate?: string;
	lastMessage?: string;
	lastReceivedLabel?: string;
};

export type OpportunitiesMockState = {
	rows?: OpportunitiesMockRow[];
};

const MONTH_LABELS_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

const MONTH_NAME_TO_INDEX: Record<string, number> = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11,
};

const OPPORTUNITY_TABS: Array<{ key: OpportunityStatus; label: string; offsetLeft: number }> = [
	{ key: 'booked', label: 'Booked', offsetLeft: 14 },
	{ key: 'closed', label: 'Closed', offsetLeft: 136 },
	{ key: 'in-progress', label: 'In Progress', offsetLeft: 264 },
];

const STATUS_META: Record<
	OpportunityStatus,
	{ label: string; tabFill: string; accent: string }
> = {
	booked: {
		label: 'Booked',
		tabFill: '#8AFF92',
		accent: '#97EE8E',
	},
	closed: {
		label: 'Closed',
		tabFill: '#FF8282',
		accent: '#CE3232',
	},
	'in-progress': {
		label: 'In Progress',
		tabFill: '#FFF18A',
		accent: '#FFD08A',
	},
};

const fadeTextStyle = {
	overflow: 'hidden',
	whiteSpace: 'nowrap',
	WebkitMaskImage: 'linear-gradient(90deg, #000 calc(100% - 16px), transparent)',
	maskImage: 'linear-gradient(90deg, #000 calc(100% - 16px), transparent)',
} as const;

const getCityFromLocation = (location: string, stateAbbr: string) => {
	const city = location.split(',')[0]?.trim() || '';
	if (!stateAbbr) return city;
	return city.replace(new RegExp(`\\s+${stateAbbr}$`, 'i'), '').trim();
};

const getDayOrdinalSuffix = (day: number) => {
	if (day % 100 >= 11 && day % 100 <= 13) return 'th';
	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

const formatOpportunityTimestamp = (value: string | Date | null | undefined) => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const isSameDay = date.toDateString() === now.toDateString();
	if (isSameDay) {
		return date
			.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
			.toLowerCase();
	}

	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${month} ${day}${getDayOrdinalSuffix(day)}`;
};

const formatMonthDay = (monthIndex: number, day: number) =>
	`${MONTH_LABELS_SHORT[monthIndex]} ${day}${getDayOrdinalSuffix(day)}`;

const getEmailSnippet = (email: InboundEmailWithRelations) => {
	const raw = email.strippedText || email.bodyPlain || email.bodyHtml || '';
	const withoutHtml = raw.replace(/<[^>]*>/g, ' ');
	return withoutHtml.replace(/\s+/g, ' ').trim();
};

const getContactLabel = (email: InboundEmailWithRelations) => {
	const contact = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const company = contact?.company?.trim() || '';
	if (company && fullName) return `${company} / ${fullName}`;

	return company || fullName || email.senderName?.trim() || email.sender?.trim() || 'Unknown venue';
};

const getContactCategoryTitle = (email: InboundEmailWithRelations) => {
	const contact = email.contact;
	return (contact?.headline || contact?.title || '').trim();
};

const getOpportunityCategoryMeta = (title: string) => {
	const value = title.trim();
	if (!value) return null;

	if (isRestaurantTitle(value)) {
		return {
			label: 'Restaurant',
			background: '#C3FBD1',
			icon: <RestaurantsIcon size={12} className="flex-shrink-0" />,
		};
	}
	if (isCoffeeShopTitle(value)) {
		return {
			label: 'Coffee Shop',
			background: '#D6F1BD',
			icon: <CoffeeShopsIcon size={7} className="flex-shrink-0" />,
		};
	}
	if (isMusicVenueTitle(value)) {
		return {
			label: 'Music Venue',
			background: '#B7E5FF',
			icon: <MusicVenuesIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isMusicFestivalTitle(value)) {
		return {
			label: 'Music Festival',
			background: '#C1D6FF',
			icon: <FestivalsIcon size={12} className="flex-shrink-0" />,
		};
	}
	if (isWeddingPlannerTitle(value) || isWeddingVenueTitle(value)) {
		return {
			label: isWeddingVenueTitle(value) ? 'Wedding Venue' : 'Wedding Planner',
			background: '#FFF2BC',
			icon: <WeddingPlannersIcon size={12} className="flex-shrink-0" />,
		};
	}
	if (isWineBeerSpiritsTitle(value)) {
		return {
			label: getWineBeerSpiritsLabel(value) || 'Wine/Beer/Spirits',
			background: '#BFC4FF',
			icon: <WineBeerSpiritsIcon size={12} className="flex-shrink-0" />,
		};
	}

	return null;
};

const getOpportunityText = (email: InboundEmailWithRelations) =>
	[
		email.subject,
		getEmailSnippet(email),
		email.originalEmail?.subject,
		email.originalEmail?.message,
		email.campaign?.subject,
	]
		.filter(Boolean)
		.join(' ');

const extractOpportunityDateLabel = (text: string): string => {
	if (/\btomorrow\b/i.test(text)) return 'Tomorrow';
	if (/\btoday\b/i.test(text)) return 'Today';
	if (/\byesterday\b/i.test(text)) return 'Yesterday';

	const monthMatch = text.match(
		/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
	);
	if (monthMatch) {
		const monthIndex = MONTH_NAME_TO_INDEX[monthMatch[1].toLowerCase().replace('.', '')];
		const day = Number(monthMatch[2]);
		if (monthIndex != null && Number.isFinite(day) && day >= 1 && day <= 31) {
			return formatMonthDay(monthIndex, day);
		}
	}

	const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/);
	if (slashMatch) {
		const monthIndex = Number(slashMatch[1]) - 1;
		const day = Number(slashMatch[2]);
		if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
			return formatMonthDay(monthIndex, day);
		}
	}

	return 'Date TBD';
};

const normalizeOpportunityType = (value: string | null | undefined, dateLabel: string) => {
	let next = (value || '').replace(/^\s*(re|fwd?):\s*/i, '').trim();
	if (dateLabel !== 'Date TBD') {
		next = next.replace(new RegExp(`\\b${dateLabel.replace(/\s+/g, '\\s+')}\\b`, 'i'), '').trim();
	}
	next = next
		.replace(/\b(today|tomorrow|yesterday)\b/gi, '')
		.replace(
			/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/gi,
			''
		)
		.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '')
		.trim();

	next = next.replace(/\s{2,}/g, ' ').trim();
	return next || 'Opportunity';
};

const getOpportunityType = (email: InboundEmailWithRelations, opportunityDate: string) =>
	normalizeOpportunityType(
		email.originalEmail?.subject || email.campaign?.subject || email.subject,
		opportunityDate
	);

const getOpportunityThreadKey = (email: InboundEmailWithRelations) => {
	if (email.originalEmailId != null) return `original:${email.originalEmailId}`;
	return `${email.campaignId ?? 'none'}:${(email.sender || '').toLowerCase().trim()}`;
};

const inferOpportunityStatus = (email: InboundEmailWithRelations): OpportunityStatus | null => {
	const text = `${email.subject || ''} ${getEmailSnippet(email)}`.toLowerCase();

	if (
		/\b(pass|passed|declin(?:e|ed|ing)|not interested|not a fit|unavailable|can't|cannot|no longer)\b/.test(
			text
		) ||
		/\b(?:already|fully) booked\b/.test(text)
	) {
		return 'closed';
	}

	if (
		/\b(booked|confirmed|confirming|reserved)\b/.test(text) ||
		/\b(?:sounds good|let'?s do it|works for us|we'd love|we would love)\b/.test(text)
	) {
		return 'booked';
	}

	if (
		/\b(in progress|interested|available|tentative|pencil(?:ed)? in|hold(?:ing)? the date|checking|looking into|following up|follow up|send more|details|what dates|which date)\b/.test(
			text
		)
	) {
		return 'in-progress';
	}

	return null;
};

const buildOpportunityRow = (
	email: InboundEmailWithRelations,
	exchangeCount: number
): OpportunityRow | null => {
	const contact = email.contact;
	const city = contact?.city?.trim() || '';
	const stateAbbr = contact?.state
		? getStateAbbreviation(contact.state)?.trim().toUpperCase() || ''
		: '';
	const opportunityText = getOpportunityText(email);
	const opportunityDate = extractOpportunityDateLabel(opportunityText);
	const status = inferOpportunityStatus(email);
	if (!status) return null;

	return {
		id: email.id,
		status,
		contactLabel: getContactLabel(email),
		exchangeCount,
		folder: email.campaign?.name?.trim() || 'Campaign',
		categoryTitle: getContactCategoryTitle(email),
		city,
		location: [contact?.city?.trim(), stateAbbr].filter(Boolean).join(', '),
		stateAbbr,
		opportunityType: getOpportunityType(email, opportunityDate),
		opportunityDate,
		lastMessage: getEmailSnippet(email),
		lastReceivedLabel: formatOpportunityTimestamp(email.receivedAt),
	};
};

const buildMockOpportunityRow = (row: OpportunitiesMockRow, index: number): OpportunityRow => {
	const stateAbbr = (row.stateAbbr || '').trim().toUpperCase();
	const location = row.location?.trim() || '';
	return {
		id: -(index + 1),
		status: row.status ?? 'booked',
		contactLabel: row.contactLabel?.trim() || 'Mock Venue',
		exchangeCount: Math.max(0, row.exchangeCount ?? 1),
		folder: row.folder?.trim() || 'Campaign',
		categoryTitle: row.category?.trim() || '',
		city: getCityFromLocation(location, stateAbbr),
		location,
		stateAbbr,
		opportunityType: row.opportunityType?.trim() || 'Opportunity',
		opportunityDate: row.opportunityDate?.trim() || 'Date TBD',
		lastMessage: row.lastMessage?.trim() || '',
		lastReceivedLabel: row.lastReceivedLabel?.trim() || '',
	};
};

export const DashboardOpportunitiesWidget: FC<{
	enabled?: boolean;
	className?: string;
	mockState?: OpportunitiesMockState;
}> = ({ enabled = true, className, mockState }) => {
	const mockOverrideActive = mockState != null;
	const { data: inboundEmails, isLoading: isLoadingEmails } = useGetInboundEmails({
		enabled: enabled && !mockOverrideActive,
	});
	const isLoading = mockOverrideActive ? false : isLoadingEmails;
	const [activeStatus, setActiveStatus] = useState<OpportunityStatus | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	const threadExchangeCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		const threadsWithOriginal = new Set<string>();
		for (const email of inboundEmails ?? []) {
			const key = getOpportunityThreadKey(email);
			counts[key] = (counts[key] || 0) + 1;
			if (email.originalEmailId != null) threadsWithOriginal.add(key);
		}

		for (const key of threadsWithOriginal) {
			counts[key] = (counts[key] || 0) + 1;
		}

		return counts;
	}, [inboundEmails]);

	const opportunities = useMemo(() => {
		let rows: OpportunityRow[];
		if (mockOverrideActive) {
			rows = (mockState?.rows ?? []).map((row, index) => buildMockOpportunityRow(row, index));
		} else {
			const seenThreadKeys = new Set<string>();
			rows = [];
			const sortedEmails = [...(inboundEmails ?? [])].sort((a, b) => {
				const aMs = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
				const bMs = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
				return bMs - aMs;
			});

			for (const email of sortedEmails) {
				const threadKey = getOpportunityThreadKey(email);
				if (seenThreadKeys.has(threadKey)) continue;
				seenThreadKeys.add(threadKey);
				const row = buildOpportunityRow(email, Math.max(1, threadExchangeCounts[threadKey] || 1));
				if (row) rows.push(row);
			}
		}

		const q = searchQuery.trim().toLowerCase();
		return rows.filter((row) => {
			if (activeStatus && row.status !== activeStatus) return false;
			if (!q) return true;

			return [
				row.contactLabel,
				row.exchangeCount,
				row.folder,
				row.categoryTitle,
				row.city,
				row.location,
				row.opportunityType,
				row.opportunityDate,
				row.lastMessage,
				row.lastReceivedLabel,
			]
				.join(' ')
				.toLowerCase()
				.includes(q);
		});
	}, [activeStatus, inboundEmails, mockOverrideActive, mockState?.rows, searchQuery, threadExchangeCounts]);

	if (!enabled) return null;

	return (
		<div
			className={cn('flex flex-col', className)}
			style={{
				width: 'min(654px, calc(100vw - 32px))',
				height: '266px',
				borderRadius: '6px',
				background: '#D97676',
				padding: '9px 8px 8px',
				boxSizing: 'border-box',
			}}
		>
			<div className="flex items-center gap-[7px]">
				<div
					className="min-w-0 flex items-center gap-[8px]"
					style={{
						width: '346px',
						height: '22px',
						borderRadius: '6px',
						background: '#FFD5D5',
						padding: '0 11px',
						boxSizing: 'border-box',
						fontFamily: 'Inter, sans-serif',
						fontSize: '12.809px',
						fontStyle: 'normal',
						fontWeight: 500,
						lineHeight: '20.199px',
						color: '#000000',
					}}
				>
					<DashboardActionBarStarIcon width={16} height={16} style={{ color: '#E32222' }} />
					<span className="truncate">Opportunities</span>
				</div>

				<div
					className="flex items-center gap-[8px]"
					style={{
						width: '136px',
						height: '22px',
						borderRadius: '6px',
						background: '#FFFFFF',
						padding: '0 11px',
						boxSizing: 'border-box',
					}}
				>
					<SearchIconDesktop width={12} height={13} stroke="#000000" strokeWidth={2} />
					<input
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder="Search"
						className="min-w-0 placeholder:text-black placeholder:opacity-100"
						style={{
							flex: 1,
							height: '100%',
							border: 'none',
							outline: 'none',
							background: 'transparent',
							fontFamily: 'Inter, sans-serif',
							fontSize: '12.809px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '20.199px',
							color: '#000000',
						}}
					/>
				</div>
			</div>

			<div
				className="relative"
				onClick={() => setActiveStatus(null)}
				style={{
					height: '30px',
					fontFamily: 'Inter, sans-serif',
					fontSize: '12.809px',
					fontStyle: 'normal',
					fontWeight: 500,
					lineHeight: '20.199px',
				}}
			>
				{OPPORTUNITY_TABS.map((tab) => {
					const isActive = activeStatus === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							aria-pressed={isActive}
							onClick={(event) => {
								event.stopPropagation();
								setActiveStatus((current) => (current === tab.key ? null : tab.key));
							}}
							style={{
								position: 'absolute',
								left: `${tab.offsetLeft}px`,
								top: '7px',
								width: '80px',
								height: '15px',
								border: 'none',
								borderRadius: '3px',
								background: isActive ? STATUS_META[tab.key].tabFill : 'transparent',
								color: '#000000',
								font: 'inherit',
								padding: 0,
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			<CustomScrollbar
				className="flex-1 min-h-0 self-center"
				contentClassName="flex flex-col items-center"
				thumbWidth={4}
				thumbColor="#F0EEEE"
				trackColor="transparent"
				offsetRight={-2}
				lockHorizontalScroll
				style={{
					width: '639px',
					marginTop: '8px',
				}}
			>
				<div className="flex flex-col items-center gap-[5px] pb-[1px]">
					{isLoading ? (
						Array.from({ length: 3 }).map((_, index) => (
							<div
								key={`opportunity-loading-${index}`}
								style={{
									width: '639px',
									height: '48px',
									borderRadius: '6.389px',
									background: '#FEFEFE',
									opacity: 0.65,
								}}
							/>
						))
					) : opportunities.length === 0 ? (
						<div
							className="flex items-center justify-center text-center"
							style={{
								width: '639px',
								height: '48px',
								borderRadius: '6.389px',
								background: '#FEFEFE',
								fontFamily: 'Inter, sans-serif',
								fontSize: '14px',
								fontWeight: 600,
								color: '#000000',
							}}
						>
							{activeStatus
								? `No ${STATUS_META[activeStatus].label.toLowerCase()} opportunities yet`
								: 'No opportunities yet'}
						</div>
					) : (
						opportunities.map((opportunity) => {
							const statusMeta = STATUS_META[opportunity.status];
							const categoryMeta = getOpportunityCategoryMeta(opportunity.categoryTitle);
							return (
								<button
									key={opportunity.id}
									type="button"
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: '639px',
										height: '48px',
										borderRadius: '6.389px',
										border: 'none',
										background: '#FEFEFE',
										boxShadow: '0px 1px 0px rgba(0, 0, 0, 0.05)',
										overflow: 'hidden',
										position: 'relative',
										display: 'block',
										appearance: 'none',
										padding: 0,
										fontFamily: 'Inter, sans-serif',
										color: '#000000',
									}}
								>
									<span
										aria-hidden="true"
										style={{
											position: 'absolute',
											left: 0,
											top: 0,
											width: '6px',
											height: '100%',
											background: statusMeta.accent,
										}}
									/>

									<span
										style={{
											position: 'absolute',
											left: '27px',
											top: '7px',
											width: '190px',
											height: '17.186px',
											display: 'flex',
											alignItems: 'baseline',
											gap: '5px',
											overflow: 'hidden',
											color: '#000000',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 600,
											lineHeight: '17.186px',
										}}
									>
										<span style={{ ...fadeTextStyle, minWidth: 0 }}>
											{opportunity.contactLabel}
										</span>
										<span style={{ flex: '0 0 auto', fontWeight: 400 }}>
											{opportunity.exchangeCount}
										</span>
									</span>

									<span
										style={{
											position: 'absolute',
											left: '27px',
											bottom: '9px',
											width: '80px',
											height: '15px',
											borderRadius: '3px',
											background: '#B9BBF1',
											display: 'flex',
											alignItems: 'center',
											overflow: 'hidden',
											boxSizing: 'border-box',
											padding: '0 4px',
										}}
									>
										<DashboardActionBarFolderIcon
											width={20}
											height={12}
											style={{ color: '#C847CB', flex: '0 0 auto' }}
										/>
										<span
											style={{
												...fadeTextStyle,
												minWidth: 0,
												flex: 1,
												marginLeft: '6px',
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												fontSize: '13.854px',
												fontStyle: 'normal',
												fontWeight: 500,
												lineHeight: '17.186px',
											}}
										>
											{opportunity.folder}
										</span>
									</span>

									<div
										style={{
											position: 'absolute',
											left: '115px',
											bottom: '9px',
											right: '409px',
											height: '15px',
											display: 'flex',
											alignItems: 'center',
											gap: '5px',
											overflow: 'hidden',
										}}
									>
										{categoryMeta && (
											<span
												aria-label={categoryMeta.label}
												title={categoryMeta.label}
												style={{
													width: '24px',
													height: '15px',
													borderRadius: '5.6px',
													border: '1px solid #000000',
													background: categoryMeta.background,
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													boxSizing: 'border-box',
													flex: '0 0 auto',
													overflow: 'hidden',
												}}
											>
												{categoryMeta.icon}
											</span>
										)}
										{opportunity.stateAbbr && (
											<span
												style={{
													minWidth: '27px',
													height: '15px',
													borderRadius: '5.6px',
													border: '1px solid #000000',
													backgroundColor:
														stateBadgeColorMap[opportunity.stateAbbr] || '#F8F1C8',
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													boxSizing: 'border-box',
													flex: '0 0 auto',
													color: '#000000',
													fontFamily: 'Inter, sans-serif',
													fontSize: '12px',
													fontWeight: 600,
													lineHeight: 1,
												}}
											>
												{opportunity.stateAbbr}
											</span>
										)}
										{opportunity.city && (
											<span
												style={{
													...fadeTextStyle,
													minWidth: 0,
													color: '#000000',
													fontFamily: 'Inter, sans-serif',
													fontSize: '10px',
													fontWeight: 600,
													lineHeight: '14px',
												}}
											>
												{opportunity.city}
											</span>
										)}
									</div>

									<div
										style={{
											position: 'absolute',
											left: '232px',
											top: '5px',
											right: '269.118px',
											height: '20px',
											overflow: 'hidden',
											whiteSpace: 'nowrap',
											color: '#000000',
											textAlign: 'center',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 400,
											lineHeight: '20px',
										}}
									>
										{opportunity.opportunityType}
									</div>

									<div
										style={{
											position: 'absolute',
											right: '137px',
											top: '2px',
											width: '124.118px',
											height: '19.936px',
											borderRadius: '4.502px',
											background: '#B6E8F1',
											overflow: 'hidden',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											color: '#000000',
											textAlign: 'center',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 400,
											lineHeight: '20px',
										}}
									>
										<span style={{ ...fadeTextStyle, width: '100%' }}>
											{opportunity.opportunityDate}
										</span>
									</div>

									<div
										style={{
											position: 'absolute',
											left: '232px',
											top: '25px',
											right: '100px',
											height: '20px',
											overflow: 'hidden',
											color: '#000000',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 200,
											lineHeight: '20px',
										}}
									>
										{opportunity.lastMessage || 'Reply received. Add details as this opportunity develops.'}
									</div>

									<div
										style={{
											position: 'absolute',
											right: '10px',
											top: '25px',
											width: '82px',
											height: '20px',
											color: '#000000',
											textAlign: 'right',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 600,
											lineHeight: '20px',
											whiteSpace: 'nowrap',
										}}
									>
										{opportunity.lastReceivedLabel}
									</div>
								</button>
							);
						})
					)}
				</div>
			</CustomScrollbar>
		</div>
	);
};

export default DashboardOpportunitiesWidget;
