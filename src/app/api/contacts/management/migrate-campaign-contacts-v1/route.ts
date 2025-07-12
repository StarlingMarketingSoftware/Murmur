import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { NextResponse } from 'next/server';

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized('Only admins can access this route');
		}

		const campaigns = await prisma.campaign.findMany({
			include: {
				contacts: true,
				user: true,
			},
		});

		let migratedCount = 0;
		let skippedCount = 0;

		for (const campaign of campaigns) {
			if (campaign.contacts.length === 0) {
				skippedCount++;
				continue;
			}

			const userContactListName = `${campaign.name} Contact List`;

			const userContactList = await prisma.userContactList.create({
				data: {
					name: userContactListName,
					userId: campaign.userId,
					contacts: {
						connect: campaign.contacts.map((contact) => ({ id: contact.id })),
					},
				},
			});

			await prisma.campaign.update({
				where: { id: campaign.id },
				data: {
					userContactLists: {
						connect: { id: userContactList.id },
					},
				},
			});

			migratedCount++;
		}

		return NextResponse.json({
			success: true,
			message: 'Migration completed successfully',
			migratedCount,
			skippedCount,
			totalCampaigns: campaigns.length,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
