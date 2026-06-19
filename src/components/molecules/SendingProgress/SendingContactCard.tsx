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
	height?: number;
	className?: string;
	backgroundColor?: string;
	useNaturalBadgeColors?: boolean;
	largeTopBadges?: boolean;
	queuedTimelineTextColor?: string;
	/** Overall batch progress for static/dashboard queue cards. */
	progressFraction?: number;
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
	height,
	className,
	backgroundColor,
	useNaturalBadgeColors = false,
	largeTopBadges = false,
	queuedTimelineTextColor = '#FFFFFF',
	progressFraction,
	blendInactiveWithPanel = false,
	disableTransition = false,
	fadeContactTextEnd = false,
}) => {
	const contactTitle = item.contact?.title || item.contact?.headline || '';
	const isBlendedInactive = blendInactiveWithPanel && !isActive;
	const textColor = useNaturalBadgeColors ? '#000000' : isActive ? '#FFFFFF' : '#000000';
	const pillFillColor = SENDING_PILL_GREEN;
	const strokeColor = useNaturalBadgeColors
		? '#000000'
		: isActive
			? '#FFFFFF'
			: isBlendedInactive
				? 'rgba(0, 0, 0, 0.5)'
				: '#000000';
	const stateBadgeFillColor = useNaturalBadgeColors
		? undefined
		: isActive
			? pillFillColor
			: 'transparent';
	const cardBackgroundColor =
		backgroundColor ??
		(isActive
			? SENDING_ACTIVE_GREEN
			: isBlendedInactive
				? SENDING_PANEL_GREEN
				: SENDING_QUEUED_CARD_GREEN);
	const rightMetaClassName = largeTopBadges
		? 'flex w-[220px] max-w-[58%] shrink-0 flex-col items-stretch gap-[5px]'
		: 'flex w-[186px] max-w-[55%] shrink-0 flex-col items-stretch gap-[3px]';
	const titleBadgeClassName = largeTopBadges
		? 'h-[24px] max-w-full rounded-[7px] px-2 gap-1'
		: 'h-[17px] max-w-full rounded-[6px] px-2 gap-1';
	const titleBadgeTextClassName = largeTopBadges
		? 'text-[13px] leading-none font-medium'
		: 'text-[10px] leading-none';
	const stateRowClassName = largeTopBadges
		? 'h-[22px] min-w-0 gap-[7px] justify-start'
		: 'h-[16px] min-w-0 gap-1 justify-start';
	const stateBadgeClassName = largeTopBadges
		? 'box-border w-[37px] h-[22px] rounded-[5px] shrink-0'
		: 'box-border w-[29px] h-[16px] rounded-[4px] shrink-0';
	const stateBadgeTextClassName = largeTopBadges
		? 'font-inter text-[13px] leading-none font-bold'
		: 'font-inter text-[10px] leading-none font-bold';
	const cityClassName = largeTopBadges
		? 'text-[15px] leading-none font-bold'
		: 'text-[12px] leading-none font-bold';
	const titleBadgeIconSize = largeTopBadges ? 16 : 12;
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
	const explicitProgress =
		typeof progressFraction === 'number' && Number.isFinite(progressFraction)
			? Math.min(1, Math.max(0, progressFraction))
			: null;
	const progressBarFraction = explicitProgress ?? Math.min(1, Math.max(0, item.progress));
	const shouldShowProgressBar =
		showProgressBar && (item.status !== 'queued' || explicitProgress !== null);
	const progressTrackClassName =
		explicitProgress !== null
			? 'absolute left-3 right-3 bottom-[8px] h-[4px] overflow-hidden rounded-full bg-white/30'
			: 'absolute left-0 right-0 bottom-0 h-[4px] bg-white/30';
	const contentPaddingClassName = largeTopBadges
		? 'px-3 pt-[5px] pb-2'
		: 'px-3 pt-2 pb-2';
	const timelineClassName = largeTopBadges
		? 'mt-[2px] flex flex-col gap-[1px]'
		: 'mt-[6px] flex flex-col gap-[2px]';
	const queuedTimelineLineClassName = cn(
		'overflow-hidden text-ellipsis whitespace-nowrap font-inter text-[13.261px] font-normal',
		largeTopBadges ? 'leading-[18px]' : 'leading-[21.218px]'
	);

	return (
		<div
			className={cn(
				'relative overflow-hidden font-inter',
				!frameless && 'rounded-[8px]',
				className
			)}
			style={{
				width: width ?? '100%',
				...(height != null ? { height: `${height}px` } : {}),
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
			<div className={contentPaddingClassName}>
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
					<div className={rightMetaClassName}>
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
							<div className="min-w-0">
								{contactTitle ? (
									<TitleBadge
										title={contactTitle}
										className={titleBadgeClassName}
										textClassName={titleBadgeTextClassName}
										fillColor={useNaturalBadgeColors ? undefined : pillFillColor}
										strokeColor={strokeColor}
										textColor={textColor}
										restaurantIconSize={titleBadgeIconSize}
										coffeeIconSize={largeTopBadges ? 9 : 7}
										defaultIconSize={titleBadgeIconSize}
									/>
								) : null}
							</div>
							{item.startedAt != null ? (
								<span
									className={cn(
										'font-semibold leading-none whitespace-nowrap',
										largeTopBadges ? 'text-[15px]' : 'text-[12px]'
									)}
									style={{ color: textColor }}
								>
									{formatSendStartedAt(item.startedAt)}
								</span>
							) : null}
						</div>
						<StateLocationRow
							contact={item.contact}
							className={stateRowClassName}
							badgeClassName={stateBadgeClassName}
							badgeTextClassName={stateBadgeTextClassName}
							cityClassName={cityClassName}
							badgeFillColor={stateBadgeFillColor}
							strokeColor={strokeColor}
							textColor={textColor}
						/>
					</div>
				</div>
				<div className={timelineClassName}>
					{item.status === 'queued'
						? queuedTimelineLines.map((line) => (
								<div
									key={line}
									className={queuedTimelineLineClassName}
									style={{ color: queuedTimelineTextColor }}
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
			{shouldShowProgressBar ? (
				<div className={progressTrackClassName}>
					<div
						className="h-full rounded-full"
						style={{
							width: `${progressBarFraction * 100}%`,
							backgroundColor: item.status === 'failed' ? '#F67C7E' : '#FFFFFF',
							transition: 'width 300ms ease',
						}}
					/>
				</div>
			) : null}
		</div>
	);
};
