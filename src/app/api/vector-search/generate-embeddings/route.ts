import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { initializeVectorDb, upsertContactToVectorDb } from '../../_utils/vectorDb';
import { UserRole } from '@prisma/client';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Check if the user is an admin
		const user = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});
		if (user?.role !== UserRole.admin) {
			return apiUnauthorized();
		}

		// Initialize Elasticsearch index if it doesn't exist
		await initializeVectorDb();

		// Get all contacts
		const contacts = await prisma.contact.findMany({
			where: { hasVectorEmbedding: false },
		});

		console.log(`Found ${contacts.length} contacts to process`);

		// Process contacts in batches to avoid rate limits
		const batchSize = 10;
		const results = [];

		for (let i = 0; i < contacts.length; i += batchSize) {
			const batch = contacts.slice(i, i + batchSize);

			// Process each contact in the batch concurrently
			const batchResults = await Promise.all(
				batch.map(async (contact) => {
					try {
						const id = await upsertContactToVectorDb(contact);

						return {
							contactId: contact.id,
							status: 'success',
							id,
						};
					} catch (error) {
						console.error(`Error processing contact ${contact.id}:`, error);
						return {
							contactId: contact.id,
							status: 'error',
							error: error instanceof Error ? error.message : 'Unknown error',
						};
					}
				})
			);

			results.push(...batchResults);

			// Add a small delay between batches to avoid rate limits
			if (i + batchSize < contacts.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return apiResponse({
			totalContacts: contacts.length,
			processedResults: results,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
