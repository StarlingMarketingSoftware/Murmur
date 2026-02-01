'use client';

import { FC, MouseEvent, useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ContactWithName } from '@/types/contact';
import { CampaignWithRelations } from '@/types';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation, splitTrailingNumericSuffix } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import {
	getCampaignLoadingWaveElapsedSeconds,
	getSyncedWaveDelay,
} from '@/utils/campaignLoadingWave';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactCampaigns, useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { ContactsHeaderChrome } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftingTable/DraftingTable';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

const FadeOverflowText: FC<{
	text: string;
	className?: string;
	fadePx?: number;
	measureKey?: unknown;
}> = ({ text, className, fadePx = 16, measureKey }) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const { base, suffixNumber } = splitTrailingNumericSuffix(text);

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		// A tiny epsilon avoids flicker from sub-pixel rounding.
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text, measureKey]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	const safeFadePx = Math.max(0, fadePx);
	const style = isOverflowing
		? {
				maskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
				WebkitMaskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={cn('block w-full whitespace-nowrap overflow-hidden', className)}
			style={style}
			title={text}
		>
			{suffixNumber ? (
				<>
					<span>{base}</span>
					<sup className="ml-[4px] relative top-[1px] align-super text-[0.65em] font-medium leading-none opacity-70">
						{suffixNumber}
					</sup>
				</>
			) : (
				text
			)}
		</span>
	);
};

export interface ContactsExpandedListProps {
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	onDraftSelected?: (contactIds: number[]) => void;
	isDraftDisabled?: boolean;
	isPendingGeneration?: boolean;
	/**
	 * When true, renders the "flowing color" loading wave placeholders (used on initial load).
	 */
	isLoading?: boolean;
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
	/**
	 * When true, the used-contact indicator shows the full "Appears in" hover tooltip (Write tab only).
	 * When false, used contacts are shown with the simple dot indicator only.
	 */
	enableUsedContactTooltip?: boolean;
	showSearchBar?: boolean;
	
	onSearchFromMiniBar?: (params: { why: string; what: string; where: string }) => void;
	whiteSectionHeight?: number;
	onOpenContacts?: () => void;
	/**
	 * When true, renders only the header chrome (no rows) for ultra-compact bottom panel layouts.
	 */
	collapsed?: boolean;
	/**
	 * When `allTab`, the component behaves like a dashboard preview:
	 * - no row hover/selected background colors
	 * - no header hover/click affordances
	 * - rows still fire `onContactHover` so the All tab can update the Research panel
	 */
	interactionMode?: 'default' | 'allTab';
}

