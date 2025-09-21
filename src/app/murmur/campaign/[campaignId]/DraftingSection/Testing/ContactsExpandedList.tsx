'use client';

import { FC } from 'react';
import { ContactWithName } from '@/types/contact';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';

export interface ContactsExpandedListProps {
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
}

/**
 * Standalone UI for the Testing panel's expanded Contacts preview.
 * Mirrors the data shown in the drafting Contacts table but keeps UI separate.
 */
export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	onHeaderClick,
}) => {
	return (
		<div
			className="w-[376px] h-[424px] rounded-md border-2 border-black/30 bg-[#F5DADA] p-2 overflow-hidden"
			role="region"
			aria-label="Expanded contacts preview"
		>
			{/* Header row */}
			<div
				className={cn(
					'flex items-center gap-2 h-[28px] px-1',
					onHeaderClick ? 'cursor-pointer hover:bg-black/5 rounded-sm' : ''
				)}
				role={onHeaderClick ? 'button' : undefined}
				tabIndex={onHeaderClick ? 0 : undefined}
				onClick={onHeaderClick}
				onKeyDown={(e) => {
					if (!onHeaderClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onHeaderClick();
					}
				}}
			>
				<span className="font-bold text-black text-sm">Contacts</span>
				<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full">
					<span>{`${String(contacts.length).padStart(2, '0')} ${
						contacts.length === 1 ? 'person' : 'people'
					}`}</span>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => e.stopPropagation()}
					>
						Select All
					</button>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => e.stopPropagation()}
					>
						Draft
					</button>
				</div>
				<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
					<span className="w-[20px] text-center">1</span>
					<svg
						width="7"
						height="12"
						viewBox="0 0 7 12"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M6.53033 6.53033C6.82322 6.23744 6.82322 5.76256 6.53033 5.46967L1.75736 0.696699C1.46447 0.403806 0.989593 0.403806 0.696699 0.696699C0.403806 0.989593 0.403806 1.46447 0.696699 1.75736L4.93934 6L0.696699 10.2426C0.403806 10.5355 0.403806 11.0104 0.696699 11.3033C0.989593 11.5962 1.46447 11.5962 1.75736 11.3033L6.53033 6.53033ZM5 6V6.75H6V6V5.25H5V6Z"
							fill="#636363"
							fillOpacity="0.46"
						/>
					</svg>
				</div>
			</div>

			{/* Scrollable list */}
			<div className="mt-1 h-[384px] overflow-y-auto pr-1 space-y-2">
				{contacts.map((c) => {
					const fullName = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
					return (
						<div
							key={c.id}
							className={cn(
								'grid grid-cols-[24px_1fr_auto] grid-rows-2 items-center w-[356px] min-h-[56px] rounded-[8px] border-2 border-[#000000] bg-white px-2 py-1'
							)}
						>
							{/* Left: selection bullet placeholder */}
							<div className="row-span-2 flex items-center justify-center">
								<div className="h-4 w-4 rounded-full border border-black/30" />
							</div>

							{/* Top: name or company */}
							<div className="col-start-2 row-start-1 pr-2">
								<div className="font-bold text-[12px] leading-tight truncate">
									{fullName || c.company || 'Contact'}
								</div>
							</div>
							{/* Right top: tag/badge (category or title) */}
							<div className="col-start-3 row-start-1">
								{c.headline ? (
									<div className="h-[20px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden max-w-[160px]">
										<ScrollableText
											text={c.headline}
											className="text-[10px] leading-none"
										/>
									</div>
								) : (
									<div className="h-[20px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black text-[10px] leading-none">
										Music Venue
									</div>
								)}
							</div>

							{/* Bottom: company */}
							<div className="col-start-2 row-start-2 pr-2 text-[11px] truncate">
								{c.company || ''}
							</div>
						</div>
					);
				})}
				{/* Draft footer bar as in mockup */}
				<div className="w-[356px] h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium">
					Draft
				</div>
			</div>
		</div>
	);
};

export default ContactsExpandedList;
