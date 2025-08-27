import { HybridBlockPrompt } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { HybridBlock } from '@prisma/client';

export const normalizeTextCaseAndWhitespace = (text: string): string => {
	return text.trim().toLowerCase();
};

/**
 * Truncates text to a specified length and adds ellipses
 * Tries to break at word boundaries when possible for better readability
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param breakOnWords - Whether to try to break at word boundaries (default: true)
 * @returns The truncated text with ellipses if needed
 */
export const ellipsesText = (
	text: string,
	maxLength: number,
	breakOnWords: boolean = true
): string => {
	if (!text || text.length <= maxLength) {
		return text;
	}

	if (maxLength <= 3) {
		return '...';
	}

	const truncateLength = maxLength - 3; // Reserve space for ellipses

	if (!breakOnWords) {
		return text.substring(0, truncateLength) + '...';
	}

	// Try to break at word boundaries
	const truncated = text.substring(0, truncateLength);
	const lastSpaceIndex = truncated.lastIndexOf(' ');

	// If we found a space and it's not too close to the beginning, break there
	if (lastSpaceIndex > truncateLength * 0.5) {
		return truncated.substring(0, lastSpaceIndex) + '...';
	}

	// Otherwise, just cut at the character limit
	return truncated + '...';
};

/**
 * Capitalizes the first letter of a string and makes the rest lowercase
 * @param text - The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (text: string): string => {
	if (!text) return '';
	return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Strips everything before the first { character
 * @param text - The text to strip
 * @returns The text with everything before the first { character removed
 */
const stripUntilBrace = (text: string): string => {
	const braceIndex = text.indexOf('{');
	return braceIndex >= 0 ? text.substring(braceIndex) : text;
};

const stripAfterBrace = (text: string): string => {
	const braceIndex = text.indexOf('}');
	return braceIndex >= 0 ? text.substring(0, braceIndex + 1) : text;
};

export const stripBothSidesOfBraces = (text: string): string => {
	return stripAfterBrace(stripUntilBrace(text));
};

/**
 * Removes markdown code block syntax from text
 * Handles cases like: ```json\n{ key: value }\n```
 * @param text - The text to clean
 * @returns The text with markdown code blocks removed
 */
export const removeMarkdownCodeBlocks = (text: string): string => {
	// Remove opening backticks with optional language identifier
	// Matches: ```json, ```javascript, ```, etc.
	let cleaned = text.replace(/^```\w*\s*/g, '');

	// Remove closing backticks
	cleaned = cleaned.replace(/\s*```$/g, '');

	// Trim any remaining whitespace
	return cleaned.trim();
};

/**
 * Encodes a user ID into a unique code using base64 encoding
 * @param userId - The user ID to encode (e.g., "user_2uWz1PD000PHE2v7WO5rsRqgmWt")
 * @returns The encoded string
 */
