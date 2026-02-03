'use client';

import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { cn } from '@/utils';
import { useHoverDescription } from '@/contexts/HoverDescriptionContext';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { US_STATES } from '@/constants/usStates';
import { stateBadgeColorMap } from '@/constants/ui';
import { getCityIconProps } from '@/utils/cityIcons';

interface CampaignHeaderBoxProps {
	campaignId: number;
	campaignName: string;
	toListNames: string;
	fromName: string;
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	/**
	 * When provided, shows the "emails drafting" progress box 9px above the header.
	 * `current` is 0-based progress count; `total` is total emails being drafted.
	 */
	draftingProgress?: { current: number; total: number } | null;
	onFromClick?: () => void;
	onContactsClick?: () => void;
	onDraftsClick?: () => void;
	onSentClick?: () => void;
	width?: number;
	/** When true, uses responsive width (matching writing box) with left-aligned content */
	fullWidth?: boolean;
	/** Additional className for the container */
	className?: string;
}

const getContactsFillColor = (): string => '#F5DADA';
const getDraftFillColor = (): string => '#FFE3AA';
const getSentFillColor = (): string => '#B0E0A6';

type CampaignTitlePillSpec = {
	match: RegExp;
	displayText?: string | ((matchedText: string) => string);
	backgroundColor: string;
	renderIcon: () => ReactNode;
	iconWrapperClassName?: string;
};

const CAMPAIGN_TITLE_PILL_SPECS: CampaignTitlePillSpec[] = [
	{
		// "Wine, Beer, and Spirits" (and common punctuation variants)
		match: /^wine\s*,?\s*beer\s*,?\s*(?:and\s*)?spirits(?=\s|$)/i,
		displayText: 'W.B.S.',
		backgroundColor: '#BFC4FF',
		renderIcon: () => <WineBeerSpiritsIcon size={20} className="flex-shrink-0" />,
	},
	{
		// "Wineries", "Breweries", "Distilleries", "Cideries" (and singular forms)
		match: /^(?:winer(?:y|ies)|brewer(?:y|ies)|distiller(?:y|ies)|cider(?:y|ies))(?=\s|$)/i,
		backgroundColor: '#BFC4FF',
		renderIcon: () => <WineBeerSpiritsIcon size={20} className="flex-shrink-0" />,
	},
	{
		match: /^restaurants?(?=\s|$)/i,
		backgroundColor: '#C3FBD1',
		renderIcon: () => <RestaurantsIcon size={20} className="flex-shrink-0" />,
	},
	{
		match: /^coffee\s*shops?(?=\s|$)/i,
		backgroundColor: '#D6F1BD',
		renderIcon: () => <CoffeeShopsIcon size={13} className="flex-shrink-0" />,
	},
	{
		match: /^music\s*venues?(?=\s|$)/i,
		backgroundColor: '#B7E5FF',
		renderIcon: () => <MusicVenuesIcon size={24} className="flex-shrink-0" />,
	},
	{
		// Our UI sometimes uses "Festivals" and sometimes "Music Festivals"
		match: /^(?:music\s*)?festivals?(?=\s|$)/i,
		backgroundColor: '#C1D6FF',
		renderIcon: () => <FestivalsIcon size={20} className="flex-shrink-0" />,
	},
	{
		// "Wedding Planners", "Wedding Venues" (and singular forms)
		match: /^wedding\s*(?:planners?|venues?)(?=\s|$)/i,
		backgroundColor: '#FFF2BC',
		renderIcon: () => <WeddingPlannersIcon size={20} className="flex-shrink-0" />,
	},
	{
		match: /^radio\s*stations?(?=\s|$)/i,
		backgroundColor: '#E8EFFF',
		renderIcon: () => <RadioStationsIcon size={22} className="flex-shrink-0" />,
		// The radio icon sits a hair low compared to the others.
		iconWrapperClassName: 'translate-y-[-1px]',
	},
];

