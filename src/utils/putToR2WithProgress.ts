export type UploadProgressHandler = (percent: number) => void;

/**
 * PUT a Blob/File directly to a presigned R2 URL, reporting upload progress.
 *
 * Uses XMLHttpRequest because `fetch()` exposes no upload-progress events. This
 * intentionally bypasses the `_fetch` helper, which forces a JSON Content-Type
 * and a JSON-stringified body — neither of which is correct for a raw byte PUT.
 */
export function putToR2WithProgress(
	url: string,
	body: Blob,
	options?: {
		contentType?: string;
		onProgress?: UploadProgressHandler;
		signal?: AbortSignal;
	}
): Promise<void> {
	const { contentType, onProgress, signal } = options ?? {};

	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url, true);
		if (contentType) {
			// R2 stores this as the object's Content-Type. It is not part of the
			// presigned signature, so a value here never causes SignatureDoesNotMatch.
			xhr.setRequestHeader('Content-Type', contentType);
		}

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable && onProgress) {
				onProgress(Math.round((event.loaded / event.total) * 100));
			}
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
			} else {
				reject(new Error(`Upload failed (status ${xhr.status})`));
			}
		};
		xhr.onerror = () => reject(new Error('Upload failed (network error)'));
		xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

		if (signal) {
			if (signal.aborted) {
				xhr.abort();
				return;
			}
			signal.addEventListener('abort', () => xhr.abort(), { once: true });
		}

		xhr.send(body);
	});
}
