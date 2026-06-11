'use client';

import { useMemo, useRef, useState } from 'react';
import {
	useGetConversations,
	useOpenApplicationConversation,
} from '@/hooks/queryHooks/useConversations';
import {
	useGetVenueApplications,
	type VenueApplicationRow,
} from '@/hooks/queryHooks/useVenueApplications';

// Per-event pill tint, cycling in list order like the Figma mock.
export const EVENT_PILL_COLORS = ['#BCC4FF', '#BCE2FF'];

export type ReplyGroup = {
	eventId: number;
	rows: VenueApplicationRow[];
};

export const replyRowActivity = (row: VenueApplicationRow) =>
	row.conversation?.lastMessageAt ?? row.createdAt;

// The venue inbox's data + open-row flow, shared by the desktop chat panel and
// the mobile chat tab so the grouping/filtering/seeding semantics can't drift.
export function useVenueChatInbox() {
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

	// Group applications by event; newest activity first within each event, and
	// groups ordered by their own newest activity so the most recent reply is
	// always the top row of the list.
	const replyGroups = useMemo(() => {
		const byEvent = new Map<number, ReplyGroup>();
		for (const row of applications ?? []) {
			const group = byEvent.get(row.eventId) ?? { eventId: row.eventId, rows: [] };
			group.rows.push(row);
			byEvent.set(row.eventId, group);
		}
		const groups = [...byEvent.values()];
		for (const group of groups) {
			group.rows.sort(
				(a, b) => Date.parse(replyRowActivity(b)) - Date.parse(replyRowActivity(a))
			);
		}
		groups.sort(
			(a, b) =>
				Date.parse(replyRowActivity(b.rows[0])) - Date.parse(replyRowActivity(a.rows[0]))
		);
		return groups;
	}, [applications]);

	// Plain-recency order for rail/list views that carry no event pill, where the
	// by-event grouping would read as arbitrary interleaving.
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

	// Call on any navigation away from a pending open (segment switch, manual
	// thread open) so a slow seed response can't yank the view.
	const cancelOpenIntent = () => {
		openIntentRef.current = null;
	};

	// Opens a Replies row: existing conversations open immediately (with an
	// idempotent background seed-ensure — the pair conversation may predate the
	// application via cold outreach); conversationless rows seed first and call
	// onOpen only if the user hasn't navigated away meanwhile.
	const openReplyRow = (
		row: VenueApplicationRow,
		onOpen: (conversationId: number, thread: number) => void
	) => {
		if (row.conversation != null) {
			openIntentRef.current = null;
			onOpen(row.conversation.id, row.id);
			ensureApplicationSeed.mutate(row.id);
			return;
		}
		if (pendingApplicationId != null) return;
		setPendingApplicationId(row.id);
		openIntentRef.current = row.id;
		openApplication.mutate(row.id, {
			onSuccess: ({ conversationId }) => {
				if (openIntentRef.current === row.id) {
					openIntentRef.current = null;
					onOpen(conversationId, row.id);
				}
			},
			onSettled: () => setPendingApplicationId(null),
		});
	};

	return {
		replyGroups,
		flatReplies,
		inboundConversations,
		repliesLoading,
		conversationsLoading,
		pendingApplicationId,
		openReplyRow,
		cancelOpenIntent,
		ensureApplicationSeed,
	};
}