const getUsStateAbbreviation = (stateOrAbbr: string): string | null => {
	const normalized = (stateOrAbbr ?? '').trim();
	if (!normalized) return null;

	const lowered = normalized.toLowerCase();
	const match = US_STATES.find(
		(s) => s.name.toLowerCase() === lowered || s.abbr.toLowerCase() === lowered
	);
	return match?.abbr ?? null;
};

type TitleStatePillLocationParse = {
	locationForIcon: string;
	abbr: string;
	citationNumber: string | null;
};

const parseTitleStatePillLocation = (locationBase: string): TitleStatePillLocationParse | null => {
	const directAbbr = getUsStateAbbreviation(locationBase);
	if (directAbbr) {
		return { locationForIcon: locationBase, abbr: directAbbr, citationNumber: null };
	}

	// Support titles like: "Wineries in NY 3" / "Wineries in New York 3"
	const trailingNumberMatch = locationBase.match(/^(.+?)\s+(\d+)\s*$/);
	if (!trailingNumberMatch) return null;

	const stateCandidate = (trailingNumberMatch[1] ?? '').trim();
	const citationNumber = trailingNumberMatch[2] ?? null;

	const abbr = getUsStateAbbreviation(stateCandidate);
	if (!abbr) return null;

	return { locationForIcon: stateCandidate, abbr, citationNumber };
};

const renderCampaignTitleWithStatePill = (title: string): ReactNode => {
	const safeTitle = title ?? '';
	if (!safeTitle) return safeTitle;

	// Split at the last " in " so we can wrap the trailing state name/abbr.
	// Example: "Wineries in New York" -> prefix: "Wineries in ", location: "New York"
	const match = safeTitle.match(/^(.*\bin\b\s+)(.+)$/i);
	if (!match) return safeTitle;

	const prefix = match[1] ?? '';
	const locationRaw = match[2] ?? '';

	// Keep trailing punctuation outside the pill.
	const trimmedLocation = locationRaw.trim();
	const punctuationMatch = trimmedLocation.match(/^(.+?)([.,;:]*)$/);
	const locationBase = punctuationMatch?.[1]?.trim() ?? trimmedLocation;
	const trailingPunctuation = punctuationMatch?.[2] ?? '';

	const parsedLocation = parseTitleStatePillLocation(locationBase);
	if (!parsedLocation) return safeTitle;

	const { abbr, locationForIcon, citationNumber } = parsedLocation;

	// Use the same state icon + background used across "Where" and contact-row state boxes.
	const { icon } = getCityIconProps('', locationForIcon);
	const backgroundColor = stateBadgeColorMap[abbr] ?? 'transparent';

	return (
		<>
			{prefix}
			<span
				className="inline-flex items-center gap-[10px] h-[26px] px-[8px] rounded-[5px] align-middle"
				style={{ backgroundColor }}
			>
				<span className="leading-none">{abbr}</span>
				<span className="inline-flex items-center justify-center translate-y-[1px] [&>svg]:w-[23px] [&>svg]:h-[18px]">
					{icon}
				</span>
			</span>
			{citationNumber ? (
				<sup className="ml-[3px] text-[14px] leading-none">{citationNumber}</sup>
			) : null}
			{trailingPunctuation}
		</>
	);
};

