import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import { ApiRouteParams } from '@/types';

const patchVideoRatingSchema = z.object({
	rating: z.number().int().min(0).max(5),
});
export type PatchVideoRatingData = z.infer<typeof patchVideoRatingSchema>;

export type VideoRatingResponse = {
	videoId: number;
	applicationId: number;
	rating: number;
	updatedAt: string;
};

// PATCH /api/venue/application-videos/:id/rating — upsert the venue user's
// personal 1–5 star rating of one submitted application video. rating 0 clears
// (the row is kept, never hard-deleted). Per-user: keyed (userId, videoId).
export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
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
		const videoId = Number(id);
		if (!Number.isInteger(videoId)) {
			return apiBadRequest('Invalid video id');
		}

		const body = await req.json();
		const validatedData = patchVideoRatingSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		// Existence + ownership in one query; 404 for missing AND non-owned so
		// foreign video ids don't leak existence.
		const video = await prisma.applicationVideo.findUnique({
			where: { id: videoId },
			select: {
				applicationId: true,
				application: { select: { venueUserId: true, standardUserId: true } },
			},
		});
		if (!video || video.application.venueUserId !== userId) {
			return apiNotFound();
		}

		const saved = await prisma.applicationVideoRating.upsert({
			where: { userId_videoId: { userId, videoId } },
			create: {
				userId,
				videoId,
				applicationId: video.applicationId,
				standardUserId: video.application.standardUserId,
				rating: validatedData.data.rating,
			},
			update: { rating: validatedData.data.rating },
		});

		return apiResponse<VideoRatingResponse>({
			videoId,
			applicationId: saved.applicationId,
			rating: saved.rating,
			updatedAt: saved.updatedAt.toISOString(),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
