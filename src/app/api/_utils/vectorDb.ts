import { Contact } from '@prisma/client';
import { OpenAI } from 'openai';
import { Client, estypes } from '@elastic/elasticsearch';
import prisma from '@/lib/prisma';

type MappingProperty = estypes.MappingProperty;

const VECTOR_DIMENSION = 1536; // OpenAI's text-embedding-3-small dimension
const INDEX_NAME = 'contacts';

const openai = new OpenAI({
	apiKey: process.env.OPEN_AI_API_KEY!,
});

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY!,
	},
});

interface ContactDocument {
	vector_field: number[];
	contactId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	company: string | null;
	title: string | null;
	headline: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	address: string | null;
	website: string | null;
	metadata: string | null;
	companyFoundedYear: string | null;
	companyType: string | null;
	companyTechStack: string | null;
	companyKeywords: string | null;
	companyIndustry: string | null;
	location: string | null;
	coordinates?: {
		lat: number;
		lon: number;
	};
}

// Helper function to generate embedding for contact data
export const generateContactEmbedding = async (contact: Contact) => {
	const locationString =
		[contact.city, contact.state, contact.country].filter(Boolean).join(', ') || null;

	const contactText = [
		'This is a contact record. Location is especially important for search. the fields are ordered in the order of importance for search.',
		`Location: ${locationString}`,
		locationString ? `This contact is located in ${locationString}.` : '',
		`Address: ${contact.address || ''}`,
		`City: ${contact.city || ''}`,
		`State: ${contact.state || ''}`,
		`Country: ${contact.country || ''}`,
		`Title: ${contact.title || ''}`,
		`Metadata: ${contact.metadata || ''}`,
		`Company Industry: ${contact.companyIndustry || ''}`,
		`Company Type: ${contact.companyType || ''}`,
		`Company Founded Year: ${contact.companyFoundedYear || ''}`,
		`Headline: ${contact.headline || ''}`,
		`Company: ${contact.company || ''}`,
		`Company Keywords: ${(contact.companyKeywords || []).join(', ')}`,
		`Email: ${contact.email || ''}`,
		`Website: ${contact.website || ''}`,
		`Company Tech Stack: ${contact.companyTechStack || ''}`,
		`First Name: ${contact.firstName || ''}`,
		`Last Name: ${contact.lastName || ''}`,
	]
		.filter(Boolean)
		.join('\n');

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
				settings: {
					analysis: {
						normalizer: {
							lowercase: {
								type: 'custom',
								filter: ['lowercase'],
							},
						},
					},
				},
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
						firstName: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						lastName: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						company: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						title: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						headline: { type: 'text' },
						city: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						state: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						country: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						address: { type: 'text' },
						location: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						website: { type: 'text' },
						metadata: { type: 'text' },
						companyFoundedYear: { type: 'text' },
						companyType: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						companyTechStack: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						companyKeywords: {
							type: 'text',
							fields: { keyword: { type: 'keyword', normalizer: 'lowercase' } },
						},
						companyIndustry: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						coordinates: {
							type: 'geo_point',
						},
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

export const updateWithNewFields = async () => {
	try {
		const currentMapping = await elasticsearch.indices.getMapping({
			index: INDEX_NAME,
		});

		const existingProperties = currentMapping[INDEX_NAME]?.mappings?.properties || {};

		const newFields = {
			companyType: { type: 'text' },
			companyTechStack: { type: 'text' },
			companyKeywords: { type: 'text' },
			companyIndustry: { type: 'text' },
		};

		const fieldsToUpdate: Record<string, MappingProperty> = {};

		for (const [fieldName, mapping] of Object.entries(newFields)) {
			const existingField = existingProperties[fieldName];

			if (!existingField) {
				fieldsToUpdate[fieldName] = mapping as MappingProperty;
				console.log(`Will add new field: ${fieldName}`);
			} else if (existingField.type !== mapping.type) {
				console.warn(
					`Field ${fieldName} exists with type ${existingField.type}, wanted ${mapping.type}`
				);
			}
		}

		if (Object.keys(fieldsToUpdate).length > 0) {
			const res = await elasticsearch.indices.putMapping({
				index: INDEX_NAME,
				properties: fieldsToUpdate,
			});
			console.log(`Added ${Object.keys(fieldsToUpdate).length} new field mappings`);
			return res;
		} else {
			console.log('All field mappings are already up to date');
		}
		return null;
	} catch (error) {
		console.error('Error ensuring correct mappings:', error);
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
			firstName: contact.firstName || null,
			lastName: contact.lastName || null,
			company: contact.company || null,
			title: contact.title || null,
			headline: contact.headline || null,
			city: contact.city || null,
			state: contact.state || null,
			country: contact.country || null,
			address: contact.address || null,
			website: contact.website || null,
			metadata: contact.metadata || null,
			companyFoundedYear: contact.companyFoundedYear?.toString() || null,
			companyType: contact.companyType || null,
			companyTechStack: contact.companyTechStack?.join(', ') || null,
			companyKeywords: contact.companyKeywords?.join(', ') || null,
			companyIndustry: contact.companyIndustry || null,
			location: [contact.city, contact.state, contact.country].filter(Boolean).join(', '),
			coordinates:
				contact.latitude && contact.longitude
					? {
							lat: contact.latitude,
							lon: contact.longitude,
					  }
					: undefined,
		},
	});

	await prisma.contact.update({
		where: { id: contact.id },
		data: { hasVectorEmbedding: true },
	});

	return id;
};

