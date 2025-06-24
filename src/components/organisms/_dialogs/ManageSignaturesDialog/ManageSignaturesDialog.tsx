import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
	FormMessage,
} from '@/components/ui/form';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Signature } from '@prisma/client';
import Spinner from '@/components/ui/spinner';
import { twMerge } from 'tailwind-merge';
import { Input } from '@/components/ui/input';
import { SaveIcon, SquareCheckIcon, TrashIcon } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SelectLabel } from '@radix-ui/react-select';

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
		campaign,
		open,
		onOpenChange,
	} = useManageSignaturesDialog(props);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogHeader>
					<DialogTitle>Manage Signatures</DialogTitle>
					<DialogDescription>
						Your selected signature will be added to the end of every email you draft.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-4 md:hidden w-full">
					{isPendingSignatures ? (
						<Spinner />
					) : (
						<Select
							onValueChange={(signature) =>
								setCurrentSignature(
									signatures.find((s: Signature) => s.id.toString() === signature)
								)
							}
							defaultValue={currentSignature?.id.toString()}
							value={currentSignature?.id.toString()}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select font" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Signatures</SelectLabel>
									{signatures.map((signature: Signature) => {
										const isSelected = currentSignature?.id === signature.id;
										return (
											<div key={signature.id}>
												<SelectItem
													value={signature.id.toString()}
													onClick={() => setCurrentSignature(signature)}
													className={twMerge(
														'w-full max-w-[100%]',
														isSelected && 'pointer-events-none'
													)}
												>
													{campaign.signatureId === signature.id && <SquareCheckIcon />}

													<div className="text-sm">{signature.name}</div>
												</SelectItem>
											</div>
										);
									})}
								</SelectGroup>
							</SelectContent>
						</Select>
					)}
					<Button
						onClick={() => createSignature({ name: 'New Signature', content: '<p></p>' })}
						className="grid-cols-1"
						isLoading={isPendingCreateSignature}
					>
						New Signature
					</Button>
				</div>
				<div className="flex flex-row gap-0 md:gap-4">
					<div className="hidden md:block w-3/12">
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
													{campaign.signatureId === signature.id && <SquareCheckIcon />}
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
							className="w-full md:w-9/12 flex flex-col justify-between"
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
								<div className="flex flex-col sm:flex-row gap-4">
									<Button
										type="button"
										variant="primary-light"
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
									<Button isLoading={isPendingSaveSignature} type="submit">
										<SaveIcon /> Save
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
