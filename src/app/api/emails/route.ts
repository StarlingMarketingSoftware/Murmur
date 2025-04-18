import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const url = new URL(req.url);
		const campaignId = url.searchParams.get('campaignId');

		// Get emails with potential campaignId filter
		const emails = await prisma.email.findMany({
			where: {
				userId,
				...(campaignId && { campaignId: parseInt(campaignId, 10) }),
			},
			include: {
				contact: true,
			},
			orderBy: {
				createdAt: 'desc' as const,
			},
		});

		return NextResponse.json(emails);
	} catch (error) {
		console.error('GET_EMAILS_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

const createEmailSchema = z.object({
	subject: z.string().min(1, 'Subject is required'),
	message: z.string().min(1, 'Message is required'),
	campaignId: z.number().int().positive('Campaign ID is required'),
	status: z.enum(['draft', 'scheduled', 'sent', 'failed']).default('draft'),
	sentAt: z.string().datetime().nullable().optional(),
	contactId: z.number().int().positive('Contact ID is required'),
});

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await req.json();
		console.log('🚀 ~ POST ~ body:', body);
		const validatedData = createEmailSchema.parse(body);

		// Validate that the campaign exists and belongs to the user
		const campaign = await prisma.campaign.findUnique({
			where: {
				id: validatedData.campaignId,
				userId,
			},
		});

		if (!campaign) {
			return NextResponse.json(
				{ error: 'Campaign not found or unauthorized' },
				{ status: 404 }
			);
		}

		const email = await prisma.email.create({
			data: {
				subject: validatedData.subject,
				message: validatedData.message,
				status: validatedData.status,
				sentAt: validatedData.sentAt ? new Date(validatedData.sentAt) : null,
				userId,
				campaignId: validatedData.campaignId,
				contactId: validatedData.contactId,
			},
		});

		return NextResponse.json(email, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('EMAIL_CREATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
