'use client';

import {
	FC,
	Fragment,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { debounce } from 'lodash';
import { ContactWithName } from '@/types/contact';
import {
	useGetContactNote,
	useUpsertContactNote,
} from '@/hooks/queryHooks/useContactNotes';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { WebsiteIcon } from '@/components/atoms/_svg/WebsiteIcon';

const RESEARCH_PANEL_DEFAULT_WIDTH = 375;
const RESEARCH_PANEL_DEFAULT_HEIGHT = 672;
const RESEARCH_PANEL_BORDER_WIDTH = 1.913;
const RESEARCH_PANEL_ABRIDGED_WIDTH = 272.425;
const RESEARCH_PANEL_ABRIDGED_HEIGHT = 312.713;
const RESEARCH_PANEL_ABRIDGED_BORDER_WIDTH = 1.835;
const RESEARCH_PANEL_ABRIDGED_RADIUS = 11.012;
const RESEARCH_PANEL_ABRIDGED_HEADER_HEIGHT = 62;
const RESEARCH_PANEL_ABRIDGED_STRIPE_HEIGHT = 12;
const RESEARCH_PANEL_ABRIDGED_ADDRESS_HEIGHT = 28;
const RESEARCH_PANEL_ABRIDGED_HEADLINE_HEIGHT = 36;
const RESEARCH_PANEL_ABRIDGED_SMALL_ROW_HEIGHT = 22;
// Leftover metadata-area space required to show the inline Notes box
// ("Notes" label + a usable ~5-line textarea); below this we show "+Notes".
const NOTES_MIN_INLINE_SPACE_PX = 130;
const NOTES_EXPANDED_HEIGHT_PX = 280;

const RESEARCH_PANEL_BANDS = [
	{ top: 0, height: 52, color: '#FFFFFF' },
	{ top: 52, height: 13, color: '#F67C7E' },
	{ top: 65, height: 25, color: '#ABDCF9' },
	{ top: 90, height: 48, color: '#BBE0F5' },
	{ top: 138, height: 24, color: '#D2EFFF' },
	{ top: 162, height: 24, color: '#E8F7FF' },
	{ top: 186, height: 24, color: '#EDF8FF' },
	{ top: 210, height: 24, color: '#F4FBFF' },
	{ top: 234, height: 24, color: '#F8FCFF' },
] as const;

const RESEARCH_PANEL_METADATA_TOP = 258;
const RESEARCH_PANEL_DIVIDER_TOPS = [52, 65, 90, 138, 162, 186, 210, 234, 258] as const;
const RESEARCH_PANEL_HEADER_NAME_STYLE = {
	color: '#000',
	fontFamily: 'Inter',
	fontSize: '16.748px',
	fontStyle: 'normal',
	fontWeight: 500,
	lineHeight: '22.33px',
} as const;

const toCssSize = (value: string | number) =>
	typeof value === 'number' ? `${value}px` : value;

const TEXT_RIGHT_FADE_MASK =
	'linear-gradient(to right, #000 calc(100% - 24px), transparent)';
const TEXT_BOTTOM_FADE_MASK =
	'linear-gradient(to bottom, #000 calc(100% - 14px), transparent)';
const HEADLINE_BOTTOM_FADE_MASK =
	'linear-gradient(to bottom, #000 calc(100% - 8px), transparent)';

const singleLineTextFadeStyle = {
	overflow: 'hidden',
	textOverflow: 'clip',
	whiteSpace: 'nowrap',
	WebkitMaskImage: TEXT_RIGHT_FADE_MASK,
	maskImage: TEXT_RIGHT_FADE_MASK,
} as const;

const multiLineTextFadeStyle = {
	overflow: 'hidden',
	WebkitMaskImage: TEXT_BOTTOM_FADE_MASK,
	maskImage: TEXT_BOTTOM_FADE_MASK,
} as const;

const headlineTextFadeStyle = {
	overflow: 'hidden',
	WebkitMaskImage: HEADLINE_BOTTOM_FADE_MASK,
	maskImage: HEADLINE_BOTTOM_FADE_MASK,
} as const;

type ContactTitleCategoryKind =
	| 'restaurant'
	| 'coffee-shop'
	| 'music-venue'
	| 'music-festival'
	| 'wedding-planner'
	| 'wedding-venue'
	| 'wine-beer-spirits'
	| 'custom';

const getContactTitleCategory = (title: string | null | undefined) => {
	const value = title?.trim();
	if (!value) return null;

	if (isRestaurantTitle(value)) {
		return {
			kind: 'restaurant' as const,
			label: 'Restaurant',
			backgroundColor: '#C3FBD1',
		};
	}
	if (isCoffeeShopTitle(value)) {
		return {
			kind: 'coffee-shop' as const,
			label: 'Coffee Shop',
			backgroundColor: '#D6F1BD',
		};
	}
	if (isMusicVenueTitle(value)) {
		return {
			kind: 'music-venue' as const,
			label: 'Music Venue',
			backgroundColor: '#B7E5FF',
		};
	}
	if (isMusicFestivalTitle(value)) {
		return {
			kind: 'music-festival' as const,
			label: 'Music Festival',
			backgroundColor: '#C1D6FF',
		};
	}
	if (isWeddingPlannerTitle(value)) {
		return {
			kind: 'wedding-planner' as const,
			label: 'Wedding Planner',
			backgroundColor: '#FFF2BC',
		};
	}
	if (isWeddingVenueTitle(value)) {
		return {
			kind: 'wedding-venue' as const,
			label: 'Wedding Venue',
			backgroundColor: '#FFF2BC',
		};
	}
	if (isWineBeerSpiritsTitle(value)) {
		return {
			kind: 'wine-beer-spirits' as const,
			label: getWineBeerSpiritsLabel(value) || 'Wine/Beer/Spirits',
			backgroundColor: '#BFC4FF',
		};
	}

	return {
		kind: 'custom' as const,
		label: value,
		backgroundColor: '#E8EFFF',
	};
};

const renderContactTitleCategoryIcon = (
	kind: ContactTitleCategoryKind,
	size = 12
) => {
	switch (kind) {
		case 'restaurant':
			return (
				<RestaurantsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'coffee-shop':
			return (
				<CoffeeShopsIcon
					size={Math.round(size * (7 / 12))}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'music-venue':
			return (
				<MusicVenuesIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'music-festival':
			return (
				<FestivalsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'wedding-planner':
		case 'wedding-venue':
			return (
				<WeddingPlannersIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'wine-beer-spirits':
			return (
				<WineBeerSpiritsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'custom':
			return null;
	}
};

export interface ContactResearchPanelProps {
	contact: ContactWithName | null | undefined;
	variant?: 'default' | 'abridged';
	className?: string;
	style?: React.CSSProperties;
	/** Overrides the displayed business/category description for compact map hovers. */
	displayHeadline?: string;
	/** Overrides category detection when the row uses a search-derived category label. */
	displayTitleCategory?: string;
	/**
	 * When true, renders the full panel chrome but hides all textual content.
	 * Used for the Drafts tab empty state so research details aren't shown
	 * while still keeping the layout skeleton visible.
	 */
	hideAllText?: boolean;
	/**
	 * If true, hides the summary box at the bottom when bullet points (parsed sections) are present.
	 * If no bullet points are present, the summary box is still shown (as the only content).
	 */
	hideSummaryIfBullets?: boolean;
	/**
	 * Fixed height override for the panel.
	 */
	height?: string | number;
	/**
	 * In fixed-height mode (when `height` is provided), controls the vertical spacing increment
	 * between parsed bullet boxes. Defaults to 52 (legacy compact spacing).
	 */
	fixedHeightBoxSpacingPx?: number;
	/**
	 * In fixed-height mode (when `height` is provided), overrides the parsed bullet outer box height.
	 * Defaults to 44 (legacy compact bullet height).
	 */
	fixedHeightBulletOuterHeightPx?: number;
	/**
	 * In fixed-height mode (when `height` is provided), overrides the parsed bullet inner white box height.
	 * Defaults to 36 (legacy compact bullet inner height).
	 */
	fixedHeightBulletInnerHeightPx?: number;
	/**
	 * When showing parsed bullets + the bottom summary in fixed-height mode, allow the summary box
	 * to expand to fill the remaining available height (useful when the outer `height` is computed dynamically).
	 */
	expandSummaryToFillHeight?: boolean;
	/**
	 * Width override for the panel and inner content boxes. Defaults to 360px for inner boxes, 375px for outer.
	 */
	boxWidth?: number;
	/**
	 * Width override for the outer container. Defaults to boxWidth + 15 (or 375px).
	 */
	width?: number;
	/**
	 * When true, uses a compact 19px header with smaller font (for All tab).
	 */
	compactHeader?: boolean;
	/**
	 * When true, prevents bullet points from expanding on click.
	 * Useful for demo/landing page views where interaction should be limited.
	 */
	disableExpansion?: boolean;
}

// Parse metadata sections [1], [2], etc. from the contact metadata field.
// Only includes sequential sections starting from [1] that have meaningful content.
const parseMetadataSections = (metadata: string | null | undefined) => {
	if (!metadata) return {};

	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		const sectionNum = match[1];
		const content = match[2].trim();
		allSections[sectionNum] = content;
	}

	const sections: Record<string, string> = {};
	let expectedNum = 1;

	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		const meaningfulContent = content.replace(/[.\s,;:!?'")(\-–—]/g, '').trim();

		if (meaningfulContent.length < 5) {
			break;
		}

		sections[String(expectedNum)] = content;
		expectedNum++;
	}

	if (Object.keys(sections).length < 3) {
		return {};
	}

	return sections;
};

const ContactResearchPanelAbridged: FC<
	Pick<
		ContactResearchPanelProps,
		| 'contact'
		| 'className'
		| 'style'
		| 'hideAllText'
		| 'displayHeadline'
		| 'displayTitleCategory'
	>
> = ({
	contact,
	className,
	style,
	hideAllText = false,
	displayHeadline,
	displayTitleCategory,
}) => {
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const personalName = fullName || contact?.name?.trim() || '';
	const companyName = contact?.company?.trim() || '';
	const displayName = contact
		? personalName || companyName || 'Unknown'
		: 'Loading';
	const showCompanyName = Boolean(personalName && companyName);
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';
	const coordinateText = [latitude, longitude].filter(Boolean).join('   ');
	const stateAbbr = getStateAbbreviation(contact?.state || '').trim();
	const cityText = contact?.city?.trim() || '';
	const addressText = contact?.address?.trim() || '';
	const headlineText =
		displayHeadline?.trim() || contact?.headline?.trim() || contact?.title?.trim() || '';
	const categorySource =
		displayTitleCategory?.trim() || contact?.title?.trim() || headlineText || '';
	const titleCategory = getContactTitleCategory(categorySource);
	const titleCategoryIcon = titleCategory
		? renderContactTitleCategoryIcon(titleCategory.kind, 14)
		: null;
	const companyTypeText = contact?.companyType?.trim() || '';
	const foundedYearText = contact?.companyFoundedYear?.trim() || '';
	const websiteText = contact?.website?.trim() || '';
	const hasKeywords = Boolean(
		contact?.companyKeywords?.some((keyword) => keyword.trim().length > 0)
	);
	const textStyle = hideAllText ? { color: 'transparent' } : undefined;
	const smallRowHeight = `${RESEARCH_PANEL_ABRIDGED_SMALL_ROW_HEIGHT}px`;
	const rowTextBase = {
		color: '#000',
		fontFamily: 'Inter',
		fontSize: '14.2px',
		fontStyle: 'normal',
		fontWeight: 500,
		lineHeight: '16px',
		...(textStyle || {}),
	} as const;
	const detailRows: Array<{
		key: string;
		color: string;
		render: (top: number) => React.ReactNode;
	}> = [];

	if (titleCategory || categorySource) {
		detailRows.push({
			key: 'title-category',
			color: '#D2EFFF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					<div className="flex items-center justify-start">{titleCategoryIcon}</div>
					<span
						className="block w-full min-w-0"
						style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
					>
						{titleCategory?.label || categorySource}
					</span>
				</div>
			),
		});
	}

	if (companyTypeText) {
		detailRows.push({
			key: 'company-type',
			color: '#E8F7FF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 flex items-center overflow-hidden text-left"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					<span
						className="block w-full"
						style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
					>
						{companyTypeText}
					</span>
				</div>
			),
		});
	}

	if (stateAbbr || cityText) {
		detailRows.push({
			key: 'location',
			color: '#EDF8FF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 flex items-center gap-[6px] overflow-hidden text-left"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					{stateAbbr && <span style={rowTextBase}>{stateAbbr}</span>}
					{cityText && (
						<span
							className="block min-w-0 flex-1"
							style={{ ...singleLineTextFadeStyle, ...rowTextBase, fontWeight: 700 }}
						>
							{cityText}
						</span>
					)}
				</div>
			),
		});
	}

	if (foundedYearText) {
		detailRows.push({
			key: 'founded-year',
			color: '#F4FBFF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 flex items-center overflow-hidden text-left"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					<span
						className="block w-full"
						style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
					>
						Founded {foundedYearText}
					</span>
				</div>
			),
		});
	}

	if (websiteText) {
		detailRows.push({
			key: 'website',
			color: '#F8FCFF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					<div className="flex items-center justify-start">
						<WebsiteIcon size={15} className="flex-shrink-0" />
					</div>
					<span
						className="block w-full min-w-0"
						style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
					>
						Website
					</span>
				</div>
			),
		});
	}

	if (hasKeywords) {
		detailRows.push({
			key: 'keywords',
			color: '#FCFDFF',
			render: (top) => (
				<div
					className="absolute left-[20px] right-[13px] z-10 flex items-center overflow-hidden text-left"
					style={{ top: `${top}px`, height: smallRowHeight }}
				>
					<span
						className="block w-full"
						style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
					>
						Keywords
					</span>
				</div>
			),
		});
	}

	detailRows.push({
		key: 'see-more',
		color: '#F8FAFF',
		render: (top) => (
			<div
				className="absolute left-[20px] right-[13px] z-10 flex items-center overflow-hidden text-left"
				style={{ top: `${top}px`, height: smallRowHeight }}
			>
				<span
					className="block w-full"
					style={{ ...singleLineTextFadeStyle, ...rowTextBase }}
				>
					See More...
				</span>
			</div>
		),
	});

	let nextBandTop = 0;
	const panelBands: Array<{ key: string; top: number; height: number; color: string }> = [];
	const pushBand = (key: string, height: number, color: string) => {
		panelBands.push({ key, top: nextBandTop, height, color });
		nextBandTop += height;
	};
	pushBand('header', RESEARCH_PANEL_ABRIDGED_HEADER_HEIGHT, '#F8FAFF');
	pushBand('stripe', RESEARCH_PANEL_ABRIDGED_STRIPE_HEIGHT, '#F67C7E');
	if (addressText) pushBand('address', RESEARCH_PANEL_ABRIDGED_ADDRESS_HEIGHT, '#ABDCF9');
	if (headlineText) pushBand('headline', RESEARCH_PANEL_ABRIDGED_HEADLINE_HEIGHT, '#BBE0F5');
	const positionedDetailRows = detailRows.map((row) => {
		const top = nextBandTop;
		pushBand(row.key, RESEARCH_PANEL_ABRIDGED_SMALL_ROW_HEIGHT, row.color);
		return { ...row, top };
	});
	const dividerTops = panelBands.slice(1).map((band) => band.top);
	const panelHeight = Math.min(RESEARCH_PANEL_ABRIDGED_HEIGHT, nextBandTop);

	return (
		<div
			data-contact-research-panel="true"
			data-contact-research-panel-variant="abridged"
			className={cn('relative block overflow-hidden text-black', className)}
			style={{
				width: `${RESEARCH_PANEL_ABRIDGED_WIDTH}px`,
				height: `${panelHeight}px`,
				borderRadius: `${RESEARCH_PANEL_ABRIDGED_RADIUS}px`,
				border: `${RESEARCH_PANEL_ABRIDGED_BORDER_WIDTH}px solid #000`,
				background: '#F8FAFF',
				...style,
			}}
			data-hover-description="Research: Background info and notes for the selected contact."
			role="region"
			aria-label="Abridged research panel"
		>
			<div className="absolute inset-0 rounded-[inherit] overflow-hidden">
				{panelBands.map((band) => (
					<div
						key={band.key}
						className="absolute left-0 right-0"
						style={{
							top: `${band.top}px`,
							height: `${band.height}px`,
							backgroundColor: band.color,
						}}
					/>
				))}
			</div>

			{dividerTops.map((top) => (
				<div
					key={top}
					className="absolute left-0 right-0 bg-black"
					style={{
						top: `${top}px`,
						height: `${RESEARCH_PANEL_ABRIDGED_BORDER_WIDTH}px`,
					}}
				/>
			))}

			<div
				className="absolute left-[14px] right-[10px] top-0 z-10 flex items-center font-inter text-left text-black"
				style={{ height: `${RESEARCH_PANEL_ABRIDGED_HEADER_HEIGHT}px` }}
			>
				<div className="min-w-0 pr-[112px]">
					<div
						className="block w-full min-w-0"
						style={{
							...singleLineTextFadeStyle,
							color: '#000',
							fontFamily: 'Inter',
							fontSize: '17.5px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '20px',
							...(textStyle || {}),
						}}
					>
						{displayName}
					</div>
					{showCompanyName && (
						<div
							className="mt-[1px] block w-full min-w-0"
							style={{
								...singleLineTextFadeStyle,
								color: '#000',
								fontFamily: 'Inter',
								fontSize: '17px',
								fontStyle: 'normal',
								fontWeight: 400,
								lineHeight: '19px',
								...(textStyle || {}),
							}}
						>
							{companyName}
						</div>
					)}
				</div>
				{coordinateText && (
					<div
						className="absolute right-0 top-[8px] whitespace-nowrap"
						style={{
							color: '#000',
							fontFamily: 'Inter',
							fontSize: '11.4px',
							fontStyle: 'normal',
							fontWeight: 700,
							lineHeight: '13px',
							...(textStyle || {}),
						}}
					>
						{coordinateText}
					</div>
				)}
			</div>

			{addressText && (
				<div
					className="absolute left-[16px] right-[10px] z-10 flex items-center justify-center overflow-hidden text-center"
					style={{
						top: `${RESEARCH_PANEL_ABRIDGED_HEADER_HEIGHT + RESEARCH_PANEL_ABRIDGED_STRIPE_HEIGHT}px`,
						height: `${RESEARCH_PANEL_ABRIDGED_ADDRESS_HEIGHT}px`,
						...rowTextBase,
					}}
				>
					<span className="block w-full" style={singleLineTextFadeStyle}>
						{addressText}
					</span>
				</div>
			)}

			{headlineText && (
				<div
					className="absolute left-[21px] right-[13px] z-10 flex items-center overflow-hidden text-left"
					style={{
						top: `${panelBands.find((band) => band.key === 'headline')?.top ?? 0}px`,
						height: `${RESEARCH_PANEL_ABRIDGED_HEADLINE_HEIGHT}px`,
						color: '#000',
						fontFamily: 'Inter',
						fontSize: '14.2px',
						fontStyle: 'normal',
						fontWeight: 700,
						lineHeight: '18px',
						...(textStyle || {}),
					}}
				>
					<span
						className="block w-full"
						style={{
							// Clamp to the band's two 18px lines so long headlines
							// ellipsize instead of clipping mid-line.
							display: '-webkit-box',
							WebkitBoxOrient: 'vertical',
							WebkitLineClamp: 2,
							overflow: 'hidden',
						}}
					>
						{headlineText}
					</span>
				</div>
			)}

			{positionedDetailRows.map((row) => (
				<Fragment key={row.key}>{row.render(row.top)}</Fragment>
			))}
		</div>
	);
};

// Metadata scroll area of the full-size panel, plus the per-user Notes UI.
// Notes only activate when contactId is non-null (full-size, signed-in hosts);
// otherwise this renders the metadata area exactly as before.
const ResearchMetadataNotesArea: FC<{
	metadataTop: number;
	metadataText: string;
	textStyle?: { color: string };
	contactId: number | null;
}> = ({ metadataTop, metadataText, textStyle, contactId }) => {
	const { isSignedIn } = useAuth();
	const enabled = Boolean(isSignedIn && contactId);

	const areaRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const [leftoverPx, setLeftoverPx] = useState<number | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);

	useLayoutEffect(() => {
		if (!enabled) {
			return;
		}
		const measure = () => {
			const area = areaRef.current;
			if (!area) {
				return;
			}
			const textHeight = textRef.current?.offsetHeight ?? 0;
			setLeftoverPx(area.clientHeight - textHeight);
		};
		measure();
		const observer = new ResizeObserver(measure);
		if (areaRef.current) {
			observer.observe(areaRef.current);
		}
		if (textRef.current) {
			observer.observe(textRef.current);
		}
		return () => observer.disconnect();
	}, [enabled, metadataText]);

	const { data: note, isFetched } = useGetContactNote(enabled ? contactId : null);
	const { mutate: saveNote } = useUpsertContactNote({ suppressToasts: true });
	const [draft, setDraft] = useState<string | null>(null);

	const debouncedSave = useMemo(
		() =>
			debounce((id: number, content: string) => {
				saveNote({ contactId: id, content });
			}, 1500),
		[saveNote]
	);
	// Reset edit state when the contact changes; the cleanup flushes any pending
	// save (lodash flush re-invokes with the last args, which still carry the
	// previous contact id) and also covers unmount.
	useEffect(() => {
		setDraft(null);
		setIsExpanded(false);
		return () => {
			debouncedSave.flush();
		};
	}, [contactId, debouncedSave]);

	const noteValue = draft ?? note?.content ?? '';
	const handleNoteChange = (value: string) => {
		setDraft(value);
		if (contactId) {
			debouncedSave(contactId, value);
		}
	};

	const mode: 'none' | 'inline' | 'collapsible' =
		!enabled || leftoverPx === null
			? 'none'
			: leftoverPx >= NOTES_MIN_INLINE_SPACE_PX
				? 'inline'
				: 'collapsible';
	// Never show an editable box before the existing note has loaded, so an
	// empty draft can't overwrite saved content.
	const showNotesUi = mode !== 'none' && isFetched;

	return (
		<div
			className="research-panel-metadata-scroll absolute left-0 right-0 bottom-0 z-10"
			style={{ top: `${metadataTop}px` }}
		>
			<div className="h-full pl-[23px] pr-[17px] pt-[11px] pb-[22px] overflow-hidden">
				<div ref={areaRef} className="h-full">
					<CustomScrollbar
						className="h-full"
						thumbWidth={0}
						thumbColor="transparent"
						trackColor="transparent"
						lockHorizontalScroll
					>
						<div
							ref={textRef}
							className="whitespace-pre-wrap break-words"
							style={{
								color: '#000',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 400,
								lineHeight: '121.531%',
								...(textStyle || {}),
							}}
						>
							{metadataText}
						</div>
					</CustomScrollbar>
				</div>
			</div>

			{showNotesUi && mode === 'inline' && (
				<div
					data-contact-notes="inline"
					className="absolute left-[23px] right-[17px] bottom-[16px] z-20 flex flex-col"
					style={{ height: `${Math.max(leftoverPx! - 12, 0)}px` }}
					onWheel={(e) => e.stopPropagation()}
				>
					<div className="font-inter text-[14.349px] font-semibold text-black">
						Notes
					</div>
					<textarea
						value={noteValue}
						onChange={(e) => handleNoteChange(e.target.value)}
						placeholder="Add notes…"
						className="mt-[4px] w-full min-h-0 flex-1 resize-none rounded-[8px] border-0 bg-[#E6F6FF] px-[10px] py-[8px] font-inter text-[14.349px] text-black outline-none"
						style={{ lineHeight: '121.531%' }}
					/>
				</div>
			)}

			{showNotesUi && mode === 'collapsible' && !isExpanded && (
				<button
					type="button"
					data-contact-notes="toggle"
					onClick={() => setIsExpanded(true)}
					className="absolute bottom-[5px] left-[23px] z-20 rounded-[4px] bg-[#FCFDFF]/90 px-[3px] font-inter text-[14.349px] font-semibold text-black"
				>
					+Notes
				</button>
			)}

			{showNotesUi && mode === 'collapsible' && isExpanded && (
				<div
					data-contact-notes="expanded"
					className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-[#FCFDFF] pl-[23px] pr-[17px] pt-[6px] pb-[16px]"
					style={{
						height: `${Math.min(
							NOTES_EXPANDED_HEIGHT_PX,
							(areaRef.current?.clientHeight ?? NOTES_EXPANDED_HEIGHT_PX) - 60
						)}px`,
						borderTop: `${RESEARCH_PANEL_BORDER_WIDTH}px solid #000`,
					}}
					onWheel={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={() => setIsExpanded(false)}
						className="self-start font-inter text-[14.349px] font-semibold text-black"
					>
						Notes
					</button>
					<textarea
						autoFocus
						value={noteValue}
						onChange={(e) => handleNoteChange(e.target.value)}
						placeholder="Add notes…"
						className="mt-[4px] w-full min-h-0 flex-1 resize-none rounded-[8px] border-0 bg-[#E6F6FF] px-[10px] py-[8px] font-inter text-[14.349px] text-black outline-none"
						style={{ lineHeight: '121.531%' }}
					/>
				</div>
			)}
		</div>
	);
};

export const ContactResearchPanel: FC<ContactResearchPanelProps> = ({
	contact,
	variant = 'default',
	className,
	style,
	hideAllText = false,
	displayHeadline,
	displayTitleCategory,
	height,
	width,
	boxWidth,
}) => {
	if (variant === 'abridged') {
		return (
			<ContactResearchPanelAbridged
				contact={contact}
				className={className}
				style={style}
				hideAllText={hideAllText}
				displayHeadline={displayHeadline}
				displayTitleCategory={displayTitleCategory}
			/>
		);
	}

	const panelWidth = width ?? RESEARCH_PANEL_DEFAULT_WIDTH;
	const panelHeight = height ?? RESEARCH_PANEL_DEFAULT_HEIGHT;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const personalName = fullName || contact?.name?.trim() || '';
	const companyName = contact?.company?.trim() || '';
	const isCompanyOnlyHeader = Boolean(
		!hideAllText && contact && companyName && !personalName
	);
	const headerHeight = isCompanyOnlyHeader ? 45 : 52;
	const topDetailStart = headerHeight + 13;
	const displayName = contact ? personalName || companyName || 'Unknown' : 'Loading';
	const showCompanyName = Boolean(personalName && companyName);
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';
	const coordinateText = [latitude, longitude].filter(Boolean).join('   ');
	const addressText = contact?.address?.trim() || '';
	const headlineText = contact?.headline?.trim() || contact?.title?.trim() || '';
	const titleCategory = getContactTitleCategory(contact?.title);
	const titleCategoryIcon = titleCategory
		? renderContactTitleCategoryIcon(titleCategory.kind, 16)
		: null;
	const companyTypeText = contact?.companyType?.trim() || '';
	const stateAbbr = getStateAbbreviation(contact?.state || '').trim();
	const cityText = contact?.city?.trim() || '';
	const foundedYearText = contact?.companyFoundedYear?.trim() || '';
	const websiteText = contact?.website?.trim() || '';
	const metadataText = contact?.metadata || '';
	const textStyle = hideAllText ? { color: 'transparent' } : undefined;
	// Notes only apply to the full-size panel (375×672, e.g. the campaign
	// standard side panel passes height=672 explicitly); compact mounts pass
	// smaller sizes and are excluded.
	const notesEligible =
		!hideAllText &&
		panelWidth === RESEARCH_PANEL_DEFAULT_WIDTH &&
		panelHeight === RESEARCH_PANEL_DEFAULT_HEIGHT &&
		boxWidth === undefined &&
		typeof contact?.id === 'number';
	const notesContactId = notesEligible && contact ? contact.id : null;
	const headlineWidth =
		boxWidth ?? (typeof style?.width === 'number' ? style.width : panelWidth);
	const headlineCharsPerLine = Math.max(1, Math.floor((headlineWidth - 40) / 7.5));
	const isSingleLineHeadline =
		!headlineText.includes('\n') && headlineText.length <= headlineCharsPerLine;
	const headlineRowHeight = isSingleLineHeadline ? 24 : 48;
	const topDetailRows: Array<{
		key: string;
		height: number;
		color: string;
		render: (top: number) => React.ReactNode;
	}> = [];

	if (addressText) {
		topDetailRows.push({
			key: 'address',
			height: 25,
			color: '#ABDCF9',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start font-inter text-left text-black"
					style={{
						top: `${top}px`,
						height: '25px',
						fontSize: '14.349px',
						fontStyle: 'normal',
						fontWeight: 500,
						lineHeight: '16.419px',
						textAlign: 'left',
						...(textStyle || {}),
					}}
				>
					<span className="block w-full" style={singleLineTextFadeStyle}>
						{addressText}
					</span>
				</div>
			),
		});
	}

	if (headlineText) {
		topDetailRows.push({
			key: 'headline',
			height: headlineRowHeight,
			color: '#BBE0F5',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center font-inter text-left text-black"
					style={{
						top: `${top}px`,
						height: `${headlineRowHeight}px`,
						fontSize: '14.349px',
						fontStyle: 'normal',
						fontWeight: 600,
						lineHeight: isSingleLineHeadline ? '16.419px' : '24.392px',
						...(textStyle || {}),
					}}
				>
					<span
						style={{
							display: 'block',
							width: '100%',
							height: isSingleLineHeadline
								? '16.419px'
								: `${headlineRowHeight}px`,
							...headlineTextFadeStyle,
							...(isSingleLineHeadline
								? {
										textOverflow: 'clip',
										whiteSpace: 'nowrap',
									}
								: {}),
						}}
					>
						{headlineText}
					</span>
				</div>
			),
		});
	}

	if (titleCategory && !hideAllText) {
		topDetailRows.push({
			key: 'title-category',
			height: 24,
			color: '#D2EFFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div
						className={cn(
							'w-full items-center overflow-hidden',
							titleCategoryIcon
								? 'grid grid-cols-[18px_minmax(0,1fr)] gap-x-[8px]'
								: 'flex justify-start'
						)}
					>
						{titleCategoryIcon && (
							<div className="flex items-center justify-start">
								{titleCategoryIcon}
							</div>
						)}
						<span
							className="block min-w-0 w-full"
							style={{
								...singleLineTextFadeStyle,
								color: '#000',
								textAlign: 'left',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 500,
								lineHeight: '16.419px',
							}}
						>
							{titleCategory.label}
						</span>
					</div>
				</div>
			),
		});
	}

	if (companyTypeText && !hideAllText) {
		topDetailRows.push({
			key: 'company-type',
			height: 24,
			color: '#E8F7FF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<span
						className="block w-full"
						style={{
							...singleLineTextFadeStyle,
							color: '#000',
							textAlign: 'left',
							fontFamily: 'Inter',
							fontSize: '14.349px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '16.419px',
						}}
					>
						{companyTypeText}
					</span>
				</div>
			),
		});
	}

	if ((stateAbbr || cityText) && !hideAllText) {
		topDetailRows.push({
			key: 'location',
			height: 24,
			color: '#EDF8FF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div className="flex items-center justify-start">
						{stateAbbr && (
							<span
								style={{
									color: '#000',
									fontFamily: 'Inter',
									fontSize: '15.091px',
									fontStyle: 'normal',
									fontWeight: 400,
									lineHeight: '14.408px',
								}}
							>
								{stateAbbr}
							</span>
						)}
					</div>
					{cityText && (
						<span
							className="block min-w-0 w-full"
							style={{
								...singleLineTextFadeStyle,
								color: '#202020',
								fontFamily: 'Inter',
								fontSize: '15.091px',
								fontStyle: 'normal',
								fontWeight: 600,
								lineHeight: '14.408px',
							}}
						>
							{cityText}
						</span>
					)}
				</div>
			),
		});
	}

	if (foundedYearText && !hideAllText) {
		topDetailRows.push({
			key: 'founded-year',
			height: 24,
			color: '#F4FBFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<span
						className="block w-full"
						style={{
							...singleLineTextFadeStyle,
							color: '#000',
							textAlign: 'left',
							fontFamily: 'Inter',
							fontSize: '14.349px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '16.419px',
						}}
					>
						Founded {foundedYearText}
					</span>
				</div>
			),
		});
	}

	if (websiteText && !hideAllText) {
		topDetailRows.push({
			key: 'website',
			height: 24,
			color: '#F8FCFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div className="grid w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[9px] overflow-hidden">
						<div className="flex items-center justify-start">
							<WebsiteIcon className="flex-shrink-0" />
						</div>
						<span
							className="block min-w-0 w-full"
							style={{
								...singleLineTextFadeStyle,
								color: '#000',
								textAlign: 'left',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 500,
								lineHeight: '16.419px',
							}}
						>
							Website
						</span>
					</div>
				</div>
			),
		});
	}

	let nextTopDetailRowTop = topDetailStart;
	const positionedTopDetailRows = topDetailRows.map((row) => {
		const top = nextTopDetailRowTop;
		nextTopDetailRowTop += row.height;
		return { ...row, top };
	});
	const lastTopDetailRow = positionedTopDetailRows[positionedTopDetailRows.length - 1];
	const metadataTop = hideAllText
		? RESEARCH_PANEL_METADATA_TOP
		: lastTopDetailRow
			? lastTopDetailRow.top + lastTopDetailRow.height
			: topDetailStart;
	const panelBands = hideAllText
		? RESEARCH_PANEL_BANDS
		: [
				{ top: 0, height: headerHeight, color: '#FFFFFF' },
				{ top: headerHeight, height: 13, color: '#F67C7E' },
				...positionedTopDetailRows.map(({ top, height, color }) => ({
					top,
					height,
					color,
				})),
			];
	const dividerTops = hideAllText
		? RESEARCH_PANEL_DIVIDER_TOPS
		: [
				headerHeight,
				topDetailStart,
				...positionedTopDetailRows.map((row) => row.top + row.height),
			];

	return (
		<div
			data-contact-research-panel="true"
			className={cn(
				'relative block overflow-hidden rounded-[11.48px] border-[1.913px] border-black bg-[#F8FAFF] text-black',
				className
			)}
			style={{
				width: toCssSize(panelWidth),
				height: toCssSize(panelHeight),
				...style,
			}}
			data-hover-description="Research: Background info and notes for the selected contact."
			role="region"
			aria-label="Research panel"
		>
			<div className="absolute inset-0 rounded-[inherit] overflow-hidden">
				{panelBands.map((band) => (
					<div
						key={`${band.top}-${band.color}`}
						className="absolute left-0 right-0"
						style={{
							top: `${band.top}px`,
							height: `${band.height}px`,
							backgroundColor: band.color,
						}}
					/>
				))}
				<div
					className="absolute left-0 right-0 bottom-0"
					style={{
						top: `${metadataTop}px`,
						backgroundColor: '#FCFDFF',
					}}
				/>
			</div>

			{dividerTops.map((top) => (
				<div
					key={top}
					className="absolute left-0 right-0 bg-black"
					style={{
						top: `${top}px`,
						height: `${RESEARCH_PANEL_BORDER_WIDTH}px`,
					}}
				/>
			))}

			<div
				className={cn(
					'absolute left-[23px] right-[17px] top-[10px] z-10 font-inter text-left text-black',
					(isCompanyOnlyHeader || showCompanyName) && 'flex items-center'
				)}
				style={{
					...(textStyle || {}),
					...(isCompanyOnlyHeader || showCompanyName ? { top: 0 } : {}),
					height: `${isCompanyOnlyHeader || showCompanyName ? headerHeight : headerHeight - 10}px`,
				}}
			>
				<div className={cn('min-w-0 pr-[130px]', isCompanyOnlyHeader && 'w-full')}>
					<div
						className={cn(
							'block w-full min-w-0',
							!(isCompanyOnlyHeader || showCompanyName) &&
								'text-[18px] leading-[1.05] font-normal'
						)}
						style={{
							...singleLineTextFadeStyle,
							...(isCompanyOnlyHeader || showCompanyName
								? {
										...RESEARCH_PANEL_HEADER_NAME_STYLE,
										...(textStyle || {}),
									}
								: {}),
						}}
					>
						{displayName}
					</div>
					{showCompanyName && (
						<div
							className="min-w-0 overflow-hidden"
							style={{
								display: 'flex',
								width: '163.01px',
								height: '29.029px',
								marginTop: '-10px',
								flexDirection: 'column',
								justifyContent: 'center',
								...(textStyle || {}),
							}}
						>
							<span
								className="block w-full text-[17px] leading-[1.05] font-normal"
								style={singleLineTextFadeStyle}
							>
								{companyName}
							</span>
						</div>
					)}
				</div>
				{coordinateText && (
					<div
						className="absolute right-0 bottom-[-2px] whitespace-nowrap"
						style={{
							color: '#000',
							fontFamily: 'Inter',
							fontSize: '11.48px',
							fontStyle: 'normal',
							fontWeight: 600,
							lineHeight: '24.392px',
						}}
					>
						{coordinateText}
					</div>
				)}
			</div>

			{positionedTopDetailRows.map((row) => (
				<Fragment key={row.key}>{row.render(row.top)}</Fragment>
			))}

			<ResearchMetadataNotesArea
				metadataTop={metadataTop}
				metadataText={metadataText}
				textStyle={textStyle}
				contactId={notesContactId}
			/>
		</div>
	);
};

