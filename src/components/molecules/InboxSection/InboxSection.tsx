'use client';

import {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import {
	useMarkConversationRead,
	useSendConversationReply,
} from '@/hooks/queryHooks/useConversations';
import { convertHtmlToPlainText } from '@/utils';
import { useMe } from '@/hooks/useMe';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { CalendarPlusIcon } from '@/components/atoms/_svg/CalendarPlusIcon';
import { BookingRequestBanner } from '@/components/molecules/BookingRequestBanner/BookingRequestBanner';
import { VenueInviteToConnectBanner } from '@/components/molecules/VenueInviteToConnectBanner/VenueInviteToConnectBanner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import type { InboundEmailWithRelations } from '@/types';
import type { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { urls } from '@/constants/urls';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { useCampaignTopSearchHighlight } from '@/contexts/CampaignTopSearchHighlightContext';
import {
	buildInboxConversations,
	getInboxMessageTimeMs,
	getInboxMessageSnippet,
	inboxConversationContainsEmailId,
	inboxConversationContainsInboundEmailId,
	inboxConversationContainsSentEmailId,
	isApplicationSentRow,
	normalizeApplicationForInboxConversation,
	stripQuotedReply,
	type InboxConversation,
	type InboxConversationMessage,
} from '@/utils/inboxConversations';
import {
	useGetMyEventApplications,
	type MyEventApplication,
} from '@/hooks/queryHooks/useEventApplications';
import {
	deriveEventChatStatus,
	formatEventDateLabel,
} from '@/utils/eventChatStatus';
import { EventChatStatusPill } from '@/components/molecules/EventChatCard/EventChatCard';
import {
	InboxRichReplyEditor,
	isRichTextMessageEmpty,
} from '@/components/molecules/InboxSection/InboxRichReplyEditor';
import {
	InboxBookingCalendarDropdown,
	type BookingPrefillFields,
} from '@/components/molecules/InboxSection/InboxBookingCalendarDropdown';
import {
	findBookingForConversation,
	useDeleteCalendarEntry,
	useGetCalendarEntries,
	useUpsertCalendarEntry,
} from '@/hooks/queryHooks/useCalendarEntries';
import {
	DEFAULT_END_TIME,
	DEFAULT_START_TIME,
	formatCalendarDate,
	parseIsoKey,
	toIsoKey,
} from '@/components/molecules/DashboardCalendarPanel/calendarShared';
import {
	extractFirstMentionedDate,
	readBookedBannerAnswers,
	recordBookedBannerAnswer,
	type BookedBannerAnswer,
} from '@/utils/bookingDates';

/**
 * Strip quoted reply content from HTML email body
 */
const stripQuotedReplyHtml = (html: string): string => {
	// Remove Gmail-style quoted content (div with gmail_quote class)
	let result = html.replace(
		/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
		''
	);

	// Remove blockquote elements (common in email replies)
	result = result.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');

	// Remove "On ... wrote:" pattern and everything after in plain text within HTML
	const patterns = [
		/<div[^>]*>On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M[\s\S]*$/i,
		/On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*$/i,
		/On\s+.*?\s+wrote:[\s\S]*$/i,
	];

	for (const pattern of patterns) {
		result = result.replace(pattern, '');
	}

	return result.trim();
};

interface InboxSectionProps {
	/**
	 * Optional list of sender email addresses that should be visible
	 * in this inbox instance. When provided, inbound emails whose
	 * `sender` does not match any of these addresses will be hidden.
	 *
	 * Intended for the in‑campaign inbox, where we only want to show
	 * replies from contacts that belong to the active campaign.
	 */
	allowedSenderEmails?: string[];

	/**
	 * Optional map of sender email -> campaign contact.
	 * When provided (in campaign inbox), this is treated as the
	 * source of truth for the contact's name/company.
	 */
	contactByEmail?: Record<string, ContactWithName>;

	/**
	 * Optional campaign ID to filter sent emails by campaign.
	 */
	campaignId?: number;

	/**
	 * Optional callback to navigate to the drafts tab in the campaign page.
	 */
	onGoToDrafting?: () => void;

	/**
	 * Optional callback to navigate to the writing tab in the campaign page.
	 */
	onGoToWriting?: () => void;

	/**
	 * Optional callback to navigate to the contacts tab in the campaign page.
	 */
	onGoToContacts?: () => void;

	/**
	 * Optional callback to navigate to the campaign-scoped dashboard search/map view.
	 * Used by the inbox empty-state "Add More Contacts" button.
	 */
	onGoToSearch?: () => void;

	/**
	 * Optional callback when a contact is selected (based on the selected email).
	 * Used to display the research panel for the selected contact.
	 */
	onContactSelect?: (contact: ContactWithName | null) => void;

	/**
	 * Optional callback when hovering over an email in the list.
	 * Used to temporarily display the research panel for the hovered contact.
	 */
	onContactHover?: (contact: ContactWithName | null) => void;

	/**
	 * Optional callback when hovering an event-chat row (a conversation tied to
	 * an event application). Replaces the research panel with the opportunity
	 * panel for these rows.
	 */
	onEventChatHover?: (application: MyEventApplication | null) => void;

	/**
	 * When true, renders the inbox in a narrower layout (516px wide).
	 * Used when viewport width is <= 1520px.
	 */
	isNarrow?: boolean;

	/**
	 * Optional sample data for non-auth/demo contexts (e.g. landing page).
	 * When provided, API queries are disabled and this data is rendered instead.
	 */
	sampleData?: {
		inboundEmails: InboundEmailWithRelations[];
		sentEmails?: Array<InboundEmailWithRelations & { isSent?: boolean }>;
	};

	/**
	 * Override the desktop (non-mobile) inbox container width in pixels.
	 * Useful when embedding the inbox in marketing/landing layouts.
	 */
	desktopWidth?: number;

	/**
	 * Override the desktop (non-mobile) inbox container height in pixels.
	 * Useful when embedding the inbox in marketing/landing layouts.
	 */
	desktopHeight?: number;

	/**
	 * Removes the default outer horizontal padding used in app pages.
	 * Useful when the parent container already controls spacing.
	 */
	noOuterPadding?: boolean;

	/**
	 * Forces the "desktop" layout even on mobile devices.
	 * Useful for marketing embeds that are already scaled by a parent (e.g. ScaledToFit)
	 * and should keep the same proportions as desktop.
	 */
	forceDesktopLayout?: boolean;

	/**
	 * Marketing/demo mode: prevents the inbox from capturing scroll/touch (so the page scroll
	 * works normally) and keeps the demo pinned to the "top" state where the header/search
	 * is visible.
	 */
	demoMode?: boolean;

	/**
	 * Optional dashboard "Inbox" sub-tab selection (Messages vs Campaigns).
	 * When provided, replaces the default Inbox/Sent toggle UI.
	 */
	inboxSubtab?: 'messages' | 'campaigns';
	onInboxSubtabChange?: (next: 'messages' | 'campaigns') => void;

	/**
	 * Dashboard inbox mode: removes the top "window chrome" (white strip + dots)
	 * and aligns the search bar + toggle to match the dashboard Campaigns tab.
	 */
	dashboardMode?: boolean;

	/**
	 * Controls the loading skeleton styling for different embedding contexts.
	 * - **default**: current skeleton styling (used outside the dashboard tab)
	 * - **dashboard**: dashboard inbox tab skeleton (no top "window chrome")
	 */
	loadingVariant?: 'default' | 'dashboard';

	/**
	 * Optional Tailwind class override for the email row hover background in the
	 * list view (e.g. `hover:bg-[#E8E8E8]`). Defaults to `hover:bg-gray-50`.
	 *
	 * This is intended for the campaign-page inbox dropdown so we can match
	 * Figma without affecting other inbox views.
	 */
	emailRowHoverClassName?: string;

	/**
	 * Optional custom scrollbar overrides (used by the campaign-page inbox dropdown).
	 * Defaults preserve the existing "outside + dark thumb" behavior.
	 */
	scrollbarThumbColor?: string;
	scrollbarOffsetRight?: number;
	scrollbarAlignTrackToScrollContainer?: boolean;

	/**
	 * Optional request to switch between the Inbox and Sent tabs.
	 * When `requestId` changes, the inbox will switch to the requested tab.
	 *
	 * This is used by the campaign page to route "Sent" navigation into the inbox's Sent view.
	 */
	inboxSentTabRequest?: {
		tab: 'inbox' | 'sent';
		requestId: number;
		preserveSelection?: boolean;
	} | null;
	/**
	 * Optional callback fired whenever the Inbox/Sent tab changes (user click or auto-default).
	 */
	onInboxSentTabChange?: (next: 'inbox' | 'sent') => void;

	/**
	 * Optional controlled selected email. Used when the email list is rendered outside this panel.
	 */
	selectedEmailId?: number | null;
	onSelectedEmailIdChange?: (next: number | null) => void;
	onThreadReplySent?: (messageIds: number[], sentAtMs: number) => void;
	autoSelectFirstEmail?: boolean;
	detailOnly?: boolean;
	hideSelectedEmailBackButton?: boolean;
	/**
	 * Campaign inbox only: called when the campaign inbox has no messages at all
	 * (no replies AND nothing sent). The parent should navigate away from the inbox
	 * view so the box never lands on the empty "Check Back Later" state.
	 */
	onCampaignInboxEmpty?: () => void;
}

/**
 * Header chrome for the Inbox section with hover functionality.
 * Shows Contacts pill when hovering the first dot, Write pill for second dot, Drafts for third.
 */
const InboxSectionHeaderChrome: FC<{
	onContactsClick?: () => void;
	onWriteClick?: () => void;
	onDraftsClick?: () => void;
}> = ({ onContactsClick, onWriteClick, onDraftsClick }) => {
	const [isDot1Hovered, setIsDot1Hovered] = useState(false);
	const [isDot2Hovered, setIsDot2Hovered] = useState(false);
	const [isDot3Hovered, setIsDot3Hovered] = useState(false);
	const wasAnyDotHoveredRef = useRef(false);

	// Inbox header positions (from existing inline code)
	const dotTop = 9.5; // top with translateY(-50%)
	const dotSize = 9;

	// Dot positions
	const dot1Left = 17;
	const dot2Left = 78;
	const dot3Left = 139;

	// Main Inbox pill position
	const inboxPillLeft = 174;
	const inboxPillWidth = 66;
	const inboxPillHeight = 17;

	// Contacts pill dimensions (shown when hovering dot 1)
	const contactsPillWidth = 66;
	const contactsPillHeight = 17;
	const contactsPillLeft = 3;

	// Write pill dimensions (shown when hovering dot 2)
	const writePillWidth = 56;
	const writePillHeight = 17;
	const writePillLeft = 55;

	// Drafts pill dimensions (shown when hovering dot 3)
	const draftsPillWidth = 56;
	const draftsPillHeight = 17;
	const draftsPillLeft = 115;

	const isAnyDotHovered = isDot1Hovered || isDot2Hovered || isDot3Hovered;
	const isSwitchingBetweenDots = wasAnyDotHoveredRef.current && isAnyDotHovered;
	const animatedTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
	const instantTransition = '0s';
	const pillOpacityTransition = isSwitchingBetweenDots
		? instantTransition
		: animatedTransition;

	useEffect(() => {
		wasAnyDotHoveredRef.current = isAnyDotHovered;
	}, [isAnyDotHovered]);

	// Inbox pill position when hovered
	const getInboxPillLeft = () => {
		if (isDot1Hovered) return inboxPillLeft + 18;
		if (isDot2Hovered) return inboxPillLeft + 5;
		if (isDot3Hovered) return inboxPillLeft + 5;
		return inboxPillLeft;
	};

	// Hover zones
	const hoverZoneHeight = 30;
	const hoverZoneTop = dotTop - hoverZoneHeight / 2;
	const dot1Center = dot1Left + dotSize / 2;
	const dot2Center = dot2Left + dotSize / 2;
	const dot3Center = dot3Left + dotSize / 2;
	const midpoint1to2 = (dot1Center + dot2Center) / 2;
	const midpoint2to3 = (dot2Center + dot3Center) / 2;
	const hoverZone1Left = dot1Center - 20;
	const hoverZone1Width = midpoint1to2 - hoverZone1Left;
	const hoverZone2Left = midpoint1to2;
	const hoverZone2Width = midpoint2to3 - midpoint1to2;
	const hoverZone3Left = midpoint2to3;
	const hoverZone3Width = dot3Center + 30 - midpoint2to3;

	return (
		<>
			{/* Inbox pill - transforms to white and moves on hover */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${getInboxPillLeft()}px`,
					width: `${inboxPillWidth}px`,
					height: `${inboxPillHeight}px`,
					borderRadius: '9px',
					border: '2px solid #000000',
					backgroundColor: isAnyDotHovered ? '#FFFFFF' : '#CCDFF4',
					zIndex: 10,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					transition: `left ${animatedTransition}, background-color ${animatedTransition}`,
				}}
			>
				<span
					className="text-[10px] font-bold text-black leading-none"
					style={{
						opacity: isAnyDotHovered ? 0 : 1,
						transition: `opacity ${animatedTransition}`,
					}}
				>
					Inbox
				</span>
			</div>

			{/* Contacts pill - shown when hovering dot 1 */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${contactsPillLeft}px`,
					width: `${contactsPillWidth}px`,
					height: `${contactsPillHeight}px`,
					backgroundColor: '#F5DADA',
					border: '2px solid #000000',
					borderRadius: '9px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot1Hovered ? 1 : 0,
					pointerEvents: isDot1Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onContactsClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
			>
				<span className="text-[10px] font-bold text-black leading-none">Contacts</span>
			</div>

			{/* Write pill - shown when hovering dot 2 */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${writePillLeft}px`,
					width: `${writePillWidth}px`,
					height: `${writePillHeight}px`,
					backgroundColor: '#A6E2A8',
					border: '2px solid #000000',
					borderRadius: '9px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot2Hovered ? 1 : 0,
					pointerEvents: isDot2Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onWriteClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onWriteClick?.();
				}}
			>
				<span className="text-[10px] font-bold text-black leading-none">Write</span>
			</div>

			{/* Drafts pill - shown when hovering dot 3 */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${draftsPillLeft}px`,
					width: `${draftsPillWidth}px`,
					height: `${draftsPillHeight}px`,
					backgroundColor: '#EFDAAF',
					border: '2px solid #000000',
					borderRadius: '9px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot3Hovered ? 1 : 0,
					pointerEvents: isDot3Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onDraftsClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onDraftsClick?.();
				}}
			>
				<span className="text-[10px] font-bold text-black leading-none">Drafts</span>
			</div>

			{/* Dot 1 - hidden when hovered */}
			<svg
				width="9"
				height="9"
				viewBox="0 0 9 9"
				fill="none"
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${dot1Left}px`,
					zIndex: 10,
					opacity: isDot1Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			>
				<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
			</svg>

			{/* Dot 2 - hidden when hovered */}
			<svg
				width="9"
				height="9"
				viewBox="0 0 9 9"
				fill="none"
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${dot2Left}px`,
					zIndex: 10,
					opacity: isDot2Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			>
				<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
			</svg>

			{/* Dot 3 - hidden when hovered */}
			<svg
				width="9"
				height="9"
				viewBox="0 0 9 9"
				fill="none"
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					transform: 'translateY(-50%)',
					left: `${dot3Left}px`,
					zIndex: 10,
					opacity: isDot3Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			>
				<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
			</svg>

			{/* Invisible hover zone for dot 1 */}
			<div
				onMouseEnter={() => setIsDot1Hovered(true)}
				onMouseLeave={() => setIsDot1Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone1Left}px`,
					width: `${hoverZone1Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onContactsClick ? 'pointer' : 'default',
				}}
			/>

			{/* Invisible hover zone for dot 2 */}
			<div
				onMouseEnter={() => setIsDot2Hovered(true)}
				onMouseLeave={() => setIsDot2Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onWriteClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone2Left}px`,
					width: `${hoverZone2Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onWriteClick ? 'pointer' : 'default',
				}}
			/>

			{/* Invisible hover zone for dot 3 */}
			<div
				onMouseEnter={() => setIsDot3Hovered(true)}
				onMouseLeave={() => setIsDot3Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onDraftsClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone3Left}px`,
					width: `${hoverZone3Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onDraftsClick ? 'pointer' : 'default',
				}}
			/>
		</>
	);
};

/**
 * Resolve the best contact object for a given inbound email, preferring
 * the campaign contact (from `contactByEmail`) over the raw `email.contact`.
 */
const resolveContactForEmail = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
) => {
	const senderKey = email.sender?.toLowerCase().trim();
	if (senderKey && contactByEmail && contactByEmail[senderKey]) {
		return contactByEmail[senderKey] as any;
	}
	return email.contact as any;
};

/**
 * Derive a stable, campaign-linked display name for an inbound email.
 * Prefer the linked campaign contact over the raw email sender/header.
 */
const getCanonicalContactName = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): string => {
	const contact: any = resolveContactForEmail(email, contactByEmail);

	if (contact) {
		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const legacyName: string | undefined =
			typeof contact.name === 'string' ? contact.name : undefined;

		const primary =
			fullName ||
			(legacyName && legacyName.trim()) ||
			(contact.company && contact.company.trim()) ||
			(contact.email && contact.email.trim());

		if (primary && typeof primary === 'string' && primary.trim().length > 0) {
			return primary.trim();
		}
	}

	// Fallback: raw sender info from the inbound email headers
	const senderLabel = email.senderName?.trim() || email.sender?.trim();
	return senderLabel || 'Unknown sender';
};

/**
 * Optional secondary label for the company, shown only when we have a
 * separate person name as the primary label (mirrors ContactResearchPanel).
 */
const getContactCompanyLabel = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): string | null => {
	const contact: any = resolveContactForEmail(email, contactByEmail);
	if (!contact) return null;

	const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const legacyName: string | undefined =
		typeof contact.name === 'string' ? contact.name : undefined;

	const hasName =
		(fullName && fullName.length > 0) || (legacyName && legacyName.trim().length > 0);

	// If we are showing the company as the main title (because no name),
	// don't repeat it as a secondary label.
	if (!hasName) return null;

	const company: string | undefined =
		typeof contact.company === 'string' ? contact.company : undefined;

	if (!company || !company.trim()) return null;
	return company.trim();
};

const formatEmailDetailTimestamp = (value: string | Date | null | undefined): string => {
	if (!value) return '';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
	const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
	const time = date
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
		.toLowerCase();
	const ago =
		diffDays === 0 ? 'today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

	return `${dayName}, ${monthDay} ${time} (${ago})`;
};

const formatCampaignInboxTimestamp = (
	value: string | Date | null | undefined
): string => {
	if (!value) return '';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const time = date
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
		.replace(/\s?[AP]M/i, '')
		.replace(':', '.');
	const diffTime = Math.abs(Date.now() - date.getTime());
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	const ago =
		diffDays === 0 ? 'today' : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

	return `${time} (${ago})`;
};

