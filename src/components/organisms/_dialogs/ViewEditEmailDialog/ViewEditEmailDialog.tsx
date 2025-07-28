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
	const {
		email,
		isOpen,
		setIsOpen,
		handleSave,
		form,
		isPendingEditEmail,
		isEditable,
		showRecipientEmail,
	} = useViewEditEmailDialog(props);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent
				onOpenAutoFocus={(e) => {
					e.preventDefault();
				}}
				className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]"
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
									<RecipientAddressLockableInput
										email={email.contact.email}
										overrideTierShowEmail={showRecipientEmail}
									/>
									<FormField
										control={form.control}
										name="subject"
										render={({ field }) => (
											<FormItem className="col-span-11">
												<FormLabel>Subject</FormLabel>
												<FormControl>
													<Input className="flex-grow" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
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
														className="!h-full grow max-h-[200px] overflow-y-auto"
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
