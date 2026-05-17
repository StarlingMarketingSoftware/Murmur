'use client';

import { FC, useMemo, useState } from 'react';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import type { InboundEmailWithRelations } from '@/types';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import { cn } from '@/utils/ui';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { EmailStatus } from '@/constants/prismaEnums';
import {
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

type DashboardResponsesTab = 'responses' | 'sent' | 'opportunities';

export type ResponsesMockTab = 'responses' | 'sent' | 'opportunities';

export type ResponsesMockRow = {
	tab?: ResponsesMockTab;
	senderEmail?: string;
	senderName?: string;
	subject?: string;
	body?: string;
	receivedIso?: string;
	withContact?: boolean;
	contactFirstName?: string;
	contactLastName?: string;
	contactCompany?: string;
	contactHeadline?: string;
	contactState?: string;
	contactCity?: string;
	campaignName?: string;
};

export type ResponsesMockState = {
	rows?: ResponsesMockRow[];
};

const buildMockInboundEmail = (
	row: ResponsesMockRow,
	index: number
): InboundEmailWithRelations & { isSent?: boolean } => {
	const fallbackTime = Date.now() - (index + 1) * 1000 * 60 * 47;
	const receivedAt =
		row.receivedIso && !Number.isNaN(new Date(row.receivedIso).getTime())
			? new Date(row.receivedIso)
			: new Date(fallbackTime);
	const body = row.body?.trim() || '';
	const wantsContact =
		row.withContact ??
		Boolean(
			row.contactFirstName ||
				row.contactLastName ||
				row.contactCompany ||
				row.contactHeadline ||
				row.contactState ||
				row.contactCity
		);
	const contact = wantsContact
		? ({
				id: -(index + 1),
				email: row.senderEmail?.trim() || '',
				firstName: row.contactFirstName?.trim() || '',
				lastName: row.contactLastName?.trim() || '',
				company: row.contactCompany?.trim() || '',
				headline: row.contactHeadline?.trim() || '',
				title: row.contactHeadline?.trim() || '',
				state: row.contactState?.trim() || '',
				city: row.contactCity?.trim() || '',
			} as any)
		: null;
	const campaign = row.campaignName?.trim()
		? ({ id: -(index + 1), name: row.campaignName.trim() } as any)
		: null;
	const isSent = row.tab === 'sent';

	return {
		id: -(index + 1),
		sender: row.senderEmail?.trim() || '',
		senderName: row.senderName?.trim() || '',
		recipient: '',
		subject: row.subject?.trim() || '',
		bodyPlain: body,
		bodyHtml: body,
		strippedText: body,
		receivedAt,
		contact,
		campaign,
		originalEmail: null,
		isSent,
	} as unknown as InboundEmailWithRelations & { isSent?: boolean };
};

const RESPONSE_TOGGLE_TABS: Array<{
	key: DashboardResponsesTab;
	label: string;
	width: number;
	activeFill: string;
}> = [
	{ key: 'responses', label: 'Responses', width: 104, activeFill: '#98DAFC' },
	{ key: 'sent', label: 'Sent', width: 97, activeFill: '#B0E0A6' },
	{ key: 'opportunities', label: 'Opportunities', width: 145, activeFill: '#FFD5D5' },
];

const RESPONSE_WIDGET_BACKGROUND_BY_TAB: Record<DashboardResponsesTab, string> = {
	responses: '#84C1E2',
	sent: '#6DB97B',
	opportunities: '#D97676',
};

const getResponseToggleDividerColor = (
	activeTab: DashboardResponsesTab,
	leftTab: DashboardResponsesTab,
	rightTab: DashboardResponsesTab
) => (activeTab === leftTab || activeTab === rightTab ? '#000000' : 'rgba(0,0,0,0.18)');

const getDayOrdinalSuffix = (day: number) => {
	// 11, 12, 13 are special-cased
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

const formatInboxTimestamp = (value: string | Date | null | undefined) => {
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

const getEmailSnippet = (email: InboundEmailWithRelations) => {
	const raw = email.strippedText || email.bodyPlain || email.bodyHtml || '';
	const withoutHtml = raw.replace(/<[^>]*>/g, ' ');
	return withoutHtml.replace(/\s+/g, ' ').trim();
};

const getCanonicalSenderLabel = (email: InboundEmailWithRelations) => {
	const contact: any = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const legacyName: string | undefined =
		contact && typeof contact.name === 'string' ? contact.name : undefined;

	return (
		fullName ||
		legacyName?.trim() ||
		contact?.company?.trim() ||
		email.senderName?.trim() ||
		email.sender?.trim() ||
		'Unknown sender'
	);
};

const getSecondaryCompanyLabel = (email: InboundEmailWithRelations) => {
	const contact: any = email.contact;
	if (!contact) return null;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const legacyName: string | undefined =
		contact && typeof contact.name === 'string' ? contact.name : undefined;

	const hasName = Boolean(fullName) || Boolean(legacyName?.trim());
	const company: string | undefined =
		contact && typeof contact.company === 'string' ? contact.company : undefined;

	if (!hasName) return null;
	if (!company || !company.trim()) return null;
	return company.trim();
};

const getCategoryIcon = (email: InboundEmailWithRelations) => {
	const contact: any = email.contact;
	const headline: string = (contact?.headline || contact?.title || '').trim();
	if (!headline) return null;

	if (isRestaurantTitle(headline)) return <RestaurantsIcon size={14} className="flex-shrink-0" />;
	if (isCoffeeShopTitle(headline)) return <CoffeeShopsIcon size={8} className="flex-shrink-0" />;
	if (isMusicVenueTitle(headline)) return <MusicVenuesIcon size={14} className="flex-shrink-0" />;
	if (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) {
		return <WeddingPlannersIcon size={14} className="flex-shrink-0" />;
	}
	if (isWineBeerSpiritsTitle(headline)) {
		return <WineBeerSpiritsIcon size={14} className="flex-shrink-0" />;
	}

	return null;
};

const isOpportunityEmail = (email: InboundEmailWithRelations) => {
	const text = `${email.subject || ''} ${getEmailSnippet(email)}`.toLowerCase();
	return (
		/\b(pass|passed|declin(?:e|ed|ing)|not interested|not a fit|unavailable|can't|cannot|no longer)\b/.test(
			text
		) ||
		/\b(?:already|fully) booked\b/.test(text) ||
		/\b(booked|confirmed|confirming|reserved)\b/.test(text) ||
		/\b(?:sounds good|let'?s do it|works for us|we'd love|we would love)\b/.test(text) ||
		/\b(in progress|interested|available|tentative|pencil(?:ed)? in|hold(?:ing)? the date|checking|looking into|following up|follow up|send more|details|what dates|which date)\b/.test(
			text
		)
	);
};

export const DashboardResponsesWidget: FC<{
	enabled?: boolean;
	className?: string;
	mockState?: ResponsesMockState;
}> = ({ enabled = true, className, mockState }) => {
	const mockOverrideActive = mockState != null;
	const { data: inboundEmails, isLoading: isLoadingInboundEmails } = useGetInboundEmails({
		enabled: enabled && !mockOverrideActive,
	});
	const [searchQuery, setSearchQuery] = useState('');
	const [activeTab, setActiveTab] = useState<DashboardResponsesTab>('responses');
	const [openedEmailIds, setOpenedEmailIds] = useState<Record<string, true>>({});
	const { data: sentEmails, isLoading: isLoadingSentEmails } = useGetEmails({
		enabled: enabled && !mockOverrideActive && activeTab === 'sent',
		filters: { status: EmailStatus.sent },
	});

	const normalizedSentEmails = useMemo(
		() =>
			(sentEmails ?? []).map(
				(email) =>
					({
						id: email.id,
						sender: email.contact?.email || '',
						senderName: email.contact
							? `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim()
							: '',
						recipient: '',
						subject: email.subject || '',
						bodyPlain: email.message || '',
						bodyHtml: email.message || '',
						strippedText: email.message?.replace(/<[^>]*>/g, '') || '',
						receivedAt: email.sentAt || email.createdAt,
						contact: email.contact,
						campaign: null,
						originalEmail: null,
						isSent: true,
					} as InboundEmailWithRelations & { isSent?: boolean })
			),
		[sentEmails]
	);

	const mockEmails = useMemo(() => {
		if (!mockOverrideActive) return null;
		const rows = mockState?.rows ?? [];
		return rows.map((row, index) => ({
			tab: (row.tab ?? 'responses') as ResponsesMockTab,
			email: buildMockInboundEmail(row, index),
		}));
	}, [mockOverrideActive, mockState?.rows]);

	const displayEmails = useMemo(() => {
		if (mockOverrideActive) {
			const all = mockEmails ?? [];
			if (activeTab === 'sent') return all.filter((m) => m.tab === 'sent').map((m) => m.email);
			if (activeTab === 'opportunities') {
				return all.filter((m) => m.tab === 'opportunities').map((m) => m.email);
			}
			// Responses tab shows everything that is not "sent" — including opportunities,
			// matching real-data behavior where any inbound reply also appears here.
			return all.filter((m) => m.tab !== 'sent').map((m) => m.email);
		}

		if (activeTab === 'sent') return normalizedSentEmails;

		const list = [...(inboundEmails ?? [])];
		if (activeTab === 'opportunities') return list.filter(isOpportunityEmail);

		return list;
	}, [activeTab, inboundEmails, mockEmails, mockOverrideActive, normalizedSentEmails]);

	const isLoading = mockOverrideActive
		? false
		: activeTab === 'sent'
		? isLoadingSentEmails
		: isLoadingInboundEmails;
	const emptyMessage =
		activeTab === 'sent'
			? 'No sent emails yet'
			: activeTab === 'opportunities'
			? 'No opportunities yet'
			: 'No responses yet';

	const senderCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const email of displayEmails) {
			const key = (email.sender || '').toLowerCase().trim();
			if (!key) continue;
			counts[key] = (counts[key] || 0) + 1;
		}
		return counts;
	}, [displayEmails]);

	const visibleEmails = useMemo(() => {
		const list = [...displayEmails];

		// Sort newest-first (defensive: hook ordering isn't guaranteed).
		list.sort((a, b) => {
			const aMs = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
			const bMs = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
			return bMs - aMs;
		});

		const q = searchQuery.trim().toLowerCase();
		if (!q) return list;

		return list.filter((email) => {
			const sender = (email.sender || '').toLowerCase();
			const senderName = (email.senderName || '').toLowerCase();
			const subject = (email.subject || '').toLowerCase();
			const snippet = getEmailSnippet(email).toLowerCase();
			const company = (getSecondaryCompanyLabel(email) || '').toLowerCase();
			const canonical = getCanonicalSenderLabel(email).toLowerCase();

			return (
				sender.includes(q) ||
				senderName.includes(q) ||
				canonical.includes(q) ||
				company.includes(q) ||
				subject.includes(q) ||
				snippet.includes(q)
			);
		});
	}, [displayEmails, searchQuery]);

	if (!enabled) return null;

	return (
		<div
			className={cn('flex flex-col items-center', className)}
			style={{
				width: '654px',
				height: '266px',
				boxSizing: 'border-box',
				borderRadius: '8px',
				backgroundColor: RESPONSE_WIDGET_BACKGROUND_BY_TAB[activeTab],
				paddingTop: '9px',
				paddingBottom: '6px',
			}}
		>
			{/* Top controls */}
			<div
				style={{
					width: '639px',
					height: '22px',
					display: 'flex',
					alignItems: 'center',
					gap: '7px',
				}}
			>
				<div
					style={{
						position: 'relative',
						width: '346px',
						height: '22px',
						borderRadius: '6px',
						backgroundColor: '#FFFFFF',
						display: 'grid',
						gridTemplateColumns: RESPONSE_TOGGLE_TABS.map((tab) => `${tab.width}px`).join(' '),
						overflow: 'hidden',
						fontFamily: 'Inter, sans-serif',
						fontSize: '14px',
						fontWeight: 500,
						lineHeight: '20px',
						color: '#000000',
					}}
				>
					{RESPONSE_TOGGLE_TABS.map((tab, index) => {
						const isActive = activeTab === tab.key;
						const previousTab = RESPONSE_TOGGLE_TABS[index - 1]?.key;
						return (
							<button
								key={tab.key}
								type="button"
								aria-pressed={isActive}
								onClick={() => setActiveTab(tab.key)}
								style={{
									width: '100%',
									height: '100%',
									alignSelf: 'stretch',
									justifySelf: 'stretch',
									border: 'none',
									borderLeft: previousTab
										? `1px solid ${getResponseToggleDividerColor(activeTab, previousTab, tab.key)}`
										: 'none',
									boxSizing: 'border-box',
									background: isActive ? tab.activeFill : '#FFFFFF',
									font: 'inherit',
									color: 'inherit',
									padding: 0,
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: tab.key === 'opportunities' ? '7px' : '0px',
									whiteSpace: 'nowrap',
								}}
							>
								{tab.key === 'opportunities' && (
									<DashboardActionBarStarIcon
										width={15}
										height={15}
										style={{ color: '#E32222', flexShrink: 0 }}
									/>
								)}
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>

				<div
					style={{
						width: '136px',
						height: '22px',
						borderRadius: '6px',
						backgroundColor: '#FFFFFF',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						paddingLeft: '10px',
						paddingRight: '10px',
						boxSizing: 'border-box',
					}}
				>
					<span style={{ display: 'flex', flexShrink: 0 }}>
						<SearchIconDesktop width={16} height={16} stroke="black" strokeWidth={2} />
					</span>
					<input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search Mail"
						className="min-w-0 placeholder:text-black placeholder:opacity-100"
						style={{
							flex: 1,
							height: '100%',
							border: 'none',
							outline: 'none',
							background: 'transparent',
							fontFamily: 'Inter, sans-serif',
							fontSize: '14px',
							fontWeight: 500,
							lineHeight: '20px',
							color: '#000000',
							padding: 0,
						}}
					/>
				</div>
			</div>

			{/* Rows list */}
			<CustomScrollbar
				className="w-full flex-1 min-h-0"
				contentClassName="flex flex-col items-center"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={0}
				lockHorizontalScroll
				style={{
					marginTop: '9px',
				}}
			>
				{/* Blue gaps between rows */}
				<div className="w-full flex flex-col items-center gap-[6px] pb-[6px]">
					{isLoading ? (
						Array.from({ length: 3 }).map((_, idx) => (
							<div
								key={`responses-loading-${idx}`}
								style={{
									width: '639px',
									height: '48px',
									borderRadius: '6.389px',
									backgroundColor: '#FEFEFE',
									opacity: 0.6,
								}}
							/>
						))
					) : visibleEmails.length === 0 ? (
						<div
							className="flex items-center justify-center"
							style={{
								width: '639px',
								height: '48px',
								borderRadius: '6.389px',
								backgroundColor: '#FEFEFE',
								fontFamily: 'Inter, sans-serif',
								fontSize: '14px',
								fontWeight: 500,
								color: '#000000',
							}}
						>
							{emptyMessage}
						</div>
					) : (
						visibleEmails.map((email) => {
							const rowKey = `${activeTab}:${email.id}`;
							const senderLabel = getCanonicalSenderLabel(email);
							const senderKey = (email.sender || '').toLowerCase().trim();
							const senderCount = senderKey ? senderCounts[senderKey] || 0 : 0;
							const subject = email.subject?.trim() || '(No Subject)';
							const snippet = getEmailSnippet(email);
							const timeLabel = formatInboxTimestamp(email.receivedAt);

							const companyLabel = getSecondaryCompanyLabel(email);
							const stateAbbr = email.contact?.state
								? getStateAbbreviation(email.contact.state)?.trim().toUpperCase() || ''
								: '';
							const categoryIcon = getCategoryIcon(email);

							const isOpened = openedEmailIds[rowKey] === true;
							const rowFill = isOpened ? '#F4F4F4' : '#FEFEFE';

							return (
								<button
									key={rowKey}
									type="button"
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: '639px',
										height: '48px',
										borderRadius: '6.389px',
										backgroundColor: rowFill,
										border: 'none',
										boxShadow: '0px 1px 0px rgba(0,0,0,0.05)',
										paddingLeft: '12px',
										paddingRight: '12px',
										display: 'grid',
										gridTemplateColumns: '176px 1fr auto',
										gap: '12px',
										alignItems: 'center',
									}}
									onClick={() => {
										setOpenedEmailIds((prev) => {
											if (prev[rowKey]) return prev;
											return { ...prev, [rowKey]: true };
										});
									}}
								>
									{/* Sender + badges */}
									<div className="min-w-0">
										<div className="flex items-baseline gap-[8px] min-w-0">
											<span className="font-semibold text-[14px] leading-[16px] text-black truncate">
												{senderLabel}
											</span>
											{senderCount > 1 && (
												<span className="text-[13px] leading-[16px] text-[#6B6B6B] flex-shrink-0">
													{senderCount}
												</span>
											)}
										</div>

										<div className="mt-[2px] flex items-center gap-[6px]">
											{categoryIcon ? (
												<span className="text-black flex items-center">{categoryIcon}</span>
											) : (
												<span className="inline-flex w-[14px]" aria-hidden="true" />
											)}

											{stateAbbr ? (
												<span
													className="inline-flex items-center justify-center w-[40px] h-[19px] rounded-[5.6px] border border-black text-[16px] leading-none font-bold flex-shrink-0"
													style={{
														backgroundColor:
															stateBadgeColorMap[stateAbbr] || 'transparent',
													}}
												>
													{stateAbbr}
												</span>
											) : (
												<span className="inline-flex w-[40px]" aria-hidden="true" />
											)}

										</div>
									</div>

									{/* Subject + preview */}
									<div className="min-w-0">
										<div className="text-[14px] leading-[16px] text-black truncate">
											{subject}
										</div>
										<div className="text-[12px] leading-[14px] truncate">
											{companyLabel ? (
												<>
													<span className="text-black">{companyLabel}</span>
													<span className="text-[#7A7A7A]">{snippet ? ` ${snippet}` : ''}</span>
												</>
											) : (
												<span className="text-[#7A7A7A]">{snippet}</span>
											)}
										</div>
									</div>

									{/* Timestamp */}
									<div className="text-[14px] leading-[16px] font-medium text-black whitespace-nowrap">
										{timeLabel}
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

export default DashboardResponsesWidget;
