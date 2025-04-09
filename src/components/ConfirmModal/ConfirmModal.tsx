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
		text,
		onClose,
		confirmAction,
		confirmWithInput,
		confirmWithInputValue = 'confirm',
		children,
		triggerButton,
		isLoading,
		form,
	} = useConfirmModal(props);

	const [confirmValue, setConfirmValue] = useState('');
	// Add state to control the dialog
	const [isOpen, setIsOpen] = useState(open || false);

	// Handle external open state changes
	useEffect(() => {
		if (open !== undefined) {
			setIsOpen(open);
		}
	}, [open]);

	const handleClose = () => {
		setIsOpen(false);
		setConfirmValue('');
		if (onClose) {
			onClose();
		}
	};

	const handleConfirm = () => {
		confirmAction();
		setIsOpen(false);
		setConfirmValue('');
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
				{triggerButton}
			</DialogTrigger>
			<DialogContent onClick={(e) => e.stopPropagation()}>
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
											<FormLabel>{`Type ${confirmValue} to confirm.`}</FormLabel>
											<FormControl>
												<Input
													placeholder={`Type "${confirmWithInputValue}" to confirm`}
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
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						isLoading={isLoading}
						disabled={confirmWithInput && !(confirmValue === confirmWithInputValue)}
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
