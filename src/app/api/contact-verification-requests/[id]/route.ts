import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const contactVerificationRequest =
			await prisma.contactVerificationRequest.findUniqueOrThrow({
				where: {
					id: Number(id),
				},
			});

		return apiResponse(contactVerificationRequest);
	} catch (error) {
		return handleApiError(error);
	}
}
