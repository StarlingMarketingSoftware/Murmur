import type { MediaKind } from '@prisma/client';
import { cn } from '@/utils';

interface R2MediaPlayerProps {
	src: string;
	kind: MediaKind;
	poster?: string | null;
	className?: string;
}

/**
 * Plays an R2-hosted asset from a presigned URL. The existing `VideoPlayer` is a
 * Mux player (needs a Mux playbackId), so it can't be reused for R2 URLs — this
 * renders a native element chosen by media kind. Native <video>/<audio> support
 * HTTP Range, so seeking works against the presigned GET URL.
 */
export function R2MediaPlayer({ src, kind, poster, className }: R2MediaPlayerProps) {
	if (kind === 'audio') {
		return <audio controls preload="metadata" src={src} className={cn('w-full', className)} />;
	}

	if (kind === 'image') {
		return (
			// eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not an optimizable static asset
			<img src={src} alt="" className={cn('mx-auto max-h-[70vh] w-auto', className)} />
		);
	}

	return (
		<video
			controls
			playsInline
			preload="metadata"
			poster={poster ?? undefined}
			src={src}
			className={cn('max-h-[70vh] w-full bg-black', className)}
		/>
	);
}

export default R2MediaPlayer;
