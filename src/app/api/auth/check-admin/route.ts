import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {
	handleApiError,
	apiResponse,
	apiUnauthorized,
	apiForbidden,
} from '@/app/api/_utils';
import { UserRole } from '@prisma/client';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { role: true },
		});

		if (!user || user.role !== UserRole.admin) {
			return apiForbidden();
		}

		return apiResponse({ role: user.role });
	} catch (error) {
		return handleApiError(error);
	}
}
