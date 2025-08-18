import { cn } from '@/utils';
import { useRef, useEffect } from 'react';

interface VideoPlayerNativeProps {
	className?: string;
	playbackId: string;
	poster?: string;
}

export function VideoPlayerNative({
	className,
	playbackId,
	poster,
}: VideoPlayerNativeProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current) {
			// Force reload to ensure proper sync
			videoRef.current.load();
		}
	}, [playbackId]);

	// Construct Mux video URL
	const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
	const posterUrl = poster || `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1.5`;

	return (
		<div
			className={cn(
				'w-full h-full aspect-video overflow-hidden bg-black',
				className
			)}
		>
			<video
				ref={videoRef}
				className="w-full h-full"
				controls
				preload="auto"
				poster={posterUrl}
				playsInline
			>
				<source src={videoUrl} type="application/x-mpegURL" />
				{/* Fallback for browsers that don't support HLS */}
				<source src={`https://stream.mux.com/${playbackId}/high.mp4`} type="video/mp4" />
				Your browser does not support the video tag.
			</video>
		</div>
	);
}

export default VideoPlayerNative;
