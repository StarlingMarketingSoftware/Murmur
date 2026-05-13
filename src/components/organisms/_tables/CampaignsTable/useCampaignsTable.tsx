import type { Campaign, Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Typography } from '@/components/ui/typography';
import {
	useDeleteCampaign,
	useGetCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import {
	useState,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useCallback,
	type CSSProperties,
} from 'react';
import { cn, mmdd } from '@/utils';
import { useRowConfirmationAnimation } from '@/hooks/useRowConfirmationAnimation';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import CampaignRowChevronIcon from '@/components/atoms/_svg/CampaignRowChevronIcon';
import type { CampaignsMockState } from './CampaignsTable';
import {
	type CampaignDataTypeCategoryKey,
	type CampaignDataTypeSummary,
	getCampaignDataCategoryFromText,
	getCampaignDataCategoryLabel,
} from '@/utils/campaignDataTypes';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import { EmailStatus } from '@/constants/prismaEnums';
import { stateBadgeColorMap } from '@/constants/ui';
import { getStateAbbreviation } from '@/utils/string';
import type { ContactWithName } from '@/types/contact';
import type { EmailWithRelations, InboundEmailWithRelations } from '@/types';

type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
	newEmailCount?: number;
	contactCount?: number;
	campaignDataTypes?: CampaignDataTypeSummary[];
};

type FinderFolderKey = 'contacts' | 'drafts' | 'inbox' | 'sent' | 'archive';

type FinderContactItem = {
	id: string | number;
	name: string;
	personName?: string | null;
	company?: string | null;
	title?: string | null;
	headline?: string | null;
	category?: {
		key: CampaignDataTypeCategoryKey;
		label: string;
	} | null;
	city?: string | null;
	state?: string | null;
	email?: string | null;
};

type FinderFolder = {
	key: FinderFolderKey;
	label: string;
	color: string;
	items: FinderContactItem[];
};

type FinderTableRow = {
	id: string;
	__rowType: 'finder';
	__customTableColSpanAll: true;
	parentCampaignId: number;
	name: string;
	draftCount: number;
	sentCount: number;
	newEmailCount: number;
	updatedAt: Date;
};

type CampaignTableRow = CampaignWithCounts | FinderTableRow;

type FinderContactSource = Partial<Contact> & {
	name?: string | null;
	curatedCategory?: string | null;
	curatedDisplayLabel?: string | null;
};

const isFinderTableRow = (row: CampaignTableRow): row is FinderTableRow =>
	(row as FinderTableRow).__rowType === 'finder';

const FINDER_FOLDER_CONFIG: Array<Pick<FinderFolder, 'key' | 'label' | 'color'>> = [
	{ key: 'contacts', label: 'Contacts', color: '#CC5858' },
	{ key: 'drafts', label: 'Drafts', color: '#FAC25F' },
	{ key: 'inbox', label: 'Inbox', color: '#3DB3DE' },
	{ key: 'sent', label: 'Sent', color: '#67CA51' },
	{ key: 'archive', label: 'Archive', color: '#ACACAC' },
];

const MOCK_FINDER_CONTACTS: FinderContactItem[] = [
	{
		id: 'mock-contact-1',
		name: 'Mina Park',
		company: 'Juniper Room',
		title: 'Beverage Director',
		city: 'Brooklyn',
		state: 'NY',
		email: 'mina@juniper.example',
	},
	{
		id: 'mock-contact-2',
		name: 'Elias Stone',
		company: 'North Fork Cellars',
		title: 'Owner',
		city: 'Southold',
		state: 'NY',
		email: 'elias@northfork.example',
	},
	{
		id: 'mock-contact-3',
		name: 'Priya Rao',
		company: 'Table Twelve',
		title: 'General Manager',
		city: 'Philadelphia',
		state: 'PA',
		email: 'priya@tabletwelve.example',
	},
	{
		id: 'mock-contact-4',
		name: 'Caleb Brooks',
		company: 'Harbor House',
		title: 'Events Lead',
		city: 'Chicago',
		state: 'IL',
		email: 'caleb@harborhouse.example',
	},
	{
		id: 'mock-contact-5',
		name: 'Ana Torres',
		company: 'Mesa Verde',
		title: 'Wine Buyer',
		city: 'Austin',
		state: 'TX',
		email: 'ana@mesaverde.example',
	},
	{
		id: 'mock-contact-6',
		name: 'Nolan Reed',
		company: 'Cedar & Rye',
		title: 'Bar Manager',
		city: 'Nashville',
		state: 'TN',
		email: 'nolan@cedarrye.example',
	},
	{
		id: 'mock-contact-7',
		name: 'Sofia Kim',
		company: 'Golden Hour',
		title: 'Hospitality Director',
		city: 'Los Angeles',
		state: 'CA',
		email: 'sofia@goldenhour.example',
	},
	{
		id: 'mock-contact-8',
		name: 'Marcus Lee',
		company: 'Blue Note Room',
		title: 'Talent Buyer',
		city: 'New Orleans',
		state: 'LA',
		email: 'marcus@bluenote.example',
	},
];

const DEFAULT_MOCK_FOLDER_NAMES = ['Orion', 'Leo', 'Pieces', 'Capricorn', 'Sagittarius'];
const CAMPAIGN_FOLDER_NAME_BOX_COLORS = [
	'#B9EAF1',
	'#CDCFF9',
	'#D0FFEA',
	'#F7EBC0',
	'#EEC7F7',
] as const;
const CAMPAIGN_FOLDER_ICON_COLORS = [
	'#B84A4A',
	'#CB56D1',
	'#A256D1',
	'#56BFD1',
	'#DDA544',
] as const;
const DEFAULT_MOCK_CAMPAIGN_DATA_TYPES: CampaignDataTypeSummary[] = [
	{
		kind: 'category',
		key: 'wine_beer_spirits',
		label: getCampaignDataCategoryLabel('wine_beer_spirits'),
		count: 8,
	},
	{ kind: 'state', key: 'NY', label: 'NY', count: 4 },
	{ kind: 'state', key: 'PA', label: 'PA', count: 3 },
	{ kind: 'state', key: 'IL', label: 'IL', count: 2 },
	{ kind: 'state', key: 'TN', label: 'TN', count: 2 },
	{ kind: 'state', key: 'TX', label: 'TX', count: 1 },
	{ kind: 'state', key: 'CA', label: 'CA', count: 1 },
];

const FINDER_CONTACT_CATEGORY_LABELS: Record<CampaignDataTypeCategoryKey, string> = {
	wine_beer_spirits: 'Wine, Beer, Spirits',
	restaurants: 'Restaurant',
	coffee_shops: 'Coffee Shop',
	music_venues: 'Music Venue',
	music_festivals: 'Music Festival',
	wedding: 'Wedding',
	radio: 'Radio',
};

const getCampaignFolderPaletteIndex = (rowIndex: number) => {
	const paletteLength = CAMPAIGN_FOLDER_NAME_BOX_COLORS.length;
	return ((rowIndex % paletteLength) + paletteLength) % paletteLength;
};

