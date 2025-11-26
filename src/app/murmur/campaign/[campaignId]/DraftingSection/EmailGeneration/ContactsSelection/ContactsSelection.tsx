'use client';

import { FC, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContactsSelectionProps, useContactsSelection } from './useContactsSelection';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactIds, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { CampaignWithRelations } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
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
const parseSearchFromCampaign = (campaign?: CampaignWithRelations) => {
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
const MiniSearchBar: FC<{
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
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

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

	return (
		<div className="relative" ref={containerRef}>
			<div
				className="w-[489px] h-[49px] bg-white rounded-[8px] border-2 border-black flex items-center relative"
				style={{ marginBottom: '4px' }}
			>
				<div
					className={cn(
						'flex items-center h-[38px] mx-[5px] rounded-[6px] flex-1 group',
						activeSection
							? 'bg-[#F3F3F3] border border-transparent'
							: 'bg-white border border-black'
					)}
				>
					{/* Why section */}
					<div
						className={cn(
							'flex-1 flex items-center justify-start h-full min-w-0 relative pl-[16px] pr-1 cursor-pointer',
							!activeSection && 'border-r border-transparent group-hover:border-black/10'
						)}
						onClick={() => setActiveSection(activeSection === 'why' ? null : 'why')}
					>
						{activeSection === 'why' && (
							<div
								className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
								style={{
									width: '117px',
									height: '38px',
								}}
							/>
						)}
						<div className="w-full h-full flex items-center text-left text-[13px] font-bold font-secondary truncate p-0 relative z-10">
							{whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Why'}
						</div>
					</div>

					{/* What section - input field */}
					<div
						className={cn(
							'flex-1 flex items-center justify-start h-full min-w-0 relative pl-[16px] pr-1',
							!activeSection && 'border-r border-transparent group-hover:border-black/10'
						)}
					>
						{activeSection === 'what' && (
							<div
								className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
								style={{
									width: '144px',
									height: '38px',
								}}
							/>
						)}
						<input
							value={whatValue}
							onChange={(e) => setWhatValue(e.target.value)}
							className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary truncate placeholder:text-black p-0 focus:ring-0 cursor-pointer relative z-10"
							placeholder="What"
							onFocus={(e) => {
								setActiveSection('what');
								const target = e.target;
								setTimeout(() => target.setSelectionRange(0, 0), 0);
							}}
						/>
					</div>

					{/* Where section - input field */}
					<div className="flex-1 flex items-center justify-start h-full min-w-0 relative pl-[16px] pr-[8px]">
						{activeSection === 'where' && (
							<div
								className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
								style={{
									width: '143px',
									height: '38px',
								}}
							/>
						)}
						<input
							value={whereValue}
							onChange={(e) => setWhereValue(e.target.value)}
							className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary truncate placeholder:text-black p-0 focus:ring-0 cursor-pointer relative z-10"
							placeholder="Where"
							onFocus={(e) => {
								setActiveSection('where');
								const target = e.target;
								setTimeout(() => target.setSelectionRange(0, target.value.length), 0);
							}}
						/>
					</div>
				</div>

				{/* Search button */}
				<button
					type="button"
					className="flex items-center justify-center transition-colors cursor-pointer hover:bg-[#a3d9a5] mr-[5px]"
					style={{
						width: '42px',
						height: '38px',
						backgroundColor: '#B8E4BE',
						border: '1px solid #5DAB68',
						borderRadius: '0 6px 6px 0',
					}}
					aria-label="Search"
					onClick={onSearch}
				>
					<div style={{ transform: 'scale(0.75)', display: 'flex' }}>
						<svg
							width="26"
							height="28"
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
					</div>
				</button>
			</div>

			{/* Dropdowns */}
			{/* Why dropdown */}
			{activeSection === 'why' && (
				<div
					className="absolute flex flex-col items-center justify-start gap-[12px] w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110]"
					style={{ top: 'calc(100% + 10px)', left: '25px', padding: '12px 0' }}
				>
					<div
						className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
					<div
						className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
				</div>
			)}

			{/* What dropdown - Promotion */}
			{activeSection === 'what' && whyValue === '[Promotion]' && (
				<div
					className="absolute flex flex-col items-center justify-start gap-[10px] w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110]"
					style={{ top: 'calc(100% + 10px)', left: '25px', padding: '12px 0' }}
				>
					<div
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
			)}

			{/* What dropdown - Booking */}
			{activeSection === 'what' && whyValue !== '[Promotion]' && (
				<div
					className="absolute flex flex-col items-center justify-start gap-[10px] w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110]"
					style={{ top: 'calc(100% + 10px)', left: '25px', padding: '12px 0' }}
				>
					<div
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
						className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
				</div>
			)}

			{/* Where dropdown */}
			{activeSection === 'where' && (
				<div
					id="contacts-where-dropdown"
					className="absolute w-[439px] h-[300px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110]"
					style={{ top: 'calc(100% + 10px)', left: '25px' }}
				>
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
									const { icon, backgroundColor } = getCityIconProps(loc.city, loc.state);
									return (
										<div
											key={`${loc.city}-${loc.state}-${idx}`}
											className="w-[415px] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
										className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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

	const { campaign, onDraftEmails } = props;
	const [isDrafting, setIsDrafting] = useState(false);
	const router = useRouter();
	const searchInfo = useMemo(() => parseSearchFromCampaign(campaign), [campaign]);

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
		'state-first'
	);

	// Handle search button click - navigate to dashboard with new search
	const handleSearch = () => {
		// Construct the search query in the format: "[Why] What in Where"
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
				topContent={
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
						<div className="w-[489px] flex justify-between items-center px-1 mt-[16px] mb-[2px]">
							<span className="text-[12px] font-inter font-medium text-black">
								{selectedCount} Selected
							</span>
							<button
								type="button"
								className="text-[12px] font-inter font-medium text-black bg-transparent border-none cursor-pointer p-0 m-0 leading-none hover:underline transition-colors"
								onClick={handleClick}
							>
								{areAllSelected ? 'Deselect All' : 'Select All'}
							</button>
						</div>
					</div>
				}
			>
				<div className="overflow-visible w-full flex flex-col gap-2 items-center">
					{contacts.map((contact) => (
						<div
							key={contact.id}
							className={cn(
								'cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-[489px] h-[49px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none row-hover-scroll',
								selectedContactIds.has(contact.id) ? 'bg-[#EAAEAE]' : ''
							)}
							onMouseDown={(e) => {
								// Prevent text selection on shift-click
								if (e.shiftKey) {
									e.preventDefault();
								}
							}}
							onClick={(e) => handleContactSelection(contact.id, e)}
						>
							{(() => {
								const fullName =
									contact.name ||
									`${contact.firstName || ''} ${contact.lastName || ''}`.trim();

								// Left column - Name and Company
								if (fullName) {
									// Has name - show name in top, company in bottom
									return (
										<>
											{/* Top Left - Name */}
											<div className="pl-3 pr-1 flex items-center h-[23px]">
												{usedContactIdsSet.has(contact.id) && (
													<span
														className="inline-block shrink-0 mr-2"
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
												<div className="font-bold text-[11px] w-full truncate leading-tight">
													{fullName}
												</div>
											</div>

											{/* Top Right - Title */}
											<div className="pr-2 pl-1 flex items-center h-[23px]">
												{contact.headline ? (
													<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
														<ScrollableText
															text={contact.headline}
															className="text-[10px] text-black leading-none"
															scrollPixelsPerSecond={60}
														/>
													</div>
												) : (
													<div className="w-full" />
												)}
											</div>

											{/* Bottom Left - Company */}
											<div className="pl-3 pr-1 flex items-center h-[22px]">
												<div className="text-[11px] text-black w-full truncate leading-tight">
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
									);
								} else {
									// No name - vertically center company on left side
									return (
										<>
											{/* Left column - Company vertically centered */}
											<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
												{usedContactIdsSet.has(contact.id) && (
													<span
														className="inline-block shrink-0 mr-2"
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
												<div className="font-bold text-[11px] text-black w-full truncate leading-tight">
													{contact.company || 'Contact'}
												</div>
											</div>

											{/* Right column - Title or Location */}
											{contact.headline ? (
												<>
													{/* Top Right - Title */}
													<div className="pr-2 pl-1 flex items-center h-[23px]">
														<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
															<ScrollableText
																text={contact.headline}
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
												// No title - vertically center location
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
									);
								}
							})()}
						</div>
					))}
					{Array.from({ length: Math.max(0, 7 - contacts.length) }).map((_, idx) => (
						<div
							key={`placeholder-${idx}`}
							className="select-none w-[489px] h-[49px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white"
						/>
					))}
				</div>
			</DraftingTable>

			{/* Draft Emails Button - below the table box */}
			<button
				type="button"
				onClick={handleDraftEmails}
				disabled={isButtonDisabled}
				className={cn(
					'mt-4 flex items-center justify-center gap-2 rounded-[8px] border-2 border-black font-inter font-semibold text-[14px] transition-all duration-200',
					isButtonDisabled
						? 'bg-[#E0E0E0] text-[#888888] cursor-not-allowed'
						: 'bg-[#EB8586] text-black hover:bg-[#E06F70] cursor-pointer'
				)}
				style={{ width: '475px', height: '40px' }}
			>
				{isDrafting ? (
					<>
						<div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
						<span>Drafting...</span>
					</>
				) : (
					<span>Draft Emails ({selectedCount} selected)</span>
				)}
			</button>
		</div>
	);
};
