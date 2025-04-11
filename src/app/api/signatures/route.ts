import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const signatures = await prisma.signature.findMany({
			where: {
				userId: userId,
			},
			orderBy: {
				updatedAt: 'desc',
			},
		});

		return NextResponse.json(signatures);
	} catch (error) {
		console.error('[SIGNATURES_GET]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

const createSignatureSchema = z.object({
	name: z.string(),
	content: z.string().min(1, 'Signature content is required'),
});

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body = await req.json();
		const validatedData = createSignatureSchema.parse(body);

		await prisma.signature.create({
			data: {
				name: validatedData.name,
				content: validatedData.content,
				userId: userId,
			},
		});

		return NextResponse.json({ message: 'Signature saved successfully' });
	} catch (error) {
		console.error('[SIGNATURES_POST]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
