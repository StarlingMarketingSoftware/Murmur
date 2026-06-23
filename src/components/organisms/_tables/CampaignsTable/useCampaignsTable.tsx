import type { Campaign, Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Typography } from '@/components/ui/typography';
import {
	useDeleteCampaign,
	useEditCampaign,
	useGetCampaign,
	useGetCampaigns,
	useGetDeletedCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import {
	useAssignInboundEmailToCampaign,
	useGetInboundEmails,
} from '@/hooks/queryHooks/useInboundEmails';
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
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import CampaignRowChevronIcon from '@/components/atoms/_svg/CampaignRowChevronIcon';
import type { CampaignsMockFolder, CampaignsMockState } from './CampaignsTable';
import {
	type CampaignDataTypeCategoryKey,
	type CampaignDataTypeSummary,
	getCampaignDataCategoryFromText,
	getCampaignDataCategoryLabel,
} from '@/utils/campaignDataTypes';
import {
	CampaignDataTypeBadge,
	CampaignDataTypeIconStrip,
} from '@/components/molecules/CampaignDataTypeIconStrip/CampaignDataTypeIconStrip';
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

type FinderDragItemKind = 'contact' | 'draft' | 'inbox';

const getFinderMovedItemLabel = (itemKind: FinderDragItemKind): string => {
	if (itemKind === 'contact') return 'Contact';
	if (itemKind === 'draft') return 'Draft';
	return 'Inbox email';
};

type CampaignFinderDragPayload = {
	itemKind: FinderDragItemKind;
	sourceFolderKey: FinderFolderKey;
	sourceCampaignId: number;
	sourceContactListIds: number[];
	contactId: number;
	emailId?: number;
	itemLabel: string;
};

type CampaignFinderDragTransfer = {
	items: CampaignFinderDragPayload[];
};

const getFinderMovedItemsSuccessLabel = (items: CampaignFinderDragPayload[]): string => {
	const firstItem = items[0];
	if (!firstItem) return 'Item moved';
	if (items.length === 1) return `${getFinderMovedItemLabel(firstItem.itemKind)} moved`;
	if (firstItem.itemKind === 'contact') return `${items.length} contacts moved`;
	if (firstItem.itemKind === 'draft') return `${items.length} drafts moved`;
	return `${items.length} inbox emails moved`;
};

const getFinderMovedItemsErrorLabel = (items: CampaignFinderDragPayload[]): string => {
	const firstItem = items[0];
	if (!firstItem) return 'item';
	if (items.length === 1) return getFinderMovedItemLabel(firstItem.itemKind).toLowerCase();
	if (firstItem.itemKind === 'contact') return 'contacts';
	if (firstItem.itemKind === 'draft') return 'drafts';
	return 'inbox emails';
};

let activeCampaignFinderDragPayload: CampaignFinderDragTransfer | null = null;

// Visual descriptor for the floating drag pill, set at dragstart and read by the
// parent CampaignsTable overlay (the cursor-following preview that also shows the
// green "+" add affordance on the destination pane). Module-level (not React state)
// so the document `dragover` listener can read it without re-rendering the finder
// tables on every mouse move.
type CampaignFinderDragPreviewData = {
	label: string;
	secondary?: string | null;
	dotColor?: string | null;
};

let activeCampaignFinderDragPreview: CampaignFinderDragPreviewData | null = null;

export const getActiveCampaignFinderDragPreview = (): CampaignFinderDragPreviewData | null =>
	activeCampaignFinderDragPreview;

// We draw the floating drag pill ourselves (see CampaignsTable's overlay) so the
// green "+" badge can be glued to it on the destination side. To suppress the OS's
// native drag image we hand `setDragImage` a 1x1, fully-transparent, in-document
// element: an empty `new Image()` is unreliable in Safari and detached/`display:none`
// nodes are ignored by Chrome, but a real opacity:0 element is honored everywhere.
// It is removed on the next tick, after `dragstart` has snapshotted it.
const createEmptyCampaignFinderDragImage = (): HTMLDivElement => {
	const node = document.createElement('div');
	node.setAttribute('aria-hidden', 'true');
	node.style.position = 'fixed';
	node.style.top = '0';
	node.style.left = '0';
	node.style.width = '1px';
	node.style.height = '1px';
	node.style.opacity = '0';
	node.style.background = 'transparent';
	node.style.pointerEvents = 'none';
	document.body.appendChild(node);
	return node;
};

const getFinderDragItemKind = (folderKey: FinderFolderKey): FinderDragItemKind | null => {
	if (folderKey === 'contacts') return 'contact';
	if (folderKey === 'drafts') return 'draft';
	if (folderKey === 'inbox') return 'inbox';
	return null;
};

const isCampaignFinderDragTransfer = (dataTransfer: DataTransfer): boolean =>
	Array.from(dataTransfer.types).includes(CAMPAIGN_FINDER_DRAG_MIME);

const hasCampaignFinderDragContext = (dataTransfer: DataTransfer): boolean =>
	activeCampaignFinderDragPayload !== null || isCampaignFinderDragTransfer(dataTransfer);

const parseCampaignFinderDragItemPayload = (
	value: unknown
): CampaignFinderDragPayload | null => {
	const parsed = value as Partial<CampaignFinderDragPayload>;
	const itemKind = parsed.itemKind;
	const sourceFolderKey = parsed.sourceFolderKey;
	const sourceCampaignId = parsed.sourceCampaignId;
	const sourceContactListIds = parsed.sourceContactListIds;
	const contactId = parsed.contactId;
	const emailId = parsed.emailId;
	const itemLabel = parsed.itemLabel;

	if (itemKind !== 'contact' && itemKind !== 'draft' && itemKind !== 'inbox') return null;
	if (
		sourceFolderKey !== 'contacts' &&
		sourceFolderKey !== 'drafts' &&
		sourceFolderKey !== 'inbox'
	) {
		return null;
	}
	if (typeof sourceCampaignId !== 'number') return null;
	if (!Array.isArray(sourceContactListIds)) return null;
	if (typeof contactId !== 'number') return null;
	if ((itemKind === 'draft' || itemKind === 'inbox') && typeof emailId !== 'number') {
		return null;
	}
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
};

const parseCampaignFinderDragPayload = (value: string): CampaignFinderDragTransfer | null => {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (
			parsed &&
			typeof parsed === 'object' &&
			'items' in parsed &&
			Array.isArray((parsed as { items?: unknown }).items)
		) {
			const items = (parsed as { items: unknown[] }).items
				.map(parseCampaignFinderDragItemPayload)
				.filter((item): item is CampaignFinderDragPayload => Boolean(item));

			return items.length > 0 ? { items } : null;
		}

		const item = parseCampaignFinderDragItemPayload(parsed);
		return item ? { items: [item] } : null;
	} catch {
		return null;
	}
};

const getCampaignFinderDragPayload = (
	dataTransfer: DataTransfer
): CampaignFinderDragTransfer | null => {
	const raw = dataTransfer.getData(CAMPAIGN_FINDER_DRAG_MIME);
	return raw ? parseCampaignFinderDragPayload(raw) : null;
};

const canDropCampaignFinderPayload = (
	payload: CampaignFinderDragTransfer | null,
	targetCampaignId: number | null
): payload is CampaignFinderDragTransfer => {
	if (!payload || targetCampaignId === null) return false;
	if (payload.items.length === 0) return false;
	if (payload.items.length > 1 && payload.items.some((item) => item.itemKind !== 'contact')) {
		return false;
	}

	return payload.items.every((item) => {
		if (item.sourceCampaignId === targetCampaignId) return false;
		if (typeof item.contactId !== 'number') return false;
		if (
			(item.itemKind === 'draft' || item.itemKind === 'inbox') &&
			typeof item.emailId !== 'number'
		) {
			return false;
		}

		return item.itemKind === 'contact' || item.itemKind === 'draft' || item.itemKind === 'inbox';
	});
};

