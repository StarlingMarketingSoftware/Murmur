import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';
import { ApiRouteParams } from '@/constants/types';

const updateEmailSchema = z.object({
	subject: z.string().min(1, 'Subject is required').optional(),
	message: z.string().min(1, 'Message is required').optional(),
	status: z.enum(['draft', 'scheduled', 'sent', 'failed']).optional(),
	sentAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateEmailSchema.parse(body);

		const updatedEmail = await prisma.email.update({
			where: {
				id: parseInt(id),
				userId,
			},
			data: {
				...(validatedData.subject !== undefined && { subject: validatedData.subject }),
				...(validatedData.message !== undefined && { message: validatedData.message }),
				...(validatedData.status !== undefined && { status: validatedData.status }),
				...(validatedData.sentAt !== undefined && {
					sentAt: validatedData.sentAt ? new Date(validatedData.sentAt) : null,
				}),
			},
			include: {
				contact: true,
			},
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
