import {
	useCreateEmailVerificationCode,
	useEditEmailVerificationCode,
} from '@/hooks/queryHooks/useEmailVerificationCodes';
import { useCreateIdentity } from '@/hooks/queryHooks/useIdentities';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const identityFormSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email address'),
	website: z.string().optional(),
	verificationCode: z.string().optional(),
});

export const useCreateIdentityPanel = () => {
	const [countdown, setCountdown] = useState<number | null>(null);
	const countdownInterval = useRef<NodeJS.Timeout | null>(null);
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
		reset: resetCreateEmailVerificationCode,
	} = useCreateEmailVerificationCode();

	const {
		mutate: editEmailVerificationCode,
		isPending: isPendingVerifyCode,
		isSuccess: isCodeVerified,
		reset: resetEditEmailVerificationCode,
	} = useEditEmailVerificationCode();

	const {
		mutateAsync: createIdentity,
		isPending: isPendingCreateIdentity,
		isSuccess: isIdentityCreateSuccess,
	} = useCreateIdentity({
		onSuccess: () => {
			resetEditEmailVerificationCode();
			resetCreateEmailVerificationCode();
			form.reset({
				name: '',
				email: '',
				website: '',
				verificationCode: '',
			});
		},
	});

	useEffect(() => {}, [errors]);

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
		if (!isCodeVerified) {
			form.setValue('verificationCode', undefined);
			setCountdown(null);
			if (countdownInterval.current) {
				clearInterval(countdownInterval.current);
				countdownInterval.current = null;
			}

			createEmailVerificationCode({
				email: form.getValues('email'),
			});
		} else {
			resetCreateEmailVerificationCode();
			resetEditEmailVerificationCode();
			form.setValue('verificationCode', undefined);
			form.setValue('email', '');
		}
	};
	const handleVerifyCode = (code: string) => {
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

	const onSubmit = async (values: z.infer<typeof identityFormSchema>) => {
		await createIdentity({
			name: values.name,
			email: values.email,
			website: values.website,
		});

		if (isIdentityCreateSuccess) {
		}
	};
	return {
		onSubmit,
		form,
		handleSendEmailVerificationCode,
		isPendingCreateEmailVerificationCode,
		isEmailVerificationCodeSent,
		handleVerifyCode,
		isPendingVerifyCode,
		isCodeVerified,
		countdownDisplay,
		isCodeExpired,
		isPendingCreateIdentity,
	};
};
