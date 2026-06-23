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
import { CalendarPlusIcon } from '@/components/atoms/_svg/CalendarPlusIcon';
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
	getConversationThreadApplicationId,
	getInboxMessageTimeMs,
	getInboxMessageSnippet,
	inboxConversationContainsEmailId,
	inboxConversationContainsInboundEmailId,
	inboxConversationContainsSentEmailId,
	normalizeApplicationForInboxConversation,
	normalizeSentEmailForInboxConversation,
	type InboxConversation,
	type InboxConversationMessage,
} from '@/utils/inboxConversations';
import {
	useGetMyEventApplications,
	type MyEventApplication,
} from '@/hooks/queryHooks/useEventApplications';
import { deriveEventChatStatus, formatEventChatTimestamp } from '@/utils/eventChatStatus';
import { resolveDraftRowClick } from './draftRowSelection';
import {
	EventChatCard,
	EVENT_CHAT_COMPACT_ROW_HEIGHT_PX,
	EVENT_CHAT_ROW_HEIGHT_PX,
} from '@/components/molecules/EventChatCard/EventChatCard';

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
const ALL_TAB_EMPTY_PLACEHOLDER_CONTACTS = [
	{
		name: 'Maya Torres',
		company: 'The Lantern Room',
		chipLabel: 'Music Venue',
		chipColor: '#B7E5FF',
		category: 'music-venues',
		stateAbbr: 'NY',
		city: 'Brooklyn',
	},
	{
		name: 'Caleb Price',
		company: 'Northline Hall',
		chipLabel: 'Music Venue',
		chipColor: '#B7E5FF',
		category: 'music-venues',
		stateAbbr: 'IL',
		city: 'Chicago',
	},
	{
		name: 'June Avery',
		company: 'Harbor Lights Fest',
		chipLabel: 'Music Festival',
		chipColor: '#C1D6FF',
		category: 'music-festivals',
		stateAbbr: 'CA',
		city: 'Oakland',
	},
	{
		name: 'Nico Bennett',
		company: 'Second Set Lounge',
		chipLabel: 'Music Venue',
		chipColor: '#B7E5FF',
		category: 'music-venues',
		stateAbbr: 'TN',
		city: 'Nashville',
	},
	{
		name: 'Priya Shah',
		company: 'Cedar Table',
		chipLabel: 'Restaurant',
		chipColor: '#C3FBD1',
		category: 'restaurants',
		stateAbbr: 'TX',
		city: 'Austin',
	},
	{
		name: 'Theo Martin',
		company: 'Signal Coffee',
		chipLabel: 'Coffee Shop',
		chipColor: '#D6F1BD',
		category: 'coffee-shops',
		stateAbbr: 'WA',
		city: 'Seattle',
	},
	{
		name: 'Elena Ruiz',
		company: 'Golden Hour Events',
		chipLabel: 'Wedding Planner',
		chipColor: '#FFF2BC',
		category: 'wedding-planners',
		stateAbbr: 'CO',
		city: 'Denver',
	},
	{
		name: 'Sofia Chen',
		company: 'Willow Glass House',
		chipLabel: 'Wedding Venue',
		chipColor: '#FFF2BC',
		category: 'wedding-venues',
		stateAbbr: 'GA',
		city: 'Atlanta',
	},
	{
		name: 'Marcus Lee',
		company: 'Vine & Barrel',
		chipLabel: 'Wine/Beer/Spirits',
		chipColor: '#BFC4FF',
		category: 'wine-beer-spirits',
		stateAbbr: 'OR',
		city: 'Portland',
	},
] as const;
// Grace delay before a hover-peek clears, so moving between rows through the gap
// doesn't flicker the reveal off (mirrors the research card's clear delay).
const PEEK_CLEAR_DELAY_MS = 220;
const WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR = '#F5C0BD';
const WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR = '#EE9798';
const WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR = '#EB8586';
const SHOWING_DRAFT_ROW_FILL_COLOR = '#F8C262';
const SHOWING_DRAFT_TOP_BAR_COLOR = '#FFE3AA';
const SELECTED_DRAFT_ROW_FILL_COLOR = '#FDDEA5';
const SELECTED_DRAFT_TOP_BAR_COLOR = '#F9D387';
const INBOX_LAST_SENT_FILL_COLOR = '#7ED29E';
// Write/Drafts-tab supplemental-row reveal (hover/peek) palette. These replace the
// older "showing draft" gold + gray-strip look used inside the redded contacts box.
// Email/message rows reveal as a blue card with a full-width white top strip; draft
// rows reveal as a gold card with a cream rounded corner box on the top-left.
const WRITE_TAB_EMAIL_PEEK_FILL_COLOR = '#AECCFD';
const WRITE_TAB_DRAFT_PEEK_FILL_COLOR = '#FFDA8D';
const WRITE_TAB_DRAFT_PEEK_CORNER_COLOR = '#FFFBF3';
const WRITE_TAB_SUPPLEMENTAL_PEEK_BORDER_COLOR = '#FFFFFF';
const WRITE_TAB_SUPPLEMENTAL_PEEK_TOP_STRIP_COLOR = '#FFFFFF';

const formatBatchCount = (count: number) => `+${count < 10 ? `0${count}` : count}`;

