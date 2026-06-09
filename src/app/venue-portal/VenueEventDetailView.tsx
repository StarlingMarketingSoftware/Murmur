'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Event as VenueEvent } from '@prisma/client';
import { Play } from 'lucide-react';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { ProfileMediaWaveform } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	getProfileGenreIcon,
	profileBioIconSvg,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { MediaAssetPlayer } from '@/components/molecules/MediaAssetPlayer/MediaAssetPlayer';
import {
	useGetVenueEventApplicants,
	type VenueEventApplicant,
	type VenueEventApplicationVideo,
} from '@/hooks/queryHooks/useVenueApplications';
import {
	formatVenueOpportunityDate,
	formatVenueOpportunityTimeRange,
} from './venueOpportunityFormat';

// Same artwork fallback gradient as the profile media slot cards.
const MEDIA_THUMB_GRADIENT =
	'linear-gradient(145deg, #EF3030 0%, #F44458 36%, #F04CCB 72%, #FF64D8 100%)';

const getMediaDisplayTitle = (filename: string) =>
	filename.replace(/\.[^/.]+$/, '').trim() || filename;

// Poster for uploads/youtube; images have no poster, so fall back to the image itself.
const mediaThumbSrc = (video: VenueEventApplicationVideo) =>
	video.posterUrl ?? (video.kind === 'image' ? video.url : null);

const formatApplicantCount = (count: number) =>
	`${count} applicant${count === 1 ? '' : 's'}`;

function EventDatePill({ event }: { event: VenueEvent }) {
	return (
		<span className="flex h-[24px] w-[112px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#FF818A] text-[14px] font-medium leading-none">
			{formatVenueOpportunityDate(event.whenLabel, event.startsAt)}
		</span>
	);
}

