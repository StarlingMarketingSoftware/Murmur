import { EmailWithRelations } from '@/constants/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ViewEditEmailDialogProps {
	email: EmailWithRelations | null;
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const editEmailSchema = z.object({
	subject: z.string().min(1, { message: 'Subject is required.' }),
	message: z.string().min(1, { message: 'Message is required.' }),
});

export const useViewEditEmailDialog = (props: ViewEditEmailDialogProps) => {
	const { email, setIsOpen } = props;
	const [isEdit, setIsEdit] = useState(false);
	const queryClient = useQueryClient();

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
	}, [email, form]);

	// Mutation for updating emails
	const { isPending: isPendingEditEmail, mutateAsync: editEmail } = useMutation({
		mutationFn: async (data: z.infer<typeof editEmailSchema>) => {
			if (!email?.id) {
				throw new Error('Email ID is required');
			}

			const response = await fetch(`/api/emails/${email.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update email');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['drafts'] });

			toast.success('Email updated successfully');
			setIsEdit(false);
		},
		onError: () => {
			toast.error(`Failed to update email.`);
		},
	});

	const handleSave = async (data: z.infer<typeof editEmailSchema>) => {
		await editEmail(data);
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
