import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { Client } from '@elastic/elasticsearch';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import z from 'zod';
import { getValidatedParamsFromUrl } from '@/utils/url';
import { NextRequest } from 'next/server';

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY!,
	},
});

const INDEX_NAME = 'contacts';

const deleteSecuritySchema = z.object({
	password: z.string(),
});

export async function GET(req: NextRequest) {
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

		const validatedParams = getValidatedParamsFromUrl(req.url, deleteSecuritySchema);
		if (!validatedParams.success) {
			return apiBadRequest(validatedParams.error);
		}

		if (validatedParams.data.password !== process.env.ELASTICSEARCH_RESET_PASSWORD) {
			return apiBadRequest('Invalid password');
		}

		// Check initial state
		const indexExists = await elasticsearch.indices.exists({ index: INDEX_NAME });

		if (indexExists) {
			// Get document count before deletion
			const countResponse = await elasticsearch.count({ index: INDEX_NAME });
			const documentCount = countResponse.count;
			console.log(
				`Before deletion: Index '${INDEX_NAME}' exists with ${documentCount} documents`
			);

			// Get index info
			const indexInfo = await elasticsearch.indices.get({ index: INDEX_NAME });
			console.log(`Index settings:`, JSON.stringify(indexInfo[INDEX_NAME], null, 2));
		} else {
			console.log(`Before deletion: Index '${INDEX_NAME}' does not exist`);
		}

		// deletes the index, and therefore all documents in the index
		if (indexExists) {
			// Delete the entire index
			await elasticsearch.indices.delete({ index: INDEX_NAME });
			console.log(`Index '${INDEX_NAME}' deleted successfully`);
		} else {
			console.log(`Index '${INDEX_NAME}' does not exist`);
		}

		// Verify deletion
		const indexExistsAfter = await elasticsearch.indices.exists({ index: INDEX_NAME });
		if (indexExistsAfter) {
			console.log(`WARNING: Index '${INDEX_NAME}' still exists after deletion`);
		} else {
			console.log(`✓ Confirmed: Index '${INDEX_NAME}' successfully deleted`);
		}

		// Reset the hasVectorEmbedding flag for all contacts
		await prisma.contact.updateMany({
			data: {
				hasVectorEmbedding: false,
			},
		});

		return apiResponse({
			message: 'All vector embeddings cleared successfully',
			documentsDeleted: true,
			contactsReset: true,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
