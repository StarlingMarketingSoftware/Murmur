import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import stringSimilarity from 'string-similarity';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { getValidatedParamsFromUrl } from '@/app/utils/url';
import { enrichApolloContacts, transformApolloContact } from '@/app/utils/apollo';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { fetchOpenAi } from '../openai/route';
import { stripUntilBrace } from '@/app/utils/string';
import { ApolloPerson } from '@/types/apollo';
import { Contact, EmailVerificationStatus } from '@prisma/client';
import {
	extractEmailsFromContacts,
	sendFileToZeroBounce,
	getZeroBounceFileStatus,
	getZeroBounceFileResults,
} from '@/app/utils/zerobounce';

// ZeroBounce validation result interface
interface ZeroBounceResult {
	email_address: string;
	status: string;
	sub_status?: string;
	zbscore?: string | number;
	[key: string]: unknown; // Allow for additional fields
}

const getApolloContactsSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().default(20),
});
export type GetApolloContactsData = z.infer<typeof getApolloContactsSchema>;

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

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, getApolloContactsSchema);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const { query, limit } = validatedFilters.data;
		const searchTerms: string[] = query
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);

		const allContacts = await prisma.contact.findMany({});

		// get an array of words in Contacts that are similar to the search terms
		const similarTermSets = searchTerms.map((term) => {
			const similarWords = new Set<string>();
			similarWords.add(term);

			allContacts.forEach((contact) => {
				const fieldsToCheck = [
					contact.firstName,
					contact.lastName,
					contact.company,
					contact.state,
					contact.country,
				].filter((field): field is string => field !== null);

				fieldsToCheck.forEach((field) => {
					const words = field.toLowerCase().split(/\s+/);
					words.forEach((word) => {
						const similarity = stringSimilarity.compareTwoStrings(term, word);
						if (similarity > 0.7) {
							similarWords.add(word);
						}
					});
				});
			});

			return Array.from(similarWords);
		});

		const caseInsensitiveMode = 'insensitive' as const;
		const whereConditions =
			searchTerms.length > 0
				? {
						AND: similarTermSets.map((similarTerms) => ({
							OR: [
								...similarTerms.map((term) => ({
									OR: [
										{ firstName: { contains: term, mode: caseInsensitiveMode } },
										{ lastName: { contains: term, mode: caseInsensitiveMode } },
										{ email: { contains: term, mode: caseInsensitiveMode } },
										{ company: { contains: term, mode: caseInsensitiveMode } },
										{ state: { contains: term, mode: caseInsensitiveMode } },
										{ country: { contains: term, mode: caseInsensitiveMode } },
										{ website: { contains: term, mode: caseInsensitiveMode } },
										{ phone: { contains: term, mode: caseInsensitiveMode } },
									],
								})),
							],
						})),
				  }
				: {};

		const localContacts: Contact[] = await prisma.contact.findMany({
			where: whereConditions,
			take: limit,
			orderBy: {
				company: 'asc',
			},
		});

		if (localContacts.length < limit) {
			const apolloContacts: ApolloPerson[] = await fetchApolloContacts(query);

			// check for duplicates before enrichment, via apollo id
			const existingContacts: Contact[] = await prisma.contact.findMany({
				where: {
					apolloPersonId: {
						in: apolloContacts.map((person: ApolloPerson) => person.id),
					},
				},
			});

			// remove existing contacts from apolloContacts
			const filteredApolloContacts = apolloContacts.filter(
				(contact: ApolloPerson) =>
					!existingContacts.some(
						(existingContact) => existingContact.apolloPersonId === contact.id
					)
			);

			// loop through existingContacts...
			for (const existingContact of existingContacts) {
				// oadd the existing contact to localContacts
				const contactExistsInLocalSearch = localContacts.find(
					(contact) => contact.apolloPersonId === existingContact.apolloPersonId
				);
				if (!contactExistsInLocalSearch) {
					localContacts.push(existingContact);
				}
			}

			// for remaining apolloContacts, enrich them, and transform them
			const enrichedPeople = await enrichApolloContacts(filteredApolloContacts);
			const transformedContacts = enrichedPeople.map(transformApolloContact);

			// verify emails with zerobounce
			const zeroBounceFileId = await verifyEmailsWithZeroBounce(transformedContacts);

			let finalContacts = transformedContacts;

			// if we got a file_id, wait for validation to complete
			if (zeroBounceFileId) {
				console.log('🚀 Starting ZeroBounce validation process...');

				const validationCompleted = await waitForZeroBounceCompletion(
					zeroBounceFileId,
					15
				); // 15 minute timeout

				if (validationCompleted) {
					// Process validation results and update contacts
					finalContacts = await processZeroBounceResults(
						zeroBounceFileId,
						transformedContacts
					);
					// console.log('🚀 ~ GET ~ finalContacts:', finalContacts);
					console.log('✅ Email validation completed and results processed');
				} else {
					console.warn(
						'⚠️ ZeroBounce validation did not complete within timeout, proceeding with unvalidated contacts'
					);
				}
			} else {
				console.warn(
					'⚠️ No ZeroBounce file ID received, proceeding without email validation'
				);
			}

			// save to database with validation results
			const createdContacts: Contact[] = await prisma.contact.createManyAndReturn({
				data: finalContacts,
			});

			// merge with localContacts
			const combinedResults = [...localContacts, ...createdContacts];

			return apiResponse(combinedResults);
		}
		return apiResponse(localContacts);
	} catch (error) {
		return handleApiError(error);
	}
}

