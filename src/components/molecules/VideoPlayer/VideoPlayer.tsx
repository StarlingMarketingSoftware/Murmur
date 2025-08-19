import MuxPlayer from '@mux/mux-player-react';
import { cn } from '@/utils';
import { useRef, useEffect } from 'react';

interface VideoPlayerProps {
	className?: string;
	thumbnailTime?: number;
	metadata?: {
		video_title?: string;
		viewer_user_id?: string;
		[key: string]: string | undefined;
	};
	playbackId: string;
}

export function VideoPlayer({
	className,
	thumbnailTime = 1.5,
	metadata = {
		video_title: 'Murmur Video',
		viewer_user_id: 'Placeholder (optional)',
	},
	playbackId,
}: VideoPlayerProps) {
	const playerRef = useRef<any>(null);

	useEffect(() => {
		// Force reload on mount to ensure proper initialization
		if (playerRef.current) {
			const player = playerRef.current;
			// Add event listener for loadedmetadata to ensure proper sync
			const handleLoadedMetadata = () => {
				// Reset playback to ensure sync
				if (player.currentTime > 0) {
					player.currentTime = 0;
				}
			};

			player.addEventListener('loadedmetadata', handleLoadedMetadata);

			return () => {
				player.removeEventListener('loadedmetadata', handleLoadedMetadata);
			};
		}
	}, [playbackId]);

	return (
		<div className={cn('w-fit h-fit aspect-video max-h-fit overflow-hidden', className)}>
			<MuxPlayer
				ref={playerRef}
				accentColor="var(--color-primary)"
				playbackId={playbackId}
				thumbnailTime={thumbnailTime}
				metadata={metadata}
				streamType="on-demand"
				preload="auto"
				crossOrigin="anonymous"
				playsInline
				// Disable autoplay to prevent sync issues
				autoPlay={false}
				// Force specific playback rates to prevent drift
				playbackRates={[1]}
				// Disable features that might cause sync issues
				nohotkeys
				// Use native controls for better sync handling
			/>
		</div>
	);
}

export default VideoPlayer;