const buildMockCampaignRows = (mockState: CampaignsMockState): CampaignWithCounts[] => {
	const folders = mockState.folders ?? [];
	const limited = folders.slice(0, 5);
	const now = Date.now();
	const msInDay = 24 * 60 * 60 * 1000;
	return limited.map((folder, index) => {
		const updatedDaysAgo = Math.max(0, folder.updatedDaysAgo ?? 0);
		const updatedAt = new Date(now - updatedDaysAgo * msInDay);
		// Cast to Campaign — cell renderers only read id/name/draftCount/sentCount/
		// updatedAt, and handleRowClick is short-circuited while mock data is active,
		// so the rest of the prisma Campaign columns aren't needed.
		return {
			id: -1000 - index,
			name: folder.name?.trim() || DEFAULT_MOCK_FOLDER_NAMES[index] || `Folder ${index + 1}`,
			draftCount: Math.max(0, folder.draftCount ?? 0),
			sentCount: Math.max(0, folder.sentCount ?? 0),
			newEmailCount: Math.max(0, folder.newEmailCount ?? 0),
			contactCount: Math.max(0, folder.contactCount ?? 0),
			campaignDataTypes: folder.campaignDataTypes ?? DEFAULT_MOCK_CAMPAIGN_DATA_TYPES,
			updatedAt,
		} as unknown as CampaignWithCounts;
	});
};

const getFinderContactPersonName = (contact: FinderContactSource): string | null => {
	const firstLast = [contact.firstName, contact.lastName]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ');

	return contact.name?.trim() || firstLast || null;
};

const getFinderContactName = (contact: FinderContactSource): string => {
	return (
		getFinderContactPersonName(contact) ||
		contact.company?.trim() ||
		contact.email?.trim() ||
		'Unknown Contact'
	);
};

const getFinderContactCategory = (
	contact: FinderContactSource
): FinderContactItem['category'] => {
	const displayLabel = contact.curatedDisplayLabel?.trim();
	const categorySources = [
		contact.curatedCategory,
		contact.curatedDisplayLabel,
		contact.title,
		contact.headline,
	];

	for (const source of categorySources) {
		const categoryKey = getCampaignDataCategoryFromText(source);
		if (!categoryKey) continue;

		return {
			key: categoryKey,
			label: displayLabel || FINDER_CONTACT_CATEGORY_LABELS[categoryKey],
		};
	}

	return null;
};

const toFinderContactItem = (
	contact: FinderContactSource,
	fallbackId: string
): FinderContactItem => ({
	id: typeof contact.id === 'number' ? contact.id : fallbackId,
	name: getFinderContactName(contact),
	personName: getFinderContactPersonName(contact),
	company: contact.company ?? null,
	title: contact.title ?? null,
	headline: contact.headline ?? null,
	category: getFinderContactCategory(contact),
	city: contact.city ?? null,
	state: contact.state ?? null,
	email: contact.email ?? null,
});

const buildMockFinderItems = (
	count: number,
	folderKey: FinderFolderKey
): FinderContactItem[] => {
	const safeCount = Math.max(0, count);
	return Array.from({ length: safeCount }, (_, index) => {
		const contact = MOCK_FINDER_CONTACTS[index % MOCK_FINDER_CONTACTS.length];
		return {
			...contact,
			id: `mock-${folderKey}-${index + 1}`,
		};
	});
};

const getUniqueContactItemsFromEmails = (
	emails: Array<Pick<EmailWithRelations, 'contact'> | Pick<InboundEmailWithRelations, 'contact'>> | undefined,
	folderKey: FinderFolderKey
): FinderContactItem[] => {
	const seenContactIds = new Set<number>();
	const items: FinderContactItem[] = [];

	emails?.forEach((email, index) => {
		const contact = email.contact as FinderContactSource | null | undefined;
		if (!contact) return;

		if (typeof contact.id === 'number') {
			if (seenContactIds.has(contact.id)) return;
			seenContactIds.add(contact.id);
		}

		items.push(toFinderContactItem(contact, `${folderKey}-${index + 1}`));
	});

	return items;
};

const normalizeFinderSearchText = (value: string | null | undefined): string =>
	(value ?? '').trim().toLowerCase();

const finderContactMatchesSearch = (item: FinderContactItem, normalizedQuery: string): boolean => {
	if (!normalizedQuery) return true;

	return [item.personName, item.name, item.company].some((value) =>
		normalizeFinderSearchText(value).includes(normalizedQuery)
	);
};

const getMetricSortValue = (campaign: CampaignWithCounts, sortKey: MetricSortKey) => {
	if (sortKey === 'sent') return campaign.sentCount ?? 0;
	if (sortKey === 'updated') {
		const timestamp = new Date(campaign.updatedAt as string | number | Date).getTime();
		return Number.isFinite(timestamp) ? timestamp : 0;
	}
	return campaign.draftCount ?? 0;
};

const sortCampaignsByMetric = (
	campaigns: CampaignWithCounts[],
	sortState: MetricSortState
): CampaignWithCounts[] => {
	if (!sortState) return campaigns;

	return campaigns
		.map((campaign, index) => ({ campaign, index }))
		.sort((a, b) => {
			const aValue = getMetricSortValue(a.campaign, sortState.key);
			const bValue = getMetricSortValue(b.campaign, sortState.key);
			if (aValue === bValue) return a.index - b.index;
			return sortState.mode === 'desc' ? bValue - aValue : aValue - bValue;
		})
		.map(({ campaign }) => campaign);
};

