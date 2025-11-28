'use client';

import { FC, MouseEvent, useMemo, useRef, useState } from 'react';
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
}) => {
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

	// Allow callers to override dimensions; default to the original sidebar size
	const resolvedWidth = width ?? 376;
	const resolvedHeight = height ?? 424;

	return (
		<div
			className="max-[480px]:w-[96.27vw] rounded-md border-2 border-black/30 bg-[#EB8586] px-2 pb-2 flex flex-col"
			style={{
				width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
				height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
			}}
			role="region"
			aria-label="Expanded contacts preview"
		>
			{/* Header row */}
			<div
				className={cn(
					'flex items-center gap-2 h-[21px] px-1',
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
			>
				<span className="font-bold text-black text-sm">Contacts</span>
				<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full">
					<span>{`${String(contacts.length).padStart(2, '0')} ${
						contacts.length === 1 ? 'person' : 'people'
					}`}</span>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => {
							e.stopPropagation();
							handleSelectAllToggle();
						}}
					>
						{areAllSelected ? 'Deselect All' : 'Select All'}
					</button>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => e.stopPropagation()}
					>
						Draft
					</button>
				</div>
				<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
					<span className="w-[20px] text-center">1</span>
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
				</div>
			</div>

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

			{/* Footer bar */}
			<div className="flex justify-center w-full">
				<button
					type="button"
					onClick={() => {
						if (computedIsDraftDisabled) return;
						if (onDraftSelected) onDraftSelected(Array.from(currentSelectedIds));
					}}
					disabled={computedIsDraftDisabled}
					className={cn(
						'w-full max-w-[356px] max-[480px]:max-w-none h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium',
						computedIsDraftDisabled && 'opacity-50 cursor-not-allowed'
					)}
					aria-disabled={computedIsDraftDisabled}
				>
					{isPendingGeneration ? 'Drafting...' : 'Draft'}
				</button>
			</div>
		</div>
	);
};

export default ContactsExpandedList;
