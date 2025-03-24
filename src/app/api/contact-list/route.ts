import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const GET = async function GET(
	request: Request,
	{ params }: { params: { clerkId: string } }
) {
	// gets all contact lists
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	try {
		const result = await prisma.contactList.findMany({});
		return NextResponse.json(result);
	} catch {
		return NextResponse.json({ error: 'Error fetching contact lists.' }, { status: 404 });
	}
};
