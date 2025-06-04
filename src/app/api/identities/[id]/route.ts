import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';

const updateIdentitySchema = z.object({
	name: z.string().min(1).optional(),
	website: z.string().min(1).optional(),
	email: z.string().email().optional(),
});

export type PatchIdentityData = z.infer<typeof updateIdentitySchema>;

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const identity = await prisma.identity.findUniqueOrThrow({
			where: {
				id: Number(id),
				userId,
			},
		});

		return apiResponse(identity);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateIdentitySchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const updatedIdentity = await prisma.identity.update({
			where: {
				id: Number(id),
			},
			data: {
				...validatedData.data,
			},
		});

		return apiResponse(updatedIdentity);
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
		const existingIdentity = await prisma.identity.findUnique({
			where: {
				id: Number(id),
			},
		});

		if (!existingIdentity) {
			return apiNotFound();
		}

		if (existingIdentity.userId !== userId) {
			return apiUnauthorized();
		}

		await prisma.identity.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
