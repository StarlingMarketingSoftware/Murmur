'use client';

import { type FC, useMemo } from 'react';
import { X } from 'lucide-react';

import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { stateBadgeColorMap } from '@/constants/ui';
import { convertHtmlToPlainText } from '@/utils';
import {
	getWineBeerSpiritsLabel,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { getStateAbbreviation } from '@/utils/string';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import type { ContactWithName } from '@/types/contact';

const DECK_WIDTH_PX = 449;
const CARD_WIDTH_PX = 421;
const CARD_NATIVE_WIDTH_PX = 455;
const CARD_NATIVE_HEIGHT_PX = 450;
const CARD_SCALE = CARD_WIDTH_PX / CARD_NATIVE_WIDTH_PX;
const CARD_HEIGHT_PX = Math.round(CARD_NATIVE_HEIGHT_PX * CARD_SCALE);
const HEADER_HEIGHT_PX = 28;
const STACK_STEP_PX = Math.round(19 * CARD_SCALE);
const STACK_INSET_PX = Math.round(18 * CARD_SCALE);
const MAX_BACK_CARDS = 4;

export const LegacyInwardExpandIcon: FC<{ className?: string }> = ({ className }) => (
	<svg
		className={className}
		width="14"
		height="14"
		viewBox="0 0 26 26"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M3 3L10 10M10 10H4M10 10V4"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="square"
			strokeLinejoin="miter"
		/>
		<path
			d="M23 3L16 10M16 10H22M16 10V4"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="square"
			strokeLinejoin="miter"
		/>
		<path
			d="M3 23L10 16M10 16H4M10 16V22"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="square"
			strokeLinejoin="miter"
		/>
		<path
			d="M23 23L16 16M16 16H22M16 16V22"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="square"
			strokeLinejoin="miter"
		/>
	</svg>
);

const getContactDisplayName = (contact: ContactWithName | null | undefined) => {
	if (!contact) return '';
	return (
		contact.name?.trim() ||
		`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
		contact.company?.trim() ||
		''
	);
};

const getContactTitle = (contact: ContactWithName | null | undefined) =>
	contact?.curatedDisplayLabel || contact?.headline || contact?.title || '';

const getTitleBgColor = (title: string) =>
	isRestaurantTitle(title)
		? '#C3FBD1'
		: isCoffeeShopTitle(title)
			? '#D6F1BD'
			: isMusicVenueTitle(title)
				? '#B7E5FF'
				: isMusicFestivalTitle(title)
					? '#C1D6FF'
					: isWeddingPlannerTitle(title) || isWeddingVenueTitle(title)
						? '#FFF2BC'
						: isWineBeerSpiritsTitle(title)
							? '#BFC4FF'
							: '#E8EFFF';

const getTitleLabel = (title: string) =>
	isRestaurantTitle(title)
		? 'Restaurant'
		: isCoffeeShopTitle(title)
			? 'Coffee Shop'
			: isMusicVenueTitle(title)
				? 'Music Venue'
				: isMusicFestivalTitle(title)
					? 'Music Festival'
					: isWeddingPlannerTitle(title)
						? 'Wedding Planner'
						: isWeddingVenueTitle(title)
							? 'Wedding Venue'
							: isWineBeerSpiritsTitle(title)
								? (getWineBeerSpiritsLabel(title) ?? title)
								: title;

const CategoryPillIcon: FC<{ title: string }> = ({ title }) => {
	if (isRestaurantTitle(title)) return <RestaurantsIcon size={12} className="flex-shrink-0" />;
	if (isCoffeeShopTitle(title)) return <CoffeeShopsIcon size={7} className="flex-shrink-0" />;
	if (isMusicVenueTitle(title)) return <MusicVenuesIcon size={12} className="flex-shrink-0" />;
	if (isMusicFestivalTitle(title)) return <FestivalsIcon size={12} className="flex-shrink-0" />;
	if (isWeddingPlannerTitle(title) || isWeddingVenueTitle(title))
		return <WeddingPlannersIcon size={12} className="flex-shrink-0" />;
	if (isWineBeerSpiritsTitle(title))
		return <WineBeerSpiritsIcon size={12} className="flex-shrink-0" />;
	return null;
};

const CompactDashboardDraftingCard: FC<{
	contact: ContactWithName | null;
	subject?: string;
	message?: string;
	footerLabel: string;
	bodyColor: string;
	headerColor: string;
	wave?: boolean;
	ariaHidden?: boolean;
}> = ({
	contact,
	subject = '',
	message = '',
	footerLabel,
	bodyColor,
	headerColor,
	wave = false,
	ariaHidden = false,
}) => {
	const displayName = getContactDisplayName(contact) || 'Unknown Contact';
	const companyName = contact?.company?.trim() || '';
	const hasName = Boolean(
		contact?.name?.trim() || contact?.firstName?.trim() || contact?.lastName?.trim()
	);
	const primaryName = hasName && companyName ? companyName : displayName;
	const secondaryName = hasName && companyName ? displayName : '';
	const stateAbbr = getStateAbbreviation(contact?.state || '') || '';
	const contactTitle = getContactTitle(contact);
	const titleLabel = getTitleLabel(contactTitle);
	const plainMessage = /<[^>]+>/.test(message || '')
		? convertHtmlToPlainText(message || '')
		: message || '';
	const showWave =
		wave ||
		(!plainMessage.trim() && !subject.trim()) ||
		plainMessage.trim().toLowerCase() === 'drafting...';

	return (
		<div
			aria-hidden={ariaHidden}
			style={{
				width: CARD_WIDTH_PX,
				height: CARD_HEIGHT_PX,
				overflow: 'visible',
			}}
		>
			<div
				style={{
					width: CARD_NATIVE_WIDTH_PX,
					height: CARD_NATIVE_HEIGHT_PX,
					transform: `scale(${CARD_SCALE})`,
					transformOrigin: 'top left',
				}}
			>
				<div
					style={{
						width: CARD_NATIVE_WIDTH_PX,
						height: CARD_NATIVE_HEIGHT_PX,
						border: '3px solid #000000',
						borderRadius: '8px',
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
						overflow: 'hidden',
						backgroundColor: bodyColor,
					}}
				>
					<div
						style={{
							height: '48px',
							backgroundColor: headerColor,
							borderBottom: '2px solid #000000',
							padding: '8px 16px',
							position: 'relative',
							display: 'flex',
							alignItems: 'flex-start',
							boxSizing: 'border-box',
						}}
					>
						<div
							style={{
								maxWidth: 'calc(100% - 215px)',
								overflow: 'hidden',
								alignSelf: 'stretch',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'center',
								transform: 'translateY(-1px)',
							}}
						>
							<div
								className="font-inter font-bold text-black leading-none whitespace-nowrap overflow-hidden"
								style={{
									fontSize: '17px',
									lineHeight: '18px',
									WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
									maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
								}}
							>
								{primaryName}
							</div>
							{secondaryName ? (
								<div
									className="font-inter font-normal text-black leading-none whitespace-nowrap overflow-hidden"
									style={{
										fontSize: '11px',
										lineHeight: '12px',
										marginTop: '1px',
										WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
									}}
								>
									{secondaryName}
								</div>
							) : null}
						</div>

						<div
							className="flex flex-col items-start"
							style={{
								position: 'absolute',
								right: '63px',
								bottom: '7px',
								width: '152px',
							}}
						>
							<div
								className="flex items-center justify-start gap-2 w-full"
								style={{ marginBottom: contactTitle ? '2px' : 0 }}
							>
								{stateAbbr ? (
									<span
										className="inline-flex items-center justify-center rounded-[4px] border text-[12px] leading-none font-bold flex-shrink-0"
										style={{
											width: '28px',
											height: '15px',
											backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
											borderColor: '#000000',
										}}
									>
										{stateAbbr}
									</span>
								) : null}
								{contact?.city ? (
									<div
										className="text-[12px] font-inter text-black leading-none truncate"
										style={{ maxWidth: '112px' }}
									>
										{contact.city}
									</div>
								) : null}
							</div>
							{contactTitle ? (
								<div
									className="rounded-[6px] border border-black px-2 flex items-center gap-1 justify-start overflow-hidden"
									style={{
										width: '152px',
										height: '18px',
										backgroundColor: getTitleBgColor(contactTitle),
									}}
								>
									<CategoryPillIcon title={contactTitle} />
									<span className="text-[11px] font-inter text-black leading-none truncate">
										{titleLabel}
									</span>
								</div>
							) : null}
						</div>
						<div
							style={{
								position: 'absolute',
								top: '17px',
								right: '21px',
								width: '16px',
								height: '2px',
								backgroundColor: '#000000',
							}}
						/>
					</div>

					<div
						className="flex-1 overflow-hidden flex flex-col relative"
						style={{
							padding: '6px 4px 4px 4px',
							borderBottomLeftRadius: '5px',
							borderBottomRightRadius: '5px',
							backgroundColor: bodyColor,
						}}
					>
						<div className="flex justify-center" style={{ marginBottom: '8px' }}>
							<div
								className="font-inter text-[14px] font-extrabold bg-white border-2 border-black rounded-[7px] px-2 overflow-hidden flex items-center"
								style={{ width: '442px', height: '39px' }}
							>
								<span className="truncate">
									{showWave ? 'Drafting message...' : subject || 'No subject'}
								</span>
							</div>
						</div>
						<div className="flex justify-center flex-1 min-h-0">
							<div
								className="bg-white border-2 border-black rounded-[7px] overflow-hidden"
								style={{
									width: '442px',
									height: '100%',
								}}
							>
								{!ariaHidden ? (
									<CustomScrollbar
										className="h-full"
										thumbWidth={2}
										thumbColor="#000000"
										trackColor="transparent"
										offsetRight={2}
										contentClassName="overflow-x-hidden"
										lockHorizontalScroll
									>
										<div className="murmur-selectable p-3 whitespace-pre-wrap font-inter text-[14px] leading-[1.6] text-black">
											{showWave ? 'Drafting...' : plainMessage || 'No content'}
										</div>
									</CustomScrollbar>
								) : null}
							</div>
						</div>
						<div
							className="flex items-center font-inter font-normal text-[11px] text-black leading-none"
							style={{
								height: '16px',
								marginTop: '4px',
								paddingLeft: '8px',
								paddingRight: '8px',
								pointerEvents: 'none',
								WebkitMaskImage: 'linear-gradient(90deg, #000 92%, transparent 100%)',
								maskImage: 'linear-gradient(90deg, #000 92%, transparent 100%)',
							}}
						>
							<span className="whitespace-nowrap">Drafts</span>
							<span className="mx-[10px] whitespace-nowrap">{'>'}</span>
							<span className="min-w-0 truncate">{footerLabel}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export interface DashboardDraftingDeckProps {
	contacts: ContactWithName[];
	targetContactIds: number[];
	livePreview: {
		visible?: boolean;
		contactId?: number | null;
		subject?: string;
		message?: string;
	};
	completedContactIds: number[];
	total: number;
	isCollapsed: boolean;
	onCollapsedChange: (collapsed: boolean) => void;
	/** Abort the in-progress batch drafting (wired to the hook's `cancelGeneration`). */
	onCancel?: () => void;
	/** Navigate to the campaign Write tab to watch the drafting in its full view. */
	onViewDrafting?: () => void;
}

export const DashboardDraftingDeck: FC<DashboardDraftingDeckProps> = ({
	contacts,
	targetContactIds,
	livePreview,
	completedContactIds,
	total,
	isCollapsed,
	onCollapsedChange,
	onCancel,
	onViewDrafting,
}) => {
	const contactById = useMemo(() => {
		const map = new Map<number, ContactWithName>();
		for (const contact of contacts) map.set(contact.id, contact);
		return map;
	}, [contacts]);

	const activeOrNextContact = useMemo(() => {
		if (livePreview.contactId) {
			return contactById.get(livePreview.contactId) ?? null;
		}
		const completed = new Set(completedContactIds);
		const nextId = targetContactIds.find((id) => !completed.has(id));
		return nextId ? contactById.get(nextId) ?? null : null;
	}, [completedContactIds, contactById, livePreview.contactId, targetContactIds]);

	// Minimize = fully hide the deck (header bar included). While collapsed, the map
	// panel's "Drafting X/Y" SelectionDraftingProgressBar stays visible and its expand
	// toggle (same isDashboardDraftingDeckCollapsed state) brings the deck back.
	if (isCollapsed) return null;

	const footerLabel = getContactDisplayName(activeOrNextContact) || 'Drafting';
	const completedCount = Math.min(completedContactIds.length, total || targetContactIds.length);
	const hasActiveDraft = Boolean(livePreview.visible && livePreview.contactId);
	const inQueue = Math.max(
		0,
		(total || targetContactIds.length) - completedCount - (hasActiveDraft ? 1 : 0)
	);
	const backCardCount = Math.min(MAX_BACK_CARDS, completedCount);
	const stackPadPx = backCardCount * STACK_STEP_PX;

	return (
		<div
			className="relative"
			style={{
				width: DECK_WIDTH_PX,
			}}
		>
			<div
				className="flex flex-row items-center gap-[13px]"
				style={{
					width: CARD_WIDTH_PX,
					height: HEADER_HEIGHT_PX,
					borderRadius: 6,
					background: '#B0CEFB',
					paddingLeft: 4,
					paddingRight: 8,
					marginLeft: 'auto',
				}}
			>
				<div
					className="flex items-center pl-[12px] font-inter text-[13px] font-medium text-black"
					style={{
						width: 185,
						height: 20,
						borderRadius: 6,
						background: '#88B4F7',
						border: '1.5px solid #FFFFFF',
					}}
				>
					Drafting Message
				</div>
				<div className="font-inter text-[13px] font-semibold text-black">
					{inQueue} in Queue
				</div>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="flex cursor-pointer items-center justify-center gap-[4px] border-0 font-inter text-[13px] font-medium leading-none text-black"
						style={{
							width: 86,
							height: 16,
							borderRadius: 7,
							opacity: 0.4,
							background: '#FCFEFF',
						}}
						aria-label="Cancel drafting"
					>
						Cancel
						<X className="h-3 w-3" />
					</button>
				)}
				<button
					type="button"
					onClick={() => onCollapsedChange(!isCollapsed)}
					className="ml-auto flex items-center justify-center border-0 bg-transparent p-0"
					style={{ width: 18, height: 18 }}
					aria-label={isCollapsed ? 'Expand drafting deck' : 'Collapse drafting deck'}
				>
					<LegacyInwardExpandIcon className="text-black" />
				</button>
			</div>

			{!isCollapsed && (
				<>
					<div
						className="relative ml-auto"
						style={{
							width: CARD_WIDTH_PX,
							height: stackPadPx + CARD_HEIGHT_PX,
							marginTop: 8,
						}}
					>
						{Array.from({ length: backCardCount }, (_, index) => {
							const depth = backCardCount - index;
							const completedContactId =
								completedContactIds[completedContactIds.length - depth] ??
								completedContactIds[completedContactIds.length - 1];
							const completedContact =
								completedContactId != null
									? contactById.get(completedContactId) ?? null
									: null;
							return (
								<div
									key={`dashboard-drafting-back-card-${depth}`}
									aria-hidden="true"
									className="absolute"
									style={{
										top: stackPadPx - depth * STACK_STEP_PX,
										left: -depth * STACK_INSET_PX,
										width: CARD_WIDTH_PX,
										height: CARD_HEIGHT_PX,
										opacity: 0.86,
										zIndex: index,
									}}
								>
									<CompactDashboardDraftingCard
										contact={completedContact}
										footerLabel={getContactDisplayName(completedContact) || 'Drafted'}
										bodyColor="#FFDC9E"
										headerColor="#FFE4B5"
										ariaHidden
									/>
								</div>
							);
						})}
						<div
							className="absolute left-0 right-0"
							style={{ top: stackPadPx, zIndex: backCardCount + 1 }}
						>
							<CompactDashboardDraftingCard
								contact={activeOrNextContact}
								subject={livePreview.subject}
								message={livePreview.message}
								footerLabel={footerLabel}
								bodyColor="#B0CEFB"
								headerColor="#C3DAFF"
								wave={!livePreview.contactId}
							/>
						</div>
					</div>
					{onViewDrafting && (
						<div className="flex justify-center" style={{ marginTop: 12 }}>
							<button
								type="button"
								onClick={onViewDrafting}
								className="font-inter text-black text-[14px] font-medium"
								style={{
									display: 'flex',
									width: 212,
									height: 27.956,
									padding: '3.589px 58.242px 3.367px 56.758px',
									justifyContent: 'center',
									alignItems: 'center',
									borderRadius: '999px',
									background: '#FFF',
									boxShadow: '0 1.165px 2.33px 0 rgba(0, 0, 0, 0.05)',
									whiteSpace: 'nowrap',
									cursor: 'pointer',
								}}
							>
								View Drafting
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default DashboardDraftingDeck;
