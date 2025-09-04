'use client';

import { FC } from 'react';
import { ContactsSelectionProps, useContactsSelection } from './useContactsSelection';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { DraftingTable } from '../DraftingTable/DraftingTable';
// State badge colors matching dashboard page
const stateBadgeColorMap: Record<string, string> = {
	AL: '#F3D7D7',
	AK: '#D7D7F3',
	AZ: '#E7F307',
	AR: '#F3D7F0',
	CA: '#D7F3EE',
	CO: '#F3E6D7',
	CT: '#DEB7F3',
	DE: '#DBF3D7',
	FL: '#F3D7E0',
	GA: '#D7F3F3',
	HI: '#F1B7F3',
	ID: '#EDF7F3',
	IL: '#D7F3E5',
	IN: '#F3DDD7',
	IA: '#D7D9F3',
	KS: '#E2F3D7',
	KY: '#F3DFA2',
	LA: '#D7F3F3',
	ME: '#F3ECD7',
	MD: '#EDF7F3',
	MA: '#D7F3DC',
	MI: '#F3D7D8',
	MN: '#D7F3E3',
	MS: '#EBF307',
	MO: '#F3D7F3',
	MT: '#D7F3EB',
	NE: '#F3EBD7',
	NV: '#DAD7F3',
	NH: '#DCF3D7',
	NJ: '#DCF3D7',
	NM: '#DCF3C7',
	NY: '#F3F2D7',
	NC: '#EAD7F3',
	ND: '#D7F3E1',
	OH: '#F3D9D7',
	OK: '#D0F3D7',
	OR: '#E5F3D7',
	PA: '#F3D7ED',
	RI: '#D7F3F1',
	SC: '#F3E8D7',
	SD: '#E0F7F3',
	TN: '#D7F3B8',
	TX: '#F3D7DE',
	UT: '#D7E6F3',
	VT: '#EFF3D7',
	VA: '#EDF7F3',
	WA: '#D7F3E7',
	WV: '#F3DFD7',
	WI: '#D7F3F3',
	WY: '#DFF307',
};
const canadianProvinceNames = new Set(
	[
		'Alberta',
		'British Columbia',
		'Manitoba',
		'New Brunswick',
		'Newfoundland and Labrador',
		'Nova Scotia',
		'Ontario',
		'Prince Edward Island',
		'Quebec',
		'Saskatchewan',
	].map((s) => s.toLowerCase())
);
const canadianProvinceAbbreviations = new Set([
	'AB',
	'BC',
	'MB',
	'NB',
	'NL',
	'NS',
	'ON',
	'PE',
	'QC',
	'SK',
]);

