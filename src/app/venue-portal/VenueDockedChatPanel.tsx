'use client';

import { useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import {
	profileBioIconSvg,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { ConversationThread } from '@/components/organisms/ConversationsPane';
import {
	useGetConversations,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import {
	useGetVenueApplications,
	useGetVenueEventApplicants,
	type VenueEventApplicant,
} from '@/hooks/queryHooks/useVenueApplications';
import {
	GenrePill,
	MatchPercentPill,
	MEDIA_THUMB_GRADIENT,
	mediaThumbSrc,
} from './VenueEventDetailView';
import { VENUE_MAP_LEFT_CLUSTER_SCALE, VENUE_MAP_OVERLAY_SCALE } from './constants';

// Never overlap the centered tool panels: below ~1510px viewport width the
// preferred 0.7 scale would cross the widest tool panel's rendered right edge
// (left 500 + 781 native × the 0.8 overlay scale), so the docked chat shrinks
// to exactly fill the strip between that edge and its right margin instead.
const TOOL_PANELS_RIGHT_EDGE_PX = 500 + 781 * VENUE_MAP_OVERLAY_SCALE;
const DOCKED_NATIVE_WIDTH_PX = 515; // keep in sync with the w-[515px] chrome below
const DOCKED_RIGHT_MARGIN_PX = 12;
const DOCKED_TOOL_CLEARANCE_PX = 12;

function useDockedChatScale() {
	const [scale, setScale] = useState(VENUE_MAP_LEFT_CLUSTER_SCALE);
	useLayoutEffect(() => {
		const update = () => {
			const available =
				window.innerWidth -
				TOOL_PANELS_RIGHT_EDGE_PX -
				DOCKED_TOOL_CLEARANCE_PX -
				DOCKED_RIGHT_MARGIN_PX;
			setScale(
				Math.min(
					VENUE_MAP_LEFT_CLUSTER_SCALE,
					Math.max(0, available / DOCKED_NATIVE_WIDTH_PX)
				)
			);
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);
	return scale;
}

// Application-time snapshot chip, same look as the Events detail card's fields.
function SnapshotChip({ icon, label }: { icon: ReactNode; label: string }) {
	return (
		<span className="flex h-[21.374px] w-fit max-w-full items-center gap-[4px] overflow-hidden rounded-[7.491px] bg-[#F4F4F4] px-[6px] text-[14px] font-medium leading-[21.374px] text-black">
			{icon}
			<span className="min-w-0 truncate">{label}</span>
		</span>
	);
}

function DockedExpandIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path d="M4 9V4H9" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M4 4L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M20 9V4H15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M20 4L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M4 15V20H9" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M4 20L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M20 15V20H15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
			<path d="M20 20L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
		</svg>
	);
}

// The seeded application-summary message rendered as the Figma structured card
// (replacing its plain HTML bubble): genre/performing-name/area chips, the bio
// box, and the submitted media's thumbnails, with the incoming-message avatar
// beside it like a regular bubble.
function DockedApplicationCard({ applicant }: { applicant: VenueEventApplicant }) {
	return (
		<div className="flex w-full items-end gap-[8px]">
			<OutlinedInitialAvatar
				initial={applicant.applicantName.trim()[0]?.toUpperCase() || '?'}
				className="h-[28px] w-[28px] shrink-0 border-black text-[14px] text-black"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-[8px] rounded-[12px] border border-black bg-white px-[12px] py-[10px] font-inter">
				<span className="text-[13px] font-semibold leading-none text-black">
					Application
				</span>
				{(applicant.matchPercent != null ||
					applicant.genre ||
					applicant.performingName ||
					applicant.area) && (
					<div className="flex flex-wrap items-center gap-[6px]">
						{applicant.matchPercent != null && (
							<MatchPercentPill percent={applicant.matchPercent} />
						)}
						{applicant.genre && <GenrePill genre={applicant.genre} />}
						{applicant.performingName && (
							<SnapshotChip
								icon={
									<span
										aria-hidden="true"
										className="block h-[16px] w-[16px] shrink-0"
										dangerouslySetInnerHTML={{ __html: profilePerformingNameIconSvg }}
									/>
								}
								label={applicant.performingName}
							/>
						)}
						{applicant.area && (
							<SnapshotChip
								icon={
									<span aria-hidden="true" className="block h-[16px] w-[13px] shrink-0">
										<ProfileAreaMarkerIcon className="h-full w-full" />
									</span>
								}
								label={applicant.area}
							/>
						)}
					</div>
				)}
				{applicant.bio && (
					<div className="flex max-h-[110px] w-full items-start gap-[9px] overflow-y-auto rounded-[9px] bg-[#F4F4F4] px-[10px] py-[9px] text-[13px] font-medium leading-[16px] text-black">
						<span
							aria-hidden="true"
							className="mt-[1px] block h-[17px] w-[8px] shrink-0"
							dangerouslySetInnerHTML={{ __html: profileBioIconSvg }}
						/>
						<span className="min-w-0 whitespace-pre-wrap">{applicant.bio}</span>
					</div>
				)}
				{applicant.videos.length > 0 && (
					<div className="flex flex-wrap gap-[8px]">
						{applicant.videos.map((video) => {
							const thumbSrc = mediaThumbSrc(video);
							return (
								<span
									key={video.id}
									className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-[6px]"
									style={{ background: MEDIA_THUMB_GRADIENT }}
								>
									{thumbSrc && (
										// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
										<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
									)}
								</span>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

// Persistent docked chat for the map view: pins the last-active thread to the
// bottom-right corner (same fixed-corner + 0.7-scale convention; the parent
// hides the notifications cluster while this is up) so the conversation stays
// in view while the user moves between tools. The parent hides it only while
// the Chat tool shows the thread itself.
// Being mounted marks the thread read as messages arrive — accepted, since the
// thread is visibly on screen the whole time.
export function VenueDockedChatPanel({
	conversationId,
	thread,
	onExpand,
}: {
	conversationId: number;
	thread: ConversationThreadFilter;
	onExpand: () => void;
}) {
	// Header identity comes from the inbox lists (cache-shared with the portal
	// root's 30s polls — no new request). Application threads resolve from the
	// Replies row; general threads (or a row gone with its deleted event) fall
	// back to the conversation list's counterpart.
	const { data: conversations } = useGetConversations({ enabled: true });
	const { data: applications } = useGetVenueApplications({ enabled: true });
	const applicationRow =
		typeof thread === 'number'
			? ((applications ?? []).find((row) => row.id === thread) ?? null)
			: null;
	const conversation =
		(conversations ?? []).find((item) => item.id === conversationId) ?? null;
	const name = applicationRow?.applicantName ?? conversation?.counterpart.name ?? '';
	// Full application snapshot (performing name, bio, media) for the structured
	// card — the same per-event endpoint the Events detail view uses, so presigned
	// media URLs are only minted for this thread's event.
	const { data: eventApplicants } = useGetVenueEventApplicants(
		applicationRow?.eventId ?? null
	);
	const applicant =
		typeof thread === 'number'
			? ((eventApplicants ?? []).find((row) => row.id === thread) ?? null)
			: null;
	const scale = useDockedChatScale();
	return (
		<div
			data-venue-tool-ui="true"
			className="fixed bottom-[24px] right-[12px] z-[100] origin-bottom-right"
			style={{ transform: `scale(${scale})` }}
		>
			{/* Tool-panel chrome at the Figma-native 515×658, scaled by the corner
			    clusters' 0.7 like everything else on the map — or smaller when the
			    viewport can't fit that beside the tool panels (see useDockedChatScale). */}
			<div
				className="relative h-[658px] w-[515px] overflow-hidden rounded-[14px] border-[2px] border-black"
				style={{
					background:
						'linear-gradient(180deg, #A1D8FC 0%, rgba(220, 241, 255, 0.50) 100%)',
				}}
			>
				<div className="absolute left-[16px] top-[1px] z-20 font-inter text-[12px] font-medium leading-[12px] text-black">
					Messages
				</div>
				<div className="absolute left-[7px] top-[14px] h-[584px] w-[501px] rounded-[14px] border-[2px] border-black bg-[#DCF1FF]" />
				<div className="absolute left-[11px] top-[22px] z-20 flex h-[35px] items-center gap-[4px]">
					<div className="flex h-[35px] w-[447px] items-center overflow-hidden rounded-[8px] border-[2px] border-black bg-white px-[14px]">
						<span className="min-w-0 truncate font-inter text-[19px] font-bold leading-none text-black">
							{name}
						</span>
					</div>
					<button
						type="button"
						onClick={onExpand}
						aria-label="Open in Chat"
						className="flex h-[35px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-[2px] border-black bg-white text-black transition hover:brightness-95"
					>
						<DockedExpandIcon className="h-[25px] w-[25px]" />
					</button>
				</div>
				<div className="absolute left-[7px] top-[60px] h-[598px] w-[501px]">
					<ConversationThread
						conversationId={conversationId}
						thread={thread}
						variant="venueMap"
						hideHeader
						applicationCard={
							applicant ? <DockedApplicationCard applicant={applicant} /> : undefined
						}
						enableBookingRequest
						venueMapComposerLayout="docked"
						className="!bg-transparent"
					/>
				</div>
			</div>
		</div>
	);
}
