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
import {
	ManageSignaturesDialogProps,
	useManageSignaturesDialog,
} from './useManageSignaturesDialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export const ManageSignaturesDialog: FC<ManageSignaturesDialogProps> = (props) => {
	const { form, isEdit, setIsEdit, handleSave } = useManageSignaturesDialog(props);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Manage Signatures</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogHeader>
					<DialogTitle>Manage Signatures</DialogTitle>
					<DialogDescription>
						Signatures are text that will be placed at the end of every email you draft.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSave)}>
						<FormField
							control={form.control}
							name="signature"
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
								<div className="flex gap-4">
									<Button
										type="button"
										className="w-fit"
										variant="outline"
										onClick={(e) => {
											e.preventDefault();
											setIsEdit(false);
										}}
									>
										Cancel
									</Button>
									<Button className="w-fit" variant="default" type="submit">
										Save
									</Button>
								</div>
							)}
						</DialogFooter>
					</form>
				</Form>
				<div className="grid gap-4 py-4"></div>
				{/* <DialogFooter>
        <Button type="submit">Save changes</Button>
      </DialogFooter> */}
			</DialogContent>
		</Dialog>
	);
};
