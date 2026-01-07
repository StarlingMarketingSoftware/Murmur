export type AutoSignatureTemplateContext = {
	name?: string | null;
	bandName?: string | null;
	website?: string | null;
	email?: string | null;
};

/**
 * Auto Signature rotation library (CODE-DEFINED).
 *
 * When "Auto Signature" is enabled, Murmur will pick one entry at random
 * **per draft** from this list.
 *
 * You can use placeholders:
 * - {name}
 * - {bandName}
 * - {website}
 * - {email}
 *
 * Example:
 *  `Cheers,\\n{name}\\n{website}`
 */
export const AUTO_SIGNATURE_LIBRARY: readonly string[] = [
	`Thank you,\n{name}`,
	`Best,\n{name}`,
	`Thanks,\n{name}`,
	`Sincerely,\n{name}`,
	`Best regards,\n{name}`,
	`Best wishes,\n{name}`,
	`Regards,\n{name}`,
    `Talk soon,\n{name}`,
    `Take care,\n{name}`,
    `All the best,\n{name}`,
];

const normalizeTemplateValue = (value: string): string =>
	value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const renderAutoSignatureTemplate = (
	template: string,
	ctx: AutoSignatureTemplateContext
): string => {
	const name = ctx.name ?? '';
	const bandName = ctx.bandName ?? '';
	const website = ctx.website ?? '';
	const email = ctx.email ?? '';

	return normalizeTemplateValue(template)
		.replace(/\{name\}/g, name)
		.replace(/\{bandName\}/g, bandName)
		.replace(/\{website\}/g, website)
		.replace(/\{email\}/g, email)
		// Avoid excessive blank lines if placeholders are empty.
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};

/**
 * Heuristic: the UI's Auto/Manual signature toggle isn't currently persisted,
 * so we infer "Auto" when the signature is empty or matches the default template.
 *
 * This matches existing behavior where identity-name changes overwrite signatures
 * that look like the default "Thank you,\\n{identityName}".
 */
export const isAutoSignatureValue = (signature?: string | null): boolean => {
	const current = (signature ?? '').trim();
	if (!current) return true;
	if (current === 'Thank you,') return true;
	return current.startsWith('Thank you,\n');
};

export const resolveAutoSignatureText = (params: {
	currentSignature?: string | null;
	fallbackSignature: string;
	context: AutoSignatureTemplateContext;
}): string => {
	const { currentSignature, fallbackSignature, context } = params;

	const configured = (currentSignature ?? '').trim();
	const base = configured || fallbackSignature;

	if (!isAutoSignatureValue(currentSignature)) {
		return base;
	}

	const renderedPool = AUTO_SIGNATURE_LIBRARY.map((t) =>
		renderAutoSignatureTemplate(t, context)
	).filter(Boolean);

	if (renderedPool.length === 0) {
		return base;
	}

	return renderedPool[Math.floor(Math.random() * renderedPool.length)] ?? base;
};


