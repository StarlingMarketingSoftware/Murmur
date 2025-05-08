import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
	apiCreated,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const result = await prisma.contactList.findMany({});

		return apiResponse(result);
	} catch {
		return apiNotFound();
	}
};

const createContactListSchema = z.object({
	name: z.string().min(1, 'Category is required'),
	count: z.number().int().default(0).optional(),
	userIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const body = await req.json();
		const validatedData = createContactListSchema.parse(body);

		const contactList = await prisma.contactList.create({
			data: {
				name: validatedData.name,
				count: validatedData.count,
				user: validatedData.userIds
					? {
							connect: validatedData.userIds.map((id) => ({ clerkId: id })),
					  }
					: undefined,
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
