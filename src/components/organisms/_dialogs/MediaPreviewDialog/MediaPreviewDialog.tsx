'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { R2MediaPlayer } from '@/components/molecules/R2MediaPlayer/R2MediaPlayer';
import type { MediaAssetDto } from '@/app/api/media/route';

interface MediaPreviewDialogProps {
	asset: MediaAssetDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/** Plays an owner's media asset (video/audio) in a modal. */
export function MediaPreviewDialog({
	asset,
	open,
	onOpenChange,
}: MediaPreviewDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[720px]">
				<DialogTitle className="sr-only">
					{asset?.filename ?? 'Media preview'}
				</DialogTitle>
				{asset?.url ? (
					<R2MediaPlayer src={asset.url} kind={asset.kind} poster={asset.posterUrl} />
				) : (
					<p className="text-center text-sm text-muted-foreground">
						This media isn’t available to play.
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}

export default MediaPreviewDialog;