export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	onHeaderClick,
	onContactClick,
	onContactHover,
	selectedContactIds,
	onContactSelectionChange,
	isLoading = false,
	width,
	height,
	minRows = 7,
	campaign,
	enableUsedContactTooltip = false,
	whiteSectionHeight: customWhiteSectionHeight,
	onOpenContacts,
	collapsed = false,
	interactionMode = 'default',
}) => {
	const router = useRouter();
	const [internalSelectedContactIds, setInternalSelectedContactIds] = useState<
		Set<number>
	>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	
	// Track whether the container is being hovered (for bottom view outline)
	const [isContainerHovered, setIsContainerHovered] = useState(false);
	
	// Track hovered contact index for keyboard navigation
	const [hoveredContactIndex, setHoveredContactIndex] = useState<number | null>(null);

	// Used contacts indicator data (IDs for current user)
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	const [hoveredUsedContactId, setHoveredUsedContactId] = useState<number | null>(null);
	const { data: hoveredUsedContactCampaigns } = useGetUsedContactCampaigns(hoveredUsedContactId);
	const [activeUsedContactCampaignIndex, setActiveUsedContactCampaignIndex] = useState<number | null>(null);
	// Memoize resolved campaigns so it can be used in both tooltip and indicator
	const resolvedUsedContactCampaigns = useMemo(() => {
		const all = hoveredUsedContactCampaigns ?? [];
		const other = all.filter((c) => c.id !== campaign?.id);
		return other.length ? other : all;
	}, [hoveredUsedContactCampaigns, campaign?.id]);
	const usedContactRowElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
	const usedContactTooltipCloseTimeoutRef = useRef<number | null>(null);
	const [usedContactTooltipPos, setUsedContactTooltipPos] = useState<{
		left: number;
		top: number;
	} | null>(null);

	const getBodyScaleContext = useCallback(() => {
		// In some compact modes (Firefox fallback), `<body>` is scaled via `transform: scale(...)`.
		// In that case, `position: fixed` children of body are positioned in *body coordinates*,
		// while getBoundingClientRect() returns *viewport coordinates*.
		// This helper lets us convert between the two so the tooltip is pixel-perfect.
		const body = document.body;
		const rect = body.getBoundingClientRect();
		const scaleX = body.offsetWidth ? rect.width / body.offsetWidth : 1;
		const scaleY = body.offsetHeight ? rect.height / body.offsetHeight : 1;
		return {
			left: rect.left,
			top: rect.top,
			scaleX: scaleX || 1,
			scaleY: scaleY || 1,
		};
	}, []);

	const clearUsedContactTooltipCloseTimeout = useCallback(() => {
		if (usedContactTooltipCloseTimeoutRef.current !== null) {
			window.clearTimeout(usedContactTooltipCloseTimeoutRef.current);
			usedContactTooltipCloseTimeoutRef.current = null;
		}
	}, []);

	// If this feature is toggled off while active (e.g. tab switch), immediately reset state
	// so we don't keep background queries alive.
	useEffect(() => {
		if (!enableUsedContactTooltip) {
			clearUsedContactTooltipCloseTimeout();
			setHoveredUsedContactId(null);
		}
	}, [clearUsedContactTooltipCloseTimeout, enableUsedContactTooltip]);

	const computeUsedContactTooltipPos = useCallback(
		(rect: DOMRect) => {
			const bodyCtx = getBodyScaleContext();
			const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
			const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
			const rowHeightInBody = rect.height / bodyCtx.scaleY;
			return {
				left: rowLeftInBody + 33,
				// Match ContactsSelection positioning: sit ~8px above the bottom of the row.
				top: rowTopInBody + (rowHeightInBody - 8),
			};
		},
		[getBodyScaleContext]
	);

	const openUsedContactTooltip = useCallback(
		(contactId: number) => {
			clearUsedContactTooltipCloseTimeout();
			const el = usedContactRowElsRef.current.get(contactId);
			if (el) {
				const rect = el.getBoundingClientRect();
				setUsedContactTooltipPos(computeUsedContactTooltipPos(rect));
			}
			// Start with first campaign active, but don't reset if we're already on this contact
			// (e.g., user selected a row in the tooltip and moves back to the pill to click).
			setActiveUsedContactCampaignIndex((prev) =>
				hoveredUsedContactId === contactId ? (prev ?? 0) : 0
			);
			setHoveredUsedContactId(contactId);
		},
		[clearUsedContactTooltipCloseTimeout, computeUsedContactTooltipPos, hoveredUsedContactId]
	);

	const goToUsedContactCampaign = useCallback(
		(contactId: number) => {
			// Only navigate when this contact's hover state is active (campaign list is scoped to hovered contact).
			if (hoveredUsedContactId !== contactId) return;
			if (!resolvedUsedContactCampaigns.length) return;

			const idx = Math.min(
				resolvedUsedContactCampaigns.length - 1,
				Math.max(0, activeUsedContactCampaignIndex ?? 0)
			);
			const selected = resolvedUsedContactCampaigns[idx];
			if (!selected?.id) return;

			router.push(`/murmur/campaign/${selected.id}`);
		},
		[activeUsedContactCampaignIndex, hoveredUsedContactId, resolvedUsedContactCampaigns, router]
	);

	const scheduleCloseUsedContactTooltip = useCallback(
		(contactId: number) => {
			clearUsedContactTooltipCloseTimeout();
			usedContactTooltipCloseTimeoutRef.current = window.setTimeout(() => {
				setHoveredUsedContactId((prev) => (prev === contactId ? null : prev));
			}, 120);
		},
		[clearUsedContactTooltipCloseTimeout]
	);

	useEffect(() => {
		if (hoveredUsedContactId === null) {
			setUsedContactTooltipPos(null);
			setActiveUsedContactCampaignIndex(null);
			return;
		}

		let rafId = 0;
		const update = () => {
			const el = usedContactRowElsRef.current.get(hoveredUsedContactId);
			if (!el) return;
			const rect = el.getBoundingClientRect();
			setUsedContactTooltipPos(computeUsedContactTooltipPos(rect));
		};

		const schedule = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		};

		update();
		// Capture scroll from any scroll container
		window.addEventListener('scroll', schedule, true);
		window.addEventListener('resize', schedule);

		return () => {
			window.removeEventListener('scroll', schedule, true);
			window.removeEventListener('resize', schedule);
			cancelAnimationFrame(rafId);
		};
	}, [computeUsedContactTooltipPos, hoveredUsedContactId]);

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

	const allContactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);
	const areAllSelected =
		allContactIds.size > 0 &&
		currentSelectedIds.size === allContactIds.size &&
		Array.from(allContactIds).every((id) => currentSelectedIds.has(id));
	const handleSelectAllToggle = useCallback(() => {
		updateSelection(() => {
			if (areAllSelected) return new Set();
			return new Set(allContactIds);
		});
	}, [allContactIds, areAllSelected, updateSelection]);

	const selectedCount = currentSelectedIds.size;
	const shouldShowLoadingWave = isLoading && contacts.length === 0;
	const loadingWaveDurationSeconds = 4.5;
	// Match MapResultsPanelSkeleton step delay exactly for consistent "fluid" feel
	const loadingWaveStepSeconds = 0.1;
	// If the page-level CampaignPageSkeleton was shown, sync our wave phase to it so
	// the animation does not restart when the real component mounts.
	const syncedWaveElapsedSeconds = useMemo(() => getCampaignLoadingWaveElapsedSeconds(), []);

	// Allow callers to override dimensions; default to the original sidebar size
	const resolvedWidth = width ?? 376;
	const resolvedHeight = height ?? 424;
	// Inner content width (search bar, rows) - leaves ~10px padding on sides
	const innerWidth = typeof resolvedWidth === 'number' ? resolvedWidth - 10 : 370;

	const isAllTab = height === 263;
	const isAllTabNavigation = interactionMode === 'allTab';
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15;
	const shouldShowScrollbar = !isBottomView && contacts.length >= 14;

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
				// Match the main Contacts tab header chrome animation, but keep the ultra-compact
				// bottom view static so it doesn't interfere with the "Open" affordance.
				// Also, when this list is rendered on the Write tab (tooltip-enabled), treat "Write"
				// as the active tab so hovering "Write" shows the white-placeholder state.
				activeTab={enableUsedContactTooltip ? 'write' : 'contacts'}
				interactive={!isBottomView && !isAllTabNavigation}
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
					className={cn(
						'absolute z-20 flex items-center gap-[12px]',
						isAllTabNavigation ? 'pointer-events-none cursor-default' : 'cursor-pointer'
					)}
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

			{!collapsed && !isBottomView && (
				<div className="px-3 mt-2 mb-0 flex items-center justify-center relative z-10 text-[13px] font-inter font-medium text-black/70">
					<span>{isAllTabNavigation ? 0 : selectedCount} Selected</span>
					{isAllTabNavigation ? (
						<span className="absolute right-3 bg-transparent border-none p-0 text-[13px] font-inter font-medium text-black/70 cursor-default">
							Select All
						</span>
					) : (
						<button
							type="button"
							className="absolute right-3 bg-transparent border-none p-0 hover:text-black text-[13px] font-inter font-medium text-black/70 cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								handleSelectAllToggle();
							}}
						>
							{areAllSelected ? 'Deselect All' : 'Select All'}
						</button>
					)}
				</div>
			)}

			{!collapsed && (
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
					{enableUsedContactTooltip &&
						typeof document !== 'undefined' &&
						hoveredUsedContactId !== null &&
						usedContactTooltipPos &&
						(() => {
							const resolvedCampaigns = resolvedUsedContactCampaigns;
							const isMultiCampaign = resolvedCampaigns.length > 1;
							const resolvedCampaign = resolvedCampaigns[0] ?? null;

							// Don't render anything until we actually have the campaign info.
							if (!resolvedCampaign) return null;

							const campaignName = resolvedCampaign.name;
							const campaignIdToNavigate = resolvedCampaign.id;

							return createPortal(
								<div
									className={cn(
										'fixed z-[9999] w-[322px] rounded-[8px] bg-[#DAE6FE] text-black border-2 border-black shadow-none',
										!isMultiCampaign && 'h-[60px]'
									)}
									style={{ left: usedContactTooltipPos.left, top: usedContactTooltipPos.top }}
									onMouseEnter={() => {
										clearUsedContactTooltipCloseTimeout();
									}}
									onMouseLeave={() => {
										// Don't hard-close on leave — allow moving between tooltip <-> pill without losing state.
										// The close timeout is cleared when entering either area.
										scheduleCloseUsedContactTooltip(hoveredUsedContactId as number);
									}}
								>
									<span className="absolute left-[12px] top-[6px] text-[17px] font-inter font-medium text-black leading-none pointer-events-none">
										Appears in
									</span>

									{isMultiCampaign ? (
										<div className="pt-[28px] pb-[4px]">
											<div className="flex flex-col gap-[6px] px-[3px]">
												{resolvedCampaigns.map((c, idx) => {
													const isActive = activeUsedContactCampaignIndex === idx;
													return (
														<button
															key={c.id}
															type="button"
															className={cn(
																'w-[312px] h-[26px] rounded-[4px] border-2 border-black text-[17px] font-inter font-medium text-black cursor-pointer flex items-center gap-[10px] px-[10px] box-border',
																isActive ? 'bg-[#AAE19E]' : 'bg-[#CFE4FF]'
															)}
															onMouseEnter={() => setActiveUsedContactCampaignIndex(idx)}
															onClick={(e) => {
																e.stopPropagation();
																router.push(`/murmur/campaign/${c.id}`);
															}}
														>
															{isActive && (
																<span className="leading-none whitespace-nowrap shrink-0">
																	Go To
																</span>
															)}
															<div className="h-[22px] w-fit max-w-full min-w-0 rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
																<FadeOverflowText
																	text={c.name}
																	// Slightly later fade than before, and only when overflowing.
																	fadePx={16}
																	measureKey={isActive}
																	className="text-[17px] font-inter font-medium text-black leading-none"
																/>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									) : (
										<>
											<div className="absolute top-[4px] right-[3px] w-[204px] h-[22px] rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
												<FadeOverflowText
													text={campaignName}
													fadePx={16}
													className="text-[17px] font-inter font-medium text-black leading-none"
												/>
											</div>

											<button
												type="button"
												className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[312px] h-[26px] rounded-[4px] border-2 border-black bg-[#AAE19E] text-[17px] font-inter font-medium text-black cursor-pointer flex items-center justify-center box-border"
												onClick={(e) => {
													e.stopPropagation();
													if (campaignIdToNavigate) {
														router.push(`/murmur/campaign/${campaignIdToNavigate}`);
													}
												}}
											>
												Go To
											</button>
										</>
									)}
								</div>,
								document.body
							);
						})()}
					{/* Scrollable list */}
					<CustomScrollbar
						className="flex-1 drafting-table-content"
						thumbWidth={shouldShowScrollbar ? 2 : 0}
						thumbColor={shouldShowScrollbar ? '#000000' : 'transparent'}
						trackColor="transparent"
						offsetRight={isBottomView ? -7 : -6}
						contentClassName="overflow-x-hidden"
						alwaysShow={false}
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
						const isUsedContactHoverCardVisible =
							enableUsedContactTooltip &&
							hoveredUsedContactId === contact.id &&
							Boolean(usedContactTooltipPos) &&
							Boolean(hoveredUsedContactCampaigns?.length);
						const contactTitle = contact.title || contact.headline || '';
						// Left padding: 12px base + 16px dot + 8px gap = 36px when used, else 12px
						const leftPadding = isUsed ? 'pl-[36px]' : 'pl-3';
						// Keyboard focus shows hover UI independently of mouse hover
						const isKeyboardFocused = hoveredContactIndex === contactIndex;
						// Final background: selected > keyboard focus > white (mouse hover handled by CSS)
						const contactBgColor = isAllTabNavigation
							? 'bg-white'
							: isSelected
								? 'bg-[#EAAEAE]'
								: isKeyboardFocused
									? 'bg-[#F5DADA]'
									: 'bg-white hover:bg-[#F5DADA]';
						// Align the used-contact indicator with the top (Company) line in the standard (non-bottom) view.
						// When the hover tooltip is visible, we center the tall pill so it stays inside the row.
						const indicatorTop = isBottomView
							? '50%'
							: isUsedContactHoverCardVisible
								? '50%'
								: '16px';

						return (
							<div
								key={contact.id}
								ref={(el) => {
									if (el) {
										usedContactRowElsRef.current.set(contact.id, el);
									} else {
										usedContactRowElsRef.current.delete(contact.id);
									}
								}}
						className={cn(
							'overflow-hidden rounded-[8px] border-2 border-[#000000] select-none relative grid grid-cols-2 grid-rows-2',
							isAllTabNavigation ? 'cursor-default' : 'cursor-pointer',
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
									if (!isAllTabNavigation) setHoveredContactIndex(contactIndex);
									onContactHover?.(contact);
								}}
								onClick={(e) => {
									if (isAllTabNavigation) return;
									handleContactClick(contact, e);
									onContactClick?.(contact);
								}}
							>
									{/* Used contact indicator - absolutely positioned, vertically centered */}
									{isUsed && (enableUsedContactTooltip ? (() => {
										const isMultiCampaignIndicator =
											isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length > 1;
										const isSingleCampaignIndicator =
											isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length === 1;
										// For multi-campaign: #A0C0FF with sliding dot
										// For single-campaign: #B0EAA4 (green, no dot)
										// For default (not hovered): #DAE6FE
										const pillBg = isMultiCampaignIndicator
											? '#A0C0FF'
											: isSingleCampaignIndicator
												? '#B0EAA4'
												: '#DAE6FE';

										const DEFAULT_SIZE = isBottomView ? 12 : 16;
										const PILL_WIDTH = isBottomView ? 10 : 14;
										const PILL_HEIGHT = isBottomView ? 24 : 37;

										// Handle mouse move on the pill to drive campaign selection
										const handlePillMouseMove = isMultiCampaignIndicator
											? (e: MouseEvent<HTMLSpanElement>) => {
													// We render a thin stroke via box-shadow (doesn't affect box-model), so the
													// interactive area is the full pill rect.
													const PILL_BORDER = 0;
													const rect = e.currentTarget.getBoundingClientRect();
													const actualHeight = rect.height;
													const offsetY = e.clientY - rect.top;
													const innerHeight = Math.max(1, actualHeight - PILL_BORDER * 2);
													const innerOffsetY = offsetY - PILL_BORDER;
													const campaignCount = resolvedUsedContactCampaigns.length;
													if (campaignCount <= 1) return;
													// Map cursor Y position to campaign index (0 at top, max at bottom)
													const ratio = Math.max(0, Math.min(1, innerOffsetY / innerHeight));
													const idx = Math.round(ratio * (campaignCount - 1));
													const clampedIdx = Math.max(0, Math.min(campaignCount - 1, idx));
													setActiveUsedContactCampaignIndex((prev) =>
														prev === clampedIdx ? prev : clampedIdx
													);
												}
											: undefined;

										return (
											<span
												className="z-10 cursor-pointer transition-all duration-150 ease-out"
												style={{
													position: 'absolute',
													left: isBottomView ? '8px' : '12px',
													top: indicatorTop,
													transform: 'translateY(-50%)',
													boxSizing: 'border-box',
													// Default state: circle. Hover state (single/multi): pill.
													width: isUsedContactHoverCardVisible ? `${PILL_WIDTH}px` : `${DEFAULT_SIZE}px`,
													height: isUsedContactHoverCardVisible ? `${PILL_HEIGHT}px` : `${DEFAULT_SIZE}px`,
													borderRadius: isUsedContactHoverCardVisible ? '9999px' : '50%',
													// Thin stroke: use box-shadow so sizes stay exact (per design spec).
													border: isUsedContactHoverCardVisible ? 'none' : '1px solid #000000',
													boxShadow: isUsedContactHoverCardVisible
														? '0 0 0 1px #000000'
														: undefined,
													backgroundColor: pillBg,
													overflow: 'hidden',
												}}
												onMouseEnter={() => openUsedContactTooltip(contact.id)}
												onMouseLeave={() => scheduleCloseUsedContactTooltip(contact.id)}
												onMouseMove={handlePillMouseMove}
												onClick={(e) => {
													// Only hijack click when the hover card is visible (prevents breaking normal
													// contact selection clicks on the indicator in its default state).
													if (!isUsedContactHoverCardVisible) return;
													e.stopPropagation();
													goToUsedContactCampaign(contact.id);
												}}
												aria-label="Used in a previous campaign"
											>
												{/* Sliding dot for multi-campaign */}
												{isMultiCampaignIndicator && (
													<span
														className="rounded-full bg-[#DAE6FE] pointer-events-none transition-all duration-150 ease-out"
														style={(() => {
															const maxTop = Math.max(0, PILL_HEIGHT - PILL_WIDTH);
															const campaignCount = resolvedUsedContactCampaigns.length;
															const clampedIdx =
																typeof activeUsedContactCampaignIndex === 'number' && campaignCount > 0
																	? Math.min(
																			campaignCount - 1,
																			Math.max(0, activeUsedContactCampaignIndex)
																		)
																	: 0;
															// Position dot based on active index
															const top =
																campaignCount > 1
																	? (maxTop * clampedIdx) / (campaignCount - 1)
																	: maxTop / 2;
															return {
																position: 'absolute' as const,
																left: '0px',
																top: `${top}px`,
																width: `${PILL_WIDTH}px`,
																height: `${PILL_WIDTH}px`,
																// Thin stroke without changing geometry.
																boxShadow: '0 0 0 1px #000000',
															};
														})()}
													/>
												)}
											</span>
										);
									})() : (
										<span
											className={cn(
												"absolute -translate-y-1/2",
												isBottomView ? "left-2" : "left-3"
											)}
											aria-label="Used in a previous campaign"
											style={{
												top: indicatorTop,
												width: isBottomView ? '12px' : '16px',
												height: isBottomView ? '12px' : '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#DAE6FE',
											}}
										/>
									))}
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
											{/* Top Left - Company (fixed top slot) */}
											<div
												className={cn(
													leftPadding,
													'col-start-1 row-start-1 pr-1 flex items-end pb-[2px] overflow-hidden'
												)}
											>
												<div
													className="font-bold text-[12px] font-inter text-black w-full overflow-hidden whitespace-nowrap leading-[1.1]"
													style={{
														maskImage:
															'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
														WebkitMaskImage:
															'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
													}}
												>
													{contact.company || ''}
												</div>
											</div>

											{/* Top Right - Title (aligned to top slot) */}
											<div className="col-start-2 row-start-1 pr-2 pl-1 flex items-end pb-[2px] overflow-hidden">
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
																			: (isWeddingPlannerTitle(contactTitle) ||
																					  isWeddingVenueTitle(contactTitle))
																				? '#FFF2BC'
																				: '#E8EFFF',
														}}
													>
														{isRestaurantTitle(contactTitle) && <RestaurantsIcon size={12} />}
														{isCoffeeShopTitle(contactTitle) && <CoffeeShopsIcon size={7} />}
														{isMusicVenueTitle(contactTitle) && (
															<MusicVenuesIcon size={12} className="flex-shrink-0" />
														)}
														{isMusicFestivalTitle(contactTitle) && (
															<FestivalsIcon size={12} className="flex-shrink-0" />
														)}
														{(isWeddingPlannerTitle(contactTitle) ||
															isWeddingVenueTitle(contactTitle)) && (
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

											{/* Bottom Left - Name (fixed bottom slot) */}
											<div
												className={cn(
													leftPadding,
													'col-start-1 row-start-2 pr-1 flex items-start pt-[2px] overflow-hidden'
												)}
											>
												<div className="text-[12px] font-inter text-black w-full truncate leading-[1.1]">
													{fullName}
												</div>
											</div>
											
											{/* Bottom Right - Location (aligned to bottom slot) */}
											<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
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
											{/* Top Left - Company (fixed top slot) */}
											<div
												className={cn(
													leftPadding,
													'col-start-1 row-start-1 pr-1 flex items-end pb-[2px] overflow-hidden'
												)}
											>
												<div
													className="font-bold text-[12px] font-inter text-black w-full overflow-hidden whitespace-nowrap leading-[1.1]"
													style={{
														maskImage:
															'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
														WebkitMaskImage:
															'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
													}}
												>
													{contact.company || 'Contact'}
												</div>
											</div>
											{/* Bottom Left - (empty fixed bottom slot) */}
											<div className="col-start-1 row-start-2" />

											{contactTitle ? (
												<>
													{/* Top Right - Title */}
													<div className="col-start-2 row-start-1 pr-2 pl-1 flex items-end pb-[2px] overflow-hidden">
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
													<div className="col-start-2 row-start-2 pr-2 pl-1 flex items-start pt-[2px] overflow-hidden">
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
												<div className="col-start-2 row-span-2 pr-2 pl-1 flex items-center h-full">
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
									'select-none overflow-hidden rounded-[8px] border-2 border-[#000000]',
									isBottomView
										? 'w-[224px] h-[28px]'
										: 'max-[480px]:w-[96.27vw] h-[49px] max-[480px]:h-[50px]'
									,
									shouldShowLoadingWave
										? 'contacts-expanded-list-loading-wave-row'
										: 'bg-[#EB8586]'
								)}
								style={{
									...(!isBottomView ? { width: `${innerWidth}px` } : {}),
									...(shouldShowLoadingWave
										? {
												animationDelay:
													syncedWaveElapsedSeconds !== null
														? getSyncedWaveDelay({
																elapsedSeconds: syncedWaveElapsedSeconds,
																durationSeconds: loadingWaveDurationSeconds,
																index: idx,
																stepSeconds: loadingWaveStepSeconds,
														  })
														: `${-(
																loadingWaveDurationSeconds -
																idx * loadingWaveStepSeconds
														  )}s`,
											}
										: {}),
								}}
							/>
						)
					)}
						</div>
					</CustomScrollbar>
				</div>
			)}
		</div>
	);
};

export default ContactsExpandedList;
