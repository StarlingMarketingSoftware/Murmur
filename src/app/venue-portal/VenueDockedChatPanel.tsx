'use client';

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
						<span className="murmur-selectable min-w-0 whitespace-pre-wrap">
						{applicant.bio}
					</span>
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
// bottom-right corner (same fixed-corner convention; the parent hides the
// notifications cluster while this is up) so the conversation stays in view
// while the user moves between tools. The parent hides it while the Chat tool
// shows the thread itself, and unmounts it when useVenuePortalLayout says it
// can't render legibly (narrow/compact viewports).
// Being mounted marks the thread read as messages arrive — accepted, since the
// parent only mounts it while it's visibly on screen.
export function VenueDockedChatPanel({
	conversationId,
	thread,
	onExpand,
	scale,
	boost,
}: {
	conversationId: number;
	thread: ConversationThreadFilter;
	onExpand: () => void;
	// From useVenuePortalLayout's dockedChatScale: the corner clusters' 0.7, or
	// smaller when the viewport can't fit that beside the tool panels (both
	// already include the large-monitor boost, which also scales the corner
	// margins below).
	scale: number;
	boost: number;
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
	return (
		<div
			data-venue-tool-ui="true"
			className="fixed z-[100] origin-bottom-right"
			style={{
				bottom: 24 * boost,
				right: 12 * boost,
				transform: `scale(${scale})`,
			}}
		>
			{/* Tool-panel chrome at the Figma-native 515×658, scaled by the corner
			    clusters' 0.7 like everything else on the map — or smaller when the
			    viewport can't fit that beside the tool panels (see the scale prop). */}
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
