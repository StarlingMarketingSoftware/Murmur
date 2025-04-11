import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';
import {
	useCreateSignature,
	useDeleteSignature,
	useEditSignature,
	useGetUserSignatures,
} from '@/hooks/useSignatures';

export interface ManageSignaturesDialogProps {}

const signatureSchema = z.object({
	signature: z.string().min(2, { message: 'Signature content is required.' }),
});

export const useManageSignaturesDialog = (props: ManageSignaturesDialogProps) => {
	const [isEdit, setIsEdit] = useState(false);

	const { data: signatures, isPending: isPendingSignatures } = useGetUserSignatures();
	const { mutate: saveSignature } = useEditSignature({});
	const { mutate: deleteSignature } = useDeleteSignature({});
	const { mutate: createSignature } = useCreateSignature({});

	const form = useForm<z.infer<typeof signatureSchema>>({
		resolver: zodResolver(signatureSchema),
		defaultValues: {
			// signature: signature?.content ? JSON.stringify(signature.content) : '',
			signature: '',
		},
	});

	const handleSave = (data: z.infer<typeof signatureSchema>) => {
		console.log('🚀 ~ handleSave ~ data:', data);
		saveSignature(data);
	};

	return { signatures, isPendingSignatures, form, isEdit, setIsEdit, handleSave };
};
