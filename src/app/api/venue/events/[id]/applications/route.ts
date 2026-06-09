import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ApplicationStatus, type MediaKind, type MediaSource } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getPresignedGetUrl } from '@/app/api/_utils/r2';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import { extractYouTubeId, youTubeThumbnailUrl } from '@/utils/youtube';
import type { ApiRouteParams } from '@/types';

export type VenueEventApplicationVideo = {
	id: number;
	kind: MediaKind;
	sourceType: MediaSource;
	filename: string | null;
	durationSec: number | null;
	position: number;
	url: string | null; // presigned R2 GET (upload) or YouTube watch URL (youtube)
	posterUrl: string | null; // presigned poster (upload) or YouTube CDN thumbnail
};

export type VenueEventApplicant = {
	id: number; // EventApplication.id
	standardUserId: string;
	applicantName: string;
	performingName: string | null;
	genre: string | null;
	area: string | null;
	bio: string | null;
	createdAt: string; // ISO submission time
	videos: VenueEventApplicationVideo[];
};

export type VenueEventApplicantsResponse = { applicants: VenueEventApplicant[] };

// GET /api/venue/events/:id/applications — full application snapshots (answers +
// frozen media, presigned for playback) for one of the venue's events, for the
// Events panel's detail view. venueUserId is denormalized == Event.userId at apply
// time, so the where clause is both the ownership check and the filter — no Event
// join needed, and a non-owned event id simply yields an empty list.
export async function GET(_req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const guard = await assertVenueAccount(userId);
		if (guard) {
			return guard;
		}

		const { id } = await params;
		const eventId = Number(id);
		if (!Number.isInteger(eventId)) {
			return apiBadRequest('Invalid event id');
		}

		const applications = await prisma.eventApplication.findMany({
			where: { eventId, venueUserId: userId, status: ApplicationStatus.submitted },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				standardUserId: true,
				performingName: true,
				genre: true,
				area: true,
				bio: true,
				createdAt: true,
				videos: {
					orderBy: { position: 'asc' },
					select: {
						id: true,
						kind: true,
						sourceType: true,
						key: true,
						posterKey: true,
						embedUrl: true,
						filename: true,
						contentType: true,
						durationSec: true,
						position: true,
					},
				},
			},
		});

		const applicantIds = [...new Set(applications.map((a) => a.standardUserId))];
		const users = applicantIds.length
			? await prisma.user.findMany({
					where: { clerkId: { in: applicantIds } },
					select: { clerkId: true, firstName: true, lastName: true, email: true },
				})
			: [];
		const userByClerkId = new Map(users.map((u) => [u.clerkId, u]));

		const applicants: VenueEventApplicant[] = await Promise.all(
			applications.map(async (application) => {
				const applicant = userByClerkId.get(application.standardUserId);
				const applicantName =
					[applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ').trim() ||
					applicant?.email ||
					'Unknown';
				const videos = await Promise.all(
					application.videos.map(
						async ({
							key,
							posterKey,
							embedUrl,
							contentType,
							...rest
						}): Promise<VenueEventApplicationVideo> => {
							// YouTube embeds have no R2 object: watch URL + CDN thumbnail.
							if (rest.sourceType === 'youtube') {
								const videoId = embedUrl ? extractYouTubeId(embedUrl) : null;
								return {
									...rest,
									url: embedUrl,
									posterUrl: videoId ? youTubeThumbnailUrl(videoId) : null,
								};
							}
							return {
								...rest,
								url: key ? await getPresignedGetUrl(key, contentType ?? undefined) : null,
								posterUrl: posterKey
									? await getPresignedGetUrl(posterKey, 'image/jpeg')
									: null,
							};
						}
					)
				);
				return {
					id: application.id,
					standardUserId: application.standardUserId,
					applicantName,
					performingName: application.performingName,
					genre: application.genre,
					area: application.area,
					bio: application.bio,
					createdAt: application.createdAt.toISOString(),
					videos,
				};
			})
		);

		return apiResponse<VenueEventApplicantsResponse>({ applicants });
	} catch (error) {
		return handleApiError(error);
	}
}
