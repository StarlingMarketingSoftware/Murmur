'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConversationThread } from '@/components/organisms/ConversationsPane';
import {
	useGetConversations,
	useOpenApplicationConversation,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import {
	useGetVenueApplications,
	type VenueApplicationRow,
} from '@/hooks/queryHooks/useVenueApplications';
import { formatEventCountdown, formatInboxTimestamp } from '@/utils/datetime';
import type { ConversationListItem } from '@/types';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { getProfileGenreIcon } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { VENUE_MAP_OVERLAY_SCALE } from './constants';

// Per-event pill tint, cycling soonest-event-first like the Figma mock.
const EVENT_PILL_COLORS = ['#BCC4FF', '#BCE2FF'];

type ReplyGroup = {
	eventId: number;
	rows: VenueApplicationRow[];
	startsAt: string | null;
};

const replyRowActivity = (row: VenueApplicationRow) =>
	row.conversation?.lastMessageAt ?? row.createdAt;

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
// border at 9px radius; only the selected one fills white.
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
				selected ? 'bg-white' : 'bg-transparent hover:bg-white/40'
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
}: {
	// Deep link from the notifications panel: open straight onto this thread. Read
	// once at mount — the parent remounts the panel (via key) per deep link.
	initialThread?: { conversationId: number; thread: ConversationThreadFilter } | null;
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
	const [pendingApplicationId, setPendingApplicationId] = useState<number | null>(null);

	const { data: applications, isLoading: repliesLoading } = useGetVenueApplications({
		enabled: true,
	});
	// Cache-shared with the tool tab bar's unread badge query.
	const { data: conversations, isLoading: conversationsLoading } = useGetConversations({
		enabled: true,
	});
	const openApplication = useOpenApplicationConversation();
	// Background seed-ensure for rows whose conversation already exists — the
	// thread is open and usable either way, so a failure here must not toast.
	const ensureApplicationSeed = useOpenApplicationConversation({ suppressToasts: true });

	// Deep-linked application threads get the same idempotent seed-ensure a manual
	// Replies-card click performs (the pair conversation may predate the application).
	useEffect(() => {
		if (initialThread && typeof initialThread.thread === 'number') {
			ensureApplicationSeed.mutate(initialThread.thread);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Group applications by event, soonest event first (null dates last); newest
	// activity first within each event.
	const replyGroups = useMemo(() => {
		const byEvent = new Map<number, ReplyGroup>();
		for (const row of applications ?? []) {
			const group = byEvent.get(row.eventId) ?? {
				eventId: row.eventId,
				rows: [],
				startsAt: row.event?.startsAt ?? null,
			};
			group.rows.push(row);
			byEvent.set(row.eventId, group);
		}
		const groups = [...byEvent.values()].sort((a, b) => {
			if (a.startsAt == null) return b.startsAt == null ? 0 : 1;
			if (b.startsAt == null) return -1;
			return Date.parse(a.startsAt) - Date.parse(b.startsAt);
		});
		for (const group of groups) {
			group.rows.sort(
				(a, b) => Date.parse(replyRowActivity(b)) - Date.parse(replyRowActivity(a))
			);
		}
		return groups;
	}, [applications]);

	// Left-rail card order for the open-thread view: plain recency. The cards
	// carry no event pill, so the list view's by-event grouping would read as
	// arbitrary interleaving here.
	const flatReplies = useMemo(
		() =>
			[...(applications ?? [])].sort(
				(a, b) => Date.parse(replyRowActivity(b)) - Date.parse(replyRowActivity(a))
			),
		[applications]
	);

	// Conversations with general-thread content: cold campaign outreach, plus the
	// safety net of any untagged artist message (venue-side preview/recency are
	// general-scoped, so a non-empty preview ⇔ general messages exist — without
	// this, such a message would be unreachable and its unread badge stuck). The
	// row opens the GENERAL thread; applications live behind the Replies rows.
	// Sorted by the general-thread timestamp the row displays, since the server
	// list is ordered by whole-conversation recency (app chatter included).
	const inboundConversations = useMemo(
		() =>
			(conversations ?? [])
				.filter(
					(conversation) =>
						conversation.hasDivertOrigin || conversation.lastMessagePreview !== ''
				)
				.sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)),
		[conversations]
	);

	// The application row whose seeding click should open the thread when the
	// mutation lands. Cleared whenever the user navigates elsewhere, so a slow
	// response can't yank the view away from what they're looking at.
	const openIntentRef = useRef<number | null>(null);

	const openThread = (conversationId: number, thread: ConversationThreadFilter) => {
		openIntentRef.current = null;
		setSelectedThread({ conversationId, thread });
	};

	const handleSegmentClick = (section: 'replies' | 'inbound') => {
		openIntentRef.current = null;
		setActiveSection(section);
		setSelectedThread(null);
	};

	const handleReplyRowClick = (row: VenueApplicationRow) => {
		if (row.conversation != null) {
			openThread(row.conversation.id, row.id);
			// Idempotently ensure this application's seed message exists in its thread
			// (the pair conversation may predate the application via cold outreach).
			ensureApplicationSeed.mutate(row.id);
			return;
		}
		if (pendingApplicationId != null) return;
		setPendingApplicationId(row.id);
		openIntentRef.current = row.id;
		openApplication.mutate(row.id, {
			onSuccess: ({ conversationId }) => {
				if (openIntentRef.current === row.id) openThread(conversationId, row.id);
			},
			onSettled: () => setPendingApplicationId(null),
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
			<div className="absolute left-[8px] top-[20px] h-[797px] w-[765px] overflow-hidden rounded-[8px] border-[2px] border-black">
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
							<div className="flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto pb-[10px]">
								{activeSection === 'replies' ? (
									<>
										{repliesLoading && <SectionNotice>Loading…</SectionNotice>}
										{!repliesLoading && flatReplies.length === 0 && (
											<SectionNotice>No applications yet.</SectionNotice>
										)}
										{flatReplies.map((row) => (
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
							</div>
						</div>
						<div className="w-[2px] shrink-0 bg-black" />
						<div className="min-w-0 flex-1">
							<ConversationThread
								conversationId={selectedThread.conversationId}
								thread={selectedThread.thread}
								variant="venueMap"
								className="h-full bg-transparent"
							/>
						</div>
					</div>
				) : (
					<div className="absolute inset-x-0 bottom-0 top-[32px] flex flex-col">
						{/* ── Replies: applications to my events ── */}
						<div
							className={`shrink-0 bg-[linear-gradient(180deg,#D1CEFF_0%,#BCE2FF_50%,#FFF_100%)] ${
								activeSection === 'replies' ? 'h-[380px]' : 'h-[190px]'
							}`}
						>
							<div className="flex h-full flex-col gap-[16px] overflow-y-auto py-[16px]">
								{repliesLoading && <SectionNotice>Loading…</SectionNotice>}
								{!repliesLoading && replyGroups.length === 0 && (
									<SectionNotice>No applications yet.</SectionNotice>
								)}
								{replyGroups.map((group, groupIndex) => (
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
						<div className="min-h-0 flex-1 bg-[#BBD4F7]">
							<div className="flex h-full flex-col gap-[16px] overflow-y-auto pb-[16px]">
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
				)}
			</div>
		</div>
	);
}
