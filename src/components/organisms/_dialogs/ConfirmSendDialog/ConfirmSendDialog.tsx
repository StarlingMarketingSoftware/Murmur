import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { FC } from 'react';
import { ConfirmSendDialogProps, useConfirmSendDialog } from './useConfirmSendDialog';
import { SendIcon } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

export const ConfirmSendDialog: FC<ConfirmSendDialogProps> = (props) => {
	const { handleSend, draftEmailCount, isOpen, setIsOpen, user, campaign } =
		useConfirmSendDialog(props);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen} modal>
			<DialogTrigger asChild>
				<Button className="w-[891px] h-[39px]" disabled={draftEmailCount <= 0}>
					Send
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Send Campaign Confirmation</DialogTitle>
				</DialogHeader>
				<Typography variant="p" className="py-4">
					Let&apos;s confirm the following details before sending your campaign.
				</Typography>
				<Typography variant="p" className="py-4">
					{`Murmur has generated a personalized email address for you to send from: `}
					<strong>{user?.murmurEmail}</strong>
				</Typography>

				<Typography variant="p" className="py-4">
					The recipients will see the Identity information that you&apos;ve connected to
					this campaign:
					<br className="mt-2" />
					<strong>{campaign?.identity?.name}</strong>
					<br />
					<strong>{campaign?.identity?.email}</strong>
				</Typography>
				<Typography>
					If the above information is not correct, please return to the top of the
					campaign to edit your Identity or create a new one.
				</Typography>
				<Typography variant="p" className="py-4">
					By clicking &quot;Send&quot;, you confirm that the email address{' '}
					<strong>{campaign?.identity?.email}</strong> is correct and that you wish to
					receive replies to this address.
				</Typography>
				<DialogFooter>
					<div className="flex gap-2 w-full items-center justify-center">
						<Button onClick={handleSend}>
							<SendIcon />
							{`Send ${draftEmailCount} Emails`}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
