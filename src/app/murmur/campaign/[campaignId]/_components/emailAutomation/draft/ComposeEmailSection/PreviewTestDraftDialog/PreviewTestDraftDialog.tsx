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
import { restrictedFeatureMessages } from '@/constants/constants';
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';

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
					<div className="grid gap-2">
						<Label htmlFor="email">Recipient</Label>
						<div className="relative">
							<Input
								id="email"
								defaultValue={
									canViewEmailAddress ? draftEmail.contactEmail : '************'
								}
								readOnly
								className="col-span-3 !cursor-text !pointer-events-auto pr-[120px]"
							/>
							{!canViewEmailAddress && (
								<div className="absolute right-1 top-1/2 -translate-y-1/2">
									<FeatureLockedButton message={restrictedFeatureMessages.viewEmails} />
								</div>
							)}
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							defaultValue={draftEmail.subject}
							readOnly
							className="col-span-3 !cursor-text !pointer-events-auto"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="message">Message</Label>
						<RichTextEditor hideMenuBar isEdit={false} value={draftEmail.message} />
					</div>
				</div>
				{/* <DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter> */}
			</DialogContent>
		</Dialog>
	);
};

export default PreviewTestDraftDialog;
