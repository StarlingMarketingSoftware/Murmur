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
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
	useAssignInboundEmailToCampaign,
	useGetInboundEmails,
} from '@/hooks/queryHooks/useInboundEmails';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { getCampaignFolderScheme } from '@/components/molecules/CampaignsInboxView/campaignRowMetrics';
import type { InboundEmailWithRelations } from '@/types';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { useGetMyEventApplications } from '@/hooks/queryHooks/useEventApplications';
import { deriveEventChatStatus } from '@/utils/eventChatStatus';
import { EventChatStatusPill } from '@/components/molecules/EventChatCard/EventChatCard';
import { cn } from '@/utils/ui';
import { EmailStatus } from '@/constants/prismaEnums';
import { urls } from '@/constants/urls';
import { DashboardOpportunitiesContent } from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';
import { NewEmailHoverPreview } from '@/components/molecules/DashboardStrategyBox/NewEmailHoverPreview';
import {
	DashboardResponsesFilterBar,
	RESPONSE_WIDGET_BACKGROUND_BY_TAB,
	type DashboardResponsesTab,
} from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesFilterBar';

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

const EMPTY_RESPONSE_OUTLINE_ROW_COUNT = 4;
const EMAIL_PREVIEW_HOVER_DELAY_MS = 1000;
const EMAIL_PREVIEW_WIDTH_PX = 654;
const EMAIL_PREVIEW_HEIGHT_PX = 374;
const EMAIL_PREVIEW_GAP_PX = 13;

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

