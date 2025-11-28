'use client';

import { FC, MouseEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContactWithName } from '@/types/contact';
import { CampaignWithRelations } from '@/types';
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
import { useGetUsedContactIds, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { ContactsHeaderChrome } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftingTable/DraftingTable';
import {
	MiniSearchBar,
	parseSearchFromCampaign,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/ContactsSelection/ContactsSelection';
import { useDebounce } from '@/hooks/useDebounce';
import { urls } from '@/constants/urls';

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
	/**
	 * Optional explicit dimensions so the same component can be reused
	 * in compact "mini" layouts (e.g. pinned panel on the Writing tab)
	 * as well as the full-height drafting sidebar.
	 */
	width?: number | string;
	height?: number | string;
	/**
	 * Minimum number of rows to display (fills remaining space with empty placeholders).
	 * Defaults to 7.
	 */
	minRows?: number;
	/**
	 * Campaign used to prefill the mini search bar query (optional).
	 */
	campaign?: CampaignWithRelations;
	/**
	 * Whether to show the mini search bar under the header. Defaults to true.
	 */
	showSearchBar?: boolean;
	/**
	 * Optional callback for when the mini search bar triggers a search.
	 * When provided, this overrides the default dashboard navigation behavior.
	 */
	onSearchFromMiniBar?: (params: { why: string; what: string; where: string }) => void;
}

export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	onHeaderClick,
	onDraftSelected,
	isDraftDisabled,
	isPendingGeneration,
	onContactClick,
	onContactHover,
	selectedContactIds,
	onContactSelectionChange,
	width,
	height,
	minRows = 7,
	campaign,
	showSearchBar = true,
	onSearchFromMiniBar,
}) => {
	const router = useRouter();
	const [internalSelectedContactIds, setInternalSelectedContactIds] = useState<Set<number>>(
		new Set()
	);
	const lastClickedRef = useRef<number | null>(null);

	// Used contacts indicator data (IDs for current user)
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	const isControlled = Boolean(selectedContactIds);
	const currentSelectedIds = selectedContactIds ?? internalSelectedContactIds;

	const updateSelection = (updater: (prev: Set<number>) => Set<number>) => {
		if (isControlled && onContactSelectionChange) {
			onContactSelectionChange(updater);
		} else {
			setInternalSelectedContactIds((prev) => updater(new Set(prev)));
		}
	};

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

	const computedIsDraftDisabled =
		Boolean(isDraftDisabled) || currentSelectedIds.size === 0;
	const selectedCount = currentSelectedIds.size;

	// Mini search bar state – mirrors ContactsSelection logic so the UX matches
	const searchInfo = useMemo(() => parseSearchFromCampaign(campaign), [campaign]);
	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);
	const [whyValue, setWhyValue] = useState('[Booking]');
	const [whatValue, setWhatValue] = useState(searchInfo.what);
	const [whereValue, setWhereValue] = useState(searchInfo.where);

	// Location search for the "Where" dropdown
	const debouncedWhereValue = useDebounce(whereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state-first'
	);

	// Handle search button click
	const handleSearch = () => {
		// Always compute the current values first
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
		if (payload.why) {
			searchQuery += payload.why + ' ';
		}
		if (payload.what) {
			searchQuery += payload.what;
		}
		if (payload.where) {
			searchQuery += ' in ' + payload.where;
		}
		searchQuery = searchQuery.trim();

		if (searchQuery) {
			try {
				sessionStorage.setItem('murmur_pending_search', searchQuery);
			} catch {
				// Ignore sessionStorage errors (e.g., disabled storage)
			}
			router.push(urls.murmur.dashboard.index);
		}
	};

	// Allow callers to override dimensions; default to the original sidebar size
	const resolvedWidth = width ?? 376;
	const resolvedHeight = height ?? 424;

	return (
		<div
			className="relative max-[480px]:w-[96.27vw] rounded-md border border-black flex flex-col overflow-visible"
			style={{
				width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
				height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
				background: 'linear-gradient(to bottom, #ffffff 28px, #EB8586 28px)',
			}}
			role="region"
			aria-label="Expanded contacts preview"
		>
			{/* Header row (no explicit divider; let the background change from white to pink like the main table) */}
			<ContactsHeaderChrome />
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

			{showSearchBar && (
				<div className="px-2 pt-2">
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
				</div>
			)}

			{/* Selected count row, shared across all layouts */}
			<div className="px-3 mt-1 mb-0 flex items-center justify-center relative text-[14px] font-inter font-medium text-black/70">
				<span>{selectedCount} Selected</span>
				<button
					type="button"
					className="absolute right-3 bg-transparent border-none p-0 hover:text-black text-[14px] font-inter font-medium text-black/70 cursor-pointer"
					onClick={handleSelectAllToggle}
				>
					{areAllSelected ? 'Deselect All' : 'Select All'}
				</button>
			</div>

			<div className="relative flex-1 flex flex-col px-2 pb-2 pt-2 min-h-0">
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
				<div className="space-y-2 pb-2 flex flex-col items-center">
					{contacts.map((contact) => {
						const fullName =
							contact.name ||
							`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
						const isSelected = currentSelectedIds.has(contact.id);
						const isUsed = usedContactIdsSet.has(contact.id);
						return (
							<div
								key={contact.id}
								className={cn(
									'cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full max-w-[356px] max-[480px]:max-w-none h-[49px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none',
									isSelected && 'bg-[#EAAEAE]'
								)}
								onMouseDown={(e) => {
									if (e.shiftKey) e.preventDefault();
								}}
								onMouseEnter={() => {
									onContactHover?.(contact);
								}}
								onMouseLeave={() => {
									onContactHover?.(null);
								}}
								onClick={(e) => {
									handleContactClick(contact, e);
									onContactClick?.(contact);
								}}
							>
								{fullName ? (
									<>
										{/* Top Left - Name */}
										<div className="pl-3 pr-1 flex items-center h-[23px]">
											{isUsed && (
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
											{!fullName && isUsed && (
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
								) : (
									<>
										{/* Left column - Company vertically centered */}
										<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
											{isUsed && (
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
											<div className="row-span-2 pr-2 pl-1 flex items-center h-full">
												{contact.city || contact.state ? (
													<div className="flex items-center gap-1 w-full">
														{(() => {
															const fullStateName = (contact.state as string) || '';
															const stateAbbr = getStateAbbreviation(fullStateName) || '';
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
					{Array.from({ length: Math.max(0, minRows - contacts.length) }).map((_, idx) => (
						<div
							key={`placeholder-${idx}`}
							className="select-none w-full max-w-[356px] max-[480px]:max-w-none h-[49px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#EB8586]"
						/>
					))}
				</div>
			</CustomScrollbar>

			</div>
		</div>
	);
};

export default ContactsExpandedList;
