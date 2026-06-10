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
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
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
import {
	useGetMyEventApplications,
	type MyEventApplication,
} from '@/hooks/queryHooks/useEventApplications';
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
	// `id` is only unique within a source (an email id can equal an application id),
	// so React keys are `${source}-${id}`.
	source: 'inbound' | 'mock' | 'application';
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
	// Application rows with venue responses: unread shows the blue "venue
	// responded" dot; inboxLink deep-links into the conversation in the campaign
	// inbox (null when no response yet or no campaign to route through).
	unread?: boolean;
	inboxLink?: string | null;
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

const EXPIRED_OPPORTUNITY_FILL = '#DD7376';
const EXPIRED_OPPORTUNITY_FOLDER_ICON = '#B84A4A';
const EMPTY_OPPORTUNITY_OUTLINE_ROW_COUNT = 4;

const fadeTextStyle: CSSProperties = {
	overflow: 'hidden',
	whiteSpace: 'nowrap',
};

const FadeOverflowText: FC<{
	text: string;
	style?: CSSProperties;
	className?: string;
	fadePx?: number;
}> = ({ text, style, className, fadePx = 16 }) => {
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
			style={{ ...fadeTextStyle, ...style, ...overflowFadeStyle }}
		>
			{text}
		</span>
	);
};

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

const getStartOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseOpportunityDateForComparison = (label: string, today: Date): Date | null => {
	const normalized = label.trim().toLowerCase();
	if (!normalized || normalized === 'date tbd') return null;

	if (normalized === 'yesterday') {
		return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
	}
	if (normalized === 'today') return today;
	if (normalized === 'tomorrow') {
		return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
	}

	const monthMatch = normalized.match(
		/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/i
	);
	if (monthMatch) {
		const monthIndex = MONTH_NAME_TO_INDEX[monthMatch[1].toLowerCase().replace('.', '')];
		const day = Number(monthMatch[2]);
		const year = monthMatch[3] ? Number(monthMatch[3]) : today.getFullYear();
		const date = new Date(year, monthIndex, day);
		if (
			monthIndex != null &&
			Number.isFinite(day) &&
			date.getFullYear() === year &&
			date.getMonth() === monthIndex &&
			date.getDate() === day
		) {
			return date;
		}
	}

	const slashMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
	if (slashMatch) {
		const monthIndex = Number(slashMatch[1]) - 1;
		const day = Number(slashMatch[2]);
		const rawYear = slashMatch[3] ? Number(slashMatch[3]) : today.getFullYear();
		const year = rawYear < 100 ? 2000 + rawYear : rawYear;
		const date = new Date(year, monthIndex, day);
		if (
			monthIndex >= 0 &&
			monthIndex <= 11 &&
			Number.isFinite(day) &&
			date.getFullYear() === year &&
			date.getMonth() === monthIndex &&
			date.getDate() === day
		) {
			return date;
		}
	}

	return null;
};

