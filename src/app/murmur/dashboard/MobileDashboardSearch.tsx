'use client';

import { FC, useMemo, useRef, useState } from 'react';
import BulletListIcon from '@/components/atoms/_svg/BulletListIcon';
import MapBottomSearchArrowIcon from '@/components/atoms/_svg/MapBottomSearchArrowIcon';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import { MobileCampaignSearchHeader } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileCampaignSearchHeader';
import { MobileSearchResultRowCard } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileSearchResultRowCard';
import { ContactWithName } from '@/types/contact';

export type MobileDashboardSearchSummarySection = 'drafts' | 'contacts' | 'conversations';

// Mobile chrome for the dashboard pick flow (add-to-campaign search). Renders ONLY
// UI above the persistent singleton map: the map itself lives in MurmurLayoutClient
// (PersistentDashboardMap, fixed z-98 when in map view), so this overlay must sit at
// z-[99]+ and stay pointer-events-none except on interactive children — map gestures
// (pan, marker taps, area select) pass through everywhere else.
export const MobileDashboardSearch: FC<{
	campaignName: string;
	headerContacts: ContactWithName[];
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	newMessageCount: number;
	onOpenCampaignSummary: (section: MobileDashboardSearchSummarySection) => void;
	/** Label for the committed-search pill ("For You" / query). null hides the pill. */
	queryPillLabel: string | null;
	onClearQuery: () => void;
	listContacts: ContactWithName[];
	selectedContactIds: number[];
	onToggleContact: (contact: ContactWithName) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	isLoading: boolean;
	hasNoResults: boolean;
	/** Gates the List/Map toggle (no list before the first committed search). */
	hasSearched: boolean;
	searchValue: string;
	onSearchValueChange: (value: string) => void;
	onSubmitSearch: () => void;
	canAddSelected: boolean;
	onAddSelected: () => void;
	isAddPending: boolean;
}> = ({
	campaignName,
	headerContacts,
	contactsCount,
	draftCount,
	sentCount,
	newMessageCount,
	onOpenCampaignSummary,
	queryPillLabel,
	onClearQuery,
	listContacts,
	selectedContactIds,
	onToggleContact,
	onSelectAll,
	onDeselectAll,
	isLoading,
	hasNoResults,
	hasSearched,
	searchValue,
	onSearchValueChange,
	onSubmitSearch,
	canAddSelected,
	onAddSelected,
	isAddPending,
}) => {
	const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	const selectedIdSet = useMemo(
		() => new Set<number>(selectedContactIds),
		[selectedContactIds]
	);
	const selectedInListCount = useMemo(
		() => listContacts.reduce((count, c) => count + (selectedIdSet.has(c.id) ? 1 : 0), 0),
		[listContacts, selectedIdSet]
	);
	const areAllListSelected =
		listContacts.length > 0 && selectedInListCount === listContacts.length;

	const handleSubmit = () => {
		onSubmitSearch();
		setViewMode('map');
		searchInputRef.current?.blur();
	};

	return (
		<div className="fixed inset-0 z-[99] overflow-hidden pointer-events-none mobile-campaign-search-overlay">
			{/* Searching spinner over the map */}
			{isLoading && viewMode === 'map' && (
				<div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
					<div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
				</div>
			)}

			{/* No-results card over the map */}
			{viewMode === 'map' && hasNoResults && !isLoading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-8">
					<div className="bg-white border border-black rounded-[10px] px-4 py-3 font-inter text-[13px] text-black max-w-full truncate">
						No results for &quot;{queryPillLabel ?? searchValue}&quot;
					</div>
				</div>
			)}

			<div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
				{/* Top: campaign header + pills (+ committed search in map mode) */}
				<div className="px-3 pt-3 flex flex-col gap-2">
					<MobileCampaignSearchHeader
						campaignName={campaignName}
						contacts={headerContacts}
						contactsCount={contactsCount}
						draftCount={draftCount}
						sentCount={sentCount}
						newMessageCount={newMessageCount}
						onDraftsClick={() => onOpenCampaignSummary('drafts')}
						onSentClick={() => onOpenCampaignSummary('contacts')}
						onNewMessageClick={() => onOpenCampaignSummary('conversations')}
					/>
					{viewMode === 'map' && queryPillLabel !== null && (
						<div className="pointer-events-auto relative h-[40px] bg-white rounded-[10px] border border-black flex items-center pl-3 pr-2 gap-2 overflow-hidden">
							{/* Same animated search gradient as the desktop For You box */}
							<div
								className="search-gradient-button absolute overflow-hidden"
								style={{
									left: '4px',
									right: '4px',
									top: '4px',
									bottom: '4px',
									borderRadius: '6px',
									border: '0.75px solid #595959',
									opacity: 0.65,
									boxSizing: 'border-box',
								}}
							/>
							<span className="relative font-inter text-[14px] text-white flex-1 min-w-0 truncate">
								{queryPillLabel}
							</span>
							<button
								type="button"
								aria-label="Clear search"
								onClick={onClearQuery}
								className="relative w-[26px] h-[24px] rounded-[6px] bg-white flex items-center justify-center text-black text-[14px] leading-none flex-shrink-0"
							>
								✕
							</button>
						</div>
					)}
				</div>

				{/* Middle: list panel (list mode) or spacer (map mode) */}
				{viewMode === 'list' ? (
					<div className="pointer-events-auto flex-1 min-h-0 mt-2 mx-2 bg-[#D8E5FB] border-2 border-black rounded-[10px] flex flex-col overflow-hidden">
						{/* Panel header: label + query chip + close */}
						<div className="flex-shrink-0 flex items-stretch h-[40px] border-b-2 border-black bg-white">
							<div className="flex items-center px-3 bg-[#B9EAF1] border-r-2 border-black">
								<span className="font-inter text-[13px] font-semibold text-black whitespace-nowrap">
									Search Results
								</span>
							</div>
							<div className="flex-1 min-w-0 flex items-center gap-1.5 px-2">
								<BulletListIcon className="flex-shrink-0" />
								<span className="font-inter text-[13px] text-black truncate">
									{queryPillLabel ?? ''}
								</span>
							</div>
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									onClearQuery();
									setViewMode('map');
								}}
								className="self-center mr-2 w-[26px] h-[24px] rounded-[6px] bg-[#ABABAB]/80 hover:bg-[#ABABAB] flex items-center justify-center text-black text-[14px] leading-none flex-shrink-0"
							>
								✕
							</button>
						</div>
						{/* Selection sub-row */}
						<div className="flex-shrink-0 flex items-center justify-between px-3 h-[26px] border-b border-[#ABABAB]">
							<span className="font-inter text-[11px] text-black">
								{selectedInListCount} selected
							</span>
							<button
								type="button"
								onClick={() => {
									if (areAllListSelected) {
										onDeselectAll();
									} else {
										onSelectAll();
									}
								}}
								className="font-secondary text-[11px] font-medium text-black hover:underline"
							>
								{areAllListSelected ? 'Deselect all' : 'Select all'}
							</button>
						</div>
						{/* Rows (native momentum scroll) */}
						<div
							className="flex-1 min-h-0 overflow-y-auto px-2 py-2"
							style={{ WebkitOverflowScrolling: 'touch' }}
						>
							{isLoading ? (
								<MapResultsPanelSkeleton variant="narrow" />
							) : listContacts.length === 0 ? (
								<div className="font-inter text-[13px] text-black text-center pt-6">
									No results for &quot;{queryPillLabel ?? searchValue}&quot;
								</div>
							) : (
								<div className="space-y-[7px]">
									{listContacts.map((contact) => (
										<MobileSearchResultRowCard
											key={contact.id}
											contact={contact}
											isSelected={selectedIdSet.has(contact.id)}
											onToggle={() => onToggleContact(contact)}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="flex-1 min-h-0" />
				)}

				{/* Bottom-center toggles */}
				<div className="flex flex-col items-center gap-2 pt-2 pb-2 px-3">
					{hasSearched && (
						<button
							type="button"
							onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
							className="pointer-events-auto h-[32px] px-4 rounded-full bg-[#EFEFEF] border border-transparent flex items-center gap-2 font-inter text-[15px] font-medium text-black"
						>
							<BulletListIcon />
							{viewMode === 'map' ? 'List' : 'Map'}
						</button>
					)}
				</div>

				{/* Bottom bar: search input + submit + Add */}
				<div
					className="pointer-events-auto flex items-center gap-2 px-3 pt-1"
					style={{
						paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
					}}
				>
					<div className="flex-1 flex h-[44px] rounded-full border-2 border-black overflow-hidden bg-white min-w-0">
						<div className="relative flex-1 min-w-0 h-full">
							<input
								ref={searchInputRef}
								type="text"
								value={searchValue}
								onChange={(e) => onSearchValueChange(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleSubmit();
									}
								}}
								aria-label="Search anything"
								className="w-full h-full bg-transparent border-0 outline-none px-4 font-inter font-medium text-[16px] text-black"
							/>
							{/* Two-tone placeholder: bold "Search", regular "Anything" */}
							{searchValue === '' && (
								<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-inter text-[16px] text-black">
									<span className="font-bold">Search</span>
									<span className="font-medium">&nbsp;Anything</span>
								</span>
							)}
						</div>
						<button
							type="button"
							aria-label="Search"
							onClick={handleSubmit}
							className="w-[54px] h-full flex items-center justify-center border-l-2 border-black flex-shrink-0"
							style={{ backgroundColor: '#A8C7FA' }}
						>
							<MapBottomSearchArrowIcon />
						</button>
					</div>
					{canAddSelected && (
						<button
							type="button"
							onClick={onAddSelected}
							disabled={isAddPending}
							className="h-[44px] px-6 rounded-full border-2 border-black font-inter font-semibold text-[16px] text-black flex items-center justify-center flex-shrink-0"
							style={{ backgroundColor: '#B8E4BE' }}
						>
							{isAddPending ? (
								<div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
							) : (
								'Add'
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
