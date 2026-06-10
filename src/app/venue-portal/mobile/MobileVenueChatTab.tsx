'use client';

import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { type ConversationThreadFilter } from '@/hooks/queryHooks/useConversations';
import { type VenueApplicationRow } from '@/hooks/queryHooks/useVenueApplications';
import { formatEventCountdown, formatInboxTimestamp } from '@/utils/datetime';
import type { ConversationListItem } from '@/types';
import {
	EVENT_PILL_COLORS,
	replyRowActivity,
	useVenueChatInbox,
} from '../useVenueChatInbox';
import { MobileVenueChatThread } from './MobileVenueChatThread';

type ChatSection = 'replies' | 'inbound';

type OpenThread = {
	conversationId: number;
	thread: ConversationThreadFilter;
	title: string;
	eventChip: { label: string; color: string; countdown: string } | null;
};

function SectionNotice({ children }: { children: ReactNode }) {
	return (
		<div className="px-[18px] py-[14px] text-center font-inter text-[13px] text-black/40">
			{children}
		</div>
	);
}

// One applicant row in the Replies section, two-tiered for the narrow screen:
// name + event pill + time over the message snippet. Tapping opens (seeding it
// first if needed) the application's thread.
function MobileReplyRow({
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
	const unread = (row.conversation?.unreadCount ?? 0) > 0;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={pending}
			className={`flex min-h-[64px] w-full flex-col justify-center gap-[4px] bg-white px-[16px] py-[8px] text-left ${
				pending ? 'opacity-60' : ''
			}`}
		>
			<span className="flex w-full items-center gap-[8px]">
				{unread && (
					<span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2F6FED]" />
				)}
				<span className="min-w-0 flex-1 truncate font-inter text-[16px] font-semibold text-black">
					{row.applicantName}
				</span>
				<span
					className="flex h-[22px] shrink-0 items-center gap-[6px] rounded-[5px] px-[8px]"
					style={{ backgroundColor: pillColor }}
				>
					<span className="max-w-[110px] truncate font-inter text-[12px] font-medium leading-none text-black">
						{row.event?.name ?? 'Event'}
					</span>
					<span className="shrink-0 font-inter text-[12px] leading-none text-black">
						{formatEventCountdown(row.event?.startsAt)}
					</span>
				</span>
				<span className="shrink-0 font-inter text-[12px] text-black/60">
					{formatInboxTimestamp(replyRowActivity(row))}
				</span>
			</span>
			<span className="w-full truncate font-inter text-[13px] text-black/70">
				{row.conversation?.lastMessagePreview || row.applicationPreview}
			</span>
		</button>
	);
}

// One cold-campaign conversation row in the Inbound section: name + time over
// the campaign subject and preview. Tapping opens the GENERAL thread.
function MobileInboundRow({
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
			className="flex min-h-[64px] w-full flex-col justify-center gap-[4px] bg-[#DCEAFB] px-[16px] py-[8px] text-left"
		>
			<span className="flex w-full items-center gap-[8px]">
				{conversation.unreadCount > 0 && (
					<span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2F6FED]" />
				)}
				<span className="min-w-0 flex-1 truncate font-inter text-[16px] font-semibold text-black">
					{conversation.counterpart.name}
				</span>
				<span className="shrink-0 font-inter text-[12px] text-black/60">
					{formatInboxTimestamp(conversation.lastMessageAt)}
				</span>
			</span>
			{conversation.subject && (
				<span className="w-full truncate font-inter text-[12px] font-medium text-black">
					{conversation.subject}
				</span>
			)}
			<span className="w-full truncate font-inter text-[13px] text-black/70">
				{conversation.lastMessagePreview || 'No messages yet'}
			</span>
		</button>
	);
}