const isOpportunityDatePassed = (label: string) => {
	const today = getStartOfDay(new Date());
	const date = parseOpportunityDateForComparison(label, today);
	return date != null && date.getTime() < today.getTime();
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

export const inferOpportunityStatus = (
	email: InboundEmailWithRelations
): OpportunityStatus | null => {
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
		source: 'inbound',
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
		source: 'mock',
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

// An opportunity the user actively applied to. Submissions surface as In Progress
// (the application enum is only submitted/withdrawn — no booked/closed lifecycle yet).
const buildApplicationOpportunityRow = (application: MyEventApplication): OpportunityRow => {
	const event = application.event;
	const city = event?.venueCity?.trim() || '';
	const stateAbbr = event?.venueState
		? getStateAbbreviation(event.venueState)?.trim().toUpperCase() || ''
		: '';

	let opportunityDate = event?.whenLabel
		? extractOpportunityDateLabel(event.whenLabel)
		: 'Date TBD';
	if (opportunityDate === 'Date TBD' && event?.startsAt) {
		const startsAt = new Date(event.startsAt);
		if (!Number.isNaN(startsAt.getTime())) {
			opportunityDate = formatMonthDay(startsAt.getMonth(), startsAt.getDate());
		}
	}

	const response = application.venueResponse;

	return {
		source: 'application',
		id: application.id,
		status: application.status === 'submitted' ? 'in-progress' : 'closed',
		contactLabel: event?.venueName?.trim() || 'Venue',
		exchangeCount: response?.responseCount ?? 0,
		folder: '',
		categoryTitle: event?.venueBusinessType?.trim() || '',
		city,
		location: [city, stateAbbr].filter(Boolean).join(', '),
		stateAbbr,
		opportunityType: event?.name?.trim() || 'Opportunity',
		opportunityDate,
		// Once the venue responds the row previews their latest reply; until then
		// it shows the submission note.
		lastMessage: response
			? response.lastMessagePreview
			: application.performingName
				? `You applied as ${application.performingName}.`
				: 'Application sent.',
		lastReceivedLabel: formatOpportunityTimestamp(
			response?.lastMessageAt ?? application.createdAt
		),
		unread: (response?.unreadCount ?? 0) > 0,
		// The projected inbox row id for a venue message is the message id negated.
		inboxLink:
			response && response.campaignId != null
				? `${urls.murmur.campaign.detail(response.campaignId)}?tab=inbox&inboxEmailId=${-response.latestMessageId}&silent=1`
				: null,
	};
};

export const DashboardOpportunitiesContent: FC<{
	enabled?: boolean;
	searchQuery: string;
	className?: string;
	mockState?: OpportunitiesMockState;
	inboundEmailsOverride?: InboundEmailWithRelations[];
	isLoadingOverride?: boolean;
	/** Fill the parent width instead of the fixed 639px desktop layout. */
	fluid?: boolean;
}> = ({
	enabled = true,
	searchQuery,
	className,
	mockState,
	inboundEmailsOverride,
	isLoadingOverride,
	fluid = false,
}) => {
	const router = useRouter();
	const mockOverrideActive = mockState != null;
	const hasInboundEmailsOverride = inboundEmailsOverride != null;
	const { data: inboundEmails, isLoading: isLoadingEmails } = useGetInboundEmails({
		enabled: enabled && !mockOverrideActive && !hasInboundEmailsOverride,
	});
	const { data: myApplications } = useGetMyEventApplications({
		enabled: enabled && !mockOverrideActive && !hasInboundEmailsOverride,
	});
	const sourceInboundEmails = useMemo(
		() => inboundEmailsOverride ?? inboundEmails ?? [],
		[inboundEmails, inboundEmailsOverride]
	);
	const isLoading =
		isLoadingOverride ?? (mockOverrideActive || hasInboundEmailsOverride ? false : isLoadingEmails);
	const [activeStatus, setActiveStatus] = useState<OpportunityStatus | null>(null);

	const threadExchangeCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		const threadsWithOriginal = new Set<string>();
		for (const email of sourceInboundEmails) {
			const key = getOpportunityThreadKey(email);
			counts[key] = (counts[key] || 0) + 1;
			if (email.originalEmailId != null) threadsWithOriginal.add(key);
		}

		for (const key of threadsWithOriginal) {
			counts[key] = (counts[key] || 0) + 1;
		}

		return counts;
	}, [sourceInboundEmails]);

	const allOpportunities = useMemo(() => {
		let rows: OpportunityRow[];
		if (mockOverrideActive) {
			rows = (mockState?.rows ?? []).map((row, index) => buildMockOpportunityRow(row, index));
		} else {
			const seenThreadKeys = new Set<string>();
			rows = [];
			const sortedEmails = [...sourceInboundEmails].sort((a, b) => {
				const aMs = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
				const bMs = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
				return bMs - aMs;
			});

			for (const email of sortedEmails) {
				// Venue internal messages are ongoing chats, not keyword-triaged cold-email
				// replies (mirrors the ContactsExpandedList exemption) — application
				// threads already surface through the application rows below.
				if (email.venueConversationId != null) continue;
				const threadKey = getOpportunityThreadKey(email);
				if (seenThreadKeys.has(threadKey)) continue;
				seenThreadKeys.add(threadKey);
				const row = buildOpportunityRow(email, Math.max(1, threadExchangeCounts[threadKey] || 1));
				if (row) rows.push(row);
			}

			// The user's own submitted applications (newest-first from the API) lead the
			// list so they're visible at the top of the In Progress tab.
			const applicationRows = (myApplications ?? []).map(buildApplicationOpportunityRow);
			rows = [...applicationRows, ...rows];
		}

		return rows;
	}, [mockOverrideActive, mockState?.rows, myApplications, sourceInboundEmails, threadExchangeCounts]);

	const opportunities = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return allOpportunities.filter((row) => {
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
	}, [activeStatus, allOpportunities, searchQuery]);
	const isUnfilteredView = activeStatus === null && searchQuery.trim() === '';
	const isFullyEmpty = !isLoading && allOpportunities.length === 0;

	if (!enabled) return null;

	const rowWidth = fluid ? '100%' : '639px';

	return (
		<div
			className={cn(
				'flex flex-1 flex-col self-center min-h-0',
				fluid ? 'w-full' : 'w-[639px]',
				className
			)}
		>
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
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-12}
				lockHorizontalScroll
				style={{
					width: rowWidth,
					marginTop: '8px',
				}}
			>
				{/* w-full: rows are width:100%, so on fluid (mobile) widths the column
				    must take the scroll container's width or every row collapses to 0. */}
				<div className="w-full flex flex-col items-center gap-[5px] pb-[1px]">
					{isLoading ? (
						// Wave skeleton rows mirroring the loaded row anatomy; negative
						// delays stagger the wave so it reads downward.
						Array.from({ length: 3 }).map((_, index) => (
							<div
								key={`opportunity-loading-${index}`}
								aria-hidden="true"
								className="dashboard-opportunities-loading-wave-row"
								style={{
									width: rowWidth,
									height: '48px',
									borderRadius: '6.389px',
									animationDelay: `${-(2.5 - index * 0.25)}s`,
									boxShadow: '0px 1px 0px rgba(0, 0, 0, 0.05)',
									boxSizing: 'border-box',
									position: 'relative',
									overflow: 'hidden',
								}}
							>
								{/* Status accent bar */}
								<span
									style={{
										position: 'absolute',
										left: 0,
										top: 0,
										width: '6px',
										height: '100%',
										background: 'rgba(0,0,0,0.10)',
									}}
								/>
								{/* Contact label */}
								<span
									style={{
										position: 'absolute',
										left: '27px',
										top: '9px',
										width: '120px',
										height: '13px',
										borderRadius: '4px',
										background: 'rgba(0,0,0,0.10)',
									}}
								/>
								{/* Folder chip */}
								<span
									style={{
										position: 'absolute',
										left: '27px',
										bottom: '9px',
										width: '80px',
										height: '15px',
										borderRadius: '3px',
										background: 'rgba(0,0,0,0.10)',
									}}
								/>
								{/* Date pill */}
								<span
									style={{
										position: 'absolute',
										right: '10px',
										top: '7px',
										width: '82px',
										height: '17px',
										borderRadius: '4.502px',
										background: 'rgba(0,0,0,0.10)',
									}}
								/>
							</div>
						))
					) : isFullyEmpty ? (
						<>
							<span className="sr-only">No opportunities yet</span>
							{Array.from({ length: EMPTY_OPPORTUNITY_OUTLINE_ROW_COUNT }).map((_, index) => (
								<div
									key={`opportunity-empty-outline-${index}`}
									aria-hidden="true"
									style={{
										width: rowWidth,
										height: '48px',
										borderRadius: '6.389px',
										border: '1px solid #000000',
										background: 'transparent',
										boxSizing: 'border-box',
									}}
								/>
							))}
						</>
					) : opportunities.length === 0 ? (
						<div
							className="flex items-center justify-center text-center"
							style={{
								width: rowWidth,
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
							const isCompactClosedRow = isUnfilteredView && opportunity.status === 'closed';
							const isExpiredOpportunity = isOpportunityDatePassed(
								opportunity.opportunityDate
							);
							return (
								<button
									key={`${opportunity.source}-${opportunity.id}`}
									type="button"
									onClick={
										opportunity.inboxLink
											? () => router.push(opportunity.inboxLink!)
											: undefined
									}
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: rowWidth,
										height: isCompactClosedRow ? '25px' : '48px',
										borderRadius: '6.389px',
										border: isExpiredOpportunity ? '1px solid #000000' : 'none',
										background: isExpiredOpportunity
											? EXPIRED_OPPORTUNITY_FILL
											: isCompactClosedRow
												? '#E6E6E6'
												: '#FEFEFE',
										boxShadow: isExpiredOpportunity
											? 'none'
											: '0px 1px 0px rgba(0, 0, 0, 0.05)',
										boxSizing: 'border-box',
										overflow: 'hidden',
										position: 'relative',
										display: 'block',
										appearance: 'none',
										padding: 0,
										fontFamily: 'Inter, sans-serif',
										color: '#000000',
										cursor: opportunity.inboxLink ? 'pointer' : 'default',
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
											background: isExpiredOpportunity
												? EXPIRED_OPPORTUNITY_FILL
												: statusMeta.accent,
										}}
									/>

									<span
										style={{
											position: 'absolute',
											left: '27px',
											top: isCompactClosedRow ? '4px' : '7px',
											// On fluid (mobile) widths, keep the label clear of the
											// right-anchored date pill.
											width: fluid ? 'min(190px, calc(100% - 130px))' : '190px',
											height: '17.186px',
											display: 'flex',
											alignItems: isCompactClosedRow ? 'center' : 'baseline',
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
										{opportunity.unread && (
											<span
												aria-label="New response"
												style={{
													flex: '0 0 auto',
													width: '8px',
													height: '8px',
													borderRadius: '9999px',
													background: '#2F6FED',
													alignSelf: 'center',
												}}
											/>
										)}
										<FadeOverflowText text={opportunity.contactLabel} style={{ minWidth: 0 }} />
										<span
											style={{
												flex: '0 0 auto',
												marginLeft: isCompactClosedRow ? '22px' : undefined,
												fontSize: '10px',
												fontWeight: 400,
												lineHeight: 1,
												transform: isCompactClosedRow ? undefined : 'translateY(-4px)',
											}}
										>
											{opportunity.exchangeCount}
										</span>
									</span>

									{!isCompactClosedRow && opportunity.folder && (
										<span
											style={{
												position: 'absolute',
												left: '27px',
												bottom: '9px',
												width: '80px',
												height: '15px',
												borderRadius: '3px',
												border: isExpiredOpportunity ? '1px solid #000000' : 'none',
												background: isExpiredOpportunity
													? EXPIRED_OPPORTUNITY_FILL
													: '#B9BBF1',
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
												style={{
													color: isExpiredOpportunity
														? EXPIRED_OPPORTUNITY_FOLDER_ICON
														: '#C847CB',
													flex: '0 0 auto',
												}}
											/>
											<FadeOverflowText
												text={opportunity.folder}
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
									)}

									{!isCompactClosedRow && (
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
												<FadeOverflowText
													text={opportunity.city}
													style={{
														minWidth: 0,
														height: '15px',
														display: 'inline-flex',
														alignItems: 'center',
														justifyContent: 'center',
														transform: 'translateY(1px)',
														color: '#000000',
														textAlign: 'center',
														fontFamily: 'Inter, sans-serif',
														fontSize: '9.454px',
														fontStyle: 'normal',
														fontWeight: 500,
														lineHeight: '12.482px',
													}}
												/>
											)}
										</div>
									)}

									<div
										style={{
											position: 'absolute',
											left: '232px',
											top: '2px',
											right: '269.118px',
											height: '19.936px',
											overflow: 'hidden',
											whiteSpace: 'nowrap',
											color: '#000000',
											textAlign: 'left',
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
											border: isExpiredOpportunity ? '1px solid #000000' : 'none',
											background: isExpiredOpportunity
												? EXPIRED_OPPORTUNITY_FILL
												: '#B6E8F1',
											overflow: 'hidden',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'flex-start',
											boxSizing: 'border-box',
											padding: '0 14px',
											color: '#000000',
											textAlign: 'left',
											fontFamily: 'Inter, sans-serif',
											fontSize: '14px',
											fontStyle: 'normal',
											fontWeight: 400,
											lineHeight: '20px',
										}}
									>
										<FadeOverflowText text={opportunity.opportunityDate} style={{ width: '100%' }} />
									</div>

									{!isCompactClosedRow && (
										<div
											style={{
												position: 'absolute',
												left: '232px',
												top: '25px',
												right: '100px',
												height: '20px',
												overflow: 'hidden',
												color: '#000000',
												whiteSpace: 'nowrap',
												fontFamily: 'Inter, sans-serif',
												fontSize: '14px',
												fontStyle: 'normal',
												fontWeight: 200,
												lineHeight: '20px',
											}}
										>
											<FadeOverflowText
												text={
													opportunity.lastMessage ||
													'Reply received. Add details as this opportunity develops.'
												}
												style={{ display: 'block', width: '100%' }}
											/>
										</div>
									)}

									<div
										style={{
											position: 'absolute',
											right: '10px',
											top: isCompactClosedRow ? '4px' : '26px',
											width: '82px',
											height: '17.186px',
											color: '#000',
											textAlign: 'right',
											fontFamily: 'Inter, sans-serif',
											fontSize: '13px',
											fontStyle: 'normal',
											fontWeight: 500,
											lineHeight: '17.186px',
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

export const DashboardOpportunitiesWidget: FC<{
	enabled?: boolean;
	className?: string;
	mockState?: OpportunitiesMockState;
}> = ({ enabled = true, className, mockState }) => {
	const [searchQuery, setSearchQuery] = useState('');

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

			<DashboardOpportunitiesContent
				enabled={enabled}
				mockState={mockState}
				searchQuery={searchQuery}
			/>
		</div>
	);
};

export default DashboardOpportunitiesWidget;
