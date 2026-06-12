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
import { getMatchScores } from '@/app/api/_utils/applicationMatch/matchScores';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
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
	rating: number; // this venue user's personal rating; 0 = unrated
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
	matchPercent: number | null; // 0-100 event-fit score; null until computed
	videos: VenueEventApplicationVideo[];
};

export type VenueEventApplicantsResponse = { applicants: VenueEventApplicant[] };

// GET /api/venue/events/:id/applications — full application snapshots (answers +
// frozen media, presigned for playback) for one of the venue's events, for the
// Events panel's detail view. venueUserId is denormalized == Event.userId at apply
// time, so the where clause is both the ownership check and the filter — no Event
// join needed, and a non-owned event id simply yields an empty list.
export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		// Primarily a cached read: the ApplicationMatchScore DB cache means the
		// Gemini scorer fires at most once per event per content change, so the
		// AI tiers would only throttle plain grid navigation here.
		const limited = await withRateLimit(req, 'read-cheap', 'venue-event-applications');
		if (limited) {
			return limited;
		}

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

		const [applications, scoringEvent, scoringVenue] = await Promise.all([
			prisma.eventApplication.findMany({
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
			}),
			// Scoring context for the match percent (event + the venue profile).
			prisma.event.findFirst({
				where: { id: eventId, userId },
				select: {
					id: true,
					name: true,
					genres: true,
					size: true,
					whenLabel: true,
					startsAt: true,
					address: true,
					latitude: true,
					longitude: true,
					pay: true,
					details: true,
				},
			}),
			prisma.venue.findUnique({
				where: { userId },
				select: {
					businessType: true,
					capacityMin: true,
					capacityMax: true,
					genres: true,
					city: true,
					state: true,
					sound: true,
					description: true,
				},
			}),
		]);

		// Kick off scoring now (not awaited) so first-compute LLM latency overlaps
		// the presigning work below. getMatchScores never throws by contract;
		// belt-and-braces so a scoring bug can never 500 the applicant list.
		const scoresPromise: Promise<Map<number, number>> = scoringEvent
			? getMatchScores(
					applications.map((application) => ({
						id: application.id,
						genre: application.genre,
						area: application.area,
						performingName: application.performingName,
						bio: application.bio,
						videos: application.videos.map((video) => ({
							id: video.id,
							kind: video.kind,
							durationSec: video.durationSec,
						})),
					})),
					scoringEvent,
					scoringVenue,
					userId,
					{
						// Secondary budget gate on the LLM fan-out only: cached and
						// fallback reads stay on 'read-cheap', but content-churn (event
						// edits re-hash every applicant) can't exceed the AI budget.
						llmGate: async () =>
							(await withRateLimit(req, 'ai-burst-guard', 'venue-match-scoring-llm')) ==
							null,
					}
				).catch(() => new Map<number, number>())
			: Promise.resolve(new Map<number, number>());

		// This venue user's personal ratings for the listed videos, batched and keyed
		// by videoId (hits the (userId, videoId) unique index). rating 0 = cleared.
		const videoIds = applications.flatMap((a) => a.videos.map((v) => v.id));
		const ratings = videoIds.length
			? await prisma.applicationVideoRating.findMany({
					where: { userId, videoId: { in: videoIds } },
					select: { videoId: true, rating: true },
				})
			: [];
		const ratingByVideoId = new Map(ratings.map((r) => [r.videoId, r.rating]));

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
							const rating = ratingByVideoId.get(rest.id) ?? 0;
							// YouTube embeds have no R2 object: watch URL + CDN thumbnail.
							if (rest.sourceType === 'youtube') {
								const videoId = embedUrl ? extractYouTubeId(embedUrl) : null;
								return {
									...rest,
									url: embedUrl,
									posterUrl: videoId ? youTubeThumbnailUrl(videoId) : null,
									rating,
								};
							}
							return {
								...rest,
								url: key ? await getPresignedGetUrl(key, contentType ?? undefined) : null,
								posterUrl: posterKey
									? await getPresignedGetUrl(posterKey, 'image/jpeg')
									: null,
								rating,
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
					matchPercent: null,
					videos,
				};
			})
		);

		const matchScores = await scoresPromise;
		for (const applicant of applicants) {
			applicant.matchPercent = matchScores.get(applicant.id) ?? null;
		}
		// Best fit first; unscored rows sink to the bottom. The sort is stable, so
		// equal scores keep the query's createdAt desc order.
		applicants.sort((a, b) => {
			if (a.matchPercent == null) return b.matchPercent == null ? 0 : 1;
			if (b.matchPercent == null) return -1;
			return b.matchPercent - a.matchPercent;
		});

		return apiResponse<VenueEventApplicantsResponse>({ applicants });
	} catch (error) {
		return handleApiError(error);
	}
}