export const deleteContactFromVectorDb = async (id: string) => {
	await elasticsearch.delete({
		index: INDEX_NAME,
		id: id,
	});
};

export const searchSimilarContacts = async (
	queryText: string,
	limit: number = 10,
	minScore: number = 0.3
) => {
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
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
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
				firstName: hit.fields?.firstName?.[0],
				lastName: hit.fields?.lastName?.[0],
				company: hit.fields?.company?.[0],
				title: hit.fields?.title?.[0],
				headline: hit.fields?.headline?.[0],
				city: hit.fields?.city?.[0],
				state: hit.fields?.state?.[0],
				country: hit.fields?.country?.[0],
				address: hit.fields?.address?.[0],
				website: hit.fields?.website?.[0],
				metadata: hit.fields?.metadata?.[0],
				companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
				companyType: hit.fields?.companyType?.[0],
				companyTechStack: hit.fields?.companyTechStack?.[0],
				companyKeywords: hit.fields?.companyKeywords?.[0],
				companyIndustry: hit.fields?.companyIndustry?.[0],
				location: hit.fields?.location?.[0],
			},
		})),
		totalFound: filteredHits.length,
		minScoreApplied: minScore,
	};
};

// Search contacts by geographic proximity
export const searchContactsByLocation = async (
	latitude: number,
	longitude: number,
	distanceKm: number = 50,
	limit: number = 10
) => {
	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		query: {
			geo_distance: {
				distance: `${distanceKm}km`,
				coordinates: {
					lat: latitude,
					lon: longitude,
				},
			},
		},
		size: limit,
		sort: [
			{
				geo_distance: {
					order: 'asc',
					unit: 'km',
					mode: 'min',
					distance_type: 'arc',
					coordinates: {
						lat: latitude,
						lon: longitude,
					},
				},
			},
		],
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
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
		],
		_source: false,
	});

	return {
		matches: results.hits.hits.map((hit) => ({
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
				metadata: hit.fields?.metadata[0],
				companyType: hit.fields?.companyType?.[0],
				companyTechStack: hit.fields?.companyTechStack?.[0],
				companyKeywords: hit.fields?.companyKeywords?.[0],
				companyIndustry: hit.fields?.companyIndustry?.[0],
				companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
				location: hit.fields?.location?.[0],
			},
		})),
		totalFound: results.hits.hits.length,
		distanceKm,
	};
};
