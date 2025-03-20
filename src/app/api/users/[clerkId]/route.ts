import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import prisma from '@/lib/prisma';

export const GET = async function GET(
	request: Request,
	{ params }: { params: { clerkId: string } }
) {
	try {
		const { clerkId } = await params;

		const user: User = await prisma.user.findUniqueOrThrow({
			where: {
				clerkId: clerkId,
			},
		});

		return NextResponse.json(user);
	} catch {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}
};
