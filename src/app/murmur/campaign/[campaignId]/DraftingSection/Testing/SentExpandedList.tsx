'use client';

import { FC, MouseEvent, useMemo, useRef, useState } from 'react';
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
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';

export interface SentExpandedListProps {
	sent: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	/** Custom width in pixels */
	width?: number;
	/** Custom height in pixels */
	height?: number;
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

const SentHeaderChrome: FC<{
	offsetY?: number;
	hasData?: boolean;
	isAllTab?: boolean;
}> = ({ offsetY = 0, hasData = true, isAllTab = false }) => {
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#000000' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#C3E7BF' : '#FFAEAE';
	const dotSize = isAllTab ? 6 : 9;
	// First dot is 29px from the left
	const dot1Left = 29;
	const originalDot2Left = isAllTab ? 177.5 : 176;
	const dot3Left = isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isAllTab ? 50 : 72;
	// Center pill between first and second dots (this will be the new dot2 position)
	const midpointBetweenDots = (dot1Left + originalDot2Left) / 2;
	const newDot2Left = midpointBetweenDots - dotSize / 2;
	// Pill now goes where dot2 was - center the pill at the original dot2 position
	const pillLeft = originalDot2Left - pillWidth / 2;
	const pillHeight = isAllTab ? 15 : 22;
	const pillBorderRadius = isAllTab ? 7.5 : 11;
	const pillFontSize = isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop = 3 + offsetY;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot1Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${newDot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${pillLeft}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: pillBgColor,
					border: `2px solid ${pillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{
						color: pillTextColor,
						fontSize: pillFontSize,
						textAlign: 'center',
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						marginTop: isAllTab ? '-1px' : 0, // Optical alignment adjustment
					}}
				>
					Sent
				</span>
			</div>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot3Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
		</>
	);
};

export const SentExpandedList: FC<SentExpandedListProps> = ({
	sent,
	contacts,
	onHeaderClick,
	width = 376,
	height = 426,
}) => {
	const [selectedSentIds, setSelectedSentIds] = useState<Set<number>>(new Set());
	const lastClickedRef = useRef<number | null>(null);

	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	const handleSentClick = (emailId: number, e: MouseEvent) => {
		if (e.shiftKey && lastClickedRef.current !== null) {
			// Prevent text selection on shift-click
			e.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = sent.findIndex((s) => s.id === emailId);
			const lastIndex = sent.findIndex((s) => s.id === lastClickedRef.current);
			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);
				const newSelected = new Set<number>();
				for (let i = start; i <= end; i++) {
					const id = sent[i].id as number;
					newSelected.add(id);
				}
				setSelectedSentIds(newSelected);
			}
		} else {
			setSelectedSentIds((prev) => {
				const next = new Set(prev);
				if (next.has(emailId)) {
					next.delete(emailId);
				} else {
					next.add(emailId);
				}
				return next;
			});
			lastClickedRef.current = emailId ?? null;
		}
	};

	const areAllSelected = selectedSentIds.size === sent.length && sent.length > 0;
	const handleSelectAllToggle = () => {
		if (areAllSelected) {
			setSelectedSentIds(new Set());
		} else {
			setSelectedSentIds(new Set(sent.map((s) => s.id as number)));
		}
	};

	// Special hack for "All" tab: if height is exactly 347px, we apply a thicker 3px border
	// to match the other elements in that layout. Otherwise standard 2px border.
	const isAllTab = height === 347;
	const whiteSectionHeight = isAllTab ? 20 : 28;

	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-md flex flex-col overflow-visible',
				isAllTab ? 'border-[3px] border-black' : 'border-2 border-black/30'
			)}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				background: `linear-gradient(to bottom, #ffffff ${whiteSectionHeight}px, #5AB477 ${whiteSectionHeight}px)`,
			}}
			role="region"
			aria-label="Expanded sent preview"
		>
			{/* Header row (no explicit divider; let the background change from white to green like the main table) */}
			<SentHeaderChrome isAllTab={isAllTab} />
			<div
				className={cn(
					'flex items-center gap-2 h-[28px] px-3 shrink-0',
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
			></div>

			{/* Selection counter and Select All row - absolutely positioned */}
			{isAllTab && (
				<div
					className="absolute flex items-center justify-center px-2 z-10"
					style={{ top: '22px', left: 0, right: 0, height: '14px' }}
				>
					<span
						className="font-inter font-medium text-[10px] text-black"
						style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
					>
						{selectedSentIds.size} Selected
					</span>
					<span
						className="font-inter font-medium text-[10px] text-black cursor-pointer hover:underline"
						style={{ position: 'absolute', right: '10px' }}
						onClick={handleSelectAllToggle}
					>
						Select All
					</span>
				</div>
			)}

			<div className="relative flex-1 flex flex-col pb-2 pt-2 min-h-0 px-2">
				{/* Scrollable list */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-14}
					contentClassName="overflow-x-hidden"
					alwaysShow
				>
					<div
						className="space-y-2 pb-2 flex flex-col items-center"
						style={{ paddingTop: isAllTab ? '3px' : `${38 - whiteSectionHeight}px` }}
					>
						{sent.map((email) => {
							const contact = contacts?.find((c) => c.id === email.contactId);
							const contactName = contact
								? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';
							const isSelected = selectedSentIds.has(email.id as number);

							return (
								<div
									key={email.id}
									className={cn(
										'cursor-pointer transition-colors relative select-none w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
										isSelected && 'bg-[#A8E6A8]'
									)}
									onMouseDown={(e) => {
										if (e.shiftKey) e.preventDefault();
									}}
									onClick={(e) => handleSentClick(email.id as number, e)}
								>
									{/* Fixed top-right info (Location + Title) */}
									<div className="absolute top-[6px] right-[6px] flex flex-col items-end gap-[2px] w-[110px] pointer-events-none">
										<div className="flex items-center justify-start gap-1 h-[11.67px] w-full">
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
														className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border overflow-hidden"
														style={{ borderColor: '#000000' }}
														title="Canadian province"
													>
														<CanadianFlag
															width="100%"
															height="100%"
															className="w-full h-full"
														/>
													</div>
												) : isUSAbbr ? (
													<span
														className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border text-[8px] leading-none font-bold"
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
														className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border"
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
											<div className="w-[110px] h-[10px] rounded-[3.71px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
												<ScrollableText
													text={contact.headline}
													className="text-[8px] text-black leading-none px-1"
												/>
											</div>
										) : null}
									</div>

									{/* Content grid */}
									<div className="grid grid-cols-1 grid-rows-4 h-full pr-[120px] pl-[22px]">
										{/* Row 1: Name */}
										<div className="row-start-1 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]">
											<div className="font-bold text-[11px] truncate leading-none">
												{contactName}
											</div>
										</div>

										{/* Row 2: Company (only when there is a separate name) */}
										{(() => {
											const hasSeparateName = Boolean(
												(contact?.firstName && contact.firstName.trim()) ||
													(contact?.lastName && contact.lastName.trim())
											);
											return (
												<div className="row-start-2 col-start-1 flex items-center pr-2 h-[16px] max-[480px]:h-[12px]">
													<div className="text-[11px] text-black truncate leading-none">
														{hasSeparateName ? contact?.company || '' : ''}
													</div>

													{/* Used-contact indicator - vertically centered */}
													{usedContactIdsSet.has(email.contactId) && (
														<span
															className="absolute left-[8px]"
															title="Used in a previous campaign"
															style={{
																top: '50%',
																transform: 'translateY(-50%)',
																width: '16px',
																height: '16px',
																borderRadius: '50%',
																border: '1px solid #000000',
																backgroundColor: '#DAE6FE',
															}}
														/>
													)}
												</div>
											);
										})()}

										{/* Row 3: Subject */}
										<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px] max-[480px]:items-start max-[480px]:-mt-[2px]">
											{email.subject || 'No subject'}
										</div>

										{/* Row 4: Message preview */}
										<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px]">
											{email.message
												? email.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
												: 'No content'}
										</div>
									</div>
								</div>
							);
						})}
						{Array.from({ length: Math.max(0, 4 - sent.length) }).map((_, idx) => (
							<div
								key={`sent-placeholder-${idx}`}
								className="select-none w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#5AB477] p-2"
							/>
						))}
					</div>
				</CustomScrollbar>
			</div>
		</div>
	);
};

export default SentExpandedList;
