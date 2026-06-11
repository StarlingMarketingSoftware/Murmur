'use client';

import type { ReactNode } from 'react';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { VenueRatingStarIcon } from '@/components/atoms/_svg/VenueRatingStarIcon';
import {
	profileBioIconSvg,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import type { VenueEventApplicant } from '@/hooks/queryHooks/useVenueApplications';
import {
	GenrePill,
	getApplicantRating,
	MEDIA_THUMB_GRADIENT,
	mediaThumbSrc,
	ratingColor,
} from '../VenueEventDetailView';

// Five NON-interactive stars (plain icons, no buttons) so this row can safely
// live inside other <button>s like the list rows. The rating is an average and
// can be fractional — round it so fill count and traffic-light color behave
// (ratingColor's `=== 3` band assumes an integer).
export function ApplicantRatingStars({ rating }: { rating: number }) {
	const fill = Math.round(rating);
	return (
		<span className="flex shrink-0 items-center gap-[2px]">
			{[1, 2, 3, 4, 5].map((value) => (
				<VenueRatingStarIcon
					key={value}
					width={12}
					height={11}
					filled={value <= fill}
					color={ratingColor(fill)}
					outlineColor={ratingColor(fill)}
				/>
			))}
		</span>
	);
}

function FieldLabel({ children }: { children: ReactNode }) {
	return (
		<span className="font-inter text-[10.292px] font-medium leading-[18.479px] text-[#9A9A9A]">
			{children}
		</span>
	);
}

function EmptyFieldValue() {
	return (
		<span className="mt-[5px] text-[14px] font-medium leading-none text-black/30">—</span>
	);
}

// Mobile restack of the desktop ApplicantDetailCard: light header row (avatar,
// name, derived stars), stacked answer fields, then a horizontal media strip.
// Ratings are read-only here; rating happens in the media view's open player.
export function MobileApplicantProfileCard({
	applicant,
	onOpenVideo,
	playingVideoId,
	className,
}: {
	applicant: VenueEventApplicant;
	onOpenVideo?: (videoId: number) => void;
	playingVideoId?: number | null;
	className?: string;
}) {
	const rating = getApplicantRating(applicant);
	return (
		<div
			className={`overflow-hidden rounded-[12px] border-[2px] border-black bg-white font-inter ${
				className ?? ''
			}`}
		>
			<div className="flex items-center gap-[8px] border-b border-black/10 px-[12px] py-[8px]">
				<span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#1E4620] text-[15px] font-bold leading-none text-white">
					{applicant.applicantName.charAt(0).toUpperCase()}
				</span>
				<span className="min-w-0 flex-1 truncate text-[17px] font-bold leading-none text-black">
					{applicant.applicantName}
				</span>
				{rating > 0 && <ApplicantRatingStars rating={rating} />}
			</div>
			<div className="flex flex-col gap-[10px] p-[12px]">
				<div className="flex flex-col items-start">
					<FieldLabel>Performing Name</FieldLabel>
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
				</div>
				<div className="flex flex-col items-start">
					<FieldLabel>Genre</FieldLabel>
					{applicant.genre ? (
						<span className="mt-[5px] flex max-w-full">
							<GenrePill genre={applicant.genre} />
						</span>
					) : (
						<EmptyFieldValue />
					)}
				</div>
				<div className="flex flex-col items-start">
					<FieldLabel>Area</FieldLabel>
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
				</div>
				<div className="flex flex-col items-start">
					<FieldLabel>Bio</FieldLabel>
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
				{applicant.videos.length > 0 && (
					<div
						className="flex gap-[8px] overflow-x-auto"
						style={{
							overscrollBehavior: 'contain',
							WebkitOverflowScrolling: 'touch',
						}}
					>
						{applicant.videos.map((video) => {
							const thumbSrc = mediaThumbSrc(video);
							const playing = video.id === playingVideoId;
							return (
								<button
									key={video.id}
									type="button"
									onClick={() => onOpenVideo?.(video.id)}
									aria-label={`Open ${applicant.applicantName}'s media`}
									className="relative h-[56px] w-[56px] shrink-0 cursor-pointer overflow-hidden rounded-[6px]"
									style={{
										background: MEDIA_THUMB_GRADIENT,
										border: playing ? '2px solid #34A853' : 'none',
									}}
								>
									{thumbSrc && (
										// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL, not a static asset
										<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
									)}
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
