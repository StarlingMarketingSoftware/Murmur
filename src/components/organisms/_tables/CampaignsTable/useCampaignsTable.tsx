import type { Campaign, Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Typography } from '@/components/ui/typography';
import {
	useDeleteCampaign,
	useEditCampaign,
	useGetCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import {
	useCreateUserContactList,
	useEditUserContactList,
} from '@/hooks/queryHooks/useUserContactLists';
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
import { createPortal } from 'react-dom';
import { _fetch, cn, mmdd } from '@/utils';
import { useRowConfirmationAnimation } from '@/hooks/useRowConfirmationAnimation';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import CampaignRowChevronIcon from '@/components/atoms/_svg/CampaignRowChevronIcon';
import type { CampaignsMockFolder, CampaignsMockState } from './CampaignsTable';
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
import type { CampaignWithRelations, EmailWithRelations, InboundEmailWithRelations } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';

type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
	newEmailCount?: number;
	contactCount?: number;
	campaignDataTypes?: CampaignDataTypeSummary[];
	userContactListIds?: number[];
};

type FinderFolderKey = 'contacts' | 'drafts' | 'inbox' | 'sent' | 'archive';

const CAMPAIGN_FINDER_DRAG_MIME = 'application/x-murmur-campaign-finder-item';

type FinderDragItemKind = 'contact' | 'draft';

type CampaignFinderDragPayload = {
	itemKind: FinderDragItemKind;
	sourceFolderKey: FinderFolderKey;
	sourceCampaignId: number;
	sourceContactListIds: number[];
	contactId: number;
	emailId?: number;
	itemLabel: string;
};

let activeCampaignFinderDragPayload: CampaignFinderDragPayload | null = null;

const getFinderDragItemKind = (folderKey: FinderFolderKey): FinderDragItemKind | null => {
	if (folderKey === 'contacts') return 'contact';
	if (folderKey === 'drafts') return 'draft';
	return null;
};

const isCampaignFinderDragTransfer = (dataTransfer: DataTransfer): boolean =>
	Array.from(dataTransfer.types).includes(CAMPAIGN_FINDER_DRAG_MIME);

const hasCampaignFinderDragContext = (dataTransfer: DataTransfer): boolean =>
	activeCampaignFinderDragPayload !== null || isCampaignFinderDragTransfer(dataTransfer);

const parseCampaignFinderDragPayload = (value: string): CampaignFinderDragPayload | null => {
	try {
		const parsed = JSON.parse(value) as Partial<CampaignFinderDragPayload>;
		const itemKind = parsed.itemKind;
		const sourceFolderKey = parsed.sourceFolderKey;
		const sourceCampaignId = parsed.sourceCampaignId;
		const sourceContactListIds = parsed.sourceContactListIds;
		const contactId = parsed.contactId;
		const emailId = parsed.emailId;
		const itemLabel = parsed.itemLabel;

		if (itemKind !== 'contact' && itemKind !== 'draft') return null;
		if (sourceFolderKey !== 'contacts' && sourceFolderKey !== 'drafts') return null;
		if (typeof sourceCampaignId !== 'number') return null;
		if (!Array.isArray(sourceContactListIds)) return null;
		if (typeof contactId !== 'number') return null;
		if (itemKind === 'draft' && typeof emailId !== 'number') return null;
		if (typeof itemLabel !== 'string') return null;

		return {
			itemKind,
			sourceFolderKey,
			sourceCampaignId,
			sourceContactListIds: sourceContactListIds.filter(
				(id): id is number => typeof id === 'number'
			),
			contactId,
			...(typeof emailId === 'number' ? { emailId } : {}),
			itemLabel,
		};
	} catch {
		return null;
	}
};

const getCampaignFinderDragPayload = (dataTransfer: DataTransfer): CampaignFinderDragPayload | null => {
	const raw = dataTransfer.getData(CAMPAIGN_FINDER_DRAG_MIME);
	return raw ? parseCampaignFinderDragPayload(raw) : null;
};

const canDropCampaignFinderPayload = (
	payload: CampaignFinderDragPayload | null,
	targetCampaignId: number | null
): payload is CampaignFinderDragPayload => {
	if (!payload || targetCampaignId === null) return false;
	if (payload.sourceCampaignId === targetCampaignId) return false;
	if (typeof payload.contactId !== 'number') return false;
	if (payload.itemKind === 'draft' && typeof payload.emailId !== 'number') return false;
	return payload.itemKind === 'contact' || payload.itemKind === 'draft';
};

const getFinderDropTargetFolderKey = (
	payload: CampaignFinderDragPayload | null
): FinderFolderKey | null => {
	if (!payload) return null;
	if (payload.itemKind === 'contact') return 'contacts';
	if (payload.itemKind === 'draft') return 'drafts';
	return null;
};

