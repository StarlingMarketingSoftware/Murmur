'use client';

import type { FC } from 'react';
import type { MyEventApplication } from '@/app/api/events/applications/route';
import { formatMapPostedEventDate } from '@/app/murmur/dashboard/MapEventPopupCard';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { normalizeInlineSvgMarkupForXml } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { stateBadgeColorMap } from '@/constants/ui';
import { getStateAbbreviation } from '@/utils/string';
import { stripTrailingDateFromEventName } from '@/utils/eventChatStatus';

export const OPPORTUNITY_HOVER_PANEL_WIDTH_PX = 347;
export const OPPORTUNITY_HOVER_PANEL_HEIGHT_PX = 427;

const CHROME_FILL = '#E26D6D';
const CHROME_HEADER_PX = 22;
const CHROME_FOOTER_PX = 20;
const CHROME_EDGE_PX = 4;

/**
 * The opportunity detail panel shown when hovering an event-chat row — replaces
 * the contact research card for these rows. Red window chrome ("Opportunity"
 * caption + lat/long footer) around the posted-event card layout
 * (adapted from MapEventPopupCard: title + starred date, pink venue band,
 * days-away / details / pay — no Apply button, the user already applied).
 */
export const OpportunityHoverPanel: FC<{
	application: MyEventApplication;
	nowMs: number;
	widthPx?: number;
	heightPx?: number;
	borderRadiusPx?: number;
	borderPx?: number;
}> = ({
	application,
	nowMs,
	widthPx = OPPORTUNITY_HOVER_PANEL_WIDTH_PX,
	heightPx = OPPORTUNITY_HOVER_PANEL_HEIGHT_PX,
	borderRadiusPx = 12,
	borderPx = 2,
}) => {
	const event = application.event;
	if (!event) return null;

	const eventName = stripTrailingDateFromEventName(event.name?.trim() || 'Posted Event');
	const dateLabel = formatMapPostedEventDate(event);
	const venueName = event.venueName?.trim() || 'Venue TBA';
	const venueCity = event.venueCity?.trim() || '';
	const venueStateAbbr =
		getStateAbbreviation(event.venueState || '') ||
		event.venueState?.trim().toUpperCase() ||
		'';
	const details = event.details?.trim() || '';
	const pay = event.pay?.trim() || '';
	const startsAtMs = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
	const daysAway = Number.isNaN(startsAtMs)
		? null
		: Math.max(0, Math.ceil((startsAtMs - nowMs) / 86_400_000));
	const coordsLabel =
		event.latitude != null && event.longitude != null
			? `${event.latitude.toFixed(4)}   ${event.longitude.toFixed(4)}`
			: '';

	const iconCategory = mapBusinessTypeToCategory(event.venueBusinessType);
	const iconSpec = iconCategory ? getTooltipCategoryIconSpec(iconCategory) : null;

	return (
		<div
			className="font-inter"
			style={{
				width: `${widthPx}px`,
				height: `${heightPx}px`,
				borderRadius: `${borderRadiusPx}px`,
				background: CHROME_FILL,
				border: `${borderPx}px solid #000`,
				boxSizing: 'border-box',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				color: '#000',
			}}
		>
			{/* Chrome caption */}
			<div
				className="flex items-center"
				style={{
					height: `${CHROME_HEADER_PX}px`,
					padding: `0 ${CHROME_EDGE_PX + 6}px`,
					flexShrink: 0,
				}}
			>
				<span style={{ fontSize: '11px', fontWeight: 500 }}>Opportunity</span>
			</div>

			{/* White inner card */}
			<div
				style={{
					position: 'relative',
					flex: 1,
					minHeight: 0,
					margin: `0 ${CHROME_EDGE_PX}px`,
					borderRadius: '8px',
					border: '2px solid #000',
					background: '#FFF',
					overflow: 'hidden',
					boxSizing: 'border-box',
				}}
			>
				{/* Name + starred date */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: '96px',
						padding: '10px 12px 0',
						boxSizing: 'border-box',
						overflow: 'hidden',
					}}
				>
					<div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.12 }}>
						{eventName}
					</div>
					<div
						style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
					>
						<MapStackStarIcon size={22} className="flex-shrink-0" />
						<span
							style={{
								backgroundColor: '#D6F7FF',
								borderRadius: '4px',
								padding: '2px 6px',
								fontSize: '18px',
								fontWeight: 500,
								lineHeight: 1.1,
								whiteSpace: 'nowrap',
							}}
						>
							{dateLabel}
						</span>
					</div>
				</div>

				{/* Pink venue band */}
				<div
					style={{
						position: 'absolute',
						top: '96px',
						left: 0,
						right: 0,
						height: '38px',
						background: '#FFD5D5',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						padding: '0 12px',
						boxSizing: 'border-box',
						borderTop: '2px solid #000',
						borderBottom: '2px solid #000',
					}}
				>
					<span
						style={{
							fontSize: '15px',
							fontWeight: 700,
							lineHeight: 1.1,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							minWidth: 0,
							flex: '0 1 auto',
						}}
					>
						{venueName}
					</span>
					{iconSpec && (
						<span
							style={{
								flexShrink: 0,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '26px',
								height: '22px',
								borderRadius: '6px',
								border: '1.5px solid #000',
								background: '#C9C2F2',
							}}
						>
							<svg
								viewBox={iconSpec.viewBox}
								preserveAspectRatio="xMidYMid meet"
								style={{ width: '16px', height: '16px', display: 'block' }}
								dangerouslySetInnerHTML={{
									__html: normalizeInlineSvgMarkupForXml(iconSpec.content),
								}}
							/>
						</span>
					)}
					{venueStateAbbr && (
						<span
							style={{
								flexShrink: 0,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '20px',
								minWidth: '34px',
								padding: '0 5px',
								borderRadius: '6px',
								border: '1px solid #000',
								backgroundColor: stateBadgeColorMap[venueStateAbbr] || '#FFF8DC',
								fontSize: '13px',
								fontWeight: 700,
								lineHeight: 1,
							}}
						>
							{venueStateAbbr}
						</span>
					)}
					{venueCity && (
						<span
							style={{
								fontSize: '13px',
								lineHeight: 1,
								flexShrink: 0,
								whiteSpace: 'nowrap',
							}}
						>
							{venueCity}
						</span>
					)}
				</div>

				{/* Days-away / details / pay */}
				<div
					style={{
						position: 'absolute',
						top: '144px',
						left: 0,
						right: 0,
						bottom: 0,
						padding: '8px 12px 10px',
						boxSizing: 'border-box',
						overflow: 'hidden',
						fontSize: '14px',
						lineHeight: 1.3,
					}}
				>
					{daysAway != null && (
						<div style={{ marginBottom: '8px', fontSize: '16px' }}>
							<span
								style={{
									backgroundColor: '#FFD5D5',
									borderRadius: '4px',
									padding: '0 4px',
									fontWeight: 600,
								}}
							>
								{daysAway}
							</span>{' '}
							days away
						</div>
					)}
					{details && (
						<div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{details}</div>
					)}
					{pay && <div style={{ whiteSpace: 'pre-wrap' }}>{pay}</div>}
				</div>
			</div>

			{/* Chrome footer: event coordinates */}
			<div
				className="flex items-center"
				style={{
					height: `${CHROME_FOOTER_PX}px`,
					padding: `0 ${CHROME_EDGE_PX + 6}px`,
					flexShrink: 0,
				}}
			>
				<span style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'pre' }}>
					{coordsLabel}
				</span>
			</div>
		</div>
	);
};
