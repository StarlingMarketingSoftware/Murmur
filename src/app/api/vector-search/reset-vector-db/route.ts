import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiForbidden,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { Client } from '@elastic/elasticsearch';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import z from 'zod';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

if (!process.env.ELASTICSEARCH_API_KEY) {
	throw new Error('ELASTICSEARCH_API_KEY environment variable is not defined.');
}

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

const INDEX_NAME = 'contacts';

// Destructive admin op: password travels in the POST body (never the URL, which
// leaks into logs/history) alongside an explicit confirmation token.
const deleteSecuritySchema = z.object({
	password: z.string().min(1),
	confirm: z.literal('RESET_VECTOR_DB'),
});

const timingSafeStringEqual = (a: string, b: string): boolean => {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
};

export async function POST(req: NextRequest) {
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
			return apiForbidden();
		}

		const body = await req.json();
		const validatedParams = deleteSecuritySchema.safeParse(body);
		if (!validatedParams.success) {
			return apiBadRequest(validatedParams.error);
		}

		// Fail closed: without a configured reset password this endpoint is inert.
		const resetPassword = process.env.ELASTICSEARCH_RESET_PASSWORD;
		if (!resetPassword) {
			return apiServerError('Reset password is not configured');
		}

		if (!timingSafeStringEqual(validatedParams.data.password, resetPassword)) {
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
