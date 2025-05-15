import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';
import { ApiRouteParams } from '@/constants/types';
import { NextRequest } from 'next/server';

const updateSignatureSchema = z.object({
	name: z.string(),
	content: z.string().min(1),
});
export type UpdateSignatureData = z.infer<typeof updateSignatureSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;

		const body = await req.json();
		const validatedData = updateSignatureSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { name, content } = validatedData.data;

		const signature = await prisma.signature.findUnique({
			where: {
				id: Number(id),
				userId: userId,
			},
		});

		if (!signature) {
			return apiNotFound();
		}

		if (signature.userId !== userId) {
			return apiUnauthorizedResource();
		}

		const updatedSignature = await prisma.signature.update({
			where: {
				id: Number(id),
				userId,
			},
			data: {
				name,
				content,
			},
		});

		return apiResponse(updatedSignature);
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

		const signature = await prisma.signature.findUnique({
			where: {
				id: Number(id),
				userId: userId,
			},
		});

		if (!signature) {
			return apiNotFound();
		}

		if (signature.userId !== userId) {
			return apiUnauthorizedResource();
		}

		await prisma.signature.delete({
			where: {
				id: Number(id),
				userId,
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
