'use client';

import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';

export interface InboxExpandedListProps {
	contacts: ContactWithName[];
	/** List of sender email addresses that should be visible (campaign contact emails) */
	allowedSenderEmails?: string[];
	/** Map of sender email -> contact for canonical name lookup */
	contactByEmail?: Record<string, ContactWithName>;
	onHeaderClick?: () => void;
	onOpenInbox?: () => void;
	/** Custom width in pixels */
	width?: number;
	/** Custom height in pixels */
	height?: number;
	/** Custom height for the white header section in pixels */
	whiteSectionHeight?: number;
}

const InboxHeaderChrome: FC<{
	offsetY?: number;
	hasData?: boolean;
	isAllTab?: boolean;
	whiteSectionHeight?: number;
}> = ({ offsetY = 0, hasData = true, isAllTab = false, whiteSectionHeight }) => {
	const isBottomView = whiteSectionHeight === 15;
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#000000' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#CCDFF4' : '#FFAEAE';
	const dotSize = isBottomView ? 5 : isAllTab ? 6 : 9;
	// First dot is 29px from the left
	const dot1Left = isBottomView ? 18 : 29;
	const originalDot2Left = isBottomView ? 110 : isAllTab ? 177.5 : 176;
	const dot3Left = isBottomView ? 146 : isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isBottomView ? 40 : isAllTab ? 50 : 72;
	// Center pill between first and second dots (this will be the new dot2 position)
	const midpointBetweenDots = (dot1Left + originalDot2Left) / 2;
	const newDot2Left = midpointBetweenDots - dotSize / 2;
	// Pill now goes where dot3 was - center the pill at the dot3 position
	const pillLeft = dot3Left - pillWidth / 2;
	// Third dot now goes where the pill was (at original dot2 position)
	const newDot3Left = originalDot2Left - dotSize / 2;
	const pillHeight = isBottomView ? 10 : isAllTab ? 15 : 22;
	const pillBorderRadius = isBottomView ? 5 : isAllTab ? 7.5 : 11;
	const pillFontSize = isBottomView ? '8px' : isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop =
		whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3 + offsetY;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot1Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${newDot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${newDot3Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${pillLeft}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: pillBgColor,
					border: `2px solid ${pillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{
						color: pillTextColor,
						fontSize: pillFontSize,
						textAlign: 'center',
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						marginTop: isAllTab ? '-1px' : 0, // Optical alignment adjustment
					}}
				>
					Inbox
				</span>
			</div>
		</>
	);
};

/**
 * Resolve the best contact object for a given inbound email
 */
const resolveContactForEmail = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): ContactWithName | null => {
	const senderKey = email.sender?.toLowerCase().trim();
	if (senderKey && contactByEmail && contactByEmail[senderKey]) {
		return contactByEmail[senderKey];
	}
	return email.contact as ContactWithName | null;
};

/**
 * Get canonical contact name for display
 */
const getCanonicalContactName = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): string => {
	const contact = resolveContactForEmail(email, contactByEmail);

	if (contact) {
		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const legacyName = (contact as any).name;

		const primary =
			fullName ||
			(legacyName && typeof legacyName === 'string' && legacyName.trim()) ||
			contact.company ||
			contact.email;

		if (primary && typeof primary === 'string' && primary.trim().length > 0) {
			return primary.trim();
		}
	}

	// Fallback: raw sender info from the inbound email headers
	const senderLabel = email.senderName?.trim() || email.sender?.trim();
	return senderLabel || 'Unknown sender';
};

export const InboxExpandedList: FC<InboxExpandedListProps> = ({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	contacts,
	allowedSenderEmails,
	contactByEmail,
	onHeaderClick,
	onOpenInbox,
	width = 376,
	height = 426,
	whiteSectionHeight: customWhiteSectionHeight,
}) => {
	// Fetch ALL inbound emails (same as InboxSection)
	const { data: allInboundEmails } = useGetInboundEmails();

	// Special hack for "All" tab: if height is exactly 347px, we apply a thicker 3px border
	// to match the other elements in that layout. Otherwise standard 2px border.
	const isAllTab = height === 347;
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15;

	// Filter to only show emails from campaign contacts
	const inboundEmails = useMemo(() => {
		if (!allInboundEmails) return [];
		if (!allowedSenderEmails || allowedSenderEmails.length === 0) {
			return allInboundEmails;
		}

		const allowedSet = new Set(allowedSenderEmails.map((e) => e.toLowerCase().trim()));

		return allInboundEmails.filter((email) => {
			const sender = email.sender?.toLowerCase().trim();
			return sender && allowedSet.has(sender);
		});
	}, [allInboundEmails, allowedSenderEmails]);

	const isFullyEmpty = inboundEmails.length === 0;
	const placeholderBgColor = isFullyEmpty ? '#3D9DC0' : '#5EB6D6';

	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-md flex flex-col overflow-visible',
				isBottomView
					? 'border-2 border-black'
					: isAllTab
					? 'border-[3px] border-black'
					: 'border-2 border-black/30'
			)}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				background: `linear-gradient(to bottom, #ffffff ${whiteSectionHeight}px, #5EB6D6 ${whiteSectionHeight}px)`,
			}}
			role="region"
			aria-label="Expanded inbox preview"
		>
			{/* Header row (no explicit divider; let the background change from white to blue like the main table) */}
			<InboxHeaderChrome isAllTab={isAllTab} whiteSectionHeight={customWhiteSectionHeight} />
			<div
				className={cn(
					'flex items-center gap-2 px-3 shrink-0',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				style={{ height: `${whiteSectionHeight}px` }}
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

			{(isAllTab || isBottomView) && (
				<div
					className="absolute z-20 flex items-center gap-[12px] cursor-pointer"
					style={{ top: isBottomView ? 1 : 1, right: isBottomView ? 4 : 4 }}
					onClick={onOpenInbox}
					role={onOpenInbox ? 'button' : undefined}
					tabIndex={onOpenInbox ? 0 : undefined}
					onKeyDown={(e) => {
						if (!onOpenInbox) return;
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpenInbox();
						}
					}}
				>
					<span className={cn(
						"font-medium leading-none text-[#B3B3B3] font-inter",
						isBottomView ? "text-[8px]" : "text-[10px]"
					)}>
						Open
					</span>
					<div className="flex items-center" style={{ marginTop: isBottomView ? 0 : '1px' }}>
						<OpenIcon width={isBottomView ? 10 : undefined} height={isBottomView ? 10 : undefined} />
					</div>
				</div>
			)}

			<div
				className={cn(
					'relative flex-1 flex flex-col min-h-0',
					isBottomView ? 'px-[2px] pt-0 pb-0' : 'px-2 pt-2 pb-2'
				)}
			>
				{/* Scrollable list */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor={isBottomView ? 'transparent' : '#000000'}
					trackColor="transparent"
					offsetRight={isBottomView ? -7 : -14}
					contentClassName="overflow-x-hidden"
					alwaysShow={!isBottomView && !isFullyEmpty}
				>
					<div
						className={cn(
							'flex flex-col items-center',
							isBottomView ? 'space-y-[5px] pb-0' : 'space-y-2 pb-2'
						)}
						style={{
							paddingTop:
								customWhiteSectionHeight !== undefined
									? '2px'
									: isAllTab
									? `${31 - whiteSectionHeight}px`
									: `${38 - whiteSectionHeight}px`,
						}}
					>
						{inboundEmails.map((email) => {
							const contact = resolveContactForEmail(email, contactByEmail);
							const contactName = getCanonicalContactName(email, contactByEmail);

							return (
								<div
									key={email.id}
									className={cn(
										'transition-colors relative select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white',
										isBottomView
											? 'w-[224px] h-[28px]'
											: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]',
										!isBottomView && 'p-2'
									)}
								>
									{/* Fixed top-right info (Title + Location) */}
									<div className={cn(
										"absolute flex flex-col items-end pointer-events-none",
										isBottomView
											? "top-[4px] right-[4px] gap-[1px] w-[90px]"
											: "top-[6px] right-[6px] gap-[2px] w-[110px]"
									)}>
										{/* Title row - on top */}
										{contact?.headline ? (
											<div
												className={cn(
													"border border-black overflow-hidden flex items-center gap-0.5",
													isBottomView
														? "h-[10px] rounded-[3px] px-1 w-full"
														: "w-[110px] h-[10px] rounded-[3.71px] justify-center"
												)}
												style={{
													backgroundColor: isRestaurantTitle(contact.headline)
														? '#C3FBD1'
														: isCoffeeShopTitle(contact.headline)
															? '#D6F1BD'
															: isMusicVenueTitle(contact.headline)
																? '#B7E5FF'
																: isMusicFestivalTitle(contact.headline)
																	? '#C1D6FF'
																	: (isWeddingPlannerTitle(contact.headline) || isWeddingVenueTitle(contact.headline))
																		? '#FFF2BC'
																		: '#E8EFFF',
												}}
											>
												{isRestaurantTitle(contact.headline) && (
													<RestaurantsIcon size={isBottomView ? 7 : 8} />
												)}
												{isCoffeeShopTitle(contact.headline) && (
													<CoffeeShopsIcon size={5} />
												)}
												{isMusicVenueTitle(contact.headline) && (
													<MusicVenuesIcon size={isBottomView ? 7 : 8} className="flex-shrink-0" />
												)}
												{isMusicFestivalTitle(contact.headline) && (
													<FestivalsIcon size={isBottomView ? 7 : 8} className="flex-shrink-0" />
												)}
												{(isWeddingPlannerTitle(contact.headline) || isWeddingVenueTitle(contact.headline)) && (
													<WeddingPlannersIcon size={isBottomView ? 7 : 8} />
												)}
												{isBottomView ? (
													<span className="text-[7px] text-black leading-none truncate">
														{isRestaurantTitle(contact.headline)
															? 'Restaurant'
															: isCoffeeShopTitle(contact.headline)
																? 'Coffee Shop'
																: isMusicVenueTitle(contact.headline)
																	? 'Music Venue'
																	: isMusicFestivalTitle(contact.headline)
																		? 'Music Festival'
																		: isWeddingPlannerTitle(contact.headline)
																			? 'Wedding Planner'
																			: isWeddingVenueTitle(contact.headline)
																				? 'Wedding Venue'
																				: contact.headline}
													</span>
												) : (
													<ScrollableText
														text={
															isRestaurantTitle(contact.headline)
																? 'Restaurant'
																: isCoffeeShopTitle(contact.headline)
																	? 'Coffee Shop'
																	: isMusicVenueTitle(contact.headline)
																		? 'Music Venue'
																		: isMusicFestivalTitle(contact.headline)
																			? 'Music Festival'
																			: isWeddingPlannerTitle(contact.headline)
																				? 'Wedding Planner'
																				: isWeddingVenueTitle(contact.headline)
																					? 'Wedding Venue'
																					: contact.headline
														}
														className="text-[8px] text-black leading-none px-1"
													/>
												)}
											</div>
										) : null}

										{/* Location row - below title */}
										<div className={cn(
											"flex items-center justify-start",
											isBottomView ? "gap-0.5 h-[10px] w-[90px]" : "gap-1 h-[11.67px] w-full"
										)}>
											{(() => {
												const fullStateName = (contact?.state as string) || '';
												const stateAbbr = getStateAbbreviation(fullStateName) || '';
												const normalizedState = fullStateName.trim();
												const lowercaseCanadianProvinceNames = canadianProvinceNames.map(
													(s) => s.toLowerCase()
												);
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
														className={cn(
															"inline-flex items-center justify-center border overflow-hidden",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px]"
														)}
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
														className={cn(
															"inline-flex items-center justify-center border leading-none font-bold",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px] text-[7px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px] text-[8px]"
														)}
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
														className={cn(
															"inline-flex items-center justify-center border",
															isBottomView
																? "w-[20px] h-[10px] rounded-[2px]"
																: "w-[17.81px] h-[11.67px] rounded-[3.44px]"
														)}
														style={{ borderColor: '#000000' }}
													/>
												);
											})()}
											{contact?.city ? (
												isBottomView ? (
													<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
														{contact.city}
													</span>
												) : (
													<ScrollableText
														text={contact.city}
														className="text-[10px] text-black leading-none max-w-[80px]"
													/>
												)
											) : null}
										</div>
									</div>

									{/* Content grid */}
									{isBottomView ? (
										/* Bottom view: compact layout with name + company (no subject/body) */
										<div className="grid grid-cols-1 grid-rows-2 h-full pr-[95px] pl-[22px]">
											{/* Row 1: Name */}
											<div className="flex items-center h-[12px] overflow-hidden">
												<div
													className="font-bold text-[9px] leading-none whitespace-nowrap overflow-hidden w-full pr-1"
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{contactName}
												</div>
											</div>
											{/* Row 2: Company */}
											<div className="flex items-center h-[12px] overflow-hidden">
												{(() => {
													const hasSeparateName = Boolean(
														contact &&
															((contact.firstName && contact.firstName.trim()) ||
																(contact.lastName && contact.lastName.trim()))
													);
													return (
														<div
															className="text-[8px] text-black leading-none whitespace-nowrap overflow-hidden w-full pr-1"
															style={{
																WebkitMaskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
																maskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
															}}
														>
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													);
												})()}
											</div>
										</div>
									) : (
										/* Normal view: 4-row layout */
										<div className="grid grid-cols-1 grid-rows-4 h-full pr-[120px] pl-[22px]">
											{/* Row 1: Name */}
											<div className="row-start-1 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]">
												<div className="font-bold text-[11px] truncate leading-none">
													{contactName}
												</div>
											</div>

											{/* Row 2: Company (only when there is a separate name) */}
											{(() => {
												const hasSeparateName = Boolean(
													contact &&
														((contact.firstName && contact.firstName.trim()) ||
															(contact.lastName && contact.lastName.trim()))
												);
												return (
													<div className="row-start-2 col-start-1 flex items-center pr-2 h-[16px] max-[480px]:h-[12px]">
														<div className="text-[11px] text-black truncate leading-none">
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													</div>
												);
											})()}

											{/* Row 3: Subject */}
											<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px] max-[480px]:items-start max-[480px]:-mt-[2px]">
												{email.subject || 'No subject'}
											</div>

											{/* Row 4: Message preview */}
											<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px]">
												{email.bodyPlain
													? email.bodyPlain.substring(0, 60) + '...'
													: email.bodyHtml
													? email.bodyHtml.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
													: 'No content'}
											</div>
										</div>
									)}
								</div>
							);
						})}
						{Array.from({
							length: Math.max(0, (isBottomView ? 3 : 4) - inboundEmails.length),
						}).map((_, idx) => (
							<div
								key={`inbox-placeholder-${idx}`}
								className={cn(
									'select-none overflow-hidden rounded-[8px] border-2 border-[#000000]',
									isBottomView
										? 'w-[224px] h-[28px]'
										: 'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]',
									!isBottomView && 'p-2'
								)}
								style={{ backgroundColor: placeholderBgColor }}
							/>
						))}
					</div>
				</CustomScrollbar>
			</div>
		</div>
	);
};