type FinderContactItem = {
	id: string | number;
	contactId?: number;
	emailId?: number;
	campaignId?: number | null;
	researchContact?: ContactWithName | null;
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

const FINDER_SELECTED_ROW_COLORS: Record<FinderFolderKey, string> = {
	contacts: '#F5A3A3',
	drafts: '#FDDFB1',
	inbox: '#9FCAFF',
	sent: '#97E89B',
	archive: '#CCC9C9',
};

const FINDER_CONTEXT_MENU_WIDTH = 180;
const FINDER_CONTEXT_MENU_VIEWPORT_PADDING = 8;
const FINDER_CONTEXT_MENU_BASE_HEIGHT = 111;
const FINDER_CONTEXT_MENU_MOVE_TARGET_HEIGHT = 27;
const FINDER_INFO_POPUP_WIDTH = 318;
const FINDER_INFO_POPUP_HEIGHT = 352;
const FINDER_INFO_POPUP_GAP = 10;

const getDocumentZoomFactor = () => {
	if (typeof window === 'undefined') return 1;
	const zoom = window.getComputedStyle(document.documentElement).zoom;
	if (!zoom || zoom === 'normal') return 1;
	const parsedZoom = parseFloat(zoom);
	return Number.isFinite(parsedZoom) && parsedZoom > 0 ? parsedZoom : 1;
};

const getClampedFinderPopupPosition = (x: number, y: number, width: number, height: number) => {
	if (typeof window === 'undefined') return { left: x, top: y };
	const zoom = getDocumentZoomFactor();
	const scaledX = x / zoom;
	const scaledY = y / zoom;
	const viewportWidth = window.innerWidth / zoom;
	const viewportHeight = window.innerHeight / zoom;

	return {
		left: Math.max(
			FINDER_CONTEXT_MENU_VIEWPORT_PADDING,
			Math.min(scaledX, viewportWidth - width - FINDER_CONTEXT_MENU_VIEWPORT_PADDING)
		),
		top: Math.max(
			FINDER_CONTEXT_MENU_VIEWPORT_PADDING,
			Math.min(scaledY, viewportHeight - height - FINDER_CONTEXT_MENU_VIEWPORT_PADDING)
		),
	};
};

const getClampedFinderViewportPosition = (left: number, top: number, width: number, height: number) => {
	if (typeof window === 'undefined') return { left, top };
	const zoom = getDocumentZoomFactor();
	const viewportWidth = window.innerWidth / zoom;
	const viewportHeight = window.innerHeight / zoom;

	return {
		left: Math.max(
			FINDER_CONTEXT_MENU_VIEWPORT_PADDING,
			Math.min(left, viewportWidth - width - FINDER_CONTEXT_MENU_VIEWPORT_PADDING)
		),
		top: Math.max(
			FINDER_CONTEXT_MENU_VIEWPORT_PADDING,
			Math.min(top, viewportHeight - height - FINDER_CONTEXT_MENU_VIEWPORT_PADDING)
		),
	};
};

const getFinderItemSelectionKey = (folderKey: FinderFolderKey, item: FinderContactItem) => {
	if (typeof item.emailId === 'number') return `${folderKey}:email:${item.emailId}`;
	if (typeof item.contactId === 'number') return `${folderKey}:contact:${item.contactId}`;
	return `${folderKey}:item:${String(item.id)}`;
};

const getFinderContextMenuPayload = (
	state: FinderContextMenuState | null
): CampaignFinderDragPayload | null => {
	if (!state || state.sourceCampaignId === null) return null;
	const itemKind = getFinderDragItemKind(state.folderKey);
	if (!itemKind || typeof state.item.contactId !== 'number') return null;
	if (itemKind === 'draft' && typeof state.item.emailId !== 'number') return null;

	return {
		itemKind,
		sourceFolderKey: state.folderKey,
		sourceCampaignId: state.sourceCampaignId,
		sourceContactListIds: state.sourceContactListIds,
		contactId: state.item.contactId,
		...(typeof state.item.emailId === 'number' ? { emailId: state.item.emailId } : {}),
		itemLabel: state.item.name,
	};
};

const getFinderItemResearchContact = (item: FinderContactItem): ContactWithName | null => {
	if (item.researchContact) return item.researchContact;
	if (typeof item.contactId !== 'number') return null;

	return {
		id: item.contactId,
		name: item.personName || item.name,
		firstName: null,
		lastName: null,
		company: item.company ?? null,
		email: item.email ?? '',
		title: item.title ?? null,
		headline: item.headline ?? null,
		city: item.city ?? null,
		state: item.state ?? null,
		metadata: null,
	} as ContactWithName;
};

type FinderFolder = {
	key: FinderFolderKey;
	label: string;
	color: string;
	items: FinderContactItem[];
};

type FinderMoveTarget = {
	campaignId: number;
	name: string;
	folderIconColor: string;
	userContactListIds: number[];
};

type FinderContextMenuState = {
	x: number;
	y: number;
	selectionKey: string;
	folderKey: FinderFolderKey;
	item: FinderContactItem;
	sourceCampaignId: number | null;
	sourceContactListIds: number[];
};

type FinderInfoPopupState = {
	x: number;
	y: number;
	contact: ContactWithName | null;
	title: string;
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
const MOCK_CONTACT_ID_BASE = 100000;
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
			contactCount: Math.max(0, folder.contactCount ?? folder.contactIds?.length ?? 0),
			campaignDataTypes: folder.campaignDataTypes ?? DEFAULT_MOCK_CAMPAIGN_DATA_TYPES,
			updatedAt,
		} as unknown as CampaignWithCounts;
	});
};

const getMockContactId = (index: number) => MOCK_CONTACT_ID_BASE + index + 1;

const getMockContactIndex = (contactId: number) => {
	const index = contactId - MOCK_CONTACT_ID_BASE - 1;
	return Number.isInteger(index) && index >= 0 ? index : 0;
};

const resolveMockContactIds = (folder?: CampaignsMockFolder): number[] => {
	const count = Math.max(0, folder?.contactCount ?? folder?.contactIds?.length ?? 0);
	const ids = (folder?.contactIds ?? [])
		.filter((id): id is number => typeof id === 'number')
		.slice(0, count);

	for (let index = 0; ids.length < count; index++) {
		const nextId = getMockContactId(index);
		if (!ids.includes(nextId)) ids.push(nextId);
	}

	return ids;
};

const getMockCampaignFolderIndex = (campaignId: number) => {
	const index = -1000 - campaignId;
	return Number.isInteger(index) && index >= 0 ? index : -1;
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
): FinderContactItem => {
	const contactId = typeof contact.id === 'number' ? contact.id : undefined;

	return {
		id: contactId ?? fallbackId,
		...(contactId !== undefined ? { contactId } : {}),
		...(contactId !== undefined
			? {
					researchContact: {
						...contact,
						name: getFinderContactName(contact),
					} as ContactWithName,
			  }
			: {}),
		name: getFinderContactName(contact),
		personName: getFinderContactPersonName(contact),
		company: contact.company ?? null,
		title: contact.title ?? null,
		headline: contact.headline ?? null,
		category: getFinderContactCategory(contact),
		city: contact.city ?? null,
		state: contact.state ?? null,
		email: contact.email ?? null,
	};
};

