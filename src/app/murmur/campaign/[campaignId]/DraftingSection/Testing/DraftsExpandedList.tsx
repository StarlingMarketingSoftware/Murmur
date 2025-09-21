'use client';

import { FC } from 'react';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';

export interface DraftsExpandedListProps {
	drafts: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
}

const ArrowIcon = () => (
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
);

export const DraftsExpandedList: FC<DraftsExpandedListProps> = ({
	drafts,
	contacts,
	onHeaderClick,
}) => {
	return (
		<div
			className="w-[376px] h-[426px] rounded-md border-2 border-black/30 bg-[#F4E5BC] px-2 pb-2 flex flex-col"
			role="region"
			aria-label="Expanded drafts preview"
		>
			{/* Header row */}
			<div
				className={cn(
					'flex items-center gap-2 h-[21px] px-1',
					onHeaderClick ? 'cursor-pointer' : ''
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
				<span className="font-bold text-black text-sm">Drafts</span>
				<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full">
					<span>{`${drafts.length} drafts`}</span>
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
						Send
					</button>
				</div>
				<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
					<span className="w-[20px] text-center">3</span>
					<ArrowIcon />
				</div>
			</div>

			{/* Scrollable list */}
			<CustomScrollbar
				className="flex-1 drafting-table-content"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-5}
				contentClassName="overflow-x-hidden"
				alwaysShow
			>
				<div className="space-y-2 pb-2 flex flex-col items-center">
					{drafts.map((draft) => {
						const contact = contacts?.find((c) => c.id === draft.contactId);
						const contactName = contact
							? contact.name ||
							  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
							  contact.company ||
							  'Contact'
							: 'Unknown Contact';
						return (
							<div
								key={draft.id}
								className={cn(
									'cursor-default grid grid-cols-1 grid-rows-4 w-full max-w-[356px] h-[64px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2 select-none relative'
								)}
							>
								{/* Fixed top-right info (Location + Title) */}
								<div className="absolute top-[6px] right-[6px] flex flex-col items-end gap-[2px] w-[110px] pointer-events-none">
									<div className="flex items-center justify-start gap-1 h-[12px] w-full">
										{(() => {
											const fullStateName = (contact?.state as string) || '';
											const stateAbbr = getStateAbbreviation(fullStateName) || '';
											const normalizedState = fullStateName.trim();
											const lowercaseCanadianProvinceNames = canadianProvinceNames.map(
												(s) => s.toLowerCase()
											);
											const isCanadianProvince =
												lowercaseCanadianProvinceNames.includes(
													normalizedState.toLowerCase()
												) ||
												canadianProvinceAbbreviations.includes(
													normalizedState.toUpperCase()
												) ||
												canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
											const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

											if (!stateAbbr) return null;
											return isCanadianProvince ? (
												<div
													className="inline-flex items-center justify-center w-[18px] h-[12px] rounded-[3.5px] border overflow-hidden"
													style={{ borderColor: '#000000' }}
												>
													<CanadianFlag
														width="100%"
														height="100%"
														className="w-full h-full"
													/>
												</div>
											) : isUSAbbr ? (
												<span
													className="inline-flex items-center justify-center w-[18px] h-[12px] rounded-[3.5px] border text-[8px] leading-none font-bold"
													style={{
														backgroundColor:
															stateBadgeColorMap[stateAbbr] || 'transparent',
														borderColor: '#000000',
													}}
												>
													{stateAbbr}
												</span>
											) : (
												<span
													className="inline-flex items-center justify-center w-[18px] h-[12px] rounded-[3.5px] border"
													style={{ borderColor: '#000000' }}
												/>
											);
										})()}
										{contact?.city ? (
											<ScrollableText
												text={contact.city}
												className="text-[10px] text-black leading-none max-w-[80px]"
											/>
										) : null}
									</div>

									{contact?.headline ? (
										<div className="absolute top-[24px] right-[6px] w-[110px] h-[12px] rounded-[3.7px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
											<ScrollableText
												text={contact.headline}
												className="text-[8px] text-black leading-none px-1"
											/>
										</div>
									) : null}
								</div>

								{/* Content grid */}
								<div className="grid grid-cols-1 grid-rows-4 h-full pr-[120px]">
									{/* Row 1: Name */}
									<div className="row-start-1 col-start-1 flex items-center">
										<div className="font-bold text-[11px] truncate leading-none">
											{contactName}
										</div>
									</div>
									{/* Row 2: Company (when separate name exists) */}
									{(() => {
										const hasSeparateName = Boolean(
											(contact?.name && contact.name.trim()) ||
												(contact?.firstName && contact.firstName.trim()) ||
												(contact?.lastName && contact.lastName.trim())
										);
										return (
											<div className="row-start-2 col-start-1 flex items-center pr-2">
												<div className="text-[11px] text-black truncate leading-none">
													{hasSeparateName ? contact?.company || '' : ''}
												</div>
											</div>
										);
									})()}
									{/* Row 3: Subject */}
									<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center">
										{draft.subject || 'No subject'}
									</div>
									{/* Row 4: Message preview */}
									<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center">
										{draft.message
											? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
											: 'No content'}
									</div>
								</div>
							</div>
						);
					})}
					{Array.from({ length: Math.max(0, 6 - drafts.length) }).map((_, idx) => (
						<div
							key={`draft-placeholder-${idx}`}
							className="select-none w-full max-w-[356px] h-[64px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white"
						/>
					))}
				</div>
			</CustomScrollbar>

			{/* Footer bar */}
			<div className="mt-2 w-full max-w-[356px] h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium">
				Send Selected
			</div>
		</div>
	);
};

export default DraftsExpandedList;
