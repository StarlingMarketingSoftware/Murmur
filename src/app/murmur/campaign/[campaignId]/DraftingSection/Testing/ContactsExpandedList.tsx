'use client';

import { FC, MouseEvent, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ContactWithName } from '@/types/contact';
import { CampaignWithRelations } from '@/types';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { ContactsHeaderChrome } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftingTable/DraftingTable';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

export interface ContactsExpandedListProps {
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	onDraftSelected?: (contactIds: number[]) => void;
	isDraftDisabled?: boolean;
	isPendingGeneration?: boolean;
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	/**
	 * Optional controlled selection props. When provided, this component will
	 * mirror and update the passed-in selection instead of managing its own.
	 */
	selectedContactIds?: Set<number>;
	onContactSelectionChange?: (updater: (prev: Set<number>) => Set<number>) => void;
	width?: number | string;
	height?: number | string;
	minRows?: number;
	campaign?: CampaignWithRelations;
	showSearchBar?: boolean;
	
	onSearchFromMiniBar?: (params: { why: string; what: string; where: string }) => void;
	whiteSectionHeight?: number;
	onOpenContacts?: () => void;
}

export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	onHeaderClick,
	onContactClick,
	onContactHover,
	selectedContactIds,
	onContactSelectionChange,
	width,
	height,
	minRows = 7,
	whiteSectionHeight: customWhiteSectionHeight,
	onOpenContacts,
}) => {
	const [internalSelectedContactIds, setInternalSelectedContactIds] = useState<
		Set<number>
	>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	
	// Track whether the container is being hovered (for bottom view outline)
	const [isContainerHovered, setIsContainerHovered] = useState(false);
	
	// Track hovered contact index for keyboard navigation
	const [hoveredContactIndex, setHoveredContactIndex] = useState<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Used contacts indicator data (IDs for current user)
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	const isControlled = Boolean(selectedContactIds);
	const currentSelectedIds = selectedContactIds ?? internalSelectedContactIds;

	const updateSelection = useCallback((updater: (prev: Set<number>) => Set<number>) => {
		if (isControlled && onContactSelectionChange) {
			onContactSelectionChange(updater);
		} else {
			setInternalSelectedContactIds((prev) => updater(new Set(prev)));
		}
	}, [isControlled, onContactSelectionChange]);

	// Keyboard navigation: up/down arrows move hover between rows, Enter selects hovered contact
	const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
		// Only handle up/down arrows and Enter
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter') return;
		
		// Only work if we have a hovered contact
		if (hoveredContactIndex === null) return;
		
		// Check if a text input element is focused (don't intercept typing)
		const activeElement = document.activeElement;
		if (activeElement) {
			const tagName = activeElement.tagName.toLowerCase();
			if (
				tagName === 'input' ||
				tagName === 'textarea' ||
				(activeElement as HTMLElement).isContentEditable
			) {
				return;
			}
		}
		
		e.preventDefault();
		e.stopImmediatePropagation(); // Prevent campaign page tab navigation
		
		// Handle Enter key - select/deselect the hovered contact
		if (e.key === 'Enter') {
			const contact = contacts[hoveredContactIndex];
			if (contact) {
				updateSelection((prev) => {
					const next = new Set(prev);
					if (next.has(contact.id)) {
						next.delete(contact.id);
					} else {
						next.add(contact.id);
					}
					return next;
				});
			}
			return;
		}
		
		let newIndex: number;
		if (e.key === 'ArrowUp') {
			newIndex = hoveredContactIndex > 0 ? hoveredContactIndex - 1 : contacts.length - 1;
		} else {
			newIndex = hoveredContactIndex < contacts.length - 1 ? hoveredContactIndex + 1 : 0;
		}
		
		setHoveredContactIndex(newIndex);
		onContactHover?.(contacts[newIndex]);
	}, [hoveredContactIndex, contacts, onContactHover, updateSelection]);

	useEffect(() => {
		// Only add listener if we have a hovered contact
		if (hoveredContactIndex === null) return;
		
		// Use capture phase to run before campaign page handler
		document.addEventListener('keydown', handleKeyboardNavigation, true);
		return () => {
			document.removeEventListener('keydown', handleKeyboardNavigation, true);
		};
	}, [hoveredContactIndex, handleKeyboardNavigation]);

	const handleContactClick = (contact: ContactWithName, e: MouseEvent) => {
		if (e.shiftKey && lastClickedRef.current !== null) {
			// Prevent text selection on shift-click
			e.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = contacts.findIndex((c) => c.id === contact.id);
			const lastIndex = contacts.findIndex((c) => c.id === lastClickedRef.current);

			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);
				updateSelection(() => {
					const newSelected = new Set<number>();
					for (let i = start; i <= end; i++) {
						newSelected.add(contacts[i].id);
					}
					return newSelected;
				});
			}
		} else {
			// Toggle single selection
			updateSelection((prev) => {
				const next = new Set(prev);
				if (next.has(contact.id)) {
					next.delete(contact.id);
				} else {
					next.add(contact.id);
				}
				return next;
			});
			lastClickedRef.current = contact.id ?? null;
		}
	};

	const areAllSelected =
		currentSelectedIds.size === contacts.length && contacts.length > 0;
	const handleSelectAllToggle = () => {
		updateSelection(() => {
			if (areAllSelected) {
				return new Set();
			}
			return new Set(contacts.map((c) => c.id));
		});
	};

	const selectedCount = currentSelectedIds.size;

	// Allow callers to override dimensions; default to the original sidebar size
	const resolvedWidth = width ?? 376;
	const resolvedHeight = height ?? 424;
	// Inner content width (search bar, rows) - leaves ~10px padding on sides
	const innerWidth = typeof resolvedWidth === 'number' ? resolvedWidth - 10 : 370;

	const isAllTab = height === 263;
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15;

	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-md flex flex-col overflow-visible',
				isBottomView
					? 'border-2 border-black'
					: isAllTab
					? 'border-[3px] border-black'
					: 'border border-black'
			)}
			style={{
				width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
				height:
					typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
				background: `linear-gradient(to bottom, #ffffff ${whiteSectionHeight}px, #EB8586 ${whiteSectionHeight}px)`,
				...(isBottomView ? { cursor: 'pointer' } : {}),
			}}
			data-hover-description="Contacts: This box displays all of the contacts in your campaign. Select contacts to generate drafts."
			role="region"
			aria-label="Expanded contacts preview"
			onMouseEnter={() => isBottomView && setIsContainerHovered(true)}
			onMouseLeave={() => isBottomView && setIsContainerHovered(false)}
			onClick={() => isBottomView && onOpenContacts?.()}
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
						border: '4px solid #D75152',
						borderRadius: 0,
						pointerEvents: 'none',
						zIndex: 50,
					}}
				/>
			)}
			<ContactsHeaderChrome
				isAllTab={isAllTab}
				whiteSectionHeight={customWhiteSectionHeight}
				interactive={false}
			/>
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
					className="absolute z-20 flex items-center gap-[12px] cursor-pointer"
					style={{ top: isBottomView ? 1 : -1, right: isBottomView ? 4 : 4 }}
					onClick={onOpenContacts}
					role={onOpenContacts ? 'button' : undefined}
					tabIndex={onOpenContacts ? 0 : undefined}
					onKeyDown={(e) => {
						if (!onOpenContacts) return;
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpenContacts();
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

			{!isBottomView && (
				<div className="px-3 mt-1 mb-0 flex items-center justify-center relative top-1 text-[13px] font-inter font-medium text-black/70">
					<span>{selectedCount} Selected</span>
					<button
						type="button"
						className="absolute right-3 bg-transparent border-none p-0 hover:text-black text-[13px] font-inter font-medium text-black/70 cursor-pointer"
						onClick={handleSelectAllToggle}
					>
						{areAllSelected ? 'Deselect All' : 'Select All'}
					</button>
				</div>
			)}

			<div
				className={cn(
					'relative flex-1 flex flex-col min-h-0',
					isBottomView ? 'px-[2px] pt-0 pb-0' : 'pb-2 pt-2'
				)}
				onMouseLeave={() => {
					setHoveredContactIndex(null);
					onContactHover?.(null);
				}}
			>
				{/* Scrollable list */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor={isBottomView ? 'transparent' : '#000000'}
					trackColor="transparent"
					offsetRight={isBottomView ? -7 : -6}
					contentClassName="overflow-x-hidden"
					alwaysShow={!isBottomView}
				>
					<div
						className={cn(
							'flex flex-col items-center',
							isBottomView ? 'space-y-1 pb-0' : 'space-y-2 pb-2'
						)}
						style={{
							paddingTop: customWhiteSectionHeight !== undefined ? '2px' : undefined,
						}}
					>
					{contacts.map((contact, contactIndex) => {
						const fullName =
							contact.name ||
							`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
						const isSelected = currentSelectedIds.has(contact.id);
						const isUsed = usedContactIdsSet.has(contact.id);
						const contactTitle = contact.title || contact.headline || '';
						// Left padding: 12px base + 16px dot + 8px gap = 36px when used, else 12px
						const leftPadding = isUsed ? 'pl-[36px]' : 'pl-3';
						// Keyboard focus shows hover UI independently of mouse hover
						const isKeyboardFocused = hoveredContactIndex === contactIndex;
						// Final background: selected > keyboard focus > white (mouse hover handled by CSS)
						const contactBgColor = isSelected 
							? 'bg-[#EAAEAE]' 
							: isKeyboardFocused 
								? 'bg-[#F5DADA]' 
								: 'bg-white hover:bg-[#F5DADA]';
						return (
							<div
								key={contact.id}
						className={cn(
							'cursor-pointer overflow-hidden rounded-[8px] border-2 border-[#000000] select-none relative grid grid-cols-2 grid-rows-2',
							isBottomView
								? 'w-[224px] h-[28px]'
								: 'max-[480px]:w-[96.27vw] h-[49px] max-[480px]:h-[50px]',
							contactBgColor,
						)}
								style={!isBottomView ? { width: `${innerWidth}px` } : undefined}
								onMouseDown={(e) => {
									if (e.shiftKey) e.preventDefault();
								}}
								onMouseEnter={() => {
									setHoveredContactIndex(contactIndex);
									onContactHover?.(contact);
								}}
								onClick={(e) => {
									handleContactClick(contact, e);
									onContactClick?.(contact);
								}}
							>
									{/* Used contact indicator - absolutely positioned, vertically centered */}
									{isUsed && (
										<span
											className={cn(
												"absolute top-1/2 -translate-y-1/2",
												isBottomView ? "left-2" : "left-3"
											)}
											title="Used in a previous campaign"
											style={{
												width: isBottomView ? '12px' : '16px',
												height: isBottomView ? '12px' : '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#DAE6FE',
											}}
										/>
									)}
									{/* Bottom view - compact 2-row layout */}
									{isBottomView ? (
										<>
											{fullName ? (
												<>
													{/* Top Left - Name */}
													<div className={cn(isUsed ? 'pl-[22px]' : 'pl-2', 'pr-1 flex items-center h-[12px] overflow-hidden')}>
														<div className="font-bold text-[9px] w-full truncate leading-none">
															{fullName}
														</div>
													</div>
													{/* Top Right - Title */}
													<div className="pr-1.5 pl-0.5 flex items-center justify-start h-[12px]">
														{contactTitle ? (
															<div
																className="h-[10px] rounded-[3px] px-1 flex items-center gap-0.5 max-w-full border border-black overflow-hidden"
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
																						: '#E8EFFF',
																}}
															>
																{isRestaurantTitle(contactTitle) && (
																	<RestaurantsIcon size={7} />
																)}
																{isCoffeeShopTitle(contactTitle) && (
																	<CoffeeShopsIcon size={4} />
																)}
																{isMusicVenueTitle(contactTitle) && (
																	<MusicVenuesIcon size={7} className="flex-shrink-0" />
																)}
																{isMusicFestivalTitle(contactTitle) && (
																	<FestivalsIcon size={7} className="flex-shrink-0" />
																)}
																{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
																	<WeddingPlannersIcon size={7} />
																)}
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
																							: contactTitle}
																</span>
															</div>
														) : null}
													</div>
								{/* Bottom Left - Company */}
								<div className={cn(isUsed ? 'pl-[22px]' : 'pl-2', 'pr-1 flex items-center h-[12px] overflow-hidden')}>
									{contact.company && (
										<div
											className="text-[8px] text-black w-full overflow-hidden whitespace-nowrap leading-none"
											style={{
												maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
												WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
											}}
										>
											{contact.company}
										</div>
									)}
								</div>
													{/* Bottom Right - Location */}
													<div className="pr-1.5 pl-0.5 flex items-center justify-start h-[12px]">
														{(contact.city || contact.state) && (
															<div className="flex items-center gap-0.5">
																{(() => {
																	const fullStateName = (contact.state as string) || '';
																	const stateAbbr = getStateAbbreviation(fullStateName) || '';
																	const normalizedState = fullStateName.trim();
																	const lowercaseCanadianProvinceNames =
																		canadianProvinceNames.map((s) => s.toLowerCase());
																	const isCanadianProvince =
																		lowercaseCanadianProvinceNames.includes(
																			normalizedState.toLowerCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			normalizedState.toUpperCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			stateAbbr.toUpperCase()
																		);
																	const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																	if (!stateAbbr) return null;
																	return isCanadianProvince ? (
																		<div
																			className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border overflow-hidden"
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
																			className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border text-[7px] leading-none font-bold"
																			style={{
																				backgroundColor:
																					stateBadgeColorMap[stateAbbr] || 'transparent',
																				borderColor: '#000000',
																			}}
																		>
																			{stateAbbr}
																		</span>
																	) : null;
																})()}
																{contact.city && (
																	<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
																		{contact.city}
																	</span>
																)}
															</div>
														)}
													</div>
												</>
											) : (
												<>
								{/* Left - Company only, centered vertically across both rows */}
								<div className={cn(isUsed ? 'pl-[22px]' : 'pl-2', 'pr-1 row-span-2 flex items-center overflow-hidden')}>
									<div
										className="font-bold text-[9px] w-full overflow-hidden whitespace-nowrap leading-none"
										style={{
											maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
											WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
										}}
									>
										{contact.company || 'Contact'}
									</div>
								</div>
													{/* Right column spans both rows for title + location stacked */}
													<div className="pr-1.5 pl-0.5 row-span-2 flex flex-col justify-center gap-0.5 overflow-hidden">
														{contactTitle && (
															<div
																className="h-[10px] rounded-[3px] px-1 flex items-center gap-0.5 max-w-full border border-black overflow-hidden"
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
																	<RestaurantsIcon size={7} />
																)}
																{isCoffeeShopTitle(contactTitle) && (
																	<CoffeeShopsIcon size={4} />
																)}
																{isMusicVenueTitle(contactTitle) && (
																	<MusicVenuesIcon size={7} className="flex-shrink-0" />
																)}
																{isMusicFestivalTitle(contactTitle) && (
																	<FestivalsIcon size={7} className="flex-shrink-0" />
																)}
																{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
																	<WeddingPlannersIcon size={7} />
																)}
																{isWineBeerSpiritsTitle(contactTitle) && (
																	<WineBeerSpiritsIcon size={7} className="flex-shrink-0" />
																)}
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
															</div>
														)}
														{(contact.city || contact.state) && (
															<div className="flex items-center gap-0.5">
																{(() => {
																	const fullStateName = (contact.state as string) || '';
																	const stateAbbr = getStateAbbreviation(fullStateName) || '';
																	const normalizedState = fullStateName.trim();
																	const lowercaseCanadianProvinceNames =
																		canadianProvinceNames.map((s) => s.toLowerCase());
																	const isCanadianProvince =
																		lowercaseCanadianProvinceNames.includes(
																			normalizedState.toLowerCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			normalizedState.toUpperCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			stateAbbr.toUpperCase()
																		);
																	const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																	if (!stateAbbr) return null;
																	return isCanadianProvince ? (
																		<div
																			className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border overflow-hidden"
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
																			className="inline-flex items-center justify-center w-[20px] h-[10px] rounded-[2px] border text-[7px] leading-none font-bold"
																			style={{
																				backgroundColor:
																					stateBadgeColorMap[stateAbbr] || 'transparent',
																				borderColor: '#000000',
																			}}
																		>
																			{stateAbbr}
																		</span>
																	) : null;
																})()}
																{contact.city && (
																	<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
																		{contact.city}
																	</span>
																)}
															</div>
														)}
													</div>
												</>
											)}
										</>
									) : fullName ? (
										<>
											{/* Top Left - Name */}
											<div className={cn(leftPadding, 'pr-1 flex items-center h-[23px]')}>
												<div className="font-bold text-[11px] w-full truncate leading-tight">
													{fullName}
												</div>
											</div>
											<div className="pr-2 pl-1 flex items-center h-[23px]">
												{contactTitle ? (
													<div
														className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
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
																				: '#E8EFFF',
														}}
													>
														{isRestaurantTitle(contactTitle) && (
															<RestaurantsIcon size={12} />
														)}
														{isCoffeeShopTitle(contactTitle) && (
															<CoffeeShopsIcon size={7} />
														)}
														{isMusicVenueTitle(contactTitle) && (
															<MusicVenuesIcon size={12} className="flex-shrink-0" />
														)}
														{isMusicFestivalTitle(contactTitle) && (
															<FestivalsIcon size={12} className="flex-shrink-0" />
														)}
														{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
															<WeddingPlannersIcon size={12} />
														)}
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
																						: contactTitle
															}
															className="text-[10px] text-black leading-none"
															scrollPixelsPerSecond={60}
														/>
													</div>
												) : (
													<div className="w-full" />
												)}
											</div>
							{/* Bottom Left - Company */}
							<div className={cn(leftPadding, 'pr-1 flex items-center h-[22px]')}>
								<div
									className="text-[11px] text-black w-full overflow-hidden whitespace-nowrap leading-tight"
									style={{
										maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
										WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
									}}
								>
									{contact.company || ''}
								</div>
							</div>
											{/* Bottom Right - Location */}
											<div className="pr-2 pl-1 flex items-center h-[22px]">
												{contact.city || contact.state ? (
													<div className="flex items-center gap-1 w-full">
														{(() => {
															const fullStateName = (contact.state as string) || '';
															const stateAbbr = getStateAbbreviation(fullStateName) || '';
															const normalizedState = fullStateName.trim();
															const lowercaseCanadianProvinceNames =
																canadianProvinceNames.map((s) => s.toLowerCase());
															const isCanadianProvince =
																lowercaseCanadianProvinceNames.includes(
																	normalizedState.toLowerCase()
																) ||
																canadianProvinceAbbreviations.includes(
																	normalizedState.toUpperCase()
																) ||
																canadianProvinceAbbreviations.includes(
																	stateAbbr.toUpperCase()
																);
															const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

															if (!stateAbbr) return null;
															return isCanadianProvince ? (
																<div
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
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
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
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
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																	style={{ borderColor: '#000000' }}
																/>
															);
														})()}

														{contact.city ? (
															<ScrollableText
																text={contact.city}
																className="text-[10px] text-black leading-none"
															/>
														) : (
															<div className="w-full" />
														)}
													</div>
												) : (
													<div className="w-full" />
												)}
											</div>
										</>
									) : (
										<>
								{/* Left column - Company vertically centered */}
							<div className={cn('row-span-2 pr-1 flex items-center h-full', leftPadding)}>
								<div
									className="font-bold text-[11px] text-black w-full overflow-hidden whitespace-nowrap leading-tight"
									style={{
										maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
										WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
									}}
								>
									{contact.company || 'Contact'}
								</div>
							</div>

											{contactTitle ? (
												<>
													{/* Top Right - Title */}
													<div className="pr-2 pl-1 flex items-center h-[23px]">
														<div
															className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
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
																					: '#E8EFFF',
															}}
														>
															{isRestaurantTitle(contactTitle) && (
																<RestaurantsIcon size={12} />
															)}
															{isCoffeeShopTitle(contactTitle) && (
																<CoffeeShopsIcon size={7} />
															)}
															{isMusicVenueTitle(contactTitle) && (
																<MusicVenuesIcon size={12} className="flex-shrink-0" />
															)}
															{isMusicFestivalTitle(contactTitle) && (
																<FestivalsIcon size={12} className="flex-shrink-0" />
															)}
															{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
																<WeddingPlannersIcon size={12} />
															)}
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
																							: contactTitle
																}
																className="text-[10px] text-black leading-none"
															/>
														</div>
													</div>

													{/* Bottom Right - Location */}
													<div className="pr-2 pl-1 flex items-center h-[22px]">
														{contact.city || contact.state ? (
															<div className="flex items-center gap-1 w-full">
																{(() => {
																	const fullStateName = (contact.state as string) || '';
																	const stateAbbr =
																		getStateAbbreviation(fullStateName) || '';
																	const normalizedState = fullStateName.trim();
																	const lowercaseCanadianProvinceNames =
																		canadianProvinceNames.map((s) => s.toLowerCase());
																	const isCanadianProvince =
																		lowercaseCanadianProvinceNames.includes(
																			normalizedState.toLowerCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			normalizedState.toUpperCase()
																		) ||
																		canadianProvinceAbbreviations.includes(
																			stateAbbr.toUpperCase()
																		);
																	const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																	if (!stateAbbr) return null;
																	return isCanadianProvince ? (
																		<div
																			className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
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
																			className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
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
																			className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																			style={{ borderColor: '#000000' }}
																		/>
																	);
																})()}
																{contact.city ? (
																	<ScrollableText
																		text={contact.city}
																		className="text-xs text-black w-full"
																	/>
																) : (
																	<div className="w-full"></div>
																)}
															</div>
														) : (
															<div className="w-full"></div>
														)}
													</div>
												</>
											) : (
												<div className="row-span-2 pr-2 pl-1 flex items-center h-full">
													{contact.city || contact.state ? (
														<div className="flex items-center gap-1 w-full">
															{(() => {
																const fullStateName = (contact.state as string) || '';
																const stateAbbr =
																	getStateAbbreviation(fullStateName) || '';
																const normalizedState = fullStateName.trim();
																const isCanadianProvince =
																	canadianProvinceNames.includes(
																		normalizedState.toLowerCase()
																	) ||
																	canadianProvinceAbbreviations.includes(
																		normalizedState.toUpperCase()
																	) ||
																	canadianProvinceAbbreviations.includes(
																		stateAbbr.toUpperCase()
																	);
																const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																if (!stateAbbr) return null;
																return isCanadianProvince ? (
																	<div
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
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
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
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
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																		style={{ borderColor: '#000000' }}
																	/>
																);
															})()}
															{contact.city ? (
																<ScrollableText
																	text={contact.city}
																	className="text-xs text-black w-full"
																/>
															) : (
																<div className="w-full"></div>
															)}
														</div>
													) : (
														<div className="w-full"></div>
													)}
												</div>
											)}
										</>
									)}
								</div>
							);
						})}
					{Array.from({ length: Math.max(0, (isBottomView ? 3 : minRows) - contacts.length) }).map(
						(_, idx) => (
							<div
								key={`placeholder-${idx}`}
								className={cn(
									'select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#EB8586]',
									isBottomView
										? 'w-[224px] h-[28px]'
										: 'max-[480px]:w-[96.27vw] h-[49px] max-[480px]:h-[50px]'
								)}
								style={!isBottomView ? { width: `${innerWidth}px` } : undefined}
							/>
						)
					)}
					</div>
				</CustomScrollbar>
			</div>
		</div>
	);
};

export default ContactsExpandedList;
