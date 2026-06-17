'use client';

import { FC, ReactNode } from 'react';
import { SendingQueueItem } from '@/contexts/SendingSessionContext';
import { useGetContactResearch } from '@/hooks/queryHooks/useContacts';
import {
	getStateAbbreviation,
	parseMetadataSections,
} from '@/components/molecules/SearchResultsMap/metadata';
import { WebsiteIcon } from '@/components/atoms/_svg/WebsiteIcon';
import {
	useWebsitePreview,
	buildWebsiteAnchorRect,
} from '@/contexts/WebsitePreviewContext';
import { normalizeWebsiteUrl, websiteHost } from '@/utils/websiteUrl';
import {
	useWebsitePreviewable,
	WEBSITE_NOT_PREVIEWABLE_LABEL,
} from '@/hooks/queryHooks/useWebsitePreviewable';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SendingContactCard } from './SendingContactCard';
import { SENDING_RESEARCH_CARD_WIDTH_PX } from './constants';

// Band colors mirror the abridged ContactResearchPanel / StreetViewContactCard
// so the sending card reads as the same research surface.
const LOCATION_ROW_COLOR = '#EDF8FF';
const FOUNDED_ROW_COLOR = '#F4FBFF';
const WEBSITE_ROW_COLOR = '#F8FCFF';
const KEYWORDS_ROW_COLOR = '#FCFDFF';
const HEADLINE_BAND_COLOR = '#BBE0F5';

export interface SendingResearchCardProps {
	item: SendingQueueItem;
	tone: 'active' | 'dimmed';
	width?: number;
}

/**
 * Search-tab sending card: the green sending header (contact + log lines +
 * progress) stacked on a research-card body built from the contact's research
 * fields, advancing card-to-card as the batch sends.
 */
