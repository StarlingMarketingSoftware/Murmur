'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { normalizeInlineSvgMarkupForXml } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import type { MapEventData } from '@/app/api/events/route';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { stateBadgeColorMap } from '@/constants/ui';
import { useMe } from '@/hooks/useMe';
import { getStateAbbreviation } from '@/utils/string';

// Centered two-box overlay opened from either Apply button (the posted-event card in the
// search-results panel and the map event popup). Rendered via a portal to <body> so it sits
// above the map's pointer-events:none layer; the page's <html> zoom scales it automatically.
// Closes on backdrop click and Escape. The white inner box holds the "Opportunity" design: a
// pink venue band (wired to the clicked event) and a blue performer profile card (wired to the
// current user), ending in a visual-only Apply button.
export function ApplyModal({
	open,
	event,
	onClose,
}: {
	open: boolean;
	event: MapEventData | null;
	onClose: () => void;
}) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	const { user } = useMe();

	// Venue header (mirrors the pink band in MapEventPopupCard).
	const venueName = event?.venueName?.trim() || 'Venue TBA';
	const venueCity = event?.venueCity?.trim() || '';
	const venueStateAbbr =
		getStateAbbreviation(event?.venueState || '') ||
		event?.venueState?.trim().toUpperCase() ||
		'';
	const iconCategory = mapBusinessTypeToCategory(event?.venueBusinessType ?? null);
	const iconSpec = iconCategory ? getTooltipCategoryIconSpec(iconCategory) : null;

	// Performer header (current user).
	const performerName =
		`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Your Profile';
	const performerInitial = performerName.charAt(0).toUpperCase() || '?';

	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[100001] flex items-center justify-center"
			style={{ pointerEvents: 'auto' }}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: 'relative',
					width: '698px',
					height: '750px',
					background: '#E06E6E',
					border: '3px solid #070707',
					borderRadius: '14px',
					boxSizing: 'border-box',
					// Nudge up so the box clears the bottom advanced-search bar.
					transform: 'translateY(-20px)',
				}}
			>
				<div
					className="font-inter"
					style={{
						position: 'absolute',
						bottom: '7px',
						left: 0,
						right: 0,
						marginLeft: 'auto',
						marginRight: 'auto',
						width: '687px',
						height: '723px',
						borderRadius: '12px',
						border: '2px solid #000',
						background: '#FFF',
						color: '#000',
						boxSizing: 'border-box',
					}}
				>
					{/* Box 1: venue band — 660x63, pink top region (#FFD5D5) above a divider at 40px. */}
					<div
						style={{
							position: 'absolute',
							top: '21px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '660px',
							height: '63px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: '#FFF',
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '40px',
								background: '#FFD5D5',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '0 14px',
								boxSizing: 'border-box',
							}}
						>
							<MapStackStarIcon size={24} className="flex-shrink-0" />
							<span
								style={{
									fontSize: '18px',
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
						<div
							style={{
								position: 'absolute',
								top: '40px',
								left: 0,
								right: 0,
								height: '2px',
								background: '#000',
							}}
						/>
					</div>

					{/* Box 2: profile card — 659x552, blue header (#ABCBF9) above a divider at 56px. */}
					<div
						style={{
							position: 'absolute',
							top: '94px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '659px',
							height: '552px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: '#F2F7FF',
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '56px',
								background: '#ABCBF9',
								display: 'flex',
								alignItems: 'center',
								gap: '12px',
								padding: '0 16px',
								boxSizing: 'border-box',
							}}
						>
							<span
								style={{
									flexShrink: 0,
									width: '36px',
									height: '36px',
									borderRadius: '50%',
									background: '#54D06A',
									color: '#FFF',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '18px',
									fontWeight: 700,
									lineHeight: 1,
								}}
							>
								{performerInitial}
							</span>
							<span
								style={{
									background: '#C7F5CE',
									borderRadius: '6px',
									padding: '3px 10px',
									fontSize: '18px',
									fontWeight: 700,
									lineHeight: 1.1,
									whiteSpace: 'nowrap',
								}}
							>
								{performerName}
							</span>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#CFE0FB',
									}}
								/>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#E8F0FE',
									}}
								/>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#FFF',
									}}
								/>
							</span>
						</div>
						<div
							style={{
								position: 'absolute',
								top: '56px',
								left: 0,
								right: 0,
								height: '2px',
								background: '#000',
							}}
						/>

						{/* Body: white content panel (639x401), 58px below the divider (divider ends at 58px). */}
						<div
							style={{
								position: 'absolute',
								top: '116px',
								left: 0,
								right: 0,
								marginLeft: 'auto',
								marginRight: 'auto',
								width: '639px',
								height: '401px',
								borderRadius: '9px',
								background: '#FFF',
								display: 'flex',
								gap: '24px',
								padding: '32px 16px',
								boxSizing: 'border-box',
							}}
						>
							<div
								style={{
									flex: 1,
									display: 'flex',
									flexDirection: 'column',
									gap: '40px',
									color: '#9A9A9A',
									fontSize: '12.35px',
									fontWeight: 600,
									lineHeight: '22.175px',
								}}
							>
								<span>Genre</span>
								<span>Area</span>
								<span>Performing Name</span>
								<span>Bio</span>
							</div>
							<div
								style={{
									width: '273px',
									flexShrink: 0,
									display: 'flex',
									flexDirection: 'column',
									gap: '18px',
								}}
							>
								<span
									style={{
										color: '#000',
										fontSize: '11.418px',
										fontStyle: 'italic',
										fontWeight: 300,
										lineHeight: '15.223px',
									}}
								>
									Add a video to verify your account and improve your profile
								</span>
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: '#6B7280',
										fontSize: '40px',
										fontWeight: 300,
										lineHeight: 1,
									}}
								>
									+
								</div>
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										opacity: 0.8,
									}}
								/>
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										opacity: 0.5,
									}}
								/>
							</div>
						</div>
					</div>

					{/* Apply button — visual only for now (no submit endpoint wired). */}
					<button
						type="button"
						onClick={(e) => e.stopPropagation()}
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: '15px',
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '244px',
							height: '26px',
							borderRadius: '12.084px',
							background: '#E06D6D',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '18.909px',
							fontWeight: 500,
							lineHeight: '18.391px',
							color: '#000',
							border: 'none',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Apply
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}
