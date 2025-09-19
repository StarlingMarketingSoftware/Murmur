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
	const {
		contacts,
		selectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
	} = useContactsSelection(props);

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
			<div className="overflow-visible w-full flex flex-col gap-2 items-center">
				{contacts.map((contact) => (
					<div
						key={contact.id}
						className={cn(
							'cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-[366px] h-[49px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none row-hover-scroll',
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
			</div>
		</DraftingTable>
	);
};
