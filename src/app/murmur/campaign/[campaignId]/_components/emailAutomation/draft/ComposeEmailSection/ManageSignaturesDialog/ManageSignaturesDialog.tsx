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
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Signature } from '@prisma/client';
import Spinner from '@/components/ui/spinner';

export const ManageSignaturesDialog: FC<ManageSignaturesDialogProps> = (props) => {
	const { signatures, isPendingSignatures, form, isEdit, setIsEdit, handleSave } =
		useManageSignaturesDialog(props);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Manage Signatures</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogHeader>
					<DialogTitle>Manage Signatures</DialogTitle>
					<DialogDescription>
						Create and edit your email signature using the rich text editor below. Your
						signature will be added to the end of every email you draft.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-row gap-4">
					<div className="w-3/12">
						{isPendingSignatures ? (
							<Spinner />
						) : (
							<ScrollArea className="h-72 w-full mb-4 rounded-md border">
								<div className="p-4">
									{signatures.map((signature: Signature, index: number) => (
										<>
											<div key={index} className="text-sm">
												{signature.name}
											</div>
											<Separator className="my-2" />
										</>
									))}
								</div>
							</ScrollArea>
						)}

						<Button className="w-full">New Signature</Button>
					</div>
					<Separator orientation="vertical" className="h-[300px]" />
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSave)}
							className="w-9/12 flex flex-col justify-between"
						>
							<FormField
								control={form.control}
								name="signature"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormControl>
											<RichTextEditor
												// isEdit={isEdit}
												value={field.value}
												onChange={field.onChange}
												className="!h-full grow"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter>
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
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
};
