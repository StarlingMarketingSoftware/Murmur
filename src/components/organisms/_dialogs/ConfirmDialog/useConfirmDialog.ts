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
	confirmButtonText?: string;
	hideCancelButton?: boolean;
}

type ConfirmModalFormValues = {
	confirmInput: string;
};

export const useConfirmDialog = (props: ConfirmDialogProps) => {
	const [internalOpen, setInternalOpen] = useState(false);

	const {
		confirmAction,
		confirmButtonText,
		title,
		children,
		text,
		onOpenChange,
		confirmWithInput,
		confirmWithInputValue,
		placeholderText,
		isLoading,
		triggerButton,
		open,
		onClose,
		hideCancelButton,
	} = props;

	const isControlled = props.open !== undefined;
	const _open = isControlled ? open : internalOpen;

	const form = useForm<ConfirmModalFormValues>({
		defaultValues: {
			confirmInput: '',
		},
	});

	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		onOpenChange?.(newOpen);
		if (!newOpen) {
			form.reset();
			onClose?.();
		}
	};

	const formValue = form.watch('confirmInput');

	const onSubmit = () => {
		confirmAction();
		form.reset();
	};

	return {
		form,
		open: _open,
		onOpenChange: handleOpenChange,
		setInternalOpen,
		formValue,
		onSubmit,
		confirmButtonText,
		confirmAction,
		confirmWithInput,
		confirmWithInputValue,
		placeholderText,
		isLoading,
		triggerButton,
		title,
		children,
		text,
		hideCancelButton,
	};
};
