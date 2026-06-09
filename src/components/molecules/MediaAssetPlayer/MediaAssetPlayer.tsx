'use client';

import dynamic from 'next/dynamic';
import { R2MediaPlayer } from '@/components/molecules/R2MediaPlayer/R2MediaPlayer';
import type { MediaAssetDto } from '@/app/api/media/route';

// react-player touches `window`, so load it client-only. The `youtube` subpath is the
// lightest build that still plays YouTube watch URLs.
const ReactPlayer = dynamic(() => import('react-player/youtube').then((m) => m.default), {
	ssr: false,
});

interface MediaAssetPlayerProps {
	asset: MediaAssetDto;
	className?: string;
}

/** Plays a MediaAsset, branching on its source: a YouTube embed vs an R2-hosted file. */
export function MediaAssetPlayer({ asset, className }: MediaAssetPlayerProps) {
	if (!asset.url) {
		return (
			<p className="text-center text-sm text-muted-foreground">
				This media isn’t available to play.
			</p>
		);
	}

	if (asset.sourceType === 'youtube') {
		return (
			<div className={className} style={{ aspectRatio: '16 / 9', width: '100%' }}>
				<ReactPlayer url={asset.url} controls width="100%" height="100%" />
			</div>
		);
	}

	return (
		<R2MediaPlayer
			src={asset.url}
			kind={asset.kind}
			poster={asset.posterUrl}
			className={className}
		/>
	);
}

export default MediaAssetPlayer;
