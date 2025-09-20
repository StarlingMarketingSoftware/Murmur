'use client';

import { FC } from 'react';
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

export const ContactsSelection: FC<ContactsSelectionProps> = (props) => {
	const { isCompact, isEmbedded } = props;
	const {
		contacts,
		selectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
	} = useContactsSelection(props);

	const InnerList = (
		<div className="overflow-visible w-full flex flex-col gap-1 items-center">
			{contacts.map((contact) => (
				<div
					key={contact.id}
					className={cn(
						'cursor-pointer transition-colors grid grid-rows-2 overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none',
						isEmbedded ? 'w-[286px]' : 'w-[366px]',
						isCompact ? 'grid-cols-[1fr_auto]' : 'grid-cols-2',
						isCompact ? 'h-[40px]' : 'h-[49px]',
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
							if (isCompact) {
								const fullStateName = (contact.state as string) || '';
								const stateAbbr = getStateAbbreviation(fullStateName) || '';
								return (
									<>
										<div className="pl-2 pr-1 flex items-center">
											<div className="w-full truncate text-[10px] font-semibold leading-tight">
												{fullName}
											</div>
										</div>
										<div className="pr-2 pl-1 flex items-center justify-end">
											{contact.headline && (
												<div className="px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden max-w-[130px] h-[14px] rounded-full">
													<span className="text-black leading-none truncate text-[9px]">
														{contact.headline}
													</span>
												</div>
											)}
										</div>
										<div className="pl-2 pr-1 flex items-center">
											<div className="text-black w-full truncate text-[10px] leading-none">
												{contact.company || ''}
											</div>
										</div>
										<div className="pr-2 pl-1 flex items-center justify-end">
											<div className="flex items-center gap-1">
												{stateAbbr && (
													<span
														className="inline-flex items-center justify-center border leading-none font-bold w-auto px-1.5 h-[15px] rounded-full text-[10px]"
														style={{
															backgroundColor:
																stateBadgeColorMap[stateAbbr] || 'transparent',
															borderColor: '#000000',
														}}
													>
														{stateAbbr}
													</span>
												)}
												{contact.city && (
													<span className="text-black leading-none truncate text-[9px]">
														{contact.city}
													</span>
												)}
											</div>
										</div>
									</>
								);
							} else {
								return (
									<>
										{/* Top Left - Name */}
										<div className="pl-3 pr-1 flex items-center h-[28px]">
											<div className="font-bold text-base leading-tight w-full truncate">
												{fullName}
											</div>
										</div>

										{/* Top Right - Title */}
										<div className="pr-2 pl-1 flex items-center h-[28px]">
											{contact.headline ? (
												<div className="rounded-full px-2 flex items-center w-full bg-white border border-black overflow-hidden h-[20px]">
													<ScrollableText
														text={contact.headline}
														className="text-black leading-none text-xs"
														scrollPixelsPerSecond={60}
													/>
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>

										{/* Bottom Left - Company */}
										<div className="pl-3 pr-1 flex items-center h-[24px]">
											<div className="text-sm leading-tight text-black w-full truncate">
												{contact.company || ''}
											</div>
										</div>

										{/* Bottom Right - Location */}
										<div className="pr-2 pl-1 flex items-center h-[24px]">
											{contact.city || contact.state ? (
												<div className="flex items-center gap-1.5 w-full">
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
																className="inline-flex items-center justify-center w-auto px-2 h-[20px] rounded-full border overflow-hidden"
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
																className="inline-flex items-center justify-center w-auto px-2 h-[20px] rounded-full border text-sm leading-none font-bold"
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
																className="inline-flex items-center justify-center w-auto px-2 h-[20px] rounded-full border"
																style={{ borderColor: '#000000' }}
															/>
														);
													})()}
													{contact.city ? (
														<ScrollableText
															text={contact.city}
															className="text-black leading-none text-xs"
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
							}
						} else {
							// No name - vertically center company on left side
							return (
								<>
									{/* Left column - Company vertically centered */}
									<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
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
							);
						}
					})()}
				</div>
			))}

			{/* Filler rows to reach 7 total when there are fewer contacts */}
			{Array.from({ length: Math.max(0, 6 - contacts.length) }).map((_, idx) => (
				<div
					key={`filler-${idx}`}
					className={cn(
						'select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white',
						isEmbedded ? 'w-[286px]' : 'w-[366px]',
						isCompact ? 'h-[40px]' : 'h-[49px]'
					)}
				/>
			))}
		</div>
	);

	if (isEmbedded) {
		return InnerList;
	}

	return (
		<DraftingTable
			handleClick={handleClick}
			areAllSelected={areAllSelected}
			hasData={contacts.length > 0}
			noDataMessage="No contacts selected"
			noDataDescription="Select contacts to generate personalized emails"
			isPending={false}
			title="Contacts"
		>
			{InnerList}
		</DraftingTable>
	);
};
