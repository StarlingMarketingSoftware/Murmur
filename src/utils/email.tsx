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

export type StripEmailSignatureFromAiMessageOptions = {
	/**
	 * Optional sender name (e.g. identity.name). Used to more confidently detect name-only signature lines.
	 */
	senderName?: string | null;
	/**
	 * Optional sender band/project name (e.g. identity.bandName). Used to more confidently detect band-name signatures.
	 */
	senderBandName?: string | null;
};

const normalizeSignatureToken = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/g, '');

/**
 * Best-effort post-processing to remove signature/sign-off blocks that occasionally slip into LLM output.
 *
 * IMPORTANT:
 * - This is intended for AI-generated message bodies only (the app appends the real signature separately).
 * - It is conservative: it only removes a block at the end of the message when it matches common signature patterns.
 */
export const stripEmailSignatureFromAiMessage = (
	message: string,
	options?: StripEmailSignatureFromAiMessageOptions
): string => {
	if (!message) return message;

	// Normalize line breaks and some common HTML break artifacts (models sometimes output these).
	const text = message
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.trimEnd();

	if (!text) return text;

	// Fast-path: if the tail doesn't contain any signature-ish cues, skip processing.
	const tail = text.slice(-600).toLowerCase();
	const tailHasSignatureCue =
		/\b(best|regards|sincerely|cheers|warmly|thanks|thank you)\b/.test(tail) ||
		/\bsent from\b/.test(tail) ||
		/[-_]{2,}/.test(tail);
	if (!tailHasSignatureCue) {
		return text;
	}

	const senderName = options?.senderName?.trim() ?? '';
	const senderBandName = options?.senderBandName?.trim() ?? '';
	const senderNameNorm = senderName ? normalizeSignatureToken(senderName) : '';
	const senderBandNorm = senderBandName ? normalizeSignatureToken(senderBandName) : '';
	const senderFirstNorm = senderName
		? normalizeSignatureToken(senderName.split(/\s+/).filter(Boolean)[0] || '')
		: '';

	const lines = text.split('\n');

	// Trim trailing empty lines
	while (lines.length && lines[lines.length - 1].trim() === '') {
		lines.pop();
	}
	if (!lines.length) return '';

	const maxScanBack = 20;
	const scanStartIndex = Math.max(0, lines.length - maxScanBack);

	const isSeparatorLine = (line: string) =>
		/^\s*(--|—|–|-{2,}|_{2,}|\*{3,})\s*$/.test(line);
	const isSentFromLine = (line: string) =>
		/^\s*sent from (my )?(iphone|ipad|android|mobile|mail)\b/i.test(line);

	const isSignoffLine = (line: string) => {
		const l = line.trim().toLowerCase();
		return /^(best( regards)?|kind regards|regards|sincerely|cheers|warmly|thanks( so much)?|thank you( so much)?|all the best|take care|talk soon|with gratitude|yours truly|yours sincerely|respectfully)[,!.]?$/.test(
			l
		);
	};

	const isEmailLine = (line: string) =>
		/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line);
	const isPhoneLine = (line: string) =>
		/\b(\+?\d{1,2}\s*)?(\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}\b/.test(line);
	const isUrlLine = (line: string) =>
		/\bhttps?:\/\//i.test(line) ||
		/\bwww\./i.test(line) ||
		/\b[a-z0-9-]+\.(com|net|org|io|co|me|music|band|fm|tv|us|uk|ca)\b/i.test(line);
	const isHandleLine = (line: string) => /^\s*@[\w.\-]{2,}\s*$/.test(line);

	const isLikelyNameOnlyLine = (line: string) => {
		const t = line.trim();
		if (!t) return false;
		if (t.length > 50) return false;
		if (/\d/.test(t)) return false;
		if (/[<>]/.test(t)) return false;
		if (/[.!?]$/.test(t)) return false;

		const n = normalizeSignatureToken(t);
		if (senderNameNorm && n === senderNameNorm) return true;
		if (senderBandNorm && n === senderBandNorm) return true;
		if (senderFirstNorm && n === senderFirstNorm) return true;

		const words = t.split(/\s+/).filter(Boolean);
		if (words.length < 1 || words.length > 4) return false;
		return words.every((w) => /^[A-Za-z][A-Za-z'.-]*$/.test(w));
	};

	const looksLikeInlineSignoffWithName = (line: string) => {
		const t = line.trim();
		const match = t.match(
			/^(best( regards)?|kind regards|regards|sincerely|cheers|warmly|thanks( so much)?|thank you( so much)?|all the best|take care|talk soon|with gratitude)[,!.]?\s+(.+)$/i
		);
		if (!match) return false;
		const rest = (match[5] || '').trim();
		if (!rest) return false;

		const restLower = rest.toLowerCase();
		// Avoid false-positives like "Thanks for your time."
		if (
			restLower.startsWith('for ') ||
			restLower.startsWith('in ') ||
			restLower.startsWith('again') ||
			restLower.startsWith('so ') ||
			restLower.startsWith('very ') ||
			restLower.startsWith('your ')
		) {
			return false;
		}

		return (
			isLikelyNameOnlyLine(rest) ||
			isEmailLine(rest) ||
			isPhoneLine(rest) ||
			isUrlLine(rest) ||
			isHandleLine(rest)
		);
	};

	let signatureStartIndex: number | null = null;

	// 1) Hard indicators: "Sent from ..." or signature separators
	for (let i = lines.length - 1; i >= scanStartIndex; i--) {
		const line = lines[i];
		if (isSentFromLine(line) || isSeparatorLine(line)) {
			signatureStartIndex = i;
			break;
		}
	}

	// 2) Sign-off lines ("Best,", "Thanks,") close to the end
	if (signatureStartIndex == null) {
		for (let i = lines.length - 1; i >= scanStartIndex; i--) {
			const line = lines[i];
			if (!isSignoffLine(line)) continue;
			const prev = i > 0 ? lines[i - 1].trim() : '';
			const next = i < lines.length - 1 ? lines[i + 1].trim() : '';
			// If it's separated as its own paragraph OR followed by any non-empty line, treat as signature.
			if (prev === '' || next !== '') {
				signatureStartIndex = i;
				break;
			}
		}
	}

	// 3) Inline sign-offs ("Thanks, John") close to the end
	if (signatureStartIndex == null) {
		for (let i = lines.length - 1; i >= scanStartIndex; i--) {
			const line = lines[i];
			if (!looksLikeInlineSignoffWithName(line)) continue;
			const prev = i > 0 ? lines[i - 1].trim() : '';
			if (prev === '') {
				signatureStartIndex = i;
				break;
			}
		}
	}

	// 4) Name-only signature line at the end (common when the model "signs" with just a name)
	if (signatureStartIndex == null) {
		for (let i = lines.length - 1; i >= scanStartIndex; i--) {
			const line = lines[i];
			if (!isLikelyNameOnlyLine(line)) continue;
			const prev = i > 0 ? lines[i - 1].trim() : '';
			if (prev === '') {
				signatureStartIndex = i;
				break;
			}
		}
	}

	// 5) Contact info at the end (phone/email/url/handle), treat as signature block start
	if (signatureStartIndex == null) {
		for (let i = lines.length - 1; i >= scanStartIndex; i--) {
			const line = lines[i];
			const hasContactInfo =
				isEmailLine(line) || isPhoneLine(line) || isUrlLine(line) || isHandleLine(line);
			if (!hasContactInfo) continue;
			// Remove the whole trailing block that contains contact info
			signatureStartIndex = i;
			// Expand upward to include any immediately preceding name/signoff line if present
			if (i > 0 && isLikelyNameOnlyLine(lines[i - 1])) signatureStartIndex = i - 1;
			if (i > 0 && isSignoffLine(lines[i - 1])) signatureStartIndex = i - 1;
			break;
		}
	}

	if (signatureStartIndex == null) {
		return lines.join('\n').trimEnd();
	}

	// Expand upward to remove separating blank lines too.
	let start = signatureStartIndex;
	while (start > 0 && lines[start - 1].trim() === '') {
		start--;
	}

	const bodyLines = lines.slice(0, start);
	while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') {
		bodyLines.pop();
	}
	const body = bodyLines.join('\n').trimEnd();

	// Safety: don't delete the entire email.
	return body ? body : text;
};