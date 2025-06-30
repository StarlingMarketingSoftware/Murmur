import { Contact } from '@prisma/client';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

const pinecone = new Pinecone({
	apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
	apiKey: process.env.OPEN_AI_API_KEY!,
});

const INDEX_NAME = 'contacts';

// Initialize Pinecone index if it doesn't exist
export async function initializePineconeIndex() {
	try {
		// Check if index exists
		const existingIndexes = await pinecone.listIndexes();

		if (!existingIndexes.indexes?.find((index) => index.name === INDEX_NAME)) {
			console.log(`Creating new Pinecone index: ${INDEX_NAME}`);

			// Create the index - note that this operation is asynchronous
			// and the index may take a few minutes to become ready
			await pinecone.createIndex({
				name: INDEX_NAME,
				dimension: 1536, // dimension for text-embedding-3-small model
				metric: 'cosine',
				spec: {
					serverless: {
						cloud: 'aws',
						region: 'us-east-1',
					},
				},
			});

			// Wait for the index to be ready
			console.log('Waiting for index to be ready...');
			let isReady = false;
			while (!isReady) {
				const indexDescription = await pinecone.describeIndex(INDEX_NAME);
				isReady = indexDescription.status.ready;
				if (!isReady) {
					await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
				}
			}
			console.log('Index is ready!');
		} else {
			console.log(`Pinecone index ${INDEX_NAME} already exists`);
		}
	} catch (error) {
		console.error('Error initializing Pinecone index:', error);
		throw error;
	}
}

// Helper function to generate embedding for contact data
async function generateContactEmbedding(contact: Contact) {
	const contactText = [
		contact.firstName,
		contact.lastName,
		contact.email,
		contact.company,
		contact.title,
		contact.headline,
		contact.city,
		contact.state,
		contact.country,
		contact.address,
	]
		.filter(Boolean)
		.join(' ');

	const response = await openai.embeddings.create({
		input: contactText,
		model: 'text-embedding-3-small',
	});

	return response.data[0].embedding;
}

// Upsert a contact's vector to Pinecone
export async function upsertContactToPinecone(contact: Contact): Promise<string> {
	const embedding = await generateContactEmbedding(contact);
	const index = pinecone.index(INDEX_NAME);

	const pineconeId = contact.pineconeId || `contact-${contact.id}`;

	await index.upsert([
		{
			id: pineconeId,
			values: embedding,
			metadata: {
				contactId: contact.id,
				email: contact.email,
				firstName: contact.firstName || '',
				lastName: contact.lastName || '',
				company: contact.company || '',
				title: contact.title || '',
			},
		},
	]);

	return pineconeId;
}

// Delete a contact's vector from Pinecone
export async function deleteContactFromPinecone(pineconeId: string) {
	const index = pinecone.index(INDEX_NAME);
	await index.deleteOne(pineconeId);
}

// Search for similar contacts
export async function searchSimilarContacts(queryText: string, topK: number = 10) {
	const index = pinecone.index(INDEX_NAME);

	// Generate embedding for search query
	const response = await openai.embeddings.create({
		input: queryText,
		model: 'text-embedding-3-small',
	});
	const queryEmbedding = response.data[0].embedding;

	// Search Pinecone
	const results = await index.query({
		vector: queryEmbedding,
		topK,
		includeMetadata: true,
	});

	return results.matches;
}
