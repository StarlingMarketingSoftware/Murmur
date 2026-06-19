'use client';

import { type CSSProperties, FC } from 'react';
import { cn } from '@/utils';
import {
	formatLogTimestamp,
	formatSendQueueDateTime,
	formatSendStartedAt,
	SendingQueueItem,
} from '@/contexts/SendingSessionContext';
import {
	TitleBadge,
	StateLocationRow,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import {
	SENDING_ACTIVE_GREEN,
	SENDING_PANEL_GREEN,
	SENDING_QUEUED_CARD_GREEN,
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
const SENDING_PILL_GREEN = '#76CC82';

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
	backgroundColor?: string;
	/** Let non-active static queue rows recede into the green panel background. */
	blendInactiveWithPanel?: boolean;
	disableTransition?: boolean;
	fadeContactTextEnd?: boolean;
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
	backgroundColor,
	blendInactiveWithPanel = false,
	disableTransition = false,
	fadeContactTextEnd = false,
}) => {
	const contactTitle = item.contact?.title || item.contact?.headline || '';
	const isBlendedInactive = blendInactiveWithPanel && !isActive;
	const textColor = isActive ? '#FFFFFF' : '#000000';
	const strokeColor = isActive
		? '#FFFFFF'
		: isBlendedInactive
			? 'rgba(0, 0, 0, 0.5)'
			: '#000000';
	const pillFillColor = SENDING_PILL_GREEN;
	const cardBackgroundColor = isActive
		? SENDING_ACTIVE_GREEN
		: (backgroundColor ??
			(isBlendedInactive ? SENDING_PANEL_GREEN : SENDING_QUEUED_CARD_GREEN));
	const logLines = item.logLines.slice(-2);
	const contactTextStyle: CSSProperties = fadeContactTextEnd
		? {
				color: textColor,
				WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent)',
				maskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent)',
			}
		: { color: textColor };
	const queuedAt =
		typeof item.queuedAt === 'number' && Number.isFinite(item.queuedAt)
			? item.queuedAt
			: null;
	const scheduledFor =
		typeof item.scheduledFor === 'number' && Number.isFinite(item.scheduledFor)
			? item.scheduledFor
			: typeof item.startedAt === 'number' && Number.isFinite(item.startedAt)
				? item.startedAt
				: null;
	const queuedTimelineLines =
		scheduledFor != null
			? [
					`${formatSendQueueDateTime(queuedAt ?? scheduledFor)} sent to queue`,
					`${formatSendQueueDateTime(scheduledFor)} will send`,
				]
			: QUEUED_PLACEHOLDER_LINES;

	return (
		<div
			className={cn(
				'relative overflow-hidden font-inter',
				!frameless && 'rounded-[8px]',
				className
			)}
			style={{
				width: width ?? '100%',
				backgroundColor: cardBackgroundColor,
				border: frameless
					? 'none'
					: isActive
						? '2px solid #FFFFFF'
						: `2px solid ${strokeColor}`,
				opacity,
				color: textColor,
				transition: disableTransition
					? 'none'
					: 'background-color 200ms ease, opacity 200ms ease',
			}}
		>
			<div className="px-3 pt-2 pb-2">
				<div className="flex items-start gap-2">
					<div className="min-w-0 flex-1">
						<div
							className={cn(
								'font-inter text-[14.661px] font-bold leading-[19.547px]',
								fadeContactTextEnd ? 'overflow-hidden whitespace-nowrap' : 'truncate'
							)}
							style={contactTextStyle}
						>
							{getContactName(item)}
						</div>
						{getContactCompany(item) ? (
							<div
								className={cn(
									'font-inter text-[14.661px] font-normal leading-[19.547px]',
									fadeContactTextEnd ? 'overflow-hidden whitespace-nowrap' : 'truncate'
								)}
								style={contactTextStyle}
							>
								{getContactCompany(item)}
							</div>
						) : null}
					</div>
					<div className="flex w-[186px] max-w-[55%] shrink-0 flex-col items-stretch gap-[3px]">
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
							<div className="min-w-0">
								{contactTitle ? (
									<TitleBadge
										title={contactTitle}
										className="h-[17px] max-w-full rounded-[6px] px-2 gap-1"
										textClassName="text-[10px] leading-none"
										fillColor={pillFillColor}
										strokeColor={strokeColor}
										textColor={textColor}
										restaurantIconSize={12}
										coffeeIconSize={7}
										defaultIconSize={12}
									/>
								) : null}
							</div>
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
							className="h-[16px] min-w-0 gap-1 justify-start"
							badgeClassName="box-border w-[29px] h-[16px] rounded-[4px] shrink-0"
							badgeTextClassName="font-inter text-[10px] leading-none font-bold"
							cityClassName="text-[12px] leading-none font-bold"
							badgeFillColor={isActive ? pillFillColor : 'transparent'}
							strokeColor={strokeColor}
							textColor={textColor}
						/>
					</div>
				</div>
				<div className="mt-[6px] flex flex-col gap-[2px]">
					{item.status === 'queued'
						? queuedTimelineLines.map((line) => (
								<div
									key={line}
									className="overflow-hidden text-ellipsis whitespace-nowrap font-inter text-[13.261px] font-normal leading-[21.218px]"
									style={{ color: '#FFFFFF' }}
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
