'use client';

import { FC, useMemo, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { ContactsSelectionProps, useContactsSelection } from './useContactsSelection';
import { cn } from '@/utils';
import { getStateAbbreviation, splitTrailingNumericSuffix } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import { DraftsExpandedList } from '../../Testing/DraftsExpandedList';
import { SentExpandedList } from '../../Testing/SentExpandedList';
import { InboxExpandedList } from '../../Testing/InboxExpandedList';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import {
	useGetUsedContactCampaigns,
	useGetUsedContactIds,
	useGetLocations,
} from '@/hooks/queryHooks/useContacts';
import { CampaignWithRelations } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getCityIconProps } from '@/utils/cityIcons';
import { urls } from '@/constants/urls';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';

const DEFAULT_STATE_SUGGESTIONS = [
	{ label: 'New York', description: 'contact venues, restaurants and more' },
	{ label: 'Pennsylvania', description: 'contact venues, restaurants and more' },
	{ label: 'California', description: 'contact venues, restaurants and more' },
];

// Parse campaign name to extract search components
// Campaign names are typically formatted as "{what} in {where}" or just "{what}"
export const parseSearchFromCampaign = (campaign?: CampaignWithRelations) => {
	// Try to get the name from userContactLists first (more accurate), then fall back to campaign name
	const searchName = campaign?.userContactLists?.[0]?.name || campaign?.name || '';

	// Default values - using "Why", "What", "Where" to match dashboard
	const why = 'Booking'; // Default assumption
	let what = '';
	let where = '';

	// Check if name contains location indicator " in "
	const inMatch = searchName.match(/^(.+?)\s+in\s+(.+)$/i);
	if (inMatch) {
		what = inMatch[1].trim();
		where = inMatch[2].trim();
	} else {
		what = searchName;
	}

	return { why, what, where };
};

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

