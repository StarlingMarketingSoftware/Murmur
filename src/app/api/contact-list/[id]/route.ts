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
	getIsAdmin,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { EmailVerificationStatus } from '@prisma/client';

const updateContactListSchema = z.object({
	name: z.string().min(1).optional(),
	count: z.number().optional(),
});
export type PatchContactListData = z.infer<typeof updateContactListSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateContactListSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const existingList = await prisma.contactList.findFirst({
			where: {
				id: Number(id),
			},
		});

		// Global curated lists (userId null) are managed from /admin/contacts; 404
		// rather than 401 to avoid an existence oracle on other users' lists.
		if (!existingList || (existingList.userId !== userId && !(await getIsAdmin(userId)))) {
			return apiNotFound();
		}

		const updatedContactList = await prisma.contactList.update({
			where: {
				id: Number(id),
			},
			data: validatedData.data,
			include: {
				contacts: true,
			},
		});

		return apiResponse(updatedContactList);
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
		const contactList = await prisma.contactList.findFirst({
			where: {
				id: Number(id),
			},
			include: {
				contacts: {
					where: {
						emailValidationStatus: EmailVerificationStatus.valid,
					},
				},
			},
		});

		// Global lists (userId null) are readable by everyone; private lists only
		// by their owner or an admin.
		if (
			!contactList ||
			(contactList.userId !== null &&
				contactList.userId !== userId &&
				!(await getIsAdmin(userId)))
		) {
			return apiNotFound();
		}

		return apiResponse(contactList);
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
		const existingList = await prisma.contactList.findFirst({
			where: {
				id: Number(id),
			},
		});

		// Same rule as PATCH: owner or admin only (global lists are admin-managed).
		if (!existingList || (existingList.userId !== userId && !(await getIsAdmin(userId)))) {
			return apiNotFound();
		}

		await prisma.contactList.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
