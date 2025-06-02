import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const createSignatureSchema = z.object({
	name: z.string().min(1),
	content: z.string(),
});
export type CreateSignatureData = z.infer<typeof createSignatureSchema>;

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const signatures = await prisma.signature.findMany({
			where: {
				userId: userId,
			},
			orderBy: {
				updatedAt: 'desc',
			},
		});

		return apiResponse(signatures);
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

		const data = await req.json();
		const validatedData = createSignatureSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { name, content } = validatedData.data;

		const signature = await prisma.signature.create({
			data: {
				name: name,
				content: content,
				userId: userId,
			},
		});

		return apiCreated(signature);
	} catch (error) {
		return handleApiError(error);
	}
}
