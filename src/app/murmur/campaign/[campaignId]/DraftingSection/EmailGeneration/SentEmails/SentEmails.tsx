import { FC, useMemo } from 'react';
import { EmailWithRelations } from '@/types/campaign';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { ContactWithName } from '@/types/contact';
import { useIsMobile } from '@/hooks/useIsMobile';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

interface SentEmailsProps {
	emails: EmailWithRelations[];
	isPendingEmails: boolean;
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	onEmailHover?: (email: EmailWithRelations | null) => void;
	goToContacts?: () => void;
	goToDrafts?: () => void;
	goToWriting?: () => void;
	goToSearch?: () => void;
	goToInbox?: () => void;
	/**
	 * Optional: marks this sent table as the "main box" for cross-tab morph animations.
	 * When provided, this value is forwarded to the underlying DraftingTable `mainBoxId`.
	 */
	mainBoxId?: string;
}

export const SentEmails: FC<SentEmailsProps> = ({
	emails,
	isPendingEmails,
	onContactClick,
	onContactHover,
	onEmailHover,
	goToContacts,
	goToDrafts,
	goToWriting,
	goToSearch,
	goToInbox,
	mainBoxId,
}) => {
	const isMobile = useIsMobile();
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	// Mobile-specific width values (using CSS calc for responsive sizing)
	// 4px margins on each side for edge-to-edge feel
	const mobileEmailRowWidth = 'calc(100vw - 24px)'; // Full width minus padding

	return (
		<DraftingTable
			handleClick={() => {}}
			areAllSelected={false}
			hasData={emails.length > 0}
			noDataMessage="No sent emails"
			noDataDescription="Emails you send will appear here"
			isPending={isPendingEmails}
			title="Sent"
			mainBoxId={mainBoxId}
			goToContacts={goToContacts}
			goToDrafts={goToDrafts}
			goToWriting={goToWriting}
			goToSearch={goToSearch}
			goToInbox={goToInbox}
			isMobile={isMobile}
		>
			<div
				className="overflow-visible w-full flex flex-col gap-2 items-center"
				onMouseLeave={() => {
					onContactHover?.(null);
					onEmailHover?.(null);
				}}
			>
				{emails.map((email) => {
					const contact = email.contact;
					const contactName = contact
						? (contact as any).name ||
						  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
						  contact.company ||
						  'Contact'
						: 'Unknown Contact';

					const contactForResearch: ContactWithName | null = contact
						? ({
								...(contact as any),
								name: (contact as any).name ?? null,
						  } as ContactWithName)
						: null;

					// Check if we have a separate name to decide layout
					const hasSeparateName = Boolean(
						((contact as any)?.name && (contact as any).name.trim()) ||
							(contact?.firstName && contact.firstName.trim()) ||
							(contact?.lastName && contact.lastName.trim())
					);
					const contactTitle = (contact as any)?.title || (contact as any)?.headline || '';

					return (
						<div
							key={email.id}
							className={cn(
								'cursor-pointer transition-colors relative select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
								isMobile ? 'h-[100px]' : 'w-[489px] h-[97px]'
							)}
							style={isMobile ? { width: mobileEmailRowWidth } : undefined}
							onMouseEnter={() => {
								onEmailHover?.(email);
								if (contactForResearch) {
									onContactHover?.(contactForResearch);
								}
							}}
							onClick={() => {
								if (contactForResearch) {
									onContactClick?.(contactForResearch);
								}
							}}
						>
							{/* Used-contact indicator - vertically centered (hidden on mobile for space) */}
							{usedContactIdsSet.has(email.contactId) && !isMobile && (
								<span
									className="absolute left-[8px]"
									title="Used in a previous campaign"
									style={{
										top: hasSeparateName ? '50%' : '30px',
										transform: 'translateY(-50%)',
										width: '16px',
										height: '16px',
										borderRadius: '50%',
										border: '1px solid #000000',
										backgroundColor: '#DAE6FE',
									}}
								/>
							)}

							{/* Fixed top-right info (Title + Location) - matching drafts table design */}
							<div className={cn(
								"absolute flex flex-col items-start gap-[2px] pointer-events-none",
								isMobile ? "top-[4px] right-[4px]" : "top-[6px] right-[4px]"
							)}>
								{contactTitle ? (
									<div
										className={cn(
											"rounded-[6px] px-2 flex items-center gap-1 border border-black overflow-hidden",
											isMobile ? "h-[17px] max-w-[140px]" : "h-[21px] w-[240px]"
										)}
										style={{
											backgroundColor: isRestaurantTitle(contactTitle)
												? '#C3FBD1'
												: isCoffeeShopTitle(contactTitle)
													? '#D6F1BD'
													: isMusicVenueTitle(contactTitle)
														? '#B7E5FF'
														: isMusicFestivalTitle(contactTitle)
															? '#C1D6FF'
															: (isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle))
																? '#FFF2BC'
																: isWineBeerSpiritsTitle(contactTitle)
																	? '#BFC4FF'
																	: '#E8EFFF',
										}}
									>
										{isRestaurantTitle(contactTitle) && (
											<RestaurantsIcon size={isMobile ? 10 : 14} />
										)}
										{isCoffeeShopTitle(contactTitle) && (
											<CoffeeShopsIcon size={8} />
										)}
										{isMusicVenueTitle(contactTitle) && (
											<MusicVenuesIcon size={isMobile ? 10 : 14} className="flex-shrink-0" />
										)}
										{isMusicFestivalTitle(contactTitle) && (
											<FestivalsIcon size={isMobile ? 10 : 14} className="flex-shrink-0" />
										)}
										{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
											<WeddingPlannersIcon size={14} />
										)}
										{isWineBeerSpiritsTitle(contactTitle) && (
											<WineBeerSpiritsIcon size={isMobile ? 10 : 14} className="flex-shrink-0" />
										)}
										<ScrollableText
											text={
												isRestaurantTitle(contactTitle)
													? 'Restaurant'
													: isCoffeeShopTitle(contactTitle)
														? 'Coffee Shop'
														: isMusicVenueTitle(contactTitle)
															? 'Music Venue'
															: isMusicFestivalTitle(contactTitle)
																? 'Music Festival'
																: isWeddingPlannerTitle(contactTitle)
																	? 'Wedding Planner'
																	: isWeddingVenueTitle(contactTitle)
																		? 'Wedding Venue'
																		: isWineBeerSpiritsTitle(contactTitle)
																			? getWineBeerSpiritsLabel(contactTitle) ?? contactTitle
																			: contactTitle
											}
											className={cn(
												"text-black leading-none",
												isMobile ? "text-[9px]" : "text-[10px]"
											)}
											scrollPixelsPerSecond={60}
										/>
									</div>
								) : null}

								<div className={cn(
									"flex items-center justify-start gap-1",
									isMobile ? "h-[16px]" : "h-[20px]"
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
												className="inline-flex items-center justify-center rounded-[6px] border overflow-hidden flex-shrink-0"
												style={{
													width: isMobile ? '28px' : '39px',
													height: isMobile ? '16px' : '20px',
													borderColor: '#000000',
												}}
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
													"inline-flex items-center justify-center rounded-[6px] border leading-none font-bold flex-shrink-0",
													isMobile ? "text-[10px]" : "text-[12px]"
												)}
												style={{
													width: isMobile ? '28px' : '39px',
													height: isMobile ? '16px' : '20px',
													backgroundColor:
														stateBadgeColorMap[stateAbbr] || 'transparent',
													borderColor: '#000000',
												}}
											>
												{stateAbbr}
											</span>
										) : (
											<span
												className="inline-flex items-center justify-center rounded-[6px] border flex-shrink-0"
												style={{
													width: isMobile ? '28px' : '39px',
													height: isMobile ? '16px' : '20px',
													borderColor: '#000000',
												}}
											/>
										);
									})()}
									{contact?.city && !isMobile ? (
										<ScrollableText
											text={contact.city}
											className="text-[12px] font-inter font-normal text-black leading-none"
										/>
									) : null}
								</div>
							</div>

							{/* Content flex column */}
							<div className={cn(
								"flex flex-col justify-center h-full gap-[2px]",
								isMobile ? "pl-[8px] pr-[8px]" : "pl-[30px] pr-[30px]"
							)}>
								{/* Row 1 & 2: Name / Company */}
								{(() => {
									const topRowMargin = isMobile
										? (contactTitle ? 'mr-[100px]' : 'mr-[40px]')
										: (contactTitle ? 'mr-[220px]' : 'mr-[120px]');
									if (hasSeparateName) {
										return (
											<>
												{/* Name */}
												<div
													className={cn(
														'flex items-center',
														isMobile ? 'min-h-[18px]' : 'min-h-[20px]',
														topRowMargin
													)}
												>
													<div className={cn(
														"font-inter font-semibold truncate leading-none",
														isMobile ? "text-[14px]" : "text-[15px]"
													)}>
														{contactName}
													</div>
												</div>
												{/* Company */}
												<div
													className={cn(
														'flex items-center',
														isMobile ? 'min-h-[16px]' : 'min-h-[20px]',
														topRowMargin
													)}
												>
													<div className={cn(
														"font-inter font-medium text-black leading-tight",
														isMobile ? "text-[12px] truncate" : "text-[15px] line-clamp-2"
													)}>
														{contact?.company || ''}
													</div>
												</div>
											</>
										);
									}

									// No separate name - Company (in contactName) spans 2 rows height
									return (
										<div
											className={cn(
												'flex items-center',
												isMobile ? 'min-h-[34px] pb-[4px]' : 'min-h-[42px] pb-[6px]',
												topRowMargin
											)}
										>
											<div className={cn(
												"font-inter font-medium text-black leading-tight",
												isMobile ? "text-[14px] truncate" : "text-[15px] line-clamp-2"
											)}>
												{contactName}
											</div>
										</div>
									);
								})()}

								{/* Row 3: Subject */}
								<div className={cn(
									"flex items-center",
									isMobile ? "min-h-[12px]" : "min-h-[14px]"
								)}>
									<div
										className={cn(
											"font-inter font-semibold text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2",
											isMobile ? "text-[13px]" : "text-[14px]"
										)}
										style={{
											WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										}}
									>
										{email.subject || 'No subject'}
									</div>
								</div>

								{/* Row 4: Message preview */}
								<div className={cn(
									"flex items-center",
									isMobile ? "min-h-[12px]" : "min-h-[14px]"
								)}>
									<div
										className={cn(
											"text-gray-500 leading-none whitespace-nowrap overflow-hidden w-full pr-2",
											isMobile ? "text-[9px]" : "text-[10px]"
										)}
										style={{
											WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										}}
									>
										{email.message ? email.message.replace(/<[^>]*>/g, '') : 'No content'}
									</div>
								</div>
							</div>
						</div>
					);
				})}
				{Array.from({ length: Math.max(0, (isMobile ? 4 : 6) - emails.length) }).map((_, idx) => (
					<div
						key={`sent-placeholder-${idx}`}
						className={cn(
							'select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#5AB477] p-2',
							isMobile ? 'h-[100px]' : 'w-[489px] h-[97px]'
						)}
						style={isMobile ? { width: mobileEmailRowWidth } : undefined}
					/>
				))}
			</div>
		</DraftingTable>
	);
};

export default SentEmails;
