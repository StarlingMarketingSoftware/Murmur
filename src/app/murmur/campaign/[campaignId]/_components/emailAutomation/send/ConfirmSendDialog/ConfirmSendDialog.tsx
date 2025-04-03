import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { FC } from 'react';
import { ConfirmSendDialogProps, useConfirmSendDialog } from './useConfirmSendDialog';

export const ConfirmSendDialog: FC<ConfirmSendDialogProps> = (props) => {
	const { handleSend } = useConfirmSendDialog(props);
	return (
		<Dialog modal>
			<DialogTrigger asChild>
				<Button variant="default">Proceed to Confirmation</Button>
			</DialogTrigger>
			<DialogContent hideCloseButton className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Authorize Murmur with Google Permissions</DialogTitle>
				</DialogHeader>
				<DialogDescription className="py-4">{`Murmur uses the Google People API and Gmail API to retrieve your contacts and send email. For these functions, we require you to provide Murmur with permissions to use these APIs with your Google account. Please click the "Authorize with Google" with button to proceed.`}</DialogDescription>
				<DialogFooter>
					<Button onClick={handleSend} className="mx-auto">
						Send 50 Emails
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
