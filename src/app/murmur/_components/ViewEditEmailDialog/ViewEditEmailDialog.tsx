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
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';

export const ViewEditEmailDialog: FC<ViewEditEmailDialogProps> = (props) => {
	const {
		email,
		isOpen,
		setIsOpen,
		isEdit,
		setIsEdit,
		handleSave,
		form,
		isPendingEditEmail,
		resetFormToCurrentEmail,
		isEditable,
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
									<FormField
										control={form.control}
										name="subject"
										render={({ field }) => (
											<FormItem className="col-span-11">
												<FormLabel>Subject</FormLabel>
												<FormControl>
													<Input className="flex-grow" readOnly={!isEdit} {...field} />
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
														isEdit={isEdit}
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
									{isEditable &&
										(!isEdit ? (
											<Button
												type="button"
												className="w-fit"
												variant="outline"
												onClick={(e) => {
													e.preventDefault();
													setIsEdit(true);
												}}
											>
												Edit
											</Button>
										) : (
											<div className="flex gap-4">
												<Button
													type="button"
													className="w-fit"
													variant="outline"
													onClick={(e) => {
														e.preventDefault();
														setIsEdit(false);
														resetFormToCurrentEmail();
													}}
												>
													Cancel
												</Button>
												<Button
													isLoading={isPendingEditEmail}
													className="w-fit"
													variant="default"
													type="submit"
												>
													Save
												</Button>
											</div>
										))}
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
