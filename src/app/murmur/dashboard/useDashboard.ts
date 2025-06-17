'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetApollo } from '@/hooks/queryHooks/useApollo';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
});

type FormData = z.infer<typeof formSchema>;

export const useDashboard = () => {
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
		},
	});

	const searchText = form.watch('searchText');

	const {
		data: contacts,
		isPending: isPendingContacts,
		isLoading: isLoadingContacts,
		error,
		refetch,
	} = useGetApollo({
		filters: {
			query: searchText,
			limit: 5,
		},
	});
	console.log('🚀 ~ useDashboard ~ data:', contacts);

	const onSubmit = async (data: FormData) => {
		console.log(data);
		await refetch();
	};

	return {
		form,
		onSubmit,
		contacts,
		isPendingContacts,
		isLoadingContacts,
		error,
	};
};
