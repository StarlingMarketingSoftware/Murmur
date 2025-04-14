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
import { twMerge } from 'tailwind-merge';
import { Input } from '@/components/ui/input';
import { TrashIcon } from 'lucide-react';

export const ManageSignaturesDialog: FC<ManageSignaturesDialogProps> = (props) => {
	const {
		signatures,
		isPendingSignatures,
		form,
		handleSave,
		createSignature,
		deleteSignature,
		currentSignature,
		setCurrentSignature,
		isPendingSaveSignature,
		isPendingDeleteSignature,
		isPendingCreateSignature,
		saveSignatureToCampaign,
		isPendingSaveSignatureToCampaign,
		campaignId,
		handleSaveSignatureToCampaign,
	} = useManageSignaturesDialog(props);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Manage Signatures</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogHeader>
					<DialogTitle>Manage Signatures</DialogTitle>
					<DialogDescription>
						Your selected signature will be added to the end of every email you draft.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-row gap-4">
					<div className="w-3/12">
						{isPendingSignatures ? (
							<Spinner />
						) : (
							<ScrollArea className="h-72 w-full mb-4 rounded-md border">
								<div className="p-4">
									{signatures.map((signature: Signature) => {
										const isSelected = currentSignature?.id === signature.id;
										return (
											<div key={signature.id}>
												<Button
													onClick={() => setCurrentSignature(signature)}
													variant={isSelected ? 'secondary' : 'ghost'}
													className={twMerge(
														'w-full max-w-[100%]',
														isSelected && 'pointer-events-none'
													)}
												>
													<div className="text-sm">{signature.name}</div>
												</Button>
												<Separator className="my-2" />
											</div>
										);
									})}
								</div>
							</ScrollArea>
						)}

						<Button
							onClick={() =>
								createSignature({ name: 'New Signature', content: '<p></p>' })
							}
							className="w-full"
							isLoading={isPendingCreateSignature}
						>
							New Signature
						</Button>
					</div>
					<Separator orientation="vertical" className="h-[300px]" />
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSave)}
							className="w-9/12 flex flex-col justify-between"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="content"
								render={({ field }) => (
									<FormItem className="col-span-11">
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
							<DialogFooter>
								<div className="flex gap-4">
									<Button
										type="button"
										className="w-fit"
										variant="outline"
										isLoading={isPendingDeleteSignature}
										onClick={(e) => {
											if (!currentSignature) return;
											setCurrentSignature(signatures[1]);
											deleteSignature(currentSignature.id);
											e.preventDefault();
										}}
									>
										<TrashIcon />
										Delete
									</Button>
									<Button
										type="button"
										className="w-fit"
										variant="outline"
										onClick={(e) => handleSaveSignatureToCampaign(e)}
										isLoading={isPendingSaveSignatureToCampaign}
									>
										Use Selected Signature
									</Button>
									<Button
										isLoading={isPendingSaveSignature}
										className="w-fit"
										variant="default"
										type="submit"
									>
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
