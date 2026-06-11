'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
// Venue events carry confirmed-booking attribution from GET /api/venue/events.
import type { VenueEventWithBooking as VenueEvent } from '@/app/api/venue/events/route';
import { Play } from 'lucide-react';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { VenueListViewIcon } from '@/components/atoms/_svg/VenueListViewIcon';
import { VenueMediaViewIcon } from '@/components/atoms/_svg/VenueMediaViewIcon';
import { VenueRatingStarIcon } from '@/components/atoms/_svg/VenueRatingStarIcon';
import { ProfileMediaWaveform } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	getProfileGenreIcon,
	profileBioIconSvg,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { MediaAssetPlayer } from '@/components/molecules/MediaAssetPlayer/MediaAssetPlayer';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	useGetVenueEventApplicants,
	useRateApplicationVideo,
	type VenueEventApplicant,
	type VenueEventApplicationVideo,
} from '@/hooks/queryHooks/useVenueApplications';
import {
	findBookedApplicant,
	formatApplicantCount,
	formatVenueOpportunityDate,
	formatVenueOpportunityTimeRange,
	isVenueOpportunityLive,
} from './venueOpportunityFormat';

// Same artwork fallback gradient as the profile media slot cards.
export const MEDIA_THUMB_GRADIENT =
	'linear-gradient(145deg, #EF3030 0%, #F44458 36%, #F04CCB 72%, #FF64D8 100%)';

const APPLICANT_ROW_GRID_STYLE: CSSProperties = {
	backgroundImage:
		'repeating-linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 27px, #FAF7F7 27px, #FAF7F7 54px)',
	backgroundPosition: 'top center',
	backgroundRepeat: 'repeat-y',
	backgroundSize: '508px 54px',
};

export const getMediaDisplayTitle = (filename: string) =>
	filename.replace(/\.[^/.]+$/, '').trim() || filename;

// Poster for uploads/youtube; images have no poster, so fall back to the image itself.
export const mediaThumbSrc = (video: VenueEventApplicationVideo) =>
	video.posterUrl ?? (video.kind === 'image' ? video.url : null);

// Rating → traffic-light color per the Figma media-view mockups.
export const ratingColor = (rating: number) =>
	rating <= 2 ? '#EF3030' : rating === 3 ? '#FFC53D' : '#34A853';

// The applicant-summary badge star is a constant gold (not traffic-light): it
// summarizes an average, per the Figma list/header mockups.
export const RATING_STAR_GOLD = '#FFC53D';

// An applicant's rating is the average of this user's rated videos on the
// application (rating 0 rows are "unrated" and excluded); 0 = nothing rated.
export const getApplicantRating = (applicant: VenueEventApplicant) => {
	const rated = applicant.videos.filter((video) => video.rating > 0);
	if (rated.length === 0) return 0;
	return rated.reduce((sum, video) => sum + video.rating, 0) / rated.length;
};

// "4.666… → 4.67", "4.5 → 4.5", "5 → 5" — two decimals max, no trailing zeros.
export const formatApplicantRating = (rating: number) =>
	String(Math.round(rating * 100) / 100);

// Gold star + numeric average. Plain spans (no button) so it can live inside
// the <button> list rows; `light` switches the numeral to white for the dark
// detail-card header.
export function ApplicantAverageRating({
	rating,
	light = false,
}: {
	rating: number;
	light?: boolean;
}) {
	return (
		<span className="flex shrink-0 items-center gap-[4px]">
			<VenueRatingStarIcon
				width={14}
				height={13}
				filled
				color={RATING_STAR_GOLD}
				outlineColor={RATING_STAR_GOLD}
			/>
			<span
				className={`text-[14px] font-bold leading-none ${light ? 'text-white' : 'text-black'}`}
			>
				{formatApplicantRating(rating)}
			</span>
		</span>
	);
}

// One media-view tile: a submitted video plus the applicant it belongs to.
type ApplicantVideoItem = {
	applicant: VenueEventApplicant;
	video: VenueEventApplicationVideo;
};

function EventDatePill({
	event,
	camouflaged = false,
}: {
	event: VenueEvent;
	camouflaged?: boolean;
}) {
	return (
		<span
			className={`flex h-[24px] w-[112px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black text-[14px] font-medium leading-none ${
				camouflaged ? 'bg-transparent' : 'bg-[#FF818A]'
			}`}
		>
			{formatVenueOpportunityDate(event.whenLabel, event.startsAt)}
		</span>
	);
}

