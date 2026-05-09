'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailVerificationStatus } from '@/constants/prismaEnums';
import type { UserContactList } from '@prisma/client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
	CampaignApiError,
	useActiveCampaign,
	useCreateCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { urls } from '@/constants/urls';
import {
	useBatchUpdateContacts,
	useCuratedContactsSearch,
	useFreeTextContactsSearch,
	useGetContacts,
	useGetUsedContactIds,
} from '@/hooks/queryHooks/useContacts';
import { ColumnDef, Table } from '@tanstack/react-table';
import { ContactWithName } from '@/types/contact';
import { useCreateApolloContacts } from '@/hooks/queryHooks/useApollo';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { toast } from 'sonner';

import { getStateAbbreviation } from '@/utils/string';
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

const getRandomSearchResultLimit = (): number =>
	Math.floor(Math.random() * 21) + 30;

// Args we ran the most recent curated search with. Stored alongside the result
// in sessionStorage so a refresh that lands on the same args restores the *same
// shuffle* the user was looking at instead of generating a fresh one.
type CuratedSearchArgs = {
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
	category: string | null;
	state: string | null;
};

type CuratedSessionPayload = {
	v: 1;
	ts: number;
	args: CuratedSearchArgs;
	query: string;
	contacts: ContactWithName[];
};

const CURATED_SESSION_STORAGE_KEY = 'murmur_curated_session_v1';
// One hour: long enough that "I just refreshed" always hits cache, short enough
// that walking away and coming back the next morning gets a fresh sample.
const CURATED_SESSION_MAX_AGE_MS = 60 * 60 * 1000;

// JSON.stringify(new Date()) is an ISO string, JSON.parse leaves it as a string.
// Contact has Date-typed fields that downstream consumers may treat as Dates, so
// we revive them on read. Missing/null pass through unchanged.
const reviveContactDates = (raw: unknown): ContactWithName => {
	const c = raw as Record<string, unknown>;
	const reviveOne = (v: unknown): unknown =>
		typeof v === 'string' ? new Date(v) : v;
	return {
		...c,
		createdAt: reviveOne(c.createdAt),
		updatedAt: reviveOne(c.updatedAt),
		lastResearchedDate: c.lastResearchedDate != null ? reviveOne(c.lastResearchedDate) : null,
		emailValidatedAt: c.emailValidatedAt != null ? reviveOne(c.emailValidatedAt) : null,
	} as ContactWithName;
};

const readCuratedSessionStorage = (): CuratedSessionPayload | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.sessionStorage.getItem(CURATED_SESSION_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed?.v !== 1) return null;
		if (typeof parsed.ts !== 'number') return null;
		if (!Array.isArray(parsed.contacts)) return null;
		if (Date.now() - parsed.ts > CURATED_SESSION_MAX_AGE_MS) return null;
		return {
			v: 1,
			ts: parsed.ts,
			args: parsed.args,
			query: typeof parsed.query === 'string' ? parsed.query : '',
			contacts: parsed.contacts.map(reviveContactDates),
		};
	} catch {
		return null;
	}
};

const writeCuratedSessionStorage = (payload: CuratedSessionPayload): void => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(
			CURATED_SESSION_STORAGE_KEY,
			JSON.stringify(payload)
		);
	} catch {
		// Quota exceeded or storage disabled — non-fatal, refresh just re-fetches.
	}
};

const clearCuratedSessionStorage = (): void => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.removeItem(CURATED_SESSION_STORAGE_KEY);
	} catch {
		// ignore
	}
};

const curatedArgsEqual = (a: CuratedSearchArgs, b: CuratedSearchArgs): boolean =>
	a.lat === b.lat &&
	a.lon === b.lon &&
	a.radiusKm === b.radiusKm &&
	a.category === b.category &&
	a.state === b.state;

// Args we ran the most recent free-text "Search Anything" search with. Stored alongside
// the decorated result so a refresh on the same query restores the same hybrid-retriever
// result set (and its `curatedCategory` decoration) instead of falling back to the regular
// /api/contacts vector search — which returns differently-scored data and breaks the map's
// stable curated marker rendering.
type FreeTextSearchArgs = {
	q: string;
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
};

type FreeTextSessionPayload = {
	v: 1;
	ts: number;
	args: FreeTextSearchArgs;
	query: string;
	contacts: ContactWithName[];
};

const FREETEXT_SESSION_STORAGE_KEY = 'murmur_freetext_session_v1';
const FREETEXT_SESSION_MAX_AGE_MS = 60 * 60 * 1000;

