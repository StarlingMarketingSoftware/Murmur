import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { Prisma, type EventApplication } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiCreated,
	apiNotFound,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { buildMediaKey, copyObject, deleteObject } from '@/app/api/_utils/r2';
import type { ApiRouteParams } from '@/types';

const createApplicationSchema = z.object({
	genre: z.string().trim().max(120).optional(),
	area: z.string().trim().max(200).optional(),
	performingName: z.string().trim().max(200).optional(),
	bio: z.string().trim().max(5000).optional(),
	// Profile MediaAsset ids the applicant chose to submit (re-validated server-side).
	mediaAssetIds: z.array(z.number().int().positive()).max(3).default([]),
});

export type CreateApplicationData = z.infer<typeof createApplicationSchema>;
export type EventApplicationResponse = { application: EventApplication };

/**
 * POST /api/events/:id/applications — a standard user applies to a venue's Event.
 *
 * Answers are snapshotted (point-in-time submission). Submitted videos are FROZEN:
 * each upload is copied to an application-scoped R2 key so the venue's record is
 * immutable against the artist later editing/deleting their shared profile reel.
 * Keyed `(eventId, standardUserId)` unique → re-applying edits the submission in place.
 */
export async function POST(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const eventId = Number(id);
		if (!Number.isInteger(eventId) || eventId <= 0) {
			return apiBadRequest('Invalid event id');
		}

		const body = await req.json().catch(() => null);
		const validated = createApplicationSchema.safeParse(body);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		// Confirm the event exists and capture the owning venue (denormalized onto the
		// application for direct venue-side lookups). Event.userId is the venue clerkId.
		const event = await prisma.event.findUnique({
			where: { id: eventId },
			select: { userId: true },
		});
		if (!event) {
			return apiNotFound('Event not found');
		}
		if (event.userId === userId) {
			return apiBadRequest('You cannot apply to your own event');
		}

		// Anti-spoof: keep only the caller's own ready profile videos, in submitted order.
		const requestedIds = validated.data.mediaAssetIds;
		const owned = requestedIds.length
			? await prisma.mediaAsset.findMany({
					where: {
						id: { in: requestedIds },
						userId,
						context: 'profile_media',
						status: 'ready',
					},
				})
			: [];
		const ownedById = new Map(owned.map((m) => [m.id, m]));
		const orderedAssets = requestedIds
			.map((mediaId) => ownedById.get(mediaId))
			.filter((m): m is (typeof owned)[number] => Boolean(m));

		// Upsert the application (one per event+applicant). Re-applying replaces the
		// answer snapshot and revives a withdrawn application.
		const answers = {
			genre: validated.data.genre ?? null,
			area: validated.data.area ?? null,
			performingName: validated.data.performingName ?? null,
			bio: validated.data.bio ?? null,
		};
		const application = await prisma.eventApplication.upsert({
			where: { eventId_standardUserId: { eventId, standardUserId: userId } },
			create: { eventId, standardUserId: userId, venueUserId: event.userId, ...answers },
			update: { ...answers, status: 'submitted' },
		});

		// Previous frozen copies (if re-applying) — deleted from R2 after the swap.
		const previousVideos = await prisma.applicationVideo.findMany({
			where: { applicationId: application.id },
			select: { key: true, posterKey: true },
		});

		// FREEZE: copy each upload (+ poster) to an application-scoped key. YouTube
		// embeds have no R2 object — snapshot the watch URL. Copy NEW objects before
		// swapping rows so a copy failure leaves the existing application untouched.
		const freshlyCopied: string[] = [];
		let rows: Prisma.ApplicationVideoCreateManyInput[] = [];
		try {
			rows = await Promise.all(
				orderedAssets.map(async (asset, position): Promise<Prisma.ApplicationVideoCreateManyInput> => {
					const base = {
						applicationId: application.id,
						sourceMediaAssetId: asset.id,
						kind: asset.kind,
						sourceType: asset.sourceType,
						filename: asset.filename,
						contentType: asset.contentType,
						durationSec: asset.durationSec,
						position,
					};
					if (asset.sourceType === 'youtube') {
						return { ...base, key: null, posterKey: null, embedUrl: asset.embedUrl };
					}
					const destKey = buildMediaKey(
						`app_${application.id}`,
						'application_video',
						asset.filename
					);
					await copyObject(asset.key, destKey);
					freshlyCopied.push(destKey);
					let destPosterKey: string | null = null;
					if (asset.posterKey) {
						destPosterKey = buildMediaKey(
							`app_${application.id}`,
							'application_video',
							`poster-${asset.filename}.jpg`
						);
						await copyObject(asset.posterKey, destPosterKey);
						freshlyCopied.push(destPosterKey);
					}
					return { ...base, key: destKey, posterKey: destPosterKey, embedUrl: null };
				})
			);
		} catch (copyError) {
			// Roll back partial copies; the existing application rows are untouched.
			await Promise.allSettled(freshlyCopied.map((k) => deleteObject(k)));
			throw copyError;
		}

		// Swap the video rows atomically, then best-effort delete the OLD frozen objects.
		await prisma.$transaction([
			prisma.applicationVideo.deleteMany({ where: { applicationId: application.id } }),
			...(rows.length ? [prisma.applicationVideo.createMany({ data: rows })] : []),
		]);
		await Promise.allSettled(
			previousVideos
				.flatMap((v) => [v.key, v.posterKey])
				.filter((k): k is string => Boolean(k))
				.map((k) => deleteObject(k))
		);

		return apiCreated<EventApplicationResponse>({ application });
	} catch (error) {
		return handleApiError(error);
	}
}
