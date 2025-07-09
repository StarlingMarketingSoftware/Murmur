'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ContactList, EmailVerificationStatus } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { ColumnDef, Table } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateApolloContacts } from '@/hooks/queryHooks/useApollo';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
});

type FormData = z.infer<typeof formSchema>;

export const useDashboard = () => {
	/* UI */
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

	type TabValue = 'search' | 'list';
	type TabOption = {
		label: string;
		value: TabValue;
	};

	const tabOptions: TabOption[] = [
		{
			label: 'Search',
			value: 'search',
		},
		{
			label: 'Select from List',
			value: 'list',
		},
	];

	const router = useRouter();
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
		},
	});

	/* HOOKS */
	const [selectedContactListRows, setSelectedContactListRows] = useState<ContactList[]>(
		[]
	);
	const [selectedContacts, setSelectedContacts] = useState<ContactWithName[]>([]);
	const [activeSearchQuery, setActiveSearchQuery] = useState('');
	const [currentTab, setCurrentTab] = useState<TabValue>('search');

	const [apolloContacts, setApolloContacts] = useState<ContactWithName[]>([]);
	const [tableInstance, setTableInstance] = useState<Table<ContactWithName>>();

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

	const { mutateAsync: importApolloContacts, isPending: isPendingImportApolloContacts } =
		useCreateApolloContacts({});

	// Initialize selected contacts when contacts load
	useEffect(() => {
		if (contacts && apolloContacts) {
			setSelectedContacts([...contacts, ...apolloContacts]);
		}
	}, [contacts, apolloContacts]);

	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({
			suppressToasts: true,
		});

	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	/* HANDLERS */
	const onSubmit = async (data: FormData) => {
		setActiveSearchQuery(data.searchText);
		setTimeout(() => {
			refetchContacts();
		}, 0);
	};

	const handleCreateCampaign = async () => {
		const defaultName = `${activeSearchQuery} - ${new Date().toLocaleDateString()}`;
		if (currentTab === 'search') {
			const newUserContactList = await createContactList({
				name: defaultName,
				contactIds: selectedContacts.map((contact) => contact.id),
			});

			const campaign = await createCampaign({
				name: defaultName,
				userContactLists: [newUserContactList.id],
			});

			if (campaign) {
				router.push(urls.murmur.campaign.detail(campaign.id));
			}
		} else if (currentTab === 'list') {
			const campaign = await createCampaign({
				name: 'New Campaign',
				contactLists: selectedContactListRows.map((row) => row.id),
			});
			if (campaign) {
				router.push(urls.murmur.campaign.detail(campaign.id));
			}
		}
	};

	const handleImportApolloContacts = async () => {
		const newApolloContacts = await importApolloContacts({
			query: activeSearchQuery,
			limit: 1,
		});
		setApolloContacts([...apolloContacts, ...newApolloContacts]);
	};

	const handleTableRef = (table: Table<ContactWithName>) => {
		setTableInstance(table);
	};

	return {
		apolloContacts,
		form,
		onSubmit,
		contacts,
		isPendingContacts,
		isLoadingContacts,
		error,
		handleImportApolloContacts,
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
		tableRef: handleTableRef,
		tableInstance,
		isPendingImportApolloContacts,
		isPendingCreateContactList,
	};
};