const getContactTitleBadgeLabel = (title: string): string => {
	if (isRestaurantTitle(title)) return 'Restaurant';
	if (isCoffeeShopTitle(title)) return 'Coffee Shop';
	if (isMusicVenueTitle(title)) return 'Music Venue';
	if (isWeddingPlannerTitle(title)) return 'Wedding Planner';
	if (isWeddingVenueTitle(title)) return 'Wedding Venue';
	if (isWineBeerSpiritsTitle(title)) return getWineBeerSpiritsLabel(title) ?? title;
	return title;
};

const getContactTitleBadgeBackground = (title: string): string => {
	if (isRestaurantTitle(title)) return '#C3FBD1';
	if (isCoffeeShopTitle(title)) return '#D6F1BD';
	if (isMusicVenueTitle(title)) return '#B7E5FF';
	if (isWeddingPlannerTitle(title) || isWeddingVenueTitle(title)) return '#FFF2BC';
	if (isWineBeerSpiritsTitle(title)) return '#BFC4FF';
	return '#E8EFFF';
};

const renderContactTitleBadgeIcon = (title: string, size = 14) => {
	if (isRestaurantTitle(title)) return <RestaurantsIcon size={size} />;
	if (isCoffeeShopTitle(title)) return <CoffeeShopsIcon size={Math.round(size * 0.57)} />;
	if (isMusicVenueTitle(title))
		return <MusicVenuesIcon size={size} className="flex-shrink-0" />;
	if (isWeddingPlannerTitle(title) || isWeddingVenueTitle(title)) {
		return <WeddingPlannersIcon size={size} />;
	}
	if (isWineBeerSpiritsTitle(title)) {
		return <WineBeerSpiritsIcon size={size} className="flex-shrink-0" />;
	}
	return null;
};

const getAvatarInitial = (value: string): string =>
	value.trim().charAt(0).toUpperCase() || '?';

// Labels a per-application (event) thread with its opportunity name — calendar
// icon + amber fill so it reads as an event, distinct from the venue-type badge.
const InboxEventPill: FC<{ name: string; compact?: boolean }> = ({ name, compact }) => (
	<div
		className="flex items-center gap-1 overflow-hidden border border-black flex-shrink-0"
		style={{
			height: compact ? '16px' : '24px',
			borderRadius: compact ? '4px' : '6px',
			backgroundColor: '#FFE2C8',
			padding: compact ? '0 5px' : '0 8px',
			maxWidth: compact ? '140px' : '180px',
		}}
	>
		<CalendarPlusIcon
			className={compact ? 'h-[10px] w-[10px] shrink-0' : 'h-[14px] w-[14px] shrink-0'}
		/>
		<span
			className="truncate text-black"
			style={{ fontSize: compact ? '9px' : '13px', lineHeight: 1 }}
		>
			{name}
		</span>
	</div>
);

const INBOX_LAST_SENT_FILL_COLOR = '#7ED29E';
const INBOX_MESSENGER_THREAD_BACKGROUND = '#DCF1FF';

// "Has this been booked?" banner above the campaign inbox box. The box shifts
// down by the offset (banner height + gap) while the banner is visible.
const BOOKED_BANNER_HEIGHT_PX = 28;
const BOOKED_BANNER_OFFSET_PX = BOOKED_BANNER_HEIGHT_PX + 6;
const INBOX_MESSENGER_OUTBOUND_BACKGROUND = '#ACD2FF';
const INBOX_MESSENGER_INBOUND_BACKGROUND = '#FFFFFF';

const getConversationSelectionEmail = (conversation: InboxConversation) =>
	conversation.latestInboundMessage ?? conversation.latestMessage;

