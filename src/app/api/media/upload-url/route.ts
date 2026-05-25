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
import { buildMediaKey, getPresignedPutUrl } from '@/app/api/_utils/r2';
import { MediaKind } from '@prisma/client';

/**
 * Per-context rules: which media kinds are allowed and how many a user may keep.
 * Adding a future consumer = add a context here (the rest of the store is generic).
 */
const CONTEXT_CONFIG = {
	profile_media: { limit: 3, kinds: ['video', 'audio'] as MediaKind[] },
	avatar: { limit: 1, kinds: ['image'] as MediaKind[] },
} as const;

const createUploadUrlSchema = z.object({
	filename: z.string().min(1).max(255),
	contentType: z.string().min(1).max(255),
	kind: z.nativeEnum(MediaKind),
	context: z.enum(['profile_media', 'avatar']),
	posterContentType: z.string().min(1).max(255).optional(),
});
export type CreateMediaUploadUrlData = z.infer<typeof createUploadUrlSchema>;

export type CreateMediaUploadUrlResponse = {
	id: number;
	shareId: string;
	key: string;
	posterKey: string | null;
	/** Presigned PUT URL — the browser uploads the file bytes directly here. */
	uploadUrl: string;
	/** Presigned PUT URL for the poster/thumbnail, when one was requested. */
	posterUploadUrl: string | null;
};

const kindMatchesContentType = (kind: MediaKind, contentType: string): boolean =>
	contentType.split('/')[0] === kind;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createUploadUrlSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { filename, contentType, kind, context, posterContentType } =
			validatedData.data;

		const config = CONTEXT_CONFIG[context];
		if (!config.kinds.includes(kind)) {
			return apiBadRequest(`Kind "${kind}" is not allowed for context "${context}".`);
		}
		if (!kindMatchesContentType(kind, contentType)) {
			return apiBadRequest(
				`Content type "${contentType}" does not match kind "${kind}".`
			);
		}

		const existingCount = await prisma.mediaAsset.count({ where: { userId, context } });
		if (existingCount >= config.limit) {
			return apiConflict(
				`Limit reached: at most ${config.limit} item(s) allowed for "${context}".`
			);
		}

		const key = buildMediaKey(userId, context, filename);
		const posterKey = posterContentType ? `${key}.poster.jpg` : null;

		const asset = await prisma.mediaAsset.create({
			data: {
				userId,
				kind,
				context,
				key,
				posterKey,
				filename,
				contentType,
				status: 'uploading',
				position: existingCount,
			},
		});

		const uploadUrl = await getPresignedPutUrl(key);
		const posterUploadUrl = posterKey ? await getPresignedPutUrl(posterKey) : null;

		const response: CreateMediaUploadUrlResponse = {
			id: asset.id,
			shareId: asset.shareId,
			key: asset.key,
			posterKey: asset.posterKey,
			uploadUrl,
			posterUploadUrl,
		};
		return apiCreated(response);
	} catch (error) {
		return handleApiError(error);
	}
}
