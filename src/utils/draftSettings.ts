import type { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';

/**
 * Murmur embeds a snapshot of the drafting settings used to generate a draft directly
 * inside the stored HTML message. This enables the Drafts tab to reflect the exact
 * settings that produced a given draft even after campaign settings change.
 *
 * Format (HTML comment):
 *   <!--MURMUR_DRAFT_SETTINGS:{base64(json)}-->
 */

/** Profile fields stored with the draft so the settings panel can reflect
 * the profile used at generation time (not the current identity).
 */
export type DraftProfileFields = {
	name: string;
	genre: string;
	area: string;
	band: string;
	bio: string;
	links: string;
};

export type MurmurDraftSettingsSnapshotV1 = {
	version: 1;
	values: DraftingFormValues;
	/** Profile fields used when this draft was generated. */
	profileFields?: DraftProfileFields;
};

const SETTINGS_COMMENT_RE = /<!--\s*MURMUR_DRAFT_SETTINGS:([A-Za-z0-9+/=]+)\s*-->/;

const encodeBase64Utf8 = (input: string): string => {
	// Browser path
	if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
		const bytes = new TextEncoder().encode(input);
		let binary = '';
		for (const b of bytes) binary += String.fromCharCode(b);
		return window.btoa(binary);
	}

	// Node path
	// eslint-disable-next-line no-undef
	return Buffer.from(input, 'utf-8').toString('base64');
};

const decodeBase64Utf8 = (input: string): string => {
	// Browser path
	if (typeof window !== 'undefined' && typeof window.atob === 'function') {
		const binary = window.atob(input);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return new TextDecoder().decode(bytes);
	}

	// Node path
	// eslint-disable-next-line no-undef
	return Buffer.from(input, 'base64').toString('utf-8');
};

export const stripMurmurDraftSettingsSnapshot = (html: string): string => {
	if (!html) return html;
	return html.replace(SETTINGS_COMMENT_RE, '').trimStart();
};

export const injectMurmurDraftSettingsSnapshot = (
	html: string,
	snapshot: MurmurDraftSettingsSnapshotV1
): string => {
	const base = stripMurmurDraftSettingsSnapshot(html || '');
	const encoded = encodeBase64Utf8(JSON.stringify(snapshot));
	return `<!--MURMUR_DRAFT_SETTINGS:${encoded}-->${base}`;
};

export const extractMurmurDraftSettingsSnapshot = (
	html: string
): MurmurDraftSettingsSnapshotV1 | null => {
	if (!html) return null;
	const match = html.match(SETTINGS_COMMENT_RE);
	if (!match?.[1]) return null;

	try {
		const decoded = decodeBase64Utf8(match[1]);
		const parsed = JSON.parse(decoded) as MurmurDraftSettingsSnapshotV1;
		if (!parsed || parsed.version !== 1 || !parsed.values) return null;
		return parsed;
	} catch {
		return null;
	}
};


