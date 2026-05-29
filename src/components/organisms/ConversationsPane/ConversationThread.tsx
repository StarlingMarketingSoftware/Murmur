'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	useGetMessages,
	useMarkConversationRead,
	useSendReply,
} from '@/hooks/queryHooks/useConversations';
import type { ConversationCounterpart } from '@/types';
import { MessageBubble } from './MessageBubble';

interface ConversationThreadProps {
	conversationId: number;
	onBack?: () => void;
	className?: string;
}

function CounterpartHeader({
	counterpart,
	onBack,
}: {
	counterpart?: ConversationCounterpart;
	onBack?: () => void;
}) {
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
	onBack,
	className,
}: ConversationThreadProps) {
	const { data, isLoading } = useGetMessages(conversationId);
	const sendReply = useSendReply(conversationId, data?.currentUserRole);
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
		markRead.mutate(conversationId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, latestCounterpartMessageId]);

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

	return (
		<div className={cn('flex h-full flex-col bg-white/70', className)}>
			<CounterpartHeader counterpart={data?.counterpart} onBack={onBack} />
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
						/>
					))}
					<div ref={bottomRef} />
				</div>
			</CustomScrollbar>
			<div className="flex items-center gap-[8px] border-t border-black/10 px-[12px] py-[10px]">
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
					className="h-[36px] flex-1 rounded-[18px] border border-black/15 bg-white px-[14px] font-inter text-[14px] outline-none"
				/>
				<button
					type="button"
					onClick={handleSend}
					disabled={!draft.trim() || sendReply.isPending}
					className="h-[36px] shrink-0 rounded-[18px] bg-[#2F6FED] px-[18px] font-inter text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
				>
					Reply
				</button>
			</div>
		</div>
	);
}
