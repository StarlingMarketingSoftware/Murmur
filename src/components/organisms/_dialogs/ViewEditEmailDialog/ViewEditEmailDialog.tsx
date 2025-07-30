'use client';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FC } from 'react';
import {
	useViewEditEmailDialog,
	ViewEditEmailDialogProps,
} from './useViewEditEmailDialog';
import Spinner from '@/components/ui/spinner';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { RecipientAddressLockableInput } from '@/components/atoms/RecipientAddressLockableInput/RecipientAddressLockableInput';

export const ViewEditEmailDialog: FC<ViewEditEmailDialogProps> = (props) => {
	const { email, isOpen, handleSave, form, isPendingEditEmail, isEditable, setIsOpen } =
		useViewEditEmailDialog(props);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent
				onOpenAutoFocus={(e) => {
					e.preventDefault();
				}}
				className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto"
			>
				<DialogHeader>
					<DialogTitle>Email</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>
				{!email ? (
					<Spinner />
				) : (
					<>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(handleSave)}>
								<div className="space-y-4">
									<div className="flex flex-col sm:flex-row gap-2 w-full mb-0">
										<RecipientAddressLockableInput
											className="w-1/2"
											email={email.contact.email}
											label="Recipient"
										/>
										<FormField
											control={form.control}
											name="subject"
											render={({ field }) => (
												<FormItem className="w-1/2">
													<FormLabel>Subject</FormLabel>
													<FormControl>
														<Input className="flex-grow w-1/2" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
									<FormField
										control={form.control}
										name="message"
										render={({ field }) => (
											<FormItem className="col-span-11">
												<FormLabel>Message</FormLabel>
												<FormControl>
													<RichTextEditor
														value={field.value}
														onChange={field.onChange}
														className="!h-full grow overflow-y-auto max-h-[500px]"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<DialogFooter>
									{isEditable && (
										<div className="flex gap-4">
											<Button
												isLoading={isPendingEditEmail}
												className="w-fit"
												type="submit"
											>
												Save
											</Button>
										</div>
									)}
								</DialogFooter>
							</form>
						</Form>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ViewEditEmailDialog;
