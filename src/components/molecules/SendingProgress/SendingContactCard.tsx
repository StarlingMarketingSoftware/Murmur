'use client';

import { FC } from 'react';
import { cn } from '@/utils';
import {
	formatLogTimestamp,
	formatSendStartedAt,
	SendingQueueItem,
} from '@/contexts/SendingSessionContext';
import {
	TitleBadge,
	StateLocationRow,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import {
	SENDING_ACTIVE_GREEN,
	SENDING_QUEUED_CARD_GREEN,
	SENDING_STACK_GREEN,
} from './constants';

const getContactName = (item: SendingQueueItem) =>
	item.contact?.name?.trim() ||
	`${item.contact?.firstName || ''} ${item.contact?.lastName || ''}`.trim() ||
	item.contact?.company ||
	item.contact?.email ||
	'Contact';

const getContactCompany = (item: SendingQueueItem) => {
	const name = getContactName(item);
	const company = item.contact?.company || '';
	return company && company !== name ? company : '';
};

const QUEUED_PLACEHOLDER_LINES = [
	'[--:--:--.---] awaiting dispatch...',
	'[--:--:--.---] holding position in send queue...',
];

export interface SendingContactCardProps {
	item: SendingQueueItem;
	isActive: boolean;
	opacity?: number;
	/** Thin step-progress bar along the card's bottom edge (search-tab variant). */
	showProgressBar?: boolean;
	/** Drop the card's own border/radius (when embedded as a research-card header). */
	frameless?: boolean;
	width?: number | string;
	className?: string;
}

/**
 * One queued/sending/sent email in the "actively sending" UI — used as the row
 * card in the sending list panel and as the header band of the search-tab
 * sending research cards.
 */
export const SendingContactCard: FC<SendingContactCardProps> = ({
	item,
	isActive,
	opacity = 1,
	showProgressBar = false,
	frameless = false,
	width,
	className,
}) => {
	const contactTitle = item.contact?.title || item.contact?.headline || '';
	const textColor = isActive ? '#FFFFFF' : '#000000';
	const logLines = item.logLines.slice(-2);

	return (
		<div
			className={cn(
				'relative overflow-hidden font-inter',
				!frameless && 'rounded-[8px]',
				className
			)}
			style={{
				width: width ?? '100%',
				backgroundColor: isActive ? SENDING_ACTIVE_GREEN : SENDING_QUEUED_CARD_GREEN,
				border: frameless
					? 'none'
					: isActive
						? '2px solid #FFFFFF'
						: '2px solid #000000',
				opacity,
				color: textColor,
				transition: 'background-color 200ms ease, opacity 200ms ease',
			}}
		>
			<div className="px-3 pt-2 pb-2">
				<div className="flex items-start gap-2">
					<div className="min-w-0 flex-1">
						<div
							className="font-inter text-[14.661px] font-bold leading-[19.547px] truncate"
							style={{ color: textColor }}
						>
							{getContactName(item)}
						</div>
						{getContactCompany(item) ? (
							<div
								className="font-inter text-[14.661px] font-normal leading-[19.547px] truncate"
								style={{ color: textColor }}
							>
								{getContactCompany(item)}
							</div>
						) : null}
					</div>
					<div className="flex flex-col items-end gap-[3px] shrink-0 max-w-[55%]">
						<div className="flex items-center gap-2">
							{contactTitle ? (
								<TitleBadge
									title={contactTitle}
									className="h-[17px] rounded-[6px] px-2 gap-1 max-w-[140px]"
									textClassName="text-[10px] leading-none"
									fillColor={SENDING_STACK_GREEN}
									strokeColor="#000000"
									textColor="#000000"
									restaurantIconSize={12}
									coffeeIconSize={7}
									defaultIconSize={12}
								/>
							) : null}
							{item.startedAt != null ? (
								<span
									className="text-[12px] font-semibold leading-none whitespace-nowrap"
									style={{ color: textColor }}
								>
									{formatSendStartedAt(item.startedAt)}
								</span>
							) : null}
						</div>
						<StateLocationRow
							contact={item.contact}
							className="h-[16px] gap-1 justify-end"
							badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
							badgeTextClassName="font-inter text-[10px] leading-none font-bold"
							cityClassName="text-[12px] leading-none font-bold"
							badgeFillColor="transparent"
							strokeColor={textColor}
							textColor={textColor}
						/>
					</div>
				</div>
				<div className="mt-[6px] flex flex-col gap-[2px]">
					{item.status === 'queued'
						? QUEUED_PLACEHOLDER_LINES.map((line) => (
								<div
									key={line}
									className="font-mono text-[10.5px] leading-[14px] truncate opacity-70"
									style={{ color: textColor }}
								>
									{line}
								</div>
							))
						: logLines.map((line) => (
								<div
									key={`${line.ts}-${line.text}`}
									className="font-mono text-[10.5px] leading-[14px] truncate"
									style={{ color: textColor }}
								>
									{formatLogTimestamp(line.ts)} {line.text}
								</div>
							))}
				</div>
			</div>
			{showProgressBar && item.status !== 'queued' ? (
				<div className="absolute left-0 right-0 bottom-0 h-[4px] bg-white/30">
					<div
						className="h-full"
						style={{
							width: `${Math.min(1, item.progress) * 100}%`,
							backgroundColor: item.status === 'failed' ? '#F67C7E' : '#FFFFFF',
							transition: 'width 300ms ease',
						}}
					/>
				</div>
			) : null}
		</div>
	);
};
