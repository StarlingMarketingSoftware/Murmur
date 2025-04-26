import { FC } from 'react';

import { ConfirmDialogProps, useConfirmDialog } from './useConfirmDialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Form } from 'react-hook-form';

export const ConfirmDialog: FC<ConfirmDialogProps> = (props) => {
	const {
		title,
		open,
		onOpenChange,
		text,
		onSubmit,
		confirmWithInput,
		confirmWithInputValue = 'confirm',
		placeholderText,
		children,
		triggerButton,
		isLoading,
		formValue,
		form,
		confirmAction,
	} = useConfirmDialog(props);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) {
					form.reset();
				}
				onOpenChange(open);
			}}
		>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-sm text-muted-foreground">
					{text ? text : children}
				</DialogDescription>
				{confirmWithInput ? (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="confirmInput"
									render={({ field }) => (
										<FormItem className="col-span-11">
											<FormLabel>{`Type "${confirmWithInputValue}" to confirm.`}</FormLabel>
											<FormControl>
												<Input
													placeholder={
														placeholderText
															? placeholderText
															: 'Type the above value to confirm.'
													}
													className="flex-grow"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={() => onOpenChange(false)}
									variant="outline"
								>
									Cancel
								</Button>
								<Button
									isLoading={isLoading}
									disabled={confirmWithInput && !(formValue === confirmWithInputValue)}
									type="submit"
								>
									Delete
								</Button>
							</DialogFooter>
						</form>
					</Form>
				) : (
					<DialogFooter>
						<Button type="button" onClick={() => onOpenChange(false)} variant="outline">
							Cancel
						</Button>
						<Button
							isLoading={isLoading}
							disabled={confirmWithInput && !(formValue === confirmWithInputValue)}
							type="button"
							onClick={() => {
								confirmAction();
								onOpenChange(false);
							}}
						>
							Confirm
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
};
