'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { useGetApollo } from '@/hooks/queryHooks/useApollo';
import { useCreateContactList } from '@/hooks/queryHooks/useContactLists';
import { Contact, ContactList, EmailVerificationStatus } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { ColumnDef } from '@tanstack/react-table';

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
	const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
	console.log('🚀 ~ useDashboard ~ selectedContacts:', selectedContacts);
	const searchText = form.watch('searchText');

	const {
		data: contacts,
		isPending: isPendingContacts,
		isLoading: isLoadingContacts,
		error,
		refetch,
	} = useGetContacts({
		filters: {
			query: searchText,
			verificationStatus: EmailVerificationStatus.valid,
			useVectorSearch: true,
			limit: 100,
		},
		enabled: false,
	});
	// const {
	// 	data: apolloContacts,
	// 	isPending: isPendingApolloContacts,
	// 	isLoading: isLoadingApolloContacts,
	// 	error: apolloError,
	// 	refetch: apolloRefetch,
	// } = useGetApollo({
	// 	filters: {
	// 		query: searchText,
	// 		limit: 5,
	// 	},
	// });

	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('email')}</div>;
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('company')}</div>;
			},
		},
		{
			accessorKey: 'title',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Title" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('title')}</div>;
			},
		},
		{
			accessorKey: 'city',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="City" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('city')}</div>;
			},
		},
		{
			accessorKey: 'state',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="State" />;
			},
		},
		{
			accessorKey: 'country',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Country" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('country')}</div>;
			},
		},
		{
			accessorKey: 'address',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Address" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('address')}</div>;
			},
		},
		{
			accessorKey: 'website',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Website" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('website')}</div>;
			},
		},
	];

	const { mutate: createContactList } = useCreateContactList({
		suppressToasts: true,
	});

	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	const onSubmit = async (data: FormData) => {
		await refetch();
		// createContactList({
		// 	name: data.searchText,
		// 	contactIds: contacts?.map((contact) => contact.id) || [],
		// });
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

	// useEffect(() => {

	// 	setSelectedContacts(contacts || []);
	// }, [contacts]);

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
		columns,
		setSelectedContacts,
		selectedContacts,
	};
};
