import {
	useCreateEmailVerificationCode,
	useEditEmailVerificationCode,
} from '@/hooks/queryHooks/useEmailVerificationCodes';
import { useCreateIdentity, useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { zodResolver } from '@hookform/resolvers/zod';
import { Identity } from '@prisma/client';
import { useEffect, useState, useRef, Dispatch, SetStateAction } from 'react';
import { useForm, UseFormSetValue } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { identityFormSchema } from '../useIdentityDialog';
import { useCreateSignature } from '@/hooks/queryHooks/useSignatures';
import { DEFAULT_FONT } from '@/constants/ui';

const upsertIdentityFormSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email address'),
	website: z.string().optional(),
	verificationCode: z.string().optional(),
});

export interface CreateIdentityPanelProps {
	isEdit: boolean;
	selectedIdentity?: Identity;
	setShowCreatePanel: Dispatch<SetStateAction<boolean>>;
	showCreatePanel: boolean;
	setValue: UseFormSetValue<z.infer<typeof identityFormSchema>>;
}

export const useCreateIdentityPanel = (props: CreateIdentityPanelProps) => {
	const { isEdit, selectedIdentity, setShowCreatePanel, showCreatePanel, setValue } =
		props;

	const [countdown, setCountdown] = useState<number | null>(null);
	const [isCodeVerified, setIsCodeVerified] = useState(false);
	const countdownInterval = useRef<NodeJS.Timeout | null>(null);

	const isCodeExpired = countdown === 0;

	const form = useForm<z.infer<typeof upsertIdentityFormSchema>>({
		mode: 'onTouched',
		resolver: zodResolver(upsertIdentityFormSchema),
		defaultValues: {
			name: '',
			email: '',
			website: '',
			verificationCode: '',
		},
	});

	const {
		mutate: createEmailVerificationCode,
		isPending: isPendingCreateEmailVerificationCode,
		isSuccess: isEmailVerificationCodeSent,
		reset: resetCreateEmailVerificationCode,
	} = useCreateEmailVerificationCode();

	const {
		mutate: editEmailVerificationCode,
		isPending: isPendingVerifyCode,
		reset: resetEditEmailVerificationCode,
	} = useEditEmailVerificationCode({
		onSuccess: () => {
			setIsCodeVerified(true);
		},
	});

	const { mutate: createSignature } = useCreateSignature({
		suppressToasts: true,
	});

	const { mutateAsync: createIdentity, isPending: isPendingCreateIdentity } =
		useCreateIdentity({
			onSuccess: () => {
				resetEditEmailVerificationCode();
				resetCreateEmailVerificationCode();
				setIsCodeVerified(false);
				setShowCreatePanel(false);
				form.reset({
					name: '',
					email: '',
					website: '',
					verificationCode: '',
				});
			},
		});

	const { mutate: editIdentity, isPending: isPendingEditIdentity } = useEditIdentity({
		onSuccess: () => {
			resetEditEmailVerificationCode();
			resetCreateEmailVerificationCode();
			setShowCreatePanel(false);
		},
	});

	const isPendingSubmit = isPendingCreateIdentity || isPendingEditIdentity;

	const formatCountdown = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
			.toString()
			.padStart(2, '0')}`;
	};

	const countdownDisplay = countdown !== null ? formatCountdown(countdown) : null;

	const handleSendEmailVerificationCode = () => {
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
			setIsCodeVerified(false);
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

	const onSubmit = async (values: z.infer<typeof upsertIdentityFormSchema>) => {
		if (isEdit) {
			if (!selectedIdentity) {
				toast.error('No identity selected for editing.');
				return;
			}
			editIdentity({
				id: selectedIdentity?.id,
				data: {
					name: values.name,
					email: values.email,
					website: values.website,
				},
			});
		} else {
			const newIdentity: Identity = await createIdentity({
				name: values.name,
				email: values.email,
				website: values.website,
			});
			setValue('identityId', String(newIdentity.id));
			createSignature({
				name: 'Default Signature',
				content: `<p><span style="font-family: ${DEFAULT_FONT}">Sincerely,</span></p><p></p><p><span style="font-family: ${DEFAULT_FONT}">${values.name}</span></p>`,
			});
			// refetch campaign??
		}
	};

	// Start countdown when email verification code is sent
	useEffect(() => {
		if (isEmailVerificationCodeSent && !isCodeVerified) {
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (isEdit && selectedIdentity) {
			setIsCodeVerified(true);
			form.reset({
				name: selectedIdentity.name,
				email: selectedIdentity.email,
				website: selectedIdentity.website || '',
				verificationCode: '',
			});
		} else {
			setIsCodeVerified(false);
			form.reset({
				name: '',
				email: '',
				website: '',
				verificationCode: '',
			});
		}
	}, [isEdit, selectedIdentity, form, setIsCodeVerified, showCreatePanel]);

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
		isEdit,
		isPendingSubmit,
	};
};
