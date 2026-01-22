import {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
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
import { useGetUsedContactCampaigns, useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { ContactWithName } from '@/types/contact';
import { useIsMobile } from '@/hooks/useIsMobile';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

const FadeOverflowText: FC<{
	text: string;
	className?: string;
	fadePx?: number;
	measureKey?: unknown;
}> = ({ text, className, fadePx = 16, measureKey }) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		// A tiny epsilon avoids flicker from sub-pixel rounding.
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text, measureKey]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	const safeFadePx = Math.max(0, fadePx);
	const style = isOverflowing
		? {
				maskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
				WebkitMaskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={cn('block w-full whitespace-nowrap overflow-hidden', className)}
			style={style}
			title={text}
		>
			{text}
		</span>
	);
};

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
	const router = useRouter();
	const { campaignId: campaignIdParam } = useParams() as { campaignId?: string };
	const currentCampaignId = useMemo(() => {
		const n = campaignIdParam ? Number(campaignIdParam) : NaN;
		return Number.isFinite(n) ? n : null;
	}, [campaignIdParam]);

	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	// Used-contact hover tooltip ("Appears in" + Go To), matching Drafts/ContactsSelection behavior.
	const [hoveredUsedContact, setHoveredUsedContact] = useState<{
		contactId: number;
		rowKey: number;
	} | null>(null);
	const hoveredUsedContactId = hoveredUsedContact?.contactId ?? null;
	const { data: hoveredUsedContactCampaigns } = useGetUsedContactCampaigns(hoveredUsedContactId);
	const [activeUsedContactCampaignIndex, setActiveUsedContactCampaignIndex] = useState<number | null>(null);
	const resolvedUsedContactCampaigns = useMemo(() => {
		const all = hoveredUsedContactCampaigns ?? [];
		const other = currentCampaignId ? all.filter((c) => c.id !== currentCampaignId) : all;
		return other.length ? other : all;
	}, [hoveredUsedContactCampaigns, currentCampaignId]);

	const usedContactRowElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
	const usedContactTooltipCloseTimeoutRef = useRef<number | null>(null);
	const [usedContactTooltipPos, setUsedContactTooltipPos] = useState<{
		left: number;
		top: number;
	} | null>(null);

	const getBodyScaleContext = useCallback(() => {
		// See DraftedEmails/ContactsSelection: `<body>` may be scaled in compact modes.
		const body = document.body;
		const rect = body.getBoundingClientRect();
		const scaleX = body.offsetWidth ? rect.width / body.offsetWidth : 1;
		const scaleY = body.offsetHeight ? rect.height / body.offsetHeight : 1;
		return {
			left: rect.left,
			top: rect.top,
			scaleX: scaleX || 1,
			scaleY: scaleY || 1,
		};
	}, []);

	const clearUsedContactTooltipCloseTimeout = useCallback(() => {
		if (usedContactTooltipCloseTimeoutRef.current !== null) {
			window.clearTimeout(usedContactTooltipCloseTimeoutRef.current);
			usedContactTooltipCloseTimeoutRef.current = null;
		}
	}, []);

	const openUsedContactTooltip = useCallback(
		(contactId: number, rowKey: number) => {
			clearUsedContactTooltipCloseTimeout();
			const el = usedContactRowElsRef.current.get(rowKey);
			if (el) {
				const rect = el.getBoundingClientRect();
				const bodyCtx = getBodyScaleContext();
				const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
				const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
				setUsedContactTooltipPos({
					// 43px from left wall, 49px from top of row box (matches Drafts tuning)
					left: rowLeftInBody + 43,
					top: rowTopInBody + 49,
				});
			}
			setActiveUsedContactCampaignIndex((prev) =>
				hoveredUsedContactId === contactId ? (prev ?? 0) : 0
			);
			setHoveredUsedContact({ contactId, rowKey });
		},
		[clearUsedContactTooltipCloseTimeout, getBodyScaleContext, hoveredUsedContactId]
	);

	const goToUsedContactCampaign = useCallback(
		(contactId: number, rowKey: number) => {
			if (!hoveredUsedContact) return;
			if (hoveredUsedContact.contactId !== contactId || hoveredUsedContact.rowKey !== rowKey) return;
			if (!resolvedUsedContactCampaigns.length) return;

			const idx = Math.min(
				resolvedUsedContactCampaigns.length - 1,
				Math.max(0, activeUsedContactCampaignIndex ?? 0)
			);
			const selected = resolvedUsedContactCampaigns[idx];
			if (!selected?.id) return;
			router.push(`/murmur/campaign/${selected.id}`);
		},
		[activeUsedContactCampaignIndex, hoveredUsedContact, resolvedUsedContactCampaigns, router]
	);

	const scheduleCloseUsedContactTooltip = useCallback(
		(contactId: number, rowKey: number) => {
			clearUsedContactTooltipCloseTimeout();
			usedContactTooltipCloseTimeoutRef.current = window.setTimeout(() => {
				setHoveredUsedContact((prev) =>
					prev?.contactId === contactId && prev?.rowKey === rowKey ? null : prev
				);
			}, 120);
		},
		[clearUsedContactTooltipCloseTimeout]
	);

	useEffect(() => {
		if (!hoveredUsedContact) {
			setUsedContactTooltipPos(null);
			setActiveUsedContactCampaignIndex(null);
			return;
		}

		let rafId = 0;
		const update = () => {
			const el = usedContactRowElsRef.current.get(hoveredUsedContact.rowKey);
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const bodyCtx = getBodyScaleContext();
			const rowLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
			const rowTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
			setUsedContactTooltipPos({
				left: rowLeftInBody + 43,
				top: rowTopInBody + 49,
			});
		};

		const schedule = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		};

		update();
		window.addEventListener('scroll', schedule, true);
		window.addEventListener('resize', schedule);

		return () => {
			window.removeEventListener('scroll', schedule, true);
			window.removeEventListener('resize', schedule);
			cancelAnimationFrame(rafId);
		};
	}, [getBodyScaleContext, hoveredUsedContact?.rowKey]);

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
					setHoveredUsedContact(null);
					onContactHover?.(null);
					onEmailHover?.(null);
				}}
			>
				{typeof document !== 'undefined' &&
					hoveredUsedContact &&
					usedContactTooltipPos &&
					(() => {
						// Don't show anything until the campaigns data is loaded (no "Loading..." state)
						if (hoveredUsedContactCampaigns === undefined) return null;

						const resolvedCampaigns = resolvedUsedContactCampaigns;
						const hasCampaigns = resolvedCampaigns.length > 0;
						const isMultiCampaign = hasCampaigns && resolvedCampaigns.length > 1;
						const resolvedCampaign = resolvedCampaigns[0] ?? null;
						const campaignName = resolvedCampaign?.name ?? '';
						const campaignIdToNavigate = resolvedCampaign?.id ?? null;

						return createPortal(
							<div
								className={cn(
									'fixed z-[9999] w-[322px] rounded-[8px] bg-[#DAE6FE] text-black border-2 border-black shadow-none',
									!isMultiCampaign && hasCampaigns && 'h-[60px]'
								)}
								style={{ left: usedContactTooltipPos.left, top: usedContactTooltipPos.top }}
								onMouseEnter={() => {
									clearUsedContactTooltipCloseTimeout();
								}}
								onMouseLeave={() => {
									scheduleCloseUsedContactTooltip(
										hoveredUsedContact.contactId,
										hoveredUsedContact.rowKey
									);
								}}
							>
								<span className="absolute left-[12px] top-[6px] text-[17px] font-inter font-medium text-black leading-none pointer-events-none">
									Appears in
								</span>

								{!hasCampaigns ? (
									<div className="pt-[28px] pb-[8px] px-[12px]">
										<div className="text-[15px] font-inter font-medium text-black leading-snug">
											No campaigns found for this contact yet.
										</div>
									</div>
								) : isMultiCampaign ? (
									<div className="pt-[28px] pb-[4px]">
										<div className="flex flex-col gap-[6px] px-[3px]">
											{resolvedCampaigns.map((c, idx) => {
												const isActive = activeUsedContactCampaignIndex === idx;
												return (
													<button
														key={c.id}
														type="button"
														className={cn(
															'w-[312px] h-[26px] rounded-[4px] border-2 border-black text-[17px] font-inter font-medium text-black cursor-pointer flex items-center gap-[10px] px-[10px] box-border',
															isActive ? 'bg-[#AAE19E]' : 'bg-[#CFE4FF]'
														)}
														onMouseEnter={() => setActiveUsedContactCampaignIndex(idx)}
														onClick={(e) => {
															e.stopPropagation();
															router.push(`/murmur/campaign/${c.id}`);
														}}
													>
														{isActive && (
															<span className="leading-none whitespace-nowrap shrink-0">
																Go To
															</span>
														)}
														<div className="h-[22px] w-fit max-w-full min-w-0 rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
															<FadeOverflowText
																text={c.name}
																fadePx={16}
																measureKey={isActive}
																className="text-[17px] font-inter font-medium text-black leading-none"
															/>
														</div>
													</button>
												);
											})}
										</div>
									</div>
								) : (
									<>
										<div className="absolute top-[4px] right-[3px] w-[204px] h-[22px] rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
											<FadeOverflowText
												text={campaignName}
												fadePx={16}
												className="text-[17px] font-inter font-medium text-black leading-none"
											/>
										</div>

										<button
											type="button"
											className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[312px] h-[26px] rounded-[4px] border-2 border-black bg-[#AAE19E] text-[17px] font-inter font-medium text-black cursor-pointer flex items-center justify-center box-border"
											disabled={!campaignIdToNavigate}
											onClick={(e) => {
												e.stopPropagation();
												if (campaignIdToNavigate) {
													router.push(`/murmur/campaign/${campaignIdToNavigate}`);
												}
											}}
										>
											Go To
										</button>
									</>
								)}
							</div>,
							document.body
						);
					})()}
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
					const isUsedContact = usedContactIdsSet.has(email.contactId);
					const isUsedContactHoverCardVisible =
						Boolean(hoveredUsedContact) &&
						hoveredUsedContact?.contactId === email.contactId &&
						hoveredUsedContact?.rowKey === (email.id as number) &&
						Boolean(usedContactTooltipPos) &&
						Boolean(hoveredUsedContactCampaigns?.length);

					return (
						<div
							key={email.id}
							ref={(el) => {
								const key = email.id as number;
								if (el) {
									usedContactRowElsRef.current.set(key, el);
								} else {
									usedContactRowElsRef.current.delete(key);
								}
							}}
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
							{isUsedContact && !isMobile &&
								(() => {
									const isMultiCampaignIndicator =
										isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length > 1;
									const isSingleCampaignIndicator =
										isUsedContactHoverCardVisible && resolvedUsedContactCampaigns.length === 1;
									const pillBg = isMultiCampaignIndicator
										? '#A0C0FF'
										: isSingleCampaignIndicator
											? '#B0EAA4'
											: '#DAE6FE';

									const handlePillMouseMove = isMultiCampaignIndicator
										? (e: React.MouseEvent<HTMLSpanElement>) => {
												const PILL_BORDER = 0;
												const rect = e.currentTarget.getBoundingClientRect();
												const actualHeight = rect.height;
												const offsetY = e.clientY - rect.top;
												const innerHeight = Math.max(1, actualHeight - PILL_BORDER * 2);
												const innerOffsetY = offsetY - PILL_BORDER;
												const campaignCount = resolvedUsedContactCampaigns.length;
												if (campaignCount <= 1) return;
												const ratio = Math.max(0, Math.min(1, innerOffsetY / innerHeight));
												const idx = Math.round(ratio * (campaignCount - 1));
												const clampedIdx = Math.max(0, Math.min(campaignCount - 1, idx));
												setActiveUsedContactCampaignIndex((prev) =>
													prev === clampedIdx ? prev : clampedIdx
												);
										  }
										: undefined;

									return (
										<span
											className="absolute z-10 cursor-pointer transition-all duration-150 ease-out"
											style={{
												left: '8px',
												top: hasSeparateName ? '50%' : '30px',
												transform: 'translateY(-50%)',
												boxSizing: 'border-box',
												width: isUsedContactHoverCardVisible ? '14px' : '16px',
												height: isUsedContactHoverCardVisible ? '37px' : '16px',
												borderRadius: isUsedContactHoverCardVisible ? '9999px' : '50%',
												border: isUsedContactHoverCardVisible ? 'none' : '1px solid #000000',
												boxShadow: isUsedContactHoverCardVisible
													? '0 0 0 1px #000000'
													: undefined,
												backgroundColor: pillBg,
												overflow: 'hidden',
											}}
											onMouseEnter={() => openUsedContactTooltip(email.contactId, email.id as number)}
											onMouseLeave={() =>
												scheduleCloseUsedContactTooltip(email.contactId, email.id as number)
											}
											onMouseMove={handlePillMouseMove}
											onClick={(e) => {
												if (!isUsedContactHoverCardVisible) return;
												e.preventDefault();
												e.stopPropagation();
												goToUsedContactCampaign(email.contactId, email.id as number);
											}}
										>
											{isMultiCampaignIndicator && (
												<span
													className="rounded-full bg-[#DAE6FE] pointer-events-none transition-all duration-150 ease-out"
													style={(() => {
														const PILL_HEIGHT = 37;
														const DOT_SIZE = 14;
														const maxTop = Math.max(0, PILL_HEIGHT - DOT_SIZE);
														const campaignCount = resolvedUsedContactCampaigns.length;
														const clampedIdx =
															typeof activeUsedContactCampaignIndex === 'number' &&
															campaignCount > 0
																? Math.min(
																		campaignCount - 1,
																		Math.max(0, activeUsedContactCampaignIndex)
																  )
																: 0;
														const top =
															campaignCount > 1
																? (maxTop * clampedIdx) / (campaignCount - 1)
																: maxTop / 2;
														return {
															position: 'absolute' as const,
															left: '0px',
															top: `${top}px`,
															width: `${DOT_SIZE}px`,
															height: `${DOT_SIZE}px`,
															boxShadow: '0 0 0 1px #000000',
														};
													})()}
												/>
											)}
										</span>
									);
								})()}

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