// The mobile Chat tab: a single-column inbox — Replies (event applications)
// and Inbound (cold campaign conversations) toggled by the segmented control
// or the in-list header bands — and tapping a row swaps the whole screen for
// the open thread (MobileVenueChatThread). Same data/grouping semantics as the
// desktop VenueChatMapPanel via the shared useVenueChatInbox hook.
export function MobileVenueChatTab() {
	const [activeSection, setActiveSection] = useState<ChatSection>('replies');
	const [openThread, setOpenThread] = useState<OpenThread | null>(null);
	const inbox = useVenueChatInbox();

	const selectSection = (section: ChatSection) => {
		inbox.cancelOpenIntent();
		setActiveSection(section);
	};

	const handleReplyRowClick = (row: VenueApplicationRow, pillColor: string) => {
		inbox.openReplyRow(row, (conversationId, thread) =>
			setOpenThread({
				conversationId,
				thread,
				title: row.applicantName,
				eventChip: {
					label: row.event?.name ?? 'Event',
					color: pillColor,
					countdown: formatEventCountdown(row.event?.startsAt),
				},
			})
		);
	};

	if (openThread != null) {
		return <MobileVenueChatThread {...openThread} onBack={() => setOpenThread(null)} />;
	}

	const sectionHeaderBand = (section: ChatSection, label: string) => (
		<button
			type="button"
			onClick={() => selectSection(section)}
			className="flex h-[34px] w-full shrink-0 items-center bg-[#BBD4F7] px-[16px] font-inter text-[15px] font-semibold text-black"
		>
			{label}
		</button>
	);

	const repliesRows = (
		<>
			{inbox.repliesLoading && <SectionNotice>Loading…</SectionNotice>}
			{!inbox.repliesLoading && inbox.replyGroups.length === 0 && (
				<SectionNotice>No applications yet.</SectionNotice>
			)}
			{inbox.replyGroups.map((group, groupIndex) => (
				<Fragment key={group.eventId}>
					{groupIndex > 0 && <div className="h-[6px] w-full shrink-0 bg-[#BCE2FF]" />}
					{group.rows.map((row) => (
						<MobileReplyRow
							key={row.id}
							row={row}
							pillColor={EVENT_PILL_COLORS[groupIndex % EVENT_PILL_COLORS.length]}
							pending={inbox.pendingApplicationId === row.id}
							onClick={() =>
								handleReplyRowClick(
									row,
									EVENT_PILL_COLORS[groupIndex % EVENT_PILL_COLORS.length]
								)
							}
						/>
					))}
				</Fragment>
			))}
		</>
	);

	const inboundRows = (
		<>
			{inbox.conversationsLoading && <SectionNotice>Loading…</SectionNotice>}
			{!inbox.conversationsLoading && inbox.inboundConversations.length === 0 && (
				<SectionNotice>No inbound messages yet.</SectionNotice>
			)}
			{inbox.inboundConversations.map((conversation) => (
				<MobileInboundRow
					key={conversation.id}
					conversation={conversation}
					onClick={() =>
						setOpenThread({
							conversationId: conversation.id,
							thread: 'general',
							title: conversation.counterpart.name,
							eventChip: null,
						})
					}
				/>
			))}
		</>
	);

	return (
		<div className="flex h-full flex-col">
			{/* Green band carrying the Replies | Inbound segmented control. */}
			<div
				className="shrink-0"
				style={{
					background: 'linear-gradient(180deg, #C1F7BB 0%, #60AE92 100%)',
					padding: '10px 12px',
				}}
			>
				<div className="flex w-fit overflow-hidden rounded-[8px] border border-black/20">
					<button
						type="button"
						aria-pressed={activeSection === 'replies'}
						onClick={() => selectSection('replies')}
						className={`flex h-[40px] items-center px-[18px] font-inter text-[15px] font-semibold text-black ${
							activeSection === 'replies' ? 'bg-[#DBDAFE]' : 'bg-white'
						}`}
					>
						Replies
					</button>
					<button
						type="button"
						aria-pressed={activeSection === 'inbound'}
						onClick={() => selectSection('inbound')}
						className={`flex h-[40px] items-center px-[18px] font-inter text-[15px] font-semibold text-black ${
							activeSection === 'inbound' ? 'bg-[#BCE2FF]' : 'bg-white'
						}`}
					>
						Inbound
					</button>
				</div>
			</div>
			{/* One scroll column: the active section expanded, the other collapsed
			    to its tappable header band (desktop's stacked-sections semantics). */}
			<div
				className="min-h-0 flex-1 overflow-y-auto"
				style={{
					overscrollBehavior: 'contain',
					WebkitOverflowScrolling: 'touch',
					paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
				}}
			>
				{activeSection === 'replies' ? (
					<>
						{repliesRows}
						{sectionHeaderBand('inbound', 'Inbound')}
						{inboundRows}
					</>
				) : (
					<>
						{sectionHeaderBand('replies', 'Replies')}
						{inboundRows}
					</>
				)}
			</div>
		</div>
	);
}
