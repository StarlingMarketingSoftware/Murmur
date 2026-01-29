'use client';

import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useMe } from '@/hooks/useMe';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import type { InboundEmailWithRelations } from '@/types';
import type { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { urls } from '@/constants/urls';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { useCampaignTopSearchHighlight } from '@/contexts/CampaignTopSearchHighlightContext';

/**
 * Strip quoted reply content from email body (e.g., "On Thu, Nov 27, 2025 at 2:36 AM ... wrote:")
 */
const stripQuotedReply = (text: string): string => {
	// Match patterns like "On [day], [month] [date], [year] at [time] [name] <email> wrote:"
	// or "On [date], [name] wrote:" and everything after
	const patterns = [
		/\n*On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*?wrote:[\s\S]*/i,
		/\n*On\s+.*?\s+wrote:[\s\S]*/i,
	];

	let result = text;
	for (const pattern of patterns) {
		result = result.replace(pattern, '');
	}
	return result.trim();
};

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
	const pillOpacityTransition = isSwitchingBetweenDots ? instantTransition : animatedTransition;
	
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
				<span className="text-[10px] font-bold text-black leading-none">
					Contacts
				</span>
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
				<span className="text-[10px] font-bold text-black leading-none">
					Write
				</span>
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
				<span className="text-[10px] font-bold text-black leading-none">
					Drafts
				</span>
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
}) => {
	const detectedIsMobile = useIsMobile();
	const isMobile = forceDesktopLayout ? false : Boolean(detectedIsMobile);
	const {
		setDraftsTabHighlighted,
		setWriteTabHighlighted,
		setTopSearchHighlighted,
		setHomeButtonHighlighted,
	} =
		useCampaignTopSearchHighlight();
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

	// Mobile-specific width values (using CSS calc for responsive sizing)
	// 4px margins on each side for edge-to-edge feel
	const mobileBoxWidth = 'calc(100vw - 8px)'; // 4px margins on each side
	const mobileEmailRowWidth = '100%'; // Full width to match search bar + toggle span
	const mobileSearchBarWidth = 'calc(100% - 124px)'; // Leave room for inbox/sent toggle (100px + gap)
	const mobileExpandedEmailWidth = 'calc(100% - 16px)'; // Match email row width
	const mobileEmailBodyWidth = 'calc(100% - 40px)'; // With additional padding

	const outerPaddingClass = isMobile ? 'px-1' : noOuterPadding ? 'px-0' : 'px-4';
	const isUsingSampleData = Boolean(sampleData);

	const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
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
	const inboundEmails = isUsingSampleData ? sampleData?.inboundEmails ?? [] : inboundEmailsFromApi;
	const emails = isUsingSampleData ? undefined : emailsFromApi;
	const sentEmails = emails?.filter((email) => email.status === 'sent') || [];
	const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [sentReplies, setSentReplies] = useState<
		Record<number, Array<{ message: string; timestamp: Date }>>
	>({});
	// Tracks "waiting for their reply" state by sender (used to drive the green reply theme).
	// Keyed by normalized sender email; value is the timestamp (ms) when we last replied.
	const [replyThemeBySender, setReplyThemeBySender] = useState<Record<string, number>>({});

	const { user } = useMe();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		successMessage: 'Reply sent successfully',
		errorMessage: 'Failed to send reply',
	});

	// If a list of allowed sender emails is provided (e.g. campaign contacts),
	// hide any inbound emails whose sender address does not match.
	const normalizedAllowedSenders = allowedSenderEmails
		? new Set(
				allowedSenderEmails
					.filter((email): email is string => Boolean(email))
					.map((email) => email.toLowerCase().trim())
		  )
		: null;

	const filteredBySender =
		normalizedAllowedSenders && inboundEmails
			? inboundEmails.filter((email) => {
					const sender = email.sender?.toLowerCase().trim();
					return !!sender && normalizedAllowedSenders.has(sender);
			  })
			: inboundEmails;

	// Convert sent emails to a format compatible with inbox display
	const normalizedSentEmails: Array<InboundEmailWithRelations & { isSent?: boolean }> =
		isUsingSampleData
			? sampleData?.sentEmails ?? []
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
							contact: email.contact,
							campaign: null,
							originalEmail: null,
							isSent: true,
						} as any)
			  );

	// Choose which emails to display based on active tab
	const emailsToDisplay = activeTab === 'inbox' ? filteredBySender : normalizedSentEmails;
	const isLoading = isUsingSampleData
		? false
		: activeTab === 'inbox'
		? isLoadingInbound
		: isLoadingEmails;
	const error = isUsingSampleData ? null : activeTab === 'inbox' ? inboundError : emailsError;

	// Further filter by search query (sender, subject, body, contact name/company/email)
	const visibleEmails = emailsToDisplay?.filter((email) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		const sender = email.sender?.toLowerCase() || '';
		const senderName = email.senderName?.toLowerCase() || '';
		const subject = email.subject?.toLowerCase() || '';
		const body = (email.strippedText || email.bodyPlain || '').toLowerCase();

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
	});

	const selectedEmail = visibleEmails?.find((email) => email.id === selectedEmailId);
	const selectedSenderKey = selectedEmail?.sender?.toLowerCase().trim();
	const isSelectedEmailSent = Boolean((selectedEmail as any)?.isSent);
	const isReplySentThemeActive =
		Boolean(
			selectedEmail &&
				!isSelectedEmailSent &&
				activeTab === 'inbox' &&
				selectedSenderKey &&
				replyThemeBySender[selectedSenderKey] !== undefined
		);

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

	const handleSendReply = async () => {
		if (!selectedEmail || !replyMessage.trim()) return;

		const senderKey = selectedEmail.sender?.toLowerCase().trim();
		const repliedAtMs = Date.now();
		// Optimistically flip the UI theme to "sent" (green) for this sender.
		if (senderKey) {
			setReplyThemeBySender((prev) => ({ ...prev, [senderKey]: repliedAtMs }));
		}

		// Sample-data/demo mode (e.g. landing page): never actually send.
		// Just append the reply to the UI immediately.
		if (isUsingSampleData) {
			setSentReplies((prev) => {
				const emailId = selectedEmail.id;
				const existingReplies = prev[emailId] || [];
				return {
					...prev,
					[emailId]: [...existingReplies, { message: replyMessage, timestamp: new Date() }],
				};
			});
			setReplyMessage('');
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
				message: replyMessage,
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
				const emailId = selectedEmail.id;
				const existingReplies = prev[emailId] || [];
				return {
					...prev,
					[emailId]: [
						...existingReplies,
						{ message: replyMessage, timestamp: new Date() },
					],
				};
			});

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

	if (isLoading) {
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
						thumbColor="#000000"
						trackColor="transparent"
						offsetRight={-6}
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

	if (error) {
		return (
			<div className={`w-full flex justify-center ${outerPaddingClass}`}>
				<div
					data-campaign-main-box="inbox"
					className="flex items-center justify-center"
					style={{
						width: isMobile ? mobileBoxWidth : `${boxWidth}px`,
						maxWidth: isMobile ? undefined : `${boxWidth}px`,
						height: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
						border: '3px solid #000000',
						borderRadius: '8px',
					}}
				>
					<div className="text-red-500">Failed to load emails</div>
				</div>
			</div>
		);
	}

	// Reset selected email when switching tabs
	const handleTabChange = (tab: 'inbox' | 'sent') => {
		setActiveTab(tab);
		setSelectedEmailId(null);
		setReplyMessage('');
	};

	if (!visibleEmails || visibleEmails.length === 0) {
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

					{/* Top-right toggle (disabled in empty state) */}
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
								}}
							/>
							<div
								className="h-full flex-1"
								style={{
									backgroundColor:
										inboxSubtab === 'messages' ? '#B3E5FF' : '#4DA6D7',
								}}
							/>
							<div
								className="h-full flex-1"
								style={{
									backgroundColor:
										inboxSubtab === 'campaigns' ? '#B3E5FF' : '#4DA6D7',
								}}
							/>
						</div>
					) : (
						<div
							style={{
								position: 'absolute',
								top: isMobile ? '45.5px' : '55.5px', // Centered with search bar
								right: isMobile ? '8px' : '14px', // Right-aligned with emails
								width: isMobile ? '100px' : '148px',
								height: isMobile ? '40px' : '47px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#3277c6',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								padding: isMobile ? '3px' : '4px',
								gap: isMobile ? '2px' : '4px',
								pointerEvents: 'none',
							}}
						>
							{/* Inbox tab */}
							<button
								type="button"
								onClick={() => {}}
								disabled
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: activeTab === 'inbox' ? '#3277c6' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'inbox' ? '2px solid #000000' : 'none',
									cursor: 'not-allowed',
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
										color: 'transparent',
										fontFamily: 'Times New Roman, serif',
									}}
								>
									Inbox
								</span>
							</button>
							{/* Sent tab */}
							<button
								type="button"
								onClick={() => {}}
								disabled
								style={{
									width: isMobile ? '46px' : '70px',
									height: isMobile ? '16px' : '19px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: activeTab === 'sent' ? '#3277c6' : 'transparent',
									borderRadius: '8px',
									border: activeTab === 'sent' ? '2px solid #000000' : 'none',
									cursor: 'not-allowed',
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
										color: 'transparent',
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
								height: idx >= 1 && idx <= 4 ? (isMobile ? '58px' : '52px') : (isMobile ? '90px' : '78px'),
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
			className={`w-full flex justify-center ${outerPaddingClass} ${
				demoMode ? 'pointer-events-none select-none' : ''
			}`}
		>
			<CustomScrollbar
				data-campaign-main-box="inbox"
				className="flex flex-col items-center relative"
				contentClassName="flex flex-col items-center w-full"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-6}
				disableOverflowClass
				style={{
					width: isMobile ? mobileBoxWidth : `${boxWidth}px`,
					maxWidth: isMobile ? undefined : `${boxWidth}px`,
					height: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					minHeight: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					maxHeight: isMobile ? 'calc(100dvh - 160px)' : `${desktopBoxHeight}px`,
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: selectedEmail
						? isMobile
							? '18px 8px 8px 8px'
							: '21px 13px 12px 13px'
						: isMobile
						? '8px'
						: '16px',
					paddingTop: selectedEmail
						? isMobile
							? '18px'
							: '21px'
						: isMobile
						? '62px'
						: `${desktopPaddingTopPx}px`, // Adjusted for mobile
					background: selectedEmail
						? isReplySentThemeActive
							? '#467842'
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
					overflow: isMobile ? 'hidden' : undefined,
				}}
			>
					{/* Back button - shown when email is selected */}
					{selectedEmail && (
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
				{!selectedEmail && !isMobile && !isDashboardMode && (
					<InboxSectionHeaderChrome
						onContactsClick={onGoToContacts}
						onWriteClick={onGoToWriting}
						onDraftsClick={onGoToDrafting}
					/>
				)}
				{/* Search Bar - positioned 55px from top, left-aligned with emails */}
				{!selectedEmail && (
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
									backgroundColor:
										inboxSubtab === 'campaigns' ? '#B3E5FF' : '#4DA6D7',
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
										activeTab === 'inbox'
											? 'rgba(93, 171, 104, 0.63)'
											: 'transparent',
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
										activeTab === 'sent'
											? 'rgba(93, 171, 104, 0.63)'
											: 'transparent',
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
					/* Expanded Email View Inside Box */
					<div
						className="w-full h-full flex flex-col"
						style={{
							width: isMobile ? mobileExpandedEmailWidth : `${expandedEmailWidth}px`,
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: isReplySentThemeActive ? '#5DB169' : '#5DA0EB',
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
								<span className={`font-medium truncate ${isMobile ? 'text-[13px]' : ''}`}>
									{getCanonicalContactName(selectedEmail, contactByEmail)}
								</span>
								{(() => {
									const companyLabel = getContactCompanyLabel(
										selectedEmail,
										contactByEmail
									);
									if (!companyLabel) return null;
									return (
										<span className={`font-inter ${isMobile ? 'text-[12px]' : 'text-[14px]'} text-gray-500 truncate`}>
											{companyLabel}
										</span>
									);
								})()}
								<div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate mt-1`}>
									{selectedEmail.subject || '(No Subject)'}
								</div>
							</div>
							{/* Right side: Badges + timestamp */}
							<div className={`flex-1 flex items-center justify-end gap-2 min-w-0 ${isMobile ? 'gap-1' : ''}`}>
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
													<span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-black leading-none truncate`}>
														{headline}
													</span>
												</div>
											)}
										</div>
									);
								})()}
								{/* Timestamp */}
								<div className={`${isMobile ? 'text-xs' : 'text-sm'} text-black whitespace-nowrap flex-shrink-0 ${isMobile ? 'ml-1' : 'ml-4'}`}>
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
								contentClassName={`flex flex-col ${isMobile ? 'pb-[14px]' : 'pb-[18px]'}`}
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-6}
								disableOverflowClass
								lockHorizontalScroll
							>
								{/* Email Body Box - 828x326px (or 461px when narrow), 19px below header */}
								<div
									style={{
										width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
										height: isUsingSampleData ? 'auto' : isMobile ? '280px' : '326px',
										marginTop: isMobile ? '12px' : '19px',
										marginLeft: activeTab === 'sent' ? 'auto' : 0,
										marginRight: activeTab === 'sent' ? 0 : 'auto',
										alignSelf: activeTab === 'sent' ? 'flex-end' : 'flex-start',
										flexShrink: 0,
										backgroundColor: activeTab === 'sent' ? '#FFFFFF' : '#E5F1FF',
										border: '3px solid #000000',
										borderRadius: '8px',
										padding: isMobile ? '12px' : '16px',
										overflowY: isUsingSampleData ? 'visible' : 'auto',
									}}
								>
									{/* Date/time header */}
									<div className="text-sm text-black mb-4">
										{selectedEmail.receivedAt
											? (() => {
													const date = new Date(selectedEmail.receivedAt);
													const now = new Date();
													const diffTime = Math.abs(now.getTime() - date.getTime());
													const diffDays = Math.floor(
														diffTime / (1000 * 60 * 60 * 24)
													);
													const dayName = date.toLocaleDateString('en-US', {
														weekday: 'long',
													});
													const monthDay = date.toLocaleDateString('en-US', {
														month: 'long',
														day: 'numeric',
													});
													const time = date
														.toLocaleTimeString([], {
															hour: 'numeric',
															minute: '2-digit',
															hour12: true,
														})
														.toLowerCase();
													const ago =
														diffDays === 0
															? 'today'
															: diffDays === 1
															? '1 day ago'
															: `${diffDays} days ago`;
													return `${dayName}, ${monthDay} ${time} (${ago})`;
											  })()
											: ''}
									</div>

									{/* Email body */}
									<div className="text-sm">
										{selectedEmail.bodyHtml ? (
											<div
												dangerouslySetInnerHTML={{
													__html: stripQuotedReplyHtml(selectedEmail.bodyHtml),
												}}
												className="prose prose-sm max-w-none"
											/>
										) : (
											<div className="whitespace-pre-wrap">
												{stripQuotedReply(
													selectedEmail.strippedText || selectedEmail.bodyPlain || ''
												) || 'No content'}
											</div>
										)}
									</div>
								</div>

								{/* Sent Replies - Right aligned */}
								{(sentReplies[selectedEmail.id] || []).map((reply, index) => (
									<div
										key={index}
										style={{
											width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
											height: isUsingSampleData ? 'auto' : isMobile ? '200px' : '326px',
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
										{/* Date/time header */}
										<div className="text-sm text-black mb-4">
											{(() => {
												const date = reply.timestamp;
												const now = new Date();
												const diffTime = Math.abs(now.getTime() - date.getTime());
												const diffDays = Math.floor(
													diffTime / (1000 * 60 * 60 * 24)
												);
												const dayName = date.toLocaleDateString('en-US', {
													weekday: 'long',
												});
												const monthDay = date.toLocaleDateString('en-US', {
													month: 'long',
													day: 'numeric',
												});
												const time = date
													.toLocaleTimeString([], {
														hour: 'numeric',
														minute: '2-digit',
														hour12: true,
													})
													.toLowerCase();
												const ago =
													diffDays === 0
														? 'today'
														: diffDays === 1
														? '1 day ago'
														: `${diffDays} days ago`;
												return `${dayName}, ${monthDay} ${time} (${ago})`;
											})()}
										</div>

										{/* Reply body */}
										<div className="text-sm whitespace-pre-wrap">{reply.message}</div>
									</div>
								))}
							</CustomScrollbar>

							{/* Reply Box - fixed at bottom (inbox only) */}
							{activeTab === 'inbox' && (
								<div
									className="w-full flex justify-center"
									style={{
										marginTop: isMobile ? '14px' : '18px',
										paddingBottom: isMobile ? '6px' : '10px',
										flexShrink: 0,
									}}
								>
									<div
										style={{
											width: isMobile ? mobileEmailBodyWidth : `${emailBodyWidth}px`,
											minWidth: isMobile ? undefined : `${emailBodyWidth}px`,
											maxWidth: isMobile ? undefined : `${emailBodyWidth}px`,
											border: '3px solid #000000',
											borderRadius: '8px',
											backgroundColor: '#FFFFFF',
											overflow: 'hidden',
										}}
									>
										<textarea
											value={replyMessage}
											onChange={(e) => setReplyMessage(e.target.value)}
											placeholder=""
											className="w-full resize-none focus:outline-none"
											style={{
												height: isMobile ? '90px' : '121px',
												padding: isMobile ? '12px' : '16px',
												border: 'none',
												fontSize: isMobile ? '14px' : '16px',
											}}
											disabled={isSending}
										/>
										<Button
											onClick={handleSendReply}
											disabled={!replyMessage.trim() || isSending}
											className={`w-full rounded-none bg-[#E1EDF5] text-black disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'text-sm' : ''}`}
											style={{
												height: isMobile ? '32px' : '36px',
												borderTop: '3px solid #000000',
												borderRadius: 0,
												fontWeight: 500,
											}}
										>
											{isSending ? 'Sending...' : 'Reply'}
										</Button>
									</div>
								</div>
							)}
						</div>
				</div>
				) : (
					/* Email List View */
					<>
						{visibleEmails.map((email) => (
							<div
								key={email.id}
								className="bg-white hover:bg-gray-50 cursor-pointer px-4 flex items-center mb-2 w-full max-[480px]:px-2"
								style={{
									width: isMobile ? mobileEmailRowWidth : `${emailRowWidth}px`,
									height: isMobile ? '100px' : '78px',
									minHeight: isMobile ? '100px' : '78px',
									border: '3px solid #000000',
									borderRadius: '8px',
									backgroundColor: '#FFFFFF',
								}}
								onClick={() => {
									setSelectedEmailId(email.id);
									setReplyMessage('');
								}}
								onMouseEnter={() => {
									if (onContactHover) {
										const contact = resolveContactForEmail(email, contactByEmail);
										onContactHover(contact as ContactWithName | null);
									}
								}}
								onMouseLeave={() => {
									if (onContactHover) {
										onContactHover(null);
									}
								}}
							>
								<div className={`flex ${isMobile ? 'flex-col' : 'gap-3'} w-full h-full`}>
									{/* Top section on mobile: Name + badges + time */}
									<div
										className={`flex ${isMobile ? 'flex-row items-center justify-between w-full' : 'flex-col justify-center min-w-0'}`}
										style={isMobile ? { marginTop: '6px' } : { width: '200px', flexShrink: 0 }}
									>
										<div className={`flex items-center ${isMobile ? 'gap-2 flex-1 min-w-0' : 'gap-2'}`}>
											<span className={`font-medium truncate ${isMobile ? 'text-[14px]' : ''}`}>
												{getCanonicalContactName(email, contactByEmail)}
											</span>
											{/* Badges inline on mobile */}
											{isMobile && (() => {
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
										{!isMobile && (() => {
											const companyLabel = getContactCompanyLabel(email, contactByEmail);
											if (!companyLabel) return null;
											return (
												<span className="font-inter text-[17px] font-medium text-gray-500 truncate">
													{companyLabel}
												</span>
											);
										})()}
										{/* Subject - desktop only in this position */}
										{!isMobile && (
											<div className="text-sm font-medium truncate mt-1">
												{email.subject || '(No Subject)'}
											</div>
										)}
									</div>
									{/* Company + headline on mobile */}
									{isMobile && (
										<div className="flex items-center gap-2 mt-1">
											{(() => {
												const companyLabel = getContactCompanyLabel(email, contactByEmail);
												const contact = resolveContactForEmail(email, contactByEmail);
												const headline = contact?.headline || contact?.title || '';
												return (
													<>
														{companyLabel && (
															<span className="text-[12px] text-gray-500 truncate max-w-[120px]">
																{companyLabel}
															</span>
														)}
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
																				: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
																	<WeddingPlannersIcon size={10} />
																)}
																{isWineBeerSpiritsTitle(headline) && (
																	<WineBeerSpiritsIcon size={10} className="flex-shrink-0" />
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
												{email.strippedText?.slice(0, 80) ||
													email.bodyPlain?.slice(0, 80) ||
													''}
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
																				: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
																	<WeddingPlannersIcon size={14} />
																)}
																{isWineBeerSpiritsTitle(headline) && (
																	<WineBeerSpiritsIcon size={14} className="flex-shrink-0" />
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
												{email.strippedText?.slice(0, 120) ||
													email.bodyPlain?.slice(0, 120) ||
													''}
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
						))}
						{Array.from({
							length: Math.max(0, (isMobile ? 4 : 6) - (visibleEmails?.length ?? 0)),
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
					</>
				)}
			</CustomScrollbar>
		</div>
	);
};

export default InboxSection;
