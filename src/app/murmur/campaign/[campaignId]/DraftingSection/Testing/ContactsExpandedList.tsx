'use client';

import {
	FC,
	MouseEvent,
	useMemo,
	useRef,
	useState,
	useEffect,
	useCallback,
	useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ContactWithName } from '@/types/contact';
import type {
	CampaignWithRelations,
	EmailWithRelations,
	InboundEmailWithRelations,
} from '@/types';
import { cn, convertHtmlToPlainText } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation, splitTrailingNumericSuffix } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactCampaigns } from '@/hooks/queryHooks/useContacts';
import { useGetCampaignContactEvents } from '@/hooks/queryHooks/useCampaigns';
import {
	ContactsHeaderChrome,
	type ContactsHeaderChromeCampaignStop,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftingTable/DraftingTable';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isMusicFestivalTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import {
	DashboardResponsesFilterBar,
	RESPONSE_WIDGET_BACKGROUND_BY_TAB,
	type DashboardResponsesTab,
} from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesFilterBar';
import {
	buildInboxConversations,
	getInboxMessageTimeMs,
	getInboxMessageSnippet,
	inboxConversationContainsEmailId,
	inboxConversationContainsInboundEmailId,
	inboxConversationContainsSentEmailId,
	type InboxConversation,
	type InboxConversationMessage,
} from '@/utils/inboxConversations';

const isSameLocalDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const CONTACT_ROW_INSET_PX = 6.104;
const CONTACT_ROW_HEIGHT_PX = 49.657;
const CONTACT_ROW_RADIUS_PX = 8.269;
const SUPPLEMENTAL_DRAFT_ROW_HEIGHT_PX = 108;
const SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX = 7.798;
const SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX = 92;
const WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR = '#F5C0BD';
const WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR = '#EE9798';
const WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR = '#EB8586';
const SHOWING_DRAFT_ROW_FILL_COLOR = '#F8C262';
const SHOWING_DRAFT_TOP_BAR_COLOR = '#FFE3AA';
const SELECTED_DRAFT_ROW_FILL_COLOR = '#FDDEA5';
const SELECTED_DRAFT_TOP_BAR_COLOR = '#F9D387';
const INBOX_LAST_SENT_FILL_COLOR = '#7ED29E';

const formatBatchCount = (count: number) => `+${count < 10 ? `0${count}` : count}`;

const isInboxOpportunityEmail = (email: InboundEmailWithRelations) => {
	const text = `${email.subject || ''} ${email.strippedText || ''} ${email.bodyPlain || ''} ${
		email.bodyHtml ? convertHtmlToPlainText(email.bodyHtml) : ''
	}`.toLowerCase();

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

const ShowingDraftViewIcon: FC<{ className?: string; centerFill?: string }> = ({
	className,
	centerFill = SHOWING_DRAFT_TOP_BAR_COLOR,
}) => (
	<svg
		viewBox="0 20 16 9"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className={className}
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M7.652 20.84c2.076 0 4.027.687 5.458 1.527.716.42 1.297.876 1.696 1.298.2.21.35.41.45.589.102.18.145.33.145.443 0 .232-.18.556-.586.928-.397.363-.976.742-1.692 1.086-1.431.688-3.386 1.224-5.47 1.224-2.077 0-3.96-.662-5.323-1.45-.681-.395-1.229-.819-1.602-1.203a2.906 2.906 0 01-.42-.527c-.095-.16-.131-.283-.131-.367 0-.085.036-.208.13-.368.093-.157.234-.336.42-.528.374-.384.922-.807 1.603-1.201 1.363-.789 3.246-1.45 5.322-1.45z"
			fill="#000000"
			stroke="#7D7D7D"
			strokeWidth={0.352663}
		/>
		<path
			d="M7.787 20.84c1.595 0 2.94 1.558 2.94 3.548s-1.345 3.547-2.94 3.547-2.938-1.558-2.938-3.547c0-1.99 1.343-3.547 2.938-3.547z"
			fill={centerFill}
			stroke="#7D7D7D"
			strokeWidth={0.352663}
		/>
	</svg>
);

const formatBatchTimestamp = (date: Date) => {
	const now = new Date();
	if (isSameLocalDay(date, now)) {
		const formatted = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		}).format(date);
		return formatted.replace(/\s+/g, '').toLowerCase();
	}
	const month = date.getMonth() + 1;
	const day = String(date.getDate()).padStart(2, '0');
	return `${month}/${day}`;
};

export type ContactsExpandedTopNavStop = ContactsHeaderChromeCampaignStop;
export type ContactsExpandedListFocusMode = 'contacts' | 'drafts' | 'inbox';

const FadeOverflowText: FC<{
	text: string;
	className?: string;
	fadePx?: number;
	measureKey?: unknown;
	splitNumericSuffix?: boolean;
}> = ({ text, className, fadePx = 16, measureKey, splitNumericSuffix = true }) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const { base, suffixNumber } = splitNumericSuffix
		? splitTrailingNumericSuffix(text)
		: { base: text, suffixNumber: null };

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		// A tiny epsilon avoids flicker from sub-pixel rounding.
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text, measureKey]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	const safeFadePx = Math.max(0, fadePx);
	const style = isOverflowing
		? {
				maskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
				WebkitMaskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={cn('block w-full whitespace-nowrap overflow-hidden', className)}
			style={style}
			title={text}
		>
			{suffixNumber ? (
				<>
					<span>{base}</span>
					<sup className="ml-[4px] relative top-[1px] align-super text-[0.65em] font-medium leading-none opacity-70">
						{suffixNumber}
					</sup>
				</>
			) : (
				text
			)}
		</span>
	);
};

const getContactFullName = (contact?: ContactWithName | null) =>
	contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();

const getContactDisplayName = (contact?: ContactWithName | null, fallback = 'Contact') =>
	getContactFullName(contact) || contact?.company || contact?.email || fallback;

const hasSeparateContactName = (contact?: ContactWithName | null) =>
	Boolean(
		(contact?.name && contact.name.trim()) ||
		(contact?.firstName && contact.firstName.trim()) ||
		(contact?.lastName && contact.lastName.trim())
	);

const getContactCompanyLabel = (contact?: ContactWithName | null) =>
	hasSeparateContactName(contact) ? contact?.company || '' : '';

const getContactTitle = (contact?: ContactWithName | null) =>
	contact?.title || contact?.headline || '';

const getTitleBadgeBgColor = (title: string) =>
	isRestaurantTitle(title)
		? '#C3FBD1'
		: isCoffeeShopTitle(title)
			? '#D6F1BD'
			: isMusicVenueTitle(title)
				? '#B7E5FF'
				: isMusicFestivalTitle(title)
					? '#C1D6FF'
					: isWeddingPlannerTitle(title) || isWeddingVenueTitle(title)
						? '#FFF2BC'
						: isWineBeerSpiritsTitle(title)
							? '#BFC4FF'
							: '#E8EFFF';

const getTitleBadgeLabel = (title: string) =>
	isRestaurantTitle(title)
		? 'Restaurant'
		: isCoffeeShopTitle(title)
			? 'Coffee Shop'
			: isMusicVenueTitle(title)
				? 'Music Venue'
				: isMusicFestivalTitle(title)
					? 'Music Festival'
					: isWeddingPlannerTitle(title)
						? 'Wedding Planner'
						: isWeddingVenueTitle(title)
							? 'Wedding Venue'
							: isWineBeerSpiritsTitle(title)
								? (getWineBeerSpiritsLabel(title) ?? title)
								: title;

