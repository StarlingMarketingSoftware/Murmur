/**
 * Sanitizes a name part for use in email addresses
 * Removes whitespace, special characters, dots, hyphens, and non-ASCII characters
 * Keeps only letters and numbers
 */
function sanitizeNameForEmail(name: string | null): string {
	if (!name) return '';

	return (
		name
			.toLowerCase()
			.trim()
			// Remove all characters except letters and numbers
			.replace(/[^a-z0-9]/g, '')
			// Limit length to prevent overly long email addresses
			.substring(0, 20)
	);
}

/**
 * Generates a murmur email address based on user data
 * Format: ${sanitizedFirstName}${sanitizedLastName}@${userId}.murmurmailbox.com
 * Ensures the result is always a valid email address by sanitizing input
 */
export const generateMurmurEmail = (
	firstName: string | null,
	lastName: string | null
): string => {
	const firstNamePart = sanitizeNameForEmail(firstName);
	const lastNamePart = sanitizeNameForEmail(lastName);

	// Combine the parts and ensure we have at least some characters
	const localPart = firstNamePart || 'user';
	const domainLabel = lastNamePart || 'user';

	// If after sanitization we have no valid characters, use a default
	return `${localPart}@${domainLabel}.booking-management.com`;
};
