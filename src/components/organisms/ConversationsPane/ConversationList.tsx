'use client';

import { cn } from '@/utils/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { formatInboxTimestamp } from '@/utils/datetime';
import type { ConversationListItem } from '@/types';

interface ConversationListProps {
	conversations: ConversationListItem[];
	selectedId: number | null;
	onSelect: (id: number) => void;
	isLoading?: boolean;
	className?: string;
}

export function ConversationList({
	conversations,
	selectedId,
	onSelect,
	isLoading,
	className,
}: ConversationListProps) {
	return (
		<CustomScrollbar className={cn('h-full', className)} contentClassName="p-[8px]">
			<div className="flex flex-col gap-[6px]">
				{isLoading && (
					<div className="px-[8px] py-[6px] text-[13px] text-black/40">Loading…</div>
				)}
				{!isLoading && conversations.length === 0 && (
					<div className="px-[8px] py-[12px] text-center text-[13px] text-black/40">
						No messages yet.
					</div>
				)}
				{conversations.map((conversation) => {
					const selected = conversation.id === selectedId;
					const initial =
						conversation.counterpart.name?.trim()[0]?.toUpperCase() || '?';
					return (
						<button
							key={conversation.id}
							type="button"
							onClick={() => onSelect(conversation.id)}
							className={cn(
								'flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left transition-colors',
								selected ? 'bg-[#E6E6E6]' : 'bg-[#F2F2F2] hover:bg-[#EDEDED]'
							)}
						>
							<OutlinedInitialAvatar
								initial={initial}
								className="h-[34px] w-[34px] shrink-0"
							/>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-[8px]">
									<span className="min-w-0 truncate font-inter text-[14px] font-semibold text-black">
										{conversation.counterpart.name}
									</span>
									<span className="shrink-0 text-[12px] text-black/50">
										{formatInboxTimestamp(conversation.lastMessageAt)}
									</span>
								</div>
								<div className="mt-[2px] flex items-center justify-between gap-[8px]">
									<span className="min-w-0 truncate font-inter text-[13px] text-black/55">
										{conversation.lastMessagePreview || 'No messages yet'}
									</span>
									{conversation.unreadCount > 0 && (
										<span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#2F6FED] px-[5px] text-[11px] font-semibold text-white">
											{conversation.unreadCount}
										</span>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</CustomScrollbar>
	);
}
