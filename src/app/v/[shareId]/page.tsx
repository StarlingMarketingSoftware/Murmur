import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getPresignedGetUrl } from '@/app/api/_utils/r2';
import { extractYouTubeId } from '@/utils/youtube';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import Link from 'next/link';

// Public video share page used by cold-outreach emails ("Play Video" pill).
// Looked up by the unguessable MediaAsset.shareId; a fresh presigned URL is
// generated per view (the underlying R2 URLs are short-lived).
export const dynamic = 'force-dynamic';

export default async function VideoSharePage({
	params,
}: {
	params: Promise<{ shareId: string }>;
}) {
	const { shareId } = await params;

	const asset = await prisma.mediaAsset.findUnique({ where: { shareId } });
	if (!asset || asset.kind !== 'video' || asset.status !== 'ready') {
		notFound();
	}

	let player: React.ReactNode;
	if (asset.sourceType === 'youtube') {
		const videoId = asset.embedUrl ? extractYouTubeId(asset.embedUrl) : null;
		if (!videoId) notFound();
		player = (
			<iframe
				src={`https://www.youtube.com/embed/${videoId}`}
				title="Video"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				className="h-full w-full"
			/>
		);
	} else {
		const url = await getPresignedGetUrl(asset.key, asset.contentType);
		const posterUrl = asset.posterKey
			? await getPresignedGetUrl(asset.posterKey, 'image/jpeg')
			: undefined;
		player = (
			<video controls playsInline src={url} poster={posterUrl} className="h-full w-full" />
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center bg-[#F2F0ED] px-4 py-10">
			<Link href="/" aria-label="Murmur home">
				<MurmurLogoNew width="140px" height="25px" />
			</Link>
			<div className="mt-10 w-full max-w-3xl overflow-hidden rounded-xl bg-black shadow-lg">
				<div className="aspect-video">{player}</div>
			</div>
			<Link href="/" className="mt-8 text-sm text-stone-500 underline">
				Powered by Murmur
			</Link>
		</div>
	);
}
