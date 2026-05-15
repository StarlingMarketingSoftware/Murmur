'use client';

import { FC, useMemo, useState } from 'react';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils/ui';

export type OpportunityStatus = 'booked' | 'closed' | 'in-progress';

type OpportunityRow = {
	id: number;
	status: OpportunityStatus;
	contactLabel: string;
	exchangeCount: number;
	folder: string;
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

const OPPORTUNITY_TABS: Array<{ key: OpportunityStatus; label: string }> = [
	{ key: 'booked', label: 'Booked' },
	{ key: 'closed', label: 'Closed' },
	{ key: 'in-progress', label: 'In Progress' },
];

const STATUS_META: Record<
	OpportunityStatus,
	{ label: string; chipFill: string; rowFill: string; accent: string; border: string }
> = {
	booked: {
		label: 'Booked',
		chipFill: '#80F58A',
		rowFill: '#FFFFFF',
		accent: '#88F08A',
		border: 'transparent',
	},
	closed: {
		label: 'Closed',
		chipFill: '#F0A1A6',
		rowFill: '#E57C82',
		accent: '#C95055',
		border: '#321111',
	},
	'in-progress': {
		label: 'In Progress',
		chipFill: '#BDE7EE',
		rowFill: '#FFFFFF',
		accent: '#F2D782',
		border: 'transparent',
	},
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
	return {
		id: -(index + 1),
		status: row.status ?? 'booked',
		contactLabel: row.contactLabel?.trim() || 'Mock Venue',
		exchangeCount: Math.max(0, row.exchangeCount ?? 1),
		folder: row.folder?.trim() || 'Campaign',
		location: row.location?.trim() || '',
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
	const [activeStatus, setActiveStatus] = useState<OpportunityStatus>('booked');
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
			if (row.status !== activeStatus) return false;
			if (!q) return true;

			return [
				row.contactLabel,
				row.exchangeCount,
				row.folder,
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
				className="grid items-center"
				style={{
					gridTemplateColumns: 'repeat(3, 1fr)',
					columnGap: '28px',
					padding: '8px 18px 7px',
					fontFamily: 'Inter, sans-serif',
					fontSize: '16px',
					fontWeight: 700,
					lineHeight: 1,
				}}
			>
				{OPPORTUNITY_TABS.map((tab) => {
					const isActive = activeStatus === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							aria-pressed={isActive}
							onClick={() => setActiveStatus(tab.key)}
							style={{
								height: '20px',
								border: 'none',
								borderRadius: '5px',
								background: isActive ? STATUS_META[tab.key].chipFill : 'transparent',
								color: '#000000',
								font: 'inherit',
								padding: 0,
								cursor: 'pointer',
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			<CustomScrollbar
				className="flex-1 min-h-0"
				contentClassName="flex flex-col gap-[8px] pr-[4px]"
				thumbWidth={4}
				thumbColor="#F0EEEE"
				trackColor="transparent"
				offsetRight={-2}
				lockHorizontalScroll
			>
				<div className="flex flex-col gap-[8px] pb-[1px]">
					{isLoading ? (
						Array.from({ length: 3 }).map((_, index) => (
							<div
								key={`opportunity-loading-${index}`}
								style={{
									width: '100%',
									height: '55px',
									borderRadius: '7px',
									background: '#FFFFFF',
									opacity: 0.65,
								}}
							/>
						))
					) : opportunities.length === 0 ? (
						<div
							className="flex items-center justify-center text-center"
							style={{
								width: '100%',
								height: '55px',
								borderRadius: '7px',
								background: '#FFFFFF',
								fontFamily: 'Inter, sans-serif',
								fontSize: '14px',
								fontWeight: 600,
								color: '#000000',
							}}
						>
							No {STATUS_META[activeStatus].label.toLowerCase()} opportunities yet
						</div>
					) : (
						opportunities.map((opportunity) => {
							const statusMeta = STATUS_META[opportunity.status];
							return (
								<button
									key={opportunity.id}
									type="button"
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: '100%',
										height: '55px',
										borderRadius: '7px',
										border:
											statusMeta.border === 'transparent'
												? 'none'
												: `1px solid ${statusMeta.border}`,
										background: statusMeta.rowFill,
										boxShadow: '0px 1px 0px rgba(0, 0, 0, 0.05)',
										overflow: 'hidden',
										display: 'grid',
										gridTemplateColumns: '218px minmax(0, 1fr) 68px',
										alignItems: 'center',
										gap: '10px',
										paddingRight: '10px',
										fontFamily: 'Inter, sans-serif',
									}}
								>
									<div className="min-w-0 h-full flex">
										<span
											aria-hidden="true"
											style={{
												width: '8px',
												height: '100%',
												background: statusMeta.accent,
												flexShrink: 0,
											}}
										/>
										<div className="min-w-0 flex flex-col justify-center pl-[11px]">
											<div className="flex items-baseline gap-[6px] min-w-0">
												<span className="text-[16px] leading-[18px] font-extrabold text-black truncate">
													{opportunity.contactLabel}
												</span>
												<span className="text-[12px] leading-[18px] text-black flex-shrink-0">
													{opportunity.exchangeCount}
												</span>
											</div>

											<div className="mt-[4px] flex items-center gap-[6px] min-w-0">
												<span
													className="min-w-0 inline-flex items-center gap-[4px]"
													style={{
														maxWidth: '116px',
														height: '18px',
														borderRadius: '4px',
														background: '#B8B5EC',
														padding: '0 7px',
														fontSize: '13px',
														fontWeight: 700,
														lineHeight: 1,
														color: '#000000',
													}}
												>
													<span
														aria-hidden="true"
														style={{
															width: '20px',
															height: '11px',
															borderRadius: '2px',
															background: '#C847CB',
															boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.16)',
															flexShrink: 0,
														}}
													/>
													<span className="truncate">{opportunity.folder}</span>
												</span>
												{opportunity.stateAbbr && (
													<span
														className="inline-flex items-center justify-center h-[18px] rounded-[5px] border border-black text-[12px] leading-none font-bold flex-shrink-0"
														style={{
															minWidth: '27px',
															backgroundColor:
																stateBadgeColorMap[opportunity.stateAbbr] || '#F8F1C8',
														}}
													>
														{opportunity.stateAbbr}
													</span>
												)}
												{opportunity.location && (
													<span className="text-[11px] leading-[14px] font-bold text-black truncate">
														{opportunity.location}
													</span>
												)}
											</div>
										</div>
									</div>

									<div className="min-w-0">
										<div className="flex items-center gap-[6px] min-w-0 text-[16px] leading-[18px] text-black">
											<span className="truncate">{opportunity.opportunityType}</span>
											<span
												className="inline-flex items-center h-[21px] rounded-[5px] min-w-0 flex-shrink-0"
												style={{
													maxWidth: '122px',
													background: statusMeta.chipFill,
													padding: '0 8px',
													fontSize: '15px',
													lineHeight: 1,
													color: '#000000',
												}}
											>
												<span className="truncate">{opportunity.opportunityDate}</span>
											</span>
										</div>
										<div className="mt-[4px] text-[13px] leading-[15px] text-black/75 truncate">
											{opportunity.lastMessage || 'Reply received. Add details as this opportunity develops.'}
										</div>
									</div>

									<div className="text-[14px] leading-[16px] font-extrabold text-black text-right whitespace-nowrap">
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
