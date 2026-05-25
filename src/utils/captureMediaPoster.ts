/**
 * Capture a poster/thumbnail frame from a video File via a hidden <video> + <canvas>.
 * Returns a JPEG Blob, or `null` when a frame can't be grabbed — e.g. a codec the
 * browser can't decode (some iPhone HEVC .mov files) — so callers degrade gracefully.
 * Only meaningful for video; audio/image callers skip it.
 */
export function captureVideoPoster(
	file: File,
	options?: { timeoutMs?: number; quality?: number }
): Promise<Blob | null> {
	const { timeoutMs = 5000, quality = 0.8 } = options ?? {};

	return new Promise<Blob | null>((resolve) => {
		if (typeof document === 'undefined' || !file.type.startsWith('video/')) {
			resolve(null);
			return;
		}

		const objectUrl = URL.createObjectURL(file);
		const video = document.createElement('video');
		let settled = false;

		const settle = (blob: Blob | null) => {
			if (settled) return;
			settled = true;
			URL.revokeObjectURL(objectUrl);
			video.removeAttribute('src');
			video.load();
			resolve(blob);
		};
		// Codec failures sometimes never fire load/seek events — bail after a timeout.
		const timer = setTimeout(() => settle(null), timeoutMs);
		const finish = (blob: Blob | null) => {
			clearTimeout(timer);
			settle(blob);
		};

		video.muted = true;
		video.playsInline = true;
		video.preload = 'metadata';

		video.onloadeddata = () => {
			// Seek slightly in to avoid an all-black opening frame.
			const target = Number.isFinite(video.duration)
				? Math.min(1, video.duration * 0.1)
				: 0;
			try {
				video.currentTime = target;
			} catch {
				finish(null);
			}
		};
		video.onseeked = () => {
			try {
				if (!video.videoWidth || !video.videoHeight) {
					finish(null);
					return;
				}
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					finish(null);
					return;
				}
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				canvas.toBlob((blob) => finish(blob), 'image/jpeg', quality);
			} catch {
				finish(null);
			}
		};
		video.onerror = () => finish(null);

		video.src = objectUrl;
	});
}

/**
 * Read the duration (seconds) of a video/audio File via a hidden media element.
 * Returns `null` if it can't be determined.
 */
export function getMediaDuration(file: File): Promise<number | null> {
	return new Promise<number | null>((resolve) => {
		if (typeof document === 'undefined') {
			resolve(null);
			return;
		}
		const isVideo = file.type.startsWith('video/');
		const isAudio = file.type.startsWith('audio/');
		if (!isVideo && !isAudio) {
			resolve(null);
			return;
		}

		const element = document.createElement(isVideo ? 'video' : 'audio');
		const objectUrl = URL.createObjectURL(file);
		let settled = false;

		const settle = (duration: number | null) => {
			if (settled) return;
			settled = true;
			URL.revokeObjectURL(objectUrl);
			resolve(duration);
		};
		const timer = setTimeout(() => settle(null), 5000);
		const finish = (duration: number | null) => {
			clearTimeout(timer);
			settle(duration);
		};

		element.preload = 'metadata';
		element.onloadedmetadata = () =>
			finish(Number.isFinite(element.duration) ? element.duration : null);
		element.onerror = () => finish(null);
		element.src = objectUrl;
	});
}
