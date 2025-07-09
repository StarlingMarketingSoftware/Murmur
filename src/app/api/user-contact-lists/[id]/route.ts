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
import { EmailVerificationStatus } from '@prisma/client';

const updateUserContactListSchema = z.object({
	name: z.string().min(1).optional(),
});
export type PatchUserContactListData = z.infer<typeof updateUserContactListSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateUserContactListSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const existingList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
		});

		if (!existingList) {
			return apiNotFound();
		}

		const updatedUserContactList = await prisma.userContactList.update({
			where: {
				id: Number(id),
			},
			data: validatedData.data,
			include: {
				contacts: true,
			},
		});

		return apiResponse(updatedUserContactList);
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
		const userContactList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
			include: {
				contacts: {
					where: {
						emailValidationStatus: EmailVerificationStatus.valid,
					},
				},
			},
		});

		if (!userContactList) {
			return apiNotFound();
		}

		return apiResponse(userContactList);
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
		const existingList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
		});

		if (!existingList) {
			return apiNotFound();
		}

		await prisma.userContactList.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
