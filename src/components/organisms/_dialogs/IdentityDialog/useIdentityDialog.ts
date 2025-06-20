import {
	useCreateEmailVerificationCode,
	useEditEmailVerificationCode,
} from '@/hooks/queryHooks/useEmailVerificationCodes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Campaign } from '@prisma/client';
import { ReactNode, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface IdentityDialogProps {
	title: string;
	open?: boolean;
	text?: string;
	onClose?: () => void;
	children?: ReactNode;
	isLoading?: boolean;
	triggerButton?: ReactNode;
	onOpenChange?: (open: boolean) => void;
	campaign: Campaign;
}

const identityFormSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email address'),
	website: z.string().optional(),
	verificationCode: z
		.string()
		.regex(/^\d{6}$/, 'Verification code must be 6 digits')
		.optional(),
});

export const useIdentityDialog = (props: IdentityDialogProps) => {
	const [internalOpen, setInternalOpen] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const countdownInterval = useRef<NodeJS.Timeout | null>(null);

	const {} = props;
	const isControlled = props.open !== undefined;
	const open = isControlled ? props.open : internalOpen;
	const form = useForm<z.infer<typeof identityFormSchema>>({
		mode: 'onTouched',
		resolver: zodResolver(identityFormSchema),
		defaultValues: {
			name: '',
			email: '',
			website: '',
			verificationCode: '',
		},
	});
	const {
		formState: { errors },
	} = form;

	const {
		mutate: createEmailVerificationCode,
		isPending: isPendingCreateEmailVerificationCode,
		isSuccess: isEmailVerificationCodeSent,
	} = useCreateEmailVerificationCode();

	const {
		mutate: editEmailVerificationCode,
		isPending: isPendingVerifyCode,
		isSuccess: isCodeVerified,
	} = useEditEmailVerificationCode();

	useEffect(() => {
		console.log('🚀 ~ useIdentityDialog ~ errors:', errors);
	}, [errors]);

	// Start countdown when email verification code is sent
	useEffect(() => {
		if (isEmailVerificationCodeSent && !isCodeVerified) {
			// Set countdown to 10 minutes (600 seconds)
			setCountdown(600);

			countdownInterval.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev === null || prev <= 1) {
						if (countdownInterval.current) {
							clearInterval(countdownInterval.current);
							countdownInterval.current = null;
						}
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => {
			if (countdownInterval.current) {
				clearInterval(countdownInterval.current);
				countdownInterval.current = null;
			}
		};
	}, [isEmailVerificationCodeSent, isCodeVerified]);

	// Clean up interval when component unmounts or dialog closes
	useEffect(() => {
		if (!open) {
			setCountdown(null);
			if (countdownInterval.current) {
				clearInterval(countdownInterval.current);
				countdownInterval.current = null;
			}
		}
	}, [open]);
	const handleSendEmailVerificationCode = () => {
		// Clear any existing countdown when sending a new code
		form.setValue('verificationCode', undefined);
		setCountdown(null);
		if (countdownInterval.current) {
			clearInterval(countdownInterval.current);
			countdownInterval.current = null;
		}

		createEmailVerificationCode({
			email: form.getValues('email'),
		});
	};
	const handleVerifyCode = (code: string) => {
		console.log('🚀 ~ handleVerifyCode ~ code:', code);
		console.log(
			"🚀 ~ handleVerifyCode ~ form.getValues('email'):",
			form.getValues('email')
		);
		if (code.length === 6) {
			editEmailVerificationCode({
				email: form.getValues('email'),
				code,
			});
		}
	};

	// Format countdown time as MM:SS
	const formatCountdown = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
			.toString()
			.padStart(2, '0')}`;
	};

	const countdownDisplay = countdown !== null ? formatCountdown(countdown) : null;
	const isCodeExpired = countdown === 0;
	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		props.onOpenChange?.(newOpen);
		if (!newOpen) {
			// Reset countdown and clear interval when dialog closes
			setCountdown(null);
			if (countdownInterval.current) {
				clearInterval(countdownInterval.current);
				countdownInterval.current = null;
			}
			form.reset({
				name: '',
				email: '',
				website: '',
				verificationCode: '',
			});
			props.onClose?.();
		}
	};

	const onSubmit = () => {
		form.reset({
			name: '',
			email: '',
			website: '',
			verificationCode: '',
		});
	};

	return {
		form,
		open,
		onOpenChange: handleOpenChange,
		setInternalOpen,
		onSubmit,
		isEmailVerified: isCodeVerified,
		handleSendEmailVerificationCode,
		isPendingCreateEmailVerificationCode,
		isEmailVerificationCodeSent,
		handleVerifyCode,
		isPendingVerifyCode,
		isCodeVerified,
		countdownDisplay,
		isCodeExpired,
		...props,
	};
};
