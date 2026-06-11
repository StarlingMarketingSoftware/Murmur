'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConversationThread } from '@/components/organisms/ConversationsPane';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { type ConversationThreadFilter } from '@/hooks/queryHooks/useConversations';
import { type VenueApplicationRow } from '@/hooks/queryHooks/useVenueApplications';
import { formatEventCountdown, formatInboxTimestamp } from '@/utils/datetime';
import type { ConversationListItem } from '@/types';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { getProfileGenreIcon } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { VENUE_MAP_OVERLAY_SCALE } from './constants';
import {
	EVENT_PILL_COLORS,
	isReplyRowEventLive,
	replyRowActivity,
	useVenueChatInbox,
	type ReplyGroup,
} from './useVenueChatInbox';

function SectionNotice({ children }: { children: ReactNode }) {
	return (
		<div className="px-[18px] py-[14px] text-center font-inter text-[13px] text-black/40">
			{children}
		</div>
	);
}

// One applicant row in the Replies section: name | event pill (+countdown) |
// preview | time. Clicking opens (seeding it first if needed) the conversation.
function ReplyRow({
	row,
	pillColor,
	pending,
	onClick,
}: {
	row: VenueApplicationRow;
	pillColor: string;
	pending: boolean;
	onClick: () => void;
}) {
	const unread = row.conversation?.unreadCount ?? 0;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={pending}
			className={`flex h-[31px] w-full shrink-0 items-center gap-[14px] px-[18px] text-left ${
				pending ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-white/40'
			}`}
		>
			<span className="flex w-[210px] shrink-0 items-center gap-[8px]">
				{unread > 0 && (
					<span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2F6FED]" />
				)}
				<span className="min-w-0 truncate font-inter text-[17px] font-semibold leading-none text-black">
					{row.applicantName}
				</span>
			</span>
			<span
				className="flex h-[22px] w-[160px] shrink-0 items-center justify-between gap-[8px] rounded-[5px] px-[10px]"
				style={{ backgroundColor: pillColor }}
			>
				<span className="min-w-0 truncate font-inter text-[12px] font-medium leading-none text-black">
					{row.event?.name ?? 'Event'}
				</span>
				<span className="shrink-0 font-inter text-[12px] font-medium leading-none text-black">
					{formatEventCountdown(row.event?.startsAt)}
				</span>
			</span>
			<span className="min-w-0 flex-1 truncate font-inter text-[13px] leading-none text-black/70">
				{row.conversation?.lastMessagePreview || row.applicationPreview}
			</span>
			<span className="w-[60px] shrink-0 text-right font-inter text-[13px] leading-none text-black/70">
				{formatInboxTimestamp(replyRowActivity(row))}
			</span>
		</button>
	);
}

// One cold-campaign conversation row in the Inbound section: name | campaign
// subject (plain text, no pill) | preview | time.
function InboundRow({
	conversation,
	onClick,
}: {
	conversation: ConversationListItem;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-[31px] w-full shrink-0 cursor-pointer items-center gap-[14px] bg-[#DCEAFB] px-[18px] text-left hover:bg-[#ECF4FD]"
		>
			<span className="flex w-[210px] shrink-0 items-center gap-[8px]">
				{conversation.unreadCount > 0 && (
					<span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2F6FED]" />
				)}
				<span className="min-w-0 truncate font-inter text-[17px] font-semibold leading-none text-black">
					{conversation.counterpart.name}
				</span>
			</span>
			<span className="w-[160px] shrink-0 truncate font-inter text-[12px] font-medium leading-none text-black">
				{conversation.subject || ''}
			</span>
			<span className="min-w-0 flex-1 truncate font-inter text-[13px] leading-none text-black/70">
				{conversation.lastMessagePreview || 'No messages yet'}
			</span>
			<span className="w-[60px] shrink-0 text-right font-inter text-[13px] leading-none text-black/70">
				{formatInboxTimestamp(conversation.lastMessageAt)}
			</span>
		</button>
	);
}

