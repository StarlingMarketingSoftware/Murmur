'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetApollo } from '@/hooks/queryHooks/useApollo';
import { useCreateContactList } from '@/hooks/queryHooks/useContactLists';
import { ContactList } from '@prisma/client';
import { useState } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
});

type FormData = z.infer<typeof formSchema>;

export const useDashboard = () => {
	const router = useRouter();
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
		},
	});

	const [selectedRows, setSelectedRows] = useState<ContactList[]>([]);
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

	const { mutate: createContactList } = useCreateContactList({
		suppressToasts: true,
	});
	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	const onSubmit = async (data: FormData) => {
		await refetch();
		createContactList({
			name: data.searchText,
			contactIds: contacts?.map((contact) => contact.id) || [],
		});
	};

	const handleCreateCampaign = async () => {
		const campaign = await createCampaign({
			name: 'New Campaign',
			contactLists: selectedRows.map((row) => row.id),
		});
		if (campaign) {
			router.push(urls.murmur.campaign.detail(campaign.id));
		}
	};

	return {
		form,
		onSubmit,
		contacts,
		isPendingContacts,
		isLoadingContacts,
		error,
		setSelectedRows,
		handleCreateCampaign,
		isPendingCreateCampaign,
	};
};
