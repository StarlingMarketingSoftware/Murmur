import { MediaKind } from '@prisma/client';

/**
 * Per-context rules: which media kinds are allowed and how many a user may keep.
 * Adding a future consumer = add a context here (the rest of the store is generic).
 */
export const CONTEXT_CONFIG = {
	profile_media: { limit: 3, kinds: ['video', 'audio'] as MediaKind[] },
	avatar: { limit: 1, kinds: ['image'] as MediaKind[] },
	venue_photos: { limit: 5, kinds: ['image'] as MediaKind[] },
} as const;
