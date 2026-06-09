import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { deleteObject, objectExists } from '@/app/api/_utils/r2';
import { ApiRouteParams } from '@/types';
import { MediaStatus } from '@prisma/client';

const updateMediaSchema = z.object({
	status: z.nativeEnum(MediaStatus).optional(),
	durationSec: z.number().positive().optional(),
	sizeBytes: z.number().int().positive().optional(),
	position: z.number().int().min(0).optional(),
});
export type UpdateMediaData = z.infer<typeof updateMediaSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const { id } = await params;

		const body = await req.json();
		const validatedData = updateMediaSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const asset = await prisma.mediaAsset.findUnique({
			where: { id: Number(id), userId },
		});
		if (!asset) {
			return apiNotFound();
		}
		if (asset.userId !== userId) {
			return apiUnauthorizedResource();
		}

		// Two-phase upload guard: only flip to `ready` once the object actually landed.
		// Embeds have no R2 object and are born `ready`, so they skip this check.
		if (validatedData.data.status === 'ready' && asset.sourceType === 'upload') {
			const landed = await objectExists(asset.key);
			if (!landed) {
				return apiBadRequest('Upload not found in storage; cannot mark ready.');
			}
		}

		const updated = await prisma.mediaAsset.update({
			where: { id: Number(id), userId },
			data: validatedData.data,
		});

		return apiResponse(updated);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function DELETE(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const { id } = await params;

		const asset = await prisma.mediaAsset.findUnique({
			where: { id: Number(id), userId },
		});
		if (!asset) {
			return apiNotFound();
		}
		if (asset.userId !== userId) {
			return apiUnauthorizedResource();
		}

		// Embeds (youtube) have no R2 object — only uploads need their bytes removed.
		if (asset.sourceType === 'upload') {
			await deleteObject(asset.key);
			if (asset.posterKey) {
				await deleteObject(asset.posterKey);
			}
		}

		await prisma.mediaAsset.delete({
			where: { id: Number(id), userId },
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
