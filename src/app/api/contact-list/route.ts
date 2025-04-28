import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const GET = async function GET() {
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

const createContactListSchema = z.object({
	name: z.string().min(1, 'Category is required'),
	count: z.number().int().default(0).optional(),
	userIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
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

		return NextResponse.json(contactList, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('CONTACT_LIST_CREATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
