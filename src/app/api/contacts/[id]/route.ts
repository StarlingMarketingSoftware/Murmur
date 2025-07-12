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
import { upsertContactToVectorDb } from '../../_utils/vectorDb';

const updateContactSchema = z.object({
	firstName: z.string().optional().nullable(),
	lastName: z.string().optional().nullable(),
	company: z.string().optional().nullable(),
	email: z.string().email().optional(),
	address: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	state: z.string().optional().nullable(),
	country: z.string().optional().nullable(),
	website: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	headline: z.string().optional().nullable(),
	linkedInUrl: z.string().optional().nullable(),
	photoUrl: z.string().optional().nullable(),
	metadata: z.string().optional().nullable(),
	isPrivate: z.boolean().optional(),
	userId: z.string().optional().nullable(),
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

		await upsertContactToVectorDb(updatedContact);

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
