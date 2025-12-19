'use client';

import { FC, useMemo, useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { ContactsSelectionProps, useContactsSelection } from './useContactsSelection';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
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
import { useGetUsedContactIds, useGetLocations } from '@/hooks/queryHooks/useContacts';
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

		// Hide when no active section (default state shows dividers)
		if (!activeSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevActiveSectionForIndicatorRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevActiveSectionForIndicatorRef.current;

		// On first open, snap to position (no slide), then fade in
		if (!prevSection) {
			gsap.set(indicator, { xPercent: nextXPercent });
			gsap.to(indicator, {
				opacity: 1,
				duration: 0.15,
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
											setWhatValue('Wedding Planners');
											setActiveSection('where');
										}}
									>
										<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<WeddingPlannersIcon />
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
		hideBottomPanels,
		hideButton,
		mainBoxId,
	} = props;
	const [isDrafting, setIsDrafting] = useState(false);
	const router = useRouter();
	const isMobile = useIsMobile();
	const searchInfo = useMemo(() => parseSearchFromCampaign(campaign), [campaign]);

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
			sessionStorage.setItem('murmur_pending_search', searchQuery);
			// Navigate to the dashboard
			router.push(urls.murmur.dashboard.index);
		}
	};

	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

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
				isPending={false}
				title="Contacts"
				mainBoxId={mainBoxId}
				goToSearch={goToSearch}
				goToDrafts={goToDrafts}
				goToInbox={goToInbox}
				isMobile={isMobile}
				topContent={
					!isMobile ? (
						<div className="w-full flex flex-col items-center pt-[6px]">
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
							{/* Selected count row - positioned right above contact rows */}
							<div className="w-[489px] relative flex justify-center items-center px-1 mt-[10px] mb-[2px]">
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
				<div className={cn("overflow-visible w-full flex flex-col items-center", isMobile ? "gap-2" : "gap-4")}>
					{contacts.map((contact) => {
						const isUsedContact = usedContactIdsSet.has(contact.id);
						// Mobile-specific width values (using CSS calc for responsive sizing)
						const mobileContactRowWidth = 'calc(100vw - 24px)';
						return (
						<div
							key={contact.id}
							className={cn(
								'cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none row-hover-scroll relative',
								!isMobile && 'w-[489px]',
								selectedContactIds.has(contact.id) ? 'bg-[#EAAEAE]' : ''
							)}
							style={isMobile ? { width: mobileContactRowWidth } : undefined}
							onMouseDown={(e) => {
								// Prevent text selection on shift-click
								if (e.shiftKey) {
									e.preventDefault();
								}
							}}
							onMouseEnter={() => {
								onContactHover?.(contact);
							}}
							onMouseLeave={() => {
								onContactHover?.(null);
							}}
							onClick={(e) => {
								handleContactSelection(contact.id, e);
								onContactClick?.(contact);
							}}
						>
							{/* Used contact indicator - absolutely positioned, vertically centered */}
							{isUsedContact && (
								<span
									className="absolute left-3 top-1/2 -translate-y-1/2"
									title="Used in a previous campaign"
									style={{
										width: '16px',
										height: '16px',
										borderRadius: '50%',
										border: '1px solid #000000',
										backgroundColor: '#DAE6FE',
									}}
								/>
							)}
							{(() => {
								const fullName =
									contact.name ||
									`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
								const contactTitle = contact.title || contact.headline || '';
								// Left padding: 12px base + 16px dot + 8px gap = 36px when used, else 12px
								const leftPadding = isUsedContact ? 'pl-[36px]' : 'pl-3';

								// Left column - Name and Company
								if (fullName) {
									// Has name - show name in top, company in bottom
									return (
										<>
											{/* Top Left - Name */}
											<div className={cn(leftPadding, 'pr-1 flex items-center h-[24px]')}>
												<div className="font-bold text-[11px] w-full truncate leading-tight">
													{fullName}
												</div>
											</div>

											{/* Top Right - Title */}
											<div className="pr-1 pl-0 flex items-center h-[24px] justify-end">
												{contactTitle ? (
													<div className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden">
														<ScrollableText
															text={contactTitle}
															className="text-[10px] text-black leading-none"
															scrollPixelsPerSecond={60}
														/>
													</div>
												) : (
													<div className="w-full" />
												)}
											</div>

											{/* Bottom Left - Company */}
											<div className={cn(leftPadding, 'pr-1 flex items-center h-[24px]')}>
												<div
													className="text-[15px] font-medium text-black w-full whitespace-nowrap overflow-hidden leading-tight"
													style={{
														maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
														WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
													}}
												>
													{contact.company || ''}
												</div>
											</div>

											{/* Bottom Right - Location */}
											<div className="pr-1 pl-0 flex items-center h-[24px] justify-end">
												{contact.city || contact.state ? (
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
									);
								} else {
									// No name - vertically center company on left side
									return (
										<>
											{/* Left column - Company vertically centered */}
											<div className={cn('row-span-2 pr-1 flex items-center h-full', leftPadding)}>
												<div
													className="font-medium text-[15px] text-black w-full whitespace-nowrap overflow-hidden leading-tight"
													style={{
														maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
														WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
													}}
												>
													{contact.company || 'Contact'}
												</div>
											</div>

											{/* Right column - Title or Location */}
											{contactTitle ? (
												<>
													{/* Top Right - Title */}
													<div className="pr-1 pl-0 flex items-center h-[24px] justify-end">
														<div className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden">
															<ScrollableText
																text={contactTitle}
																className="text-[10px] text-black leading-none"
																scrollPixelsPerSecond={60}
															/>
														</div>
													</div>

													{/* Bottom Right - Location */}
													<div className="pr-1 pl-0 flex items-center h-[24px] justify-end">
														{contact.city || contact.state ? (
															<div className="flex items-center gap-1 w-[240px]">
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
												// No title - vertically center location
												<div className="row-span-2 pr-1 pl-0 flex items-center h-full justify-end">
													{contact.city || contact.state ? (
														<div className="flex items-center gap-1 w-[240px]">
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
									);
								}
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
			{!isDrafting && !hideButton && (
				<div className="relative w-[475px] h-[40px] mt-4 mx-auto">
					{selectedCount > 0 ? (
						<>
							<button
								type="button"
								onClick={handleDraftEmails}
								disabled={isButtonDisabled}
								className={cn(
									'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px]',
									isButtonDisabled
										? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
										: 'bg-[#F2C7C7] border-[#9A3434] hover:bg-[#E6B9B9] cursor-pointer'
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
							</button>
							{/* Right section "All" button */}
							<button
								type="button"
								className="absolute right-[3px] top-[2.5px] bottom-[2.5px] w-[62px] bg-[#D17474] rounded-r-[1px] rounded-l-none flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#C26666] cursor-pointer z-10"
								onClick={(e) => {
									e.stopPropagation();
									handleClick();
								}}
							>
								{/* Vertical divider line - explicit element to avoid border rendering gaps */}
								<div className="absolute left-0 -top-[0.5px] -bottom-[0.5px] w-[2px] bg-[#9A3434]" />
								All
							</button>
						</>
					) : (
						<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
							Select Contacts and Draft Emails
						</div>
					)}
				</div>
			)}

			{/* Bottom Panels: Drafts, Sent, and Inbox */}
			{!hideBottomPanels && (
				<div className="mt-[35px] flex justify-center gap-[15px]">
					<DraftsExpandedList
						drafts={drafts || []}
						contacts={props.allContacts || props.contacts}
						width={233}
						height={117}
						whiteSectionHeight={15}
						hideSendButton={true}
					/>
					<SentExpandedList
						sent={sentEmails || []}
						contacts={props.allContacts || props.contacts}
						width={233}
						height={117}
						whiteSectionHeight={15}
					/>
					<InboxExpandedList
						contacts={props.allContacts || props.contacts}
						allowedSenderEmails={allowedSenderEmails}
						contactByEmail={contactByEmail}
						width={233}
						height={117}
						whiteSectionHeight={15}
					/>
				</div>
			)}
		</div>
	);
};