const isInboxOpportunityEmail = (email: InboundEmailWithRelations) => {
	// Venue↔artist internal DMs are ongoing conversations, not keyword-triaged
	// cold-email replies — never classify them as Opportunities. They must always
	// stay in Responses; otherwise a venue reply like "following up here" routes the
	// whole thread into the Opportunities sub-tab and it vanishes from the Responses
	// list the inbox defaults to. Projected venue rows carry venueConversationId;
	// real inbound email replies don't.
	if (email.venueConversationId != null) return false;

	const text =
		`${email.subject || ''} ${email.strippedText || ''} ${email.bodyPlain || ''} ${
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

export const getContactFullName = (contact?: ContactWithName | null) =>
	contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();

export const getContactDisplayName = (
	contact?: ContactWithName | null,
	fallback = 'Contact'
) => getContactFullName(contact) || contact?.company || contact?.email || fallback;

const hasSeparateContactName = (contact?: ContactWithName | null) =>
	Boolean(
		(contact?.name && contact.name.trim()) ||
		(contact?.firstName && contact.firstName.trim()) ||
		(contact?.lastName && contact.lastName.trim())
	);

export const getContactCompanyLabel = (contact?: ContactWithName | null) =>
	hasSeparateContactName(contact) ? contact?.company || '' : '';

export const getContactTitle = (contact?: ContactWithName | null) =>
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

export const TitleBadge: FC<{
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

// Labels a per-application (event) thread row with its opportunity name —
// calendar icon + amber fill so the row reads as an event, not a venue email.
export const EventThreadBadge: FC<{
	name: string;
	className?: string;
	textClassName?: string;
	strokeColor?: string;
	textColor?: string;
	showStroke?: boolean;
}> = ({ name, className, textClassName, strokeColor, textColor, showStroke = true }) => (
	<div
		className={cn('border overflow-hidden flex items-center gap-0.5', className)}
		style={{
			backgroundColor: '#FFE2C8',
			borderColor: showStroke ? (strokeColor ?? '#000000') : 'transparent',
			borderWidth: showStroke ? undefined : 0,
			color: textColor ?? '#000000',
		}}
	>
		<CalendarPlusIcon className="h-[12px] w-[12px] shrink-0" />
		<ScrollableText text={name} className={cn('leading-none', textClassName)} />
	</div>
);

export const StateLocationRow: FC<{
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

// Presentational inner content of a plain contact card (the grid cells). The
// caller owns the outer `grid grid-cols-2 grid-rows-2` wrapper (border, bg,
// click/hover, refs). This is a verbatim mirror of the inline contact-card
// markup in the left expanded list below (kept inline there to avoid churning
// the most-visible tab); the All-tab right-rail Search Results renders THIS so
// the two stay pixel-identical. Keep both in sync if the layout changes.
export const ContactCardInner: FC<{ contact: ContactWithName }> = ({ contact }) => {
	const fullName =
		contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const contactTitle = contact.title || contact.headline || '';
	const leftPadding = 'pl-3';
	return fullName ? (
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
						{isRestaurantTitle(contactTitle) && <RestaurantsIcon size={12} />}
						{isCoffeeShopTitle(contactTitle) && <CoffeeShopsIcon size={7} />}
						{isMusicVenueTitle(contactTitle) && (
							<MusicVenuesIcon size={12} className="flex-shrink-0" />
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
							const stateAbbr = getStateAbbreviation(fullStateName) || '';
							const normalizedState = fullStateName.trim();
							const lowercaseCanadianProvinceNames = canadianProvinceNames.map(
								(s) => s.toLowerCase()
							);
							const isCanadianProvince =
								lowercaseCanadianProvinceNames.includes(
									normalizedState.toLowerCase()
								) ||
								canadianProvinceAbbreviations.includes(
									normalizedState.toUpperCase()
								) ||
								canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
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
											stateBadgeColorMap[stateAbbr] || 'transparent',
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
							{isRestaurantTitle(contactTitle) && <RestaurantsIcon size={12} />}
							{isCoffeeShopTitle(contactTitle) && <CoffeeShopsIcon size={7} />}
							{isMusicVenueTitle(contactTitle) && (
								<MusicVenuesIcon size={12} className="flex-shrink-0" />
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
							/>
						</div>
					</div>

					{/* Bottom Right - Location */}
					<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
						{contact.city || contact.state ? (
							<div className="flex items-center gap-1 w-full">
								{(() => {
									const fullStateName = (contact.state as string) || '';
									const stateAbbr = getStateAbbreviation(fullStateName) || '';
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
													stateBadgeColorMap[stateAbbr] || 'transparent',
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
								const fullStateName = (contact.state as string) || '';
								const stateAbbr = getStateAbbreviation(fullStateName) || '';
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
												stateBadgeColorMap[stateAbbr] || 'transparent',
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
	);
};

// Presentational inner content of a supplemental draft row (top bar + stacked
// company/name, category badge, state row, bold subject + body preview). The
// caller owns the 108px-tall outer wrapper (border, bg, click/hover). Defaults
// reproduce the non-redout, non-showing look used by the right-rail.
export const DraftCardInner: FC<{
	contact?: ContactWithName | null;
	companyLabel: string;
	contactName: string;
	contactTitle: string;
	subject: string;
	bodyPreview: string;
	textClassName?: string;
	borderColor?: string;
	badgeFillColor?: string;
	textColor?: string;
	topBarLeftColor?: string;
	topBarRightColor?: string;
	topBarLeftWidthPx?: number;
	// When true the top-left strip renders as a rounded "corner box" (radius on the
	// top-left only) outlined by topBarLeftCornerBorderColor — the Write/Drafts-tab
	// gold-reveal look. When false it's a flat color block (the legacy look).
	topBarLeftAsCornerBox?: boolean;
	topBarLeftCornerBorderColor?: string;
	showStroke?: boolean;
	showShowingBadge?: boolean;
}> = ({
	contact,
	companyLabel,
	contactName,
	contactTitle,
	subject,
	bodyPreview,
	textClassName = 'text-black',
	borderColor = '#000000',
	badgeFillColor,
	textColor,
	topBarLeftColor = SHOWING_DRAFT_TOP_BAR_COLOR,
	topBarRightColor = '#F9FAFB',
	topBarLeftWidthPx = 115,
	topBarLeftAsCornerBox = false,
	topBarLeftCornerBorderColor = '#FFFFFF',
	showStroke = true,
	showShowingBadge = false,
}) => (
	<>
		<div className="absolute left-0 top-0 h-[13px] w-full pointer-events-none flex">
			<div
				className="h-full shrink-0"
				style={{
					width: `${topBarLeftWidthPx}px`,
					backgroundColor: topBarLeftColor,
					...(topBarLeftAsCornerBox
						? {
								borderRadius: '7.798px 0 0 0',
								borderTop: `2px solid ${topBarLeftCornerBorderColor}`,
								borderLeft: `2px solid ${topBarLeftCornerBorderColor}`,
								borderRight: `2px solid ${topBarLeftCornerBorderColor}`,
								boxSizing: 'border-box',
							}
						: {}),
				}}
			/>
			<div className="h-full flex-1" style={{ backgroundColor: topBarRightColor }} />
		</div>

		<div className="absolute left-3 top-[17px] right-1/2 pr-1 pointer-events-none">
			<FadeOverflowText
				text={companyLabel}
				className={cn(
					'font-inter text-[14.661px] font-medium leading-[19.547px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
			<FadeOverflowText
				text={contactName}
				className={cn(
					'font-inter text-[14.661px] font-normal leading-[19.547px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
		</div>

		<div className="absolute top-[16px] left-1/2 right-2 pl-1 pointer-events-none">
			{showShowingBadge ? (
				<div
					className="w-full h-[17px] rounded-[6px] pl-2 pr-2 border overflow-hidden flex items-center justify-start gap-2"
					style={{
						backgroundColor: SHOWING_DRAFT_TOP_BAR_COLOR,
						borderColor: borderColor,
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
					textClassName={cn('text-[10px] leading-none', textClassName)}
					fillColor={badgeFillColor}
					strokeColor={borderColor}
					textColor={textColor}
					showStroke={showStroke}
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
				cityClassName={cn('text-[10px] leading-none', textClassName)}
				badgeFillColor={badgeFillColor}
				strokeColor={borderColor}
				textColor={textColor}
				showBadgeStroke={showStroke}
			/>
		</div>

		<div className="absolute left-3 right-[12px] top-[57px] pointer-events-none">
			<FadeOverflowText
				text={subject}
				className={cn(
					'font-inter text-[13.215px] font-semibold leading-[21.144px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
			<FadeOverflowText
				text={bodyPreview}
				className={cn(
					'font-inter text-[13.215px] font-normal leading-[21.144px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
		</div>
	</>
);

// Presentational inner content of a supplemental inbox row (stacked
// company/name, event-or-category badge, state row, subject + preview). Mirrors
// the draft row without the top strip. Caller owns the 92px-tall outer wrapper.
export const InboxCardInner: FC<{
	contact?: ContactWithName | null;
	companyLabel: string;
	contactName: string;
	contactTitle: string;
	threadEventName?: string;
	subject: string;
	bodyPreview: string;
	textClassName?: string;
	borderColor?: string;
	badgeFillColor?: string;
	textColor?: string;
	showStroke?: boolean;
}> = ({
	contact,
	companyLabel,
	contactName,
	contactTitle,
	threadEventName = '',
	subject,
	bodyPreview,
	textClassName = 'text-black',
	borderColor = '#000000',
	badgeFillColor,
	textColor,
	showStroke = true,
}) => (
	<>
		{/* Layout mirrors supplemental draft rows, but without the top strip. */}
		<div className="absolute left-3 top-[10px] right-1/2 pr-1 pointer-events-none">
			<FadeOverflowText
				text={companyLabel}
				className={cn(
					'font-inter text-[14.661px] font-medium leading-[19.547px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
			<FadeOverflowText
				text={contactName}
				className={cn(
					'font-inter text-[14.661px] font-normal leading-[19.547px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
		</div>

		<div className="absolute top-[9px] left-1/2 right-2 pl-1 pointer-events-none">
			{threadEventName ? (
				<EventThreadBadge
					name={threadEventName}
					className="w-full h-[17px] rounded-[6px] px-2 gap-1"
					textClassName={cn('text-[10px] leading-none', textClassName)}
					strokeColor={borderColor}
					textColor={textColor}
					showStroke={showStroke}
				/>
			) : contactTitle ? (
				<TitleBadge
					title={contactTitle}
					className="w-full h-[17px] rounded-[6px] px-2 gap-1"
					textClassName={cn('text-[10px] leading-none', textClassName)}
					fillColor={badgeFillColor}
					strokeColor={borderColor}
					textColor={textColor}
					showStroke={showStroke}
					restaurantIconSize={12}
					coffeeIconSize={7}
					defaultIconSize={12}
				/>
			) : null}
		</div>

		<div
			className={cn(
				'absolute left-1/2 right-2 pl-1 pointer-events-none',
				threadEventName || contactTitle ? 'top-[30px]' : 'top-[9px]'
			)}
		>
			<StateLocationRow
				contact={contact}
				className="h-[16px] w-full gap-1"
				badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
				badgeTextClassName="font-inter text-[10px] leading-none font-bold"
				cityClassName={cn('text-[10px] leading-none', textClassName)}
				badgeFillColor={badgeFillColor}
				strokeColor={borderColor}
				textColor={textColor}
				showBadgeStroke={showStroke}
			/>
		</div>

		<div className="absolute left-3 right-[12px] top-[48px] pointer-events-none">
			<FadeOverflowText
				text={subject}
				className={cn(
					'font-inter text-[13.215px] font-semibold leading-[17px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
			<FadeOverflowText
				text={bodyPreview}
				className={cn(
					'font-inter text-[13.215px] font-normal leading-[17px]',
					textClassName
				)}
				splitNumericSuffix={false}
			/>
		</div>
	</>
);

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

const getInboxConversationSelectionEmail = (conversation: InboxConversation) =>
	conversation.latestInboundMessage ?? conversation.latestMessage;

const inboxConversationMatchesSearchQuery = (
	conversation: InboxConversation,
	query: string,
	contactByEmail: Record<string, ContactWithName> | undefined,
	contactsById: Map<number, ContactWithName>,
	applicationById: Map<number, MyEventApplication>,
	campaignName?: string | null
) => {
	const values: string[] = [conversation.key, campaignName || ''];
	const threadApplicationId = getConversationThreadApplicationId(conversation);
	const eventApplication =
		threadApplicationId != null ? applicationById.get(threadApplicationId) : undefined;
	if (eventApplication) {
		values.push(
			eventApplication.event?.name || '',
			eventApplication.event?.venueName || '',
			eventApplication.event?.venueCity || '',
			eventApplication.event?.venueState || '',
			eventApplication.status || ''
		);
	}

	for (const message of conversation.messages) {
		const contact = resolveInboundContact(message, contactByEmail, contactsById);
		values.push(
			message.subject || '',
			getInboxMessageSnippet(message),
			message.senderName || '',
			message.sender || '',
			message.recipient || '',
			getContactDisplayName(contact, ''),
			getContactCompanyLabel(contact),
			getContactTitle(contact),
			contact?.email || '',
			contact?.city || '',
			contact?.state || ''
		);
	}

	return values.some((value) => value.toLowerCase().includes(query));
};

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
	/**
	 * Row-geometry hover for the left-docked abridged research card.
	 * Fires (contact|null, rowEl) on row mouseenter and (null, null) on row mouseleave.
	 */
	onContactRowHover?: (
		contact: ContactWithName | null,
		rowElement: HTMLElement | null
	) => void;
	/**
	 * Row-geometry hover for event-chat rows — replaces onContactRowHover for
	 * rows tied to an event application so the docked card shows the
	 * opportunity panel instead of contact research.
	 */
	onEventChatRowHover?: (
		application: MyEventApplication | null,
		rowElement: HTMLElement | null
	) => void;
	onEventChatRowClick?: (application: MyEventApplication) => void;
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
	/** Optional set of contact IDs that already have drafts. */
	contactsWithDraftIds?: Set<number>;
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
	/**
	 * One-shot request to land the inbox panel on a specific Responses/Sent/Opportunities
	 * filter (e.g. the overview star pill). Consumed by requestId, otherwise the
	 * filter resets to 'responses' whenever inbox focus mode engages.
	 */
	inboxPanelTabRequest?: {
		tab: 'responses' | 'sent' | 'opportunities';
		requestId: number;
	} | null;

	onFocusContact?: (contactId: number) => void;
	/**
	 * One-shot request to scroll a contact row into view and highlight it. Consumed
	 * by requestId (idempotent across re-renders / StrictMode).
	 */
	focusContactRequest?: { contactId: number; requestId: number } | null;
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
	onContactRowHover,
	onEventChatRowHover,
	onEventChatRowClick,
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
	onSearchFromMiniBar,
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
	inboxPanelTabRequest,
	onFocusContact,
	focusContactRequest,
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
	// Hover-peek: which redded-out supplemental row (if any) is being hovered, so it
	// reveals in its non-redded "active" style with content visible. Keyed as
	// `<kind>:<id>`. The clear is delayed (and canceled on the next row's enter) so
	// moving between rows through the gap doesn't flicker the reveal off — same grace
	// behavior as the docked research card.
	const [peekRowKey, setPeekRowKey] = useState<string | null>(null);
	const peekClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelPeekClear = useCallback(() => {
		if (peekClearTimeoutRef.current) {
			clearTimeout(peekClearTimeoutRef.current);
			peekClearTimeoutRef.current = null;
		}
	}, []);
	const schedulePeekClear = useCallback(() => {
		cancelPeekClear();
		peekClearTimeoutRef.current = setTimeout(() => {
			peekClearTimeoutRef.current = null;
			setPeekRowKey(null);
		}, PEEK_CLEAR_DELAY_MS);
	}, [cancelPeekClear]);

	const [hoveredUsedContactId, setHoveredUsedContactId] = useState<number | null>(null);
	const [inboxPanelTab, setInboxPanelTab] = useState<DashboardResponsesTab>('responses');
	const [isInboxSearchOpen, setIsInboxSearchOpen] = useState(false);
	const [inboxSearchQuery, setInboxSearchQuery] = useState('');
	const inboxSearchContainerRef = useRef<HTMLDivElement | null>(null);
	const inboxSearchInputRef = useRef<HTMLInputElement | null>(null);
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

	const lastHandledInboxPanelTabRequestIdRef = useRef<number | null>(null);
	const wasInboxFocusModeRef = useRef(false);
	useEffect(() => {
		const enteredInboxFocusMode = isInboxFocusMode && !wasInboxFocusModeRef.current;
		wasInboxFocusModeRef.current = isInboxFocusMode;
		if (!isInboxFocusMode) return;
		// An unhandled request (star pill → Opportunities) seeds the filter instead of
		// the entry reset; the requestId guard makes it one-shot. The reset only fires
		// on *entering* inbox mode — a consumed request must not bounce the filter back
		// on later re-runs (StrictMode double-invoke included).
		if (
			inboxPanelTabRequest &&
			lastHandledInboxPanelTabRequestIdRef.current !== inboxPanelTabRequest.requestId
		) {
			lastHandledInboxPanelTabRequestIdRef.current = inboxPanelTabRequest.requestId;
			setInboxPanelTab(inboxPanelTabRequest.tab);
			return;
		}
		if (enteredInboxFocusMode) setInboxPanelTab('responses');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isInboxFocusMode, inboxPanelTabRequest?.requestId]);
	useEffect(() => {
		if (!isInboxFocusMode) {
			setIsInboxSearchOpen(false);
			setInboxSearchQuery('');
		}
	}, [isInboxFocusMode]);
	useEffect(() => {
		if (!isInboxSearchOpen) return;
		inboxSearchInputRef.current?.focus();
	}, [isInboxSearchOpen]);
	useEffect(() => {
		if (!isInboxSearchOpen) return;
		const handleDocumentClick = (event: globalThis.MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (inboxSearchContainerRef.current?.contains(target)) return;
			setIsInboxSearchOpen(false);
			setInboxSearchQuery('');
		};
		document.addEventListener('click', handleDocumentClick);
		return () => document.removeEventListener('click', handleDocumentClick);
	}, [isInboxSearchOpen]);

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
	// Compact (narrow-desktop) header is the full 28px header scaled by 0.875.
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 24.5 : 28);
	const isBottomView = customWhiteSectionHeight === 15 || customWhiteSectionHeight === 16;
	const shouldRenderCollapsedTopBox = collapsed && isBottomView;
	// Compressed bottom panel spec: 45px total = 13px label strip + 26px inner bar.
	const collapsedOuterWidthPx = 197;
	const collapsedOuterHeightPx = 45;
	const collapsedLabelHeightPx = 13;
	// Allow callers to override dimensions; default to the original sidebar size.
	const resolvedWidth = shouldRenderCollapsedTopBox
		? collapsedOuterWidthPx
		: (width ?? 376);
	const resolvedHeight = shouldRenderCollapsedTopBox
		? collapsedOuterHeightPx
		: (height ?? 424);
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
	const effectiveWhiteSectionHeight = shouldRenderCollapsedTopBox
		? collapsedLabelHeightPx
		: whiteSectionHeight;
	const collapsedTopColor = '#FFB9B9';
	const panelFillColor = isInboxFocusMode
		? RESPONSE_WIDGET_BACKGROUND_BY_TAB[inboxPanelTab]
		: '#EB8586';
	const headerStripColor = isInboxFocusMode
		? panelFillColor
		: shouldRenderCollapsedTopBox
			? collapsedTopColor
			: effectiveWhiteSectionHeight === 28 || isAllTab
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
	// draftSupplemental* colors are computed per-row inside renderSupplementalDraftRow
	// so a hovered (peeked) row reveals in its non-redded "showing" style.
	const inboxSupplementalBorderColor = shouldRedOutInboxRows
		? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
		: '#000000';
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
	const shouldSelectContactsAndDrafts =
		!isDraftsFocusMode &&
		!isInboxFocusMode &&
		resolvedActiveTopNavStop === 'all' &&
		Boolean(onDraftSelectionChange);
	const selectedVisibleDraftCount = useMemo(() => {
		if (!selectedDraftIds) return 0;
		let count = 0;
		for (const id of selectedDraftIds) {
			if (selectableDraftIds.has(id)) count += 1;
		}
		return count;
	}, [selectableDraftIds, selectedDraftIds]);
	const combinedSelectionCount = selectedCount + selectedVisibleDraftCount;
	const areAllContactsAndDraftsSelected = Boolean(
		selectableContactIds.size + selectableDraftIds.size > 0 &&
		selectedCount === selectableContactIds.size &&
		Array.from(selectableContactIds).every((id) => currentSelectedIds.has(id)) &&
		selectedVisibleDraftCount === selectableDraftIds.size &&
		(selectedDraftIds
			? Array.from(selectableDraftIds).every((id) => selectedDraftIds.has(id))
			: selectableDraftIds.size === 0)
	);
	const displayedSelectionCount = shouldSelectContactsAndDrafts
		? combinedSelectionCount
		: selectedCount;
	const areAllDisplayedRowsSelected = shouldSelectContactsAndDrafts
		? areAllContactsAndDraftsSelected
		: areAllSelected;
	const handleDisplayedSelectAllToggle = useCallback(() => {
		if (!shouldSelectContactsAndDrafts) {
			handleSelectAllToggle();
			return;
		}

		if (areAllContactsAndDraftsSelected) {
			updateSelection(() => new Set<number>());
			onDraftSelectionChange?.(() => new Set<number>());
			return;
		}

		updateSelection(() => new Set(selectableContactIds));
		onDraftSelectionChange?.(() => new Set(selectableDraftIds));
	}, [
		areAllContactsAndDraftsSelected,
		handleSelectAllToggle,
		onDraftSelectionChange,
		selectableContactIds,
		selectableDraftIds,
		shouldSelectContactsAndDrafts,
		updateSelection,
	]);
	const handleDraftSelectionClick = useCallback(
		(draft: EmailWithRelations, e: MouseEvent) => {
			if (!onDraftSelectionChange) return;

			if (e.shiftKey && lastClickedDraftRef.current !== null) {
				e.preventDefault();
				window.getSelection()?.removeAllRanges();

				const currentIndex = supplementalDraftRows.findIndex(
					(row) => row.id === draft.id
				);
				const anchorIndex = supplementalDraftRows.findIndex(
					(row) => row.id === lastClickedDraftRef.current
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

			onDraftSelectionChange((prev) => {
				const next = new Set(prev);
				if (next.has(draft.id)) {
					next.delete(draft.id);
				} else {
					next.add(draft.id);
				}
				return next;
			});
			lastClickedDraftRef.current = draft.id;
		},
		[onDraftSelectionChange, supplementalDraftRows]
	);
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
	// One-shot: scroll a contact row into view and highlight it after a redded-out
	// contact row is clicked on the Drafts tab and the parent switches to Write. The
	// handled-ref makes it idempotent across re-renders and StrictMode double-invoke.
	const lastHandledFocusContactReqIdRef = useRef<number | null>(null);
	useEffect(() => {
		if (!focusContactRequest) return;
		if (lastHandledFocusContactReqIdRef.current === focusContactRequest.requestId) return;
		lastHandledFocusContactReqIdRef.current = focusContactRequest.requestId;
		const rowEl = usedContactRowElsRef.current.get(focusContactRequest.contactId);
		if (rowEl) rowEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		const idx = contacts.findIndex((c) => c.id === focusContactRequest.contactId);
		if (idx !== -1) setHoveredContactIndex(idx);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusContactRequest?.requestId]);
	const supplementalInboxRows = useMemo(() => {
		const rows = inboxEmails ?? [];
		const shouldScopeToCampaignContacts = Boolean(allContacts || contactByEmail);
		if (!shouldScopeToCampaignContacts) return rows;
		return rows.filter((email) => {
			const sender = email.sender?.toLowerCase().trim();
			return Boolean(sender && contactsByEmail.has(sender));
		});
	}, [allContacts, contactByEmail, contactsByEmail, inboxEmails]);
	// The artist's submitted applications thread in as per-event "sent" items,
	// scoped by the same campaign-contacts rule as the inbound rows above.
	const { data: myApplications } = useGetMyEventApplications();
	// Event-chat rows resolve their application (status, event metadata) by the
	// conversation's thread-application id. Withdrawn applications stay in the
	// map so their chats can render the closed state.
	const applicationById = useMemo(
		() =>
			new Map((myApplications ?? []).map((application) => [application.id, application])),
		[myApplications]
	);
	const supplementalApplicationRows = useMemo(() => {
		const rows = (myApplications ?? [])
			.filter((application) => application.status === 'submitted')
			.map(normalizeApplicationForInboxConversation)
			.filter((row): row is InboxConversationMessage => row != null);
		const shouldScopeToCampaignContacts = Boolean(allContacts || contactByEmail);
		if (!shouldScopeToCampaignContacts) return rows;
		return rows.filter((row) => {
			const sender = row.sender?.toLowerCase().trim();
			return Boolean(sender && contactsByEmail.has(sender));
		});
	}, [allContacts, contactByEmail, contactsByEmail, myApplications]);
	const supplementalInboxThreadConversations = useMemo(
		() =>
			buildInboxConversations([
				...(supplementalInboxRows as InboxConversationMessage[]),
				...supplementalSentThreadMessages,
				...supplementalApplicationRows,
			]),
		[supplementalInboxRows, supplementalSentThreadMessages, supplementalApplicationRows]
	);
	const supplementalSentConversations = useMemo(
		() =>
			supplementalInboxThreadConversations.filter(
				(conversation) =>
					conversation.sentMessages.length > 0 &&
					Boolean(conversation.latestMessage.isSent)
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
			supplementalInboxConversations.filter(
				(conversation) =>
					conversation.inboundMessages.some(isInboxOpportunityEmail) ||
					// Application chats (the venue's replies to an event the artist applied
					// to) belong under Opportunities — AND stay in Responses below, since
					// they're real replies too.
					conversation.inboundMessages.some(
						(message) => message.venueThreadApplicationId != null
					)
			),
		[supplementalInboxConversations]
	);
	// Responses sub-tab should NOT also contain opportunity-KEYWORD conversations.
	// Keyword-classified conversations route to exactly one of {Responses,
	// Opportunities}; application chats are the exception and appear in both
	// (isInboxOpportunityEmail exempts venue rows, so they never match here).
	const supplementalInboxConversationsResponsesOnly = useMemo(
		() =>
			supplementalInboxConversations.filter(
				(conversation) => !conversation.inboundMessages.some(isInboxOpportunityEmail)
			),
		[supplementalInboxConversations]
	);
	// Past/live partition for the inbox panel: closed/canceled event chats sit
	// above the fold and reveal only by scrolling up (the venue portal's ledger
	// pattern). Recomputed per render (not memoized) so every row shares one
	// Date.now() frame.
	const nowMs = Date.now();
	const isConversationAboveFold = (conversation: InboxConversation) => {
		const threadApplicationId = getConversationThreadApplicationId(conversation);
		if (threadApplicationId == null) return false;
		const application = applicationById.get(threadApplicationId);
		if (!application) return false;
		return deriveEventChatStatus(application, nowMs).isAboveFold;
	};
	const activeInboxPanelConversations = useMemo(
		() =>
			inboxPanelTab === 'sent'
				? supplementalSentConversations
				: inboxPanelTab === 'opportunities'
					? supplementalOpportunityInboxConversations
					: supplementalInboxConversationsResponsesOnly,
		[
			inboxPanelTab,
			supplementalInboxConversationsResponsesOnly,
			supplementalOpportunityInboxConversations,
			supplementalSentConversations,
		]
	);
	const normalizedInboxSearchQuery = inboxSearchQuery.trim().toLowerCase();
	const filteredInboxPanelConversations = useMemo(() => {
		if (!normalizedInboxSearchQuery) return activeInboxPanelConversations;
		return activeInboxPanelConversations.filter((conversation) =>
			inboxConversationMatchesSearchQuery(
				conversation,
				normalizedInboxSearchQuery,
				contactByEmail,
				contactsById,
				applicationById,
				campaign?.name
			)
		);
	}, [
		activeInboxPanelConversations,
		applicationById,
		campaign?.name,
		contactByEmail,
		contactsById,
		normalizedInboxSearchQuery,
	]);
	const pastInboxPanelConversations: InboxConversation[] = [];
	const liveInboxPanelConversations: InboxConversation[] = [];
	for (const conversation of filteredInboxPanelConversations) {
		(isConversationAboveFold(conversation)
			? pastInboxPanelConversations
			: liveInboxPanelConversations
		).push(conversation);
	}
	// Write/Drafts tab inbox ordering: group all live opportunities together at the
	// top, keep regular replies in the middle, and sink closed/canceled opportunities
	// to the very bottom — so the redded box reads opportunities → replies → closed
	// instead of interleaving opportunity and non-opportunity rows.
	const getInboxGroupRank = (conversation: InboxConversation) => {
		const appId = getConversationThreadApplicationId(conversation);
		const application = appId != null ? applicationById.get(appId) : undefined;
		if (!application) return 1;
		const status = deriveEventChatStatus(application, nowMs).status;
		return status === 'closed' || status === 'canceled' ? 2 : 0;
	};
	// Array.sort is stable, so the time-desc order is preserved within each group.
	const supplementalInboxConversationsGrouped = [...supplementalInboxConversations].sort(
		(a, b) => getInboxGroupRank(a) - getInboxGroupRank(b)
	);
	const pastInboxIdsKey = pastInboxPanelConversations
		.map((conversation) => conversation.key)
		.join(',');
	const visibleInboxPanelRowCount = filteredInboxPanelConversations.length;
	const totalRenderedRows = isInboxFocusMode
		? visibleInboxPanelRowCount
		: contacts.length +
			supplementalDraftRows.length +
			supplementalInboxConversations.length;
	const shouldShowAllTabEmptyContacts =
		!shouldShowLoadingWave &&
		!isBottomView &&
		!isDraftsFocusMode &&
		!isInboxFocusMode &&
		activeTopNavStop === 'all' &&
		totalRenderedRows === 0;
	const shouldShowScrollbar =
		!isBottomView &&
		(isInboxFocusMode ? visibleInboxPanelRowCount >= 6 : totalRenderedRows >= 14);

	// Pin the inbox panel's initial scroll to the live section so it renders like
	// a live-only list; past (closed/canceled) event chats reveal by scrolling up.
	// Re-pins when the panel (re)mounts, the sub-tab changes, or a NEW past key
	// appears mid-session — not on removals. Layout effect so the first paint is
	// already pinned.
	const inboxListScrollerRef = useRef<HTMLDivElement | null>(null);
	const inboxLiveSectionRef = useRef<HTMLDivElement | null>(null);
	const seenPastInboxIdsRef = useRef<Set<string> | null>(null);
	const seenPastInboxTabRef = useRef<DashboardResponsesTab | null>(null);
	useLayoutEffect(() => {
		if (!isInboxFocusMode) {
			seenPastInboxIdsRef.current = null;
			seenPastInboxTabRef.current = null;
			return;
		}
		const scroller = inboxListScrollerRef.current;
		const liveSection = inboxLiveSectionRef.current;
		if (!scroller || !liveSection) return;
		if (seenPastInboxTabRef.current !== inboxPanelTab) {
			seenPastInboxTabRef.current = inboxPanelTab;
			seenPastInboxIdsRef.current = null;
		}
		const previous = seenPastInboxIdsRef.current;
		const nextIds = pastInboxIdsKey === '' ? [] : pastInboxIdsKey.split(',');
		seenPastInboxIdsRef.current = new Set(nextIds);
		if (previous && nextIds.every((id) => previous.has(id))) return;
		// offsetTop is scroller-relative, so it equals the past band's height.
		scroller.scrollTop = liveSection.offsetTop;
	}, [isInboxFocusMode, inboxPanelTab, pastInboxIdsKey]);

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
		const shouldSelectDraftInPlace =
			!isDraftsFocusMode && Boolean(onDraftSelectionChange);
		// Hovering a redded-out draft row (Write tab) reveals it in the gold reveal
		// style — a #FFDA8D card with a cream rounded corner box on the top-left — with
		// its subject + body visible (peek). The base flag still drives navigation.
		const draftPeekKey = `draft:${draft.id}`;
		const isReddedOut = shouldRedOutDraftRows && peekRowKey !== draftPeekKey;
		// A peeked redded draft reveals in the gold corner-box style. Only ever true on
		// the Write tab (shouldRedOutDraftRows); the Drafts tab keeps real selection UI.
		const isPeeked = shouldRedOutDraftRows && peekRowKey === draftPeekKey;
		const showAsShowingStyle = isShowingDraft;
		const draftSupplementalTextClassName = isReddedOut ? 'text-[#F5C0BD]' : 'text-black';
		const draftSupplementalBorderColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: isPeeked
				? WRITE_TAB_SUPPLEMENTAL_PEEK_BORDER_COLOR
				: '#000000';
		const draftSupplementalRowFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
			: isPeeked
				? WRITE_TAB_DRAFT_PEEK_FILL_COLOR
				: undefined;
		const draftSupplementalBadgeFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR
			: undefined;
		const draftSupplementalTextColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: undefined;
		const topBarLeftColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: isPeeked
				? WRITE_TAB_DRAFT_PEEK_CORNER_COLOR
				: isInactiveSelectedDraft
					? SELECTED_DRAFT_TOP_BAR_COLOR
					: SHOWING_DRAFT_TOP_BAR_COLOR;
		const topBarRightColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
			: isPeeked
				? WRITE_TAB_DRAFT_PEEK_FILL_COLOR
				: showAsShowingStyle
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
					'relative select-none',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${SUPPLEMENTAL_DRAFT_ROW_HEIGHT_PX}px`,
					boxSizing: 'border-box',
				}}
				onMouseEnter={(e) => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					if (!isAllTabNavigation && shouldRedOutDraftRows) {
						cancelPeekClear();
						setPeekRowKey(draftPeekKey);
					}
					onDraftHover?.(draft);
					onContactHover?.(contact);
					onContactRowHover?.(contact, e.currentTarget);
				}}
				onMouseLeave={() => {
					schedulePeekClear();
					onContactRowHover?.(null, null);
				}}
				onMouseDown={(e) => {
					if (e.shiftKey) e.preventDefault();
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (shouldSelectDraftInPlace) {
						handleDraftSelectionClick(draft, e);
						if (contact) onContactClick?.(contact);
						return;
					}
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

					// Drafts tab: a single click cycles selection/showing state.
					// (Showing row -> no-op, selected non-showing -> deselect,
					// plain -> promote to showing + clear every other selection.)
					if (
						isDraftsFocusMode &&
						!shouldRedOutDraftRows &&
						onDraftSelectionChange
					) {
						lastClickedDraftRef.current = draft.id;
						const result = resolveDraftRowClick(
							draft.id,
							selectedDraftId ?? null,
							selectedDraftIds ?? new Set<number>()
						);
						if (result.showDraft) onDraftClick?.(draft);
						if (result.nextSelectedIds) {
							const nextSelectedIds = result.nextSelectedIds;
							onDraftSelectionChange(() => nextSelectedIds);
						}
						if (contact) onContactClick?.(contact);
						return;
					}

					lastClickedDraftRef.current = draft.id;
					onDraftClick?.(draft);
					if (contact) onContactClick?.(contact);
					// Redded-out on the Write tab: jump to the Drafts tab (the draft
					// opens + scrolls into view via the selectedDraftId effect there).
					if (shouldRedOutDraftRows) onOpenSend?.();
				}}
			>
				<div
					className="absolute inset-0 overflow-hidden"
					style={{
						borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
						borderTop: `1.955px solid ${draftSupplementalBorderColor}`,
						borderRight: `1.949px solid ${draftSupplementalBorderColor}`,
					borderBottom: `1.949px solid ${draftSupplementalBorderColor}`,
					borderLeft: `1.949px solid ${draftSupplementalBorderColor}`,
					backgroundColor:
						draftSupplementalRowFillColor ??
						(showAsShowingStyle
							? SHOWING_DRAFT_ROW_FILL_COLOR
							: isInactiveSelectedDraft
								? SELECTED_DRAFT_ROW_FILL_COLOR
								: '#FFFFFF'),
					boxSizing: 'border-box',
				}}
				>
					<DraftCardInner
						contact={contact}
						companyLabel={companyLabel}
						contactName={contactName}
						contactTitle={contactTitle}
						subject={draft.subject || 'No subject'}
						bodyPreview={messagePreview}
						textClassName={draftSupplementalTextClassName}
						borderColor={draftSupplementalBorderColor}
						badgeFillColor={draftSupplementalBadgeFillColor}
						textColor={draftSupplementalTextColor}
						topBarLeftColor={topBarLeftColor}
						topBarRightColor={topBarRightColor}
						topBarLeftWidthPx={topBarLeftWidthPx}
						topBarLeftAsCornerBox={isPeeked}
						topBarLeftCornerBorderColor={WRITE_TAB_SUPPLEMENTAL_PEEK_BORDER_COLOR}
						showStroke={!isReddedOut}
						showShowingBadge={isShowingDraft}
					/>
				</div>
				<div aria-hidden="true" className="absolute left-0 right-0 top-full h-2" />
			</div>
		);
	};

	const renderSupplementalInboxRow = (
		conversation: InboxConversation,
		inboxIndex: number
	) => {
		// On the Write/Drafts tab email/message rows render as a 108px card: redded out
		// at rest, and on hover (peek) revealed as a #AECCFD blue card with a full-width
		// white top strip. The base flag still drives navigation.
		const inboxPeekKey = `inbox:${conversation.key}`;
		const isReddedOut = shouldRedOutInboxRows && peekRowKey !== inboxPeekKey;
		const isPeeked = shouldRedOutInboxRows && peekRowKey === inboxPeekKey;
		// Write/Drafts tab uses the tall (108px) email card with the white top strip;
		// the Inbox tab keeps its native 92px row + the rich EventChatCard.
		const isWriteOrDraftEmailCard = shouldRedOutInboxRows;
		const inboxSupplementalTextClassName = isReddedOut ? 'text-[#F5C0BD]' : 'text-black';
		const inboxSupplementalBorderColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: isPeeked
				? WRITE_TAB_SUPPLEMENTAL_PEEK_BORDER_COLOR
				: '#000000';
		const inboxSupplementalRowFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
			: isPeeked
				? WRITE_TAB_EMAIL_PEEK_FILL_COLOR
				: undefined;
		const inboxSupplementalBadgeFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR
			: undefined;
		const inboxSupplementalTextColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: undefined;
		// Write/Drafts-tab email card top strip: full-width white on hover (peek), a
		// subtle lighter-red band at rest (redded). Mirrors the blue card in the spec
		// where the top 13px is white and the body is #AECCFD.
		const emailCardTopStripColor = isPeeked
			? WRITE_TAB_SUPPLEMENTAL_PEEK_TOP_STRIP_COLOR
			: WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR;
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
		// Event-thread rows are labeled with their opportunity (the row's subject is
		// the event name) instead of the generic venue-type chip.
		const threadEventName =
			email.venueThreadApplicationId != null ? email.subject || '' : '';
		const bodyPreview = `${previewEmail.isSent ? 'You: ' : ''}${
			getInboxMessageSnippet(previewEmail) || 'No content'
		}`;
		// Event-chat rows render the rich status card instead of the generic
		// company/badge layout once their application data resolves (red-out
		// silhouettes keep the generic layout).
		const threadApplicationId = getConversationThreadApplicationId(conversation);
		const eventApplication =
			threadApplicationId != null ? applicationById.get(threadApplicationId) : undefined;
		// Event-chat rows render the full EventChatCard even when redded — the card is
		// redded via the murmur-contacts-drafts-redout class on its wrapper, and the
		// height comes from the status regardless of red-out. So the redded and
		// hover-revealed states share one layout and size: no jump, full UI shown
		// redded, hover just restores the colors.
		const eventChatStateForLayout = eventApplication
			? deriveEventChatStatus(eventApplication, nowMs)
			: null;
		const eventChatState = eventChatStateForLayout;
		// The rich EventChatCard (special opportunity/event UI) is reserved for the
		// Inbox tab. On the Write/Drafts tab, opportunities render as plain email rows
		// (the same blue 108px card as any other message), so we ignore the event-chat
		// state entirely for layout, sizing, and rendering there.
		const showEventChatCard =
			!isWriteOrDraftEmailCard && Boolean(eventApplication && eventChatState);
		const isEventChatCompact =
			eventChatStateForLayout?.status === 'closed' ||
			eventChatStateForLayout?.status === 'canceled';
		const shouldRenderNoFillEventChatRow =
			isInboxFocusMode && Boolean(eventChatStateForLayout?.isAboveFold);
		const rowHeightPx = isWriteOrDraftEmailCard
			? SUPPLEMENTAL_DRAFT_ROW_HEIGHT_PX
			: eventChatStateForLayout
				? isEventChatCompact
					? EVENT_CHAT_COMPACT_ROW_HEIGHT_PX
					: EVENT_CHAT_ROW_HEIGHT_PX
				: SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX;
		const latestMessageMs = getInboxMessageTimeMs(previewEmail);
		const eventChatTimestampLabel = latestMessageMs
			? formatEventChatTimestamp(new Date(latestMessageMs), nowMs)
			: '';
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
					'relative select-none',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${rowHeightPx}px`,
					boxSizing: 'border-box',
				}}
				role={!isAllTabNavigation ? 'button' : undefined}
				aria-pressed={!isAllTabNavigation ? isSelectedInboxConversation : undefined}
				tabIndex={!isAllTabNavigation ? 0 : undefined}
				onMouseEnter={(e) => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					if (!isAllTabNavigation && shouldRedOutInboxRows) {
						cancelPeekClear();
						setPeekRowKey(inboxPeekKey);
					}
					if (isDraftsFocusMode) onDraftHover?.(null);
					onContactHover?.(contact);
					if (showEventChatCard && eventApplication && eventChatState) {
						onEventChatRowHover?.(eventApplication, e.currentTarget);
					} else {
						onContactRowHover?.(contact, e.currentTarget);
					}
				}}
				onMouseLeave={() => {
					schedulePeekClear();
					if (showEventChatCard) {
						onEventChatRowHover?.(null, null);
					} else {
						onContactRowHover?.(null, null);
					}
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (showEventChatCard && eventApplication) {
						onEventChatRowClick?.(eventApplication);
					}
					if (onInboxEmailClick) {
						onInboxEmailClick(selectionEmail);
						// Redded-out on the Write/Drafts tab: jump to the Inbox tab (the
						// conversation is preselected via selectedInboxEmailId).
						if (shouldRedOutInboxRows) onOpenInbox?.();
						return;
					}
					if (contact) onContactClick?.(contact);
				}}
				onKeyDown={(e) => {
					if (isAllTabNavigation || !onInboxEmailClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (showEventChatCard && eventApplication) {
							onEventChatRowClick?.(eventApplication);
						}
						onInboxEmailClick(selectionEmail);
					}
				}}
			>
				<div
					className="absolute inset-0 overflow-hidden"
					style={{
						borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
						borderTop: `1.955px solid ${inboxSupplementalBorderColor}`,
						borderRight: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderBottom: `1.949px solid ${inboxSupplementalBorderColor}`,
					borderLeft: `1.949px solid ${inboxSupplementalBorderColor}`,
					background: shouldRenderNoFillEventChatRow
						? 'transparent'
						: isWriteOrDraftEmailCard
							? (inboxSupplementalRowFillColor ?? '#FFFFFF')
							: isSelectedInboxConversation
								? selectedInboxRowFillColor
								: (inboxSupplementalRowFillColor ?? '#F9FAFB'),
					boxSizing: 'border-box',
				}}
				>
					{showEventChatCard && eventApplication && eventChatState ? (
						<div
							className={cn(
								'pointer-events-none h-full w-full',
								isReddedOut && 'murmur-contacts-drafts-redout'
							)}
						>
							<EventChatCard
								application={eventApplication}
								state={eventChatState}
								nowMs={nowMs}
								campaignName={campaign?.name?.trim() || null}
								timestampLabel={eventChatTimestampLabel}
								previewText={bodyPreview}
							/>
						</div>
					) : isWriteOrDraftEmailCard ? (
						// Write/Drafts tab: render the tall (108px) email card — full-width top
						// strip (white on hover, light-red at rest) over a #AECCFD body — and
						// treat opportunities as plain emails (category chip, never an event
						// badge). Reuses DraftCardInner's layout with a flat (non-corner) strip.
						<DraftCardInner
							contact={contact}
							companyLabel={companyLabel}
							contactName={contactName}
							contactTitle={contactTitle}
							subject={previewEmail.subject || 'No subject'}
							bodyPreview={bodyPreview}
							textClassName={inboxSupplementalTextClassName}
							borderColor={inboxSupplementalBorderColor}
							badgeFillColor={inboxSupplementalBadgeFillColor}
							textColor={inboxSupplementalTextColor}
							topBarLeftColor={emailCardTopStripColor}
							topBarRightColor={emailCardTopStripColor}
							topBarLeftWidthPx={0}
							showStroke={!isReddedOut}
						/>
					) : (
						<InboxCardInner
							contact={contact}
							companyLabel={companyLabel}
							contactName={contactName}
							contactTitle={contactTitle}
							threadEventName={threadEventName}
							subject={previewEmail.subject || 'No subject'}
							bodyPreview={bodyPreview}
							textClassName={inboxSupplementalTextClassName}
							borderColor={inboxSupplementalBorderColor}
							badgeFillColor={inboxSupplementalBadgeFillColor}
							textColor={inboxSupplementalTextColor}
							showStroke={!isReddedOut}
						/>
					)}
				</div>
				<div aria-hidden="true" className="absolute left-0 right-0 top-full h-2" />
			</div>
		);
	};

	const renderSupplementalSentRow = (
		conversation: InboxConversation,
		sentIndex: number
	) => {
		// Sent rows only render in inbox focus (never redded), so isReddedOut is always
		// false here; defined for parity with renderSupplementalInboxRow.
		const inboxPeekKey = `inbox:${conversation.key}`;
		const isReddedOut = shouldRedOutInboxRows && peekRowKey !== inboxPeekKey;
		const inboxSupplementalTextClassName = isReddedOut ? 'text-[#F5C0BD]' : 'text-black';
		const inboxSupplementalBorderColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: '#000000';
		const inboxSupplementalRowFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_ROW_FILL_COLOR
			: undefined;
		const inboxSupplementalBadgeFillColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_BADGE_FILL_COLOR
			: undefined;
		const inboxSupplementalTextColor = isReddedOut
			? WRITE_TAB_SUPPLEMENTAL_TEXT_COLOR
			: undefined;
		const email = conversation.latestMessage;
		const contact = resolveInboundContact(email, contactByEmail, contactsById);
		const contactName = getContactDisplayName(
			contact,
			contact?.email || 'Unknown recipient'
		);
		const companyLabel = getContactCompanyLabel(contact);
		const contactTitle = getContactTitle(contact);
		const threadEventName =
			email.venueThreadApplicationId != null ? email.subject || '' : '';
		const messagePreview = `You: ${getInboxMessageSnippet(email) || 'No content'}`;
		const isSelectedSentConversation =
			selectedInboxEmailId != null &&
			inboxConversationContainsSentEmailId(conversation, selectedInboxEmailId);
		// Same event-chat card swap as the inbound rows.
		const threadApplicationId = getConversationThreadApplicationId(conversation);
		const eventApplication =
			threadApplicationId != null ? applicationById.get(threadApplicationId) : undefined;
		// Event-chat rows render the full EventChatCard even when redded — the card is
		// redded via the murmur-contacts-drafts-redout class on its wrapper, and the
		// height comes from the status regardless of red-out. So the redded and
		// hover-revealed states share one layout and size: no jump, full UI shown
		// redded, hover just restores the colors.
		const eventChatStateForLayout = eventApplication
			? deriveEventChatStatus(eventApplication, nowMs)
			: null;
		const eventChatState = eventChatStateForLayout;
		const isEventChatCompact =
			eventChatStateForLayout?.status === 'closed' ||
			eventChatStateForLayout?.status === 'canceled';
		const rowHeightPx = eventChatStateForLayout
			? isEventChatCompact
				? EVENT_CHAT_COMPACT_ROW_HEIGHT_PX
				: EVENT_CHAT_ROW_HEIGHT_PX
			: SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX;
		const latestMessageMs = getInboxMessageTimeMs(email);
		const eventChatTimestampLabel = latestMessageMs
			? formatEventChatTimestamp(new Date(latestMessageMs), nowMs)
			: '';

		return (
			<div
				key={`contacts-inbox-sent-${conversation.key}-${sentIndex}`}
				className={cn(
					'relative select-none overflow-hidden',
					isAllTabNavigation ? 'cursor-default' : 'cursor-pointer'
				)}
				style={{
					width: contactRowWidth,
					height: `${rowHeightPx}px`,
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
				onMouseEnter={(e) => {
					if (!isAllTabNavigation) setHoveredContactIndex(null);
					if (isDraftsFocusMode) onDraftHover?.(null);
					onContactHover?.(contact);
					if (eventApplication && eventChatState) {
						onEventChatRowHover?.(eventApplication, e.currentTarget);
					} else {
						onContactRowHover?.(contact, e.currentTarget);
					}
				}}
				onMouseLeave={() => {
					if (eventApplication && eventChatState) {
						onEventChatRowHover?.(null, null);
					} else {
						onContactRowHover?.(null, null);
					}
				}}
				onClick={(e) => {
					if (isAllTabNavigation) return;
					e.stopPropagation();
					if (eventApplication && eventChatState) {
						onEventChatRowClick?.(eventApplication);
					}
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
						if (eventApplication && eventChatState) {
							onEventChatRowClick?.(eventApplication);
						}
						if (onInboxEmailClick) {
							onInboxEmailClick(email);
							return;
						}
						if (contact) onContactClick?.(contact);
					}
				}}
			>
				{eventApplication && eventChatState ? (
					<div
						className={cn(
							'pointer-events-none h-full w-full',
							isReddedOut && 'murmur-contacts-drafts-redout'
						)}
					>
						<EventChatCard
							application={eventApplication}
							state={eventChatState}
							nowMs={nowMs}
							campaignName={campaign?.name?.trim() || null}
							timestampLabel={eventChatTimestampLabel}
							previewText={messagePreview}
						/>
					</div>
				) : (
					<>
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
							{threadEventName ? (
								<EventThreadBadge
									name={threadEventName}
									className="w-full h-[17px] rounded-[6px] px-2 gap-1"
									textClassName={cn(
										'text-[10px] leading-none',
										inboxSupplementalTextClassName
									)}
									strokeColor={inboxSupplementalBorderColor}
									textColor={inboxSupplementalTextColor}
									showStroke={!isReddedOut}
								/>
							) : contactTitle ? (
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
									showStroke={!isReddedOut}
									restaurantIconSize={12}
									coffeeIconSize={7}
									defaultIconSize={12}
								/>
							) : null}
						</div>

						<div
							className={cn(
								'absolute left-1/2 right-2 pl-1 pointer-events-none',
								threadEventName || contactTitle ? 'top-[30px]' : 'top-[9px]'
							)}
						>
							<StateLocationRow
								contact={contact}
								className="h-[16px] w-full gap-1"
								badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
								badgeTextClassName="font-inter text-[10px] leading-none font-bold"
								cityClassName={cn(
									'text-[10px] leading-none',
									inboxSupplementalTextClassName
								)}
								badgeFillColor={inboxSupplementalBadgeFillColor}
								strokeColor={inboxSupplementalBorderColor}
								textColor={inboxSupplementalTextColor}
								showBadgeStroke={!isReddedOut}
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
					</>
				)}
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
					offsetY={effectiveWhiteSectionHeight === 28 ? 2 : isAllTab ? 1.75 : 0}
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
						'absolute z-20 flex items-center',
						isAllTabNavigation ? 'pointer-events-none cursor-default' : 'cursor-pointer'
					)}
					// Seated in the right end of the campaign-stops chrome bar (top 3.05px, 21.9px tall).
					style={{ top: 7.5, right: 9 }}
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
					<OpenIcon />
				</div>
			)}

			{!collapsed && !isBottomView && isInboxFocusMode && (
				<div
					ref={inboxSearchContainerRef}
					className="absolute z-20 flex items-center gap-[6px]"
					style={{ top: '45px', left: '6px', width: '367px', height: '22px' }}
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
						aria-expanded={isInboxSearchOpen}
						className="flex items-center justify-center bg-white p-0"
						style={{
							width: '22px',
							height: '22px',
							borderRadius: '6px',
							border: 'none',
							cursor: 'pointer',
						}}
						onClick={(e) => {
							e.stopPropagation();
							setIsInboxSearchOpen(true);
							inboxSearchInputRef.current?.focus();
						}}
					>
						<SearchIconDesktop width={16} height={16} stroke="black" strokeWidth={2} />
					</button>
					{isInboxSearchOpen && (
						<div
							className="absolute z-30 flex items-center bg-white"
							style={{
								top: 0,
								right: '28px',
								width: '339px',
								height: '22px',
								borderRadius: '6px',
								border: '1px solid rgba(0,0,0,0.25)',
								boxSizing: 'border-box',
								paddingLeft: '8px',
								paddingRight: '4px',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<input
								ref={inboxSearchInputRef}
								value={inboxSearchQuery}
								placeholder="Search inbox"
								aria-label="Search inbox messages"
								className="min-w-0 flex-1 bg-transparent p-0 font-inter text-[12px] font-medium text-black placeholder:text-black/45 outline-none"
								onChange={(e) => setInboxSearchQuery(e.target.value)}
								onKeyDown={(e) => {
									e.stopPropagation();
									if (e.key === 'Escape') {
										if (inboxSearchQuery) {
											setInboxSearchQuery('');
										} else {
											setIsInboxSearchOpen(false);
										}
									}
								}}
							/>
							<button
								type="button"
								aria-label="Clear inbox search"
								className="relative ml-[4px] flex h-[16px] w-[16px] items-center justify-center bg-transparent p-0"
								style={{ border: 'none', cursor: 'pointer' }}
								onClick={(e) => {
									e.stopPropagation();
									if (inboxSearchQuery) {
										setInboxSearchQuery('');
										inboxSearchInputRef.current?.focus();
									} else {
										setIsInboxSearchOpen(false);
									}
								}}
							>
								<span
									aria-hidden
									className="absolute h-[2px] w-[10px] rotate-45 rounded-full bg-black/65"
								/>
								<span
									aria-hidden
									className="absolute h-[2px] w-[10px] -rotate-45 rounded-full bg-black/65"
								/>
							</button>
						</div>
					)}
				</div>
			)}

			{/* Collapsed bottom panels: label strip + bottom-aligned summary bar. */}
			{shouldRenderCollapsedTopBox && (
				<div
					className="flex-1 flex items-end justify-center px-[2px]"
					style={{ paddingBottom: 3 }}
				>
					{bottomViewBatchesToShow[0] ? (
						<div
							key="contacts-collapsed-batch"
							data-history-ledger-box
							className={cn(
								'cursor-pointer select-none overflow-hidden border-2 border-[#000000] flex items-center justify-between'
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
					<span>{isAllTabNavigation ? 0 : displayedSelectionCount} Selected</span>
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
								handleDisplayedSelectAllToggle();
							}}
						>
							{areAllDisplayedRowsSelected ? 'Deselect All' : 'Select All'}
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
						onContactRowHover?.(null, null);
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
						className="z-0 flex-1 drafting-table-content"
						thumbWidth={shouldShowScrollbar ? 2 : 0}
						thumbColor={shouldShowScrollbar ? '#000000' : 'transparent'}
						trackColor="transparent"
						offsetRight={isBottomView ? -7 : -6}
						contentClassName="overflow-x-hidden"
						alwaysShow={false}
						scrollContainerRef={
							isInboxFocusMode && !isBottomView ? inboxListScrollerRef : undefined
						}
					>
						{isInboxFocusMode && !isBottomView ? (
							<>
								{/* Past band: closed/canceled event chats above the fold. */}
								{pastInboxPanelConversations.length > 0 && (
									<div className="flex shrink-0 flex-col items-center space-y-2 pb-2 opacity-70">
										{inboxPanelTab === 'sent'
											? pastInboxPanelConversations.map(renderSupplementalSentRow)
											: pastInboxPanelConversations.map(renderSupplementalInboxRow)}
									</div>
								)}
								{/* min-h-full pins max-scrollTop to the past band's height so the
								    pinned view renders exactly like a live-only list; shrink-0 is
								    load-bearing (min-h-full replaces flex sizing). */}
								<div
									ref={inboxLiveSectionRef}
									className="flex min-h-full shrink-0 flex-col items-center space-y-2 pb-2"
									style={{
										paddingTop:
											customWhiteSectionHeight !== undefined ? '2px' : undefined,
									}}
								>
									{inboxPanelTab === 'sent'
										? liveInboxPanelConversations.map(renderSupplementalSentRow)
										: liveInboxPanelConversations.map(renderSupplementalInboxRow)}
									{Array.from({
										length: Math.max(0, minRows - visibleInboxPanelRowCount),
									}).map((_, idx) => (
										<div
											key={`inbox-placeholder-${idx}`}
											className={cn(
												'select-none overflow-hidden max-[480px]:w-[96.27vw]',
												shouldShowLoadingWave &&
													'contacts-expanded-list-loading-wave-row contacts-expanded-list-loading-wave-row--inbox'
											)}
											style={{
												width: contactRowWidth,
												height: `${SUPPLEMENTAL_INBOX_ROW_HEIGHT_PX}px`,
												borderRadius: `${SUPPLEMENTAL_DRAFT_ROW_RADIUS_PX}px`,
												borderTop: `1.955px solid ${inboxSupplementalBorderColor}`,
												borderRight: `1.949px solid ${inboxSupplementalBorderColor}`,
												borderBottom: `1.949px solid ${inboxSupplementalBorderColor}`,
												borderLeft: `1.949px solid ${inboxSupplementalBorderColor}`,
												backgroundColor: panelFillColor,
												boxSizing: 'border-box',
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
									))}
								</div>
							</>
						) : (
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
													data-history-ledger-box
													className={cn(
														'cursor-pointer select-none overflow-hidden border-2 border-[#000000] flex items-center justify-between',
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
								) : shouldShowAllTabEmptyContacts ? (
									<div className="relative flex flex-col items-center pb-2">
										<button
											type="button"
											className="absolute left-1/2 top-[18px] z-20 -translate-x-1/2 rounded-full bg-white px-[18px] py-[9px] font-inter text-[15px] font-semibold leading-none text-black transition-colors hover:bg-[#F3F4F6]"
											onClick={(e) => {
												e.stopPropagation();
												if (onSearchFromMiniBar) {
													onSearchFromMiniBar({ why: '', what: '', where: '' });
													return;
												}
												onOpenSearch?.();
											}}
										>
											Add new contacts
										</button>
										<div
											aria-hidden="true"
											className="flex flex-col items-center space-y-2 pointer-events-none select-none"
										>
											{Array.from(
												{
													length: Math.max(
														minRows,
														ALL_TAB_EMPTY_PLACEHOLDER_CONTACTS.length
													),
												},
												(_, index) => {
												const placeholder =
													ALL_TAB_EMPTY_PLACEHOLDER_CONTACTS[
														index % ALL_TAB_EMPTY_PLACEHOLDER_CONTACTS.length
													];
												const opacity = Math.max(0.1, 0.58 - index * 0.07);

												return (
													<div
														key={`all-tab-empty-placeholder-${index}`}
														className="grid grid-cols-2 grid-rows-2 overflow-hidden border-2 border-[#000000] bg-white max-[480px]:w-[96.27vw]"
														style={{
															...(contactRowStyle ?? {}),
															opacity,
														}}
													>
														<div className="col-start-1 row-start-1 row-span-2 pl-3 pr-1 flex flex-col justify-center gap-[1px] overflow-hidden">
															<div className="font-inter text-[14.661px] font-normal leading-[17px] text-black text-left w-full truncate">
																{placeholder.name}
															</div>
															<div
																className="font-inter text-[14.661px] font-medium leading-[17px] text-black text-left w-full overflow-hidden whitespace-nowrap"
																style={{
																	maskImage:
																		'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																	WebkitMaskImage:
																		'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																}}
															>
																{placeholder.company}
															</div>
														</div>
														<div className="col-start-2 row-start-1 pr-2 pl-1 flex items-end pb-[2px] overflow-hidden">
															<div
																className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																style={{ backgroundColor: placeholder.chipColor }}
															>
																{placeholder.category === 'coffee-shops' && (
																	<CoffeeShopsIcon size={7} />
																)}
																{placeholder.category === 'restaurants' && (
																	<RestaurantsIcon size={12} className="flex-shrink-0" />
																)}
																{placeholder.category === 'music-venues' && (
																	<MusicVenuesIcon size={12} className="flex-shrink-0" />
																)}
																{placeholder.category === 'music-festivals' && (
																	<FestivalsIcon size={12} className="flex-shrink-0" />
																)}
																{(placeholder.category === 'wedding-planners' ||
																	placeholder.category === 'wedding-venues') && (
																	<WeddingPlannersIcon size={12} />
																)}
																{placeholder.category === 'wine-beer-spirits' && (
																	<WineBeerSpiritsIcon
																		size={12}
																		className="flex-shrink-0"
																	/>
																)}
																<span className="text-[10px] text-black leading-none truncate">
																	{placeholder.chipLabel}
																</span>
															</div>
														</div>
														<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
															<div className="flex items-center gap-1 w-full">
																<span
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																	style={{
																		backgroundColor:
																			stateBadgeColorMap[placeholder.stateAbbr] ||
																			'transparent',
																		borderColor: '#000000',
																	}}
																>
																	{placeholder.stateAbbr}
																</span>
																<span className="text-[10px] text-black leading-none truncate">
																	{placeholder.city}
																</span>
															</div>
														</div>
													</div>
												);
												}
											)}
										</div>
									</div>
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
											// Hovering a redded-out contact row (Drafts tab) reveals it in its
											// normal style (peek). The base flag still drives navigation.
											const contactPeekKey = `contact:${contact.id}`;
											const isReddedOut =
												shouldRedOutContactRows && peekRowKey !== contactPeekKey;
											// Final background: actively drafting > selected > keyboard focus > white (mouse hover handled by CSS)
											const contactBgColor = isActivelyDrafting
												? 'murmur-actively-drafting'
												: isReddedOut
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
												: isReddedOut
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
														isReddedOut && 'murmur-contacts-drafts-redout',
														contactBorderColor,
														contactBgColor
													)}
													style={contactRowStyle}
													onMouseDown={(e) => {
														if (e.shiftKey) e.preventDefault();
													}}
													onMouseEnter={(e) => {
														if (!isAllTabNavigation) setHoveredContactIndex(contactIndex);
														if (!isAllTabNavigation && shouldRedOutContactRows) {
															cancelPeekClear();
															setPeekRowKey(contactPeekKey);
														}
														if (isDraftsFocusMode) onDraftHover?.(null);
														onContactHover?.(contact);
														onContactRowHover?.(contact, e.currentTarget);
													}}
													onMouseLeave={() => {
														schedulePeekClear();
														onContactRowHover?.(null, null);
													}}
													onClick={(e) => {
														if (isAllTabNavigation) return;
														if (isDraftsFocusMode) {
															e.stopPropagation();
															onContactClick?.(contact);
															// Redded-out on the Drafts tab: jump to the Write tab
															// and scroll to + highlight this contact.
															if (shouldRedOutContactRows) {
																onOpenWriting?.();
																onFocusContact?.(contact.id);
															}
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
																			<TitleBadge
																				title={contactTitle}
																				className="h-[10px] rounded-[3px] px-1 max-w-full"
																				textClassName="text-[7px] text-black"
																				restaurantIconSize={7}
																				coffeeIconSize={4}
																				defaultIconSize={7}
																			/>
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
																											: isWineBeerSpiritsTitle(
																														contactTitle
																												  )
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
																	<TitleBadge
																		title={contactTitle}
																		className="h-[17px] rounded-[6px] px-2 gap-1 w-full"
																		textClassName="text-[10px] text-black"
																		restaurantIconSize={12}
																		coffeeIconSize={7}
																		defaultIconSize={12}
																	/>
																) : (
																	<div className="w-full" />
																)}
															</div>

															{/* Bottom Right - Location (aligned to bottom slot) */}
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
																		<TitleBadge
																			title={contactTitle}
																			className="h-[17px] rounded-[6px] px-2 gap-1 w-full"
																			textClassName="text-[10px] text-black"
																			restaurantIconSize={12}
																			coffeeIconSize={7}
																			defaultIconSize={12}
																		/>
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
										{supplementalInboxConversationsGrouped.map(
											renderSupplementalInboxRow
										)}
									</>
								)}
								{Array.from({
									length: shouldShowAllTabEmptyContacts
										? 0
										: Math.max(0, (!isBottomView ? minRows : 0) - totalRenderedRows),
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
													? cn(
															'contacts-expanded-list-loading-wave-row',
															isInboxFocusMode &&
																'contacts-expanded-list-loading-wave-row--inbox'
														)
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
						)}
					</CustomScrollbar>
				</div>
			)}
		</div>
	);
};

export default ContactsExpandedList;