export const encodeUserId = (userId: string): string => {
	// Convert string to base64 and make it URL-safe
	const base64 = Buffer.from(userId, 'utf-8').toString('base64');
	// Replace characters that might cause issues in URLs
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Decodes a user ID from an encoded code back to original format
 * @param encodedId - The encoded user ID to decode
 * @returns The original user ID string
 */
export const decodeUserId = (encodedId: string): string => {
	try {
		// Restore base64 padding and characters
		let base64 = encodedId.replace(/-/g, '+').replace(/_/g, '/');

		// Add padding if needed
		while (base64.length % 4) {
			base64 += '=';
		}

		// Decode from base64
		return Buffer.from(base64, 'base64').toString('utf-8');
	} catch {
		throw new Error('Invalid encoded user ID');
	}
};

/**
 * Stringifies a JSON object to a string, including only the specified fields
 * @param json - The JSON object to stringify
 * @param fieldsToInclude - The fields to include in the string
 * @returns The stringified JSON object
 */
export const stringifyJsonSubset = <T,>(
	json: T,
	fieldsToInclude: (keyof T)[]
): string => {
	const stringifiedFields: string[] = [];

	for (const field of fieldsToInclude) {
		const value = json[field];
		if (value !== undefined) {
			stringifiedFields.push(`${String(field)}: ${value}`);
		}
	}

	return stringifiedFields.join('\n');
};

/**
 * Generates an email template and corresponding set of prompts from an array of hybrid block prompts
 * @param blocks - The array of hybrid block prompts
 * @returns The email template
 */
export const generateEmailTemplateFromBlocks = (blocks: HybridBlockPrompt[]): string => {
	const template: string[] = [];
	let textBlockCount = 0;
	for (const block of blocks) {
		if (block.type === HybridBlock.text) {
			template.push(`{{${block.type + textBlockCount}}}`);
			textBlockCount++;
		} else {
			template.push(`{{${block.type}}}`);
		}
	}
	return template.join('\n\n');
};

/**
 * Generates a set of prompts from an array of hybrid block prompts
 * @param blocks - The array of hybrid block prompts
 * @returns The set of prompts
 */
export const generatePromptsFromBlocks = (blocks: HybridBlockPrompt[]): string => {
	const defaultPrompts: Record<string, string> = {
		introduction:
			'Write a professional and personalized introduction that establishes rapport with the recipient.',
		research:
			'Include relevant research about the recipient or their company that shows genuine interest and understanding.',
		action:
			'Create a clear and compelling call to action that encourages the recipient to take the next step.',
	};

	const prompts: string[] = [];
	for (const block of blocks) {
		const prompt =
			block.value?.trim() ||
			defaultPrompts[block.type] ||
			`Generate content for ${block.type}`;
		const labelText = block.type === 'text' ? 'Exact text' : 'Prompt for';
		prompts.push(`${labelText} {{${block.type}}}: ${prompt}`);
	}
	return prompts.join('\n\n');
};

/**
 * Converts full state names to their two-letter abbreviations
 * @param stateName - The full state name (e.g., "California", "New York")
 * @returns The two-letter state abbreviation (e.g., "CA", "NY") or the original input if not found
 */
export const getStateAbbreviation = (stateName: string | null | undefined): string => {
	if (!stateName) return '';

	const stateAbbreviations: Record<string, string> = {
		alabama: 'AL',
		alaska: 'AK',
		arizona: 'AZ',
		arkansas: 'AR',
		california: 'CA',
		colorado: 'CO',
		connecticut: 'CT',
		delaware: 'DE',
		florida: 'FL',
		georgia: 'GA',
		hawaii: 'HI',
		idaho: 'ID',
		illinois: 'IL',
		indiana: 'IN',
		iowa: 'IA',
		kansas: 'KS',
		kentucky: 'KY',
		louisiana: 'LA',
		maine: 'ME',
		maryland: 'MD',
		massachusetts: 'MA',
		michigan: 'MI',
		minnesota: 'MN',
		mississippi: 'MS',
		missouri: 'MO',
		montana: 'MT',
		nebraska: 'NE',
		nevada: 'NV',
		'new hampshire': 'NH',
		'new jersey': 'NJ',
		'new mexico': 'NM',
		'new york': 'NY',
		'north carolina': 'NC',
		'north dakota': 'ND',
		ohio: 'OH',
		oklahoma: 'OK',
		oregon: 'OR',
		pennsylvania: 'PA',
		'rhode island': 'RI',
		'south carolina': 'SC',
		'south dakota': 'SD',
		tennessee: 'TN',
		texas: 'TX',
		utah: 'UT',
		vermont: 'VT',
		virginia: 'VA',
		washington: 'WA',
		'west virginia': 'WV',
		wisconsin: 'WI',
		wyoming: 'WY',
		// U.S. Territories
		'american samoa': 'AS',
		'district of columbia': 'DC',
		'washington dc': 'DC',
		'washington d.c.': 'DC',
		guam: 'GU',
		'northern mariana islands': 'MP',
		'puerto rico': 'PR',
		'u.s. virgin islands': 'VI',
		'virgin islands': 'VI',
	};

	// Clean and normalize the input
	const normalizedState = stateName.trim().toLowerCase();

	// Check if it's already an abbreviation (2 uppercase letters)
	if (/^[A-Z]{2}$/.test(stateName.trim())) {
		return stateName.trim();
	}

	// Look up the abbreviation
	const abbreviation = stateAbbreviations[normalizedState];

	// Return the abbreviation if found, otherwise return the original input
	return abbreviation || stateName;
};
