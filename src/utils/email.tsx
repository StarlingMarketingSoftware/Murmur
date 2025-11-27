function sanitizeNameForEmail(name: string | null): string {
	if (!name) return '';
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/g, '')
		.substring(0, 20);
}

export const generateMurmurEmail = (
	firstName: string | null,
	lastName: string | null
): string => {
	const localPart = sanitizeNameForEmail(firstName) || 'user';
	const domainLabel = sanitizeNameForEmail(lastName) || 'user';
	return `${localPart}@${domainLabel}.booking-management.com`;
};
