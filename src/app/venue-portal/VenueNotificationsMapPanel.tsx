'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Event as VenueEvent } from '@prisma/client';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { getProfileGenreIcon } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import type { ConversationThreadFilter } from '@/hooks/queryHooks/useConversations';
import type { VenueApplicationRow } from '@/hooks/queryHooks/useVenueApplications';
import { formatInboxTimestamp } from '@/utils/datetime';
import type { ConversationListItem } from '@/types';
import { CardPill } from './VenueChatMapPanel';
import { VENUE_MAP_LEFT_CLUSTER_SCALE } from './constants';
import { formatVenueOpportunityDate } from './venueOpportunityFormat';

// One inbox item eligible for the notification card: a general (cold-outreach)
// conversation or an application thread, normalized to the fields the card shows.
type NotificationCandidate = {
	name: string;
	genre: string | null;
	area: string | null;
	preview: string;
	lastMessageAt: string;
	unreadCount: number;
	conversationId: number;
	thread: ConversationThreadFilter;
};

// "+23" / "+07" — zero-padded to two digits like the Figma badges.
const formatEventApplicantBadge = (count: number) =>
	`+${String(count).padStart(2, '0')}`;

// Top-right notifications cluster for the map view: a stacked card surfacing the
// newest inbound message (red badge = total unread, shared with the mail pill)
// over a "Your Events" digest with per-event applicant counts. Mirrors the left
// cluster's fixed-corner + 0.7-scale convention; the chevron slides it off the
// right edge, leaving a tab to bring it back.
export function VenueNotificationsMapPanel({
	conversations,
	applications,
	totalUnread,
	opportunities,
	applicantCountByEventId,
	onOpenThread,
	onOpenEvent,
}: {
	conversations: ConversationListItem[] | undefined;
	applications: VenueApplicationRow[] | undefined;
	totalUnread: number;
	opportunities: VenueEvent[];
	applicantCountByEventId: Map<number, number>;
	onOpenThread: (conversationId: number, thread: ConversationThreadFilter) => void;
	onOpenEvent: (eventId: number) => void;
}) {
	const [collapsed, setCollapsed] = useState(false);

	// Newest unread inbound message across both inbox sections (falling back to
	// newest overall when everything is read). General conversations use the same
	// has-general-content filter as the chat panel's Inbound list; application
	// rows without a conversation have no messages yet and contribute nothing to
	// the unread total, so they're skipped.
	const newest = useMemo(() => {
		const candidates: NotificationCandidate[] = [];
		for (const conversation of conversations ?? []) {
			if (!conversation.hasDivertOrigin && conversation.lastMessagePreview === '') {
				continue;
			}
			candidates.push({
				name: conversation.counterpart.name,
				genre: conversation.counterpart.genre ?? null,
				area: conversation.counterpart.area ?? null,
				preview: conversation.lastMessagePreview || 'No messages yet',
				lastMessageAt: conversation.lastMessageAt,
				unreadCount: conversation.unreadCount,
				conversationId: conversation.id,
				thread: 'general',
			});
		}
		for (const row of applications ?? []) {
			if (row.conversation == null) continue;
			candidates.push({
				name: row.applicantName,
				genre: row.genre,
				area: row.area,
				preview: row.conversation.lastMessagePreview || row.applicationPreview,
				lastMessageAt: row.conversation.lastMessageAt,
				unreadCount: row.conversation.unreadCount,
				conversationId: row.conversation.id,
				thread: row.id,
			});
		}
		if (candidates.length === 0) return null;
		const unread = candidates.filter((candidate) => candidate.unreadCount > 0);
		const pool = unread.length > 0 ? unread : candidates;
		return pool.reduce((latest, candidate) =>
			Date.parse(candidate.lastMessageAt) > Date.parse(latest.lastMessageAt)
				? candidate
				: latest
		);
	}, [conversations, applications]);

	const GenreIcon = newest ? getProfileGenreIcon(newest.genre) : null;

	return (
		<>
			{/* The slide translate lives on the tagged wrapper so its bounding rect
			    (which the tool-dismiss allowlist reads) moves off screen with it. */}
			<div
				data-venue-tool-ui="true"
				aria-hidden={collapsed}
				className={`fixed right-[24px] top-[56px] z-[100] origin-top-right transition-transform duration-300 ${
					collapsed ? 'pointer-events-none' : ''
				}`}
				style={{
					transform: collapsed
						? `scale(${VENUE_MAP_LEFT_CLUSTER_SCALE}) translateX(calc(100% + 60px))`
						: `scale(${VENUE_MAP_LEFT_CLUSTER_SCALE})`,
				}}
			>
				<div className="flex h-[682px] w-[431px] flex-col rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.63)_0%,rgba(255,255,255,0.00)_100%)] px-[18px] pb-[18px] pt-[12px]">
					<div className="flex items-center justify-between">
						<span className="font-inter text-[17px] font-bold text-black">
							Notifications
						</span>
						<button
							type="button"
							aria-label="Hide notifications"
							onClick={() => setCollapsed(true)}
							className="flex h-[28px] w-[28px] items-center justify-center text-black transition hover:opacity-60"
						>
							<ChevronRight className="h-[20px] w-[20px]" strokeWidth={2.5} />
						</button>
					</div>
					{newest && (
						<div className="relative mb-[30px] mt-[24px]">
							{/* Decorative under-card layers, deepest first; the card in flow
							    paints over them so only their bottom edges peek out. */}
							<div
								aria-hidden="true"
								className="absolute inset-x-[22px] -bottom-[14px] h-[24px] rounded-[10px] border-[2px] border-black bg-white"
							/>
							<div
								aria-hidden="true"
								className="absolute inset-x-[11px] -bottom-[7px] h-[24px] rounded-[10px] border-[2px] border-black bg-white"
							/>
							<button
								type="button"
								onClick={() => onOpenThread(newest.conversationId, newest.thread)}
								aria-label={`Open conversation with ${newest.name}`}
								className="relative flex w-full cursor-pointer flex-col gap-[8px] rounded-[12px] border-[2px] border-black bg-white px-[14px] py-[12px] text-left"
							>
								<span className="flex w-full items-center gap-[8px]">
									<OutlinedInitialAvatar
										initial={newest.name.trim()[0]?.toUpperCase() || '?'}
										className="h-[28px] w-[28px] shrink-0 border-black text-[13px] text-black"
									/>
									<span className="min-w-0 truncate font-inter text-[16px] font-bold text-black">
										{newest.name}
									</span>
									<span className="ml-auto shrink-0 font-inter text-[12px] leading-none text-black/50">
										{formatInboxTimestamp(newest.lastMessageAt)}
									</span>
								</span>
								{(newest.genre || newest.area) && (
									<span className="flex w-full min-w-0 items-center gap-[6px]">
										{newest.genre && (
											<CardPill
												icon={
													GenreIcon && (
														<GenreIcon
															aria-hidden="true"
															className="h-[12px] w-[12px] shrink-0"
														/>
													)
												}
												label={newest.genre}
											/>
										)}
										{newest.area && (
											<CardPill
												icon={
													<ProfileAreaMarkerIcon
														aria-hidden="true"
														className="h-[12px] w-[10px] shrink-0"
													/>
												}
												label={newest.area}
											/>
										)}
									</span>
								)}
								<span className="w-full min-w-0 truncate font-inter text-[13px] leading-none text-black/70">
									{newest.preview}
								</span>
							</button>
							{totalUnread > 0 && (
								<span className="absolute -left-[13px] -top-[13px] z-10 flex h-[38px] min-w-[38px] items-center justify-center rounded-full border-[2px] border-black bg-[#FF5C5C] px-[8px] font-inter text-[15px] font-bold leading-none text-white">
									{totalUnread > 99 ? '99+' : totalUnread}
								</span>
							)}
						</div>
					)}
					<div
						className={`flex min-h-0 flex-col rounded-[12px] border-[2px] border-black/40 bg-white/40 p-[12px] ${
							newest ? '' : 'mt-[24px]'
						}`}
					>
						<div className="mb-[10px] font-inter text-[16px] font-bold text-black">
							Your Events
						</div>
						<div className="flex min-h-0 flex-col gap-[10px] overflow-y-auto">
							{opportunities.length === 0 ? (
								<div className="py-[12px] text-center font-inter text-[13px] text-black/40">
									No events yet.
								</div>
							) : (
								opportunities.map((event) => (
									<button
										key={event.id}
										type="button"
										onClick={() => onOpenEvent(event.id)}
										aria-label={`View ${event.name}`}
										className="flex h-[46px] w-full shrink-0 cursor-pointer items-center gap-[12px] rounded-[12px] border-[2px] border-black bg-[#F1FBE9] px-[14px] text-left"
									>
										<span className="min-w-0 flex-1 truncate font-inter text-[16px] font-semibold leading-none text-black">
											{event.name}
										</span>
										<span className="shrink-0 font-inter text-[14px] leading-none text-black/50">
											{formatVenueOpportunityDate(event.whenLabel, event.startsAt)}
										</span>
										<span className="flex h-[24px] min-w-[48px] shrink-0 items-center justify-center rounded-full border-[2px] border-black bg-[#C9F299] px-[8px] font-inter text-[13px] font-bold leading-none text-black">
											{formatEventApplicantBadge(
												applicantCountByEventId.get(event.id) ?? 0
											)}
										</span>
									</button>
								))
							)}
						</div>
					</div>
				</div>
			</div>
			{collapsed && (
				<button
					type="button"
					data-venue-tool-ui="true"
					aria-label="Show notifications"
					onClick={() => setCollapsed(false)}
					className="fixed right-0 top-[56px] z-[100] flex h-[44px] w-[26px] items-center justify-center rounded-l-[10px] border-[2px] border-r-0 border-black bg-white text-black"
				>
					<ChevronLeft className="h-[16px] w-[16px]" strokeWidth={2.5} />
				</button>
			)}
		</>
	);
}
