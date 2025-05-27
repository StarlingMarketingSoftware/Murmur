import { Contact } from '@prisma/client';

export interface ZeroBounceFileResponse {
	success: boolean;
	file_id?: string;
	file_name?: string;
	file_status?: string;
	upload_date?: string;
	complete_date?: string;
	return_url?: string;
	error?: string;
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

	// Create CSV content
	const csvContent = createEmailCSV(emails, hasHeaderRow);
	console.log('🚀 ~ csvContent:', csvContent);

	// Create form data
	const formData = new FormData();

	// Create a Blob from the CSV content
	const csvBlob = new Blob([csvContent], { type: 'text/csv' });

	// Add the file to form data
	formData.append('file', csvBlob, 'emails.csv');

	// Add required parameters
	formData.append('api_key', apiKey);
	formData.append('email_address_column', '1'); // Email is in column 1 (0-indexed would be 0, but API expects 1-indexed)

	// Add optional parameters
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
	console.log('🚀 ~ formData:', formData);

	try {
		const response = await fetch('https://bulkapi.zerobounce.net/v2/sendfile', {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`ZeroBounce API error: ${response.status} - ${errorText}`);
		}

		const result = await response.json();

		return {
			success: result.success || false,
			file_id: result.file_id,
			file_name: result.file_name,
			file_status: result.file_status,
			upload_date: result.upload_date,
			complete_date: result.complete_date,
			return_url: result.return_url,
			error: result.error,
		};
	} catch (error) {
		console.error('Error sending file to ZeroBounce:', error);
		throw error;
	}
}

/**
 * Checks the status of a file validation job
 */
export async function getZeroBounceFileStatus(
	fileId: string,
	apiKey: string
): Promise<ZeroBounceFileResponse> {
	if (!apiKey || !fileId) {
		throw new Error('API key and file ID are required');
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

		const result = await response.json();

		return {
			success: true,
			file_id: result.file_id,
			file_name: result.file_name,
			file_status: result.file_status,
			upload_date: result.upload_date,
			complete_date: result.complete_date,
			return_url: result.return_url,
		};
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
			`https://api.zerobounce.net/v2/getfile?api_key=${encodeURIComponent(
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

		// Return the CSV content as text
		return await response.text();
	} catch (error) {
		console.error('Error getting ZeroBounce file results:', error);
		throw error;
	}
}