export function GenrePill({ genre }: { genre: string }) {
	const GenreIcon = getProfileGenreIcon(genre);
	return (
		<span className="flex h-[21.374px] w-fit max-w-full shrink-0 items-center gap-[3px] overflow-hidden rounded-[7.491px] bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black">
			{GenreIcon && <GenreIcon aria-hidden="true" className="shrink-0" />}
			<span className="min-w-0 truncate">{genre}</span>
		</span>
	);
}

function FieldLabel({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={`font-inter text-[10.292px] font-medium leading-[18.479px] text-[#9A9A9A] ${className ?? ''}`}
		>
			{children}
		</span>
	);
}

function EmptyFieldValue() {
	return (
		<span className="mt-[5px] text-[14px] font-medium leading-none text-black/30">—</span>
	);
}

function SectionNotice({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-1 items-center justify-center px-[18px] text-center font-inter text-[13px] leading-none text-black/40">
			{children}
		</div>
	);
}

// One event card in the detail view's left rail; clicking switches the selected
// event. Past cards use the same camouflaged fill treatment as the Events list.
// Booked cards override camouflage (a booked card must read booked) but keep the
// selected blue, and show the booked artist's name in place of the count pill.
function EventSidebarCard({
	event,
	applicantCount,
	selected,
	camouflaged = false,
	onSelect,
}: {
	event: VenueEvent;
	applicantCount: number;
	selected: boolean;
	camouflaged?: boolean;
	onSelect: () => void;
}) {
	const booked = event.booking != null;
	const cardFillClassName = booked
		? selected
			? 'bg-[#CEF4FF]'
			: 'bg-[#C5EDA0] hover:brightness-95'
		: camouflaged
			? 'bg-transparent'
			: selected
				? 'bg-[#CEF4FF]'
				: 'bg-white hover:brightness-95';
	const pillFillClassName = camouflaged ? 'bg-transparent' : 'bg-[#F7EFC0]';
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-label={`View applicants for ${event.name}`}
			className={`flex w-full shrink-0 cursor-pointer flex-col items-start gap-[6px] rounded-[12px] border-[2px] border-black p-[10px] text-left font-inter text-black transition ${cardFillClassName}`}
		>
			<span className="w-full truncate text-[16px] font-bold leading-none">
				{event.name}
			</span>
			<span className="flex w-full min-w-0 items-center gap-[6px]">
				{event.booking ? (
					<span
						title={event.booking.artistName}
						className="flex h-[22px] min-w-0 max-w-[100px] items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#5EAD52] px-[8px] text-[12px] font-medium leading-none text-white"
					>
						<span className="min-w-0 truncate">{event.booking.artistName}</span>
					</span>
				) : (
					<span
						className={`flex h-[22px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black px-[8px] text-[12px] font-medium leading-none ${pillFillClassName}`}
					>
						{formatApplicantCount(applicantCount)}
					</span>
				)}
				{event.booking && (
					<span
						title={`${event.booking.artistName}${event.booking.date ? ` — ${event.booking.date}` : ''}`}
						className="flex h-[22px] shrink-0 items-center justify-center gap-[4px] rounded-[6.866px] border-[0.858px] border-black bg-[#B7FFC5] px-[8px] text-[12px] font-medium leading-none"
					>
						<span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#34A853]" />
						Booked
					</span>
				)}
			</span>
			<span className="flex w-full items-center gap-[8px]">
				<EventDatePill event={event} camouflaged={camouflaged && !booked} />
				<span className="min-w-0 truncate text-[13px] font-medium leading-none">
					{formatVenueOpportunityTimeRange(event.startTime, event.endTime)}
				</span>
			</span>
		</button>
	);
}

