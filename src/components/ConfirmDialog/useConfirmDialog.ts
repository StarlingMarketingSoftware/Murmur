import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

export interface ConfirmModalProps {
	title: string;
	open?: boolean;
	text?: string;
	onClose?: () => void;
	confirmAction: () => void;
	confirmWithInput?: boolean;
	confirmWithInputValue?: string;
	placeholderText?: string;
	children?: ReactNode;
	isLoading?: boolean;
	triggerButton?: ReactNode;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

type ConfirmModalFormValues = {
	confirmInput: string;
};

export const useConfirmDialog = (props: ConfirmModalProps) => {
	const [internalOpen, setInternalOpen] = useState(false);

	const isControlled = props.isOpen !== undefined;
	const open = isControlled ? props.isOpen : internalOpen;

	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		props.onOpenChange?.(newOpen);
		if (!newOpen) {
			props.onClose?.();
			form.reset();
		}
	};

	const form = useForm<ConfirmModalFormValues>({
		defaultValues: {
			confirmInput: '',
		},
	});

	const formValue = form.watch('confirmInput');

	return {
		form,
		open,
		onOpenChange: handleOpenChange,
		setInternalOpen,
		formValue,
		...props,
	};
};
