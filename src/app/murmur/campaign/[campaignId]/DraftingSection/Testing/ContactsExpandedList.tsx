'use client';

import { FC } from 'react';
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

export interface ContactsExpandedListProps {
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
}

export const ContactsExpandedList: FC<ContactsExpandedListProps> = ({
	contacts,
	onHeaderClick,
}) => {
	return (
		<div
			className="w-[376px] h-[424px] rounded-md border-2 border-black/30 bg-[#F5DADA] px-2 pb-2 flex flex-col"
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
						onClick={(e) => e.stopPropagation()}
					>
						Select All
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
				offsetRight={-5}
				contentClassName="overflow-x-hidden"
				alwaysShow
			>
				<div className="space-y-2 py-2 flex flex-col items-center">
					{contacts.map((contact) => {
						const fullName =
							contact.name ||
							`${contact.firstName || ''} ${contact.lastName || ''}`.trim();
						return (
							<div
								key={contact.id}
								className={cn(
									'cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full max-w-[356px] h-[49px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white select-none'
								)}
								onMouseDown={(e) => {
									if (e.shiftKey) e.preventDefault();
								}}
							>
								{fullName ? (
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
								) : (
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
					{Array.from({ length: Math.max(0, 7 - contacts.length) }).map((_, idx) => (
						<div
							key={`placeholder-${idx}`}
							className="select-none w-full max-w-[356px] h-[49px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white"
						/>
					))}
				</div>
			</CustomScrollbar>

			{/* Footer bar */}
			<div className="mt-2 w-full max-w-[356px] h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium">
				Draft
			</div>
		</div>
	);
};

export default ContactsExpandedList;
