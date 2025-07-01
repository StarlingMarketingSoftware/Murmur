import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { initializeVectorDb, upsertContactToVectorDb } from '../../_utils/vectorDb';

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Initialize Elasticsearch index if it doesn't exist
		await initializeVectorDb();

		// Get all contacts that don't have a vectorId
		const contacts = await prisma.contact.findMany({
			where: {
				vectorId: null,
			},
			take: 50,
		});

		console.log(`Found ${contacts.length} contacts without embeddings`);

		// Process contacts in batches to avoid rate limits
		const batchSize = 10;
		const results = [];

		for (let i = 0; i < contacts.length; i += batchSize) {
			const batch = contacts.slice(i, i + batchSize);

			// Process each contact in the batch concurrently
			const batchResults = await Promise.all(
				batch.map(async (contact) => {
					try {
						const vectorId = await upsertContactToVectorDb(contact);

						// Update contact with new pineconeId
						await prisma.contact.update({
							where: { id: contact.id },
							data: { vectorId },
						});

						return {
							contactId: contact.id,
							status: 'success',
							vectorId,
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
