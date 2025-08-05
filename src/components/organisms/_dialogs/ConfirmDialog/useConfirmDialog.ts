import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

export interface ConfirmDialogProps {
	title: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	text?: string;
	onClose?: () => void;
	confirmAction: () => void;
	confirmWithInput?: boolean;
	confirmWithInputValue?: string;
	placeholderText?: string;
	children?: ReactNode;
	isLoading?: boolean;
	triggerButton?: ReactNode;
}

type ConfirmModalFormValues = {
	confirmInput: string;
};

export const useConfirmDialog = (props: ConfirmDialogProps) => {
	const [internalOpen, setInternalOpen] = useState(false);

	const { confirmAction } = props;
	const isControlled = props.open !== undefined;
	const open = isControlled ? props.open : internalOpen;

	const form = useForm<ConfirmModalFormValues>({
		defaultValues: {
			confirmInput: '',
		},
	});

	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		props.onOpenChange?.(newOpen);
		if (!newOpen) {
			form.reset();
			props.onClose?.();
		}
	};

	const formValue = form.watch('confirmInput');

	const onSubmit = () => {
		confirmAction();
		form.reset();
	};

	return {
		form,
		open,
		onOpenChange: handleOpenChange,
		setInternalOpen,
		formValue,
		onSubmit,
		...props,
	};
};
