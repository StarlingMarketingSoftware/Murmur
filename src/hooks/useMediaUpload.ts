import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { MediaKind } from '@prisma/client';
import { captureVideoPoster, getMediaDuration, putToR2WithProgress } from '@/utils';
import {
	useRequestMediaUploadUrl,
	useUpdateMedia,
	useDeleteMedia,
} from '@/hooks/queryHooks/useMediaAssets';

export type UploadPhase =
	| 'preparing'
	| 'uploading'
	| 'finalizing'
	| 'done'
	| 'error';

export interface UploadState {
	phase: UploadPhase;
	progress: number; // 0..100
	kind: MediaKind;
	filename: string;
	error?: string;
}

const MAX_BYTES = 500 * 1024 * 1024; // 500MB

const kindFromContentType = (type: string): MediaKind | null => {
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('audio/')) return 'audio';
	if (type.startsWith('image/')) return 'image';
	return null;
};

/**
 * Orchestrates a single media upload end to end:
 *   capture poster (video) → request presigned URL(s) → PUT bytes (with progress)
 *   → PUT poster → PATCH status:ready (which invalidates the media list).
 *
 * Exposes per-upload state keyed by a temporary id so the UI can show a live
 * placeholder slot until the refetched list returns the real row.
 */
export function useMediaUpload(context: 'profile_media' | 'avatar' | 'venue_photos') {
	const [uploads, setUploads] = useState<Record<string, UploadState>>({});
	const requestUploadUrl = useRequestMediaUploadUrl();
	const updateMedia = useUpdateMedia();
	const deleteMedia = useDeleteMedia({ suppressToasts: true });

	const patch = useCallback((tempId: string, next: Partial<UploadState>) => {
		setUploads((prev) => ({ ...prev, [tempId]: { ...prev[tempId], ...next } }));
	}, []);

	const clear = useCallback((tempId: string) => {
		setUploads((prev) => {
			const next = { ...prev };
			delete next[tempId];
			return next;
		});
	}, []);

	const upload = useCallback(
		async (file: File): Promise<boolean> => {
			const kind = kindFromContentType(file.type);
			if (!kind) {
				toast.error('Unsupported file type.');
				return false;
			}
			if (file.size > MAX_BYTES) {
				toast.error('File is too large (max 500MB).');
				return false;
			}

			const tempId = `${file.name}-${Date.now()}`;
			patch(tempId, { phase: 'preparing', progress: 0, kind, filename: file.name });

			// requestUploadUrl creates a placeholder DB row up front; track its id so a
			// later failure can roll it back instead of leaving an orphaned "uploading"
			// row that lingers as "Processing…" and counts against the per-context limit.
			let createdId: number | null = null;
			try {
				const [poster, duration] = await Promise.all([
					kind === 'video' ? captureVideoPoster(file) : Promise.resolve(null),
					getMediaDuration(file),
				]);

				const { id, uploadUrl, posterUploadUrl } = await requestUploadUrl.mutateAsync({
					filename: file.name,
					contentType: file.type,
					kind,
					context,
					posterContentType: poster ? 'image/jpeg' : undefined,
				});
				createdId = id;

				patch(tempId, { phase: 'uploading', progress: 0 });
				await putToR2WithProgress(uploadUrl, file, {
					contentType: file.type,
					onProgress: (progress) => patch(tempId, { progress }),
				});

				if (poster && posterUploadUrl) {
					await putToR2WithProgress(posterUploadUrl, poster, {
						contentType: 'image/jpeg',
					});
				}

				patch(tempId, { phase: 'finalizing', progress: 100 });
				await updateMedia.mutateAsync({
					id,
					data: {
						status: 'ready',
						sizeBytes: file.size,
						...(duration ? { durationSec: duration } : {}),
					},
				});

				patch(tempId, { phase: 'done' });
				clear(tempId);
				return true;
			} catch (error) {
				// Surface the real cause for debugging; the user just sees a toast.
				console.error('[useMediaUpload] upload failed', error);
				toast.error('Upload failed. Please try again.');
				// Roll back the placeholder row (frees the per-context limit) and drop
				// the slot so no dead progress-bar ghost is left behind.
				if (createdId != null) {
					await deleteMedia.mutateAsync(createdId).catch(() => {});
				}
				clear(tempId);
				return false;
			}
		},
		[context, requestUploadUrl, updateMedia, deleteMedia, patch, clear]
	);

	return { upload, uploads, activeUploads: Object.values(uploads) };
}
