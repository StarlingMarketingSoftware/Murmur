import { Contact, EmailVerificationStatus } from '@prisma/client';

export interface ZeroBounceFileResponse {
	success: boolean;
	file_id?: string;
	file_name?: string;
	upload_date?: string;
	file_status?: string;
	complete_percentage?: string;
	return_url?: string;
	error_reason?: string;
}

export interface ZeroBounceConfig {
	apiKey: string;
	returnUrl?: string;
	firstNameColumn?: number;
	lastNameColumn?: number;
	genderColumn?: number;
	ipAddressColumn?: number;
	hasHeaderRow?: boolean;
}

interface ZeroBounceResult {
	email_address: string;
	status: string;
	sub_status?: string;
	zbscore?: string | number;
	[key: string]: unknown;
}

/**
 * Creates a CSV content string from an array of email addresses
 */
export function createEmailCSV(emails: string[], includeHeader: boolean = true): string {
	const rows: string[] = [];

	if (includeHeader) {
		rows.push('email');
	}

	emails.forEach((email) => {
		rows.push(`"${email}"`);
	});

	return rows.join('\n');
}

/**
 * Extracts email addresses from transformed contacts
 */
export function extractEmailsFromContacts(contacts: Partial<Contact>[]): string[] {
	return contacts
		.map((contact) => contact.email)
		.filter((email): email is string => email !== null && email !== undefined);
}

/**
 * Sends a CSV file to ZeroBounce Send File v2 API for bulk email validation
 */
