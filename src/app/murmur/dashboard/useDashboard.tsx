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
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
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

	// Background color map for state badges (to be filled with provided hex codes)
	const stateBadgeColorMap = useMemo(
		() =>
			({
				AL: '#F3D7D7',
				AK: '#D7D7F3',
				AZ: '#E7F307',
				AR: '#F3D7F0',
				CA: '#D7F3EE',
				CO: '#F3E6D7',
				CT: '#DEB7F3',
				DE: '#DBF3D7',
				FL: '#F3D7E0',
				GA: '#D7F3F3',
				HI: '#F1B7F3',
				ID: '#EDF7F3',
				IL: '#D7F3E5',
				IN: '#F3DDD7',
				IA: '#D7D9F3',
				KS: '#E2F3D7',
				KY: '#F3DFA2',
				LA: '#D7F3F3',
				ME: '#F3ECD7',
				MD: '#EDF7F3',
				MA: '#D7F3DC',
				MI: '#F3D7D8',
				MN: '#D7F3E3',
				MS: '#EBF307',
				MO: '#F3D7F3',
				MT: '#D7F3EB',
				NE: '#F3EBD7',
				NV: '#DAD7F3',
				NH: '#DCF3D7',
				NJ: '#DCF3D7',
				NM: '#DCF3C7',
				NY: '#F3F2D7',
				NC: '#EAD7F3',
				ND: '#D7F3E1',
				OH: '#F3D9D7',
				OK: '#D0F3D7',
				OR: '#E5F3D7',
				PA: '#F3D7ED',
				RI: '#D7F3F1',
				SC: '#F3E8D7',
				SD: '#E0F7F3',
				TN: '#D7F3B8',
				TX: '#F3D7DE',
				UT: '#D7E6F3',
				VT: '#EFF3D7',
				VA: '#EDF7F3',
				WA: '#D7F3E7',
				WV: '#F3DFD7',
				WI: '#D7F3F3',
				WY: '#DFF307',
				// Note: DC not provided; add later if needed
				// Unspecified states default to transparent background
			} as Record<string, string>),
		[]
	);

	// Canadian provinces detection (by full name and abbreviation)
	const canadianProvinceNames = useMemo(
		() =>
			new Set(
				[
					'Alberta',
					'British Columbia',
					'Manitoba',
					'New Brunswick',
					'Newfoundland and Labrador',
					'Nova Scotia',
					'Ontario',
					'Prince Edward Island',
					'Quebec',
					'Saskatchewan',
				].map((s) => s.toLowerCase())
			),
		[]
	);
	const canadianProvinceAbbreviations = useMemo(
		() => new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK']),
		[]
	);

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

	// Keep the form input in sync with the active query on results view
	useEffect(() => {
		if (hasSearched) {
			const current = form.getValues('searchText');
			if (activeSearchQuery !== current) {
				form.setValue('searchText', activeSearchQuery, {
					shouldValidate: false,
					shouldDirty: false,
				});
			}
		}
	}, [hasSearched, activeSearchQuery, form]);

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
				header: () => (
					<span className="font-medium font-secondary text-[14px]">Name</span>
				),
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
							<div className="flex flex-col gap-0.5 py-1">
								<div className="truncate">
									<span className="select-none text-gray-300 dark:text-gray-700">—</span>
								</div>
								<div className="truncate text-sm text-gray-500 dark:text-gray-400">
									&nbsp;
								</div>
							</div>
						);
					}

					if (!hasName || !hasCompany) {
						const textToShow = hasName ? nameValue : companyValue;
						if (!hasName && hasCompany) {
							return (
								<div className="flex flex-col justify-center py-1 h-[2.75rem]">
									<div className="truncate font-bold font-primary text-[16px]">
										<TableCellTooltip
											text={textToShow}
											maxLength={MAX_CELL_LENGTH}
											positioning="below-right"
											onHover={handleCellHover}
										/>
									</div>
								</div>
							);
						}
						return (
							<div className="flex flex-col gap-0.5 py-1">
								<div className="truncate font-bold font-primary text-[16px]">
									<TableCellTooltip
										text={textToShow}
										maxLength={MAX_CELL_LENGTH}
										positioning="below-right"
										onHover={handleCellHover}
									/>
								</div>
								<div className="truncate text-sm text-gray-500 dark:text-gray-400">
									&nbsp;
								</div>
							</div>
						);
					}

					return (
						<div className="flex flex-col gap-0.5 py-1">
							<div className="truncate font-bold font-primary text-[16px]">
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
				accessorKey: 'title',
				size: 250, // Even width distribution
				header: () => (
					<span className="font-medium font-secondary text-[14px] ml-2">Title</span>
				),
				cell: ({ row }) => {
					const text = (row.getValue('title') as string) || '';
					return (
						<div
							className="overflow-hidden ml-2"
							style={{
								width: '230px',
								height: '19px',
								backgroundColor: '#E8EFFF',
								border: '0.7px solid #000000',
								borderRadius: '8px',
							}}
						>
							<div className="h-full w-full flex items-center px-2">
								<div className="w-full flex items-center h-full">
									<ScrollableText
										text={text}
										className="text-[14px] leading-none text-black"
									/>
								</div>
							</div>
						</div>
					);
				},
			},
			{
				id: 'place',
				size: 180, // Even width distribution
				header: () => (
					<span className="font-medium font-secondary text-[14px]">Place</span>
				),
				cell: ({ row }) => {
					const contact = row.original as ContactWithName;
					const fullStateName = (contact.state as string) || '';
					const stateAbbr = getStateAbbreviation(fullStateName) || '';
					const city = (contact.city as string) || '';

					const normalizedState = fullStateName.trim();
					const isCanadianProvince =
						canadianProvinceNames.has(normalizedState.toLowerCase()) ||
						canadianProvinceAbbreviations.has(normalizedState.toUpperCase()) ||
						canadianProvinceAbbreviations.has(stateAbbr.toUpperCase());

					if (!stateAbbr && !city) {
						return (
							<div className="flex items-center gap-2">
								<span className="select-none text-gray-300 dark:text-gray-700">—</span>
							</div>
						);
					}

					return (
						<div className="flex items-center gap-2">
							{stateAbbr &&
								(isCanadianProvince ? (
									<div
										className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border overflow-hidden"
										style={{ borderColor: 'rgba(0,0,0,0.7)' }}
										title="Canadian province"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 9600 4800"
											className="w-full h-full"
											preserveAspectRatio="xMidYMid slice"
										>
											<title>Flag of Canada</title>
											<path
												fill="#f00"
												d="m0 0h2400l99 99h4602l99-99h2400v4800h-2400l-99-99h-4602l-99 99H0z"
											/>
											<path
												fill="#fff"
												d="m2400 0h4800v4800h-4800zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
											/>
										</svg>
									</div>
								) : /\b[A-Z]{2}\b/.test(stateAbbr) ? (
									<span
										className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
										style={{
											backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
											borderColor: 'rgba(0,0,0,0.7)',
										}}
									>
										{stateAbbr}
									</span>
								) : (
									<span
										className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border"
										style={{ borderColor: 'rgba(0,0,0,0.7)' }}
									/>
								))}
							{city && (
								<TableCellTooltip
									text={city}
									maxLength={MAX_CELL_LENGTH}
									positioning="below-right"
									onHover={handleCellHover}
								/>
							)}
						</div>
					);
				},
			},
			{
				accessorKey: 'email',
				size: 280, // Even width distribution
				header: () => (
					<span className="font-medium font-secondary text-[14px]">Email</span>
				),
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
	}, [
		contactHasName,
		computeName,
		handleCellHover,
		stateBadgeColorMap,
		canadianProvinceNames,
		canadianProvinceAbbreviations,
	]);

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
