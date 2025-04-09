import { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

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
	triggerButton?: ReactNode;
}

type ConfirmModalFormValues = {
	confirmInput: string;
};

export const useConfirmModal = (props: ConfirmModalProps) => {
	const form = useForm<ConfirmModalFormValues>({
		defaultValues: {
			confirmInput: '',
		},
	});

	return {
		form,
		...props,
	};
};
