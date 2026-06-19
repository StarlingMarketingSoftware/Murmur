'use client';

import {
	type FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import type { MyEventApplication } from '@/app/api/events/applications/route';
import {
	EVENT_CHAT_STATUS_META,
	type EventChatState,
	type EventChatStatus,
	formatEventDateLabel,
	stripTrailingDateFromEventName,
} from '@/utils/eventChatStatus';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { normalizeInlineSvgMarkupForXml } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { stateBadgeColorMap } from '@/constants/ui';
import { getStateAbbreviation } from '@/utils/string';
import { cn } from '@/utils';

// Heights for the event-chat rows in the side-panel lists: the full card shows
// the event line + message preview; closed/canceled collapse to the header rows.
export const EVENT_CHAT_ROW_HEIGHT_PX = 126;
export const EVENT_CHAT_COMPACT_ROW_HEIGHT_PX = 86;

const FOLDER_CHIP_FILL = '#B6E8F1';
const FOLDER_ICON_COLOR = '#B94343';
const DATE_PILL_FILL = '#B6E8F1';
const EVENT_CHAT_HEADER_PILL_HEIGHT_PX = 19;
const EVENT_CHAT_HEADER_PILL_RADIUS_PX = 9;

// Single-line text that fades out at the right edge only when it overflows
// (same measured-mask pattern as the list/widget locals).
const FadeText: FC<{ text: string; className?: string; fadePx?: number }> = ({
	text,
	className,
	fadePx = 16,
}) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;
		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}
		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	const style = isOverflowing
		? {
				maskImage: `linear-gradient(to right, black calc(100% - ${fadePx}px), transparent 100%)`,
				WebkitMaskImage: `linear-gradient(to right, black calc(100% - ${fadePx}px), transparent 100%)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={cn('block whitespace-nowrap overflow-hidden', className)}
			style={style}
			title={text}
		>
			{text}
		</span>
	);
};

const StatusDot: FC<{ color: string; size?: number }> = ({ color, size = 6 }) => (
	<span
		className="inline-block shrink-0 rounded-full"
		style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color }}
	/>
);

/** "• In Progress" / "• Closed" / "• Canceled" status pill (Figma: ~90×16,
 * 6.866px radius, 0.858px black border). Reused small by the main inbox list
 * and the dashboard responses widget. */
export const EventChatStatusPill: FC<{
	status: EventChatStatus;
	height?: number;
	fontSize?: number;
	cornerRadius?: number;
	className?: string;
}> = ({ status, height = 16, fontSize = 10.5, cornerRadius = 6.866, className }) => {
	const meta = EVENT_CHAT_STATUS_META[status];
	return (
		<span
			className={cn('inline-flex shrink-0 items-center justify-center gap-1', className)}
			style={{
				minWidth: '90px',
				height: `${height}px`,
				padding: '0 7px',
				borderRadius: `${cornerRadius}px`,
				border: '0.858px solid #000',
				backgroundColor: meta.fill,
				boxSizing: 'border-box',
			}}
		>
			<StatusDot color={meta.dot} />
			<span
				className="font-inter whitespace-nowrap leading-none text-black"
				style={{ fontSize: `${fontSize}px`, fontWeight: 500 }}
			>
				{meta.label}
			</span>
		</span>
	);
};

/**
 * Content of an event-chat row in the side-panel conversation lists. The
 * interactive row wrapper (border, background, click/keyboard handling) stays
 * with the caller — this renders the inner layout per the Figma card:
 * star + venue + status + time / folder + category + state + city /
 * event title + date pill / message preview. Closed/canceled render the
 * compact variant (header rows only).
 */
export const EventChatCard: FC<{
	application: MyEventApplication;
	state: EventChatState;
	nowMs: number;
	campaignName: string | null;
	timestampLabel: string;
	previewText: string | null;
}> = ({ application, state, nowMs, campaignName, timestampLabel, previewText }) => {
	const event = application.event;
	const venueName = event?.venueName?.trim() || 'Venue';
	const isCompact = state.status === 'closed' || state.status === 'canceled';
	const isBooked = state.status === 'booked';
	const bookedMeta = EVENT_CHAT_STATUS_META.booked;

	const iconCategory = mapBusinessTypeToCategory(event?.venueBusinessType ?? null);
	const iconSpec = iconCategory ? getTooltipCategoryIconSpec(iconCategory) : null;
	const stateAbbr = event?.venueState
		? getStateAbbreviation(event.venueState) || event.venueState.trim().toUpperCase()
		: '';
	const city = event?.venueCity?.trim() || '';
	const eventTitle = event?.name ? stripTrailingDateFromEventName(event.name) : '';
	const dateLabel = event ? formatEventDateLabel(event, nowMs) : '';

	return (
		<div className="font-inter flex h-full w-full flex-col px-3 pt-[9px] text-black">
			{/* Row 1: star · venue name (+ merged Booked pill) · status pill · time */}
			<div className="flex w-full items-center gap-[6px]">
				<MapStackStarIcon size={18} className="shrink-0" />
				{isBooked ? (
					<span
						className="flex min-w-0 items-center gap-[6px]"
						style={{
							maxWidth: 'calc(100% - 80px)',
							height: `${EVENT_CHAT_HEADER_PILL_HEIGHT_PX}px`,
							padding: '0 9px',
							borderRadius: `${EVENT_CHAT_HEADER_PILL_RADIUS_PX}px`,
							border: '1.2px solid #000',
							backgroundColor: bookedMeta.fill,
							boxSizing: 'border-box',
						}}
					>
						<FadeText
							text={venueName}
							className="min-w-0 text-[14.661px] font-bold leading-none"
						/>
						<StatusDot color={bookedMeta.dot} />
						<span className="whitespace-nowrap text-[12px] font-medium leading-none">
							{bookedMeta.label}
						</span>
					</span>
				) : (
					<>
						<FadeText
							text={venueName}
							className="min-w-0 flex-shrink text-[14.661px] font-bold leading-none"
						/>
						<EventChatStatusPill
							status={state.status}
							height={EVENT_CHAT_HEADER_PILL_HEIGHT_PX}
							fontSize={11}
							cornerRadius={EVENT_CHAT_HEADER_PILL_RADIUS_PX}
						/>
					</>
				)}
				<span className="ml-auto shrink-0 whitespace-nowrap text-[12px] font-semibold leading-none">
					{timestampLabel}
				</span>
			</div>

			{/* Row 2: folder chip · category icon chip · state chip · city */}
			<div className="mt-[6px] flex w-full items-center gap-[5px] overflow-hidden">
				{campaignName ? (
					<span
						className="flex shrink-0 items-center overflow-hidden"
						style={{
							width: '80px',
							height: '16px',
							borderRadius: '4px',
							backgroundColor: FOLDER_CHIP_FILL,
							padding: '0 5px',
							boxSizing: 'border-box',
						}}
					>
						<DashboardActionBarFolderIcon
							width={16}
							height={10}
							style={{ color: FOLDER_ICON_COLOR, flex: '0 0 auto' }}
						/>
						<FadeText
							text={campaignName}
							className="ml-[5px] min-w-0 flex-1 text-[11px] font-medium leading-none"
						/>
					</span>
				) : null}
				{iconSpec && (
					<span
						aria-label={iconCategory ?? undefined}
						title={iconCategory ?? undefined}
						className="inline-flex shrink-0 items-center justify-center"
						style={{
							width: '24px',
							height: '16px',
							borderRadius: '5.6px',
							border: '1px solid #000',
							backgroundColor: '#C9C2F2',
							boxSizing: 'border-box',
							overflow: 'hidden',
						}}
					>
						<svg
							viewBox={iconSpec.viewBox}
							preserveAspectRatio="xMidYMid meet"
							style={{ width: '12px', height: '12px', display: 'block' }}
							dangerouslySetInnerHTML={{
								__html: normalizeInlineSvgMarkupForXml(iconSpec.content),
							}}
						/>
					</span>
				)}
				{stateAbbr && (
					<span
						className="inline-flex shrink-0 items-center justify-center font-bold leading-none"
						style={{
							minWidth: '27px',
							height: '16px',
							padding: '0 4px',
							borderRadius: '5.6px',
							border: '1px solid #000',
							backgroundColor: stateBadgeColorMap[stateAbbr] || '#FFF8DC',
							fontSize: '11px',
							boxSizing: 'border-box',
						}}
					>
						{stateAbbr}
					</span>
				)}
				{city && (
					<FadeText text={city} className="min-w-0 text-[11px] font-medium leading-none" />
				)}
			</div>

			{!isCompact && (
				<>
					{/* Row 3: event title · date pill */}
					<div className="mt-[8px] flex w-full items-center gap-[6px]">
						{eventTitle && (
							<FadeText
								text={eventTitle}
								className="min-w-0 flex-shrink text-[14.661px] font-bold leading-none"
							/>
						)}
						{dateLabel && (
							<span
								className="shrink-0 whitespace-nowrap leading-none"
								style={{
									backgroundColor: DATE_PILL_FILL,
									borderRadius: '4px',
									padding: '3px 8px',
									fontSize: '13.215px',
									fontWeight: 500,
								}}
							>
								{dateLabel}
							</span>
						)}
					</div>

					{/* Row 4: last message preview */}
					{previewText ? (
						<div
							className="mt-[5px] w-full overflow-hidden text-[13.215px] font-normal"
							style={{
								display: '-webkit-box',
								WebkitBoxOrient: 'vertical',
								WebkitLineClamp: 2,
								lineHeight: '17.5px',
							}}
						>
							{previewText}
						</div>
					) : null}
				</>
			)}
		</div>
	);
};
