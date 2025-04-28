import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { useCreateContactList } from '@/hooks/useContactLists';

const createContactListSchema = z.object({
	name: z.string().min(1, { message: 'Contact list name is required.' }),
});

export const useCreateContactListDialog = () => {
	const [open, setOpen] = useState(false);

	const form = useForm<z.infer<typeof createContactListSchema>>({
		resolver: zodResolver(createContactListSchema),
		defaultValues: {
			name: '',
		},
	});

	const { mutateAsync: createContactList, isPending } = useCreateContactList();

	const onSubmit = async (values: z.infer<typeof createContactListSchema>) => {
		const res = await createContactList(values);
		if (res) {
			form.reset();
			setOpen(false);
		}
	};

	return { form, onSubmit, isPending, open, setOpen };
};
