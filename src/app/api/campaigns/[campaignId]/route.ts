import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

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
				id: parseInt(campaignId),
				userId,
			},
			include: {
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

// Input validation schema
export const updateCampaignSchema = z.object({
	name: z.string().optional(),
	contactIds: z.array(z.number()).optional(),
});

export async function PATCH(
	req: Request,
	{ params }: { params: { campaignId: string } }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const { campaignId } = await params;

		const body = await req.json();
		const validatedData = updateCampaignSchema.parse(body);
		console.log('🚀 ~ validatedData:', validatedData);

		// Verify campaign exists and belongs to user
		const existingCampaign = await prisma.campaign.findUnique({
			where: {
				id: parseInt(campaignId),
				userId: userId,
			},
			include: {
				contacts: true,
			},
		});

		if (!existingCampaign) {
			return new NextResponse('Campaign not found', { status: 404 });
		}

		// Update campaign with optional fields
		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: parseInt(campaignId),
			},
			data: {
				...(validatedData.name && { name: validatedData.name }),
				...(validatedData.contactIds && {
					contacts: {
						// This will only add new connections without removing existing ones
						connect: validatedData.contactIds.map((id: number) => {
							console.log(`Attempting to connect contact ID: ${id}`);
							return { id };
						}),
					},
				}),
			},
			include: {
				contacts: true,
			},
		});
		console.log('🚀 ~ updatedCampaign:', updatedCampaign);

		return NextResponse.json(updatedCampaign);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse('Invalid request data', { status: 400 });
		}
		console.error('[CAMPAIGN_PATCH]', error);
		return new NextResponse('Internal error', { status: 500 });
	}
}
