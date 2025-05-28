import { ApolloPerson } from '@/types/apollo';
import { Contact, EmailVerificationStatus } from '@prisma/client';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { stripUntilBrace } from '@/app/utils/string';
import { fetchOpenAi } from '../api/openai/route';

const PROMPT = `You are an expert in Apollo.io's People Search API and are tasked with converting a search query in string format into a valid Apollo People Search object. Use the following guidelines:
	1. The returned object should match this Typescript type definition:
		type ApolloPeopleSearch = {
			person_titles?: string[]; // the more you add, the more results you get
			person_locations?: string[]; // cities, countries, and US states are supported
			person_seniorities?: string[]; // ONLY the following values are supported: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern
			organization_locations?: string[]; // The location of the company headquarters for a person's current employer. Cities, US states, and countries are supported
			contact_email_status?: string[]; // verified, unverified, likely to engage, unavailable, Set this to ['verified', 'likely to engage']
			organization_num_employees_ranges?: string[]; // The number of employees at a person's current employer. Each range consists of two numbers separated by a comma. Examples: 1,10; 250,500; 10000,20000
		}
	2. Here is an example of a valid Apollo People Search object in JSON string format. This is in response to the search query "senior level machine learning software engineer in San Francisco, CA or New York City in a small company based in the United States":
	{"person_titles": ["Software Engineer", "Data Scientist"],"person_locations": ["San Francisco", "New York City"],"person_seniorities": ["senior"],"organization_locations": ["United States"],"contact_email_status": ["verified", "likely to engage"],"organization_num_employees_ranges": ["1,10", "250,500"],"q_keywords": ""}
	3. For "contact_email_status", always use this value: ["verified", "likely to engage"]
	4. Ensure that your response is a valid JSON string that can be parsed by JSON.parse() in JavaScript.
	`;

export const fetchApolloContacts = async (
	query: string,
	pageSize: number
): Promise<ApolloPerson[]> => {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey) {
		console.error('Apollo API key not found');
		return [];
	}

	const openAiResponse = await fetchOpenAi(
		OPEN_AI_MODEL_OPTIONS.o4mini,
		PROMPT,
		`Given the following search terms, create a valid Apollo People Search object. Search Query: ${query}`
	);
	const openAiResponseJson = JSON.parse(stripUntilBrace(openAiResponse));

	try {
		const requestBody = {
			...openAiResponseJson,
			page: 1,
			per_page: pageSize, // max 100
			include_similar_titles: true,
		};

		const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
				'x-api-key': apolloApiKey,
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.error('Apollo API error:', await response.text());
			return [];
		}

		const data = await response.json();
		console.log(
			`Apollo returned ${data.people?.length || 0} people out of ${
				data.pagination?.total_entries || 0
			} total`
		);

		return data.people || [];
	} catch (error) {
		console.error('Error fetching Apollo contacts:', error);
		return [];
	}
};

export async function enrichApolloContacts(
	people: ApolloPerson[]
): Promise<ApolloPerson[]> {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey || people.length === 0) {
		return [];
	}

	try {
		const BATCH_SIZE = 10; // max 10 can be enriched at once
		const enrichedPeople: ApolloPerson[] = [];

		for (let i = 0; i < people.length; i += BATCH_SIZE) {
			const batch = people.slice(i, i + BATCH_SIZE);
			const personIds = batch.map((person) => ({
				id: person.id,
			}));

			const requestBody = JSON.stringify({
				details: personIds,
			});

			const response = await fetch(
				'https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false',
				{
					method: 'POST',
					headers: {
						accept: 'application/json',
						'Cache-Control': 'no-cache',
						'Content-Type': 'application/json',
						'X-API-Key': apolloApiKey,
					},
					body: requestBody,
				}
			);

			if (!response.ok) {
				console.error('Apollo enrichment error:', await response.text());
				continue;
			}

			const data = await response.json();
			const matches = data.matches || [];

			enrichedPeople.push(...matches);

			// Rate limiting - Apollo recommends 600 requests per minute
			if (i + BATCH_SIZE < people.length) {
				await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay between batches
			}
		}

		return enrichedPeople;
	} catch (error) {
		console.error('Error enriching Apollo contacts:', error);
		return [];
	}
}

type ContactWithRequiredEmail = Partial<Contact> & {
	email: string;
};

export function transformApolloContact(person: ApolloPerson): ContactWithRequiredEmail {
	return {
		apolloPersonId: person.id,
		firstName: person.first_name || null,
		lastName: person.last_name || null,
		email: person.email,
		emailValidationStatus: EmailVerificationStatus.unknown,
		company: person.contact?.organization_name || null,
		city: person.city || null,
		state: person.state || null,
		country: person.country || null,
		address: person.contact?.present_raw_address || null,
		phone: person.contact?.phone_numbers?.[0].sanitized_number || '',
		title: person.title || null,
		headline: person.headline || null,
		linkedInUrl: person.linkedin_url || null,
		photoUrl: person.photo_url || null,
	};
}
