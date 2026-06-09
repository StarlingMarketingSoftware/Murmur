'use client';

import { useMemo, useRef, useState } from 'react';
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
			className={`flex h-[50px] w-full shrink-0 items-center gap-[14px] border-b border-white/50 px-[18px] text-left ${
				pending ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-white/30'
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
			className="flex h-[50px] w-full shrink-0 cursor-pointer items-center gap-[14px] border-b border-white/50 px-[18px] text-left hover:bg-white/30"
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

// Floating chat panel for the toolbar's Chat tab. Same chrome and footprint as
// the events/profile panels; the body is a two-section inbox — Replies (event
// applications) over Inbound (cold campaign conversations) — and clicking a row
// swaps the whole body for the standard messenger thread.
export function VenueChatMapPanel() {
	const [activeSection, setActiveSection] = useState<'replies' | 'inbound'>('replies');
	// An open thread view: the pair conversation plus which slice of it — an
	// application's thread (Replies row) or the general thread (Inbound row).
	const [selectedThread, setSelectedThread] = useState<{
		conversationId: number;
		thread: ConversationThreadFilter;
	} | null>(null);
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
		`flex h-[24px] items-center rounded-[6px] border border-black px-[16px] font-inter text-[13px] font-semibold leading-none ${
			active ? `${activeBackground} text-black` : 'bg-white/60 text-black/50'
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
				{/* Replies | Inbound segmented control on the green band. */}
				<div className="absolute left-[8px] top-[3px] z-10 flex items-center gap-[6px]">
					<button
						type="button"
						aria-pressed={activeSection === 'replies'}
						onClick={() => handleSegmentClick('replies')}
						className={segmentClassName(activeSection === 'replies', 'bg-[#D8D2FF]')}
					>
						Replies
					</button>
					<button
						type="button"
						aria-pressed={activeSection === 'inbound'}
						onClick={() => handleSegmentClick('inbound')}
						className={segmentClassName(activeSection === 'inbound', 'bg-white')}
					>
						Inbound
					</button>
				</div>
				<div className="absolute left-0 right-0 top-[30px] h-[2px] bg-black" />

				{selectedThread != null ? (
					// Open thread replaces both sections below the green header.
					<div className="absolute inset-x-0 bottom-0 top-[32px] bg-[linear-gradient(180deg,#BBD4F7_0%,#FFF_100%)]">
						<ConversationThread
							conversationId={selectedThread.conversationId}
							thread={selectedThread.thread}
							onBack={() => setSelectedThread(null)}
							className="h-full bg-transparent"
						/>
					</div>
				) : (
					<div className="absolute inset-x-0 bottom-0 top-[32px] flex flex-col">
						{/* ── Replies: applications to my events ── */}
						<div
							className={`shrink-0 bg-[linear-gradient(180deg,#D1CEFF_0%,#FFF_100%)] transition-[height] duration-200 ${
								activeSection === 'replies' ? 'h-[380px]' : 'h-[190px]'
							}`}
						>
							<div className="h-full overflow-y-auto">
								{repliesLoading && <SectionNotice>Loading…</SectionNotice>}
								{!repliesLoading && replyGroups.length === 0 && (
									<SectionNotice>No applications yet.</SectionNotice>
								)}
								{replyGroups.map((group, groupIndex) => (
									<div key={group.eventId}>
										{groupIndex > 0 && <div className="h-[8px] bg-white/40" />}
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
							className="flex h-[30px] shrink-0 items-center bg-[#9DBFF0] px-[18px] font-inter text-[14px] font-semibold text-black"
						>
							Inbound
						</button>
						{/* ── Inbound: cold campaign conversations ── */}
						<div className="min-h-0 flex-1 bg-[linear-gradient(180deg,#BBD4F7_0%,#FFF_100%)]">
							<div className="h-full overflow-y-auto">
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