export function CardPill({ icon, label }: { icon?: ReactNode; label: string }) {
	return (
		<span className="flex h-[20px] min-w-0 items-center gap-[4px] rounded-full border border-black bg-white px-[8px]">
			{icon}
			<span className="min-w-0 truncate font-inter text-[11px] font-medium leading-none text-black">
				{label}
			</span>
		</span>
	);
}

// Compact conversation card for the left rail of the open-thread view: avatar +
// name + time, genre/location pills, preview. Every card carries the 1px black
// border at 9px radius; cards fill white, except the selected one which goes
// transparent so the darker panel gradient shows through.
function ThreadListCard({
	name,
	timestamp,
	preview,
	genre,
	area,
	unread,
	selected,
	pending = false,
	onClick,
}: {
	name: string;
	timestamp: string;
	preview: string;
	genre: string | null;
	area: string | null;
	unread: boolean;
	selected: boolean;
	pending?: boolean;
	onClick: () => void;
}) {
	const GenreIcon = getProfileGenreIcon(genre);
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={pending}
			className={`mx-auto flex h-[85px] w-[266px] shrink-0 flex-col justify-between rounded-[9px] border border-black px-[10px] py-[7px] text-left ${
				selected ? 'bg-transparent' : 'bg-white hover:bg-white/40'
			} ${pending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
		>
			<span className="flex w-full items-center gap-[8px]">
				<OutlinedInitialAvatar
					initial={name.trim()[0]?.toUpperCase() || '?'}
					className="h-[24px] w-[24px] shrink-0 border-black text-[12px] text-black"
				/>
				{unread && (
					<span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2F6FED]" />
				)}
				<span className="min-w-0 truncate font-inter text-[14px] font-bold text-black">
					{name}
				</span>
				<span className="ml-auto shrink-0 font-inter text-[11px] leading-none text-black/50">
					{timestamp}
				</span>
			</span>
			{(genre || area) && (
				<span className="flex w-full min-w-0 items-center gap-[6px]">
					{genre && (
						<CardPill
							icon={
								GenreIcon && (
									<GenreIcon aria-hidden="true" className="h-[12px] w-[12px] shrink-0" />
								)
							}
							label={genre}
						/>
					)}
					{area && (
						<CardPill
							icon={
								<ProfileAreaMarkerIcon
									aria-hidden="true"
									className="h-[12px] w-[10px] shrink-0"
								/>
							}
							label={area}
						/>
					)}
				</span>
			)}
			<span className="w-full min-w-0 truncate font-inter text-[12px] leading-none text-black/60">
				{preview}
			</span>
		</button>
	);
}

// Floating chat panel for the toolbar's Chat tab. Same chrome and footprint as
// the events/profile panels; the body is a two-section inbox — Replies (event
// applications) over Inbound (cold campaign conversations) — and clicking a row
// swaps the body for a two-column messenger: the active section's conversation
// cards on the left, the open thread on the right.
export function VenueChatMapPanel({
	initialThread,
	onThreadOpened,
}: {
	// Deep link from the notifications panel: open straight onto this thread. Read
	// once at mount — the parent remounts the panel (via key) per deep link.
	initialThread?: { conversationId: number; thread: ConversationThreadFilter } | null;
	// Reports user-initiated thread opens so the parent can dock them as the
	// last-active thread. Not fired for initialThread — the parent set that itself.
	onThreadOpened?: (conversationId: number, thread: ConversationThreadFilter) => void;
} = {}) {
	const [activeSection, setActiveSection] = useState<'replies' | 'inbound'>(
		initialThread?.thread === 'general' ? 'inbound' : 'replies'
	);
	// An open thread view: the pair conversation plus which slice of it — an
	// application's thread (Replies row) or the general thread (Inbound row).
	const [selectedThread, setSelectedThread] = useState<{
		conversationId: number;
		thread: ConversationThreadFilter;
	} | null>(initialThread ?? null);

	const {
		replyGroups,
		flatReplies,
		inboundConversations,
		repliesLoading,
		conversationsLoading,
		pendingApplicationId,
		openReplyRow,
		cancelOpenIntent,
		ensureApplicationSeed,
	} = useVenueChatInbox();

	// Past/live partition is recomputed per render (not memoized) so it shares the
	// same Date.now() frame as the rows' own countdown formatting (same convention
	// as the Events panel's ledger).
	const pastReplyGroups: ReplyGroup[] = [];
	const liveReplyGroups: ReplyGroup[] = [];
	for (const group of replyGroups) {
		(isReplyRowEventLive(group.rows[0]) ? liveReplyGroups : pastReplyGroups).push(group);
	}
	const pastIdsKey = pastReplyGroups.map((group) => group.eventId).join(',');
	// Same partition for the open-thread rail's flat list (row-level — the rail
	// carries no event grouping).
	const pastFlatReplies: VenueApplicationRow[] = [];
	const liveFlatReplies: VenueApplicationRow[] = [];
	for (const row of flatReplies) {
		(isReplyRowEventLive(row) ? liveFlatReplies : pastFlatReplies).push(row);
	}
	const railPastIdsKey = pastFlatReplies.map((row) => row.id).join(',');
	const liveReplyRowCount = liveReplyGroups.reduce(
		(count, group) => count + group.rows.length,
		0
	);
	const listScrollerRef = useRef<HTMLDivElement | null>(null);
	const liveSectionRef = useRef<HTMLDivElement | null>(null);
	const [isLedgerScrollbarVisible, setIsLedgerScrollbarVisible] = useState(false);
	// Past ids the pin effect has already accounted for; null forces a re-pin (set
	// while the open-thread view has the list scroller unmounted).
	const seenPastIdsRef = useRef<Set<string> | null>(null);
	const isListView = selectedThread == null;
	// Pin the initial scroll to the live section so the visible inbox renders
	// exactly like a live-only list; replies for outdated opportunities sit above
	// the fold and reveal only by scrolling up (the Events panel's ledger). Re-pins
	// when the list scroller (re)mounts (the open-thread view swaps it out) or when
	// a NEW past event id appears (an event expiring mid-session), but not on
	// removals. Layout effect so the first paint is already pinned.
	useLayoutEffect(() => {
		if (!isListView) {
			seenPastIdsRef.current = null;
			return;
		}
		const scroller = listScrollerRef.current;
		const liveSection = liveSectionRef.current;
		if (!scroller || !liveSection) return;
		const previous = seenPastIdsRef.current;
		const nextIds = pastIdsKey === '' ? [] : pastIdsKey.split(',');
		seenPastIdsRef.current = new Set(nextIds);
		if (previous && nextIds.every((id) => previous.has(id))) return;
		// offsetTop is scroller-relative, so it equals the past band's height whether
		// or not the live content itself overflows the box.
		scroller.scrollTop = liveSection.offsetTop;
	}, [isListView, pastIdsKey]);
	useLayoutEffect(() => {
		if (!isListView) {
			setIsLedgerScrollbarVisible(false);
			return;
		}
		const scroller = listScrollerRef.current;
		const liveSection = liveSectionRef.current;
		if (!scroller || !liveSection) return;
		setIsLedgerScrollbarVisible(liveSection.offsetHeight > scroller.clientHeight + 1);
	}, [isListView, activeSection, liveReplyRowCount, inboundConversations.length]);
	// The open-thread rail gets the same ledger pin: cards for outdated
	// opportunities sit above the fold and reveal only by scrolling up.
	const railScrollerRef = useRef<HTMLDivElement | null>(null);
	const railLiveSectionRef = useRef<HTMLDivElement | null>(null);
	const railSeenPastIdsRef = useRef<Set<string> | null>(null);
	const isRepliesRail = selectedThread != null && activeSection === 'replies';
	useLayoutEffect(() => {
		if (!isRepliesRail) {
			railSeenPastIdsRef.current = null;
			return;
		}
		const scroller = railScrollerRef.current;
		const liveSection = railLiveSectionRef.current;
		if (!scroller || !liveSection) return;
		const previous = railSeenPastIdsRef.current;
		const nextIds = railPastIdsKey === '' ? [] : railPastIdsKey.split(',');
		railSeenPastIdsRef.current = new Set(nextIds);
		if (previous && nextIds.every((id) => previous.has(id))) return;
		scroller.scrollTop = liveSection.offsetTop;
	}, [isRepliesRail, railPastIdsKey]);

	// Deep-linked application threads get the same idempotent seed-ensure a manual
	// Replies-card click performs (the pair conversation may predate the application).
	useEffect(() => {
		if (initialThread && typeof initialThread.thread === 'number') {
			ensureApplicationSeed.mutate(initialThread.thread);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const openThread = (conversationId: number, thread: ConversationThreadFilter) => {
		cancelOpenIntent();
		setSelectedThread({ conversationId, thread });
		onThreadOpened?.(conversationId, thread);
	};

	const handleSegmentClick = (section: 'replies' | 'inbound') => {
		cancelOpenIntent();
		setActiveSection(section);
		setSelectedThread(null);
	};

	const handleReplyRowClick = (row: VenueApplicationRow) => {
		openReplyRow(row, (conversationId, thread) => {
			setSelectedThread({ conversationId, thread });
			onThreadOpened?.(conversationId, thread);
		});
	};

	const segmentClassName = (active: boolean, activeBackground: string) =>
		`flex h-full items-center px-[14px] text-left font-inter text-[13px] font-semibold leading-none text-black ${
			active ? activeBackground : 'bg-white'
		}`;

	return (
		// Left-aligned with the tool tab bar above it; shares the panels' top-[122px]
		// edge so the create/chat/events/profile boxes all open flush with each other.
		<div
			data-venue-tool-ui="true"
			className="fixed left-[500px] top-[122px] z-[99] h-[829px] w-[781px] origin-top-left rounded-[10px] border-[2px] border-black/40 bg-white/15"
			style={{ transform: `scale(${VENUE_MAP_OVERLAY_SCALE})` }}
		>
			<div className="absolute left-[12px] top-[4px] font-inter text-[12.358px] font-medium leading-[16.477px] text-black">
				Chat
			</div>
			<div
				className={`absolute left-[8px] top-[20px] h-[797px] w-[765px] rounded-[8px] border-[2px] border-black ${
					selectedThread == null ? 'overflow-visible' : 'overflow-hidden'
				}`}
			>
				<div className="absolute inset-x-0 top-0 h-[30px] overflow-hidden">
					<div className="absolute inset-x-0 top-[-16px] h-[120px] bg-[linear-gradient(180deg,#C1F7BB_0%,#60AE92_100%)]" />
				</div>
				{/* Replies | Inbound segmented control on the green band: one 235×22
				    rounded box split at 90px, active half tinted, inactive half white. */}
				<div className="absolute left-[8px] top-[4px] z-10 flex h-[22px] w-[235px] overflow-hidden rounded-[6px]">
					<button
						type="button"
						aria-pressed={activeSection === 'replies'}
						onClick={() => handleSegmentClick('replies')}
						className={`w-[90px] ${segmentClassName(activeSection === 'replies', 'bg-[#DBDAFE]')}`}
					>
						Replies
					</button>
					<button
						type="button"
						aria-pressed={activeSection === 'inbound'}
						onClick={() => handleSegmentClick('inbound')}
						className={`flex-1 ${segmentClassName(activeSection === 'inbound', 'bg-[#BCE2FF]')}`}
					>
						Inbound
					</button>
				</div>
				<div className="absolute left-0 right-0 top-[30px] h-[2px] bg-black" />

				{selectedThread != null ? (
					// Open thread: the active section's conversation cards on a 279px left
					// rail, a vertical divider dropping from the header rule, and the
					// thread on the right. Back to the full list = the segment buttons.
					<div className="absolute inset-x-0 bottom-0 top-[32px] flex bg-[linear-gradient(180deg,#BBD4F7_0%,#FFF_100%)]">
						<div className="flex w-[279px] shrink-0 flex-col">
							<div className="px-[12px] pb-[6px] pt-[8px] font-inter text-[12px] font-semibold text-black">
								{activeSection === 'replies' ? 'Replies' : 'Inbound'}
							</div>
							{/* CustomScrollbar (not a plain overflow div) so wheel scrolling
							    works under Lenis, with the thumb permanently hidden — the rail
							    scrolls (revealing the ledger above) without ever showing a
							    scrollbar. */}
							<CustomScrollbar
								scrollContainerRef={railScrollerRef}
								className="min-h-0 flex-1"
								contentClassName="flex flex-col gap-[8px] pb-[10px]"
								hideThumb
								lockHorizontalScroll
							>
								{activeSection === 'replies' ? (
									<>
										{/* Ledger: cards for outdated opportunities, above the live
										    section's fold (see the rail pin effect). */}
										{pastFlatReplies.length > 0 && (
											<div className="flex shrink-0 flex-col gap-[8px] opacity-70">
												{pastFlatReplies.map((row) => (
													<ThreadListCard
														key={row.id}
														name={row.applicantName}
														timestamp={formatInboxTimestamp(replyRowActivity(row))}
														preview={
															row.conversation?.lastMessagePreview ||
															row.applicationPreview
														}
														genre={row.genre}
														area={row.area}
														unread={(row.conversation?.unreadCount ?? 0) > 0}
														selected={selectedThread.thread === row.id}
														pending={pendingApplicationId === row.id}
														onClick={() => handleReplyRowClick(row)}
													/>
												))}
											</div>
										)}
										{/* min-h-full pins max-scrollTop to the past band's height so
										    the pinned view is exactly the live-only rail. */}
										<div
											ref={railLiveSectionRef}
											className="flex min-h-full shrink-0 flex-col gap-[8px]"
										>
											{repliesLoading && <SectionNotice>Loading…</SectionNotice>}
											{!repliesLoading && flatReplies.length === 0 && (
												<SectionNotice>No applications yet.</SectionNotice>
											)}
											{liveFlatReplies.map((row) => (
												<ThreadListCard
													key={row.id}
													name={row.applicantName}
													timestamp={formatInboxTimestamp(replyRowActivity(row))}
													preview={
														row.conversation?.lastMessagePreview || row.applicationPreview
													}
													genre={row.genre}
													area={row.area}
													unread={(row.conversation?.unreadCount ?? 0) > 0}
													selected={selectedThread.thread === row.id}
													pending={pendingApplicationId === row.id}
													onClick={() => handleReplyRowClick(row)}
												/>
											))}
										</div>
									</>
								) : (
									<>
										{conversationsLoading && <SectionNotice>Loading…</SectionNotice>}
										{!conversationsLoading && inboundConversations.length === 0 && (
											<SectionNotice>No inbound messages yet.</SectionNotice>
										)}
										{inboundConversations.map((conversation) => (
											<ThreadListCard
												key={conversation.id}
												name={conversation.counterpart.name}
												timestamp={formatInboxTimestamp(conversation.lastMessageAt)}
												preview={conversation.lastMessagePreview || 'No messages yet'}
												genre={conversation.counterpart.genre ?? null}
												area={conversation.counterpart.area ?? null}
												unread={conversation.unreadCount > 0}
												selected={
													selectedThread.thread === 'general' &&
													selectedThread.conversationId === conversation.id
												}
												onClick={() => openThread(conversation.id, 'general')}
											/>
										))}
									</>
								)}
							</CustomScrollbar>
						</div>
						<div className="w-[2px] shrink-0 bg-black" />
						<div className="min-w-0 flex-1">
							<ConversationThread
								conversationId={selectedThread.conversationId}
								thread={selectedThread.thread}
								variant="venueMap"
								enableBookingRequest
								className="h-full bg-transparent"
							/>
						</div>
					</div>
				) : (
					<CustomScrollbar
						scrollContainerRef={listScrollerRef}
						className="absolute inset-x-0 bottom-0 top-[32px]"
						contentClassName="flex flex-col"
						thumbWidth={2}
						thumbHeightOverride={170}
						offsetRight={-16}
						hideThumb={!isLedgerScrollbarVisible}
						lockHorizontalScroll
					>
						{/* ── Ledger: replies for outdated opportunities, above the live
						    section's fold (see the pin effect). Camouflaged pills on the
						    gradient's start color so the band reads as plain rows, and the
						    seam with the live band below is invisible. */}
						{pastReplyGroups.length > 0 && (
							<div className="shrink-0 bg-[#D1CEFF]">
								<div className="flex flex-col gap-[16px] py-[16px] opacity-70">
									{pastReplyGroups.map((group) => (
										<div key={group.eventId} className="flex flex-col gap-[16px]">
											{group.rows.map((row) => (
												<ReplyRow
													key={row.id}
													row={row}
													pillColor="#D1CEFF"
													pending={pendingApplicationId === row.id}
													onClick={() => handleReplyRowClick(row)}
												/>
											))}
										</div>
									))}
								</div>
							</div>
						)}
						{/* min-h-full pins max-scrollTop to the past band's height when the
						    live content is short, making the pinned view exactly the
						    live-only layout. shrink-0 is load-bearing: min-h-full replaces
						    the flex min-height:auto floor, so without it overflowing live
						    content would get squashed. */}
						<div ref={liveSectionRef} className="flex min-h-full shrink-0 flex-col">
							{/* ── Replies: applications to my live events ── */}
							<div
								className={`shrink-0 bg-[linear-gradient(180deg,#D1CEFF_0%,#BCE2FF_50%,#FFF_100%)] ${
									activeSection === 'replies' ? 'min-h-[380px]' : 'min-h-[190px]'
								}`}
							>
								<div className="flex flex-col gap-[16px] py-[16px]">
									{repliesLoading && <SectionNotice>Loading…</SectionNotice>}
									{!repliesLoading && replyGroups.length === 0 && (
										<SectionNotice>No applications yet.</SectionNotice>
									)}
									{liveReplyGroups.map((group, groupIndex) => (
										<div key={group.eventId} className="flex flex-col gap-[16px]">
											{groupIndex > 0 && <div className="h-[8px] shrink-0 bg-[#BCE2FF]" />}
											{group.rows.map((row) => (
												<ReplyRow
													key={row.id}
													row={row}
													pillColor={
														EVENT_PILL_COLORS[groupIndex % EVENT_PILL_COLORS.length]
													}
													pending={pendingApplicationId === row.id}
													onClick={() => handleReplyRowClick(row)}
												/>
											))}
										</div>
									))}
								</div>
							</div>
							<div className="h-[2px] shrink-0 bg-black" />
							{/* ── Inbound band header (second click target for the segment) ── */}
							<button
								type="button"
								onClick={() => handleSegmentClick('inbound')}
								className="flex h-[30px] shrink-0 items-center bg-[#BBD4F7] px-[18px] font-inter text-[14px] font-semibold text-black"
							>
								Inbound
							</button>
							{/* ── Inbound: cold campaign conversations ── */}
							<div className="flex flex-1 flex-col bg-[#BBD4F7]">
								<div className="flex flex-col gap-[16px] pb-[16px]">
									{conversationsLoading && <SectionNotice>Loading…</SectionNotice>}
									{!conversationsLoading && inboundConversations.length === 0 && (
										<SectionNotice>No inbound messages yet.</SectionNotice>
									)}
									{inboundConversations.map((conversation) => (
										<InboundRow
											key={conversation.id}
											conversation={conversation}
											onClick={() => openThread(conversation.id, 'general')}
										/>
									))}
								</div>
							</div>
						</div>
					</CustomScrollbar>
				)}
			</div>
		</div>
	);
}
