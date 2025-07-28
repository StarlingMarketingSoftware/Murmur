import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {
	apiResponse,
	apiUnauthorized,
	fetchOpenAi,
	handleApiError,
} from '@/app/api/_utils';
import { fetchPerplexity } from '@/app/api/_utils/perplexity';
import { OPEN_AI_MODEL_OPTIONS, PERPLEXITY_MODEL_OPTIONS } from '@/constants';
import { Contact, EmailVerificationStatus } from '@prisma/client';
import { PerplexityCompletionObject } from '@/types';

// Function to filter contact object to only include allowed fields
function filterAllowedContactFields(
	contactData: Record<string, unknown>
): Record<string, unknown> {
	const allowedFields = [
		'company',
		'country',
		'phone',
		'state',
		'website',
		'address',
		'city',
		'headline',
		'title',
		'companyFoundedYear',
		'companyIndustry',
		'companyKeywords',
		'metadata',
		'companyLinkedInUrl',
		'companyPostalCode',
		'companyTechStack',
		'companyType',
		'latitude',
		'longitude',
	];

	const filteredContact: Record<string, unknown> = {};

	for (const field of allowedFields) {
		if (contactData.hasOwnProperty(field)) {
			filteredContact[field] = contactData[field];
		}
	}

	return filteredContact;
}