// A submitted media item inside the expanded applicant card: thumbnail, title and
// decorative waveform; clicking toggles an inline player below it. Inline (not the
// MediaPreviewDialog) on purpose — the dialog portals to document.body, outside the
// [data-venue-tool-ui] subtree, so clicks inside it would dismiss the whole panel.
function ApplicantMediaItem({
	video,
	open,
	onToggle,
}: {
	video: VenueEventApplicationVideo;
	open: boolean;
	onToggle: () => void;
}) {
	const title = video.filename ? getMediaDisplayTitle(video.filename) : 'Media';
	const thumbSrc = mediaThumbSrc(video);
	return (
		<div className="flex w-full shrink-0 flex-col gap-[6px]">
			<button
				type="button"
				onClick={onToggle}
				aria-label={`Play ${title}`}
				aria-expanded={open}
				className="group flex h-[66px] w-full shrink-0 cursor-pointer items-center gap-[13px] overflow-hidden rounded-[9px] bg-[#F2F7FF] px-[12px] text-left transition hover:brightness-95"
			>
				<span
					className="relative flex h-[50px] w-[50px] shrink-0 overflow-hidden rounded-[6px]"
					style={{ background: MEDIA_THUMB_GRADIENT }}
				>
					{thumbSrc && (
						// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
						<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
					)}
					<span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
						<span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/70 text-white">
							<Play className="h-3.5 w-3.5 fill-white" />
						</span>
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col justify-center gap-[1px]">
					<span className="truncate font-inter text-[16px] font-medium leading-[19px] text-black">
						{title}
					</span>
					<ProfileMediaWaveform />
				</span>
			</button>
			{open && <MediaAssetPlayer asset={video} className="w-full" />}
		</div>
	);
}