export const InboxSection: FC<InboxSectionProps> = ({
	allowedSenderEmails,
	contactByEmail,
	campaignId,
	onGoToDrafting,
	onGoToWriting,
	onGoToContacts,
	onGoToSearch,
	onContactSelect,
	onContactHover,
	onEventChatHover,
	isNarrow = false,
	sampleData,
	desktopWidth,
	desktopHeight,
	noOuterPadding = false,
	forceDesktopLayout = false,
	demoMode = false,
	inboxSubtab = 'messages',
	onInboxSubtabChange,
	dashboardMode = false,
	loadingVariant = 'default',
	emailRowHoverClassName = 'hover:bg-gray-50',
	scrollbarThumbColor = '#000000',
	scrollbarOffsetRight = -6,
	scrollbarAlignTrackToScrollContainer = false,
	inboxSentTabRequest,
	onInboxSentTabChange,
	selectedEmailId: controlledSelectedEmailId,
	onSelectedEmailIdChange,
	onThreadReplySent,
	autoSelectFirstEmail = false,
	detailOnly = false,
	hideSelectedEmailBackButton = false,
	onCampaignInboxEmpty,
}) => {
	const detectedIsMobile = useIsMobile();
	const isMobile = forceDesktopLayout ? false : Boolean(detectedIsMobile);
	const isCampaignInbox = typeof campaignId === 'number';
	const {
		setDraftsTabHighlighted,
		setWriteTabHighlighted,
		setTopSearchHighlighted,
		setHomeButtonHighlighted,
	} = useCampaignTopSearchHighlight();
	const rootRef = useRef<HTMLDivElement | null>(null);
	const isDashboardMode = Boolean(dashboardMode);

	// Width constants based on narrow mode and mobile
	// On mobile, we use calc() values for responsive sizing (4px margins on each side = 8px total)
	const baseBoxWidth = isNarrow ? 516 : 907;
	const boxWidth = desktopWidth ?? baseBoxWidth;
	const showMessagesCampaignsToggle = !isMobile && Boolean(onInboxSubtabChange);
	const topRightToggleWidthPx = showMessagesCampaignsToggle ? 260 : 148;
	const topRightToggleGapPx = showMessagesCampaignsToggle ? 12 : 0;
	const desktopSearchLeftInsetPx = 14;
	const desktopSearchRightInsetPx = 14;
	const outerBorderWidthPx = 3;
	const absolutePositioningWidthPx = boxWidth - outerBorderWidthPx * 2; // padding box width
	const desktopSearchTopPx = isDashboardMode ? 13 : 55;
	const desktopPaddingTopPx = isDashboardMode ? 76 : 109;
	// NOTE: Desktop rows must fit inside the scroll container's content box.
	// With a 3px border and 16px left/right padding on the outer container (border-box),
	// the available inner width is: boxWidth - (2 * 3) - (2 * 16).
	// If rows are wider than that, their left/right borders get clipped.
	const emailRowWidth = boxWidth - 38;
	const searchBarWidth =
		absolutePositioningWidthPx -
		(desktopSearchLeftInsetPx +
			desktopSearchRightInsetPx +
			topRightToggleWidthPx +
			topRightToggleGapPx);
	const expandedEmailWidth = boxWidth - 34;
	const emailBodyWidth = isNarrow ? boxWidth - 55 : boxWidth - 79;

	// Height constants (desktop only; mobile uses responsive calc())
	const desktopBoxHeight = desktopHeight ?? 657;
	const shouldUseCampaignInboxCompactDetailDesign =
		isCampaignInbox &&
		detailOnly &&
		!isMobile &&
		boxWidth >= 501 &&
		boxWidth < 863 &&
		desktopBoxHeight >= 668;
	const shouldUseCampaignInboxDetailDesign =
		(isCampaignInbox &&
			detailOnly &&
			!isMobile &&
			boxWidth >= 863 &&
			desktopBoxHeight >= 668) ||
		shouldUseCampaignInboxCompactDetailDesign;
	const campaignInboxDetailInnerWidth = shouldUseCampaignInboxCompactDetailDesign
		? Math.max(0, boxWidth - 22)
		: 842;
	const campaignInboxDetailHeaderHeight = 46;
	const campaignInboxDetailHeaderTop = 18;
	const campaignInboxDetailThreadGap = 20;
	const campaignInboxDetailComposerGap = 11;
	const campaignInboxDetailBottomStripHeight = 36;
	const campaignInboxDetailNameTextStyle = {
		color: '#000000',
		textAlign: 'center' as const,
		fontFamily: 'Inter, sans-serif',
		fontSize: '14.894px',
		fontStyle: 'normal',
		fontWeight: 700,
		lineHeight: '19.859px',
	};
	const campaignInboxDetailBaseThreadTop =
		campaignInboxDetailHeaderTop +
		campaignInboxDetailHeaderHeight +
		campaignInboxDetailThreadGap;

	// Mobile-specific width values (using CSS calc for responsive sizing)
	// 4px margins on each side for edge-to-edge feel
	const mobileBoxWidth = 'calc(100vw - 8px)'; // 4px margins on each side
	const mobileEmailRowWidth = '100%'; // Full width to match search bar + toggle span
	const mobileSearchBarWidth = 'calc(100% - 124px)'; // Leave room for inbox/sent toggle (100px + gap)
	const mobileExpandedEmailWidth = 'calc(100% - 16px)'; // Match email row width
	const mobileEmailBodyWidth = 'calc(100% - 40px)'; // With additional padding

	const outerPaddingClass = isMobile ? 'px-1' : noOuterPadding ? 'px-0' : 'px-4';
	const isUsingSampleData = Boolean(sampleData);

	const { data: calendarEntriesData } = useGetCalendarEntries({
		enabled: isCampaignInbox && Boolean(detailOnly) && !isUsingSampleData,
	});
	const calendarEntries = calendarEntriesData?.entries;
	const upsertCalendarEntry = useUpsertCalendarEntry();
	const deleteCalendarEntry = useDeleteCalendarEntry({ suppressToasts: true });
	const bookedBannerRef = useRef<HTMLDivElement | null>(null);
	const [bookedBannerNoAnswers, setBookedBannerNoAnswers] = useState<
		Record<string, BookedBannerAnswer>
	>(() => readBookedBannerAnswers());
	const [bookingDropdown, setBookingDropdown] = useState<{
		conversationKey: string;
		initialFocusDateIso: string | null;
		autoExpand: boolean;
		// 'confirm' = opened from a venue booking request; the dropdown grows a
		// footer that routes the placed entry through the confirm endpoint.
		mode: 'plain' | 'confirm';
		bookingRequestId: number | null;
		// Date the confirm-chip click provisionally placed (so closing without
		// confirming can take it back); null when nothing was auto-placed.
		provisionalDateIso: string | null;
		// Event-backed confirm: the venue picked this date, so the dropdown locks
		// the booking to it (no moves/edits — the artist just confirms).
		lockedDateIso: string | null;
	} | null>(null);
	const bookingRequestBannerRef = useRef<HTMLDivElement | null>(null);

	const {
		data: inboundEmailsFromApi,
		isLoading: isLoadingInbound,
		error: inboundError,
	} = useGetInboundEmails({ enabled: !isUsingSampleData });
	const {
		data: emailsFromApi,
		isLoading: isLoadingEmails,
		error: emailsError,
	} = useGetEmails({
		filters: campaignId ? { campaignId } : undefined,
		enabled: !isUsingSampleData,
	});
	// The artist's submitted applications become per-event "sent" items below —
	// each one threads as its own event conversation alongside the venue's replies.
	const { data: myApplications } = useGetMyEventApplications({
		enabled: !isUsingSampleData,
	});
	// Event-chat rows resolve their application (live status, event metadata) by
	// thread-application id. One Date.now() frame per render keeps every row's
	// derived status consistent (venue-panel convention).
	const nowMs = Date.now();
	const applicationById = useMemo(
		() =>
			new Map((myApplications ?? []).map((application) => [application.id, application])),
		[myApplications]
	);
	const getRowEventChat = (email: {
		venueThreadApplicationId?: number | null;
	}): { application: MyEventApplication; state: ReturnType<typeof deriveEventChatStatus> } | null => {
		const threadApplicationId = email.venueThreadApplicationId;
		if (threadApplicationId == null) return null;
		const application = applicationById.get(threadApplicationId);
		if (!application) return null;
		return { application, state: deriveEventChatStatus(application, nowMs) };
	};
	const inboundEmails = isUsingSampleData
		? (sampleData?.inboundEmails ?? [])
		: inboundEmailsFromApi;
	const emails = isUsingSampleData ? undefined : emailsFromApi;
	const sentEmails = emails?.filter((email) => email.status === 'sent') || [];
	const campaignSentCount = isUsingSampleData
		? (sampleData?.sentEmails?.length ?? 0)
		: sentEmails.length;
	const isSentLoaded = isUsingSampleData || emailsFromApi !== undefined;
	const isInboundLoaded = isUsingSampleData || inboundEmailsFromApi !== undefined;

	// Campaign inbox UX:
	// - Prefer "Sent" when something has actually been sent (and there are no replies yet).
	// - If nothing has been sent, default to "Inbox" so opening the Inbox tab doesn't
	//   briefly show "Sent" and then snap over to "Inbox".
	const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>(() => {
		if (inboxSentTabRequest?.tab) return inboxSentTabRequest.tab;
		if (detailOnly) return 'inbox';
		if (!isCampaignInbox) return 'inbox';
		return campaignSentCount > 0 ? 'sent' : 'inbox';
	});
	const lastHandledInboxSentTabRequestIdRef = useRef<number | null>(null);
	const hasUserSelectedInboxSentTabRef = useRef(false);
	const hasAutoInitializedInboxSentTabRef = useRef(false);
	const hasNotifiedInitialInboxSentTabRef = useRef(false);
	const hasNotifiedCampaignInboxEmptyRef = useRef(false);
	const [internalSelectedEmailId, setInternalSelectedEmailId] = useState<number | null>(
		null
	);
	const isSelectedEmailIdControlled = controlledSelectedEmailId !== undefined;
	const selectedEmailId = isSelectedEmailIdControlled
		? (controlledSelectedEmailId ?? null)
		: internalSelectedEmailId;
	const setSelectedEmailId = useCallback(
		(next: number | null) => {
			if (!isSelectedEmailIdControlled) {
				setInternalSelectedEmailId(next);
			}
			onSelectedEmailIdChange?.(next);
		},
		[isSelectedEmailIdControlled, onSelectedEmailIdChange]
	);
	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [sentReplies, setSentReplies] = useState<
		Record<string, Array<{ message: string; timestamp: Date }>>
	>({});
	// Tracks "waiting for their reply" state by sender (used to drive the green reply theme).
	// Keyed by normalized sender email; value is the timestamp (ms) when we last replied.
	const [replyThemeBySender, setReplyThemeBySender] = useState<Record<string, number>>(
		{}
	);

	const { user } = useMe();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		successMessage: 'Reply sent successfully',
		errorMessage: 'Failed to send reply',
	});
	// Venue replies are internal messages, not emailable contacts; replying must go
	// back through the messaging system (createReply) rather than Mailgun.
	const { mutateAsync: sendVenueReply } = useSendConversationReply();
	const markConversationRead = useMarkConversationRead();

	// If a list of allowed sender emails is provided (e.g. campaign contacts),
	// hide any inbound emails whose sender address does not match.
	const normalizedAllowedSenders = allowedSenderEmails
		? new Set(
				allowedSenderEmails
					.filter((email): email is string => Boolean(email))
					.map((email) => email.toLowerCase().trim())
			)
		: isCampaignInbox
			? new Set<string>()
			: null;

	const filteredBySender =
		normalizedAllowedSenders && inboundEmails
			? inboundEmails.filter((email) => {
					const sender = email.sender?.toLowerCase().trim();
					return !!sender && normalizedAllowedSenders.has(sender);
				})
			: inboundEmails;

	// Synthesized per-event "sent application" rows, scoped by the same sender
	// allowlist as the venue's projected replies (the row's sender is the venue
	// contact's email, so it shows exactly where those replies show).
	const applicationSentRows: InboxConversationMessage[] = (myApplications ?? [])
		.filter((application) => application.status === 'submitted')
		.map(normalizeApplicationForInboxConversation)
		.filter((row): row is InboxConversationMessage => row != null)
		.filter((row) => {
			if (!normalizedAllowedSenders) return true;
			const sender = row.sender?.toLowerCase().trim();
			return !!sender && normalizedAllowedSenders.has(sender);
		});

	const campaignReplyCount = Array.isArray(filteredBySender)
		? filteredBySender.length
		: 0;
	const shouldAutoDefaultInboxSentTab = isCampaignInbox && !detailOnly;

	// Campaign page UX: if there are no replies yet, default to "Sent".
	// Once a reply exists, default to "Inbox". Only auto-decide once per mount (or campaignId change),
	// and never override the user's explicit tab selection.
	useLayoutEffect(() => {
		hasUserSelectedInboxSentTabRef.current = false;
		hasAutoInitializedInboxSentTabRef.current = false;
		hasNotifiedInitialInboxSentTabRef.current = false;
		hasNotifiedCampaignInboxEmptyRef.current = false;
	}, [campaignId]);

	// Ensure the parent (campaign page) knows which Inbox/Sent tab is active on first paint.
	// This keeps the right-side SVG panel selection in sync even when the campaign inbox defaults to "Sent".
	useLayoutEffect(() => {
		if (!onInboxSentTabChange) return;
		if (hasNotifiedInitialInboxSentTabRef.current) return;
		hasNotifiedInitialInboxSentTabRef.current = true;
		onInboxSentTabChange(activeTab);
	}, [activeTab, onInboxSentTabChange]);

	useLayoutEffect(() => {
		if (!shouldAutoDefaultInboxSentTab) return;
		// Wait until the campaign contact allowlist is available so we don't briefly
		// compute reply counts against *unfiltered* inbound mail.
		if (allowedSenderEmails === undefined) return;
		// If the campaign page explicitly requested a tab (e.g. Inbox -> Sent), never auto-override it.
		if (inboxSentTabRequest) return;
		if (hasUserSelectedInboxSentTabRef.current) return;
		if (hasAutoInitializedInboxSentTabRef.current) return;
		// Don't auto-switch while the user is reading an email.
		if (selectedEmailId !== null) return;

		let nextTab: 'inbox' | 'sent' | null = null;
		// Prefer Inbox when replies exist.
		if (campaignReplyCount > 0) {
			nextTab = 'inbox';
		} else if (isSentLoaded) {
			// If there are no replies, show Sent only when something has actually been sent.
			// If neither Sent nor Inbox has anything, default to Inbox.
			nextTab = campaignSentCount > 0 ? 'sent' : 'inbox';
		}

		if (!nextTab) return;
		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
			setSelectedEmailId(null);
			setReplyMessage('');
			onInboxSentTabChange?.(nextTab);
		}

		// Only lock in the auto-default once inbound mail has loaded.
		// This ensures we can still switch to Inbox if replies arrive.
		if (isInboundLoaded) {
			hasAutoInitializedInboxSentTabRef.current = true;
		}
	}, [
		shouldAutoDefaultInboxSentTab,
		inboxSentTabRequest,
		allowedSenderEmails,
		campaignReplyCount,
		campaignSentCount,
		isSentLoaded,
		activeTab,
		selectedEmailId,
		isInboundLoaded,
		inboundEmailsFromApi,
		emailsFromApi,
		setSelectedEmailId,
		onInboxSentTabChange,
	]);

	// Convert sent emails to a format compatible with inbox display
	const normalizedSentEmails: Array<InboundEmailWithRelations & { isSent?: boolean }> =
		isUsingSampleData
			? (sampleData?.sentEmails ?? [])
			: sentEmails.map(
					(email) =>
						({
							id: email.id,
							sender: email.contact?.email || '',
							senderName: email.contact
								? `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim()
								: '',
							subject: email.subject || '',
							bodyPlain: email.message || '',
							strippedText: email.message?.replace(/<[^>]*>/g, '') || '',
							bodyHtml: email.message || '',
							receivedAt: email.sentAt || email.createdAt,
							contactId: email.contactId,
							contact: email.contact,
							campaignId: email.campaignId,
							campaign: email.campaign,
							originalEmail: null,
							originalEmailId: null,
							isSent: true,
						}) as unknown as InboundEmailWithRelations & { isSent?: boolean }
				);

	const allInboxConversations = buildInboxConversations([
		...((filteredBySender ?? []) as InboxConversationMessage[]),
		...(normalizedSentEmails as InboxConversationMessage[]),
		...applicationSentRows,
	]);
	const inboxConversations = allInboxConversations
		.filter((conversation) => conversation.inboundMessages.length > 0)
		.sort(
			(a, b) =>
				getInboxMessageTimeMs(getConversationSelectionEmail(b)) -
				getInboxMessageTimeMs(getConversationSelectionEmail(a))
		);
	const isLoading = isUsingSampleData
		? false
		: activeTab === 'inbox'
			? isLoadingInbound
			: isLoadingEmails;
	const error = isUsingSampleData
		? null
		: activeTab === 'inbox'
			? inboundError
			: emailsError;

	// Further filter by search query (sender, subject, body, contact name/company/email)
	const emailMatchesSearch = (email: InboxConversationMessage) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		const sender = email.sender?.toLowerCase() || '';
		const senderName = email.senderName?.toLowerCase() || '';
		const subject = email.subject?.toLowerCase() || '';
		const body = getInboxMessageSnippet(email).toLowerCase();

		const contact: any = resolveContactForEmail(email, contactByEmail);
		const fullName =
			contact && (contact.firstName || contact.lastName)
				? `${contact.firstName || ''} ${contact.lastName || ''}`.trim().toLowerCase()
				: '';
		const legacyName =
			contact && typeof contact.name === 'string' ? contact.name.toLowerCase() : '';
		const company =
			contact && typeof contact.company === 'string' ? contact.company.toLowerCase() : '';
		const contactEmail =
			contact && typeof contact.email === 'string' ? contact.email.toLowerCase() : '';

		return (
			sender.includes(query) ||
			senderName.includes(query) ||
			subject.includes(query) ||
			body.includes(query) ||
			fullName.includes(query) ||
			legacyName.includes(query) ||
			company.includes(query) ||
			contactEmail.includes(query)
		);
	};
	const visibleInboxConversations = inboxConversations.filter((conversation) => {
		if (!searchQuery.trim()) return true;
		return conversation.messages.some(emailMatchesSearch);
	});
	const visibleEmails: InboxConversationMessage[] =
		activeTab === 'inbox'
			? visibleInboxConversations.map(getConversationSelectionEmail)
			: ([...normalizedSentEmails, ...applicationSentRows] as InboxConversationMessage[])
					.sort((a, b) => getInboxMessageTimeMs(b) - getInboxMessageTimeMs(a))
					.filter(emailMatchesSearch);

	const selectedConversation =
		selectedEmailId !== null
			? activeTab === 'sent'
				? (allInboxConversations.find((conversation) =>
						inboxConversationContainsSentEmailId(conversation, selectedEmailId)
					) ?? null)
				: (visibleInboxConversations.find((conversation) =>
						inboxConversationContainsInboundEmailId(conversation, selectedEmailId)
					) ??
					visibleInboxConversations.find((conversation) =>
						inboxConversationContainsEmailId(conversation, selectedEmailId)
					) ??
					null)
			: null;
	const selectedEmail = selectedConversation
		? activeTab === 'sent'
			? selectedConversation.latestMessage
			: getConversationSelectionEmail(selectedConversation)
		: activeTab === 'inbox'
			? null
			: (visibleEmails.find((email) => email.id === selectedEmailId) ?? null);
	// A selected application row is read-only — without it, handleSendReply's
	// Mailgun fallback would email the venue contact's placeholder address.
	const selectedIsApplicationRow =
		selectedEmail != null && isApplicationSentRow(selectedEmail);
	// Canceled events (venue deleted them) are read-only: the composer hides and
	// handleSendReply hard-blocks. Closed chats stay messageable.
	const selectedEventChat = selectedEmail ? getRowEventChat(selectedEmail) : null;
	const selectedThreadCanMessage = selectedEventChat?.state.canMessage ?? true;
	// Viewing a venue conversation marks its thread read (application threads have
	// their own watermark; the general thread uses the conversation's) so the
	// opportunities "venue responded" dot and unread counts clear. Delayed a beat:
	// the campaign page mounts a short-lived ghost DraftingSection during tab
	// transitions whose auto-selection must not silently consume unread state.
	const selectedVenueConversationId = selectedEmail?.venueConversationId ?? null;
	const selectedVenueThreadApplicationId = selectedEmail?.venueThreadApplicationId ?? null;
	useEffect(() => {
		if (selectedVenueConversationId == null) return;
		const timer = setTimeout(() => {
			markConversationRead.mutate({
				conversationId: selectedVenueConversationId,
				applicationId: selectedVenueThreadApplicationId ?? undefined,
			});
		}, 1000);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedVenueConversationId, selectedVenueThreadApplicationId, selectedEmail?.id]);
	const selectedThreadMessages =
		selectedConversation?.messages ?? (selectedEmail ? [selectedEmail] : []);
	const selectedConversationReplyKey =
		selectedConversation?.key ?? selectedEmail?.id.toString() ?? null;
	const selectedThreadIsConversation = selectedThreadMessages.length > 1;
	const selectedPendingReplies = selectedConversationReplyKey
		? sentReplies[selectedConversationReplyKey] || []
		: [];
	const selectedThreadIsSingleInboundMessage =
		selectedThreadMessages.length === 1 &&
		selectedPendingReplies.length === 0 &&
		!selectedThreadMessages[0]?.isSent;
	const selectedVisibleThreadItemCount =
		selectedThreadMessages.length + selectedPendingReplies.length;
	const selectedThreadUsesMessengerLayout = selectedVisibleThreadItemCount >= 3;

	// ----- "Has this been booked?" banner + booking calendar state -----
	const selectedConversationLatestInbound = selectedConversation?.latestInboundMessage ?? null;
	const selectedConversationContact = selectedConversationLatestInbound
		? resolveContactForEmail(selectedConversationLatestInbound, contactByEmail)
		: null;
	const selectedConversationContactId: number | null =
		selectedConversationContact?.id ?? selectedConversationLatestInbound?.contactId ?? null;
	const selectedConversationBooking =
		isCampaignInbox && selectedConversationContactId != null
			? (findBookingForConversation(
					calendarEntries,
					campaignId,
					selectedConversationContactId
				) ?? null)
			: null;

	// Venue-ness of the THREAD, not just its newest inbound row — the general
	// venue thread shares its conversation key with real email replies from the
	// same contact, so one selected thread can mix both.
	const selectedThreadHasVenueRows = selectedThreadMessages.some(
		(message) => message.venueConversationId != null
	);

	const bookedBannerEligible =
		shouldUseCampaignInboxDetailDesign &&
		isCampaignInbox &&
		activeTab === 'inbox' &&
		!isUsingSampleData &&
		selectedConversation != null &&
		selectedConversation.inboundMessages.length > 0 &&
		// Venue/opportunity threads use the booking-request handshake instead —
		// the "Has this been booked?" banner is for outbound email contacts only.
		!selectedThreadHasVenueRows;

	// ----- Venue booking-request confirm flow -----
	// The newest non-canceled request delivered in this thread (projected rows
	// carry live state via venueBookingRequest).
	const selectedActiveBookingRequestMessage = (() => {
		for (let i = selectedThreadMessages.length - 1; i >= 0; i--) {
			const request = selectedThreadMessages[i].venueBookingRequest;
			if (request && request.status !== 'canceled') return selectedThreadMessages[i];
		}
		return null;
	})();
	const selectedPendingBookingRequest =
		selectedActiveBookingRequestMessage?.venueBookingRequest?.status === 'pending'
			? selectedActiveBookingRequestMessage.venueBookingRequest
			: null;
	// Deliberately NOT gated on the detail design: every campaign-inbox layout
	// that renders the thread also renders the confirm chip, and the dropdown
	// anchors to the section root, which exists in all of them.
	const bookingConfirmEligible =
		isCampaignInbox &&
		activeTab === 'inbox' &&
		!isUsingSampleData &&
		selectedThreadHasVenueRows &&
		selectedPendingBookingRequest != null;

	const isBookingDropdownOpen =
		(bookedBannerEligible || bookingConfirmEligible) &&
		bookingDropdown?.conversationKey === selectedConversation?.key;
	type BookedBannerState = 'hidden' | 'question' | 'yes-pending' | 'booked';
	const bookedBannerState: BookedBannerState =
		!bookedBannerEligible ||
		(selectedConversation && bookedBannerNoAnswers[selectedConversation.key] === 'no')
			? 'hidden'
			: selectedConversationBooking
				? 'booked'
				: isBookingDropdownOpen
					? 'yes-pending'
					: 'question';

	// The booked-banner shift on the section root must NOT animate on tab entry:
	// the auto-selected conversation resolves a commit after mount, and animating
	// its banner into place slides the whole inbox box right as the tab crossfade
	// reveals it (reads as a jerk). Enable the transition only after the first
	// two frames — by then the entry state (banner or not) has painted; banner
	// changes from in-inbox interactions still animate.
	const [bannerShiftAnimEnabled, setBannerShiftAnimEnabled] = useState(false);
	useEffect(() => {
		let raf2: number | null = null;
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => setBannerShiftAnimEnabled(true));
		});
		return () => {
			cancelAnimationFrame(raf1);
			if (raf2 != null) cancelAnimationFrame(raf2);
		};
	}, []);

	// Drop stale dropdown state when the selection moves to another conversation —
	// taking back any confirm-mode provisional placement with it (idempotent
	// DELETE, so a StrictMode double-run is harmless).
	const selectedConversationKey = selectedConversation?.key ?? null;
	const deleteCalendarEntryRef = useRef(deleteCalendarEntry.mutate);
	deleteCalendarEntryRef.current = deleteCalendarEntry.mutate;
	useEffect(() => {
		setBookingDropdown((prev) => {
			if (!prev || prev.conversationKey === selectedConversationKey) return prev;
			if (prev.mode === 'confirm' && prev.provisionalDateIso) {
				deleteCalendarEntryRef.current({ date: prev.provisionalDateIso });
			}
			return null;
		});
	}, [selectedConversationKey]);

	// A pending event-backed request carries the gig's own location — prefer it as
	// a coherent triple (address + pin together) over the contact's; a missing pin
	// with an address present still geocodes in the dropdown.
	const bookingEventLocation =
		selectedPendingBookingRequest &&
		(selectedPendingBookingRequest.eventAddress ||
			(selectedPendingBookingRequest.eventLatitude != null &&
				selectedPendingBookingRequest.eventLongitude != null))
			? {
					address: selectedPendingBookingRequest.eventAddress ?? '',
					latitude: selectedPendingBookingRequest.eventLatitude,
					longitude: selectedPendingBookingRequest.eventLongitude,
				}
			: null;
	const bookingPrefillFields: BookingPrefillFields = {
		personName:
			(selectedConversationLatestInbound
				? getCanonicalContactName(selectedConversationLatestInbound, contactByEmail)
				: '') ||
			selectedPendingBookingRequest?.eventName ||
			'',
		company:
			selectedPendingBookingRequest?.venueName ||
			(selectedConversationLatestInbound
				? getContactCompanyLabel(selectedConversationLatestInbound, contactByEmail) || ''
				: ''),
		address: bookingEventLocation
			? bookingEventLocation.address
			: [
					selectedConversationContact?.address,
					selectedConversationContact?.city,
					selectedConversationContact?.state,
				]
					.filter(
						(part): part is string => typeof part === 'string' && part.trim().length > 0
					)
					.map((part) => part.trim())
					.join(', '),
		latitude: bookingEventLocation
			? bookingEventLocation.latitude
			: typeof selectedConversationContact?.latitude === 'number'
				? selectedConversationContact.latitude
				: null,
		longitude: bookingEventLocation
			? bookingEventLocation.longitude
			: typeof selectedConversationContact?.longitude === 'number'
				? selectedConversationContact.longitude
				: null,
		startTime: selectedPendingBookingRequest?.eventStartTimeLabel ?? null,
		endTime: selectedPendingBookingRequest?.eventEndTimeLabel ?? null,
		notes: selectedPendingBookingRequest?.bookingNotes ?? null,
		// When the contact can't be resolved the booking still saves, but the
		// banner can't re-derive its "booked" state afterwards (rare; accepted).
		contactId: selectedConversationContactId,
	};

	const buildPrefilledBookingInput = (dateIso: string) => ({
		date: dateIso,
		personName: bookingPrefillFields.personName,
		company: bookingPrefillFields.company,
		startTime: bookingPrefillFields.startTime ?? DEFAULT_START_TIME,
		endTime: bookingPrefillFields.endTime ?? DEFAULT_END_TIME,
		notes: bookingPrefillFields.notes ?? '',
		address: bookingPrefillFields.address,
		placeId: null,
		latitude: bookingPrefillFields.latitude,
		longitude: bookingPrefillFields.longitude,
		drivingDuration: null,
		campaignId: campaignId as number,
		contactId: bookingPrefillFields.contactId,
	});

	const getInboundPlainText = (message: InboxConversationMessage): string => {
		const raw =
			message.strippedText?.trim() ||
			message.bodyPlain?.trim() ||
			(message.bodyHtml ? convertHtmlToPlainText(stripQuotedReplyHtml(message.bodyHtml)) : '');
		return stripQuotedReply(raw || '');
	};

	const handleBookedYes = () => {
		if (!selectedConversation || !isCampaignInbox) return;
		let detectedIso: string | null = null;
		for (const message of [...selectedConversation.inboundMessages].reverse()) {
			const detected = extractFirstMentionedDate(getInboundPlainText(message));
			if (detected) {
				detectedIso = toIsoKey(detected);
				break;
			}
		}
		const occupant = detectedIso
			? (calendarEntries ?? []).find((entry) => entry.date === detectedIso)
			: undefined;
		let placed = false;
		if (detectedIso && !occupant) {
			upsertCalendarEntry.mutate(buildPrefilledBookingInput(detectedIso));
			placed = true;
		} else if (
			occupant &&
			occupant.campaignId === campaignId &&
			occupant.contactId === selectedConversationContactId
		) {
			placed = true;
		}
		// A date occupied by another booking is never overwritten (one per day):
		// the dropdown just opens focused on that month with nothing placed.
		setBookingDropdown({
			conversationKey: selectedConversation.key,
			initialFocusDateIso: detectedIso,
			autoExpand: placed,
			mode: 'plain',
			bookingRequestId: null,
			provisionalDateIso: null,
			lockedDateIso: null,
		});
	};

	const handleBookedNo = () => {
		if (!selectedConversation) return;
		recordBookedBannerAnswer(selectedConversation.key, 'no');
		setBookedBannerNoAnswers((prev) => ({ ...prev, [selectedConversation.key]: 'no' }));
	};

	const reopenBookingDropdown = () => {
		if (!selectedConversation || !selectedConversationBooking) return;
		setBookingDropdown({
			conversationKey: selectedConversation.key,
			initialFocusDateIso: selectedConversationBooking.date,
			autoExpand: true,
			mode: 'plain',
			bookingRequestId: null,
			provisionalDateIso: null,
			lockedDateIso: null,
		});
	};

	// Confirm a venue booking request: pre-place the event's date when it's known
	// and free (same mechanics as handleBookedYes), then open the dropdown in
	// confirm mode — its footer routes the placed entry through the confirm
	// endpoint, which also writes the venue's calendar.
	const handleConfirmBookingRequestClick = () => {
		if (!selectedConversation || !isCampaignInbox || !selectedPendingBookingRequest) {
			return;
		}
		// The chip stays visible while the dropdown is open (it's excluded from
		// click-outside) — a re-click must not place a second provisional entry.
		if (isBookingDropdownOpen && bookingDropdown?.mode === 'confirm') return;
		// The event's calendar day: prefer the faithful display label ("June 15th
		// 2026") over re-deriving from the UTC instant, which can shift a day.
		let requestedIso: string | null = null;
		if (selectedPendingBookingRequest.eventWhenLabel) {
			const parsed = extractFirstMentionedDate(
				selectedPendingBookingRequest.eventWhenLabel
			);
			if (parsed) requestedIso = toIsoKey(parsed);
		}
		if (!requestedIso && selectedPendingBookingRequest.eventStartsAt) {
			const startsAt = new Date(selectedPendingBookingRequest.eventStartsAt);
			if (!Number.isNaN(startsAt.getTime())) requestedIso = toIsoKey(startsAt);
		}
		const occupant = requestedIso
			? (calendarEntries ?? []).find((entry) => entry.date === requestedIso)
			: undefined;
		let placed = false;
		let provisionalDateIso: string | null = null;
		if (requestedIso && !occupant) {
			upsertCalendarEntry.mutate(buildPrefilledBookingInput(requestedIso));
			placed = true;
			provisionalDateIso = requestedIso;
		} else if (
			occupant &&
			occupant.campaignId === campaignId &&
			occupant.contactId === selectedConversationContactId
		) {
			// Adopted entry: refresh the venue-owned fields (an earlier session may
			// have left stale default times / empty notes) — but never an entry that
			// another booking request confirmed, never the artist's own annotations
			// (notes/location), and never as a no-op write (an unconditional PATCH
			// here can revive a row whose take-back DELETE is still in flight).
			if (
				occupant.bookingRequestId == null ||
				occupant.bookingRequestId === selectedPendingBookingRequest.id
			) {
				const authoritative = buildPrefilledBookingInput(occupant.date);
				const refreshInput = {
					...authoritative,
					// Times are artist-owned when the event set none — preserve them.
					...(bookingPrefillFields.startTime == null ||
					bookingPrefillFields.endTime == null
						? {
								startTime: occupant.startTime || authoritative.startTime,
								endTime: occupant.endTime || authoritative.endTime,
							}
						: {}),
					notes: occupant.notes.trim() ? occupant.notes : authoritative.notes,
					...(occupant.address.trim() || occupant.latitude != null
						? {
								address: occupant.address,
								placeId: occupant.placeId,
								latitude: occupant.latitude,
								longitude: occupant.longitude,
								drivingDuration: occupant.drivingDuration,
							}
						: {}),
				};
				const needsRefresh =
					refreshInput.personName !== occupant.personName ||
					refreshInput.company !== occupant.company ||
					refreshInput.startTime !== occupant.startTime ||
					refreshInput.endTime !== occupant.endTime ||
					refreshInput.notes !== occupant.notes ||
					refreshInput.address !== occupant.address ||
					refreshInput.latitude !== occupant.latitude ||
					refreshInput.longitude !== occupant.longitude;
				if (needsRefresh) {
					upsertCalendarEntry.mutate(refreshInput);
				}
			}
			placed = true;
		}
		setBookingDropdown({
			conversationKey: selectedConversation.key,
			initialFocusDateIso: requestedIso,
			autoExpand: placed,
			mode: 'confirm',
			bookingRequestId: selectedPendingBookingRequest.id,
			provisionalDateIso,
			lockedDateIso: requestedIso,
		});
	};

	// Closing a confirm-mode dropdown WITHOUT confirming takes back the entry the
	// chip click auto-placed (unlike the plain flow's "Yes", opening the confirm
	// popup asserts nothing). Deliberate placements made inside the popup stay.
	const closeBookingDropdown = (options?: { confirmed?: boolean }) => {
		setBookingDropdown((previous) => {
			if (
				previous?.mode === 'confirm' &&
				previous.provisionalDateIso &&
				!options?.confirmed
			) {
				deleteCalendarEntry.mutate({ date: previous.provisionalDateIso });
			}
			return null;
		});
	};

	const showBookedHeaderStrip = bookedBannerEligible && selectedConversationBooking != null;
	// Booked strip (22px) + 4px gap pushes the thread box down; the composer
	// stays put, so the non-anchored fixed thread height shrinks by the offset.
	const campaignInboxDetailBookedStripOffset = showBookedHeaderStrip ? 26 : 0;
	const campaignInboxDetailThreadTop =
		campaignInboxDetailBaseThreadTop + campaignInboxDetailBookedStripOffset;
	const campaignInboxDetailFixedThreadHeight =
		404 - campaignInboxDetailBookedStripOffset;

	// In the messenger (3+ message) layout the composer collapses to a single-line
	// text-message pill; in the non-messenger view it stays the 157px toolbar composer.
	const campaignInboxDetailComposerHeight = selectedThreadUsesMessengerLayout ? 37 : 157;
	// Anchor the composer near the bottom of the box (small margin) for the messenger pill
	// and for the compact (501-wide) detail view, so the email body grows to fill the space
	// instead of leaving a dead gap at the bottom. The wider/expanded non-messenger view
	// keeps its fixed 404px body and clears the bottom divider instead.
	const campaignInboxDetailComposerAnchoredToBottom =
		selectedThreadUsesMessengerLayout || shouldUseCampaignInboxCompactDetailDesign;
	const campaignInboxDetailComposerBottomMargin = shouldUseCampaignInboxCompactDetailDesign
		? 16
		: 52;
	const campaignInboxDetailComposerTop = campaignInboxDetailComposerAnchoredToBottom
		? desktopBoxHeight -
			campaignInboxDetailComposerBottomMargin -
			campaignInboxDetailComposerHeight
		: campaignInboxDetailThreadTop +
			campaignInboxDetailFixedThreadHeight +
			campaignInboxDetailComposerGap;
	const campaignInboxDetailThreadHeight = campaignInboxDetailComposerAnchoredToBottom
		? campaignInboxDetailComposerTop -
			campaignInboxDetailComposerGap -
			campaignInboxDetailThreadTop
		: campaignInboxDetailFixedThreadHeight;
	const selectedThreadEvenSplitMinHeight =
		selectedVisibleThreadItemCount === 2 ? '50%' : undefined;
	const currentUserDisplayName =
		`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.firstName || 'You';
	const visibleEmailRows =
		activeTab === 'inbox'
			? visibleInboxConversations.map((conversation) => ({
					key: conversation.key,
					email: getConversationSelectionEmail(conversation),
					selectionEmail: getConversationSelectionEmail(conversation),
				}))
			: visibleEmails.map((email) => ({
					key: `${email.isSent ? 'sent' : 'email'}-${email.id}`,
					email,
					selectionEmail: email,
				}));
	// Past/live partition: closed/canceled event chats sit above the fold of the
	// main list and reveal only by scrolling up (venue portal's ledger pattern).
	const pastEmailRows: typeof visibleEmailRows = [];
	const liveEmailRows: typeof visibleEmailRows = [];
	for (const row of visibleEmailRows) {
		(getRowEventChat(row.email)?.state.isAboveFold ? pastEmailRows : liveEmailRows).push(
			row
		);
	}
	const pastEmailRowsKey = pastEmailRows.map((row) => row.key).join(',');
	// Pin the list's initial scroll to the live section (past band hides above).
	// Re-pins when the list view (re)mounts, the tab flips, or a NEW past key
	// appears mid-session — not on removals. Layout effect so the first paint is
	// already pinned.
	const mainListScrollerRef = useRef<HTMLDivElement | null>(null);
	const mainListLiveSectionRef = useRef<HTMLDivElement | null>(null);
	const seenPastMainRowKeysRef = useRef<Set<string> | null>(null);
	const seenPastMainTabRef = useRef<'inbox' | 'sent' | null>(null);
	const isEmailListViewVisible = !selectedEmail && !detailOnly;
	useLayoutEffect(() => {
		if (!isEmailListViewVisible) {
			seenPastMainRowKeysRef.current = null;
			seenPastMainTabRef.current = null;
			return;
		}
		const scroller = mainListScrollerRef.current;
		const liveSection = mainListLiveSectionRef.current;
		if (!scroller || !liveSection) return;
		if (seenPastMainTabRef.current !== activeTab) {
			seenPastMainTabRef.current = activeTab;
			seenPastMainRowKeysRef.current = null;
		}
		const previous = seenPastMainRowKeysRef.current;
		const nextKeys = pastEmailRowsKey === '' ? [] : pastEmailRowsKey.split(',');
		seenPastMainRowKeysRef.current = new Set(nextKeys);
		if (previous && nextKeys.every((key) => previous.has(key))) return;
		// offsetTop is scroller-relative, so it equals the past band's height.
		scroller.scrollTop = liveSection.offsetTop;
	}, [isEmailListViewVisible, activeTab, pastEmailRowsKey]);
	const shouldUseDetailChrome = Boolean(selectedEmail) || detailOnly;
	const selectedSenderKey = selectedEmail?.sender?.toLowerCase().trim();
	const selectedConversationLatestMessageIsSent = Boolean(
		selectedConversation?.latestMessage.isSent
	);
	const isReplySentThemeActive = Boolean(
		selectedEmail &&
		(selectedConversationLatestMessageIsSent ||
			(selectedSenderKey && replyThemeBySender[selectedSenderKey] !== undefined))
	);

	useLayoutEffect(() => {
		if (!autoSelectFirstEmail) return;
		// Don't judge (and wipe) an externally-seeded selection — e.g. the
		// opportunities deep link — against a still-loading, briefly-empty list.
		// Campaign inboxes also filter by the contact allowlist, so wait for it too
		// (same guard the auto-default and never-empty effects use).
		if (isCampaignInbox && allowedSenderEmails === undefined) return;
		if (activeTab === 'inbox' ? !isInboundLoaded : !isSentLoaded) return;
		if (
			inboxSentTabRequest?.preserveSelection &&
			lastHandledInboxSentTabRequestIdRef.current !== inboxSentTabRequest.requestId
		) {
			return;
		}

		const hasVisibleSelectedEmail =
			selectedEmailId !== null &&
			(activeTab === 'inbox'
				? visibleInboxConversations.some((conversation) =>
						inboxConversationContainsInboundEmailId(conversation, selectedEmailId)
					)
				: visibleEmails.some((email) => email.id === selectedEmailId));
		if (hasVisibleSelectedEmail) return;

		const nextEmailId = visibleEmails[0]?.id ?? null;
		if (nextEmailId === selectedEmailId) return;

		setSelectedEmailId(nextEmailId);
		setReplyMessage('');
	}, [
		allowedSenderEmails,
		autoSelectFirstEmail,
		activeTab,
		inboxSentTabRequest?.preserveSelection,
		inboxSentTabRequest?.requestId,
		isCampaignInbox,
		isInboundLoaded,
		isSentLoaded,
		selectedEmailId,
		setSelectedEmailId,
		visibleEmails,
		visibleInboxConversations,
	]);

	// If we receive a newer inbound email from a sender we've replied to, revert the UI theme.
	useEffect(() => {
		if (!inboundEmails || inboundEmails.length === 0) return;

		setReplyThemeBySender((prev) => {
			const entries = Object.entries(prev);
			if (entries.length === 0) return prev;

			let changed = false;
			const next: Record<string, number> = { ...prev };

			for (const [senderKey, repliedAtMs] of entries) {
				const hasNewInbound = inboundEmails.some((email) => {
					const sender = email.sender?.toLowerCase().trim();
					if (!sender || sender !== senderKey) return false;
					const receivedAt = (email as any).receivedAt;
					if (!receivedAt) return false;
					return new Date(receivedAt).getTime() > repliedAtMs;
				});

				if (hasNewInbound) {
					delete next[senderKey];
					changed = true;
				}
			}

			return changed ? next : prev;
		});
	}, [inboundEmails]);

	// Notify parent when selected contact changes (for research panel)
	useEffect(() => {
		if (onContactSelect) {
			if (selectedEmail) {
				const contact = resolveContactForEmail(selectedEmail, contactByEmail);
				onContactSelect(contact as ContactWithName | null);
			} else {
				onContactSelect(null);
			}
		}
	}, [selectedEmail, contactByEmail, onContactSelect]);

	const handleSendReply = async (messageOverride?: string) => {
		const messageToSend = messageOverride ?? replyMessage;
		if (!selectedEmail || isRichTextMessageEmpty(messageToSend)) return;
		// Application rows have no reply channel (see selectedIsApplicationRow).
		if (isApplicationSentRow(selectedEmail)) return;
		// Canceled event threads are read-only (see selectedThreadCanMessage).
		if (!selectedThreadCanMessage) return;

		const replyKey = selectedConversationReplyKey ?? selectedEmail.id.toString();
		const senderKey = selectedEmail.sender?.toLowerCase().trim();
		const repliedAtMs = Date.now();
		const notifyThreadReplySent = () => {
			const messageIds = selectedThreadMessages.map((message) => message.id);
			if (messageIds.length > 0) onThreadReplySent?.(messageIds, repliedAtMs);
		};
		// Optimistically flip the UI theme to "sent" (green) for this sender.
		if (senderKey) {
			setReplyThemeBySender((prev) => ({ ...prev, [senderKey]: repliedAtMs }));
		}

		// Sample-data/demo mode (e.g. landing page): never actually send.
		// Just append the reply to the UI immediately.
		if (isUsingSampleData) {
			setSentReplies((prev) => {
				const existingReplies = prev[replyKey] || [];
				return {
					...prev,
					[replyKey]: [
						...existingReplies,
						{ message: messageToSend, timestamp: new Date() },
					],
				};
			});
			notifyThreadReplySent();
			setReplyMessage('');
			return;
		}

		// Venue rows are projected internal messages — route the reply back through the
		// messaging system instead of Mailgun (their sender is a placeholder address).
		if (selectedEmail.venueConversationId != null) {
			setIsSending(true);
			try {
				await sendVenueReply({
					conversationId: selectedEmail.venueConversationId,
					body: convertHtmlToPlainText(messageToSend),
					// Keep the reply in the same thread the venue wrote from (an
					// application's thread or the general one).
					threadApplicationId: selectedEmail.venueThreadApplicationId ?? undefined,
				});
				setSentReplies((prev) => {
					const existingReplies = prev[replyKey] || [];
					return {
						...prev,
						[replyKey]: [
							...existingReplies,
							{ message: messageToSend, timestamp: new Date() },
						],
					};
				});
				notifyThreadReplySent();
				setReplyMessage('');
			} catch (error) {
				if (senderKey) {
					setReplyThemeBySender((prev) => {
						if (prev[senderKey] === undefined) return prev;
						const next = { ...prev };
						delete next[senderKey];
						return next;
					});
				}
				console.error('Failed to send venue reply:', error);
			} finally {
				setIsSending(false);
			}
			return;
		}

		const senderEmail =
			user?.customDomain && user?.customDomain !== ''
				? user?.customDomain
				: user?.murmurEmail;

		if (!senderEmail) {
			console.error('No sender email configured');
			return;
		}

		setIsSending(true);
		try {
			const replySubject = selectedEmail.subject?.startsWith('Re:')
				? selectedEmail.subject
				: `Re: ${selectedEmail.subject || '(No Subject)'}`;

			await sendMailgunMessage({
				recipientEmail: selectedEmail.sender,
				subject: replySubject,
				message: messageToSend,
				senderEmail: senderEmail,
				senderName:
					user?.firstName && user?.lastName
						? `${user.firstName} ${user.lastName}`
						: user?.firstName || 'Murmur User',
				originEmail: senderEmail,
				replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
			});

			// Store the sent reply
			setSentReplies((prev) => {
				const existingReplies = prev[replyKey] || [];
				return {
					...prev,
					[replyKey]: [
						...existingReplies,
						{ message: messageToSend, timestamp: new Date() },
					],
				};
			});

			notifyThreadReplySent();
			setReplyMessage('');
		} catch (error) {
			// If sending fails, revert the optimistic theme flip.
			if (senderKey) {
				setReplyThemeBySender((prev) => {
					if (prev[senderKey] === undefined) return prev;
					const next = { ...prev };
					delete next[senderKey];
					return next;
				});
			}
			console.error('Failed to send reply:', error);
		} finally {
			setIsSending(false);
		}
	};

	// Safety: never leave the Drafts tab highlighted if this view unmounts mid-hover.
	useEffect(() => {
		return () => {
			setDraftsTabHighlighted(false);
			setWriteTabHighlighted(false);
			setTopSearchHighlighted(false);
			setHomeButtonHighlighted(false);
		};
	}, [
		setDraftsTabHighlighted,
		setWriteTabHighlighted,
		setTopSearchHighlighted,
		setHomeButtonHighlighted,
	]);

	// In demo mode, ensure the internal scroll position stays at the top so the header/search
	// remains visible (especially on mobile where swipes can otherwise scroll the inbox UI).
	const getDemoScrollEl = () => {
		const root = rootRef.current;
		if (!root) return null;
		const mainBox = root.querySelector<HTMLElement>('[data-campaign-main-box="inbox"]');
		// `CustomScrollbar` renders its scroll container as a `.scrollbar-hide` child.
		return mainBox?.querySelector<HTMLElement>('.scrollbar-hide') ?? null;
	};

	// Run as early as possible to avoid a "scrolled" first paint.
	useLayoutEffect(() => {
		if (!demoMode) return;
		const scrollEl = getDemoScrollEl();
		if (!scrollEl) return;
		scrollEl.scrollTop = 0;
	}, [demoMode]);

	useEffect(() => {
		if (!demoMode) return;
		const scrollEl = getDemoScrollEl();
		if (!scrollEl) return;

		const prevOverflowY = scrollEl.style.overflowY;
		const prevScrollBehavior = scrollEl.style.scrollBehavior;

		// Prevent internal scrolling in the demo embed.
		scrollEl.style.overflowY = 'hidden';
		scrollEl.style.scrollBehavior = 'auto';

		const forceTop = () => {
			// Use direct assignment to avoid smooth scrolling / layout jank in a demo embed.
			scrollEl.scrollTop = 0;
		};

		// Beat mobile browser overflow-scroll restoration by re-applying for a few frames.
		let rafId: number | null = null;
		let rafCount = 0;
		const rafTick = () => {
			forceTop();
			rafCount += 1;
			if (rafCount < 8) {
				rafId = window.requestAnimationFrame(rafTick);
			}
		};
		rafId = window.requestAnimationFrame(rafTick);

		// Also re-apply after the browser finishes restoring state.
		const t0 = window.setTimeout(forceTop, 0);
		const t1 = window.setTimeout(forceTop, 50);
		const t2 = window.setTimeout(forceTop, 200);
		const t3 = window.setTimeout(forceTop, 500);

		// Safety: if anything tries to scroll it anyway, snap back.
		const onScroll = () => {
			if (scrollEl.scrollTop !== 0) forceTop();
		};
		scrollEl.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			scrollEl.removeEventListener('scroll', onScroll);
			window.clearTimeout(t0);
			window.clearTimeout(t1);
			window.clearTimeout(t2);
			window.clearTimeout(t3);
			if (rafId != null) window.cancelAnimationFrame(rafId);
			scrollEl.style.overflowY = prevOverflowY;
			scrollEl.style.scrollBehavior = prevScrollBehavior;
		};
	}, [demoMode, activeTab, selectedEmailId]);

	// Reset selected email when switching tabs
	const handleTabChange = (
		tab: 'inbox' | 'sent',
		options?: { preserveSelection?: boolean }
	) => {
		hasUserSelectedInboxSentTabRef.current = true;
		hasAutoInitializedInboxSentTabRef.current = true;
		setActiveTab(tab);
		if (!options?.preserveSelection) {
			setSelectedEmailId(null);
		}
		setReplyMessage('');
		onInboxSentTabChange?.(tab);
	};

	// External request (campaign navigation): switch Inbox/Sent tab on demand.
	useLayoutEffect(() => {
		if (!inboxSentTabRequest) return;
		if (lastHandledInboxSentTabRequestIdRef.current === inboxSentTabRequest.requestId)
			return;
		lastHandledInboxSentTabRequestIdRef.current = inboxSentTabRequest.requestId;
		handleTabChange(inboxSentTabRequest.tab, {
			preserveSelection: inboxSentTabRequest.preserveSelection,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inboxSentTabRequest?.requestId]);

	// Campaign inbox: never sit on an empty Inbox/Sent tab.
	// If the active tab has no messages but the other tab does, switch to the tab that
	// has messages so the box never lands on the empty "Check Back Later" state while any
	// message exists. If BOTH tabs are empty, the campaign inbox is truly empty — notify
	// the parent so it can navigate away from the inbox view entirely.
	useLayoutEffect(() => {
		if (!isCampaignInbox) return;
		// Wait for the contact allowlist + email data so we never act on partial data
		// (which would briefly look empty and bounce the user out mid-load).
		if (allowedSenderEmails === undefined) return;
		if (!isInboundLoaded || !isSentLoaded) return;

		const inboxCount = inboxConversations.length;
		const sentCount = campaignSentCount;

		if (inboxCount === 0 && sentCount === 0) {
			if (!hasNotifiedCampaignInboxEmptyRef.current) {
				hasNotifiedCampaignInboxEmptyRef.current = true;
				onCampaignInboxEmpty?.();
			}
			return;
		}
		hasNotifiedCampaignInboxEmptyRef.current = false;

		const activeTabIsEmpty = activeTab === 'inbox' ? inboxCount === 0 : sentCount === 0;
		if (!activeTabIsEmpty) return;

		const nextTab: 'inbox' | 'sent' = activeTab === 'inbox' ? 'sent' : 'inbox';
		setActiveTab(nextTab);
		setSelectedEmailId(null);
		setReplyMessage('');
		onInboxSentTabChange?.(nextTab);
	}, [
		isCampaignInbox,
		allowedSenderEmails,
		isInboundLoaded,
		isSentLoaded,
		inboxConversations.length,
		campaignSentCount,
		activeTab,
		onCampaignInboxEmpty,
		onInboxSentTabChange,
		setSelectedEmailId,
	]);

	if (isLoading || (error && visibleEmails.length === 0)) {
		// Campaign inbox detail design loads into the teal detail box (header pill +
		// thread + composer), so mirror that layout instead of the list-style skeleton.
		// A failed/timed-out load with nothing to show keeps the skeleton too (rather
		// than a bare error box); the 15s inbound refetch resolves it into the list.
		if (shouldUseCampaignInboxDetailDesign) {
			const detailSkeletonPanelStyle = {
				position: 'absolute' as const,
				left: '50%',
				transform: 'translateX(-50%)',
				width: `${campaignInboxDetailInnerWidth}px`,
				backgroundColor: '#FFFFFF',
				boxSizing: 'border-box' as const,
			};
			return (
				<div className={`w-full flex justify-center ${outerPaddingClass}`}>
					<div
						data-campaign-main-box="inbox"
						className="relative animate-pulse overflow-hidden"
						style={{
							width: `${boxWidth}px`,
							maxWidth: `${boxWidth}px`,
							height: `${desktopBoxHeight}px`,
							border: '2px solid #000000',
							borderRadius: '12px',
							background: 'rgba(104, 199, 228, 0.60)',
							boxSizing: 'border-box',
						}}
						role="status"
						aria-busy="true"
						aria-label="Loading emails"
					>
						<span className="sr-only">Loading emails…</span>

						{/* Contact header pill skeleton */}
						<div
							className="flex items-center justify-between gap-4"
							style={{
								...detailSkeletonPanelStyle,
								top: `${campaignInboxDetailHeaderTop}px`,
								height: `${campaignInboxDetailHeaderHeight}px`,
								borderRadius: '7px',
								border: '2px solid #000000',
								padding: shouldUseCampaignInboxCompactDetailDesign
									? '0 8px 0 10px'
									: '0 15px 0 22px',
							}}
						>
							<div
								className="flex min-w-0 items-center"
								style={{
									gap: shouldUseCampaignInboxCompactDetailDesign ? '8px' : '14px',
								}}
							>
								<div
									className="shrink-0 rounded-full bg-[#D9D9D9]"
									style={{ width: '27px', height: '27px' }}
								/>
								<div className="h-[14px] w-[140px] rounded bg-[#D9D9D9]" />
								<div className="h-[12px] w-[90px] rounded bg-[#E5E5E5]" />
							</div>
							<div className="flex shrink-0 items-center gap-[6px]">
								<div className="h-[20px] w-[29px] rounded-[6px] bg-[#E5E5E5]" />
								<div className="h-[24px] w-[120px] rounded-[6px] bg-[#E5E5E5]" />
							</div>
						</div>

						{/* Thread panel skeleton */}
						<div
							style={{
								...detailSkeletonPanelStyle,
								top: `${campaignInboxDetailThreadTop}px`,
								height: `${campaignInboxDetailThreadHeight}px`,
								borderRadius: '7px',
								border: '1.719px solid #000000',
								padding: '13px 24px',
								overflow: 'hidden',
							}}
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-center gap-[12px]">
									<div
										className="shrink-0 rounded-full bg-[#D9D9D9]"
										style={{ width: '25px', height: '25px' }}
									/>
									<div className="h-[14px] w-[120px] rounded bg-[#D9D9D9]" />
								</div>
								<div className="h-[12px] w-[70px] shrink-0 rounded bg-[#E5E5E5]" />
							</div>
							<div style={{ marginTop: '16px', paddingLeft: '37px' }}>
								<div className="h-[12px] w-[85%] rounded bg-[#E5E5E5]" />
								<div className="mt-2 h-[12px] w-[70%] rounded bg-[#E5E5E5]" />
								<div className="mt-2 h-[12px] w-[78%] rounded bg-[#E5E5E5]" />
								<div className="mt-2 h-[12px] w-[40%] rounded bg-[#E5E5E5]" />
							</div>
						</div>

						{/* Composer skeleton */}
						<div
							className="flex items-start"
							style={{
								...detailSkeletonPanelStyle,
								top: `${campaignInboxDetailComposerTop}px`,
								height: `${campaignInboxDetailComposerHeight}px`,
								borderRadius: '6.877px',
								border: '1.719px solid #000000',
								padding: '14px 16px',
							}}
						>
							<div className="h-[12px] w-[160px] rounded bg-[#E5E5E5]" />
						</div>

						{/* Bottom divider strip (wide detail view only) */}
						{!shouldUseCampaignInboxCompactDetailDesign && (
							<div
								aria-hidden="true"
								style={{
									position: 'absolute',
									left: 0,
									right: 0,
									bottom: `${campaignInboxDetailBottomStripHeight}px`,
									height: '2px',
									backgroundColor: '#000000',
								}}
							/>
						)}
					</div>
				</div>
			);
		}

		const skeletonRowCount = isMobile ? 5 : 6;
		const loadingContainerStyle = {
			width: isMobile ? mobileBoxWidth : `${boxWidth}px`,
			maxWidth: isMobile ? undefined : `${boxWidth}px`,
			height: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
			border: '3px solid #000000',
			borderRadius: '8px',
			padding: isMobile ? '8px' : '16px',
			paddingTop: isMobile ? '62px' : `${desktopPaddingTopPx}px`,
			background: isMobile
				? activeTab === 'sent'
					? '#5AB477'
					: '#6fa4e1'
				: isDashboardMode
					? activeTab === 'sent'
						? '#5AB477'
						: '#6fa4e1'
					: activeTab === 'sent'
						? 'linear-gradient(to bottom, #FFFFFF 19px, #5AB477 19px)'
						: 'linear-gradient(to bottom, #FFFFFF 19px, #6fa4e1 19px)',
		};

		const loadingContent = (
			<>
				<span className="sr-only">Loading emails…</span>

				{/* Header ornaments (desktop only) */}
				{!isMobile && loadingVariant !== 'dashboard' && (
					<>
						{/* Three circles at top */}
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '17px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '78px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '139px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>

						{/* Inbox badge placeholder */}
						<div
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '174px',
								width: '69px',
								height: '18px',
								borderRadius: '11px',
								border: '3px solid #000000',
								backgroundColor: '#CCDFF4',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<div className="h-[10px] w-[36px] rounded bg-[#D9D9D9]" />
						</div>
					</>
				)}

				{/* Search bar skeleton */}
				<div
					style={{
						position: 'absolute',
						top: isMobile ? '12px' : `${desktopSearchTopPx}px`,
						left: isMobile ? '8px' : '14px',
						width: isMobile ? mobileSearchBarWidth : `${searchBarWidth}px`,
						height: isMobile ? '42px' : '48px',
						border: '3px solid #000000',
						borderRadius: '8px',
						backgroundColor: '#FFFFFF',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						paddingLeft: isMobile ? '12px' : '16px',
						gap: isMobile ? '10px' : '16px',
						pointerEvents: 'none',
					}}
					aria-hidden
				>
					<div className="h-[14px] w-[14px] rounded bg-[#D9D9D9]" />
					<div className="h-[14px] flex-1 rounded bg-[#E5E5E5]" />
				</div>

				{/* Top-right toggle skeleton */}
				{showMessagesCampaignsToggle ? (
					<div
						style={{
							position: 'absolute',
							top: isMobile ? '12px' : `${desktopSearchTopPx}px`,
							right: isMobile ? '8px' : '14px',
							width: '260px',
							height: '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							overflow: 'hidden',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							pointerEvents: 'none',
						}}
						aria-hidden
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
						<div className="h-full flex-1 bg-[#E5E5E5]" />
						<div className="h-full flex-1 bg-[#E5E5E5]" />
					</div>
				) : (
					<div
						style={{
							position: 'absolute',
							top: isMobile ? '12.5px' : '55.5px',
							right: isMobile ? '8px' : '14px',
							width: isMobile ? '100px' : '148px',
							height: isMobile ? '40px' : '47px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							padding: isMobile ? '3px' : '4px',
							gap: isMobile ? '2px' : '4px',
							pointerEvents: 'none',
						}}
						aria-hidden
					>
						<div
							className="rounded-[8px] bg-[#E5E5E5]"
							style={{
								width: isMobile ? '46px' : '70px',
								height: isMobile ? '16px' : '19px',
							}}
						/>
						<div
							className="rounded-[8px] bg-[#E5E5E5]"
							style={{
								width: isMobile ? '46px' : '70px',
								height: isMobile ? '16px' : '19px',
							}}
						/>
					</div>
				)}

				{/* Email rows skeleton */}
				{Array.from({ length: skeletonRowCount }).map((_, idx) => (
					<div
						key={`inbox-loading-${idx}`}
						className="bg-white px-4 flex items-center w-full max-[480px]:px-2"
						style={{
							width: isMobile ? mobileEmailRowWidth : `${emailRowWidth}px`,
							height: isMobile ? '100px' : '78px',
							minHeight: isMobile ? '100px' : '78px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
						}}
					>
						<div className="flex flex-col w-full">
							<div className="flex items-center justify-between gap-3">
								<div
									className="h-[14px] rounded bg-[#D9D9D9]"
									style={{ width: isMobile ? '55%' : '180px' }}
								/>
								<div
									className="h-[14px] rounded bg-[#D9D9D9]"
									style={{ width: isMobile ? '60px' : '90px' }}
								/>
							</div>
							<div
								className="mt-2 h-[12px] rounded bg-[#E5E5E5]"
								style={{ width: isMobile ? '85%' : '260px' }}
							/>
							<div
								className="mt-2 h-[10px] rounded bg-[#E5E5E5]"
								style={{ width: isMobile ? '70%' : '320px' }}
							/>
						</div>
					</div>
				))}
			</>
		);

		return (
			<div className={`w-full flex justify-center ${outerPaddingClass}`}>
				{loadingVariant === 'dashboard' ? (
					<CustomScrollbar
						data-campaign-main-box="inbox"
						className={`flex flex-col items-center relative ${
							isDashboardMode ? '' : 'animate-pulse'
						}`}
						contentClassName="flex flex-col items-center w-full space-y-2"
						thumbWidth={2}
						thumbColor={scrollbarThumbColor}
						trackColor="transparent"
						offsetRight={scrollbarOffsetRight}
						alignTrackToScrollContainer={scrollbarAlignTrackToScrollContainer}
						disableOverflowClass
						lockHorizontalScroll
						style={loadingContainerStyle}
						role="status"
						aria-busy="true"
						aria-label="Loading emails"
					>
						{loadingContent}
					</CustomScrollbar>
				) : (
					<div
						data-campaign-main-box="inbox"
						className={`flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden relative ${
							isDashboardMode ? '' : 'animate-pulse'
						}`}
						style={loadingContainerStyle}
						role="status"
						aria-busy="true"
						aria-label="Loading emails"
					>
						{loadingContent}
					</div>
				)}
			</div>
		);
	}

	// Genuinely-empty inbox (no error — errored-with-no-data renders the skeleton
	// above, and an error while emails are already loaded falls through to the list).
	if (visibleEmails.length === 0) {
		return (
			<div className={`w-full flex justify-center ${outerPaddingClass}`}>
				<div
					data-campaign-main-box="inbox"
					className="flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden relative"
					style={{
						width: isMobile ? mobileBoxWidth : `${boxWidth}px`,
						maxWidth: isMobile ? undefined : `${boxWidth}px`,
						height: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
						border: '3px solid #000000',
						borderRadius: '8px',
						padding: isMobile ? '8px' : '16px',
						paddingTop: isMobile ? '98px' : `${desktopPaddingTopPx}px`, // Adjusted for mobile
						background: '#84b9f5',
					}}
				>
					{/* Three circles at top */}
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '17px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '78px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '139px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>

					{/* Inbox/Sent Badge */}
					<div
						style={{
							position: 'absolute',
							top: '9.5px', // vertically center within 19px header
							transform: 'translateY(-50%)',
							left: '174px', // 139px (3rd circle left) + 9px (width) + 26px (gap)
							width: '69px',
							height: '18px',
							borderRadius: '11px',
							border: '3px solid #999999',
							backgroundColor: '#84b9f5',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<span
							className="text-[10px] font-bold leading-none"
							style={{ color: '#999999' }}
						>
							{activeTab === 'inbox' ? 'Inbox' : 'Sent'}
						</span>
					</div>

					{/* Search Bar - positioned 55px from top, left-aligned with emails */}
					<div
						style={{
							position: 'absolute',
							top: isMobile ? '45px' : `${desktopSearchTopPx}px`,
							left: isMobile ? '8px' : '14px',
							width: isMobile ? mobileSearchBarWidth : `${searchBarWidth}px`,
							height: isMobile ? '42px' : '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#3277c6',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: '16px',
							pointerEvents: 'none',
						}}
					>
						<SearchIconDesktop />
						<input
							type="text"
							value={searchQuery}
							onChange={() => {}}
							placeholder=""
							disabled
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
								cursor: 'not-allowed',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>

					{/* Top-right toggle */}
					{showMessagesCampaignsToggle ? (
						<div
							style={{
								position: 'absolute',
								top: isMobile ? '45px' : `${desktopSearchTopPx}px`,
								right: isMobile ? '8px' : '14px',
								width: '260px',
								height: '48px',
								border: '3px solid #000000',
								borderRadius: '8px',
								overflow: 'hidden',
								zIndex: 10,
								display: 'flex',
								backgroundColor: '#FFFFFF',
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
								onClick={() => onInboxSubtabChange?.('messages')}
								aria-pressed={inboxSubtab === 'messages'}
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
									backgroundColor: inboxSubtab === 'messages' ? '#B3E5FF' : '#4DA6D7',
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
								onClick={() => onInboxSubtabChange?.('campaigns')}
								aria-pressed={inboxSubtab === 'campaigns'}
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
									backgroundColor: inboxSubtab === 'campaigns' ? '#B3E5FF' : '#4DA6D7',
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
					) : (
						<div
							style={{
								position: 'absolute',
								top: isMobile ? '45.5px' : `${desktopSearchTopPx + 0.5}px`, // Centered with search bar
								right: isMobile ? '8px' : '14px', // Right-aligned with emails
								width: isMobile ? '100px' : '148px',
								height: isMobile ? '40px' : '47px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#FFFFFF',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								padding: isMobile ? '3px' : '4px',
								gap: isMobile ? '2px' : '4px',
							}}
						>
							{/* Inbox tab */}
							<button
								type="button"
								onClick={() => handleTabChange('inbox')}
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor:
										activeTab === 'inbox' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'inbox' ? '2px solid #000000' : 'none',
									cursor: 'pointer',
									padding: 0,
									margin: 0,
									outline: 'none',
									boxShadow: 'none',
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								<span
									style={{
										fontSize: isMobile ? '11px' : '14px',
										fontWeight: 500,
										color: '#000000',
										fontFamily: 'Times New Roman, serif',
									}}
								>
									Inbox
								</span>
							</button>
							{/* Sent tab */}
							<button
								type="button"
								onClick={() => handleTabChange('sent')}
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor:
										activeTab === 'sent' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'sent' ? '2px solid #000000' : 'none',
									cursor: 'pointer',
									padding: 0,
									margin: 0,
									outline: 'none',
									boxShadow: 'none',
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								<span
									style={{
										fontSize: isMobile ? '11px' : '14px',
										fontWeight: 500,
										color: '#000000',
										fontFamily: 'Times New Roman, serif',
									}}
								>
									Sent
								</span>
							</button>
						</div>
					)}

					{Array.from({ length: isMobile ? 5 : 7 }).map((_, idx) => (
						<div
							key={`inbox-placeholder-${idx}`}
							className="select-none mb-2 w-full"
							style={{
								width: isMobile ? mobileEmailRowWidth : `${emailRowWidth}px`,
								height:
									idx >= 1 && idx <= 4
										? isMobile
											? '58px'
											: '52px'
										: isMobile
											? '90px'
											: '78px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#3277c6',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							{idx === 0 && (
								<span
									style={{
										fontSize: isMobile ? '14px' : '16px',
										fontWeight: 500,
										color: '#FFFFFF',
										fontFamily: 'Inter, sans-serif',
										textAlign: 'center',
									}}
								>
									Check Back Later
								</span>
							)}
							{idx >= 1 && idx <= 4 && (
								<div
									onClick={
										idx === 1 && onGoToDrafting
											? onGoToDrafting
											: idx === 2 && onGoToWriting
												? onGoToWriting
												: idx === 3 && onGoToSearch
													? onGoToSearch
													: idx === 3 && onGoToContacts
														? onGoToContacts
														: idx === 4
															? () => {
																	if (typeof window !== 'undefined') {
																		window.location.assign(urls.murmur.dashboard.index);
																	}
																}
															: undefined
									}
									onMouseEnter={
										idx === 1
											? () => setDraftsTabHighlighted(true)
											: idx === 2
												? () => setWriteTabHighlighted(true)
												: idx === 3
													? () => setTopSearchHighlighted(true)
													: idx === 4
														? () => setHomeButtonHighlighted(true)
														: undefined
									}
									onMouseLeave={
										idx === 1
											? () => setDraftsTabHighlighted(false)
											: idx === 2
												? () => setWriteTabHighlighted(false)
												: idx === 3
													? () => setTopSearchHighlighted(false)
													: idx === 4
														? () => setHomeButtonHighlighted(false)
														: undefined
									}
									className={`bg-white transition-colors ${
										idx === 1
											? 'hover:bg-[#EFDAAF]'
											: idx === 2
												? 'hover:bg-[#A6E2A8]'
												: idx === 3
													? 'hover:bg-[#AFD6EF]'
													: idx === 4
														? 'hover:bg-[#DBDBDB]'
														: ''
									}`}
									style={{
										width: isMobile ? 'calc(100% - 24px)' : '314px',
										height: isMobile ? '44px' : '42px',
										border: '3px solid #000000',
										borderRadius: '8px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										cursor:
											(idx === 1 && onGoToDrafting) ||
											(idx === 2 && onGoToWriting) ||
											(idx === 3 && (onGoToSearch || onGoToContacts)) ||
											idx === 4
												? 'pointer'
												: 'default',
									}}
								>
									{idx === 1 && (
										<span
											style={{
												fontSize: isMobile ? '12px' : '14px',
												fontWeight: 500,
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												textAlign: 'center',
											}}
										>
											Review and Send Drafts
										</span>
									)}
									{idx === 2 && (
										<span
											style={{
												fontSize: isMobile ? '12px' : '14px',
												fontWeight: 500,
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												textAlign: 'center',
											}}
										>
											Write More Emails
										</span>
									)}
									{idx === 3 && (
										<span
											style={{
												fontSize: isMobile ? '12px' : '14px',
												fontWeight: 500,
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												textAlign: 'center',
											}}
										>
											Add More Contacts
										</span>
									)}
									{idx === 4 && (
										<span
											style={{
												fontSize: isMobile ? '12px' : '14px',
												fontWeight: 500,
												color: '#000000',
												fontFamily: 'Inter, sans-serif',
												textAlign: 'center',
											}}
										>
											Create New Campaign
										</span>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={rootRef}
			className={`relative w-full flex justify-center ${outerPaddingClass} ${
				demoMode ? 'pointer-events-none select-none' : ''
			}`}
			style={{
				// The banner claims the box's original top edge; the whole box shifts
				// down by the banner's footprint so nothing hides under the top bar.
				transform:
					bookedBannerState !== 'hidden'
						? `translateY(${BOOKED_BANNER_OFFSET_PX}px)`
						: undefined,
				transition: bannerShiftAnimEnabled ? 'transform 180ms ease-out' : 'none',
				// The dropdown is portaled above fixed chrome; keep this shifted subtree
				// above nearby inbox content while it is open.
				zIndex: isBookingDropdownOpen ? 70 : undefined,
			}}
		>
			{bookedBannerState !== 'hidden' && (
				<div
					ref={bookedBannerRef}
					data-campaign-interactive-surface
					style={{
						position: 'absolute',
						// Banner sits where the box top used to be (the root is shifted
						// down by the same offset), so the toolbar above stays clear.
						top: `${-BOOKED_BANNER_OFFSET_PX}px`,
						left: '50%',
						marginLeft: `${-boxWidth / 2}px`,
						width: '400px',
						height: `${BOOKED_BANNER_HEIGHT_PX}px`,
						zIndex: 30,
					}}
				>
					{bookedBannerState === 'booked' && selectedConversationBooking ? (
						<button
							type="button"
							onClick={reopenBookingDropdown}
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '12px',
								border: '2px solid #000000',
								background: '#B7FFC5',
								display: 'flex',
								alignItems: 'center',
								padding: '0 12px',
								gap: '12px',
								cursor: 'pointer',
								fontFamily: 'Inter, sans-serif',
								fontSize: '12px',
								color: '#000000',
							}}
						>
							<span style={{ fontWeight: 700 }}>
								{formatCalendarDate(parseIsoKey(selectedConversationBooking.date))}
							</span>
							<span style={{ fontWeight: 600 }}>
								{selectedConversationBooking.startTime || DEFAULT_START_TIME} -{' '}
								{selectedConversationBooking.endTime || DEFAULT_END_TIME}
							</span>
						</button>
					) : bookedBannerState === 'yes-pending' ? (
						<div
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '12px',
								border: '2px solid #000000',
								background: '#F8FAFF',
								position: 'relative',
							}}
						>
							{/* Morph state: just the green Yes chip, at the question-state Yes x. */}
							<button
								type="button"
								onClick={() => setBookingDropdown(null)}
								style={{
									position: 'absolute',
									right: '114px',
									top: '2px',
									width: '96px',
									height: '20px',
									borderRadius: '10px',
									border: '0.858px solid #000000',
									background: '#B7FFC5',
									fontFamily: 'Inter, sans-serif',
									fontSize: '11px',
									fontWeight: 600,
									color: '#000000',
									cursor: 'pointer',
								}}
							>
								Yes
							</button>
						</div>
					) : (
						<div
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '12px',
								border: '2px solid #000000',
								background: '#F8FAFF',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '0 10px 0 14px',
								boxSizing: 'border-box',
							}}
						>
							<span
								style={{
									fontFamily: 'Inter, sans-serif',
									fontSize: '13px',
									fontWeight: 700,
									color: '#000000',
								}}
							>
								Has this been booked?
							</span>
							<div style={{ display: 'flex', gap: '8px' }}>
								<button
									type="button"
									onClick={handleBookedYes}
									style={{
										width: '96px',
										height: '20px',
										borderRadius: '10px',
										border: '0.858px solid #000000',
										background: '#B7FFC5',
										fontFamily: 'Inter, sans-serif',
										fontSize: '11px',
										fontWeight: 600,
										color: '#000000',
										cursor: 'pointer',
									}}
								>
									Yes
								</button>
								<button
									type="button"
									onClick={handleBookedNo}
									style={{
										width: '96px',
										height: '20px',
										borderRadius: '10px',
										border: '0.858px solid #000000',
										background: '#B7E5FF',
										fontFamily: 'Inter, sans-serif',
										fontSize: '11px',
										fontWeight: 600,
										color: '#000000',
										cursor: 'pointer',
									}}
								>
									No
								</button>
							</div>
						</div>
					)}
				</div>
			)}
			{isBookingDropdownOpen && bookingDropdown && isCampaignInbox && (
				<InboxBookingCalendarDropdown
					campaignId={campaignId as number}
					prefill={bookingPrefillFields}
					initialFocusDateIso={bookingDropdown.initialFocusDateIso}
					autoExpandInitialDate={bookingDropdown.autoExpand}
					anchorRef={rootRef}
					bannerRef={
						bookingDropdown.mode === 'confirm' ? bookingRequestBannerRef : bookedBannerRef
					}
					confirmMode={
						bookingDropdown.mode === 'confirm' && bookingDropdown.bookingRequestId != null
							? {
									bookingRequestId: bookingDropdown.bookingRequestId,
									lockedDateIso: bookingDropdown.lockedDateIso,
									onConfirmed: () => closeBookingDropdown({ confirmed: true }),
								}
							: undefined
					}
					onClose={() => closeBookingDropdown()}
				/>
			)}
			<CustomScrollbar
				data-campaign-main-box="inbox"
				className="flex flex-col items-center relative"
				contentClassName="flex flex-col items-center w-full"
				thumbWidth={2}
				thumbColor={scrollbarThumbColor}
				trackColor="transparent"
				offsetRight={scrollbarOffsetRight}
				alignTrackToScrollContainer={scrollbarAlignTrackToScrollContainer}
				scrollContainerRef={mainListScrollerRef}
				disableOverflowClass
				style={{
					width: isMobile ? mobileBoxWidth : `${boxWidth}px`,
					maxWidth: isMobile ? undefined : `${boxWidth}px`,
					height: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					minHeight: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					maxHeight: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					border: shouldUseCampaignInboxDetailDesign
						? '2px solid #000000'
						: '3px solid #000000',
					borderRadius: shouldUseCampaignInboxDetailDesign ? '12px' : '8px',
					padding: shouldUseDetailChrome
						? shouldUseCampaignInboxDetailDesign
							? '0px'
							: isMobile
								? '18px 8px 8px 8px'
								: '21px 13px 12px 13px'
						: isMobile
							? '8px'
							: '16px',
					paddingTop: shouldUseDetailChrome
						? shouldUseCampaignInboxDetailDesign
							? '0px'
							: isMobile
								? '18px'
								: '21px'
						: isMobile
							? '62px'
							: `${desktopPaddingTopPx}px`, // Adjusted for mobile
					background: shouldUseCampaignInboxDetailDesign
						? isReplySentThemeActive
							? INBOX_LAST_SENT_FILL_COLOR
							: 'rgba(104, 199, 228, 0.60)'
						: shouldUseDetailChrome
							? isReplySentThemeActive
								? INBOX_LAST_SENT_FILL_COLOR
								: '#437ec1'
							: isMobile
								? activeTab === 'sent'
									? '#5AB477'
									: '#6fa4e1'
								: isDashboardMode
									? activeTab === 'sent'
										? '#5AB477'
										: '#6fa4e1'
									: activeTab === 'sent'
										? 'linear-gradient(to bottom, #FFFFFF 19px, #5AB477 19px)'
										: 'linear-gradient(to bottom, #FFFFFF 19px, #6fa4e1 19px)',
					overflow: isMobile || shouldUseCampaignInboxDetailDesign ? 'hidden' : undefined,
					boxSizing: 'border-box',
				}}
			>
				{/* Back button - shown when email is selected */}
				{selectedEmail && !hideSelectedEmailBackButton && (
					<button
						type="button"
						onClick={() => {
							setSelectedEmailId(null);
							setReplyMessage('');
						}}
						className="absolute cursor-pointer bg-transparent border-0 p-0 z-10"
						style={{
							top: '3px',
							left: '21px',
						}}
					>
						<svg
							width="34"
							height="15"
							viewBox="0 0 34 15"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M0.292892 6.65666C-0.0976295 7.04719 -0.0976295 7.68035 0.292892 8.07088L6.65685 14.4348C7.04738 14.8254 7.68054 14.8254 8.07107 14.4348C8.46159 14.0443 8.46159 13.4111 8.07107 13.0206L2.41421 7.36377L8.07107 1.70692C8.46159 1.31639 8.46159 0.683226 8.07107 0.292702C7.68054 -0.0978227 7.04738 -0.0978227 6.65685 0.292702L0.292892 6.65666ZM34 7.36377V6.36377L1 6.36377V7.36377V8.36377L34 8.36377V7.36377Z"
								fill="white"
							/>
						</svg>
					</button>
				)}
				{/* Header chrome with dots and Inbox pill - hidden on mobile */}
				{!selectedEmail && !detailOnly && !isMobile && !isDashboardMode && (
					<InboxSectionHeaderChrome
						onContactsClick={onGoToContacts}
						onWriteClick={onGoToWriting}
						onDraftsClick={onGoToDrafting}
					/>
				)}
				{/* Search Bar - positioned 55px from top, left-aligned with emails */}
				{!selectedEmail && !detailOnly && (
					<div
						style={{
							position: 'absolute',
							top: isMobile ? '12px' : `${desktopSearchTopPx}px`,
							left: isMobile ? '8px' : '14px',
							width: isMobile ? mobileSearchBarWidth : `${searchBarWidth}px`,
							height: isMobile ? '42px' : '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: isMobile ? '12px' : '16px',
						}}
					>
						<SearchIconDesktop />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search Mail"
							style={{
								flex: 1,
								height: '100%',
								border: 'none',
								outline: 'none',
								fontSize: isMobile ? '14px' : '16px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: isMobile ? '10px' : '16px',
								paddingRight: isMobile ? '10px' : '16px',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>
				)}
				{/* Top-right toggle */}
				{!selectedEmail &&
					!detailOnly &&
					(showMessagesCampaignsToggle ? (
						<div
							style={{
								position: 'absolute',
								top: isMobile ? '12px' : `${desktopSearchTopPx}px`,
								right: isMobile ? '8px' : '14px',
								width: '260px',
								height: '48px',
								border: '3px solid #000000',
								borderRadius: '8px',
								overflow: 'hidden',
								zIndex: 10,
								display: 'flex',
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
								onClick={() => onInboxSubtabChange?.('messages')}
								aria-pressed={inboxSubtab === 'messages'}
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
									backgroundColor: inboxSubtab === 'messages' ? '#B3E5FF' : '#4DA6D7',
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
								onClick={() => onInboxSubtabChange?.('campaigns')}
								aria-pressed={inboxSubtab === 'campaigns'}
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
									backgroundColor: inboxSubtab === 'campaigns' ? '#B3E5FF' : '#4DA6D7',
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
					) : (
						<div
							style={{
								position: 'absolute',
								top: isMobile ? '12.5px' : '55.5px', // Centered with search bar
								right: isMobile ? '8px' : '14px', // Right-aligned with emails
								width: isMobile ? '100px' : '148px',
								height: isMobile ? '40px' : '47px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#FFFFFF',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								padding: isMobile ? '3px' : '4px',
								gap: isMobile ? '2px' : '4px',
							}}
						>
							{/* Inbox tab */}
							<button
								type="button"
								onClick={() => handleTabChange('inbox')}
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor:
										activeTab === 'inbox' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'inbox' ? '2px solid #000000' : 'none',
									cursor: 'pointer',
									padding: 0,
									margin: 0,
									outline: 'none',
									boxShadow: 'none',
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								<span
									style={{
										fontSize: isMobile ? '11px' : '14px',
										fontWeight: 500,
										color: '#000000',
										fontFamily: 'Times New Roman, serif',
									}}
								>
									Inbox
								</span>
							</button>
							{/* Sent tab */}
							<button
								type="button"
								onClick={() => handleTabChange('sent')}
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor:
										activeTab === 'sent' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'sent' ? '2px solid #000000' : 'none',
									cursor: 'pointer',
									padding: 0,
									margin: 0,
									outline: 'none',
									boxShadow: 'none',
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								<span
									style={{
										fontSize: isMobile ? '11px' : '14px',
										fontWeight: 500,
										color: '#000000',
										fontFamily: 'Times New Roman, serif',
									}}
								>
									Sent
								</span>
							</button>
						</div>
					))}

				{selectedEmail ? (
					shouldUseCampaignInboxDetailDesign ? (
						<div
							className="relative h-full w-full overflow-hidden"
							style={{ fontFamily: 'Inter, sans-serif' }}
						>
							{(() => {
								const contact = resolveContactForEmail(selectedEmail, contactByEmail);
								const contactName = getCanonicalContactName(
									selectedEmail,
									contactByEmail
								);
								const companyLabel = getContactCompanyLabel(
									selectedEmail,
									contactByEmail
								);
								const headline = contact?.headline || contact?.title || '';
								const stateAbbr = contact
									? getStateAbbreviation(contact.state || '') || ''
									: '';
								const placeLabel =
									(typeof contact?.city === 'string' && contact.city.trim()) ||
									(typeof contact?.state === 'string' && contact.state.trim()) ||
									'';

								return (
									<div
										className="flex items-center justify-between gap-4"
										style={{
											position: 'absolute',
											top: `${campaignInboxDetailHeaderTop}px`,
											left: '50%',
											transform: 'translateX(-50%)',
											width: `${campaignInboxDetailInnerWidth}px`,
											height: `${campaignInboxDetailHeaderHeight}px`,
											borderRadius: '7px',
											border: '2px solid #000000',
											backgroundColor: '#FFFFFF',
											boxSizing: 'border-box',
											padding: shouldUseCampaignInboxCompactDetailDesign
												? '0 8px 0 10px'
												: '0 15px 0 22px',
											zIndex: 3,
										}}
									>
										<div
											className="flex min-w-0 items-center"
											style={{
												gap: shouldUseCampaignInboxCompactDetailDesign ? '8px' : '14px',
												flex: '1 1 auto',
											}}
										>
											<div
												className="flex shrink-0 items-center justify-center rounded-full"
												style={{
													width: shouldUseCampaignInboxCompactDetailDesign
														? '25px'
														: '27px',
													height: shouldUseCampaignInboxCompactDetailDesign
														? '25px'
														: '27px',
													backgroundColor: '#86C7E8',
													...campaignInboxDetailNameTextStyle,
													color: '#FFFFFF',
												}}
											>
												{getAvatarInitial(contactName)}
											</div>
											<div
												className="flex min-w-0 items-center"
												style={{
													gap: shouldUseCampaignInboxCompactDetailDesign ? '8px' : '17px',
												}}
											>
												<span
													className="truncate"
													style={campaignInboxDetailNameTextStyle}
												>
													{contactName}
												</span>
												{companyLabel && (
													<span
														className="truncate text-black"
														style={{
															fontSize: shouldUseCampaignInboxCompactDetailDesign
																? '14px'
																: '16px',
															fontWeight: 400,
															lineHeight: 1,
															maxWidth: shouldUseCampaignInboxCompactDetailDesign
																? '96px'
																: undefined,
														}}
													>
														{companyLabel}
													</span>
												)}
											</div>
										</div>

										<div
											className="flex min-w-0 items-center text-black"
											style={{
												gap: shouldUseCampaignInboxCompactDetailDesign ? '4px' : '6px',
												flexShrink: shouldUseCampaignInboxCompactDetailDesign ? 1 : 0,
												maxWidth: shouldUseCampaignInboxCompactDetailDesign
													? '214px'
													: undefined,
											}}
										>
											{stateAbbr && (
												<span
													className="inline-flex items-center justify-center border border-black"
													style={{
														width: '29px',
														height: '20px',
														borderRadius: '6px',
														backgroundColor: stateBadgeColorMap[stateAbbr] || '#FFF7EF',
														fontSize: '12px',
														fontWeight: 500,
														lineHeight: 1,
													}}
												>
													{stateAbbr}
												</span>
											)}
											{placeLabel && (
												<span
													className="truncate"
													style={{
														fontSize: shouldUseCampaignInboxCompactDetailDesign
															? '12px'
															: '14px',
														fontWeight: 400,
														lineHeight: 1,
														maxWidth: shouldUseCampaignInboxCompactDetailDesign
															? '54px'
															: undefined,
													}}
												>
													{placeLabel}
												</span>
											)}
											{headline && (
												<div
													className="flex items-center gap-1 overflow-hidden border border-black"
													style={{
														height: '24px',
														borderRadius: '6px',
														backgroundColor: getContactTitleBadgeBackground(headline),
														padding: shouldUseCampaignInboxCompactDetailDesign
															? '0 6px'
															: '0 8px',
														maxWidth: shouldUseCampaignInboxCompactDetailDesign
															? '112px'
															: '180px',
													}}
												>
													{renderContactTitleBadgeIcon(
														headline,
														shouldUseCampaignInboxCompactDetailDesign ? 12 : 14
													)}
													<span
														className="truncate text-black"
														style={{ fontSize: '13px', lineHeight: 1 }}
													>
														{getContactTitleBadgeLabel(headline)}
													</span>
												</div>
											)}
											{selectedVenueThreadApplicationId != null &&
												selectedEmail.subject && (
													<InboxEventPill name={selectedEmail.subject} />
												)}
										</div>
									</div>
								);
							})()}

							{showBookedHeaderStrip && selectedConversationBooking && (
								<button
									type="button"
									onClick={reopenBookingDropdown}
									style={{
										position: 'absolute',
										top: `${
											campaignInboxDetailHeaderTop + campaignInboxDetailHeaderHeight + 4
										}px`,
										left: '50%',
										transform: 'translateX(-50%)',
										width: `${campaignInboxDetailInnerWidth}px`,
										height: '22px',
										borderRadius: '6px',
										border: '1.5px solid #000000',
										backgroundColor: '#B7FFC5',
										display: 'flex',
										alignItems: 'center',
										gap: '10px',
										padding: '0 12px',
										boxSizing: 'border-box',
										cursor: 'pointer',
										zIndex: 2,
										fontFamily: 'Inter, sans-serif',
										color: '#000000',
									}}
								>
									<span style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1 }}>
										Booked
									</span>
									<span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1 }}>
										{formatCalendarDate(parseIsoKey(selectedConversationBooking.date))}
										{'  '}
										{selectedConversationBooking.startTime || DEFAULT_START_TIME} -{' '}
										{selectedConversationBooking.endTime || DEFAULT_END_TIME}
									</span>
								</button>
							)}

							<div
								style={{
									position: 'absolute',
									top: `${campaignInboxDetailThreadTop}px`,
									left: '50%',
									transform: 'translateX(-50%)',
									width: `${campaignInboxDetailInnerWidth}px`,
									height: `${campaignInboxDetailThreadHeight}px`,
									borderRadius: selectedThreadUsesMessengerLayout ? '20px' : '7px',
									border: selectedThreadUsesMessengerLayout
										? '3px solid #000000'
										: '1.719px solid #000000',
									backgroundColor: selectedThreadUsesMessengerLayout
										? INBOX_MESSENGER_THREAD_BACKGROUND
										: '#FFFFFF',
									boxSizing: 'border-box',
									overflow: 'hidden',
									zIndex: 1,
								}}
							>
								<CustomScrollbar
									className="h-full w-full"
									contentClassName={
										selectedThreadUsesMessengerLayout
											? 'flex min-h-full flex-col gap-[14px] px-[16px] py-[16px]'
											: 'flex min-h-full flex-col'
									}
									thumbWidth={2}
									thumbColor={scrollbarThumbColor}
									trackColor="transparent"
									offsetRight={-5}
									disableOverflowClass
									lockHorizontalScroll
								>
									{selectedThreadMessages.map((message, index) => {
										const venueAction = message.venueAction;
										if (venueAction?.kind === 'invite-to-connect') {
											return (
												<VenueInviteToConnectBanner
													key={`venue-action-${message.id}-${index}`}
													perspective="artist"
													counterpartName={getCanonicalContactName(message, contactByEmail)}
													className={
														selectedThreadUsesMessengerLayout
															? 'w-full shrink-0'
															: 'm-[12px] w-auto shrink-0'
													}
												/>
											);
										}
										// Venue booking-request rows render as the handshake banner
										// (confirm chip while pending, green strip once booked, muted
										// trace when the venue withdrew it) instead of a bubble/card.
										const venueBookingRequest = message.venueBookingRequest;
										if (venueBookingRequest != null) {
											const rowKey = `booking-${message.id}-${index}`;
											if (venueBookingRequest.status === 'canceled') {
												return (
													<div
														key={rowKey}
														className="self-center py-[4px] text-center italic"
														style={{
															fontSize: '13px',
															color: 'rgba(0, 0, 0, 0.4)',
															flexShrink: 0,
														}}
													>
														Booking request canceled
													</div>
												);
											}
											const isActiveRequestMessage =
												selectedActiveBookingRequestMessage?.id === message.id;
											return (
												<BookingRequestBanner
													key={rowKey}
													status={venueBookingRequest.status}
													perspective="artist"
													date={venueBookingRequest.date}
													eventName={venueBookingRequest.eventName}
													eventDateLabel={venueBookingRequest.eventWhenLabel}
													bannerRef={
														isActiveRequestMessage ? bookingRequestBannerRef : undefined
													}
													onConfirm={
														isActiveRequestMessage &&
														bookingConfirmEligible &&
														venueBookingRequest.status === 'pending'
															? handleConfirmBookingRequestClick
															: undefined
													}
													className={
														selectedThreadUsesMessengerLayout
															? '-mx-[16px] w-auto shrink-0'
															: 'shrink-0'
													}
												/>
											);
										}
										const isSentMessage = Boolean(message.isSent);
										const shouldFillThreadBox =
											selectedThreadIsSingleInboundMessage && !isSentMessage;
										const isLastThreadItem =
											index === selectedThreadMessages.length - 1 &&
											selectedPendingReplies.length === 0;
										const senderName = isSentMessage
											? currentUserDisplayName
											: getCanonicalContactName(message, contactByEmail);
										const companyLabel = isSentMessage
											? null
											: getContactCompanyLabel(message, contactByEmail);
										const bodyText =
											stripQuotedReply(message.strippedText || message.bodyPlain || '') ||
											getInboxMessageSnippet(message) ||
											'No content';
										if (selectedThreadUsesMessengerLayout) {
											return (
												<div
													key={`${isSentMessage ? 'sent' : 'inbound'}-${message.id}-${index}`}
													className="flex w-full items-end"
													style={{
														justifyContent: isSentMessage ? 'flex-end' : 'flex-start',
														gap: '8px',
														flexShrink: 0,
													}}
												>
													{!isSentMessage && (
														<div
															className="flex shrink-0 items-center justify-center rounded-full"
															style={{
																width: '26px',
																height: '26px',
																backgroundColor: '#67C76D',
																...campaignInboxDetailNameTextStyle,
																fontSize: '14px',
																color: '#FFFFFF',
															}}
														>
															{getAvatarInitial(senderName)}
														</div>
													)}
													<div
														className="whitespace-pre-wrap"
														style={{
															maxWidth: '62%',
															backgroundColor: isSentMessage
																? INBOX_MESSENGER_OUTBOUND_BACKGROUND
																: INBOX_MESSENGER_INBOUND_BACKGROUND,
															border: '2px solid #000000',
															borderRadius: isSentMessage
																? '20px 20px 6px 20px'
																: '20px 20px 20px 6px',
															padding: '9px 13px',
															boxSizing: 'border-box',
															fontSize: '14px',
															lineHeight: 1.35,
															color: '#000000',
														}}
													>
														{bodyText}
													</div>
												</div>
											);
										}
										return (
											<div
												key={`${isSentMessage ? 'sent' : 'inbound'}-${message.id}-${index}`}
												style={{
													backgroundColor: isSentMessage ? '#FFFFFF' : '#E5F1FF',
													borderBottom: isLastThreadItem
														? 'none'
														: '1.719px solid #000000',
													padding: '13px 24px 10px 24px',
													boxSizing: 'border-box',
													minHeight: shouldFillThreadBox
														? '100%'
														: selectedThreadEvenSplitMinHeight,
													flexShrink: 0,
												}}
											>
												<div className="flex items-start justify-between gap-4">
													<div className="flex min-w-0 items-center gap-[12px]">
														<div
															className="flex shrink-0 items-center justify-center rounded-full"
															style={{
																width: '25px',
																height: '25px',
																backgroundColor: isSentMessage ? '#67C76D' : '#86C7E8',
																...campaignInboxDetailNameTextStyle,
																color: '#FFFFFF',
															}}
														>
															{getAvatarInitial(senderName)}
														</div>
														<span
															className="truncate"
															style={campaignInboxDetailNameTextStyle}
														>
															{senderName}
														</span>
														{companyLabel && (
															<span
																className="truncate text-black"
																style={{
																	fontSize: '15px',
																	fontWeight: 400,
																	lineHeight: 1,
																}}
															>
																{companyLabel}
															</span>
														)}
													</div>
													<span
														className="shrink-0 text-black"
														style={{ fontSize: '14px', lineHeight: 1 }}
													>
														{formatCampaignInboxTimestamp(message.receivedAt)}
													</span>
												</div>
												<div
													className="whitespace-pre-wrap"
													style={{
														marginTop: '6px',
														paddingLeft: '37px',
														fontSize: '18px',
														lineHeight: 1.22,
														color: '#000000',
													}}
												>
													{bodyText}
												</div>
											</div>
										);
									})}
									{selectedPendingReplies.map((reply, index) => {
										if (selectedThreadUsesMessengerLayout) {
											return (
												<div
													key={`pending-reply-${index}`}
													className="flex w-full justify-end"
													style={{ flexShrink: 0 }}
												>
													<div
														className="murmur-selectable"
														style={{
															maxWidth: '62%',
															backgroundColor: INBOX_MESSENGER_OUTBOUND_BACKGROUND,
															border: '2px solid #000000',
															borderRadius: '20px 20px 6px 20px',
															padding: '9px 13px',
															boxSizing: 'border-box',
															fontSize: '14px',
															lineHeight: 1.35,
															color: '#000000',
														}}
														dangerouslySetInnerHTML={{ __html: reply.message }}
													/>
												</div>
											);
										}

										return (
											<div
												key={`pending-reply-${index}`}
												style={{
													backgroundColor: '#FFFFFF',
													borderBottom:
														index === selectedPendingReplies.length - 1
															? 'none'
															: '1.719px solid #000000',
													minHeight: selectedThreadEvenSplitMinHeight,
													padding: '13px 24px 10px 24px',
													boxSizing: 'border-box',
													flexShrink: 0,
												}}
											>
												<div className="flex items-start justify-between gap-4">
													<div className="flex min-w-0 items-center gap-[12px]">
														<div
															className="flex shrink-0 items-center justify-center rounded-full"
															style={{
																width: '25px',
																height: '25px',
																backgroundColor: '#67C76D',
																...campaignInboxDetailNameTextStyle,
																color: '#FFFFFF',
															}}
														>
															{getAvatarInitial(currentUserDisplayName)}
														</div>
														<span
															className="truncate"
															style={campaignInboxDetailNameTextStyle}
														>
															{currentUserDisplayName}
														</span>
													</div>
													<span
														className="shrink-0 text-black"
														style={{ fontSize: '14px', lineHeight: 1 }}
													>
														{formatCampaignInboxTimestamp(reply.timestamp)}
													</span>
												</div>
												<div
													className="murmur-selectable"
													style={{
														marginTop: '8px',
														paddingLeft: '37px',
														fontSize: '18px',
														lineHeight: 1.22,
														color: '#000000',
													}}
													dangerouslySetInnerHTML={{ __html: reply.message }}
												/>
											</div>
										);
									})}
								</CustomScrollbar>
							</div>

							{selectedEmail && !selectedIsApplicationRow && !selectedThreadCanMessage && (
								<div
									style={{
										position: 'absolute',
										top: `${campaignInboxDetailComposerTop}px`,
										left: '50%',
										transform: 'translateX(-50%)',
										width: `${campaignInboxDetailInnerWidth}px`,
										boxSizing: 'border-box',
										zIndex: 2,
										textAlign: 'center',
										fontFamily: 'Inter, sans-serif',
										fontSize: '13px',
										color: '#000000',
										padding: '10px 12px',
										borderRadius: '6.877px',
										border: '1.719px solid #000000',
										backgroundColor: '#D9D9D9',
									}}
								>
									This event was canceled by the venue — messaging is closed.
								</div>
							)}
							{selectedEmail && !selectedIsApplicationRow && selectedThreadCanMessage && (
								<InboxRichReplyEditor
									value={replyMessage}
									onChange={setReplyMessage}
									onSend={handleSendReply}
									isSending={isSending}
									variant={selectedThreadUsesMessengerLayout ? 'pill' : 'floating'}
									containerStyle={{
										position: 'absolute',
										top: `${campaignInboxDetailComposerTop}px`,
										left: '50%',
										transform: 'translateX(-50%)',
										width: `${campaignInboxDetailInnerWidth}px`,
										height: `${campaignInboxDetailComposerHeight}px`,
										boxSizing: 'border-box',
										zIndex: 2,
										// The pill carries its own border/background; the toolbar
										// composer keeps the white rounded box.
										...(selectedThreadUsesMessengerLayout
											? {}
											: {
													borderRadius: '6.877px',
													border: '1.719px solid #000000',
													backgroundColor: '#FFFFFF',
												}),
									}}
								/>
							)}

							{/* Bottom divider only appears in the wider/expanded detail view. */}
							{!shouldUseCampaignInboxCompactDetailDesign && (
								<div
									aria-hidden="true"
									style={{
										position: 'absolute',
										left: 0,
										right: 0,
										bottom: `${campaignInboxDetailBottomStripHeight}px`,
										height: '2px',
										backgroundColor: '#000000',
										zIndex: 4,
									}}
								/>
							)}
						</div>
					) : (
						/* Expanded Email View Inside Box */
						<div
							className="w-full h-full flex flex-col"
							style={{
								width: isMobile ? mobileExpandedEmailWidth : `${expandedEmailWidth}px`,
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: isReplySentThemeActive
									? INBOX_LAST_SENT_FILL_COLOR
									: '#5DA0EB',
								overflow: 'hidden',
							}}
						>
							{/* Top Header Section - 880x79px */}
							<div
								className={`flex items-center ${isMobile ? 'px-2' : 'px-4'}`}
								style={{
									width: '100%',
									height: isMobile ? '65px' : '79px',
									minHeight: isMobile ? '65px' : '79px',
									backgroundColor: '#FFFFFF',
									borderBottom: '3px solid #000000',
									borderBottomLeftRadius: '8px',
									borderBottomRightRadius: '8px',
								}}
							>
								{/* Left side: Name, Company, Subject */}
								<div
									className="flex flex-col justify-center min-w-0"
									style={{ width: isMobile ? '140px' : '200px', flexShrink: 0 }}
								>
									<span
										className={`font-medium truncate ${isMobile ? 'text-[13px]' : ''}`}
									>
										{getCanonicalContactName(selectedEmail, contactByEmail)}
									</span>
									{(() => {
										const companyLabel = getContactCompanyLabel(
											selectedEmail,
											contactByEmail
										);
										if (!companyLabel) return null;
										return (
											<span
												className={`font-inter ${isMobile ? 'text-[12px]' : 'text-[14px]'} text-gray-500 truncate`}
											>
												{companyLabel}
											</span>
										);
									})()}
									<div
										className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate mt-1`}
									>
										{selectedEmail.subject || '(No Subject)'}
									</div>
								</div>
								{/* Right side: Badges + timestamp */}
								<div
									className={`flex-1 flex items-center justify-end gap-2 min-w-0 ${isMobile ? 'gap-1' : ''}`}
								>
									{/* State/City and Title badges - stacked vertically */}
									{(() => {
										const contact = resolveContactForEmail(selectedEmail, contactByEmail);
										const headline = contact?.headline || contact?.title || '';
										const stateAbbr = contact
											? getStateAbbreviation(contact.state || '') || ''
											: '';
										const stateName = contact?.state || '';
										return (
											<div
												className="flex flex-col items-start gap-1 flex-shrink-0 mr-auto"
												style={{ marginLeft: isMobile ? '10%' : '35%' }}
											>
												{stateAbbr && (
													<div className="flex items-center gap-1">
														<span
															className={`inline-flex items-center justify-center rounded-[6px] border ${isMobile ? 'text-[10px]' : 'text-[12px]'} leading-none font-bold`}
															style={{
																width: isMobile ? '24px' : '28px',
																height: isMobile ? '16px' : '20px',
																backgroundColor:
																	stateBadgeColorMap[stateAbbr] || 'transparent',
																borderColor: '#000000',
															}}
														>
															{stateAbbr}
														</span>
														{!isMobile && stateName && (
															<span className="text-[12px] text-black">{stateName}</span>
														)}
													</div>
												)}
												{headline && (
													<div
														className={`${isMobile ? 'h-[16px] max-w-[100px]' : 'h-[21px] max-w-[160px]'} rounded-[6px] px-2 flex items-center border border-black overflow-hidden`}
														style={{ backgroundColor: '#e8efff' }}
													>
														<span
															className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-black leading-none truncate`}
														>
															{headline}
														</span>
													</div>
												)}
												{selectedVenueThreadApplicationId != null &&
													selectedEmail.subject && (
														<InboxEventPill
															name={selectedEmail.subject}
															compact={isMobile}
														/>
													)}
											</div>
										);
									})()}
									{/* Timestamp */}
									<div
										className={`${isMobile ? 'text-xs' : 'text-sm'} text-black whitespace-nowrap flex-shrink-0 ${isMobile ? 'ml-1' : 'ml-4'}`}
									>
										{selectedEmail.receivedAt
											? new Date(selectedEmail.receivedAt)
													.toLocaleTimeString([], {
														hour: 'numeric',
														minute: '2-digit',
														hour12: true,
													})
													.toLowerCase()
											: ''}
									</div>
								</div>
							</div>

							{/* Content Section */}
							<div className="flex-1 w-full flex flex-col min-h-0">
								<CustomScrollbar
									className="flex-1 w-full min-h-0"
									contentClassName={
										selectedThreadUsesMessengerLayout
											? 'flex flex-col gap-[14px] px-[16px] py-[16px]'
											: `flex flex-col ${isMobile ? 'pb-[14px]' : 'pb-[18px]'}`
									}
									thumbWidth={2}
									thumbColor={scrollbarThumbColor}
									trackColor="transparent"
									offsetRight={scrollbarOffsetRight}
									alignTrackToScrollContainer={scrollbarAlignTrackToScrollContainer}
									disableOverflowClass
									lockHorizontalScroll
									style={{
										backgroundColor: selectedThreadUsesMessengerLayout
											? INBOX_MESSENGER_THREAD_BACKGROUND
											: undefined,
									}}
								>
									{/* Email thread: inbound left, outbound right. */}
									{selectedThreadMessages.map((message, index) => {
										const venueAction = message.venueAction;
										if (venueAction?.kind === 'invite-to-connect') {
											return (
												<VenueInviteToConnectBanner
													key={`venue-action-${message.id}-${index}`}
													perspective="artist"
													counterpartName={getCanonicalContactName(message, contactByEmail)}
													className={
														selectedThreadUsesMessengerLayout
															? 'w-full shrink-0'
															: 'm-[12px] w-auto shrink-0'
													}
												/>
											);
										}
										// Venue booking-request rows render as the handshake banner;
										// the confirm chip wires up whenever the confirm flow is
										// eligible (campaign inbox), independent of layout tier.
										const venueBookingRequest = message.venueBookingRequest;
										if (venueBookingRequest != null) {
											const rowKey = `booking-${message.id}-${index}`;
											if (venueBookingRequest.status === 'canceled') {
												return (
													<div
														key={rowKey}
														className="self-center py-[4px] text-center italic"
														style={{
															fontSize: '13px',
															color: 'rgba(0, 0, 0, 0.4)',
															flexShrink: 0,
														}}
													>
														Booking request canceled
													</div>
												);
											}
											const isActiveRequestMessage =
												selectedActiveBookingRequestMessage?.id === message.id;
											return (
												<BookingRequestBanner
													key={rowKey}
													status={venueBookingRequest.status}
													perspective="artist"
													date={venueBookingRequest.date}
													eventName={venueBookingRequest.eventName}
													eventDateLabel={venueBookingRequest.eventWhenLabel}
													bannerRef={
														isActiveRequestMessage ? bookingRequestBannerRef : undefined
													}
													onConfirm={
														isActiveRequestMessage &&
														bookingConfirmEligible &&
														venueBookingRequest.status === 'pending'
															? handleConfirmBookingRequestClick
															: undefined
													}
													className={
														selectedThreadUsesMessengerLayout
															? '-mx-[16px] w-auto shrink-0'
															: 'shrink-0'
													}
												/>
											);
										}
										const isSentMessage = Boolean(message.isSent);
										const shouldUseCompactBubble =
											isUsingSampleData || selectedThreadIsConversation;
										const senderName = isSentMessage
											? currentUserDisplayName
											: getCanonicalContactName(message, contactByEmail);
										const bodyText =
											stripQuotedReply(message.strippedText || message.bodyPlain || '') ||
											getInboxMessageSnippet(message) ||
											'No content';

										if (selectedThreadUsesMessengerLayout) {
											return (
												<div
													key={`${isSentMessage ? 'sent' : 'inbound'}-${message.id}-${index}`}
													className="flex w-full items-end"
													style={{
														justifyContent: isSentMessage ? 'flex-end' : 'flex-start',
														gap: '8px',
														flexShrink: 0,
													}}
												>
													{!isSentMessage && (
														<div
															className="flex shrink-0 items-center justify-center rounded-full"
															style={{
																width: isMobile ? '24px' : '26px',
																height: isMobile ? '24px' : '26px',
																backgroundColor: '#67C76D',
																fontFamily: 'Inter, sans-serif',
																fontSize: isMobile ? '13px' : '14px',
																fontWeight: 700,
																lineHeight: 1,
																color: '#FFFFFF',
															}}
														>
															{getAvatarInitial(senderName)}
														</div>
													)}
													<div
														className="whitespace-pre-wrap"
														style={{
															maxWidth: isMobile ? '78%' : '62%',
															backgroundColor: isSentMessage
																? INBOX_MESSENGER_OUTBOUND_BACKGROUND
																: INBOX_MESSENGER_INBOUND_BACKGROUND,
															border: '2px solid #000000',
															borderRadius: isSentMessage
																? '20px 20px 6px 20px'
																: '20px 20px 20px 6px',
															padding: isMobile ? '8px 12px' : '9px 13px',
															boxSizing: 'border-box',
															fontSize: isMobile ? '13px' : '14px',
															lineHeight: 1.35,
															color: '#000000',
														}}
													>
														{bodyText}
													</div>
												</div>
											);
										}

										return (
											<div
												key={`${isSentMessage ? 'sent' : 'inbound'}-${message.id}-${index}`}
												style={{
													width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
													height: shouldUseCompactBubble
														? 'auto'
														: isMobile
															? '280px'
															: '326px',
													minHeight: shouldUseCompactBubble
														? isMobile
															? '96px'
															: '104px'
														: undefined,
													marginTop: isMobile ? '12px' : '19px',
													marginLeft: isSentMessage ? 'auto' : 0,
													marginRight: isSentMessage ? 0 : 'auto',
													alignSelf: isSentMessage ? 'flex-end' : 'flex-start',
													flexShrink: 0,
													backgroundColor: isSentMessage ? '#FFFFFF' : '#E5F1FF',
													border: '3px solid #000000',
													borderRadius: '8px',
													padding: isMobile ? '12px' : '16px',
													overflowY: shouldUseCompactBubble ? 'visible' : 'auto',
												}}
											>
												<div className="mb-4 flex items-center justify-between gap-3 text-sm text-black">
													<span>{formatEmailDetailTimestamp(message.receivedAt)}</span>
													<span className="text-xs text-gray-500">
														{isSentMessage
															? 'You'
															: getCanonicalContactName(message, contactByEmail)}
													</span>
												</div>

												<div className="text-sm">
													{message.bodyHtml ? (
														<div
															dangerouslySetInnerHTML={{
																__html: stripQuotedReplyHtml(message.bodyHtml),
															}}
															className="murmur-selectable prose prose-sm max-w-none"
														/>
													) : (
														<div className="murmur-selectable whitespace-pre-wrap">
															{stripQuotedReply(
																message.strippedText || message.bodyPlain || ''
															) || 'No content'}
														</div>
													)}
												</div>
											</div>
										);
									})}

									{/* Locally sent replies that have not reloaded from the API yet. */}
									{(selectedConversationReplyKey
										? sentReplies[selectedConversationReplyKey] || []
										: []
									).map((reply, index) => {
										if (selectedThreadUsesMessengerLayout) {
											return (
												<div
													key={index}
													className="flex w-full justify-end"
													style={{ flexShrink: 0 }}
												>
													<div
														className="murmur-selectable"
														style={{
															maxWidth: isMobile ? '78%' : '62%',
															backgroundColor: INBOX_MESSENGER_OUTBOUND_BACKGROUND,
															border: '2px solid #000000',
															borderRadius: '20px 20px 6px 20px',
															padding: isMobile ? '8px 12px' : '9px 13px',
															boxSizing: 'border-box',
															fontSize: isMobile ? '13px' : '14px',
															lineHeight: 1.35,
															color: '#000000',
														}}
														dangerouslySetInnerHTML={{ __html: reply.message }}
													/>
												</div>
											);
										}

										return (
											<div
												key={index}
												style={{
													width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
													height:
														isUsingSampleData || selectedThreadIsConversation
															? 'auto'
															: isMobile
																? '200px'
																: '326px',
													minHeight:
														isUsingSampleData || selectedThreadIsConversation
															? isMobile
																? '96px'
																: '104px'
															: undefined,
													marginTop: isMobile ? '12px' : '19px',
													marginRight: 0,
													alignSelf: 'flex-end',
													flexShrink: 0,
													backgroundColor: '#FFFFFF',
													border: '3px solid #000000',
													borderRadius: '8px',
													padding: isMobile ? '12px' : '16px',
													overflowY: isUsingSampleData ? 'visible' : 'auto',
												}}
											>
												<div className="mb-4 flex items-center justify-between gap-3 text-sm text-black">
													<span>{formatEmailDetailTimestamp(reply.timestamp)}</span>
													<span className="text-xs text-gray-500">You</span>
												</div>
												<div
													className="murmur-selectable text-sm"
													dangerouslySetInnerHTML={{ __html: reply.message }}
												/>
											</div>
										);
									})}
								</CustomScrollbar>

								{/* Reply Box - fixed at bottom */}
								{selectedEmail && !selectedIsApplicationRow && !selectedThreadCanMessage && (
									<div
										className="w-full flex justify-center"
										style={{
											marginTop: isMobile ? '14px' : '18px',
											paddingBottom: isMobile ? '6px' : '10px',
											flexShrink: 0,
										}}
									>
										<div
											className="flex items-center justify-center text-center"
											style={{
												width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
												border: '3px solid #000000',
												borderRadius: '8px',
												backgroundColor: '#D9D9D9',
												fontFamily: 'Inter, sans-serif',
												fontSize: '13px',
												color: '#000000',
												padding: '12px',
												boxSizing: 'border-box',
											}}
										>
											This event was canceled by the venue — messaging is closed.
										</div>
									</div>
								)}
								{selectedEmail && !selectedIsApplicationRow && selectedThreadCanMessage && (
									<div
										className="w-full flex justify-center"
										style={{
											marginTop: isMobile ? '14px' : '18px',
											paddingBottom: isMobile ? '6px' : '10px',
											flexShrink: 0,
										}}
									>
										<InboxRichReplyEditor
											value={replyMessage}
											onChange={setReplyMessage}
											onSend={handleSendReply}
											isSending={isSending}
											isMobile={isMobile}
											variant="stacked"
											containerStyle={{
												width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
												minWidth: isMobile ? undefined : `${emailBodyWidth}px`,
												maxWidth: isMobile ? undefined : `${emailBodyWidth}px`,
												border: '3px solid #000000',
												borderRadius: '8px',
												backgroundColor: '#FFFFFF',
											}}
										/>
									</div>
								)}
							</div>
						</div>
					)
				) : detailOnly ? (
					<div
						className="w-full h-full flex items-center justify-center text-center"
						style={{
							width: isMobile ? mobileExpandedEmailWidth : `${expandedEmailWidth}px`,
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#5DA0EB',
							color: '#000000',
							fontFamily: 'Inter, sans-serif',
							fontSize: isMobile ? '14px' : '16px',
						}}
					>
						Select an email from the list.
					</div>
				) : (
					/* Email List View */
					(() => {
						const renderEmailListRow = ({
							key,
							email,
							selectionEmail,
						}: (typeof visibleEmailRows)[number]) => (
							<div
								key={key}
								className={`bg-white ${emailRowHoverClassName} cursor-pointer px-4 flex items-center mb-2 w-full max-[480px]:px-2`}
								style={{
									width: isMobile ? mobileEmailRowWidth : `${emailRowWidth}px`,
									height: isMobile ? '100px' : '78px',
									minHeight: isMobile ? '100px' : '78px',
									border: '3px solid #000000',
									borderRadius: '8px',
								}}
								onClick={() => {
									setSelectedEmailId(selectionEmail.id);
									setReplyMessage('');
								}}
								onMouseEnter={() => {
									const eventChat = getRowEventChat(email);
									if (eventChat && onEventChatHover) {
										onEventChatHover(eventChat.application);
										return;
									}
									if (onContactHover) {
										const contact = resolveContactForEmail(email, contactByEmail);
										onContactHover(contact as ContactWithName | null);
									}
								}}
								onMouseLeave={() => {
									onEventChatHover?.(null);
									if (onContactHover) {
										onContactHover(null);
									}
								}}
							>
								<div className={`flex ${isMobile ? 'flex-col' : 'gap-3'} w-full h-full`}>
									{/* Top section on mobile: Name + badges + time */}
									<div
										className={`flex ${isMobile ? 'flex-row items-center justify-between w-full' : 'flex-col justify-center min-w-0'}`}
										style={
											isMobile ? { marginTop: '6px' } : { width: '200px', flexShrink: 0 }
										}
									>
										<div
											className={`flex items-center ${isMobile ? 'gap-2 flex-1 min-w-0' : 'gap-2'}`}
										>
											<span
												className={`font-medium truncate ${isMobile ? 'text-[14px]' : ''}`}
											>
												{getCanonicalContactName(email, contactByEmail)}
											</span>
											{/* Badges inline on mobile */}
											{isMobile &&
												(() => {
													const contact = resolveContactForEmail(email, contactByEmail);
													const stateAbbr = contact
														? getStateAbbreviation(contact.state || '') || ''
														: '';
													return stateAbbr ? (
														<span
															className="inline-flex items-center justify-center rounded-[4px] border text-[10px] leading-none font-bold flex-shrink-0"
															style={{
																width: '28px',
																height: '16px',
																backgroundColor:
																	stateBadgeColorMap[stateAbbr] || 'transparent',
																borderColor: '#000000',
															}}
														>
															{stateAbbr}
														</span>
													) : null;
												})()}
										</div>
										{/* Time on mobile - right aligned */}
										{isMobile && (
											<div className="text-[11px] text-black whitespace-nowrap flex-shrink-0">
												{email.receivedAt
													? new Date(email.receivedAt)
															.toLocaleTimeString([], {
																hour: 'numeric',
																minute: '2-digit',
																hour12: true,
															})
															.toLowerCase()
													: ''}
											</div>
										)}
										{/* Company name - only on desktop */}
										{!isMobile &&
											(() => {
												const companyLabel = getContactCompanyLabel(
													email,
													contactByEmail
												);
												if (!companyLabel) return null;
												return (
													<span className="font-inter text-[17px] font-medium text-gray-500 truncate">
														{companyLabel}
													</span>
												);
											})()}
										{/* Subject - desktop only in this position */}
										{!isMobile && (
											<div className="text-sm font-medium truncate mt-3">
												{email.subject || '(No Subject)'}
											</div>
										)}
									</div>
									{/* Company + headline on mobile */}
									{isMobile && (
										<div className="flex items-center gap-2 mt-1">
											{(() => {
												const companyLabel = getContactCompanyLabel(
													email,
													contactByEmail
												);
												const contact = resolveContactForEmail(email, contactByEmail);
												const headline = contact?.headline || contact?.title || '';
												return (
													<>
														{companyLabel && (
															<span className="text-[12px] text-gray-500 truncate max-w-[120px]">
																{companyLabel}
															</span>
														)}
														{email.venueThreadApplicationId != null &&
															email.subject && (
																<InboxEventPill name={email.subject} compact />
															)}
														{(() => {
															const eventChat = getRowEventChat(email);
															if (!eventChat) return null;
															return (
																<>
																	<EventChatStatusPill
																		status={eventChat.state.status}
																		height={16}
																		fontSize={9.5}
																	/>
																	{eventChat.application.event && (
																		<span
																			className="inline-flex items-center rounded-[4px] px-1.5 text-[10px] font-medium leading-none flex-shrink-0"
																			style={{
																				height: '16px',
																				backgroundColor: '#B6E8F1',
																			}}
																		>
																			{formatEventDateLabel(
																				eventChat.application.event,
																				nowMs
																			)}
																		</span>
																	)}
																</>
															);
														})()}
														{headline && (
															<div
																className="h-[16px] max-w-[140px] rounded-[4px] px-1.5 flex items-center gap-0.5 border border-black overflow-hidden flex-shrink-0"
																style={{
																	backgroundColor: isRestaurantTitle(headline)
																		? '#C3FBD1'
																		: isCoffeeShopTitle(headline)
																			? '#D6F1BD'
																			: isMusicVenueTitle(headline)
																				? '#B7E5FF'
																				: isWeddingPlannerTitle(headline) ||
																					  isWeddingVenueTitle(headline)
																					? '#FFF2BC'
																					: isWineBeerSpiritsTitle(headline)
																						? '#BFC4FF'
																						: '#E8EFFF',
																}}
															>
																{isRestaurantTitle(headline) && (
																	<RestaurantsIcon size={10} />
																)}
																{isCoffeeShopTitle(headline) && (
																	<CoffeeShopsIcon size={6} />
																)}
																{isMusicVenueTitle(headline) && (
																	<MusicVenuesIcon size={10} className="flex-shrink-0" />
																)}
																{(isWeddingPlannerTitle(headline) ||
																	isWeddingVenueTitle(headline)) && (
																	<WeddingPlannersIcon size={10} />
																)}
																{isWineBeerSpiritsTitle(headline) && (
																	<WineBeerSpiritsIcon
																		size={10}
																		className="flex-shrink-0"
																	/>
																)}
																<span className="text-[9px] text-black leading-none truncate">
																	{isRestaurantTitle(headline)
																		? 'Restaurant'
																		: isCoffeeShopTitle(headline)
																			? 'Coffee Shop'
																			: isMusicVenueTitle(headline)
																				? 'Music Venue'
																				: isWeddingPlannerTitle(headline)
																					? 'Wedding Planner'
																					: isWeddingVenueTitle(headline)
																						? 'Wedding Venue'
																						: isWineBeerSpiritsTitle(headline)
																							? getWineBeerSpiritsLabel(headline)
																							: headline}
																</span>
															</div>
														)}
													</>
												);
											})()}
										</div>
									)}
									{/* Subject + body preview on mobile */}
									{isMobile && (
										<div className="flex flex-col mt-1 min-w-0">
											<div className="text-[13px] font-semibold truncate">
												{email.subject || '(No Subject)'}
											</div>
											<div className="text-[11px] text-[#666666] line-clamp-1 min-w-0">
												{`${email.isSent ? 'You: ' : ''}${getInboxMessageSnippet(email)}`.slice(
													0,
													80
												)}
											</div>
										</div>
									)}
									{/* Right side - desktop only */}
									{!isMobile && (
										<div className="flex-1 flex items-start gap-2 min-w-0 pt-[10px]">
											{/* Title and State badges */}
											{(() => {
												const contact = resolveContactForEmail(email, contactByEmail);
												const headline = contact?.headline || contact?.title || '';
												const stateAbbr = contact
													? getStateAbbreviation(contact.state || '') || ''
													: '';
												return (
													<>
														{email.venueThreadApplicationId != null &&
															email.subject && <InboxEventPill name={email.subject} />}
														{(() => {
															const eventChat = getRowEventChat(email);
															if (!eventChat) return null;
															return (
																<>
																	<EventChatStatusPill
																		status={eventChat.state.status}
																		height={20}
																		fontSize={11}
																	/>
																	{eventChat.application.event && (
																		<span
																			className="inline-flex items-center rounded-[4px] px-2 text-[12px] font-medium leading-none flex-shrink-0"
																			style={{
																				height: '20px',
																				backgroundColor: '#B6E8F1',
																			}}
																		>
																			{formatEventDateLabel(
																				eventChat.application.event,
																				nowMs
																			)}
																		</span>
																	)}
																</>
															);
														})()}
														{headline && (
															<div
																className="h-[21px] max-w-[160px] rounded-[6px] px-2 flex items-center gap-1 border border-black overflow-hidden flex-shrink-0"
																style={{
																	backgroundColor: isRestaurantTitle(headline)
																		? '#C3FBD1'
																		: isCoffeeShopTitle(headline)
																			? '#D6F1BD'
																			: isMusicVenueTitle(headline)
																				? '#B7E5FF'
																				: isWeddingPlannerTitle(headline) ||
																					  isWeddingVenueTitle(headline)
																					? '#FFF2BC'
																					: isWineBeerSpiritsTitle(headline)
																						? '#BFC4FF'
																						: '#E8EFFF',
																}}
															>
																{isRestaurantTitle(headline) && (
																	<RestaurantsIcon size={14} />
																)}
																{isCoffeeShopTitle(headline) && (
																	<CoffeeShopsIcon size={8} />
																)}
																{isMusicVenueTitle(headline) && (
																	<MusicVenuesIcon size={14} className="flex-shrink-0" />
																)}
																{(isWeddingPlannerTitle(headline) ||
																	isWeddingVenueTitle(headline)) && (
																	<WeddingPlannersIcon size={14} />
																)}
																{isWineBeerSpiritsTitle(headline) && (
																	<WineBeerSpiritsIcon
																		size={14}
																		className="flex-shrink-0"
																	/>
																)}
																<span className="text-[10px] text-black leading-none truncate">
																	{isRestaurantTitle(headline)
																		? 'Restaurant'
																		: isCoffeeShopTitle(headline)
																			? 'Coffee Shop'
																			: isMusicVenueTitle(headline)
																				? 'Music Venue'
																				: isWeddingPlannerTitle(headline)
																					? 'Wedding Planner'
																					: isWeddingVenueTitle(headline)
																						? 'Wedding Venue'
																						: isWineBeerSpiritsTitle(headline)
																							? getWineBeerSpiritsLabel(headline)
																							: headline}
																</span>
															</div>
														)}
														{stateAbbr && (
															<span
																className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold flex-shrink-0"
																style={{
																	width: '39px',
																	height: '20px',
																	backgroundColor:
																		stateBadgeColorMap[stateAbbr] || 'transparent',
																	borderColor: '#000000',
																}}
															>
																{stateAbbr}
															</span>
														)}
													</>
												);
											})()}
											{/* Email body preview */}
											<div className="flex-1 text-sm text-[#000000] line-clamp-2 min-w-0 pt-[7px]">
												{`${email.isSent ? 'You: ' : ''}${getInboxMessageSnippet(email)}`.slice(
													0,
													120
												)}
											</div>
											{/* Date */}
											<div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
												{email.receivedAt
													? new Date(email.receivedAt).toLocaleDateString()
													: ''}
											</div>
										</div>
									)}
								</div>
							</div>
						);
						return (
							<>
								{/* Past band: closed/canceled event chats above the fold. */}
								{pastEmailRows.length > 0 && (
									<div className="flex w-full shrink-0 flex-col items-center opacity-70">
										{pastEmailRows.map(renderEmailListRow)}
									</div>
								)}
								{/* min-h-full pins max-scrollTop to the past band's height so the
								    pinned view renders like a live-only list; shrink-0 is
								    load-bearing (min-h-full replaces flex sizing). */}
								<div
									ref={mainListLiveSectionRef}
									className="flex min-h-full w-full shrink-0 flex-col items-center"
								>
									{liveEmailRows.map(renderEmailListRow)}
									{Array.from({
										length: Math.max(0, (isMobile ? 4 : 6) - visibleEmailRows.length),
									}).map((_, idx) => (
										<div
											key={`inbox-placeholder-${idx}`}
											className="select-none mb-2 w-full"
											style={{
												width: isMobile ? mobileEmailRowWidth : `${emailRowWidth}px`,
												height: isMobile ? '100px' : '78px',
												minHeight: isMobile ? '100px' : '78px',
												border: '3px solid #000000',
												borderRadius: '8px',
												backgroundColor: activeTab === 'inbox' ? '#6fa4e1' : '#5AB477',
											}}
										/>
									))}
								</div>
							</>
						);
					})()
				)}
			</CustomScrollbar>
		</div>
	);
};

export default InboxSection;
