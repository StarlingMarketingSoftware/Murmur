import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import {
	apiBadRequest,
	apiConflict,
	apiCreated,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { CONTEXT_CONFIG } from '@/app/api/media/upload-url/route';
import { MediaAssetDto } from '@/app/api/media/route';
import { extractYouTubeId, youTubeThumbnailUrl, youTubeWatchUrl } from '@/utils/youtube';

// Restricted to profile_media: this is the only pool that holds video embeds today,
// and the literal keeps embeds from leaking into the avatar/venue pools.
const createEmbedSchema = z.object({
	url: z.string().min(1).max(2048),
	context: z.literal('profile_media'),
});
export type CreateMediaEmbedData = z.infer<typeof createEmbedSchema>;
export type CreateMediaEmbedResponse = MediaAssetDto;

/**
 * Creates a born-`ready` YouTube embed as a MediaAsset row. Unlike an upload there
 * is no file and no R2 object: the canonical watch URL lives in `embedUrl`, `key`
 * holds a synthetic sentinel (never touched by R2), and every read/delete path
 * branches on `sourceType`.
 */
export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createEmbedSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { url, context } = validatedData.data;

		const videoId = extractYouTubeId(url);
		if (!videoId) {
			return apiBadRequest('Not a valid YouTube link.');
		}

		// Embeds count against the same per-context cap as uploads.
		const limit = CONTEXT_CONFIG[context].limit;
		const existingCount = await prisma.mediaAsset.count({ where: { userId, context } });
		if (existingCount >= limit) {
			return apiConflict(
				`Limit reached: at most ${limit} item(s) allowed for "${context}".`
			);
		}

		const asset = await prisma.mediaAsset.create({
			data: {
				userId,
				kind: 'video',
				context,
				sourceType: 'youtube',
				embedUrl: youTubeWatchUrl(videoId),
				// Synthetic key — never written to / read from R2; satisfies the NOT NULL column.
				key: `youtube/${userId}/${videoId}`,
				posterKey: null,
				filename: 'YouTube video',
				contentType: 'video/youtube',
				status: 'ready',
				position: existingCount,
			},
		});

		// Strip the R2 keys — the client DTO never exposes them.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { key: _key, posterKey: _posterKey, ...rest } = asset;
		const response: CreateMediaEmbedResponse = {
			...rest,
			url: youTubeWatchUrl(videoId),
			posterUrl: youTubeThumbnailUrl(videoId),
		};
		return apiCreated(response);
	} catch (error) {
		return handleApiError(error);
	}
}