export const SendingResearchCard: FC<SendingResearchCardProps> = ({
	item,
	tone,
	width = SENDING_RESEARCH_CARD_WIDTH_PX,
}) => {
	const { openWebsite } = useWebsitePreview();
	const contact = item.contact;
	// Backfill research only for the front card, like StreetViewContactCard does
	// for slim overlay payloads (30-min cache on the research endpoint).
	const needsBackfill = tone === 'active' && !contact?.metadata;
	const { data: research, isLoading: isResearchLoading } = useGetContactResearch(
		needsBackfill ? contact?.id ?? null : null
	);

	const stateAbbr = getStateAbbreviation(contact?.state || '') || contact?.state || '';
	const cityText = contact?.city?.trim() || '';
	const foundedYearText = contact?.companyFoundedYear?.trim() || '';
	const websiteText = contact?.website?.trim() || '';
	const websiteUrl = normalizeWebsiteUrl(contact?.website);
	// Preemptive reachability: a `dead` site renders the Website row non-clickable + tooltip.
	const { classification: websiteClassification } = useWebsitePreviewable(contact?.website);
	const isWebsiteDead = websiteClassification === 'dead';
	const hasKeywords = Boolean(
		contact?.companyKeywords?.some((keyword) => keyword.trim().length > 0)
	);
	const metadata = contact?.metadata || research?.metadata || null;
	const sections = parseMetadataSections(metadata);
	const blurb = sections['1'] ?? (metadata?.trim() || '');
	const headlineText = contact?.headline?.trim() || contact?.title?.trim() || '';
	const companyTypeText = contact?.companyType?.trim() || '';
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';

	const factRow = (label: ReactNode, color: string, key: string) => (
		<div
			key={key}
			className="flex items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden"
			style={{ backgroundColor: color }}
		>
			{label}
		</div>
	);

	const factRows: ReactNode[] = [];
	if (stateAbbr || cityText) {
		factRows.push(
			factRow(
				<>
					{stateAbbr ? (
						<span className="font-inter text-[12px] font-medium text-black">
							{stateAbbr}
						</span>
					) : null}
					{cityText ? (
						<span className="font-inter text-[12px] font-bold text-black truncate">
							{cityText}
						</span>
					) : null}
				</>,
				LOCATION_ROW_COLOR,
				'location'
			)
		);
	}
	if (foundedYearText) {
		factRows.push(
			factRow(
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Founded {foundedYearText}
				</span>,
				FOUNDED_ROW_COLOR,
				'founded'
			)
		);
	}
	if (websiteText) {
		const websiteInner = (
			<>
				<WebsiteIcon size={13} className="flex-shrink-0" />
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Website
				</span>
			</>
		);
		factRows.push(
			websiteUrl && !isWebsiteDead ? (
				<button
					type="button"
					key="website"
					data-website-preview-trigger
					className="flex w-full items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden text-left hover:underline focus:outline-none focus-visible:underline"
					style={{
						backgroundColor: WEBSITE_ROW_COLOR,
						pointerEvents: 'auto',
						cursor: 'pointer',
					}}
					onMouseDown={(e) => {
						e.stopPropagation();
						e.preventDefault();
						openWebsite(websiteUrl, {
							label: websiteHost(websiteUrl),
							anchorRect: buildWebsiteAnchorRect(e.currentTarget),
						});
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openWebsite(websiteUrl, {
								label: websiteHost(websiteUrl),
								anchorRect: buildWebsiteAnchorRect(e.currentTarget),
							});
						}
					}}
				>
					{websiteInner}
				</button>
			) : isWebsiteDead ? (
				// Known un-previewable (dead/unreachable): non-clickable row + hover tooltip.
				<Tooltip key="website" delayDuration={150}>
					<TooltipTrigger asChild>
						<div
							className="flex w-full items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden"
							style={{
								backgroundColor: WEBSITE_ROW_COLOR,
								pointerEvents: 'auto',
								cursor: 'default',
								opacity: 0.55,
							}}
						>
							{websiteInner}
						</div>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={4} className="text-[12px]">
						{WEBSITE_NOT_PREVIEWABLE_LABEL}
					</TooltipContent>
				</Tooltip>
			) : (
				factRow(websiteInner, WEBSITE_ROW_COLOR, 'website')
			)
		);
	}
	if (hasKeywords) {
		factRows.push(
			factRow(
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Keywords
				</span>,
				KEYWORDS_ROW_COLOR,
				'keywords'
			)
		);
	}

	return (
		<div
			className="rounded-[10px] border-2 border-black bg-white overflow-hidden font-inter"
			style={{ width: `${width}px`, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
		>
			<SendingContactCard
				item={item}
				isActive={tone === 'active'}
				showProgressBar
				frameless
			/>
			{factRows}
			{(blurb || isResearchLoading) && (
				<div className="px-3 py-2 border-t-[1.5px] border-black bg-white">
					{blurb ? (
						<div
							className="text-[11.5px] font-medium text-black/85 leading-snug"
							style={{
								display: '-webkit-box',
								WebkitLineClamp: 6,
								WebkitBoxOrient: 'vertical',
								overflow: 'hidden',
							}}
						>
							{blurb}
						</div>
					) : (
						<div className="text-[11px] italic text-black/40">Researching…</div>
					)}
				</div>
			)}
			{headlineText ? (
				<div
					className="px-3 py-[5px] border-t-[1.5px] border-black"
					style={{ backgroundColor: HEADLINE_BAND_COLOR }}
				>
					<div className="text-[11.5px] font-semibold text-black leading-snug truncate">
						{headlineText}
					</div>
				</div>
			) : null}
			{(latitude && longitude) || companyTypeText ? (
				<div className="flex items-center justify-between px-3 h-[26px] border-t-[1.5px] border-black bg-white">
					<span className="text-[11px] font-semibold text-black tabular-nums">
						{latitude && longitude ? `${latitude}   ${longitude}` : ''}
					</span>
					{companyTypeText ? (
						<span className="text-[11px] font-bold text-black truncate max-w-[45%]">
							{companyTypeText}
						</span>
					) : null}
				</div>
			) : null}
		</div>
	);
};
