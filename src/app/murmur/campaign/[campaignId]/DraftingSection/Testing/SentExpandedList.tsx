'use client';

import { FC, MouseEvent, useMemo, useRef, useState } from 'react';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

export interface SentExpandedListProps {
	sent: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	onOpenSent?: () => void;
	/** Optional hover callback (used by Campaign "All" tab previews) */
	onEmailHover?: (email: EmailWithRelations | null) => void;
	/**
	 * When `allTab`, the component behaves like a dashboard preview:
	 * - no row selected background colors
	 * - no header hover/click affordances
	 * - rows still fire `onEmailHover` so the All tab can update Research + Preview
	 */
	interactionMode?: 'default' | 'allTab';
	/**
	 * When true, renders only the header chrome (no rows) for ultra-compact bottom panel layouts.
	 */
	collapsed?: boolean;
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
	// Add a tiny visual padding so the pill doesn't visually "kiss" the top border in tighter headers.
	const visualTopPaddingPx = 1;
	const pillTopBase = whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3;
	const pillTop = pillTopBase + offsetY + visualTopPaddingPx;
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
	onOpenSent,
	onEmailHover,
	interactionMode = 'default',
	collapsed = false,
	width = 376,
	height = 426,
	whiteSectionHeight: customWhiteSectionHeight,
}) => {
	const [selectedSentIds, setSelectedSentIds] = useState<Set<number>>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	
	// Track whether the container is being hovered (for bottom view outline)
	const [isContainerHovered, setIsContainerHovered] = useState(false);

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
	const isAllTabNavigation = interactionMode === 'allTab';
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
				...(isBottomView ? { cursor: 'pointer' } : {}),
			}}
			data-hover-description="Sent: Emails that have already been sent for this campaign."
			role="region"
			aria-label="Expanded sent preview"
			onMouseEnter={() => isBottomView && setIsContainerHovered(true)}
			onMouseLeave={() => isBottomView && setIsContainerHovered(false)}
			onClick={() => isBottomView && onOpenSent?.()}
		>
			{/* Hover outline for bottom view - 3px gap top/bottom, 2px gap sides, 4px thick */}
			{isBottomView && isContainerHovered && (
				<div
					style={{
						position: 'absolute',
						top: '-7px',
						bottom: '-7px',
						left: '-6px',
						right: '-6px',
						border: '4px solid #84CC7C',
						borderRadius: 0,
						pointerEvents: 'none',
						zIndex: 50,
					}}
				/>
			)}
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

			{(isAllTab || isBottomView) && (
				<div
					className={cn(
						'absolute z-20 flex items-center gap-[12px]',
						isAllTabNavigation ? 'pointer-events-none cursor-default' : 'cursor-pointer'
					)}
					style={{ top: isBottomView ? 1 : -1, right: isBottomView ? 4 : 4 }}
					onClick={onOpenSent}
					role={onOpenSent ? 'button' : undefined}
					tabIndex={onOpenSent ? 0 : undefined}
					onKeyDown={(e) => {
						if (!onOpenSent) return;
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpenSent();
						}
					}}
				>
					<span className={cn(
						"font-medium leading-none text-[#B3B3B3] font-inter",
						isBottomView ? "text-[8px]" : "text-[10px]"
					)}>
						Open
					</span>
					<div className="flex items-center" style={{ marginTop: isBottomView ? 0 : '1px' }}>
						<OpenIcon width={isBottomView ? 10 : undefined} height={isBottomView ? 10 : undefined} />
					</div>
				</div>
			)}

			{/* Selection counter and Select All row - absolutely positioned */}
			{!collapsed && isAllTab && (
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
					{isAllTabNavigation ? (
						<span
							className="font-inter font-medium text-[10px] text-black cursor-default"
							style={{ position: 'absolute', right: '10px' }}
						>
							Select All
						</span>
					) : (
						<span
							className="font-inter font-medium text-[10px] text-black cursor-pointer hover:underline"
							style={{ position: 'absolute', right: '10px' }}
							onClick={handleSelectAllToggle}
						>
							Select All
						</span>
					)}
				</div>
			)}

			{!collapsed && (
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
								isBottomView ? 'space-y-[2px] pb-0' : 'space-y-2 pb-2'
							)}
							style={{
								paddingTop:
									customWhiteSectionHeight !== undefined
										? '2px'
										: isAllTab
										? `${39 - whiteSectionHeight}px`
										: `${38 - whiteSectionHeight}px`,
							}}
							onMouseLeave={() => {
								onEmailHover?.(null);
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
										'transition-colors relative select-none overflow-hidden border-2 border-[#000000] bg-white',
										isAllTabNavigation ? 'cursor-default' : 'cursor-pointer',
										isBottomView
											? 'w-[224px] h-[30px] rounded-[4.7px]'
											: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] rounded-[8px]',
										!isBottomView && 'p-2',
										!isAllTabNavigation && isSelected && 'bg-[#A8E6A8]'
									)}
									onMouseDown={(e) => {
										if (e.shiftKey) e.preventDefault();
									}}
									onMouseEnter={() => {
										onEmailHover?.(email);
									}}
									onClick={(e) => {
										if (isAllTabNavigation) return;
										handleSentClick(email.id as number, e);
									}}
								>
									{/* Used-contact indicator - vertically centered */}
									{usedContactIdsSet.has(email.contactId) && (
										<span
											className={cn(
												"absolute left-[8px]",
												isBottomView ? "left-[6px]" : "left-[8px]"
											)}
											style={{
												top: '50%',
												transform: 'translateY(-50%)',
												width: isBottomView ? '12px' : isAllTab ? '13px' : '16px',
												height: isBottomView ? '12px' : isAllTab ? '13px' : '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#DAE6FE',
											}}
										/>
									)}

									{/* Fixed top-right info (Title + Location) */}
									<div
										className={cn(
											"absolute flex flex-col items-end pointer-events-none",
											isBottomView
												? "top-[4px] right-[4px] gap-[1px] w-[90px]"
												: isAllTab
												? "top-[4px] right-[8px] gap-[2px] w-[158px]"
												: "top-[6px] right-[6px] gap-[2px] w-[110px]"
										)}
									>
										{/* Title row - on top */}
										{contactTitle ? (
											<div
												className={cn(
													"border border-black overflow-hidden flex items-center gap-0.5",
													isBottomView
														? "h-[10px] rounded-[3px] px-1 w-full"
														: isAllTab
														? "w-[158px] h-[15px] rounded-[5px] justify-center"
														: "w-[110px] h-[10px] rounded-[3.71px] justify-center"
												)}
												style={{
													backgroundColor: isRestaurantTitle(contactTitle)
														? '#C3FBD1'
														: isCoffeeShopTitle(contactTitle)
															? '#D6F1BD'
															: isMusicVenueTitle(contactTitle)
																? '#B7E5FF'
																: isMusicFestivalTitle(contactTitle)
																	? '#C1D6FF'
																	: (isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle))
																		? '#FFF2BC'
																		: isWineBeerSpiritsTitle(contactTitle)
																			? '#BFC4FF'
																			: '#E8EFFF',
												}}
											>
												{isRestaurantTitle(contactTitle) && (
													<RestaurantsIcon size={isBottomView ? 7 : isAllTab ? 10 : 8} />
												)}
												{isCoffeeShopTitle(contactTitle) && (
													<CoffeeShopsIcon size={5} />
												)}
												{isMusicVenueTitle(contactTitle) && (
													<MusicVenuesIcon size={isBottomView ? 7 : isAllTab ? 10 : 8} className="flex-shrink-0" />
												)}
												{isMusicFestivalTitle(contactTitle) && (
													<FestivalsIcon size={isBottomView ? 7 : isAllTab ? 10 : 8} className="flex-shrink-0" />
												)}
												{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
													<WeddingPlannersIcon size={isBottomView ? 7 : isAllTab ? 10 : 8} />
												)}
												{isWineBeerSpiritsTitle(contactTitle) && (
													<WineBeerSpiritsIcon size={isBottomView ? 7 : isAllTab ? 10 : 8} className="flex-shrink-0" />
												)}
												{isBottomView ? (
													<span className="text-[7px] text-black leading-none truncate">
														{isRestaurantTitle(contactTitle)
															? 'Restaurant'
															: isCoffeeShopTitle(contactTitle)
																? 'Coffee Shop'
																: isMusicVenueTitle(contactTitle)
																	? 'Music Venue'
																	: isMusicFestivalTitle(contactTitle)
																		? 'Music Festival'
																		: isWeddingPlannerTitle(contactTitle)
																			? 'Wedding Planner'
																			: isWeddingVenueTitle(contactTitle)
																				? 'Wedding Venue'
																				: isWineBeerSpiritsTitle(contactTitle)
																					? getWineBeerSpiritsLabel(contactTitle)
																					: contactTitle}
													</span>
												) : (
													<ScrollableText
														text={
															isRestaurantTitle(contactTitle)
																? 'Restaurant'
																: isCoffeeShopTitle(contactTitle)
																	? 'Coffee Shop'
																	: isMusicVenueTitle(contactTitle)
																		? 'Music Venue'
																		: isMusicFestivalTitle(contactTitle)
																			? 'Music Festival'
																			: isWeddingPlannerTitle(contactTitle)
																				? 'Wedding Planner'
																				: isWeddingVenueTitle(contactTitle)
																					? 'Wedding Venue'
																					: isWineBeerSpiritsTitle(contactTitle)
																						? getWineBeerSpiritsLabel(contactTitle) ?? contactTitle
																						: contactTitle
														}
														className="text-[8px] text-black leading-none px-1"
													/>
												)}
											</div>
										) : null}

										{/* Location row - below title */}
										<div
											className={cn(
												"flex items-center justify-start",
												isBottomView
													? "gap-0.5 h-[10px] w-[90px]"
													: isAllTab
													? "gap-1 h-[14px] w-[158px]"
													: "gap-1 h-[11.67px] w-full"
											)}
										>
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
														className={cn(
															"inline-flex items-center justify-center border overflow-hidden",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px]"
																: isAllTab
																? "w-[27px] h-[14px] rounded-[4px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px]"
														)}
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
														className={cn(
															"inline-flex items-center justify-center border leading-none font-bold",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px] text-[7px]"
																: isAllTab
																? "w-[27px] h-[14px] rounded-[4px] text-[9px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px] text-[8px]"
														)}
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
														className={cn(
															"inline-flex items-center justify-center border",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px]"
																: isAllTab
																? "w-[27px] h-[14px] rounded-[4px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px]"
														)}
														style={{ borderColor: '#000000' }}
													/>
												);
											})()}
											{contact?.city ? (
												isBottomView ? (
													<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
														{contact.city}
													</span>
												) : (
													<ScrollableText
														text={contact.city}
														className="text-[10px] text-black leading-none max-w-[80px]"
													/>
												)
											) : null}
										</div>
									</div>

									{/* Content grid */}
									{isBottomView ? (
										/* Bottom view: compact layout with name + company (no subject/body) */
										<div className="grid grid-cols-1 grid-rows-2 h-full pr-[95px] pl-[22px]">
											{/* Row 1: Name */}
											<div className="flex items-center h-[12px] overflow-hidden">
												<div
													className="font-bold text-[9px] leading-none whitespace-nowrap overflow-hidden w-full pr-1"
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{contactName}
												</div>
											</div>
											{/* Row 2: Company */}
											<div className="flex items-center h-[12px] overflow-hidden">
												{(() => {
													const hasSeparateName = Boolean(
														(contact?.firstName && contact.firstName.trim()) ||
															(contact?.lastName && contact.lastName.trim())
													);
													return (
														<div
															className="text-[8px] text-black leading-none whitespace-nowrap overflow-hidden w-full pr-1"
															style={{
																WebkitMaskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
																maskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
															}}
														>
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													);
												})()}
											</div>
										</div>
									) : (
										/* Normal view: 4-row layout */
										<div
											className={cn(
												'grid grid-cols-1 grid-rows-4 h-full pl-[22px]',
												// In the All tab, only the top rows need to reserve space for the fixed
												// top-right badges. Subject/body should be able to use the full right side.
												isAllTab ? 'pr-2' : 'pr-[120px]'
											)}
										>
											{/* Row 1: Name */}
											<div
												className={cn(
													'row-start-1 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]',
													isAllTab && 'pr-[170px]'
												)}
											>
												<div
													className="font-bold text-[11px] leading-none whitespace-nowrap overflow-hidden w-full pr-2"
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
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
													<div
														className={cn(
															'row-start-2 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]',
															isAllTab && 'pr-[170px]'
														)}
													>
														<div
															className="text-[11px] text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2"
															style={{
																WebkitMaskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
																maskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
															}}
														>
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													</div>
												);
											})()}

											{/* Row 3: Subject */}
											<div
												className={cn(
													'row-start-3 col-span-1 flex items-start h-[16px] max-[480px]:h-[12px] max-[480px]:items-start max-[480px]:-mt-[2px]',
													isAllTab ? 'pt-[5px]' : 'mt-[4px]'
												)}
											>
												<div
													className={cn(
														'text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2 font-bold',
														isAllTab ? 'text-[9px]' : 'text-[10px]'
													)}
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{email.subject || 'No subject'}
												</div>
											</div>

											{/* Row 4: Message preview */}
											<div
												className={cn(
													'row-start-4 col-span-1 flex items-start h-[16px] max-[480px]:h-[12px]',
													isAllTab && 'pt-[2px]'
												)}
											>
												<div
													className={cn(
														'text-gray-500 leading-none whitespace-nowrap overflow-hidden w-full pr-2',
														isAllTab ? 'text-[9px]' : 'text-[10px]'
													)}
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{email.message
														? email.message.replace(/<[^>]*>/g, '')
														: 'No content'}
												</div>
											</div>
										</div>
									)}
								</div>
							);
						})}
						{Array.from({
							length: Math.max(0, (isBottomView ? 3 : 4) - sent.length),
						}).map((_, idx) => (
							<div
								key={`sent-placeholder-${idx}`}
								className={cn(
									'select-none overflow-hidden border-2 border-[#000000]',
									isBottomView
										? 'w-[224px] h-[30px] rounded-[4.7px]'
										: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] rounded-[8px]',
									!isBottomView && 'p-2'
								)}
								style={{ backgroundColor: placeholderBgColor }}
							/>
							))}
						</div>
					</CustomScrollbar>
				</div>
			)}
		</div>
	);
};

export default SentExpandedList;
