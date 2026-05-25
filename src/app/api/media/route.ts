import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { getPresignedGetUrl } from '@/app/api/_utils/r2';
import { MediaAsset } from '@prisma/client';

/**
 * Media row as returned to the owning client: raw R2 keys are dropped and replaced
 * with short-lived presigned URLs for playback (`url`) and thumbnail (`posterUrl`).
 */
export type MediaAssetDto = Omit<MediaAsset, 'key' | 'posterKey'> & {
	url: string | null;
	posterUrl: string | null;
};

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const context = req.nextUrl.searchParams.get('context') ?? undefined;

		const assets = await prisma.mediaAsset.findMany({
			where: { userId, ...(context ? { context } : {}) },
			orderBy: [{ context: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
		});

		const data: MediaAssetDto[] = await Promise.all(
			assets.map(async ({ key, posterKey, ...rest }) => {
				const ready = rest.status === 'ready';
				return {
					...rest,
					url: ready ? await getPresignedGetUrl(key, rest.contentType) : null,
					posterUrl:
						ready && posterKey ? await getPresignedGetUrl(posterKey, 'image/jpeg') : null,
				};
			})
		);

		return apiResponse(data);
	} catch (error) {
		return handleApiError(error);
	}
}
