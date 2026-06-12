import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed unsubscribe tokens for cold-outreach emails.
 *
 * Token format: `v1.<base64url(JSON {e, u})>.<base64url(HMAC-SHA256(payload))>`
 * Tokens never expire — unsubscribe links in already-delivered emails must keep
 * working indefinitely.
 */

export type UnsubscribePayload = {
	/** Recipient email address, lowercased. */
	email: string;
	/** Artist's clerkId whose sends are suppressed. */
	userId: string;
};

const TOKEN_VERSION = 'v1';

const getSecret = (): string => {
	const secret = process.env.UNSUBSCRIBE_SECRET;
	if (!secret) {
		// Fail loudly: sending emails with dead unsubscribe links is worse than failing.
		throw new Error('UNSUBSCRIBE_SECRET environment variable is not set');
	}
	return secret;
};

const sign = (encodedPayload: string): Buffer =>
	createHmac('sha256', getSecret()).update(encodedPayload).digest();

export const buildUnsubscribeToken = (payload: UnsubscribePayload): string => {
	const encodedPayload = Buffer.from(
		JSON.stringify({ e: payload.email.toLowerCase(), u: payload.userId })
	).toString('base64url');
	const signature = sign(encodedPayload).toString('base64url');
	return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
};

export const verifyUnsubscribeToken = (token: string): UnsubscribePayload | null => {
	try {
		const [version, encodedPayload, signature] = token.split('.');
		if (version !== TOKEN_VERSION || !encodedPayload || !signature) return null;

		const expected = sign(encodedPayload);
		const provided = Buffer.from(signature, 'base64url');
		if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
			return null;
		}

		const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
		if (typeof parsed?.e !== 'string' || typeof parsed?.u !== 'string') return null;
		return { email: parsed.e, userId: parsed.u };
	} catch {
		return null;
	}
};
