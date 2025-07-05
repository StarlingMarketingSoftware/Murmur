import { Contact } from '@prisma/client';
import { OpenAI } from 'openai';
import { Client } from '@elastic/elasticsearch';

const VECTOR_DIMENSION = 1536; // OpenAI's text-embedding-3-small dimension
const INDEX_NAME = 'contacts';

const openai = new OpenAI({
	apiKey: process.env.OPEN_AI_API_KEY!,
});

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

interface ContactDocument {
	vector_field: number[];
	contactId: string;
	email: string;
	firstName: string;
	lastName: string;
	company: string;
	title: string;
	headline: string;
	city: string;
	state: string;
	country: string;
	address: string;
	website: string;
	linkedInUrl: string;
	metadata: string;
}

// Helper function to generate embedding for contact data
export const generateContactEmbedding = async (contact: Contact) => {
	const contactText = [
		contact.firstName,
		contact.lastName,
		contact.email,
		contact.company,
		contact.city,
		contact.state,
		contact.country,
		contact.address,
		contact.title,
		contact.headline,
		contact.website,
		contact.linkedInUrl,
		contact.metadata,
	]
		.filter(Boolean)
		.join(' ');

	const response = await openai.embeddings.create({
		input: contactText,
		model: 'text-embedding-3-small',
	});

	return response.data[0].embedding;
};

// Initialize Elasticsearch index if it doesn't exist
export const initializeVectorDb = async () => {
	try {
		const indexExists = await elasticsearch.indices.exists({ index: INDEX_NAME });

		if (!indexExists) {
			await elasticsearch.indices.create({
				index: INDEX_NAME,
				mappings: {
					properties: {
						vector_field: {
							type: 'dense_vector',
							dims: VECTOR_DIMENSION,
							index: true,
							similarity: 'cosine',
						},
						contactId: { type: 'keyword' },
						email: { type: 'keyword' },
						firstName: { type: 'text' },
						lastName: { type: 'text' },
						company: { type: 'text' },
						title: { type: 'text' },
						headline: { type: 'text' },
						city: { type: 'text' },
						state: { type: 'text' },
						country: { type: 'text' },
						address: { type: 'text' },
						website: { type: 'text' },
						linkedInUrl: { type: 'text' },
						metadata: { type: 'text' },
					},
				},
			});
			console.log('Index created successfully');
		} else {
			console.log('Index already exists');
		}
	} catch (error) {
		console.error('Error initializing Elasticsearch:', error);
		throw error;
	}
};

// Upsert a contact's vector to Elasticsearch
export const upsertContactToVectorDb = async (
	contact: Contact,
	embedding?: number[]
): Promise<string> => {
	let _embedding = embedding;

	if (!_embedding) {
		_embedding = await generateContactEmbedding(contact);
	}

	const id = contact.id.toString();

	await elasticsearch.index<ContactDocument>({
		index: INDEX_NAME,
		id: id,
		document: {
			vector_field: _embedding,
			contactId: contact.id.toString(),
			email: contact.email,
			firstName: contact.firstName || '',
			lastName: contact.lastName || '',
			company: contact.company || '',
			title: contact.title || '',
			headline: contact.headline || '',
			city: contact.city || '',
			state: contact.state || '',
			country: contact.country || '',
			address: contact.address || '',
			website: contact.website || '',
			linkedInUrl: contact.linkedInUrl || '',
			metadata: contact.metadata || '',
		},
	});

	return id;
};

// Delete a contact's vector from Elasticsearch
export const deleteContactFromVectorDb = async (id: string) => {
	await elasticsearch.delete({
		index: INDEX_NAME,
		id: id,
	});
};

// Search for similar contacts
export const searchSimilarContacts = async (
	queryText: string,
	limit: number = 10,
	minScore: number = 0.3 // Add minimum similarity threshold
) => {
	// Generate embedding for the search query
	const response = await openai.embeddings.create({
		input: queryText,
		model: 'text-embedding-3-small',
	});
	const queryEmbedding = response.data[0].embedding;

	// Search Elasticsearch using kNN search
	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		knn: {
			field: 'vector_field',
			query_vector: queryEmbedding,
			k: limit,
			num_candidates: Math.min(10000, limit * 4),
		},
		size: limit,
		fields: [
			'contactId',
			'email',
			'firstName',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'linkedInUrl',
			'metadata',
		],
		_source: false,
	});

	// Filter out results below the similarity threshold
	const filteredHits = results.hits.hits.filter((hit) => (hit._score || 0) >= minScore);

	return {
		matches: filteredHits.map((hit) => ({
			id: hit._id,
			score: hit._score || 0,
			metadata: {
				contactId: hit.fields?.contactId[0],
				email: hit.fields?.email[0],
				firstName: hit.fields?.firstName[0],
				lastName: hit.fields?.lastName[0],
				company: hit.fields?.company[0],
				title: hit.fields?.title[0],
				headline: hit.fields?.headline[0],
				city: hit.fields?.city[0],
				state: hit.fields?.state[0],
				country: hit.fields?.country[0],
				address: hit.fields?.address[0],
				website: hit.fields?.website[0],
				linkedInUrl: hit.fields?.linkedInUrl[0],
				metadata: hit.fields?.metadata[0],
			},
		})),
		totalFound: filteredHits.length,
		minScoreApplied: minScore,
	};
};
