import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';

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
import { Input } from '@/components/ui/input';

export const ConfirmSendDialog: FC<ConfirmSendDialogProps> = (props) => {
	const { handleSend, form, draftEmailCount } = useConfirmSendDialog(props);
	return (
		<Dialog modal>
			<DialogTrigger asChild>
				<Button variant="default">Proceed to Confirmation</Button>
			</DialogTrigger>
			<DialogContent hideCloseButton className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Send Campaign Confirmation</DialogTitle>
				</DialogHeader>
				<DialogDescription className="py-4">{`Murmur uses a marketing email service to send emails in place of sending directly from your account. As part of this process, we require your name and email address so that the recipient sees the correct sender information and replies go to your inbox. This does not grant Murmur access to your email in any way. Please enter this information below and confirm.`}</DialogDescription>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSend)}>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="senderName"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormLabel>Sender Name</FormLabel>
										<FormControl>
											<Input className="flex-grow" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="senderEmail"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormLabel>Sender Email</FormLabel>
										<FormControl>
											<Input className="flex-grow" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<DialogFooter>
							<Button onClick={handleSend} className="mx-auto" type="submit">
								{`Send ${draftEmailCount} Emails`}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
