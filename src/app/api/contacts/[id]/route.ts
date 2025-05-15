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
} from '@/app/utils/api';
import { ApiRouteParams } from '@/types/types';

const updateContactSchema = z.object({
	name: z.string().optional(),
	email: z.string().email().optional(),
	company: z.string().optional(),
	website: z.string().optional(),
	state: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
});
export type PatchContactData = z.infer<typeof updateContactSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateContactSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const updatedContact = await prisma.contact.update({
			where: {
				id: Number(id),
			},
			data: validatedData.data,
		});

		return apiResponse(updatedContact);
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
		const existingContact = await prisma.contact.findUnique({
			where: {
				id: Number(id),
			},
		});

		if (!existingContact) {
			return apiNotFound();
		}

		await prisma.contact.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