export default ContactResearchPanel;

/**
 * Horizontal, table-width version of the research panel.
 *
 * Intended for medium desktop widths where the right-side `ContactResearchPanel`
 * would be off-screen. Renders a 2x3 grid:
 * - Top-left: contact info summary box
 * - Remaining 5 cells: research bullets [1]-[5] in the order:
 *   [3]  [1]
 *   [4]  [2]
 *   [5]  (empty if missing)
 *
 * The layout is responsive but is designed around ~831px width and 224px height.
 */
export const ContactResearchHorizontalStrip: FC<
	Pick<ContactResearchPanelProps, 'contact' | 'className' | 'style'>
> = ({ contact, className, style }) => {
	const metadataSections = useMemo(
		() => parseMetadataSections(contact?.metadata),
		[contact?.metadata]
	);

	const sectionKeys = Object.keys(metadataSections);
	const hasParsedSections = sectionKeys.length >= 3;
	const hasUnparsedMetadata = !hasParsedSections && !!contact?.metadata;

	// Only show if we have parsed sections OR unparsed metadata
	if (!contact || (!hasParsedSections && !hasUnparsedMetadata)) {
		return null;
	}

	// Colors match the vertical panel for visual consistency
	const boxColorMap: Record<string, string> = {
		'1': '#158BCF',
		'2': '#43AEEC',
		'3': '#7CC9F6',
		'4': '#AADAF6',
		'5': '#D7F0FF',
	};

	// Order for numbered bullets to roughly match the design mock
	const orderedKeys: (keyof typeof boxColorMap)[] = ['3', '1', '4', '2', '5'];

	const renderBulletCell = (key: keyof typeof boxColorMap) => {
		const text = metadataSections[key];
		const hasText = !!text;

		// If this key isn't present, render a placeholder box with just fill color and stroke
		return (
			<div key={key} className="min-h-[82px] lg:min-h-[52px]">
				<div
					className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black flex items-stretch"
					style={{
						backgroundColor: boxColorMap[key],
					}}
				>
					{hasText && (
						<>
							<div className="flex items-center justify-center px-2">
								<span className="font-inter font-bold text-[11.5px] leading-none text-black">
									[{key}]
								</span>
							</div>
							<div className="flex-1 mr-[6px] my-[4px] bg-white border border-black rounded-[6px] px-[6px] py-[4px] flex items-center min-w-0">
								<div
									className="text-[13px] leading-[1.25] font-inter text-black horizontal-research-bullet-text"
									style={multiLineTextFadeStyle}
								>
									{text}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		);
	};

	const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const displayName = fullName || contact.name || contact.company || 'Unknown';
	const hasName = fullName.length > 0 || (contact.name && contact.name.length > 0);

	const stateAbbr = getStateAbbreviation(contact.state || '') || '';
	const titleCategory = getContactTitleCategory(contact.title);

	// Contact info box component (reused in both layouts)
	const contactInfoBox = (
		<div className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black bg-white px-3 py-[6px] flex items-center justify-between gap-3">
			<div className="flex flex-1 flex-col justify-center min-w-0">
				<div
					className="block w-full font-inter font-bold text-[14px] leading-tight text-black"
					style={singleLineTextFadeStyle}
				>
					{displayName}
				</div>
				{hasName && contact.company && (
					<div
						className="block w-full text-[11px] leading-tight text-[#4b4b4b]"
						style={singleLineTextFadeStyle}
					>
						{contact.company}
					</div>
				)}
				{!hasName && contact.title && (
					<div
						className="block w-full text-[11px] leading-tight text-[#4b4b4b]"
						style={singleLineTextFadeStyle}
					>
						{contact.title}
					</div>
				)}
			</div>
			<div className="flex flex-col items-start gap-[2px] flex-shrink-0">
				<div className="flex items-center gap-1">
					{stateAbbr && stateBadgeColorMap[stateAbbr] && (
						<span
							className="inline-flex items-center justify-center h-[16px] px-[6px] rounded-[4px] border border-black text-[11px] font-bold leading-none"
							style={{ backgroundColor: stateBadgeColorMap[stateAbbr] }}
						>
							{stateAbbr}
						</span>
					)}
					{contact.city && (
						<span
							className="block w-[120px] text-[11px] leading-none text-black"
							style={singleLineTextFadeStyle}
						>
							{contact.city}
						</span>
					)}
				</div>
				{titleCategory && (
					<div
						className="w-[160px] px-2 py-[2px] rounded-[8px] border border-black flex items-center gap-1"
						style={{ backgroundColor: titleCategory.backgroundColor }}
					>
						{renderContactTitleCategoryIcon(titleCategory.kind)}
						<span
							className="block min-w-0 flex-1 text-[10px] leading-none text-black"
							style={singleLineTextFadeStyle}
						>
							{titleCategory.label}
						</span>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div
			className={cn(
				// Hidden on very small screens and on wide screens where the side panel is visible.
				'hidden sm:block xl:hidden relative z-[50] mx-auto -mt-[55px] lg:mt-0 mb-8 lg:mb-4 bg-[#D8E5FB] border-[3px] border-black rounded-[7px]',
				'max-w-[596px] lg:max-w-[831px] min-h-[305px] lg:min-h-[224px]',
				className
			)}
			style={style}
			data-hover-description="Research: Background info and notes for the selected contact."
		>
			{/* CSS for responsive fade bounds on bullet text */}
			<style>{`
				.horizontal-research-bullet-text {
					height: 65px;
				}
				@media (min-width: 1024px) {
					.horizontal-research-bullet-text {
						height: 32.5px;
					}
				}
			`}</style>
			<div className="px-3 pt-[6px] pb-3">
				<div className="mb-2">
					<span className="font-secondary font-bold text-[13px] leading-none text-black">
						Research
					</span>
				</div>

				{hasParsedSections ? (
					/* Normal parsed sections layout: 2-column grid */
					<div className="grid grid-cols-2 gap-x-[12px] gap-y-[8px] auto-rows-[82px] lg:auto-rows-[52px]">
						{/* Top-left: contact summary info box */}
						<div className="min-h-[82px] lg:min-h-[52px]">{contactInfoBox}</div>

						{/* Remaining cells: research bullets laid out in a 2x3 grid */}
						{orderedKeys.map((key) => renderBulletCell(key))}
					</div>
				) : (
					/* Unparsed metadata layout: contact info on left, full text on right spanning 3 rows */
					<div className="grid grid-cols-2 gap-x-[12px]">
						{/* Left column: contact info box */}
						<div className="row-span-3 flex flex-col gap-y-[8px]">
							<div className="h-[82px] lg:h-[52px]">{contactInfoBox}</div>
							{/* Two placeholder boxes below contact info */}
							<div
								className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black"
								style={{ backgroundColor: '#C6D9F8' }}
							/>
							<div
								className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black"
								style={{ backgroundColor: '#C6D9F8' }}
							/>
						</div>

						{/* Right column: single tall text block spanning all 3 rows */}
						<div id="horizontal-research-text-block" className="row-span-3">
							<style>{`
								#horizontal-research-text-block *::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
									background: transparent !important;
								}
								#horizontal-research-text-block * {
									-ms-overflow-style: none !important;
									scrollbar-width: none !important;
								}
							`}</style>
							<div
								className="w-full h-[calc(82px*3+8px*2)] lg:h-[calc(52px*3+8px*2)] rounded-[8px] border-2 border-black flex items-stretch"
								style={{
									backgroundColor: boxColorMap['1'],
								}}
							>
								<div className="flex-1 m-[6px] bg-white border border-black rounded-[6px] px-[8px] py-[6px] overflow-hidden">
									<div
										className="text-[13px] leading-[1.35] font-inter text-black h-full overflow-y-auto"
										style={{
											wordBreak: 'break-word',
										}}
									>
										{contact.metadata}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
