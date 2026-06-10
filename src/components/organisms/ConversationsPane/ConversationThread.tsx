'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	useGetMessages,
	useMarkConversationRead,
	useSendReply,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import type { ConversationCounterpart } from '@/types';
import { MessageBubble, type ConversationThreadVariant } from './MessageBubble';

interface ConversationThreadProps {
	conversationId: number;
	// Which slice of the conversation to show: 'general' = cold-outreach thread,
	// a number = that application's thread, omitted = merged (artist messenger).
	// Replies and read-marks stay within the same slice.
	thread?: ConversationThreadFilter;
	onBack?: () => void;
	variant?: ConversationThreadVariant;
	// Skip the counterpart header — for hosts (e.g. the mobile venue thread
	// screen) that render their own richer header above the thread.
	hideHeader?: boolean;
	className?: string;
}

function CounterpartHeader({
	counterpart,
	onBack,
	variant,
}: {
	counterpart?: ConversationCounterpart;
	onBack?: () => void;
	variant: ConversationThreadVariant;
}) {
	if (variant === 'venueMap') {
		// Figma restyle: grey bar with only the bold counterpart name — no back
		// chevron (the panel's segment buttons return to the list), no pills.
		return (
			<div className="flex h-[40px] shrink-0 items-center border-b border-black bg-[#EFEFEF] px-[14px]">
				{counterpart && (
					<span className="min-w-0 truncate font-inter text-[16px] font-bold text-black">
						{counterpart.name}
					</span>
				)}
			</div>
		);
	}
	if (!counterpart) return <div className="h-[45px] border-b border-black/10" />;
	const { name, isVenue, businessType, city, state } = counterpart;
	return (
		<div className="flex items-center gap-[10px] border-b border-black/10 px-[14px] py-[10px]">
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					aria-label="Back"
					className="shrink-0 text-[20px] leading-none text-black/50"
				>
					‹
				</button>
			)}
			<span className="min-w-0 truncate font-inter text-[16px] font-bold text-black">
				{name}
			</span>
			{(state || city) && (
				<span className="flex shrink-0 items-center gap-[6px] rounded-[6px] bg-[#FBD6D7] px-[8px] py-[3px] font-inter text-[12px] font-medium text-black">
					<span className="rounded-[5px] bg-[#F7B6B8] px-[5px] py-[1px] font-semibold">
						{state || city}
					</span>
					{state && city ? city : null}
				</span>
			)}
			{isVenue && businessType && (
				<span className="shrink-0 rounded-[6px] bg-[#BBE6FF] px-[10px] py-[3px] font-inter text-[12px] font-medium text-black">
					{businessType}
				</span>
			)}
		</div>
	);
}

export function ConversationThread({
	conversationId,
	thread,
	onBack,
	variant = 'default',
	hideHeader = false,
	className,
}: ConversationThreadProps) {
	const { data, isLoading } = useGetMessages(conversationId, { thread });
	const sendReply = useSendReply(conversationId, data?.currentUserRole, {}, thread);
	const markRead = useMarkConversationRead();
	const [draft, setDraft] = useState('');
	const bottomRef = useRef<HTMLDivElement>(null);

	const counterpartInitial = useMemo(
		() => data?.counterpart.name?.trim()[0]?.toUpperCase() || '?',
		[data?.counterpart.name]
	);

	const messageCount = data?.items.length ?? 0;

	// Id of the newest message authored by the OTHER side. Drives mark-read so we
	// don't re-POST on our own (optimistic) sends or on every 10s poll tick.
	const latestCounterpartMessageId = useMemo(() => {
		if (!data) return null;
		for (let i = data.items.length - 1; i >= 0; i--) {
			if (data.items[i].sender !== data.currentUserRole) return data.items[i].id;
		}
		return null;
	}, [data]);

	// Mark read on open and when a new counterpart message arrives while open.
	useEffect(() => {
		markRead.mutate({
			conversationId,
			applicationId: typeof thread === 'number' ? thread : undefined,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, thread, latestCounterpartMessageId]);

	// Keep the latest message in view (including our own sends).
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'end' });
	}, [messageCount]);

	const handleSend = () => {
		const body = draft.trim();
		if (!body || sendReply.isPending) return;
		setDraft('');
		sendReply.mutate(body);
	};

	// Shared input/button elements; the footer chrome around them differs per
	// variant (default = bordered row, venueMap = single black-bordered capsule).
	const input = (
		<input
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault();
					handleSend();
				}
			}}
			placeholder="Type a message…"
			className={
				variant === 'venueMap'
					? 'h-[30px] min-w-0 flex-1 bg-transparent font-inter text-[14px] text-black outline-none'
					: 'h-[36px] flex-1 rounded-[18px] border border-black/15 bg-white px-[14px] font-inter text-[14px] outline-none'
			}
		/>
	);
	const replyButton = (
		<button
			type="button"
			onClick={handleSend}
			disabled={!draft.trim() || sendReply.isPending}
			className={
				variant === 'venueMap'
					? 'h-[30px] shrink-0 rounded-full border border-black bg-[#ACD2FF] px-[18px] font-inter text-[14px] font-semibold text-black transition-opacity disabled:opacity-50'
					: 'h-[36px] shrink-0 rounded-[18px] bg-[#2F6FED] px-[18px] font-inter text-[14px] font-semibold text-white transition-opacity disabled:opacity-50'
			}
		>
			Reply
		</button>
	);

	return (
		<div className={cn('flex h-full flex-col bg-white/70', className)}>
			{!hideHeader && (
				<CounterpartHeader
					counterpart={data?.counterpart}
					onBack={onBack}
					variant={variant}
				/>
			)}
			<CustomScrollbar className="min-h-0 flex-1" contentClassName="px-[14px] py-[12px]">
				<div className="flex flex-col gap-[8px]">
					{isLoading && (
						<div className="py-[8px] text-center text-[13px] text-black/40">Loading…</div>
					)}
					{!isLoading && messageCount === 0 && (
						<div className="py-[8px] text-center text-[13px] text-black/40">
							No messages yet.
						</div>
					)}
					{data?.items.map((message) => (
						<MessageBubble
							key={message.id}
							message={message}
							currentUserRole={data.currentUserRole}
							counterpartInitial={counterpartInitial}
							variant={variant}
						/>
					))}
					<div ref={bottomRef} />
				</div>
			</CustomScrollbar>
			{variant === 'venueMap' ? (
				<div className="px-[12px] py-[10px]">
					<div className="flex items-center gap-[8px] rounded-full border border-black bg-white py-[4px] pl-[16px] pr-[5px]">
						{input}
						{replyButton}
					</div>
				</div>
			) : (
				<div className="flex items-center gap-[8px] border-t border-black/10 px-[12px] py-[10px]">
					{input}
					{replyButton}
				</div>
			)}
		</div>
	);
}