const buildMockFinderItems = (
	count: number,
	folderKey: FinderFolderKey,
	contactIds?: number[]
): FinderContactItem[] => {
	const ids = contactIds ?? resolveMockContactIds({ contactCount: count });
	return ids.map((contactId) => {
		const mockIndex = getMockContactIndex(contactId);
		const contact = MOCK_FINDER_CONTACTS[mockIndex % MOCK_FINDER_CONTACTS.length];
		return {
			...contact,
			id: `mock-${folderKey}-${contactId}`,
			contactId,
			researchContact: {
				id: contactId,
				name: contact.name,
				firstName: null,
				lastName: null,
				company: contact.company ?? null,
				email: contact.email ?? '',
				title: contact.title ?? null,
				headline: null,
				city: contact.city ?? null,
				state: contact.state ?? null,
				metadata: null,
			} as ContactWithName,
		};
	});
};

const getUniqueContactItemsFromEmails = (
	emails:
		| Array<
				| Pick<EmailWithRelations, 'id' | 'campaignId' | 'contact'>
				| Pick<InboundEmailWithRelations, 'id' | 'campaignId' | 'contact'>
		  >
		| undefined,
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

		const item = toFinderContactItem(contact, `${folderKey}-${index + 1}`);
		items.push({
			...item,
			...(typeof email.id === 'number' ? { emailId: email.id } : {}),
			campaignId: typeof email.campaignId === 'number' ? email.campaignId : null,
		});
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

const CampaignFinderContextMenu = ({
	state,
	moveTargets,
	canMove,
	canRemove,
	isPending,
	onOpenInNewTab,
	onMoveToCampaign,
	onRemoveFromFolder,
	onGetInfo,
}: {
	state: FinderContextMenuState | null;
	moveTargets: FinderMoveTarget[];
	canMove: boolean;
	canRemove: boolean;
	isPending: boolean;
	onOpenInNewTab: (state: FinderContextMenuState) => void;
	onMoveToCampaign: (state: FinderContextMenuState, target: FinderMoveTarget) => void;
	onRemoveFromFolder: (state: FinderContextMenuState) => void;
	onGetInfo: (state: FinderContextMenuState) => void;
}) => {
	if (!state) return null;
	if (typeof document === 'undefined') return null;

	const showMoveSection = canMove && moveTargets.length > 0;
	const estimatedHeight =
		FINDER_CONTEXT_MENU_BASE_HEIGHT +
		(showMoveSection ? 31 + moveTargets.length * FINDER_CONTEXT_MENU_MOVE_TARGET_HEIGHT : 0) +
		(canRemove ? 36 : 0);
	const position = getClampedFinderPopupPosition(
		state.x,
		state.y,
		FINDER_CONTEXT_MENU_WIDTH,
		estimatedHeight
	);

	return createPortal(
		<div
			className="campaign-finder-context-menu"
			data-custom-table-ignore-row-click="true"
			role="menu"
			style={{ position: 'fixed', zIndex: 10000, left: position.left, top: position.top }}
			onContextMenu={(event) => event.preventDefault()}
			onPointerDown={(event) => event.stopPropagation()}
		>
			<button
				type="button"
				className="campaign-finder-context-menu-item"
				role="menuitem"
				onClick={() => onOpenInNewTab(state)}
			>
				Open in New Tab
			</button>

			{showMoveSection ? (
				<>
					<div className="campaign-finder-context-menu-separator" role="separator" />
					<div className="campaign-finder-context-menu-label">Move to</div>
					{moveTargets.map((target) => (
						<button
							type="button"
							key={target.campaignId}
							className="campaign-finder-context-menu-item campaign-finder-context-menu-move-item"
							role="menuitem"
							disabled={isPending}
							onClick={() => onMoveToCampaign(state, target)}
						>
							<span
								className="campaign-finder-context-menu-folder-icon"
								style={{ color: target.folderIconColor }}
								aria-hidden="true"
							>
								<DashboardActionBarFolderIcon width={18} height={11} />
							</span>
							<span className="campaign-finder-context-menu-target-name">
								{target.name}
							</span>
						</button>
					))}
				</>
			) : null}

			{canRemove ? (
				<>
					<div className="campaign-finder-context-menu-separator" role="separator" />
					<button
						type="button"
						className="campaign-finder-context-menu-item"
						role="menuitem"
						disabled={isPending}
						onClick={() => onRemoveFromFolder(state)}
					>
						Remove from Folder
					</button>
				</>
			) : null}

			<div className="campaign-finder-context-menu-separator" role="separator" />
			<button
				type="button"
				className="campaign-finder-context-menu-item"
				role="menuitem"
				onClick={() => onGetInfo(state)}
			>
				Get Info
			</button>
		</div>,
		document.documentElement
	);
};

const CampaignFinderInfoPopup = ({
	state,
	onClose,
}: {
	state: FinderInfoPopupState | null;
	onClose: () => void;
}) => {
	if (!state) return null;
	if (typeof document === 'undefined') return null;
	const menuPosition = getClampedFinderPopupPosition(
		state.x,
		state.y,
		FINDER_CONTEXT_MENU_WIDTH,
		FINDER_CONTEXT_MENU_BASE_HEIGHT
	);
	const popupPosition = getClampedFinderViewportPosition(
		menuPosition.left + FINDER_CONTEXT_MENU_WIDTH + FINDER_INFO_POPUP_GAP,
		menuPosition.top,
		FINDER_INFO_POPUP_WIDTH,
		FINDER_INFO_POPUP_HEIGHT
	);

	return createPortal(
		<div
			className="campaign-finder-info-popup"
			data-custom-table-ignore-row-click="true"
			role="dialog"
			aria-label={`Info for ${state.title}`}
			style={{
				position: 'fixed',
				zIndex: 10001,
				left: popupPosition.left,
				top: popupPosition.top,
			}}
			onContextMenu={(event) => event.preventDefault()}
			onPointerDown={(event) => event.stopPropagation()}
		>
			<button
				type="button"
				className="campaign-finder-info-popup-close"
				aria-label="Close info"
				onClick={onClose}
			/>
			<ContactResearchPanel
				contact={state.contact}
				width={306}
				boxWidth={292}
				height={340}
				compactHeader
				disableExpansion
			/>
		</div>,
		document.documentElement
	);
};

const FinderContactRow = ({
	item,
	index,
	dotColor,
	folderKey,
	sourceCampaignId,
	sourceContactListIds,
	selectedItemKey,
	isDragEnabled,
	onSelect,
	onContextMenu,
	onDragStart,
	onDragEnd,
}: {
	item: FinderContactItem;
	index: number;
	dotColor: string;
	folderKey: FinderFolderKey;
	sourceCampaignId: number | null;
	sourceContactListIds: number[];
	selectedItemKey: string | null;
	isDragEnabled: boolean;
	onSelect: (selectionKey: string) => void;
	onContextMenu: (
		event: React.MouseEvent<HTMLDivElement>,
		item: FinderContactItem,
		folderKey: FinderFolderKey,
		sourceCampaignId: number | null,
		sourceContactListIds: number[],
		selectionKey: string
	) => void;
	onDragStart: (event: React.DragEvent<HTMLDivElement>, payload: CampaignFinderDragPayload) => void;
	onDragEnd: () => void;
}) => {
	const hasLegacyPersonName = Boolean(
		item.personName === undefined &&
			item.company?.trim() &&
			item.name.trim() !== item.company.trim()
	);
	const primaryText = item.personName || item.name;
	const showCompany = Boolean((item.personName || hasLegacyPersonName) && item.company);
	const descriptorText = item.category?.label || item.title?.trim() || item.headline?.trim() || '';
	const selectionKey = getFinderItemSelectionKey(folderKey, item);
	const isSelected = selectedItemKey === selectionKey;
	const dragItemKind = getFinderDragItemKind(folderKey);
	const canDrag = Boolean(
		isDragEnabled &&
			dragItemKind &&
			sourceCampaignId !== null &&
			typeof item.contactId === 'number' &&
			(dragItemKind !== 'draft' || typeof item.emailId === 'number')
	);
	const dragPayload: CampaignFinderDragPayload | null =
		canDrag && dragItemKind && sourceCampaignId !== null && typeof item.contactId === 'number'
			? {
					itemKind: dragItemKind,
					sourceFolderKey: folderKey,
					sourceCampaignId,
					sourceContactListIds,
					contactId: item.contactId,
					...(typeof item.emailId === 'number' ? { emailId: item.emailId } : {}),
					itemLabel: primaryText,
			  }
			: null;

	return (
		<div
			className={cn(
				'campaign-finder-contact-row',
				'campaign-finder-contact-row-selectable',
				isSelected && 'campaign-finder-contact-row-selected',
				canDrag && 'campaign-finder-contact-row-draggable'
			)}
			data-custom-table-ignore-row-click="true"
			data-finder-row-selected={isSelected ? 'true' : undefined}
			aria-selected={isSelected}
			draggable={canDrag}
			style={{
				backgroundColor: isSelected
					? FINDER_SELECTED_ROW_COLORS[folderKey]
					: index % 2 === 0
						? '#FAF7F7'
						: '#FFFFFF',
			}}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				onSelect(selectionKey);
			}}
			onClick={() => onSelect(selectionKey)}
			onContextMenu={(event) => {
				onSelect(selectionKey);
				onContextMenu(
					event,
					item,
					folderKey,
					sourceCampaignId,
					sourceContactListIds,
					selectionKey
				);
			}}
			onDragStart={(event) => {
				onSelect(selectionKey);

				if (!dragPayload) {
					event.preventDefault();
					return;
				}

				onDragStart(event, dragPayload);
			}}
			onDragEnd={onDragEnd}
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
	campaignId,
	contactListIds,
	folders,
	expandedFolderKeys,
	onToggleFolder,
	searchQuery,
	selectedItemKey,
	isDragEnabled,
	isDropTargetActive,
	dropTargetFolderKey,
	isDropPending,
	onSelectItem,
	onItemContextMenu,
	onItemDragStart,
	onItemDragEnd,
	onPanelDragOver,
	onPanelDragLeave,
	onPanelDrop,
}: {
	campaignId: number | null;
	contactListIds: number[];
	folders: FinderFolder[];
	expandedFolderKeys: FinderFolderKey[];
	onToggleFolder: (folderKey: FinderFolderKey) => void;
	searchQuery: string;
	selectedItemKey: string | null;
	isDragEnabled: boolean;
	isDropTargetActive: boolean;
	dropTargetFolderKey: FinderFolderKey | null;
	isDropPending: boolean;
	onSelectItem: (selectionKey: string) => void;
	onItemContextMenu: (
		event: React.MouseEvent<HTMLDivElement>,
		item: FinderContactItem,
		folderKey: FinderFolderKey,
		sourceCampaignId: number | null,
		sourceContactListIds: number[],
		selectionKey: string
	) => void;
	onItemDragStart: (event: React.DragEvent<HTMLDivElement>, payload: CampaignFinderDragPayload) => void;
	onItemDragEnd: () => void;
	onPanelDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
	onPanelDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
	onPanelDrop: (event: React.DragEvent<HTMLDivElement>) => void;
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
				data-finder-drop-target={isDropTargetActive ? 'true' : undefined}
				data-finder-drop-pending={isDropPending ? 'true' : undefined}
				data-finder-drop-zone="true"
				onPointerDown={stopFinderEvent}
				onMouseDown={stopFinderEvent}
				onClick={stopFinderEvent}
				onDragOver={onPanelDragOver}
				onDragLeave={onPanelDragLeave}
				onDrop={onPanelDrop}
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
									folderKey="contacts"
									sourceCampaignId={campaignId}
									sourceContactListIds={contactListIds}
									selectedItemKey={selectedItemKey}
									isDragEnabled={isDragEnabled}
									onSelect={onSelectItem}
									onContextMenu={onItemContextMenu}
									onDragStart={onItemDragStart}
									onDragEnd={onItemDragEnd}
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
					const isFolderDropTarget = isDropTargetActive && dropTargetFolderKey === folder.key;
					const handleToggle = () => onToggleFolder(folder.key);

					return (
						<div key={folder.key} className="campaign-finder-folder-group">
							<button
								type="button"
								className="campaign-finder-folder-row"
								data-custom-table-ignore-row-click="true"
								data-finder-folder-drop-target={isFolderDropTarget ? 'true' : undefined}
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
										folderKey={folder.key}
										sourceCampaignId={campaignId}
										sourceContactListIds={contactListIds}
										selectedItemKey={selectedItemKey}
										isDragEnabled={isDragEnabled}
										onSelect={onSelectItem}
										onContextMenu={onItemContextMenu}
										onDragStart={onItemDragStart}
										onDragEnd={onItemDragEnd}
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
	onMockStateChange?: (next: CampaignsMockState | undefined) => void;
	enableFinder?: boolean;
	finderSearchQuery?: string;
	onFinderOpenInNewTab?: (campaignId: number) => void;
}) => {
	const compactMetrics = options?.compactMetrics ?? false;
	const mockState = options?.mockState;
	const onMockStateChange = options?.onMockStateChange;
	const enableFinder = options?.enableFinder ?? true;
	const finderSearchQuery = options?.finderSearchQuery ?? '';
	const onFinderOpenInNewTab = options?.onFinderOpenInNewTab;
	const normalizedFinderSearchQuery = normalizeFinderSearchText(finderSearchQuery);
	const isMockActive = mockState != null;
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [openCampaignId, setOpenCampaignId] = useState<number | null>(null);
	const [openFolderKeys, setOpenFolderKeys] = useState<FinderFolderKey[]>([]);
	const [selectedFinderItemKey, setSelectedFinderItemKey] = useState<string | null>(null);
	const frozenCampaignOrderRef = useRef<number[] | null>(null);
	const isFinderOpen = enableFinder && openCampaignId !== null;
	const queryClient = useQueryClient();
	const [isFinderDropTargetActive, setIsFinderDropTargetActive] = useState(false);
	const [finderDropTargetFolderKey, setFinderDropTargetFolderKey] =
		useState<FinderFolderKey | null>(null);
	const [isFinderDropPending, setIsFinderDropPending] = useState(false);
	const [finderContextMenu, setFinderContextMenu] =
		useState<FinderContextMenuState | null>(null);
	const [finderInfoPopup, setFinderInfoPopup] = useState<FinderInfoPopupState | null>(null);
	const { mutateAsync: createFinderUserContactList } = useCreateUserContactList({
		suppressToasts: true,
	});
	const { mutateAsync: editFinderCampaign } = useEditCampaign({ suppressToasts: true });
	const { mutateAsync: editFinderUserContactList } = useEditUserContactList({
		suppressToasts: true,
	});
	const { mutateAsync: editFinderEmail } = useEditEmail({ suppressToasts: true });

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
		setSelectedFinderItemKey(null);
		setIsFinderDropTargetActive(false);
		setFinderDropTargetFolderKey(null);
		setFinderContextMenu(null);
		setFinderInfoPopup(null);
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

	useEffect(() => {
		if (!finderContextMenu && !finderInfoPopup) return;

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			const targetElement =
				target instanceof Element
					? target
					: target instanceof Node
						? target.parentElement
						: null;

			if (targetElement?.closest('.campaign-finder-context-menu, .campaign-finder-info-popup')) {
				return;
			}

			setFinderContextMenu(null);
			setFinderInfoPopup(null);
		};

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setFinderContextMenu(null);
			setFinderInfoPopup(null);
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown);
			document.removeEventListener('keydown', handleDocumentKeyDown);
		};
	}, [finderContextMenu, finderInfoPopup]);

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
	const selectedCampaignContactListIds = useMemo(
		() =>
			(selectedCampaign?.userContactLists ?? [])
				.map((contactList) => contactList.id)
				.filter((id): id is number => typeof id === 'number'),
		[selectedCampaign?.userContactLists]
	);
	const selectedCampaignFallbackContactListIds = useMemo(() => {
		if (selectedCampaignId === null) return [];
		return (
			baseData
				?.find((campaign) => campaign.id === selectedCampaignId)
				?.userContactListIds?.filter((id): id is number => typeof id === 'number') ?? []
		);
	}, [baseData, selectedCampaignId]);
	const selectedContactListIds =
		selectedCampaignContactListIds.length > 0
			? selectedCampaignContactListIds
			: selectedCampaignFallbackContactListIds;
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
	const finderMoveTargets = useMemo<FinderMoveTarget[]>(() => {
		if (!displayedCampaignData || openCampaignId === null) return [];

		return displayedCampaignData
			.map((campaign, index) => ({ campaign, index }))
			.filter(({ campaign }) => campaign.id !== openCampaignId)
			.map(({ campaign, index }) => ({
				campaignId: campaign.id,
				name: campaign.name || `Folder ${index + 1}`,
				folderIconColor:
					CAMPAIGN_FOLDER_ICON_COLORS[getCampaignFolderPaletteIndex(index)],
				userContactListIds: (campaign.userContactListIds ?? []).filter(
					(id): id is number => typeof id === 'number'
				),
			}));
	}, [displayedCampaignData, openCampaignId]);
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
			setSelectedFinderItemKey(null);
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
	const canDragFinderItems = !isFinderDropPending && (!isMockActive || Boolean(onMockStateChange));

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

	const handleFinderItemSelect = useCallback((selectionKey: string) => {
		setSelectedFinderItemKey(selectionKey);
	}, []);

	const handleFinderItemContextMenu = useCallback(
		(
			event: React.MouseEvent<HTMLDivElement>,
			item: FinderContactItem,
			folderKey: FinderFolderKey,
			sourceCampaignId: number | null,
			sourceContactListIds: number[],
			selectionKey: string
		) => {
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();
			setSelectedFinderItemKey(selectionKey);
			setFinderInfoPopup(null);
			setFinderContextMenu({
				x: event.clientX,
				y: event.clientY,
				selectionKey,
				folderKey,
				item,
				sourceCampaignId,
				sourceContactListIds,
			});
		},
		[]
	);

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
			const mockFolderIndex = openCampaignId === null ? -1 : getMockCampaignFolderIndex(openCampaignId);
			const mockContactIds = resolveMockContactIds(mockState?.folders?.[mockFolderIndex]);
			const mockContactCount = mockContactIds.length || openCampaign.contactCount;
			const itemsByKey: Record<FinderFolderKey, FinderContactItem[]> = {
				contacts:
					typeof mockContactCount === 'number'
						? buildMockFinderItems(mockContactCount, 'contacts', mockContactIds)
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
		mockState,
		normalizedFinderSearchQuery,
		openCampaign,
		openCampaignId,
	]);
	const ensureFinderUserContactListIdForCampaign = useCallback(
		async ({
			campaignId,
			campaignName,
			knownContactListIds,
		}: {
			campaignId: number;
			campaignName: string;
			knownContactListIds: number[];
		}): Promise<number> => {
			const knownListId = knownContactListIds.find((id) => typeof id === 'number');
			if (typeof knownListId === 'number') return knownListId;

			const campaignDetail = await queryClient.fetchQuery<CampaignWithRelations>({
				queryKey: ['campaigns', 'detail', campaignId.toString()],
				queryFn: async () => {
					const response = await _fetch(urls.api.campaigns.detail(campaignId));
					if (!response.ok) {
						throw new Error('Failed to fetch campaign');
					}
					return response.json() as Promise<CampaignWithRelations>;
				},
			});

			const existingListId = campaignDetail.userContactLists?.find(
				(list) => typeof list.id === 'number'
			)?.id;
			if (typeof existingListId === 'number') return existingListId;

			const createdList = await createFinderUserContactList({
				name: campaignName || 'Campaign Contacts',
				contactIds: [],
			});
			const createdListId = (createdList as { id?: unknown }).id;
			if (typeof createdListId !== 'number') {
				throw new Error('Could not create a contact list for this campaign.');
			}

			await editFinderCampaign({
				id: campaignId,
				data: {
					userContactListOperation: {
						action: 'connect',
						userContactListIds: [createdListId],
					},
				},
			});

			return createdListId;
		},
		[createFinderUserContactList, editFinderCampaign, queryClient]
	);

	const ensureFinderTargetUserContactListId = useCallback(async (): Promise<number> => {
		if (!openCampaign || openCampaignId === null) {
			throw new Error('Target campaign is not open.');
		}

		return ensureFinderUserContactListIdForCampaign({
			campaignId: openCampaignId,
			campaignName: openCampaign.name || 'Campaign Contacts',
			knownContactListIds: selectedContactListIds,
		});
	}, [
		ensureFinderUserContactListIdForCampaign,
		openCampaign,
		openCampaignId,
		selectedContactListIds,
	]);

	const invalidateFinderDropQueries = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
			queryClient.invalidateQueries({ queryKey: ['contacts'] }),
			queryClient.invalidateQueries({ queryKey: ['emails'] }),
			queryClient.invalidateQueries({ queryKey: ['userContactLists'] }),
		]);
	}, [queryClient]);

	const moveFinderContact = useCallback(
		async (payload: CampaignFinderDragPayload) => {
			const targetListId = await ensureFinderTargetUserContactListId();
			await editFinderUserContactList({
				id: targetListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: [payload.contactId],
					},
				},
			});

			const sourceListIds = payload.sourceContactListIds.filter((id) => id !== targetListId);
			if (sourceListIds.length === 0) return;

			await Promise.all(
				sourceListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds: [payload.contactId],
							},
						},
					})
				)
			);
		},
		[editFinderUserContactList, ensureFinderTargetUserContactListId]
	);

	const moveFinderContactToCampaign = useCallback(
		async (payload: CampaignFinderDragPayload, target: FinderMoveTarget) => {
			const targetListId = await ensureFinderUserContactListIdForCampaign({
				campaignId: target.campaignId,
				campaignName: target.name,
				knownContactListIds: target.userContactListIds,
			});

			await editFinderUserContactList({
				id: targetListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: [payload.contactId],
					},
				},
			});

			const sourceListIds = payload.sourceContactListIds.filter((id) => id !== targetListId);
			if (sourceListIds.length === 0) return;

			await Promise.all(
				sourceListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds: [payload.contactId],
							},
						},
					})
				)
			);
		},
		[editFinderUserContactList, ensureFinderUserContactListIdForCampaign]
	);

	const removeFinderContactFromFolder = useCallback(
		async (payload: CampaignFinderDragPayload) => {
			if (payload.sourceContactListIds.length === 0) return;

			await Promise.all(
				payload.sourceContactListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds: [payload.contactId],
							},
						},
					})
				)
			);
		},
		[editFinderUserContactList]
	);

	const moveFinderDraft = useCallback(
		async (payload: CampaignFinderDragPayload) => {
			if (openCampaignId === null || typeof payload.emailId !== 'number') return;

			await editFinderEmail({
				id: payload.emailId,
				data: { campaignId: openCampaignId },
			});
		},
		[editFinderEmail, openCampaignId]
	);

	const moveFinderDraftToCampaign = useCallback(
		async (payload: CampaignFinderDragPayload, targetCampaignId: number) => {
			if (typeof payload.emailId !== 'number') return;

			await editFinderEmail({
				id: payload.emailId,
				data: { campaignId: targetCampaignId },
			});
		},
		[editFinderEmail]
	);

	const moveMockFinderContactToCampaign = useCallback(
		(payload: CampaignFinderDragPayload, targetCampaignId: number) => {
			if (!mockState || !onMockStateChange) return false;
			if (payload.itemKind !== 'contact') return false;

			const sourceIndex = getMockCampaignFolderIndex(payload.sourceCampaignId);
			const targetIndex = getMockCampaignFolderIndex(targetCampaignId);
			if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false;

			const folders = mockState.folders?.slice() ?? [];
			const sourceFolder = folders[sourceIndex];
			const targetFolder = folders[targetIndex];
			if (!sourceFolder || !targetFolder) return false;

			const sourceContactIds = resolveMockContactIds(sourceFolder);
			const targetContactIds = resolveMockContactIds(targetFolder);
			if (!sourceContactIds.includes(payload.contactId)) return false;

			const nextSourceContactIds = sourceContactIds.filter((id) => id !== payload.contactId);
			const nextTargetContactIds = targetContactIds.includes(payload.contactId)
				? targetContactIds
				: [...targetContactIds, payload.contactId];

			folders[sourceIndex] = {
				...sourceFolder,
				contactIds: nextSourceContactIds,
				contactCount: nextSourceContactIds.length,
			};
			folders[targetIndex] = {
				...targetFolder,
				contactIds: nextTargetContactIds,
				contactCount: nextTargetContactIds.length,
			};

			onMockStateChange({
				...mockState,
				folders,
			});

			return true;
		},
		[mockState, onMockStateChange]
	);

	const moveMockFinderContact = useCallback(
		(payload: CampaignFinderDragPayload) => {
			if (openCampaignId === null) return false;
			return moveMockFinderContactToCampaign(payload, openCampaignId);
		},
		[moveMockFinderContactToCampaign, openCampaignId]
	);

	const removeMockFinderContactFromFolder = useCallback(
		(payload: CampaignFinderDragPayload) => {
			if (!mockState || !onMockStateChange) return false;
			if (payload.itemKind !== 'contact') return false;

			const sourceIndex = getMockCampaignFolderIndex(payload.sourceCampaignId);
			if (sourceIndex < 0) return false;

			const folders = mockState.folders?.slice() ?? [];
			const sourceFolder = folders[sourceIndex];
			if (!sourceFolder) return false;

			const sourceContactIds = resolveMockContactIds(sourceFolder);
			if (!sourceContactIds.includes(payload.contactId)) return false;

			const nextSourceContactIds = sourceContactIds.filter((id) => id !== payload.contactId);
			folders[sourceIndex] = {
				...sourceFolder,
				contactIds: nextSourceContactIds,
				contactCount: nextSourceContactIds.length,
			};

			onMockStateChange({
				...mockState,
				folders,
			});

			return true;
		},
		[mockState, onMockStateChange]
	);

	const handleFinderItemDrop = useCallback(
		async (payload: CampaignFinderDragPayload | null) => {
			if (!canDropCampaignFinderPayload(payload, openCampaignId)) {
				activeCampaignFinderDragPayload = null;
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
				return;
			}

			if (isMockActive) {
				const moved = moveMockFinderContact(payload);
				activeCampaignFinderDragPayload = null;
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
				if (moved) {
					toast.success('Contact moved');
				}
				return;
			}

			setIsFinderDropPending(true);
			try {
				if (payload.itemKind === 'contact') {
					await moveFinderContact(payload);
				} else {
					await moveFinderDraft(payload);
				}

				await invalidateFinderDropQueries();
				toast.success(payload.itemKind === 'contact' ? 'Contact moved' : 'Draft moved');
			} catch {
				toast.error(
					payload.itemKind === 'contact'
						? 'Could not move contact. Please try again.'
						: 'Could not move draft. Please try again.'
				);
			} finally {
				activeCampaignFinderDragPayload = null;
				setIsFinderDropPending(false);
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
			}
		},
		[
			invalidateFinderDropQueries,
			isMockActive,
			moveFinderContact,
			moveFinderDraft,
			moveMockFinderContact,
			openCampaignId,
		]
	);

	const handleFinderItemDragStart = useCallback(
		(event: React.DragEvent<HTMLDivElement>, payload: CampaignFinderDragPayload) => {
			activeCampaignFinderDragPayload = payload;
			setSelectedFinderItemKey(
				`${payload.sourceFolderKey}:${typeof payload.emailId === 'number' ? 'email' : 'contact'}:${
					payload.emailId ?? payload.contactId
				}`
			);
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData(CAMPAIGN_FINDER_DRAG_MIME, JSON.stringify(payload));
			event.dataTransfer.setData('text/plain', payload.itemLabel);
		},
		[]
	);

	const handleFinderItemDragEnd = useCallback(() => {
		activeCampaignFinderDragPayload = null;
		setIsFinderDropTargetActive(false);
		setFinderDropTargetFolderKey(null);
	}, []);

	const handleFinderPanelDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (isFinderDropPending || (isMockActive && !onMockStateChange)) return;
			if (!hasCampaignFinderDragContext(event.dataTransfer)) return;
			const payload = activeCampaignFinderDragPayload;
			if (payload) {
				if (!canDropCampaignFinderPayload(payload, openCampaignId)) return;
			} else if (openCampaignId === null) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = 'move';
			setIsFinderDropTargetActive(true);
			setFinderDropTargetFolderKey(getFinderDropTargetFolderKey(payload));
		},
		[isFinderDropPending, isMockActive, onMockStateChange, openCampaignId]
	);

	const handleFinderPanelDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
		setIsFinderDropTargetActive(false);
		setFinderDropTargetFolderKey(null);
	}, []);

	const handleFinderPanelDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!hasCampaignFinderDragContext(event.dataTransfer)) return;

			event.preventDefault();
			event.stopPropagation();
			void handleFinderItemDrop(
				getCampaignFinderDragPayload(event.dataTransfer) ?? activeCampaignFinderDragPayload
			);
		},
		[handleFinderItemDrop]
	);

	const handleFinderContextOpenInNewTab = useCallback(
		(state: FinderContextMenuState) => {
			setFinderContextMenu(null);
			if (state.sourceCampaignId === null) return;
			onFinderOpenInNewTab?.(state.sourceCampaignId);
		},
		[onFinderOpenInNewTab]
	);

	const handleFinderContextMoveToCampaign = useCallback(
		async (state: FinderContextMenuState, target: FinderMoveTarget) => {
			const payload = getFinderContextMenuPayload(state);
			if (!payload || target.campaignId === payload.sourceCampaignId) return;

			setFinderContextMenu(null);

			if (isMockActive) {
				const moved = moveMockFinderContactToCampaign(payload, target.campaignId);
				if (moved) {
					toast.success('Contact moved');
				}
				return;
			}

			setIsFinderDropPending(true);
			try {
				if (payload.itemKind === 'contact') {
					await moveFinderContactToCampaign(payload, target);
				} else {
					await moveFinderDraftToCampaign(payload, target.campaignId);
				}

				await invalidateFinderDropQueries();
				toast.success(payload.itemKind === 'contact' ? 'Contact moved' : 'Draft moved');
			} catch {
				toast.error(
					payload.itemKind === 'contact'
						? 'Could not move contact. Please try again.'
						: 'Could not move draft. Please try again.'
				);
			} finally {
				setIsFinderDropPending(false);
			}
		},
		[
			invalidateFinderDropQueries,
			isMockActive,
			moveFinderContactToCampaign,
			moveFinderDraftToCampaign,
			moveMockFinderContactToCampaign,
		]
	);

	const handleFinderContextRemoveFromFolder = useCallback(
		async (state: FinderContextMenuState) => {
			const rawPayload = getFinderContextMenuPayload(state);
			if (!rawPayload || rawPayload.itemKind !== 'contact') return;
			const payload =
				rawPayload.sourceContactListIds.length > 0
					? rawPayload
					: { ...rawPayload, sourceContactListIds: selectedContactListIds };

			setFinderContextMenu(null);

			if (isMockActive) {
				const removed = removeMockFinderContactFromFolder(payload);
				if (removed) {
					toast.success('Removed from folder');
				}
				return;
			}

			if (payload.sourceContactListIds.length === 0) {
				toast.error('Could not remove contact. Please try again.');
				return;
			}

			setIsFinderDropPending(true);
			try {
				await removeFinderContactFromFolder(payload);
				await invalidateFinderDropQueries();
				toast.success('Removed from folder');
			} catch {
				toast.error('Could not remove contact. Please try again.');
			} finally {
				setIsFinderDropPending(false);
			}
		},
		[
			invalidateFinderDropQueries,
			isMockActive,
			removeFinderContactFromFolder,
			removeMockFinderContactFromFolder,
			selectedContactListIds,
		]
	);

	const handleFinderContextGetInfo = useCallback((state: FinderContextMenuState) => {
		setFinderContextMenu(null);
		setFinderInfoPopup({
			x: state.x,
			y: state.y,
			contact: getFinderItemResearchContact(state.item),
			title: state.item.name,
		});
	}, []);

	const handleFinderInfoPopupClose = useCallback(() => {
		setFinderInfoPopup(null);
	}, []);

	const finderContextMenuPayload = getFinderContextMenuPayload(finderContextMenu);
	const canMoveFinderContextItem = Boolean(
		finderContextMenuPayload &&
			finderMoveTargets.length > 0 &&
			!isFinderDropPending &&
			(!isMockActive || onMockStateChange)
	);
	const canRemoveFinderContextItem = Boolean(
		finderContextMenuPayload?.itemKind === 'contact' &&
			!isFinderDropPending &&
			(!isMockActive || onMockStateChange)
	);

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
						<>
							<CampaignFinderPanel
								campaignId={openCampaignId}
								contactListIds={selectedContactListIds}
								folders={finderFolders}
								expandedFolderKeys={openFolderKeys}
								onToggleFolder={toggleFinderFolder}
								searchQuery={finderSearchQuery}
								selectedItemKey={selectedFinderItemKey}
								isDragEnabled={canDragFinderItems}
								isDropTargetActive={isFinderDropTargetActive}
								dropTargetFolderKey={finderDropTargetFolderKey}
								isDropPending={isFinderDropPending}
								onSelectItem={handleFinderItemSelect}
								onItemContextMenu={handleFinderItemContextMenu}
								onItemDragStart={handleFinderItemDragStart}
								onItemDragEnd={handleFinderItemDragEnd}
								onPanelDragOver={handleFinderPanelDragOver}
								onPanelDragLeave={handleFinderPanelDragLeave}
								onPanelDrop={handleFinderPanelDrop}
							/>
							<CampaignFinderContextMenu
								state={finderContextMenu}
								moveTargets={finderMoveTargets}
								canMove={canMoveFinderContextItem}
								canRemove={canRemoveFinderContextItem}
								isPending={isFinderDropPending}
								onOpenInNewTab={handleFinderContextOpenInNewTab}
								onMoveToCampaign={handleFinderContextMoveToCampaign}
								onRemoveFromFolder={handleFinderContextRemoveFromFolder}
								onGetInfo={handleFinderContextGetInfo}
							/>
							<CampaignFinderInfoPopup
								state={finderInfoPopup}
								onClose={handleFinderInfoPopupClose}
							/>
						</>
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
						data-finder-drop-zone={isCampaignFinderOpen ? 'true' : undefined}
						data-finder-drop-target={
							isCampaignFinderOpen && isFinderDropTargetActive ? 'true' : undefined
						}
						onDragOver={isCampaignFinderOpen ? handleFinderPanelDragOver : undefined}
						onDragLeave={isCampaignFinderOpen ? handleFinderPanelDragLeave : undefined}
						onDrop={isCampaignFinderOpen ? handleFinderPanelDrop : undefined}
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
		isFinderDropTargetActive,
		isFinderDropPending,
		openCampaignId,
		openFinderForCampaign,
		closeFinder,
		handleFinderPaneDragOver: handleFinderPanelDragOver,
		handleFinderPaneDragLeave: handleFinderPanelDragLeave,
		handleFinderPaneDrop: handleFinderPanelDrop,
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
