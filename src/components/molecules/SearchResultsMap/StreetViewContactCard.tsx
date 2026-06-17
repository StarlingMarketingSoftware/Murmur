import React from 'react';
import { ContactWithName } from '@/types/contact';
import { useGetContactResearch } from '@/hooks/queryHooks/useContacts';
import { getStateAbbreviation, parseMetadataSections } from './metadata';
import { LatLngLiteral } from './types';

// Band colors mirror the abridged ContactResearchPanel (the docked side panel)
// so the persistent card reads as the same research surface.
const STRIPE_COLOR = '#F67C7E';
const ADDRESS_BAND_COLOR = '#ABDCF9';
const BLURB_BAND_COLOR = '#BBE0F5';

interface StreetViewContactCardProps {
	contact: ContactWithName;
	coords: LatLngLiteral;
	isSelected: boolean;
	isSelectionEligible: boolean;
	/** Raises the card above overlapping neighbors while its marker is hovered. */
	isHovered: boolean;
	onHoverStart: (contact: ContactWithName) => void;
	onHoverEnd: (contactId: number) => void;
	/** Receives the full contact — overlay-only contacts aren't resolvable by id upstream. */
	onToggleSelection?: (contact: ContactWithName) => void;
	/** Forwards wheel events to the map so the always-interactive card doesn't block zoom. */
	onWheelForward: (e: React.WheelEvent) => void;
	/**
	 * Feeds the parent's contactId → element map; the parent positions the card
	 * imperatively (el.style.transform) on map 'move', so this component must
	 * never declare `transform` on the outer element's JSX style.
	 */
	registerEl: (contactId: number, el: HTMLDivElement | null) => void;
}

const StreetViewContactCardImpl: React.FC<StreetViewContactCardProps> = ({
	contact,
	coords,
	isSelected,
	isSelectionEligible,
	isHovered,
	onHoverStart,
	onHoverEnd,
	onToggleSelection,
	onWheelForward,
	registerEl,
}) => {
	// Slim overlay payloads (booking/promotion — see api/contacts/map-overlay) omit
	// metadata/address; backfill via the per-contact research endpoint (30-min cache).
	const needsBackfill = !contact.metadata || !contact.address;
	const { data: research, isLoading: isResearchLoading } = useGetContactResearch(
		needsBackfill ? contact.id : null
	);

	const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const name = fullName || contact.name || contact.company || 'Unknown';
	const company = fullName || contact.name ? contact.company || '' : '';
	const cityStateFallback = [
		contact.city,
		getStateAbbreviation(contact.state || '') || contact.state,
	]
		.filter(Boolean)
		.join(', ');
	const address = contact.address || research?.address || cityStateFallback;
	const metadata = contact.metadata || research?.metadata || null;
	const sections = parseMetadataSections(metadata);
	const blurb = sections['1'] ?? (metadata?.trim() || '');

	return (
		<div
			ref={(el) => registerEl(contact.id, el)}
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				zIndex: isHovered ? 10 : 1,
				willChange: 'transform',
				pointerEvents: 'none',
			}}
		>
			{/* Self-centers above the marker point; the transparent bottom padding
			    bridges the marker→card gap so hover never crosses a dead zone. */}
			<div
				style={{
					transform: 'translate(-50%, -100%)',
					paddingBottom: '18px',
					pointerEvents: 'auto',
				}}
				onMouseEnter={() => onHoverStart(contact)}
				onMouseLeave={() => onHoverEnd(contact.id)}
				onWheel={onWheelForward}
			>
				<div
					className="relative w-[280px] rounded-[10px] bg-white overflow-hidden font-inter"
					style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
				>
					{/* Name / company / coordinates */}
					<div className="px-3 pt-3 pb-2">
						<div className="font-bold text-[14px] leading-tight text-black truncate">
							{name}
						</div>
						{company && (
							<div className="text-[12px] leading-tight text-black/70 truncate mt-[2px]">
								{company}
							</div>
						)}
						<div className="text-[10px] leading-none text-black/50 mt-[6px] tabular-nums">
							{coords.lat.toFixed(4)} {coords.lng.toFixed(4)}
						</div>
					</div>
					{/* Coral stripe (same as the docked research panel) */}
					<div
						className="w-full"
						style={{ height: '12px', backgroundColor: STRIPE_COLOR }}
					/>
					{/* Address band */}
					{address && (
						<div className="px-3 py-[6px]" style={{ backgroundColor: ADDRESS_BAND_COLOR }}>
							<div className="text-[12px] font-semibold text-black leading-snug">
								{address}
							</div>
						</div>
					)}
					{/* Research blurb band */}
					{(blurb || isResearchLoading) && (
						<div className="px-3 py-2" style={{ backgroundColor: BLURB_BAND_COLOR }}>
							{blurb ? (
								<div
									className="text-[11px] font-semibold text-black/80 leading-snug"
									style={{
										display: '-webkit-box',
										WebkitLineClamp: 3,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
									}}
								>
									{blurb}
								</div>
							) : (
								<div className="text-[11px] italic text-black/40">Researching…</div>
							)}
						</div>
					)}
					{/* Selection toggle (hidden for contacts the marker click also ignores) */}
					{isSelectionEligible && (
						<button
							type="button"
							className="w-full h-[34px] text-[12px] font-bold text-black transition-colors"
							style={{
								backgroundColor: isSelected ? '#9BC6DF' : '#C9EAFF',
								borderTop: '1px solid rgba(0,0,0,0.15)',
							}}
							onClick={(e) => {
								e.stopPropagation();
								onToggleSelection?.(contact);
							}}
						>
							{isSelected ? 'Remove from Selection' : 'Add to Selection'}
						</button>
					)}
				</div>
				{/* Pointer triangle (sits in the bottom hover-bridge padding) */}
				<div
					className="absolute left-1/2 -translate-x-1/2"
					style={{
						bottom: '8px',
						width: 0,
						height: 0,
						borderLeft: '8px solid transparent',
						borderRight: '8px solid transparent',
						borderTop: `10px solid ${
							isSelectionEligible
								? isSelected
									? '#9BC6DF'
									: '#C9EAFF'
								: BLURB_BAND_COLOR
						}`,
					}}
				/>
			</div>
		</div>
	);
};

export const StreetViewContactCard = React.memo(StreetViewContactCardImpl);