const renderCampaignTitleWithCategoryPill = (title: string): ReactNode => {
	const safeTitle = title ?? '';
	if (!safeTitle) return safeTitle;

	const leadingWhitespace = safeTitle.match(/^\s*/)?.[0] ?? '';
	const restTitle = safeTitle.slice(leadingWhitespace.length);
	if (!restTitle) return safeTitle;

	for (const spec of CAMPAIGN_TITLE_PILL_SPECS) {
		const match = restTitle.match(spec.match);
		const matchedText = match?.[0];
		if (!matchedText) continue;

		const suffix = restTitle.slice(matchedText.length);
		const displayText =
			typeof spec.displayText === 'function'
				? spec.displayText(matchedText)
				: (spec.displayText ?? matchedText);
		return (
			<>
				{leadingWhitespace}
				<span
					className="inline-flex items-center gap-[7px] h-[26px] px-[8px] rounded-[5px] align-middle"
					style={{ backgroundColor: spec.backgroundColor }}
				>
					<span className="leading-none">{displayText}</span>
					<span className={cn('translate-y-[1px]', spec.iconWrapperClassName)}>
						{spec.renderIcon()}
					</span>
				</span>
				{renderCampaignTitleWithStatePill(suffix)}
			</>
		);
	}

	return renderCampaignTitleWithStatePill(safeTitle);
};

