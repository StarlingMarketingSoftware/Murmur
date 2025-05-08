import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/utils/api';
import { ApiRouteParams } from '@/constants/types';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const contacts = await prisma.contact.findMany({
			where: {
				contactListId: parseInt(id),
			},
		});

		return apiResponse(contacts);
	} catch (error) {
		return handleApiError(error);
	}
}
