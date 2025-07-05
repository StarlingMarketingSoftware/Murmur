import { HybridBlockPrompt } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';

export const ellipsesText = (text: string, maxLength: number): string => {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...';
	}
	return text;
};

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
	for (const block of blocks) {
		if (block.type === 'text') {
			template.push(`${block.value}`);
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
	const prompts: string[] = [];
	for (const block of blocks) {
		prompts.push(`Prompt for {{${block.type}}}: ${block.value}`);
	}
	return prompts.join('\n\n');
};
