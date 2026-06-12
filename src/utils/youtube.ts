// Pure helpers for turning a user-pasted YouTube link into a canonical video id.
// No dependencies so it can be unit-tested with `npx tsx src/utils/youtube.test.ts`.

// YouTube video ids are exactly 11 chars from this alphabet.
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Hosts we accept. Anything else is rejected so an arbitrary URL can't be stored
// and later embedded/iframed.
const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be',
]);

// Path prefixes that carry the id as the next segment: /embed/ID, /shorts/ID, …
const PATH_ID_PREFIXES = new Set(['embed', 'shorts', 'live', 'v']);

/**
 * Extracts the 11-char video id from a YouTube URL (watch, youtu.be, embed,
 * shorts, live, or a bare id). Returns null for non-YouTube hosts, channel /
 * playlist URLs, and anything malformed.
 */
export function extractYouTubeId(input: string): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	// A bare id pasted on its own.
	if (VIDEO_ID_RE.test(trimmed)) return trimmed;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		// Tolerate a protocol-less paste like "youtu.be/abc".
		try {
			url = new URL(`https://${trimmed}`);
		} catch {
			return null;
		}
	}

	const host = url.hostname.toLowerCase();
	if (!YOUTUBE_HOSTS.has(host)) return null;

	// youtu.be/ID
	if (host === 'youtu.be') {
		const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
		return VIDEO_ID_RE.test(id) ? id : null;
	}

	// youtube.com/watch?v=ID (ignoring extra params like &list=, &t=)
	const v = url.searchParams.get('v');
	if (v && VIDEO_ID_RE.test(v)) return v;

	// youtube.com/{embed,shorts,live,v}/ID
	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length >= 2 && PATH_ID_PREFIXES.has(segments[0])) {
		const id = segments[1];
		return VIDEO_ID_RE.test(id) ? id : null;
	}

	return null;
}

/** Canonical watch URL — what `react-player` plays and what we persist as `embedUrl`. */
export const youTubeWatchUrl = (id: string): string =>
	`https://www.youtube.com/watch?v=${id}`;

/** Thumbnail served by YouTube's CDN for any public video. */
export const youTubeThumbnailUrl = (id: string): string =>
	`https://img.youtube.com/vi/${id}/hqdefault.jpg`;
