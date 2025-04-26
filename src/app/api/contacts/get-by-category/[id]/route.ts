import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { id: contactListId } = await params;

		const contacts = await prisma.contact.findMany({
			where: {
				contactListId: parseInt(contactListId),
			},
		});

		return NextResponse.json(contacts);
	} catch (error) {
		console.error('CONTACTS_FETCH_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
