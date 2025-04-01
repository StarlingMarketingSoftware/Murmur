import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { contactListIds } = body;

		if (!Array.isArray(contactListIds) || contactListIds.length === 0) {
			return NextResponse.json(
				{ error: 'Invalid or missing categories' },
				{ status: 400 }
			);
		}

		const contacts = await prisma.contact.findMany({
			where: {
				contactListId: {
					in: contactListIds,
				},
			},
		});

		return NextResponse.json(contacts);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
