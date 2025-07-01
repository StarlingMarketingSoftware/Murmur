import { Contact } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

const VECTOR_DIMENSION = 1536; // OpenAI's text-embedding-3-small dimension
const COLLECTION_NAME = 'contacts';

const openai = new OpenAI({
	apiKey: process.env.OPEN_AI_API_KEY!,
});

const qdrant = new QdrantClient({
	url: process.env.QDRANT_URL || 'http://localhost:6333',
});

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

// Initialize Qdrant collection if it doesn't exist
export async function initializeVectorDb() {
	try {
		await qdrant.getCollection(COLLECTION_NAME);
		console.log('Collection already exists');
	} catch (e) {
		console.log('Creating new collection:', e);
		await qdrant.createCollection(COLLECTION_NAME, {
			vectors: {
				size: VECTOR_DIMENSION,
				distance: 'Cosine',
			},
		});
	}
}

// Upsert a contact's vector to Qdrant
export async function upsertContactToVectorDb(contact: Contact): Promise<string> {
	const embedding = await generateContactEmbedding(contact);
	const id = contact.pineconeId || `contact-${contact.id}`;

	await qdrant.upsert(COLLECTION_NAME, {
		wait: true,
		points: [
			{
				id,
				vector: embedding,
				payload: {
					contactId: contact.id,
					email: contact.email,
					firstName: contact.firstName || '',
					lastName: contact.lastName || '',
					company: contact.company || '',
					title: contact.title || '',
				},
			},
		],
	});

	return id;
}

// Delete a contact's vector from Qdrant
export async function deleteContactFromVectorDb(id: string) {
	await qdrant.delete(COLLECTION_NAME, {
		wait: true,
		points: [id],
	});
}

// Search for similar contacts
export async function searchSimilarContacts(queryText: string, limit: number = 10) {
	// Generate embedding for the search query
	const response = await openai.embeddings.create({
		input: queryText,
		model: 'text-embedding-3-small',
	});
	const queryEmbedding = response.data[0].embedding;

	// Search Qdrant
	const results = await qdrant.search(COLLECTION_NAME, {
		vector: queryEmbedding,
		limit,
		with_payload: true,
	});

	// Convert Qdrant results to match the expected format
	return {
		matches: results.map((result) => ({
			id: result.id as string,
			score: result.score,
			metadata: result.payload,
		})),
	};
}
