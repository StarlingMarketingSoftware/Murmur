import { Campaign } from '@prisma/client';
import { ReactNode, useState } from 'react';

export interface IdentityDialogProps {
	title: string;
	open?: boolean;
	text?: string;
	onClose?: () => void;
	children?: ReactNode;
	isLoading?: boolean;
	triggerButton?: ReactNode;
	onOpenChange: (open: boolean) => void;
	campaign: Campaign;
}

export const useIdentityDialog = (props: IdentityDialogProps) => {
	const [internalOpen, setInternalOpen] = useState(false);
	const [showCreatePanel, setShowCreatePanel] = useState(true);

	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		props.onOpenChange?.(newOpen);
		if (!newOpen) {
			// Reset countdown and clear interval when dialog closes
			// setCountdown(null);
			// if (countdownInterval.current) {
			// 	clearInterval(countdownInterval.current);
			// 	countdownInterval.current = null;
			// }
			// form.reset({
			// 	name: '',
			// 	email: '',
			// 	website: '',
			// 	verificationCode: '',
			// });
			props.onClose?.();
		}
	};
	const { title, onOpenChange, text, children, triggerButton, isLoading } = props;
	const isControlled = props.open !== undefined;
	const open = isControlled ? props.open : internalOpen;

	return {
		title,
		onOpenChange,
		text,
		children,
		triggerButton,
		isLoading,
		open,
		handleOpenChange,
		showCreatePanel,
		setShowCreatePanel,
	};
};
