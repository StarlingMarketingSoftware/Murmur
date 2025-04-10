import { FC, useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ConfirmModalProps, useConfirmModal } from './useConfirmModal';

export const ConfirmModal: FC<ConfirmModalProps> = (props) => {
	const {
		title,
		open,
		onOpenChange,
		text,
		confirmAction,
		confirmWithInput,
		confirmWithInputValue = 'confirm',
		placeholderText,
		children,
		triggerButton,
		isLoading,
		setInternalOpen,
		formValue,
		form,
	} = useConfirmModal(props);

	const handleConfirm = () => {
		confirmAction();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-sm text-muted-foreground">
					{text ? text : children}
				</DialogDescription>
				{confirmWithInput && (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(confirmAction)}>
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
						</form>
					</Form>
				)}
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						isLoading={isLoading}
						disabled={confirmWithInput && !(formValue === confirmWithInputValue)}
						onClick={handleConfirm}
						type="submit"
					>
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
