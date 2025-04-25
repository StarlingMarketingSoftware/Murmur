import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
	const { userId } = await auth();
	console.log('🚀 ~ ADMIN CHECKKKK ~ userId:', userId);

	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: { role: true },
	});

	if (!user || user.role !== 'admin') {
		return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
	}

	return NextResponse.json({ role: user.role }, { status: 200 });
}
