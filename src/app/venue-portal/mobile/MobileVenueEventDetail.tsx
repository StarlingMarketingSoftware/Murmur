'use client';

import { Fragment, useState } from 'react';
import type { Event as VenueEvent } from '@prisma/client';
import { ChevronLeft, X } from 'lucide-react';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { VenueListViewIcon } from '@/components/atoms/_svg/VenueListViewIcon';
import { VenueMediaViewIcon } from '@/components/atoms/_svg/VenueMediaViewIcon';
import { MediaAssetPlayer } from '@/components/molecules/MediaAssetPlayer/MediaAssetPlayer';
import {
	useGetVenueEventApplicants,
	type VenueEventApplicant,
	type VenueEventApplicationVideo,
} from '@/hooks/queryHooks/useVenueApplications';
import {
	GenrePill,
	MEDIA_THUMB_GRADIENT,
	mediaThumbSrc,
	ratingColor,
	VideoRatingStars,
} from '../VenueEventDetailView';
import {
	formatApplicantCount,
	formatVenueOpportunityDate,
	isVenueOpportunityLive,
} from '../venueOpportunityFormat';
import {
	ApplicantRatingStars,
	getApplicantRating,
	MobileApplicantProfileCard,
} from './MobileApplicantProfileCard';

// One media-view tile: a submitted video plus the applicant it belongs to
// (same shape as the desktop ApplicantVideoItem).
type ApplicantVideoItem = {
	applicant: VenueEventApplicant;
	video: VenueEventApplicationVideo;
};

const SKELETON_WAVE_DURATION_S = 4.8;
const SKELETON_WAVE_STEP_S = 1.2;

function SectionNotice({ children }: { children: string }) {
	return (
		<div className="flex justify-center py-[14px] text-center font-inter text-[13px] leading-none text-black/40">
			{children}
		</div>
	);
}

// One finder-style applicant row: name | derived stars | genre | thumbnails.
// Stars are plain icons (ApplicantRatingStars) — never buttons inside this button.
function MobileApplicantRow({
	applicant,
	rating,
	striped,
	expanded,
	onToggle,
}: {
	applicant: VenueEventApplicant;
	rating: number;
	striped: boolean;
	expanded: boolean;
	onToggle: () => void;
}) {
	const visibleVideos = applicant.videos.slice(0, 4);
	const extraCount = applicant.videos.length - visibleVideos.length;
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={expanded}
			className={`flex min-h-[56px] w-full cursor-pointer items-center gap-[8px] px-[14px] text-left font-inter ${
				striped ? 'bg-[#FAF7F7]' : 'bg-white'
			}`}
		>
			<span
				className={`min-w-0 flex-1 truncate text-[16px] leading-none text-black ${
					expanded ? 'font-bold' : 'font-semibold'
				}`}
			>
				{applicant.applicantName}
			</span>
			{rating > 0 && <ApplicantRatingStars rating={rating} />}
			{applicant.genre && <GenrePill genre={applicant.genre} />}
			<span className="flex shrink-0 items-center gap-[4px]">
				{visibleVideos.map((video) => {
					const thumbSrc = mediaThumbSrc(video);
					return (
						<span
							key={video.id}
							className="h-[24px] w-[24px] shrink-0 overflow-hidden rounded-[4px]"
							style={{ background: MEDIA_THUMB_GRADIENT }}
						>
							{thumbSrc && (
								// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
								<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
							)}
						</span>
					);
				})}
				{extraCount > 0 && (
					<span className="flex h-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-[4px] bg-[#F4F4F4] px-[3px] text-[10px] font-medium leading-none text-black">
						+{extraCount}
					</span>
				)}
			</span>
		</button>
	);
}