export const CampaignHeaderBox: FC<CampaignHeaderBoxProps> = ({
	campaignId,
	campaignName,
	toListNames,
	fromName,
	contactsCount,
	draftCount,
	sentCount,
	draftingProgress,
	onFromClick,
	onContactsClick,
	onDraftsClick,
	onSentClick,
	width = 374,
	fullWidth = false,
	className,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(campaignName);
	const inputRef = useRef<HTMLInputElement>(null);
	const { enabled: hoverDescriptionsEnabled, description: hoverDescription } =
		useHoverDescription();
	const [renderedHoverDescription, setRenderedHoverDescription] = useState('');
	const [isHoverDescriptionVisible, setIsHoverDescriptionVisible] = useState(false);
	const hoverDescriptionTimeoutRef = useRef<number | null>(null);

	const draftingCurrent = draftingProgress?.current ?? -1;
	const draftingTotal = draftingProgress?.total ?? 0;
	const shouldShowDraftingProgress =
		draftingTotal > 0 && draftingCurrent >= 0;
	const draftingPct = shouldShowDraftingProgress
		? Math.min(
				100,
				Math.max(
					0,
					(Math.min(Math.max(0, draftingCurrent), draftingTotal) / Math.max(1, draftingTotal)) *
						100
				)
		  )
		: 0;
	const draftingLabel = shouldShowDraftingProgress
		? `${draftingTotal} email${draftingTotal === 1 ? '' : 's'} drafting`
		: '';

	// Track which metric box is hovered for chrome-style animation
	const [hoveredMetric, setHoveredMetric] = useState<'contacts' | 'drafts' | 'sent' | null>(null);

	const { mutate: editCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			setIsEditing(false);
		},
	});

	// Smooth hover-description transitions (tiny fade out -> swap -> fade in).
	useEffect(() => {
		const FADE_MS = 140;
		const SWAP_DELAY_MS = 70;

		const next = hoverDescriptionsEnabled ? hoverDescription : '';

		if (hoverDescriptionTimeoutRef.current != null) {
			window.clearTimeout(hoverDescriptionTimeoutRef.current);
			hoverDescriptionTimeoutRef.current = null;
		}

		// If nothing to show, fade out (briefly) and then clear.
		if (!next) {
			if (!renderedHoverDescription) {
				setIsHoverDescriptionVisible(false);
				return;
			}

			// Delay the fade-out a touch so quick cursor movement across gaps doesn't flicker.
			hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
				setIsHoverDescriptionVisible(false);
				hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
					setRenderedHoverDescription('');
					hoverDescriptionTimeoutRef.current = null;
				}, FADE_MS);
			}, 90);
			return;
		}

		// First show: render immediately and fade in.
		if (!renderedHoverDescription) {
			setRenderedHoverDescription(next);
			setIsHoverDescriptionVisible(true);
			return;
		}

		// No change.
		if (next === renderedHoverDescription) {
			setIsHoverDescriptionVisible(true);
			return;
		}

		// Swap with a quick fade.
		setIsHoverDescriptionVisible(false);
		hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
			setRenderedHoverDescription(next);
			setIsHoverDescriptionVisible(true);
			hoverDescriptionTimeoutRef.current = null;
		}, SWAP_DELAY_MS);
	}, [hoverDescription, hoverDescriptionsEnabled, renderedHoverDescription]);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (hoverDescriptionTimeoutRef.current != null) {
				window.clearTimeout(hoverDescriptionTimeoutRef.current);
				hoverDescriptionTimeoutRef.current = null;
			}
		};
	}, []);

	// Focus input when entering edit mode
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	// Sync editedName when campaignName prop changes
	useEffect(() => {
		setEditedName(campaignName);
	}, [campaignName]);

	const handleSave = () => {
		if (editedName.trim() && editedName !== campaignName) {
			editCampaign({
				id: campaignId,
				data: { name: editedName.trim() },
			});
		} else {
			setEditedName(campaignName);
			setIsEditing(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			setEditedName(campaignName);
			setIsEditing(false);
		}
	};

	return (
		<div
			data-campaign-header-box="true"
			className={cn(
				'relative overflow-visible bg-white border-[2px] border-black rounded-[8px] flex flex-col px-3 pt-0 pb-2 box-border',
				fullWidth && 'w-[96.27vw] max-w-[499px]',
				className
			)}
			style={
				fullWidth
					? {
							height: '71px',
							minHeight: '71px',
							maxHeight: '71px',
					  }
					: {
							width: `${width}px`,
							height: '71px',
							minWidth: `${width}px`,
							maxWidth: `${width}px`,
							minHeight: '71px',
							maxHeight: '71px',
					  }
			}
		>
			{/* Drafting progress box (shown above the header; must NOT shift layout) */}
			{shouldShowDraftingProgress ? (
				<div
					aria-hidden="true"
					style={{
						position: 'absolute',
						// Absolute children position against the padding box; offset by the 2px header border
						// so this 374x35 box aligns with the header's outer border edges.
						left: '-2px',
						right: '-2px',
						top: '-46px', // 35px height + 9px gap + 2px header border
						height: '35px',
						boxSizing: 'border-box',
						border: '2px solid rgba(176, 176, 176, 0.2)',
						borderRadius: '5px',
						background: 'transparent',
						pointerEvents: 'none',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						// Keep the progress bar exactly 6px from the stroke without affecting layout.
						// (Asymmetric right padding preserves the 359px bar width at the 374px header size.)
						paddingTop: '6px',
						paddingBottom: '6px',
						paddingLeft: '6px',
						paddingRight: '5px',
						gap: '2px',
						zIndex: 90,
					}}
				>
					<div
						className="font-inter font-medium text-black"
						style={{ fontSize: '11px', lineHeight: '11px', transform: 'translateY(-1px)' }}
					>
						{draftingLabel}
					</div>
					<div
						style={{
							width: '100%',
							height: '6px',
							backgroundColor: '#D1D1D1',
							borderRadius: '6px',
							overflow: 'hidden',
							position: 'relative',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								height: '100%',
								width: `${draftingPct}%`,
								backgroundColor: '#EDB552',
								borderRadius: '6px',
							}}
						/>
					</div>
				</div>
			) : null}

			{renderedHoverDescription && !shouldShowDraftingProgress ? (
				<div
					data-hover-description-ignore="true"
					className={cn(
						'pointer-events-none absolute left-0 right-0 top-0 -translate-y-full',
						'-mt-[15px]',
						'z-[80]',
						'px-3 font-inter font-extralight text-[13px] leading-[1.15] text-black',
						'transition-opacity duration-150 ease-out',
						isHoverDescriptionVisible ? 'opacity-100' : 'opacity-0'
					)}
					style={{ willChange: 'opacity' }}
				>
					{renderedHoverDescription}
				</div>
			) : null}
			{/* Campaign Title */}
			<div className="h-[28px] overflow-hidden flex-shrink-0 mt-[6px]">
				{isEditing ? (
					<input
						ref={inputRef}
						type="text"
						value={editedName}
						onChange={(e) => setEditedName(e.target.value)}
						onBlur={handleSave}
						onKeyDown={handleKeyDown}
						className="font-normal text-[26px] leading-none text-black bg-transparent border-none outline-none p-0 m-0 w-full h-[28px]"
						style={{ fontFamily: 'Times New Roman, Times, serif' }}
					/>
				) : (
					<div
						className="font-normal text-[26px] leading-none whitespace-nowrap overflow-hidden text-black cursor-text h-[28px]"
						style={{
							fontFamily: 'Times New Roman, Times, serif',
							maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
							WebkitMaskImage:
								'linear-gradient(to right, black 90%, transparent 100%)',
						}}
						onClick={() => setIsEditing(true)}
						title="Click to edit"
					>
						{renderCampaignTitleWithCategoryPill(campaignName)}
					</div>
				)}
			</div>

			{/* Spacer above To/From */}
			<div className="flex-1" />

			{/* To/From Row */}
			<div
				aria-hidden="true"
				className={cn(
					'flex items-center text-[11px] flex-shrink-0 invisible pointer-events-none',
					fullWidth && 'gap-[20px]'
				)}
			>
				{/* To section */}
				<div className={cn('flex items-center gap-1', !fullWidth && 'w-1/2')}>
					<Link
						href={urls.murmur.dashboard.index}
						prefetch
						onClick={(e) => {
							e.preventDefault();
							if (typeof window !== 'undefined') {
								window.location.assign(urls.murmur.dashboard.index);
							}
						}}
						className="block"
					>
						<div
							className="bg-[#EEEEEE] flex items-center justify-start pl-1 transition-colors group hover:bg-[#696969] rounded-[6px]"
							style={{ width: '41px', height: '13px' }}
						>
							<span className="font-inter font-normal text-[13px] leading-none text-black transition-colors group-hover:text-white">
								To
							</span>
						</div>
					</Link>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px]">
						{toListNames || 'No recipients'}
					</span>
				</div>

				{/* From section */}
				<div className={cn('flex items-center gap-1', !fullWidth && 'w-1/2')}>
					<button
						type="button"
						onClick={onFromClick}
						className="bg-[#EEEEEE] flex items-center justify-start pl-1 cursor-pointer transition-colors group hover:bg-[#696969] rounded-[6px]"
						style={{ width: '41px', height: '13px' }}
					>
						<span className="font-inter font-normal text-[13px] leading-none text-black transition-colors group-hover:text-white">
							From
						</span>
					</button>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px] flex items-center gap-1">
						{fromName || 'Not set'}
						<span className="inline-block align-middle">▾</span>
					</span>
				</div>
			</div>

			{/* Spacer below To/From */}
			<div className="flex-1" />

		{/* Metrics Row */}
		<div
			className={cn('flex items-center -mt-[6px]', fullWidth ? 'gap-[10px]' : 'gap-[20px]')}
			onMouseLeave={() => setHoveredMetric(null)}
		>
			<button
				type="button"
				onClick={onContactsClick}
				onMouseEnter={() => setHoveredMetric('contacts')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'contacts'
							? '#FFFFFF'
							: getContactsFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'contacts' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{`${String(contactsCount).padStart(2, '0')} Contacts`}
				</span>
			</button>
			<button
				type="button"
				onClick={onDraftsClick}
				onMouseEnter={() => setHoveredMetric('drafts')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'drafts'
							? '#FFFFFF'
							: getDraftFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'drafts' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{draftCount === 0 ? 'Drafts' : `${String(draftCount).padStart(2, '0')} Drafts`}
				</span>
			</button>
			<button
				type="button"
				onClick={onSentClick}
				onMouseEnter={() => setHoveredMetric('sent')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'sent'
							? '#FFFFFF'
							: getSentFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'sent' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{sentCount === 0 ? 'Sent' : `${String(sentCount).padStart(2, '0')} Sent`}
				</span>
			</button>
		</div>
		</div>
	);
};

