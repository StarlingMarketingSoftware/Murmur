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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
	} = useViewEditEmailDialog(props);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
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
													<Input className="flex-grow" disabled={!isEdit} {...field} />
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
													<Textarea
														className="flex-grow h-[275px]"
														disabled={!isEdit}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<DialogFooter>
									{!isEdit ? (
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
										<Button
											isLoading={isPendingEditEmail}
											className="w-fit"
											variant="outline"
											type="submit"
										>
											Save
										</Button>
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
