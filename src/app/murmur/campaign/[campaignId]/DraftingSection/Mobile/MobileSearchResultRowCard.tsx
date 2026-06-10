'use client';

import { FC } from 'react';
import { stateBadgeColorMap } from '@/constants/ui';
import { getStateAbbreviation } from '@/utils/string';
import { ContactWithName } from '@/types/contact';
import { MobileSearchCategoryPill } from './MobileCampaignSearchHeader';

// Full-width Search Results row for the mobile list view — same layout/tokens as the
// desktop Search Results panel rows.
export const MobileSearchResultRowCard: FC<{
	contact: ContactWithName;
	isSelected: boolean;
	onToggle: () => void;
}> = ({ contact, isSelected, onToggle }) => {
	const firstName = contact.firstName || '';
	const lastName = contact.lastName || '';
	const fullName = contact.name || `${firstName} ${lastName}`.trim();
	const company = contact.company || '';
	const headline = contact.headline || contact.title || '';
	const stateAbbr = getStateAbbreviation(contact.state || '') || '';
	const city = contact.city || '';

	return (
		<div
			data-contact-id={contact.id}
			className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-[#ABABAB] select-none"
			style={{ backgroundColor: isSelected ? '#C9EAFF' : '#FFFFFF' }}
			onClick={onToggle}
		>
			{fullName ? (
				<div className="pl-3 pr-1 flex items-center h-[23px]">
					<div className="font-bold text-[11px] w-full truncate leading-tight">
						{fullName}
					</div>
				</div>
			) : (
				<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
					<div className="font-bold text-[11px] w-full truncate leading-tight">
						{company || '—'}
					</div>
				</div>
			)}
			{/* Top Right - Title/Headline */}
			<div className="pr-2 pl-1 flex items-center h-[23px]">
				{headline ? (
					<MobileSearchCategoryPill headline={headline} />
				) : (
					<div className="w-full" />
				)}
			</div>
			{/* Bottom Left - Company (only when a name occupies the top-left cell) */}
			{fullName ? (
				<div className="pl-3 pr-1 flex items-center h-[22px]">
					<div className="text-[11px] text-black w-full truncate leading-tight">
						{company}
					</div>
				</div>
			) : null}
			{/* Bottom Right - Location */}
			<div className="pr-2 pl-1 flex items-center h-[22px]">
				{city || stateAbbr ? (
					<div className="flex items-center gap-1 w-full">
						{stateAbbr && (
							<span
								className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
								style={{
									backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
									borderColor: '#000000',
								}}
							>
								{stateAbbr}
							</span>
						)}
						{city && (
							<span className="text-[10px] text-black leading-none truncate">
								{city}
							</span>
						)}
					</div>
				) : (
					<div className="w-full" />
				)}
			</div>
		</div>
	);
};