// The expanded application snapshot: answers on the left, submitted media on the right.
function ApplicantDetailCard({ applicant }: { applicant: VenueEventApplicant }) {
	const [openMediaId, setOpenMediaId] = useState<number | null>(null);
	const rating = getApplicantRating(applicant);
	return (
		<div className="mx-[12px] my-[10px] shrink-0 overflow-hidden rounded-[12px] border-[2px] border-black bg-white font-inter">
			<div className="flex h-[36px] shrink-0 items-center gap-[10px] bg-[#1E4620] px-[14px] text-[18px] font-bold leading-none text-white">
				<span className="min-w-0 truncate">{applicant.applicantName}</span>
				{rating > 0 && <ApplicantAverageRating rating={rating} light />}
			</div>
			<div className="flex gap-[14px] p-[14px]">
				<div className="flex w-[230px] shrink-0 flex-col items-start">
					<FieldLabel>Genre</FieldLabel>
					{applicant.genre ? (
						<span className="mt-[5px] flex max-w-full">
							<GenrePill genre={applicant.genre} />
						</span>
					) : (
						<EmptyFieldValue />
					)}
					<FieldLabel className="mt-[10px]">Performing Name</FieldLabel>
					{applicant.performingName ? (
						<span className="mt-[5px] flex h-[21.374px] w-fit max-w-full items-center gap-[4px] overflow-hidden rounded-[7.491px] bg-[#F4F4F4] px-[6px] text-[14px] font-medium leading-[21.374px] text-black">
							<span
								aria-hidden="true"
								className="block h-[16px] w-[16px] shrink-0"
								dangerouslySetInnerHTML={{ __html: profilePerformingNameIconSvg }}
							/>
							<span className="min-w-0 truncate">{applicant.performingName}</span>
						</span>
					) : (
						<EmptyFieldValue />
					)}
					<FieldLabel className="mt-[10px]">Area</FieldLabel>
					{applicant.area ? (
						<span className="mt-[5px] flex h-[21.374px] w-fit max-w-full items-center gap-[4px] overflow-hidden rounded-[7.491px] bg-[#F4F4F4] px-[6px] text-[14px] font-medium leading-[21.374px] text-black">
							<span aria-hidden="true" className="block h-[16px] w-[13px] shrink-0">
								<ProfileAreaMarkerIcon className="h-full w-full" />
							</span>
							<span className="min-w-0 truncate">{applicant.area}</span>
						</span>
					) : (
						<EmptyFieldValue />
					)}
					<FieldLabel className="mt-[10px]">Bio</FieldLabel>
					{applicant.bio ? (
						<div className="mt-[5px] flex max-h-[120px] w-full items-start gap-[9px] overflow-y-auto rounded-[9px] bg-[#F4F4F4] px-[10px] py-[9px] text-[13px] font-medium leading-[16px] text-black">
							<span
								aria-hidden="true"
								className="mt-[1px] block h-[17px] w-[8px] shrink-0"
								dangerouslySetInnerHTML={{ __html: profileBioIconSvg }}
							/>
							<span className="min-w-0 whitespace-pre-wrap">{applicant.bio}</span>
						</div>
					) : (
						<EmptyFieldValue />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-[10px]">
					{applicant.videos.map((video) => (
						<ApplicantMediaItem
							key={video.id}
							video={video}
							open={openMediaId === video.id}
							onToggle={() => setOpenMediaId(openMediaId === video.id ? null : video.id)}
						/>
					))}
					{applicant.videos.length === 0 && (
						<span className="text-[13px] leading-none text-black/40">
							No media submitted
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

// One finder-style applicant row: name | genre pill | media thumbnails. Clicking
// toggles the snapshot card above the list.
function ApplicantRow({
	applicant,
	striped,
	expanded,
	onToggle,
}: {
	applicant: VenueEventApplicant;
	striped: boolean;
	expanded: boolean;
	onToggle: () => void;
}) {
	const rating = getApplicantRating(applicant);
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={expanded}
			className={`flex h-[27px] w-[508px] shrink-0 cursor-pointer items-center gap-[8px] self-center px-[10px] text-left font-inter transition hover:brightness-95 ${
				striped ? 'bg-[#FAF7F7]' : 'bg-white'
			}`}
		>
			<span
				className={`min-w-0 flex-1 truncate text-[14px] leading-none text-black ${
					expanded ? 'font-bold' : 'font-semibold'
				}`}
			>
				{applicant.applicantName}
			</span>
			{rating > 0 && <ApplicantAverageRating rating={rating} />}
			{applicant.genre && <GenrePill genre={applicant.genre} />}
			<span className="flex shrink-0 gap-[4px]">
				{applicant.videos.map((video) => {
					const thumbSrc = mediaThumbSrc(video);
					return (
						<span
							key={video.id}
							className="h-[20px] w-[20px] shrink-0 overflow-hidden rounded-[4px]"
							style={{ background: MEDIA_THUMB_GRADIENT }}
						>
							{thumbSrc && (
								// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
								<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
							)}
						</span>
					);
				})}
			</span>
		</button>
	);
}

// Five clickable stars; re-clicking the current rating clears it. Stars of a
// rated video take the traffic-light color, unrated ones use the outline color.
// buttonClassName lets touch surfaces add hit-slop without changing desktop pixels.
export function VideoRatingStars({
	rating,
	onRate,
	starWidth,
	starHeight,
	gap,
	unratedOutline = '#FFFFFF',
	buttonClassName = '',
}: {
	rating: number;
	onRate: (value: number) => void;
	starWidth: number;
	starHeight: number;
	gap: number;
	unratedOutline?: string;
	buttonClassName?: string;
}) {
	return (
		<div className="flex items-center" style={{ gap: `${gap}px` }}>
			{[1, 2, 3, 4, 5].map((value) => (
				<button
					key={value}
					type="button"
					aria-label={`Rate ${value} of 5`}
					aria-pressed={rating === value}
					onClick={() => onRate(value === rating ? 0 : value)}
					className={`cursor-pointer ${buttonClassName}`}
				>
					<VenueRatingStarIcon
						width={starWidth}
						height={starHeight}
						filled={rating > 0 && value <= rating}
						color={ratingColor(rating)}
						outlineColor={rating > 0 ? ratingColor(rating) : unratedOutline}
					/>
				</button>
			))}
		</div>
	);
}

// One media-view tile: thumbnail with the applicant's name pill and a star row.
// The open button, pill and stars are absolutely-positioned siblings (never
// nested) so star clicks don't open the tile and no <button> nests in another.
function MediaGridTile({
	item,
	size,
	rating,
	playing = false,
	onOpen,
	onRate,
}: {
	item: ApplicantVideoItem;
	size: 'lg' | 'sm';
	rating: number;
	playing?: boolean;
	onOpen: () => void;
	onRate: (value: number) => void;
}) {
	const thumbSrc = mediaThumbSrc(item.video);
	const lg = size === 'lg';
	return (
		<div
			className={`relative shrink-0 overflow-hidden rounded-[6px] border-[2px] ${
				lg ? 'h-[181px] w-[173.125px]' : 'h-[88px] w-[101px]'
			}`}
			style={{
				background: MEDIA_THUMB_GRADIENT,
				borderColor: playing
					? '#34A853'
					: rating > 0
						? ratingColor(rating)
						: 'transparent',
			}}
		>
			<button
				type="button"
				onClick={onOpen}
				aria-label={
					playing
						? `Close ${item.applicant.applicantName}'s media`
						: `Open ${item.applicant.applicantName}'s media`
				}
				className={`absolute inset-0 cursor-pointer ${playing ? 'opacity-50' : ''}`}
			>
				{thumbSrc && (
					// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
					<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
				)}
			</button>
			<span
				className={`pointer-events-none absolute truncate rounded-full bg-black/55 font-inter font-medium leading-none text-white ${
					lg
						? 'left-[6px] top-[6px] max-w-[calc(100%-12px)] px-[7px] py-[3px] text-[11px]'
						: 'left-[4px] top-[4px] max-w-[calc(100%-8px)] px-[5px] py-[2px] text-[9px]'
				} ${playing ? 'opacity-50' : ''}`}
			>
				{item.applicant.applicantName}
			</span>
			<div
				className={`absolute left-1/2 -translate-x-1/2 ${lg ? 'bottom-[6px]' : 'bottom-[4px]'}`}
			>
				<VideoRatingStars
					rating={rating}
					onRate={onRate}
					starWidth={lg ? 13 : 9}
					starHeight={lg ? 12 : 8}
					gap={lg ? 3 : 2}
				/>
			</div>
		</div>
	);
}

// Media mode of the applicants box: a 3-col grid of all submitted videos, or —
// when one is open — a player card over a denser 5-col grid. The open item is
// derived (never stored) so a withdrawn applicant on refetch falls back to the
// grid, matching the expandedApplicant idiom.
function ApplicantsMediaView({
	items,
	openVideoId,
	ratings,
	onOpenVideo,
	onRate,
}: {
	items: ApplicantVideoItem[];
	openVideoId: number | null;
	ratings: Record<number, number>;
	onOpenVideo: (videoId: number | null) => void;
	onRate: (videoId: number, value: number) => void;
}) {
	const openItem = items.find(({ video }) => video.id === openVideoId) ?? null;
	if (!openItem) {
		return (
			<div className="mx-auto grid w-[525px] grid-cols-[repeat(3,173.125px)] justify-between gap-y-[6px]">
				{items.map((item) => (
					<MediaGridTile
						key={item.video.id}
						item={item}
						size="lg"
						rating={ratings[item.video.id] ?? 0}
						onOpen={() => onOpenVideo(item.video.id)}
						onRate={(value) => onRate(item.video.id, value)}
					/>
				))}
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center gap-[10px]">
			<div className="w-[525px] shrink-0 rounded-[12px] border-[2px] border-black bg-white p-[10px]">
				<div className="relative overflow-hidden rounded-[8px]">
					<MediaAssetPlayer asset={openItem.video} className="w-full" />
					{/* pointer-events-none so the overlay never blocks player controls */}
					<span className="pointer-events-none absolute left-[8px] top-[8px] flex items-center gap-[6px]">
						<span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#1E4620] font-inter text-[13px] font-bold leading-none text-white">
							{openItem.applicant.applicantName.charAt(0).toUpperCase()}
						</span>
						<span className="rounded-full bg-black/55 px-[8px] py-[4px] font-inter text-[12px] font-medium leading-none text-white">
							{openItem.applicant.applicantName}
						</span>
					</span>
				</div>
				<div className="mt-[8px] flex justify-center">
					<VideoRatingStars
						rating={ratings[openItem.video.id] ?? 0}
						onRate={(value) => onRate(openItem.video.id, value)}
						starWidth={26}
						starHeight={24}
						gap={6}
						unratedOutline="#B2B2B2"
					/>
				</div>
			</div>
			<div className="grid w-[525px] grid-cols-[repeat(5,101px)] justify-between gap-y-[5px] pb-[2px]">
				{items.map((item) => (
					<MediaGridTile
						key={item.video.id}
						item={item}
						size="sm"
						rating={ratings[item.video.id] ?? 0}
						playing={item.video.id === openItem.video.id}
						onOpen={() =>
							onOpenVideo(item.video.id === openItem.video.id ? null : item.video.id)
						}
						onRate={(value) => onRate(item.video.id, value)}
					/>
				))}
			</div>
		</div>
	);
}

// The right box: a floating white header card (star, name, pills, details quote,
// edit, list/media view toggle) over the scrolling applicant list. Owns the
// expanded-applicant selection; the parent remounts it (key={event.id}) when the
// event switches so expansion resets.
function EventApplicantsBox({
	event,
	fallbackApplicantCount,
	onEditEvent,
	onViewApplicant,
}: {
	event: VenueEvent;
	fallbackApplicantCount: number;
	onEditEvent: (eventId: number) => void;
	// Reports the applicant currently being viewed (expanded row in List view, the
	// open video's owner in Media view) so the docked chat can follow along.
	onViewApplicant?: (applicant: VenueEventApplicant) => void;
}) {
	const { data: applicants, isPending, isError } = useGetVenueEventApplicants(event.id);
	const { mutate: rateApplicationVideo } = useRateApplicationVideo(event.id);
	const [expandedApplicantId, setExpandedApplicantId] = useState<number | null>(null);
	const [viewMode, setViewMode] = useState<'list' | 'media'>('list');
	const [openVideoId, setOpenVideoId] = useState<number | null>(null);
	// Derived, never stored: an applicant disappearing on refetch (withdrawal)
	// collapses the card automatically.
	const expandedApplicant =
		applicants?.find((applicant) => applicant.id === expandedApplicantId) ?? null;
	// A confirmed booking auto-opens the booked artist's card, once, on the first
	// applicants payload (the key={event.id} remount re-arms it per event) — so a
	// manual collapse sticks across refetches and a booking that confirms while
	// the view is open never yanks the list. The skip ref keeps this programmatic
	// expansion from reporting to onViewApplicant below: auto-opening must not
	// switch the docked chat (that would drop a half-typed draft and mark the
	// booked artist's thread read without the venue ever clicking anything).
	const bookingAutoOpenAttemptedRef = useRef(false);
	const skipNextViewReportRef = useRef(false);
	useEffect(() => {
		if (bookingAutoOpenAttemptedRef.current || !applicants) return;
		bookingAutoOpenAttemptedRef.current = true;
		const bookedApplicant = findBookedApplicant(applicants, event.booking);
		if (!bookedApplicant) return;
		skipNextViewReportRef.current = true;
		setExpandedApplicantId(bookedApplicant.id);
	}, [applicants, event.booking]);
	const applicantCount = applicants?.length ?? fallbackApplicantCount;
	const details = event.details?.trim();
	const videoItems: ApplicantVideoItem[] =
		applicants?.flatMap((applicant) =>
			applicant.videos.map((video) => ({ applicant, video }))
		) ?? [];
	// Ratings are persisted per-user (optimistically patched into the applicants
	// cache); the media view still consumes them as a videoId→rating record.
	const videoRatings: Record<number, number> = Object.fromEntries(
		videoItems.map(({ video }) => [video.id, video.rating])
	);
	const rateVideo = (videoId: number, value: number) =>
		rateApplicationVideo({ videoId, rating: value });
	const starredCount = (applicants ?? []).filter(
		(applicant) => getApplicantRating(applicant) > 0
	).length;
	// Only non-null activations report: collapsing a row or closing a video keeps
	// the docked chat on its last thread, and the key={event.id} remount on event
	// switch reports nothing until the user views someone.
	const activeApplicant =
		viewMode === 'media'
			? (videoItems.find((item) => item.video.id === openVideoId)?.applicant ?? null)
			: expandedApplicant;
	const activeApplicantId = activeApplicant?.id ?? null;
	useEffect(() => {
		if (skipNextViewReportRef.current) {
			skipNextViewReportRef.current = false;
			return;
		}
		if (activeApplicant) onViewApplicant?.(activeApplicant);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeApplicantId]);
	return (
		<div className="flex h-full w-[540px] shrink-0 flex-col overflow-hidden rounded-[12px] border-[2px] border-black bg-[#F3FFF0]">
			<div className="flex shrink-0 justify-center pt-[9px]">
				<div
					className={`flex h-[86px] w-[525px] flex-col justify-center gap-[5px] rounded-[12px] border-[2px] border-black px-[12px] font-inter text-black ${
						event.booking ? 'bg-[#C5EDA0]' : 'bg-white'
					}`}
				>
					<div className="flex h-[24px] items-center gap-[6px]">
						<MapStackStarIcon size={20} className="shrink-0" />
						<span className="min-w-0 flex-1 truncate text-[20px] font-bold leading-none">
							{event.name}
						</span>
						<span className="flex h-[22px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#F7EFC0] px-[8px] text-[12px] font-medium leading-none">
							{formatApplicantCount(applicantCount)}
						</span>
						<EventDatePill event={event} />
						{event.booking ? (
							// A confirmed booking outranks Live — the event is no longer seeking.
							<span
								title={`${event.booking.artistName}${event.booking.date ? ` — ${event.booking.date}` : ''}`}
								className="flex h-[22px] shrink-0 items-center justify-center gap-[4px] rounded-[6.866px] border-[0.858px] border-black bg-[#B7FFC5] px-[8px] text-[12px] font-medium leading-none"
							>
								<span
									aria-hidden="true"
									className="h-[7px] w-[7px] rounded-full bg-[#34A853]"
								/>
								Booked
							</span>
						) : isVenueOpportunityLive(event) ? (
							<span className="flex h-[22px] w-[53px] shrink-0 items-center justify-center gap-[4px] rounded-[6.866px] border-[0.858px] border-black bg-[#C5EDA0] text-[12px] font-medium leading-none">
								<span
									aria-hidden="true"
									className="h-[7px] w-[7px] rounded-full bg-[#34A853]"
								/>
								Live
							</span>
						) : null}
						<button
							type="button"
							onClick={() => onEditEvent(event.id)}
							aria-label={`Edit ${event.name}`}
							className="flex h-[20px] shrink-0 cursor-pointer items-center rounded-[6px] border-[1.5px] border-black bg-white px-[8px] text-[11px] font-medium leading-none transition hover:brightness-95"
						>
							edit
						</button>
					</div>
					{details && (
						<span className="w-full truncate text-center text-[12px] italic leading-[14px] text-black/70">
							“{details}”
						</span>
					)}
					<div className="flex h-[19px] items-center justify-between">
						<div className="flex items-center gap-[8px]">
							<button
								type="button"
								onClick={() => setViewMode('list')}
								aria-pressed={viewMode === 'list'}
								className={`flex h-[19px] w-[54px] cursor-pointer items-center justify-center gap-[3px] ${
									viewMode === 'list' ? 'bg-[#BCFFBD]' : ''
								}`}
							>
								<VenueListViewIcon selected={viewMode === 'list'} className="shrink-0" />
								<span
									className={`text-[12px] font-medium leading-none ${
										viewMode === 'list' ? 'text-black' : 'text-[#B2B2B2]'
									}`}
								>
									List
								</span>
							</button>
							<button
								type="button"
								onClick={() => {
									// Re-clicking Media while a video is open returns to the grid.
									if (viewMode === 'media') setOpenVideoId(null);
									setViewMode('media');
								}}
								aria-pressed={viewMode === 'media'}
								className={`flex h-[19px] w-[70px] cursor-pointer items-center justify-center gap-[3px] ${
									viewMode === 'media' ? 'bg-[#BCEFFF]' : ''
								}`}
							>
								<VenueMediaViewIcon selected={viewMode === 'media'} className="shrink-0" />
								<span
									className={`text-[12px] font-medium leading-none ${
										viewMode === 'media' ? 'text-black' : 'text-[#B2B2B2]'
									}`}
								>
									Media
								</span>
							</button>
						</div>
						<span className="flex h-[19px] shrink-0 items-center rounded-[6px] bg-[#EDEDED] px-[8px] text-[11px] font-medium leading-none text-[#9A9A9A]">
							{starredCount} Starred
						</span>
					</div>
				</div>
			</div>
			{!isPending &&
			!isError &&
			applicants &&
			applicants.length > 0 &&
			viewMode === 'media' ? (
				videoItems.length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col pt-[8px]">
						<SectionNotice>No media submitted yet.</SectionNotice>
					</div>
				) : (
					// key remounts the scroller on open/close so the player card is in
					// view at scrollTop 0 (CustomScrollbar has no imperative scroll API).
					// offsetRight 0 keeps the thumb just inside the box's right border —
					// the default -4 would be clipped by the box's overflow-hidden.
					<CustomScrollbar
						key={openVideoId ?? 'grid'}
						className="min-h-0 w-full flex-1"
						thumbWidth={2}
						offsetRight={0}
						contentClassName="pt-[8px] pb-[12px]"
					>
						<ApplicantsMediaView
							items={videoItems}
							openVideoId={openVideoId}
							ratings={videoRatings}
							onOpenVideo={setOpenVideoId}
							onRate={rateVideo}
						/>
					</CustomScrollbar>
				)
			) : (
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[8px]">
					{isPending ? (
						<SectionNotice>Loading…</SectionNotice>
					) : isError ? (
						<SectionNotice>Couldn’t load applicants.</SectionNotice>
					) : (
						<>
							{expandedApplicant && <ApplicantDetailCard applicant={expandedApplicant} />}
							<div
								className="flex w-full flex-1 flex-col"
								style={APPLICANT_ROW_GRID_STYLE}
							>
								{(!applicants || applicants.length === 0) && (
									<span className="sr-only">No applicants yet.</span>
								)}
								{(applicants ?? []).map((applicant, index) => (
									<ApplicantRow
										key={applicant.id}
										applicant={applicant}
										striped={index % 2 === 1}
										expanded={applicant.id === expandedApplicantId}
										onToggle={() =>
											setExpandedApplicantId(
												applicant.id === expandedApplicantId ? null : applicant.id
											)
										}
									/>
								))}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// Detail mode of the Events tool panel: an event rail on the left, the selected
// event's applicant list on the right. Rendered inside the panel's existing
// 765×797 inner box (its 2px black border is the Figma stroke), so the content
// area is 761×793: 2px inset + 213 rail + 4px gap + 540 box + 2px inset = 761.
export function VenueEventDetailView({
	events,
	selectedEventId,
	applicantCountByEventId,
	onSelectEvent,
	onAddEvent,
	onEditEvent,
	onViewApplicant,
}: {
	events: VenueEvent[];
	selectedEventId: number;
	applicantCountByEventId: Map<number, number>;
	onSelectEvent: (eventId: number) => void;
	onAddEvent: () => void;
	onEditEvent: (eventId: number) => void;
	onViewApplicant?: (applicant: VenueEventApplicant) => void;
}) {
	const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
	const pastEvents: VenueEvent[] = [];
	const liveEvents: VenueEvent[] = [];
	for (const event of events) {
		(isVenueOpportunityLive(event) ? liveEvents : pastEvents).push(event);
	}
	const pastIdsKey = pastEvents.map((event) => event.id).join(',');
	const eventRailScrollerRef = useRef<HTMLDivElement | null>(null);
	const liveEventsSectionRef = useRef<HTMLDivElement | null>(null);
	const seenPastIdsRef = useRef<Set<string> | null>(null);

	// Match the Events list: expired events sit above the fold and reveal only when
	// the user scrolls up. Do not re-pin for removals so deleting a past row while
	// viewing it does not yank the rail back down.
	useLayoutEffect(() => {
		const scroller = eventRailScrollerRef.current;
		const liveSection = liveEventsSectionRef.current;
		if (!scroller || !liveSection) return;

		const previous = seenPastIdsRef.current;
		const nextIds = pastIdsKey === '' ? [] : pastIdsKey.split(',');
		seenPastIdsRef.current = new Set(nextIds);
		if (previous && nextIds.every((id) => previous.has(id))) return;

		scroller.scrollTop = liveSection.offsetTop;
	}, [pastIdsKey]);

	return (
		// The backdrop gradient carries its alpha in its second stop, so no separate
		// opacity layer is needed (unlike the list mode's opacity-90 trick).
		<div className="flex h-full w-full gap-[4px] bg-[linear-gradient(180deg,#5EAD52_0%,rgba(255,255,255,0.42)_100%)] p-[2px]">
			<div className="h-full w-[213px] shrink-0 rounded-[12px] border-[2px] border-black bg-[linear-gradient(180deg,#C1F7BB_0%,#60AE92_100%)] p-[8px]">
				<CustomScrollbar
					scrollContainerRef={eventRailScrollerRef}
					className="h-full w-full"
					contentClassName="flex flex-col rounded-[10px]"
					thumbWidth={2}
					thumbHeightOverride={72}
					offsetRight={-10}
					lockHorizontalScroll
				>
					{pastEvents.length > 0 && (
						<div className="flex shrink-0 flex-col gap-[8px] pb-[8px]">
							{pastEvents.map((event) => (
								<EventSidebarCard
									key={event.id}
									event={event}
									applicantCount={applicantCountByEventId.get(event.id) ?? 0}
									selected={event.id === selectedEventId}
									camouflaged
									onSelect={() => onSelectEvent(event.id)}
								/>
							))}
						</div>
					)}
					<div
						ref={liveEventsSectionRef}
						className="flex min-h-full shrink-0 flex-col gap-[8px]"
					>
						{liveEvents.map((event) => (
							<EventSidebarCard
								key={event.id}
								event={event}
								applicantCount={applicantCountByEventId.get(event.id) ?? 0}
								selected={event.id === selectedEventId}
								onSelect={() => onSelectEvent(event.id)}
							/>
						))}
						{/* Opens the create-event panel (same panel as the toolbar's Add tool). */}
						<button
							type="button"
							aria-label="Add opportunity"
							onClick={onAddEvent}
							className="flex h-[98px] w-full shrink-0 cursor-pointer items-center justify-center rounded-[12px] border-[2px] border-black bg-white transition hover:brightness-95"
						>
							<span className="text-[20px] font-medium leading-none text-black">+</span>
						</button>
					</div>
				</CustomScrollbar>
			</div>
			{selectedEvent && (
				<EventApplicantsBox
					key={selectedEvent.id}
					event={selectedEvent}
					fallbackApplicantCount={applicantCountByEventId.get(selectedEvent.id) ?? 0}
					onEditEvent={onEditEvent}
					onViewApplicant={onViewApplicant}
				/>
			)}
		</div>
	);
}