const getRootZoom = (): number => {
	if (typeof window === 'undefined') return 1;
	const zoomStr = window.getComputedStyle(document.documentElement).zoom;
	const parsed = zoomStr ? parseFloat(zoomStr) : NaN;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const computeEmailPreviewPosition = (
	rect: DOMRect,
	placement: 'above' | 'below'
): { top: number; left: number } => {
	const z = getRootZoom();
	const cssTop = rect.top / z;
	const cssBottom = rect.bottom / z;
	const cssLeft = rect.left / z;
	const cssWidth = rect.width / z;
	return {
		top:
			placement === 'below'
				? cssBottom + EMAIL_PREVIEW_GAP_PX
				: cssTop - EMAIL_PREVIEW_HEIGHT_PX - EMAIL_PREVIEW_GAP_PX,
		left: cssLeft + (cssWidth - EMAIL_PREVIEW_WIDTH_PX) / 2,
	};
};

export const DashboardResponsesWidget: FC<{
	enabled?: boolean;
	className?: string;
	mockState?: ResponsesMockState;
	/**
	 * Mobile dashboard layout: fluid width/height, transparent container (rows
	 * float over the map), tap-to-open rows, no hover preview.
	 */
	mobile?: boolean;
	/**
	 * Where the hover email preview opens relative to the widget. Use 'below'
	 * when the widget is a dropdown from the top bar (preview would otherwise
	 * cover the bar / extend upward off-screen). Defaults to 'above' for the
	 * bottom-anchored dashboard widget.
	 */
	previewPlacement?: 'above' | 'below';
}> = ({
	enabled = true,
	className,
	mockState,
	mobile = false,
	previewPlacement = 'above',
}) => {
	const router = useRouter();
	const mockOverrideActive = mockState != null;
	const widgetRef = useRef<HTMLDivElement>(null);
	const emailHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const campaignAssignmentPromisesRef = useRef<Record<string, Promise<number | null>>>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [activeTab, setActiveTab] = useState<DashboardResponsesTab>('responses');
	const [showEmailPreview, setShowEmailPreview] = useState(false);
	const [previewEmail, setPreviewEmail] = useState<InboundEmailWithRelations | null>(null);
	const [previewPosition, setPreviewPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const { data: inboundEmails, isLoading: isLoadingInboundEmails } = useGetInboundEmails({
		enabled: enabled && !mockOverrideActive && activeTab !== 'opportunities',
	});
	const { data: sentEmails, isLoading: isLoadingSentEmails } = useGetEmails({
		enabled: enabled && !mockOverrideActive && activeTab === 'sent',
		filters: { status: EmailStatus.sent },
	});
	// Venue event chats project into the responses list with a thread-application
	// id; resolving the application drives the opportunity marker + status pill.
	const { data: myApplications } = useGetMyEventApplications({
		enabled: enabled && !mockOverrideActive,
	});
	const nowMs = Date.now();
	const applicationById = useMemo(
		() =>
			new Map((myApplications ?? []).map((application) => [application.id, application])),
		[myApplications]
	);
	const { mutateAsync: assignInboundEmailToCampaign } = useAssignInboundEmailToCampaign({
		suppressToasts: true,
	});
	// Mobile chips reuse the folder-card color scheme so each campaign's chip
	// matches its card on the Folders tab (cycled by list index, same as there).
	const { data: chipCampaigns } = useGetCampaigns();
	const campaignIndexById = useMemo(() => {
		const map = new Map<number, number>();
		(chipCampaigns ?? []).forEach((campaign: { id: number }, index: number) => {
			map.set(campaign.id, index);
		});
		return map;
	}, [chipCampaigns]);

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
	const emptyMessage = activeTab === 'sent' ? 'No sent emails yet' : 'No responses yet';

	const clearEmailPreviewTimer = useCallback(() => {
		if (!emailHoverTimerRef.current) return;
		clearTimeout(emailHoverTimerRef.current);
		emailHoverTimerRef.current = null;
	}, []);

	const updateEmailPreviewPosition = useCallback(() => {
		const rect = widgetRef.current?.getBoundingClientRect();
		if (rect && rect.width > 0) {
			setPreviewPosition(computeEmailPreviewPosition(rect, previewPlacement));
		}
	}, [previewPlacement]);

	const hideEmailPreview = useCallback(() => {
		clearEmailPreviewTimer();
		setShowEmailPreview(false);
		setPreviewEmail(null);
	}, [clearEmailPreviewTimer]);

	const ensureEmailCampaign = useCallback(
		(email: InboundEmailWithRelations) => {
			const existingCampaignId = email.campaignId ?? email.campaign?.id;
			if (existingCampaignId) return Promise.resolve(existingCampaignId);
			if (mockOverrideActive || (email as { isSent?: boolean }).isSent) {
				return Promise.resolve(null);
			}
			// Projected venue messages (negative synthetic ids) have no InboundEmail
			// row to PATCH a campaign onto — skip the doomed assignment call.
			if (email.id < 0) return Promise.resolve(null);

			const key = String(email.id);
			const existingPromise = campaignAssignmentPromisesRef.current[key];
			if (existingPromise) return existingPromise;

			const promise = assignInboundEmailToCampaign({ id: email.id })
				.then((assignedEmail) => assignedEmail.campaignId ?? assignedEmail.campaign?.id ?? null)
				.finally(() => {
					delete campaignAssignmentPromisesRef.current[key];
				});
			campaignAssignmentPromisesRef.current[key] = promise;
			return promise;
		},
		[assignInboundEmailToCampaign, mockOverrideActive]
	);

	const navigateToEmail = useCallback(
		async (email: InboundEmailWithRelations) => {
			const isSent = Boolean((email as { isSent?: boolean }).isSent);
			const existingCampaignId = email.campaignId ?? email.campaign?.id ?? null;
			const targetCampaignId =
				existingCampaignId ??
				(isSent ? null : await ensureEmailCampaign(email).catch(() => null));
			if (!targetCampaignId) return;

			hideEmailPreview();
			const tab = isSent ? 'sent' : 'inbox';
			router.push(
				`${urls.murmur.campaign.detail(targetCampaignId)}?tab=${tab}&inboxEmailId=${email.id}&silent=1`
			);
		},
		[ensureEmailCampaign, hideEmailPreview, router]
	);

	const handleEmailClick = useCallback(
		(email: InboundEmailWithRelations) => {
			void navigateToEmail(email);
		},
		[navigateToEmail]
	);

	const handleEmailHoverStart = useCallback(
		(email: InboundEmailWithRelations) => {
			clearEmailPreviewTimer();
			emailHoverTimerRef.current = setTimeout(() => {
				updateEmailPreviewPosition();
				setPreviewEmail(email);
				setShowEmailPreview(true);
			}, EMAIL_PREVIEW_HOVER_DELAY_MS);
		},
		[clearEmailPreviewTimer, updateEmailPreviewPosition]
	);

	useEffect(() => {
		return () => clearEmailPreviewTimer();
	}, [clearEmailPreviewTimer]);

	useEffect(() => {
		if (!showEmailPreview) return;
		window.addEventListener('scroll', updateEmailPreviewPosition, true);
		window.addEventListener('resize', updateEmailPreviewPosition);
		return () => {
			window.removeEventListener('scroll', updateEmailPreviewPosition, true);
			window.removeEventListener('resize', updateEmailPreviewPosition);
		};
	}, [showEmailPreview, updateEmailPreviewPosition]);

	useEffect(() => {
		hideEmailPreview();
	}, [activeTab, hideEmailPreview]);

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
			ref={widgetRef}
			className={cn('flex flex-col items-center', className)}
			style={{
				width: mobile ? '100%' : '654px',
				height: mobile ? '100%' : '266px',
				boxSizing: 'border-box',
				borderRadius: '8px',
				// Mobile rows float directly over the map — no container fill.
				backgroundColor: mobile
					? 'transparent'
					: RESPONSE_WIDGET_BACKGROUND_BY_TAB[activeTab],
				paddingTop: mobile ? '10px' : '9px',
				paddingBottom: mobile ? '10px' : '6px',
				paddingLeft: mobile ? '16px' : undefined,
				paddingRight: mobile ? '16px' : undefined,
			}}
		>
			{showEmailPreview &&
				previewEmail &&
				previewPosition &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						style={{
							position: 'fixed',
							top: `${previewPosition.top}px`,
							left: `${previewPosition.left}px`,
							zIndex: 10000,
							pointerEvents: 'none',
						}}
					>
						<NewEmailHoverPreview email={previewEmail} />
					</div>,
					document.documentElement
				)}
			{/* Top controls */}
			<div
				style={{
					width: mobile ? '100%' : '639px',
					height: mobile ? '30px' : '22px',
					display: 'flex',
					alignItems: 'center',
					gap: '7px',
				}}
			>
				<DashboardResponsesFilterBar
					activeTab={activeTab}
					onTabChange={setActiveTab}
					width={mobile ? '100%' : 440}
					height={mobile ? 30 : 22}
					fontSize={mobile ? 15 : 14}
					style={mobile ? { flex: 1, minWidth: 0 } : undefined}
				/>

				<div
					style={{
						width: mobile ? '90px' : '136px',
						height: mobile ? '30px' : '22px',
						borderRadius: '6px',
						backgroundColor: '#FFFFFF',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						paddingLeft: '10px',
						paddingRight: '10px',
						boxSizing: 'border-box',
						flexShrink: 0,
					}}
				>
					<span style={{ display: 'flex', flexShrink: 0 }}>
						<SearchIconDesktop width={16} height={16} stroke="black" strokeWidth={2} />
					</span>
					<input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={
							mobile ? 'Mail' : activeTab === 'opportunities' ? 'Search' : 'Search Mail'
						}
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
					fluid={mobile}
				/>
			) : (
				<CustomScrollbar
					className="flex-1 min-h-0 self-center"
					contentClassName="flex flex-col items-center"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-12}
					lockHorizontalScroll
					style={{
						width: mobile ? '100%' : '639px',
						marginTop: '9px',
					}}
				>
					{/* Blue gaps between rows */}
					<div
						className={cn(
							'w-full flex flex-col items-center',
							mobile ? 'gap-[10px] pb-[10px]' : 'gap-[6px] pb-[6px]'
						)}
					>
						{isLoading ? (
							// Wave skeleton rows mirroring the loaded row anatomy; negative
							// delays stagger the wave so it reads downward.
							Array.from({ length: 3 }).map((_, idx) => (
								<div
									key={`responses-loading-${idx}`}
									aria-hidden="true"
									className="dashboard-responses-loading-wave-row"
									style={{
										width: mobile ? '100%' : '639px',
										height: mobile ? '64px' : '48px',
										borderRadius: '6.389px',
										animationDelay: `${-(2.5 - idx * 0.25)}s`,
										boxShadow: '0px 1px 0px rgba(0,0,0,0.05)',
										boxSizing: 'border-box',
										overflow: 'hidden',
										padding: mobile ? '0 14px' : '7px 31px 9px 27px',
										display: 'flex',
										alignItems: 'center',
										gap: mobile ? '12px' : '18px',
									}}
								>
									{/* Sender + campaign chip */}
									<div
										style={{
											flex: '0 0 auto',
											width: '120px',
											height: '32px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'space-between',
										}}
									>
										<span
											style={{
												width: '96px',
												height: '13px',
												borderRadius: '4px',
												backgroundColor: 'rgba(0,0,0,0.10)',
											}}
										/>
										<span
											style={{
												width: '80px',
												height: '15px',
												borderRadius: '3px',
												backgroundColor: 'rgba(0,0,0,0.10)',
											}}
										/>
									</div>

									{/* Subject + snippet */}
									<div
										style={{
											flex: '1 1 auto',
											minWidth: 0,
											height: '32px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'space-between',
										}}
									>
										<span
											style={{
												width: '45%',
												height: '13px',
												borderRadius: '4px',
												backgroundColor: 'rgba(0,0,0,0.10)',
											}}
										/>
										<span
											style={{
												width: '70%',
												height: '13px',
												borderRadius: '4px',
												backgroundColor: 'rgba(0,0,0,0.10)',
											}}
										/>
									</div>

									{/* Timestamp */}
									<span
										style={{
											flex: '0 0 auto',
											width: '56px',
											height: '13px',
											borderRadius: '4px',
											backgroundColor: 'rgba(0,0,0,0.10)',
										}}
									/>
								</div>
							))
						) : visibleEmails.length === 0 ? (
							<>
								<span className="sr-only">{emptyMessage}</span>
								{Array.from({ length: EMPTY_RESPONSE_OUTLINE_ROW_COUNT }).map((_, index) => (
									<div
										key={`responses-empty-outline-${index}`}
										aria-hidden="true"
										style={{
											width: mobile ? '100%' : '639px',
											height: mobile ? '64px' : '48px',
											borderRadius: '6.389px',
											border: '1px solid #000000',
											background: 'transparent',
											boxSizing: 'border-box',
										}}
									/>
								))}
							</>
						) : (
							visibleEmails.map((email) => {
							const rowKey = `${activeTab}:${email.id}`;
							const senderLabel = getCanonicalSenderLabel(email);
							const exchangeKey = getResponseThreadKey(email);
							const exchangeCount = Math.max(1, exchangeCounts[exchangeKey] || 1);
							const campaignLabel = getCampaignLabel(email);
							// Event-chat rows (venue threads tied to an application) carry an
							// opportunity marker + live status pill.
							const eventApplication =
								email.venueThreadApplicationId != null
									? applicationById.get(email.venueThreadApplicationId)
									: undefined;
							const eventChatState = eventApplication
								? deriveEventChatStatus(eventApplication, nowMs)
								: null;
							const subject = email.subject?.trim() || '(No Subject)';
							const snippet = getEmailSnippet(email);
							const timeLabel = formatInboxTimestamp(email.receivedAt);
							const emailCampaignId = email.campaignId ?? email.campaign?.id;
							const campaignIndex =
								emailCampaignId != null
									? campaignIndexById.get(emailCampaignId)
									: undefined;
							const chipScheme =
								mobile && campaignIndex != null
									? getCampaignFolderScheme(campaignIndex)
									: { card: '#B9BBF1', folder: '#C847CB' };

							return (
								<button
									key={rowKey}
									type="button"
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: mobile ? '100%' : '639px',
										height: mobile ? '64px' : '48px',
										borderRadius: '6.389px',
										backgroundColor: '#FEFEFE',
										border: 'none',
										boxShadow: '0px 1px 0px rgba(0,0,0,0.05)',
										boxSizing: 'border-box',
										overflow: 'hidden',
										padding: mobile ? '0 14px' : '7px 31px 9px 27px',
										display: 'flex',
										alignItems: mobile ? 'center' : 'flex-start',
										gap: mobile ? '12px' : '18px',
										fontFamily: 'Inter, sans-serif',
										color: '#000000',
										cursor: 'pointer',
									}}
									onClick={() => handleEmailClick(email)}
									onMouseEnter={
										mobile ? undefined : () => handleEmailHoverStart(email)
									}
									onMouseLeave={mobile ? undefined : hideEmailPreview}
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
											{eventChatState && (
												<MapStackStarIcon
													size={12}
													className="flex-shrink-0 self-center"
												/>
											)}
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

										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '5px',
												flex: '0 0 auto',
											}}
										>
											<span
												title={campaignLabel}
												style={{
													width: '80px',
													height: '15px',
													borderRadius: '3px',
													background: chipScheme.card,
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
													style={{ color: chipScheme.folder, flex: '0 0 auto' }}
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
											{eventChatState && (
												<EventChatStatusPill
													status={eventChatState.status}
													height={15}
													fontSize={9.5}
												/>
											)}
										</div>
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
