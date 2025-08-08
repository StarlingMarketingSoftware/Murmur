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

const updateLeadSchema = z.object({
	email: z.string().email().optional(),
});

export type PatchLeadData = z.infer<typeof updateLeadSchema>;

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const lead = await prisma.lead.findUniqueOrThrow({
			where: {
				id: Number(id),
			},
		});

		return apiResponse(lead);
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
		const validatedData = updateLeadSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const updatedLead = await prisma.lead.update({
			where: {
				id: Number(id),
			},
			data: validatedData.data,
		});

		return apiResponse(updatedLead);
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
		const existingLead = await prisma.lead.findUnique({
			where: {
				id: Number(id),
			},
		});

		if (!existingLead) {
			return apiNotFound();
		}

		await prisma.lead.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
