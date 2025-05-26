import { ApolloPerson } from '@/types/apollo';
import { Contact } from '@prisma/client';

export async function enrichApolloContacts(
	people: ApolloPerson[]
): Promise<ApolloPerson[]> {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey || people.length === 0) {
		console.log('no data or api');
		return [];
	}

	try {
		const BATCH_SIZE = 10; // Apollo's bulk_match limit
		const enrichedPeople: ApolloPerson[] = [];

		// Process people in batches of 10
		for (let i = 0; i < people.length; i += BATCH_SIZE) {
			const batch = people.slice(i, i + BATCH_SIZE);
			console.log('batch', i);
			// Prepare the batch for enrichment
			const personIds = batch.map((person) => ({
				id: person.id,
			}));
			console.log(personIds);

			const requestBody = JSON.stringify({
				details: personIds,
			});
			console.log('request body', requestBody);

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
				continue; // Skip this batch but continue with others
			}

			const data = await response.json();
			const matches = data.matches || [];
			console.log('🚀 ~ matches:', matches);

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
		emailStatus: person.email_status || 'unverified',
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
