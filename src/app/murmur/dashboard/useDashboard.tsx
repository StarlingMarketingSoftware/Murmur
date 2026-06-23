'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus } from '@/constants/prismaEnums';
import type { UserContactList } from '@prisma/client';
import {
	useEffect,
	useState,
	useMemo,
	useCallback,
	useReducer,
	useRef,
	type SetStateAction,
} from 'react';
import {
	CampaignApiError,
	type CampaignListItem,
	fetchCampaignsList,
	getCampaignsListQueryKey,
	useActiveCampaign,
	useCreateCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useQueryClient } from '@tanstack/react-query';
import { urls } from '@/constants/urls';
import {
	useBatchUpdateContacts,
	useCuratedContactsSearch,
	useFreeTextContactsSearch,
	useGetContacts,
	useGetUsedContactIds,
	type CuratedSearchResult,
} from '@/hooks/queryHooks/useContacts';
import { ColumnDef, Table } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import {
	BOOKING_CONTACT_TITLE_PREFIXES,
	PROMOTION_CONTACT_TITLE_PREFIXES,
} from '@/constants/contactCategories';
import { useCreateApolloContacts } from '@/hooks/queryHooks/useApollo';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { toast } from 'sonner';

import { getStateAbbreviation } from '@/utils/string';
import { buildProfileSig } from '@/utils/profileSignals';
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
import { generateCampaignName } from '@/utils/campaignNames';
import { markAfterPaint, markPerf } from '@/utils/perfMarks';
// The search-result localStorage cache, its arg types/normalizers, and the speculative
// curated-fetch slot live in searchResultCache.ts so the campaign page's Search-tab
// prefetch can share them without dragging in this hook.
import {
	CURATED_CACHE_KEY_PREFIX,
	FREETEXT_CACHE_KEY_PREFIX,
	curatedArgsEqual,
	findSearchCacheEntry,
	freeTextArgsEqual,
	normalizeCuratedArgs,
	normalizeFreeTextArgs,
	isSpeculativeCuratedFetchFresh,
	readSearchCache,
	searchCacheKey,
	speculativeCuratedSlot,
	toCuratedArgs,
	writeSearchCacheEntry,
	type CuratedOverrides,
	type CuratedSearchArgs,
	type FreeTextSearchArgs,
} from './searchResultCache';

const formSchema = z.object({
	searchText: z.string().min(1, 'Search text is required'),
	excludeUsedContacts: z.boolean().optional().default(false),
});

type FormData = z.infer<typeof formSchema>;

export const DASHBOARD_SEARCH_SELECTION_LIMIT = 50;

export const clampContactIdsToSelectionLimit = (
	contactIds: readonly number[],
	limit = DASHBOARD_SEARCH_SELECTION_LIMIT
): number[] => {
	const next: number[] = [];
	const seen = new Set<number>();

	for (const id of contactIds) {
		if (seen.has(id)) continue;
		if (next.length >= limit) break;
		seen.add(id);
		next.push(id);
	}

	return next;
};

export const mergeContactIdsWithSelectionLimit = (
	existingContactIds: readonly number[],
	candidateContactIds: readonly number[],
	limit = DASHBOARD_SEARCH_SELECTION_LIMIT
): number[] =>
	clampContactIdsToSelectionLimit(
		[...existingContactIds, ...candidateContactIds],
		limit
	);

export const getSelectionLimitedContactIds = (
	existingContactIds: readonly number[],
	candidateContactIds: readonly number[],
	limit = DASHBOARD_SEARCH_SELECTION_LIMIT
): number[] => {
	const selectedSet = new Set(
		mergeContactIdsWithSelectionLimit(existingContactIds, candidateContactIds, limit)
	);
	const acceptedIds: number[] = [];
	const seen = new Set<number>();

	for (const id of candidateContactIds) {
		if (seen.has(id) || !selectedSet.has(id)) continue;
		seen.add(id);
		acceptedIds.push(id);
	}

	return acceptedIds;
};

// Shallow order-insensitive equality for selection id lists, used to avoid pushing
// no-op selection changes onto the undo history.
const areContactIdListsEqual = (
	a: readonly number[],
	b: readonly number[]
): boolean => {
	if (a === b) return true;
	if (a.length !== b.length) return false;
	const seen = new Set<number>(a);
	for (const id of b) {
		if (!seen.has(id)) return false;
	}
	return true;
};

// Undo-aware selection store. `current` is the live selection; `past` is the stack of
// prior selections (most recent last). A normal "set" pushes the previous value onto
// `past`; "undo" pops the most recent entry back into `current`.
type SelectionState = {
	current: number[];
	past: number[][];
};

type SelectionAction =
	| { type: 'set'; value: SetStateAction<number[]> }
	| { type: 'undo' };

// Cap the undo history so long selection sessions can't grow memory unbounded.
const SELECTION_HISTORY_LIMIT = 50;

const selectionReducer = (
	state: SelectionState,
	action: SelectionAction
): SelectionState => {
	switch (action.type) {
		case 'set': {
			const resolved =
				typeof action.value === 'function'
					? (action.value as (prev: number[]) => number[])(state.current)
					: action.value;
			const next = clampContactIdsToSelectionLimit(resolved);
			// Ignore no-op writes so they don't pollute the undo stack (and so the
			// undo button stays accurate after redundant re-selections).
			if (areContactIdListsEqual(next, state.current)) return state;
			const past = [...state.past, state.current];
			if (past.length > SELECTION_HISTORY_LIMIT) past.shift();
			return { current: next, past };
		}
		case 'undo': {
			if (state.past.length === 0) return state;
			const past = state.past.slice(0, -1);
			const current = state.past[state.past.length - 1];
			return { current, past };
		}
		default:
			return state;
	}
};

const getRandomSearchResultLimit = (): number =>
	Math.floor(Math.random() * 21) + 30;

const isTimeoutError = (error: unknown): boolean =>
	error instanceof Error && /\b(timeout|timed\s*out)\b/i.test(error.message);

const FREE_TEXT_FALLBACK_CURATED_CATEGORY = '_freetext';

