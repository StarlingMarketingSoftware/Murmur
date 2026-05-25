import { AwsClient } from 'aws4fetch';

/**
 * Cloudflare R2 storage primitive (S3-compatible).
 *
 * This is the ONLY module that talks to R2. It mints presigned PUT/GET URLs so
 * the browser uploads/downloads bytes directly to R2 (credentials never leave the
 * server), and performs server-side HEAD/DELETE. It is purpose-agnostic — it knows
 * nothing about profiles, media kinds, or why an object exists.
 *
 * Auth uses the R2 *S3 API* credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).
 * CLOUDFLARE_API_TOKEN is a separate management-plane credential and is NOT used here.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET ?? 'murmur';
const ENDPOINT =
	process.env.R2_ENDPOINT ??
	(ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

let client: AwsClient | null = null;

function getClient(): AwsClient {
	if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !ENDPOINT) {
		throw new Error(
			'R2 is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.'
		);
	}
	if (!client) {
		// aws4fetch also infers service/region from the *.r2.cloudflarestorage.com
		// host, but we set them explicitly for clarity.
		client = new AwsClient({
			accessKeyId: ACCESS_KEY_ID,
			secretAccessKey: SECRET_ACCESS_KEY,
			service: 's3',
			region: 'auto',
		});
	}
	return client;
}

const objectUrl = (key: string): string => `${ENDPOINT}/${BUCKET}/${key}`;

/**
 * Build the per-user object key. The filename is sanitized to a URL-safe subset so
 * the path needs no further encoding when signing.
 *   media/{context}/{userId}/{timestamp}-{safeFilename}
 */
export function buildMediaKey(userId: string, context: string, filename: string): string {
	const safe =
		filename
			.normalize('NFKD')
			.replace(/[^a-zA-Z0-9._-]/g, '_')
			.slice(0, 120) || 'file';
	return `media/${context}/${userId}/${Date.now()}-${safe}`;
}

/**
 * Presigned PUT for a direct browser upload. Content-Type is intentionally NOT
 * signed (aws4fetch treats it as an unsignable header), so the browser sends it
 * freely on the PUT and R2 stores it on the object — no SignatureDoesNotMatch on a
 * Content-Type mismatch.
 */
export async function getPresignedPutUrl(key: string, expiresInSec = 600): Promise<string> {
	const url = new URL(objectUrl(key));
	url.searchParams.set('X-Amz-Expires', String(expiresInSec));
	const signed = await getClient().sign(new Request(url.toString(), { method: 'PUT' }), {
		aws: { signQuery: true },
	});
	return signed.url;
}

/**
 * Presigned GET for owner playback / thumbnails. `Range` is unsignable, so
 * <video>/<audio> seeking works against the returned URL. Passing `contentType`
 * sets response-content-type (a signed query param) so the browser always renders
 * with the right type regardless of the stored object metadata.
 */
export async function getPresignedGetUrl(
	key: string,
	contentType?: string,
	expiresInSec = 3600
): Promise<string> {
	const url = new URL(objectUrl(key));
	url.searchParams.set('X-Amz-Expires', String(expiresInSec));
	if (contentType) {
		url.searchParams.set('response-content-type', contentType);
	}
	const signed = await getClient().sign(new Request(url.toString(), { method: 'GET' }), {
		aws: { signQuery: true },
	});
	return signed.url;
}

/** Server-side HEAD — used to confirm an upload actually landed before marking it ready. */
export async function objectExists(key: string): Promise<boolean> {
	const res = await getClient().fetch(objectUrl(key), { method: 'HEAD' });
	return res.ok;
}

/** Idempotent server-side DELETE (tolerates an already-deleted object). */
export async function deleteObject(key: string): Promise<void> {
	const res = await getClient().fetch(objectUrl(key), { method: 'DELETE' });
	if (!res.ok && res.status !== 404) {
		throw new Error(`R2 delete failed for ${key} (status ${res.status})`);
	}
}
