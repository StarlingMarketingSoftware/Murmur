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
import { FC } from 'react';
import {
	PreviewTestDraftDialogProps,
	usePreviewTestDraftDialog,
} from './usePreviewTestDraftDialog';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { EyeIcon } from 'lucide-react';

const PreviewTestDraftDialog: FC<PreviewTestDraftDialogProps> = (props) => {
	const { draftEmail, canViewEmailAddress } = usePreviewTestDraftDialog(props);
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">
					<EyeIcon />
					View Test Draft
				</Button>
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
									<FeatureLockedButton message={RESTRICTED_FEATURE_MESSAGES.viewEmails} />
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
						<RichTextEditor
							className="!h-full grow max-h-[200px] overflow-y-auto"
							isEdit={false}
							hideMenuBar
							value={draftEmail.message}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default PreviewTestDraftDialog;
