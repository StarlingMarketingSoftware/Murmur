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

			console.log('matches', matches);

			// Add successful matches to our results
			matches.forEach((match: any) => {
				if (match.matched_person) {
					enrichedPeople.push(match.matched_person);
				}
			});

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

export function transformApolloContact(person: ApolloPerson): Partial<Contact> {
	return {
		name: person.name || '',
		email: person.email || '',
		company: person.organization?.name || '',
		website: person.organization?.website_url || null,
		state: person.state || '',
		country: person.country || '',
		phone: person.phone_numbers?.[0] || '',
	};
}
