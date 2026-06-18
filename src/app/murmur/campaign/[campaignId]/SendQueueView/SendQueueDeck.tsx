'use client';

import { FC, useState } from 'react';
import type { SendQueueItemVM } from '@/types/sendQueue';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { convertHtmlToPlainText } from '@/utils';
import {
	StateLocationRow,
	TitleBadge,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';

export interface SendQueueDeckProps {
	items: SendQueueItemVM[];
	focusedIndex?: number;
	/** Advance/select handler — clicking the front card moves to the next email. */
	onFocusChange?: (index: number) => void;
	width?: number;
	height?: number;
}

const QUEUE_CARD_GREEN = '#85D790';
const MAX_VISIBLE_STACK_CARDS = 5;
const STACK_OFFSET_X_PX = 6;
const STACK_OFFSET_Y_PX = 10;
const STACK_SHIFT_X_PX = -14;
const HEADER_HEIGHT_PX = 54;
const BOTTOM_STRIP_HEIGHT_PX = 24;

/**
 * Read-only stack of queued emails for the persisted send queue. It intentionally
 * mirrors the draft-review card chrome, but uses green queue fills.
 */
export const SendQueueDeck: FC<SendQueueDeckProps> = ({
	items,
	focusedIndex,
	onFocusChange,
	width = 500,
	height = 538,
}) => {
	const [internalFocusedIndex, setInternalFocusedIndex] = useState(0);
	const resolvedFocusedIndex = focusedIndex ?? internalFocusedIndex;
	const focused = items[resolvedFocusedIndex] ?? items[0];
	const stackCount = Math.min(MAX_VISIBLE_STACK_CARDS - 1, Math.max(0, items.length - 1));
	const frontOffsetX = stackCount * STACK_OFFSET_X_PX;
	const frontOffsetY = stackCount * STACK_OFFSET_Y_PX;

	if (!focused) return null;

	const contact = focused.contact;
	const contactName =
		contact.name?.trim() ||
		`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
		contact.company ||
		'Contact';
	const companyName = contact.company && contact.company !== contactName ? contact.company : '';
	const contactTitle = contact.title || contact.headline || '';
	const bodyText = convertHtmlToPlainText(focused.email.message || '');

	const advance = () => {
		if (items.length <= 1) return;
		const nextIndex = (resolvedFocusedIndex + 1) % items.length;
		setInternalFocusedIndex(nextIndex);
		onFocusChange?.(nextIndex);
	};

	return (
		<div
			data-send-queue-apparatus
			style={{ position: 'relative', width, height }}
			onClick={advance}
			role={items.length > 1 ? 'button' : undefined}
			aria-label={items.length > 1 ? 'Next queued email' : 'Queued email'}
		>
			{Array.from({ length: stackCount }).map((_, i) => {
				const depth = stackCount - i;
				const offsetIndex = stackCount - depth;
				return (
					<div
						key={`back-${i}`}
						aria-hidden="true"
						style={{
							position: 'absolute',
							top: offsetIndex * STACK_OFFSET_Y_PX,
							left: STACK_SHIFT_X_PX + offsetIndex * STACK_OFFSET_X_PX,
							width,
							height,
							borderRadius: '8px',
							border: '3px solid #000000',
							background: QUEUE_CARD_GREEN,
							opacity: Math.min(0.72, 0.42 + i * 0.08),
						}}
					/>
				);
			})}
			<div
				style={{
					position: 'absolute',
					top: frontOffsetY,
					left: STACK_SHIFT_X_PX + frontOffsetX,
					width,
					height,
					border: '3px solid #000000',
					borderRadius: '8px',
					background: QUEUE_CARD_GREEN,
					overflow: 'hidden',
					cursor: items.length > 1 ? 'pointer' : 'default',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<div
					style={{
						height: `${HEADER_HEIGHT_PX}px`,
						borderBottom: '2px solid #000000',
						padding: '7px 12px',
						boxSizing: 'border-box',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						background: QUEUE_CARD_GREEN,
					}}
				>
					<div className="min-w-0 pr-4">
						<div className="font-inter text-[14px] font-bold leading-[17px] truncate">
							{contactName}
						</div>
						{companyName ? (
							<div className="font-inter text-[11px] leading-[14px] truncate">
								{companyName}
							</div>
						) : null}
					</div>
					<div className="flex min-w-[170px] flex-col items-start gap-[2px]">
						<StateLocationRow
							contact={contact}
							className="h-[18px] w-full gap-1"
							badgeClassName="box-border h-[15px] w-[28px] rounded-[4px] shrink-0"
							badgeTextClassName="font-inter text-[12px] leading-none font-bold"
							cityClassName="font-inter text-[12px] leading-none text-black max-w-[128px]"
						/>
						{contactTitle ? (
							<TitleBadge
								title={contactTitle}
								className="h-[18px] w-[152px] rounded-[6px] px-2 gap-1 justify-start"
								textClassName="font-inter text-[11px] text-black"
								restaurantIconSize={12}
								coffeeIconSize={7}
								defaultIconSize={12}
							/>
						) : null}
					</div>
				</div>
				<div className="flex min-h-0 flex-1 flex-col px-1 pb-0 pt-[6px]">
					<div className="mb-2 flex justify-center">
						<div
							className="flex items-center overflow-hidden rounded-[7px] border-2 border-black bg-white px-2 font-inter text-[14px] font-extrabold"
							style={{
								width: `calc(100% - 8px)`,
								height: '39px',
							}}
						>
							<span className="truncate">{focused.email.subject || 'Queued email'}</span>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 justify-center">
						<div
							className="min-h-0 overflow-hidden rounded-[7px] border-2 border-black bg-white"
							style={{ width: `calc(100% - 8px)` }}
						>
							<CustomScrollbar
								className="h-full"
								thumbWidth={2}
								thumbColor="#000000"
								offsetRight={-6}
							>
								<div className="murmur-selectable whitespace-pre-wrap p-3 font-inter text-sm leading-[1.6] text-black">
									{bodyText || 'Queued for sending.'}
								</div>
							</CustomScrollbar>
						</div>
					</div>
					<div
						className="flex items-center px-3 font-inter text-[11px] font-normal leading-none text-black"
						style={{ height: `${BOTTOM_STRIP_HEIGHT_PX}px` }}
					>
						<span className="whitespace-nowrap">Drafts</span>
						<span className="mx-[10px] whitespace-nowrap">{'>'}</span>
						<span className="min-w-0 truncate">{contactName}</span>
					</div>
				</div>
			</div>
		</div>
	);
};
