import { FC, ReactNode, useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog';
import { FormControl } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';

export interface ConfirmModalProps {
	title: string;
	open?: boolean;
	text?: string;
	onClose?: () => void;
	confirmAction: () => void;
	confirmWithInput?: boolean;
	confirmWithInputValue?: string;
	children?: ReactNode;
	isLoading?: boolean;
	triggerButton: ReactNode;
}

const ConfirmModal: FC<ConfirmModalProps> = ({
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
}) => {
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
		setConfirmValue('');
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-sm text-muted-foreground">
					{text ? text : children}
				</DialogDescription>
				{confirmWithInput && (
					<FormControl>
						<Input
							value={confirmValue}
							onChange={(e) => setConfirmValue(e.target.value)}
							placeholder={`Type "${confirmWithInputValue}" to confirm`}
							variant="outlined"
						/>
					</FormControl>
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

export default ConfirmModal;
