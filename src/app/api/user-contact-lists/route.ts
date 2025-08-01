import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';

const userContactListFilterSchema = z.object({
	includeContacts: z.boolean().optional().default(false),
});

export type UserContactListFilterData = z.infer<typeof userContactListFilterSchema>;

export const GET = async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(
			req.url,
			userContactListFilterSchema
		);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}

		const { includeContacts } = validatedFilters.data;

		const result = await prisma.userContactList.findMany({
			where: {
				userId: userId,
			},
			include: {
				contacts: includeContacts,
				user: true,
				_count: {
					select: {
						contacts: true,
					},
				},
			},
		});

		return apiResponse(result);
	} catch (error) {
		return handleApiError(error);
	}
};

const createUserContactListSchema = z.object({
	name: z.string().min(1),
	contactIds: z.array(z.number()).optional(),
});

export type PostUserContactListData = z.infer<typeof createUserContactListSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const body = await req.json();
		const validatedData = createUserContactListSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { contactIds, name } = validatedData.data;

		const userContactList = await prisma.userContactList.create({
			data: {
				name,
				userId,
				contacts: {
					connect: contactIds?.map((id) => ({ id })),
				},
			},
		});

		return apiCreated(userContactList);
	} catch (error) {
		return handleApiError(error);
	}
}
