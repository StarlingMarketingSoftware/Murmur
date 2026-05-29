'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils/ui';
import { useGetConversations } from '@/hooks/queryHooks/useConversations';
import { ConversationList } from './ConversationList';
import { ConversationThread } from './ConversationThread';

interface ConversationsPaneProps {
	// split  = list (left) + thread (right), email-client style (venue big box).
	// stacked = list, then thread replaces it in-frame (small dashboard widget).
	layout?: 'split' | 'stacked';
	className?: string;
}

export function ConversationsPane({ layout = 'split', className }: ConversationsPaneProps) {
	const { data: conversations, isLoading } = useGetConversations({ enabled: true });
	const [selectedId, setSelectedId] = useState<number | null>(null);

	// In split layout, open the most recent conversation by default.
	useEffect(() => {
		if (
			layout === 'split' &&
			selectedId == null &&
			conversations &&
			conversations.length > 0
		) {
			setSelectedId(conversations[0].id);
		}
	}, [layout, selectedId, conversations]);

	const list = (
		<ConversationList
			conversations={conversations ?? []}
			selectedId={selectedId}
			onSelect={setSelectedId}
			isLoading={isLoading}
		/>
	);

	if (layout === 'stacked') {
		return (
			<div className={cn('h-full w-full', className)}>
				{selectedId == null ? (
					list
				) : (
					<ConversationThread
						conversationId={selectedId}
						onBack={() => setSelectedId(null)}
					/>
				)}
			</div>
		);
	}

	return (
		<div className={cn('flex h-full w-full', className)}>
			<div className="h-full w-[38%] min-w-[200px] max-w-[280px] border-r border-black/10">
				{list}
			</div>
			<div className="h-full min-w-0 flex-1">
				{selectedId == null ? (
					<div className="flex h-full items-center justify-center px-[20px] text-center text-[13px] text-black/40">
						Select a conversation
					</div>
				) : (
					<ConversationThread conversationId={selectedId} />
				)}
			</div>
		</div>
	);
}
