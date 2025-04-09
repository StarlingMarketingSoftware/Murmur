import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FC } from 'react';
import {
	PreviewTestDraftDialogProps,
	usePreviewTestDraftDialog,
} from './usePreviewTestDraftDialog';
import FeatureLockedButton from '@/app/murmur/_components/FeatureLockedButton';

const PreviewTestDraftDialog: FC<PreviewTestDraftDialogProps> = (props) => {
	const { draftEmail, canViewEmailAddress } = usePreviewTestDraftDialog(props);
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">View Test Draft</Button>
			</DialogTrigger>
			<DialogContent
				onOpenAutoFocus={(e) => {
					e.preventDefault();
				}}
				className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]"
			>
				<DialogHeader>
					<DialogTitle>Email Preview</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<Label htmlFor="name" className="text-right">
						Recipient
					</Label>
					{!canViewEmailAddress && <FeatureLockedButton />}
					<Input
						id="email"
						defaultValue={canViewEmailAddress ? draftEmail.contactEmail : '************'}
						disabled
						className="col-span-3 !cursor-text !pointer-events-auto"
					/>
					<Label htmlFor="name" className="text-right">
						Subject
					</Label>
					<Input
						id="name"
						defaultValue={draftEmail.subject}
						disabled
						className="col-span-3 !cursor-text !pointer-events-auto"
					/>
					<Label htmlFor="username" className="text-right">
						Message
					</Label>
					<Textarea
						id="username"
						defaultValue={draftEmail.message}
						className="col-span-3 !cursor-text"
						disabled
					/>
				</div>
				{/* <DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter> */}
			</DialogContent>
		</Dialog>
	);
};

export default PreviewTestDraftDialog;
