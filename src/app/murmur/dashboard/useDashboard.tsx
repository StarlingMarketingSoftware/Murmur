'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus } from '@/constants/prismaEnums';
import type { UserContactList } from '@prisma/client';
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
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { useMe } from '@/hooks/useMe';
import { StripeSubscriptionStatus } from '@/types';
import { usePageTransition } from '@/contexts/PageTransitionContext';
import {
	canadianProvinceNames,
	canadianProvinceAbbreviations,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useIsMobile } from '@/hooks/useIsMobile';

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
	const { isFreeTrial, user } = useMe() || { isFreeTrial: false, user: null };

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
	const [limit, setLimit] = useState(500);
	const [apolloContacts, setApolloContacts] = useState<ContactWithName[]>([]);
	const [tableInstance, setTableInstance] = useState<Table<ContactWithName>>();
	const [usedContactIdsSet, setUsedContactIdsSet] = useState<Set<number>>(new Set());
	const [hoveredText, setHoveredText] = useState('');
	const [hoveredContact, setHoveredContact] = useState<ContactWithName | null>(null);
	const [isMapView, setIsMapView] = useState(false);
	// Immediate search pending state - set true instantly on search click
	const [isSearchPending, setIsSearchPending] = useState(false);

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

	// Clear search pending state when loading finishes
	useEffect(() => {
		if (!isLoadingContacts && !isRefetchingContacts && isSearchPending) {
			setIsSearchPending(false);
		}
	}, [isLoadingContacts, isRefetchingContacts, isSearchPending]);

	useEffect(() => {
		if (contacts) {
			setSelectedContacts([]);
		}
	}, [contacts]);

	useEffect(() => {
		if (contacts && selectedContacts.length > 0) {
			setIsAllSelected(selectedContacts.length === contacts.length);
		} else {
			setIsAllSelected(false);
		}
	}, [selectedContacts, contacts]);

	useEffect(() => {
		if (hasSearched && activeSearchQuery && activeSearchQuery.trim().length > 0) {
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

		// Set search pending immediately for instant UI feedback
		setIsSearchPending(true);
		// Update search parameters
		setActiveSearchQuery(data.searchText);
		setActiveExcludeUsedContacts(data.excludeUsedContacts ?? false);
		setLimit(500);
		setHasSearched(true);
		setIsMapView(true);
	};

	const handleResetSearch = () => {
		setHasSearched(false);
		setActiveSearchQuery('');
		form.reset();
	};

	const handleSelectAll = (panelContacts?: ContactWithName[]) => {
		if (!contacts || contacts.length === 0) return;

		if (!isMapView && tableInstance) {
			if (isAllSelected) {
				tableInstance.toggleAllRowsSelected(false);
			} else {
				tableInstance.toggleAllRowsSelected(true);
			}
			return;
		}

		// In map view with panel contacts, toggle only the panel contacts
		if (panelContacts && panelContacts.length > 0) {
			const panelContactIds = panelContacts.map((c) => c.id);
			const panelContactIdsSet = new Set(panelContactIds);
			const allPanelSelected = panelContactIds.every((id) =>
				selectedContacts.includes(id)
			);

			if (allPanelSelected) {
				// Deselect only panel contacts, keep other selections
				setSelectedContacts(
					selectedContacts.filter((id) => !panelContactIdsSet.has(id))
				);
			} else {
				// Select all panel contacts, keep existing selections
				const existingNonPanelSelections = selectedContacts.filter(
					(id) => !panelContactIdsSet.has(id)
				);
				setSelectedContacts([...existingNonPanelSelections, ...panelContactIds]);
			}
			return;
		}

		// Fallback: toggle via selectedContacts state for all contacts
		if (isAllSelected) {
			setSelectedContacts([]);
		} else {
			setSelectedContacts(contacts.map((contact) => contact.id));
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

		const generateCampaignName = (searchQuery: string): string => {
			let cleanedQuery = searchQuery.replace(/^\[(booking|promotion)\]\s*/i, '');

			const locationMatch = cleanedQuery.match(/\(([^)]+)\)\s*$/);
			const location = locationMatch ? locationMatch[1] : null;

			cleanedQuery = cleanedQuery.replace(/\s*\([^)]+\)\s*$/, '').trim();

			if (location) {
				return capitalize(`${cleanedQuery} in ${location}`);
			}

			return capitalize(cleanedQuery);
		};

		const defaultName = generateCampaignName(activeSearchQuery);
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
				startTransition(`${urls.murmur.campaign.detail(campaign.id)}?silent=1&origin=search`);
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

	const computeName = useCallback((contact: ContactWithName): string => {
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		return `${firstName} ${lastName}`.trim();
	}, []);

	const contactHasName = useCallback((contact: ContactWithName): boolean => {
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		return firstName.length > 0 || lastName.length > 0;
	}, []);

	const isMobile = useIsMobile();
	const columns = useMemo(() => {
		const allColumns: ColumnDef<ContactWithName>[] = [
			{
				accessorKey: 'company',
				id: 'nameAndCompany',
				header: () => <span className="sr-only">Name</span>,
				cell: ({ row }) => {
					const contact = row.original as ContactWithName;
					const isUsed = usedContactIdsSet.has(contact.id);
					const renderUsedIndicator = () => (
						<span
							className="inline-block shrink-0 mr-2"
							title={isUsed ? 'Used in a previous campaign' : undefined}
							style={{
								width: '16px',
								height: '16px',
								borderRadius: '50%',
								border: '1px solid #000000',
								backgroundColor: '#DAE6FE',
								visibility: isUsed ? 'visible' : 'hidden',
							}}
						/>
					);
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
							<div className="flex items-start gap-2">
								{renderUsedIndicator()}
								<div className="flex flex-col gap-0.5 py-1">
									<div className="truncate">
										<span className="select-none text-gray-300 dark:text-gray-700">
											—
										</span>
									</div>
									<div className="truncate text-sm text-gray-500 dark:text-gray-400">
										&nbsp;
									</div>
								</div>
							</div>
						);
					}

					if (!hasName || !hasCompany) {
						const textToShow = hasName ? nameValue : companyValue;
						if (!hasName && hasCompany) {
							return (
								<div className="flex items-center gap-2">
									{renderUsedIndicator()}
									<div className="flex flex-col justify-center py-1 h-[2.75rem]">
										<div className="truncate font-bold font-inter text-[15px]">
											<TableCellTooltip
												text={textToShow}
												maxLength={MAX_CELL_LENGTH}
												positioning="below-right"
												onHover={handleCellHover}
											/>
										</div>
									</div>
								</div>
							);
						}
						return (
							<div className="flex items-start gap-2">
								{renderUsedIndicator()}
								<div className="flex flex-col gap-0.5 py-1">
									<div className="truncate font-bold font-inter text-[15px]">
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
							</div>
						);
					}

					return (
						<div className="flex items-center gap-2">
							{renderUsedIndicator()}
							<div className="flex flex-col gap-0.5 py-1">
								<div className="truncate font-bold font-inter text-[15px]">
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
						</div>
					);
				},
			},
			{
				accessorKey: 'title',
				size: 250,
				header: () => <span className="sr-only">Title</span>,
				cell: ({ row }) => {
					const text = (row.getValue('title') as string) || '';
					return (
						<div
							className="relative ml-2 title-cell-container overflow-hidden"
							style={{
								width: '230px',
								height: '19px',
								backgroundColor: '#E8EFFF',
								border: '0.7px solid #000000',
								borderRadius: '8px',
							}}
						>
							<div className="h-full w-full flex items-center px-2">
								<ScrollableText
									text={text}
									className="text-[14px] leading-none text-black"
								/>
							</div>
						</div>
					);
				},
			},
			{
				id: 'place',
				size: 180, // Even width distribution
				header: () => <span className="sr-only">Place</span>,
				cell: ({ row }) => {
					const contact = row.original as ContactWithName;
					const fullStateName = (contact.state as string) || '';
					const stateAbbr = getStateAbbreviation(fullStateName) || '';
					const city = (contact.city as string) || '';

					const normalizedState = fullStateName.trim();
					const lowercaseCanadianProvinceNames = canadianProvinceNames.map((s) =>
						s.toLowerCase()
					);
					const isCanadianProvince =
						lowercaseCanadianProvinceNames.includes(normalizedState.toLowerCase()) ||
						canadianProvinceAbbreviations.includes(normalizedState.toUpperCase()) ||
						canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());

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
										<CanadianFlag width="100%" height="100%" className="w-full h-full" />
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
				size: 280,
				header: () => <span className="sr-only">Email</span>,
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

		// Mobile: single-column layout with right-aligned title and location inside the row
		const mobileColumns: ColumnDef<ContactWithName>[] = [
			{
				id: 'mobileContact',
				header: () => <span className="sr-only">Contact</span>,
				cell: ({ row }) => {
					const contact = row.original as ContactWithName;
					const hasName = contactHasName(contact);
					const nameValue = hasName ? computeName(contact) : '';
					const companyValue = contact.company || '';
					const hasCompany = companyValue.length > 0;
					const title = (contact.title as string) || '';
					const fullStateName = (contact.state as string) || '';
					const stateAbbr = getStateAbbreviation(fullStateName) || '';
					const city = (contact.city as string) || '';

					const normalizedState = fullStateName.trim();
					const lowercaseCanadianProvinceNames = canadianProvinceNames.map((s) =>
						s.toLowerCase()
					);
					const isCanadianProvince =
						lowercaseCanadianProvinceNames.includes(normalizedState.toLowerCase()) ||
						canadianProvinceAbbreviations.includes(normalizedState.toUpperCase()) ||
						canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());

					// If neither name nor company, show a dash on the left, hide right-side blocks
					if (!hasName && !hasCompany) {
						return (
							<div className="relative min-h-[44px] flex items-center">
								<span className="select-none text-gray-300 dark:text-gray-700">—</span>
							</div>
						);
					}

					return (
						<div className="relative flex items-center min-h-[44px] py-1.5 !whitespace-normal">
							{/* Left block: name and company with extra right padding to make space for the fixed right block */}
							<div className="flex-1 pl-1 pr-[188px]">
								<div className="flex flex-col gap-0 min-w-0">
									{(hasName || hasCompany) && (
										<div
											className={
												hasName
													? 'truncate font-bold font-primary text-[14px]'
													: 'font-bold font-primary text-[11.5px] leading-[1.15] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] !whitespace-normal'
											}
											style={!hasName ? { wordBreak: 'break-word' } : undefined}
										>
											{hasName ? (
												<TableCellTooltip
													text={nameValue}
													maxLength={MAX_CELL_LENGTH}
													positioning="below-right"
													onHover={handleCellHover}
												/>
											) : (
												<span title={companyValue}>{companyValue}</span>
											)}
										</div>
									)}
									{hasName && hasCompany && (
										<div
											className="text-[10.5px] leading-[1.15] text-gray-500 dark:text-gray-400 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] !whitespace-normal"
											style={{ wordBreak: 'break-word' }}
										>
											<span title={companyValue}>{companyValue}</span>
										</div>
									)}
								</div>
							</div>

							{/* Right block: title pill (top) and location (bottom) */}
							<div className="absolute top-[6px] right-[8px] flex flex-col items-start gap-[2px] w-[152px] pointer-events-none">
								{title && (
									<div
										className="flex items-center justify-start gap-1 h-[12px] w-[152px] rounded-[5.33px] px-2 overflow-hidden"
										style={{
											backgroundColor: '#E8EFFF',
											border: '0.7px solid #000000',
										}}
									>
										<ScrollableText
											text={title}
											className="text-[10.5px] leading-none text-black font-secondary font-medium"
										/>
									</div>
								)}
								{(stateAbbr || city) && (
									<div className="flex items-center justify-start gap-1 h-[14px] w-[152px]">
										{stateAbbr &&
											(isCanadianProvince ? (
												<div
													className="inline-flex items-center justify-center w-[25px] h-[14px] rounded-[4.05px] border overflow-hidden"
													style={{ borderColor: 'rgba(0,0,0,0.7)' }}
													title="Canadian province"
												>
													<CanadianFlag
														width="100%"
														height="100%"
														className="w-full h-full"
													/>
												</div>
											) : /\b[A-Z]{2}\b/.test(stateAbbr) ? (
												<span
													className="inline-flex items-center justify-center w-[25px] h-[14px] rounded-[4.05px] border text-[11.42px] leading-none font-secondary font-normal"
													style={{
														backgroundColor:
															stateBadgeColorMap[stateAbbr] || 'transparent',
														borderColor: 'rgba(0,0,0,0.7)',
													}}
												>
													{stateAbbr}
												</span>
											) : (
												<span
													className="inline-flex items-center justify-center w-[25px] h-[14px] rounded-[4.05px] border"
													style={{ borderColor: 'rgba(0,0,0,0.7)' }}
												/>
											))}
										{city && (
											<div className="truncate text-[10.5px] leading-none font-secondary font-semibold max-w-[115px]">
												{city}
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					);
				},
			},
		];

		return isMobile ? mobileColumns : allColumns;
	}, [contactHasName, computeName, handleCellHover, usedContactIdsSet, isMobile]);

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
		hoveredContact,
		setHoveredContact,
		isMapView,
		setIsMapView,
		isSearchPending,
	};
};
