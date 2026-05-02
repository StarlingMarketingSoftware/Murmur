import { FC, ReactNode } from 'react';
import { cn } from '@/utils';
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

export type CampaignTitlePillsSize = 'header' | 'table';

type CampaignTitlePillSpec = {
	match: RegExp;
	displayText?: string | ((matchedText: string) => string);
	// Optional shorter label for compact table rendering (dashboard campaigns table)
	displayTextTable?: string | ((matchedText: string) => string);
	backgroundColor: string;
	iconBaseSize: number;
	renderIcon: (size: number) => ReactNode;
	iconWrapperClassName?: string;
};

const CAMPAIGN_TITLE_PILL_SPECS: CampaignTitlePillSpec[] = [
	{
		// "Wine, Beer, and Spirits" (and common punctuation variants)
		match: /^wine\s*,?\s*beer\s*,?\s*(?:and\s*)?spirits(?=\s|$)/i,
		displayText: 'W.B.S.',
		backgroundColor: '#BFC4FF',
		iconBaseSize: 20,
		renderIcon: (size) => <WineBeerSpiritsIcon size={size} className="flex-shrink-0" />,
	},
	{
		// "Wineries", "Breweries", "Distilleries", "Cideries" (and singular forms)
		match: /^(?:winer(?:y|ies)|brewer(?:y|ies)|distiller(?:y|ies)|cider(?:y|ies))(?=\s|$)/i,
		backgroundColor: '#BFC4FF',
		iconBaseSize: 20,
		renderIcon: (size) => <WineBeerSpiritsIcon size={size} className="flex-shrink-0" />,
	},
	{
		match: /^restaurants?(?=\s|$)/i,
		backgroundColor: '#C3FBD1',
		iconBaseSize: 20,
		renderIcon: (size) => <RestaurantsIcon size={size} className="flex-shrink-0" />,
	},
	{
		match: /^coffee\s*shops?(?=\s|$)/i,
		// In the dashboard Campaigns table we use a fixed-width category pill for alignment,
		// so keep this label compact to avoid truncation.
		displayTextTable: 'Coffee',
		backgroundColor: '#D6F1BD',
		iconBaseSize: 13,
		renderIcon: (size) => <CoffeeShopsIcon size={size} className="flex-shrink-0" />,
	},
	{
		match: /^music\s*venues?(?=\s|$)/i,
		displayTextTable: 'Venues',
		backgroundColor: '#B7E5FF',
		iconBaseSize: 24,
		renderIcon: (size) => <MusicVenuesIcon size={size} className="flex-shrink-0" />,
	},
	{
		// Our UI sometimes uses "Festivals" and sometimes "Music Festivals"
		match: /^(?:music\s*)?festivals?(?=\s|$)/i,
		backgroundColor: '#C1D6FF',
		iconBaseSize: 20,
		renderIcon: (size) => <FestivalsIcon size={size} className="flex-shrink-0" />,
	},
	{
		// "Wedding Planner(s)" (and singular forms)
		match: /^wedding\s*planners?(?=\s|$)/i,
		displayTextTable: 'Wedding',
		backgroundColor: '#FFF2BC',
		iconBaseSize: 20,
		renderIcon: (size) => <WeddingPlannersIcon size={size} className="flex-shrink-0" />,
	},
	{
		// "Wedding Venue(s)" (and singular forms)
		match: /^wedding\s*venues?(?=\s|$)/i,
		backgroundColor: '#FFF2BC',
		iconBaseSize: 20,
		renderIcon: (size) => <WeddingPlannersIcon size={size} className="flex-shrink-0" />,
	},
	{
		match: /^radio\s*stations?(?=\s|$)/i,
		displayTextTable: 'Radio',
		backgroundColor: '#E8EFFF',
		iconBaseSize: 22,
		renderIcon: (size) => <RadioStationsIcon size={size} className="flex-shrink-0" />,
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

const sizeStyles = (size: CampaignTitlePillsSize) => {
	if (size === 'table') {
		return {
			pillHeight: 'h-[16px]',
			pillPx: 'px-[6px]',
			categoryGap: 'gap-[6px]',
			// Dashboard Campaigns table: keep category pills a consistent width
			// so the trailing "in" + state pill align row-to-row.
			categoryPillWidthClassName: 'w-[111px] min-w-[111px] max-w-[111px]',
			categoryTextClassName: 'flex-1 min-w-0 truncate',
			// Reserve a fixed icon "slot" so different SVGs don't appear to drift left/right.
			categoryIconWrapperClassName:
				'ml-auto flex-none w-[15px] h-[15px] inline-flex items-center justify-center translate-x-[1px] [&>svg]:block',
			// Dashboard Campaigns table: keep state pills a consistent width
			// so every row lines up cleanly.
			statePillWidthClassName: 'w-[49px] min-w-[49px] max-w-[49px]',
			// Slightly tighter padding so 2-letter states + icon fit in 49px.
			statePillPxClassName: 'px-[4px]',
			// Use justify-between (instead of a fixed gap) inside a fixed-width pill.
			stateGap: 'justify-between',
			// Slightly smaller icon so it breathes in the 49px pill.
			stateIconSize: '[&>svg]:w-[14px] [&>svg]:h-[11px] [&>svg]:block',
			supClassName: 'ml-[3px] text-[10px] leading-none',
			// Fixed spacing region between category pill and state pill.
			// This makes the Campaigns table titles feel uniform row-to-row.
			inWordSpacingClassName: 'w-[33px] mx-0 text-center flex-none',
			iconScale: 16 / 26,
		} as const;
	}

	return {
		pillHeight: 'h-[26px]',
		pillPx: 'px-[8px]',
		categoryGap: 'gap-[7px]',
		categoryPillWidthClassName: '',
		categoryTextClassName: '',
		categoryIconWrapperClassName: '',
		statePillWidthClassName: '',
		statePillPxClassName: '',
		stateGap: 'gap-[10px]',
		stateIconSize: '[&>svg]:w-[23px] [&>svg]:h-[18px] [&>svg]:block',
		supClassName: 'ml-[3px] text-[14px] leading-none',
		inWordSpacingClassName: 'mx-[6px]',
		iconScale: 1,
	} as const;
};

const scaledIconSize = (base: number, size: CampaignTitlePillsSize) => {
	const { iconScale } = sizeStyles(size);
	const next = Math.round(base * iconScale);
	return Math.max(8, next);
};

const renderCampaignTitleWithStatePill = (title: string, size: CampaignTitlePillsSize): ReactNode => {
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

	const {
		pillHeight,
		pillPx,
		stateGap,
		statePillWidthClassName,
		statePillPxClassName,
		stateIconSize,
		supClassName,
		inWordSpacingClassName,
	} = sizeStyles(size);
	const { abbr, locationForIcon, citationNumber } = parsedLocation;

	// Use the same state icon + background used across "Where" and contact-row state boxes.
	const { icon } = getCityIconProps('', locationForIcon);
	const backgroundColor = stateBadgeColorMap[abbr] ?? 'transparent';

	return (
		<>
			{(() => {
				// Don't rely on literal whitespace for pill spacing at small font sizes.
				// Render the trailing "in" as its own token with explicit margins.
				const prefixMatch = prefix.match(/^(.*?)(\bin\b)\s*$/i);
				if (!prefixMatch) return prefix;

				const beforeInRaw = prefixMatch[1] ?? '';
				const inWord = prefixMatch[2] ?? '';
				const beforeInText = beforeInRaw.replace(/\s+$/g, '');

				return (
					<>
						{beforeInText || null}
						{inWord ? (
							<span className={cn('inline-block', inWordSpacingClassName)}>{inWord}</span>
						) : null}
					</>
				);
			})()}
			<span
				className={cn(
					'inline-flex items-center rounded-[5px] align-middle flex-none',
					pillHeight,
					pillPx,
					statePillPxClassName,
					statePillWidthClassName,
					stateGap
				)}
				style={{ backgroundColor }}
			>
				<span className="leading-none flex-none">{abbr}</span>
				<span
					className={cn(
						'inline-flex items-center justify-center translate-y-[1px] flex-none',
						stateIconSize
					)}
				>
					{icon}
				</span>
			</span>
			{citationNumber ? <sup className={supClassName}>{citationNumber}</sup> : null}
			{trailingPunctuation}
		</>
	);
};

const renderCampaignTitleWithCategoryPill = (
	title: string,
	size: CampaignTitlePillsSize
): ReactNode => {
	const safeTitle = title ?? '';
	if (!safeTitle) return safeTitle;

	const leadingWhitespace = safeTitle.match(/^\s*/)?.[0] ?? '';
	const restTitle = safeTitle.slice(leadingWhitespace.length);
	if (!restTitle) return safeTitle;

	const {
		pillHeight,
		pillPx,
		categoryGap,
		categoryPillWidthClassName,
		categoryTextClassName,
		categoryIconWrapperClassName,
	} = sizeStyles(size);

	for (const spec of CAMPAIGN_TITLE_PILL_SPECS) {
		const match = restTitle.match(spec.match);
		const matchedText = match?.[0];
		if (!matchedText) continue;

		const suffix = restTitle.slice(matchedText.length);
		const displayText = (() => {
			const next =
				size === 'table' && spec.displayTextTable !== undefined
					? spec.displayTextTable
					: spec.displayText;
			return typeof next === 'function'
				? next(matchedText)
				: (next ?? matchedText);
		})();
		const iconSize = scaledIconSize(spec.iconBaseSize, size);
		return (
			<>
				{leadingWhitespace}
				<span
					className={cn(
						'inline-flex items-center rounded-[5px] align-middle min-w-0 flex-none',
						pillHeight,
						pillPx,
						categoryGap,
						categoryPillWidthClassName
					)}
					style={{ backgroundColor: spec.backgroundColor }}
				>
					<span className={cn('leading-none', categoryTextClassName)}>{displayText}</span>
					<span
						className={cn(
							'translate-y-[1px]',
							categoryIconWrapperClassName,
							spec.iconWrapperClassName
						)}
					>
						{spec.renderIcon(iconSize)}
					</span>
				</span>
				{renderCampaignTitleWithStatePill(suffix, size)}
			</>
		);
	}

	return renderCampaignTitleWithStatePill(safeTitle, size);
};

export const CampaignTitlePills: FC<{ title: string; size?: CampaignTitlePillsSize }> = ({
	title,
	size = 'header',
}) => {
	return <>{renderCampaignTitleWithCategoryPill(title, size)}</>;
};