const FREE_TEXT_QUERY_CATEGORY_HINTS: Array<[RegExp, string]> = [
	[/\bradio stations?\b|\bcollege radio\b/i, 'Radio Stations'],
	[/\bcoffee shops?\b|\bcaf[eé]s?\b|\bespresso\b/i, 'Coffee Shops'],
	[/\brestaurants?\b|\bbistros?\b|\bdiners?\b|\beatery\b/i, 'Restaurants'],
	[/\bmusic festivals?\b|\bfestivals?\b/i, 'Music Festivals'],
	[/\bwedding venues?\b/i, 'Wedding Venues'],
	[/\bwedding planners?\b/i, 'Wedding Planners'],
	[
		/\bwiner(y|ies)\b|\bvineyards?\b|\bbrewer(y|ies)\b|\bdistiller(y|ies)\b|\bcider(y|ies)\b|\bwine\b|\bbeer\b|\bspirits?\b/i,
		'Wine, Beer, and Spirits',
	],
	[/\bmusic venues?\b|\bvenues?\b|\bconcert halls?\b|\bclubs?\b|\bbars?\b/i, 'Music Venues'],
];

const FREE_TEXT_CONTACT_TITLE_PREFIXES = [
	...BOOKING_CONTACT_TITLE_PREFIXES,
	...PROMOTION_CONTACT_TITLE_PREFIXES,
] as const;

type FreeTextSearchContact = ContactWithName & {
	searchCategoryMatch?: string | null;
};

const inferFreeTextCategoryFromQuery = (query: string): string | null => {
	const trimmed = query.trim();
	if (!trimmed) return null;
	return FREE_TEXT_QUERY_CATEGORY_HINTS.find(([pattern]) => pattern.test(trimmed))?.[1] ?? null;
};

const normalizeFreeTextContactCategory = (category: string | null | undefined): string | null => {
	const trimmed = category?.trim();
	if (!trimmed) return null;
	return trimmed === 'College Radio' ? 'Radio Stations' : trimmed;
};

const inferFreeTextCategoryFromContact = (contact: FreeTextSearchContact): string | null => {
	const explicitMatch = normalizeFreeTextContactCategory(contact.searchCategoryMatch);
	if (explicitMatch) return explicitMatch;

	const title = contact.title?.trim();
	if (!title) return null;
	const titleLower = title.toLowerCase();
	const prefix = FREE_TEXT_CONTACT_TITLE_PREFIXES.find((candidate) =>
		titleLower.startsWith(candidate.toLowerCase())
	);
	return normalizeFreeTextContactCategory(prefix);
};

const decorateFreeTextContactsForMap = (
	contacts: ContactWithName[],
	fallbackCategory: string
): ContactWithName[] =>
	contacts.map((contact) => {
		if (contact.curatedCategory) return contact;
		const match = inferFreeTextCategoryFromContact(contact as FreeTextSearchContact);
		return {
			...contact,
			curatedCategory: match ?? fallbackCategory,
		};
	});

interface UseDashboardOptions {
	/** Derived title to assign to contacts without a title when creating a campaign */
	derivedTitle?: string;
	/** If true, the derived title applies to ALL contacts (e.g., for restaurant searches) */
	forceApplyDerivedTitle?: boolean;
	/** If true, indicates user came from landing page and is in demo mode (allows one specific search without subscription) */
	fromHome?: boolean;
	/** When true, search submissions skip the implicit-campaign auto-create path
	 * (e.g., the user is in URL-pinned add-to-campaign mode and is explicitly
	 * searching to find more contacts for a specific other campaign). */
	disableAutoCreateCampaign?: boolean;
}

