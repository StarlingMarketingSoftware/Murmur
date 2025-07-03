'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { useGetApollo } from '@/hooks/queryHooks/useApollo';
import { useCreateContactList } from '@/hooks/queryHooks/useContactLists';
import { Contact, ContactList, EmailVerificationStatus } from '@prisma/client';
import { useEffect, useState, useMemo } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { ColumnDef } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import { Checkbox } from '@/components/ui/checkbox';
import { useGetApollo } from '@/hooks/queryHooks/useApollo';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
});

type FormData = z.infer<typeof formSchema>;

export const useDashboard = () => {
	const columns: ColumnDef<ContactWithName>[] = [
		{
			id: 'select',
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
		},
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

	const tabOptions = [
		{
			label: 'Search',
			value: 'search',
		},
		{
			label: 'Select from List',
			value: 'list',
		},
	];

	const [currentTab, setCurrentTab] = useState<(typeof tabOptions)[number]['value']>(
		tabOptions[0].value
	);

	const router = useRouter();
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
		},
	});

	const [selectedContactListRows, setSelectedContactListRows] = useState<ContactList[]>(
		[]
	);
	const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
	const [activeSearchQuery, setActiveSearchQuery] = useState('');

	const {
		data: contacts,
		isPending: isPendingContacts,
		isLoading: isLoadingContacts,
		error,
		refetch: refetchContacts,
		isRefetching: isRefetchingContacts,
	} = useGetContacts({
		filters: {
			query: activeSearchQuery,
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
	// 		query: activeSearchQuery,
	// 		limit: 5,
	// 	},
	// });

	// Initialize selected contacts when contacts load
	useEffect(() => {
		if (contacts) {
			setSelectedContacts(contacts);
		}
	}, [contacts]);

	const { mutate: createContactList } = useCreateContactList({
		suppressToasts: true,
	});

	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	const onSubmit = async (data: FormData) => {
		console.log('submit');
		setActiveSearchQuery(data.searchText);
		setTimeout(() => {
			refetchContacts();
		}, 0);
	};

	const handleCreateCampaign = async () => {
		const campaign = await createCampaign({
			name: 'New Campaign',
			contactLists: selectedContactListRows.map((row) => row.id),
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
		setSelectedContactListRows,
		handleCreateCampaign,
		isPendingCreateCampaign,
		columns,
		setSelectedContacts,
		selectedContacts,
		isRefetchingContacts,
		activeSearchQuery,
		tabOptions,
		currentTab,
		setCurrentTab,
	};
};
