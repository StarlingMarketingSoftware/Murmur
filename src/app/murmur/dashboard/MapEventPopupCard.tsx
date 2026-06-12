'use client';

import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { normalizeInlineSvgMarkupForXml } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import type { MapEventData } from '@/app/api/events/route';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { stateBadgeColorMap } from '@/constants/ui';
import { getStateAbbreviation } from '@/utils/string';

const getOrdinalDayLabel = (day: number): string => {
	const mod100 = day % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
	switch (day % 10) {
		case 1:
			return `${day}st`;
		case 2:
			return `${day}nd`;
		case 3:
			return `${day}rd`;
		default:
			return `${day}th`;
	}
};

export const formatMapPostedEventDate = (
	event: Pick<MapEventData, 'whenLabel' | 'startsAt'>
): string => {
	const whenLabel = event.whenLabel?.trim();
	if (whenLabel) return whenLabel;
	if (!event.startsAt) return 'Date TBA';

	const date = new Date(event.startsAt);
	if (Number.isNaN(date.getTime())) return 'Date TBA';

	const month = date.toLocaleDateString('en-US', { month: 'long' });
	return `${month} ${getOrdinalDayLabel(date.getDate())}`;
};

// Whole days from now until an event start (ISO). Null when no/invalid date.
const getDaysAway = (startsAt: string | null): number | null => {
	if (!startsAt) return null;
	const start = new Date(startsAt).getTime();
	if (Number.isNaN(start)) return null;
	return Math.max(0, Math.ceil((start - Date.now()) / 86_400_000));
};

// Rich event card rendered inside the map's event-popup white inner box (347x427 -> 343x423
// content). Laid out per the design: name + starred date, a divider at 105px, a 40px #FFD5D5
// venue band (name / category icon / state / city) bounded by a second divider, plain-text
// info (days-away / details / pay), and a visual-only Apply button 24px up from the bottom.
export function MapEventPopupCard({
	event,
	onApply,
}: {
	event: MapEventData;
	onApply?: () => void;
}) {
	const eventName = event.name?.trim() || 'Posted Event';
	const dateLabel = formatMapPostedEventDate(event);
	const venueName = event.venueName?.trim() || 'Venue TBA';
	const venueCity = event.venueCity?.trim() || '';
	const venueStateAbbr =
		getStateAbbreviation(event.venueState || '') ||
		event.venueState?.trim().toUpperCase() ||
		'';
	const details = event.details?.trim() || '';
	const pay = event.pay?.trim() || '';
	const daysAway = getDaysAway(event.startsAt);

	// Category icon from the venue's businessType (bottle/wine/restaurant/etc.).
	const iconCategory = mapBusinessTypeToCategory(event.venueBusinessType);
	const iconSpec = iconCategory ? getTooltipCategoryIconSpec(iconCategory) : null;

	return (
		<div
			className="font-inter"
			style={{ position: 'absolute', inset: 0, overflow: 'hidden', color: '#000' }}
		>
			{/* Name + date (0-105px) */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '105px',
					padding: '12px 14px 0',
					boxSizing: 'border-box',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						fontSize: '24px',
						fontWeight: 700,
						lineHeight: 1.12,
						overflow: 'hidden',
					}}
				>
					{eventName}
				</div>
				<div
					style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
				>
					<MapStackStarIcon size={24} className="flex-shrink-0" />
					<span
						style={{
							backgroundColor: '#D6F7FF',
							borderRadius: '4px',
							padding: '2px 6px',
							fontSize: '20px',
							fontWeight: 500,
							lineHeight: 1.1,
							whiteSpace: 'nowrap',
						}}
					>
						{dateLabel}
					</span>
				</div>
			</div>

			{/* Pink venue band (105-145px) */}
			<div
				style={{
					position: 'absolute',
					top: '105px',
					left: 0,
					right: 0,
					height: '40px',
					background: '#FFD5D5',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					padding: '0 12px',
					boxSizing: 'border-box',
				}}
			>
				<span
					style={{
						fontSize: '16px',
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
							width: '28px',
							height: '24px',
							borderRadius: '6px',
							border: '1.5px solid #000',
							background: '#C9C2F2',
						}}
					>
						<svg
							viewBox={iconSpec.viewBox}
							preserveAspectRatio="xMidYMid meet"
							style={{ width: '18px', height: '18px', display: 'block' }}
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
							minWidth: '36px',
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
							fontSize: '14px',
							lineHeight: 1,
							flexShrink: 0,
							whiteSpace: 'nowrap',
						}}
					>
						{venueCity}
					</span>
				)}
			</div>

			{/* Dividers bounding the pink band, rendered after the band so they paint on top. */}
			<div
				style={{
					position: 'absolute',
					top: '105px',
					left: 0,
					right: 0,
					height: '2px',
					background: '#000',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: '145px',
					left: 0,
					right: 0,
					height: '2px',
					background: '#000',
				}}
			/>

			{/* Info: days-away / details / pay (155px -> above the button) */}
			<div
				style={{
					position: 'absolute',
					top: '155px',
					left: 0,
					right: 0,
					bottom: '95px',
					padding: '0 14px',
					boxSizing: 'border-box',
					overflow: 'hidden',
					fontSize: '16px',
					lineHeight: 1.25,
				}}
			>
				{daysAway != null && (
					<div style={{ marginBottom: '10px', fontSize: '18px' }}>
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
					<div style={{ marginBottom: '10px', whiteSpace: 'pre-wrap' }}>{details}</div>
				)}
				{pay && <div style={{ whiteSpace: 'pre-wrap' }}>{pay}</div>}
			</div>

			{/* Apply button - opens the Apply modal */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onApply?.();
				}}
				style={{
					position: 'absolute',
					bottom: '24px',
					left: 0,
					right: 0,
					marginLeft: 'auto',
					marginRight: 'auto',
					width: '306px',
					height: '57px',
					borderRadius: '14px',
					background: '#E06D6D',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '24px',
					fontWeight: 500,
					lineHeight: '23.342px',
					color: '#000',
					border: 'none',
					cursor: 'pointer',
					font: 'inherit',
				}}
			>
				Apply
			</button>
		</div>
	);
}