const TitleBadge: FC<{
	title: string;
	className?: string;
	textClassName?: string;
	fillColor?: string;
	strokeColor?: string;
	textColor?: string;
	showStroke?: boolean;
	restaurantIconSize?: number;
	coffeeIconSize?: number;
	defaultIconSize?: number;
}> = ({
	title,
	className,
	textClassName,
	fillColor,
	strokeColor,
	textColor,
	showStroke = true,
	restaurantIconSize = 14,
	coffeeIconSize = 6,
	defaultIconSize = 14,
}) => (
	<div
		className={cn('border overflow-hidden flex items-center gap-0.5', className)}
		style={{
			backgroundColor: fillColor ?? getTitleBadgeBgColor(title),
			borderColor: showStroke ? (strokeColor ?? '#000000') : 'transparent',
			borderWidth: showStroke ? undefined : 0,
			color: textColor ?? '#000000',
		}}
	>
		{isRestaurantTitle(title) && (
			<RestaurantsIcon
				size={restaurantIconSize}
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		{isCoffeeShopTitle(title) && (
			<CoffeeShopsIcon
				size={coffeeIconSize}
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		{isMusicVenueTitle(title) && (
			<MusicVenuesIcon
				size={defaultIconSize}
				className="flex-shrink-0"
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		{isMusicFestivalTitle(title) && (
			<FestivalsIcon
				size={defaultIconSize}
				className="flex-shrink-0"
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		{(isWeddingPlannerTitle(title) || isWeddingVenueTitle(title)) && (
			<WeddingPlannersIcon
				size={defaultIconSize}
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		{isWineBeerSpiritsTitle(title) && (
			<WineBeerSpiritsIcon
				size={defaultIconSize}
				className="flex-shrink-0"
				innerFill={fillColor}
				outlineFill={strokeColor}
			/>
		)}
		<ScrollableText
			text={getTitleBadgeLabel(title)}
			className={cn('leading-none', textClassName)}
		/>
	</div>
);

const StateLocationRow: FC<{
	contact?: ContactWithName | null;
	className?: string;
	badgeClassName?: string;
	badgeTextClassName?: string;
	cityClassName?: string;
	badgeFillColor?: string;
	strokeColor?: string;
	textColor?: string;
	showBadgeStroke?: boolean;
}> = ({
	contact,
	className,
	badgeClassName,
	badgeTextClassName,
	cityClassName,
	badgeFillColor,
	strokeColor,
	textColor,
	showBadgeStroke = true,
}) => {
	const fullStateName = (contact?.state as string) || '';
	const stateAbbr = getStateAbbreviation(fullStateName) || '';
	const normalizedState = fullStateName.trim();
	const lowercaseCanadianProvinceNames = canadianProvinceNames.map((s) =>
		s.toLowerCase()
	);
	const isCanadianProvince =
		lowercaseCanadianProvinceNames.includes(normalizedState.toLowerCase()) ||
		canadianProvinceAbbreviations.includes(normalizedState.toUpperCase()) ||
		canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
	const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);
	const badgeBorderColor = showBadgeStroke ? (strokeColor ?? '#000000') : 'transparent';
	const badgeBorderWidth = showBadgeStroke ? undefined : 0;

	return (
		<div
			className={cn('flex items-center justify-start gap-1', className)}
			style={{ color: textColor ?? '#000000' }}
		>
			{stateAbbr ? (
				isCanadianProvince ? (
					<div
						className={cn(
							'inline-flex items-center justify-center border overflow-hidden',
							badgeClassName
						)}
						style={{ borderColor: badgeBorderColor, borderWidth: badgeBorderWidth }}
						title="Canadian province"
					>
						<CanadianFlag width="100%" height="100%" className="w-full h-full" />
					</div>
				) : isUSAbbr ? (
					<span
						className={cn(
							'inline-flex items-center justify-center border leading-none font-bold',
							badgeClassName,
							badgeTextClassName
						)}
						style={{
							backgroundColor:
								badgeFillColor ?? stateBadgeColorMap[stateAbbr] ?? 'transparent',
							borderColor: badgeBorderColor,
							borderWidth: badgeBorderWidth,
							color: textColor ?? '#000000',
						}}
					>
						{stateAbbr}
					</span>
				) : (
					<span
						className={cn(
							'inline-flex items-center justify-center border',
							badgeClassName
						)}
						style={{ borderColor: badgeBorderColor, borderWidth: badgeBorderWidth }}
					/>
				)
			) : null}
			{contact?.city ? (
				<ScrollableText
					text={contact.city}
					className={cn('leading-none', cityClassName)}
				/>
			) : null}
		</div>
	);
};

const resolveInboundContact = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>,
	contactsById?: Map<number, ContactWithName>
) => {
	const senderKey = email.sender?.toLowerCase().trim();
	if (senderKey && contactByEmail?.[senderKey]) return contactByEmail[senderKey];
	if (email.contactId && contactsById?.has(email.contactId)) {
		return contactsById.get(email.contactId) ?? null;
	}
	return (email.contact as ContactWithName | null) ?? null;
};

const normalizeSentEmailForInboxConversation = (
	email: EmailWithRelations
): InboxConversationMessage =>
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
	}) as unknown as InboxConversationMessage;

const getInboxConversationSelectionEmail = (conversation: InboxConversation) =>
	conversation.latestInboundMessage ?? conversation.latestMessage;

export interface ContactsExpandedListProps {
	contacts: ContactWithName[];
	/** Optional full campaign contact set used to resolve draft/inbox rows. */
	allContacts?: ContactWithName[];
	/** Optional campaign drafts to show below draftable contacts. */
	drafts?: EmailWithRelations[];
	/** Optional campaign sent emails shown by the inbox-panel Sent filter. */
	sentEmails?: EmailWithRelations[];
	/** Optional campaign inbox replies to show below drafts. */
	inboxEmails?: InboundEmailWithRelations[];
	/** Locally sent follow-ups keyed by any message ID in the inbox conversation. */
	optimisticInboxReplyByEmailId?: Record<number, number>;
	/** Optional sender email -> campaign contact map for inbox canonical display. */
	contactByEmail?: Record<string, ContactWithName>;
	onHeaderClick?: () => void;
	onDraftSelected?: (contactIds: number[]) => void;
	isDraftDisabled?: boolean;
	isPendingGeneration?: boolean;
	/**
	 * When true, renders the "flowing color" loading wave placeholders (used on initial load).
	 */
	isLoading?: boolean;
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	onDraftClick?: (draft: EmailWithRelations) => void;
	onDraftHover?: (draft: EmailWithRelations | null) => void;
	selectedInboxEmailId?: number | null;
	onInboxEmailClick?: (email: InboxConversationMessage) => void;
	selectedDraftId?: number | null;
	selectedDraftIds?: Set<number>;
	onDraftSelectionChange?: (updater: (prev: Set<number>) => Set<number>) => void;
	/**
	 * Optional controlled selection props. When provided, this component will
	 * mirror and update the passed-in selection instead of managing its own.
	 */
	selectedContactIds?: Set<number>;
	/**
	 * Optional set of contact IDs that are currently being drafted (queued/running).
	 * These should not be treated as "selected" in the UI.
	 */
	activelyDraftingContactIds?: Set<number>;
	onContactSelectionChange?: (updater: (prev: Set<number>) => Set<number>) => void;
	width?: number | string;
	height?: number | string;
	minRows?: number;
	campaign?: CampaignWithRelations;
	/**
	 * When true, the used-contact indicator shows the full "Appears in" hover tooltip (Write tab only).
	 * When false, used contacts are shown with the simple dot indicator only.
	 */
	enableUsedContactTooltip?: boolean;
	showSearchBar?: boolean;

	onSearchFromMiniBar?: (params: { why: string; what: string; where: string }) => void;
	whiteSectionHeight?: number;
	activeTopNavStop?: ContactsExpandedTopNavStop;
	onOpenAll?: () => void;
	onOpenSearch?: () => void;
	onOpenWriting?: () => void;
	onOpenSend?: () => void;
	onOpenInbox?: () => void;
	onOpenContacts?: () => void;
	/**
	 * When true, renders only the header chrome (no rows) for ultra-compact bottom panel layouts.
	 */
	collapsed?: boolean;
	/**
	 * When `allTab`, the component behaves like a dashboard preview:
	 * - no row hover/selected background colors
	 * - no header hover/click affordances
	 * - rows still fire `onContactHover` so the All tab can update the Research panel
	 */
	interactionMode?: 'default' | 'allTab';
	focusMode?: ContactsExpandedListFocusMode;
}

export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	allContacts,
	drafts,
	sentEmails,
	inboxEmails,
	optimisticInboxReplyByEmailId,
	contactByEmail,
	onHeaderClick,
	onContactClick,
	onContactHover,
	onDraftClick,
	onDraftHover,
	selectedInboxEmailId,
	onInboxEmailClick,
	selectedDraftId,
	selectedDraftIds,
	onDraftSelectionChange,
	selectedContactIds,
	activelyDraftingContactIds,
	onContactSelectionChange,
	isLoading = false,
	width,
	height,
	minRows = 7,
	campaign,
	enableUsedContactTooltip = false,
	whiteSectionHeight: customWhiteSectionHeight,
	activeTopNavStop,
	onOpenAll,
	onOpenSearch,
	onOpenWriting,
	onOpenSend,
	onOpenInbox,
	onOpenContacts,
	collapsed = false,
	interactionMode = 'default',
	focusMode = 'contacts',
}) => {
	const router = useRouter();
	const [internalSelectedContactIds, setInternalSelectedContactIds] = useState<
		Set<number>
	>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	const lastClickedDraftRef = useRef<number | null>(null);
	const supplementalDraftRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const lastAutoScrolledDraftIdRef = useRef<number | null>(null);

	// Track whether the container is being hovered (for bottom view outline)
	const [isContainerHovered, setIsContainerHovered] = useState(false);

	// Track hovered contact index for keyboard navigation
	const [hoveredContactIndex, setHoveredContactIndex] = useState<number | null>(null);

	const [hoveredUsedContactId, setHoveredUsedContactId] = useState<number | null>(null);
	const [inboxPanelTab, setInboxPanelTab] = useState<DashboardResponsesTab>('responses');
	const { data: hoveredUsedContactCampaigns } =
		useGetUsedContactCampaigns(hoveredUsedContactId);
	const [activeUsedContactCampaignIndex, setActiveUsedContactCampaignIndex] = useState<
		number | null
	>(null);
	// Memoize resolved campaigns so it can be used in both tooltip and indicator
	const resolvedUsedContactCampaigns = useMemo(() => {
		const all = hoveredUsedContactCampaigns ?? [];
		const other = all.filter((c) => c.id !== campaign?.id);
		return other.length ? other : all;
	}, [hoveredUsedContactCampaigns, campaign?.id]);
	const usedContactRowElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
	const usedContactTooltipCloseTimeoutRef = useRef<number | null>(null);
	const [usedContactTooltipPos, setUsedContactTooltipPos] = useState<{
		left: number;
		top: number;
	} | null>(null);

	const getBodyScaleContext = useCallback(() => {
		// In some compact modes (Firefox fallback), `<body>` is scaled via `transform: scale(...)`.
		// In that case, `position: fixed` children of body are positioned in *body coordinates*,
		// while getBoundingClientRect() returns *viewport coordinates*.
		// This helper lets us convert between the two so the tooltip is pixel-perfect.
		const body = document.body;
		const rect = body.getBoundingClientRect();
		const scaleX = body.offsetWidth ? rect.width / body.offsetWidth : 1;
		const scaleY = body.offsetHeight ? rect.height / body.offsetHeight : 1;
		return {
			left: rect.left,
			top: rect.top,
			scaleX: scaleX || 1,
			scaleY: scaleY || 1,
		};
	}, []);

	const clearUsedContactTooltipCloseTimeout = useCallback(() => {
		if (usedContactTooltipCloseTimeoutRef.current !== null) {
			window.clearTimeout(usedContactTooltipCloseTimeoutRef.current);
			usedContactTooltipCloseTimeoutRef.current = null;
		}
	}, []);

	// If this feature is toggled off while active (e.g. tab switch), immediately reset state
	// so we don't keep background queries alive.
	useEffect(() => {
		if (!enableUsedContactTooltip) {
			clearUsedContactTooltipCloseTimeout();
			setHoveredUsedContactId(null);
		}
	}, [clearUsedContactTooltipCloseTimeout, enableUsedContactTooltip]);

	const computeUsedContactTooltipPos = useCallback(
		(rect: DOMRect) => {
			const bodyCtx = getBodyScaleContext();
			const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
			const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
			const rowHeightInBody = rect.height / bodyCtx.scaleY;
			return {
				left: rowLeftInBody + 33,
				// Match ContactsSelection positioning: sit ~8px above the bottom of the row.
				top: rowTopInBody + (rowHeightInBody - 8),
			};
		},
		[getBodyScaleContext]
	);

	const scheduleCloseUsedContactTooltip = useCallback(
		(contactId: number) => {
			clearUsedContactTooltipCloseTimeout();
			usedContactTooltipCloseTimeoutRef.current = window.setTimeout(() => {
				setHoveredUsedContactId((prev) => (prev === contactId ? null : prev));
			}, 120);
		},
		[clearUsedContactTooltipCloseTimeout]
	);

	useEffect(() => {
		if (hoveredUsedContactId === null) {
			setUsedContactTooltipPos(null);
			setActiveUsedContactCampaignIndex(null);
			return;
		}

		let rafId = 0;
		const update = () => {
			const el = usedContactRowElsRef.current.get(hoveredUsedContactId);
			if (!el) return;
			const rect = el.getBoundingClientRect();
			setUsedContactTooltipPos(computeUsedContactTooltipPos(rect));
		};

		const schedule = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		};

		update();
		// Capture scroll from any scroll container
		window.addEventListener('scroll', schedule, true);
		window.addEventListener('resize', schedule);

		return () => {
			window.removeEventListener('scroll', schedule, true);
			window.removeEventListener('resize', schedule);
			cancelAnimationFrame(rafId);
		};
	}, [computeUsedContactTooltipPos, hoveredUsedContactId]);

	const isControlled = Boolean(selectedContactIds);
	const currentSelectedIds = selectedContactIds ?? internalSelectedContactIds;
	const isDraftsFocusMode = focusMode === 'drafts';
	const isInboxFocusMode = focusMode === 'inbox';

	useEffect(() => {
		if (isInboxFocusMode) setInboxPanelTab('responses');
	}, [isInboxFocusMode]);

	const updateSelection = useCallback(
		(updater: (prev: Set<number>) => Set<number>) => {
			const apply = (prev: Set<number>) => {
				const next = updater(new Set(prev));
				// Never keep actively drafting contacts selected.
				if (activelyDraftingContactIds && activelyDraftingContactIds.size > 0) {
					for (const id of activelyDraftingContactIds) {
						next.delete(id);
					}
				}
				return next;
			};

			if (isControlled && onContactSelectionChange) {
				onContactSelectionChange(apply);
			} else {
				setInternalSelectedContactIds((prev) => apply(prev));
			}
		},
		[activelyDraftingContactIds, isControlled, onContactSelectionChange]
	);

	// Keyboard navigation: up/down arrows move hover between rows, Enter selects hovered contact
	const handleKeyboardNavigation = useCallback(
		(e: KeyboardEvent) => {
			// Only handle up/down arrows and Enter
			if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter') return;

			// Only work if we have a hovered contact
			if (hoveredContactIndex === null) return;

			// Check if a text input element is focused (don't intercept typing)
			const activeElement = document.activeElement;
			if (activeElement) {
				const tagName = activeElement.tagName.toLowerCase();
				if (
					tagName === 'input' ||
					tagName === 'textarea' ||
					(activeElement as HTMLElement).isContentEditable
				) {
					return;
				}
			}

			e.preventDefault();
			e.stopImmediatePropagation(); // Prevent campaign page tab navigation

			// Handle Enter key - select/deselect the hovered contact
			if (e.key === 'Enter') {
				const contact = contacts[hoveredContactIndex];
				if (contact) {
					if (isDraftsFocusMode) {
						onContactClick?.(contact);
						return;
					}
					// Don't allow selecting contacts that are actively drafting.
					if (!activelyDraftingContactIds?.has(contact.id)) {
						updateSelection((prev) => {
							const next = new Set(prev);
							if (next.has(contact.id)) {
								next.delete(contact.id);
							} else {
								next.add(contact.id);
							}
							return next;
						});
					}
				}
				return;
			}

			let newIndex: number;
			if (e.key === 'ArrowUp') {
				newIndex =
					hoveredContactIndex > 0 ? hoveredContactIndex - 1 : contacts.length - 1;
			} else {
				newIndex =
					hoveredContactIndex < contacts.length - 1 ? hoveredContactIndex + 1 : 0;
			}

			setHoveredContactIndex(newIndex);
			onContactHover?.(contacts[newIndex]);
		},
		[
			hoveredContactIndex,
			contacts,
			onContactHover,
			onContactClick,
			isDraftsFocusMode,
			updateSelection,
			activelyDraftingContactIds,
		]
	);

	useEffect(() => {
		// Only add listener if we have a hovered contact
		if (hoveredContactIndex === null) return;

		// Use capture phase to run before campaign page handler
		document.addEventListener('keydown', handleKeyboardNavigation, true);
		return () => {
			document.removeEventListener('keydown', handleKeyboardNavigation, true);
		};
	}, [hoveredContactIndex, handleKeyboardNavigation]);

	const handleContactClick = (contact: ContactWithName, e: MouseEvent) => {
		if (e.shiftKey && lastClickedRef.current !== null) {
			// Prevent text selection on shift-click
			e.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = contacts.findIndex((c) => c.id === contact.id);
			const lastIndex = contacts.findIndex((c) => c.id === lastClickedRef.current);

			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);
				updateSelection(() => {
					const newSelected = new Set<number>();
					for (let i = start; i <= end; i++) {
						newSelected.add(contacts[i].id);
					}
					return newSelected;
				});
			}
		} else {
			// Toggle single selection
			updateSelection((prev) => {
				const next = new Set(prev);
				if (next.has(contact.id)) {
					next.delete(contact.id);
				} else {
					next.add(contact.id);
				}
				return next;
			});
			lastClickedRef.current = contact.id ?? null;
		}
	};

	const selectableContactIds = useMemo(() => {
		const next = new Set<number>();
		for (const c of contacts) {
			if (activelyDraftingContactIds?.has(c.id)) continue;
			next.add(c.id);
		}
		return next;
	}, [activelyDraftingContactIds, contacts]);

	const selectedCount = useMemo(() => {
		if (!activelyDraftingContactIds || activelyDraftingContactIds.size === 0) {
			return currentSelectedIds.size;
		}
		let count = 0;
		for (const id of currentSelectedIds) {
			if (!activelyDraftingContactIds.has(id)) count += 1;
		}
		return count;
	}, [activelyDraftingContactIds, currentSelectedIds]);

	const areAllSelected =
		selectableContactIds.size > 0 &&
		selectedCount === selectableContactIds.size &&
		Array.from(selectableContactIds).every((id) => currentSelectedIds.has(id));
	const handleSelectAllToggle = useCallback(() => {
		updateSelection(() => {
			if (areAllSelected) return new Set();
			return new Set(selectableContactIds);
		});
	}, [areAllSelected, selectableContactIds, updateSelection]);
	const shouldShowLoadingWave = isLoading && contacts.length === 0;
	const loadingWaveDurationSeconds = 4.5;
	// Match MapResultsPanelSkeleton step delay exactly for consistent "fluid" feel
	const loadingWaveStepSeconds = 0.1;

	const isAllTab = height === 263;
	const isAllTabNavigation = interactionMode === 'allTab';
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15 || customWhiteSectionHeight === 16;
	const shouldRenderCollapsedTopBox = collapsed && isBottomView;
	// Compressed bottom panel spec: 45px total = 13px label strip + 26px inner bar.
	const collapsedOuterWidthPx = 197;
	const collapsedOuterHeightPx = 45;
	const collapsedLabelHeightPx = 13;
	// Allow callers to override dimensions; default to the original sidebar size.
	const resolvedWidth = shouldRenderCollapsedTopBox ? collapsedOuterWidthPx : (width ?? 376);
	const resolvedHeight = shouldRenderCollapsedTopBox ? collapsedOuterHeightPx : (height ?? 424);
	// The main 377px panel resolves to the spec row width: 370.896px.
	const contactRowWidth =
		typeof resolvedWidth === 'number'
			? `${Math.max(0, resolvedWidth - CONTACT_ROW_INSET_PX)}px`
			: `calc(${resolvedWidth} - ${CONTACT_ROW_INSET_PX}px)`;
	const contactRowStyle = !isBottomView
		? {
				width: contactRowWidth,
				height: `${CONTACT_ROW_HEIGHT_PX}px`,
				borderRadius: `${CONTACT_ROW_RADIUS_PX}px`,
				boxSizing: 'border-box' as const,
			}
		: undefined;
	const effectiveWhiteSectionHeight = shouldRenderCollapsedTopBox ? collapsedLabelHeightPx : whiteSectionHeight;
	const collapsedTopColor = '#FFB9B9';
	const panelFillColor = isInboxFocusMode
		? RESPONSE_WIDGET_BACKGROUND_BY_TAB[inboxPanelTab]
		: '#EB8586';
	const headerStripColor =
		isInboxFocusMode
			? panelFillColor
			: shouldRenderCollapsedTopBox
				? collapsedTopColor
			: effectiveWhiteSectionHeight === 28
				? '#FFB9B9'
				: 'rgba(255, 255, 255, 0.31)';
	const panelBackground =
		`linear-gradient(to bottom, ${headerStripColor} ` +
		`${effectiveWhiteSectionHeight}px, ${panelFillColor} ${effectiveWhiteSectionHeight}px)`;
	const resolvedActiveTopNavStop: ContactsExpandedTopNavStop =
		activeTopNavStop ??
		(isInboxFocusMode
			? 'inbox'
			: isDraftsFocusMode
				? 'send'
				: enableUsedContactTooltip
					? 'write'
					: 'all');
	const shouldRedOutContactRows = !isBottomView && isDraftsFocusMode;
	const shouldRedOutDraftRows =
		!isBottomView && !isDraftsFocusMode && resolvedActiveTopNavStop === 'write';
	const shouldRedOutInboxRows =
		!isBottomView &&
		(isDraftsFocusMode || (!isDraftsFocusMode && resolvedActiveTopNavStop === 'write'));
	const draftSupplementalTextClassName = shouldRedOutDraftRows
		? 'text-[#F5C0BD]'
		: 'text-black';
	const draftSupplementalBorderColor = shouldRedOutDraftRows
		? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
		: '#000000';
	const draftSupplementalRowFillColor = shouldRedOutDraftRows
		? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
		: undefined;
	const draftSupplementalBadgeFillColor = shouldRedOutDraftRows
		? WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR
		: undefined;
	const draftSupplementalTextColor = shouldRedOutDraftRows
		? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
		: undefined;
	const inboxSupplementalTextClassName = shouldRedOutInboxRows
		? 'text-[#F5C0BD]'
		: 'text-black';
	const inboxSupplementalBorderColor = shouldRedOutInboxRows
		? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
		: '#000000';
	const inboxSupplementalRowFillColor = shouldRedOutInboxRows
		? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
		: undefined;
	const inboxSupplementalBadgeFillColor = shouldRedOutInboxRows
		? WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR
		: undefined;
	const inboxSupplementalTextColor = shouldRedOutInboxRows
		? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
		: undefined;
	const collapsedTopBoxHeightPx = 26;
	const collapsedTopBoxWidthPx = 191;
	const collapsedTopBoxRadiusPx = 3.33;
	const allCampaignContacts = allContacts ?? contacts;
	const contactsById = useMemo(() => {
		const map = new Map<number, ContactWithName>();
		for (const contact of allCampaignContacts) {
			map.set(contact.id, contact);
		}
		return map;
	}, [allCampaignContacts]);
	const contactsByEmail = useMemo(() => {
		const map = new Map<string, ContactWithName>();
		for (const contact of allCampaignContacts) {
			const key = contact.email?.toLowerCase().trim();
			if (key && !map.has(key)) map.set(key, contact);
		}
		if (contactByEmail) {
			for (const [email, contact] of Object.entries(contactByEmail)) {
				const key = email.toLowerCase().trim();
				if (key && !map.has(key)) map.set(key, contact);
			}
		}
		return map;
	}, [allCampaignContacts, contactByEmail]);
	const supplementalDraftRows = useMemo(() => drafts ?? [], [drafts]);
	const supplementalSentRows = useMemo(() => sentEmails ?? [], [sentEmails]);
	const supplementalSentThreadMessages = useMemo(
		() => supplementalSentRows.map(normalizeSentEmailForInboxConversation),
		[supplementalSentRows]
	);
	const selectableDraftIds = useMemo(
		() => new Set(supplementalDraftRows.map((draft) => draft.id)),
		[supplementalDraftRows]
	);
	const draftSelectionCount = selectedDraftIds?.size
		? selectedDraftIds.size
		: selectedDraftId == null
			? 0
			: 1;
	useEffect(() => {
		if (!isDraftsFocusMode) {
			lastClickedDraftRef.current = null;
			return;
		}

		if (selectedDraftId != null) {
			lastClickedDraftRef.current = selectedDraftId;
		}
	}, [isDraftsFocusMode, selectedDraftId]);
	const areAllDraftsSelected = Boolean(
		selectedDraftIds &&
		selectableDraftIds.size > 0 &&
		selectedDraftIds.size === selectableDraftIds.size &&
		Array.from(selectableDraftIds).every((id) => selectedDraftIds.has(id))
	);
	const handleDraftSelectAllToggle = useCallback(() => {
		if (!onDraftSelectionChange) return;
		onDraftSelectionChange(() => {
			if (areAllDraftsSelected) return new Set<number>();
			return new Set(selectableDraftIds);
		});
	}, [areAllDraftsSelected, onDraftSelectionChange, selectableDraftIds]);
	useEffect(() => {
		if (selectedDraftId == null) {
			lastAutoScrolledDraftIdRef.current = null;
			return;
		}
		if (lastAutoScrolledDraftIdRef.current === selectedDraftId) return;

		const rowEl = supplementalDraftRowRefs.current.get(selectedDraftId);
		if (!rowEl) return;

		rowEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		lastAutoScrolledDraftIdRef.current = selectedDraftId;
	}, [selectedDraftId, supplementalDraftRows.length]);
	const supplementalInboxRows = useMemo(() => {
		const rows = inboxEmails ?? [];
		const shouldScopeToCampaignContacts = Boolean(allContacts || contactByEmail);
		if (!shouldScopeToCampaignContacts) return rows;
		return rows.filter((email) => {
			const sender = email.sender?.toLowerCase().trim();
			return Boolean(sender && contactsByEmail.has(sender));
		});
	}, [allContacts, contactByEmail, contactsByEmail, inboxEmails]);
	const supplementalInboxThreadConversations = useMemo(
		() =>
			buildInboxConversations([
				...(supplementalInboxRows as InboxConversationMessage[]),
				...supplementalSentThreadMessages,
			]),
		[supplementalInboxRows, supplementalSentThreadMessages]
	);
	const supplementalSentConversations = useMemo(
		() =>
			supplementalInboxThreadConversations.filter(
				(conversation) =>
					conversation.sentMessages.length > 0 && Boolean(conversation.latestMessage.isSent)
			),
		[supplementalInboxThreadConversations]
	);
	const supplementalInboxConversations = useMemo(
		() =>
			supplementalInboxThreadConversations
				.filter((conversation) => conversation.inboundMessages.length > 0)
				.sort(
					(a, b) =>
						getInboxMessageTimeMs(getInboxConversationSelectionEmail(b)) -
						getInboxMessageTimeMs(getInboxConversationSelectionEmail(a))
				),
		[supplementalInboxThreadConversations]
	);
	const supplementalOpportunityInboxConversations = useMemo(
		() =>
			supplementalInboxConversations.filter((conversation) =>
				conversation.inboundMessages.some(isInboxOpportunityEmail)
			),
		[supplementalInboxConversations]
	);
	// Responses sub-tab should NOT also contain opportunity-classified conversations.
	// Each conversation routes to exactly one of {Responses, Opportunities}: any
	// conversation containing an opportunity-keyword inbound email is treated as an
	// opportunity and is excluded from the Responses list.
	const supplementalInboxConversationsResponsesOnly = useMemo(
		() =>
			supplementalInboxConversations.filter(
				(conversation) => !conversation.inboundMessages.some(isInboxOpportunityEmail)
			),
		[supplementalInboxConversations]
	);
	const visibleInboxPanelRowCount =
		inboxPanelTab === 'sent'
			? supplementalSentConversations.length
			: inboxPanelTab === 'opportunities'
				? supplementalOpportunityInboxConversations.length
				: supplementalInboxConversationsResponsesOnly.length;
	const totalRenderedRows = isInboxFocusMode
		? visibleInboxPanelRowCount
		: contacts.length + supplementalDraftRows.length + supplementalInboxConversations.length;
	const shouldShowScrollbar =
		!isBottomView &&
		(isInboxFocusMode ? visibleInboxPanelRowCount >= 6 : totalRenderedRows >= 14);

	const { data: campaignContactEvents } = useGetCampaignContactEvents(campaign?.id, {
		enabled: isBottomView && Boolean(campaign?.id),
	});

	// Bottom view: show contact-add "batch" boxes (mirrors Drafts bottom view).
	// For now we at least show the initial campaign contact count at campaign creation time.
	const bottomViewContactBatches = useMemo(() => {
		if (!isBottomView) return [] as Array<{ addedCount: number; createdAt: Date }>;

		const totalNow = contacts.length;
		const createdAtRaw = (
			campaign as unknown as { createdAt?: string | Date } | undefined
		)?.createdAt;
		const campaignCreatedAt = createdAtRaw ? new Date(createdAtRaw) : null;
		const hasValidCampaignCreatedAt =
			Boolean(campaignCreatedAt) && !Number.isNaN(campaignCreatedAt?.getTime());

		const parsedEvents = (campaignContactEvents ?? [])
			.map((e) => {
				const createdAt = new Date(e.createdAt);
				if (Number.isNaN(createdAt.getTime())) return null;
				return { addedCount: e.addedCount, createdAt };
			})
			.filter(Boolean) as Array<{ addedCount: number; createdAt: Date }>;

		if (parsedEvents.length === 0) {
			// Fallback: synthetic "campaign created" batch for older campaigns
			// (or before the contact-event migration is applied).
			if (!totalNow) return [];
			if (!hasValidCampaignCreatedAt) return [];
			return [{ addedCount: totalNow, createdAt: campaignCreatedAt as Date }];
		}

		// If we have space (fewer than 3 real events), try to include the campaign's creation
		// as a trailing "initial contacts" batch. For campaigns created after this feature,
		// this is already logged as a real event (`campaign.create`) so this will resolve to 0.
		if (parsedEvents.length < 3 && totalNow > 0 && hasValidCampaignCreatedAt) {
			const sumAdded = parsedEvents.reduce((sum, e) => sum + e.addedCount, 0);
			const inferredInitial = Math.max(0, totalNow - sumAdded);
			if (inferredInitial > 0) {
				return [
					...parsedEvents,
					{ addedCount: inferredInitial, createdAt: campaignCreatedAt as Date },
				];
			}
		}

		return parsedEvents;
	}, [campaign, campaignContactEvents, contacts.length, isBottomView]);

	const bottomViewBatchesToShow = useMemo(
		() => bottomViewContactBatches.slice(0, 3),
		[bottomViewContactBatches]
	);
	const bottomViewPlaceholderCount = Math.max(0, 3 - bottomViewBatchesToShow.length);

	const renderSupplementalDraftRow = (draft: EmailWithRelations, draftIndex: number) => {
		const contact =
			contactsById.get(draft.contactId) ??
			((draft.contact as ContactWithName | null) || null);
		const rawContactName = getContactFullName(contact);
		const rawCompanyLabel = contact?.company || '';
		const contactName = rawContactName.includes('@') ? '' : rawContactName;
		const companyLabel = rawCompanyLabel.includes('@')
			? !contactName
				? 'Unknown Contact'
				: ''
			: rawCompanyLabel || (!contactName ? 'Unknown Contact' : '');
		const contactTitle = getContactTitle(contact);
		const messagePreview = draft.message
			? convertHtmlToPlainText(draft.message)
			: 'No content';
		const isSelectedDraft = selectedDraftId === draft.id;
		const isBatchSelectedDraft = selectedDraftIds?.has(draft.id) ?? false;
		const isShowingDraft = isSelectedDraft;
		const isInactiveSelectedDraft = isBatchSelectedDraft && !isShowingDraft;
		const topBarLeftColor = shouldRedOutDraftRows
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: isInactiveSelectedDraft
				? SELECTED_DRAFT_TOP_BAR_COLOR
				: SHOWING_DRAFT_TOP_BAR_COLOR;
		const topBarRightColor = shouldRedOutDraftRows
			? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
			: isShowingDraft
				? SHOWING_DRAFT_TOP_BAR_COLOR
				: '#F9FAFB';
		const topBarLeftWidthPx = isInactiveSelectedDraft ? 177 : 115;

		return (
			<div
				key={`contacts-draft-${draft.id}-${draftIndex}`}
				ref={(el) => {
					if (el) {
						supplementalDraftRowRefs.current.set(draft.id, el);
					} else {
						supplementalDraftRowRefs.current.delete(draft.id);
					}
				}}
				className={cn(
					'relative select-none overflow-hidden',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${SUPPLEMENTAL_DRAFT_ROW_HEIGHT_PX}px`,
					borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
					borderTop: `1.955px solid ${draftSupplementalBorderColor}`,
					borderRight: `1.949px solid ${draftSupplementalBorderColor}`,
					borderBottom: `1.949px solid ${draftSupplementalBorderColor}`,
					borderLeft: `1.949px solid ${draftSupplementalBorderColor}`,
					backgroundColor:
						draftSupplementalRowFillColor ??
						(isShowingDraft
							? SHOWING_DRAFT_ROW_FILL_COLOR
							: isInactiveSelectedDraft
								? SELECTED_DRAFT_ROW_FILL_COLOR
								: '#FFFFFF'),
					boxSizing: 'border-box',
				}}
				onMouseEnter={() => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					onDraftHover?.(draft);
					onContactHover?.(contact);
				}}
				onMouseDown={(e) => {
					if (e.shiftKey) e.preventDefault();
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (e.shiftKey && onDraftSelectionChange) {
						e.preventDefault();
						window.getSelection()?.removeAllRanges();

						const currentIndex = supplementalDraftRows.findIndex(
							(row) => row.id === draft.id
						);
						const anchorDraftId =
							lastClickedDraftRef.current ?? selectedDraftId ?? draft.id;
						const anchorIndex = supplementalDraftRows.findIndex(
							(row) => row.id === anchorDraftId
						);

						if (currentIndex !== -1 && anchorIndex !== -1) {
							const start = Math.min(currentIndex, anchorIndex);
							const end = Math.max(currentIndex, anchorIndex);

							onDraftSelectionChange(() => {
								const next = new Set<number>();
								for (let i = start; i <= end; i++) {
									next.add(supplementalDraftRows[i].id);
								}
								return next;
							});
						}
						return;
					}

					lastClickedDraftRef.current = draft.id;
					onDraftClick?.(draft);
					if (contact) onContactClick?.(contact);
				}}
			>
				<div className="absolute left-0 top-0 h-[13px] w-full pointer-events-none flex">
					<div
						className="h-full shrink-0"
						style={{
							width: `${topBarLeftWidthPx}px`,
							backgroundColor: topBarLeftColor,
						}}
					/>
					<div className="h-full flex-1" style={{ backgroundColor: topBarRightColor }} />
				</div>

				<div className="absolute left-3 top-[17px] right-1/2 pr-1 pointer-events-none">
					<FadeOverflowText
						text={companyLabel}
						className={cn(
							'font-inter text-[14.661px] font-medium leading-[19.547px]',
							draftSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={contactName}
						className={cn(
							'font-inter text-[14.661px] font-normal leading-[19.547px]',
							draftSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>

				<div className="absolute top-[16px] left-1/2 right-2 pl-1 pointer-events-none">
					{isShowingDraft ? (
						<div
							className="w-full h-[17px] rounded-[6px] pl-2 pr-2 border overflow-hidden flex items-center justify-start gap-2"
							style={{
								backgroundColor: SHOWING_DRAFT_TOP_BAR_COLOR,
								borderColor: draftSupplementalBorderColor,
							}}
						>
							<ShowingDraftViewIcon className="w-[20px] h-[11px] shrink-0" />
							<span className="font-inter text-[10px] font-medium leading-none text-black">
								Showing
							</span>
						</div>
					) : contactTitle ? (
						<TitleBadge
							title={contactTitle}
							className="w-full h-[17px] rounded-[6px] px-2 gap-1"
							textClassName={cn(
								'text-[10px] leading-none',
								draftSupplementalTextClassName
							)}
							fillColor={draftSupplementalBadgeFillColor}
							strokeColor={draftSupplementalBorderColor}
							textColor={draftSupplementalTextColor}
							showStroke={!shouldRedOutDraftRows}
							restaurantIconSize={12}
							coffeeIconSize={7}
							defaultIconSize={12}
						/>
					) : null}
				</div>

				<div className="absolute top-[37px] left-1/2 right-2 pl-1 pointer-events-none">
					<StateLocationRow
						contact={contact}
						className="h-[16px] w-full gap-1"
						badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
						badgeTextClassName="font-inter text-[10px] leading-none font-bold"
						cityClassName={cn('text-[10px] leading-none', draftSupplementalTextClassName)}
						badgeFillColor={draftSupplementalBadgeFillColor}
						strokeColor={draftSupplementalBorderColor}
						textColor={draftSupplementalTextColor}
						showBadgeStroke={!shouldRedOutDraftRows}
					/>
				</div>

				<div className="absolute left-3 right-[12px] top-[57px] pointer-events-none">
					<FadeOverflowText
						text={draft.subject || 'No subject'}
						className={cn(
							'font-inter text-[13.215px] font-semibold leading-[21.144px]',
							draftSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={messagePreview}
						className={cn(
							'font-inter text-[13.215px] font-normal leading-[21.144px]',
							draftSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>
			</div>
		);
	};

	const renderSupplementalInboxRow = (conversation: InboxConversation, inboxIndex: number) => {
		const selectionEmail = getInboxConversationSelectionEmail(conversation);
		const email = selectionEmail;
		const previewEmail = conversation.latestMessage;
		const contact = resolveInboundContact(email, contactByEmail, contactsById);
		const contactName = getContactDisplayName(
			contact,
			email.senderName || email.sender || 'Unknown sender'
		);
		const companyLabel = getContactCompanyLabel(contact);
		const contactTitle = getContactTitle(contact);
		const bodyPreview = `${previewEmail.isSent ? 'You: ' : ''}${
			getInboxMessageSnippet(previewEmail) || 'No content'
		}`;
		const optimisticLastSentAt = conversation.messages.reduce((latest, message) => {
			const sentAt = optimisticInboxReplyByEmailId?.[message.id];
			return typeof sentAt === 'number' && sentAt > latest ? sentAt : latest;
		}, 0);
		const latestInboundAt = conversation.latestInboundMessage
			? getInboxMessageTimeMs(conversation.latestInboundMessage)
			: 0;
		const isLastInboxMessageSent =
			conversation.latestMessage.isSent || optimisticLastSentAt > latestInboundAt;
		const selectedInboxRowFillColor = isLastInboxMessageSent
			? INBOX_LAST_SENT_FILL_COLOR
			: '#E5F1FF';
		const isSelectedInboxConversation =
			selectedInboxEmailId != null &&
			(inboxConversationContainsInboundEmailId(conversation, selectedInboxEmailId) ||
				inboxConversationContainsEmailId(conversation, selectedInboxEmailId));

		return (
			<div
				key={`contacts-inbox-${conversation.key}-${inboxIndex}`}
				className={cn(
					'relative select-none overflow-hidden',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX}px`,
					borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
					borderTop: `1.955px solid ${inboxSupplementalBorderColor}`,
					borderRight: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderBottom: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderLeft: `1.949px solid ${inboxSupplementalBorderColor}`,
					background: isSelectedInboxConversation
						? selectedInboxRowFillColor
						: (inboxSupplementalRowFillColor ?? '#F9FAFB'),
					boxSizing: 'border-box',
				}}
				role={!isAllTabNavigation ? 'button' : undefined}
				aria-pressed={!isAllTabNavigation ? isSelectedInboxConversation : undefined}
				tabIndex={!isAllTabNavigation ? 0 : undefined}
				onMouseEnter={() => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					if (isDraftsFocusMode) onDraftHover?.(null);
					onContactHover?.(contact);
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (onInboxEmailClick) {
						onInboxEmailClick(selectionEmail);
						return;
					}
					if (contact) onContactClick?.(contact);
				}}
				onKeyDown={(e) => {
					if (isAllTabNavigation || !onInboxEmailClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onInboxEmailClick(selectionEmail);
					}
				}}
			>
				{/* Layout mirrors supplemental draft rows, but without the top strip. */}
				<div className="absolute left-3 top-[10px] right-1/2 pr-1 pointer-events-none">
					<FadeOverflowText
						text={companyLabel}
						className={cn(
							'font-inter text-[14.661px] font-medium leading-[19.547px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={contactName}
						className={cn(
							'font-inter text-[14.661px] font-normal leading-[19.547px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>

				<div className="absolute top-[9px] left-1/2 right-2 pl-1 pointer-events-none">
					{contactTitle ? (
						<TitleBadge
							title={contactTitle}
							className="w-full h-[17px] rounded-[6px] px-2 gap-1"
							textClassName={cn(
								'text-[10px] leading-none',
								inboxSupplementalTextClassName
							)}
							fillColor={inboxSupplementalBadgeFillColor}
							strokeColor={inboxSupplementalBorderColor}
							textColor={inboxSupplementalTextColor}
							showStroke={!shouldRedOutInboxRows}
							restaurantIconSize={12}
							coffeeIconSize={7}
							defaultIconSize={12}
						/>
					) : null}
				</div>

				<div
					className={cn(
						'absolute left-1/2 right-2 pl-1 pointer-events-none',
						contactTitle ? 'top-[30px]' : 'top-[9px]'
					)}
				>
					<StateLocationRow
						contact={contact}
						className="h-[16px] w-full gap-1"
						badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
						badgeTextClassName="font-inter text-[10px] leading-none font-bold"
						cityClassName={cn('text-[10px] leading-none', inboxSupplementalTextClassName)}
						badgeFillColor={inboxSupplementalBadgeFillColor}
						strokeColor={inboxSupplementalBorderColor}
						textColor={inboxSupplementalTextColor}
						showBadgeStroke={!shouldRedOutInboxRows}
					/>
				</div>

				<div className="absolute left-3 right-[12px] top-[48px] pointer-events-none">
					<FadeOverflowText
						text={previewEmail.subject || 'No subject'}
						className={cn(
							'font-inter text-[13.215px] font-semibold leading-[17px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={bodyPreview}
						className={cn(
							'font-inter text-[13.215px] font-normal leading-[17px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>
			</div>
		);
	};

	const renderSupplementalSentRow = (conversation: InboxConversation, sentIndex: number) => {
		const email = conversation.latestMessage;
		const contact = resolveInboundContact(email, contactByEmail, contactsById);
		const contactName = getContactDisplayName(contact, contact?.email || 'Unknown recipient');
		const companyLabel = getContactCompanyLabel(contact);
		const contactTitle = getContactTitle(contact);
		const messagePreview = `You: ${getInboxMessageSnippet(email) || 'No content'}`;
		const isSelectedSentConversation =
			selectedInboxEmailId != null &&
			inboxConversationContainsSentEmailId(conversation, selectedInboxEmailId);

		return (
			<div
				key={`contacts-inbox-sent-${conversation.key}-${sentIndex}`}
				className={cn(
					'relative select-none overflow-hidden',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX}px`,
					borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
					borderTop: `1.955px solid ${inboxSupplementalBorderColor}`,
					borderRight: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderBottom: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderLeft: `1.949px solid ${inboxSupplementalBorderColor}`,
					background: isSelectedSentConversation
						? '#E5F1FF'
						: (inboxSupplementalRowFillColor ?? '#F9FAFB'),
					boxSizing: 'border-box',
				}}
				role={!isAllTabNavigation ? 'button' : undefined}
				aria-pressed={!isAllTabNavigation ? isSelectedSentConversation : undefined}
				tabIndex={!isAllTabNavigation ? 0 : undefined}
				onMouseEnter={() => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					if (isDraftsFocusMode) onDraftHover?.(null);
					onContactHover?.(contact);
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (onInboxEmailClick) {
						onInboxEmailClick(email);
						return;
					}
					if (contact) onContactClick?.(contact);
				}}
				onKeyDown={(e) => {
					if (isAllTabNavigation) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (onInboxEmailClick) {
							onInboxEmailClick(email);
							return;
						}
						if (contact) onContactClick?.(contact);
					}
				}}
			>
				<div className="absolute left-3 top-[10px] right-1/2 pr-1 pointer-events-none">
					<FadeOverflowText
						text={companyLabel}
						className={cn(
							'font-inter text-[14.661px] font-medium leading-[19.547px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={contactName}
						className={cn(
							'font-inter text-[14.661px] font-normal leading-[19.547px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>

				<div className="absolute top-[9px] left-1/2 right-2 pl-1 pointer-events-none">
					{contactTitle ? (
						<TitleBadge
							title={contactTitle}
							className="w-full h-[17px] rounded-[6px] px-2 gap-1"
							textClassName={cn(
								'text-[10px] leading-none',
								inboxSupplementalTextClassName
							)}
							fillColor={inboxSupplementalBadgeFillColor}
							strokeColor={inboxSupplementalBorderColor}
							textColor={inboxSupplementalTextColor}
							showStroke={!shouldRedOutInboxRows}
							restaurantIconSize={12}
							coffeeIconSize={7}
							defaultIconSize={12}
						/>
					) : null}
				</div>

				<div
					className={cn(
						'absolute left-1/2 right-2 pl-1 pointer-events-none',
						contactTitle ? 'top-[30px]' : 'top-[9px]'
					)}
				>
					<StateLocationRow
						contact={contact}
						className="h-[16px] w-full gap-1"
						badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
						badgeTextClassName="font-inter text-[10px] leading-none font-bold"
						cityClassName={cn('text-[10px] leading-none', inboxSupplementalTextClassName)}
						badgeFillColor={inboxSupplementalBadgeFillColor}
						strokeColor={inboxSupplementalBorderColor}
						textColor={inboxSupplementalTextColor}
						showBadgeStroke={!shouldRedOutInboxRows}
					/>
				</div>

				<div className="absolute left-3 right-[12px] top-[48px] pointer-events-none">
					<FadeOverflowText
						text={email.subject || 'No subject'}
						className={cn(
							'font-inter text-[13.215px] font-semibold leading-[17px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
					<FadeOverflowText
						text={messagePreview}
						className={cn(
							'font-inter text-[13.215px] font-normal leading-[17px]',
							inboxSupplementalTextClassName
						)}
						splitNumericSuffix={false}
					/>
				</div>
			</div>
		);
	};

	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-[8px] flex flex-col overflow-visible',
				// In the compressed bottom-panel view we need exact internal pixel heights.
				// Use a stroke via box-shadow so it doesn't consume layout height.
				shouldRenderCollapsedTopBox
					? 'border-0'
					: isBottomView
						? 'border-2 border-black'
						: isAllTab
							? 'border-[3px] border-black'
							: 'border border-black'
			)}
			style={{
				boxSizing: 'border-box',
				width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
				height:
					typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
				background: panelBackground,
				borderRadius: shouldRenderCollapsedTopBox ? '3.33px' : undefined,
				boxShadow: shouldRenderCollapsedTopBox ? 'inset 0 0 0 2px #000000' : undefined,
				...(isBottomView ? { cursor: 'pointer' } : {}),
			}}
			data-hover-description={
				isInboxFocusMode
					? 'Inbox: This box displays replies from contacts in your campaign.'
					: isDraftsFocusMode
						? 'Drafts: This box displays generated drafts and de-emphasizes non-draft campaign activity.'
						: 'Contacts: This box displays all of the contacts in your campaign. Select contacts to generate drafts.'
			}
			role="region"
			aria-label={
				isInboxFocusMode
					? 'Expanded inbox preview'
					: isDraftsFocusMode
						? 'Expanded drafts preview'
						: 'Expanded contacts preview'
			}
			onMouseEnter={() => isBottomView && setIsContainerHovered(true)}
			onMouseLeave={() => isBottomView && setIsContainerHovered(false)}
			onClick={() => isBottomView && onOpenContacts?.()}
		>
			<style jsx global>{`
				@keyframes murmur-actively-drafting-pulse {
					/* 3/4 feel: gentle swell on beat 3 */
					0%,
					66% {
						opacity: 0;
					}
					76% {
						opacity: 0.18;
					}
					84% {
						opacity: 0.5;
					}
					92% {
						opacity: 0.18;
					}
					100% {
						opacity: 0;
					}
				}

				.murmur-actively-drafting {
					background-color: #ffa5a5;
				}

				.murmur-actively-drafting::after {
					content: '';
					position: absolute;
					inset: 0;
					background: rgba(0, 0, 0, 0.06);
					opacity: 0;
					pointer-events: none;
					will-change: opacity;
					animation: murmur-actively-drafting-pulse 3.6s ease-in-out infinite;
				}

				.murmur-contacts-drafts-redout,
				.murmur-contacts-drafts-redout * {
					color: ${WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR} !important;
					border-color: ${WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR} !important;
				}

				.murmur-contacts-drafts-redout [style*='background-color'] {
					background-color: ${WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR} !important;
				}

				.murmur-contacts-drafts-redout [class*='border'] {
					border-color: transparent !important;
				}

				.murmur-contacts-drafts-redout svg,
				.murmur-contacts-drafts-redout svg * {
					fill: ${WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR} !important;
					stroke: ${WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR} !important;
				}

				@media (prefers-reduced-motion: reduce) {
					.murmur-actively-drafting::after {
						animation: none;
					}
				}
			`}</style>
			{/* Hover outline for bottom view - 3px gap top/bottom, 2px gap sides, 4px thick */}
			{isBottomView && isContainerHovered && (
				<div
					style={{
						position: 'absolute',
						top: '-7px',
						bottom: '-7px',
						left: '-6px',
						right: '-6px',
						border: '4px solid #D75152',
						borderRadius: 0,
						pointerEvents: 'none',
						zIndex: 50,
					}}
				/>
			)}
			{!shouldRenderCollapsedTopBox && (
				<ContactsHeaderChrome
					variant={isBottomView ? 'legacy' : 'campaignStops'}
					isAllTab={isAllTab}
					offsetY={effectiveWhiteSectionHeight === 28 ? 2 : 0}
					whiteSectionHeight={effectiveWhiteSectionHeight}
					activeCampaignStop={resolvedActiveTopNavStop}
					onAllClick={onOpenAll}
					onSearchClick={onOpenSearch}
					onWriteClick={onOpenWriting}
					onSendClick={onOpenSend}
					onInboxClick={onOpenInbox}
					// When this list is rendered on the Write tab (tooltip-enabled), treat "Write"
					// as the active tab so hovering "Write" shows the white-placeholder state.
					activeTab={
						isDraftsFocusMode ? 'drafts' : enableUsedContactTooltip ? 'write' : 'contacts'
					}
					interactive={!isBottomView && !isAllTabNavigation}
				/>
			)}
			{shouldRenderCollapsedTopBox && (
				<div className="absolute left-[8px] top-[1px] z-20 flex h-[13px] items-center pointer-events-none">
					<span className="font-inter text-[12px] font-semibold leading-none text-black">
						Contacts
					</span>
				</div>
			)}
			<div
				className={cn(
					'flex items-center gap-2 px-3 shrink-0',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				style={{ height: `${effectiveWhiteSectionHeight}px` }}
				role={onHeaderClick ? 'button' : undefined}
				tabIndex={onHeaderClick ? 0 : undefined}
				onClick={onHeaderClick}
				onKeyDown={(e) => {
					if (!onHeaderClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onHeaderClick();
					}
				}}
			></div>

			{isAllTab && (
				<div
					className={cn(
						'absolute z-20 flex items-center gap-[12px]',
						isAllTabNavigation ? 'pointer-events-none cursor-default' : 'cursor-pointer'
					)}
					style={{ top: isBottomView ? 1 : -1, right: isBottomView ? 4 : 4 }}
					onClick={onOpenContacts}
					role={onOpenContacts ? 'button' : undefined}
					tabIndex={onOpenContacts ? 0 : undefined}
					onKeyDown={(e) => {
						if (!onOpenContacts) return;
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpenContacts();
						}
					}}
				>
					<span
						className={cn(
							'font-medium leading-none text-[#B3B3B3] font-inter',
							isBottomView ? 'text-[8px]' : 'text-[10px]'
						)}
					>
						Open
					</span>
					<div
						className="flex items-center"
						style={{ marginTop: isBottomView ? 0 : '1px' }}
					>
						<OpenIcon
							width={isBottomView ? 10 : undefined}
							height={isBottomView ? 10 : undefined}
						/>
					</div>
				</div>
			)}

			{!collapsed && !isBottomView && isInboxFocusMode && (
				<div
					className="absolute z-20 flex items-center gap-[6px]"
					style={{ top: '45px', left: '6px' }}
				>
					<DashboardResponsesFilterBar
						activeTab={inboxPanelTab}
						onTabChange={setInboxPanelTab}
						width={339}
						height={22}
						ariaLabel="Inbox contacts filters"
					/>
					<button
						type="button"
						aria-label="Search inbox contacts"
						className="flex items-center justify-center bg-white p-0"
						style={{
							width: '22px',
							height: '22px',
							borderRadius: '6px',
							border: 'none',
							cursor: 'default',
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<SearchIconDesktop width={16} height={16} stroke="black" strokeWidth={2} />
					</button>
				</div>
			)}

			{/* Collapsed bottom panels: label strip + bottom-aligned summary bar. */}
			{shouldRenderCollapsedTopBox && (
				<div className="flex-1 flex items-end justify-center px-[2px]" style={{ paddingBottom: 3 }}>
					{bottomViewBatchesToShow[0] ? (
						<div
							key="contacts-collapsed-batch"
							className={cn(
								'select-none overflow-hidden border-2 border-[#000000] flex items-center justify-between'
							)}
							style={{
								width: `${collapsedTopBoxWidthPx}px`,
								height: `${collapsedTopBoxHeightPx}px`,
								borderRadius: `${collapsedTopBoxRadiusPx}px`,
								backgroundColor: '#F5DADA',
							}}
						>
							<span className="pl-[18px] font-inter font-medium text-[15px] text-black leading-none">
								{formatBatchCount(bottomViewBatchesToShow[0].addedCount)}
							</span>
							<span className="pr-[18px] font-inter font-medium text-[15px] text-black leading-none">
								{formatBatchTimestamp(bottomViewBatchesToShow[0].createdAt)}
							</span>
						</div>
					) : (
						<div
							aria-hidden
							className={cn('select-none overflow-hidden border-2 border-[#000000]')}
							style={{
								width: `${collapsedTopBoxWidthPx}px`,
								height: `${collapsedTopBoxHeightPx}px`,
								borderRadius: `${collapsedTopBoxRadiusPx}px`,
								backgroundColor: '#EB8586',
							}}
						/>
					)}
				</div>
			)}

			{!collapsed && !isBottomView && isDraftsFocusMode && (
				<div className="px-3 mt-2 mb-0 flex items-center justify-center relative z-10 text-[13px] font-inter font-medium text-black/70">
					<span>{draftSelectionCount} Selected</span>
					{onDraftSelectionChange ? (
						<button
							type="button"
							className="absolute right-3 bg-transparent border-none p-0 hover:text-black text-[13px] font-inter font-medium text-black/70 cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								handleDraftSelectAllToggle();
							}}
						>
							{areAllDraftsSelected ? 'Deselect All' : 'Select All'}
						</button>
					) : (
						<span className="absolute right-3 bg-transparent border-none p-0 text-[13px] font-inter font-medium text-black/70 cursor-default">
							Select All
						</span>
					)}
				</div>
			)}

			{!collapsed && !isBottomView && !isDraftsFocusMode && !isInboxFocusMode && (
				<div className="px-3 mt-2 mb-0 flex items-center justify-center relative z-10 text-[13px] font-inter font-medium text-black/70">
					<span>{isAllTabNavigation ? 0 : selectedCount} Selected</span>
					{isAllTabNavigation ? (
						<span className="absolute right-3 bg-transparent border-none p-0 text-[13px] font-inter font-medium text-black/70 cursor-default">
							Select All
						</span>
					) : (
						<button
							type="button"
							className="absolute right-3 bg-transparent border-none p-0 hover:text-black text-[13px] font-inter font-medium text-black/70 cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								handleSelectAllToggle();
							}}
						>
							{areAllSelected ? 'Deselect All' : 'Select All'}
						</button>
					)}
				</div>
			)}

			{!collapsed && (
				<div
					className={cn(
						'relative flex-1 flex flex-col min-h-0',
						isBottomView
							? 'px-[2px] pt-0 pb-0'
							: isInboxFocusMode
								? 'pb-2 pt-[61px]'
								: 'pb-2 pt-2'
					)}
					onMouseLeave={() => {
						setHoveredContactIndex(null);
						onDraftHover?.(null);
						onContactHover?.(null);
					}}
				>
					{enableUsedContactTooltip &&
						typeof document !== 'undefined' &&
						hoveredUsedContactId !== null &&
						usedContactTooltipPos &&
						(() => {
							const resolvedCampaigns = resolvedUsedContactCampaigns;
							const isMultiCampaign = resolvedCampaigns.length > 1;
							const resolvedCampaign = resolvedCampaigns[0] ?? null;

							// Don't render anything until we actually have the campaign info.
							if (!resolvedCampaign) return null;

							const campaignName = resolvedCampaign.name;
							const campaignIdToNavigate = resolvedCampaign.id;

							return createPortal(
								<div
									className={cn(
										'fixed z-[9999] w-[322px] rounded-[8px] bg-[#DAE6FE] text-black border-2 border-black shadow-none',
										!isMultiCampaign && 'h-[60px]'
									)}
									style={{
										left: usedContactTooltipPos.left,
										top: usedContactTooltipPos.top,
									}}
									onMouseEnter={() => {
										clearUsedContactTooltipCloseTimeout();
									}}
									onMouseLeave={() => {
										// Don't hard-close on leave — allow moving between tooltip <-> pill without losing state.
										// The close timeout is cleared when entering either area.
										scheduleCloseUsedContactTooltip(hoveredUsedContactId as number);
									}}
								>
									<span className="absolute left-[12px] top-[6px] text-[17px] font-inter font-medium text-black leading-none pointer-events-none">
										Appears in
									</span>

									{isMultiCampaign ? (
										<div className="pt-[28px] pb-[4px]">
											<div className="flex flex-col gap-[6px] px-[3px]">
												{resolvedCampaigns.map((c, idx) => {
													const isActive = activeUsedContactCampaignIndex === idx;
													return (
														<button
															key={c.id}
															type="button"
															className={cn(
																'w-[312px] h-[26px] rounded-[4px] border-2 border-black text-[17px] font-inter font-medium text-black cursor-pointer flex items-center gap-[10px] px-[10px] box-border',
																isActive ? 'bg-[#AAE19E]' : 'bg-[#CFE4FF]'
															)}
															onMouseEnter={() => setActiveUsedContactCampaignIndex(idx)}
															onClick={(e) => {
																e.stopPropagation();
																router.push(`/murmur/campaign/${c.id}`);
															}}
														>
															{isActive && (
																<span className="leading-none whitespace-nowrap shrink-0">
																	Go To
																</span>
															)}
															<div className="h-[22px] w-fit max-w-full min-w-0 rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
																<FadeOverflowText
																	text={c.name}
																	// Slightly later fade than before, and only when overflowing.
																	fadePx={16}
																	measureKey={isActive}
																	className="text-[17px] font-inter font-medium text-black leading-none"
																/>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									) : (
										<>
											<div className="absolute top-[4px] right-[3px] w-[204px] h-[22px] rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
												<FadeOverflowText
													text={campaignName}
													fadePx={16}
													className="text-[17px] font-inter font-medium text-black leading-none"
												/>
											</div>

											<button
												type="button"
												className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[312px] h-[26px] rounded-[4px] border-2 border-black bg-[#AAE19E] text-[17px] font-inter font-medium text-black cursor-pointer flex items-center justify-center box-border"
												onClick={(e) => {
													e.stopPropagation();
													if (campaignIdToNavigate) {
														router.push(`/murmur/campaign/${campaignIdToNavigate}`);
													}
												}}
											>
												Go To
											</button>
										</>
									)}
								</div>,
								document.body
							);
						})()}
					{/* Scrollable list */}
					<CustomScrollbar
						className="flex-1 drafting-table-content"
						thumbWidth={shouldShowScrollbar ? 2 : 0}
						thumbColor={shouldShowScrollbar ? '#000000' : 'transparent'}
						trackColor="transparent"
						offsetRight={isBottomView ? -7 : -6}
						contentClassName="overflow-x-hidden"
						alwaysShow={false}
					>
						<div
							className={cn(
								'flex flex-col items-center',
								isBottomView ? 'space-y-[1px] pb-0' : 'space-y-2 pb-2'
							)}
							style={{
								paddingTop: customWhiteSectionHeight !== undefined ? '2px' : undefined,
							}}
						>
							{isBottomView ? (
								<>
									{bottomViewBatchesToShow.map((batch, idx) => {
										const countLabel = formatBatchCount(batch.addedCount);
										const rightLabel = formatBatchTimestamp(batch.createdAt);
										return (
											<div
												key={`${batch.createdAt.getTime()}-${batch.addedCount}-${idx}`}
												className={cn(
													'select-none overflow-hidden border-2 border-[#000000] flex items-center justify-between',
													'w-[224px] h-[30px] rounded-[4.7px] bg-[#F5DADA]'
												)}
											>
												<span className="pl-[18px] font-inter font-medium text-[15px] text-black leading-none">
													{countLabel}
												</span>
												<span className="pr-[18px] font-inter font-medium text-[15px] text-black leading-none">
													{rightLabel}
												</span>
											</div>
										);
									})}
									{Array.from({ length: bottomViewPlaceholderCount }).map((_, idx) => (
										<div
											key={`contacts-batch-placeholder-${idx}`}
											className={cn(
												'select-none overflow-hidden border-2 border-[#000000]',
												'w-[224px] h-[30px] rounded-[4.7px] bg-[#EB8586]'
											)}
										/>
									))}
								</>
							) : isInboxFocusMode ? (
								<>
									{inboxPanelTab === 'sent'
										? supplementalSentConversations.map(renderSupplementalSentRow)
										: inboxPanelTab === 'opportunities'
											? supplementalOpportunityInboxConversations.map(renderSupplementalInboxRow)
											: supplementalInboxConversationsResponsesOnly.map(renderSupplementalInboxRow)}
								</>
							) : (
								<>
									{isDraftsFocusMode &&
										supplementalDraftRows.map(renderSupplementalDraftRow)}
									{contacts.map((contact, contactIndex) => {
										const fullName =
											contact.name ||
											`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
										const isActivelyDrafting = Boolean(
											activelyDraftingContactIds?.has(contact.id)
										);
										const isSelected =
											!isActivelyDrafting && currentSelectedIds.has(contact.id);
										const contactTitle = contact.title || contact.headline || '';
										// Pull the contact identity block slightly toward the row center.
										const leftPadding = 'pl-3';
										// Keyboard focus shows hover UI independently of mouse hover
										const isKeyboardFocused = hoveredContactIndex === contactIndex;
										const shouldShowSelectedState = !isAllTabNavigation && isSelected;
										// Final background: actively drafting > selected > keyboard focus > white (mouse hover handled by CSS)
										const contactBgColor = isActivelyDrafting
											? 'murmur-actively-drafting'
											: shouldRedOutContactRows
												? 'bg-[#EB8586]'
												: isAllTabNavigation
													? 'bg-[#FFF]'
													: shouldShowSelectedState
														? 'bg-[#FD8E89]'
														: isKeyboardFocused
															? 'bg-[#FAE6E6]'
															: 'bg-[#FFF] hover:bg-[#FAE6E6]';
										const contactBorderColor = shouldShowSelectedState
											? 'border-white'
											: shouldRedOutContactRows
												? 'border-[#F5C0BD]'
												: 'border-[#000000]';
										return (
											<div
												key={contact.id}
												ref={(el) => {
													if (el) {
														usedContactRowElsRef.current.set(contact.id, el);
													} else {
														usedContactRowElsRef.current.delete(contact.id);
													}
												}}
												className={cn(
													'overflow-hidden border-2 select-none relative grid grid-cols-2 grid-rows-2',
													isAllTabNavigation ? 'cursor-default' : 'cursor-pointer',
													isBottomView
														? 'w-[224px] h-[30px] rounded-[4.7px]'
														: 'max-[480px]:w-[96.27vw]',
													shouldRedOutContactRows && 'murmur-contacts-drafts-redout',
													contactBorderColor,
													contactBgColor
												)}
												style={contactRowStyle}
												onMouseDown={(e) => {
													if (e.shiftKey) e.preventDefault();
												}}
												onMouseEnter={() => {
													if (!isAllTabNavigation) setHoveredContactIndex(contactIndex);
													if (isDraftsFocusMode) onDraftHover?.(null);
													onContactHover?.(contact);
												}}
												onClick={(e) => {
													if (isAllTabNavigation) return;
													if (isDraftsFocusMode) {
														e.stopPropagation();
														onContactClick?.(contact);
														return;
													}
													// Don't allow selecting contacts that are actively drafting.
													if (!isActivelyDrafting) {
														handleContactClick(contact, e);
													}
													onContactClick?.(contact);
												}}
											>
												{/* Bottom view - compact 2-row layout */}
												{isBottomView ? (
													<>
														{fullName ? (
															<>
																{/* Top Left - Name */}
																<div
																	className={cn(
																		'pl-2',
																		'pr-1 flex items-center h-[12px] overflow-hidden'
																	)}
																>
																	<div className="font-bold text-[9px] w-full truncate leading-none">
																		{fullName}
																	</div>
																</div>
																{/* Top Right - Title */}
																<div className="pr-1.5 pl-0.5 flex items-center justify-start h-[12px]">
																	{contactTitle ? (
																		<div
																			className="h-[10px] rounded-[3px] px-1 flex items-center gap-0.5 max-w-full border border-black overflow-hidden"
																			style={{
																				backgroundColor: isRestaurantTitle(contactTitle)
																					? '#C3FBD1'
																					: isCoffeeShopTitle(contactTitle)
																						? '#D6F1BD'
																						: isMusicVenueTitle(contactTitle)
																							? '#B7E5FF'
																							: isMusicFestivalTitle(contactTitle)
																								? '#C1D6FF'
																								: isWeddingPlannerTitle(contactTitle) ||
																									  isWeddingVenueTitle(contactTitle)
																									? '#FFF2BC'
																									: '#E8EFFF',
																			}}
																		>
																			{isRestaurantTitle(contactTitle) && (
																				<RestaurantsIcon size={7} />
																			)}
																			{isCoffeeShopTitle(contactTitle) && (
																				<CoffeeShopsIcon size={4} />
																			)}
																			{isMusicVenueTitle(contactTitle) && (
																				<MusicVenuesIcon
																					size={7}
																					className="flex-shrink-0"
																				/>
																			)}
																			{isMusicFestivalTitle(contactTitle) && (
																				<FestivalsIcon
																					size={7}
																					className="flex-shrink-0"
																				/>
																			)}
																			{(isWeddingPlannerTitle(contactTitle) ||
																				isWeddingVenueTitle(contactTitle)) && (
																				<WeddingPlannersIcon size={7} />
																			)}
																			<span className="text-[7px] text-black leading-none truncate">
																				{isRestaurantTitle(contactTitle)
																					? 'Restaurant'
																					: isCoffeeShopTitle(contactTitle)
																						? 'Coffee Shop'
																						: isMusicVenueTitle(contactTitle)
																							? 'Music Venue'
																							: isMusicFestivalTitle(contactTitle)
																								? 'Music Festival'
																								: isWeddingPlannerTitle(contactTitle)
																									? 'Wedding Planner'
																									: isWeddingVenueTitle(contactTitle)
																										? 'Wedding Venue'
																										: contactTitle}
																			</span>
																		</div>
																	) : null}
																</div>
																{/* Bottom Left - Company */}
																<div
																	className={cn(
																		'pl-2',
																		'pr-1 flex items-center h-[12px] overflow-hidden'
																	)}
																>
																	{contact.company && (
																		<div
																			className="text-[8px] text-black w-full overflow-hidden whitespace-nowrap leading-none"
																			style={{
																				maskImage:
																					'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
																				WebkitMaskImage:
																					'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
																			}}
																		>
																			{contact.company}
																		</div>
																	)}
																</div>
																{/* Bottom Right - Location */}
																<div className="pr-1.5 pl-0.5 flex items-center justify-start h-[12px]">
																	{(contact.city || contact.state) && (
																		<div className="flex items-center gap-0.5">
																			{(() => {
																				const fullStateName =
																					(contact.state as string) || '';
																				const stateAbbr =
																					getStateAbbreviation(fullStateName) || '';
																				const normalizedState = fullStateName.trim();
																				const lowercaseCanadianProvinceNames =
																					canadianProvinceNames.map((s) =>
																						s.toLowerCase()
																					);
																				const isCanadianProvince =
																					lowercaseCanadianProvinceNames.includes(
																						normalizedState.toLowerCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						normalizedState.toUpperCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						stateAbbr.toUpperCase()
																					);
																				const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																				if (!stateAbbr) return null;
																				return isCanadianProvince ? (
																					<div
																						className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border overflow-hidden"
																						style={{ borderColor: '#000000' }}
																						title="Canadian province"
																					>
																						<CanadianFlag
																							width="100%"
																							height="100%"
																							className="w-full h-full"
																						/>
																					</div>
																				) : isUSAbbr ? (
																					<span
																						className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border text-[7px] leading-none font-bold"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[stateAbbr] ||
																								'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{stateAbbr}
																					</span>
																				) : null;
																			})()}
																			{contact.city && (
																				<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
																					{contact.city}
																				</span>
																			)}
																		</div>
																	)}
																</div>
															</>
														) : (
															<>
																{/* Left - Company only, centered vertically across both rows */}
																<div
																	className={cn(
																		'pl-2',
																		'pr-1 row-span-2 flex items-center overflow-hidden'
																	)}
																>
																	<div
																		className="font-bold text-[9px] w-full overflow-hidden whitespace-nowrap leading-none"
																		style={{
																			maskImage:
																				'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
																			WebkitMaskImage:
																				'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
																		}}
																	>
																		{contact.company || 'Contact'}
																	</div>
																</div>
																{/* Right column spans both rows for title + location stacked */}
																<div className="pr-1.5 pl-0.5 row-span-2 flex flex-col justify-center gap-0.5 overflow-hidden">
																	{contactTitle && (
																		<div
																			className="h-[10px] rounded-[3px] px-1 flex items-center gap-0.5 max-w-full border border-black overflow-hidden"
																			style={{
																				backgroundColor: isRestaurantTitle(contactTitle)
																					? '#C3FBD1'
																					: isCoffeeShopTitle(contactTitle)
																						? '#D6F1BD'
																						: isMusicVenueTitle(contactTitle)
																							? '#B7E5FF'
																							: isMusicFestivalTitle(contactTitle)
																								? '#C1D6FF'
																								: isWeddingPlannerTitle(contactTitle) ||
																									  isWeddingVenueTitle(contactTitle)
																									? '#FFF2BC'
																									: isWineBeerSpiritsTitle(contactTitle)
																										? '#BFC4FF'
																										: '#E8EFFF',
																			}}
																		>
																			{isRestaurantTitle(contactTitle) && (
																				<RestaurantsIcon size={7} />
																			)}
																			{isCoffeeShopTitle(contactTitle) && (
																				<CoffeeShopsIcon size={4} />
																			)}
																			{isMusicVenueTitle(contactTitle) && (
																				<MusicVenuesIcon
																					size={7}
																					className="flex-shrink-0"
																				/>
																			)}
																			{isMusicFestivalTitle(contactTitle) && (
																				<FestivalsIcon
																					size={7}
																					className="flex-shrink-0"
																				/>
																			)}
																			{(isWeddingPlannerTitle(contactTitle) ||
																				isWeddingVenueTitle(contactTitle)) && (
																				<WeddingPlannersIcon size={7} />
																			)}
																			{isWineBeerSpiritsTitle(contactTitle) && (
																				<WineBeerSpiritsIcon
																					size={7}
																					className="flex-shrink-0"
																				/>
																			)}
																			<span className="text-[7px] text-black leading-none truncate">
																				{isRestaurantTitle(contactTitle)
																					? 'Restaurant'
																					: isCoffeeShopTitle(contactTitle)
																						? 'Coffee Shop'
																						: isMusicVenueTitle(contactTitle)
																							? 'Music Venue'
																							: isMusicFestivalTitle(contactTitle)
																								? 'Music Festival'
																								: isWeddingPlannerTitle(contactTitle)
																									? 'Wedding Planner'
																									: isWeddingVenueTitle(contactTitle)
																										? 'Wedding Venue'
																										: isWineBeerSpiritsTitle(contactTitle)
																											? getWineBeerSpiritsLabel(
																													contactTitle
																												)
																											: contactTitle}
																			</span>
																		</div>
																	)}
																	{(contact.city || contact.state) && (
																		<div className="flex items-center gap-0.5">
																			{(() => {
																				const fullStateName =
																					(contact.state as string) || '';
																				const stateAbbr =
																					getStateAbbreviation(fullStateName) || '';
																				const normalizedState = fullStateName.trim();
																				const lowercaseCanadianProvinceNames =
																					canadianProvinceNames.map((s) =>
																						s.toLowerCase()
																					);
																				const isCanadianProvince =
																					lowercaseCanadianProvinceNames.includes(
																						normalizedState.toLowerCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						normalizedState.toUpperCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						stateAbbr.toUpperCase()
																					);
																				const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																				if (!stateAbbr) return null;
																				return isCanadianProvince ? (
																					<div
																						className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border overflow-hidden"
																						style={{ borderColor: '#000000' }}
																						title="Canadian province"
																					>
																						<CanadianFlag
																							width="100%"
																							height="100%"
																							className="w-full h-full"
																						/>
																					</div>
																				) : isUSAbbr ? (
																					<span
																						className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border text-[7px] leading-none font-bold"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[stateAbbr] ||
																								'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{stateAbbr}
																					</span>
																				) : null;
																			})()}
																			{contact.city && (
																				<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
																					{contact.city}
																				</span>
																			)}
																		</div>
																	)}
																</div>
															</>
														)}
													</>
												) : fullName ? (
													<>
														{/* Left - Name and company centered as a tighter stack */}
														<div
															className={cn(
																leftPadding,
																'col-start-1 row-start-1 row-span-2 pr-1 flex flex-col justify-center gap-[1px] overflow-hidden'
															)}
														>
															<div className="font-inter text-[14.661px] font-normal leading-[17px] text-black text-left w-full truncate">
																{fullName}
															</div>
															{contact.company ? (
																<div
																	className="font-inter text-[14.661px] font-medium leading-[17px] text-black text-left w-full overflow-hidden whitespace-nowrap"
																	style={{
																		maskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																		WebkitMaskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																	}}
																>
																	{contact.company}
																</div>
															) : null}
														</div>

														{/* Top Right - Title (aligned to top slot) */}
														<div className="col-start-2 row-start-1 pr-2 pl-1 flex items-end pb-[2px] overflow-hidden">
															{contactTitle ? (
																<div
																	className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																	style={{
																		backgroundColor: isRestaurantTitle(contactTitle)
																			? '#C3FBD1'
																			: isCoffeeShopTitle(contactTitle)
																				? '#D6F1BD'
																				: isMusicVenueTitle(contactTitle)
																					? '#B7E5FF'
																					: isMusicFestivalTitle(contactTitle)
																						? '#C1D6FF'
																						: isWeddingPlannerTitle(contactTitle) ||
																							  isWeddingVenueTitle(contactTitle)
																							? '#FFF2BC'
																							: '#E8EFFF',
																	}}
																>
																	{isRestaurantTitle(contactTitle) && (
																		<RestaurantsIcon size={12} />
																	)}
																	{isCoffeeShopTitle(contactTitle) && (
																		<CoffeeShopsIcon size={7} />
																	)}
																	{isMusicVenueTitle(contactTitle) && (
																		<MusicVenuesIcon
																			size={12}
																			className="flex-shrink-0"
																		/>
																	)}
																	{isMusicFestivalTitle(contactTitle) && (
																		<FestivalsIcon size={12} className="flex-shrink-0" />
																	)}
																	{(isWeddingPlannerTitle(contactTitle) ||
																		isWeddingVenueTitle(contactTitle)) && (
																		<WeddingPlannersIcon size={12} />
																	)}
																	<ScrollableText
																		text={
																			isRestaurantTitle(contactTitle)
																				? 'Restaurant'
																				: isCoffeeShopTitle(contactTitle)
																					? 'Coffee Shop'
																					: isMusicVenueTitle(contactTitle)
																						? 'Music Venue'
																						: isMusicFestivalTitle(contactTitle)
																							? 'Music Festival'
																							: isWeddingPlannerTitle(contactTitle)
																								? 'Wedding Planner'
																								: isWeddingVenueTitle(contactTitle)
																									? 'Wedding Venue'
																									: contactTitle
																		}
																		className="text-[10px] text-black leading-none"
																		scrollPixelsPerSecond={60}
																	/>
																</div>
															) : (
																<div className="w-full" />
															)}
														</div>

														{/* Bottom Right - Location (aligned to bottom slot) */}
														<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
															{contact.city || contact.state ? (
																<div className="flex items-center gap-1 w-full">
																	{(() => {
																		const fullStateName = (contact.state as string) || '';
																		const stateAbbr =
																			getStateAbbreviation(fullStateName) || '';
																		const normalizedState = fullStateName.trim();
																		const lowercaseCanadianProvinceNames =
																			canadianProvinceNames.map((s) => s.toLowerCase());
																		const isCanadianProvince =
																			lowercaseCanadianProvinceNames.includes(
																				normalizedState.toLowerCase()
																			) ||
																			canadianProvinceAbbreviations.includes(
																				normalizedState.toUpperCase()
																			) ||
																			canadianProvinceAbbreviations.includes(
																				stateAbbr.toUpperCase()
																			);
																		const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																		if (!stateAbbr) return null;
																		return isCanadianProvince ? (
																			<div
																				className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																				style={{ borderColor: '#000000' }}
																				title="Canadian province"
																			>
																				<CanadianFlag
																					width="100%"
																					height="100%"
																					className="w-full h-full"
																				/>
																			</div>
																		) : isUSAbbr ? (
																			<span
																				className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																				style={{
																					backgroundColor:
																						stateBadgeColorMap[stateAbbr] ||
																						'transparent',
																					borderColor: '#000000',
																				}}
																			>
																				{stateAbbr}
																			</span>
																		) : (
																			<span
																				className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																				style={{ borderColor: '#000000' }}
																			/>
																		);
																	})()}

																	{contact.city ? (
																		<ScrollableText
																			text={contact.city}
																			className="text-[10px] text-black leading-none"
																		/>
																	) : (
																		<div className="w-full" />
																	)}
																</div>
															) : (
																<div className="w-full" />
															)}
														</div>
													</>
												) : (
													<>
														{/* Top Left - Company only */}
														<div
															className={cn(
																leftPadding,
																'col-start-1 row-start-1 pr-1 flex items-end pb-[2px] overflow-hidden'
															)}
														>
															<div
																className="font-inter text-[14.661px] font-medium leading-[17px] text-black text-left w-full overflow-hidden whitespace-nowrap"
																style={{
																	maskImage:
																		'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																	WebkitMaskImage:
																		'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																}}
															>
																{contact.company || 'Contact'}
															</div>
														</div>
														<div className="col-start-1 row-start-2" />

														{contactTitle ? (
															<>
																{/* Top Right - Title */}
																<div className="col-start-2 row-start-1 pr-2 pl-1 flex items-end pb-[2px] overflow-hidden">
																	<div
																		className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																		style={{
																			backgroundColor: isRestaurantTitle(contactTitle)
																				? '#C3FBD1'
																				: isCoffeeShopTitle(contactTitle)
																					? '#D6F1BD'
																					: isMusicVenueTitle(contactTitle)
																						? '#B7E5FF'
																						: isMusicFestivalTitle(contactTitle)
																							? '#C1D6FF'
																							: isWeddingPlannerTitle(contactTitle) ||
																								  isWeddingVenueTitle(contactTitle)
																								? '#FFF2BC'
																								: '#E8EFFF',
																		}}
																	>
																		{isRestaurantTitle(contactTitle) && (
																			<RestaurantsIcon size={12} />
																		)}
																		{isCoffeeShopTitle(contactTitle) && (
																			<CoffeeShopsIcon size={7} />
																		)}
																		{isMusicVenueTitle(contactTitle) && (
																			<MusicVenuesIcon
																				size={12}
																				className="flex-shrink-0"
																			/>
																		)}
																		{isMusicFestivalTitle(contactTitle) && (
																			<FestivalsIcon
																				size={12}
																				className="flex-shrink-0"
																			/>
																		)}
																		{(isWeddingPlannerTitle(contactTitle) ||
																			isWeddingVenueTitle(contactTitle)) && (
																			<WeddingPlannersIcon size={12} />
																		)}
																		<ScrollableText
																			text={
																				isRestaurantTitle(contactTitle)
																					? 'Restaurant'
																					: isCoffeeShopTitle(contactTitle)
																						? 'Coffee Shop'
																						: isMusicVenueTitle(contactTitle)
																							? 'Music Venue'
																							: isMusicFestivalTitle(contactTitle)
																								? 'Music Festival'
																								: isWeddingPlannerTitle(contactTitle)
																									? 'Wedding Planner'
																									: isWeddingVenueTitle(contactTitle)
																										? 'Wedding Venue'
																										: contactTitle
																			}
																			className="text-[10px] text-black leading-none"
																		/>
																	</div>
																</div>

																{/* Bottom Right - Location */}
																<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
																	{contact.city || contact.state ? (
																		<div className="flex items-center gap-1 w-full">
																			{(() => {
																				const fullStateName =
																					(contact.state as string) || '';
																				const stateAbbr =
																					getStateAbbreviation(fullStateName) || '';
																				const normalizedState = fullStateName.trim();
																				const lowercaseCanadianProvinceNames =
																					canadianProvinceNames.map((s) =>
																						s.toLowerCase()
																					);
																				const isCanadianProvince =
																					lowercaseCanadianProvinceNames.includes(
																						normalizedState.toLowerCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						normalizedState.toUpperCase()
																					) ||
																					canadianProvinceAbbreviations.includes(
																						stateAbbr.toUpperCase()
																					);
																				const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																				if (!stateAbbr) return null;
																				return isCanadianProvince ? (
																					<div
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																						style={{ borderColor: '#000000' }}
																						title="Canadian province"
																					>
																						<CanadianFlag
																							width="100%"
																							height="100%"
																							className="w-full h-full"
																						/>
																					</div>
																				) : isUSAbbr ? (
																					<span
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[stateAbbr] ||
																								'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{stateAbbr}
																					</span>
																				) : (
																					<span
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																						style={{ borderColor: '#000000' }}
																					/>
																				);
																			})()}
																			{contact.city ? (
																				<ScrollableText
																					text={contact.city}
																					className="text-xs text-black w-full"
																				/>
																			) : (
																				<div className="w-full"></div>
																			)}
																		</div>
																	) : (
																		<div className="w-full"></div>
																	)}
																</div>
															</>
														) : (
															<div className="col-start-2 row-span-2 pr-2 pl-1 flex items-center h-full">
																{contact.city || contact.state ? (
																	<div className="flex items-center gap-1 w-full">
																		{(() => {
																			const fullStateName =
																				(contact.state as string) || '';
																			const stateAbbr =
																				getStateAbbreviation(fullStateName) || '';
																			const normalizedState = fullStateName.trim();
																			const isCanadianProvince =
																				canadianProvinceNames.includes(
																					normalizedState.toLowerCase()
																				) ||
																				canadianProvinceAbbreviations.includes(
																					normalizedState.toUpperCase()
																				) ||
																				canadianProvinceAbbreviations.includes(
																					stateAbbr.toUpperCase()
																				);
																			const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																			if (!stateAbbr) return null;
																			return isCanadianProvince ? (
																				<div
																					className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																					style={{ borderColor: '#000000' }}
																					title="Canadian province"
																				>
																					<CanadianFlag
																						width="100%"
																						height="100%"
																						className="w-full h-full"
																					/>
																				</div>
																			) : isUSAbbr ? (
																				<span
																					className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																					style={{
																						backgroundColor:
																							stateBadgeColorMap[stateAbbr] ||
																							'transparent',
																						borderColor: '#000000',
																					}}
																				>
																					{stateAbbr}
																				</span>
																			) : (
																				<span
																					className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																					style={{ borderColor: '#000000' }}
																				/>
																			);
																		})()}
																		{contact.city ? (
																			<ScrollableText
																				text={contact.city}
																				className="text-xs text-black w-full"
																			/>
																		) : (
																			<div className="w-full"></div>
																		)}
																	</div>
																) : (
																	<div className="w-full"></div>
																)}
															</div>
														)}
													</>
												)}
											</div>
										);
									})}
									{!isDraftsFocusMode &&
										supplementalDraftRows.map(renderSupplementalDraftRow)}
									{supplementalInboxConversations.map(renderSupplementalInboxRow)}
								</>
							)}
							{Array.from({
								length: Math.max(0, (!isBottomView ? minRows : 0) - totalRenderedRows),
							}).map((_, idx) => {
								const inboxPlaceholderStyle = isInboxFocusMode
									? {
											width: contactRowWidth,
											height: `${SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX}px`,
											borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
											borderTop: `1.955px solid ${inboxSupplementalBorderColor}`,
											borderRight: `1.949px solid ${inboxSupplementalBorderColor}`,
											borderBottom: `1.949px solid ${inboxSupplementalBorderColor}`,
											borderLeft: `1.949px solid ${inboxSupplementalBorderColor}`,
											backgroundColor: panelFillColor,
											boxSizing: 'border-box' as const,
										}
									: undefined;

								return (
									<div
										key={`placeholder-${idx}`}
										className={cn(
											'select-none overflow-hidden border-2 border-[#000000]',
											isBottomView
												? 'w-[224px] h-[30px] rounded-[4.7px]'
												: 'max-[480px]:w-[96.27vw]',
											shouldShowLoadingWave
												? 'contacts-expanded-list-loading-wave-row'
												: !isInboxFocusMode && 'bg-[#EB8586]'
										)}
										style={{
											...(inboxPlaceholderStyle ?? contactRowStyle ?? {}),
											...(shouldShowLoadingWave
												? {
														animationDelay: `${-(
															loadingWaveDurationSeconds -
															idx * loadingWaveStepSeconds
														)}s`,
												  }
												: {}),
										}}
									/>
								);
							})}
						</div>
					</CustomScrollbar>
				</div>
			)}
		</div>
	);
};

export default ContactsExpandedList;
