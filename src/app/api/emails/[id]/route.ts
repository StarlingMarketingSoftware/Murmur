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
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';
import { ApiRouteParams } from '@/constants/types';
import { EmailStatus } from '@prisma/client';

const patchEmailSchema = z.object({
	subject: z.string().min(1).optional(),
	message: z.string().min(1).optional(),
	status: z.nativeEnum(EmailStatus).optional(),
	sentAt: z.union([z.date(), z.string().datetime()]).optional(),
});
export type PatchEmailData = z.infer<typeof patchEmailSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = patchEmailSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const updatedEmail = await prisma.email.update({
			where: {
				id: parseInt(id),
				userId,
			},
			data: validatedData.data,
		});

		return apiResponse(updatedEmail);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const email = await prisma.email.findUnique({
			where: {
				id: parseInt(id),
			},
			include: {
				contact: true,
			},
		});

		if (!email) {
			return apiNotFound();
		}

		if (email.userId !== userId) {
			return apiUnauthorizedResource();
		}

		return apiResponse(email);
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
		const existingEmail = await prisma.email.findUnique({
			where: { id: parseInt(id) },
		});

		if (!existingEmail) {
			return apiNotFound();
		}

		if (existingEmail.userId !== userId) {
			return apiUnauthorizedResource();
		}

		await prisma.email.delete({
			where: {
				id: parseInt(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
