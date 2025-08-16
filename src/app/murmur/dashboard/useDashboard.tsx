'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus, UserContactList } from '@prisma/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import {
	useBatchUpdateContacts,
	useGetContacts,
	useGetUsedContactIds,
} from '@/hooks/queryHooks/useContacts';
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
	const [hasSearched, setHasSearched] = useState(false);

	const MAX_CELL_LENGTH = 35;

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
		refetch: refetchContacts,  // eslint-disable-line @typescript-eslint/no-unused-vars
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
		enabled: hasSearched && !!activeSearchQuery && activeSearchQuery.trim().length > 0,
	});
	const { mutateAsync: importApolloContacts, isPending: isPendingImportApolloContacts } =
		useCreateApolloContacts({});

	// Initialize selected contacts when contacts load
	useEffect(() => {
		if (contacts) {
			setSelectedContacts(contacts.map((contact) => contact.id));
		}
	}, [contacts]);

	// Trigger search when parameters change
	useEffect(() => {
		if (hasSearched && activeSearchQuery && activeSearchQuery.trim().length > 0) {
			// Query should automatically run when enabled
			console.log('Search triggered with query:', activeSearchQuery);
		}
	}, [hasSearched, activeSearchQuery, activeExcludeUsedContacts, activeExactMatchesOnly, limit]);

	// Handle errors
	useEffect(() => {
		// Only show error if we've actually searched (not on initial load)
		if (isError && error && hasSearched && activeSearchQuery) {
			console.error('Contact search error details:', {
				error,
				message: error instanceof Error ? error.message : 'Unknown error',
				query: activeSearchQuery,
				filters: {
					excludeUsedContacts: activeExcludeUsedContacts,
					exactMatchesOnly: activeExactMatchesOnly,
					limit,
				}
			});
			if (error instanceof Error && error.message.includes('timeout')) {
				toast.error('Search timed out after 25 seconds. Please try a more specific search query.');
			} else if (error instanceof Error) {
				toast.error(`Search failed: ${error.message}`);
			} else {
				toast.error('Failed to load contacts. Please try again.');
			}
		}
	}, [isError, error, hasSearched, activeSearchQuery, activeExcludeUsedContacts, activeExactMatchesOnly, limit]);

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
		// Validate search query
		if (!data.searchText || data.searchText.trim().length === 0) {
			toast.error('Please enter a search query');
			return;
		}
		
		// Update search parameters
		setActiveSearchQuery(data.searchText);
		setActiveExcludeUsedContacts(data.excludeUsedContacts ?? true);
		setActiveExactMatchesOnly(data.exactMatchesOnly ?? false);
		setLimit(50);
		setHasSearched(true);
		// The query will automatically run when the state updates enable it
	};

	const handleResetSearch = () => {
		setHasSearched(false);
		setActiveSearchQuery('');
		form.reset();
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

	// Helper function to compute name from firstName and lastName
	const computeName = useCallback((contact: ContactWithName): string => {
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		return `${firstName} ${lastName}`.trim();
	}, []);
	
	// Helper to check if a contact has a name
	const contactHasName = useCallback((contact: ContactWithName): boolean => {
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		return firstName.length > 0 || lastName.length > 0;
	}, []);

	// Since pagination is disabled, check if majority of contacts have names
	const visibleRowsHaveNames = useMemo(() => {
		if (!contacts || contacts.length === 0) return false;
		
		// Check what percentage of contacts have names
		const contactsWithNames = contacts.filter(contact => contactHasName(contact));
		const ratio = contactsWithNames.length / contacts.length;
		const threshold = 0.7; // 70% threshold for header to be fully visible
		
		console.log('🎨 Name column fade effect:', {
			totalContacts: contacts.length,
			contactsWithNames: contactsWithNames.length,
			percentage: (ratio * 100).toFixed(1) + '%',
			headerStatus: ratio > threshold ? '✅ VISIBLE' : '🌫️ FADED',
			threshold: (threshold * 100) + '%'
		});
		
		return ratio > threshold; // Header is visible if more than 70% have names
	}, [contacts, contactHasName]);

	// Dynamically build columns based on whether names exist in contacts
	const columns = useMemo(() => {
		// Check if any contact has a firstName or lastName
		const hasNames = contacts && contacts.length > 0 && 
			contacts.some(contact => contactHasName(contact));
		
		const allColumns: ColumnDef<ContactWithName>[] = [
			{
				id: 'select',
				size: 50,
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
				accessorKey: 'company',
				size: 150,
				header: () => <span className="font-bold">Company</span>,
				cell: ({ row }) => {
					return (
						<div className="truncate">
							<TableCellTooltip text={row.getValue('company')} maxLength={MAX_CELL_LENGTH} />
						</div>
					);
				},
			},
			{
				accessorKey: 'email',
				size: 150,
				header: () => <span className="font-bold">Email</span>,
				cell: ({ row }) => {
					const isUsed = usedContactIdsSet.has(row.original.id);
					return (
						<div className="flex truncate">
							{isUsed ? (
								<Tooltip>
									<TooltipTrigger>
										<div className="text-left bg-secondary/20 px-2 rounded-md truncate">
											{row.getValue('email')}
										</div>
									</TooltipTrigger>
									<TooltipContent side="right">
										This contact has been used in a campaign.
									</TooltipContent>
								</Tooltip>
							) : (
								<div className={twMerge('text-left truncate')}>{row.getValue('email')}</div>
							)}
						</div>
					);
				},
			},
			// Name column - conditionally included (always show if ANY contact has names)
			...(hasNames ? [{
				accessorKey: 'firstName' as const,  // Use firstName as key but display computed name
				id: 'name',  // Custom id for the column
				size: 150,
				header: () => {
					return (
						<span 
							className={`font-bold transition-all duration-700 ease-in-out ${
								visibleRowsHaveNames 
									? 'text-black dark:text-white' 
									: 'text-gray-300 dark:text-gray-600'
							}`}
							style={{ 
								opacity: visibleRowsHaveNames ? 1 : 0.25,
								transform: visibleRowsHaveNames ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(2px)',
								filter: visibleRowsHaveNames ? 'blur(0px)' : 'blur(0.5px)'
							}}
							title={visibleRowsHaveNames 
								? 'Most contacts have names' 
								: 'Most contacts lack names - column faded'}
						>
							Name
						</span>
					);
				},
				cell: ({ row }: any) => {
					const contact = row.original as ContactWithName;
					const hasName = contactHasName(contact);
					const nameValue = hasName ? computeName(contact) : '';
					return (
						<div 
							className={`truncate transition-all duration-500 ease-in-out hover:scale-105 ${
								hasName 
									? 'text-black dark:text-white' 
									: 'text-gray-300 dark:text-gray-700'
							}`}
							style={{
								opacity: hasName ? 1 : 0.2,
								transform: hasName ? 'scale(1)' : 'scale(0.85)',
							}}
						>
							{hasName ? (
								<TableCellTooltip text={nameValue} maxLength={MAX_CELL_LENGTH} />
							) : (
								<span className="select-none">—</span>
							)}
						</div>
					);
				},
			}] : []),
			{
				accessorKey: 'city',
				size: 150,
				header: () => <span className="font-bold">City</span>,
				cell: ({ row }) => {
					return (
						<div className="truncate">
							<TableCellTooltip text={row.getValue('city')} maxLength={MAX_CELL_LENGTH} />
						</div>
					);
				},
			},
			{
				accessorKey: 'state',
				size: 150,
				header: () => <span className="font-bold">State</span>,
				cell: ({ row }) => {
					return <div className="text-left truncate">{row.getValue('state')}</div>;
				},
			},
			{
				accessorKey: 'title',
				size: 150,
				header: () => <span className="font-bold">Description</span>,
				cell: ({ row }) => {
					return (
						<div className="truncate">
							<TableCellTooltip text={row.getValue('title')} maxLength={MAX_CELL_LENGTH} />
						</div>
					);
				},
			}
		];

		return allColumns;
	}, [contacts, usedContactIdsSet, visibleRowsHaveNames, contactHasName, computeName, MAX_CELL_LENGTH]);

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
		hasSearched,
		handleResetSearch,
	};
};