export const ContactsSelection: FC<ContactsSelectionProps> = (props) => {
	const {
		contacts,
		selectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
		generationProgress,
		generationTotal,
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
			generationProgress={generationProgress}
			totalContacts={generationTotal ?? (selectedContactIds.size || contacts.length)}
			onCancel={props.cancelGeneration}
		>
			<div className="overflow-visible w-full">
				{contacts.map((contact) => (
					<div
						key={contact.id}
						className={cn(
							'border-b-2 border-[#ABABAB] cursor-pointer transition-colors grid grid-cols-2 grid-rows-[auto_auto] w-full overflow-visible py-1 select-none row-hover-scroll',
							selectedContactIds.has(contact.id)
								? 'bg-[#D6E8D9] border-2 border-[#ABABAB]'
								: ''
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
										<div className="p-1 pl-3 flex items-start">
											<div className="font-bold text-xs w-full whitespace-normal break-words leading-4">
												{fullName}
											</div>
										</div>

										{/* Top Right - Title */}
										<div className="p-1 flex items-center overflow-visible">
											{contact.headline ? (
												<div className="h-5 rounded-[6px] px-2 flex items-center w-full max-w-[150px] bg-[#E8EFFF] border-1 border-black overflow-hidden">
													<ScrollableText
														text={contact.headline}
														className="text-xs text-black"
														scrollPixelsPerSecond={60}
													/>
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>

										{/* Bottom Left - Company */}
										<div className="p-1 pl-3 flex items-start">
											<div className="text-xs text-black w-full whitespace-normal break-words leading-4">
												{contact.company || ''}
											</div>
										</div>

										{/* Bottom Right - Location */}
										<div className="p-1 flex items-center">
											{contact.city || contact.state ? (
												<div className="flex items-center gap-2 w-full">
													{(() => {
														const fullStateName = (contact.state as string) || '';
														const stateAbbr = getStateAbbreviation(fullStateName) || '';
														const normalizedState = fullStateName.trim();
														const isCanadianProvince =
															canadianProvinceNames.has(normalizedState.toLowerCase()) ||
															canadianProvinceAbbreviations.has(
																normalizedState.toUpperCase()
															) ||
															canadianProvinceAbbreviations.has(stateAbbr.toUpperCase());
														const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

														if (!stateAbbr) return null;
														return isCanadianProvince ? (
															<div
																className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																style={{ borderColor: 'rgba(0,0,0,0.7)' }}
																title="Canadian province"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	viewBox="0 0 9600 4800"
																	className="w-full h-full"
																	preserveAspectRatio="xMidYMid slice"
																>
																	<title>Flag of Canada</title>
																	<path
																		fill="#f00"
																		d="m0 0h2400l99 99h4602l99-99h2400v4800h-2400l-99-99h-4602l-99 99H0z"
																	/>
																	<path
																		fill="#fff"
																		d="m2400 0h4800v4800h-4800zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
																	/>
																</svg>
															</div>
														) : isUSAbbr ? (
															<span
																className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																style={{
																	backgroundColor:
																		stateBadgeColorMap[stateAbbr] || 'transparent',
																	borderColor: 'rgba(0,0,0,0.7)',
																}}
															>
																{stateAbbr}
															</span>
														) : (
															<span
																className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																style={{ borderColor: 'rgba(0,0,0,0.7)' }}
															/>
														);
													})()}
													{contact.city ? (
														<ScrollableText
															text={contact.city}
															className="text-xs text-black w-full"
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
										<div className="row-span-2 p-1 pl-3 flex items-start">
											<div className="font-bold text-xs text-black w-full whitespace-normal break-words leading-4">
												{contact.company || 'Contact'}
											</div>
										</div>

										{/* Right column - Title or Location */}
										{contact.headline ? (
											<>
												{/* Top Right - Title */}
												<div className="p-1 flex items-center overflow-visible">
													<div className="h-[20.54px] rounded-[6.64px] px-2 flex items-center w-full max-w-[150px] bg-[#E8EFFF] border-[0.83px] border-black overflow-hidden">
														<ScrollableText
															text={contact.headline}
															className="text-xs text-black"
														/>
													</div>
												</div>

												{/* Bottom Right - Location */}
												<div className="p-1 flex items-center">
													{contact.city || contact.state ? (
														<div className="flex items-center gap-2 w-full">
															{(() => {
																const fullStateName = (contact.state as string) || '';
																const stateAbbr =
																	getStateAbbreviation(fullStateName) || '';
																const normalizedState = fullStateName.trim();
																const isCanadianProvince =
																	canadianProvinceNames.has(
																		normalizedState.toLowerCase()
																	) ||
																	canadianProvinceAbbreviations.has(
																		normalizedState.toUpperCase()
																	) ||
																	canadianProvinceAbbreviations.has(
																		stateAbbr.toUpperCase()
																	);
																const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

																if (!stateAbbr) return null;
																return isCanadianProvince ? (
																	<div
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																		style={{ borderColor: 'rgba(0,0,0,0.7)' }}
																		title="Canadian province"
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 9600 4800"
																			className="w-full h-full"
																			preserveAspectRatio="xMidYMid slice"
																		>
																			<title>Flag of Canada</title>
																			<path
																				fill="#f00"
																				d="m0 0h2400l99 99h4602l99-99h2400v4800h-2400l-99-99h-4602l-99 99H0z"
																			/>
																			<path
																				fill="#fff"
																				d="m2400 0h4800v4800h-4800zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
																			/>
																		</svg>
																	</div>
																) : isUSAbbr ? (
																	<span
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																		style={{
																			backgroundColor:
																				stateBadgeColorMap[stateAbbr] || 'transparent',
																			borderColor: 'rgba(0,0,0,0.7)',
																		}}
																	>
																		{stateAbbr}
																	</span>
																) : (
																	<span
																		className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																		style={{ borderColor: 'rgba(0,0,0,0.7)' }}
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
											<div className="row-span-2 p-1 flex items-center">
												{contact.city || contact.state ? (
													<div className="flex items-center gap-2 w-full">
														{(() => {
															const fullStateName = (contact.state as string) || '';
															const stateAbbr = getStateAbbreviation(fullStateName) || '';
															const normalizedState = fullStateName.trim();
															const isCanadianProvince =
																canadianProvinceNames.has(
																	normalizedState.toLowerCase()
																) ||
																canadianProvinceAbbreviations.has(
																	normalizedState.toUpperCase()
																) ||
																canadianProvinceAbbreviations.has(
																	stateAbbr.toUpperCase()
																);
															const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

															if (!stateAbbr) return null;
															return isCanadianProvince ? (
																<div
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
																	style={{ borderColor: 'rgba(0,0,0,0.7)' }}
																	title="Canadian province"
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 9600 4800"
																		className="w-full h-full"
																		preserveAspectRatio="xMidYMid slice"
																	>
																		<title>Flag of Canada</title>
																		<path
																			fill="#f00"
																			d="m0 0h2400l99 99h4602l99-99h2400v4800h-2400l-99-99h-4602l-99 99H0z"
																		/>
																		<path
																			fill="#fff"
																			d="m2400 0h4800v4800h-4800zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
																		/>
																	</svg>
																</div>
															) : isUSAbbr ? (
																<span
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
																	style={{
																		backgroundColor:
																			stateBadgeColorMap[stateAbbr] || 'transparent',
																		borderColor: 'rgba(0,0,0,0.7)',
																	}}
																>
																	{stateAbbr}
																</span>
															) : (
																<span
																	className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
																	style={{ borderColor: 'rgba(0,0,0,0.7)' }}
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