const fetchApolloContacts = async (query: string): Promise<ApolloPerson[]> => {
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
	console.log('🚀 ~ fetchApolloContacts ~ response:', openAiResponse);
	const openAiResponseJson = JSON.parse(stripUntilBrace(openAiResponse));

	try {
		const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
				'x-api-key': apolloApiKey,
			},
			body: JSON.stringify(openAiResponseJson),
		});

		if (!response.ok) {
			console.error('Apollo API error:', await response.text());
			return [];
		}

		const data = await response.json();
		return data.people || [];
	} catch (error) {
		console.error('Error fetching Apollo contacts:', error);
		return [];
	}
};

/**
 * Verifies emails using ZeroBounce Send File API
 * This function sends a batch of emails for validation and returns the file_id
 * Results can be retrieved later using the file_id returned
 */
const verifyEmailsWithZeroBounce = async (
	contacts: (Partial<Contact> & { email: string })[]
): Promise<string | null> => {
	const zeroBounceApiKey = process.env.ZERO_BOUNCE_API_KEY_MURMUR;

	if (!zeroBounceApiKey) {
		console.warn('ZeroBounce API key not found, skipping email verification');
		return null;
	}

	if (contacts.length === 0) {
		console.log('No contacts to verify');
		return null;
	}

	try {
		// Extract emails from contacts
		const emails = extractEmailsFromContacts(contacts);

		if (emails.length === 0) {
			console.log('No valid emails found to verify');
			return null;
		}

		console.log(`Sending ${emails.length} emails to ZeroBounce for validation`);

		// Send to ZeroBounce for validation
		const result = await sendFileToZeroBounce(emails, {
			apiKey: zeroBounceApiKey,
			hasHeaderRow: true,
			// You can add a return URL if you want to be notified when validation is complete
			// returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/zerobounce`,
		});

		if (result.success && result.file_id) {
			console.log(`ZeroBounce file uploaded successfully. File ID: ${result.file_id}`);
			return result.file_id;
		} else {
			console.error('ZeroBounce file upload failed:', result.error);
			return null;
		}
	} catch (error) {
		console.error('Error verifying emails with ZeroBounce:', error);
		// Don't throw the error - we don't want email verification failure to break the contact creation
		return null;
	}
};

/**
 * Checks the status of a ZeroBounce file validation job and optionally retrieves results
 * This function polls the status and processes results when complete
 */
const waitForZeroBounceCompletion = async (
	fileId: string,
	timeoutMinutes: number = 15
): Promise<boolean> => {
	const zeroBounceApiKey = process.env.ZERO_BOUNCE_API_KEY_MURMUR;

	if (!zeroBounceApiKey) {
		console.warn('ZeroBounce API key not found, skipping status check');
		return false;
	}

	const startTime = Date.now();
	const timeoutMs = timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
	const pollIntervalMs = 3000; // Poll every 10 seconds

	console.log(`Starting ZeroBounce validation polling for file ID: ${fileId}`);
	console.log(`Timeout set to ${timeoutMinutes} minutes`);

	while (Date.now() - startTime < timeoutMs) {
		try {
			const statusResult = await getZeroBounceFileStatus(fileId, zeroBounceApiKey);

			console.log(
				`ZeroBounce file status: ${statusResult.file_status} (${Math.round(
					(Date.now() - startTime) / 1000
				)}s elapsed)`
			);

			if (statusResult.file_status === 'Complete') {
				console.log('✅ ZeroBounce validation completed successfully!');
				console.log('Status details:', {
					file_id: statusResult.file_id,
					file_name: statusResult.file_name,
					upload_date: statusResult.upload_date,
					complete_date: statusResult.complete_date,
				});
				return true;
			} else if (statusResult.file_status === 'Error') {
				console.error('❌ ZeroBounce validation failed with an error');
				console.error('Error details:', statusResult);
				return false;
			} else if (statusResult.file_status === 'Processing') {
				console.log('⏳ File is still being processed, waiting...');
			} else {
				console.log(`📋 File status: ${statusResult.file_status}, continuing to poll...`);
			}

			// Wait before next poll
			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		} catch (error) {
			console.error('Error checking ZeroBounce file status:', error);
			// Continue polling unless we've reached timeout
			if (Date.now() - startTime >= timeoutMs) {
				console.error('Timeout reached while polling ZeroBounce status');
				return false;
			}
			// Wait a bit before retrying on error
			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		}
	}

	console.warn(`⏰ ZeroBounce validation timeout after ${timeoutMinutes} minutes`);
	return false;
};

