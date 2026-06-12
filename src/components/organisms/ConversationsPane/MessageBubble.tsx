import { cn } from '@/utils/ui';
import { sanitizeMessageHtml } from '@/utils/sanitizeMessageHtml';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import type { MessageSenderRole, SerializedMessage } from '@/types';

// 'venueMap' = the venue portal's floating chat panel (Figma restyle: black-bordered
// white/#ACD2FF bubbles). 'default' = the original messenger look.
export type ConversationThreadVariant = 'default' | 'venueMap';

interface MessageBubbleProps {
	message: SerializedMessage;
	currentUserRole: MessageSenderRole;
	counterpartInitial: string;
	variant?: ConversationThreadVariant;
}

const BUBBLE_CLASSES: Record<
	ConversationThreadVariant,
	{ base: string; outgoing: string; incoming: string }
> = {
	default: {
		base: 'max-w-[78%] break-words rounded-[16px] px-[14px] py-[10px] text-[14px] leading-[20px]',
		outgoing: 'bg-[#2F6FED] text-white',
		incoming: 'border border-black/10 bg-white text-black',
	},
	venueMap: {
		base: 'max-w-[78%] break-words rounded-[18px] border border-black px-[14px] py-[8px] font-inter text-[15.381px] leading-[25.875px] text-black',
		outgoing: 'bg-[#ACD2FF]',
		incoming: 'bg-white',
	},
};

export function MessageBubble({
	message,
	currentUserRole,
	counterpartInitial,
	variant = 'default',
}: MessageBubbleProps) {
	const isOutgoing = message.sender === currentUserRole;
	const pending = message.id < 0; // optimistic temp id
	const classes = BUBBLE_CLASSES[variant];

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
					className={cn(
						'h-[28px] w-[28px] shrink-0 text-[14px]',
						variant === 'venueMap' && 'border-black text-black'
					)}
				/>
			)}
			<div
				className={cn(
					classes.base,
					isOutgoing ? classes.outgoing : classes.incoming,
					pending && 'opacity-60'
				)}
			>
				{message.isHtml ? (
					<div
						className="murmur-selectable [&_a]:underline [&_p]:mb-[6px] last:[&_p]:mb-0"
						dangerouslySetInnerHTML={{ __html: sanitizeMessageHtml(message.body) }}
					/>
				) : (
					<span className="murmur-selectable whitespace-pre-wrap">{message.body}</span>
				)}
			</div>
		</div>
	);
}
