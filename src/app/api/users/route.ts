import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiResponse,
	apiUnauthorized,
	apiForbidden,
	handleApiError,
} from '@/app/api/_utils';
import { UserRole } from '@prisma/client';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const currentUser = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { role: true },
		});

		if (!currentUser || currentUser.role !== UserRole.admin) {
			return apiForbidden();
		}

		const users = await prisma.user.findMany({
			orderBy: {
				lastName: 'asc',
			},
		});

		return apiResponse(users);
	} catch (error) {
		return handleApiError(error);
	}
}
