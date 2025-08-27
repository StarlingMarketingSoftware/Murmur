'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus, UserContactList } from '@prisma/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { urls } from '@/constants/urls';
import {
	useBatchUpdateContacts,
	useGetContacts,
	useGetUsedContactIds,
} from '@/hooks/queryHooks/useContacts';
import { ColumnDef, Table } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import { useCreateApolloContacts } from '@/hooks/queryHooks/useApollo';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { toast } from 'sonner';

import { capitalize, getStateAbbreviation } from '@/utils/string';
import { TableCellTooltip } from '@/components/molecules/TableCellTooltip/TableCellTooltip';
import { useMe } from '@/hooks/useMe';
import { StripeSubscriptionStatus } from '@/types';
import { usePageTransition } from '@/contexts/PageTransitionContext';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
	excludeUsedContacts: z.boolean().optional().default(false),
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

	const { startTransition } = usePageTransition();
	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			searchText: '',
			excludeUsedContacts: false,
		},
	});

	/* HOOKS */
	// useMe will return undefined values for unauthenticated users
	const { isFreeTrial, user } = useMe() || { isFreeTrial: false, user: null };

	// User can search if they have an active subscription OR are on a free trial
	const canSearch =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const [selectedContactListRows, setSelectedContactListRows] = useState<
		UserContactList[]
	>([]);
	const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
	const [isAllSelected, setIsAllSelected] = useState(false);
	const [activeSearchQuery, setActiveSearchQuery] = useState('');
	const [activeExcludeUsedContacts, setActiveExcludeUsedContacts] = useState(false);
	const [currentTab, setCurrentTab] = useState<TabValue>('search');
	const [limit, setLimit] = useState(50);
	const [apolloContacts, setApolloContacts] = useState<ContactWithName[]>([]);
	const [tableInstance, setTableInstance] = useState<Table<ContactWithName>>();
	const [usedContactIdsSet, setUsedContactIdsSet] = useState<Set<number>>(new Set());
	const [hoveredText, setHoveredText] = useState('');

	const {
		data: contacts,
		isPending: isPendingContacts,
		isLoading: isLoadingContacts,
		error,
		isRefetching: isRefetchingContacts,
		isError,
	} = useGetContacts({
		filters: {
			query: activeSearchQuery,
			verificationStatus:
				process.env.NODE_ENV === 'production' ? EmailVerificationStatus.valid : undefined,
			useVectorSearch: true,
			limit,
			excludeUsedContacts: activeExcludeUsedContacts,
		},
		enabled: hasSearched && !!activeSearchQuery && activeSearchQuery.trim().length > 0,
	});
	const { mutateAsync: importApolloContacts, isPending: isPendingImportApolloContacts } =
		useCreateApolloContacts({});

	// Initialize selected contacts as empty (no contacts selected by default)
	useEffect(() => {
		if (contacts) {
			setSelectedContacts([]); // Start with no contacts selected
		}
	}, [contacts]);

	// Watch for changes in selectedContacts to update isAllSelected
	useEffect(() => {
		if (contacts && selectedContacts.length > 0) {
			setIsAllSelected(selectedContacts.length === contacts.length);
		} else {
			setIsAllSelected(false);
		}
	}, [selectedContacts, contacts]);

	// Trigger search when parameters change
	useEffect(() => {
		if (hasSearched && activeSearchQuery && activeSearchQuery.trim().length > 0) {
			// Query should automatically run when enabled
			console.log('Search triggered with query:', activeSearchQuery);
		}
	}, [hasSearched, activeSearchQuery, activeExcludeUsedContacts, limit]);

	useEffect(() => {
		if (isError && error && hasSearched && activeSearchQuery) {
			console.error('Contact search error details:', {
				error,
				message: error instanceof Error ? error.message : 'Unknown error',
				query: activeSearchQuery,
				filters: {
					excludeUsedContacts: activeExcludeUsedContacts,
					limit,
				},
			});
			if (error instanceof Error && error.message.includes('timeout')) {
				toast.error(
					'Search timed out after 25 seconds. Please try a more specific search query.'
				);
			} else if (error instanceof Error) {
				toast.error(`Search failed: ${error.message}`);
			} else {
				toast.error('Failed to load contacts. Please try again.');
			}
		}
	}, [isError, error, hasSearched, activeSearchQuery, activeExcludeUsedContacts, limit]);

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
		setActiveExcludeUsedContacts(data.excludeUsedContacts ?? false);
		setLimit(50);
		setHasSearched(true);
		// The query will automatically run when the state updates enable it
	};

	const handleResetSearch = () => {
		setHasSearched(false);
		setActiveSearchQuery('');
		form.reset();
	};

	const handleSelectAll = () => {
		if (!contacts || !tableInstance) return;

		if (isAllSelected) {
			tableInstance.toggleAllRowsSelected(false);
		} else {
			tableInstance.toggleAllRowsSelected(true);
		}
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

		const defaultName = capitalize(activeSearchQuery);
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
				startTransition(`${urls.murmur.campaign.detail(campaign.id)}?silent=1`);
			}
		} else if (currentTab === 'list') {
			if (selectedContactListRows.length === 0) {
				toast.error('Please select at least one contact list');
				return;
			}
			const campaign = await createCampaign({
				name: selectedContactListRows[0].name,
				userContactLists: selectedContactListRows.map((row) => row.id),
			});
			if (campaign) {
				startTransition(`${urls.murmur.campaign.detail(campaign.id)}?silent=1`);
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

	const handleCellHover = useCallback((text: string | null) => {
		setHoveredText(text || '');
	}, []);

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

	// Build columns for the table
	const columns = useMemo(() => {
		const allColumns: ColumnDef<ContactWithName>[] = [
			{
				accessorKey: 'company',
				id: 'nameAndCompany',
				size: 200,
				header: () => <span className="font-bold">Name / Company</span>,
				cell: ({ row }) => {
					const contact = row.original as ContactWithName;
					// Compute name from firstName and lastName fields
					const hasName = contactHasName(contact);
					const nameValue = hasName ? computeName(contact) : '';
					const companyValue = contact.company || '';
					const hasCompany = !!companyValue;

					// Debug log to see actual data
					if (row.index === 0) {
						console.log('First contact data:', {
							contact,
							firstName: contact.firstName,
							lastName: contact.lastName,
							hasName,
							nameValue,
							company: contact.company,
							hasCompany,
						});
					}

					// If neither name nor company, show a dash
					if (!hasName && !hasCompany) {
						return (
							<div className="flex items-center h-full">
								<span className="select-none text-gray-300 dark:text-gray-700">—</span>
							</div>
						);
					}

					// If only name or only company, show in regular size
					if (!hasName || !hasCompany) {
						const textToShow = hasName ? nameValue : companyValue;
						return (
							<div className="flex items-center h-full">
								<TableCellTooltip
									text={textToShow}
									maxLength={MAX_CELL_LENGTH}
									positioning="below-right"
									onHover={handleCellHover}
								/>
							</div>
						);
					}

					// Both name and company present - show name first, company second in smaller font
					return (
						<div className="flex flex-col gap-0.5 py-1">
							<div className="truncate">
								<TableCellTooltip
									text={nameValue}
									maxLength={MAX_CELL_LENGTH}
									positioning="below-right"
									onHover={handleCellHover}
								/>
							</div>
							<div className="truncate text-sm text-gray-500 dark:text-gray-400">
								<TableCellTooltip
									text={companyValue}
									maxLength={MAX_CELL_LENGTH}
									positioning="below-right"
									onHover={handleCellHover}
								/>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'city',
				size: 150,
				header: () => <span className="font-bold">City</span>,
				cell: ({ row }) => {
					return (
						<TableCellTooltip
							text={row.getValue('city')}
							maxLength={MAX_CELL_LENGTH}
							positioning="below-right"
							onHover={handleCellHover}
						/>
					);
				},
			},
			{
				accessorKey: 'state',
				size: 150,
				header: () => <span className="font-bold">State</span>,
				cell: ({ row }) => {
					const fullStateName = row.getValue('state') as string;
					const stateAbbr = getStateAbbreviation(fullStateName);
					return (
						<TableCellTooltip
							text={stateAbbr}
							maxLength={MAX_CELL_LENGTH}
							positioning="below-right"
							onHover={handleCellHover}
						/>
					);
				},
			},
			{
				accessorKey: 'title',
				size: 150,
				header: () => <span className="font-bold">Description</span>,
				cell: ({ row }) => {
					return (
						<TableCellTooltip
							text={row.getValue('title')}
							maxLength={MAX_CELL_LENGTH}
							positioning="below-left"
							onHover={handleCellHover}
						/>
					);
				},
			},
			{
				accessorKey: 'email',
				size: 150,
				header: () => <span className="font-bold">Email</span>,
				cell: ({ row }) => {
					const email = (row.getValue('email') as string) || '';
					return (
						<div className="text-left whitespace-nowrap overflow-visible relative">
							<span className="email-obfuscated-local inline-block">{email}</span>
						</div>
					);
				},
			},
		];

		return allColumns;
	}, [contactHasName, computeName, handleCellHover]);

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
		handleSelectAll,
		isAllSelected,
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
		canSearch,
		hasSearched,
		handleResetSearch,
		hoveredText,
	};
};