export const PATCH = async function PATCH() {
	try {
		// const { userId } = await auth();
		// if (!userId) {
		// 	return apiUnauthorized();
		// }
		// const user = await prisma.user.findUnique({
		// 	where: { clerkId: userId },
		// });

		// if (user?.role !== UserRole.admin) {
		// 	return apiUnauthorized('Only admins can access this route');
		// }

		// Read the TSV file
		const unresearchedValidContacts = await prisma.contact.findMany({
			where: {
				lastResearchedDate: null,
				emailValidationStatus: EmailVerificationStatus.valid,
			},
			take: 10, // Increased to process more contacts in batches
		});

		const PROMPT = `
		You are an expert at researching people's professional profiles. I will provide a Contact object, which contains various information about a person.

Based on the given information, search the web for information about the contact and do the following two tasks:
1. Fill in missing fields when possible.
2. Correct information in fields that is incorrect, incorrectly formatted, or misspelled. 
3. If no changes are made to a field, return the original value.
4. Do not set fields to null if the field has data in the original contact object.

You may edit the following fields:


- for "country" use "United States of America" instead of "United States"
- for "state" use full state names, not abbreviations
- for "address" use the full address that includes the city, state, and postal code. !IMPORTANT, NEVER set the address to null if the address field was originally not empty.
- "headline" is a one sentence summary like a LinkedIn headline
- "title" is a job position, like Musician, or Assistant Hotel Manager
- "companyFoundedYear" is a string like "1850"
- "companyIndustry" are industries such as "Higher Education", "Law", "Events Services"
- "companyKeywords" is a comma-separated list of keywords
- "website" is a string like "https://www.acme.com"
- "metadata" is a few sentences of extra information about the contact
- "companyPostalCode" is a string like "10578"
- "companyTechStack" is a comma-separated list like postgres,nextjs,tailwind css,
- "companyType" can be a value such as "private", "education", "nonprofit", "public", or "government"
- "latitude" is the latitude of the contact's location (float)
- "longitude" is the longitude of the contact's location (float)

Additional notes:
- If it's not possible to find certain information, leave the field blank. Don't make up any information.
- If a field contains the string value "undefined" return a null value.
- Contacts may have invalid characters, like vertical tabs (VT) and ? symbols. Please remove these or replace them with a character that would make most sense, such as an apostophe. 
- Use existing information to populate other fields if possible. For example, the city or state field might be blank, but the address field may contain city and state information.
- Do not set fields to null if the field has data in the original contact object.
- Do not include the  "id" field in the response. 

Return your response as a JSON string that can be parsed by JSON.parse() in JavaScript. The format should look like this, with no new line characters:

{"company": "Acme Inc.", "country": "United States of America", "phone": "123-456-7890", "state": "California", "website": "https://www.acme.com", "address": "123 Main St, San Francisco, CA 94133", "city": "San Francisco", "headline": "Experienced music venue manager.","title": "Music Venue Manager", "companyFoundedYear": "1900", "companyIndustry": "Higher Education", "companyKeywords": ["tech","sports"], "metadata": "Any other text describing the contact", "companyLinkedInUrl": "https://www.linkedin.com/in/john-doe-1234567890", "companyPostalCode": "10578", "companyTechStack": ["postgres","nextjs","tailwind css"], "companyType": "private", "latitude": 37.774929, "longitude": -122.419418}
		`;

		let successCount = 0;
		const startTime = new Date().getTime();
		const BATCH_SIZE = 10;

		let perplexityTokensUsed = 0;

		// Process contacts in batches
		for (let i = 0; i < unresearchedValidContacts.length; i += BATCH_SIZE) {
			const batch = unresearchedValidContacts.slice(i, i + BATCH_SIZE);
			console.log(
				`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
					unresearchedValidContacts.length / BATCH_SIZE
				)}`
			);

			// Process batch in parallel
			const batchPromises = batch.map(async (contact, batchIndex) => {
				try {
					console.log(
						`Contact ${i + batchIndex + 1} of ${
							unresearchedValidContacts.length
						} with email ${contact.email} is being researched...`
					);

					const minimalContact = {
						firstName: contact.firstName,
						lastName: contact.lastName,
						company: contact.company,
						email: contact.email,
						country: contact.country,
						phone: contact.phone,
						state: contact.state,
						website: contact.website,
						address: contact.address,
						city: contact.city,
						headline: contact.headline,
						title: contact.title,
						companyFoundedYear: contact.companyFoundedYear,
						companyIndustry: contact.companyIndustry,
						companyKeywords: contact.companyKeywords,
						metadata: contact.metadata,
						companyLinkedInUrl: contact.companyLinkedInUrl,
						companyPostalCode: contact.companyPostalCode,
						companyTechStack: contact.companyTechStack,
						companyType: contact.companyType,
						latitude: contact.latitude,
						longitude: contact.longitude,
					};

					const perplexityResponse: PerplexityCompletionObject = await fetchPerplexity(
						PERPLEXITY_MODEL_OPTIONS.sonar,
						PROMPT,
						JSON.stringify(minimalContact)
					);

					const perplexityTokens = perplexityResponse.usage.total_tokens;
					perplexityTokensUsed += perplexityTokens;

					const openAiResponse = await fetchOpenAi(
						OPEN_AI_MODEL_OPTIONS.gpt4nano,
						`I will provide a Contact object. Format the object into a valid JSON object that can be parsed by JSON.parse() in JavaScript. 
						- Pay particular attention to the companyKeywords and companyTechStack fields, which should be a list of strings like ["postgres","nextjs","tailwind css"].
						- companyIndustry should be a string like "Higher Education, Law, Events Services"
						-  The latitude and longitude fields should be floats. If they are not present or formatted as empty strings, use null.
						- If there are empty strings in fields like "", set the field to null.
						- If companyTechStack or companyKeywords are null, set it to an empty array [].
						- companyFoundedYear should be a string like "1850"
						- website should be a string like "https://www.acme.com"
						`,
						`emailAddress: ${contact.email}
						${perplexityResponse.choices[0].message.content}
						`
					);

					let researchedContact: Partial<Contact>;

					try {
						const parsedContact = JSON.parse(openAiResponse);
						// Filter to only include allowed fields
						researchedContact = filterAllowedContactFields(
							parsedContact
						) as Partial<Contact>;
						if (
							researchedContact.address === '' ||
							researchedContact.address === null ||
							researchedContact.address === undefined
						) {
							researchedContact.address = contact.address;
						}
					} catch (parseError) {
						console.error(
							`Failed to parse OpenAI response for contact with email ${contact.email}:`,
							parseError,
							`Response: ${openAiResponse}`
						);
						return null; // Return null for failed contacts
					}

					// Return the contact data for batch update
					return {
						id: contact.id,
						...researchedContact,
						lastResearchedDate: new Date(),
					};
				} catch (error) {
					console.error(`Error processing contact ${contact.email}:`, error);
					return null; // Return null for failed contacts
				}
			});

			// Wait for all contacts in the batch to be processed
			const batchResults = await Promise.all(batchPromises);

			// Filter out failed contacts and prepare for batch update
			const successfulContacts = batchResults.filter((result) => result !== null);

			if (successfulContacts.length > 0) {
				const updatePromises = successfulContacts.map((contactData) => {
					const { id, ...rest } = contactData;
					return prisma.contact.update({
						where: { id },
						data: rest,
					});
				});

				const updateResults = await Promise.all(updatePromises);
				successCount += updateResults.length;

				console.log(`Successfully updated ${updateResults.length} contacts in batch`);
			}
		}

		return apiResponse<ResearchContactsResponse>({
			successCount,
			totalCount: unresearchedValidContacts.length,
			runningTime: (new Date().getTime() - startTime) / 1000,
			perplexityTokensUsed,
		});
	} catch (error) {
		return handleApiError(error);
	}
};

export type ResearchContactsResponse = {
	successCount: number;
	totalCount: number;
	runningTime: number;
	perplexityTokensUsed: number;
};
