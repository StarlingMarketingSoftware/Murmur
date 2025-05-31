export const ellipsesText = (text: string, maxLength: number): string => {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...';
	}
	return text;
};

export const stripUntilBrace = (text: string): string => {
	const braceIndex = text.indexOf('{');
	return braceIndex >= 0 ? text.substring(braceIndex) : text;
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
