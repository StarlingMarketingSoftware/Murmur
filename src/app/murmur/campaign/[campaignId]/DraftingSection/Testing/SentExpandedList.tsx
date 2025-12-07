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
	/** Custom height for the white header section in pixels */
	whiteSectionHeight?: number;
}

const SentHeaderChrome: FC<{
	offsetY?: number;
	hasData?: boolean;
	isAllTab?: boolean;
	whiteSectionHeight?: number;
}> = ({ offsetY = 0, hasData = true, isAllTab = false, whiteSectionHeight }) => {
	const isBottomView = whiteSectionHeight === 15;
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#000000' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#C3E7BF' : '#FFAEAE';
	const dotSize = isBottomView ? 5 : isAllTab ? 6 : 9;
	// First dot is 29px from the left
	const dot1Left = isBottomView ? 18 : 29;
	const originalDot2Left = isBottomView ? 110 : isAllTab ? 177.5 : 176;
	const dot3Left = isBottomView ? 146 : isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isBottomView ? 40 : isAllTab ? 50 : 72;
	// Center pill between first and second dots (this will be the new dot2 position)
	const midpointBetweenDots = (dot1Left + originalDot2Left) / 2;
	const newDot2Left = midpointBetweenDots - dotSize / 2;
	// Pill now goes where dot2 was - center the pill at the original dot2 position
	const pillLeft = originalDot2Left - pillWidth / 2;
	const pillHeight = isBottomView ? 10 : isAllTab ? 15 : 22;
	const pillBorderRadius = isBottomView ? 5 : isAllTab ? 7.5 : 11;
	const pillFontSize = isBottomView ? '8px' : isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop =
		whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3 + offsetY;
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
	whiteSectionHeight: customWhiteSectionHeight,
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
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15;
	const isFullyEmpty = sent.length === 0;
	const placeholderBgColor = isFullyEmpty ? '#3DAC61' : '#5AB477';

	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-md flex flex-col overflow-visible',
				isBottomView
					? 'border-2 border-black'
					: isAllTab
					? 'border-[3px] border-black'
					: 'border-2 border-black/30'
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
			<SentHeaderChrome isAllTab={isAllTab} whiteSectionHeight={customWhiteSectionHeight} />
			<div
				className={cn(
					'flex items-center gap-2 px-3 shrink-0',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				style={{ height: `${whiteSectionHeight}px` }}
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

			<div
				className={cn(
					'relative flex-1 flex flex-col min-h-0',
					isBottomView ? 'px-[2px] pt-0 pb-0' : 'px-2 pt-2 pb-2'
				)}
			>
				{/* Scrollable list */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor={isBottomView ? 'transparent' : '#000000'}
					trackColor="transparent"
					offsetRight={isBottomView ? -7 : -14}
					contentClassName="overflow-x-hidden"
					alwaysShow={!isBottomView && !isFullyEmpty}
				>
					<div
						className={cn(
							'flex flex-col items-center',
							isBottomView ? 'space-y-1 pb-0' : 'space-y-2 pb-2'
						)}
						style={{
							paddingTop:
								customWhiteSectionHeight !== undefined
									? '2px'
									: isAllTab
									? `${39 - whiteSectionHeight}px`
									: `${38 - whiteSectionHeight}px`,
						}}
					>
						{sent.map((email) => {
							const contact = contacts?.find((c) => c.id === email.contactId);
							const contactName = contact
								? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';
							const isSelected = selectedSentIds.has(email.id as number);
							const contactTitle = contact?.title || contact?.headline || '';

							return (
								<div
									key={email.id}
									className={cn(
										'cursor-pointer transition-colors relative select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
										isBottomView
											? 'w-[225px] h-[49px]'
											: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]',
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

										{contactTitle ? (
											<div className="w-[110px] h-[10px] rounded-[3.71px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
												<ScrollableText
													text={contactTitle}
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
						{Array.from({
							length: Math.max(0, (isBottomView ? 2 : 4) - sent.length),
						}).map((_, idx) => (
							<div
								key={`sent-placeholder-${idx}`}
								className={cn(
									'select-none overflow-hidden rounded-[8px] border-2 border-[#000000] p-2',
									isBottomView
										? 'w-[225px] h-[49px]'
										: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]'
								)}
								style={{ backgroundColor: placeholderBgColor }}
							/>
						))}
					</div>
				</CustomScrollbar>
			</div>
		</div>
	);
};

export default SentExpandedList;
