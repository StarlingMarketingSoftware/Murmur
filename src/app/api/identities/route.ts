import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';

const postIdentitySchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	website: z.string().optional(),
});
const getIdentityFilterSchema = z.object({
	email: z.string().email().optional(),
});

export type PostIdentityData = z.infer<typeof postIdentitySchema>;
export type IdentityFilterData = z.infer<typeof getIdentityFilterSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, getIdentityFilterSchema);

		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}

		const { email } = validatedFilters.data;

		const identities = await prisma.identity.findMany({
			where: {
				userId,
				email,
			},
			orderBy: {
				updatedAt: 'desc' as const,
			},
		});

		return apiResponse(identities);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = postIdentitySchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const identity = await prisma.identity.create({
			data: {
				...validatedData.data,
				userId,
			},
		});

		return apiCreated(identity);
	} catch (error) {
		return handleApiError(error);
	}
}
