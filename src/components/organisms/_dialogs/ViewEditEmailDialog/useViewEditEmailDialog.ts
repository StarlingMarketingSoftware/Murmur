import { EmailWithRelations } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';

export interface ViewEditEmailDialogProps {
	email: EmailWithRelations | null;
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	isEditable?: boolean;
}

const editEmailSchema = z.object({
	subject: z.string().min(1, { message: 'Subject is required.' }),
	message: z.string().min(1, { message: 'Message is required.' }),
});

export const useViewEditEmailDialog = (props: ViewEditEmailDialogProps) => {
	const { email, setIsOpen } = props;
	const [isEdit, setIsEdit] = useState(false);

	const form = useForm<z.infer<typeof editEmailSchema>>({
		resolver: zodResolver(editEmailSchema),
		defaultValues: {
			subject: email?.subject || '',
			message: email?.message || '',
		},
	});

	const resetFormToCurrentEmail = () => {
		if (email) {
			form.setValue('subject', email.subject);
			form.setValue('message', email.message);
		}
	};

	useEffect(() => {
		resetFormToCurrentEmail();
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [email, form]);

	const { isPending: isPendingEditEmail, mutateAsync: editEmail } = useEditEmail({});

	const handleSave = async (data: z.infer<typeof editEmailSchema>) => {
		if (!email) {
			toast.error('No email selected.');
			return;
		}
		await editEmail({
			id: email.id,
			data,
		});
		setIsOpen(false);
	};

	return {
		...props,
		isEdit,
		setIsEdit,
		form,
		handleSave,
		isPendingEditEmail,
		resetFormToCurrentEmail,
	};
};