const FinderStateBadge = ({ state }: { state?: string | null }) => {
	const stateAbbr = getStateAbbreviation(state).trim().toUpperCase();

	if (!stateAbbr) {
		return <span className="campaign-finder-state-badge-empty" aria-hidden="true" />;
	}

	return (
		<span
			className="campaign-finder-state-badge"
			style={{ backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent' }}
		>
			{stateAbbr}
		</span>
	);
};

const FinderContactRow = ({
	item,
	index,
	dotColor,
}: {
	item: FinderContactItem;
	index: number;
	dotColor: string;
}) => {
	const hasLegacyPersonName = Boolean(
		item.personName === undefined &&
			item.company?.trim() &&
			item.name.trim() !== item.company.trim()
	);
	const primaryText = item.personName || item.name;
	const showCompany = Boolean((item.personName || hasLegacyPersonName) && item.company);
	const descriptorText = item.category?.label || item.title?.trim() || item.headline?.trim() || '';

	return (
		<div
			className="campaign-finder-contact-row"
			data-custom-table-ignore-row-click="true"
			style={{ backgroundColor: index % 2 === 0 ? '#FAF7F7' : '#FFFFFF' }}
		>
			<span
				className="campaign-finder-contact-dot"
				style={{ backgroundColor: dotColor }}
				aria-hidden="true"
			/>
			<span className="campaign-finder-contact-name" title={primaryText}>
				{primaryText}
			</span>
			{showCompany ? (
				<span className="campaign-finder-contact-company" title={item.company ?? undefined}>
					{item.company}
				</span>
			) : (
				<span className="campaign-finder-contact-company-empty" aria-hidden="true" />
			)}
			<span
				className="campaign-finder-contact-descriptor"
				title={descriptorText || undefined}
			>
				{descriptorText}
			</span>
			<span className="campaign-finder-contact-category-icon" aria-hidden={!item.category}>
				{item.category ? (
					<CampaignDataTypeBadge
						dataType={{
							kind: 'category',
							key: item.category.key,
							label: item.category.label,
							count: 1,
						}}
					/>
				) : null}
			</span>
			<FinderStateBadge state={item.state} />
			{item.city ? (
				<span className="campaign-finder-contact-city" title={item.city}>
					{item.city}
				</span>
			) : (
				<span className="campaign-finder-contact-city-empty" aria-hidden="true" />
			)}
		</div>
	);
};

const CampaignFinderPanel = ({
	folders,
	expandedFolderKeys,
	onToggleFolder,
	searchQuery,
}: {
	folders: FinderFolder[];
	expandedFolderKeys: FinderFolderKey[];
	onToggleFolder: (folderKey: FinderFolderKey) => void;
	searchQuery: string;
}) => {
	const stopFinderEvent = (event: React.SyntheticEvent) => {
		event.stopPropagation();
		event.nativeEvent.stopImmediatePropagation();
	};
	const isSearching = normalizeFinderSearchText(searchQuery).length > 0;
	const contactsFolder = folders.find((folder) => folder.key === 'contacts');
	const searchItems = contactsFolder?.items ?? [];

	return (
		<div className="campaign-finder-cell" data-custom-table-ignore-row-click="true">
			<div
				className="campaign-finder-panel"
				data-custom-table-ignore-row-click="true"
				onPointerDown={stopFinderEvent}
				onMouseDown={stopFinderEvent}
				onClick={stopFinderEvent}
			>
				{isSearching ? (
					<div className="campaign-finder-search-results">
						{searchItems.length > 0 ? (
							searchItems.map((item, itemIndex) => (
								<FinderContactRow
									key={`search-${item.id}`}
									item={item}
									index={itemIndex}
									dotColor={contactsFolder?.color ?? '#CC5858'}
								/>
							))
						) : (
							<div className="campaign-finder-empty-row">
								No matching contacts
							</div>
						)}
					</div>
				) : folders.map((folder, folderIndex) => {
					const isExpanded = expandedFolderKeys.includes(folder.key);
					const handleToggle = () => onToggleFolder(folder.key);

					return (
						<div key={folder.key} className="campaign-finder-folder-group">
							<button
								type="button"
								className="campaign-finder-folder-row"
								data-custom-table-ignore-row-click="true"
								style={{
									backgroundColor: folderIndex % 2 === 0 ? '#FAF7F7' : '#FFFFFF',
								}}
								onClick={(event) => {
									stopFinderEvent(event);
									handleToggle();
								}}
								aria-expanded={isExpanded}
							>
								<CampaignRowChevronIcon
									className={cn(
										'campaign-finder-folder-chevron',
										isExpanded && 'campaign-finder-folder-chevron-open'
									)}
								/>
								<span
									className="campaign-finder-folder-icon"
									style={{ color: folder.color }}
								>
									<DashboardActionBarFolderIcon width={16} height={10} />
								</span>
								<span className="campaign-finder-folder-label">{folder.label}</span>
							</button>
							{isExpanded
								? folder.items.map((item, itemIndex) => (
									<FinderContactRow
										key={`${folder.key}-${item.id}`}
										item={item}
										index={itemIndex}
										dotColor={folder.color}
									/>
								  ))
								: null}
						</div>
					);
				})}
			</div>
		</div>
	);
};

const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const LARGE_METRIC_COUNT_THRESHOLD = 1000;
const largeMetricCountFormatter = new Intl.NumberFormat('de-DE', {
	maximumFractionDigits: 0,
});

const formatMetricCount = (value: number) =>
	value >= LARGE_METRIC_COUNT_THRESHOLD
		? largeMetricCountFormatter.format(value)
		: value.toString().padStart(2, '0');

const formatMetricPillLabel = (value: number, suffix: string) =>
	value >= LARGE_METRIC_COUNT_THRESHOLD
		? formatMetricCount(value)
		: `${formatMetricCount(value)} ${suffix}`;

type MetricSortKey = 'drafts' | 'sent' | 'updated';
type MetricSortMode = 'desc' | 'asc';
type MetricSortState = { key: MetricSortKey; mode: MetricSortMode } | null;

const startOfDay = (d: Date) => {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
};

const getDraftFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v <= 6.25) return '#FFFBF3';
	if (v <= 12.5) return '#FFF7E7';
	if (v <= 18.75) return '#FFF3DB';
	if (v <= 25) return '#FFEFCE';
	if (v <= 31.25) return '#FFEBC2';
	if (v <= 37.5) return '#FFE7B6';
	return '#FFE3AA';
};

const getSentFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v > 1) return '#F3FCF1';
	return '#FFFFFF'; // v === 1
};

const getUpdatedFillColor = (updatedAt: Date): string => {
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF'; // Today
	if (days <= 3) return '#FBEEEE'; // Yesterday to 3 days ago
	if (days <= 7) return '#F8DDDD'; // 1 week ago
	if (days <= 14) return '#F4CCCC'; // 2 weeks ago
	if (days <= 30) return '#F0BABA'; // 1 month ago
	if (days <= 45) return '#ECA9A9'; // 1.5 months ago
	if (days <= 60) return '#E99898'; // 2 months ago
	return '#E58787'; // 3+ months ago
};

const getUpdatedLabel = (updatedAt: Date): string => {
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	return now.getTime() === then.getTime() ? 'Today' : mmdd(updatedAt);
};

const CAMPAIGN_DATA_CATEGORY_BACKGROUND: Record<CampaignDataTypeCategoryKey, string> = {
	wine_beer_spirits: '#BFC4FF',
	restaurants: '#C3FBD1',
	coffee_shops: '#D6F1BD',
	music_venues: '#B7E5FF',
	music_festivals: '#C1D6FF',
	wedding: '#FFF2BC',
	radio: '#E8EFFF',
};

const renderCampaignDataCategoryIcon = (key: CampaignDataTypeCategoryKey) => {
	switch (key) {
		case 'wine_beer_spirits':
			return <WineBeerSpiritsIcon size={11} className="flex-shrink-0" />;
		case 'restaurants':
			return <RestaurantsIcon size={12} className="flex-shrink-0" />;
		case 'coffee_shops':
			return <CoffeeShopsIcon size={7} className="flex-shrink-0" />;
		case 'music_venues':
			return <MusicVenuesIcon size={13} className="flex-shrink-0" />;
		case 'music_festivals':
			return <FestivalsIcon size={12} className="flex-shrink-0" />;
		case 'wedding':
			return <WeddingPlannersIcon size={12} className="flex-shrink-0" />;
		case 'radio':
			return <RadioStationsIcon size={13} className="flex-shrink-0" />;
	}
};

const CampaignDataTypeBadge = ({ dataType }: { dataType: CampaignDataTypeSummary }) => {
	if (dataType.kind === 'category') {
		return (
			<span
				className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
				style={{ backgroundColor: CAMPAIGN_DATA_CATEGORY_BACKGROUND[dataType.key] }}
				title={dataType.label}
			>
				{renderCampaignDataCategoryIcon(dataType.key)}
			</span>
		);
	}

	const { icon, backgroundColor } = getCityIconProps('', dataType.key);
	return (
		<span
			className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
			style={{ backgroundColor }}
			title={dataType.label}
		>
			<span className="inline-flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[10px] [&>svg]:max-w-[11px] [&>svg]:w-auto">
				{icon}
			</span>
		</span>
	);
};

