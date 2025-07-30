import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized } from '@/app/api/_utils';
import { initializeVectorDb, upsertContactToVectorDb } from '../../_utils/vectorDb';
import { EmailVerificationStatus, UserRole } from '@prisma/client';

// Add timeout wrapper
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
		),
	]);
};

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

		// Add timeout to initialization
		await withTimeout(initializeVectorDb(), 30000); // 30 second timeout

		// Add timeout to database query
		const contacts = await withTimeout(
			prisma.contact.findMany({
				where: {
					hasVectorEmbedding: false,
					emailValidationStatus: EmailVerificationStatus.valid,
				},
				take: 50,
			}),
			20000 // 10 second timeout
		);

		console.log(`Found ${contacts.length} contacts to process`);

		// Process contacts in batches to avoid rate limits
		const batchSize = 50;
		const results = [];

		for (let i = 0; i < contacts.length; i += batchSize) {
			const batch = contacts.slice(i, i + batchSize);

			// Add timeout to each batch processing
			const batchResults = await withTimeout(
				Promise.all(
					batch.map(async (contact) => {
						try {
							const id = await withTimeout(
								upsertContactToVectorDb(contact),
								20000 // 10 second timeout per contact
							);

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
				),
				30000 // 30 second timeout for entire batch
			);

			results.push(...batchResults);

			// Add a small delay between batches to avoid rate limits
			if (i + batchSize < contacts.length) {
				console.log(`Batch completed ${i + batchSize} of ${contacts.length}`);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return apiResponse({
			totalContacts: contacts.length,
			processedResults: results,
		});
	} catch (error) {
		return apiResponse(error); // don't return api error, return a response with log
	}
}

/** this error must be prevented 
 * 
 * 
 * Error: Operation timed out
    at Timeout.eval [as _onTimeout] (src\app\api\vector-search\generate-embeddings\route.ts:12:27)
  10 |          promise,
  11 |          new Promise<never>((_, reject) =>
> 12 |                  setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
     |                                         ^
  13 |          ),
  14 |  ]);
  15 | };
Operation timed out
 * 
 */