// One media-grid tile. The open button, name pill and stars are absolutely-
// positioned SIBLINGS (never nested) so star taps don't open the tile and no
// <button> nests in another — same structure as the desktop MediaGridTile.
function MobileMediaGridTile({
	item,
	rating,
	playing = false,
	onOpen,
	onRate,
}: {
	item: ApplicantVideoItem;
	rating: number;
	playing?: boolean;
	onOpen: () => void;
	onRate: (value: number) => void;
}) {
	const thumbSrc = mediaThumbSrc(item.video);
	return (
		<div
			className="relative w-full overflow-hidden rounded-[6px] border-[2px]"
			style={{
				aspectRatio: '173 / 181',
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
				aria-label={`Open ${item.applicant.applicantName}'s media`}
				className="absolute inset-0 cursor-pointer"
			>
				{thumbSrc && (
					// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
					<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
				)}
			</button>
			<span className="pointer-events-none absolute left-[6px] top-[6px] max-w-[calc(100%-12px)] truncate rounded-full bg-black/55 px-[6px] py-[3px] font-inter text-[10px] font-medium leading-none text-white">
				{item.applicant.applicantName}
			</span>
			<div className="absolute bottom-[6px] left-1/2 -translate-x-1/2">
				<VideoRatingStars
					rating={rating}
					onRate={onRate}
					starWidth={14}
					starHeight={13}
					gap={3}
					buttonClassName="p-[4px] -m-[3px]"
				/>
			</div>
		</div>
	);
}

// Mobile counterpart of the desktop EventApplicantsBox: a header card (back,
// event name, pills) over the applicant list or media grid, with a floating
// List/Media toggle. The parent remounts it (key={event.id}) on event switch
// so all of this state resets naturally.
export function MobileVenueEventDetail({
	event,
	fallbackApplicantCount,
	onBack,
	onEditEvent,
}: {
	event: VenueEvent;
	fallbackApplicantCount: number;
	onBack: () => void;
	onEditEvent: (eventId: number) => void;
}) {
	const { data: applicants, isPending, isError } = useGetVenueEventApplicants(event.id);
	const [viewMode, setViewMode] = useState<'list' | 'media'>('list');
	const [expandedApplicantId, setExpandedApplicantId] = useState<number | null>(null);
	const [openVideoId, setOpenVideoId] = useState<number | null>(null);
	// UI-only for now — ratings live in local state until a backend exists. Kept
	// at the screen level so List/Media and the open player share them.
	const [videoRatings, setVideoRatings] = useState<Record<number, number>>({});

	const applicantCount = applicants?.length ?? fallbackApplicantCount;
	const details = event.details?.trim();
	const videoItems: ApplicantVideoItem[] =
		applicants?.flatMap((applicant) =>
			applicant.videos.map((video) => ({ applicant, video }))
		) ?? [];
	// Derived, never stored: a withdrawn applicant disappearing on refetch
	// collapses the open player back to the grid (desktop idiom).
	const openItem = videoItems.find(({ video }) => video.id === openVideoId) ?? null;

	const rateVideo = (videoId: number, value: number) =>
		setVideoRatings((prev) => {
			if (value === 0) {
				const rest = { ...prev };
				delete rest[videoId];
				return rest;
			}
			return { ...prev, [videoId]: value };
		});

	return (
		<div className="relative flex h-full flex-col">
			<div
				className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[12px] pt-[10px]"
				style={{
					overscrollBehavior: 'contain',
					WebkitOverflowScrolling: 'touch',
					paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
				}}
			>
				<div className="flex shrink-0 flex-col gap-[8px] rounded-[9.496px] border-[2.374px] border-black bg-[#DFF6CE] p-[10px] font-inter text-black">
					<div className="flex items-center gap-[6px]">
						<button
							type="button"
							onClick={onBack}
							aria-label="Back to events"
							className="-my-[11px] -ml-[12px] flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center"
						>
							<ChevronLeft className="h-[22px] w-[22px]" />
						</button>
						<MapStackStarIcon size={20} className="shrink-0" />
						<span className="min-w-0 flex-1 truncate text-[18px] font-bold leading-none">
							{event.name}
						</span>
						{/* Hit-slop wrapper keeps the visible pill at 22px with a ~44px target. */}
						<button
							type="button"
							onClick={() => onEditEvent(event.id)}
							aria-label={`Edit ${event.name}`}
							className="-m-[11px] shrink-0 cursor-pointer p-[11px]"
						>
							<span className="flex h-[22px] items-center rounded-[6px] border-[1.5px] border-black bg-white px-[8px] text-[11px] font-medium leading-none">
								edit
							</span>
						</button>
					</div>
					<div className="flex flex-wrap items-center gap-[6px]">
						<span className="flex h-[22px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#F7EFC0] px-[8px] text-[12px] font-medium leading-none">
							{formatApplicantCount(applicantCount)}
						</span>
						<span className="flex h-[22px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#FF818A] px-[8px] text-[12px] font-medium leading-none">
							{formatVenueOpportunityDate(event.whenLabel, event.startsAt)}
						</span>
						{isVenueOpportunityLive(event) && (
							<span className="flex h-[22px] shrink-0 items-center justify-center gap-[4px] rounded-[8px] border-[1.5px] border-black bg-[#C5EDA0] px-[8px] text-[12px] font-medium leading-none">
								<span
									aria-hidden="true"
									className="h-[7px] w-[7px] rounded-full bg-[#34A853]"
								/>
								Live
							</span>
						)}
					</div>
					{details && (
						<span
							className="overflow-hidden text-[12px] italic leading-[14px] text-black/70"
							style={{
								display: '-webkit-box',
								WebkitBoxOrient: 'vertical',
								WebkitLineClamp: 2,
							}}
						>
							“{details}”
						</span>
					)}
				</div>
				{isPending ? (
					<div className="flex shrink-0 flex-col gap-[8px]">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className="mobile-venue-cards-loading-wave-card h-[56px] w-full shrink-0 rounded-[9.496px]"
								style={{
									animationDelay: `${-(SKELETON_WAVE_DURATION_S - index * SKELETON_WAVE_STEP_S)}s`,
								}}
							/>
						))}
					</div>
				) : isError ? (
					<SectionNotice>Couldn’t load applicants.</SectionNotice>
				) : !applicants || applicants.length === 0 ? (
					<SectionNotice>No applicants yet.</SectionNotice>
				) : viewMode === 'media' ? (
					videoItems.length === 0 ? (
						<SectionNotice>No media submitted yet.</SectionNotice>
					) : openItem ? (
						<div className="flex shrink-0 flex-col gap-[10px]">
							<div className="shrink-0 rounded-[12px] border-[2px] border-black bg-white p-[10px]">
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
									<button
										type="button"
										onClick={() => setOpenVideoId(null)}
										aria-label="Close media"
										className="absolute right-0 top-0 flex h-[44px] w-[44px] cursor-pointer items-center justify-center"
									>
										<span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/55 text-white">
											<X className="h-[16px] w-[16px]" />
										</span>
									</button>
								</div>
							</div>
							<div className="flex justify-center">
								<VideoRatingStars
									rating={videoRatings[openItem.video.id] ?? 0}
									onRate={(value) => rateVideo(openItem.video.id, value)}
									starWidth={26}
									starHeight={24}
									gap={6}
									unratedOutline="#B2B2B2"
									buttonClassName="p-[6px] -m-[4px]"
								/>
							</div>
							<MobileApplicantProfileCard
								applicant={openItem.applicant}
								playingVideoId={openItem.video.id}
								onOpenVideo={(id) => setOpenVideoId(id)}
								videoRatings={videoRatings}
							/>
						</div>
					) : (
						<div className="grid shrink-0 grid-cols-3 gap-[6px]">
							{videoItems.map((item) => (
								<MobileMediaGridTile
									key={item.video.id}
									item={item}
									rating={videoRatings[item.video.id] ?? 0}
									onOpen={() => setOpenVideoId(item.video.id)}
									onRate={(value) => rateVideo(item.video.id, value)}
								/>
							))}
						</div>
					)
				) : (
					<div className="shrink-0 overflow-hidden rounded-[12px] border-[2px] border-black bg-white">
						{applicants.map((applicant, index) => (
							<Fragment key={applicant.id}>
								<MobileApplicantRow
									applicant={applicant}
									rating={getApplicantRating(applicant, videoRatings)}
									striped={index % 2 === 1}
									expanded={applicant.id === expandedApplicantId}
									onToggle={() =>
										setExpandedApplicantId(
											applicant.id === expandedApplicantId ? null : applicant.id
										)
									}
								/>
								{applicant.id === expandedApplicantId && (
									<MobileApplicantProfileCard
										applicant={applicant}
										onOpenVideo={(videoId) => {
											setViewMode('media');
											setOpenVideoId(videoId);
										}}
										videoRatings={videoRatings}
										className="m-[10px]"
									/>
								)}
							</Fragment>
						))}
					</div>
				)}
			</div>
			<div
				className="absolute left-[12px] flex overflow-hidden rounded-[10px] border-[1.5px] border-black bg-white font-inter"
				style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
			>
				<button
					type="button"
					onClick={() => setViewMode('list')}
					aria-pressed={viewMode === 'list'}
					className={`flex min-h-[40px] cursor-pointer items-center gap-[5px] px-[14px] ${
						viewMode === 'list' ? 'bg-[#BCFFBD]' : ''
					}`}
				>
					<VenueListViewIcon selected={viewMode === 'list'} className="shrink-0" />
					<span
						className={`text-[13px] font-medium leading-none ${
							viewMode === 'list' ? 'text-black' : 'text-[#B2B2B2]'
						}`}
					>
						List
					</span>
				</button>
				<button
					type="button"
					onClick={() => {
						// Re-tapping Media while a video is open returns to the grid.
						if (viewMode === 'media') setOpenVideoId(null);
						setViewMode('media');
					}}
					aria-pressed={viewMode === 'media'}
					className={`flex min-h-[40px] cursor-pointer items-center gap-[5px] px-[14px] ${
						viewMode === 'media' ? 'bg-[#BCEFFF]' : ''
					}`}
				>
					<VenueMediaViewIcon selected={viewMode === 'media'} className="shrink-0" />
					<span
						className={`text-[13px] font-medium leading-none ${
							viewMode === 'media' ? 'text-black' : 'text-[#B2B2B2]'
						}`}
					>
						Media
					</span>
				</button>
			</div>
		</div>
	);
}
