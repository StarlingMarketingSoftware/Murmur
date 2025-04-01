import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ContactList } from '@prisma/client';

export async function GET(
	req: NextRequest,
	{ params }: { params: { campaignId: string } }
) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { campaignId } = await params;

	try {
		const campaign = await prisma.campaign.findUniqueOrThrow({
			where: {
				id: campaignId,
				userId,
			},
			include: {
				contactLists: true,
				contacts: true,
				emails: true,
			},
		});

		return NextResponse.json(campaign);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { campaignId: string } }
) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { campaignId } = await params;

	try {
		// Check if campaign exists and belongs to user
		const existingCampaign = await prisma.campaign.findFirst({
			where: {
				id: campaignId,
				userId,
			},
		});

		if (!existingCampaign) {
			return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
		}

		// Parse the request body
		const data = await req.json();

		// Update the campaign
		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: campaignId,
			},
			data: {
				name: data.name,
				contactLists: {
					// This will disconnect all existing connections and connect new ones
					set: data.contactLists.map((list: ContactList) => ({
						id: list.id,
					})),
				},
			},
		});

		return NextResponse.json(updatedCampaign);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