const CampaignDataTypeIconStrip = ({
	dataTypes,
	isConfirming,
	hasNew,
}: {
	dataTypes: CampaignDataTypeSummary[];
	isConfirming: boolean;
	hasNew: boolean;
}) => {
	const stripSpacingClassName = hasNew ? 'ml-[23px] mr-2' : 'ml-[8px] mr-1';

	if (isConfirming || dataTypes.length === 0) {
		return (
			<div
				className={cn('folder-icon-strip h-[15px] flex-1', stripSpacingClassName)}
				aria-hidden="true"
			/>
		);
	}

	const visibleDataTypes = dataTypes.slice(0, 3);
	const overflowCount = Math.max(0, dataTypes.length - visibleDataTypes.length);
	const label = dataTypes.map((dataType) => dataType.label).join(', ');

	return (
		<div
			className={cn(
				'folder-icon-strip flex h-[15px] min-w-0 flex-1 items-center justify-start gap-[4px] overflow-hidden',
				stripSpacingClassName
			)}
			aria-label={`Campaign data types: ${label}`}
		>
			{visibleDataTypes.map((dataType) => (
				<CampaignDataTypeBadge
					key={`${dataType.kind}-${dataType.key}`}
					dataType={dataType}
				/>
			))}
			{overflowCount > 0 ? (
				<span
					className={cn(
						'flex-none font-inter text-[8.021px] font-medium not-italic leading-[9.95px]',
						isConfirming ? 'text-white' : 'text-black'
					)}
				>
					+{overflowCount}
				</span>
			) : null}
		</div>
	);
};

