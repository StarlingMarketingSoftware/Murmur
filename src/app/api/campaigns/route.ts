import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AiModel, Status } from '@prisma/client';

export type CreateCampaignBody = {
	name: string;
	status?: Status;
	subject?: string;
	message?: string;
	aiModel?: AiModel;
	testMessage?: string;
	testSubject?: string;
	senderEmail?: string;
	senderName?: string;
	contacts?: number[]; // Array of contact IDs
};

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	try {
		const body: CreateCampaignBody = await req.json();
		const { name, contacts, ...restOfBody } = body;

		const campaign = await prisma.campaign.create({
			data: {
				name,
				userId,
				...restOfBody,
				...(contacts && {
					contacts: {
						connect: contacts.map((id) => ({ id })),
					},
				}),
			},
			include: {
				contacts: true,
			},
		});

		return NextResponse.json(campaign);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function GET() {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const campaigns = await prisma.campaign.findMany({
			where: {
				userId: userId,
				status: Status.active,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return NextResponse.json(campaigns);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
