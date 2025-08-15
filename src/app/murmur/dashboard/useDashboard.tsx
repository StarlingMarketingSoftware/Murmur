'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus, UserContactList } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import {
	useBatchUpdateContacts,
	useGetContacts,
	useGetUsedContactIds,
} from '@/hooks/queryHooks/useContacts';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { ColumnDef, Table } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateApolloContacts } from '@/hooks/queryHooks/useApollo';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { twMerge } from 'tailwind-merge';
import { capitalize } from '@/utils/string';
import { TableCellTooltip } from '@/components/molecules/TableCellTooltip/TableCellTooltip';
import { useMe } from '@/hooks/useMe';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
	excludeUsedContacts: z.boolean().optional().default(true),
	exactMatchesOnly: z.boolean().optional().default(true),
});

type FormData = z.infer<typeof formSchema>;

export const useDashboard = () => {
	/* UI */

	const MAX_CELL_LENGTH = 35;
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
				return (
					<TableCellTooltip text={row.getValue('name')} maxLength={MAX_CELL_LENGTH} />
				);
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				const isUsed = usedContactIdsSet.has(row.original.id);
				return (
					<div className="flex">
						{isUsed ? (
							<Tooltip>
								<TooltipTrigger>
									<div className="text-left bg-secondary/20 px-2 rounded-md">
										{row.getValue('email')}
									</div>
								</TooltipTrigger>
								<TooltipContent side="right">
									This contact has been used in a campaign.
								</TooltipContent>
							</Tooltip>
						) : (
							<div className={twMerge('text-left')}>{row.getValue('email')}</div>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return (
					<TableCellTooltip text={row.getValue('company')} maxLength={MAX_CELL_LENGTH} />
				);
			},
		},
		{
			accessorKey: 'title',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Title" />;
			},
			cell: ({ row }) => {
				return (
					<TableCellTooltip text={row.getValue('title')} maxLength={MAX_CELL_LENGTH} />
				);
			},
		},
		{
			accessorKey: 'city',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="City" />;
			},
			cell: ({ row }) => {
				return (
					<TableCellTooltip text={row.getValue('city')} maxLength={MAX_CELL_LENGTH} />
				);
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
				return (
					<TableCellTooltip text={row.getValue('address')} maxLength={MAX_CELL_LENGTH} />
				);
			},
		},
		{
			accessorKey: 'website',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Website" />;
			},
			cell: ({ row }) => {
				return (
					<TableCellTooltip text={row.getValue('website')} maxLength={MAX_CELL_LENGTH} />
				);
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
			label: 'Contact Lists',
			value: 'list',
		},
	];

	const router = useRouter();
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
			excludeUsedContacts: true,
			exactMatchesOnly: false,
		},
	});

	/* HOOKS */
	const { isFreeTrial } = useMe();
	const [selectedContactListRows, setSelectedContactListRows] = useState<
		UserContactList[]
	>([]);
	const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
	const [activeSearchQuery, setActiveSearchQuery] = useState('');
	const [activeExcludeUsedContacts, setActiveExcludeUsedContacts] = useState(true);
	const [activeExactMatchesOnly, setActiveExactMatchesOnly] = useState(false);
	const [currentTab, setCurrentTab] = useState<TabValue>('search');
	const [limit, setLimit] = useState(50);
	const [apolloContacts, setApolloContacts] = useState<ContactWithName[]>([]);
	const [tableInstance, setTableInstance] = useState<Table<ContactWithName>>();
	const [usedContactIdsSet, setUsedContactIdsSet] = useState<Set<number>>(new Set());

	const {
		data: contacts,
		isPending: isPendingContacts,
		isLoading: isLoadingContacts,
		error,
		refetch: refetchContacts,
		isRefetching: isRefetchingContacts,
		isError,
	} = useGetContacts({
		filters: {
			query: activeSearchQuery,
			verificationStatus:
				process.env.NODE_ENV === 'production'
					? EmailVerificationStatus.valid
					: undefined,
			useVectorSearch: !activeExactMatchesOnly,
			limit,
			excludeUsedContacts: activeExcludeUsedContacts,
		},
		enabled: false,
	});
	const { mutateAsync: importApolloContacts, isPending: isPendingImportApolloContacts } =
		useCreateApolloContacts({});

	// Initialize selected contacts when contacts load
	useEffect(() => {
		if (contacts) {
			setSelectedContacts(contacts.map((contact) => contact.id));
		}
	}, [contacts]);

	// Handle errors
	useEffect(() => {
		if (isError && error) {
			console.error('Contact search error:', error);
			if (error instanceof Error && error.message.includes('timeout')) {
				toast.error('Search timed out after 25 seconds. Please try a more specific search query.');
			} else {
				toast.error('Failed to load contacts. Please try again.');
			}
		}
	}, [isError, error]);

	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({
			suppressToasts: true,
		});

	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	const { mutateAsync: batchUpdateContacts, isPending: isPendingBatchUpdateContacts } =
		useBatchUpdateContacts({
			suppressToasts: true,
		});

	const { data: usedContactIds } = useGetUsedContactIds();

	/* HANDLERS */
	const onSubmit = async (data: FormData) => {
		setActiveSearchQuery(data.searchText);
		setActiveExcludeUsedContacts(data.excludeUsedContacts ?? true);
		setActiveExactMatchesOnly(data.exactMatchesOnly ?? false);
		setLimit(50);
		setTimeout(() => {
			refetchContacts().catch((err) => {
				console.error('Search failed:', err);
				if (err instanceof Error && err.message.includes('timeout')) {
					toast.error('Search timed out. Please try again with a more specific query.');
				} else {
					toast.error('Search failed. Please try again.');
				}
			});
		}, 0);
	};

	const handleCreateCampaign = async () => {
		if (!contacts) return;
		const deselectedContacts = contacts.filter(
			(contact) => !selectedContacts.includes(contact.id)
		);

		const updates = deselectedContacts.map((contact) => ({
			id: contact.id,
			data: {
				manualDeselections: contact.manualDeselections + 1,
			},
		}));

		await batchUpdateContacts({ updates });

		const defaultName = `${capitalize(
			activeSearchQuery
		)} - ${new Date().toLocaleDateString()}`;
		if (currentTab === 'search') {
			const newUserContactList = await createContactList({
				name: defaultName,
				contactIds: selectedContacts,
			});

			const campaign = await createCampaign({
				name: defaultName,
				userContactLists: [newUserContactList.id],
			});

			if (campaign) {
				router.push(urls.murmur.campaign.detail(campaign.id));
			}
		} else if (currentTab === 'list') {
			if (selectedContactListRows.length === 0) {
				toast.error('Please select at least one contact list');
				return;
			}
			const campaign = await createCampaign({
				name: `New Campaign - ${selectedContactListRows[0].name}`,
				userContactLists: selectedContactListRows.map((row) => row.id),
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

	/* EFFECTS */
	useEffect(() => {
		if (usedContactIds) {
			setUsedContactIdsSet(new Set(usedContactIds));
		}
	}, [usedContactIds]);

	return {
		form,
		onSubmit,
		contacts,
		isPendingContacts,
		isLoadingContacts,
		error,
		isError,
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
		setLimit,
		limit,
		tableRef: handleTableRef,
		tableInstance,
		isPendingImportApolloContacts,
		isPendingCreateContactList,
		selectedContactListRows,
		usedContactIdsSet,
		isPendingBatchUpdateContacts,
		isFreeTrial,
	};
};
