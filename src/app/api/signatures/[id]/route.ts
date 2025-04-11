import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSignatureSchema = z.object({
	name: z.string(),
	content: z.string().min(1, 'Signature content is required'),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const { id } = params;

		const body = await req.json();
		const validatedData = updateSignatureSchema.parse(body);

		const signature = await prisma.signature.findUnique({
			where: {
				id: parseInt(id),
				userId: userId,
			},
		});

		if (!signature) {
			return new NextResponse('Signature not found', { status: 404 });
		}

		const updatedSignature = await prisma.signature.update({
			where: {
				id: parseInt(id),
				userId,
			},
			data: {
				name: validatedData.name,
				content: validatedData.content,
			},
		});

		return NextResponse.json(updatedSignature);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse('Invalid request data', { status: 400 });
		}
		console.error('[SIGNATURE_PATCH]', error);
		return new NextResponse('Internal error', { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const { id } = params;

		const signature = await prisma.signature.findUnique({
			where: {
				id: parseInt(id),
				userId: userId,
			},
		});

		if (!signature) {
			return new NextResponse('Signature not found', { status: 404 });
		}

		const deletedSignature = await prisma.signature.delete({
			where: {
				id: parseInt(id),
				userId,
			},
		});

		return NextResponse.json(deletedSignature);
	} catch (error) {
		console.error('[SIGNATURE_DELETE]', error);
		return new NextResponse('Internal error', { status: 500 });
	}
}
