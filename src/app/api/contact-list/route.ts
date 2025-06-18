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

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const result = await prisma.contactList.findMany({
			where: {
				userId: userId,
			},
			include: {
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

const createContactListSchema = z.object({
	name: z.string().min(1),
	count: z.number().int().default(0).optional(),
});
export type PostContactListData = z.infer<typeof createContactListSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const body = await req.json();
		const validatedData = createContactListSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const contactList = await prisma.contactList.create({
			data: {
				...validatedData.data,
				userId: userId, // Direct userId assignment
			},
			include: {
				user: true,
			},
		});

		return apiCreated(contactList);
	} catch (error) {
		return handleApiError(error);
	}
}