const readFreeTextSessionStorage = (): FreeTextSessionPayload | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.sessionStorage.getItem(FREETEXT_SESSION_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed?.v !== 1) return null;
		if (typeof parsed.ts !== 'number') return null;
		if (!Array.isArray(parsed.contacts)) return null;
		if (Date.now() - parsed.ts > FREETEXT_SESSION_MAX_AGE_MS) return null;
		return {
			v: 1,
			ts: parsed.ts,
			args: parsed.args,
			query: typeof parsed.query === 'string' ? parsed.query : '',
			contacts: parsed.contacts.map(reviveContactDates),
		};
	} catch {
		return null;
	}
};

const writeFreeTextSessionStorage = (payload: FreeTextSessionPayload): void => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(
			FREETEXT_SESSION_STORAGE_KEY,
			JSON.stringify(payload)
		);
	} catch {
		// Quota exceeded or storage disabled — non-fatal, refresh just re-fetches.
	}
};

const clearFreeTextSessionStorage = (): void => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.removeItem(FREETEXT_SESSION_STORAGE_KEY);
	} catch {
		// ignore
	}
};

const isTimeoutError = (error: unknown): boolean =>
	error instanceof Error && /\b(timeout|timed\s*out)\b/i.test(error.message);

// Constellation-based naming. The zodiac for the user's current calendar date
// is always the first choice; when that's taken, cycle through the supplementary
// constellation list, then through other zodiacs, before falling back to the
// server's numeric-suffix logic ("Taurus 2", etc.). Encoded as [fromMonth,
// fromDay]-[toMonth,toDay] using traditional Western tropical zodiac dates.
type ZodiacRange = {
	name: string;
	from: readonly [number, number];
	to: readonly [number, number];
};

const ZODIAC_DATE_RANGES: readonly ZodiacRange[] = [
	{ name: 'Capricornus', from: [12, 22], to: [1, 19] },
	{ name: 'Aquarius', from: [1, 20], to: [2, 18] },
	{ name: 'Pisces', from: [2, 19], to: [3, 20] },
	{ name: 'Aries', from: [3, 21], to: [4, 19] },
	{ name: 'Taurus', from: [4, 20], to: [5, 20] },
	{ name: 'Gemini', from: [5, 21], to: [6, 20] },
	{ name: 'Cancer', from: [6, 21], to: [7, 22] },
	{ name: 'Leo', from: [7, 23], to: [8, 22] },
	{ name: 'Virgo', from: [8, 23], to: [9, 22] },
	{ name: 'Libra', from: [9, 23], to: [10, 22] },
	{ name: 'Scorpius', from: [10, 23], to: [11, 21] },
	{ name: 'Sagittarius', from: [11, 22], to: [12, 21] },
];

// Non-zodiac constellations. Order matters: this is the cycle preference when
// the date's zodiac has already been used.
const SUPPLEMENTARY_CONSTELLATIONS = [
	'Lyra',
	'Orion',
	'Ursa',
	'Cassiopeia',
	'Aquila',
	'Canis',
] as const;

export const getZodiacForDate = (date: Date): string => {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	for (const z of ZODIAC_DATE_RANGES) {
		const [fm, fd] = z.from;
		const [tm, td] = z.to;
		if (fm <= tm) {
			if (
				(month === fm && day >= fd) ||
				(month === tm && day <= td) ||
				(month > fm && month < tm)
			) {
				return z.name;
			}
		} else {
			// Range crosses year boundary (Capricornus: Dec 22 → Jan 19).
			if (
				(month === fm && day >= fd) ||
				(month === tm && day <= td) ||
				month > fm ||
				month < tm
			) {
				return z.name;
			}
		}
	}
	return 'Aquarius'; // Unreachable — every day falls in exactly one range.
};

