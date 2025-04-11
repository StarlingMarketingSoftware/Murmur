import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface ManageSignaturesDialogProps {}

const editEmailSchema = z.object({
	signature: z.string().min(1, { message: 'Signature is required.' }),
});

export const useManageSignaturesDialog = (props: ManageSignaturesDialogProps) => {
	const [isEdit, setIsEdit] = useState(false);
	const form = useForm<z.infer<typeof editEmailSchema>>({
		resolver: zodResolver(editEmailSchema),
		defaultValues: {
			signature: '',
		},
	});

	const handleSave = () => {};

	return { form, isEdit, setIsEdit, handleSave };
};