const getFinderDropTargetFolderKey = (
	payload: CampaignFinderDragTransfer | null
): FinderFolderKey | null => {
	if (!payload || payload.items.length === 0) return null;
	const itemKind = payload.items[0].itemKind;
	if (payload.items.some((item) => item.itemKind !== itemKind)) return null;
	if (itemKind === 'contact') return 'contacts';
	if (itemKind === 'draft') return 'drafts';
	if (itemKind === 'inbox') return 'inbox';
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

const FINDER_HOVER_ROW_COLORS: Record<FinderFolderKey, string> = {
	contacts: '#FFD7D7',
	drafts: '#FFEFD7',
	inbox: '#D7E9FF',
	sent: '#D7FFD9',
	archive: '#E8E8E8',
};

const FINDER_CONTEXT_MENU_WIDTH = 180;
const FINDER_CONTEXT_MENU_VIEWPORT_PADDING = 8;
const FINDER_CONTEXT_MENU_BASE_HEIGHT = 111;
const FINDER_CONTEXT_MENU_MOVE_TARGET_HEIGHT = 27;
const FINDER_INFO_POPUP_WIDTH = 318;
const FINDER_INFO_POPUP_HEIGHT = 352;
const FINDER_INFO_POPUP_GAP = 10;

// Campaign-row right-click menu (a trimmed reuse of the finder contact menu, but
// anchored to the right edge of the table rather than the cursor).
const CAMPAIGN_ROW_MENU_GAP = 8;
const CAMPAIGN_ROW_MENU_HEIGHT = 82;
const CAMPAIGN_ROW_INFO_POPUP_WIDTH = 264;
const CAMPAIGN_ROW_INFO_POPUP_HEIGHT = 200;

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
	if (
		(itemKind === 'draft' || itemKind === 'inbox') &&
		typeof state.item.emailId !== 'number'
	) {
		return null;
	}

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

// The single grayed "ARCHIVE" folder row, shown at the bottom of the table only
// when >=1 soft-deleted campaign exists. Its metric columns are aggregates across
// all deleted campaigns; expanding it reveals one ArchivedCampaignRow per campaign.
type ArchiveFolderRow = {
	id: 'archive-folder';
	__rowType: 'archiveFolder';
	name: string;
	draftCount: number;
	sentCount: number;
	newEmailCount: number;
	updatedAt: Date;
	archivedCount: number;
	campaignDataTypes: CampaignDataTypeSummary[];
};

// A soft-deleted campaign rendered (grayed) as a child of the ARCHIVE folder.
type ArchivedCampaignRow = CampaignWithCounts & { __rowType: 'archivedCampaign' };

type CampaignTableRow =
	| CampaignWithCounts
	| FinderTableRow
	| ArchiveFolderRow
	| ArchivedCampaignRow;

type FinderContactSource = Partial<Contact> & {
	name?: string | null;
	curatedCategory?: string | null;
	curatedDisplayLabel?: string | null;
};

const isFinderTableRow = (row: CampaignTableRow): row is FinderTableRow =>
	(row as FinderTableRow).__rowType === 'finder';

const isArchiveFolderRow = (row: CampaignTableRow): row is ArchiveFolderRow =>
	(row as ArchiveFolderRow).__rowType === 'archiveFolder';

const isArchivedCampaignRow = (row: CampaignTableRow): row is ArchivedCampaignRow =>
	(row as ArchivedCampaignRow).__rowType === 'archivedCampaign';

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
// Grayed palette for the ARCHIVE folder row and its deleted-campaign children.
// The #F2F2F2 row band is painted via CSS (.archive-*-row-marker); these drive
// the inline folder-icon / name / metric-text colors so they read as muted.
const ARCHIVE_ROW_ICON_COLOR = '#ACACAC';
const ARCHIVE_ROW_NAME_COLOR = '#6B6B6B';
const ARCHIVE_ROW_METRIC_COLOR = '#9A9A9A';
const ARCHIVE_FOLDER_NAME_COLOR = '#5A5A5A';
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

// Static seed so the no-auth debug harness (zzcamprowdbg) renders the ARCHIVE
// folder + expanded children without a DB. Negative ids stay clear of the active
// mock ids (-1000 range) and handleRowClick is short-circuited under mock data.
const buildMockDeletedCampaignRows = (): CampaignWithCounts[] => {
	const now = Date.now();
	const msInDay = 24 * 60 * 60 * 1000;
	const seeds = [
		{ name: 'Capricorn', draftCount: 12, sentCount: 30, daysAgo: 21 },
		{ name: 'Gemini', draftCount: 5, sentCount: 8, daysAgo: 64 },
	];
	return seeds.map((seed, index) => {
		return {
			id: -2000 - index,
			name: seed.name,
			draftCount: seed.draftCount,
			sentCount: seed.sentCount,
			newEmailCount: 0,
			contactCount: 0,
			campaignDataTypes: DEFAULT_MOCK_CAMPAIGN_DATA_TYPES,
			updatedAt: new Date(now - seed.daysAgo * msInDay),
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

type CampaignRowMenuAnchor = {
	// Anchor point in client/visual coordinates (the table's right edge + gap, and
	// the clicked row's top). Clamped to the viewport inside the components via
	// getClampedFinderPopupPosition (which divides by the document zoom factor).
	anchorX: number;
	anchorY: number;
	campaign: CampaignWithCounts;
	nameBoxColor: string;
	folderIconColor: string;
};

const formatCampaignInfoDate = (value: Date | string | null | undefined) => {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const CampaignRowContextMenu = ({
	state,
	onOpenInNewTab,
	onGetInfo,
}: {
	state: CampaignRowMenuAnchor | null;
	onOpenInNewTab: (state: CampaignRowMenuAnchor) => void;
	onGetInfo: (state: CampaignRowMenuAnchor) => void;
}) => {
	if (!state) return null;
	if (typeof document === 'undefined') return null;

	const position = getClampedFinderPopupPosition(
		state.anchorX,
		state.anchorY,
		FINDER_CONTEXT_MENU_WIDTH,
		CAMPAIGN_ROW_MENU_HEIGHT
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

const CampaignRowInfoPopup = ({
	state,
	onClose,
}: {
	state: CampaignRowMenuAnchor | null;
	onClose: () => void;
}) => {
	if (!state) return null;
	if (typeof document === 'undefined') return null;

	const position = getClampedFinderPopupPosition(
		state.anchorX,
		state.anchorY,
		CAMPAIGN_ROW_INFO_POPUP_WIDTH,
		CAMPAIGN_ROW_INFO_POPUP_HEIGHT
	);
	const { campaign } = state;
	const stats = [
		{ label: 'New', value: campaign.newEmailCount ?? 0 },
		{ label: 'Drafts', value: campaign.draftCount ?? 0 },
		{ label: 'Sent', value: campaign.sentCount ?? 0 },
		{ label: 'Contacts', value: campaign.contactCount ?? 0 },
	];

	return createPortal(
		<div
			className="campaign-row-info-popup"
			data-custom-table-ignore-row-click="true"
			role="dialog"
			aria-label={`Info for ${campaign.name}`}
			style={{
				position: 'fixed',
				zIndex: 10001,
				left: position.left,
				top: position.top,
				width: CAMPAIGN_ROW_INFO_POPUP_WIDTH,
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
			<div className="campaign-row-info-popup-header">
				<span
					className="campaign-row-info-popup-name-pill"
					style={{ backgroundColor: state.nameBoxColor }}
				>
					<span
						className="campaign-row-info-popup-folder-icon"
						style={{ color: state.folderIconColor }}
						aria-hidden="true"
					>
						<DashboardActionBarFolderIcon width={18} height={11} />
					</span>
					<span className="campaign-row-info-popup-name">{campaign.name}</span>
				</span>
			</div>
			<div className="campaign-row-info-popup-stats">
				{stats.map((stat) => (
					<div key={stat.label} className="campaign-row-info-popup-stat">
						<span className="campaign-row-info-popup-stat-value">{stat.value}</span>
						<span className="campaign-row-info-popup-stat-label">{stat.label}</span>
					</div>
				))}
			</div>
			<div className="campaign-row-info-popup-dates">
				<div className="campaign-row-info-popup-date-row">
					<span className="campaign-row-info-popup-date-label">Created</span>
					<span className="campaign-row-info-popup-date-value">
						{formatCampaignInfoDate(campaign.createdAt)}
					</span>
				</div>
				<div className="campaign-row-info-popup-date-row">
					<span className="campaign-row-info-popup-date-label">Updated</span>
					<span className="campaign-row-info-popup-date-value">
						{formatCampaignInfoDate(campaign.updatedAt)}
					</span>
				</div>
			</div>
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
	selectedItemKeys,
	selectedContactDragCount,
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
	selectedItemKeys: Set<string>;
	selectedContactDragCount: number;
	isDragEnabled: boolean;
	onSelect: (
		selectionKey: string,
		folderKey: FinderFolderKey,
		event?: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
	) => void;
	onContextMenu: (
		event: React.MouseEvent<HTMLDivElement>,
		item: FinderContactItem,
		folderKey: FinderFolderKey,
		sourceCampaignId: number | null,
		sourceContactListIds: number[],
		selectionKey: string
	) => void;
	onDragStart: (
		event: React.DragEvent<HTMLDivElement>,
		payload: CampaignFinderDragPayload,
		selectionKey: string
	) => void;
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
	const isSelected = selectedItemKeys.has(selectionKey);
	const [isHovered, setIsHovered] = useState(false);
	const dragItemKind = getFinderDragItemKind(folderKey);
	const canDrag = Boolean(
		isDragEnabled &&
			dragItemKind &&
			sourceCampaignId !== null &&
			typeof item.contactId === 'number' &&
			(dragItemKind === 'contact' || typeof item.emailId === 'number')
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
					: isHovered
						? FINDER_HOVER_ROW_COLORS[folderKey]
						: index % 2 === 0
							? '#FAF7F7'
							: '#FFFFFF',
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				if (event.shiftKey) {
					event.preventDefault();
					window.getSelection()?.removeAllRanges();
				}
			}}
			onClick={(event) => onSelect(selectionKey, folderKey, event)}
			onContextMenu={(event) => {
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
				if (!dragPayload) {
					event.preventDefault();
					return;
				}

				const isMultiContactDrag =
					isSelected && dragItemKind === 'contact' && selectedContactDragCount > 1;
				// Stash the visual descriptor for the parent overlay, which renders the
				// floating pill + the green "+" add badge that follows the cursor.
				activeCampaignFinderDragPreview = {
					label: isMultiContactDrag ? `${selectedContactDragCount} contacts` : primaryText,
					secondary: isMultiContactDrag ? null : showCompany ? item.company : null,
					dotColor,
				};
				// Suppress the browser's native drag image; our overlay replaces it.
				const emptyDragImage = createEmptyCampaignFinderDragImage();
				event.dataTransfer.setDragImage(emptyDragImage, 0, 0);
				window.setTimeout(() => {
					emptyDragImage.remove();
				}, 0);

				onDragStart(event, dragPayload, selectionKey);
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

const FinderFolderRow = ({
	folder,
	folderIndex,
	isExpanded,
	isFolderDropTarget,
	onToggleClick,
}: {
	folder: FinderFolder;
	folderIndex: number;
	isExpanded: boolean;
	isFolderDropTarget: boolean;
	onToggleClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			type="button"
			className="campaign-finder-folder-row"
			data-custom-table-ignore-row-click="true"
			data-finder-folder-drop-target={isFolderDropTarget ? 'true' : undefined}
			style={{
				backgroundColor: isHovered
					? FINDER_HOVER_ROW_COLORS[folder.key]
					: folderIndex % 2 === 0
						? '#FAF7F7'
						: '#FFFFFF',
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={onToggleClick}
			aria-expanded={isExpanded}
		>
			<CampaignRowChevronIcon
				className={cn(
					'campaign-finder-folder-chevron',
					isExpanded && 'campaign-finder-folder-chevron-open'
				)}
			/>
			<span className="campaign-finder-folder-icon" style={{ color: folder.color }}>
				<DashboardActionBarFolderIcon width={16} height={10} />
			</span>
			<span className="campaign-finder-folder-label">{folder.label}</span>
		</button>
	);
};

const CampaignFinderPanel = ({
	campaignId,
	contactListIds,
	folders,
	expandedFolderKeys,
	onToggleFolder,
	searchQuery,
	selectedItemKeys,
	selectedContactDragCount,
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
	selectedItemKeys: Set<string>;
	selectedContactDragCount: number;
	isDragEnabled: boolean;
	isDropTargetActive: boolean;
	dropTargetFolderKey: FinderFolderKey | null;
	isDropPending: boolean;
	onSelectItem: (
		selectionKey: string,
		folderKey: FinderFolderKey,
		event?: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
	) => void;
	onItemContextMenu: (
		event: React.MouseEvent<HTMLDivElement>,
		item: FinderContactItem,
		folderKey: FinderFolderKey,
		sourceCampaignId: number | null,
		sourceContactListIds: number[],
		selectionKey: string
	) => void;
	onItemDragStart: (
		event: React.DragEvent<HTMLDivElement>,
		payload: CampaignFinderDragPayload,
		selectionKey: string
	) => void;
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
									selectedItemKeys={selectedItemKeys}
									selectedContactDragCount={selectedContactDragCount}
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
							<FinderFolderRow
								folder={folder}
								folderIndex={folderIndex}
								isExpanded={isExpanded}
								isFolderDropTarget={isFolderDropTarget}
								onToggleClick={(event) => {
									stopFinderEvent(event);
									handleToggle();
								}}
							/>
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
										selectedItemKeys={selectedItemKeys}
										selectedContactDragCount={selectedContactDragCount}
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

export const useCampaignsTable = (options?: {
	compactMetrics?: boolean;
	mockState?: CampaignsMockState;
	onMockStateChange?: (next: CampaignsMockState | undefined) => void;
	enableFinder?: boolean;
	finderSearchQuery?: string;
	initialOpenCampaignId?: number | null;
	initialOpenContactsFolder?: boolean;
	onFinderOpenInNewTab?: (campaignId: number) => void;
	onSelectCampaign?: (campaignId: number) => void;
	/**
	 * Campaign id whose row should show the red "Click to Delete and move
	 * contents to Archive" warning because its hover-delete "X" is being hovered.
	 * The armed (post-first-click) state is driven internally by
	 * confirmingCampaignId; both render the same warning visual.
	 */
	deleteWarningCampaignId?: number | null;
}) => {
	const compactMetrics = options?.compactMetrics ?? false;
	const mockState = options?.mockState;
	const onMockStateChange = options?.onMockStateChange;
	const enableFinder = options?.enableFinder ?? true;
	const finderSearchQuery = options?.finderSearchQuery ?? '';
	const initialOpenCampaignId = options?.initialOpenCampaignId ?? null;
	const initialOpenContactsFolder = options?.initialOpenContactsFolder ?? false;
	const onFinderOpenInNewTab = options?.onFinderOpenInNewTab;
	const onSelectCampaign = options?.onSelectCampaign;
	const deleteWarningCampaignId = options?.deleteWarningCampaignId ?? null;
	const normalizedFinderSearchQuery = normalizeFinderSearchText(finderSearchQuery);
	const isMockActive = mockState != null;
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [openCampaignId, setOpenCampaignId] = useState<number | null>(null);
	const [openFolderKeys, setOpenFolderKeys] = useState<FinderFolderKey[]>([]);
	const [selectedFinderItemKeys, setSelectedFinderItemKeys] = useState<Set<string>>(
		() => new Set()
	);
	const lastClickedFinderItemKeyRef = useRef<string | null>(null);
	const frozenCampaignOrderRef = useRef<number[] | null>(null);
	const initialOpenCampaignIdRef = useRef<number | null>(null);
	const isFinderOpen = enableFinder && openCampaignId !== null;
	const queryClient = useQueryClient();
	const [isFinderDropTargetActive, setIsFinderDropTargetActive] = useState(false);
	const [finderDropTargetFolderKey, setFinderDropTargetFolderKey] =
		useState<FinderFolderKey | null>(null);
	const [isFinderDropPending, setIsFinderDropPending] = useState(false);
	const [finderContextMenu, setFinderContextMenu] =
		useState<FinderContextMenuState | null>(null);
	const [finderInfoPopup, setFinderInfoPopup] = useState<FinderInfoPopupState | null>(null);
	// Campaign-row right-click menu + its "Get Info" popup (one open at a time).
	const [campaignRowMenu, setCampaignRowMenu] = useState<CampaignRowMenuAnchor | null>(null);
	const [campaignRowInfo, setCampaignRowInfo] = useState<CampaignRowMenuAnchor | null>(null);
	const { mutateAsync: createFinderUserContactList } = useCreateUserContactList({
		suppressToasts: true,
	});
	const { mutateAsync: editFinderCampaign } = useEditCampaign({ suppressToasts: true });
	const { mutateAsync: editFinderUserContactList } = useEditUserContactList({
		suppressToasts: true,
	});
	const { mutateAsync: editFinderEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: assignFinderInboundEmailToCampaign } = useAssignInboundEmailToCampaign({
		suppressToasts: true,
	});

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
		setSelectedFinderItemKeys(new Set());
		lastClickedFinderItemKeyRef.current = null;
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
		if (!finderContextMenu && !finderInfoPopup && !campaignRowMenu && !campaignRowInfo) return;

		const closeAllMenus = () => {
			setFinderContextMenu(null);
			setFinderInfoPopup(null);
			setCampaignRowMenu(null);
			setCampaignRowInfo(null);
		};

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			const targetElement =
				target instanceof Element
					? target
					: target instanceof Node
						? target.parentElement
						: null;

			if (
				targetElement?.closest(
					'.campaign-finder-context-menu, .campaign-finder-info-popup, .campaign-row-info-popup'
				)
			) {
				return;
			}

			closeAllMenus();
		};

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			closeAllMenus();
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown);
			document.removeEventListener('keydown', handleDocumentKeyDown);
		};
	}, [finderContextMenu, finderInfoPopup, campaignRowMenu, campaignRowInfo]);

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

	// Soft-deleted campaigns drive the ARCHIVE folder. Fetched separately so the
	// active-list query (useGetCampaigns) keeps its shape for its many callers.
	const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
	const { data: deletedRealData } = useGetDeletedCampaigns({ enabled: !isMockActive });
	const mockDeletedData = useMemo(
		() => (isMockActive ? buildMockDeletedCampaignRows() : null),
		[isMockActive]
	);
	const deletedCampaigns = (mockDeletedData ?? deletedRealData) as
		| CampaignWithCounts[]
		| undefined;
	// The ARCHIVE folder row's own columns are aggregates over all deleted campaigns
	// (summed counts, most-recent update, merged data-type icons).
	const archiveFolderRow = useMemo<ArchiveFolderRow | null>(() => {
		if (!deletedCampaigns || deletedCampaigns.length === 0) return null;
		let draftCount = 0;
		let sentCount = 0;
		let newEmailCount = 0;
		let latest = 0;
		const mergedTypes = new Map<string, CampaignDataTypeSummary>();
		for (const campaign of deletedCampaigns) {
			draftCount += campaign.draftCount ?? 0;
			sentCount += campaign.sentCount ?? 0;
			newEmailCount += campaign.newEmailCount ?? 0;
			const updatedMs = new Date(campaign.updatedAt).getTime();
			if (Number.isFinite(updatedMs) && updatedMs > latest) latest = updatedMs;
			for (const type of campaign.campaignDataTypes ?? []) {
				const mapKey = `${type.kind}:${type.key}`;
				const existing = mergedTypes.get(mapKey);
				if (existing) {
					existing.count += type.count;
				} else {
					mergedTypes.set(mapKey, { ...type });
				}
			}
		}
		const campaignDataTypes = Array.from(mergedTypes.values()).sort(
			(a, b) => b.count - a.count
		);
		return {
			id: 'archive-folder',
			__rowType: 'archiveFolder',
			name: 'ARCHIVE',
			draftCount,
			sentCount,
			newEmailCount,
			updatedAt: latest > 0 ? new Date(latest) : new Date(),
			archivedCount: deletedCampaigns.length,
			campaignDataTypes,
		};
	}, [deletedCampaigns]);

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

		const rows: CampaignTableRow[] = [];
		const finderActive = isFinderOpen && openCampaignId !== null;
		for (const campaign of displayedCampaignData) {
			rows.push(campaign);
			if (finderActive && campaign.id === openCampaignId) {
				rows.push({
					id: `finder-${campaign.id}`,
					__rowType: 'finder',
					__customTableColSpanAll: true,
					parentCampaignId: campaign.id,
					name: '',
					draftCount: 0,
					sentCount: 0,
					newEmailCount: 0,
					updatedAt: new Date(campaign.updatedAt),
				} satisfies FinderTableRow);
			}
		}

		// ARCHIVE folder pinned after the active campaigns; its deleted-campaign
		// children follow only while expanded.
		if (archiveFolderRow) {
			rows.push(archiveFolderRow);
			if (isArchiveExpanded && deletedCampaigns) {
				for (const campaign of deletedCampaigns) {
					rows.push({ ...campaign, __rowType: 'archivedCampaign' });
				}
			}
		}

		return rows;
	}, [
		displayedCampaignData,
		isFinderOpen,
		openCampaignId,
		archiveFolderRow,
		isArchiveExpanded,
		deletedCampaigns,
	]);
	const openFinderForCampaign = useCallback(
		(campaignId: number | null, expandedFolderKeys: FinderFolderKey[] = []) => {
			if (!enableFinder || campaignId === null) {
				closeFinder();
				return;
			}

			frozenCampaignOrderRef.current =
				sortedCampaignData?.map((campaign) => campaign.id) ?? null;
			setOpenCampaignId(campaignId);
			setOpenFolderKeys(expandedFolderKeys);
			setSelectedFinderItemKeys(new Set());
			lastClickedFinderItemKeyRef.current = null;
		},
		[closeFinder, enableFinder, sortedCampaignData]
	);

	useEffect(() => {
		if (!enableFinder || initialOpenCampaignId === null) return;
		if (initialOpenCampaignIdRef.current === initialOpenCampaignId) return;
		if (!baseData?.some((campaign) => campaign.id === initialOpenCampaignId)) return;

		openFinderForCampaign(
			initialOpenCampaignId,
			initialOpenContactsFolder ? ['contacts'] : []
		);
		initialOpenCampaignIdRef.current = initialOpenCampaignId;
	}, [
		baseData,
		enableFinder,
		initialOpenCampaignId,
		initialOpenContactsFolder,
		openFinderForCampaign,
	]);

	useEffect(() => {
		if (initialOpenCampaignId === null) {
			initialOpenCampaignIdRef.current = null;
		}
	}, [initialOpenCampaignId]);
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
			if (!selectedFinderItemKeys.has(selectionKey)) {
				setSelectedFinderItemKeys(new Set([selectionKey]));
				lastClickedFinderItemKeyRef.current =
					folderKey === 'contacts' ? selectionKey : null;
			}
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
		[selectedFinderItemKeys]
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
	const visibleFinderContactSelectionKeys = useMemo(() => {
		const contactsFolder = finderFolders.find((folder) => folder.key === 'contacts');
		if (!contactsFolder) return [];
		if (!normalizedFinderSearchQuery && !openFolderKeys.includes('contacts')) return [];

		return contactsFolder.items.map((item) => getFinderItemSelectionKey('contacts', item));
	}, [finderFolders, normalizedFinderSearchQuery, openFolderKeys]);
	const selectedFinderContactDragPayloads = useMemo<CampaignFinderDragPayload[]>(() => {
		if (openCampaignId === null) return [];
		const contactsFolder = finderFolders.find((folder) => folder.key === 'contacts');
		if (!contactsFolder) return [];

		return contactsFolder.items.reduce<CampaignFinderDragPayload[]>((payloads, item) => {
			const selectionKey = getFinderItemSelectionKey('contacts', item);
			if (!selectedFinderItemKeys.has(selectionKey)) return payloads;
			if (typeof item.contactId !== 'number') return payloads;

			payloads.push({
				itemKind: 'contact' as const,
				sourceFolderKey: 'contacts' as const,
				sourceCampaignId: openCampaignId,
				sourceContactListIds: selectedContactListIds,
				contactId: item.contactId,
				itemLabel: item.personName || item.name,
			});
			return payloads;
		}, []);
	}, [finderFolders, openCampaignId, selectedContactListIds, selectedFinderItemKeys]);
	const handleFinderItemSelect = useCallback(
		(
			selectionKey: string,
			folderKey: FinderFolderKey,
			event?: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
		) => {
			if (event?.shiftKey) {
				event.preventDefault();
				window.getSelection()?.removeAllRanges();
			}

			if (
				event?.shiftKey &&
				folderKey === 'contacts' &&
				lastClickedFinderItemKeyRef.current !== null
			) {
				const currentIndex = visibleFinderContactSelectionKeys.indexOf(selectionKey);
				const lastIndex = visibleFinderContactSelectionKeys.indexOf(
					lastClickedFinderItemKeyRef.current
				);

				if (currentIndex !== -1 && lastIndex !== -1) {
					const start = Math.min(currentIndex, lastIndex);
					const end = Math.max(currentIndex, lastIndex);
					setSelectedFinderItemKeys(
						new Set(visibleFinderContactSelectionKeys.slice(start, end + 1))
					);
					return;
				}
			}

			setSelectedFinderItemKeys(new Set([selectionKey]));
			lastClickedFinderItemKeyRef.current = folderKey === 'contacts' ? selectionKey : null;
		},
		[visibleFinderContactSelectionKeys]
	);
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
			queryClient.invalidateQueries({ queryKey: ['inboundEmails'] }),
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

	const moveFinderContacts = useCallback(
		async (payloads: CampaignFinderDragPayload[]) => {
			const contactIds = Array.from(
				new Set(
					payloads
						.filter((payload) => payload.itemKind === 'contact')
						.map((payload) => payload.contactId)
				)
			);
			if (contactIds.length === 0) return;

			const targetListId = await ensureFinderTargetUserContactListId();
			await editFinderUserContactList({
				id: targetListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds,
					},
				},
			});

			const sourceListIds = Array.from(
				new Set(payloads.flatMap((payload) => payload.sourceContactListIds))
			).filter((id) => id !== targetListId);
			if (sourceListIds.length === 0) return;

			await Promise.all(
				sourceListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds,
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

	const moveFinderContactsToCampaign = useCallback(
		async (payloads: CampaignFinderDragPayload[], target: FinderMoveTarget) => {
			const contactIds = Array.from(
				new Set(
					payloads
						.filter((payload) => payload.itemKind === 'contact')
						.map((payload) => payload.contactId)
				)
			);
			if (contactIds.length === 0) return;

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
						contactIds,
					},
				},
			});

			const sourceListIds = Array.from(
				new Set(payloads.flatMap((payload) => payload.sourceContactListIds))
			).filter((id) => id !== targetListId);
			if (sourceListIds.length === 0) return;

			await Promise.all(
				sourceListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds,
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

	const removeFinderContactsFromFolder = useCallback(
		async (payloads: CampaignFinderDragPayload[]) => {
			const contactIds = Array.from(
				new Set(
					payloads
						.filter((payload) => payload.itemKind === 'contact')
						.map((payload) => payload.contactId)
				)
			);
			const sourceListIds = Array.from(
				new Set(payloads.flatMap((payload) => payload.sourceContactListIds))
			);
			if (contactIds.length === 0 || sourceListIds.length === 0) return;

			await Promise.all(
				sourceListIds.map((id) =>
					editFinderUserContactList({
						id,
						data: {
							contactOperation: {
								action: 'disconnect',
								contactIds,
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

	const moveFinderInboxEmail = useCallback(
		async (payload: CampaignFinderDragPayload) => {
			if (openCampaignId === null || typeof payload.emailId !== 'number') return;

			await assignFinderInboundEmailToCampaign({
				id: payload.emailId,
				data: { campaignId: openCampaignId },
			});
		},
		[assignFinderInboundEmailToCampaign, openCampaignId]
	);

	const moveFinderInboxEmailToCampaign = useCallback(
		async (payload: CampaignFinderDragPayload, targetCampaignId: number) => {
			if (typeof payload.emailId !== 'number') return;

			await assignFinderInboundEmailToCampaign({
				id: payload.emailId,
				data: { campaignId: targetCampaignId },
			});
		},
		[assignFinderInboundEmailToCampaign]
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

	const moveMockFinderContactsToCampaign = useCallback(
		(payloads: CampaignFinderDragPayload[], targetCampaignId: number) => {
			if (!mockState || !onMockStateChange) return false;

			const folders = mockState.folders?.slice() ?? [];
			let movedCount = 0;

			payloads.forEach((payload) => {
				if (payload.itemKind !== 'contact') return;

				const sourceIndex = getMockCampaignFolderIndex(payload.sourceCampaignId);
				const targetIndex = getMockCampaignFolderIndex(targetCampaignId);
				if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

				const sourceFolder = folders[sourceIndex];
				const targetFolder = folders[targetIndex];
				if (!sourceFolder || !targetFolder) return;

				const sourceContactIds = resolveMockContactIds(sourceFolder);
				const targetContactIds = resolveMockContactIds(targetFolder);
				if (!sourceContactIds.includes(payload.contactId)) return;

				const nextSourceContactIds = sourceContactIds.filter(
					(id) => id !== payload.contactId
				);
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
				movedCount += 1;
			});

			if (movedCount === 0) return false;

			onMockStateChange({
				...mockState,
				folders,
			});

			return true;
		},
		[mockState, onMockStateChange]
	);

	const moveMockFinderContacts = useCallback(
		(payloads: CampaignFinderDragPayload[]) => {
			if (openCampaignId === null) return false;
			return moveMockFinderContactsToCampaign(payloads, openCampaignId);
		},
		[moveMockFinderContactsToCampaign, openCampaignId]
	);

	const removeMockFinderContactsFromFolder = useCallback(
		(payloads: CampaignFinderDragPayload[]) => {
			if (!mockState || !onMockStateChange) return false;

			const folders = mockState.folders?.slice() ?? [];
			let removedCount = 0;

			payloads.forEach((payload) => {
				if (payload.itemKind !== 'contact') return;

				const sourceIndex = getMockCampaignFolderIndex(payload.sourceCampaignId);
				if (sourceIndex < 0) return;

				const sourceFolder = folders[sourceIndex];
				if (!sourceFolder) return;

				const sourceContactIds = resolveMockContactIds(sourceFolder);
				if (!sourceContactIds.includes(payload.contactId)) return;

				const nextSourceContactIds = sourceContactIds.filter(
					(id) => id !== payload.contactId
				);
				folders[sourceIndex] = {
					...sourceFolder,
					contactIds: nextSourceContactIds,
					contactCount: nextSourceContactIds.length,
				};
				removedCount += 1;
			});

			if (removedCount === 0) return false;

			onMockStateChange({
				...mockState,
				folders,
			});

			return true;
		},
		[mockState, onMockStateChange]
	);

	const handleFinderItemDrop = useCallback(
		async (payload: CampaignFinderDragTransfer | null) => {
			if (!canDropCampaignFinderPayload(payload, openCampaignId)) {
				activeCampaignFinderDragPayload = null;
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
				return;
			}
			const payloadItems = payload.items;

			if (isMockActive) {
				const moved =
					payloadItems.length === 1
						? moveMockFinderContact(payloadItems[0])
						: moveMockFinderContacts(payloadItems);
				activeCampaignFinderDragPayload = null;
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
				if (moved) {
					toast.success(getFinderMovedItemsSuccessLabel(payloadItems));
				}
				return;
			}

			setIsFinderDropPending(true);
			try {
				if (payloadItems.every((item) => item.itemKind === 'contact')) {
					if (payloadItems.length === 1) {
						await moveFinderContact(payloadItems[0]);
					} else {
						await moveFinderContacts(payloadItems);
					}
				} else if (payloadItems.every((item) => item.itemKind === 'draft')) {
					await Promise.all(payloadItems.map((item) => moveFinderDraft(item)));
				} else {
					await Promise.all(payloadItems.map((item) => moveFinderInboxEmail(item)));
				}

				await invalidateFinderDropQueries();
				toast.success(getFinderMovedItemsSuccessLabel(payloadItems));
			} catch {
				toast.error(
					`Could not move ${getFinderMovedItemsErrorLabel(payloadItems)}. Please try again.`
				);
			} finally {
				activeCampaignFinderDragPayload = null;
				activeCampaignFinderDragPreview = null;
				setIsFinderDropPending(false);
				setIsFinderDropTargetActive(false);
				setFinderDropTargetFolderKey(null);
			}
		},
		[
			invalidateFinderDropQueries,
			isMockActive,
			moveFinderContact,
			moveFinderContacts,
			moveFinderDraft,
			moveFinderInboxEmail,
			moveMockFinderContact,
			moveMockFinderContacts,
			openCampaignId,
		]
	);

	const handleFinderItemDragStart = useCallback(
		(
			event: React.DragEvent<HTMLDivElement>,
			payload: CampaignFinderDragPayload,
			selectionKey: string
		) => {
			const shouldDragSelectedContacts =
				payload.itemKind === 'contact' &&
				selectedFinderItemKeys.has(selectionKey) &&
				selectedFinderContactDragPayloads.length > 1;
			const transfer: CampaignFinderDragTransfer = {
				items: shouldDragSelectedContacts ? selectedFinderContactDragPayloads : [payload],
			};

			activeCampaignFinderDragPayload = transfer;
			if (!shouldDragSelectedContacts) {
				// Defer the selection sync: mutating React state synchronously inside
				// `dragstart` re-renders the source row mid-dispatch, which makes the
				// browser abort the native drag before it begins. The multi-select path
				// skips this block, which is why dragging multiple contacts worked but
				// dragging a single item (or a draft/inbox email) did not. Running it on
				// the next tick lets the native drag commit before the row re-renders.
				window.setTimeout(() => {
					setSelectedFinderItemKeys(new Set([selectionKey]));
					lastClickedFinderItemKeyRef.current =
						payload.itemKind === 'contact' ? selectionKey : null;
				}, 0);
			}
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData(CAMPAIGN_FINDER_DRAG_MIME, JSON.stringify(transfer));
			event.dataTransfer.setData(
				'text/plain',
				transfer.items.length > 1 ? `${transfer.items.length} contacts` : payload.itemLabel
			);
		},
		[selectedFinderContactDragPayloads, selectedFinderItemKeys]
	);

	const handleFinderItemDragEnd = useCallback(() => {
		activeCampaignFinderDragPayload = null;
		activeCampaignFinderDragPreview = null;
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

	const getFinderContextPayloadItems = useCallback(
		(state: FinderContextMenuState | null): CampaignFinderDragPayload[] => {
			const payload = getFinderContextMenuPayload(state);
			if (!payload) return [];
			if (
				payload.itemKind === 'contact' &&
				state &&
				selectedFinderItemKeys.has(state.selectionKey) &&
				selectedFinderContactDragPayloads.length > 1
			) {
				return selectedFinderContactDragPayloads;
			}

			return [payload];
		},
		[selectedFinderContactDragPayloads, selectedFinderItemKeys]
	);

	const handleFinderContextMoveToCampaign = useCallback(
		async (state: FinderContextMenuState, target: FinderMoveTarget) => {
			const payloadItems = getFinderContextPayloadItems(state);
			if (
				payloadItems.length === 0 ||
				payloadItems.some((payload) => target.campaignId === payload.sourceCampaignId)
			) {
				return;
			}

			setFinderContextMenu(null);

			if (isMockActive) {
				const moved =
					payloadItems.length === 1
						? moveMockFinderContactToCampaign(payloadItems[0], target.campaignId)
						: moveMockFinderContactsToCampaign(payloadItems, target.campaignId);
				if (moved) {
					toast.success(getFinderMovedItemsSuccessLabel(payloadItems));
				}
				return;
			}

			setIsFinderDropPending(true);
			try {
				if (payloadItems.every((payload) => payload.itemKind === 'contact')) {
					if (payloadItems.length === 1) {
						await moveFinderContactToCampaign(payloadItems[0], target);
					} else {
						await moveFinderContactsToCampaign(payloadItems, target);
					}
				} else if (payloadItems.every((payload) => payload.itemKind === 'draft')) {
					await Promise.all(
						payloadItems.map((payload) =>
							moveFinderDraftToCampaign(payload, target.campaignId)
						)
					);
				} else {
					await Promise.all(
						payloadItems.map((payload) =>
							moveFinderInboxEmailToCampaign(payload, target.campaignId)
						)
					);
				}

				await invalidateFinderDropQueries();
				toast.success(getFinderMovedItemsSuccessLabel(payloadItems));
			} catch {
				toast.error(
					`Could not move ${getFinderMovedItemsErrorLabel(payloadItems)}. Please try again.`
				);
			} finally {
				setIsFinderDropPending(false);
			}
		},
		[
			getFinderContextPayloadItems,
			invalidateFinderDropQueries,
			isMockActive,
			moveFinderContactToCampaign,
			moveFinderContactsToCampaign,
			moveFinderDraftToCampaign,
			moveFinderInboxEmailToCampaign,
			moveMockFinderContactToCampaign,
			moveMockFinderContactsToCampaign,
		]
	);

	const handleFinderContextRemoveFromFolder = useCallback(
		async (state: FinderContextMenuState) => {
			const payloadItems = getFinderContextPayloadItems(state);
			if (
				payloadItems.length === 0 ||
				payloadItems.some((payload) => payload.itemKind !== 'contact')
			) {
				return;
			}
			const contactPayloadItems = payloadItems.map((payload) =>
				payload.sourceContactListIds.length > 0
					? payload
					: { ...payload, sourceContactListIds: selectedContactListIds }
			);

			setFinderContextMenu(null);

			if (isMockActive) {
				const removed =
					contactPayloadItems.length === 1
						? removeMockFinderContactFromFolder(contactPayloadItems[0])
						: removeMockFinderContactsFromFolder(contactPayloadItems);
				if (removed) {
					toast.success(
						contactPayloadItems.length > 1
							? `Removed ${contactPayloadItems.length} contacts from folder`
							: 'Removed from folder'
					);
				}
				return;
			}

			if (contactPayloadItems.some((payload) => payload.sourceContactListIds.length === 0)) {
				toast.error('Could not remove contact. Please try again.');
				return;
			}

			setIsFinderDropPending(true);
			try {
				if (contactPayloadItems.length === 1) {
					await removeFinderContactFromFolder(contactPayloadItems[0]);
				} else {
					await removeFinderContactsFromFolder(contactPayloadItems);
				}
				await invalidateFinderDropQueries();
				toast.success(
					contactPayloadItems.length > 1
						? `Removed ${contactPayloadItems.length} contacts from folder`
						: 'Removed from folder'
				);
			} catch {
				toast.error(
					`Could not remove ${
						contactPayloadItems.length > 1 ? 'contacts' : 'contact'
					}. Please try again.`
				);
			} finally {
				setIsFinderDropPending(false);
			}
		},
		[
			getFinderContextPayloadItems,
			invalidateFinderDropQueries,
			isMockActive,
			removeFinderContactFromFolder,
			removeFinderContactsFromFolder,
			removeMockFinderContactFromFolder,
			removeMockFinderContactsFromFolder,
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

	const handleCampaignRowContextMenu = useCallback(
		(rowData: CampaignTableRow, event: React.MouseEvent) => {
			// Finder (contact) rows keep their own context menu; only real campaign
			// rows get this one.
			if (isFinderTableRow(rowData)) return;
			const campaign = rowData as CampaignWithCounts;
			if (typeof campaign.id !== 'number') return;
			event.preventDefault();

			// Anchor the menu just outside the table's right edge, aligned to the
			// clicked row's top (rather than the cursor).
			const rowEl = event.currentTarget as HTMLElement;
			const rowRect = rowEl.getBoundingClientRect();
			const tableRect = rowEl.closest('table')?.getBoundingClientRect();
			const anchorX = (tableRect?.right ?? rowRect.right) + CAMPAIGN_ROW_MENU_GAP;
			const anchorY = rowRect.top;

			// Mirror the exact folder colors painted on this row (stamped onto the
			// folder cell) so the Get Info card matches.
			const folderCell = rowEl.querySelector('.campaign-row-folder-cell');
			const nameBoxColor =
				folderCell?.getAttribute('data-folder-name-color') ??
				CAMPAIGN_FOLDER_NAME_BOX_COLORS[0];
			const folderIconColor =
				folderCell?.getAttribute('data-folder-icon-color') ??
				CAMPAIGN_FOLDER_ICON_COLORS[0];

			setFinderContextMenu(null);
			setFinderInfoPopup(null);
			setCampaignRowInfo(null);
			setCampaignRowMenu({ anchorX, anchorY, campaign, nameBoxColor, folderIconColor });
		},
		[]
	);

	const handleCampaignRowOpenInNewTab = useCallback(
		(state: CampaignRowMenuAnchor) => {
			setCampaignRowMenu(null);
			// Mock rows use synthetic negative ids that route nowhere.
			if (isMockActive) return;
			if (typeof window === 'undefined') return;
			window.open(
				`${urls.murmur.campaign.detail(state.campaign.id)}?silent=1`,
				'_blank',
				'noopener,noreferrer'
			);
		},
		[isMockActive]
	);

	const handleCampaignRowGetInfo = useCallback((state: CampaignRowMenuAnchor) => {
		setCampaignRowMenu(null);
		setCampaignRowInfo(state);
	}, []);

	const handleCampaignRowInfoClose = useCallback(() => {
		setCampaignRowInfo(null);
	}, []);

	const finderContextMenuPayloadItems = getFinderContextPayloadItems(finderContextMenu);
	const canMoveFinderContextItem = Boolean(
		finderContextMenuPayloadItems.length > 0 &&
			finderMoveTargets.length > 0 &&
			!isFinderDropPending &&
			(!isMockActive || onMockStateChange)
	);
	const canRemoveFinderContextItem = Boolean(
		finderContextMenuPayloadItems.length > 0 &&
			finderContextMenuPayloadItems.every((payload) => payload.itemKind === 'contact') &&
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
								selectedItemKeys={selectedFinderItemKeys}
								selectedContactDragCount={selectedFinderContactDragPayloads.length}
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

				// ARCHIVE folder row: flat grayed pill, chevron toggles the deleted list.
				if (isArchiveFolderRow(original)) {
					return (
						<div className="campaign-row-folder-cell relative text-left">
							{/* Invisible marker → CSS paints the whole row #F2F2F2 via
							    tr:has(.archive-folder-row-marker). */}
							<span
								className="archive-folder-row-marker"
								aria-hidden="true"
								style={{ display: 'none' }}
							/>
							<button
								type="button"
								className="campaign-row-left-hover-surface"
								data-custom-table-ignore-row-click="true"
								aria-label={`${isArchiveExpanded ? 'Hide' : 'Show'} archived campaigns`}
								onClick={(event) => {
									event.stopPropagation();
									setIsArchiveExpanded((prev) => !prev);
								}}
							/>
							<CampaignRowChevronIcon
								className={cn(
									'campaign-row-chevron pointer-events-none absolute left-[-19px] top-1/2 h-[14px] w-[14px] -translate-y-1/2',
									'text-black',
									isArchiveExpanded && 'campaign-row-chevron-open'
								)}
							/>
							<div
								className="inline-flex items-center box-border flex-none"
								style={{ height: 20, paddingLeft: 7 }}
							>
								<span
									className="inline-flex items-center justify-center flex-none"
									style={{ color: ARCHIVE_ROW_ICON_COLOR }}
								>
									<DashboardActionBarFolderIcon width={16} height={10} />
								</span>
								<span
									className="ml-[7px] truncate text-[13.854px] leading-[15px] font-inter font-semibold"
									style={{ color: ARCHIVE_FOLDER_NAME_COLOR, letterSpacing: '0.04em' }}
								>
									ARCHIVE
								</span>
								<span className="ml-[10px] inline-flex items-center">
									<CampaignDataTypeIconStrip
										dataTypes={original.campaignDataTypes}
										isConfirming={false}
										hasNew={false}
									/>
								</span>
							</div>
						</div>
					);
				}

				// A deleted campaign listed under the expanded ARCHIVE folder (grayed,
				// indented, no chevron/finder toggle).
				if (isArchivedCampaignRow(original)) {
					return (
						<div className="campaign-row-folder-cell relative text-left">
							<span
								className="archive-campaign-row-marker"
								aria-hidden="true"
								style={{ display: 'none' }}
							/>
							<div
								className="inline-flex items-center box-border flex-none"
								style={{ height: 20, paddingLeft: 18 }}
							>
								<span
									className="inline-flex items-center justify-center flex-none"
									style={{ color: ARCHIVE_ROW_ICON_COLOR }}
								>
									<DashboardActionBarFolderIcon width={16} height={10} />
								</span>
								<span
									className="ml-[7px] truncate text-[13.854px] leading-[15px] font-inter font-medium"
									style={{ color: ARCHIVE_ROW_NAME_COLOR }}
								>
									{original.name}
								</span>
								<span className="ml-[10px] inline-flex items-center">
									<CampaignDataTypeIconStrip
										dataTypes={original.campaignDataTypes ?? []}
										isConfirming={false}
										hasNew={false}
									/>
								</span>
							</div>
						</div>
					);
				}

				const name: string = row.getValue('name');
				const campaign = original as CampaignWithCounts;
				const isConfirming = campaign.id === confirmingCampaignId;
				// Red "delete" warning: hovering the row's delete "X"
				// (deleteWarningCampaignId) or the armed confirm (confirmingCampaignId).
				// The folder pill itself stays normal; the red row band + warning text
				// in the metrics column convey the state.
				const isDeleteWarning =
					isConfirming ||
					(deleteWarningCampaignId != null &&
						campaign.id === deleteWarningCampaignId);
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
						data-folder-name-color={nameBoxColor}
						data-folder-icon-color={folderIconColor}
						data-finder-open={isCampaignFinderOpen ? 'true' : undefined}
						data-finder-drop-zone={isCampaignFinderOpen ? 'true' : undefined}
						data-finder-drop-target={
							isCampaignFinderOpen && isFinderDropTargetActive ? 'true' : undefined
						}
						onDragOver={isCampaignFinderOpen ? handleFinderPanelDragOver : undefined}
						onDragLeave={isCampaignFinderOpen ? handleFinderPanelDragLeave : undefined}
						onDrop={isCampaignFinderOpen ? handleFinderPanelDrop : undefined}
					>
						{/* Invisible marker → CSS paints the whole row red (#E7677C) via
						    tr:has(.campaign-delete-warning-marker). */}
						{isDeleteWarning && (
							<span
								className="campaign-delete-warning-marker"
								aria-hidden="true"
								style={{ display: 'none' }}
							/>
						)}
						{!isDeleteWarning && enableFinder && (
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
								'text-black',
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
								background: '#EEFFF0',
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
									background: nameBoxColor,
									paddingLeft: 2,
									paddingRight: 6,
								}}
							>
								<span
									className="campaign-folder-name-content inline-flex min-w-0 items-center"
								>
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: folderIconColor }}
									>
										<DashboardActionBarFolderIcon width={16} height={10} />
									</span>
									<span
										className={cn(
											'ml-[7px] truncate text-[13.854px] leading-[15px] font-inter font-medium',
											'text-black'
										)}
									>
										{name}
									</span>
								</span>
								<span className="campaign-folder-show-content min-w-0 items-center">
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: folderIconColor }}
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
											'text-black'
										)}
									>
										Show
									</span>
									<span className="campaign-folder-show-caret" aria-hidden="true" />
								</span>
								<span className="campaign-folder-goto-content min-w-0 items-center">
									<span
										className="inline-flex items-center justify-center flex-none"
										style={{ color: folderIconColor }}
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
											'text-black'
										)}
									>
										Go To
									</span>
								</span>
							</div>
							<CampaignDataTypeIconStrip
								dataTypes={campaignDataTypes}
								isConfirming={false}
								hasNew={hasNew}
							/>
							{hasNew && (
								<span
									className={cn(
										'campaign-folder-new-count flex-none text-[13.854px] leading-[17.186px] font-inter font-medium whitespace-nowrap',
										'text-black'
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
				const typedRow = row as CampaignTableRow;
				if (
					isFinderTableRow(typedRow) ||
					isArchiveFolderRow(typedRow) ||
					isArchivedCampaignRow(typedRow)
				) {
					return 0;
				}
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

				// Archive rows (folder aggregate + deleted children) share a flat grayed
				// metrics layout: same column slots/widths as active rows so New/Drafts/
				// Sent/Updated stay aligned, but plain muted text instead of colored pills.
				if (isArchiveFolderRow(original) || isArchivedCampaignRow(original)) {
					const archiveDraftCount = original.draftCount ?? 0;
					const archiveSentCount = original.sentCount ?? 0;
					const archiveNewCount = original.newEmailCount ?? 0;
					const archiveUpdatedAt = new Date(original.updatedAt);
					const archiveLabels = [
						...(shouldShowNewMetricSlot
							? [archiveNewCount >= 1 ? formatMetricPillLabel(archiveNewCount, 'new') : '']
							: []),
						compactMetrics
							? formatMetricCount(archiveDraftCount)
							: formatMetricPillLabel(
									archiveDraftCount,
									archiveDraftCount === 1 ? 'draft' : 'drafts'
								),
						compactMetrics
							? formatMetricCount(archiveSentCount)
							: formatMetricPillLabel(archiveSentCount, 'sent'),
						getUpdatedLabel(archiveUpdatedAt),
					];
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
							{archiveLabels.map((label, index) => (
								<div
									key={index}
									className={cn(
										'campaign-metric-slot relative flex items-center',
										compactMetrics
											? 'w-auto flex-shrink-0 justify-start'
											: 'h-[20px] w-[80px] flex-none justify-center'
									)}
								>
									<span
										className={cn(
											'inline-flex box-border items-center justify-center truncate font-inter font-medium text-[13.854px] leading-[17.186px]',
											!compactMetrics && 'h-[20px] w-[80px] min-w-[80px] max-w-[80px] px-0'
										)}
										style={{ color: ARCHIVE_ROW_METRIC_COLOR }}
									>
										{label}
									</span>
								</div>
							))}
						</div>
					);
				}

				const campaign = original as CampaignWithCounts;
				const isConfirming = campaign.id === confirmingCampaignId;
				// The "Click to Delete..." message replaces the metric pills ONLY after the
				// first click arms the confirm (isConfirming). On plain X-hover the row band
				// turns red (folder-cell marker) but the pills stay with their normal colors.
				if (isConfirming) {
					return (
						<div className="metrics-grid-container flex w-full items-center text-left">
							<div
								className={cn(
									'pointer-events-none font-inter font-medium text-white whitespace-nowrap',
									compactMetrics
										? 'flex h-[20px] items-center text-[11px] uppercase tracking-[0.01em]'
										: 'flex h-[20px] items-center leading-none text-[14px]'
								)}
							>
								Click to Delete and move contents to Archive
							</div>
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
										backgroundColor: fill,
										color: '#000000',
										borderColor: '#000000',
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

		// Clicking anywhere on the ARCHIVE folder row toggles its expansion; deleted
		// campaigns inside it are view-only (no navigation).
		if (isArchiveFolderRow(rowData)) {
			setIsArchiveExpanded((prev) => !prev);
			return;
		}
		if (isArchivedCampaignRow(rowData)) return;

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
			if (onSelectCampaign) {
				onSelectCampaign(rowData.id);
				return;
			}

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
		onRowContextMenu: handleCampaignRowContextMenu,
		campaignRowMenuPortals: (
			<>
				<CampaignRowContextMenu
					state={campaignRowMenu}
					onOpenInNewTab={handleCampaignRowOpenInNewTab}
					onGetInfo={handleCampaignRowGetInfo}
				/>
				<CampaignRowInfoPopup
					state={campaignRowInfo}
					onClose={handleCampaignRowInfoClose}
				/>
			</>
		),
		isFinderOpen,
		isArchiveExpanded,
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