const processZeroBounceResults = async (
	fileId: string,
	contacts: (Partial<Contact> & { email: string })[]
): Promise<(Partial<Contact> & { email: string })[]> => {
	const zeroBounceApiKey = process.env.ZERO_BOUNCE_API_KEY_MURMUR;

	if (!zeroBounceApiKey) {
		console.warn(
			'ZeroBounce API key not found, returning contacts without validation results'
		);
		return contacts;
	}

	try {
		console.log('🔄 Fetching ZeroBounce validation results...');
		console.log('🚀 ~ fileId:', fileId);
		console.log('🚀 ~ zeroBounceApiKey:', zeroBounceApiKey);
		const csvResults: string = await getZeroBounceFileResults(fileId, zeroBounceApiKey);

		// Check if we received CSV data
		if (!csvResults || typeof csvResults !== 'string') {
			console.warn('No validation results received, returning original contacts');
			return contacts;
		}

		console.log('📊 Parsing CSV validation results...');

		// Parse CSV data - split into lines and process each row
		const csvLines = csvResults.trim().split('\n');
		console.log(`Found ${csvLines.length} result lines`);

		// Parse CSV rows into structured data
		const parsedResults: ZeroBounceResult[] = [];

		csvLines.forEach((line, index) => {
			if (line.trim()) {
				try {
					// Parse CSV line - handle quoted values
					const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
					const cleanValues = values.map((val) => val.replace(/^"|"$/g, ''));

					if (cleanValues.length >= 3) {
						const result: ZeroBounceResult = {
							email_address: cleanValues[0] || '',
							status: cleanValues[1] || '',
							sub_status: cleanValues[2] || undefined,
							// Additional fields from ZeroBounce CSV format
							account: cleanValues[3] || '',
							domain: cleanValues[4] || '',
							first_name: cleanValues[5] || '',
							last_name: cleanValues[6] || '',
							gender: cleanValues[7] || '',
							free_email: cleanValues[8] === 'True',
							mx_found: cleanValues[9] === 'true',
							mx_record: cleanValues[10] || '',
							smtp_provider: cleanValues[11] || '',
							zbscore: cleanValues[12] || undefined,
						};

						parsedResults.push(result);
					}
				} catch (parseError) {
					console.warn(`Failed to parse CSV line ${index + 1}:`, line, parseError);
				}
			}
		});

		console.log(`📊 Successfully parsed ${parsedResults.length} validation results`);

		// Log a sample result to see what data ZeroBounce provides
		if (parsedResults.length > 0) {
			console.log('Sample ZeroBounce result fields:', {
				email_address: parsedResults[0].email_address,
				status: parsedResults[0].status,
				sub_status: parsedResults[0].sub_status,
				zbscore: parsedResults[0].zbscore,
			});
		}

		// Create a map of email to validation result for quick lookup
		const validationMap = new Map<string, ZeroBounceResult>();
		parsedResults.forEach((result: ZeroBounceResult) => {
			if (result.email_address) {
				validationMap.set(result.email_address.toLowerCase(), result);
			}
		});

		// Update contacts with validation results - updating emailStatus and ZeroBounce fields
		const updatedContacts = contacts.map((contact) => {
			const validationResult = validationMap.get(contact.email?.toLowerCase());

			// Safe type checking using the Prisma enum
			const getValidEmailStatus = (status: string): EmailVerificationStatus => {
				const normalizedStatus = status
					.toLowerCase()
					.replace(/-/g, '_') as keyof typeof EmailVerificationStatus;

				// Check if the status exists in the enum
				if (normalizedStatus in EmailVerificationStatus) {
					return EmailVerificationStatus[normalizedStatus];
				}

				return EmailVerificationStatus.unknown;
			};

			if (validationResult) {
				return {
					...contact,
					emailValidationStatus: getValidEmailStatus(validationResult.status),
					emailValidationSubStatus: validationResult.sub_status || null,
					emailValidationScore:
						validationResult.zbscore !== undefined
							? typeof validationResult.zbscore === 'string'
								? parseInt(validationResult.zbscore, 10)
								: validationResult.zbscore
							: null,
					emailValidatedAt: new Date(),
				};
			}

			return contact;
		});

		console.log('✅ Successfully processed ZeroBounce validation results');

		// Log validation summary
		const validationSummary = updatedContacts.reduce((summary, contact) => {
			if (contact.emailValidationStatus) {
				summary[contact.emailValidationStatus] =
					(summary[contact.emailValidationStatus] || 0) + 1;
			}
			return summary;
		}, {} as Record<string, number>);

		console.log('📈 ZeroBounce validation summary:', validationSummary);

		return updatedContacts;
	} catch (error) {
		if (error instanceof Error) {
			console.error('Error processing ZeroBounce results:', error.message);
		}
		return contacts; // Return original contacts on error
	}
};
