import {
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

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

const createSignatureSchema = z.object({
	name: z.string().min(1, 'Signature name is required'),
	content: z.string(),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createSignatureSchema.parse(body);

		const signature = await prisma.signature.create({
			data: {
				name: validatedData.name,
				content: validatedData.content,
				userId: userId,
			},
		});

		return apiCreated(signature);
	} catch (error) {
		return handleApiError(error);
	}
}
