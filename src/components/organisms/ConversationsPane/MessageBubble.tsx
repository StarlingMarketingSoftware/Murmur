import { cn } from '@/utils/ui';
import { sanitizeMessageHtml } from '@/utils/sanitizeMessageHtml';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import type { MessageSenderRole, SerializedMessage } from '@/types';

interface MessageBubbleProps {
	message: SerializedMessage;
	currentUserRole: MessageSenderRole;
	counterpartInitial: string;
}

export function MessageBubble({
	message,
	currentUserRole,
	counterpartInitial,
}: MessageBubbleProps) {
	const isOutgoing = message.sender === currentUserRole;
	const pending = message.id < 0; // optimistic temp id

	return (
		<div
			className={cn(
				'flex w-full items-end gap-[8px]',
				isOutgoing ? 'justify-end' : 'justify-start'
			)}
		>
			{!isOutgoing && (
				<OutlinedInitialAvatar
					initial={counterpartInitial}
					className="h-[28px] w-[28px] shrink-0 text-[14px]"
				/>
			)}
			<div
				className={cn(
					'max-w-[78%] break-words rounded-[16px] px-[14px] py-[10px] text-[14px] leading-[20px]',
					isOutgoing
						? 'bg-[#2F6FED] text-white'
						: 'border border-black/10 bg-white text-black',
					pending && 'opacity-60'
				)}
			>
				{message.isHtml ? (
					<div
						className="[&_a]:underline [&_p]:mb-[6px] last:[&_p]:mb-0"
						dangerouslySetInnerHTML={{ __html: sanitizeMessageHtml(message.body) }}
					/>
				) : (
					<span className="whitespace-pre-wrap">{message.body}</span>
				)}
			</div>
		</div>
	);
}
