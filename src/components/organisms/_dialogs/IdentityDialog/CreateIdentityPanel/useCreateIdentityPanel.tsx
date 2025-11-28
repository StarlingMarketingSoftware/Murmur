import { useCreateIdentity, useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { zodResolver } from '@hookform/resolvers/zod';
import { Identity } from '@prisma/client';
import { useEffect, Dispatch, SetStateAction } from 'react';
import { useForm, UseFormSetValue } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { identityFormSchema } from '../useIdentityDialog';
import { useCreateSignature, useGetSignatures } from '@/hooks/queryHooks/useSignatures';
import { DEFAULT_FONT } from '@/constants/ui';

const upsertIdentityFormSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Please enter a valid email address'),
	website: z.string().optional(),
});

export type UpsertIdentityFormValues = z.infer<typeof upsertIdentityFormSchema>;

export interface CreateIdentityPanelProps {
	isEdit: boolean;
	selectedIdentity?: Identity;
	setShowCreatePanel: Dispatch<SetStateAction<boolean>>;
	showCreatePanel: boolean;
	setValue: UseFormSetValue<z.infer<typeof identityFormSchema>>;
	onContinueWithIdentity?: (identityId: number) => void;
}

export const useCreateIdentityPanel = (props: CreateIdentityPanelProps) => {
	const {
		isEdit,
		selectedIdentity,
		setShowCreatePanel,
		showCreatePanel,
		setValue,
		onContinueWithIdentity,
	} = props;

	const form = useForm<UpsertIdentityFormValues>({
		mode: 'onTouched',
		resolver: zodResolver(upsertIdentityFormSchema),
		defaultValues: {
			name: '',
			email: '',
			website: '',
		},
	});

	const { data: signatures } = useGetSignatures();
	const { mutate: createSignature } = useCreateSignature({
		suppressToasts: true,
	});

	const { mutateAsync: createIdentity, isPending: isPendingCreateIdentity } =
		useCreateIdentity({
			onSuccess: () => {
				setShowCreatePanel(false);
				form.reset({
					name: '',
					email: '',
					website: '',
				});
			},
		});

	const { mutate: editIdentity, isPending: isPendingEditIdentity } = useEditIdentity({
		onSuccess: () => {
			setShowCreatePanel(false);
		},
	});

	const isPendingSubmit = isPendingCreateIdentity || isPendingEditIdentity;

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
			if (signatures?.length === 0) {
				createSignature({
					name: 'Default Signature',
					content: `<p><span style="font-family: ${DEFAULT_FONT}">Sincerely,</span></p><p></p><p><span style="font-family: ${DEFAULT_FONT}">${values.name}</span></p>`,
				});
			}
			if (onContinueWithIdentity) {
				onContinueWithIdentity(newIdentity.id);
			}
		}
	};

	useEffect(() => {
		if (isEdit && selectedIdentity) {
			form.reset({
				name: selectedIdentity.name,
				email: selectedIdentity.email,
				website: selectedIdentity.website || '',
			});
		} else {
			form.reset({
				name: '',
				email: '',
				website: '',
			});
		}
	}, [isEdit, selectedIdentity, form, showCreatePanel]);

	return {
		onSubmit,
		form,
		isEdit,
		isPendingSubmit,
	};
};