export const useDashboard = (options: UseDashboardOptions = {}) => {
	const {
		derivedTitle,
		forceApplyDerivedTitle = false,
		fromHome = false,
		disableAutoCreateCampaign = false,
	} = options;
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

	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;

	// "From Home Demo Mode": user came from landing page and doesn't have a subscription.
	// In this mode, they can only execute the one pre-configured demo search.
	const isFromHomeDemoMode = fromHome && !hasActiveSubscription;

	// Allow searching if user has subscription OR is in fromHome demo mode (for the demo query only)
	const canSearch = hasActiveSubscription || fromHome;
	const [selectedContactListRows, setSelectedContactListRows] = useState<
		UserContactList[]
	>([]);
	const [selectionState, dispatchSelection] = useReducer(selectionReducer, {
		current: [],
		past: [],
	});
	const selectedContacts = selectionState.current;
	const setSelectedContacts = useCallback((value: SetStateAction<number[]>) => {
		dispatchSelection({ type: 'set', value });
	}, []);
	// Restore the previous selection. No-op (and the button is disabled) when the
	// undo history is empty.
	const undoLastSelection = useCallback(() => {
		dispatchSelection({ type: 'undo' });
	}, []);
	const canUndoSelection = selectionState.past.length > 0;
	// Map "Write Message" flow: when true, the inline drafting panel is open over the search map
	// for the current `selectedContacts`. Reset alongside selection so it never outlives it.
	const [isWriteMode, setIsWriteMode] = useState(false);
	const [isAllSelected, setIsAllSelected] = useState(false);
	const [activeSearchQuery, setActiveSearchQuery] = useState('');
	const [activeExcludeUsedContacts, setActiveExcludeUsedContacts] = useState(false);
	const [searchRunId, setSearchRunId] = useState(0);
	// Optional map-driven bounding box filter (rectangle selection tool in map view).
	const [mapBboxFilter, setMapBboxFilter] = useState<{
		south: number;
		west: number;
		north: number;
		east: number;
		titlePrefix?: string | null;
	} | null>(null);
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

	// Curated search results: populated by triggerCuratedSearch (gradient/search button click
	// when the why/what/where fields are blank). When this is set, we surface these contacts
	// instead of the standard /api/contacts results so the existing map + UI rendering picks
	// them up without a separate code path.
	const [curatedContacts, setCuratedContacts] = useState<ContactWithName[] | null>(null);
	const [isCuratedSearchActive, setIsCuratedSearchActive] = useState(false);
	// True while a cached curated result is on screen and a fresh shuffle is being fetched in
	// the background (stale-while-revalidate). Drives a subtle, non-blocking "refreshing" hint.
	const [isRevalidatingCurated, setIsRevalidatingCurated] = useState(false);
	const [pendingFreeTextQuery, setPendingFreeTextQuery] = useState<string | null>(null);
	// Snapshot of the args that produced the current curated results. Captured here so the
	// dashboard URL-mirror can persist them and the page can re-run the same curated search
	// after a browser refresh. Keys are the exact override fields accepted by triggerCuratedSearch.
	const [lastCuratedArgs, setLastCuratedArgs] = useState<CuratedSearchArgs | null>(null);
	// Same idea as lastCuratedArgs, but for free-text "Search Anything" runs. The URL alone
	// can't distinguish a free-text result from the regular vector search (the query string is
	// the only signal), so this flag is what lets the URL-mirror tag the URL with `ft=1` and
	// the rehydration path know to restore from the free-text session cache instead of
	// kicking off a regular onSubmit.
	const [lastFreeTextArgs, setLastFreeTextArgs] = useState<FreeTextSearchArgs | null>(null);

	const {
		data: rawContacts,
		isPending: isPendingContacts,
		isLoading: isLoadingRawContacts,
		error,
		isRefetching: isRefetchingRawContacts,
		isError: isRawContactsError,
		isLoadingError: isRawContactsLoadingError,
	} = useGetContacts({
		filters: {
			query: activeSearchQuery,
			verificationStatus:
				process.env.NODE_ENV === 'production' ? EmailVerificationStatus.valid : undefined,
			useVectorSearch: true,
			limit,
			searchRunId,
			excludeUsedContacts: activeExcludeUsedContacts,
			bboxSouth: mapBboxFilter?.south,
			bboxWest: mapBboxFilter?.west,
			bboxNorth: mapBboxFilter?.north,
			bboxEast: mapBboxFilter?.east,
			bboxTitlePrefix: mapBboxFilter?.titlePrefix ?? undefined,
			fromHome,
		},
		enabled:
			hasSearched &&
			!isCuratedSearchActive &&
			!!activeSearchQuery &&
			activeSearchQuery.trim().length > 0,
	});

	const contacts = useMemo(
		() => (isCuratedSearchActive ? curatedContacts ?? [] : rawContacts),
		[isCuratedSearchActive, curatedContacts, rawContacts]
	);
	const hasRawContacts = Array.isArray(rawContacts) && rawContacts.length > 0;
	const shouldSurfaceContactSearchError =
		!isCuratedSearchActive &&
		isRawContactsError &&
		(isRawContactsLoadingError || !hasRawContacts || !isTimeoutError(error));

	const {
		mutateAsync: runCuratedSearch,
		isPending: isPendingCuratedSearch,
	} = useCuratedContactsSearch({ suppressToasts: true });

	const {
		mutateAsync: runFreeTextSearch,
		isPending: isPendingFreeTextSearch,
	} = useFreeTextContactsSearch({ suppressToasts: true });

	// Cancel-the-previous-search machinery. Curated and free-text are mutually
	// exclusive flavors of "the search that's currently painting the map," so a
	// new run of *either* must abort *both* in-flight controllers — otherwise an
	// older curated request can complete after a newer free-text one and clobber
	// the rendered results.
	//
	// `searchGenerationRef` is belt + suspenders: even if an abort doesn't fully
	// short-circuit (e.g. response already buffered), we compare the generation
	// captured at call-time against the latest one and silently drop stale data.
	const curatedAbortRef = useRef<AbortController | null>(null);
	const freeTextAbortRef = useRef<AbortController | null>(null);
	const searchGenerationRef = useRef(0);

	// Per-user cache keys (see the cache helpers at module scope). Memoized so they're stable
	// references inside the search callbacks' dependency arrays.
	const curatedCacheKey = useMemo(
		() => searchCacheKey(CURATED_CACHE_KEY_PREFIX, user?.id),
		[user?.id]
	);
	const freeTextCacheKey = useMemo(
		() => searchCacheKey(FREETEXT_CACHE_KEY_PREFIX, user?.id),
		[user?.id]
	);

	// Speculative "For You" prefetch slot: a curated fetch kicked off on hover/focus
	// intent, before the click. The click (and a cache-hit's background revalidate)
	// adopts this in-flight promise instead of firing a second request. Module-scope
	// (speculativeCuratedSlot) so a fetch fired on the CAMPAIGN page's Search tab
	// survives the route swap and is adopted here after this hook remounts.
	// True while an adopted campaign-origin fetch is in flight: those don't run through
	// the curated mutation, so isPendingCuratedSearch stays false for them — without
	// this, the clear-pending effect below would wipe isSearchPending mid-fetch and the
	// UI would flash "No Results Found" (and prematurely disengage allContacts mode).
	const [isAdoptedCuratedFetchPending, setIsAdoptedCuratedFetchPending] = useState(false);
	// Generation guard for clearing: only the call that last set the flag may clear it.
	const adoptedCuratedGenerationRef = useRef(0);

	const cancelInFlightSearches = useCallback(() => {
		curatedAbortRef.current?.abort();
		curatedAbortRef.current = null;
		freeTextAbortRef.current?.abort();
		freeTextAbortRef.current = null;
	}, []);

	useEffect(() => {
		return () => {
			curatedAbortRef.current?.abort();
			freeTextAbortRef.current?.abort();
		};
	}, []);

	const isLoadingContacts = isCuratedSearchActive
		? // While revalidating a cache hit, the cached picks are already on screen — the
		  // background curated fetch must NOT surface as a blocking load (that would defeat the
		  // instant paint). All other curated/free-text pending states still count as loading.
		  (isPendingCuratedSearch ||
				isAdoptedCuratedFetchPending ||
				isPendingFreeTextSearch ||
				pendingFreeTextQuery !== null) &&
			!isRevalidatingCurated
		: isLoadingRawContacts;
	const isRefetchingContacts = isCuratedSearchActive ? false : isRefetchingRawContacts;

	const { mutateAsync: importApolloContacts, isPending: isPendingImportApolloContacts } =
		useCreateApolloContacts({});

	// Clear search pending state when loading finishes
	useEffect(() => {
		if (!isLoadingContacts && !isRefetchingContacts && isSearchPending) {
			setIsSearchPending(false);
		}
	}, [isLoadingContacts, isRefetchingContacts, isSearchPending]);

	useEffect(() => {
		if (!contacts || contacts.length === 0) {
			setIsAllSelected(false);
			return;
		}

		// `selectedContacts` may include contacts from prior searches (map flow). "All selected"
		// should mean "all selectable current results are selected", capped at the search limit.
		const selectedSet = new Set<number>(selectedContacts);
		const selectableContactIds = clampContactIdsToSelectionLimit(
			contacts.map((contact) => contact.id)
		);
		const allSelected = selectableContactIds.every((id) => selectedSet.has(id));
		setIsAllSelected(allSelected);
	}, [selectedContacts, contacts]);

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
		if (shouldSurfaceContactSearchError && error && hasSearched && activeSearchQuery) {
			console.error('Contact search error details:', {
				error,
				message: error instanceof Error ? error.message : 'Unknown error',
				query: activeSearchQuery,
				filters: {
					excludeUsedContacts: activeExcludeUsedContacts,
					limit,
				},
			});
			if (isTimeoutError(error)) {
				toast.error(
					'Search took too long to complete. Existing results were kept where possible; try a more specific query.'
				);
			} else if (error instanceof Error) {
				toast.error(`Search failed: ${error.message}`);
			} else {
				toast.error('Failed to load contacts. Please try again.');
			}
		}
	}, [
		shouldSurfaceContactSearchError,
		error,
		hasSearched,
		activeSearchQuery,
		activeExcludeUsedContacts,
		limit,
	]);

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

	const {
		activeCampaignId,
		activeCampaign,
		isResolving: isResolvingActiveCampaign,
		setActiveCampaignId,
	} = useActiveCampaign();

	const { data: existingCampaigns } = useGetCampaigns();

	const queryClient = useQueryClient();

	const existingCampaignNames = useMemo<string[]>(() => {
		const list = (existingCampaigns ?? []) as Array<{ name?: string }>;
		return list
			.map((c) => c.name)
			.filter((n): n is string => typeof n === 'string' && n.length > 0);
	}, [existingCampaigns]);

	const { data: usedContactIds } = useGetUsedContactIds();

	const creatingCampaignRef = useRef<Promise<number> | null>(null);

	const ensureActiveCampaign = useCallback(
		async (searchQuery: string): Promise<number | null> => {
			void searchQuery;
			if (creatingCampaignRef.current) return creatingCampaignRef.current;

			const promise = (async () => {
				// activeCampaignId can't be trusted on its own: before the campaigns
				// list resolves it falls back to the raw localStorage id, which may
				// point at a soft-deleted campaign (deleted from another device, or
				// directly in the DB). Await the active-only list (instant when the
				// mounted query already resolved, deduped when it's in flight) and
				// validate against it before deciding whether to create.
				let activeList: CampaignListItem[] | null = null;
				try {
					activeList = (await queryClient.ensureQueryData({
						queryKey: getCampaignsListQueryKey(),
						queryFn: fetchCampaignsList,
					})) as CampaignListItem[];
				} catch {
					// Degraded (list fetch failed): fall back to the pre-validation
					// behavior — trust a non-null id, otherwise attempt the create.
				}

				if (activeList) {
					if (
						activeCampaignId != null &&
						activeList.some((c) => c.id === activeCampaignId)
					) {
						return activeCampaignId;
					}
					if (activeList.length > 0) {
						// Stale stored id but other active campaigns exist: adopt the
						// most recent one (same rule as useActiveCampaign's resolution).
						const mostRecent = [...activeList].sort(
							(a, b) =>
								new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
						)[0];
						setActiveCampaignId(mostRecent.id);
						return mostRecent.id;
					}
				} else if (activeCampaignId != null) {
					return activeCampaignId;
				}

				const names = activeList
					? activeList
							.map((c) => c.name)
							.filter((n): n is string => typeof n === 'string' && n.length > 0)
					: existingCampaignNames;
				const name = generateCampaignName(names);
				const newUcl = await createContactList({ name, contactIds: [] });
				const campaign = await createCampaign({
					name,
					userContactLists: [newUcl.id],
				});
				setActiveCampaignId(campaign.id);
				return campaign.id as number;
			})();

			creatingCampaignRef.current = promise;
			try {
				const id = await promise;
				return id;
			} catch (err) {
				if (err instanceof CampaignApiError && err.code === 'CAMPAIGN_CAP_REACHED') {
					toast.error(
						err.message ||
							'You have reached the maximum of 5 active campaigns. Delete one to create a new one.'
					);
				} else {
					toast.error('Could not start a campaign for this search.');
				}
				return null;
			} finally {
				creatingCampaignRef.current = null;
			}
		},
		[
			activeCampaignId,
			createContactList,
			createCampaign,
			existingCampaignNames,
			queryClient,
			setActiveCampaignId,
		]
	);

	/* HANDLERS */
	const onSubmit = async (data: FormData) => {
		// Validate search query
		if (!data.searchText || data.searchText.trim().length === 0) {
			toast.error('Please enter a search query');
			return;
		}

		// Set search pending immediately for instant UI feedback
		setIsSearchPending(true);
		// New searches clear any prior map selection box filter.
		setMapBboxFilter(null);
		setPendingFreeTextQuery(null);
		// A real query overrides any active curated session. The persistent result cache is
		// left intact (keyed by args + TTL) so re-running a prior curated/free-text search
		// stays instant; the URL mirror — not storage — decides what rehydrates on refresh.
		setIsCuratedSearchActive(false);
		setCuratedContacts(null);
		setLastCuratedArgs(null);
		setLastFreeTextArgs(null);
		setIsRevalidatingCurated(false);
		// Update search parameters
		setActiveSearchQuery(data.searchText);
		setActiveExcludeUsedContacts(data.excludeUsedContacts ?? false);
		setLimit(getRandomSearchResultLimit());
		setSearchRunId((runId) => runId + 1);
		setHasSearched(true);
		setIsMapView(true);

		// Demo users (no subscription, came from landing page) shouldn't materialize
		// a real campaign. The URL-pinned add-to-campaign flow targets a specific
		// other campaign and must not touch the active one. Everyone else's first
		// search lands inside their active campaign, auto-creating one in parallel
		// with the search if none exists.
		if (!isFromHomeDemoMode && !disableAutoCreateCampaign) {
			void ensureActiveCampaign(data.searchText);
		}
	};

	const handleResetSearch = () => {
		setHasSearched(false);
		setActiveSearchQuery('');
		setSearchRunId(0);
		setMapBboxFilter(null);
		setPendingFreeTextQuery(null);
		setIsCuratedSearchActive(false);
		setCuratedContacts(null);
		setLastCuratedArgs(null);
		setLastFreeTextArgs(null);
		setIsRevalidatingCurated(false);
		// The persistent result cache survives a reset so an immediate re-search is instant.
		// Reset selection when leaving the search/results flow (fresh dashboard start should not
		// carry over prior selections).
		setSelectedContacts([]);
		setIsWriteMode(false);
		setIsAllSelected(false);
		form.reset();
	};

	// Build the curated mutation vars from override fields (+ fixed limit/signal).
	const buildCuratedVars = useCallback(
		(overrides: CuratedOverrides | undefined, signal: AbortSignal) => ({
			lat: overrides?.lat ?? undefined,
			lon: overrides?.lon ?? undefined,
			radiusKm: overrides?.radiusKm ?? undefined,
			category: overrides?.category ?? undefined,
			state: overrides?.state ?? undefined,
			limit: 50,
			signal,
		}),
		[]
	);

	// Adopt a matching in-flight speculative prefetch if present, else start a fresh fetch.
	// Returns the controller actually doing the work so the caller can wire abort/cleanup,
	// plus whether the promise came from outside the curated mutation (campaign-origin) —
	// the caller must surface pending state for those itself.
	const resolveCuratedResult = useCallback(
		(
			overrides: CuratedOverrides | undefined
		): {
			promise: Promise<CuratedSearchResult>;
			controller: AbortController;
			isExternal: boolean;
		} => {
			const rawArgs = toCuratedArgs(overrides);
			const spec = speculativeCuratedSlot.current;
			if (spec && curatedArgsEqual(spec.args, rawArgs)) {
				speculativeCuratedSlot.current = null;
				if (isSpeculativeCuratedFetchFresh(spec)) {
					return {
						promise: spec.promise,
						controller: spec.controller,
						isExternal: spec.origin === 'campaign',
					};
				}
				// Too old to trust (module-scope slot outlives mounts) — drop it.
				spec.controller.abort();
			}
			const controller = new AbortController();
			const promise = runCuratedSearch(buildCuratedVars(overrides, controller.signal));
			return { promise, controller, isExternal: false };
		},
		[buildCuratedVars, runCuratedSearch]
	);

	// Speculative "For You" prefetch fired on hover/focus intent (see page.tsx). Computes one
	// curated shuffle ahead of the click and stashes the in-flight promise; the click (or a
	// cache-hit's background revalidate) adopts it. Touches no UI state — invisible until used.
	const prefetchCuratedSearch = useCallback(
		(overrides?: CuratedOverrides) => {
			const args = toCuratedArgs(overrides);
			const existing = speculativeCuratedSlot.current;
			if (
				existing &&
				curatedArgsEqual(existing.args, args) &&
				isSpeculativeCuratedFetchFresh(existing)
			) {
				return;
			}
			// Replace a stale/expired speculative request — abort the old one.
			existing?.controller.abort();
			const controller = new AbortController();
			const promise = runCuratedSearch(buildCuratedVars(overrides, controller.signal));
			// Keep an unconsumed rejection from becoming an unhandled promise rejection;
			// the real consumer re-awaits and surfaces errors itself.
			promise.catch(() => undefined);
			speculativeCuratedSlot.current = {
				args,
				promise,
				controller,
				origin: 'dashboard',
				startedAt: Date.now(),
			};
		},
		[buildCuratedVars, runCuratedSearch]
	);

	// Surprise-me curated search: triggered by the gradient/search button when the why/what/where
	// fields are blank. Builds a balanced nearby tray across clean booking categories.
	// Different every click. No OpenAI calls — Elasticsearch recall + server cleanup.
	const triggerCuratedSearch = useCallback(
		async (overrides?: CuratedOverrides): Promise<CuratedSearchResult | undefined> => {
			// Capture the exact args we ran with so we can replay this curated search after a
			// browser refresh (the URL-mirror in dashboard/page.tsx serializes these). The
			// rounded `cacheArgs` are the localStorage cache match key.
			const capturedArgs = toCuratedArgs(overrides);
			const cacheArgs = normalizeCuratedArgs(capturedArgs);
			const cached = findSearchCacheEntry(
				readSearchCache<CuratedSearchArgs>(curatedCacheKey),
				curatedArgsEqual,
				cacheArgs
			);

			// ---- Cache hit: stale-while-revalidate. Paint the cached shuffle instantly, then
			// fetch a fresh one in the background and swap it in (preserves per-click variety). ----
			if (cached) {
				cancelInFlightSearches();
				const myGeneration = ++searchGenerationRef.current;
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastFreeTextArgs(null);
				setLastCuratedArgs(capturedArgs);
				setCuratedContacts(cached.contacts);
				setActiveSearchQuery(cached.query);
				setIsSearchPending(false);
				setIsRevalidatingCurated(true);
				markAfterPaint('murmur:pick:results-paint', 'murmur:pick:click');

				const { promise, controller } = resolveCuratedResult(overrides);
				curatedAbortRef.current = controller;
				try {
					const result = await promise;
					if (myGeneration !== searchGenerationRef.current) return result;
					setCuratedContacts(result.contacts);
					const where = result.city ?? result.region ?? overrides?.state ?? 'your area';
					const query = `Curated picks near ${where}`;
					setActiveSearchQuery(query);
					writeSearchCacheEntry(
						curatedCacheKey,
						{ ts: Date.now(), args: cacheArgs, query, contacts: result.contacts },
						curatedArgsEqual
					);
					return result;
				} catch (err) {
					// The cached picks are valid content — keep them on screen for any failure or
					// abort. No toast (the user already has results); just log a real error.
					const isAbort =
						controller.signal.aborted ||
						(err instanceof Error && err.name === 'AbortError');
					if (!isAbort && !isTimeoutError(err)) {
						console.warn('[curated-search] background revalidate failed', err);
					}
					return undefined;
				} finally {
					if (curatedAbortRef.current === controller) {
						curatedAbortRef.current = null;
					}
					if (myGeneration === searchGenerationRef.current) {
						setIsRevalidatingCurated(false);
					}
				}
			}

			// ---- Cache miss: full fetch (adopting a hover prefetch if one is in flight). ----
			// Cancel any prior in-flight search (curated *or* free-text). They share the same
			// on-screen state, so a stale completion would clobber us.
			cancelInFlightSearches();
			const myGeneration = ++searchGenerationRef.current;
			const previousSearchState = {
				activeSearchQuery,
				curatedContacts,
				hasSearched,
				isCuratedSearchActive,
				lastCuratedArgs,
				lastFreeTextArgs,
			};

			setIsSearchPending(true);
			setIsRevalidatingCurated(false);
			setPendingFreeTextQuery(null);
			setMapBboxFilter(null);
			setIsCuratedSearchActive(true);
			setHasSearched(true);
			setIsMapView(true);
			// Curated and free-text are mutually exclusive flavours of `isCuratedSearchActive`;
			// clear the free-text marker so the URL-mirror doesn't keep tagging the URL with
			// `ft=1` while we're showing curated picks.
			setLastFreeTextArgs(null);
			setLastCuratedArgs(capturedArgs);

			const { promise, controller, isExternal } = resolveCuratedResult(overrides);
			curatedAbortRef.current = controller;
			if (isExternal) {
				// Campaign-origin adopted fetch: not a mutation, so isPendingCuratedSearch
				// won't cover it — surface our own pending state for isLoadingContacts.
				adoptedCuratedGenerationRef.current = myGeneration;
				setIsAdoptedCuratedFetchPending(true);
			}
			try {
				const result = await promise;
				// A newer search has started since we kicked off — drop this result on
				// the floor so we don't overwrite whatever the newer call rendered.
				if (myGeneration !== searchGenerationRef.current) return result;
				setCuratedContacts(result.contacts);
				markAfterPaint('murmur:pick:results-paint', 'murmur:pick:click');
				const where = result.city ?? result.region ?? overrides?.state ?? 'your area';
				const query = `Curated picks near ${where}`;
				setActiveSearchQuery(query);
				// Cache the *exact* contacts we just rendered so a repeat (or refresh) on the same
				// args paints instantly. The server still reshuffles on the next miss/revalidate.
				writeSearchCacheEntry(
					curatedCacheKey,
					{ ts: Date.now(), args: cacheArgs, query, contacts: result.contacts },
					curatedArgsEqual
				);
				return result;
			} catch (err) {
				const isAbort =
					controller.signal.aborted ||
					(err instanceof Error && err.name === 'AbortError');
				if (isAbort) {
					// User-initiated cancel (newer search took over). Don't toast and
					// don't reset state — the newer search is already managing it.
					throw err;
				}
				toast.error(
					isTimeoutError(err)
						? 'Curated search took too long. Existing results were kept.'
						: err instanceof Error
						? err.message
						: 'Failed to load curated picks'
				);
				if (myGeneration === searchGenerationRef.current) {
					setActiveSearchQuery(previousSearchState.activeSearchQuery);
					setCuratedContacts(previousSearchState.curatedContacts);
					setHasSearched(previousSearchState.hasSearched);
					setIsCuratedSearchActive(previousSearchState.isCuratedSearchActive);
					setLastCuratedArgs(previousSearchState.lastCuratedArgs);
					setLastFreeTextArgs(previousSearchState.lastFreeTextArgs);
				}
				throw err;
			} finally {
				if (curatedAbortRef.current === controller) {
					curatedAbortRef.current = null;
				}
				// Only the call that last set the adopted flag may clear it (a newer
				// adopted call may have re-armed it for its own fetch).
				if (adoptedCuratedGenerationRef.current === myGeneration) {
					setIsAdoptedCuratedFetchPending(false);
				}
				if (myGeneration === searchGenerationRef.current) {
					setIsSearchPending(false);
				}
			}
		},
		[
			activeSearchQuery,
			cancelInFlightSearches,
			curatedCacheKey,
			curatedContacts,
			hasSearched,
			isCuratedSearchActive,
			lastCuratedArgs,
			lastFreeTextArgs,
			resolveCuratedResult,
		]
	);

	const primeFreeTextSearch = useCallback((rawQuery: string) => {
		const q = rawQuery.trim();
		if (!q) return;

		setIsSearchPending(true);
		setIsRevalidatingCurated(false);
		setPendingFreeTextQuery(q);
		setMapBboxFilter(null);
		setIsCuratedSearchActive(true);
		setHasSearched(true);
		setIsMapView(true);
		setLastCuratedArgs(null);
		// Drop in-memory args while pending so URL mirroring does not label stale
		// results as current. Keep contacts and sessionStorage until resolution so
		// a timeout cannot blank the map.
		setLastFreeTextArgs(null);
		setActiveSearchQuery(q);
	}, []);

	// Free-text "Search Anything" entry point. Hits /api/contacts/search which
	// runs the hybrid retriever (kNN + lexical + optional title-prefix) and the
	// cleanliness/category/locality multipliers, and surfaces the results
	// through the same curated-results state pipe so map pins, list rendering,
	// and selection all "just work" without a parallel UI path. Treated as a
	// curated session for state purposes — `isCuratedSearchActive` simply means
	// "results came from a non-/api/contacts source," which applies here too.
	const triggerFreeTextSearch = useCallback(
		async (
			rawQuery: string,
			overrides?: {
				lat?: number | null;
				lon?: number | null;
				radiusKm?: number | null;
				strictRadius?: boolean;
				keywordMode?: boolean;
				profileGenre?: string | null;
				profileEmbedText?: string | null;
				profileArea?: string | null;
			}
		) => {
			const q = rawQuery.trim();
			if (!q) return;

			// Exact-cache hit: free-text ranking is deterministic per (query, geo), so a recent
			// identical search paints instantly with zero network. (Curated, which reshuffles, is
			// handled by stale-while-revalidate in triggerCuratedSearch instead.)
			const rawArgs: FreeTextSearchArgs = {
				q,
				lat: overrides?.lat ?? null,
				lon: overrides?.lon ?? null,
				radiusKm: overrides?.radiusKm ?? null,
				strictRadius: overrides?.strictRadius ?? false,
				keywordMode: overrides?.keywordMode ?? false,
				profileSig: buildProfileSig(
					overrides?.profileGenre,
					overrides?.profileEmbedText,
					overrides?.profileArea
				),
			};
			const shouldUseCache = !rawArgs.strictRadius;
			const cacheArgs = normalizeFreeTextArgs(rawArgs);
			const cachedEntry = shouldUseCache
				? findSearchCacheEntry(
						readSearchCache<FreeTextSearchArgs>(freeTextCacheKey),
						freeTextArgsEqual,
						cacheArgs
				  )
				: null;
			if (cachedEntry) {
				const fallbackCategory =
					inferFreeTextCategoryFromQuery(cachedEntry.query || q) ??
					FREE_TEXT_FALLBACK_CURATED_CATEGORY;
				const decoratedContacts = decorateFreeTextContactsForMap(
					cachedEntry.contacts,
					fallbackCategory
				);
				cancelInFlightSearches();
				++searchGenerationRef.current;
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastCuratedArgs(null);
				setLastFreeTextArgs(rawArgs);
				setCuratedContacts(decoratedContacts);
				setActiveSearchQuery(cachedEntry.query);
				setIsSearchPending(false);
				setIsRevalidatingCurated(false);
				// Refresh recency (move to MRU) and self-heal older cached entries that
				// predate the marker metadata decoration.
				writeSearchCacheEntry(
					freeTextCacheKey,
					{ ...cachedEntry, ts: Date.now(), contacts: decoratedContacts },
					freeTextArgsEqual
				);
				return;
			}

			// Cancel any prior in-flight search (curated *or* free-text). They share
			// the same on-screen state, so a stale completion would clobber us.
			cancelInFlightSearches();
			const myGeneration = ++searchGenerationRef.current;
			const controller = new AbortController();
			freeTextAbortRef.current = controller;
			const previousSearchState = {
				activeSearchQuery,
				curatedContacts,
				hasSearched,
				isCuratedSearchActive,
				lastCuratedArgs,
				lastFreeTextArgs,
			};

			primeFreeTextSearch(q);
			try {
				const result = await runFreeTextSearch({
					q,
					lat: overrides?.lat ?? undefined,
					lon: overrides?.lon ?? undefined,
					radiusKm: overrides?.radiusKm ?? undefined,
					strictRadius: overrides?.strictRadius,
					keywordMode: overrides?.keywordMode,
					profileGenre: overrides?.profileGenre,
					profileEmbedText: overrides?.profileEmbedText,
					profileArea: overrides?.profileArea,
					limit: 50,
					signal: controller.signal,
				});
				if (myGeneration !== searchGenerationRef.current) return result;
				// SearchResultsMap gates its blob/orb UI on `Boolean(curatedCategory)`. Free-text
				// results don't carry one, so without this decoration they'd render as plain dots
				// instead of the curated cluster visual. Prefer the per-contact category match,
				// then the parsed query category, then a neutral sentinel as a last resort.
				const fallbackCategory =
					normalizeFreeTextContactCategory(result.parsed.categories[0]) ??
					inferFreeTextCategoryFromQuery(q) ??
					FREE_TEXT_FALLBACK_CURATED_CATEGORY;
				const decoratedContacts = decorateFreeTextContactsForMap(
					result.contacts,
					fallbackCategory
				);
				setCuratedContacts(decoratedContacts);
				setLastFreeTextArgs(rawArgs);
				// Cache the *exact* contacts we just rendered (with their curatedCategory
				// decoration intact) so a repeat (or refresh) on the same query restores the same
				// list and the map's stable curated marker path stays in effect. Without it, the
				// rehydration path falls through to /api/contacts and contacts come back without
				// curatedCategory — markers regress to viewport sampling and don't render until
				// after auto-fit + moveend.
				if (shouldUseCache) {
					writeSearchCacheEntry(
						freeTextCacheKey,
						{ ts: Date.now(), args: cacheArgs, query: q, contacts: decoratedContacts },
						freeTextArgsEqual
					);
				}
				return result;
			} catch (err) {
				const isAbort =
					controller.signal.aborted ||
					(err instanceof Error && err.name === 'AbortError');
				if (isAbort) {
					throw err;
				}
				toast.error(
					isTimeoutError(err)
						? 'Search took too long to complete. Existing results were kept.'
						: err instanceof Error
						? err.message
						: 'Failed to run search'
				);
				if (myGeneration === searchGenerationRef.current) {
					setActiveSearchQuery(previousSearchState.activeSearchQuery);
					setCuratedContacts(previousSearchState.curatedContacts);
					setHasSearched(previousSearchState.hasSearched);
					setIsCuratedSearchActive(previousSearchState.isCuratedSearchActive);
					setLastCuratedArgs(previousSearchState.lastCuratedArgs);
					setLastFreeTextArgs(previousSearchState.lastFreeTextArgs);
				}
				throw err;
			} finally {
				if (freeTextAbortRef.current === controller) {
					freeTextAbortRef.current = null;
				}
				if (myGeneration === searchGenerationRef.current) {
					setPendingFreeTextQuery(null);
					setIsSearchPending(false);
				}
			}
		},
		[
			activeSearchQuery,
			cancelInFlightSearches,
			curatedContacts,
			freeTextCacheKey,
			hasSearched,
			isCuratedSearchActive,
			lastCuratedArgs,
			lastFreeTextArgs,
			primeFreeTextSearch,
			runFreeTextSearch,
		]
	);

	// Restore a curated session from sessionStorage if the cache key matches the requested
	// args; otherwise fall through to a fresh server call. Used on browser refresh so the
	// user sees the *same* shuffle they were just looking at, not a new random one.
	const rehydrateCuratedSession = useCallback(
		async (args: CuratedSearchArgs) => {
			const cached = findSearchCacheEntry(
				readSearchCache<CuratedSearchArgs>(curatedCacheKey),
				curatedArgsEqual,
				normalizeCuratedArgs(args)
			);
			if (cached) {
				markPerf('murmur:pick:cache-hit');
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastCuratedArgs(args);
				setLastFreeTextArgs(null);
				setCuratedContacts(cached.contacts);
				setActiveSearchQuery(cached.query);
				setIsSearchPending(false);
				markAfterPaint('murmur:pick:results-paint', 'murmur:pick:click');
				return;
			}
			markPerf('murmur:pick:cache-miss');
			await triggerCuratedSearch(args);
		},
		[curatedCacheKey, triggerCuratedSearch]
	);

	// Restore a free-text "Search Anything" session. If sessionStorage holds the same query
	// the URL is asking for, restore in-memory immediately (no network). Otherwise — typically
	// a refresh in a fresh tab where sessionStorage didn't carry over — replay the search
	// via the canonical `triggerFreeTextSearch` so the result still comes back with
	// `curatedCategory` decoration and the map's stable curated marker path stays in effect.
	// Either way, on success the caller knows it can skip the regular onSubmit fallback.
	const rehydrateFreeTextSession = useCallback(
		async (
			args: FreeTextSearchArgs,
			profileFields?: {
				profileGenre?: string | null;
				profileEmbedText?: string | null;
				profileArea?: string | null;
			}
		): Promise<boolean> => {
			const trimmedQuery = args.q.trim();
			if (!trimmedQuery) return false;

			const cached = findSearchCacheEntry(
				readSearchCache<FreeTextSearchArgs>(freeTextCacheKey),
				freeTextArgsEqual,
				normalizeFreeTextArgs(args)
			);
			if (cached) {
				const fallbackCategory =
					inferFreeTextCategoryFromQuery(cached.query || trimmedQuery) ??
					FREE_TEXT_FALLBACK_CURATED_CATEGORY;
				const decoratedContacts = decorateFreeTextContactsForMap(
					cached.contacts,
					fallbackCategory
				);
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastCuratedArgs(null);
				setLastFreeTextArgs(args);
				setCuratedContacts(decoratedContacts);
				setActiveSearchQuery(cached.query);
				setIsSearchPending(false);
				writeSearchCacheEntry(
					freeTextCacheKey,
					{ ...cached, ts: Date.now(), contacts: decoratedContacts },
					freeTextArgsEqual
				);
				return true;
			}

			// Cache miss: replay the search using the URL-encoded args so we end up with the
			// same shape of state we'd have post-search (decorated contacts, curated path).
			try {
				await triggerFreeTextSearch(trimmedQuery, {
					lat: args.lat,
					lon: args.lon,
					radiusKm: args.radiusKm,
					strictRadius: args.strictRadius,
					keywordMode: args.keywordMode,
					profileGenre: profileFields?.profileGenre,
					profileEmbedText: profileFields?.profileEmbedText,
					profileArea: profileFields?.profileArea,
				});
				return true;
			} catch {
				return false;
			}
		},
		[freeTextCacheKey, triggerFreeTextSearch]
	);

	const handleSelectAll = (panelContacts?: ContactWithName[]) => {
		// In map view with panel contacts, toggle only the panel contacts
		if (panelContacts && panelContacts.length > 0) {
			const panelContactIds = clampContactIdsToSelectionLimit(
				panelContacts.map((c) => c.id)
			);
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
				setSelectedContacts(
					mergeContactIdsWithSelectionLimit(
						existingNonPanelSelections,
						panelContactIds
					)
				);
			}
			return;
		}

		if (!contacts || contacts.length === 0) return;

		if (!isMapView && tableInstance) {
			if (isAllSelected) {
				tableInstance.toggleAllRowsSelected(false);
			} else {
				tableInstance.toggleAllRowsSelected(true);
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

		// Build updates: increment deselections for deselected contacts,
		// and assign derived title to selected contacts without a title
		const updates: Array<{ id: number; data: Record<string, unknown> }> = [];
		
		for (const contact of deselectedContacts) {
			updates.push({
				id: contact.id,
				data: {
					manualDeselections: contact.manualDeselections + 1,
				},
			});
		}

		// If we have a derived title, update selected contacts
		// For restaurant searches (forceApplyDerivedTitle), update ALL selected contacts
		// Otherwise, only update contacts that don't have a title
		if (derivedTitle) {
			const contactsToUpdate = contacts.filter(
				(contact) =>
					selectedContacts.includes(contact.id) &&
					(forceApplyDerivedTitle || (!contact.title && !contact.headline))
			);
			for (const contact of contactsToUpdate) {
				updates.push({
					id: contact.id,
					data: {
						title: derivedTitle,
					},
				});
			}
		}

		if (updates.length > 0) {
			await batchUpdateContacts({ updates });
		}

		const defaultName = generateCampaignName(existingCampaignNames);
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
				startTransition(
					`${urls.murmur.campaign.detail(campaign.id)}?silent=1&origin=search&added=1`
				);
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
				startTransition(
					`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}&pick=1&allContacts=1&instant=1`
				);
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
					// Compute name from firstName and lastName fields
					const hasName = contactHasName(contact);
					const nameValue = hasName ? computeName(contact) : '';
					const companyValue = contact.company || '';
					const hasCompany = !!companyValue;

					// If neither name nor company, show a dash
					if (!hasName && !hasCompany) {
						return (
							<div className="flex items-start gap-2">
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
		error: shouldSurfaceContactSearchError ? error : null,
		isError: shouldSurfaceContactSearchError,
		handleImportApolloContacts,
		setSelectedContactListRows,
		handleCreateCampaign,
		isPendingCreateCampaign,
		columns,
		setSelectedContacts,
		selectedContacts,
		undoLastSelection,
		canUndoSelection,
		isWriteMode,
		setIsWriteMode,
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
		isFromHomeDemoMode,
		hasSearched,
		handleResetSearch,
		hoveredText,
		hoveredContact,
		setHoveredContact,
		isMapView,
		setIsMapView,
		isSearchPending,
		mapBboxFilter,
		setMapBboxFilter,
		triggerCuratedSearch,
		prefetchCuratedSearch,
		rehydrateCuratedSession,
		isCuratedSearchActive,
		isPendingCuratedSearch,
		isRevalidatingCurated,
		lastCuratedArgs,
		primeFreeTextSearch,
		triggerFreeTextSearch,
		rehydrateFreeTextSession,
		isPendingFreeTextSearch,
		lastFreeTextArgs,
		activeCampaignId,
		activeCampaign,
		isResolvingActiveCampaign,
		setActiveCampaignId,
		ensureActiveCampaign,
	};
};