// Mini search bar component for contacts filtering - matches dashboard design
export const MiniSearchBar: FC<{
	activeSection: 'why' | 'what' | 'where' | null;
	setActiveSection: (section: 'why' | 'what' | 'where' | null) => void;
	whyValue: string;
	setWhyValue: (value: string) => void;
	whatValue: string;
	setWhatValue: (value: string) => void;
	whereValue: string;
	setWhereValue: (value: string) => void;
	locationResults: { city: string; state: string; label: string }[] | undefined;
	isLoadingLocations: boolean;
	debouncedWhereValue: string;
	onSearch: () => void;
	width?: string | number;
	height?: string | number;
	borderRadius?: string | number;
}> = ({
	activeSection,
	setActiveSection,
	whyValue,
	setWhyValue,
	whatValue,
	setWhatValue,
	whereValue,
	setWhereValue,
	locationResults,
	isLoadingLocations,
	debouncedWhereValue,
	onSearch,
	width,
	height,
	borderRadius,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const activeSectionIndicatorRef = useRef<HTMLDivElement | null>(null);
	const prevActiveSectionForIndicatorRef = useRef<'why' | 'what' | 'where' | null>(null);

	// Handle clicks outside to deselect active section
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setActiveSection(null);
			}
		};

		if (activeSection) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [activeSection, setActiveSection]);

	// Animate the active section "pill" sliding between tabs (Why/What/Where) – match dashboard behavior
	useEffect(() => {
		const indicator = activeSectionIndicatorRef.current;
		if (!indicator) return;

		// Prevent overlapping tweens when the user clicks quickly
		gsap.killTweensOf(indicator);

		const xPercentForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
				default:
					return 0;
			}
		};

		const transformOriginForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 'left center';
				case 'where':
					return 'right center';
				case 'what':
				default:
					return 'center center';
			}
		};

		// Hide when no active section (default state shows dividers)
		if (!activeSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			prevActiveSectionForIndicatorRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevActiveSectionForIndicatorRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		// so it feels consistent with the tab switching motion.
		if (!prevSection) {
			const origin = transformOriginForSection(activeSection);

			// Start as a full-width highlight (scaleX: 3 because the indicator is 1/3 width),
			// then shrink toward the selected segment's side/center.
			gsap.set(indicator, {
				xPercent: nextXPercent,
				opacity: 1,
				scaleX: 3,
				transformOrigin: origin,
			});
			gsap.to(indicator, {
				scaleX: 1,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevActiveSectionForIndicatorRef.current = activeSection;
			return;
		}

		// Between tabs, slide with requested timing/ease (width/height remain constant)
		gsap.to(indicator, {
			xPercent: nextXPercent,
			duration: 0.6,
			ease: 'power2.out',
			overwrite: 'auto',
		});
		gsap.to(indicator, {
			opacity: 1,
			duration: 0.15,
			ease: 'power2.out',
			overwrite: 'auto',
		});

		prevActiveSectionForIndicatorRef.current = activeSection;
	}, [activeSection]);

	// Use compact layout for side panel (44px height)
	const isCompact = height === '44px';

	// Dropdown: keep fixed position (like "Why") and cross-fade between sections
	const dropdownEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
	const dropdownTransition = `height 0.6s ${dropdownEase}`;
	const dropdownFadeTransition = `opacity 0.35s ${dropdownEase}`;

	const dropdownHeight =
		activeSection === 'why'
			? 173
			: activeSection === 'what'
				? whyValue === '[Promotion]'
					? 92
					: 404
				: activeSection === 'where'
					? 300
					: 0;

	// Keep the dropdown anchored where "Why" is
	const dropdownLeft = '25px';
	const dropdownTransform = 'translateX(0)';

	return (
		<div
			className="relative mx-auto"
			ref={containerRef}
			style={{ width: width ?? 'min(489px, 100%)' }}
			data-hover-description="Search: refine the contacts in this campaign (Why / What / Where)."
		>
			<div
				className="bg-white rounded-[8px] border-2 border-black flex items-center relative w-full"
				style={{
					marginBottom: '4px',
					height: height ?? '58px',
					borderRadius: borderRadius ?? (isCompact ? '8px' : undefined),
				}}
			>
				{/* Sections container - matches dashboard styling */}
				<div
					className={cn(
						'relative ml-[3px] rounded-[6px] flex-1 h-[50px] font-secondary flex items-center',
						activeSection
							? 'bg-[#EFEFEF] border border-transparent'
							: 'bg-white border border-black'
					)}
					style={isCompact ? { height: '38px' } : undefined}
				>
					{/* Sliding active tab indicator */}
					<div
						ref={activeSectionIndicatorRef}
						className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[6px] pointer-events-none z-10"
						style={{ opacity: 0, willChange: 'transform' }}
					/>

					{/* Kind/Why section */}
					<div
						className={cn(
							'relative h-full cursor-pointer border flex-1 min-w-0',
							activeSection === 'why'
								? 'bg-transparent border-transparent rounded-[6px]'
								: `border-transparent ${
										activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
								  } rounded-l-[6px]`
						)}
						onClick={() => setActiveSection(activeSection === 'why' ? null : 'why')}
					>
						<div
							className="absolute left-[16px] font-bold text-black leading-none z-20"
							style={{
								top: isCompact ? '6px' : '8px',
								fontSize: isCompact ? '13px' : '18px',
							}}
						>
							Why
						</div>
						<div
							className="absolute left-[16px] right-[8px] z-20"
							style={{ top: isCompact ? '22px' : '30px' }}
						>
							<div
								className="font-semibold whitespace-nowrap truncate"
								style={{
									fontSize: isCompact ? '9px' : '11px',
									lineHeight: '12px',
									color:
										whyValue && whyValue.trim().length > 0
											? '#000000'
											: 'rgba(0, 0, 0, 0.42)',
								}}
							>
								{whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Choose Type of Search'}
							</div>
						</div>
					</div>

					<div
						className={cn(
							'w-[2px] h-full bg-black/10 flex-shrink-0',
							activeSection && 'hidden'
						)}
					/>

					{/* Who/What section */}
					<div
						className={cn(
							'relative h-full cursor-pointer border flex-1 min-w-0 overflow-hidden',
							activeSection === 'what'
								? 'bg-transparent border-transparent rounded-[6px]'
								: `border-transparent ${
										activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
								  }`
						)}
						onClick={() => setActiveSection('what')}
					>
						<div
							className="absolute left-[16px] font-bold text-black leading-none z-20"
							style={{
								top: isCompact ? '6px' : '8px',
								fontSize: isCompact ? '13px' : '18px',
							}}
						>
							What
						</div>
						<div
							className="absolute left-[16px] right-[8px] z-20"
							style={{ top: isCompact ? '22px' : '30px' }}
						>
							{activeSection === 'what' ? (
								<input
									type="text"
									value={whatValue}
									onChange={(e) => setWhatValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											setActiveSection('where');
										}
									}}
									onFocus={(e) => e.target.select()}
									className="w-full font-semibold text-black bg-transparent outline-none border-none relative z-20"
									style={{
										fontSize: isCompact ? '9px' : '11px',
										lineHeight: '12px',
										height: '12px',
										padding: '0',
										margin: '0',
										verticalAlign: 'top',
									}}
									placeholder="Add Recipients"
									autoFocus
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<div
									className="font-semibold whitespace-nowrap hover:text-black/60 transition-colors relative z-20"
									style={{
										fontSize: isCompact ? '9px' : '11px',
										lineHeight: '12px',
										color: whatValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
										maskImage:
											'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
										WebkitMaskImage:
											'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
									}}
								>
									{whatValue || 'Add Recipients'}
								</div>
							)}
						</div>
					</div>

					<div
						className={cn(
							'w-[2px] h-full bg-black/10 flex-shrink-0',
							activeSection && 'hidden'
						)}
					/>

					{/* Where section */}
					<div
						className={cn(
							'relative h-full cursor-pointer border flex-1 min-w-0 overflow-hidden',
							activeSection === 'where'
								? 'bg-transparent border-transparent rounded-[6px]'
								: `border-transparent ${
										activeSection ? 'hover:bg-[#F9F9F9]' : 'hover:bg-black/5'
								  } rounded-r-[6px]`
						)}
						onClick={() => setActiveSection('where')}
					>
						<div
							className="absolute left-[16px] font-bold text-black leading-none z-20"
							style={{
								top: isCompact ? '6px' : '8px',
								fontSize: isCompact ? '13px' : '18px',
							}}
						>
							Where
						</div>
						<div
							className="absolute left-[16px] right-[8px] z-20"
							style={{ top: isCompact ? '22px' : '30px' }}
						>
							{activeSection === 'where' ? (
								<input
									type="text"
									value={whereValue}
									onChange={(e) => setWhereValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											setActiveSection(null);
										}
									}}
									onFocus={(e) => e.target.select()}
									className="w-full font-semibold text-black bg-transparent outline-none border-none relative z-20"
									style={{
										fontSize: isCompact ? '9px' : '11px',
										lineHeight: '12px',
										height: '12px',
										padding: '0',
										margin: '0',
										verticalAlign: 'top',
									}}
									placeholder="Search Destinations"
									autoFocus
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<div
									className="font-semibold whitespace-nowrap hover:text-black/60 transition-colors relative z-20"
									style={{
										fontSize: isCompact ? '9px' : '11px',
										lineHeight: '12px',
										color: whereValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
										maskImage:
											'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
										WebkitMaskImage:
											'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
									}}
								>
									{whereValue || 'Search Destinations'}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Search button - matches dashboard styling */}
				<button
					type="button"
					className="flex items-center justify-center transition-colors cursor-pointer ml-[1px] mr-[1px]"
					style={{
						width: isCompact ? '35px' : '48px',
						height: isCompact ? '38px' : '50px',
						backgroundColor: 'rgba(93, 171, 104, 0.49)',
						border: '1px solid #5DAB68',
						borderRadius: '0 6px 6px 0',
					}}
					aria-label="Search"
					onClick={onSearch}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(93, 171, 104, 0.65)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(93, 171, 104, 0.49)';
					}}
				>
					<svg
						width={isCompact ? '20' : '24'}
						height={isCompact ? '22' : '26'}
						viewBox="0 0 28 30"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M10.7681 16.6402L0.768066 28.6402M26.9998 10.5C26.9998 15.7467 22.5227 20 16.9998 20C11.477 20 6.99985 15.7467 6.99985 10.5C6.99985 5.25329 11.477 1 16.9998 1C22.5227 1 26.9998 5.25329 26.9998 10.5Z"
							stroke="black"
							strokeWidth="2"
						/>
					</svg>
				</button>
			</div>

			{/* Dropdowns (animated like dashboard) */}
			{activeSection && (
				<div
					className="absolute bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] overflow-hidden"
					style={{
						top: 'calc(100% + 10px)',
						left: dropdownLeft,
						transform: dropdownTransform,
						height: dropdownHeight,
						width: 'min(439px, calc(100% - 50px))',
						transition: dropdownTransition,
						willChange: 'height',
					}}
				>
					{/* Why dropdown */}
					<div
						className="absolute inset-0"
						style={{
							opacity: activeSection === 'why' ? 1 : 0,
							pointerEvents: activeSection === 'why' ? 'auto' : 'none',
							transition: dropdownFadeTransition,
							willChange: 'opacity',
						}}
					>
						<div className="flex flex-col items-center justify-start gap-[12px] w-full h-full py-[12px]">
							<div
								className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								style={{ width: 'min(415px, calc(100% - 24px))' }}
								onClick={() => {
									setWhyValue('[Booking]');
									setActiveSection('what');
								}}
							>
								<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<BookingIcon />
								</div>
								<div className="ml-[12px] flex flex-col">
									<div className="text-[20px] font-medium leading-none text-black font-inter">
										Booking
									</div>
									<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
										contact venues, restaurants and more, to book shows
									</div>
								</div>
							</div>
							<div
								className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								style={{ width: 'min(415px, calc(100% - 24px))' }}
								onClick={() => {
									setWhyValue('[Promotion]');
									setActiveSection('what');
								}}
							>
								<div className="w-[38px] h-[38px] bg-[#7AD47A] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<PromotionIcon />
								</div>
								<div className="ml-[12px] flex flex-col">
									<div className="text-[20px] font-medium leading-none text-black font-inter">
										Promotion
									</div>
									<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
										reach out to radio stations, playlists, and more
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* What dropdown */}
					<div
						className="absolute inset-0"
						style={{
							opacity: activeSection === 'what' ? 1 : 0,
							pointerEvents: activeSection === 'what' ? 'auto' : 'none',
							transition: dropdownFadeTransition,
							willChange: 'opacity',
						}}
					>
						{/* Promotion */}
						{whyValue === '[Promotion]' ? (
							<div className="flex flex-col items-center justify-start gap-[10px] w-full h-full py-[12px]">
								<div
									className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									style={{ width: 'min(415px, calc(100% - 24px))' }}
									onClick={() => {
										setWhatValue('Radio Stations');
										setActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#56DA73] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<RadioStationsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Radio Stations
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Reach out to radio stations
										</div>
									</div>
								</div>
							</div>
						) : (
							<div id="contacts-what-dropdown" className="w-full h-full">
								<style jsx global>{`
									#contacts-what-dropdown .scrollbar-hide,
									#contacts-what-dropdown [data-scrollbar-content] {
										scrollbar-width: none !important;
										-ms-overflow-style: none !important;
									}
									#contacts-what-dropdown .scrollbar-hide::-webkit-scrollbar,
									#contacts-what-dropdown [data-scrollbar-content]::-webkit-scrollbar {
										display: none !important;
										width: 0 !important;
										height: 0 !important;
									}
								`}</style>
								<CustomScrollbar
									className="w-full h-full scrollbar-hide"
									contentClassName="flex flex-col items-center gap-[10px] py-[12px] scrollbar-hide"
									thumbWidth={2}
									thumbColor="#000000"
									trackColor="transparent"
									offsetRight={-5}
								>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Wine, Beer, and Spirits');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<WineBeerSpiritsIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Wine, Beer, and Spirits
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Pitch your act for seasonal events
											</div>
										</div>
									</div>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Restaurants');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#77DD91] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<RestaurantsIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Restaurants
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Land steady dinner and brunch gigs
											</div>
										</div>
									</div>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Coffee Shops');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#A9DE78] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<CoffeeShopsIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Coffee Shops
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Book intimate daytime performances
											</div>
										</div>
									</div>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Festivals');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<FestivalsIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Festivals
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Pitch your act for seasonal events
											</div>
										</div>
									</div>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Wedding Planners');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<WeddingPlannersIcon size={22} />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Wedding Planners
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Get hired for ceremonies & receptions
											</div>
										</div>
									</div>
									<div
										className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										style={{ width: 'min(415px, calc(100% - 24px))' }}
										onClick={() => {
											setWhatValue('Music Venues');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#71C9FD] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<MusicVenuesIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Music Venues
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Reach talent buyers for live shows
											</div>
										</div>
									</div>
								</CustomScrollbar>
							</div>
						)}
					</div>

					{/* Where dropdown */}
					<div
						className="absolute inset-0"
						style={{
							opacity: activeSection === 'where' ? 1 : 0,
							pointerEvents: activeSection === 'where' ? 'auto' : 'none',
							transition: dropdownFadeTransition,
							willChange: 'opacity',
						}}
					>
						<div id="contacts-where-dropdown" className="w-full h-full">
							<style jsx global>{`
								#contacts-where-dropdown .scrollbar-hide,
								#contacts-where-dropdown [data-scrollbar-content] {
									scrollbar-width: none !important;
									-ms-overflow-style: none !important;
								}
								#contacts-where-dropdown .scrollbar-hide::-webkit-scrollbar,
								#contacts-where-dropdown [data-scrollbar-content]::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
								}
							`}</style>
							{whereValue.length >= 1 ? (
								<CustomScrollbar
									className="w-full h-full scrollbar-hide"
									contentClassName="flex flex-col items-center justify-start gap-[12px] py-4 scrollbar-hide"
									thumbWidth={2}
									thumbColor="#000000"
									trackColor="transparent"
									offsetRight={-5}
								>
									{isLoadingLocations || debouncedWhereValue !== whereValue ? (
										<div className="flex items-center justify-center h-full">
											<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
										</div>
									) : locationResults && locationResults.length > 0 ? (
										locationResults.map((loc, idx) => {
											const { icon, backgroundColor } = getCityIconProps(
												loc.city,
												loc.state
											);
											return (
												<div
													key={`${loc.city}-${loc.state}-${idx}`}
													className="min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
													style={{ width: 'min(415px, calc(100% - 24px))' }}
													onClick={() => {
														setWhereValue(loc.label);
														setActiveSection(null);
													}}
												>
													<div
														className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
														style={{ backgroundColor }}
													>
														{icon}
													</div>
													<div className="ml-[12px] flex flex-col">
														<div className="text-[20px] font-medium leading-none text-black font-inter">
															{loc.label}
														</div>
														<div className="text-[12px] leading-tight text-black mt-[4px]">
															Search contacts in {loc.city || loc.state}
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div className="text-black font-medium font-secondary py-4">
											No locations found
										</div>
									)}
								</CustomScrollbar>
							) : (
								<div className="flex flex-col items-center justify-start gap-[12px] w-full h-full py-4">
									{DEFAULT_STATE_SUGGESTIONS.map(({ label, description }) => {
										const { icon, backgroundColor } = getCityIconProps('', label);
										return (
											<div
												key={label}
												className="h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
												style={{ width: 'min(415px, calc(100% - 24px))' }}
												onClick={() => {
													setWhereValue(label);
													setActiveSection(null);
												}}
											>
												<div
													className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
													style={{ backgroundColor }}
												>
													{icon}
												</div>
												<div className="ml-[12px] flex flex-col">
													<div className="text-[20px] font-medium leading-none text-black font-inter">
														{label}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														{description}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export const ContactsSelection: FC<ContactsSelectionProps> = (props) => {
	const {
		contacts,
		selectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
	} = useContactsSelection(props);

	const {
		campaign,
		onDraftEmails,
		onContactClick,
		onContactHover,
		onSearchFromMiniBar,
		goToSearch,
		goToDrafts,
		goToInbox,
		goToSent,
		goToWriting,
		hideBottomPanels,
		bottomPanelHeightPx,
		bottomPanelCollapsed,
		hideButton,
		mainBoxId,
		showSearchBar = true,
		isLoading = false,
		isAllContactsSelected,
		onSelectAllContacts,
	} = props;

	// Use the provided onSelectAllContacts if available, otherwise fall back to handleClick
	const handleAllButtonClick = onSelectAllContacts || handleClick;
	const [isDrafting, setIsDrafting] = useState(false);
	const router = useRouter();
	const isMobile = useIsMobile();
	const searchInfo = useMemo(() => parseSearchFromCampaign(campaign), [campaign]);
	
	// Track hovered contact index for keyboard navigation
	const [hoveredContactIndex, setHoveredContactIndex] = useState<number | null>(null);
	
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
				handleContactSelection(contact.id);
				onContactClick?.(contact);
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
	}, [hoveredContactIndex, contacts, onContactHover, handleContactSelection, onContactClick]);

	useEffect(() => {
		// Only add listener if we have a hovered contact
		if (hoveredContactIndex === null) return;
		
		// Use capture phase to run before campaign page handler
		document.addEventListener('keydown', handleKeyboardNavigation, true);
		return () => {
			document.removeEventListener('keydown', handleKeyboardNavigation, true);
		};
	}, [hoveredContactIndex, handleKeyboardNavigation]);

	const { data: drafts } = useGetEmails({
		filters: { campaignId: campaign?.id },
		enabled: !!campaign?.id,
	});

	const { data: sentEmails } = useGetEmails({
		filters: {
			campaignId: campaign?.id,
			status: EmailStatus.sent,
		},
		enabled: !!campaign?.id,
	});

	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);
	const [whyValue, setWhyValue] = useState('[Booking]');
	const [whatValue, setWhatValue] = useState(searchInfo.what);
	const [whereValue, setWhereValue] = useState(searchInfo.where);

	// Location search
	const debouncedWhereValue = useDebounce(whereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state'
	);

	// Handle search button click - trigger search in campaign's Search tab, or fallback to dashboard
	const handleSearch = () => {
		const payload = {
			why: whyValue,
			what: whatValue,
			where: whereValue,
		};

		// If the parent provided a handler (e.g., to drive the in-campaign Search tab),
		// use that instead of navigating away.
		if (onSearchFromMiniBar) {
			onSearchFromMiniBar(payload);
			return;
		}

		// Fallback: preserve original behavior of kicking off a dashboard search
		let searchQuery = '';
		if (whyValue) {
			searchQuery += whyValue + ' ';
		}
		if (whatValue) {
			searchQuery += whatValue;
		}
		if (whereValue) {
			searchQuery += ' in ' + whereValue;
		}
		searchQuery = searchQuery.trim();

		if (searchQuery) {
			// Store the search query in sessionStorage for the dashboard to pick up
			try {
				sessionStorage.setItem('murmur_pending_search', searchQuery);
			} catch {
				// Ignore sessionStorage errors (e.g., disabled storage)
			}

			// Navigate to the campaign-scoped dashboard search/map view when possible
			const dashboardUrl = campaign?.id
				? `${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}`
				: urls.murmur.dashboard.index;
			router.push(dashboardUrl);
		}
	};

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

	const openUsedContactTooltip = useCallback(
		(contactId: number) => {
			clearUsedContactTooltipCloseTimeout();
			const el = usedContactRowElsRef.current.get(contactId);
			if (el) {
				const rect = el.getBoundingClientRect();
				const bodyCtx = getBodyScaleContext();
				const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
				const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
				setUsedContactTooltipPos({
					left: rowLeftInBody + 33,
					top: rowTopInBody + 44,
				});
			}
			// Start with first campaign active, but don't reset if we're already on this contact
			// (e.g., user selected a row in the tooltip and moves back to the pill to click).
			setActiveUsedContactCampaignIndex((prev) =>
				hoveredUsedContactId === contactId ? (prev ?? 0) : 0
			);
			setHoveredUsedContactId(contactId);
		},
		[clearUsedContactTooltipCloseTimeout, getBodyScaleContext, hoveredUsedContactId]
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
			const bodyCtx = getBodyScaleContext();

			// Convert row's viewport coords into body coords, then apply design offsets in body coords.
			// This keeps offsets consistent even when the whole campaign UI is scaled.
			const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
			const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
			setUsedContactTooltipPos({
				left: rowLeftInBody + 33,
				top: rowTopInBody + 44,
			});
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
	}, [hoveredUsedContactId]);

	// Build contact lookup by email for inbox
	const allContacts = props.allContacts || props.contacts;
	const contactByEmail = useMemo(() => {
		const map: Record<string, typeof allContacts[0]> = {};
		for (const c of allContacts) {
			if (c.email) {
				map[c.email.toLowerCase().trim()] = c;
			}
		}
		return map;
	}, [allContacts]);

	const allowedSenderEmails = useMemo(
		() => allContacts.map((c) => c.email).filter(Boolean) as string[],
		[allContacts]
	);

	const selectedCount = selectedContactIds.size;

	const handleDraftEmails = async () => {
		if (!onDraftEmails || selectedContactIds.size === 0) return;

		setIsDrafting(true);
		try {
			await onDraftEmails(Array.from(selectedContactIds));
		} finally {
			setIsDrafting(false);
		}
	};

	// Only disable if no contacts selected or currently drafting
	// Don't use isDraftingDisabled here - let the drafting action handle validation
	const isButtonDisabled = isDrafting || selectedContactIds.size === 0;

	return (
		<div className="flex flex-col items-center">
			<DraftingTable
				handleClick={handleClick}
				areAllSelected={areAllSelected}
				hasData={contacts.length > 0}
				noDataMessage="No contacts selected"
				noDataDescription="Select contacts to generate personalized emails"
				// Only show loading placeholders when the table is empty and still loading.
				isPending={Boolean(isLoading) && contacts.length === 0}
				title="Contacts"
				mainBoxId={mainBoxId}
				contactsTopContentVariant={showSearchBar ? 'default' : 'compact'}
				goToSearch={goToSearch}
				goToDrafts={goToDrafts}
				goToInbox={goToInbox}
				goToWriting={goToWriting}
				isMobile={isMobile}
				topContent={
					!isMobile ? (
						<div className="w-full flex flex-col items-center pt-[6px]">
							{showSearchBar && (
								<MiniSearchBar
									activeSection={activeSection}
									setActiveSection={setActiveSection}
									whyValue={whyValue}
									setWhyValue={setWhyValue}
									whatValue={whatValue}
									setWhatValue={setWhatValue}
									whereValue={whereValue}
									setWhereValue={setWhereValue}
									locationResults={locationResults}
									isLoadingLocations={isLoadingLocations}
									debouncedWhereValue={debouncedWhereValue}
									onSearch={handleSearch}
								/>
							)}
							{/* Selected count row - positioned right above contact rows */}
							<div
								className={cn(
									'w-[489px] relative flex justify-center items-center px-1 mb-[2px]',
									showSearchBar ? 'mt-[10px]' : 'mt-[2px]'
								)}
							>
								<span className="text-[14px] font-inter font-medium text-black">
									{selectedCount} Selected
								</span>
								<button
									type="button"
									className="absolute right-1 text-[14px] font-inter font-medium text-black bg-transparent border-none cursor-pointer p-0 m-0 leading-none hover:underline transition-colors"
									onClick={handleClick}
								>
									{areAllSelected ? 'Deselect All' : 'Select All'}
								</button>
							</div>
						</div>
					) : undefined
				}
			>
				<div
					className={cn(
						"overflow-visible w-full flex flex-col items-center",
						isMobile ? "gap-2" : "gap-4"
					)}
					onMouseLeave={() => {
						setHoveredContactIndex(null);
						onContactHover?.(null);
					}}
				>
					{typeof document !== 'undefined' &&
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
					{contacts.map((contact, contactIndex) => {
						const isUsedContact = usedContactIdsSet.has(contact.id);
						const isUsedContactHoverCardVisible =
							hoveredUsedContactId === contact.id &&
							Boolean(usedContactTooltipPos) &&
							Boolean(hoveredUsedContactCampaigns?.length);
						// Mobile-specific width values (using CSS calc for responsive sizing)
						const mobileContactRowWidth = 'calc(100vw - 24px)';
						// Keyboard focus shows hover UI independently of mouse hover
						const isKeyboardFocused = hoveredContactIndex === contactIndex;
						// Final background: selected > keyboard focus > white (mouse hover handled by CSS)
						const contactBgColor = selectedContactIds.has(contact.id)
							? 'bg-[#EAAEAE]'
							: isKeyboardFocused
								? 'bg-[#F5DADA]'
								: 'bg-white hover:bg-[#F5DADA]';
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
								'cursor-pointer grid grid-cols-2 grid-rows-2 h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] select-none row-hover-scroll relative',
								!isMobile && 'w-[489px]',
								contactBgColor,
							)}
							style={isMobile ? { width: mobileContactRowWidth } : undefined}
							onMouseDown={(e) => {
								// Prevent text selection on shift-click
								if (e.shiftKey) {
									e.preventDefault();
								}
							}}
							onMouseEnter={() => {
								setHoveredContactIndex(contactIndex);
								onContactHover?.(contact);
							}}
							onClick={(e) => {
								handleContactSelection(contact.id, e);
								onContactClick?.(contact);
							}}
						>
							{/* Used contact indicator - absolutely positioned, vertically centered */}
							{isUsedContact && (() => {
								const isMultiCampaignIndicator = isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length > 1;
								const isSingleCampaignIndicator = isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length === 1;
								// For multi-campaign: #A0C0FF with sliding dot
								// For single-campaign: #B0EAA4 (green, no dot)
								// For default (not hovered): #DAE6FE
								const pillBg = isMultiCampaignIndicator
									? '#A0C0FF'
									: isSingleCampaignIndicator
										? '#B0EAA4'
										: '#DAE6FE';
								// Handle mouse move on the pill to drive campaign selection
								const handlePillMouseMove = isMultiCampaignIndicator
									? (e: React.MouseEvent<HTMLSpanElement>) => {
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
											left: '12px',
											// Align circle with Company (top row). Keep the taller pill centered to avoid clipping.
											top: isUsedContactHoverCardVisible ? '50%' : '14px',
											transform: 'translateY(-50%)',
											boxSizing: 'border-box',
											// Default state: 16×16 circle. Hover state (single/multi): 14×37 pill.
											width: isUsedContactHoverCardVisible ? '14px' : '16px',
											height: isUsedContactHoverCardVisible ? '37px' : '16px',
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
									>
										{/* Sliding dot for multi-campaign */}
										{isMultiCampaignIndicator && (
											<span
												className="rounded-full bg-[#DAE6FE] pointer-events-none transition-all duration-150 ease-out"
												style={(() => {
													// Spec: 14×37 pill, 14×14 circle, thin stroke.
													const PILL_HEIGHT = 37;
													const DOT_SIZE = 14;
													const maxTop = Math.max(0, PILL_HEIGHT - DOT_SIZE);
													const campaignCount = resolvedUsedContactCampaigns.length;
													const clampedIdx =
														typeof activeUsedContactCampaignIndex === 'number' && campaignCount > 0
															? Math.min(campaignCount - 1, Math.max(0, activeUsedContactCampaignIndex))
															: 0;
													// Position dot based on active index
													const top = campaignCount > 1 ? (maxTop * clampedIdx) / (campaignCount - 1) : maxTop / 2;
													return {
														position: 'absolute' as const,
														left: '0px',
														top: `${top}px`,
														width: `${DOT_SIZE}px`,
														height: `${DOT_SIZE}px`,
														// Thin stroke without changing geometry.
														boxShadow: '0 0 0 1px #000000',
													};
												})()}
											/>
										)}
									</span>
								);
							})()}
							{(() => {
								const fullName =
									contact.name ||
									`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
								const contactTitle = contact.title || contact.headline || '';
								// Left padding: 12px base + 16px dot + 8px gap = 36px when used, else 12px
								const leftPadding = isUsedContact ? 'pl-[36px]' : 'pl-3';
								const hasLocation = Boolean(contact.city || contact.state);
								const shouldSpanLocation = !contactTitle && hasLocation;
								// Company is always top slot, Name always bottom slot (fixed positions).
								const companyValue = contact.company || (!fullName ? 'Contact' : '');

								return (
									<>
										{/* Top Left - Company */}
										<div className={cn(leftPadding, 'pr-1 flex items-end pb-[2px] overflow-hidden')}>
											<div
												className="font-bold text-[15px] font-inter text-black w-full whitespace-nowrap overflow-hidden leading-[1.1]"
												style={{
													maskImage:
														'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
													WebkitMaskImage:
														'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
												}}
											>
												{companyValue}
											</div>
										</div>

										{/* Top Right - Title (or empty when location spans both rows) */}
										{shouldSpanLocation ? (
											<div className="w-full" />
										) : (
											<div className="pr-1 pl-0 flex items-end pb-[2px] justify-end overflow-hidden">
												{contactTitle ? (
													<div
														className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center gap-1 border border-black overflow-hidden"
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
																				: isWineBeerSpiritsTitle(contactTitle)
																					? '#BFC4FF'
																					: '#E8EFFF',
														}}
													>
														{isRestaurantTitle(contactTitle) && <RestaurantsIcon size={14} />}
														{isCoffeeShopTitle(contactTitle) && <CoffeeShopsIcon size={8} />}
														{isMusicVenueTitle(contactTitle) && (
															<MusicVenuesIcon size={14} className="flex-shrink-0" />
														)}
														{isMusicFestivalTitle(contactTitle) && (
															<FestivalsIcon size={14} className="flex-shrink-0" />
														)}
														{(isWeddingPlannerTitle(contactTitle) ||
															isWeddingVenueTitle(contactTitle)) && (
															<WeddingPlannersIcon size={14} />
														)}
														{isWineBeerSpiritsTitle(contactTitle) && (
															<WineBeerSpiritsIcon size={14} className="flex-shrink-0" />
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
																						: isWineBeerSpiritsTitle(contactTitle)
																							? getWineBeerSpiritsLabel(contactTitle) ??
																								contactTitle
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
										)}

										{/* Bottom Left - Name */}
										<div className={cn(leftPadding, 'pr-1 flex items-start pt-[2px] overflow-hidden')}>
											<div className="text-[15px] font-inter text-black w-full truncate leading-[1.1]">
												{fullName}
											</div>
										</div>

										{/* Bottom Right - Location (or spanning when no title) */}
										{shouldSpanLocation ? (
											<div className="row-span-2 pr-1 pl-0 flex items-center h-full justify-end">
												<div className="flex items-center gap-1 w-[240px]">
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
															canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
														const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

														if (!stateAbbr) return null;
														return isCanadianProvince ? (
															<div
																className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																style={{ borderColor: '#000000' }}
																title="Canadian province"
															>
																<CanadianFlag width="100%" height="100%" className="w-full h-full" />
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
														<ScrollableText text={contact.city} className="text-xs text-black w-full" />
													) : (
														<div className="w-full" />
													)}
												</div>
											</div>
										) : (
											<div className="pr-1 pl-0 flex items-start pt-[2px] justify-end overflow-hidden">
												{hasLocation ? (
													<div className="flex items-center gap-1 w-[240px]">
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
																	<CanadianFlag width="100%" height="100%" className="w-full h-full" />
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
										)}
									</>
								);
							})()}
						</div>
					);
					})}
					{Array.from({ length: Math.max(0, (isMobile ? 6 : 9) - contacts.length) }).map((_, idx) => (
						<div
							key={`placeholder-${idx}`}
							className={cn(
								"select-none h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#EB8586]",
								!isMobile && "w-[489px]"
							)}
							style={isMobile ? { width: 'calc(100vw - 24px)' } : undefined}
						/>
					))}
				</div>
			</DraftingTable>

			{/* Draft Emails Button - below the table box */}
			<div className="w-[475px] h-[40px] mt-4 mx-auto">
				{!isDrafting && !hideButton && (
					<div data-draft-button-container className="group relative w-full h-full">
						{selectedCount > 0 || isAllContactsSelected ? (
							// Animated draft button with expanding "All" state
							<button
								type="button"
								onClick={handleDraftEmails}
								disabled={isButtonDisabled}
								className={cn(
									'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] relative overflow-hidden transition-colors',
									isAllContactsSelected ? 'duration-300' : 'duration-0',
									isButtonDisabled
										? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
										: isAllContactsSelected
											? 'bg-[#4DC669] border-black hover:bg-[#45B85F] cursor-pointer'
											: 'bg-[#F2C7C7] border-[#9A3434] hover:bg-[#E6B9B9] cursor-pointer'
								)}
							>
								{/* Normal text - fades out when All selected */}
								<span
									className={cn(
										'transition-opacity',
										isAllContactsSelected ? 'duration-300 opacity-0' : 'duration-0 opacity-100'
									)}
								>
									{isDrafting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent inline-block mr-2" />
											Drafting...
										</>
									) : (
										`Draft ${selectedCount} ${selectedCount === 1 ? 'Contact' : 'Contacts'}`
									)}
								</span>
								{/* "All" text - fades in when All selected */}
								<span
									className={cn(
										'absolute inset-0 flex items-center justify-center transition-opacity',
										isAllContactsSelected ? 'duration-300 opacity-100' : 'duration-0 opacity-0'
									)}
								>
									Draft <span className="font-bold mx-1">All</span> {contacts.length} Contacts
								</span>
								{/* Expanding green overlay from right */}
								<div
									className={cn(
										'absolute top-0 bottom-0 right-0 bg-[#4DC669] ease-out',
										isAllContactsSelected
											? 'w-full rounded-[1px] transition-all duration-300'
											: 'w-[62px] rounded-r-[1px] transition-none'
									)}
									style={{
										opacity: isAllContactsSelected ? 0 : 1,
									}}
								/>
							</button>
						) : (
							<div className="relative w-full h-full rounded-[4px] border-[3px] border-transparent overflow-hidden transition-colors group-hover:bg-[#EEF5EF] group-hover:border-black">
								<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px] cursor-default">
									Select Contacts and Draft Emails
								</div>
								<button
									type="button"
									aria-label="Select all contacts"
									className="absolute right-0 top-0 bottom-0 w-[62px] bg-[#D17474] rounded-r-[1px] rounded-l-none flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#C26666] cursor-pointer z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
									onClick={(e) => {
										e.stopPropagation();
										handleAllButtonClick();
									}}
								>
									<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black" />
									All
								</button>
							</div>
						)}
						{/* "All" button overlay - only visible when not all selected */}
						{(selectedCount > 0 || isAllContactsSelected) && !isAllContactsSelected && (
							<button
								type="button"
								className="absolute right-[3px] top-[2.5px] bottom-[2.5px] w-[62px] bg-[#D17474] rounded-r-[1px] rounded-l-none flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#C26666] cursor-pointer z-10"
								onClick={(e) => {
									e.stopPropagation();
									handleAllButtonClick();
								}}
							>
								{/* Vertical divider line - explicit element to avoid border rendering gaps */}
								<div className="absolute left-0 -top-[0.5px] -bottom-[0.5px] w-[2px] bg-[#9A3434]" />
								All
							</button>
						)}
					</div>
				)}
			</div>

			{/* Bottom Panels: Drafts, Sent, and Inbox */}
			{!hideBottomPanels && (
				<div className="mt-[35px] pb-[8px] flex justify-center gap-[15px]">
					<DraftsExpandedList
						drafts={drafts || []}
						contacts={props.allContacts || props.contacts}
						width={233}
						height={bottomPanelHeightPx ?? 117}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						hideSendButton={true}
						onOpenDrafts={goToDrafts}
					/>
					<SentExpandedList
						sent={sentEmails || []}
						contacts={props.allContacts || props.contacts}
						width={233}
						height={bottomPanelHeightPx ?? 117}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						onOpenSent={goToSent}
					/>
					<InboxExpandedList
						contacts={props.allContacts || props.contacts}
						allowedSenderEmails={allowedSenderEmails}
						contactByEmail={contactByEmail}
						width={233}
						height={bottomPanelHeightPx ?? 117}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						onOpenInbox={goToInbox}
					/>
				</div>
			)}
		</div>
	);
};