function GenrePill({ genre }: { genre: string }) {
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
// event. The selected card reads solid white against the translucent siblings.
function EventSidebarCard({
	event,
	applicantCount,
	selected,
	onSelect,
}: {
	event: VenueEvent;
	applicantCount: number;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-label={`View applicants for ${event.name}`}
			className={`flex w-full shrink-0 cursor-pointer flex-col items-start gap-[6px] rounded-[12px] border-[2px] border-black p-[10px] text-left font-inter text-black transition ${
				selected ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
			}`}
		>
			<span className="w-full truncate text-[16px] font-bold leading-none">
				{event.name}
			</span>
			<span className="flex h-[22px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#F7EFC0] px-[8px] text-[12px] font-medium leading-none">
				{formatApplicantCount(applicantCount)}
			</span>
			<span className="flex w-full items-center gap-[8px]">
				<EventDatePill event={event} />
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
	return (
		<div className="mx-[12px] my-[10px] shrink-0 overflow-hidden rounded-[12px] border-[2px] border-black bg-white font-inter">
			<div className="flex h-[36px] shrink-0 items-center bg-[#1E4620] px-[14px] text-[18px] font-bold leading-none text-white">
				<span className="min-w-0 truncate">{applicant.applicantName}</span>
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
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={expanded}
			className={`flex h-[44px] w-full shrink-0 cursor-pointer items-center gap-[12px] px-[20px] text-left font-inter transition hover:brightness-95 ${
				striped ? 'bg-[#E4F5E0]' : 'bg-white'
			}`}
		>
			<span
				className={`min-w-0 flex-1 truncate text-[17px] leading-none text-black ${
					expanded ? 'font-bold' : 'font-semibold'
				}`}
			>
				{applicant.applicantName}
			</span>
			{applicant.genre && <GenrePill genre={applicant.genre} />}
			<span className="flex shrink-0 gap-[6px]">
				{applicant.videos.map((video) => {
					const thumbSrc = mediaThumbSrc(video);
					return (
						<span
							key={video.id}
							className="h-[28px] w-[28px] shrink-0 overflow-hidden rounded-[6px]"
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

// The right box: selected event's header (name, count, date, details quote, edit)
// over the scrolling applicant list. Owns the expanded-applicant selection; the
// parent remounts it (key={event.id}) when the event switches so expansion resets.
function EventApplicantsBox({
	event,
	fallbackApplicantCount,
	onEditEvent,
}: {
	event: VenueEvent;
	fallbackApplicantCount: number;
	onEditEvent: (eventId: number) => void;
}) {
	const { data: applicants, isPending, isError } = useGetVenueEventApplicants(event.id);
	const [expandedApplicantId, setExpandedApplicantId] = useState<number | null>(null);
	// Derived, never stored: an applicant disappearing on refetch (withdrawal)
	// collapses the card automatically.
	const expandedApplicant =
		applicants?.find((applicant) => applicant.id === expandedApplicantId) ?? null;
	const applicantCount = applicants?.length ?? fallbackApplicantCount;
	const details = event.details?.trim();
	return (
		<div className="flex h-full w-[540px] shrink-0 flex-col overflow-hidden rounded-[12px] border-[2px] border-black bg-[#F3FFF0]">
			<div className="flex shrink-0 flex-col gap-[8px] px-[20px] pb-[12px] pt-[16px] font-inter text-black">
				<div className="flex items-center gap-[12px]">
					<span className="min-w-0 flex-1 truncate text-[28px] font-bold leading-none">
						{event.name}
					</span>
					<button
						type="button"
						onClick={() => onEditEvent(event.id)}
						aria-label={`Edit ${event.name}`}
						className="flex h-[24px] shrink-0 cursor-pointer items-center rounded-[8px] border-[1.5px] border-black bg-white px-[10px] text-[13px] font-medium leading-none transition hover:brightness-95"
					>
						edit
					</button>
				</div>
				<div className="flex items-center gap-[10px]">
					<span className="flex h-[24px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#F7EFC0] px-[10px] text-[14px] font-medium leading-none">
						{formatApplicantCount(applicantCount)}
					</span>
					<EventDatePill event={event} />
					<span className="min-w-0 truncate text-[16px] font-medium leading-none">
						{formatVenueOpportunityTimeRange(event.startTime, event.endTime)}
					</span>
				</div>
				{details && (
					<span className="truncate text-[14px] italic leading-none text-black/70">
						“{details}”
					</span>
				)}
			</div>
			<div className="h-[2px] shrink-0 bg-black" />
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
				{isPending ? (
					<SectionNotice>Loading…</SectionNotice>
				) : isError ? (
					<SectionNotice>Couldn’t load applicants.</SectionNotice>
				) : !applicants || applicants.length === 0 ? (
					<SectionNotice>No applicants yet.</SectionNotice>
				) : (
					<>
						{expandedApplicant && <ApplicantDetailCard applicant={expandedApplicant} />}
						{applicants.map((applicant, index) => (
							<ApplicantRow
								key={applicant.id}
								applicant={applicant}
								striped={index % 2 === 0}
								expanded={applicant.id === expandedApplicantId}
								onToggle={() =>
									setExpandedApplicantId(
										applicant.id === expandedApplicantId ? null : applicant.id
									)
								}
							/>
						))}
					</>
				)}
			</div>
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
}: {
	events: VenueEvent[];
	selectedEventId: number;
	applicantCountByEventId: Map<number, number>;
	onSelectEvent: (eventId: number) => void;
	onAddEvent: () => void;
	onEditEvent: (eventId: number) => void;
}) {
	const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
	return (
		// The backdrop gradient carries its alpha in its second stop, so no separate
		// opacity layer is needed (unlike the list mode's opacity-90 trick).
		<div className="flex h-full w-full gap-[4px] bg-[linear-gradient(180deg,#5EAD52_0%,rgba(255,255,255,0.42)_100%)] p-[2px]">
			<div className="flex h-full w-[213px] shrink-0 flex-col gap-[8px] overflow-y-auto rounded-[12px] border-[2px] border-black bg-[linear-gradient(180deg,#C1F7BB_0%,#60AE92_100%)] p-[8px]">
				{events.map((event) => (
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
					className="flex h-[40px] w-full shrink-0 cursor-pointer items-center justify-center rounded-[12px] border-[2px] border-black bg-white transition hover:brightness-95"
				>
					<span className="text-[20px] font-medium leading-none text-black">+</span>
				</button>
			</div>
			{selectedEvent && (
				<EventApplicantsBox
					key={selectedEvent.id}
					event={selectedEvent}
					fallbackApplicantCount={applicantCountByEventId.get(selectedEvent.id) ?? 0}
					onEditEvent={onEditEvent}
				/>
			)}
		</div>
	);
}
