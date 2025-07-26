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

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized('Only admins can access this route');
		}

		// Read the TSV file
		const unresearchedValidContacts = await prisma.contact.findMany({
			where: {
				lastResearchedDate: null,
				emailValidationStatus: EmailVerificationStatus.valid,
			},
			take: 1,
		});

		const PROMPT = `
		You are an expert at researching people's professional profiles. I will provide a Contact object, which contains various information about a person.

Based on the given information, search the web for information about the contact and do the following two tasks:
1. Fill in missing fields when possible.
2. Correct information in fields that is incorrect, incorrectly formatted, or misspelled. 
3. If no changes are made to a field, return the original value.

You may edit the following fields:

firstName
lastName
company
country // use "United States of America" instead of "United States"
phone
state // use full state names, not abbreviations
website
address // use the full address that includes the city, state, and postal code
city
headline // a one sentence summary like a LinkedIn headline
photoUrl // a link to a photo of the Contact if available
title // a job position, like Musician, or Assistant Hotel Manager
companyFoundedYear // string like "1850"
companyIndustry // such as "Higher Education" "Law" "Events Services"
companyKeywords // a comma-separated list of keywords that would help searchability
metadata // generally a few sentences of extra information about the contact if needed
companyLinkedInUrl
companyPostalCode // string 
companyTechStack //comma-separated list like postgres,nextjs,tailwind css,
companyType // example values are private, education, nonprofit, public, or government
latitude // latitude of the contact's location (float)
longitude // longitude of the contact's location (float)

Additional notes:
- If it's not possible to find certain information, leave the field blank. Don't make up any information.
- If a field contains the string value "undefined" return a null value.
- Contacts may have invalid characters, like vertical tabs (VT) and ? symbols. Please remove these or replace them with a character that would make most sense, such as an apostophe. 
- Use existing information to populate other fields if possible. For example, the city or state field might be blank, but the address field may contain city and state information. Or the firstName may be blank, but the email address contains a first name.

Return your response as a JSON string that can be parsed by JSON.parse() in JavaScript. The format should look like this, with no new line characters:

{"firstName": "John", "lastName": "Doe", "company": "Acme Inc.", "country": "United States of America", "phone": "123-456-7890", "state": "California", "website": "https://www.acme.com", "address": "123 Main St, San Francisco, CA 94133", "city": "San Francisco", "headline": "Experirence music venue manager.", "photoUrl": "https://www.acme.com/photo.jpg", "title": "Music Venue Manager", "companyFoundedYear": "1900", "companyIndustry": "Higher Education", "companyKeywords": ["tech","sports"], "metadata": "Any other text describing the contact", "companyLinkedInUrl": "https://www.linkedin.com/in/john-doe-1234567890", "companyPostalCode": "10578", "companyTechStack": ["postgres","nextjs","tailwind css"], "companyType": "private", "latitude": 37.774929, "longitude": -122.419418}
		`;

		let successCount = 0;
		const startTime = new Date().getTime();
		for (let i = 0; i < unresearchedValidContacts.length; i++) {
			try {
				console.log(
					`Contact ${i + 1} of ${unresearchedValidContacts.length} with email ${
						unresearchedValidContacts[i].email
					} is being researched...`
				);
				const contact = unresearchedValidContacts[i];
				const perplexityResponse = await fetchPerplexity(
					PERPLEXITY_MODEL_OPTIONS.sonar,
					PROMPT,
					JSON.stringify(contact)
				);

				const openAiResponse = await fetchOpenAi(
					OPEN_AI_MODEL_OPTIONS.gpt4nano,
					'I will provide a Contact object. Format the object into a valid JSON object that can be parsed by JSON.parse() in JavaScript. Pay particular attention to the companyKeywords and companyTechStack fields, which should be a list of strings like ["postgres","nextjs","tailwind css"]. Do not modify any of the data, only edit formatting as needed. The latitude and longitude fields should be floats. If they are not present or formatted as empty strings, use null. ',
					perplexityResponse.choices[0].message.content
				);

				console.log(`Researched contact: ${JSON.stringify(openAiResponse)}`);

				const researchedContact: Partial<Contact> = JSON.parse(openAiResponse);

				const updateRes = await prisma.contact.update({
					where: { id: contact.id },
					data: {
						...researchedContact,
						lastResearchedDate: new Date(),
					},
				});

				successCount++;

				console.log(`Updated contact: ${JSON.stringify(updateRes)}`);
			} catch (error) {
				console.error(error);
				continue;
			}
		}

		return apiResponse({
			successCount,
			totalCount: unresearchedValidContacts.length,
			runningTime: (new Date().getTime() - startTime) / 1000,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
