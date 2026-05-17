'use client';

import {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
} from 'react';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import type { InboundEmailWithRelations } from '@/types';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { cn } from '@/utils/ui';
import { EmailStatus } from '@/constants/prismaEnums';
import { DashboardOpportunitiesContent } from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';

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
	const contactId = contact?.id ?? null;
	const campaignId = campaign?.id ?? null;

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
		contactId,
		contact,
		campaignId,
		campaign,
		originalEmail: null,
		originalEmailId: null,
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

const fadeTextStyle: CSSProperties = {
	overflow: 'hidden',
	whiteSpace: 'nowrap',
};

const FadeOverflowText: FC<{
	text: string;
	style?: CSSProperties;
	className?: string;
	fadePx?: number;
	title?: string;
}> = ({ text, style, className, fadePx = 16, title }) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		if (el.parentElement) ro.observe(el.parentElement);

		return () => ro.disconnect();
	}, [measure]);

	const safeFadePx = Math.max(0, fadePx);
	const overflowFadeStyle: CSSProperties | undefined = isOverflowing
		? {
				WebkitMaskImage: `linear-gradient(90deg, #000 calc(100% - ${safeFadePx}px), transparent)`,
				maskImage: `linear-gradient(90deg, #000 calc(100% - ${safeFadePx}px), transparent)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={className}
			title={title}
			style={{ ...fadeTextStyle, ...style, ...overflowFadeStyle }}
		>
			{text}
		</span>
	);
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

const getCampaignLabel = (email: InboundEmailWithRelations) =>
	email.campaign?.name?.trim() || 'Campaign';

const getResponseThreadKey = (email: InboundEmailWithRelations) => {
	const contactId = email.contactId ?? email.contact?.id;
	const participant = (email.sender || email.contact?.email || getCanonicalSenderLabel(email))
		.toLowerCase()
		.trim();
	return `${email.campaignId ?? email.campaign?.id ?? 'none'}:${contactId ?? (participant || email.id)}`;
};

export const DashboardResponsesWidget: FC<{
	enabled?: boolean;
	className?: string;
	mockState?: ResponsesMockState;
}> = ({ enabled = true, className, mockState }) => {
	const mockOverrideActive = mockState != null;
	const [searchQuery, setSearchQuery] = useState('');
	const [activeTab, setActiveTab] = useState<DashboardResponsesTab>('responses');
	const [openedEmailIds, setOpenedEmailIds] = useState<Record<string, true>>({});
	const { data: inboundEmails, isLoading: isLoadingInboundEmails } = useGetInboundEmails({
		enabled: enabled && !mockOverrideActive && activeTab !== 'opportunities',
	});
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
						contactId: email.contactId,
						contact: email.contact,
						campaignId: email.campaignId,
						campaign: email.campaign,
						originalEmail: null,
						originalEmailId: null,
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

	const opportunityMockEmails = useMemo(() => {
		if (!mockOverrideActive) return undefined;
		return (mockEmails ?? [])
			.filter((m) => m.tab === 'opportunities')
			.map((m) => m.email);
	}, [mockEmails, mockOverrideActive]);

	const displayEmails = useMemo(() => {
		if (mockOverrideActive) {
			const all = mockEmails ?? [];
			if (activeTab === 'sent') return all.filter((m) => m.tab === 'sent').map((m) => m.email);
			if (activeTab === 'opportunities') return [];
			// Responses tab shows everything that is not "sent" — including opportunities,
			// matching real-data behavior where any inbound reply also appears here.
			return all.filter((m) => m.tab !== 'sent').map((m) => m.email);
		}

		if (activeTab === 'sent') return normalizedSentEmails;
		if (activeTab === 'opportunities') return [];

		return [...(inboundEmails ?? [])];
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

	const exchangeCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		const threadsWithOriginal = new Set<string>();
		for (const email of displayEmails) {
			const key = getResponseThreadKey(email);
			counts[key] = (counts[key] || 0) + 1;
			if (email.originalEmailId != null) threadsWithOriginal.add(key);
		}

		for (const key of threadsWithOriginal) {
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
						placeholder={activeTab === 'opportunities' ? 'Search' : 'Search Mail'}
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
			{activeTab === 'opportunities' ? (
				<DashboardOpportunitiesContent
					enabled={enabled}
					searchQuery={searchQuery}
					inboundEmailsOverride={opportunityMockEmails}
				/>
			) : (
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
							const exchangeKey = getResponseThreadKey(email);
							const exchangeCount = Math.max(1, exchangeCounts[exchangeKey] || 1);
							const campaignLabel = getCampaignLabel(email);
							const subject = email.subject?.trim() || '(No Subject)';
							const snippet = getEmailSnippet(email);
							const timeLabel = formatInboxTimestamp(email.receivedAt);

							const isOpened = openedEmailIds[rowKey] === true;
							const rowFill = isOpened ? '#E6E6E6' : '#FEFEFE';

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
										boxSizing: 'border-box',
										overflow: 'hidden',
										padding: '7px 31px 9px 27px',
										display: 'flex',
										alignItems: 'flex-start',
										gap: '18px',
										fontFamily: 'Inter, sans-serif',
										color: '#000000',
										cursor: 'pointer',
									}}
									onClick={() => {
										setOpenedEmailIds((prev) => {
											if (prev[rowKey]) return prev;
											return { ...prev, [rowKey]: true };
										});
									}}
								>
									{/* Sender + campaign */}
									<div
										style={{
											flex: '0 1 auto',
											minWidth: '80px',
											maxWidth: '190px',
											height: '32px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'space-between',
											overflow: 'hidden',
										}}
									>
										<div
											style={{
												width: 'max-content',
												maxWidth: '190px',
												height: '17.186px',
												display: 'flex',
												alignItems: 'baseline',
												gap: '7px',
												overflow: 'hidden',
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												fontSize: '14px',
												fontStyle: 'normal',
												lineHeight: '17.186px',
											}}
										>
											<FadeOverflowText
												text={senderLabel}
												title={senderLabel}
												style={{
													minWidth: 0,
													maxWidth: '164px',
													fontWeight: 600,
												}}
											/>
											<span
												style={{
													flex: '0 0 auto',
													fontWeight: 400,
												}}
											>
												{exchangeCount}
											</span>
										</div>

										<span
											title={campaignLabel}
											style={{
												width: '80px',
												height: '15px',
												borderRadius: '3px',
												background: '#B9BBF1',
												display: 'flex',
												alignItems: 'center',
												overflow: 'hidden',
												boxSizing: 'border-box',
												padding: '0 4px',
												flex: '0 0 auto',
											}}
										>
											<DashboardActionBarFolderIcon
												width={20}
												height={12}
												style={{ color: '#C847CB', flex: '0 0 auto' }}
											/>
											<FadeOverflowText
												text={campaignLabel}
												style={{
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
											/>
										</span>
									</div>

									{/* Subject + preview */}
									<div
										style={{
											flex: '1 1 auto',
											minWidth: 0,
											height: '40px',
											overflow: 'hidden',
										}}
									>
										<FadeOverflowText
											text={subject}
											style={{
												display: 'block',
												width: 'fit-content',
												maxWidth: '100%',
												height: '20px',
												color: '#000000',
												textAlign: 'center',
												fontFamily: 'Inter, sans-serif',
												fontSize: '14px',
												fontStyle: 'normal',
												fontWeight: 400,
												lineHeight: '20px',
											}}
										/>
										<FadeOverflowText
											text={snippet}
											style={{
												display: 'block',
												width: '100%',
												height: '20px',
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												fontSize: '14px',
												fontStyle: 'normal',
												fontWeight: 200,
												lineHeight: '20px',
											}}
										/>
									</div>

									{/* Timestamp */}
									<div
										style={{
											flex: '0 0 82px',
											height: '17.186px',
											color: '#000000',
											textAlign: 'right',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 500,
											lineHeight: '17.186px',
											whiteSpace: 'nowrap',
										}}
									>
										{timeLabel}
									</div>
								</button>
							);
						})
					)}
					</div>
				</CustomScrollbar>
			)}
		</div>
	);
};

export default DashboardResponsesWidget;