export const useCampaignsTable = (options?: {
	compactMetrics?: boolean;
	mockState?: CampaignsMockState;
	enableFinder?: boolean;
	finderSearchQuery?: string;
}) => {
	const compactMetrics = options?.compactMetrics ?? false;
	const mockState = options?.mockState;
	const enableFinder = options?.enableFinder ?? true;
	const finderSearchQuery = options?.finderSearchQuery ?? '';
	const normalizedFinderSearchQuery = normalizeFinderSearchText(finderSearchQuery);
	const isMockActive = mockState != null;
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [openCampaignId, setOpenCampaignId] = useState<number | null>(null);
	const [openFolderKeys, setOpenFolderKeys] = useState<FinderFolderKey[]>([]);
	const frozenCampaignOrderRef = useRef<number[] | null>(null);
	const isFinderOpen = enableFinder && openCampaignId !== null;

	const [metricSort, setMetricSort] = useState<MetricSortState>(null);
	const metricSortKey = metricSort?.key ?? null;
	const metricSortMode = metricSort?.mode ?? null;
	const isMetricSortActive = metricSort !== null;

	const draftsHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setDraftsHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		draftsHeaderButtonRef.current = el;
	}, []);
	const sentHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setSentHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		sentHeaderButtonRef.current = el;
	}, []);
	const updatedHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setUpdatedHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		updatedHeaderButtonRef.current = el;
	}, []);

	// Use the custom animation hook
	useRowConfirmationAnimation({
		confirmingCampaignId,
		setCountdown,
	});

	// Clear timeout on unmount
	useEffect(() => {
		return () => {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
		};
	}, []);

	const closeFinder = useCallback(() => {
		setOpenCampaignId(null);
		setOpenFolderKeys([]);
		frozenCampaignOrderRef.current = null;
	}, []);

	useEffect(() => {
		if (!enableFinder && openCampaignId !== null) {
			closeFinder();
		}
	}, [closeFinder, enableFinder, openCampaignId]);

	useEffect(() => {
		if (!isFinderOpen) return;

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			const targetElement =
				target instanceof Element
					? target
					: target instanceof Node
						? target.parentElement
						: null;
			const tableBox = document.querySelector(
				'.my-campaigns-table.campaigns-finder-open'
			);

			if (targetElement?.closest('.my-campaigns-table, .campaign-finder-split-shell')) return;

			if (tableBox instanceof HTMLElement) {
				const rect = tableBox.getBoundingClientRect();
				const isInsideTableBox =
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;

				if (isInsideTableBox) return;
			}

			closeFinder();
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
	}, [closeFinder, isFinderOpen]);

	// Keep the Drafts sort underline anchored to the bottom of the table container,
	// aligned with the Drafts header "pill" width.
	useIsomorphicLayoutEffect(() => {
		let raf1: number | null = null;
		let raf2: number | null = null;

		const cancelRafs = () => {
			if (raf1 !== null) cancelAnimationFrame(raf1);
			if (raf2 !== null) cancelAnimationFrame(raf2);
			raf1 = null;
			raf2 = null;
		};

		const update = () => {
			const btn =
				metricSortKey === 'sent'
					? sentHeaderButtonRef.current
					: metricSortKey === 'updated'
						? updatedHeaderButtonRef.current
					: metricSortKey === 'drafts'
						? draftsHeaderButtonRef.current
						: null;
			if (!btn) return;

			const container = btn.closest('.my-campaigns-table') as HTMLElement | null;
			if (!container) return;

			const headerGrid = btn.closest('.metrics-header-grid') as HTMLElement | null;

			const btnRect = btn.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			const headerTh = btn.closest('th') as HTMLElement | null;

			// If an ancestor scales the table (transform: scale OR CSS zoom), getBoundingClientRect()
			// reflects the visual size. We want the *layout* size for CSS positioning inside the same
			// scaled subtree, so compute a visual->layout scale factor. Prefer computed style widths
			// because offsetWidth reflects the *used* (flex-shrunk) layout size (which is what we want).
			const safeScale = (() => {
				if (btn.offsetWidth > 0) {
					const s = btnRect.width / btn.offsetWidth;
					if (Number.isFinite(s) && s > 0) return s;
				}
				return 1;
			})();

			const btnLeftInContainer = (btnRect.left - containerRect.left) / safeScale;
			const bottomLineLeft = btnLeftInContainer + 1;
			const metricBoxSelector =
				metricSortKey === 'sent'
					? ".metric-box[data-sent-fill]"
					: metricSortKey === 'updated'
						? ".metric-box[data-updated-fill]"
					: ".metric-box[data-draft-fill]";
			const metricBox =
				compactMetrics
					? (container.querySelector(metricBoxSelector) as HTMLElement | null)
					: null;
			const headerWidth = metricBox?.offsetWidth ?? btn.offsetWidth;

			const bottomLineWidth = Math.max(0, headerWidth - 2);

			container.style.setProperty('--drafts-sort-indicator-left', `${bottomLineLeft}px`);
			container.style.setProperty('--drafts-sort-indicator-width', `${bottomLineWidth}px`);

			// Header highlight follows the actual rendered Drafts header "pill" width at every breakpoint.
			// Use offsetLeft/offsetWidth to avoid computed-width vs flex-shrink mismatches.
			// Attach it to the <th> so it can fill the full header height.
			if (headerTh) {
				const gridLeftInTh = headerGrid ? headerGrid.offsetLeft : 0;
				const baseLeftInTh = gridLeftInTh + btn.offsetLeft;
				// In very narrow/compact layouts, the header label can be slightly wider than the
				// actual metric pill below (due to flex/text sizing). Prefer the real pill width
				// so the highlight never includes the inter-pill spacing at ~500px widths.
				headerTh.style.setProperty('--drafts-sort-highlight-left', `${baseLeftInTh}px`);
				headerTh.style.setProperty('--drafts-sort-highlight-width', `${headerWidth}px`);

				// Ascending indicator (36x2, BABABA) lives on the header <th> so it scrolls away with the header.
				// Align it to the "Drafts" text start (pl-2) or center in compact mode.
				const desiredAscWidth = 36;
				const ascWidth = Math.max(0, Math.min(desiredAscWidth, headerWidth - 2));
				const shouldCenterAsc = compactMetrics;
				const ascLeft = shouldCenterAsc
					? baseLeftInTh + (headerWidth - ascWidth) / 2
					: baseLeftInTh + 8; // Tailwind pl-2 = 8px, aligns to text start
				headerTh.style.setProperty('--drafts-sort-asc-left', `${ascLeft}px`);
				headerTh.style.setProperty('--drafts-sort-asc-width', `${ascWidth}px`);
			}
		};

		const scheduleUpdate = () => {
			// Run now, then on the next two frames. This catches layout changes that happen via
			// ResizeObserver + requestAnimationFrame (e.g., campaigns-table scaling/zoom).
			cancelRafs();
			update();
			raf1 = requestAnimationFrame(() => {
				update();
				raf2 = requestAnimationFrame(() => update());
			});
		};

		if (!isMetricSortActive) {
			const btn =
				draftsHeaderButtonRef.current ??
				sentHeaderButtonRef.current ??
				updatedHeaderButtonRef.current;
			const container = btn
				? (btn.closest('.my-campaigns-table') as HTMLElement | null)
				: null;
			if (container) {
				container.removeAttribute('data-drafts-sort-active');
				container.removeAttribute('data-drafts-sort-mode');
				container.style.removeProperty('--drafts-sort-indicator-left');
				container.style.removeProperty('--drafts-sort-indicator-width');
			}
			const headerTh = btn ? (btn.closest('th') as HTMLElement | null) : null;
			if (headerTh) {
				headerTh.style.removeProperty('--drafts-sort-highlight-left');
				headerTh.style.removeProperty('--drafts-sort-highlight-width');
				headerTh.style.removeProperty('--drafts-sort-asc-left');
				headerTh.style.removeProperty('--drafts-sort-asc-width');
			}
			cancelRafs();
			return;
		}

		const btn =
			metricSortKey === 'sent'
				? sentHeaderButtonRef.current
				: metricSortKey === 'updated'
					? updatedHeaderButtonRef.current
				: metricSortKey === 'drafts'
					? draftsHeaderButtonRef.current
					: null;
		if (!btn) return;
		const container = btn.closest('.my-campaigns-table') as HTMLElement | null;
		if (!container) return;

		container.setAttribute('data-drafts-sort-active', 'true');
		container.setAttribute('data-drafts-sort-mode', metricSortMode === 'asc' ? 'asc' : 'desc');
		scheduleUpdate();

		const handleResize = () => scheduleUpdate();
		window.addEventListener('resize', handleResize, { passive: true });

		const ro = new ResizeObserver(() => scheduleUpdate());
		ro.observe(container);

		// Watch the parent campaigns-table container for scale/zoom updates (style/attr changes),
		// since CSS zoom changes don't always trigger ResizeObserver on the table itself.
		const scaleContainer = container.closest('.campaigns-table-container') as HTMLElement | null;
		const mo =
			scaleContainer && 'MutationObserver' in window
				? new MutationObserver(() => scheduleUpdate())
				: null;
		if (scaleContainer && mo) {
			mo.observe(scaleContainer, {
				attributes: true,
				attributeFilter: ['style', 'data-ultra-narrow-scale', 'data-mobile-ultra-narrow-scale'],
			});
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			ro.disconnect();
			mo?.disconnect();
			cancelRafs();
		};
	}, [isMetricSortActive, metricSortKey, metricSortMode, compactMetrics]);

	const { data: realData, isPending: realIsPending } = useGetCampaigns();
	const mockData = useMemo(
		() => (mockState ? buildMockCampaignRows(mockState) : null),
		[mockState]
	);
	const baseData = (mockData ?? realData) as CampaignWithCounts[] | undefined;
	const selectedCampaignId = enableFinder && openCampaignId !== null ? openCampaignId : null;
	const selectedCampaignIdForRealQuery =
		!isMockActive && selectedCampaignId !== null ? String(selectedCampaignId) : '';
	const { data: selectedCampaign } = useGetCampaign(selectedCampaignIdForRealQuery);
	const selectedContactListIds = useMemo(
		() =>
			(selectedCampaign?.userContactLists ?? [])
				.map((contactList) => contactList.id)
				.filter((id): id is number => typeof id === 'number'),
		[selectedCampaign?.userContactLists]
	);
	const shouldFetchFinderData =
		enableFinder && !isMockActive && selectedCampaignId !== null;
	const { data: finderContacts } = useGetContacts({
		filters: { contactListIds: selectedContactListIds },
		enabled: shouldFetchFinderData && selectedContactListIds.length > 0,
	});
	const { data: finderDraftEmails } = useGetEmails({
		filters: {
			campaignId: selectedCampaignId ?? undefined,
			status: EmailStatus.draft,
		},
		enabled: shouldFetchFinderData,
	});
	const { data: finderSentEmails } = useGetEmails({
		filters: {
			campaignId: selectedCampaignId ?? undefined,
			status: EmailStatus.sent,
		},
		enabled: shouldFetchFinderData,
	});
	const { data: finderInboundEmails } = useGetInboundEmails({
		filters: { campaignId: selectedCampaignId ?? undefined },
		enabled: shouldFetchFinderData,
	});
	const sortedCampaignData = useMemo(
		() => (baseData ? sortCampaignsByMetric(baseData, metricSort) : baseData),
		[baseData, metricSort]
	);
	const displayedCampaignData = useMemo(() => {
		if (!sortedCampaignData || openCampaignId === null || !frozenCampaignOrderRef.current) {
			return sortedCampaignData;
		}

		const byId = new Map(sortedCampaignData.map((campaign) => [campaign.id, campaign]));
		const ordered = frozenCampaignOrderRef.current
			.map((campaignId) => byId.get(campaignId))
			.filter((campaign): campaign is CampaignWithCounts => Boolean(campaign));
		const orderedIds = new Set(ordered.map((campaign) => campaign.id));
		const added = sortedCampaignData.filter((campaign) => !orderedIds.has(campaign.id));

		return [...ordered, ...added];
	}, [openCampaignId, sortedCampaignData]);
	const data = useMemo<CampaignTableRow[] | undefined>(() => {
		if (!displayedCampaignData) return displayedCampaignData;
		if (!isFinderOpen || openCampaignId === null) return displayedCampaignData;

		return displayedCampaignData.flatMap((campaign) => {
			if (campaign.id !== openCampaignId) return [campaign];

			return [
				campaign,
				{
					id: `finder-${campaign.id}`,
					__rowType: 'finder',
					__customTableColSpanAll: true,
					parentCampaignId: campaign.id,
					name: '',
					draftCount: 0,
					sentCount: 0,
					newEmailCount: 0,
					updatedAt: new Date(campaign.updatedAt),
				} satisfies FinderTableRow,
			];
		});
	}, [displayedCampaignData, isFinderOpen, openCampaignId]);
	const openFinderForCampaign = useCallback(
		(campaignId: number | null) => {
			if (!enableFinder || campaignId === null) {
				closeFinder();
				return;
			}

			frozenCampaignOrderRef.current =
				sortedCampaignData?.map((campaign) => campaign.id) ?? null;
			setOpenCampaignId(campaignId);
			setOpenFolderKeys([]);
		},
		[closeFinder, enableFinder, sortedCampaignData]
	);
	const isPending = isMockActive ? false : realIsPending;
	const shouldShowNewMetricSlot = useMemo(() => {
		if (displayedCampaignData == null) return true;
		return displayedCampaignData.some(
			(campaign: CampaignWithCounts) => (campaign.newEmailCount ?? 0) >= 1
		);
	}, [displayedCampaignData]);
	const desktopMetricsStyle = compactMetrics
		? undefined
		: ({
				gap: 'var(--campaign-metric-gap, 32px)',
				...(shouldShowNewMetricSlot ? {} : { '--campaign-metric-gap': '62px' }),
		  } as CSSProperties);

	useEffect(() => {
		if (openCampaignId !== null && !baseData?.some((campaign) => campaign.id === openCampaignId)) {
			closeFinder();
		}
	}, [baseData, closeFinder, openCampaignId]);

	const handleFinderToggleClick = useCallback(
		(event: React.MouseEvent, campaignId: number) => {
			event.preventDefault();
			event.stopPropagation();

			if (!enableFinder) return;

			if (openCampaignId === campaignId) {
				closeFinder();
				return;
			}

			openFinderForCampaign(campaignId);
		},
		[closeFinder, enableFinder, openCampaignId, openFinderForCampaign]
	);

	const toggleFinderFolder = useCallback((folderKey: FinderFolderKey) => {
		setOpenFolderKeys((current) =>
			current.includes(folderKey)
				? current.filter((key) => key !== folderKey)
				: [...current, folderKey]
		);
	}, []);

	const openCampaign = useMemo(
		() => displayedCampaignData?.find((campaign) => campaign.id === openCampaignId) ?? null,
		[displayedCampaignData, openCampaignId]
	);
	const finderFolders = useMemo<FinderFolder[]>(() => {
		const applySearchFilter = (folders: FinderFolder[]) => {
			if (!normalizedFinderSearchQuery) return folders;

			return folders.map((folder) =>
				folder.key === 'contacts'
					? {
							...folder,
							items: folder.items.filter((item) =>
								finderContactMatchesSearch(item, normalizedFinderSearchQuery)
							),
					  }
					: folder
			);
		};

		if (!openCampaign) {
			return applySearchFilter(FINDER_FOLDER_CONFIG.map((folder) => ({ ...folder, items: [] })));
		}

		if (isMockActive) {
			const mockContactCount = openCampaign.contactCount;
			const itemsByKey: Record<FinderFolderKey, FinderContactItem[]> = {
				contacts:
					typeof mockContactCount === 'number'
						? buildMockFinderItems(mockContactCount, 'contacts')
						: MOCK_FINDER_CONTACTS,
				drafts: buildMockFinderItems(openCampaign.draftCount ?? 0, 'drafts'),
				inbox: buildMockFinderItems(openCampaign.newEmailCount ?? 0, 'inbox'),
				sent: buildMockFinderItems(openCampaign.sentCount ?? 0, 'sent'),
				archive: [],
			};

			return applySearchFilter(FINDER_FOLDER_CONFIG.map((folder) => ({
				...folder,
				items: itemsByKey[folder.key],
			})));
		}

		const contactItems = (finderContacts ?? []).map((contact: ContactWithName, index) =>
			toFinderContactItem(contact, `contact-${index + 1}`)
		);
		const draftItems = getUniqueContactItemsFromEmails(finderDraftEmails, 'drafts');
		const inboxItems = getUniqueContactItemsFromEmails(finderInboundEmails, 'inbox');
		const sentItems = getUniqueContactItemsFromEmails(finderSentEmails, 'sent');
		const itemsByKey: Record<FinderFolderKey, FinderContactItem[]> = {
			contacts: contactItems,
			drafts: draftItems,
			inbox: inboxItems,
			sent: sentItems,
			archive: [],
		};

		return applySearchFilter(FINDER_FOLDER_CONFIG.map((folder) => ({
			...folder,
			items: itemsByKey[folder.key],
		})));
	}, [
		finderContacts,
		finderDraftEmails,
		finderInboundEmails,
		finderSentEmails,
		isMockActive,
		normalizedFinderSearchQuery,
		openCampaign,
	]);

	const handleMetricSortClick = useCallback(
		(sortKey: MetricSortKey) => {
			if (isFinderOpen) return;

			setMetricSort((current) => {
				const next: MetricSortState =
					current?.key !== sortKey
						? { key: sortKey, mode: 'desc' }
						: current.mode === 'desc'
							? { key: sortKey, mode: 'asc' }
							: null;

				return next;
			});
		},
		[isFinderOpen]
	);

	const columns: ColumnDef<CampaignTableRow>[] = [
		{
			accessorKey: 'name',
			header: () => (
				<div className="text-left pl-0 font-inter font-medium text-[13px] text-black">
					Folders
				</div>
			),
			cell: ({ row, table }) => {
				const original = row.original as CampaignTableRow;
				if (isFinderTableRow(original)) {
					return (
						<CampaignFinderPanel
							folders={finderFolders}
							expandedFolderKeys={openFolderKeys}
							onToggleFolder={toggleFinderFolder}
							searchQuery={finderSearchQuery}
						/>
					);
				}

				const name: string = row.getValue('name');
				const campaign = original as CampaignWithCounts;
				const isConfirming = campaign.id === confirmingCampaignId;
				const isCampaignFinderOpen = isFinderOpen && campaign.id === openCampaignId;
				const newCount = campaign.newEmailCount ?? 0;
				const campaignDataTypes = campaign.campaignDataTypes ?? [];
				const hasNew = newCount >= 1;
				const visibleRowIndex = table
					.getRowModel()
					.rows.filter(
						(visibleRow) => !isFinderTableRow(visibleRow.original as CampaignTableRow)
					)
					.findIndex((visibleRow) => visibleRow.id === row.id);
				const paletteIndex = getCampaignFolderPaletteIndex(
					visibleRowIndex >= 0 ? visibleRowIndex : row.index
				);
				const nameBoxColor = CAMPAIGN_FOLDER_NAME_BOX_COLORS[paletteIndex];
				const folderIconColor = CAMPAIGN_FOLDER_ICON_COLORS[paletteIndex];
				if (!name) {
					return (
						<Typography variant="muted" className="text-sm">
							No Data
						</Typography>
					);
				}
				return (
					<div
						className="campaign-row-folder-cell relative text-left"
						data-finder-open={isCampaignFinderOpen ? 'true' : undefined}
					>
						{!isConfirming && enableFinder && (
							<button
								type="button"
								className="campaign-row-left-hover-surface"
								data-custom-table-ignore-row-click="true"
								aria-label={`${isCampaignFinderOpen ? 'Hide' : 'Show'} ${name}`}
								onClick={(event) => handleFinderToggleClick(event, campaign.id)}
							/>
						)}
						<CampaignRowChevronIcon
							className={cn(
								'campaign-row-chevron pointer-events-none absolute left-[-19px] top-1/2 h-[14px] w-[14px] -translate-y-1/2',
								isConfirming ? 'text-white' : 'text-black',
								isCampaignFinderOpen && 'campaign-row-chevron-open'
							)}
						/>
						<div
							className="folder-pill inline-flex items-center box-border flex-none"
							style={{
								width: hasNew ? 307 : shouldShowNewMetricSlot ? 219 : 222,
								height: 20,
								borderRadius: 6.389,
								border: '0.799px solid #000',
								background: isConfirming ? 'transparent' : '#EEFFF0',
								paddingLeft: 7,
								/* paddingRight 26 (1+ new) shifts the new-count text ~14px left so it
								   sits visually under the "New" column header rather than
								   against the pill's right edge. */
								paddingRight: hasNew ? 26 : 7,
							}}
						>
							<div
								className="campaign-folder-name-box inline-flex items-center box-border flex-none overflow-hidden"
								style={{
									width: 112,
									height: 15,
									borderRadius: 3,
									background: isConfirming ? 'transparent' : nameBoxColor,
									paddingLeft: 2,
									paddingRight: 6,
								}}
							>
								<span
									className="campaign-folder-name-content inline-flex min-w-0 items-center"
								>
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: isConfirming ? '#FFFFFF' : folderIconColor }}
									>
										<DashboardActionBarFolderIcon width={16} height={10} />
									</span>
									<span
										className={cn(
											'ml-[7px] truncate text-[13.854px] leading-[15px] font-inter font-medium',
											isConfirming ? 'text-white' : 'text-black'
										)}
									>
										{name}
									</span>
								</span>
								<span className="campaign-folder-show-content min-w-0 items-center">
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: isConfirming ? '#FFFFFF' : folderIconColor }}
									>
										<DashboardActionBarFolderIcon
											className="campaign-folder-show-icon"
											width={16}
											height={10}
										/>
									</span>
									<span
										className={cn(
											'ml-[9px] text-[13.854px] leading-[15px] font-inter font-medium',
											isConfirming ? 'text-white' : 'text-black'
										)}
									>
										Show
									</span>
									<span className="campaign-folder-show-caret" aria-hidden="true" />
								</span>
								<span className="campaign-folder-goto-content min-w-0 items-center">
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: isConfirming ? '#FFFFFF' : folderIconColor }}
									>
										<DashboardActionBarFolderIcon
											className="campaign-folder-goto-icon"
											width={16}
											height={10}
										/>
									</span>
									<span
										className={cn(
											'ml-[9px] text-[13.854px] leading-[15px] font-inter font-medium',
											isConfirming ? 'text-white' : 'text-black'
										)}
									>
										Go To
									</span>
								</span>
							</div>
							<CampaignDataTypeIconStrip
								dataTypes={campaignDataTypes}
								isConfirming={isConfirming}
								hasNew={hasNew}
							/>
							{hasNew && (
								<span
									className={cn(
										'campaign-folder-new-count flex-none text-[13.854px] leading-[17.186px] font-inter font-medium whitespace-nowrap',
										isConfirming ? 'text-white' : 'text-black'
									)}
								>
									{formatMetricPillLabel(newCount, 'new')}
								</span>
							)}
						</div>
					</div>
				);
			},
			size: 315,
		},
		{
			id: 'metrics',
			// Finder freezes row order while open, so metric sorting is applied before
			// rows reach CustomTable instead of using TanStack's internal sorting state.
			accessorFn: (row) => {
				if (isFinderTableRow(row as CampaignTableRow)) return 0;
				return (
					(metricSortKey === 'sent'
						? (row as CampaignWithCounts)?.sentCount
						: metricSortKey === 'updated'
							? new Date(
									(row as CampaignWithCounts)?.updatedAt as unknown as string | number | Date
							  ).getTime()
						: (row as CampaignWithCounts)?.draftCount) ?? 0
				);
			},
			enableSorting: false,
			header: () => {
				const highlightColor =
					metricSortKey === 'updated'
						? '#FFA3A3'
						: metricSortKey === 'sent'
							? '#B4E8A8'
							: '#FFDA8F';

				return (
				<>
					{isMetricSortActive ? (
						<span
							aria-hidden="true"
							className="absolute top-0 bottom-0 pointer-events-none z-0"
							style={
								{
									left: 'var(--drafts-sort-highlight-left, 0px)',
									width: 'var(--drafts-sort-highlight-width, 80px)',
									backgroundColor: highlightColor,
								} as React.CSSProperties
							}
						/>
					) : null}
					<div
						className={cn(
							'metrics-header-grid w-full h-full items-center relative z-[1]',
							!shouldShowNewMetricSlot && 'campaign-metrics-no-new-layout',
							compactMetrics
								? 'flex flex-nowrap gap-[7px] justify-start'
								: 'flex flex-nowrap justify-end'
						)}
						style={desktopMetricsStyle}
					>
					{shouldShowNewMetricSlot && (
						<span
							className={cn(
								'metrics-header-label relative z-[1] select-none',
								!compactMetrics &&
									'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-3 text-left text-[13px] font-inter font-medium',
								compactMetrics &&
									'flex metric-width-short items-center justify-center text-[10px] font-medium tracking-[0.01em] metrics-header-label-compact'
							)}
							data-label="new"
						>
							New
						</span>
					)}
					<button
						type="button"
						ref={setDraftsHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							handleMetricSortClick('drafts');
						}}
						disabled={isFinderOpen}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
									'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-short items-center justify-center text-[10px] font-medium tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="drafts"
						aria-pressed={metricSortKey === 'drafts'}
						aria-disabled={isFinderOpen}
					>
						Drafts
					</button>
					<button
						type="button"
						ref={setSentHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							handleMetricSortClick('sent');
						}}
						disabled={isFinderOpen}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
									'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-short items-center justify-center text-[10px] font-medium tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="sent"
						aria-pressed={metricSortKey === 'sent'}
						aria-disabled={isFinderOpen}
					>
						Sent
					</button>
					<button
						type="button"
						ref={setUpdatedHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							handleMetricSortClick('updated');
						}}
						disabled={isFinderOpen}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
								'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-long items-center justify-center text-center text-[10px] font-medium leading-[1.05] tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="updated"
						aria-pressed={metricSortKey === 'updated'}
						aria-disabled={isFinderOpen}
					>
						Updated
					</button>
					</div>
				</>
				);
			},
			cell: ({ row }) => {
				const original = row.original as CampaignTableRow;
				if (isFinderTableRow(original)) return null;

				const campaign = original as CampaignWithCounts;
				const isConfirming = campaign.id === confirmingCampaignId;

				if (isConfirming) {
					return (
						<div
							className={cn(
								'metrics-grid-container w-full items-center text-left',
								compactMetrics
									? 'flex flex-nowrap gap-[7px] justify-start'
									: 'grid justify-items-start gap-8 md:gap-10 lg:gap-12'
							)}
							style={
								compactMetrics
									? undefined
									: {
											gridTemplateColumns:
												'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
									  }
							}
						>
							<div
								className={cn(
									'relative flex items-center',
									compactMetrics ? 'w-auto flex-shrink-0 justify-start' : 'w-full'
								)}
							>
								<div
									className={cn(
										'pointer-events-none font-inter font-normal text-white',
										compactMetrics
											? 'flex h-[20px] items-center justify-start text-[11px] uppercase tracking-[0.01em]'
											: 'text-[14px]'
									)}
								>
									Click to confirm <span className="ml-2">{countdown}</span>
								</div>
							</div>
							{[0, 1, 2].map((index) => (
								<div
									key={index}
									className={cn(
										'flex items-center',
										compactMetrics
											? 'h-[20px] w-[80px] flex-none justify-center'
											: 'w-full'
									)}
								/>
							))}
						</div>
					);
				}

				const draftCount = campaign.draftCount ?? 0;
				const sentCount = campaign.sentCount ?? 0;
				const newCount = campaign.newEmailCount ?? 0;
				const updatedAt = new Date(campaign.updatedAt);

				const draftDisplay = compactMetrics
					? formatMetricCount(draftCount)
					: formatMetricPillLabel(
							draftCount,
							draftCount === 1 ? 'draft' : 'drafts'
						);
				const sentDisplay = compactMetrics
					? formatMetricCount(sentCount)
					: formatMetricPillLabel(sentCount, 'sent');
				const draftFill = getDraftFillColor(draftCount);
				const sentFill = getSentFillColor(sentCount);
				const updatedFill = getUpdatedFillColor(updatedAt);
				const updatedLabel = getUpdatedLabel(updatedAt);
				// For 0-new rows we render an empty New pill in the metrics column so
				// the row matches the original layout. For 1+ new rows we skip it —
				// the combined 307 pill in the first cell already displays the count
				// and extends past the first-cell boundary into this area visually.
				// When every campaign has 0 new emails, the New column disappears entirely.
				const showEmptyNewSlot = shouldShowNewMetricSlot && newCount === 0;

				return (
					<div
						className={cn(
							'metrics-grid-container w-full items-center text-left',
							!shouldShowNewMetricSlot && 'campaign-metrics-no-new-layout',
							compactMetrics
								? 'flex flex-nowrap gap-[7px] justify-start'
								: 'flex flex-nowrap justify-end'
						)}
						style={desktopMetricsStyle}
					>
						{[
							...(showEmptyNewSlot
								? [
										{
											label: '',
											fill: '#FFFFFF',
											dataAttr: {
												'data-new-fill': '#FFFFFF',
											} as Record<string, string>,
											showGoToOnHover: false,
										},
								  ]
								: []),
							{
								label: draftDisplay,
								fill: draftFill,
								dataAttr: { 'data-draft-fill': draftFill } as Record<string, string>,
								showGoToOnHover: true,
							},
							{
								label: sentDisplay,
								fill: sentFill,
								dataAttr: { 'data-sent-fill': sentFill } as Record<string, string>,
								showGoToOnHover: true,
							},
							{
								label: updatedLabel,
								fill: updatedFill,
								dataAttr: { 'data-updated-fill': updatedFill } as Record<string, string>,
								showGoToOnHover: true,
							},
						].map(({ label, fill, dataAttr, showGoToOnHover }, index) => (
							<div
								key={index}
								className={cn(
									'campaign-metric-slot relative flex items-center',
									compactMetrics
										? 'w-auto flex-shrink-0 justify-start'
										: 'h-[20px] w-[80px] flex-none justify-center'
								)}
							>
								<div
								{...dataAttr}
								className={cn(
									'metric-box inline-flex box-border items-center justify-center border-[0.799px] border-black truncate h-[20px] w-[80px] min-w-[80px] max-w-[80px] rounded-[6.389px] px-0 flex-none font-inter font-medium text-[13.854px] leading-[17.186px]'
								)}
								style={
									{
										backgroundColor: isConfirming ? 'transparent' : fill,
										color: isConfirming ? 'white' : '#000000',
										borderColor: isConfirming
											? '#A20000'
											: '#000000',
										} as React.CSSProperties
									}
								>
									<span className="metric-box-label">{label}</span>
									{showGoToOnHover && (
										<span className="metric-box-goto-label">Go To</span>
									)}
								</div>
							</div>
						))}
					</div>
				);
			},
		},
	];

	const router = useRouter();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentRow, setCurrentRow] = useState<Campaign | null>(null);

	const { mutateAsync: deleteCampaign, isPending: isPendingDelete } = useDeleteCampaign();

	const handleRowClick = (rowData: CampaignTableRow) => {
		if (isFinderTableRow(rowData)) return;

		if (enableFinder && openCampaignId === rowData.id) {
			return;
		}

		// While mock data is active, the row IDs are synthetic (negative) and
		// would route to a nonexistent campaign detail page. Eat the click so the
		// debug session stays on the dashboard.
		if (isMockActive) return;

		// If clicking on the confirming row, execute deletion
		if (rowData.id === confirmingCampaignId) {
			// Clear any existing timeout
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			// Execute deletion
			deleteCampaign(rowData.id);
			setConfirmingCampaignId(null);
			setCurrentRow(null);
		} else {
			// Normal navigation
			const target = `${urls.murmur.campaign.detail(rowData.id)}?silent=1`;
			router.push(target);
		}
	};

	const handleDeleteClick = (e: React.MouseEvent, campaignId: number) => {
		e.stopPropagation();

		// Mock data is read-only — show the confirming animation but skip the
		// real delete mutation.
		if (isMockActive) {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			if (campaignId === confirmingCampaignId) {
				setConfirmingCampaignId(null);
				setCurrentRow(null);
			} else {
				setConfirmingCampaignId(campaignId);
				const campaign = baseData?.find((c: Campaign) => c.id === campaignId);
				if (campaign) setCurrentRow(campaign);
				confirmationTimeoutRef.current = setTimeout(() => {
					setConfirmingCampaignId(null);
					setCurrentRow(null);
				}, 5000);
			}
			return;
		}

		// Clear any existing timeout
		if (confirmationTimeoutRef.current) {
			clearTimeout(confirmationTimeoutRef.current);
		}

		// If clicking the same campaign that's confirming, execute delete
		if (campaignId === confirmingCampaignId) {
			// Execute deletion
			deleteCampaign(campaignId);
			setConfirmingCampaignId(null);
			setCurrentRow(null);
		} else {
			// Set confirming state for new campaign
			setConfirmingCampaignId(campaignId);
			const campaign = baseData?.find((c: Campaign) => c.id === campaignId);
			if (campaign) {
				setCurrentRow(campaign);
			}

			// Set timeout to revert after 5 seconds
			confirmationTimeoutRef.current = setTimeout(() => {
				setConfirmingCampaignId(null);
				setCurrentRow(null);
			}, 5000);
		}
	};

	return {
		columns,
		data,
		campaignRows: displayedCampaignData,
		isPending,
		handleRowClick,
		isFinderOpen,
		openCampaignId,
		openFinderForCampaign,
		closeFinder,
		handleDeleteClick,
		isPendingDelete,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		confirmingCampaignId,
		setConfirmingCampaignId,
		currentRow,
		setCurrentRow,
		deleteCampaign,
	};
};