const generateCampaignName = (
	existingNames: readonly string[] = [],
	date: Date = new Date()
): string => {
	const primary = getZodiacForDate(date);
	const otherZodiacs = ZODIAC_DATE_RANGES.map((z) => z.name).filter(
		(n) => n !== primary
	);
	const candidates = [primary, ...SUPPLEMENTARY_CONSTELLATIONS, ...otherZodiacs];

	const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
	for (const candidate of candidates) {
		if (!taken.has(candidate.toLowerCase())) return candidate;
	}
	// All 18 unique names taken — fall back to the date's primary zodiac and
	// let the server's getUniqueCampaignName append a numeric suffix.
	return primary;
};

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
	const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
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
		? isPendingCuratedSearch || isPendingFreeTextSearch || pendingFreeTextQuery !== null
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
		// should mean "all current results are selected", not "selected count equals results count".
		const selectedSet = new Set<number>(selectedContacts);
		const allSelected = contacts.every((c) => selectedSet.has(c.id));
		setIsAllSelected(allSelected);
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
			if (activeCampaignId != null) return activeCampaignId;
			if (creatingCampaignRef.current) return creatingCampaignRef.current;

			const promise = (async () => {
				const name = generateCampaignName(existingCampaignNames);
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
		// A real query overrides any active curated session.
		setIsCuratedSearchActive(false);
		setCuratedContacts(null);
		setLastCuratedArgs(null);
		setLastFreeTextArgs(null);
		clearCuratedSessionStorage();
		clearFreeTextSessionStorage();
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
		clearCuratedSessionStorage();
		clearFreeTextSessionStorage();
		// Reset selection when leaving the search/results flow (fresh dashboard start should not
		// carry over prior selections).
		setSelectedContacts([]);
		setIsAllSelected(false);
		form.reset();
	};

	// Surprise-me curated search: triggered by the gradient/search button when the why/what/where
	// fields are blank. Builds a balanced nearby tray across clean booking categories.
	// Different every click. No OpenAI calls — Elasticsearch recall + server cleanup.
	const triggerCuratedSearch = useCallback(
		async (overrides?: {
			lat?: number | null;
			lon?: number | null;
			radiusKm?: number | null;
			category?: string | null;
			state?: string | null;
		}) => {
			// Cancel any prior in-flight search (curated *or* free-text). They share
			// the same on-screen state, so a stale completion would clobber us.
			cancelInFlightSearches();
			const myGeneration = ++searchGenerationRef.current;
			const controller = new AbortController();
			curatedAbortRef.current = controller;
			const previousSearchState = {
				activeSearchQuery,
				curatedContacts,
				hasSearched,
				isCuratedSearchActive,
				lastCuratedArgs,
				lastFreeTextArgs,
			};

			setIsSearchPending(true);
			setPendingFreeTextQuery(null);
			setMapBboxFilter(null);
			setIsCuratedSearchActive(true);
			setHasSearched(true);
			setIsMapView(true);
			// Curated and free-text are mutually exclusive flavours of `isCuratedSearchActive`;
			// clear the free-text snapshot so the URL-mirror doesn't keep tagging the URL with
			// `ft=1` while we're showing curated picks.
			setLastFreeTextArgs(null);
			// Capture the exact args we ran with so we can replay this curated search after a
			// browser refresh (the URL-mirror in dashboard/page.tsx serializes these).
			const capturedArgs: CuratedSearchArgs = {
				lat: overrides?.lat ?? null,
				lon: overrides?.lon ?? null,
				radiusKm: overrides?.radiusKm ?? null,
				category: overrides?.category ?? null,
				state: overrides?.state ?? null,
			};
			setLastCuratedArgs(capturedArgs);
			try {
				const result = await runCuratedSearch({
					lat: overrides?.lat ?? undefined,
					lon: overrides?.lon ?? undefined,
					radiusKm: overrides?.radiusKm ?? undefined,
					category: overrides?.category ?? undefined,
					state: overrides?.state ?? undefined,
					limit: 50,
					signal: controller.signal,
				});
				// A newer search has started since we kicked off — drop this result on
				// the floor so we don't overwrite whatever the newer call rendered.
				if (myGeneration !== searchGenerationRef.current) return result;
				setCuratedContacts(result.contacts);
				const where = result.city ?? result.region ?? overrides?.state ?? 'your area';
				const query = `Curated picks near ${where}`;
				setActiveSearchQuery(query);
				clearFreeTextSessionStorage();
				// Snapshot the *exact* contacts we just rendered so a refresh on the same args
				// restores the same shuffle instead of drawing a new one. The URL persists what
				// search we ran; sessionStorage persists the result of that run.
				writeCuratedSessionStorage({
					v: 1,
					ts: Date.now(),
					args: capturedArgs,
					query,
					contacts: result.contacts,
				});
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
				if (myGeneration === searchGenerationRef.current) {
					setIsSearchPending(false);
				}
			}
		},
		[
			activeSearchQuery,
			cancelInFlightSearches,
			curatedContacts,
			hasSearched,
			isCuratedSearchActive,
			lastCuratedArgs,
			lastFreeTextArgs,
			runCuratedSearch,
		]
	);

	const primeFreeTextSearch = useCallback((rawQuery: string) => {
		const q = rawQuery.trim();
		if (!q) return;

		setIsSearchPending(true);
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
		async (rawQuery: string, overrides?: { lat?: number | null; lon?: number | null; radiusKm?: number | null }) => {
			const q = rawQuery.trim();
			if (!q) return;
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
			const capturedArgs: FreeTextSearchArgs = {
				q,
				lat: overrides?.lat ?? null,
				lon: overrides?.lon ?? null,
				radiusKm: overrides?.radiusKm ?? null,
			};
			try {
				const result = await runFreeTextSearch({
					q,
					lat: overrides?.lat ?? undefined,
					lon: overrides?.lon ?? undefined,
					radiusKm: overrides?.radiusKm ?? undefined,
					limit: 50,
					signal: controller.signal,
				});
				if (myGeneration !== searchGenerationRef.current) return result;
				// SearchResultsMap gates its blob/orb UI on `Boolean(curatedCategory)`. Free-text
				// results don't carry one, so without this decoration they'd render as plain dots
				// instead of the curated cluster visual. Prefer the per-contact category match,
				// then the parsed query category, then a neutral sentinel as a last resort.
				const fallbackCategory = result.parsed.categories[0] ?? '_freetext';
				const decoratedContacts: ContactWithName[] = result.contacts.map((c) => {
					if (c.curatedCategory) return c;
					const match = (c as ContactWithName & { searchCategoryMatch?: string | null })
						.searchCategoryMatch;
					return { ...c, curatedCategory: match ?? fallbackCategory };
				});
				setCuratedContacts(decoratedContacts);
				setLastFreeTextArgs(capturedArgs);
				clearCuratedSessionStorage();
				// Snapshot the *exact* contacts we just rendered (with their curatedCategory
				// decoration intact) so a refresh on the same query restores the same list and
				// the map's stable curated marker path stays in effect. Without this snapshot,
				// the rehydration path falls through to /api/contacts and contacts come back
				// without curatedCategory — markers regress to viewport sampling and don't
				// render until after auto-fit + moveend, which is the bug we're fixing.
				writeFreeTextSessionStorage({
					v: 1,
					ts: Date.now(),
					args: capturedArgs,
					query: q,
					contacts: decoratedContacts,
				});
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
			const cached = readCuratedSessionStorage();
			if (cached && curatedArgsEqual(cached.args, args)) {
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastCuratedArgs(cached.args);
				setLastFreeTextArgs(null);
				clearFreeTextSessionStorage();
				setCuratedContacts(cached.contacts);
				setActiveSearchQuery(cached.query);
				setIsSearchPending(false);
				return;
			}
			await triggerCuratedSearch(args);
		},
		[triggerCuratedSearch]
	);

	// Restore a free-text "Search Anything" session. If sessionStorage holds the same query
	// the URL is asking for, restore in-memory immediately (no network). Otherwise — typically
	// a refresh in a fresh tab where sessionStorage didn't carry over — replay the search
	// via the canonical `triggerFreeTextSearch` so the result still comes back with
	// `curatedCategory` decoration and the map's stable curated marker path stays in effect.
	// Either way, on success the caller knows it can skip the regular onSubmit fallback.
	const rehydrateFreeTextSession = useCallback(
		async (args: FreeTextSearchArgs): Promise<boolean> => {
			const trimmedQuery = args.q.trim();
			if (!trimmedQuery) return false;

			const cached = readFreeTextSessionStorage();
			if (cached && cached.query.trim() === trimmedQuery) {
				setMapBboxFilter(null);
				setPendingFreeTextQuery(null);
				setIsCuratedSearchActive(true);
				setHasSearched(true);
				setIsMapView(true);
				setLastCuratedArgs(null);
				clearCuratedSessionStorage();
				setLastFreeTextArgs(cached.args);
				setCuratedContacts(cached.contacts);
				setActiveSearchQuery(cached.query);
				setIsSearchPending(false);
				return true;
			}

			// Cache miss: replay the search using the URL-encoded args so we end up with the
			// same shape of state we'd have post-search (decorated contacts, curated path).
			try {
				await triggerFreeTextSearch(trimmedQuery, {
					lat: args.lat,
					lon: args.lon,
					radiusKm: args.radiusKm,
				});
				return true;
			} catch {
				return false;
			}
		},
		[triggerFreeTextSearch]
	);

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
		rehydrateCuratedSession,
		isCuratedSearchActive,
		isPendingCuratedSearch,
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