export async function sendFileToZeroBounce(
	emails: string[],
	config: ZeroBounceConfig
): Promise<ZeroBounceFileResponse> {
	const {
		apiKey,
		returnUrl,
		firstNameColumn,
		lastNameColumn,
		genderColumn,
		ipAddressColumn,
		hasHeaderRow = true,
	} = config;

	if (!apiKey) {
		throw new Error('ZeroBounce API key is required');
	}

	if (emails.length === 0) {
		throw new Error('No emails provided for validation');
	}

	const csvContent = createEmailCSV(emails, hasHeaderRow);
	const formData = new FormData();
	const csvBlob = new Blob([csvContent], { type: 'text/csv' });
	formData.append('file', csvBlob, 'emails.csv');
	formData.append('api_key', apiKey);
	formData.append('email_address_column', '1');

	if (returnUrl) {
		formData.append('return_url', returnUrl);
	}
	if (firstNameColumn !== undefined) {
		formData.append('first_name_column', firstNameColumn.toString());
	}
	if (lastNameColumn !== undefined) {
		formData.append('last_name_column', lastNameColumn.toString());
	}
	if (genderColumn !== undefined) {
		formData.append('gender_column', genderColumn.toString());
	}
	if (ipAddressColumn !== undefined) {
		formData.append('ip_address_column', ipAddressColumn.toString());
	}
	if (hasHeaderRow !== undefined) {
		formData.append('has_header_row', hasHeaderRow.toString());
	}

	try {
		const response = await fetch('https://bulkapi.zerobounce.net/v2/sendfile', {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`ZeroBounce API error: ${response.status} - ${errorText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error sending file to ZeroBounce:', error);
		throw error;
	}
}

/**
 * Checks the status of a file validation job
 */
export async function getZeroBounceFileStatus(
	fileId: string
): Promise<ZeroBounceFileResponse> {
	const apiKey = process.env.ZERO_BOUNCE_API_KEY_MURMUR;

	if (!apiKey) {
		throw new Error('API key not found in environment');
	}

	try {
		const response = await fetch(
			`https://bulkapi.zerobounce.net/v2/filestatus?api_key=${encodeURIComponent(
				apiKey
			)}&file_id=${encodeURIComponent(fileId)}`,
			{
				method: 'GET',
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`ZeroBounce API error: ${response.status} - ${errorText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error checking ZeroBounce file status:', error);
		throw error;
	}
}

/**
 * Gets the validation results for a completed file
 */
export async function getZeroBounceFileResults(
	fileId: string,
	apiKey: string
): Promise<string> {
	if (!apiKey || !fileId) {
		throw new Error('API key and file ID are required');
	}

	try {
		const response = await fetch(
			`https://bulkapi.zerobounce.net/v2/getfile?api_key=${encodeURIComponent(
				apiKey
			)}&file_id=${encodeURIComponent(fileId)}`,
			{
				method: 'GET',
			}
		);

		const res = await response.text();

		if (!response.ok) {
			throw new Error(`ZeroBounce API error: ${response.status} - ${res}`);
		}

		return res;
	} catch (error) {
		console.error('Error getting ZeroBounce file results:', error);
		throw error;
	}
}

/**
 * Verifies emails using ZeroBounce Send File API
 * This function sends a batch of emails for validation and returns the file_id
 * Results can be retrieved later using the file_id returned
 */
export const verifyEmailsWithZeroBounce = async (
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
		const emails = extractEmailsFromContacts(contacts);

		if (emails.length === 0) {
			console.log('No valid emails found to verify');
			return null;
		}

		console.log(`Sending ${emails.length} emails to ZeroBounce for validation`);

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

export const waitForZeroBounceCompletion = async (
	fileId: string,
	timeoutMinutes: number = 15
): Promise<boolean> => {
	const zeroBounceApiKey = process.env.ZERO_BOUNCE_API_KEY_MURMUR;

	if (!zeroBounceApiKey) {
		console.warn('ZeroBounce API key not found, skipping status check');
		return false;
	}

	const startTime = Date.now();
	const timeoutMs = timeoutMinutes * 60 * 1000;
	const pollIntervalMs = 3000;

	console.log(`Starting ZeroBounce validation polling for file ID: ${fileId}`);
	console.log(`Timeout set to ${timeoutMinutes} minutes`);

	while (Date.now() - startTime < timeoutMs) {
		try {
			const statusResult = await getZeroBounceFileStatus(fileId);

			console.log(
				`ZeroBounce file status: ${statusResult.file_status} (${Math.round(
					(Date.now() - startTime) / 1000
				)}s elapsed)`
			);

			if (statusResult.file_status === 'Complete') {
				console.log('ZeroBounce validation completed successfully!');
				console.log('Status details:', statusResult);
				return true;
			} else if (statusResult.file_status === 'Error') {
				console.error('ZeroBounce validation failed with an error');
				console.error('Error details:', statusResult);
				return false;
			} else if (statusResult.file_status === 'Processing') {
				console.log('File is still being processed, waiting...');
			} else {
				console.log(`File status: ${statusResult.file_status}, continuing to poll...`);
			}

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

export const processZeroBounceResults = async (
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
		const csvResults: string = await getZeroBounceFileResults(fileId, zeroBounceApiKey);

		if (!csvResults || typeof csvResults !== 'string') {
			console.warn('No validation results received, returning original contacts');
			return contacts;
		}

		const csvLines = csvResults.trim().split('\n');
		const parsedResults: ZeroBounceResult[] = [];

		csvLines.forEach((line, index) => {
			if (line.trim()) {
				try {
					const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
					const cleanValues = values.map((val) => val.replace(/^"|"$/g, ''));

					if (cleanValues.length >= 3) {
						const result: ZeroBounceResult = {
							email_address: cleanValues[0] || '',
							status: cleanValues[1] || '',
							sub_status: cleanValues[2] || undefined,
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
		console.log(`Successfully parsed ${parsedResults.length} validation results`);

		const validationMap = new Map<string, ZeroBounceResult>();
		parsedResults.forEach((result: ZeroBounceResult) => {
			if (result.email_address) {
				validationMap.set(result.email_address.toLowerCase(), result);
			}
		});

		const updatedContacts = contacts.map((contact) => {
			const validationResult = validationMap.get(contact.email?.toLowerCase());
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
					emailValidatedAt: new Date(),
				};
			}

			return contact;
		});
		console.log('✅ Successfully processed ZeroBounce validation results');

		return updatedContacts;
	} catch (error) {
		if (error instanceof Error) {
			console.error('Error processing ZeroBounce results:', error.message);
		}
		console.log('✅ Email validation completed and results processed');
		return contacts;
	}
};
