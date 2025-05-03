import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { updateCampaignSchema } from './schema';

type Params = Promise<{ campaignId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
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
				signature: true,
			},
		});

		return NextResponse.json(campaign);
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

// Input validation schema

export async function PATCH(req: Request, { params }: { params: Params }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const { campaignId } = await params;

		const body = await req.json();
		const validatedData = updateCampaignSchema.parse(body);

		console.log(validatedData.signatureId);
		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: parseInt(campaignId),
				userId,
			},
			data: {
				...(validatedData.name && { name: validatedData.name }),
				...(validatedData.subject !== undefined && { subject: validatedData.subject }),
				...(validatedData.message !== undefined && { message: validatedData.message }),
				...(validatedData.aiModel !== undefined && { aiModel: validatedData.aiModel }),
				...(validatedData.testMessage !== undefined && {
					testMessage: validatedData.testMessage,
				}),
				...(validatedData.testSubject !== undefined && {
					testSubject: validatedData.testSubject,
				}),
				...(validatedData.senderEmail !== undefined && {
					senderEmail: validatedData.senderEmail,
				}),
				...(validatedData.senderName !== undefined && {
					senderName: validatedData.senderName,
				}),
				...(validatedData.signatureId !== undefined && {
					signature:
						validatedData.signatureId === null
							? { disconnect: true }
							: { connect: { id: validatedData.signatureId } },
				}),
				...(validatedData.contactOperation && {
					contacts: {
						[validatedData.contactOperation.action]:
							validatedData.contactOperation.contactIds.map((id: number) => {
								console.log(
									`Attempting to ${validatedData.contactOperation?.action} contact ID: ${id}`
								);
								return { id };
							}),
					},
				}),
			},
			include: {
				contacts: true,
			},
		});

		return NextResponse.json(updatedCampaign);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: 'Invalid request data',
					details: error.errors,
				},
				{ status: 400 }
			);
		}
		console.error('[CAMPAIGN_PATCH]', error);
		return new NextResponse('Internal error', { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: Params }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const { campaignId } = await params;

		// Verify campaign exists and belongs to user
		const campaign = await prisma.campaign.findUnique({
			where: {
				id: parseInt(campaignId),
				userId: userId,
			},
		});

		if (!campaign) {
			return new NextResponse('Campaign not found', { status: 404 });
		}

		// Soft delete by updating status
		const deletedCampaign = await prisma.campaign.update({
			where: {
				id: parseInt(campaignId),
			},
			data: {
				status: 'deleted',
			},
		});

		return NextResponse.json(deletedCampaign);
	} catch (error) {
		console.error('[CAMPAIGN_DELETE]', error);
		return new NextResponse('Internal error', { status: 500 });
	}
}
