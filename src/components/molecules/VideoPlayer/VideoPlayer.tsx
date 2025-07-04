import MuxPlayer from '@mux/mux-player-react';
import { cn } from '@/utils';

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
	return (
		<div
			className={cn(
				'rounded-lg w-fit h-fit aspect-video max-h-fit overflow-hidden',
				className
			)}
		>
			<MuxPlayer
				style={{ borderRadius: '100%' }}
				className="!rounded-full"
				accentColor="var(--color-primary)"
				playbackId={playbackId}
				thumbnailTime={thumbnailTime}
				metadata={metadata}
			/>
		</div>
	);
}

export default VideoPlayer;
