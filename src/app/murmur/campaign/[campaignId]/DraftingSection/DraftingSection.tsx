import {
	FC,
	Fragment,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { gsap } from 'gsap';
import {
	DraftingSectionProps,
	useDraftingSection,
	HybridBlockPrompt,
	type DraftingFormValues,
	type DraftingSectionView,
} from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { ProfileSidePanelBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
// EmailGeneration kept available but not used in current view
// import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn } from '@/utils';
import { getMurmurRootScale } from '@/utils/rootScale';
import { markAfterPaint } from '@/utils/perfMarks';
import {
	CAMPAIGN_SIDE_SHIFT_VAR,
	CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM,
	CAMPAIGN_SNUG_MIN_EFFECTIVE_WIDTH_PX,
	CAMPAIGN_SNUG_SAFE_BOTTOM_MARGIN_PX,
	CAMPAIGN_WORKSPACE_CONTENT_SCALE,
	getMurmurChromeZoomForWindow,
} from '@/utils/murmurChromeZoom';
import {
	extractMurmurDraftSettingsSnapshot,
	injectMurmurDraftSettingsSnapshot,
	type DraftProfileFields,
} from '@/utils/draftSettings';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useGetContacts, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useCreateEmail, useDeleteEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import {
	EmailStatus,
	EmailVerificationStatus,
	ReviewStatus,
} from '@/constants/prismaEnums';
import { resolveAutoSignatureText } from '@/constants/autoSignatures';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';
import {
	DraftedEmails,
	type DraftedEmailsHandle,
} from './EmailGeneration/DraftedEmails/DraftedEmails';
import { useDraftReviewHandlers } from './EmailGeneration/DraftedEmails/useDraftReviewHandlers';
import { EmailWithRelations } from '@/types';
import { useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContactWithName } from '@/types/contact';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { ContactResearchHoverCard } from '@/components/molecules/ContactResearchPanel/ContactResearchHoverCard';
import { TestPreviewPanel } from '@/components/molecules/TestPreviewPanel/TestPreviewPanel';
import { MiniEmailStructure } from './EmailGeneration/MiniEmailStructure';
import ContactsExpandedList, {
	type ContactsExpandedListFocusMode,
	type ContactsExpandedTopNavStop,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import { DraftsExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftsExpandedList';
import { DraftPreviewExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftPreviewExpandedList';
import { SendingExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/SendingExpandedList';
import { SearchSendingOverlay } from '@/components/molecules/SendingProgress/SearchSendingOverlay';
import { useSendingSessionState } from '@/contexts/SendingSessionContext';
import { SentExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/SentExpandedList';
import { InboxExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/InboxExpandedList';
import { MobileCampaignSearchHeader } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileCampaignSearchHeader';
import {
	MobileCampaignSummary,
	type MobileSummaryScrollRequest,
	type MobileSummarySection,
} from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileCampaignSummary';
import { MobileConversationView } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileConversationView';
import { MobileDraftReviewView } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Mobile/MobileDraftReviewView';
import {
	buildInboxConversations,
	inboxConversationContainsEmailId,
	normalizeApplicationForInboxConversation,
	normalizeInboxEmailAddress,
	normalizeSentEmailForInboxConversation,
	type InboxConversation,
	type InboxConversationMessage,
} from '@/utils/inboxConversations';
import {
	useGetMyEventApplications,
	type MyEventApplication,
} from '@/hooks/queryHooks/useEventApplications';
import {
	OpportunityHoverPanel,
	OPPORTUNITY_HOVER_PANEL_HEIGHT_PX,
	OPPORTUNITY_HOVER_PANEL_WIDTH_PX,
} from '@/components/molecules/OpportunityHoverPanel/OpportunityHoverPanel';
import SearchResultsMap from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import UndoIcon from '@/components/atoms/_svg/UndoIcon';
import UpscaleIcon from '@/components/atoms/_svg/UpscaleIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { urls } from '@/constants/urls';
import { Identity } from '@prisma/client';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import { BottomPanelsContainer } from '../../../../../components/atoms/BottomPanelsContainer';
import type { HistoryAction } from '../../../../../components/atoms/BottomPanelsContainer';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetCampaignContactEvents } from '@/hooks/queryHooks/useCampaigns';
import { buildCampaignInboxMockData } from '../CampaignInboxDebugPanel';
import { CampaignsTableMini } from '@/components/organisms/_tables/CampaignsTable/CampaignsTableMini';
import { CampaignOverviewStrategyBox } from '@/components/molecules/DashboardStrategyBox/CampaignOverviewStrategyBox';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isMusicFestivalTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';

type IdentityProfileFields = Identity & {
	genre?: string | null;
	area?: string | null;
	bandName?: string | null;
	bio?: string | null;
};

const DEFAULT_STATE_SUGGESTIONS = [
	{
		label: 'New York',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
	{
		label: 'Pennsylvania',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
	{
		label: 'California',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
];
const PENDING_SEARCH_STORAGE_KEY = 'murmur_pending_search';

// Dummy contacts behind the Overview right-rail "no results" state — decorative
// ghost rows only (mirrors the Figma mock), never real data.
const OVERVIEW_NO_RESULTS_GHOST_CONTACTS = [
	{
		name: 'Alex Young',
		company: 'Consequence Media',
		chipLabel: 'Coffee Shop',
		chipColor: '#D6F1BD',
		category: 'coffee-shops',
		stateAbbr: 'NY',
		city: 'New York',
	},
	{
		name: 'Ann Ovidio',
		company: 'The Umbrella',
		chipLabel: 'Restaurant',
		chipColor: '#C3FBD1',
		category: 'restaurants',
		stateAbbr: 'NY',
		city: 'New York',
	},
] as const;

const stripInjectedSubjectFromTestMessageHtml = (
	rawHtml: string
): { messageHtml: string; injectedSubject: string } => {
	const html = (rawHtml || '').toString();
	if (!html) return { messageHtml: html, injectedSubject: '' };

	// DOM-based stripping is safest (preserves outer wrappers + signature markup).
	// If we're not in a browser environment, keep as-is.
	if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
		return { messageHtml: html, injectedSubject: '' };
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(
			`<div id="__murmur_test_preview_root">${html}</div>`,
			'text/html'
		);
		const root = doc.getElementById('__murmur_test_preview_root');
		if (!root) return { messageHtml: html, injectedSubject: '' };

		// The AI/Hybrid test flow injects the subject as:
		// <span style="font-family: Inter; font-weight: bold;">{subject}</span><br><br>
		// We remove that subject span and the first two subsequent <br> tags only.
		const subjectSpan = root.querySelector(
			'span[style*="font-family: Inter"][style*="font-weight: bold"]'
		) as HTMLSpanElement | null;
		const injectedSubject = subjectSpan?.textContent?.trim() || '';

		if (!subjectSpan) {
			return { messageHtml: html, injectedSubject };
		}

		const parent = subjectSpan.parentNode;
		let cursor: ChildNode | null = subjectSpan.nextSibling;
		subjectSpan.remove();

		let brsRemoved = 0;
		while (parent && brsRemoved < 2 && cursor) {
			const current = cursor;
			cursor = cursor.nextSibling;

			// Remove whitespace-only text nodes between nodes to ensure <br><br> is removed cleanly.
			if (current.nodeType === Node.TEXT_NODE) {
				if (!(current.textContent || '').trim()) {
					current.parentNode?.removeChild(current);
				}
				continue;
			}

			if (current.nodeType === Node.ELEMENT_NODE) {
				const el = current as Element;
				if (el.tagName.toLowerCase() === 'br') {
					el.parentNode?.removeChild(el);
					brsRemoved += 1;
				}
			}
		}

		return { messageHtml: root.innerHTML, injectedSubject };
	} catch {
		return { messageHtml: html, injectedSubject: '' };
	}
};

interface ExtendedDraftingSectionProps extends DraftingSectionProps {
	onOpenIdentityDialog?: () => void;
	autoOpenProfileTabWhenIncomplete?: boolean;
	isCampaignWorkspaceExpanded?: boolean;
	onRequestCampaignWorkspaceExpanded?: () => void;
	// Overview (All tab) right-rail search mode: shows dashboard-style Search Results panel
	// filtered to this campaign's contacts.
	overviewRightRailSearchQuery?: string | null;
	overviewRightRailSearchContacts?: ContactWithName[];
	overviewRightRailSearchContactsLoading?: boolean;
	onClearOverviewRightRailSearch?: () => void;
}

type CampaignBottomPanelKind = 'contacts' | 'drafts' | 'sent' | 'inbox';

// Row-aligned abridged research card hovered to the left of the pinned contact
// list (Write / Drafts / Inbox tabs). Mirrors the dashboard map-panel hover
// research convention (gap + delayed clear).
const ROW_HOVER_RESEARCH_CARD_WIDTH_PX = 272.425; // ContactResearchPanel abridged width
const ROW_HOVER_RESEARCH_GAP_PX = 13;
const ROW_HOVER_RESEARCH_DOCKED_LEFT_PX = -(
	ROW_HOVER_RESEARCH_CARD_WIDTH_PX + ROW_HOVER_RESEARCH_GAP_PX
);
const ROW_HOVER_RESEARCH_CLEAR_DELAY_MS = 220;
// Full hover-card height (abridged card 312.713 + 13 gap + Description box at its
// EXPANDED height incl. the "Press Tab" pill: 415 + 9 + 23 ≈ 773). Both the pinned-list
// and rail cards statically center this full height in the viewport, so the card never
// drops below the fold and always has room to Tab-expand.
const HOVER_RESEARCH_CARD_FULL_HEIGHT_PX = 312.713 + 13 + 415 + 9 + 23; // ≈ 773
// The search/overview rail card sits slightly above true-center (screen px).
const RAIL_HOVER_RESEARCH_TOP_NUDGE_PX = 56;
// Event-chat rows dock the opportunity panel in the same slot (larger card).
const ROW_HOVER_OPPORTUNITY_DOCKED_LEFT_PX = -(
	OPPORTUNITY_HOVER_PANEL_WIDTH_PX + ROW_HOVER_RESEARCH_GAP_PX
);

export const DraftingSection: FC<ExtendedDraftingSectionProps> = (props) => {
	const {
		view = 'testing',
		renderGlobalOverlays = true,
		onViewReady,
		goToOverview,
		goToDrafting,
		goToWriting,
		onOpenIdentityDialog,
		isCampaignWorkspaceExpanded = false,
		onRequestCampaignWorkspaceExpanded,
		onGoToSearch,
		goToInbox,
		goToSent,
		goToSummary,
		inboxSentTabRequest,
		inboxPanelTabRequest,
		onInboxSentTabChange,
		goToPreviousTab,
		goToNextTab,
		hideHeaderBox,
		onDraftOperationsProgress,
		inboxMockState,
		overviewRightRailSearchQuery,
		overviewRightRailSearchContacts,
		overviewRightRailSearchContactsLoading,
		onClearOverviewRightRailSearch,
	} = props;

	// Search→campaign-tab timing: first paint of the campaign tool view after a tab click
	// on the dashboard map (the click mark is set in handleCampaignTabPointerDown there).
	useEffect(() => {
		markAfterPaint('murmur:camp:view-paint', 'murmur:camp:click');
	}, []);

	const inboxMockOverrideActive = inboxMockState != null;
	const inboxMockData = useMemo(
		() =>
			inboxMockOverrideActive
				? buildCampaignInboxMockData(inboxMockState, props.campaign)
				: null,
		[inboxMockOverrideActive, inboxMockState, props.campaign]
	);

	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		regionCenter: globeWeatherRegionCenter,
	} = useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();

	// Let the campaign page know when the destination view has actually rendered,
	// so we can avoid ending the tab crossfade before heavy UI (e.g. HybridPromptInput) is painted.
	useEffect(() => {
		if (!renderGlobalOverlays) return;
		onViewReady?.(view);
	}, [onViewReady, renderGlobalOverlays, view]);
	const {
		campaign,
		contacts,
		isContactsLoading,
		form,
		promptQualityScore,
		promptQualityLabel,
		promptSuggestions,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isDraftQueueActive,
		isTest,
		isUpscalingPrompt,
		upscalePrompt,
		undoUpscalePrompt,
		hasPreviousPrompt,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
		handleGenerateDrafts,
		generationProgress,
		generationTotal,
		scoreFullAutomatedPrompt,
		critiqueManualEmailText,
		// These are kept available for future use but not in current view:
		// setGenerationProgress,
		// cancelGeneration,
		// isFirstLoad,
		// scrollToEmailStructure,
		draftingRef,
		emailStructureRef,
		draftOperations,
		writeReviewBatchContactIds,
		clearWriteReviewBatch,
		isLivePreviewVisible,
		livePreviewContactId,
		livePreviewMessage,
		livePreviewSubject,
		livePreviewDraftNumber,
		livePreviewTotal,
	} = useDraftingSection(props);

	// --- Transient Write-tab batch review --------------------------------------------------
	// After drafting from the Write tab, surface that exact batch inline (the Drafts review
	// layout) in place of the prompt box — until the batch is fully sent/deleted or the page is
	// refreshed. Only the rendered *content* switches to the drafts experience; the active tab
	// identity stays "Write": top-nav highlight, URL, the in-list mini-nav pill, and the bottom
	// Drafts/Sent/Inbox peek panels all keep keying off the real `view`.
	//
	// `isWriteReviewActive` can only be true on the Write tab with a batch armed this session,
	// so `contentView` (and everything derived from it) is identical to `view` in every other
	// flow — making this change purely additive for the Drafts/Sent/Inbox/Search/Write tabs.
	//
	// The flip to the drafts review is gated on `writeReviewPreviewComplete`: the prompt box
	// (`HybridPromptInput`) stays in place for the whole live-preview animation and we only
	// transition to the review once the last draft has fully typed out (or, for the
	// non-streaming handwritten path, once generation settles). That latch is driven by the
	// effect near `isBatchDraftingInProgress` below. The left-rail live preview is keyed off
	// `view`/`isBatchDraftingInProgress` (not `contentView`), so it keeps animating regardless.
	const [writeReviewPreviewComplete, setWriteReviewPreviewComplete] = useState(false);
	const isWriteReviewActive =
		view === 'testing' &&
		writeReviewBatchContactIds.size > 0 &&
		writeReviewPreviewComplete;
	const contentView: DraftingSectionView = isWriteReviewActive ? 'drafting' : view;

	const { user, isFreeTrial } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: createEmail } = useCreateEmail({ suppressToasts: true });
	const { mutateAsync: editIdentity } = useEditIdentity({ suppressToasts: true });

	// Handle identity field updates from the profile tab
	const handleIdentityUpdate = useCallback(
		async (data: Parameters<typeof editIdentity>[0]['data']) => {
			if (!campaign?.identity?.id) return;
			try {
				await editIdentity({ id: campaign.identity.id, data });
				// Invalidate campaign query to refresh identity data
				queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			} catch (error) {
				toast.error('Failed to save profile changes.');
				console.error('Failed to update identity:', error);
			}
		},
		[campaign?.identity?.id, editIdentity, queryClient]
	);

	// Full Auto "Body" block profile chips (shared with HybridPromptInput)
	const miniProfileFields = useMemo(() => {
		const identityProfile = campaign?.identity as
			| IdentityProfileFields
			| undefined
			| null;
		if (!identityProfile) return null;
		return {
			name: identityProfile.name ?? '',
			genre: identityProfile.genre ?? '',
			area: identityProfile.area ?? '',
			band: identityProfile.bandName ?? '',
			bio: identityProfile.bio ?? '',
			links: identityProfile.website ?? '',
		};
	}, [campaign?.identity]);

	const router = useRouter();
	const isMobile = useIsMobile();
	const [localInboxSentTabRequest, setLocalInboxSentTabRequest] = useState<{
		tab: 'inbox' | 'sent';
		requestId: number;
	} | null>(null);
	const effectiveInboxSentTabRequest =
		localInboxSentTabRequest &&
		localInboxSentTabRequest.requestId > (inboxSentTabRequest?.requestId ?? 0)
			? localInboxSentTabRequest
			: inboxSentTabRequest;
	const openInboxTab = useCallback(() => {
		setLocalInboxSentTabRequest((prev) => ({
			tab: 'inbox',
			requestId: Math.max(prev?.requestId ?? 0, inboxSentTabRequest?.requestId ?? 0) + 1,
		}));
		goToInbox?.();
	}, [goToInbox, inboxSentTabRequest?.requestId]);
	// `contentView` (not `view`) so the Write-tab batch review renders the full drafts
	// experience (draft preview open, research reflects the open draft, drafts-mode left list).
	const isDraftingView = contentView === 'drafting';
	const isSentView = view === 'sent';
	const contactsListTopNavStop = useMemo<ContactsExpandedTopNavStop>(() => {
		if (view === 'overview') return 'all';
		if (view === 'search') return 'search';
		if (view === 'testing') return 'write';
		if (view === 'drafting' || view === 'sent') return 'send';
		if (view === 'inbox') return 'inbox';
		return 'all';
	}, [view]);
	const contactsListFocusMode = useMemo<ContactsExpandedListFocusMode>(
		() => (contentView === 'drafting' ? 'drafts' : 'contacts'),
		[contentView]
	);
	const contactsListTopNavProps = useMemo(
		() => ({
			activeTopNavStop: contactsListTopNavStop,
			focusMode: contactsListFocusMode,
			onOpenAll: goToOverview,
			onOpenSearch: onGoToSearch,
			onOpenWriting: goToWriting,
			onOpenSend: goToDrafting,
			onOpenInbox: openInboxTab,
		}),
		[
			contactsListFocusMode,
			contactsListTopNavStop,
			goToDrafting,
			goToOverview,
			openInboxTab,
			goToWriting,
			onGoToSearch,
		]
	);

	const draftingOperationsForHeader = useMemo(() => {
		// Prefer the live preview counters while a batch is visually "playing back" so the
		// CampaignHeaderBox progress stays in sync with the Contacts pacing + Draft Preview panel.
		if (isLivePreviewVisible && livePreviewTotal > 0) {
			const clampedDraftNumber = Math.max(
				0,
				Math.min(livePreviewTotal, livePreviewDraftNumber)
			);
			const current = Math.max(0, clampedDraftNumber - 1);
			return [{ current, total: livePreviewTotal }];
		}

		return (draftOperations || []).map((op) => ({
			current: op.progress,
			total: op.total,
		}));
	}, [draftOperations, isLivePreviewVisible, livePreviewDraftNumber, livePreviewTotal]);
	const activelyDraftingContactIds = useMemo(() => {
		const ids = new Set<number>();
		for (const op of draftOperations || []) {
			for (const target of op.targets || []) {
				ids.add(target.id);
			}
		}
		return ids;
	}, [draftOperations]);
	const isDraftingProgressVisible =
		renderGlobalOverlays && draftingOperationsForHeader.length > 0;
	const draftingProgressForHeader = isDraftingProgressVisible
		? draftingOperationsForHeader
		: null;

	// Report live drafting progress upward for page-level header rendering (narrowest breakpoint).
	useEffect(() => {
		if (!renderGlobalOverlays) return;
		onDraftOperationsProgress?.({
			visible: isDraftingProgressVisible,
			operations: draftingOperationsForHeader,
		});
	}, [
		onDraftOperationsProgress,
		renderGlobalOverlays,
		isDraftingProgressVisible,
		draftingOperationsForHeader,
	]);

	// Ensure we clear state on unmount.
	useEffect(() => {
		return () => {
			onDraftOperationsProgress?.({ visible: false, operations: [] });
		};
	}, [onDraftOperationsProgress]);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const [isKeepingTestDraft, setIsKeepingTestDraft] = useState(false);
	const [pendingKeptDraftContactId, setPendingKeptDraftContactId] = useState<
		number | null
	>(null);
	// Ref to the main DraftedEmails instance (center column) so side preview controls can exit regen mode.
	const draftedEmailsRef = useRef<DraftedEmailsHandle | null>(null);
	// Tracks whether the DraftedEmails "regen settings preview" (HybridPromptInput) is open for the selected draft.
	// Used to swap the pinned left column from the drafts activity list -> full email preview while regenerating.
	const [
		isSelectedDraftRegenSettingsPreviewOpen,
		setIsSelectedDraftRegenSettingsPreviewOpen,
	] = useState(false);
	const exitSelectedDraftRegenView = useCallback(() => {
		draftedEmailsRef.current?.exitRegenSettingsPreview();
	}, []);
	const [hoveredDraftForSettings, setHoveredDraftForSettings] =
		useState<EmailWithRelations | null>(null);
	const [hoveredSentForSettings, setHoveredSentForSettings] =
		useState<EmailWithRelations | null>(null);
	const isDraftPreviewOpen = isDraftingView && Boolean(selectedDraft);
	const shouldShowPinnedRegenEmailPreview =
		isDraftPreviewOpen && isSelectedDraftRegenSettingsPreviewOpen;

	// Defensive reset so we don't get "stuck" showing regen UI when leaving Drafts or closing the draft.
	useEffect(() => {
		if (!isDraftingView || !selectedDraft) {
			if (isSelectedDraftRegenSettingsPreviewOpen) {
				setIsSelectedDraftRegenSettingsPreviewOpen(false);
			}
		}
	}, [isDraftingView, selectedDraft, isSelectedDraftRegenSettingsPreviewOpen]);
	const draftsMiniEmailTopHeaderHeight = isDraftingView || isSentView ? 23 : undefined;
	const draftsMiniEmailFillColor = isDraftingView || isSentView ? '#DAE6FE' : undefined;

	// Drafts tab: read-only preview form for the MiniEmailStructure, driven by hovered/selected draft settings.
	const draftsSettingsPreviewForm = useForm<DraftingFormValues>({
		defaultValues: form.getValues(),
	});
	// When a draft is OPEN for review/editing, the settings panel should ALWAYS reflect that draft,
	// even if the user hovers other rows in the list.
	const draftForSettingsPreview = isDraftingView
		? (selectedDraft ?? hoveredDraftForSettings)
		: null;
	// Track the profile fields from the draft's snapshot (so we show what was used at generation time)
	const [draftProfileFieldsForSettings, setDraftProfileFieldsForSettings] =
		useState<DraftProfileFields | null>(null);
	useEffect(() => {
		if (!isDraftingView) {
			// Avoid leaking hover state across tabs.
			if (hoveredDraftForSettings) setHoveredDraftForSettings(null);
			setDraftProfileFieldsForSettings(null);
			return;
		}

		const snapshot = draftForSettingsPreview
			? extractMurmurDraftSettingsSnapshot(draftForSettingsPreview.message)
			: null;
		const nextValues = snapshot?.values ?? form.getValues();
		draftsSettingsPreviewForm.reset(nextValues);
		// Store the profile fields from the draft's snapshot (may be undefined for old drafts)
		setDraftProfileFieldsForSettings(snapshot?.profileFields ?? null);
	}, [
		view,
		draftForSettingsPreview?.id,
		draftForSettingsPreview?.message,
		form,
		draftsSettingsPreviewForm,
		hoveredDraftForSettings,
	]);

	// When a draft is open, disable/clear hover-driven settings previews so the right panel is stable.
	useEffect(() => {
		if (!isDraftingView) return;
		if (!selectedDraft) return;
		if (hoveredDraftForSettings) setHoveredDraftForSettings(null);
	}, [hoveredDraftForSettings, isDraftingView, selectedDraft]);

	// Sent tab: read-only preview form for the MiniEmailStructure, driven by hovered sent email settings.
	const sentSettingsPreviewForm = useForm<DraftingFormValues>({
		defaultValues: form.getValues(),
	});
	const sentForSettingsPreview = isSentView ? hoveredSentForSettings : null;
	// Track the profile fields from the sent email's snapshot (so we show what was used at generation time)
	const [sentProfileFieldsForSettings, setSentProfileFieldsForSettings] =
		useState<DraftProfileFields | null>(null);
	useEffect(() => {
		if (!isSentView) {
			// Avoid leaking hover state across tabs.
			if (hoveredSentForSettings) setHoveredSentForSettings(null);
			setSentProfileFieldsForSettings(null);
			return;
		}

		const snapshot = sentForSettingsPreview
			? extractMurmurDraftSettingsSnapshot(sentForSettingsPreview.message)
			: null;
		const nextValues = snapshot?.values ?? form.getValues();
		sentSettingsPreviewForm.reset(nextValues);
		// Store the profile fields from the sent email's snapshot (may be undefined for old emails)
		setSentProfileFieldsForSettings(snapshot?.profileFields ?? null);
	}, [
		view,
		sentForSettingsPreview?.id,
		sentForSettingsPreview?.message,
		form,
		sentSettingsPreviewForm,
		hoveredSentForSettings,
	]);

	// Compute which profile fields to show in MiniEmailStructure:
	// - Drafts tab: use the profile stored with the draft (fallback to current identity)
	// - Sent tab: use the profile stored with the sent email (fallback to current identity)
	// - Other tabs: use the current identity profile
	const profileFieldsForSettings = useMemo(() => {
		if (isDraftingView && draftProfileFieldsForSettings) {
			return draftProfileFieldsForSettings;
		}
		if (isSentView && sentProfileFieldsForSettings) {
			return sentProfileFieldsForSettings;
		}
		return miniProfileFields;
	}, [
		isDraftingView,
		isSentView,
		draftProfileFieldsForSettings,
		sentProfileFieldsForSettings,
		miniProfileFields,
	]);

	// Narrow desktop detection for Writing tab compact layout.
	// Note: widened upper bound from 1280 -> 1317 so the left pinned panel never clips
	// when campaign zoom / browser zoom reduces available space.
	const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
	// Narrowest desktop detection (< 952px) - shows contacts table below writing box
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Search tab narrow detection (< 1414px) - reduces map box width
	const [isSearchTabNarrow, setIsSearchTabNarrow] = useState(false);
	// Inbox tab narrow detection (<= 1520px) - reduces inbox box width to 516px
	const [isInboxTabNarrow, setIsInboxTabNarrow] = useState(false);
	// Inbox tab stacked layout detection (<= 1279px) - moves research panel below header box on the left.
	// The inbox render also stacks across the whole isNarrowDesktop band (< 1317px), so the
	// wide 863px panel never renders once the page centers; this state stays <= 1279 because
	// shouldReserveSharedWideTabZoomEnvelope (overview/search) depends on it as-is.
	const [isInboxTabStacked, setIsInboxTabStacked] = useState(false);
	// On the Drafts tab, the absolutely-positioned bulk send-bar sits at a fixed slot, while
	// the per-draft Send/Regenerate/Delete action row flows below the open preview card.
	// On smaller screens (and with taller drafts) the action row grows down into the bar's
	// slot, so they visually overlap. We measure both at runtime and hide the bar only when
	// they would actually collide (see the overlap-detection effect below).
	const [isDraftReviewOverlappingSendBar, setIsDraftReviewOverlappingSendBar] =
		useState(false);
	const draftsSendBarWrapperRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		// Matches `DEFAULT_CAMPAIGN_ZOOM` in the campaign page.
		// Important: when `--murmur-campaign-zoom` is NOT set, CSS still defaults to 0.85 via
		// `zoom: var(--murmur-campaign-zoom, 0.85)` (and the transform fallback mirrors this).
		const DEFAULT_CAMPAIGN_ZOOM = 0.85;
		const CAMPAIGN_ZOOM_VAR = '--murmur-campaign-zoom';
		const CAMPAIGN_ZOOM_EVENT = 'murmur:campaign-zoom-changed';
		const checkBreakpoints = () => {
			const html = document.documentElement;
			const zoomStr = window.getComputedStyle(html).zoom;
			const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
			const varZoomStr = window
				.getComputedStyle(html)
				.getPropertyValue(CAMPAIGN_ZOOM_VAR);
			const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
			// Prefer actual zoom() when supported; otherwise fall back to the campaign zoom var.
			const z =
				Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
					? parsedZoom
					: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
						? parsedVarZoom
						: DEFAULT_CAMPAIGN_ZOOM;
			const effectiveWidth = window.innerWidth / (z || 1);

			setIsNarrowDesktop(effectiveWidth >= 952 && effectiveWidth < 1317);
			setIsNarrowestDesktop(effectiveWidth < 952);
			setIsSearchTabNarrow(effectiveWidth < 1414);
			setIsInboxTabNarrow(effectiveWidth <= 1520);
			setIsInboxTabStacked(effectiveWidth <= 1279);
		};
		checkBreakpoints();
		window.addEventListener('resize', checkBreakpoints);
		window.addEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		return () => {
			window.removeEventListener('resize', checkBreakpoints);
			window.removeEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		};
	}, []);

	// --- Envelope expansion for large monitors ---
	// The campaign zoom is capped at the shared chrome zoom target
	// (src/utils/murmurChromeZoom.ts) so the fixed top chrome matches the dashboard
	// map view exactly. When the viewport is taller than the natural snug fit at
	// that target, the panels keep their tuned proportions and the slack lowers the
	// workspace cluster toward the middle of the band (half as marginTop, half as a
	// wider gap above the bottom panels, which stay pinned at the viewport bottom).
	const [extraEnvelopeHeightPx, setExtraEnvelopeHeightPx] = useState(0);
	// The E value the committed DOM currently reflects — compute() measures the DOM,
	// so its correction must be applied relative to this, not to in-flight state.
	const appliedEnvelopeExtraRef = useRef(0);
	// The E we last stepped away from — used to suppress exact one-step round
	// trips (see the boundary-flutter guard in compute()).
	const lastEnvelopeStepFromRef = useRef<number | null>(null);
	useLayoutEffect(() => {
		if (appliedEnvelopeExtraRef.current === extraEnvelopeHeightPx) return;
		appliedEnvelopeExtraRef.current = extraEnvelopeHeightPx;
		// The anchors just moved; ask the page to re-fit the zoom against them (the
		// resize settle passes may already be over, e.g. when inbox content loads
		// late). The page's zoom pass dispatches murmur:campaign-zoom-changed, which
		// re-runs compute() — the loop stops at the ±4px hysteresis.
		try {
			window.dispatchEvent(new CustomEvent('murmur:campaign-envelope-changed'));
		} catch {
			// ignore
		}
	}, [extraEnvelopeHeightPx]);
	const isWideEnvelopeActive =
		!isMobile &&
		!hideHeaderBox &&
		!isNarrowDesktop &&
		!isNarrowestDesktop &&
		['testing', 'drafting', 'sent', 'inbox', 'overview'].includes(view);
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (!isWideEnvelopeActive) {
			setExtraEnvelopeHeightPx(0);
			return;
		}
		let raf: number | null = null;
		const compute = () => {
			// Measure the same bottom anchors the page's snug-fit zoom pass measures,
			// from the active view layer only (a crossfading previous layer would
			// otherwise pollute the measurement).
			const layer =
				(document.querySelector(
					'[data-campaign-view-layer="active"]'
				) as HTMLElement | null) ?? document.body;
			const anchors = Array.from(
				layer.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
			);
			if (anchors.length === 0) return;
			// Geometric root-scale read — correct in CSS-zoom mode, Safari transform
			// mode, and during cold load before the compact class lands (ratio 1).
			// Never parse the zoom var here: it can read its 0.85 fallback before the
			// first zoom apply.
			const body = document.body;
			const rootScale =
				body.offsetWidth > 0
					? body.getBoundingClientRect().width / body.offsetWidth
					: 1;
			const maxBottomPx =
				anchors.reduce((acc, el) => Math.max(acc, el.getBoundingClientRect().bottom), 0) /
				(rootScale || 1);
			if (maxBottomPx <= 0) return;
			const targetZoom = Math.min(
				getMurmurChromeZoomForWindow(),
				window.innerWidth / CAMPAIGN_SNUG_MIN_EFFECTIVE_WIDTH_PX,
				CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM
			);
			if (!Number.isFinite(targetZoom) || targetZoom <= 0) return;
			const availableH = Math.max(
				0,
				window.innerHeight - CAMPAIGN_SNUG_SAFE_BOTTOM_MARGIN_PX
			);
			// How much deeper the anchor bottom must sit (root-unscaled px) for the
			// snug fit to land exactly at the shared target, converted to layout px
			// inside the 0.94-scaled workspace. Measurement-based, so it converges
			// even if a view's anchors don't move exactly 0.94px per envelope px.
			const deficitLayoutPx =
				(availableH / targetZoom - maxBottomPx) / CAMPAIGN_WORKSPACE_CONTENT_SCALE;
			const appliedE = appliedEnvelopeExtraRef.current;
			// Floor-quantize so the snug fit always lands at (never past) the target —
			// the bottom anchors never clip, so the page's clip observer never churns.
			// The ±4px hysteresis stops the correction loop once converged.
			const next = Math.max(0, Math.floor((appliedE + deficitLayoutPx) / 4) * 4);
			if (Math.abs(next - appliedE) < 4) return;
			// Boundary flutter guard: a measurement sitting exactly on a 4px
			// quantization boundary flips floor() by one step on alternate frames;
			// stepping straight back to the E we just left would ping-pong forever
			// (each flip re-triggers a zoom re-fit — a perpetual per-frame loop).
			if (Math.abs(next - appliedE) === 4 && next === lastEnvelopeStepFromRef.current)
				return;
			lastEnvelopeStepFromRef.current = appliedE;
			setExtraEnvelopeHeightPx(next);
		};
		const schedule = () => {
			if (raf != null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				compute();
			});
		};
		compute();
		window.addEventListener('resize', schedule, { passive: true });
		window.addEventListener(
			'murmur:campaign-zoom-changed',
			schedule as EventListener
		);
		return () => {
			if (raf != null) window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', schedule);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				schedule as EventListener
			);
		};
	}, [isWideEnvelopeActive, isCampaignWorkspaceExpanded, view]);
	// Slack distribution: the panels keep their tuned proportions; half the slack
	// lowers the whole workspace cluster (marginTop on the content wrapper) so it
	// sits centered in the band rather than hugging the top, and the rest widens
	// the gap above the bottom panels, which stay pinned to the viewport bottom.
	const workspaceDropPx = Math.floor(extraEnvelopeHeightPx / 2);
	const extraBottomGapPx = extraEnvelopeHeightPx - workspaceDropPx;

	const bottomPanelBoxWidthPx = 197;
	const bottomPanelBoxHeightPx = 45;
	const bottomPanelCollapsed = true;
	const writeDraftBottomBarHeightPx = 40;
	// Sit the draft bar centered in the gap between the main content boxes' bottom
	// (left column bottom ≈ 687px) and the bottom panels' top, rather than hugging
	// the panels. The bar's top = panels top − bar height − this gap.
	const writeDraftBottomBarGapPx = 58;
	const mainContactsPanelWidthPx = 377;
	const mainContactsPanelHeightPx = 597;
	const isOverviewRightRailSearchActive = Boolean(
		view === 'overview' && (overviewRightRailSearchQuery || '').trim()
	);
	const OVERVIEW_CONTACTS_DOCK_GAP_RIGHT_PX = 56;
	const OVERVIEW_CONTACTS_DOCK_GAP_DOWN_PX = 66;
	// Pixel-perfect nudge after eyeballing references.
	const OVERVIEW_CONTACTS_DOCK_NUDGE_LEFT_PX = 6;
	const OVERVIEW_CONTACTS_DOCK_NUDGE_UP_PX = 8;
	// Match the campaign page's content scale (so Overview sizes match Write).
	const OVERVIEW_CONTACTS_DOCK_SCALE = 0.94;
	// Default right-rail width matches the existing Campaigns mini + Strategy stack.
	// When the overview right-rail is in search mode, we match the dashboard map-side panel width.
	const OVERVIEW_RIGHT_RAIL_WIDTH_PX = isOverviewRightRailSearchActive ? 433 : 371;
	// Match the dashboard map-view panel (right-[10px]).
	const OVERVIEW_RIGHT_RAIL_GAP_FROM_RIGHT_WALL_PX = isOverviewRightRailSearchActive ? 10 : 40;
	const OVERVIEW_RIGHT_RAIL_GAP_FROM_HEADER_PX = 74;
	const inboxMainPanelWidthPx = 863;
	const inboxMainPanelHeightPx = 706;
	// Overview degrades progressively as the viewport narrows: the right rail goes
	// first (isNarrowDesktop), then the docked contacts column (isNarrowestDesktop).
	const shouldDockOverviewContacts =
		view === 'overview' && !isMobile && !isNarrowestDesktop;
	const shouldShowOverviewRightRail =
		view === 'overview' && !isMobile && !isNarrowDesktop && !isNarrowestDesktop;
	const shouldShowOverviewRightRailSearchPanel =
		shouldShowOverviewRightRail && isOverviewRightRailSearchActive;
	const [isProfileSidePanelOpen, setIsProfileSidePanelOpen] = useState(false);
	const shouldUseProfileSidePanel =
		contentView === 'testing' && !isMobile && !isNarrowestDesktop;
	const handleOpenProfileSidePanel = useCallback(() => {
		if (!shouldUseProfileSidePanel) return;
		setIsProfileSidePanelOpen(true);
	}, [shouldUseProfileSidePanel]);
	useEffect(() => {
		if (!shouldUseProfileSidePanel && isProfileSidePanelOpen) {
			setIsProfileSidePanelOpen(false);
		}
	}, [shouldUseProfileSidePanel, isProfileSidePanelOpen]);
	useEffect(() => {
		if (!isProfileSidePanelOpen) return;
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest('[data-campaign-profile-side-panel]')) return;
			setIsProfileSidePanelOpen(false);
		};
		document.addEventListener('mousedown', handlePointerDown);
		return () => document.removeEventListener('mousedown', handlePointerDown);
	}, [isProfileSidePanelOpen]);
	const overviewRightRailSearchText = (overviewRightRailSearchQuery ?? '').trim();
	const overviewRightRailSearchContactsResolved = useMemo(
		() => overviewRightRailSearchContacts ?? [],
		[overviewRightRailSearchContacts]
	);
	const [overviewRightRailSelectedContacts, setOverviewRightRailSelectedContacts] =
		useState<number[]>([]);
	const [overviewRightRailHoveredContactId, setOverviewRightRailHoveredContactId] =
		useState<number | null>(null);
	const [overviewRightRailSelectedCategoryChips, setOverviewRightRailSelectedCategoryChips] =
		useState<Set<string>>(() => new Set());

	useEffect(() => {
		// Reset selection + category chip filters whenever the overview right-rail search query changes.
		// This matches the "fresh panel per search" feel from the dashboard map-side panel.
		if (!shouldShowOverviewRightRailSearchPanel) return;
		setOverviewRightRailSelectedContacts([]);
		setOverviewRightRailSelectedCategoryChips(new Set());
	}, [overviewRightRailSearchText, shouldShowOverviewRightRailSearchPanel]);

	const overviewRightRailFilteredContacts = useMemo(() => {
		if (!shouldShowOverviewRightRailSearchPanel) return [];
		const q = overviewRightRailSearchText.toLowerCase();
		if (!q) return [];
		const tokens = q.split(/\s+/g).filter(Boolean);
		if (tokens.length === 0) return [];
		const contacts = overviewRightRailSearchContactsResolved;
		return contacts.filter((c) => {
			const parts = [
				c.name,
				c.firstName,
				c.lastName,
				c.company,
				c.title,
				c.headline,
				c.curatedDisplayLabel,
				c.city,
				c.state,
				c.email,
			]
				.filter(Boolean)
				.map((v) => String(v).toLowerCase());
			const haystack = parts.join(' | ');
			for (const t of tokens) {
				if (!haystack.includes(t)) return false;
			}
			return true;
		});
	}, [
		overviewRightRailSearchContactsResolved,
		overviewRightRailSearchText,
		shouldShowOverviewRightRailSearchPanel,
	]);

	const overviewRightRailSelectedIdSet = useMemo(
		() => new Set<number>(overviewRightRailSelectedContacts),
		[overviewRightRailSelectedContacts]
	);
	const overviewRightRailSelectedContactsFull = useMemo(
		() =>
			overviewRightRailFilteredContacts.filter((c) =>
				overviewRightRailSelectedIdSet.has(c.id)
			),
		[overviewRightRailFilteredContacts, overviewRightRailSelectedIdSet]
	);
	const overviewRightRailUnselectedContactsFull = useMemo(
		() =>
			overviewRightRailFilteredContacts.filter(
				(c) => !overviewRightRailSelectedIdSet.has(c.id)
			),
		[overviewRightRailFilteredContacts, overviewRightRailSelectedIdSet]
	);

	const getOverviewRightRailChipKeyForContact = useCallback(
		(contact: ContactWithName): string | null => {
			const headline =
				contact.curatedDisplayLabel || contact.headline || contact.title || '';
			if (isRestaurantTitle(headline)) return 'restaurants';
			if (isCoffeeShopTitle(headline)) return 'coffee-shops';
			if (isMusicVenueTitle(headline)) return 'music-venues';
			if (isMusicFestivalTitle(headline)) return 'festivals';
			if (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
				return 'wedding-planners';
			if (isWineBeerSpiritsTitle(headline)) return 'wine-beer-spirits';
			if (/\bradio stations?\b/i.test(headline)) return 'radio-stations';
			return null;
		},
		[]
	);

	const overviewRightRailCategoryKeys = useMemo(() => {
		const set = new Set<string>();
		for (const c of overviewRightRailFilteredContacts) {
			const key = getOverviewRightRailChipKeyForContact(c);
			if (key) set.add(key);
		}
		return set;
	}, [overviewRightRailFilteredContacts, getOverviewRightRailChipKeyForContact]);

	const overviewRightRailUnselectedContactsFiltered = useMemo(() => {
		if (overviewRightRailSelectedCategoryChips.size === 0)
			return overviewRightRailUnselectedContactsFull;
		return overviewRightRailUnselectedContactsFull.filter((c) => {
			const key = getOverviewRightRailChipKeyForContact(c);
			return !key || !overviewRightRailSelectedCategoryChips.has(key);
		});
	}, [
		overviewRightRailUnselectedContactsFull,
		overviewRightRailSelectedCategoryChips,
		getOverviewRightRailChipKeyForContact,
	]);

	const overviewRightRailVisibleCategoryKeys = useMemo(() => {
		const set = new Set<string>();
		for (const c of overviewRightRailUnselectedContactsFiltered) {
			const key = getOverviewRightRailChipKeyForContact(c);
			if (key) set.add(key);
		}
		return set;
	}, [overviewRightRailUnselectedContactsFiltered, getOverviewRightRailChipKeyForContact]);

	const renderOverviewRightRailDesktopRow = useCallback(
		(contact: ContactWithName) => {
			const isSelected = overviewRightRailSelectedIdSet.has(contact.id);
			const isHovered = overviewRightRailHoveredContactId === contact.id;
			const firstName = contact.firstName || '';
			const lastName = contact.lastName || '';
			const fullName = contact.name || `${firstName} ${lastName}`.trim();
			const company = contact.company || '';
			const headline =
				contact.curatedDisplayLabel || contact.headline || contact.title || '';
			const stateAbbr = getStateAbbreviation(contact.state || '') || '';
			const city = contact.city || '';

			return (
				<div
					key={contact.id}
					data-contact-id={contact.id}
					className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
					style={{
						backgroundColor: isSelected
							? isRestaurantTitle(headline)
								? isHovered
									? '#C5F5D1'
									: '#D7FFE1'
								: isCoffeeShopTitle(headline)
									? isHovered
										? '#DDF4CC'
										: '#EDFEDC'
									: isMusicVenueTitle(headline)
										? isHovered
											? '#C5E8FF'
											: '#D7F0FF'
										: isMusicFestivalTitle(headline)
											? isHovered
												? '#ADD4FF'
												: '#BFDCFF'
											: isWeddingPlannerTitle(headline) ||
												  isWeddingVenueTitle(headline)
													? isHovered
														? '#F5EDCE'
														: '#FFF8DC'
												: isWineBeerSpiritsTitle(headline)
													? isHovered
														? '#C8CBFF'
														: '#DADDFF'
													: isHovered
														? '#BFE3FF'
														: '#C9EAFF'
							: isHovered
								? '#F3F4F6'
								: '#FFFFFF',
					}}
					onClick={() => {
						setOverviewRightRailSelectedContacts((prev) => {
							if (prev.includes(contact.id)) {
								return prev.filter((id) => id !== contact.id);
							}
							return [...prev, contact.id];
						});
					}}
					onMouseEnter={() => setOverviewRightRailHoveredContactId(contact.id)}
					onMouseLeave={() =>
						setOverviewRightRailHoveredContactId((prev) =>
							prev === contact.id ? null : prev
						)
					}
				>
					{fullName ? (
						<>
							<div className="pl-3 pr-1 flex items-center h-[23px]">
								<div className="font-bold text-[11px] w-full truncate leading-tight">
									{fullName}
								</div>
							</div>
							<div className="pr-2 pl-1 flex items-center h-[23px]">
								{headline ? (
									<div
										className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
										style={{
											backgroundColor: isRestaurantTitle(headline)
												? '#C3FBD1'
												: isCoffeeShopTitle(headline)
													? '#D6F1BD'
													: isMusicVenueTitle(headline)
														? '#B7E5FF'
														: isMusicFestivalTitle(headline)
															? '#C1D6FF'
															: isWeddingPlannerTitle(headline) ||
																  isWeddingVenueTitle(headline)
																? '#FFF8DC'
																: isWineBeerSpiritsTitle(headline)
																	? '#BFC4FF'
																	: '#E8EFFF',
										}}
									>
										{isRestaurantTitle(headline) && (
											<RestaurantsIcon size={12} className="flex-shrink-0" />
										)}
										{isCoffeeShopTitle(headline) && <CoffeeShopsIcon size={7} />}
										{isMusicVenueTitle(headline) && (
											<MusicVenuesIcon size={12} className="flex-shrink-0" />
										)}
										{isMusicFestivalTitle(headline) && (
											<FestivalsIcon size={12} className="flex-shrink-0" />
										)}
										{(isWeddingPlannerTitle(headline) ||
											isWeddingVenueTitle(headline)) && (
											<WeddingPlannersIcon size={12} />
										)}
										{isWineBeerSpiritsTitle(headline) && (
											<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
										)}
										<span className="text-[10px] text-black leading-none truncate">
											{isWineBeerSpiritsTitle(headline)
												? getWineBeerSpiritsLabel(headline)
												: headline}
										</span>
									</div>
								) : (
									<div className="w-full" />
								)}
							</div>
							<div className="pl-3 pr-1 flex items-center h-[22px]">
								<div className="text-[11px] text-black w-full truncate leading-tight">
									{company}
								</div>
							</div>
							<div className="pr-2 pl-1 flex items-center h-[22px]">
								{city || stateAbbr ? (
									<div className="flex items-center gap-1 w-full">
										{stateAbbr && (
											<span
												className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
												style={{
													backgroundColor:
														stateBadgeColorMap[stateAbbr] || 'transparent',
													borderColor: '#000000',
												}}
											>
												{stateAbbr}
											</span>
										)}
										{city && (
											<span className="text-[10px] text-black leading-none truncate">
												{city}
											</span>
										)}
									</div>
								) : (
									<div className="w-full" />
								)}
							</div>
						</>
					) : (
						<>
							<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
								<div className="font-bold text-[11px] w-full truncate leading-tight">
									{company || '—'}
								</div>
							</div>
							<div className="pr-2 pl-1 flex items-center h-[23px]">
								{headline ? (
									<div
										className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
										style={{
											backgroundColor: isRestaurantTitle(headline)
												? '#C3FBD1'
												: isCoffeeShopTitle(headline)
													? '#D6F1BD'
													: isMusicVenueTitle(headline)
														? '#B7E5FF'
														: isMusicFestivalTitle(headline)
															? '#C1D6FF'
															: isWeddingPlannerTitle(headline) ||
																  isWeddingVenueTitle(headline)
																? '#FFF8DC'
																: isWineBeerSpiritsTitle(headline)
																	? '#BFC4FF'
																	: '#E8EFFF',
										}}
									>
										<span className="text-[10px] text-black leading-none truncate">
											{isWineBeerSpiritsTitle(headline)
												? getWineBeerSpiritsLabel(headline)
												: headline}
										</span>
									</div>
								) : (
									<div className="w-full" />
								)}
							</div>
							<div className="pr-2 pl-1 flex items-center h-[22px]">
								{city || stateAbbr ? (
									<div className="flex items-center gap-1 w-full">
										{stateAbbr && (
											<span
												className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
												style={{
													backgroundColor:
														stateBadgeColorMap[stateAbbr] || 'transparent',
													borderColor: '#000000',
												}}
											>
												{stateAbbr}
											</span>
										)}
										{city && (
											<span className="text-[10px] text-black leading-none truncate">
												{city}
											</span>
										)}
									</div>
								) : (
									<div className="w-full" />
								)}
							</div>
						</>
					)}
				</div>
			);
		},
		[
			overviewRightRailHoveredContactId,
			overviewRightRailSelectedIdSet,
			setOverviewRightRailHoveredContactId,
			setOverviewRightRailSelectedContacts,
		]
	);
	const [overviewContactsDockPos, setOverviewContactsDockPos] = useState<{
		leftPx: number;
		topPx: number;
	} | null>(null);
	const [overviewRightRailPos, setOverviewRightRailPos] = useState<{
		leftPx: number;
		topPx: number;
	} | null>(null);
	const getEffectiveCampaignZoom = useCallback(() => {
		if (typeof window === 'undefined') return 0.85;
		const html = document.documentElement;
		const zoomStr = window.getComputedStyle(html).zoom;
		const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
		const varZoomStr = window
			.getComputedStyle(html)
			.getPropertyValue('--murmur-campaign-zoom');
		const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
		const DEFAULT_CAMPAIGN_ZOOM = 0.85;
		return Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
			? parsedZoom
			: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
				? parsedVarZoom
				: DEFAULT_CAMPAIGN_ZOOM;
	}, []);
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (!shouldShowOverviewRightRail) {
			setOverviewRightRailPos((prev) => (prev ? null : prev));
			return;
		}

		let raf: number | null = null;
		const compute = () => {
			const headerBackdrop = document.querySelector<HTMLElement>(
				'[data-slot="campaign-top-backdrop"]'
			);
			const headerBox =
				(headerBackdrop?.firstElementChild as HTMLElement | null) ?? headerBackdrop;
			const headerRect = headerBox?.getBoundingClientRect();
			const zoom = getEffectiveCampaignZoom();
			const safeZoom = zoom || 1;
			const headerBottomVisualPx =
				headerRect && headerRect.height > 0
					? headerRect.bottom
					: 72 * safeZoom;
			// Ride the side-chrome centering shift (written by the campaign zoom pass)
			// so the Folders/Strategy rail comes down with the left rail on tall monitors.
			const sideShiftStr = window
				.getComputedStyle(document.documentElement)
				.getPropertyValue(CAMPAIGN_SIDE_SHIFT_VAR);
			const parsedSideShift = sideShiftStr ? parseFloat(sideShiftStr) : NaN;
			const sideShiftVisualPx = Number.isFinite(parsedSideShift)
				? parsedSideShift
				: 0;
			const nextLeft =
				(window.innerWidth - OVERVIEW_RIGHT_RAIL_GAP_FROM_RIGHT_WALL_PX) /
					safeZoom -
				OVERVIEW_RIGHT_RAIL_WIDTH_PX;
			const nextTop =
				(headerBottomVisualPx +
					OVERVIEW_RIGHT_RAIL_GAP_FROM_HEADER_PX +
					sideShiftVisualPx) /
				safeZoom;

			setOverviewRightRailPos((prev) => {
				if (
					prev &&
					Math.abs(prev.leftPx - nextLeft) < 0.25 &&
					Math.abs(prev.topPx - nextTop) < 0.25
				) {
					return prev;
				}
				return { leftPx: nextLeft, topPx: nextTop };
			});
		};
		const schedule = () => {
			if (raf != null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				compute();
			});
		};

		compute();
		window.addEventListener('resize', schedule, { passive: true });
		// Synchronous on zoom-changed: the page dispatches it from its layout-effect
		// pass (pre-paint) after writing new geometry vars on a tab switch; an rAF
		// here would paint one frame with the rail at the stale position.
		window.addEventListener(
			'murmur:campaign-zoom-changed',
			compute as EventListener
		);

		let ro: ResizeObserver | null = null;
		try {
			if (typeof ResizeObserver !== 'undefined') {
				const headerBackdrop = document.querySelector<HTMLElement>(
					'[data-slot="campaign-top-backdrop"]'
				);
				const headerBox =
					(headerBackdrop?.firstElementChild as HTMLElement | null) ?? headerBackdrop;
				if (headerBox) {
					ro = new ResizeObserver(() => schedule());
					ro.observe(headerBox);
				}
			}
		} catch {
			// ignore
		}

		return () => {
			if (raf != null) window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', schedule);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				compute as EventListener
			);
			ro?.disconnect();
		};
	}, [
		getEffectiveCampaignZoom,
		shouldShowOverviewRightRail,
		OVERVIEW_RIGHT_RAIL_WIDTH_PX,
		OVERVIEW_RIGHT_RAIL_GAP_FROM_RIGHT_WALL_PX,
	]);
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (!shouldDockOverviewContacts) {
			setOverviewContactsDockPos((prev) => (prev ? null : prev));
			return;
		}

		let raf: number | null = null;
		const compute = () => {
			const leftPanel = document.querySelector<HTMLElement>(
				'[data-campaign-overview-left-panel="true"]'
			);
			const showingPill = document.querySelector<HTMLElement>(
				'[data-campaign-overview-showing-pill="true"]'
			);
			if (!leftPanel || !showingPill) return;
			const leftRect = leftPanel.getBoundingClientRect();
			const showingRect = showingPill.getBoundingClientRect();
			const zoom = getEffectiveCampaignZoom();
			const nextLeft =
				(
					leftRect.right +
					OVERVIEW_CONTACTS_DOCK_GAP_RIGHT_PX -
					OVERVIEW_CONTACTS_DOCK_NUDGE_LEFT_PX
				) /
				(zoom || 1);
			const nextTop =
				(
					showingRect.top +
					OVERVIEW_CONTACTS_DOCK_GAP_DOWN_PX -
					OVERVIEW_CONTACTS_DOCK_NUDGE_UP_PX
				) /
				(zoom || 1);

			setOverviewContactsDockPos((prev) => {
				if (
					prev &&
					Math.abs(prev.leftPx - nextLeft) < 0.25 &&
					Math.abs(prev.topPx - nextTop) < 0.25
				) {
					return prev;
				}
				return { leftPx: nextLeft, topPx: nextTop };
			});
		};
		const schedule = () => {
			if (raf != null) return;
			raf = window.requestAnimationFrame(() => {
				raf = null;
				compute();
			});
		};

		// Compute synchronously on mount/switch to avoid a visible flash at the fallback position.
		compute();
		window.addEventListener('resize', schedule, { passive: true });
		// Synchronous on zoom-changed: the page dispatches it from its layout-effect
		// pass (pre-paint) after writing new geometry vars on a tab switch; an rAF
		// here would paint one frame with the dock at the stale position.
		window.addEventListener(
			'murmur:campaign-zoom-changed',
			compute as EventListener
		);
		// Keep dock position synced while the left panel animates/scales.
		let ro: ResizeObserver | null = null;
		try {
			if (typeof ResizeObserver !== 'undefined') {
				const leftPanel = document.querySelector<HTMLElement>(
					'[data-campaign-overview-left-panel="true"]'
				);
				if (leftPanel) {
					ro = new ResizeObserver(() => schedule());
					ro.observe(leftPanel);
				}
			}
		} catch {
			// ignore
		}
		return () => {
			if (raf != null) window.cancelAnimationFrame(raf);
			window.removeEventListener('resize', schedule);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				compute as EventListener
			);
			ro?.disconnect();
		};
	}, [getEffectiveCampaignZoom, shouldDockOverviewContacts]);
	const isCampaignWorkspaceCompact =
		!isCampaignWorkspaceExpanded &&
		!isMobile &&
		!isNarrowDesktop &&
		!isNarrowestDesktop &&
		(view === 'testing' || view === 'drafting' || view === 'inbox');
	const activeInboxMainPanelWidthPx = isCampaignWorkspaceCompact
		? 501
		: inboxMainPanelWidthPx;
	const activeInboxMainPanelHeightPx = isCampaignWorkspaceCompact
		? 703
		: inboxMainPanelHeightPx;
	const inboxWideTopMarginPx = 24;
	const inboxWideBottomPanelMarginTopPx = 114 + extraBottomGapPx;
	const sharedWideTabZoomEnvelopeBottomPx =
		inboxWideTopMarginPx +
		activeInboxMainPanelHeightPx +
		inboxWideBottomPanelMarginTopPx +
		bottomPanelBoxHeightPx;
	const sharedBottomPanelSlotTopPx =
		sharedWideTabZoomEnvelopeBottomPx - bottomPanelBoxHeightPx;
	const writeDraftBottomBarSlotTopPx =
		sharedBottomPanelSlotTopPx - writeDraftBottomBarHeightPx - writeDraftBottomBarGapPx;
	// Match the back-card offset so the stack keeps a 32px gap from the left panel.
	const compactDraftReviewStackShiftXPx = 18;
	// Keeps the inbox box 36px to the right of the standard left column anchor.
	const inboxMainPanelShiftRightPx = 185.5;
	const activeInboxMainPanelShiftRightPx = isCampaignWorkspaceCompact
		? 0
		: inboxMainPanelShiftRightPx;
	const standardSidePanelTopOffsetPx = 15;
	const standardSidePanelGapPx = 16;
	const campaignHeaderBoxHeightPx = 59;
	const standardResearchPanelHeightPx =
		campaignHeaderBoxHeightPx + standardSidePanelGapPx + mainContactsPanelHeightPx;
	const isStandardSidePanelView =
		view === 'testing' || view === 'drafting' || view === 'sent';

	// --- Pinned left panel (ContactsExpandedList <-> MiniEmailStructure) ---
	// We intentionally render the correct panel immediately (no height-morph animation),
	// because the panel heights are now kept in sync across tabs.
	type PinnedLeftPanelVariant = 'contacts' | 'mini';
	const pinnedLeftPanelVariant: PinnedLeftPanelVariant = useMemo(() => {
		// 'contacts' here refers to the *variant* of the pinned left column
		// (the ContactsExpandedList shown on the Write tab) — not to a Contacts view.
		if (view === 'testing' || view === 'search' || view === 'drafting') return 'contacts';
		return 'mini';
	}, [view]);

	// Mirror the exact render conditions for the absolute pinned left column and for this shell.
	const shouldRenderAbsolutePinnedLeftColumn =
		!isMobile &&
		!hideHeaderBox &&
		['testing', 'drafting', 'sent', 'search', 'inbox'].includes(view) &&
		!(view === 'testing' && isNarrowDesktop) &&
		!(view === 'drafting' && isNarrowDesktop) &&
		!(view === 'sent' && isNarrowDesktop) &&
		!(view === 'search' && isSearchTabNarrow) &&
		!(view === 'inbox' && (isInboxTabStacked || isNarrowDesktop));
	const sharedBottomPanelKinds = useMemo<CampaignBottomPanelKind[]>(() => {
		switch (view) {
			case 'testing':
				return ['drafts', 'sent', 'inbox'];
			case 'drafting':
				return ['contacts', 'sent', 'inbox'];
			case 'sent':
				return ['contacts', 'drafts', 'inbox'];
			case 'inbox':
				return ['contacts', 'drafts', 'sent'];
			default:
				return [];
		}
	}, [view]);
	const shouldRenderWriteBottomDraftBar =
		contentView === 'testing' && !isMobile && !hideHeaderBox && !isNarrowestDesktop;
	const shouldRenderDraftsBottomSendBar =
		contentView === 'drafting' && !isMobile && !hideHeaderBox && !isNarrowestDesktop;
	const shouldRenderSharedBottomPanels =
		sharedBottomPanelKinds.length > 0 &&
		!isMobile &&
		!hideHeaderBox &&
		!isNarrowestDesktop;
	const shouldReserveSharedWideTabZoomEnvelope =
		!isMobile &&
		!hideHeaderBox &&
		!isNarrowestDesktop &&
		!shouldRenderSharedBottomPanels &&
		!shouldRenderWriteBottomDraftBar &&
		!isInboxTabStacked;

	// Hide the bulk send-bar only when it would actually collide with the per-draft action
	// row. The bar is absolute (out of flow) and is hidden via `visibility` (kept mounted),
	// so neither hiding it nor measuring it perturbs the action row's geometry — the overlap
	// computation is stable and won't oscillate at the threshold.
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!isDraftPreviewOpen || !shouldRenderDraftsBottomSendBar) {
			setIsDraftReviewOverlappingSendBar(false);
			return;
		}
		const SAFETY_PX = 8;
		let raf = 0;
		let ro: ResizeObserver | null = null;
		let observedRow: Element | null = null;

		const measure = () => {
			const bar = draftsSendBarWrapperRef.current;
			const row = document.querySelector('[data-draft-review-action-row]');
			if (!bar || !row) {
				setIsDraftReviewOverlappingSendBar(false);
			} else {
				const barRect = bar.getBoundingClientRect();
				const rowRect = row.getBoundingClientRect();
				// Both elements live under the same root zoom/scale, so their viewport rects
				// are directly comparable. They overlap once the row's bottom reaches the bar.
				setIsDraftReviewOverlappingSendBar(rowRect.bottom + SAFETY_PX > barRect.top);
			}
			// (Re)observe the live action row and its parent so a taller draft or regen
			// streaming (which grows the preview card above the row) re-triggers a measure.
			if (row !== observedRow) {
				ro?.disconnect();
				observedRow = row;
				if (ro && row) {
					ro.observe(row);
					if (row.parentElement) ro.observe(row.parentElement);
				}
			}
		};

		const schedule = () => {
			if (raf) window.cancelAnimationFrame(raf);
			raf = window.requestAnimationFrame(measure);
		};

		ro = new ResizeObserver(schedule);
		schedule();
		window.addEventListener('resize', schedule);
		window.addEventListener('murmur:campaign-zoom-changed', schedule as EventListener);
		return () => {
			if (raf) window.cancelAnimationFrame(raf);
			ro?.disconnect();
			ro = null;
			window.removeEventListener('resize', schedule);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				schedule as EventListener
			);
		};
	}, [
		isDraftPreviewOpen,
		shouldRenderDraftsBottomSendBar,
		selectedDraft?.id,
		isSelectedDraftRegenSettingsPreviewOpen,
	]);

	const clampedPromptScore =
		typeof promptQualityScore === 'number'
			? Math.max(70, Math.min(98, Math.round(promptQualityScore)))
			: null;

	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	const suggestionText1 = promptSuggestions?.[0] || '';
	const suggestionText2 = promptSuggestions?.[1] || '';
	const suggestionText3 = promptSuggestions?.[2] || '';

	// Show the suggestions box only when:
	// - Custom Instructions is open, AND
	// - the user is hovering the HybridPromptInput area.
	const [isPromptInputHovered, setIsPromptInputHovered] = useState(false);
	const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(false);
	const [isSuggestionBoxHovered, setIsSuggestionBoxHovered] = useState(false);
	const suggestionHoverLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearSuggestionHoverLeaveTimeout = useCallback(() => {
		if (!suggestionHoverLeaveTimeoutRef.current) return;
		clearTimeout(suggestionHoverLeaveTimeoutRef.current);
		suggestionHoverLeaveTimeoutRef.current = null;
	}, []);

	// Small delay prevents the Suggestions box from disappearing while moving the mouse
	// across the gap between the Writing box and the Suggestions box.
	const handlePromptInputHoverChange = useCallback(
		(isHovered: boolean) => {
			clearSuggestionHoverLeaveTimeout();
			if (isHovered) {
				setIsPromptInputHovered(true);
				return;
			}
			suggestionHoverLeaveTimeoutRef.current = setTimeout(() => {
				setIsPromptInputHovered(false);
			}, 900);
		},
		[clearSuggestionHoverLeaveTimeout]
	);

	useEffect(() => {
		return () => clearSuggestionHoverLeaveTimeout();
	}, [clearSuggestionHoverLeaveTimeout]);

	const handleGetSuggestions = useCallback(
		async (text: string) => {
			const blocks = form.getValues('hybridBlockPrompts');
			const isManualMode =
				blocks &&
				blocks.length > 0 &&
				blocks.every((b: { type: string }) => b.type === 'text');

			if (isManualMode) {
				await critiqueManualEmailText(text);
			} else {
				await scoreFullAutomatedPrompt(text);
			}
		},
		[form, critiqueManualEmailText, scoreFullAutomatedPrompt]
	);

	const promptScoreDisplayLabel =
		clampedPromptScore == null
			? ''
			: `${clampedPromptScore} - ${
					promptQualityLabel ||
					(clampedPromptScore >= 97
						? 'Exceptional'
						: clampedPromptScore >= 91
							? 'Excellent'
							: clampedPromptScore >= 83
								? 'Great'
								: clampedPromptScore >= 75
									? 'Good'
									: 'Keep Going')
				}`;

	const [contactsTabSelectedIds, setContactsTabSelectedIds] = useState<Set<number>>(
		new Set()
	);
	// Ref for the draft button container to detect outside clicks
	const draftButtonContainerRef = useRef<HTMLDivElement>(null);

	const [searchTabSelectedContacts, setSearchTabSelectedContacts] = useState<number[]>(
		[]
	);

	const [searchActiveSection, setSearchActiveSection] = useState<
		'why' | 'what' | 'where' | null
	>(null);
	const [searchWhyValue, setSearchWhyValue] = useState('[Booking]');
	const [searchWhatValue, setSearchWhatValue] = useState('');
	const [searchWhereValue, setSearchWhereValue] = useState('');
	const [userLocationName] = useState<string | null>(null);
	const [isLoadingLocation] = useState(false);
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const searchActiveSectionIndicatorRef = useRef<HTMLDivElement | null>(null);
	const prevSearchActiveSectionForIndicatorRef = useRef<'why' | 'what' | 'where' | null>(
		null
	);

	const debouncedWhereValue = useDebounce(searchWhereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state'
	);
	const isPromotion = searchWhyValue === '[Promotion]';

	useEffect(() => {
		if (contacts?.[0]?.state && !searchWhereValue) {
			setSearchWhereValue(contacts[0].state);
		}
	}, [contacts, searchWhereValue]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				!target.closest('.campaign-search-dropdown-menu') &&
				!target.closest('.campaign-mini-search-section-why') &&
				!target.closest('.campaign-mini-search-section-what') &&
				!target.closest('.campaign-mini-search-section-where')
			) {
				setSearchActiveSection(null);
			}
		};

		if (searchActiveSection) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [searchActiveSection]);

	useEffect(() => {
		if (searchActiveSection === 'what' && whatInputRef.current) {
			whatInputRef.current.focus();
		} else if (searchActiveSection === 'where' && whereInputRef.current) {
			whereInputRef.current.focus();
		}
	}, [searchActiveSection]);

	// Animate the active section "pill" sliding between tabs (Why/What/Where) – match dashboard behavior
	useEffect(() => {
		const indicator = searchActiveSectionIndicatorRef.current;
		if (!indicator) return;

		// Prevent overlapping tweens when the user clicks quickly
		gsap.killTweensOf(indicator);

		const xPercentForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
				default:
					return 0;
			}
		};

		const transformOriginForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 'left center';
				case 'where':
					return 'right center';
				case 'what':
				default:
					return 'center center';
			}
		};

		// Hide when no active section
		if (!searchActiveSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			prevSearchActiveSectionForIndicatorRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(searchActiveSection);
		const prevSection = prevSearchActiveSectionForIndicatorRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		// so it feels consistent with the tab switching motion.
		if (!prevSection) {
			const origin = transformOriginForSection(searchActiveSection);

			// Start as a full-width highlight (scaleX: 3 because the indicator is 1/3 width),
			// then shrink toward the selected segment's side/center.
			gsap.set(indicator, {
				xPercent: nextXPercent,
				opacity: 1,
				scaleX: 3,
				transformOrigin: origin,
			});
			gsap.to(indicator, {
				scaleX: 1,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevSearchActiveSectionForIndicatorRef.current = searchActiveSection;
			return;
		}

		// Between tabs, slide with requested timing/ease (width/height remain constant)
		gsap.to(indicator, {
			xPercent: nextXPercent,
			duration: 0.6,
			ease: 'power2.out',
			overwrite: 'auto',
		});
		gsap.to(indicator, {
			opacity: 1,
			duration: 0.15,
			ease: 'power2.out',
			overwrite: 'auto',
		});

		prevSearchActiveSectionForIndicatorRef.current = searchActiveSection;
	}, [searchActiveSection]);

	// Search tab type and state
	type SearchTab = {
		id: string;
		label: string;
		query: string;
		what: string;
		selectedContacts: number[];
		/** Contacts added via map interactions that aren't part of the base search results list. */
		extraContacts: ContactWithName[];
	};
	const [searchTabs, setSearchTabs] = useState<SearchTab[]>([]);
	const [activeSearchTabId, setActiveSearchTabId] = useState<string | null>(null);

	// Get active tab data
	const activeSearchTab = searchTabs.find((tab) => tab.id === activeSearchTabId);
	const hasCampaignSearched = activeSearchTabId !== null;
	const activeCampaignSearchQuery = activeSearchTab?.query || '';
	const searchResultsSelectedContacts = activeSearchTab?.selectedContacts || [];

	// Setter for selected contacts that updates the active tab
	const setSearchResultsSelectedContacts = (
		contacts: number[] | ((prev: number[]) => number[])
	) => {
		if (!activeSearchTabId) return;
		setSearchTabs((tabs) =>
			tabs.map((tab) =>
				tab.id === activeSearchTabId
					? {
							...tab,
							selectedContacts:
								typeof contacts === 'function'
									? contacts(tab.selectedContacts)
									: contacts,
						}
					: tab
			)
		);
	};

	// Construct the search query from Why/What/Where values
	const buildSearchQuery = () => {
		const parts: string[] = [];
		if (searchWhatValue) parts.push(searchWhatValue);
		if (searchWhereValue) parts.push(searchWhereValue);
		return parts.join(' ');
	};

	// Use useGetContacts for in-campaign search (separate from campaign contacts)
	const {
		data: searchResults,
		isLoading: isLoadingSearchResults,
		isRefetching: isRefetchingSearchResults,
	} = useGetContacts({
		filters: {
			query: activeCampaignSearchQuery,
			verificationStatus:
				process.env.NODE_ENV === 'production' ? EmailVerificationStatus.valid : undefined,
			useVectorSearch: true,
			limit: 500,
		},
		enabled:
			hasCampaignSearched &&
			!!activeCampaignSearchQuery &&
			activeCampaignSearchQuery.trim().length > 0,
	});

	const isSearching = isLoadingSearchResults || isRefetchingSearchResults;

	// Campaign Search Results panel needs to include contacts that come from map-only overlay markers
	// (e.g. Booking extra pins). Those contacts are not part of `searchResults`, so we keep a per-tab
	// `extraContacts` list and render a merged list in the panel.
	const baseSearchResultsIdSet = useMemo(
		() => new Set<number>((searchResults ?? []).map((c) => c.id)),
		[searchResults]
	);

	const searchResultsForPanel = useMemo(() => {
		const base = searchResults ?? [];
		const extras = activeSearchTab?.extraContacts ?? [];
		if (extras.length === 0) return base;
		const dedupedExtras: ContactWithName[] = [];
		for (const c of extras) {
			if (!baseSearchResultsIdSet.has(c.id)) dedupedExtras.push(c);
		}
		// Show map-added contacts first so the user immediately sees them in the list.
		return [...dedupedExtras, ...base];
	}, [searchResults, activeSearchTab, baseSearchResultsIdSet]);

	const searchResultsForPanelIds = useMemo(
		() => searchResultsForPanel.map((c) => c.id),
		[searchResultsForPanel]
	);

	const searchResultsSelectedIdSet = useMemo(
		() => new Set<number>(searchResultsSelectedContacts),
		[searchResultsSelectedContacts]
	);

	const selectedSearchResultsCount = useMemo(() => {
		let count = 0;
		for (const id of searchResultsForPanelIds) {
			if (searchResultsSelectedIdSet.has(id)) count += 1;
		}
		return count;
	}, [searchResultsForPanelIds, searchResultsSelectedIdSet]);

	const areAllSearchResultsSelected = useMemo(() => {
		if (searchResultsForPanelIds.length === 0) return false;
		for (const id of searchResultsForPanelIds) {
			if (!searchResultsSelectedIdSet.has(id)) return false;
		}
		return true;
	}, [searchResultsForPanelIds, searchResultsSelectedIdSet]);

	const addContactToActiveSearchTabResults = useCallback(
		(contact: ContactWithName) => {
			if (!activeSearchTabId) return;
			setSearchTabs((tabs) =>
				tabs.map((tab) => {
					if (tab.id !== activeSearchTabId) return tab;
					const extras = tab.extraContacts ?? [];
					if (extras.some((c) => c.id === contact.id)) return tab;
					// Prepend so the newly selected contact is visible immediately.
					return { ...tab, extraContacts: [contact, ...extras] };
				})
			);
		},
		[activeSearchTabId]
	);

	// Hook for adding contacts to the campaign's user contact list
	const { mutateAsync: editUserContactList, isPending: isAddingToCampaign } =
		useEditUserContactList({
			suppressToasts: true,
		});

	// Handler for triggering search - creates or updates a tab
	const handleCampaignSearch = () => {
		const query = buildSearchQuery();
		if (!query.trim()) {
			toast.error('Please enter what you want to search for');
			return;
		}

		// Build a label for the tab (e.g., "MS - Music Venues")
		const labelParts: string[] = [];
		if (searchWhereValue) {
			// Extract state abbreviation if it's a full state name or use the value directly
			const stateAbbrev =
				searchWhereValue.length === 2
					? searchWhereValue.toUpperCase()
					: searchWhereValue.split(',')[0]?.trim() || searchWhereValue;
			labelParts.push(stateAbbrev);
		}
		if (searchWhatValue) {
			labelParts.push(searchWhatValue);
		}
		const label = labelParts.join(' - ') || query;

		// If we're on an empty search tab (no query yet), update it instead of creating new
		if (activeSearchTab && !activeSearchTab.query) {
			setSearchTabs((tabs) =>
				tabs.map((tab) =>
					tab.id === activeSearchTabId
						? { ...tab, label, query, what: searchWhatValue }
						: tab
				)
			);
		} else {
			// Create a new tab
			const newTab: SearchTab = {
				id: `search-${Date.now()}`,
				label,
				query,
				what: searchWhatValue,
				selectedContacts: [],
				extraContacts: [],
			};
			setSearchTabs((tabs) => [...tabs, newTab]);
			setActiveSearchTabId(newTab.id);
		}
		setSearchActiveSection(null);
	};

	// Handler for triggering search from the mini searchbar in the contacts panel
	const handleMiniContactsSearch = ({
		why,
		what,
		where,
	}: {
		why: string;
		what: string;
		where: string;
	}) => {
		const trimmedWhy = (why ?? '').trim();
		const trimmedWhat = (what ?? '').trim();
		const trimmedWhere = (where ?? '').trim();

		const dashboardUrl = campaign?.id
			? `${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}`
			: urls.murmur.dashboard.index;

		// Empty mini searches should behave like the campaign Search button: open the
		// campaign-scoped For You map, already disengaged to all contacts.
		if (!trimmedWhat && !trimmedWhere) {
			try {
				if (typeof window !== 'undefined') {
					sessionStorage.removeItem(PENDING_SEARCH_STORAGE_KEY);
				}
			} catch {
				// Ignore sessionStorage errors (e.g., disabled storage)
			}
			router.push(
				`${dashboardUrl}${dashboardUrl.includes('?') ? '&' : '?'}pick=1&allContacts=1`
			);
			return;
		}

		let searchQuery = '';
		if (trimmedWhy) {
			searchQuery += `${trimmedWhy} `;
		}
		if (trimmedWhat) {
			searchQuery += trimmedWhat;
		}
		if (trimmedWhere) {
			searchQuery += ` in ${trimmedWhere}`;
		}
		searchQuery = searchQuery.trim();

		if (searchQuery) {
			try {
				if (typeof window !== 'undefined') {
					sessionStorage.setItem(
						PENDING_SEARCH_STORAGE_KEY,
						JSON.stringify({
							v: 1,
							query: searchQuery,
							fromCampaignId: campaign?.id != null ? String(campaign.id) : null,
						})
					);
				}
			} catch {
				// Ignore sessionStorage errors (e.g., disabled storage)
			}
		}

		router.push(dashboardUrl);
	};

	// Handler for adding selected search results to campaign. Selection lives on the
	// active tab when one exists, else on the null-tab state (mobile For You / campaign
	// contacts) — desktop call sites only render with an active tab, so they're unchanged.
	const handleAddSearchResultsToCampaign = async () => {
		const selectedIds =
			activeSearchTabId !== null
				? searchResultsSelectedContacts
				: searchTabSelectedContacts;
		if (selectedIds.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		const userContactListId = campaign?.userContactLists?.[0]?.id;
		if (!userContactListId) {
			toast.error('Campaign has no contact list');
			return;
		}

		try {
			await editUserContactList({
				id: userContactListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: selectedIds,
					},
				},
			});

			const addedCount = selectedIds.length;

			// Clear selection
			if (activeSearchTabId !== null) {
				setSearchResultsSelectedContacts([]);
			} else {
				setSearchTabSelectedContacts([]);
			}

			// Invalidate queries to refresh the campaign data and contacts
			queryClient.invalidateQueries({
				queryKey: ['campaigns', 'detail', campaign?.id?.toString()],
			});
			queryClient.invalidateQueries({
				queryKey: ['contacts'],
			});
			queryClient.invalidateQueries({
				queryKey: ['userContactLists'],
			});

			toast.success(
				`${addedCount} contact${addedCount > 1 ? 's' : ''} added to campaign!`
			);

			// Mobile: adding from the Search view lands on the Summary view, where the
			// new contacts appear in the list.
			if (isMobile === true) {
				goToSummary?.();
			}
		} catch (error) {
			console.error('Error adding contacts to campaign:', error);
			toast.error('Failed to add contacts to campaign');
		}
	};

	const handleCloseSearchTab = (tabId: string) => {
		setSearchTabs((tabs) => tabs.filter((tab) => tab.id !== tabId));
		if (activeSearchTabId === tabId) {
			setActiveSearchTabId(null);
		}
	};

	const [draftStatusFilter, setDraftStatusFilter] = useState<
		'all' | 'approved' | 'rejected'
	>('all');
	const [draftSelectionsByFilter, setDraftSelectionsByFilter] = useState<{
		all: Set<number>;
		approved: Set<number>;
		rejected: Set<number>;
	}>({
		all: new Set<number>(),
		approved: new Set<number>(),
		rejected: new Set<number>(),
	});
	const draftsTabSelectedIds = draftSelectionsByFilter[draftStatusFilter];
	const setDraftsTabSelectedIds = (
		value: Set<number> | ((prev: Set<number>) => Set<number>)
	) => {
		setDraftSelectionsByFilter((prev) => {
			const current = prev[draftStatusFilter];
			const nextSet = typeof value === 'function' ? value(current) : value;
			return { ...prev, [draftStatusFilter]: nextSet };
		});
	};
	const [, setIsDraftDialogOpen] = useState(false);
	const handleDraftSelection = (draftId: number) => {
		setDraftsTabSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(draftId)) {
				next.delete(draftId);
			} else {
				next.add(draftId);
			}
			return next;
		});
	};

	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: headerContacts } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0,
	});
	const { data: headerEmails, isPending: isPendingEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
	});

	const contactsCount = headerContacts?.length || 0;
	const draftEmails = (headerEmails || []).filter((e) => e.status === EmailStatus.draft);
	const draftCount = draftEmails.length;
	// Drafts belonging to the batch the user just drafted from the Write tab (empty otherwise).
	const batchDrafts = useMemo(
		() => draftEmails.filter((d) => writeReviewBatchContactIds.has(d.contactId)),
		[draftEmails, writeReviewBatchContactIds]
	);
	// The draft list the drafts layout renders: scoped to the just-drafted batch during the
	// Write-tab review, the full set on the real Drafts tab. (`draftCount` stays the campaign
	// total — it feeds the header summary, not the review.)
	const draftEmailsForView = isWriteReviewActive ? batchDrafts : draftEmails;

	const {
		handleRejectDraft,
		handleApproveDraft,
		handleRegenerateDraft,
		handleSendDrafts,
	} = useDraftReviewHandlers({
		campaign,
		form,
		contacts: contacts ?? [],
		draftEmails,
		selectedSendIds: draftsTabSelectedIds,
		clearSelectedSendIds: () => setDraftsTabSelectedIds(new Set()),
	});
	const sentEmails = (headerEmails || []).filter((e) => e.status === EmailStatus.sent);
	const sentCount = sentEmails.length;

	// Campaign-global "actively sending" session (driven by the send loops). While
	// visible, the left expanded panel swaps to the sending list and — on the search
	// tab — the floating sending overlay renders over the map instead.
	const sendingSession = useSendingSessionState();
	const isSendingUiVisible =
		(sendingSession.status === 'sending' || sendingSession.status === 'done') &&
		!sendingSession.dismissed;
	const showSearchSendingOverlay =
		view === 'search' &&
		!isMobile &&
		!isSearchTabNarrow &&
		renderGlobalOverlays &&
		isSendingUiVisible;

	// A truly empty campaign inbox (no replies AND nothing sent) bounces to Write so
	// the user can get messages out first. Mid-send the counts are transiently 0 —
	// don't bounce out with a wrong toast.
	const handleCampaignInboxEmpty = useCallback(() => {
		if (sendingSession.status !== 'idle') return;
		toast('Send out messages first — replies will show up here.', {
			id: 'campaign-empty-tab-redirect',
		});
		goToWriting?.();
	}, [sendingSession.status, goToWriting]);

	// Drafts review stays open whenever at least one (batch-scoped) draft exists.
	useEffect(() => {
		if (contentView !== 'drafting') return;

		if (selectedDraft) {
			const selectedDraftStillExists = draftEmailsForView.some(
				(draft) => draft.id === selectedDraft.id
			);
			if (selectedDraftStillExists) {
				return;
			}
			if (draftEmailsForView.length === 0 && isPendingEmails) return;

			const fallbackDraft = draftEmailsForView[0] ?? null;
			setSelectedDraft(fallbackDraft);
			return;
		}

		const firstDraft = draftEmailsForView[0];
		if (!firstDraft) return;

		setSelectedDraft(firstDraft);
	}, [draftEmailsForView, isPendingEmails, selectedDraft, contentView]);

	// While a send session runs, keep the draft review stack on the actively
	// sending draft so the front card advances one-to-the-next per send. Sent
	// drafts leave draftEmailsForView via the per-send invalidation, and the
	// fallback effect above restores normal selection once the batch finishes.
	useEffect(() => {
		if (contentView !== 'drafting') return;
		if (sendingSession.status !== 'sending' || sendingSession.dismissed) return;
		const activeEmailId =
			sendingSession.queue[sendingSession.activeIndex]?.emailId ?? null;
		if (activeEmailId == null) return;
		const activeDraft = draftEmailsForView.find((d) => d.id === activeEmailId);
		if (activeDraft && selectedDraft?.id !== activeDraft.id) {
			setSelectedDraft(activeDraft);
		}
	}, [
		contentView,
		sendingSession.status,
		sendingSession.dismissed,
		sendingSession.activeIndex,
		sendingSession.queue,
		draftEmailsForView,
		selectedDraft,
	]);

	// If we just "Kept" a test draft, auto-open its draft in the Drafts tab once it exists.
	useEffect(() => {
		if (contentView !== 'drafting') return;
		if (!pendingKeptDraftContactId) return;
		const kept = draftEmails.find((e) => e.contactId === pendingKeptDraftContactId);
		if (!kept) return;
		setSelectedDraft(kept);
		setPendingKeptDraftContactId(null);
	}, [draftEmails, pendingKeptDraftContactId, contentView]);

	// When batch drafting is in progress (or still animating queued drafts), swap the campaign
	// research panel slot to a live "Draft Preview" so users can watch drafts type out from any tab.
	const isBatchDraftingInProgress = isLivePreviewVisible;

	// Hold the Write tab on the prompt box (`HybridPromptInput`) until the live-preview animation
	// has fully typed out the batch, then flip to the drafts review (`writeReviewPreviewComplete`).
	// `wasBatchDraftingRef` records that an animation ran for the currently-armed batch so we can
	// detect its falling edge — i.e. the moment the last message finished typing (which the hook
	// only triggers after the final character is committed, so it never cuts off early).
	const wasBatchDraftingRef = useRef(false);
	useEffect(() => {
		// No batch armed → reset for the next Draft click.
		if (writeReviewBatchContactIds.size === 0) {
			wasBatchDraftingRef.current = false;
			setWriteReviewPreviewComplete(false);
			return;
		}
		// Live preview is actively typing this batch → keep showing the prompt box.
		if (isBatchDraftingInProgress) {
			wasBatchDraftingRef.current = true;
			setWriteReviewPreviewComplete(false);
			return;
		}
		// Live preview just finished typing the last message → reveal the drafts review.
		if (wasBatchDraftingRef.current) {
			setWriteReviewPreviewComplete(true);
			return;
		}
		// Handwritten / non-streaming path never animates: reveal once generation settles
		// with at least one batch draft persisted.
		if (!isPendingGeneration && batchDrafts.length > 0) {
			setWriteReviewPreviewComplete(true);
		}
	}, [
		writeReviewBatchContactIds.size,
		isBatchDraftingInProgress,
		isPendingGeneration,
		batchDrafts.length,
	]);

	// Leave the transient Write-tab batch review once the batch is fully sent/deleted. A latch
	// (`writeReviewSawDraftsRef`) prevents exiting during the gap between clicking Draft and the
	// first generated draft landing in the cache; we also wait out any in-flight generation.
	const writeReviewSawDraftsRef = useRef(false);
	useEffect(() => {
		if (writeReviewBatchContactIds.size === 0) {
			writeReviewSawDraftsRef.current = false;
			return;
		}
		if (batchDrafts.length > 0) {
			writeReviewSawDraftsRef.current = true;
			return;
		}
		// Batch is armed but currently shows no drafts: keep waiting while generation is in
		// flight, or until at least one batch draft has appeared, before clearing.
		if (isBatchDraftingInProgress || isPendingGeneration) return;
		if (!writeReviewSawDraftsRef.current) return;
		clearWriteReviewBatch();
	}, [
		writeReviewBatchContactIds,
		batchDrafts,
		isBatchDraftingInProgress,
		isPendingGeneration,
		clearWriteReviewBatch,
	]);
	const draftPreviewFallbackDraft = useMemo(() => {
		const first = draftEmails[0];
		if (!first) return null;
		return {
			contactId: first.contactId,
			subject: first.subject,
			message: first.message,
		};
	}, [draftEmails]);
	const liveDraftPreview = useMemo(
		() => ({
			visible: isBatchDraftingInProgress,
			contactId: livePreviewContactId ?? null,
			subject: livePreviewSubject,
			message: livePreviewMessage,
		}),
		[
			isBatchDraftingInProgress,
			livePreviewContactId,
			livePreviewSubject,
			livePreviewMessage,
		]
	);

	const rejectedDraftIds = useMemo(() => {
		const ids = new Set<number>();
		draftEmails.forEach((email) => {
			if (email.reviewStatus === ReviewStatus.rejected) {
				ids.add(email.id);
			}
		});
		return ids;
	}, [draftEmails]);

	const approvedDraftIds = useMemo(() => {
		const ids = new Set<number>();
		draftEmails.forEach((email) => {
			if (email.reviewStatus === ReviewStatus.approved) {
				ids.add(email.id);
			}
		});
		return ids;
	}, [draftEmails]);

	const contactedContactIds = useMemo(() => {
		const ids = new Set<number>();
		for (const email of draftEmails) ids.add(email.contactId);
		for (const email of sentEmails) ids.add(email.contactId);
		return ids;
	}, [draftEmails, sentEmails]);
	const contactsAvailableForDrafting = (contacts || []).filter(
		(contact) => !contactedContactIds.has(contact.id)
	);

	// --- Write tab visual pacing (UI-only) ---
	// Backend draft rows can be created faster than the Draft Preview panel "types" them out.
	// For visual alignment, keep newly-drafted contacts visible in the Contacts list until the
	// live preview advances past them. This does NOT affect the actual drafting backend logic.
	const shouldPaceContactsList = contentView === 'testing';
	const [visualContactedBaselineIds, setVisualContactedBaselineIds] = useState<
		Set<number>
	>(() => new Set(contactedContactIds));
	const [visualContactedCompletedIds, setVisualContactedCompletedIds] = useState<
		Set<number>
	>(() => new Set());
	const wasLivePreviewVisibleRef = useRef(false);
	const lastLivePreviewContactIdRef = useRef<number | null>(null);

	useEffect(() => {
		const wasLive = wasLivePreviewVisibleRef.current;

		// `contactedContactIds` is a fresh Set on every render (its source arrays
		// come from .filter() calls), so blindly assigning `new Set(...)` here
		// would trigger an infinite render loop. Only update when the contents
		// actually differ.
		const syncBaselineToContacted = () => {
			setVisualContactedBaselineIds((prev) => {
				if (
					prev.size === contactedContactIds.size &&
					[...contactedContactIds].every((id) => prev.has(id))
				) {
					return prev;
				}
				return new Set(contactedContactIds);
			});
		};

		if (isLivePreviewVisible && !wasLive) {
			// Batch started: snapshot "already contacted" contacts so we only pace *new* drafts.
			syncBaselineToContacted();
			setVisualContactedCompletedIds((prev) => (prev.size === 0 ? prev : new Set()));
			lastLivePreviewContactIdRef.current = null;
		} else if (!isLivePreviewVisible && wasLive) {
			// Batch ended/hidden: snap baseline to reality so the list reflects actual state.
			syncBaselineToContacted();
			setVisualContactedCompletedIds((prev) => (prev.size === 0 ? prev : new Set()));
			lastLivePreviewContactIdRef.current = null;
		} else if (!isLivePreviewVisible) {
			// When no live preview playback is active, keep baseline synced with actual data.
			syncBaselineToContacted();
		}

		wasLivePreviewVisibleRef.current = isLivePreviewVisible;
	}, [contactedContactIds, isLivePreviewVisible]);

	useEffect(() => {
		if (!isLivePreviewVisible) return;

		const currentId = livePreviewContactId ?? null;
		const prevId = lastLivePreviewContactIdRef.current;

		// When the preview advances to the next contact, mark the previous one as "completed"
		// so it can visually leave the Contacts list.
		if (prevId && currentId && prevId !== currentId) {
			setVisualContactedCompletedIds((prev) => {
				if (prev.has(prevId)) return prev;
				const next = new Set(prev);
				next.add(prevId);
				return next;
			});
		}

		lastLivePreviewContactIdRef.current = currentId;
	}, [isLivePreviewVisible, livePreviewContactId]);

	const visualContactedContactIds = useMemo(() => {
		if (!shouldPaceContactsList) return contactedContactIds;
		if (!isLivePreviewVisible) return contactedContactIds;

		const ids = new Set<number>(visualContactedBaselineIds);
		for (const id of visualContactedCompletedIds) ids.add(id);
		return ids;
	}, [
		contactedContactIds,
		isLivePreviewVisible,
		shouldPaceContactsList,
		visualContactedBaselineIds,
		visualContactedCompletedIds,
	]);

	const contactsForContactsExpandedList = useMemo(() => {
		if (!shouldPaceContactsList) return contactsAvailableForDrafting;
		return (contacts || []).filter((c) => !visualContactedContactIds.has(c.id));
	}, [
		contacts,
		contactsAvailableForDrafting,
		shouldPaceContactsList,
		visualContactedContactIds,
	]);

	const activelyDraftingContactIdsForContactsExpandedList = useMemo(() => {
		if (!shouldPaceContactsList) return activelyDraftingContactIds;
		// While a newly-drafted contact remains visible for pacing, keep it non-selectable.
		const ids = new Set<number>(activelyDraftingContactIds);
		for (const id of contactedContactIds) ids.add(id);
		return ids;
	}, [activelyDraftingContactIds, contactedContactIds, shouldPaceContactsList]);

	// Fetch inbound emails for history panel
	const { data: inboundEmails } = useGetInboundEmails({
		filters: { campaignId: campaign?.id },
		enabled: Boolean(campaign?.id),
	});
	const inboxCount = inboundEmails?.length || 0;

	// Fetch campaign contact events for history panel
	const { data: campaignContactEvents } = useGetCampaignContactEvents(campaign?.id);

	// Compute history actions for the history panel
	const historyActions = useMemo<HistoryAction[]>(() => {
		const BATCH_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours

		const computeBatches = <T extends { timestamp: Date }>(
			items: T[],
			type: HistoryAction['type']
		): HistoryAction[] => {
			if (items.length === 0) return [];

			const sorted = [...items].sort(
				(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
			);
			const batches: HistoryAction[] = [];
			let currentCount = 1;
			let currentEndAt = sorted[0].timestamp;

			for (let i = 1; i < sorted.length; i++) {
				const prev = sorted[i - 1].timestamp;
				const curr = sorted[i].timestamp;
				const gap = curr.getTime() - prev.getTime();

				if (gap > BATCH_GAP_MS) {
					batches.push({
						id: `${type}-${currentEndAt.getTime()}`,
						type,
						count: currentCount,
						timestamp: currentEndAt,
					});
					currentCount = 1;
					currentEndAt = curr;
				} else {
					currentCount += 1;
					currentEndAt = curr;
				}
			}

			batches.push({
				id: `${type}-${currentEndAt.getTime()}`,
				type,
				count: currentCount,
				timestamp: currentEndAt,
			});

			return batches;
		};

		// Contacts batches from campaign contact events
		const contactsBatches = (campaignContactEvents || [])
			.map((e) => {
				const createdAt = new Date(e.createdAt);
				if (Number.isNaN(createdAt.getTime())) return null;
				return {
					id: `contacts-${createdAt.getTime()}`,
					type: 'contacts' as const,
					count: e.addedCount,
					timestamp: createdAt,
				};
			})
			.filter(Boolean) as HistoryAction[];

		// Drafts batches
		const draftItems = draftEmails
			.map((e) => {
				const createdAt = new Date(e.createdAt);
				if (Number.isNaN(createdAt.getTime())) return null;
				return { timestamp: createdAt };
			})
			.filter(Boolean) as { timestamp: Date }[];
		const draftsBatches = computeBatches(draftItems, 'drafts');

		// Sent batches
		const sentItems = sentEmails
			.map((e) => {
				const sentAt = e.sentAt ? new Date(e.sentAt) : null;
				if (!sentAt || Number.isNaN(sentAt.getTime())) return null;
				return { timestamp: sentAt };
			})
			.filter(Boolean) as { timestamp: Date }[];
		const sentBatches = computeBatches(sentItems, 'sent');

		// Received batches (inbound emails)
		const receivedItems = (inboundEmails || [])
			.map((e) => {
				const receivedAt = new Date(e.createdAt);
				if (Number.isNaN(receivedAt.getTime())) return null;
				return { timestamp: receivedAt };
			})
			.filter(Boolean) as { timestamp: Date }[];
		const receivedBatches = computeBatches(receivedItems, 'received');

		// Combine all batches and sort by timestamp (newest first)
		return [
			...contactsBatches,
			...draftsBatches,
			...sentBatches,
			...receivedBatches,
		].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}, [campaignContactEvents, draftEmails, sentEmails, inboundEmails]);

	const isSendingDisabled = isFreeTrial || (user?.sendingCredits || 0) === 0;

	const [selectedContactForResearch, setSelectedContactForResearch] =
		useState<ContactWithName | null>(null);
	const [hoveredContactForResearch, setHoveredContactForResearch] =
		useState<ContactWithName | null>(null);
	const [hasUserSelectedResearchContact, setHasUserSelectedResearchContact] =
		useState(false);
	// Row-aligned abridged research card left of the pinned list (Write/Drafts/Inbox).
	// Additive to the standard research panels — fully separate state.
	const [rowHoverResearchContact, setRowHoverResearchContact] =
		useState<ContactWithName | null>(null);
	const [rowHoverResearchTopPx, setRowHoverResearchTopPx] = useState(0);
	const [rowHoverResearchLeftPx, setRowHoverResearchLeftPx] = useState(
		ROW_HOVER_RESEARCH_DOCKED_LEFT_PX
	);
	const rowHoverResearchClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Search-view results panel + overview rail rows hover the same research card, but
	// those surfaces are clipped/scaled (overflow-hidden panels, the rail's fixed +
	// scale(0.95) wrapper), so the card is portaled to <body> as a fixed overlay and
	// positioned from each row's screen rect instead of an anchor.
	const [railHoverResearchContact, setRailHoverResearchContact] =
		useState<ContactWithName | null>(null);
	const [railHoverResearchPos, setRailHoverResearchPos] = useState<{
		topPx: number;
		leftPx: number;
		scale: number;
	} | null>(null);
	const railHoverResearchClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const railHoverResearchContactIdRef = useRef<number | null>(null);
	railHoverResearchContactIdRef.current = railHoverResearchContact?.id ?? null;
	// Event-chat rows hover the opportunity panel instead of contact research.
	// Shares the docked slot, position state and clear timer — one card at a time.
	const [rowHoverOpportunity, setRowHoverOpportunity] =
		useState<MyEventApplication | null>(null);
	const [showTestPreview, setShowTestPreview] = useState(false);
	const handleTestPreviewToggle = useCallback(
		(open: boolean) => {
			if (open && isCampaignWorkspaceCompact) {
				onRequestCampaignWorkspaceExpanded?.();
			}
			setShowTestPreview(open);
		},
		[isCampaignWorkspaceCompact, onRequestCampaignWorkspaceExpanded]
	);
	useEffect(() => {
		// On the Write tab the live draft preview now renders inline over the contacts
		// list in the compact half-screen view, so there's no need to expand the
		// workspace. Other tabs still expand to surface the preview on the right.
		if (
			renderGlobalOverlays &&
			isCampaignWorkspaceCompact &&
			isBatchDraftingInProgress &&
			view !== 'testing'
		) {
			onRequestCampaignWorkspaceExpanded?.();
		}
	}, [
		isBatchDraftingInProgress,
		isCampaignWorkspaceCompact,
		onRequestCampaignWorkspaceExpanded,
		renderGlobalOverlays,
		view,
	]);
	const inboxDeepLinkParams = useSearchParams();
	const [selectedInboxEmailId, setSelectedInboxEmailId] = useState<number | null>(() => {
		// Deep link (e.g. the dashboard opportunities panel): ?inboxEmailId=<id>
		// preselects that message's conversation when the inbox opens. Projected
		// venue messages use negative synthetic ids, so 0 is the only invalid value.
		const raw = inboxDeepLinkParams.get('inboxEmailId');
		if (raw == null) return null;
		const parsed = Number(raw);
		return Number.isInteger(parsed) && parsed !== 0 ? parsed : null;
	});
	const [optimisticInboxReplyByEmailId, setOptimisticInboxReplyByEmailId] = useState<
		Record<number, number>
	>({});
	const handleInboxEmailClick = useCallback(
		(email: { id: number; isSent?: boolean }) => {
			const tab = email.isSent ? 'sent' : 'inbox';
			setSelectedInboxEmailId(email.id);
			setLocalInboxSentTabRequest((prev) => ({
				tab,
				requestId:
					Math.max(prev?.requestId ?? 0, inboxSentTabRequest?.requestId ?? 0) + 1,
				preserveSelection: true,
			}));
		},
		[inboxSentTabRequest?.requestId]
	);
	const handleInboxThreadReplySent = useCallback(
		(messageIds: number[], sentAtMs: number) => {
			setOptimisticInboxReplyByEmailId((prev) => {
				const next = { ...prev };
				for (const id of messageIds) {
					next[id] = Math.max(next[id] ?? 0, sentAtMs);
				}
				return next;
			});
		},
		[]
	);

	// Mobile Summary view: which fullscreen overlay (chat / draft review) is open,
	// the header-pill scroll target, and this session's send/delete counters.
	const [mobileSummarySelection, setMobileSummarySelection] = useState<
		{ kind: 'conversation'; key: string } | { kind: 'draft'; id: number } | null
	>(null);
	const [mobileSummaryScrollRequest, setMobileSummaryScrollRequest] =
		useState<MobileSummaryScrollRequest | null>(null);
	const [mobileSessionSentCount, setMobileSessionSentCount] = useState(0);
	const [mobileSessionDeletedCount, setMobileSessionDeletedCount] = useState(0);
	const { mutateAsync: deleteDraftEmail } = useDeleteEmail();

	// Header pills (both mobile views) scroll to their Summary section instead of
	// switching tabs; from the Search view this navigates to the Summary first.
	const requestMobileSummarySection = useCallback(
		(section: MobileSummarySection) => {
			setMobileSummaryScrollRequest((prev) => ({
				section,
				requestId: (prev?.requestId ?? 0) + 1,
			}));
			if (view !== 'summary') goToSummary?.();
		},
		[view, goToSummary]
	);

	// Deep link from the dashboard mobile search header pills:
	// ?summarySection=drafts|contacts|conversations scrolls the Summary there on
	// arrival. Consumed once per param value; gated on renderGlobalOverlays so the
	// transient crossfade instance can't double-fire.
	const summarySectionParam = inboxDeepLinkParams.get('summarySection');
	const consumedSummarySectionRef = useRef<string | null>(null);
	useEffect(() => {
		if (isMobile !== true || !renderGlobalOverlays) return;
		if (!summarySectionParam) return;
		if (consumedSummarySectionRef.current === summarySectionParam) return;
		if (
			summarySectionParam !== 'drafts' &&
			summarySectionParam !== 'contacts' &&
			summarySectionParam !== 'conversations'
		) {
			return;
		}
		consumedSummarySectionRef.current = summarySectionParam;
		requestMobileSummarySection(summarySectionParam);
	}, [isMobile, renderGlobalOverlays, summarySectionParam, requestMobileSummarySection]);

	useEffect(() => {
		setSelectedInboxEmailId(null);
		setOptimisticInboxReplyByEmailId({});
		setMobileSummarySelection(null);
		setMobileSessionSentCount(0);
		setMobileSessionDeletedCount(0);
	}, [campaign?.id]);

	// Re-seed the deep-linked selection on query-only navigations (e.g. clicking an
	// opportunity row while already on this campaign — the page doesn't remount, so
	// the useState initializer above never re-runs) and after the campaign-change
	// reset just above. The preserve-selection tab request keeps the seeded id from
	// being auto-selected away while the inbox data loads.
	const inboxEmailIdParam = inboxDeepLinkParams.get('inboxEmailId');
	useEffect(() => {
		if (inboxEmailIdParam == null) return;
		const parsed = Number(inboxEmailIdParam);
		if (!Number.isInteger(parsed) || parsed === 0) return;
		setSelectedInboxEmailId(parsed);
		setLocalInboxSentTabRequest((prev) => ({
			tab: 'inbox',
			requestId:
				Math.max(prev?.requestId ?? 0, inboxSentTabRequest?.requestId ?? 0) + 1,
			preserveSelection: true,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inboxEmailIdParam, campaign?.id]);

	// When a draft is open, the research panel should stay locked to that draft's contact.
	const displayedContactForResearch = isDraftPreviewOpen
		? selectedContactForResearch
		: hoveredContactForResearch || selectedContactForResearch;
	const profileSidePanelName = miniProfileFields?.name ?? null;
	const profileSidePanelGenre = miniProfileFields?.genre ?? null;
	const profileSidePanelArea = miniProfileFields?.area ?? null;
	const profileSidePanelPerformingName = miniProfileFields?.band ?? null;
	const profileSidePanelBio = miniProfileFields?.bio ?? null;

	const handleKeepTestDraft = useCallback(
		async (explicitContact?: ContactWithName | null) => {
			if (isKeepingTestDraft) return false;
			if (!campaign?.id) {
				toast.error('Missing campaign.');
				return false;
			}

			const contactForTest = explicitContact ?? contacts?.[0] ?? null;
			if (!contactForTest) {
				toast.error('No contact available to save this test draft.');
				return false;
			}

			const rawTestMessage = (campaign.testMessage || '').trim();
			if (!rawTestMessage) {
				toast.error('Generate a test draft first.');
				return false;
			}

			setIsKeepingTestDraft(true);
			try {
				const existingSnapshot = extractMurmurDraftSettingsSnapshot(rawTestMessage);
				const { messageHtml, injectedSubject } =
					stripInjectedSubjectFromTestMessageHtml(rawTestMessage);

				const subject = (campaign.testSubject || '').trim() || injectedSubject.trim();
				if (!subject) {
					toast.error('Test draft is missing a subject.');
					return false;
				}

				const cleanedMessageHtml = (messageHtml || '').trim();
				if (!cleanedMessageHtml) {
					toast.error('Test draft is missing content.');
					return false;
				}

				const identityProfile = campaign.identity as
					| IdentityProfileFields
					| null
					| undefined;
				const computedProfileFields: DraftProfileFields = {
					name: identityProfile?.name ?? '',
					genre: identityProfile?.genre ?? '',
					area: identityProfile?.area ?? '',
					band: identityProfile?.bandName ?? '',
					bio: identityProfile?.bio ?? '',
					links: identityProfile?.website ?? '',
				};

				const baseValues = existingSnapshot?.values ?? form.getValues();
				// Ensure the snapshot stores a concrete signature string (so Drafts settings reflect what was used).
				const signatureForSnapshot =
					resolveAutoSignatureText({
						currentSignature: baseValues.signature ?? null,
						fallbackSignature: `Thank you,\n${identityProfile?.name || ''}`,
						context: {
							name: identityProfile?.name ?? null,
							bandName: identityProfile?.bandName ?? null,
							website: identityProfile?.website ?? null,
							email: identityProfile?.email ?? null,
						},
					}) ||
					(typeof baseValues.signature === 'string' ? baseValues.signature : '') ||
					'';

				const valuesForSnapshot: DraftingFormValues = {
					...baseValues,
					signature: signatureForSnapshot,
				};
				const profileFieldsForSnapshot =
					existingSnapshot?.profileFields ?? computedProfileFields;

				const messageWithSettings = injectMurmurDraftSettingsSnapshot(
					cleanedMessageHtml,
					{
						version: 1,
						values: valuesForSnapshot,
						profileFields: profileFieldsForSnapshot,
					}
				);

				await createEmail({
					subject,
					message: messageWithSettings,
					campaignId: campaign.id,
					status: EmailStatus.draft,
					contactId: contactForTest.id,
				});

				await queryClient.invalidateQueries({ queryKey: ['emails'] });

				toast.success('Saved to Drafts.');
				setPendingKeptDraftContactId(contactForTest.id);
				goToDrafting?.();
				return true;
			} catch (error) {
				console.error('Failed to keep test draft:', error);
				toast.error('Failed to save draft. Please try again.');
				return false;
			} finally {
				setIsKeepingTestDraft(false);
			}
		},
		[campaign, contacts, createEmail, form, goToDrafting, isKeepingTestDraft, queryClient]
	);
	const draftsMiniEmailTopHeaderLabel = draftsMiniEmailTopHeaderHeight
		? 'Settings'
		: undefined;
	const draftsMiniEmailSettingsLabels = useMemo(() => {
		const contact = displayedContactForResearch;
		if (!draftsMiniEmailTopHeaderHeight || !contact)
			return { primary: '', secondary: '' };

		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const name = (fullName || contact.name || '').trim();
		const company = (contact.company || '').trim();

		if (!name) return { primary: company, secondary: '' };
		if (!company) return { primary: name, secondary: '' };
		return { primary: name, secondary: company };
	}, [displayedContactForResearch, draftsMiniEmailTopHeaderHeight]);
	const draftsMiniEmailSettingsNameCompanyBgColor = useMemo(() => {
		const contact = displayedContactForResearch;
		if (!draftsMiniEmailTopHeaderHeight || !contact) return undefined;

		const headline = (contact.headline || contact.title || '').trim();
		if (!headline) return '#C1D6FF';

		return isRestaurantTitle(headline)
			? '#C3FBD1'
			: isCoffeeShopTitle(headline)
				? '#D6F1BD'
				: isMusicVenueTitle(headline)
					? '#B7E5FF'
					: isMusicFestivalTitle(headline)
						? '#C1D6FF'
						: isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)
							? '#FFF2BC'
							: isWineBeerSpiritsTitle(headline)
								? '#BFC4FF'
								: '#E8EFFF';
	}, [displayedContactForResearch, draftsMiniEmailTopHeaderHeight]);

	useEffect(() => {
		if (!selectedContactForResearch && contacts && contacts.length > 0) {
			setSelectedContactForResearch(contacts[0]);
		}
	}, [contacts, selectedContactForResearch]);

	// When reviewing a draft (Drafts tab or the Write-tab batch review), the research panel
	// should reflect the currently open draft (not whatever was last hovered in the table).
	useEffect(() => {
		if (contentView !== 'drafting') return;
		if (!selectedDraft) return;

		// Prefer the contacts list (includes computed `name`) when available.
		const contactFromList =
			contacts?.find((c) => c.id === selectedDraft.contactId) ?? null;

		// Fallback: emails include `contact`, but it does not have computed `name`.
		const synthesizedFromEmail = {
			...selectedDraft.contact,
			name:
				`${selectedDraft.contact.firstName || ''} ${
					selectedDraft.contact.lastName || ''
				}`.trim() || null,
		} as ContactWithName;

		const nextContact = contactFromList ?? synthesizedFromEmail;

		setSelectedContactForResearch(nextContact);
		setHoveredContactForResearch(null);
		setHasUserSelectedResearchContact(true);
	}, [contentView, selectedDraft?.id, contacts]);

	useEffect(() => {
		if (!contactsAvailableForDrafting) return;
		const availableIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
		setContactsTabSelectedIds((prev) => {
			let hasChange = false;
			const next = new Set<number>();
			prev.forEach((id) => {
				if (availableIds.has(id)) {
					next.add(id);
				} else {
					hasChange = true;
				}
			});
			if (!hasChange && next.size === prev.size) {
				return prev;
			}
			return next;
		});
	}, [contactsAvailableForDrafting, setContactsTabSelectedIds]);

	// Compute whether all contacts are selected (regardless of how they were selected)
	const areAllContactsSelected = useMemo(() => {
		if (contactsAvailableForDrafting.length === 0) return false;
		if (contactsTabSelectedIds.size !== contactsAvailableForDrafting.length) return false;
		return contactsAvailableForDrafting.every((c) => contactsTabSelectedIds.has(c.id));
	}, [contactsAvailableForDrafting, contactsTabSelectedIds]);

	// Handle "All" button click - toggle all contacts
	const handleSelectAllContacts = useCallback(() => {
		if (areAllContactsSelected) {
			// Clicking "All" when already all selected - deselect all
			setContactsTabSelectedIds(new Set());
		} else {
			// Select all
			const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
			setContactsTabSelectedIds(allIds);
		}
	}, [contactsAvailableForDrafting, areAllContactsSelected]);

	const handleDraftSelectedContacts = useCallback(async () => {
		const selectedIds = Array.from(contactsTabSelectedIds.values());
		if (selectedIds.length === 0) {
			toast.error('Select at least one contact to draft messages.');
			return;
		}
		await handleGenerateDrafts(selectedIds);
	}, [contactsTabSelectedIds, handleGenerateDrafts]);

	// Click-outside handler to deselect when all contacts are selected
	useEffect(() => {
		if (!areAllContactsSelected) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			// Check if click is outside the draft button container
			if (
				draftButtonContainerRef.current &&
				!draftButtonContainerRef.current.contains(target) &&
				!target.closest('[data-draft-button-container]')
			) {
				setContactsTabSelectedIds(new Set());
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [areAllContactsSelected]);

	const handleResearchContactClick = (contact: ContactWithName | null) => {
		if (!contact) return;
		setSelectedContactForResearch(contact);
		setHasUserSelectedResearchContact(true);
	};

	const handleResearchContactHover = (contact: ContactWithName | null) => {
		if (contact) {
			setHoveredContactForResearch(contact);
			return;
		}

		if (hasUserSelectedResearchContact) {
			setHoveredContactForResearch(null);
		}
	};

	const cancelRowHoverResearchClear = useCallback(() => {
		if (!rowHoverResearchClearTimeoutRef.current) return;
		clearTimeout(rowHoverResearchClearTimeoutRef.current);
		rowHoverResearchClearTimeoutRef.current = null;
	}, []);

	const scheduleRowHoverResearchClear = useCallback(() => {
		cancelRowHoverResearchClear();
		rowHoverResearchClearTimeoutRef.current = setTimeout(() => {
			rowHoverResearchClearTimeoutRef.current = null;
			setRowHoverResearchContact(null);
			setRowHoverOpportunity(null);
		}, ROW_HOVER_RESEARCH_CLEAR_DELAY_MS);
	}, [cancelRowHoverResearchClear]);

	const handleContactRowHoverResearch = useCallback(
		(contact: ContactWithName | null, rowElement: HTMLElement | null) => {
			if (!contact || !rowElement) {
				// Row mouseleave, or a row with no resolvable contact: show nothing for
				// it, and fade any visible card after the shared delay (avoids flicker
				// when the pointer crosses an unmatched inbox row between matched ones).
				scheduleRowHoverResearchClear();
				return;
			}
			const anchor = rowElement.closest<HTMLElement>('[data-row-hover-research-anchor]');
			if (!anchor) return;
			cancelRowHoverResearchClear();
			const anchorRect = anchor.getBoundingClientRect();
			// Rects are post-transform; absolute `top` inside the anchor is pre-transform.
			// The rect/offset ratio captures the full cumulative scale (campaign zoom,
			// incl. the Safari transform fallback, and the 0.94 campaign-content scale).
			const scale = anchor.offsetHeight > 0 ? anchorRect.height / anchor.offsetHeight : 1;
			// Standardized vertical placement: statically center the FULL (expanded) card in
			// the viewport instead of following the hovered row, so it never drops below the
			// fold and always has room to Tab-expand. Converted into the anchor's pre-transform
			// coords (the absolute `top` the card renders at).
			const cardScreenHeightPx = HOVER_RESEARCH_CARD_FULL_HEIGHT_PX * (scale || 1);
			const centeredScreenTopPx = Math.max(8, (window.innerHeight - cardScreenHeightPx) / 2);
			setRowHoverResearchTopPx((centeredScreenTopPx - anchorRect.top) / (scale || 1));
			// When the split stages leave a clear map strip left of the translucent
			// band, move the card out of the band: right edge one gap left of the band
			// edge. Centered/scrollable stages pin the band to x=0, so the fits-left-
			// of-the-band check fails and the card keeps its default list dock.
			let leftPx = ROW_HOVER_RESEARCH_DOCKED_LEFT_PX;
			const splitOverlay = document.querySelector('.campaign-map-split-overlay');
			if (splitOverlay) {
				const overlayLeftPx = splitOverlay.getBoundingClientRect().left;
				const cardFootprintRealPx =
					(ROW_HOVER_RESEARCH_CARD_WIDTH_PX + ROW_HOVER_RESEARCH_GAP_PX) * (scale || 1);
				if (overlayLeftPx > cardFootprintRealPx) {
					leftPx = Math.min(
						leftPx,
						(overlayLeftPx - anchorRect.left) / (scale || 1) +
							ROW_HOVER_RESEARCH_DOCKED_LEFT_PX
					);
				}
			}
			setRowHoverResearchLeftPx(leftPx);
			setRowHoverOpportunity(null);
			setRowHoverResearchContact(contact);
		},
		[cancelRowHoverResearchClear, scheduleRowHoverResearchClear]
	);

	// Event-chat row variant of the handler above: same anchor/scale/dock math,
	// sized for the opportunity panel, and swaps which card is shown.
	const handleEventChatRowHover = useCallback(
		(application: MyEventApplication | null, rowElement: HTMLElement | null) => {
			if (!application || !rowElement) {
				scheduleRowHoverResearchClear();
				return;
			}
			const anchor = rowElement.closest<HTMLElement>('[data-row-hover-research-anchor]');
			if (!anchor) return;
			cancelRowHoverResearchClear();
			const anchorRect = anchor.getBoundingClientRect();
			const rowRect = rowElement.getBoundingClientRect();
			const scale = anchor.offsetHeight > 0 ? anchorRect.height / anchor.offsetHeight : 1;
			const rawTopPx = (rowRect.top - anchorRect.top) / (scale || 1);
			const maxTopPx = Math.max(
				0,
				anchor.offsetHeight - OPPORTUNITY_HOVER_PANEL_HEIGHT_PX
			);
			setRowHoverResearchTopPx(Math.min(Math.max(rawTopPx, 0), maxTopPx));
			let leftPx = ROW_HOVER_OPPORTUNITY_DOCKED_LEFT_PX;
			const splitOverlay = document.querySelector('.campaign-map-split-overlay');
			if (splitOverlay) {
				const overlayLeftPx = splitOverlay.getBoundingClientRect().left;
				const cardFootprintRealPx =
					(OPPORTUNITY_HOVER_PANEL_WIDTH_PX + ROW_HOVER_RESEARCH_GAP_PX) * (scale || 1);
				if (overlayLeftPx > cardFootprintRealPx) {
					leftPx = Math.min(
						leftPx,
						(overlayLeftPx - anchorRect.left) / (scale || 1) +
							ROW_HOVER_OPPORTUNITY_DOCKED_LEFT_PX
					);
				}
			}
			setRowHoverResearchLeftPx(leftPx);
			setRowHoverResearchContact(null);
			setRowHoverOpportunity(application);
		},
		[cancelRowHoverResearchClear, scheduleRowHoverResearchClear]
	);

	const isRowHoverResearchEnabled =
		!isMobile && (view === 'testing' || view === 'drafting' || view === 'inbox');
	const isRailHoverResearchEnabled =
		!isMobile && (view === 'search' || view === 'overview');

	// Id → contact for every row that lives in a rail surface, so the delegated
	// container hover can resolve a hovered row back to its contact.
	const railContactById = useMemo(() => {
		const map = new Map<number, ContactWithName>();
		for (const contact of searchResultsForPanel) map.set(contact.id, contact);
		for (const contact of overviewRightRailSelectedContactsFull) map.set(contact.id, contact);
		for (const contact of overviewRightRailUnselectedContactsFiltered)
			map.set(contact.id, contact);
		return map;
	}, [
		searchResultsForPanel,
		overviewRightRailSelectedContactsFull,
		overviewRightRailUnselectedContactsFiltered,
	]);

	const cancelRailHoverResearchClear = useCallback(() => {
		if (!railHoverResearchClearTimeoutRef.current) return;
		clearTimeout(railHoverResearchClearTimeoutRef.current);
		railHoverResearchClearTimeoutRef.current = null;
	}, []);
	const scheduleRailHoverResearchClear = useCallback(() => {
		if (railHoverResearchClearTimeoutRef.current) return;
		railHoverResearchClearTimeoutRef.current = setTimeout(() => {
			railHoverResearchClearTimeoutRef.current = null;
			setRailHoverResearchContact(null);
			setRailHoverResearchPos(null);
		}, ROW_HOVER_RESEARCH_CLEAR_DELAY_MS);
	}, []);

	const handleRailRowHoverResearch = useCallback(
		(contact: ContactWithName | null, rowElement: HTMLElement | null) => {
			if (!isRailHoverResearchEnabled || !contact || !rowElement) {
				scheduleRailHoverResearchClear();
				return;
			}
			cancelRailHoverResearchClear();
			const rootScale = getMurmurRootScale() || 1;
			const rect = rowElement.getBoundingClientRect();
			// offsetHeight (design px) vs rendered height = the row's cumulative
			// design→screen scale; the card matches it so it reads the same size as
			// the rows beside it, regardless of the rail's nested scale transforms.
			const rowScale =
				rowElement.offsetHeight > 0 ? rect.height / rowElement.offsetHeight : rootScale;
			const cardScreenWidth =
				(ROW_HOVER_RESEARCH_CARD_WIDTH_PX + ROW_HOVER_RESEARCH_GAP_PX) * rowScale;
			// Dock left of the row; flip to the right if there's no room on the left.
			let leftScreen = rect.left - cardScreenWidth;
			if (leftScreen < 8) leftScreen = rect.right + ROW_HOVER_RESEARCH_GAP_PX * rowScale;
			// Standardized vertical placement: statically center the FULL (expanded) card in
			// the viewport instead of following the hovered row, so it never drops below the
			// fold and always has room to Tab-expand (matches the pinned-list card), nudged
			// slightly above true-center on the rail.
			const cardScreenHeight = HOVER_RESEARCH_CARD_FULL_HEIGHT_PX * rowScale;
			const topScreen = Math.max(
				8,
				(window.innerHeight - cardScreenHeight) / 2 - RAIL_HOVER_RESEARCH_TOP_NUDGE_PX
			);
			// getBoundingClientRect is screen space; `position: fixed` children of the
			// root-scaled <body> need those divided by the root scale (see getMurmurRootScale).
			setRailHoverResearchPos({
				topPx: topScreen / rootScale,
				leftPx: leftScreen / rootScale,
				scale: rowScale / rootScale,
			});
			setRailHoverResearchContact(contact);
		},
		[isRailHoverResearchEnabled, cancelRailHoverResearchClear, scheduleRailHoverResearchClear]
	);

	// Delegated hover on a rail container: resolve the hovered row via data-contact-id
	// so no per-row wiring is needed across the responsive search-panel tiers.
	const handleRailContainerMouseOver = useCallback(
		(event: ReactMouseEvent<HTMLElement>) => {
			const row = (event.target as HTMLElement).closest<HTMLElement>('[data-contact-id]');
			if (!row) return;
			const id = Number(row.getAttribute('data-contact-id'));
			if (railHoverResearchContactIdRef.current === id) return; // already shown
			const contact = railContactById.get(id);
			if (contact) handleRailRowHoverResearch(contact, row);
		},
		[railContactById, handleRailRowHoverResearch]
	);
	const handleRailContainerMouseOut = useCallback(
		(event: ReactMouseEvent<HTMLElement>) => {
			const related = event.relatedTarget as Node | null;
			if (related && event.currentTarget.contains(related)) return; // moved within the rail
			handleRailRowHoverResearch(null, null);
		},
		[handleRailRowHoverResearch]
	);

	useEffect(() => {
		// Never carry a card across tab switches; also cleans the timer on unmount.
		cancelRowHoverResearchClear();
		setRowHoverResearchContact(null);
		setRowHoverOpportunity(null);
		cancelRailHoverResearchClear();
		setRailHoverResearchContact(null);
		setRailHoverResearchPos(null);
		return () => {
			cancelRowHoverResearchClear();
			cancelRailHoverResearchClear();
		};
	}, [view, cancelRowHoverResearchClear, cancelRailHoverResearchClear]);

	useEffect(() => {
		// The card's offset is captured per-hover relative to the live layout; a
		// resize/zoom change moves it, so drop the card instead of leaving it at a
		// stale offset (next row hover recomputes).
		if (typeof window === 'undefined') return;
		const clearCard = () => {
			cancelRowHoverResearchClear();
			setRowHoverResearchContact(null);
			setRowHoverOpportunity(null);
			cancelRailHoverResearchClear();
			setRailHoverResearchContact(null);
			setRailHoverResearchPos(null);
		};
		window.addEventListener('resize', clearCard);
		window.addEventListener('murmur:campaign-zoom-changed', clearCard);
		return () => {
			window.removeEventListener('resize', clearCard);
			window.removeEventListener('murmur:campaign-zoom-changed', clearCard);
		};
	}, [cancelRowHoverResearchClear, cancelRailHoverResearchClear]);

	const handleDraftPreviewClick = useCallback((draft: EmailWithRelations) => {
		setSelectedDraft(draft);
	}, []);

	const campaignContactEmailsReal = contacts
		? contacts
				.map((contact) => contact.email)
				.filter((email): email is string => Boolean(email))
		: undefined;
	const campaignContactEmails = inboxMockData
		? inboxMockData.allowedSenderEmails
		: campaignContactEmailsReal;

	const campaignContactsByEmailReal = useMemo(() => {
		if (!contacts) return undefined;
		const map: Record<string, ContactWithName> = {};
		for (const contact of contacts) {
			if (!contact.email) continue;
			const key = contact.email.toLowerCase().trim();
			if (!key) continue;
			if (!map[key]) {
				map[key] = contact;
			}
		}
		return map;
	}, [contacts]);
	const campaignContactsByEmail = inboxMockData
		? inboxMockData.contactByEmail
		: campaignContactsByEmailReal;
	const { data: allInboundEmailsForContactsTable } = useGetInboundEmails({
		enabled: Boolean(contacts?.length) && !inboxMockOverrideActive,
	});
	const inboxEmailsForContactsExpandedListReal = useMemo(() => {
		if (!allInboundEmailsForContactsTable || !contacts?.length) return [];
		const allowedSenders = new Set(
			contacts
				.map((contact) => contact.email?.toLowerCase().trim())
				.filter((email): email is string => Boolean(email))
		);
		if (allowedSenders.size === 0) return [];
		return allInboundEmailsForContactsTable.filter((email) => {
			const sender = email.sender?.toLowerCase().trim();
			return Boolean(sender && allowedSenders.has(sender));
		});
	}, [allInboundEmailsForContactsTable, contacts]);
	const inboxEmailsForContactsExpandedList = inboxMockData
		? inboxMockData.inboundEmails
		: inboxEmailsForContactsExpandedListReal;
	const contactsListSupplementalProps = useMemo(
		() => ({
			allContacts: inboxMockData ? inboxMockData.contacts : contacts || [],
			drafts: draftEmails,
			sentEmails: inboxMockData ? inboxMockData.sentEmails : sentEmails,
			inboxEmails: inboxEmailsForContactsExpandedList,
			optimisticInboxReplyByEmailId,
			contactByEmail: campaignContactsByEmail,
		}),
		[
			contacts,
			draftEmails,
			sentEmails,
			inboxEmailsForContactsExpandedList,
			optimisticInboxReplyByEmailId,
			campaignContactsByEmail,
			inboxMockData,
		]
	);

	// The artist's submitted applications thread into the mobile conversations as
	// per-event "sent" items (same scoping as the inbox rows: campaign contacts).
	const { data: myEventApplications } = useGetMyEventApplications({
		enabled: isMobile === true && !inboxMockData,
	});

	// Summary list is "loading" until both the campaign contacts and emails resolve —
	// before that, all three lists are empty and the empty state would flash. The mock
	// harness supplies its own data, so it never shows the skeleton.
	const isMobileSummaryLoading =
		!inboxMockData && (isContactsLoading || isPendingEmails);

	// Mobile Summary view data: ongoing conversations (≥1 inbound reply) first, then
	// drafts, then the remaining plain contacts. Conversations thread the campaign's
	// sent emails in alongside replies so the fullscreen chat shows both sides.
	const mobileSummaryData = useMemo(() => {
		const empty = {
			conversations: [] as InboxConversation[],
			drafts: [] as EmailWithRelations[],
			plainContacts: [] as ContactWithName[],
		};
		if (isMobile !== true) return empty;

		const draftsForSummary = (headerEmails || [])
			.filter((email) => email.status === EmailStatus.draft)
			.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		const sentForSummary = (headerEmails || []).filter(
			(email) => email.status === EmailStatus.sent
		);

		const applicationRows = (myEventApplications ?? [])
			.filter((application) => application.status === 'submitted')
			.map(normalizeApplicationForInboxConversation)
			.filter((row): row is InboxConversationMessage => row != null)
			.filter((row) => {
				const sender = row.sender?.toLowerCase().trim();
				return Boolean(sender && campaignContactsByEmail?.[sender]);
			});

		const conversations = buildInboxConversations([
			...inboxEmailsForContactsExpandedList,
			...sentForSummary.map(normalizeSentEmailForInboxConversation),
			...applicationRows,
		]).filter((conversation) => conversation.inboundMessages.length > 0);

		const conversationContactIds = new Set<number>();
		const conversationEmails = new Set<string>();
		for (const conversation of conversations) {
			for (const message of conversation.messages) {
				if (message.contactId != null) conversationContactIds.add(message.contactId);
				const sender = normalizeInboxEmailAddress(message.sender);
				if (sender) conversationEmails.add(sender);
			}
		}
		const draftedContactIds = new Set(draftsForSummary.map((draft) => draft.contactId));

		// Plain contacts sort by latest send activity so sent-without-reply floats up.
		const latestSentAtByContactId = new Map<number, number>();
		for (const email of sentForSummary) {
			const at = new Date(email.sentAt || email.createdAt).getTime();
			if (Number.isNaN(at)) continue;
			const prev = latestSentAtByContactId.get(email.contactId) ?? 0;
			if (at > prev) latestSentAtByContactId.set(email.contactId, at);
		}
		const plainContactSortKey = (contact: ContactWithName) =>
			latestSentAtByContactId.get(contact.id) ??
			new Date(contact.createdAt).getTime() ??
			0;
		const plainContacts = (headerContacts || [])
			.filter((contact) => {
				if (conversationContactIds.has(contact.id)) return false;
				const email = contact.email?.toLowerCase().trim();
				if (email && conversationEmails.has(email)) return false;
				return !draftedContactIds.has(contact.id);
			})
			.sort((a, b) => plainContactSortKey(b) - plainContactSortKey(a));

		return {
			conversations,
			drafts: draftsForSummary,
			plainContacts,
		};
	}, [
		isMobile,
		headerEmails,
		headerContacts,
		inboxEmailsForContactsExpandedList,
		myEventApplications,
		campaignContactsByEmail,
	]);

	const selectedMobileDraft =
		mobileSummarySelection?.kind === 'draft'
			? (mobileSummaryData.drafts.find(
					(draft) => draft.id === mobileSummarySelection.id
				) ?? null)
			: null;
	const selectedMobileConversation =
		mobileSummarySelection?.kind === 'conversation'
			? (mobileSummaryData.conversations.find(
					(conversation) => conversation.key === mobileSummarySelection.key
				) ?? null)
			: null;
	const selectedMobileConversationContact = useMemo(() => {
		if (!selectedMobileConversation) return null;
		const message =
			selectedMobileConversation.latestInboundMessage ??
			selectedMobileConversation.latestMessage;
		const senderKey = normalizeInboxEmailAddress(message.sender);
		return (
			(senderKey ? campaignContactsByEmail?.[senderKey] : null) ??
			((message.contact as ContactWithName | null) || null)
		);
	}, [selectedMobileConversation, campaignContactsByEmail]);

	// Drop a stale draft selection (e.g. the draft was sent/deleted from elsewhere).
	useEffect(() => {
		if (
			mobileSummarySelection?.kind === 'draft' &&
			!isPendingEmails &&
			!selectedMobileDraft
		) {
			setMobileSummarySelection(null);
		}
	}, [mobileSummarySelection, isPendingEmails, selectedMobileDraft]);

	// Leaving the Summary view closes any open fullscreen overlay.
	useEffect(() => {
		if (view !== 'summary' && mobileSummarySelection !== null) {
			setMobileSummarySelection(null);
		}
	}, [view, mobileSummarySelection]);

	// Advance to the next draft in the summary order after a send/delete; close back
	// to the list when none remain. "Next" comes from the pre-mutation snapshot so the
	// React Query invalidation can't shift it mid-flight.
	const advanceFromMobileDraft = useCallback(
		(draftId: number) => {
			const ordered = mobileSummaryData.drafts;
			const index = ordered.findIndex((draft) => draft.id === draftId);
			const next = index >= 0 ? ordered[index + 1] : undefined;
			setMobileSummarySelection(next ? { kind: 'draft', id: next.id } : null);
		},
		[mobileSummaryData.drafts]
	);
	const handleMobileDraftSend = useCallback(async () => {
		if (mobileSummarySelection?.kind !== 'draft') return false;
		const draftId = mobileSummarySelection.id;
		const processed = await handleSendDrafts([draftId]);
		if (processed > 0) {
			setMobileSessionSentCount((count) => count + 1);
			advanceFromMobileDraft(draftId);
			return true;
		}
		// A guard blocked the send (it already toasted) — stay on the draft.
		return false;
	}, [mobileSummarySelection, handleSendDrafts, advanceFromMobileDraft]);
	const handleMobileDraftDelete = useCallback(async () => {
		if (mobileSummarySelection?.kind !== 'draft') return;
		const draftId = mobileSummarySelection.id;
		await deleteDraftEmail(draftId);
		setMobileSessionDeletedCount((count) => count + 1);
		advanceFromMobileDraft(draftId);
	}, [mobileSummarySelection, deleteDraftEmail, advanceFromMobileDraft]);

	// Mobile deep link (?inboxEmailId=...): open that message's conversation fullscreen.
	useEffect(() => {
		if (isMobile !== true || inboxEmailIdParam == null) return;
		const parsed = Number(inboxEmailIdParam);
		if (!Number.isInteger(parsed) || parsed === 0) return;
		const conversation = mobileSummaryData.conversations.find((candidate) =>
			inboxConversationContainsEmailId(candidate, parsed)
		);
		if (conversation) {
			setMobileSummarySelection({ kind: 'conversation', key: conversation.key });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, inboxEmailIdParam, mobileSummaryData.conversations.length]);

	const inboxSectionSampleData = inboxMockData
		? {
				inboundEmails: inboxMockData.inboundEmails,
				sentEmails: inboxMockData.sentEmailsAsInbound,
			}
		: undefined;

	const toListNames =
		campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const fromName = campaign?.identity?.name || '';
	const fromEmail = campaign?.identity?.email || '';

	// Research hover card (abridged card + Description box) top-aligned to the hovered
	// row, docked left of the list (pushed further left to clear the translucent band
	// when the split map strip is visible). Rendered inside the
	// [data-row-hover-research-anchor] wrapper. `enabled` lets the search/overview rail
	// reuse this with its own gate (defaults to the pinned-list gate).
	const renderRowHoverResearchCard = (enabled = isRowHoverResearchEnabled) =>
		enabled && rowHoverOpportunity ? (
			<div
				className="absolute pointer-events-none"
				style={{
					zIndex: 40,
					top: `${rowHoverResearchTopPx}px`,
					left: `${rowHoverResearchLeftPx}px`,
				}}
			>
				<OpportunityHoverPanel application={rowHoverOpportunity} nowMs={Date.now()} />
			</div>
		) : enabled && rowHoverResearchContact ? (
			<div
				className="absolute pointer-events-none"
				style={{
					zIndex: 40,
					top: `${rowHoverResearchTopPx}px`,
					left: `${rowHoverResearchLeftPx}px`,
				}}
			>
				<ContactResearchHoverCard contact={rowHoverResearchContact} />
			</div>
		) : null;

	const renderSharedBottomPanel = (kind: CampaignBottomPanelKind) => {
		switch (kind) {
			case 'contacts':
				return (
					<ContactsExpandedList
						key={kind}
						contacts={contactsForContactsExpandedList}
						{...contactsListSupplementalProps}
						campaign={campaign}
						activelyDraftingContactIds={activelyDraftingContactIdsForContactsExpandedList}
						width={bottomPanelBoxWidthPx}
						height={bottomPanelBoxHeightPx}
						enableUsedContactTooltip={false}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						showSearchBar={false}
					/>
				);
			case 'drafts':
				return (
					<DraftsExpandedList
						key={kind}
						drafts={draftEmails}
						contacts={contacts || []}
						generationProgress={generationProgress}
						generationTotal={generationTotal}
						width={bottomPanelBoxWidthPx}
						height={bottomPanelBoxHeightPx}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						hideSendButton={true}
						onOpenDrafts={goToDrafting}
					/>
				);
			case 'sent':
				return (
					<SentExpandedList
						key={kind}
						sent={sentEmails}
						contacts={contacts || []}
						width={bottomPanelBoxWidthPx}
						height={bottomPanelBoxHeightPx}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						onOpenSent={goToSent}
					/>
				);
			case 'inbox':
				return (
					<InboxExpandedList
						key={kind}
						contacts={contacts || []}
						width={bottomPanelBoxWidthPx}
						height={bottomPanelBoxHeightPx}
						whiteSectionHeight={15}
						collapsed={bottomPanelCollapsed}
						onOpenInbox={goToInbox}
					/>
				);
		}
		return null;
	};

	// Shared square-button helpers for the Write/Drafts bottom bars.
	const boxStyle: CSSProperties = {
		width: 39.154,
		height: 39.154,
		borderRadius: 7.458,
		border: '0.725px solid #000',
		boxSizing: 'border-box',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontFamily: 'Inter, sans-serif',
		fontSize: 12.326,
		fontStyle: 'normal',
		fontWeight: 500,
		lineHeight: '10.151px',
		color: '#000',
	};
	const blankBox = (key: string, opacity: number) => (
		<div
			key={key}
			aria-hidden="true"
			style={{
				...boxStyle,
				opacity,
				background: '#F3EEE1',
			}}
		/>
	);
	const counterBox = ({
		label,
		count,
		background,
		opacity,
		onClick,
	}: {
		label: string;
		count: number;
		background: string;
		opacity?: number;
		onClick?: () => void;
	}) => (
		<button
			type="button"
			aria-label={`${count} ${label}`}
			disabled={!onClick}
			className={cn(
				'border-0 p-0 transition-opacity duration-150',
				onClick && 'hover:opacity-85'
			)}
			style={{
				...boxStyle,
				background,
				opacity,
				cursor: onClick ? 'pointer' : 'default',
			}}
			onClick={onClick}
		>
			{count}
		</button>
	);

	const renderWriteBottomDraftBar = () => {
		const selectedCount = contactsTabSelectedIds.size;
		const isDraftDisabled = selectedCount === 0;
		const draftLabel = isDraftQueueActive
			? 'Add Emails to Queue'
			: `Draft ${selectedCount} ${selectedCount === 1 ? 'contact' : 'contacts'}`;

		return (
			<div
				data-draft-button-container
				className="flex items-center"
				style={{ gap: 3, height: writeDraftBottomBarHeightPx }}
			>
				{blankBox('left-1', 0.1)}
				{blankBox('left-2', 0.2)}
				<button
					type="button"
					aria-label="Open search"
					className="border-0 p-0 transition-opacity duration-150 hover:opacity-85"
					style={{
						...boxStyle,
						background: '#FFFFFF',
						cursor: onGoToSearch ? 'pointer' : 'default',
					}}
					onClick={onGoToSearch}
				>
					<SearchIconDesktop width={17} height={18} stroke="#8B8B8B" strokeWidth={2.3} />
				</button>
				<div
					className="flex overflow-hidden"
					style={{
						width: 472,
						height: writeDraftBottomBarHeightPx,
						borderRadius: 5,
						border: '2px solid #000',
						boxSizing: 'border-box',
						background: '#F7E4E4',
					}}
				>
					<button
						type="button"
						disabled={isDraftDisabled}
						className="flex flex-1 items-center justify-center border-0 bg-transparent p-0 font-inter text-[17px] font-normal leading-none text-black"
						style={{
							cursor: isDraftDisabled ? 'not-allowed' : 'pointer',
							opacity: isDraftDisabled ? 0.55 : 1,
						}}
						onClick={handleDraftSelectedContacts}
					>
						{draftLabel}
					</button>
					<button
						type="button"
						aria-pressed={areAllContactsSelected}
						aria-label={areAllContactsSelected ? 'Clear selected contacts' : 'Select all contacts'}
						disabled={contactsAvailableForDrafting.length === 0}
						className="flex items-center justify-center border-0 border-l-[2px] border-black p-0 font-inter text-[17px] font-normal leading-none text-black transition-colors duration-150 hover:bg-[#E67677] disabled:cursor-not-allowed disabled:opacity-60"
						style={{
							width: 58,
							background: '#EB8586',
							cursor:
								contactsAvailableForDrafting.length === 0 ? 'not-allowed' : 'pointer',
						}}
						onClick={(event) => {
							event.stopPropagation();
							handleSelectAllContacts();
						}}
					>
						All
					</button>
				</div>
				{counterBox({
					label: 'drafts',
					count: draftCount,
					background: '#FFE3AA',
					onClick: draftCount > 0 ? goToDrafting : undefined,
				})}
				{counterBox({
					label: 'sent',
					count: sentCount,
					background: '#5AB478',
					opacity: 0.2,
					onClick: sentCount > 0 ? goToSent : undefined,
				})}
				{counterBox({
					label: 'inbox',
					count: inboxCount,
					background: '#6EBED5',
					opacity: 0.1,
					// openInboxTab (not bare goToInbox) supersedes any pending Sent-tab
					// request so the inbox doesn't mount on the Sent view.
					onClick: inboxCount > 0 ? openInboxTab : undefined,
				})}
			</div>
		);
	};

	const renderDraftsBottomSendBar = () => {
		const selectedCount = draftsTabSelectedIds.size;
		const isSendDisabled = selectedCount === 0 || isSendingDisabled;
		const allDraftIds = draftEmailsForView.map((draft) => draft.id);
		const areAllDraftsSelected =
			allDraftIds.length > 0 &&
			selectedCount === allDraftIds.length &&
			allDraftIds.every((id) => draftsTabSelectedIds.has(id));

		return (
			<div
				data-draft-button-container
				className="flex items-center"
				style={{ gap: 3, height: writeDraftBottomBarHeightPx }}
			>
				{blankBox('left-1', 0.1)}
				<button
					type="button"
					aria-label="Open search"
					className="border-0 p-0 transition-opacity duration-150 hover:opacity-85"
					style={{
						...boxStyle,
						background: '#FFFFFF',
						opacity: 0.2,
						cursor: onGoToSearch ? 'pointer' : 'default',
					}}
					onClick={onGoToSearch}
				>
					<SearchIconDesktop width={17} height={18} stroke="#8B8B8B" strokeWidth={2.3} />
				</button>
				{counterBox({
					label: 'contacts',
					count: contactsCount,
					background: '#EB8586',
					onClick: goToWriting,
				})}
				<div
					className="flex overflow-hidden"
					style={{
						width: 472,
						height: writeDraftBottomBarHeightPx,
						borderRadius: 5,
						border: '2px solid #000',
						boxSizing: 'border-box',
						background: '#FFFAD1',
					}}
				>
					<button
						type="button"
						disabled={isSendDisabled}
						className="flex flex-1 items-center justify-center border-0 bg-transparent p-0 font-inter text-[17px] font-normal leading-none text-black"
						style={{
							cursor: isSendDisabled ? 'not-allowed' : 'pointer',
							opacity: isSendDisabled ? 0.55 : 1,
						}}
						onClick={async () => {
							if (isSendDisabled) return;
							await handleSendDrafts();
						}}
					>
						{`Send ${selectedCount} ${selectedCount === 1 ? 'Message' : 'Messages'}`}
					</button>
					<button
						type="button"
						aria-pressed={areAllDraftsSelected}
						aria-label={areAllDraftsSelected ? 'Clear selected drafts' : 'Select all drafts'}
						disabled={draftEmailsForView.length === 0}
						className="flex items-center justify-center border-0 border-l-[2px] border-black p-0 font-inter text-[17px] font-normal leading-none text-black transition-colors duration-150 hover:bg-[#F5D894] disabled:cursor-not-allowed disabled:opacity-60"
						style={{
							width: 58,
							background: '#FFE3AA',
							cursor: draftEmailsForView.length === 0 ? 'not-allowed' : 'pointer',
						}}
						onClick={(event) => {
							event.stopPropagation();
							if (areAllDraftsSelected) {
								setDraftsTabSelectedIds(new Set());
							} else {
								setDraftsTabSelectedIds(new Set(allDraftIds));
							}
						}}
					>
						All
					</button>
				</div>
				{counterBox({
					label: 'sent',
					count: sentCount,
					background: '#5AB478',
					onClick: goToSent,
				})}
				{counterBox({
					label: 'inbox',
					count: inboxCount,
					background: '#6EBED5',
					opacity: 0.2,
					onClick: goToInbox,
				})}
				{blankBox('right-1', 0.1)}
			</div>
		);
	};

	// Render search dropdowns for the mini searchbar
	const renderSearchDropdowns = () => {
		if (!searchActiveSection) return null;

		// Match the dashboard pill/dropdown timing and easing.
		const dropdownEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
		const dropdownTransition = `left 0.6s ${dropdownEase}, height 0.6s ${dropdownEase}`;
		// Slightly faster than the pill (matches dashboard).
		const dropdownFadeTransition = `opacity 0.35s ${dropdownEase}`;

		const dropdownHeight =
			searchActiveSection === 'why'
				? 173
				: searchActiveSection === 'what'
					? searchWhyValue === '[Promotion]'
						? 92
						: 404
					: 370;

		// At the narrow search layout (498px map box), keep the dropdown fully inside the frame.
		// Otherwise, match the dashboard's subtle horizontal shift between sections.
		const dropdownLeft = isSearchTabNarrow
			? 'calc(50% - 220px)'
			: searchActiveSection === 'why'
				? 'calc(50% - 220px)'
				: searchActiveSection === 'what'
					? 'calc(50% - 60px)'
					: 'calc(50% - 120px)';

		return (
			<div
				className="campaign-search-dropdown-menu w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[120] relative overflow-hidden"
				style={{
					position: 'absolute',
					top: '75px',
					left: dropdownLeft,
					height: dropdownHeight,
					transition: dropdownTransition,
					willChange: 'left, height',
				}}
			>
				{/* Cross-fade the inner content so height changes don't "lift" it. */}
				<div
					className="absolute inset-0"
					style={{
						opacity: searchActiveSection === 'why' ? 1 : 0,
						pointerEvents: searchActiveSection === 'why' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div className="flex flex-col items-center justify-start gap-[12px] w-full h-full py-[12px]">
						<div
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
							onClick={() => {
								setSearchWhyValue('[Booking]');
								setSearchActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<BookingIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Booking
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									contact venues, restaurants and more, to book shows
								</div>
							</div>
						</div>
						<div
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
							onClick={() => {
								setSearchWhyValue('[Promotion]');
								setSearchActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#7AD47A] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<PromotionIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Promotion
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									reach out to radio stations, playlists, and more to get your music
									played
								</div>
							</div>
						</div>
					</div>
				</div>

				<div
					className="absolute inset-0"
					style={{
						opacity: searchActiveSection === 'what' ? 1 : 0,
						pointerEvents: searchActiveSection === 'what' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					{/* What dropdown - Promotion */}
					{searchWhyValue === '[Promotion]' ? (
						<div className="flex flex-col items-center justify-start gap-[10px] w-full h-full py-[12px]">
							<div
								className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								onClick={() => {
									setSearchWhatValue('Radio Stations');
									setSearchActiveSection('where');
								}}
							>
								<div className="w-[38px] h-[38px] bg-[#56DA73] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<RadioStationsIcon />
								</div>
								<div className="ml-[12px] flex flex-col">
									<div className="text-[20px] font-medium leading-none text-black font-inter">
										Radio Stations
									</div>
									<div className="text-[12px] leading-tight text-black mt-[4px]">
										Reach out to radio stations
									</div>
								</div>
							</div>
						</div>
					) : (
						<div id="campaign-what-dropdown-container" className="w-full h-full">
							<style jsx global>{`
								#campaign-what-dropdown-container .scrollbar-hide {
									scrollbar-width: none !important;
									scrollbar-color: transparent transparent !important;
									-ms-overflow-style: none !important;
								}
								#campaign-what-dropdown-container .scrollbar-hide::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
								}
							`}</style>
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center gap-[10px] py-[12px]"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Wine, Beer, Spirits');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WineBeerSpiritsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wine, Beer, Spirits
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Restaurants');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#77DD91] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<RestaurantsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Restaurants
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Land steady dinner and brunch gigs
										</div>
									</div>
								</div>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Coffee Shops');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#A9DE78] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<CoffeeShopsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Coffee Shops
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Book intimate daytime performances
										</div>
									</div>
								</div>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Festivals');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<FestivalsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Festivals
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Wedding Planners');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WeddingPlannersIcon size={22} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wedding Planners
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Get hired for ceremonies & receptions
										</div>
									</div>
								</div>
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setSearchWhatValue('Music Venues');
										setSearchActiveSection('where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#71C9FD] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<MusicVenuesIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Music Venues
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Reach talent buyers for live shows
										</div>
									</div>
								</div>
							</CustomScrollbar>
						</div>
					)}
				</div>

				<div
					className="absolute inset-0"
					style={{
						opacity: searchActiveSection === 'where' ? 1 : 0,
						pointerEvents: searchActiveSection === 'where' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div id="campaign-where-dropdown-container" className="w-full h-full">
						<style jsx global>{`
							#campaign-where-dropdown-container .scrollbar-hide {
								scrollbar-width: none !important;
								scrollbar-color: transparent transparent !important;
								-ms-overflow-style: none !important;
							}
							#campaign-where-dropdown-container .scrollbar-hide::-webkit-scrollbar {
								display: none !important;
								width: 0 !important;
								height: 0 !important;
								background: transparent !important;
								-webkit-appearance: none !important;
							}
						`}</style>
						{searchWhereValue.length >= 1 ? (
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								{isLoadingLocations || debouncedWhereValue !== searchWhereValue ? (
									<div className="flex items-center justify-center h-full">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
									</div>
								) : locationResults && locationResults.length > 0 ? (
									locationResults.map((loc, idx) => {
										const { icon, backgroundColor } = getCityIconProps(
											loc.city,
											loc.state
										);
										return (
											<div
												key={`${loc.city}-${loc.state}-${idx}`}
												className="w-[415px] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2"
												onClick={() => {
													setSearchWhereValue(loc.label);
													setSearchActiveSection(null);
													// Trigger search after a short delay to allow state to update
													setTimeout(() => handleCampaignSearch(), 0);
												}}
											>
												<div
													className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
													style={{ backgroundColor }}
												>
													{icon}
												</div>
												<div className="ml-[12px] flex flex-col">
													<div className="text-[20px] font-medium leading-none text-black font-inter">
														{loc.label}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														Search contacts in {loc.city || loc.state}
													</div>
												</div>
											</div>
										);
									})
								) : (
									<div className="text-black font-medium font-secondary">
										No locations found
									</div>
								)}
							</CustomScrollbar>
						) : (
							<div className="flex flex-col items-center justify-center gap-[20px] w-full h-full">
								<div
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										if (userLocationName && !isLoadingLocation) {
											setSearchWhereValue(userLocationName);
											setSearchActiveSection(null);
											// Trigger search after a short delay to allow state to update
											setTimeout(() => handleCampaignSearch(), 0);
										}
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#D0E6FF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<NearMeIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Near Me
										</div>
										<div
											className={`text-[12px] leading-tight mt-[4px] select-none ${
												userLocationName || isLoadingLocation
													? 'text-black/60'
													: 'text-transparent'
											}`}
										>
											{isLoadingLocation
												? 'Locating...'
												: userLocationName || 'Placeholder'}
										</div>
									</div>
								</div>
								{DEFAULT_STATE_SUGGESTIONS.map(
									({ label, promotionDescription, generalDescription }) => {
										const { icon, backgroundColor } = getCityIconProps('', label);
										return (
											<div
												key={label}
												className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
												onClick={() => {
													setSearchWhereValue(label);
													setSearchActiveSection(null);
													// Trigger search after a short delay to allow state to update
													setTimeout(() => handleCampaignSearch(), 0);
												}}
											>
												<div
													className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
													style={{ backgroundColor }}
												>
													{icon}
												</div>
												<div className="ml-[12px] flex flex-col">
													<div className="text-[20px] font-medium leading-none text-black font-inter">
														{label}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														{isPromotion ? promotionDescription : generalDescription}
													</div>
												</div>
											</div>
										);
									}
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center w-full">
					<div
						ref={emailStructureRef}
						className="mb-[4px] flex justify-between items-center"
					></div>

					{/* Main content wrapper to anchor the persistent Header Box */}
					<div
						className="relative w-full flex flex-col items-center"
						style={{
							...(shouldRenderSharedBottomPanels || shouldRenderWriteBottomDraftBar
								? { minHeight: `${sharedWideTabZoomEnvelopeBottomPx}px` }
								: undefined),
							// Envelope-expansion slack: lower the whole workspace cluster so it
							// sits centered in the band on tall monitors (margin, NOT transform —
							// a transform would become the containing block for fixed children).
							...(workspaceDropPx > 0
								? { marginTop: `${workspaceDropPx}px` }
								: undefined),
						}}
					>
						{shouldReserveSharedWideTabZoomEnvelope && (
							<div
								aria-hidden="true"
								data-campaign-bottom-anchor
								style={{
									position: 'absolute',
									left: '50%',
									top: `${sharedWideTabZoomEnvelopeBottomPx - 1}px`,
									width: '1px',
									height: '1px',
									pointerEvents: 'none',
									background: 'transparent',
								}}
							/>
						)}
						{/* Persistent Campaign Header Box for specific tabs */}
						{/* Hide this absolute panel in narrow desktop + testing/contacts mode - we'll use inline layout instead */}
						{/* Also hide when hideHeaderBox is true (header rendered at page level for narrowest breakpoint) */}
						{showSearchSendingOverlay && (
							<div
								className="absolute hidden lg:flex flex-col"
								style={{
									right: 'calc(50% + 384px + 32px)',
									top: '29px',
									zIndex: 130,
								}}
							>
								<SearchSendingOverlay />
							</div>
						)}
						{shouldRenderAbsolutePinnedLeftColumn && !showSearchSendingOverlay && (
							<div
								data-campaign-interactive-surface
								className="absolute hidden lg:flex flex-col"
								style={{
									right:
										view === 'search'
											? isSearchTabNarrow
												? 'calc(50% + 249px + 37px)' // 37px left of narrow map box (498px / 2 = 249px)
												: 'calc(50% + 384px + 32px)'
											: view === 'inbox'
												? 'calc(50% + 250px + 32px)'
												: 'calc(50% + 250px + 32px)',
									top:
										view === 'inbox' || isStandardSidePanelView
											? `${standardSidePanelTopOffsetPx}px`
											: '29px',
									gap: `${standardSidePanelGapPx}px`,
								}}
							>
								{contentView === 'testing' && isProfileSidePanelOpen ? (
									<ProfileSidePanelBox
										profileName={profileSidePanelName}
										profileGenre={profileSidePanelGenre}
										profileArea={profileSidePanelArea}
										profilePerformingName={profileSidePanelPerformingName}
										profileBio={profileSidePanelBio}
										onProfileNameUpdate={(name) => handleIdentityUpdate({ name })}
										onProfileGenreUpdate={(genre) => handleIdentityUpdate({ genre })}
										onProfileAreaUpdate={(area) => handleIdentityUpdate({ area })}
										onProfilePerformingNameUpdate={(bandName) =>
											handleIdentityUpdate({ bandName })
										}
										onProfileBioUpdate={(bio) => handleIdentityUpdate({ bio })}
									/>
								) : (
									<>
										<CampaignHeaderBox
											campaignId={campaign?.id}
											campaignName={campaign?.name || 'Untitled Campaign'}
											toListNames={toListNames}
											fromName={fromName}
											contactsCount={contactsCount}
											draftCount={draftCount}
											sentCount={sentCount}
											draftingProgress={draftingProgressForHeader}
											onFromClick={onOpenIdentityDialog}
											onDraftsClick={goToDrafting}
											onSentClick={goToSent}
										/>
										{view === 'inbox' && (
									<div data-row-hover-research-anchor style={{ position: 'relative' }}>
										<ContactsExpandedList
											contacts={contactsForContactsExpandedList}
											{...contactsListSupplementalProps}
											{...contactsListTopNavProps}
											isLoading={isContactsLoading}
											campaign={campaign}
											focusMode="inbox"
											inboxPanelTabRequest={inboxPanelTabRequest}
											selectedInboxEmailId={selectedInboxEmailId}
											onInboxEmailClick={handleInboxEmailClick}
											onContactHover={handleResearchContactHover}
											onContactRowHover={
												isRowHoverResearchEnabled ? handleContactRowHoverResearch : undefined
											}
											onEventChatRowHover={
												isRowHoverResearchEnabled ? handleEventChatRowHover : undefined
											}
											width={mainContactsPanelWidthPx}
											height={mainContactsPanelHeightPx}
										/>
										{renderRowHoverResearchCard()}
									</div>
								)}
								{view !== 'inbox' &&
									(isSendingUiVisible ? (
										<SendingExpandedList
											width={mainContactsPanelWidthPx}
											height={mainContactsPanelHeightPx}
										/>
									) : isDraftPreviewOpen ? (
										shouldShowPinnedRegenEmailPreview ? (
											<div
												data-draft-review-side-preview
												style={{
													width: '376px',
													height: '587px',
													overflow: 'hidden',
													position: 'relative',
												}}
											>
												<div
													style={{
														position: 'absolute',
														top: 0,
														left: 0,
														// Important: scale the *original* DraftedEmails review canvas (499x703)
														// down into the old DraftsExpandedList slot (376x587). Transforms don't
														// affect layout, so we fix the unscaled canvas size explicitly here to
														// avoid any centering/offset drift.
														width: '499px',
														height: '703px',
														transform: `scale(${376 / 499}, ${587 / 703})`,
														transformOrigin: 'top left',
													}}
												>
													<DraftedEmails
														mainBoxId={undefined}
														contacts={contacts || []}
														selectedDraftIds={draftsTabSelectedIds}
														selectedDraft={selectedDraft}
														setSelectedDraft={setSelectedDraft}
														setIsDraftDialogOpen={setIsDraftDialogOpen}
														handleDraftSelection={handleDraftSelection}
														draftEmails={draftEmailsForView}
														isPendingEmails={isPendingEmails}
														setSelectedDraftIds={setDraftsTabSelectedIds}
														onSend={handleSendDrafts}
														isSendingDisabled={isSendingDisabled}
														isFreeTrial={isFreeTrial || false}
														fromName={fromName}
														fromEmail={fromEmail}
														identity={campaign?.identity ?? null}
														onIdentityUpdate={handleIdentityUpdate}
														subject={form.watch('subject')}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														onDraftHover={setHoveredDraftForSettings}
														goToWriting={goToWriting}
														goToSearch={onGoToSearch}
														goToSent={goToSent}
														goToInbox={goToInbox}
														onRejectDraft={handleRejectDraft}
														onApproveDraft={handleApproveDraft}
														// Disable regen inside the side preview so it stays as an email preview.
														onRegenerateDraft={undefined}
														rejectedDraftIds={rejectedDraftIds}
														approvedDraftIds={approvedDraftIds}
														statusFilter={draftStatusFilter}
														onStatusFilterChange={setDraftStatusFilter}
														hideSendButton
														disableOutsideClickClose
														onDraftReviewCloseOverride={exitSelectedDraftRegenView}
														hideDraftReviewCounter
														hideDraftReviewActionRow
													/>
												</div>
											</div>
										) : (
											<div
												data-row-hover-research-anchor
												style={{
													width: '376px',
													height: '587px',
													position: 'relative',
												}}
											>
												<ContactsExpandedList
													contacts={contactsForContactsExpandedList}
													{...contactsListSupplementalProps}
													drafts={draftEmailsForView}
													{...contactsListTopNavProps}
													isLoading={isContactsLoading}
													campaign={campaign}
													enableUsedContactTooltip={false}
													selectedDraftId={selectedDraft?.id}
													selectedDraftIds={draftsTabSelectedIds}
													onDraftSelectionChange={setDraftsTabSelectedIds}
													onDraftClick={handleDraftPreviewClick}
													onDraftHover={setHoveredDraftForSettings}
													selectedContactIds={contactsTabSelectedIds}
													activelyDraftingContactIds={
														activelyDraftingContactIdsForContactsExpandedList
													}
													onContactSelectionChange={(updater) =>
														setContactsTabSelectedIds((prev) => updater(new Set(prev)))
													}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onContactRowHover={
														isRowHoverResearchEnabled
															? handleContactRowHoverResearch
															: undefined
													}
													onEventChatRowHover={
														isRowHoverResearchEnabled ? handleEventChatRowHover : undefined
													}
													width={376}
													height={587}
													minRows={8}
												/>
												{renderRowHoverResearchCard()}
											</div>
										)
									) : (
										<div
											data-row-hover-research-anchor
											style={{
												width: `${mainContactsPanelWidthPx}px`,
												overflow: 'visible',
												position: 'relative',
											}}
										>
											{pinnedLeftPanelVariant === 'contacts' ? (
												<div>
													{/* While actively batch-drafting in the compact half-screen Write */}
													{/* view, show the live draft preview over the contacts list at the */}
													{/* same 377x597 footprint instead of the contacts list itself. */}
													{view === 'testing' &&
													isCampaignWorkspaceCompact &&
													isBatchDraftingInProgress ? (
														<DraftPreviewExpandedList
															contacts={contacts || []}
															livePreview={liveDraftPreview}
															fallbackDraft={draftPreviewFallbackDraft}
															width={mainContactsPanelWidthPx}
															height={mainContactsPanelHeightPx}
														/>
													) : (
													<ContactsExpandedList
														contacts={contactsForContactsExpandedList}
														{...contactsListSupplementalProps}
														drafts={draftEmailsForView}
														{...contactsListTopNavProps}
														isLoading={isContactsLoading}
														campaign={campaign}
														enableUsedContactTooltip={contentView === 'testing'}
														selectedDraftId={
															contentView === 'drafting' ? selectedDraft?.id : undefined
														}
														selectedDraftIds={
															contentView === 'drafting' ? draftsTabSelectedIds : undefined
														}
														onDraftSelectionChange={
															contentView === 'drafting'
																? setDraftsTabSelectedIds
																: undefined
														}
														onDraftClick={
															contentView === 'drafting' ? handleDraftPreviewClick : undefined
														}
														onDraftHover={
															contentView === 'drafting' ? setHoveredDraftForSettings : undefined
														}
														selectedContactIds={contactsTabSelectedIds}
														activelyDraftingContactIds={
															activelyDraftingContactIdsForContactsExpandedList
														}
														onContactSelectionChange={(updater) =>
															setContactsTabSelectedIds((prev) => updater(new Set(prev)))
														}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														onContactRowHover={
															isRowHoverResearchEnabled
																? handleContactRowHoverResearch
																: undefined
														}
														onEventChatRowHover={
															isRowHoverResearchEnabled ? handleEventChatRowHover : undefined
														}
														onDraftSelected={async (ids) => {
															await handleGenerateDrafts(ids);
														}}
														isDraftDisabled={isGenerationDisabled()}
														isPendingGeneration={isPendingGeneration}
														width={mainContactsPanelWidthPx}
														height={mainContactsPanelHeightPx}
														minRows={8}
														onSearchFromMiniBar={handleMiniContactsSearch}
													/>
													)}
												</div>
											) : (
												<div>
													<MiniEmailStructure
														form={
															isDraftingView
																? draftsSettingsPreviewForm
																: isSentView
																	? sentSettingsPreviewForm
																	: form
														}
														readOnly={isDraftingView || isSentView}
														variant={
															draftsMiniEmailTopHeaderHeight ? 'settings' : undefined
														}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={
															draftsMiniEmailSettingsLabels.secondary
														}
														settingsNameCompanyBgColor={
															draftsMiniEmailSettingsNameCompanyBgColor
														}
														profileFields={profileFieldsForSettings}
														identityProfile={
															campaign?.identity as IdentityProfileFields | null
														}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled()}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={generationTotal}
														hideTopChrome
														hideFooter
														fullWidthMobile
														hideAddTextButtons
														// Match the Writing tab contacts list height (597px) so the left panel stays consistent.
														// Applies on tabs where this pinned panel renders the MiniEmailStructure (Drafts + Sent).
														height={
															view === 'drafting' || view === 'sent'
																? mainContactsPanelHeightPx
																: undefined
														}
														pageFillColor={draftsMiniEmailFillColor}
														topHeaderHeight={draftsMiniEmailTopHeaderHeight}
														topHeaderLabel={draftsMiniEmailTopHeaderLabel}
														hideAllText={
															// Hide all structure text to show chrome-only skeleton:
															// - When the Drafts tab has no drafts
															// - When the Sent tab is in its empty state
															(view === 'drafting' && draftCount === 0) ||
															(view === 'sent' && sentCount === 0)
														}
														onOpenWriting={goToWriting}
													/>
												</div>
											)}
											{renderRowHoverResearchCard()}
										</div>
									))}
									</>
								)}

								{contentView === 'testing' &&
									!isProfileSidePanelOpen &&
									(isPromptInputHovered || isSuggestionBoxHovered) &&
									isCustomInstructionsOpen &&
									(suggestionText1 || suggestionText2) && (
										<div
											onMouseEnter={() => {
												clearSuggestionHoverLeaveTimeout();
												setIsSuggestionBoxHovered(true);
											}}
											onMouseLeave={() => setIsSuggestionBoxHovered(false)}
											style={{
												width: '405px',
												height: '348px',
												position: 'absolute',
												top: '115px',
												left: '-15px',
												zIndex: 30,
												backgroundColor: '#D6EEEF',
												border: '2px solid #000000',
												borderRadius: '7px',
												overflow: 'hidden',
											}}
										>
											<div
												style={{
													height: '28px',
													display: 'flex',
													alignItems: 'center',
													paddingLeft: '9px',
												}}
											>
												<span className="font-inter font-bold text-[12px] leading-none text-black">
													Suggestion
												</span>
											</div>
											{/* Inner box */}
											<div
												style={{
													position: 'absolute',
													top: '26px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '369px',
													height: '25px',
													backgroundColor: '#FFFFFF',
													border: '2px solid #000000',
													borderRadius: '5px',
													boxSizing: 'border-box',
													display: 'flex',
													alignItems: 'center',
													gap: '10px',
													paddingLeft: '8px',
													paddingRight: '8px',
												}}
											>
												{/* Progress bar (223 x 12) */}
												<div
													style={{
														width: '223px',
														height: '12px',
														backgroundColor: '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														overflow: 'hidden',
														flexShrink: 0,
														boxSizing: 'border-box',
														position: 'relative',
													}}
												>
													<div
														style={{
															height: '100%',
															borderRadius: '999px',
															backgroundColor: '#36B24A',
															width: `${promptScoreFillPercent}%`,
															maxWidth: '100%',
															transition: 'width 250ms ease-out',
														}}
													/>
												</div>
												{/* Rating label */}
												<div
													style={{
														fontFamily: 'Inter, system-ui, sans-serif',
														fontWeight: 700,
														fontSize: '12px',
														lineHeight: '14px',
														color: '#000000',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														flex: 1,
														minWidth: 0,
														textAlign: 'right',
													}}
												>
													{promptScoreDisplayLabel}
												</div>
											</div>
											{/* Small box below the first inner box */}
											<div
												onClick={() => {
													if (hasPreviousPrompt) {
														undoUpscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '22px',
													width: '39px',
													height: '32px',
													backgroundColor: '#C2C2C2',
													border: '2px solid #000000',
													borderRadius: '8px',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													cursor: hasPreviousPrompt ? 'pointer' : 'not-allowed',
												}}
											>
												<UndoIcon width="24" height="24" />
											</div>
											{/* Box to the right of the small box */}
											<div
												onClick={() => {
													if (!isUpscalingPrompt) {
														upscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '66px',
													width: '233px',
													height: '32px',
													backgroundColor: '#D7F0FF',
													border: '2px solid #000000',
													borderRadius: '8px',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-between',
													paddingLeft: '10px',
													paddingRight: '10px',
													cursor: isUpscalingPrompt ? 'wait' : 'pointer',
												}}
											>
												<span
													style={{
														fontFamily: 'Inter, system-ui, sans-serif',
														fontSize: '17px',
														fontWeight: 500,
														color: '#000000',
														lineHeight: '1',
													}}
												>
													{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Instructions'}
												</span>
												<div style={{ flexShrink: 0 }}>
													<UpscaleIcon width="24" height="24" />
												</div>
											</div>
											<div
												style={{
													position: 'absolute',
													top: '110px',
													left: '22px',
													fontFamily: 'Inter, system-ui, sans-serif',
													fontWeight: 500,
													fontSize: '17px',
													lineHeight: '20px',
													color: '#000000',
												}}
											>
												Custom Instructions
											</div>
											{/* Box below the two small boxes */}
											<div
												style={{
													position: 'absolute',
													top: '147px', // bottom-aligned: 348 - 17 - (56*3 + 8*2) = 147
													left: '50%',
													transform: 'translateX(-50%)',
													width: '362px',
													height: '56px',
													backgroundColor: '#A6DDE0',
													border: '2px solid #000000',
													borderRadius: '8px',
												}}
											>
												{/* Section indicator */}
												<div
													className="absolute font-inter font-bold tabular-nums"
													style={{
														top: '4.5px',
														left: '5px',
														fontSize: '11.5px',
														color: '#000000',
													}}
												>
													[1]
												</div>
												{/* Inner box */}
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														left: '25px',
														width: '324px',
														height: '48px',
														backgroundColor: '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 8px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '11px',
															lineHeight: '1.3',
															color: '#000000',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
														}}
													>
														{suggestionText1 || ''}
													</div>
												</div>
											</div>
											{/* Second box below */}
											<div
												style={{
													position: 'absolute',
													top: '211px', // 147px + 56px + 8px
													left: '50%',
													transform: 'translateX(-50%)',
													width: '362px',
													height: '56px',
													backgroundColor: '#5BB9CB',
													border: '2px solid #000000',
													borderRadius: '8px',
												}}
											>
												{/* Section indicator */}
												<div
													className="absolute font-inter font-bold tabular-nums"
													style={{
														top: '4.5px',
														left: '5px',
														fontSize: '11.5px',
														color: '#000000',
													}}
												>
													[2]
												</div>
												{/* Inner box */}
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														left: '25px',
														width: '324px',
														height: '48px',
														backgroundColor: '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 8px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '11px',
															lineHeight: '1.3',
															color: '#000000',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
														}}
													>
														{suggestionText2 || ''}
													</div>
												</div>
											</div>
											{/* Third box below */}
											<div
												style={{
													position: 'absolute',
													top: '275px', // 211px + 56px + 8px
													left: '50%',
													transform: 'translateX(-50%)',
													width: '362px',
													height: '56px',
													backgroundColor: '#35859D',
													border: '2px solid #000000',
													borderRadius: '8px',
												}}
											>
												{/* Section indicator */}
												<div
													className="absolute font-inter font-bold tabular-nums"
													style={{
														top: '4.5px',
														left: '5px',
														fontSize: '11.5px',
														color: '#000000',
													}}
												>
													[3]
												</div>
												{/* Inner box */}
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														left: '25px',
														width: '324px',
														height: '48px',
														backgroundColor: '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 8px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '11px',
															lineHeight: '1.3',
															color: '#000000',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
														}}
													>
														{suggestionText3 || ''}
													</div>
												</div>
											</div>
										</div>
									)}
							</div>
						)}

						{/* Shared Research / Test Preview panel to the right of the drafting tables / writing view */}
						{!isMobile &&
							!isCampaignWorkspaceCompact &&
							// Use our *effective* width breakpoints (which account for campaign zoom),
							// rather than Tailwind's `xl:` media query which ignores CSS zoom.
							!isNarrowDesktop &&
							!isNarrowestDesktop &&
							['testing', 'drafting', 'sent', 'search'].includes(view) &&
							!(view === 'search' && hasCampaignSearched) &&
							!(view === 'search' && isSearchTabNarrow) && (
								<div
									className="absolute"
									data-research-panel-container
									style={{
										top: isStandardSidePanelView
											? `${standardSidePanelTopOffsetPx}px`
											: '29px',
										left:
											view === 'search'
												? 'calc(50% + 384px + 32px)'
												: view === 'inbox'
													? isInboxTabNarrow
														? 'calc(50% + 258px + 32px)' // 258px = half of 516px narrow inbox + 32px gap
														: 'calc(50% + 453.5px + 32px)'
													: 'calc(50% + 250px + 32px)',
									}}
								>
									{isBatchDraftingInProgress ? (
										<DraftPreviewExpandedList
											contacts={contacts || []}
											livePreview={liveDraftPreview}
											fallbackDraft={draftPreviewFallbackDraft}
											width={view === 'inbox' ? 259 : 375}
											height={
												isStandardSidePanelView ? standardResearchPanelHeightPx : 670
											}
										/>
									) : contentView === 'testing' && showTestPreview ? (
										<TestPreviewPanel
											setShowTestPreview={setShowTestPreview}
											testMessage={campaign?.testMessage || ''}
											isLoading={Boolean(isTest)}
											onTest={() => {
												handleGenerateTestDrafts();
												setShowTestPreview(true);
											}}
											isDisabled={isGenerationDisabled()}
											isTesting={Boolean(isTest)}
											contact={contacts?.[0] || displayedContactForResearch}
											onKeep={() =>
												handleKeepTestDraft(contacts?.[0] || displayedContactForResearch)
											}
											isKeeping={isKeepingTestDraft}
											keepDisabled={
												!campaign?.testMessage ||
												!(contacts?.[0] || displayedContactForResearch)
											}
											style={{ width: 375, height: 672, marginTop: -8 }}
										/>
									) : (
										<ContactResearchPanel
											contact={displayedContactForResearch}
											hideAllText={
												// Hide all research text to show a chrome-only skeleton:
												// - When the Drafts tab has no drafts
												// - When the Sent tab is in its empty state
												(contentView === 'drafting' && draftCount === 0) ||
												(view === 'sent' && sentCount === 0)
											}
											style={view === 'inbox' ? { width: 259 } : undefined}
											height={
												isStandardSidePanelView
													? standardResearchPanelHeightPx
													: undefined
											}
											boxWidth={view === 'inbox' ? 247 : undefined}
										/>
									)}
								</div>
							)}

						{/* Search Results Panel - replaces Research panel when search has been performed */}
						{!isMobile &&
							view === 'search' &&
							hasCampaignSearched &&
							!isSearching &&
							!isSearchTabNarrow &&
							searchResultsForPanel.length > 0 && (
								<div
									className="absolute flex flex-col"
									style={{
										top: '29px',
										left: 'calc(50% + 384px + 32px)',
										gap: '13px',
									}}
								>
									<CampaignHeaderBox
										campaignId={campaign?.id}
										campaignName={campaign?.name || 'Untitled Campaign'}
										toListNames={toListNames}
										fromName={fromName}
										contactsCount={contactsCount}
										draftCount={draftCount}
										sentCount={sentCount}
										draftingProgress={draftingProgressForHeader}
										onFromClick={onOpenIdentityDialog}
										onDraftsClick={goToDrafting}
										onSentClick={goToSent}
										width={396}
									/>
									<div
										className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
										style={{
											width: '396px',
											height: '703px',
										}}
										onMouseOver={handleRailContainerMouseOver}
										onMouseOut={handleRailContainerMouseOut}
									>
										{/* Fixed header section - 52px */}
										<div
											className="flex-shrink-0 flex flex-col justify-center px-[6px]"
											style={{ height: '52px' }}
										>
											<div className="flex flex-col">
												<span className="font-inter text-[11px] text-black text-center">
													{selectedSearchResultsCount} selected
												</span>
												<button
													type="button"
													onClick={() => {
														if (areAllSearchResultsSelected) {
															setSearchResultsSelectedContacts([]);
														} else {
															setSearchResultsSelectedContacts(searchResultsForPanelIds);
														}
													}}
													className="font-secondary text-[11px] font-medium text-black hover:underline text-right pr-1"
												>
													{areAllSearchResultsSelected ? 'Deselect all' : 'Select all'}
												</button>
											</div>
										</div>
										{/* Scrollable contact list */}
										<CustomScrollbar
											className="flex-1 min-h-0"
											contentClassName="px-[6px] pb-[14px]"
											thumbWidth={2}
											thumbColor="#000000"
											trackColor="transparent"
											offsetRight={-6}
											disableOverflowClass
										>
											{/* Contact list */}
											<div className="space-y-[7px]">
												{searchResultsForPanel.map((contact) => {
													const isSelected = searchResultsSelectedContacts.includes(
														contact.id
													);
													const firstName = contact.firstName || '';
													const lastName = contact.lastName || '';
													const fullName =
														contact.name || `${firstName} ${lastName}`.trim();
													const company = contact.company || '';
													const headline = contact.headline || contact.title || '';
													const stateAbbr =
														getStateAbbreviation(contact.state || '') || '';
													const city = contact.city || '';

													return (
														<div
															key={contact.id}
															data-contact-id={contact.id}
															className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-[#ABABAB] select-none"
															style={{
																backgroundColor: isSelected ? '#C9EAFF' : '#FFFFFF',
															}}
															onClick={() => {
																if (isSelected) {
																	setSearchResultsSelectedContacts(
																		searchResultsSelectedContacts.filter(
																			(id) => id !== contact.id
																		)
																	);
																} else {
																	setSearchResultsSelectedContacts([
																		...searchResultsSelectedContacts,
																		contact.id,
																	]);
																}
															}}
														>
															{fullName ? (
																<>
																	{/* Top Left - Name */}
																	<div className="pl-3 pr-1 flex items-center h-[23px]">
																		<div className="font-bold text-[11px] w-full truncate leading-tight">
																			{fullName}
																		</div>
																	</div>
																	{/* Top Right - Title/Headline */}
																	<div className="pr-2 pl-1 flex items-center h-[23px]">
																		{headline ? (
																			<div
																				className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																				style={{
																					backgroundColor: isRestaurantTitle(headline)
																						? '#C3FBD1'
																						: isCoffeeShopTitle(headline)
																							? '#D6F1BD'
																							: isMusicVenueTitle(headline)
																								? '#B7E5FF'
																								: isMusicFestivalTitle(headline)
																									? '#C1D6FF'
																									: isWeddingPlannerTitle(headline) ||
																										  isWeddingVenueTitle(headline)
																										? '#FFF2BC'
																										: isWineBeerSpiritsTitle(headline)
																											? '#BFC4FF'
																											: '#E8EFFF',
																				}}
																			>
																				{isRestaurantTitle(headline) && (
																					<RestaurantsIcon size={12} />
																				)}
																				{isCoffeeShopTitle(headline) && (
																					<CoffeeShopsIcon size={7} />
																				)}
																				{isMusicVenueTitle(headline) && (
																					<MusicVenuesIcon
																						size={12}
																						className="flex-shrink-0"
																					/>
																				)}
																				{isMusicFestivalTitle(headline) && (
																					<FestivalsIcon
																						size={12}
																						className="flex-shrink-0"
																					/>
																				)}
																				{(isWeddingPlannerTitle(headline) ||
																					isWeddingVenueTitle(headline)) && (
																					<WeddingPlannersIcon size={12} />
																				)}
																				{isWineBeerSpiritsTitle(headline) && (
																					<WineBeerSpiritsIcon
																						size={12}
																						className="flex-shrink-0"
																					/>
																				)}
																				<span className="text-[10px] text-black leading-none truncate">
																					{isRestaurantTitle(headline)
																						? 'Restaurant'
																						: isCoffeeShopTitle(headline)
																							? 'Coffee Shop'
																							: isMusicVenueTitle(headline)
																								? 'Music Venue'
																								: isMusicFestivalTitle(headline)
																									? 'Music Festival'
																									: isWeddingPlannerTitle(headline)
																										? 'Wedding Planner'
																										: isWeddingVenueTitle(headline)
																											? 'Wedding Venue'
																											: isWineBeerSpiritsTitle(headline)
																												? getWineBeerSpiritsLabel(
																														headline
																													)
																												: headline}
																				</span>
																			</div>
																		) : (
																			<div className="w-full" />
																		)}
																	</div>
																	{/* Bottom Left - Company */}
																	<div className="pl-3 pr-1 flex items-center h-[22px]">
																		<div className="text-[11px] text-black w-full truncate leading-tight">
																			{company}
																		</div>
																	</div>
																	{/* Bottom Right - Location */}
																	<div className="pr-2 pl-1 flex items-center h-[22px]">
																		{city || stateAbbr ? (
																			<div className="flex items-center gap-1 w-full">
																				{stateAbbr && (
																					<span
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[stateAbbr] ||
																								'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{stateAbbr}
																					</span>
																				)}
																				{city && (
																					<span className="text-[10px] text-black leading-none truncate">
																						{city}
																					</span>
																				)}
																			</div>
																		) : (
																			<div className="w-full" />
																		)}
																	</div>
																</>
															) : (
																<>
																	{/* No name - Company spans left column */}
																	<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
																		<div className="font-bold text-[11px] w-full truncate leading-tight">
																			{company || '—'}
																		</div>
																	</div>
																	{/* Top Right - Title/Headline */}
																	<div className="pr-2 pl-1 flex items-center h-[23px]">
																		{headline ? (
																			<div
																				className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																				style={{
																					backgroundColor: isRestaurantTitle(headline)
																						? '#C3FBD1'
																						: isCoffeeShopTitle(headline)
																							? '#D6F1BD'
																							: isMusicVenueTitle(headline)
																								? '#B7E5FF'
																								: isMusicFestivalTitle(headline)
																									? '#C1D6FF'
																									: isWeddingPlannerTitle(headline) ||
																										  isWeddingVenueTitle(headline)
																										? '#FFF2BC'
																										: '#E8EFFF',
																				}}
																			>
																				{isRestaurantTitle(headline) && (
																					<RestaurantsIcon size={12} />
																				)}
																				{isCoffeeShopTitle(headline) && (
																					<CoffeeShopsIcon size={7} />
																				)}
																				{isMusicVenueTitle(headline) && (
																					<MusicVenuesIcon
																						size={12}
																						className="flex-shrink-0"
																					/>
																				)}
																				{isMusicFestivalTitle(headline) && (
																					<FestivalsIcon
																						size={12}
																						className="flex-shrink-0"
																					/>
																				)}
																				{(isWeddingPlannerTitle(headline) ||
																					isWeddingVenueTitle(headline)) && (
																					<WeddingPlannersIcon size={12} />
																				)}
																				<span className="text-[10px] text-black leading-none truncate">
																					{isRestaurantTitle(headline)
																						? 'Restaurant'
																						: isCoffeeShopTitle(headline)
																							? 'Coffee Shop'
																							: isMusicVenueTitle(headline)
																								? 'Music Venue'
																								: isMusicFestivalTitle(headline)
																									? 'Music Festival'
																									: isWeddingPlannerTitle(headline)
																										? 'Wedding Planner'
																										: isWeddingVenueTitle(headline)
																											? 'Wedding Venue'
																											: headline}
																				</span>
																			</div>
																		) : (
																			<div className="w-full" />
																		)}
																	</div>
																	{/* Bottom Right - Location */}
																	<div className="pr-2 pl-1 flex items-center h-[22px]">
																		{city || stateAbbr ? (
																			<div className="flex items-center gap-1 w-full">
																				{stateAbbr && (
																					<span
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[stateAbbr] ||
																								'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{stateAbbr}
																					</span>
																				)}
																				{city && (
																					<span className="text-[10px] text-black leading-none truncate">
																						{city}
																					</span>
																				)}
																			</div>
																		) : (
																			<div className="w-full" />
																		)}
																	</div>
																</>
															)}
														</div>
													);
												})}
											</div>
										</CustomScrollbar>

										{/* Footer with Add to Campaign button - only shown when contacts are selected */}
										{searchResultsSelectedContacts.length > 0 && (
											<div className="w-full h-[50px] flex-shrink-0 bg-[#D8E5FB] flex items-center justify-center px-3">
												<div className="relative flex w-full h-[36px] rounded-[6px] border-2 border-black overflow-hidden">
													{/* Absolutely centered text */}
													<span
														className="absolute inset-0 flex items-center justify-center text-white font-serif font-medium text-[15px] pointer-events-none"
														style={{ zIndex: 1 }}
													>
														{isAddingToCampaign ? (
															<>
																<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
																Adding...
															</>
														) : (
															'Add to Campaign'
														)}
													</span>
													{/* Clickable left area */}
													<button
														type="button"
														onClick={handleAddSearchResultsToCampaign}
														disabled={
															searchResultsSelectedContacts.length === 0 ||
															isAddingToCampaign
														}
														className="flex-1 bg-[#62A967] hover:bg-[#529957] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													/>
													<div
														className="w-[2px]"
														style={{ backgroundColor: '#349A37', zIndex: 2 }}
													/>
													<button
														type="button"
														onClick={() => {
															if (!areAllSearchResultsSelected) {
																setSearchResultsSelectedContacts(
																	searchResultsForPanelIds
																);
															}
														}}
														className="w-[50px] bg-[#7AD47A] hover:bg-[#6AC46A] text-black font-inter text-[13px] flex items-center justify-center transition-colors"
														style={{ zIndex: 2 }}
													>
														All
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

					{view === 'overview' && (
						<div className="relative w-full min-h-[720px]">
							{shouldShowOverviewRightRail && (
								<div
									data-campaign-interactive-surface
									data-campaign-overview-right-rail="true"
									className="fixed flex flex-col"
									style={{
										left: overviewRightRailPos
											? `${overviewRightRailPos.leftPx}px`
											: 'calc(50% + 250px + 32px)',
										top: overviewRightRailPos ? `${overviewRightRailPos.topPx}px` : '72px',
										width: `${OVERVIEW_RIGHT_RAIL_WIDTH_PX}px`,
										zIndex: 130,
										gap: shouldShowOverviewRightRailSearchPanel ? '0px' : '16px',
									}}
									onMouseOver={handleRailContainerMouseOver}
									onMouseOut={handleRailContainerMouseOut}
								>
									{shouldShowOverviewRightRailSearchPanel ? (
										<div
											className="flex flex-col gap-[9px] pointer-events-auto"
											style={{
												width: '433px',
												height: 800,
												maxHeight: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px) - 20px)',
												overflow: 'hidden',
												transform: 'scale(0.95)',
												transformOrigin: 'top right',
											}}
										>
											{/* Selection sub-panel — appears once at least one contact is selected. */}
											{overviewRightRailSelectedContacts.length > 0 && (
												<div
													className="flex flex-col flex-shrink-0"
													style={{
														maxHeight: '342px',
														backgroundColor: 'rgba(214, 33, 39, 0.518)',
														border: '3px solid #000',
														borderRadius: '8px',
														overflow: 'hidden',
													}}
												>
													<div
														className="w-full h-[77px] flex-shrink-0 relative"
														style={{ backgroundColor: '#D66B6F', borderBottom: '2px solid #000' }}
													>
														<div
															className="absolute left-1/2 top-[6px] -translate-x-1/2 flex items-center pl-[12px] pr-[8px] gap-[6px]"
															style={{
																width: '419px',
																height: '33px',
																borderRadius: '8px',
																border: '2px solid #000',
																background: 'linear-gradient(90deg, #ADFFC2 0%, #EFFFF3 100%)',
															}}
														>
															<span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap font-inter text-[13px] font-semibold text-black">
																{overviewRightRailSearchText}
															</span>
															<button
																type="button"
																onClick={() => onClearOverviewRightRailSearch?.()}
																aria-label="Clear search"
																className="flex-shrink-0 flex items-center justify-center w-[24.927px] h-[23.147px] rounded-[5.342px] bg-[#ABABAB] opacity-80 hover:opacity-100 text-white transition-opacity"
															>
																<span className="text-[16px] leading-none -translate-y-[1px]">×</span>
															</button>
														</div>
														<span className="absolute left-[10px] top-[58px] -translate-y-1/2 font-secondary text-[13px] font-medium text-black">
															Selection
														</span>
														<span className="absolute left-1/2 top-[58px] -translate-x-1/2 -translate-y-1/2 font-inter text-[13px] font-medium text-black">
															{overviewRightRailSelectedContacts.length}/
															{overviewRightRailFilteredContacts.length} selected
														</span>
														<button
															type="button"
															onClick={() => {
																setOverviewRightRailSelectedContacts((prev) => {
																	if (
																		prev.length === overviewRightRailFilteredContacts.length &&
																		overviewRightRailFilteredContacts.every((c) =>
																			prev.includes(c.id)
																		)
																	) {
																		return [];
																	}
																	return overviewRightRailFilteredContacts.map((c) => c.id);
																});
															}}
															className="font-secondary text-[12px] font-medium text-black absolute right-[10px] top-[58px] -translate-y-1/2 hover:underline"
														>
															{overviewRightRailSelectedContacts.length ===
																overviewRightRailFilteredContacts.length &&
																overviewRightRailFilteredContacts.length > 0
																? 'Deselect All'
																: 'Select all'}
														</button>
													</div>
													<CustomScrollbar
														className="flex-1 min-h-0"
														contentClassName="p-[6px] pb-[14px] space-y-[7px]"
														thumbWidth={2}
														thumbColor="#000000"
														trackColor="transparent"
														offsetRight={-6}
														disableOverflowClass
													>
														<div className="space-y-[7px]">
															{overviewRightRailSelectedContactsFull.map(
																renderOverviewRightRailDesktopRow
															)}
														</div>
													</CustomScrollbar>
												</div>
											)}

											{/* Search Results sub-panel — always present; flexes to fill remaining height. */}
											<div
												className="flex flex-col flex-1 min-h-0"
												style={{
													backgroundColor: 'rgba(214, 33, 39, 0.518)',
													border: '1px solid #000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
												<div
													className="w-full h-[50px] flex-shrink-0 flex items-center justify-center px-4 relative"
													style={{
														backgroundColor: '#E97B7F',
														border: '2px solid #000',
														borderRadius: '8px 8px 0 0',
													}}
											>
												<span className="absolute left-[13px] top-[2px] font-inter text-[15px] font-semibold leading-[20px] text-center text-black">
													Search Results
												</span>
												<div
													className="absolute left-[14px] right-[10px] bottom-[7px] flex items-center gap-[12px] overflow-hidden"
													style={{
														maskImage:
															'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
														WebkitMaskImage:
															'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
													}}
												>
													{[
														{
															key: 'restaurants',
															pillColor: '#C3FBD1',
															label: 'Restaurants',
															Icon: RestaurantsIcon,
															iconSize: 11,
														},
														{
															key: 'coffee-shops',
															pillColor: '#D6F1BD',
															label: 'Coffee',
															Icon: CoffeeShopsIcon,
															iconSize: 6,
														},
														{
															key: 'music-venues',
															pillColor: '#B7E5FF',
															label: 'Music Venues',
															Icon: MusicVenuesIcon,
															iconSize: 11,
														},
														{
															key: 'festivals',
															pillColor: '#C1D6FF',
															label: 'Festivals',
															Icon: FestivalsIcon,
															iconSize: 11,
														},
														{
															key: 'wedding-planners',
															pillColor: '#FFF8DC',
															label: 'Weddings',
															Icon: WeddingPlannersIcon,
															iconSize: 11,
														},
														{
															key: 'wine-beer-spirits',
															pillColor: '#BFC4FF',
															label: 'Wineries',
															Icon: WineBeerSpiritsIcon,
															iconSize: 11,
														},
														{
															key: 'radio-stations',
															pillColor: '#C5F0CC',
															label: 'Radio',
															Icon: RadioStationsIcon,
															iconSize: 11,
														},
													]
															.filter(({ key }) => overviewRightRailVisibleCategoryKeys.has(key))
															.map(({ key, pillColor, label, Icon, iconSize }) => (
																<div
																	key={key}
																	className="h-[15px] rounded-[7px] px-2 flex items-center gap-1 border border-black flex-shrink-0 cursor-pointer"
																	style={{ backgroundColor: pillColor }}
																	onClick={() => {
																		setOverviewRightRailSelectedCategoryChips((prev) => {
																			const next = new Set(prev);
																			if (next.has(key)) next.delete(key);
																			else next.add(key);
																			return next;
																		});
																	}}
																>
																	<Icon size={iconSize} className="flex-shrink-0" />
																	<span className="text-[10px] text-black leading-none whitespace-nowrap">
																		{label}
																	</span>
																</div>
															))}
												</div>
											</div>
											<div
												className="flex flex-col flex-1 min-h-0 relative"
												style={{
													borderLeft: '3px solid #5B7469',
													borderRight: '3px solid #5B7469',
													borderBottom: '3px solid #5B7469',
													borderRadius: '0 0 8px 8px',
												}}
											>
												<CustomScrollbar
													className="flex-1 min-h-0"
													contentClassName="p-[6px] pb-[78px] space-y-[7px]"
													thumbWidth={2}
													thumbColor="#000000"
													trackColor="transparent"
													offsetRight={-6}
													disableOverflowClass
												>
													{overviewRightRailSearchContactsLoading ? (
														<MapResultsPanelSkeleton
															variant="desktop"
															rows={Math.max(
																overviewRightRailUnselectedContactsFiltered.length,
																14
															)}
														/>
													) : overviewRightRailFilteredContacts.length === 0 ? (
														<div className="flex flex-col">
															<button
																type="button"
																onClick={() =>
																	handleMiniContactsSearch({
																		why: '',
																		what: overviewRightRailSearchText,
																		where: '',
																	})
																}
																className="mx-auto mt-[24px] flex-shrink-0 rounded-full bg-white px-[18px] py-[9px] font-inter text-[15px] font-semibold leading-none text-black shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-colors hover:bg-[#F3F4F6]"
															>
																Add new contacts that match search
															</button>
															<div
																aria-hidden="true"
																className="mt-[28px] space-y-[7px] pointer-events-none select-none"
															>
																{Array.from({ length: 7 }, (_, index) => {
																	const ghost =
																		OVERVIEW_NO_RESULTS_GHOST_CONTACTS[
																			index % OVERVIEW_NO_RESULTS_GHOST_CONTACTS.length
																		];
																	return (
																		<div
																			key={index}
																			className="grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] bg-white"
																			style={{ opacity: 0.85 - (index * 0.7) / 6 }}
																		>
																			<div className="pl-3 pr-1 flex items-center h-[23px]">
																				<div className="font-bold text-[11px] w-full truncate leading-tight">
																					{ghost.name}
																				</div>
																			</div>
																			<div className="pr-2 pl-1 flex items-center h-[23px]">
																				<div
																					className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																					style={{ backgroundColor: ghost.chipColor }}
																				>
																					{ghost.category === 'coffee-shops' ? (
																						<CoffeeShopsIcon size={7} />
																					) : (
																						<RestaurantsIcon size={12} className="flex-shrink-0" />
																					)}
																					<span className="text-[10px] text-black leading-none truncate">
																						{ghost.chipLabel}
																					</span>
																				</div>
																			</div>
																			<div className="pl-3 pr-1 flex items-center h-[22px]">
																				<div className="text-[11px] text-black w-full truncate leading-tight">
																					{ghost.company}
																				</div>
																			</div>
																			<div className="pr-2 pl-1 flex items-center h-[22px]">
																				<div className="flex items-center gap-1 w-full">
																					<span
																						className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																						style={{
																							backgroundColor:
																								stateBadgeColorMap[ghost.stateAbbr] || 'transparent',
																							borderColor: '#000000',
																						}}
																					>
																						{ghost.stateAbbr}
																					</span>
																					<span className="text-[10px] text-black leading-none truncate">
																						{ghost.city}
																					</span>
																				</div>
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													) : overviewRightRailUnselectedContactsFiltered.length === 0 ? (
														<div className="w-full h-full flex items-center justify-center p-6">
															<span className="font-secondary font-bold text-[16px] leading-tight text-black text-center">
																No results in this campaign.
															</span>
														</div>
													) : (
														<div className="space-y-[7px]">
															{overviewRightRailUnselectedContactsFiltered.map(
																renderOverviewRightRailDesktopRow
															)}
														</div>
													)}
												</CustomScrollbar>
												<div
													className="absolute left-1/2 -translate-x-1/2 bottom-[9px] flex items-center gap-[2px] pl-[4px]"
													style={{
														width: '420px',
														height: '55px',
														borderRadius: '9.86px',
														border: '1.446px solid #000',
														backgroundColor: '#65A1B9',
													}}
												>
													{[
														{
															key: 'music-venues',
															color: '#71C9FD',
															Icon: MusicVenuesIcon,
															size: 32,
														},
														{
															key: 'wine-beer-spirits',
															color: '#80AAFF',
															Icon: WineBeerSpiritsIcon,
															size: 25,
														},
														{
															key: 'restaurants',
															color: '#77DD91',
															Icon: RestaurantsIcon,
															size: 32,
														},
														{
															key: 'coffee-shops',
															color: '#A9DE78',
															Icon: CoffeeShopsIcon,
															size: 18,
														},
														{
															key: 'wedding-planners',
															color: '#EED56E',
															Icon: WeddingPlannersIcon,
															size: 30,
														},
														{
															key: 'festivals',
															color: '#80AAFF',
															Icon: FestivalsIcon,
															size: 32,
														},
														{
															key: 'radio-stations',
															color: '#56DA73',
															Icon: RadioStationsIcon,
															size: 32,
														},
													]
															.filter(({ key }) => overviewRightRailCategoryKeys.has(key))
															.map(({ key, color, Icon, size }) => {
																const isSelected =
																	overviewRightRailSelectedCategoryChips.has(key);
																return (
																	<div
																		key={key}
																		className="flex items-center justify-center flex-shrink-0 cursor-pointer"
																		style={{
																			width: 45,
																			height: 45,
																			backgroundColor: isSelected ? 'transparent' : color,
																			borderRadius: 6,
																			border: isSelected
																				? `2px solid ${color}`
																				: '1px solid #000',
																		}}
																		onClick={() => {
																			setOverviewRightRailSelectedCategoryChips((prev) => {
																				const next = new Set(prev);
																				if (next.has(key)) next.delete(key);
																				else next.add(key);
																				return next;
																			});
																		}}
																	>
																		<Icon
																			size={size}
																			innerFill={isSelected ? color : 'white'}
																		/>
																	</div>
																);
															})}
													</div>
											</div>
										</div>
									</div>
									) : (
											<>
												{/* Mini Campaigns table */}
												<div
													style={{
														display: 'flex',
														width: '371px',
														height: '135px',
														justifyContent: 'center',
														alignItems: 'center',
														position: 'relative',
													}}
												>
													<CampaignsTableMini
														currentCampaignId={campaign?.id}
														onSelectCampaign={(id) =>
															router.push(`${urls.murmur.campaign.detail(id)}?tab=all`)
														}
													/>
												</div>

												{/* Mini Strategy box */}
												<div
													style={{
														width: '369px',
														height: '486px',
														position: 'relative',
														overflow: 'hidden',
													}}
												>
													<div aria-hidden style={{ pointerEvents: 'none' }}>
														<CampaignOverviewStrategyBox />
													</div>
													<div className="absolute inset-0" style={{ cursor: 'default' }} />
												</div>
											</>
									)}
								</div>
							)}
							{shouldDockOverviewContacts && (
							<div
								data-campaign-interactive-surface
								className={cn(
									'flex flex-col',
									shouldDockOverviewContacts
										? 'fixed'
										: !isNarrowDesktop && !isNarrowestDesktop
											? 'absolute'
											: undefined
								)}
								style={{
									...(shouldDockOverviewContacts && overviewContactsDockPos
										? {
												left: `${overviewContactsDockPos.leftPx}px`,
												top: `${overviewContactsDockPos.topPx}px`,
												width: `${mainContactsPanelWidthPx}px`,
												zIndex: 130,
											}
										: isNarrowDesktop || isNarrowestDesktop
											? {
													margin: '0 auto',
													width: `${mainContactsPanelWidthPx}px`,
												}
											: {
													left: '96px',
													top: '0',
													width: `${mainContactsPanelWidthPx}px`,
											}),
									gap: '16px',
									...(shouldDockOverviewContacts
										? {
												transform: `scale(${OVERVIEW_CONTACTS_DOCK_SCALE})`,
												transformOrigin: 'top left',
											}
										: {}),
									...(shouldDockOverviewContacts && !overviewContactsDockPos
										? {
												opacity: 0,
												pointerEvents: 'none',
											}
										: {}),
								}}
							>
									{!hideHeaderBox && (
										<CampaignHeaderBox
											campaignId={campaign?.id}
											campaignName={campaign?.name || 'Untitled Campaign'}
											toListNames={toListNames}
											fromName={fromName}
											contactsCount={contactsCount}
											draftCount={draftCount}
											sentCount={sentCount}
											draftingProgress={draftingProgressForHeader}
											onFromClick={onOpenIdentityDialog}
											onDraftsClick={goToDrafting}
											onSentClick={goToSent}
										/>
									)}
									<div
										style={{
											width: `${mainContactsPanelWidthPx}px`,
											height: `${mainContactsPanelHeightPx}px`,
											overflow: 'visible',
										}}
									>
										<ContactsExpandedList
											contacts={contactsForContactsExpandedList}
											{...contactsListSupplementalProps}
											{...contactsListTopNavProps}
											isLoading={isContactsLoading}
											campaign={campaign}
											enableUsedContactTooltip={false}
											selectedContactIds={contactsTabSelectedIds}
											activelyDraftingContactIds={
												activelyDraftingContactIdsForContactsExpandedList
											}
											onContactSelectionChange={(updater) =>
												setContactsTabSelectedIds((prev) => updater(new Set(prev)))
											}
											onContactClick={handleResearchContactClick}
											onContactHover={handleResearchContactHover}
											onDraftSelected={async (ids) => {
												await handleGenerateDrafts(ids);
											}}
											isDraftDisabled={isGenerationDisabled()}
											isPendingGeneration={isPendingGeneration}
											width={mainContactsPanelWidthPx}
											height={mainContactsPanelHeightPx}
											minRows={8}
											onSearchFromMiniBar={handleMiniContactsSearch}
										/>
									</div>
								</div>
							)}
							</div>
						)}

						{contentView === 'testing' && (
							<div className="relative">
								{/* Narrow desktop: grouped layout with left panel + writing box centered together */}
								{isNarrowDesktop ? (
									<div className="flex flex-col items-center">
										{/* Row with both columns */}
										<div className="flex flex-row items-start justify-center gap-[10px]">
											{/* Left column: Campaign Header + Contacts + Research */}
											<div
												data-campaign-interactive-surface
												className="flex flex-col"
												style={{ gap: '10px' }}
											>
										{isProfileSidePanelOpen ? (
							<ProfileSidePanelBox
								profileName={profileSidePanelName}
								profileGenre={profileSidePanelGenre}
								profileArea={profileSidePanelArea}
								profilePerformingName={profileSidePanelPerformingName}
								profileBio={profileSidePanelBio}
								onProfileNameUpdate={(name) => handleIdentityUpdate({ name })}
								onProfileGenreUpdate={(genre) => handleIdentityUpdate({ genre })}
								onProfileAreaUpdate={(area) => handleIdentityUpdate({ area })}
								onProfilePerformingNameUpdate={(bandName) =>
									handleIdentityUpdate({ bandName })
								}
								onProfileBioUpdate={(bio) => handleIdentityUpdate({ bio })}
							/>
												) : (
													<>
														<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													draftingProgress={draftingProgressForHeader}
													onFromClick={onOpenIdentityDialog}
													onDraftsClick={goToDrafting}
													onSentClick={goToSent}
													width={330}
												/>
												{/* Compact Contacts table */}
												<div
													style={{
														width: '330px',
														height: '263px',
														overflow: 'visible',
													}}
												>
													{isSendingUiVisible ? (
														<SendingExpandedList width={330} height={263} />
													) : (
													<ContactsExpandedList
														contacts={contactsForContactsExpandedList}
														{...contactsListSupplementalProps}
														{...contactsListTopNavProps}
														isLoading={isContactsLoading}
														campaign={campaign}
														enableUsedContactTooltip={view === 'testing'}
														selectedContactIds={contactsTabSelectedIds}
														activelyDraftingContactIds={
															activelyDraftingContactIdsForContactsExpandedList
														}
														onContactSelectionChange={(updater) =>
															setContactsTabSelectedIds((prev) => updater(new Set(prev)))
														}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														onDraftSelected={async (ids) => {
															await handleGenerateDrafts(ids);
														}}
														isDraftDisabled={isGenerationDisabled()}
														isPendingGeneration={isPendingGeneration}
														width={330}
														height={263}
														minRows={5}
														onSearchFromMiniBar={handleMiniContactsSearch}
													/>
													)}
												</div>
												{/* Compact Research panel */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={330}
														height={347}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={contactsAvailableForDrafting.length === 0}
														hideSummaryIfBullets={true}
														height={347}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
												</>
											)}
										</div>
											{/* Right column: Writing box */}
											<div data-campaign-interactive-surface>
												<HybridPromptInput
													trackFocusedField={trackFocusedField}
													testMessage={campaign?.testMessage}
													handleGenerateTestDrafts={handleGenerateTestDrafts}
													isGenerationDisabled={isGenerationDisabled}
													isPendingGeneration={isPendingGeneration}
													isTest={isTest}
													contact={contacts?.[0]}
													onGoToDrafting={goToDrafting}
													onGoToInbox={goToInbox}
													onTestPreviewToggle={handleTestPreviewToggle}
													onKeepTestDraft={() =>
														handleKeepTestDraft(contacts?.[0] || null)
													}
													isKeepingTestDraft={isKeepingTestDraft}
													draftCount={contactsTabSelectedIds.size}
													onDraftClick={async () => {
														if (contactsTabSelectedIds.size === 0) {
															toast.error('Select at least one contact to draft messages.');
															return;
														}
														await handleGenerateDrafts(
															Array.from(contactsTabSelectedIds.values())
														);
													}}
													isDraftDisabled={contactsTabSelectedIds.size === 0}
													onSelectAllContacts={handleSelectAllContacts}
													isAllContactsSelected={areAllContactsSelected}
													totalContactCount={contactsAvailableForDrafting.length}
													onGetSuggestions={handleGetSuggestions}
													onUpscalePrompt={upscalePrompt}
													isUpscalingPrompt={isUpscalingPrompt}
													promptQualityScore={promptQualityScore}
													promptQualityLabel={promptQualityLabel}
													hasPreviousPrompt={hasPreviousPrompt}
													onUndoUpscalePrompt={undoUpscalePrompt}
													onHoverChange={handlePromptInputHoverChange}
												onCustomInstructionsOpenChange={setIsCustomInstructionsOpen}
												hideDraftButton={true}
												identity={campaign?.identity}
												onIdentityUpdate={handleIdentityUpdate}
												onProfilePanelOpen={
													shouldUseProfileSidePanel ? handleOpenProfileSidePanel : undefined
												}
												autoOpenProfileTabWhenIncomplete={
													props.autoOpenProfileTabWhenIncomplete
												}
											/>
											</div>
										</div>
										{/* Draft button with arrows - spans full width below both columns */}
										{!shouldRenderWriteBottomDraftBar && (
											<div className="mt-4 w-full">
											<div className="flex items-center justify-center gap-[29px] w-full">
												{/* Left arrow */}
												<button
													type="button"
													data-campaign-interactive-surface
													onClick={goToPreviousTab}
													className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
													aria-label="Previous tab"
												>
													<LeftArrow width="20" height="39" />
												</button>
												{/* Draft button container */}
												<div
													ref={draftButtonContainerRef}
													data-draft-button-container
													className="group relative h-[40px] flex-1"
													style={{ maxWidth: '691px' }}
												>
													{contactsTabSelectedIds.size > 0 || areAllContactsSelected ? (
														// Animated draft button with expanding "All" state
														<button
															type="button"
															onClick={async () => {
																if (contactsTabSelectedIds.size === 0) {
																	toast.error(
																		'Select at least one contact to draft messages.'
																	);
																	return;
																}
																await handleGenerateDrafts(
																	Array.from(contactsTabSelectedIds.values())
																);
															}}
															disabled={contactsTabSelectedIds.size === 0}
															className={cn(
																'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] relative overflow-hidden transition-colors duration-300',
																contactsTabSelectedIds.size === 0
																	? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																	: areAllContactsSelected
																		? 'bg-[#4DC669] border-black hover:bg-[#45B85F] cursor-pointer'
																		: 'bg-[#C7F2C9] border-[#349A37] hover:bg-[#B9E7BC] cursor-pointer'
															)}
														>
															{/* Normal text - fades out when All selected */}
															<span
																className={cn(
																	'transition-opacity duration-300',
																	areAllContactsSelected ? 'opacity-0' : 'opacity-100'
																)}
															>
																{isDraftQueueActive
																	? 'Add Emails to Queue'
																	: `Draft ${contactsTabSelectedIds.size} ${
																			contactsTabSelectedIds.size === 1
																				? 'Contact'
																				: 'Contacts'
																		}`}
															</span>
															{/* "All" text - fades in when All selected */}
															<span
																className={cn(
																	'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
																	areAllContactsSelected ? 'opacity-100' : 'opacity-0'
																)}
															>
																{isDraftQueueActive ? (
																	'Add Emails to Queue'
																) : (
																	<>
																		Draft <span className="font-bold mx-1">All</span>{' '}
																		{contactsAvailableForDrafting.length} Contacts
																	</>
																)}
															</span>
															{/* Expanding green overlay from right */}
															<div
																className={cn(
																	'absolute top-0 bottom-0 right-0 bg-[#4DC669] transition-all duration-300 ease-out',
																	areAllContactsSelected
																		? 'w-full rounded-[1px]'
																		: 'w-[62px] rounded-r-[1px]'
																)}
																style={{
																	opacity: areAllContactsSelected ? 0 : 1,
																	transitionProperty: 'width, opacity',
																}}
															/>
														</button>
													) : (
														<div className="relative w-full h-full rounded-[4px] border-[3px] border-transparent overflow-hidden transition-colors group-hover:bg-[#EEF5EF] group-hover:border-black">
															<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px] cursor-default">
																Select Contacts and Draft Emails
															</div>
															<button
																type="button"
																aria-label="Select all contacts"
																className="absolute right-0 top-0 bottom-0 w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
																onClick={handleSelectAllContacts}
															>
																<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black" />
																All
															</button>
														</div>
													)}
													{/* "All" button overlay - only visible when not all selected */}
													{(contactsTabSelectedIds.size > 0 || areAllContactsSelected) &&
														!areAllContactsSelected && (
															<button
																type="button"
																className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
																onClick={(e) => {
																	e.stopPropagation();
																	handleSelectAllContacts();
																}}
															>
																All
															</button>
														)}
												</div>
												{/* Right arrow */}
												<button
													type="button"
													data-campaign-interactive-surface
													onClick={goToNextTab}
													className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
													aria-label="Next tab"
												>
													<RightArrow width="20" height="39" />
												</button>
											</div>
											</div>
										)}
									</div>
								) : (
									/* Regular centered layout for wider viewports, or narrowest breakpoint with contacts below */
									<div className="flex flex-col items-center">
										<HybridPromptInput
											trackFocusedField={trackFocusedField}
											testMessage={campaign?.testMessage}
											handleGenerateTestDrafts={handleGenerateTestDrafts}
											isGenerationDisabled={isGenerationDisabled}
											isPendingGeneration={isPendingGeneration}
											isTest={isTest}
											contact={contacts?.[0]}
											onGoToDrafting={goToDrafting}
											onGoToInbox={goToInbox}
											onTestPreviewToggle={handleTestPreviewToggle}
											draftCount={contactsTabSelectedIds.size}
											onDraftClick={async () => {
												if (contactsTabSelectedIds.size === 0) {
													toast.error('Select at least one contact to draft messages.');
													return;
												}
												await handleGenerateDrafts(
													Array.from(contactsTabSelectedIds.values())
												);
											}}
											isDraftDisabled={contactsTabSelectedIds.size === 0}
											onSelectAllContacts={handleSelectAllContacts}
											isAllContactsSelected={areAllContactsSelected}
											totalContactCount={contactsAvailableForDrafting.length}
											onGetSuggestions={handleGetSuggestions}
											onUpscalePrompt={upscalePrompt}
											isUpscalingPrompt={isUpscalingPrompt}
											promptQualityScore={promptQualityScore}
											promptQualityLabel={promptQualityLabel}
											hasPreviousPrompt={hasPreviousPrompt}
											onUndoUpscalePrompt={undoUpscalePrompt}
											onHoverChange={handlePromptInputHoverChange}
											onCustomInstructionsOpenChange={setIsCustomInstructionsOpen}
											isNarrowestDesktop={isNarrowestDesktop}
											hideDraftButton={shouldRenderWriteBottomDraftBar || isNarrowestDesktop}
											identity={campaign?.identity}
											onIdentityUpdate={handleIdentityUpdate}
											onProfilePanelOpen={
												shouldUseProfileSidePanel ? handleOpenProfileSidePanel : undefined
											}
											autoOpenProfileTabWhenIncomplete={
												props.autoOpenProfileTabWhenIncomplete
											}
										/>
										{/* Draft button with arrows at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div className="mt-4 w-full">
												<div className="flex items-center justify-center gap-[20px] w-full">
													{/* Left arrow */}
													<button
														type="button"
														data-campaign-interactive-surface
														onClick={goToPreviousTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Previous tab"
													>
														<LeftArrow width="20" height="39" />
													</button>
													{/* Draft button container */}
													<div
														data-draft-button-container
														className="group relative h-[40px] w-full max-w-[407px]"
													>
														{contactsTabSelectedIds.size > 0 || areAllContactsSelected ? (
															// Animated draft button with expanding "All" state
															<button
																type="button"
																onClick={async () => {
																	if (contactsTabSelectedIds.size === 0) {
																		toast.error(
																			'Select at least one contact to draft messages.'
																		);
																		return;
																	}
																	await handleGenerateDrafts(
																		Array.from(contactsTabSelectedIds.values())
																	);
																}}
																disabled={contactsTabSelectedIds.size === 0}
																className={cn(
																	'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] relative overflow-hidden transition-colors duration-300',
																	contactsTabSelectedIds.size === 0
																		? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																		: areAllContactsSelected
																			? 'bg-[#4DC669] border-black hover:bg-[#45B85F] cursor-pointer'
																			: 'bg-[#C7F2C9] border-[#349A37] hover:bg-[#B9E7BC] cursor-pointer'
																)}
															>
																{/* Normal text - fades out when All selected */}
																<span
																	className={cn(
																		'transition-opacity duration-300',
																		areAllContactsSelected ? 'opacity-0' : 'opacity-100'
																	)}
																>
																	{isDraftQueueActive
																		? 'Add Emails to Queue'
																		: `Draft ${contactsTabSelectedIds.size} ${
																				contactsTabSelectedIds.size === 1
																					? 'Contact'
																					: 'Contacts'
																			}`}
																</span>
																{/* "All" text - fades in when All selected */}
																<span
																	className={cn(
																		'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
																		areAllContactsSelected ? 'opacity-100' : 'opacity-0'
																	)}
																>
																	{isDraftQueueActive ? (
																		'Add Emails to Queue'
																	) : (
																		<>
																			Draft <span className="font-bold mx-1">All</span>{' '}
																			{contactsAvailableForDrafting.length} Contacts
																		</>
																	)}
																</span>
																{/* Expanding green overlay from right */}
																<div
																	className={cn(
																		'absolute top-0 bottom-0 right-0 bg-[#4DC669] transition-all duration-300 ease-out',
																		areAllContactsSelected
																			? 'w-full rounded-[1px]'
																			: 'w-[62px] rounded-r-[1px]'
																	)}
																	style={{
																		opacity: areAllContactsSelected ? 0 : 1,
																		transitionProperty: 'width, opacity',
																	}}
																/>
															</button>
														) : (
															<div className="relative w-full h-full rounded-[4px] border-[3px] border-transparent overflow-hidden transition-colors group-hover:bg-[#EEF5EF] group-hover:border-black">
																<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px] cursor-default">
																	Select Contacts and Draft Emails
																</div>
																<button
																	type="button"
																	aria-label="Select all contacts"
																	className="absolute right-0 top-0 bottom-0 w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
																	onClick={handleSelectAllContacts}
																>
																	<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black" />
																	All
																</button>
															</div>
														)}
														{/* "All" button overlay - only visible when not all selected */}
														{(contactsTabSelectedIds.size > 0 ||
															areAllContactsSelected) &&
															!areAllContactsSelected && (
																<button
																	type="button"
																	className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleSelectAllContacts();
																	}}
																>
																	All
																</button>
															)}
													</div>
													{/* Right arrow */}
													<button
														type="button"
														data-campaign-interactive-surface
														onClick={goToNextTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Next tab"
													>
														<RightArrow width="20" height="39" />
													</button>
												</div>
											</div>
										)}
										{/* Contacts table below writing box at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div
												data-campaign-interactive-surface
												className="mt-[20px] w-full flex justify-center"
											>
												{isSendingUiVisible ? (
													<SendingExpandedList width={489} height={349} />
												) : (
												<ContactsExpandedList
													contacts={contactsForContactsExpandedList}
													{...contactsListSupplementalProps}
													{...contactsListTopNavProps}
													isLoading={isContactsLoading}
													campaign={campaign}
													enableUsedContactTooltip={view === 'testing'}
													selectedContactIds={contactsTabSelectedIds}
													activelyDraftingContactIds={
														activelyDraftingContactIdsForContactsExpandedList
													}
													onContactSelectionChange={(updater) =>
														setContactsTabSelectedIds((prev) => updater(new Set(prev)))
													}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onDraftSelected={async (ids) => {
														await handleGenerateDrafts(ids);
													}}
													isDraftDisabled={isGenerationDisabled()}
													width={489}
													height={349}
													minRows={5}
													onSearchFromMiniBar={handleMiniContactsSearch}
												/>
												)}
											</div>
										)}
										{/* Research panel below contacts at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div
												data-campaign-interactive-surface
												className="mt-[20px] w-full flex justify-center"
											>
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={489}
														height={400}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={contactsAvailableForDrafting.length === 0}
														hideSummaryIfBullets={true}
														height={400}
														width={489}
														boxWidth={474}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
											</div>
										)}
									</div>
								)}
								{/* Right panel for Testing view - positioned absolutely */}
								{false && (
									<div
										className="absolute hidden lg:block"
										style={{
											left: 'calc(50% + 250px + 32px)',
											top: '0',
										}}
									>
										<DraftingStatusPanel
											campaign={campaign}
											contacts={contacts || []}
											form={form}
											generationProgress={generationProgress}
											onOpenDrafting={goToDrafting}
											isGenerationDisabled={isGenerationDisabled}
											isPendingGeneration={isPendingGeneration}
											isLivePreviewVisible={isLivePreviewVisible}
											livePreviewContactId={livePreviewContactId || undefined}
											livePreviewSubject={livePreviewSubject}
											livePreviewMessage={livePreviewMessage}
											onDraftSelectedContacts={async (ids) => {
												await handleGenerateDrafts(ids);
											}}
										/>
									</div>
								)}
							</div>
						)}

						<div
							ref={draftingRef}
							className={cn('transition-opacity duration-500 ease-in-out')}
						>
							{/* Drafts tab - show only the drafts table centered */}
							{contentView === 'drafting' && (
								<div className={`w-full ${isMobile ? 'mt-6' : 'min-h-[300px]'}`}>
									{isMobile ? (
										// Mobile layout: Full-width drafts, no side panels
										<div className="flex flex-col items-center w-full px-1">
											<DraftedEmails
												ref={draftedEmailsRef}
												mainBoxId="drafts"
												contacts={contacts || []}
												selectedDraftIds={draftsTabSelectedIds}
												selectedDraft={selectedDraft}
												setSelectedDraft={setSelectedDraft}
												setIsDraftDialogOpen={setIsDraftDialogOpen}
												handleDraftSelection={handleDraftSelection}
												draftEmails={draftEmailsForView}
												isPendingEmails={isPendingEmails}
												setSelectedDraftIds={setDraftsTabSelectedIds}
												onSend={handleSendDrafts}
												isSendingDisabled={isSendingDisabled}
												isFreeTrial={isFreeTrial || false}
												fromName={fromName}
												fromEmail={fromEmail}
												identity={campaign?.identity ?? null}
												onIdentityUpdate={handleIdentityUpdate}
												subject={form.watch('subject')}
												onContactClick={handleResearchContactClick}
												onContactHover={handleResearchContactHover}
												onDraftHover={setHoveredDraftForSettings}
												goToWriting={goToWriting}
												goToSearch={onGoToSearch}
												goToSent={goToSent}
												goToInbox={goToInbox}
												onRejectDraft={handleRejectDraft}
												onApproveDraft={handleApproveDraft}
												onRegenerateDraft={handleRegenerateDraft}
												onRegenSettingsPreviewOpenChange={
													setIsSelectedDraftRegenSettingsPreviewOpen
												}
												rejectedDraftIds={rejectedDraftIds}
												approvedDraftIds={approvedDraftIds}
												statusFilter={draftStatusFilter}
												onStatusFilterChange={setDraftStatusFilter}
												hideSendButton
												lockDraftReviewOpen
											/>
										</div>
									) : isNarrowDesktop ? (
										// Narrow desktop (952px - 1279px): center BOTH the left panel and drafts table together
										// Fixed width container: left (330) + gap (28) + right (499) = 857px, centered with mx-auto.
										// Gap must stay > 18px: the open draft review's stacked back card pokes 18px
										// left of the right column, and a smaller gap makes it overlap the left panels.
										<div
											className="flex flex-col items-center mx-auto"
											style={{ width: '857px' }}
										>
											<div
												className="flex flex-row items-start gap-[28px] w-full"
												style={{ position: 'relative' }}
											>
												{/* Left column: Campaign Header + Email Structure + Research - fixed 330px */}
												<div
													className="flex flex-col flex-shrink-0"
													style={{ gap: '10px', width: '330px' }}
												>
													<CampaignHeaderBox
														campaignId={campaign?.id}
														campaignName={campaign?.name || 'Untitled Campaign'}
														toListNames={toListNames}
														fromName={fromName}
														contactsCount={contactsCount}
														draftCount={draftCount}
														sentCount={sentCount}
														draftingProgress={draftingProgressForHeader}
														onFromClick={onOpenIdentityDialog}
														onDraftsClick={goToDrafting}
														onSentClick={goToSent}
														width={330}
													/>
													{/* Drafts-mode activity list */}
													<div style={{ width: '330px' }}>
														{isSendingUiVisible ? (
															<SendingExpandedList width={330} height={316} />
														) : (
														<ContactsExpandedList
															contacts={contactsForContactsExpandedList}
															{...contactsListSupplementalProps}
															drafts={draftEmailsForView}
															{...contactsListTopNavProps}
															isLoading={isContactsLoading}
															campaign={campaign}
															enableUsedContactTooltip={false}
															selectedDraftId={selectedDraft?.id}
															selectedDraftIds={draftsTabSelectedIds}
															onDraftSelectionChange={setDraftsTabSelectedIds}
															onDraftClick={handleDraftPreviewClick}
															onDraftHover={setHoveredDraftForSettings}
															selectedContactIds={contactsTabSelectedIds}
															activelyDraftingContactIds={
																activelyDraftingContactIdsForContactsExpandedList
															}
															onContactSelectionChange={(updater) =>
																setContactsTabSelectedIds((prev) =>
																	updater(new Set(prev))
																)
															}
															onContactClick={handleResearchContactClick}
															onContactHover={handleResearchContactHover}
															width={330}
															height={316}
															minRows={5}
														/>
														)}
													</div>
													{/* Research panel - height set so bottom aligns with drafts table (59 + 10 + 316 + 10 + 308 = 703 = drafts table height) */}
													{isBatchDraftingInProgress ? (
														<DraftPreviewExpandedList
															contacts={contacts || []}
															livePreview={liveDraftPreview}
															fallbackDraft={draftPreviewFallbackDraft}
															width={330}
															height={308}
														/>
													) : (
														<ContactResearchPanel
															contact={displayedContactForResearch}
															hideAllText={draftCount === 0}
															hideSummaryIfBullets={true}
															height={308}
															width={330}
															boxWidth={315}
															compactHeader
															style={{ display: 'block' }}
														/>
													)}
												</div>
												{/* Right column: Drafts table - fixed 499px, overflow visible for bottom panels */}
												<div
													className="flex-shrink-0 [&>*]:!items-start"
													style={{ width: '499px', overflow: 'visible' }}
												>
													<DraftedEmails
														ref={draftedEmailsRef}
														mainBoxId="drafts"
														contacts={contacts || []}
														selectedDraftIds={draftsTabSelectedIds}
														selectedDraft={selectedDraft}
														setSelectedDraft={setSelectedDraft}
														setIsDraftDialogOpen={setIsDraftDialogOpen}
														handleDraftSelection={handleDraftSelection}
														draftEmails={draftEmailsForView}
														isPendingEmails={isPendingEmails}
														setSelectedDraftIds={setDraftsTabSelectedIds}
														onSend={handleSendDrafts}
														isSendingDisabled={isSendingDisabled}
														isFreeTrial={isFreeTrial || false}
														fromName={fromName}
														fromEmail={fromEmail}
														identity={campaign?.identity ?? null}
														onIdentityUpdate={handleIdentityUpdate}
														subject={form.watch('subject')}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														onDraftHover={setHoveredDraftForSettings}
														goToWriting={goToWriting}
														goToSearch={onGoToSearch}
														goToSent={goToSent}
														goToInbox={goToInbox}
														onRejectDraft={handleRejectDraft}
														onApproveDraft={handleApproveDraft}
														onRegenerateDraft={handleRegenerateDraft}
														onRegenSettingsPreviewOpenChange={
															setIsSelectedDraftRegenSettingsPreviewOpen
														}
														rejectedDraftIds={rejectedDraftIds}
														approvedDraftIds={approvedDraftIds}
														statusFilter={draftStatusFilter}
														onStatusFilterChange={setDraftStatusFilter}
														hideSendButton
														lockDraftReviewOpen
														isNarrowDesktop
														compactReviewActionRow={shouldRenderDraftsBottomSendBar}
														goToPreviousTab={goToPreviousTab}
														goToNextTab={goToNextTab}
													/>
												</div>
											</div>
											{/* Send Button with arrows - centered relative to full container width */}
											{!shouldRenderDraftsBottomSendBar &&
												draftEmailsForView.length > 0 &&
												!selectedDraft && (
												<div className="flex items-center justify-center gap-[29px] mt-4 w-full">
													{/* Left arrow */}
													<button
														type="button"
														onClick={goToPreviousTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Previous tab"
													>
														<LeftArrow width="20" height="39" />
													</button>
													{/* Send button container */}
													<div
														className="relative h-[40px] flex-1"
														style={{ maxWidth: '691px' }}
													>
														<div className="w-full h-full rounded-[4px] border-[3px] border-[#000000] flex overflow-hidden">
															<button
																type="button"
																className={cn(
																	'flex-1 h-full flex items-center justify-center text-center text-black font-inter font-normal text-[17px] pl-[89px]',
																	draftsTabSelectedIds.size > 0
																		? 'bg-[#FFDC9F] hover:bg-[#F4C87E] cursor-pointer'
																		: 'bg-[#FFFFFF] cursor-default'
																)}
																onClick={async () => {
																	if (draftsTabSelectedIds.size === 0) return;
																	await handleSendDrafts();
																}}
																disabled={
																	draftsTabSelectedIds.size === 0 || isSendingDisabled
																}
															>
																{draftsTabSelectedIds.size > 0
																	? `Send ${draftsTabSelectedIds.size} Selected`
																	: 'Send'}
															</button>
															{/* Right section "All" button */}
															<button
																type="button"
																className="w-[89px] h-full flex items-center justify-center font-inter font-normal text-[17px] text-black cursor-pointer border-l-[2px] border-[#000000] bg-[#7CB67C] hover:bg-[#6FA36F]"
																onClick={(e) => {
																	e.stopPropagation();
																	const allIds = new Set(draftEmailsForView.map((d) => d.id));
																	const isAllSelected =
																		draftsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) =>
																			draftsTabSelectedIds.has(id)
																		);
																	if (isAllSelected) {
																		setDraftsTabSelectedIds(new Set());
																	} else {
																		setDraftsTabSelectedIds(allIds);
																	}
																}}
															>
																All
															</button>
														</div>
													</div>
													{/* Right arrow */}
													<button
														type="button"
														onClick={goToNextTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Next tab"
													>
														<RightArrow width="20" height="39" />
													</button>
												</div>
											)}
										</div>
									) : (
										// Regular centered layout for wider viewports.
										// The draft stack peeks ~19px above its top, so nudge it down to
										// the left column's anchor so its front card lines up with the
										// header box (matches the Sent tab).
										<div
											className="flex flex-col items-center"
											style={{
												marginTop: `${standardSidePanelTopOffsetPx}px`,
												...(isCampaignWorkspaceCompact &&
												isDraftPreviewOpen &&
												!isSelectedDraftRegenSettingsPreviewOpen &&
												draftEmailsForView.length > 1
													? {
															transform: `translateX(${compactDraftReviewStackShiftXPx}px)`,
														}
													: {}),
											}}
										>
											<DraftedEmails
												ref={draftedEmailsRef}
												mainBoxId="drafts"
												contacts={contacts || []}
												selectedDraftIds={draftsTabSelectedIds}
												selectedDraft={selectedDraft}
												setSelectedDraft={setSelectedDraft}
												setIsDraftDialogOpen={setIsDraftDialogOpen}
												handleDraftSelection={handleDraftSelection}
												draftEmails={draftEmailsForView}
												isPendingEmails={isPendingEmails}
												setSelectedDraftIds={setDraftsTabSelectedIds}
												onSend={handleSendDrafts}
												isSendingDisabled={isSendingDisabled}
												isFreeTrial={isFreeTrial || false}
												fromName={fromName}
												fromEmail={fromEmail}
												identity={campaign?.identity ?? null}
												onIdentityUpdate={handleIdentityUpdate}
												subject={form.watch('subject')}
												onContactClick={handleResearchContactClick}
												onContactHover={handleResearchContactHover}
												onDraftHover={setHoveredDraftForSettings}
												goToWriting={goToWriting}
												goToSearch={onGoToSearch}
												goToSent={goToSent}
												goToInbox={goToInbox}
												onRejectDraft={handleRejectDraft}
												onApproveDraft={handleApproveDraft}
												onRegenerateDraft={handleRegenerateDraft}
												onRegenSettingsPreviewOpenChange={
													setIsSelectedDraftRegenSettingsPreviewOpen
												}
												rejectedDraftIds={rejectedDraftIds}
												approvedDraftIds={approvedDraftIds}
												statusFilter={draftStatusFilter}
												onStatusFilterChange={setDraftStatusFilter}
												hideSendButton={isNarrowestDesktop}
												lockDraftReviewOpen
												isNarrowestDesktop={isNarrowestDesktop}
												isNarrowDesktop={isNarrowDesktop}
												compactReviewActionRow={shouldRenderDraftsBottomSendBar}
												goToPreviousTab={goToPreviousTab}
												goToNextTab={goToNextTab}
											/>

											{/* Send Button with arrows at narrowest breakpoint (< 952px) */}
											{isNarrowestDesktop && draftEmailsForView.length > 0 && !selectedDraft && (
												<div className="flex items-center justify-center gap-[20px] mt-4 w-full px-4">
													{/* Left arrow */}
													<button
														type="button"
														onClick={goToPreviousTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Previous tab"
													>
														<LeftArrow width="20" height="39" />
													</button>
													{/* Send button container */}
													<div
														className="relative h-[40px] flex-1"
														style={{ maxWidth: '407px' }}
													>
														<div className="w-full h-full rounded-[4px] border-[3px] border-[#000000] flex overflow-hidden">
															<button
																type="button"
																className={cn(
																	'flex-1 h-full flex items-center justify-center text-center text-black font-inter font-normal text-[17px] pl-[89px]',
																	draftsTabSelectedIds.size > 0
																		? 'bg-[#FFDC9F] hover:bg-[#F4C87E] cursor-pointer'
																		: 'bg-[#FFFFFF] cursor-default'
																)}
																onClick={async () => {
																	if (draftsTabSelectedIds.size === 0) return;
																	await handleSendDrafts();
																}}
																disabled={
																	draftsTabSelectedIds.size === 0 || isSendingDisabled
																}
															>
																{draftsTabSelectedIds.size > 0
																	? `Send ${draftsTabSelectedIds.size} Selected`
																	: 'Send'}
															</button>
															{/* Right section "All" button */}
															<button
																type="button"
																className="w-[89px] h-full flex items-center justify-center font-inter font-normal text-[17px] text-black cursor-pointer border-l-[2px] border-[#000000] bg-[#7CB67C] hover:bg-[#6FA36F]"
																onClick={(e) => {
																	e.stopPropagation();
																	const allIds = new Set(draftEmailsForView.map((d) => d.id));
																	const isAllSelected =
																		draftsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) =>
																			draftsTabSelectedIds.has(id)
																		);
																	if (isAllSelected) {
																		setDraftsTabSelectedIds(new Set());
																	} else {
																		setDraftsTabSelectedIds(allIds);
																	}
																}}
															>
																All
															</button>
														</div>
													</div>
													{/* Right arrow */}
													<button
														type="button"
														onClick={goToNextTab}
														className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
														aria-label="Next tab"
													>
														<RightArrow width="20" height="39" />
													</button>
												</div>
											)}

											{/* Research panel below send button at narrowest breakpoint (< 952px) */}
											{isNarrowestDesktop && (
												<div className="mt-[20px] w-full flex justify-center">
													{isBatchDraftingInProgress ? (
														<DraftPreviewExpandedList
															contacts={contacts || []}
															livePreview={liveDraftPreview}
															fallbackDraft={draftPreviewFallbackDraft}
															width={489}
															height={400}
														/>
													) : (
														<ContactResearchPanel
															contact={displayedContactForResearch}
															hideAllText={draftCount === 0}
															hideSummaryIfBullets={true}
															height={400}
															width={489}
															boxWidth={474}
															compactHeader
															style={{ display: 'block' }}
														/>
													)}
												</div>
											)}

											{/* MiniEmailStructure below research panel at narrowest breakpoint (< 952px) */}
											{isNarrowestDesktop && (
												<div className="mt-[10px] w-full flex justify-center">
													<div style={{ width: '489px' }}>
														<MiniEmailStructure
															form={draftsSettingsPreviewForm}
															readOnly
															variant={
																draftsMiniEmailTopHeaderHeight ? 'settings' : undefined
															}
															settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
															settingsSecondaryLabel={
																draftsMiniEmailSettingsLabels.secondary
															}
															settingsNameCompanyBgColor={
																draftsMiniEmailSettingsNameCompanyBgColor
															}
															profileFields={profileFieldsForSettings}
															identityProfile={
																campaign?.identity as IdentityProfileFields | null
															}
															onIdentityUpdate={handleIdentityUpdate}
															onDraft={() =>
																handleGenerateDrafts(
																	contactsAvailableForDrafting.map((c) => c.id)
																)
															}
															isDraftDisabled={isGenerationDisabled()}
															isPendingGeneration={isPendingGeneration}
															generationProgress={generationProgress}
															generationTotal={generationTotal}
															hideTopChrome
															hideFooter
															fullWidthMobile
															hideAddTextButtons
															pageFillColor={draftsMiniEmailFillColor}
															topHeaderHeight={draftsMiniEmailTopHeaderHeight}
															topHeaderLabel={draftsMiniEmailTopHeaderLabel}
															onOpenWriting={goToWriting}
														/>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</div>

						{/* Sent tab - show the sent emails table */}
						{view === 'sent' && (
							<div className={`w-full ${isMobile ? 'mt-6' : 'min-h-[300px]'}`}>
								{isMobile ? (
									// Mobile layout: Full-width sent emails, no side panels
									<div className="flex flex-col items-center w-full px-1">
										<SentEmails
											mainBoxId="sent"
											emails={sentEmails}
											isPendingEmails={isPendingEmails}
											onContactClick={handleResearchContactClick}
											onContactHover={handleResearchContactHover}
											onEmailHover={setHoveredSentForSettings}
											goToDrafts={goToDrafting}
											goToWriting={goToWriting}
											goToSearch={onGoToSearch}
											goToInbox={goToInbox}
										/>
									</div>
								) : isNarrowDesktop ? (
									// Narrow desktop (952px - 1279px): center BOTH the left panel and sent table together
									// Fixed width container: left (330) + gap (10) + right (499) = 839px, centered with mx-auto
									<div
										className="flex flex-col items-center mx-auto"
										style={{ width: '839px' }}
									>
										<div className="flex flex-row items-start gap-[10px] w-full">
											{/* Left column: Campaign Header + Drafts activity + Research - fixed 330px */}
											<div
												className="flex flex-col flex-shrink-0"
												style={{ gap: '10px', width: '330px' }}
											>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													draftingProgress={draftingProgressForHeader}
													onFromClick={onOpenIdentityDialog}
													onDraftsClick={goToDrafting}
													onSentClick={goToSent}
													width={330}
												/>
												{/* Mini Email Structure panel */}
												<div style={{ width: '330px' }}>
													<MiniEmailStructure
														form={
															isDraftingView
																? draftsSettingsPreviewForm
																: isSentView
																	? sentSettingsPreviewForm
																	: form
														}
														readOnly={isDraftingView || isSentView}
														variant={
															draftsMiniEmailTopHeaderHeight ? 'settings' : undefined
														}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={
															draftsMiniEmailSettingsLabels.secondary
														}
														settingsNameCompanyBgColor={
															draftsMiniEmailSettingsNameCompanyBgColor
														}
														profileFields={profileFieldsForSettings}
														identityProfile={
															campaign?.identity as IdentityProfileFields | null
														}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled()}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={generationTotal}
														hideTopChrome
														hideFooter
														fullWidthMobile
														hideAddTextButtons
														fitToHeight
														lockFitToHeightScale
														height={316}
														pageFillColor={draftsMiniEmailFillColor}
														topHeaderHeight={draftsMiniEmailTopHeaderHeight}
														topHeaderLabel={draftsMiniEmailTopHeaderLabel}
														onOpenWriting={goToWriting}
													/>
												</div>
												{/* Research panel below mini email structure - height set so bottom aligns with sent table (59 + 10 + 316 + 10 + 308 = 703 = sent table height) */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={330}
														height={308}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={sentEmails.length === 0}
														hideSummaryIfBullets={true}
														height={308}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
											</div>
											{/* Right column: Sent table - fixed 499px, overflow visible for bottom panels */}
											<div
												className="flex-shrink-0 [&>*]:!items-start"
												style={{ width: '499px', overflow: 'visible' }}
											>
												<SentEmails
													mainBoxId="sent"
													emails={sentEmails}
													isPendingEmails={isPendingEmails}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onEmailHover={setHoveredSentForSettings}
													goToDrafts={goToDrafting}
													goToWriting={goToWriting}
													goToSearch={onGoToSearch}
													goToInbox={goToInbox}
												/>
											</div>
										</div>
									</div>
								) : (
									// Regular centered layout for wider viewports
									<div className="flex flex-col items-center">
										<SentEmails
											mainBoxId="sent"
											emails={sentEmails}
											isPendingEmails={isPendingEmails}
											onContactClick={handleResearchContactClick}
											onContactHover={handleResearchContactHover}
											onEmailHover={setHoveredSentForSettings}
											goToDrafts={goToDrafting}
											goToWriting={goToWriting}
											goToSearch={onGoToSearch}
											goToInbox={goToInbox}
										/>

										{/* Research panel below sent box at narrowest breakpoint (< 952px) */}
										{isNarrowestDesktop && (
											<div className="mt-[20px] w-full flex justify-center">
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={489}
														height={400}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={sentEmails.length === 0}
														hideSummaryIfBullets={true}
														height={400}
														width={489}
														boxWidth={474}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
											</div>
										)}

										{/* MiniEmailStructure below research panel at narrowest breakpoint (< 952px) */}
										{isNarrowestDesktop && (
											<div className="mt-[10px] w-full flex justify-center">
												<div style={{ width: '489px' }}>
													<MiniEmailStructure
														form={
															isDraftingView
																? draftsSettingsPreviewForm
																: isSentView
																	? sentSettingsPreviewForm
																	: form
														}
														readOnly={isDraftingView || isSentView}
														variant={
															draftsMiniEmailTopHeaderHeight ? 'settings' : undefined
														}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={
															draftsMiniEmailSettingsLabels.secondary
														}
														settingsNameCompanyBgColor={
															draftsMiniEmailSettingsNameCompanyBgColor
														}
														profileFields={profileFieldsForSettings}
														identityProfile={
															campaign?.identity as IdentityProfileFields | null
														}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled()}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={generationTotal}
														hideTopChrome
														hideFooter
														fullWidthMobile
														hideAddTextButtons
														pageFillColor={draftsMiniEmailFillColor}
														topHeaderHeight={draftsMiniEmailTopHeaderHeight}
														topHeaderLabel={draftsMiniEmailTopHeaderLabel}
														onOpenWriting={goToWriting}
													/>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Summary (mobile): fullscreen campaign-contacts map with the activity
						    list laid over it. (Search lives on the dashboard pick flow.) Gated on
						    renderGlobalOverlays so the crossfade "previous view" instance never
						    mounts a second map or duplicate fixed bar. */}
						{view === 'summary' &&
							isMobile === true &&
							renderGlobalOverlays && (
							<div className="fixed inset-0 z-30 overflow-hidden mobile-campaign-search-overlay">
								{/* Fullscreen campaign-contacts map (under the activity list) */}
								<div className="absolute inset-0">
									<SearchResultsMap
										weatherMood={globeWeatherMood}
										weatherRegionCenter={globeWeatherRegionCenter}
										weatherTemperatureF={globeWeatherTemperatureF}
										nightLighting={globeNightLighting}
										contacts={contacts || []}
										selectedContacts={searchTabSelectedContacts}
										cameraPadding={{ top: 170, right: 30, bottom: 120, left: 30 }}
										autoFitPadding={{ top: 170, right: 30, bottom: 120, left: 30 }}
										onToggleSelection={(contactId) => {
											if (searchTabSelectedContacts.includes(contactId)) {
												setSearchTabSelectedContacts(
													searchTabSelectedContacts.filter((id) => id !== contactId)
												);
											} else {
												setSearchTabSelectedContacts([
													...searchTabSelectedContacts,
													contactId,
												]);
											}
										}}
									/>
								</div>

								{/* Overlay chrome (Summary): campaign header + activity list over the map */}
								{view === 'summary' && (
									<div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
										<div className="px-3 pt-3">
											<MobileCampaignSearchHeader
												campaignName={campaign?.name || 'Untitled Campaign'}
												contacts={headerContacts ?? []}
												contactsCount={contactsCount}
												draftCount={draftCount}
												sentCount={sentCount}
												newMessageCount={inboxCount}
												onDraftsClick={() => requestMobileSummarySection('drafts')}
												onSentClick={() => requestMobileSummarySection('contacts')}
												onNewMessageClick={() =>
													requestMobileSummarySection('conversations')
												}
											/>
										</div>
										<div
											className="pointer-events-auto flex-1 min-h-0 mt-2 mx-2 flex flex-col"
											style={{ marginBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
										>
											<MobileCampaignSummary
												className="flex-1 min-h-0"
												conversations={mobileSummaryData.conversations}
												drafts={mobileSummaryData.drafts}
												plainContacts={mobileSummaryData.plainContacts}
												contactByEmail={campaignContactsByEmail}
												isLoading={isMobileSummaryLoading}
												scrollRequest={mobileSummaryScrollRequest}
												onOpenConversation={(key) =>
													setMobileSummarySelection({ kind: 'conversation', key })
												}
												onOpenDraft={(id) =>
													setMobileSummarySelection({ kind: 'draft', id })
												}
												onGoToSearch={() => onGoToSearch?.()}
											/>
										</div>
									</div>
								)}

								{/* Fullscreen overlays opened from the Summary list */}
								{view === 'summary' && selectedMobileConversation && (
									<MobileConversationView
										conversation={selectedMobileConversation}
										contact={selectedMobileConversationContact}
										onClose={() => setMobileSummarySelection(null)}
										onThreadReplySent={handleInboxThreadReplySent}
									/>
								)}
								{view === 'summary' && selectedMobileDraft && (
									<MobileDraftReviewView
										draft={selectedMobileDraft}
										sentCount={mobileSessionSentCount}
										deletedCount={mobileSessionDeletedCount}
										onSend={handleMobileDraftSend}
										onDelete={handleMobileDraftDelete}
										onClose={() => setMobileSummarySelection(null)}
									/>
								)}
							</div>
						)}

						{/* Search tab - show the campaign contacts on a map */}
						{view === 'search' && isMobile !== true && (
							<div className="flex flex-col items-center justify-center min-h-[300px]">
								{/* Wrapper to center both left panel and map as one unit at narrow breakpoint */}
								<div className={isSearchTabNarrow ? 'flex items-start gap-[37px]' : ''}>
									{/* Left panel - header box + research panel (only at narrow breakpoint) */}
									{isSearchTabNarrow && !isMobile && !hideHeaderBox && (
										<div
											className="flex flex-col"
											style={{ gap: '16px', paddingTop: '29px' }}
										>
											<CampaignHeaderBox
												campaignId={campaign?.id}
												campaignName={campaign?.name || 'Untitled Campaign'}
												toListNames={toListNames}
												fromName={fromName}
												contactsCount={contactsCount}
												draftCount={draftCount}
												sentCount={sentCount}
												draftingProgress={draftingProgressForHeader}
												onFromClick={onOpenIdentityDialog}
												onDraftsClick={goToDrafting}
												onSentClick={goToSent}
											/>
											<div
												style={{
													width: '375px',
													height: '557px',
													overflow: 'visible',
												}}
											>
												{/* Show search results table when search has been performed, otherwise show research panel */}
												{hasCampaignSearched &&
												!isSearching &&
												searchResultsForPanel.length > 0 ? (
													<div
														className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
														style={{
															width: '375px',
															height: '557px',
														}}
														onMouseOver={handleRailContainerMouseOver}
														onMouseOut={handleRailContainerMouseOut}
													>
														{/* Fixed header section */}
														<div
															className="flex-shrink-0 flex flex-col justify-center px-[6px]"
															style={{ height: '44px' }}
														>
															<div className="flex items-center justify-between">
																<span className="font-inter text-[13px] font-medium text-black pl-1">
																	Search Results
																</span>
																<div className="flex flex-col items-end">
																	<span className="font-inter text-[11px] text-black">
																		{selectedSearchResultsCount} selected
																	</span>
																	<button
																		type="button"
																		onClick={() => {
																			if (areAllSearchResultsSelected) {
																				setSearchResultsSelectedContacts([]);
																			} else {
																				setSearchResultsSelectedContacts(
																					searchResultsForPanelIds
																				);
																			}
																		}}
																		className="font-secondary text-[11px] font-medium text-black hover:underline"
																	>
																		{areAllSearchResultsSelected
																			? 'Deselect all'
																			: 'Select all'}
																	</button>
																</div>
															</div>
														</div>
														{/* Scrollable contact list */}
														<CustomScrollbar
															className="flex-1 min-h-0"
															contentClassName="px-[6px] pb-[14px]"
															thumbWidth={2}
															thumbColor="#000000"
															trackColor="transparent"
															offsetRight={-6}
															disableOverflowClass
														>
															<div className="space-y-[7px]">
																{searchResultsForPanel.map((contact) => {
																	const isSelected =
																		searchResultsSelectedContacts.includes(contact.id);
																	const firstName = contact.firstName || '';
																	const lastName = contact.lastName || '';
																	const fullName =
																		contact.name || `${firstName} ${lastName}`.trim();
																	const company = contact.company || '';
																	const headline =
																		contact.headline || contact.title || '';
																	const stateAbbr =
																		getStateAbbreviation(contact.state || '') || '';
																	const city = contact.city || '';

																	return (
																		<div
																			key={contact.id}
																			data-contact-id={contact.id}
																			className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-[#ABABAB] select-none"
																			style={{
																				backgroundColor: isSelected
																					? '#C9EAFF'
																					: '#FFFFFF',
																			}}
																			onClick={() => {
																				if (isSelected) {
																					setSearchResultsSelectedContacts(
																						searchResultsSelectedContacts.filter(
																							(id) => id !== contact.id
																						)
																					);
																				} else {
																					setSearchResultsSelectedContacts([
																						...searchResultsSelectedContacts,
																						contact.id,
																					]);
																				}
																			}}
																		>
																			{fullName ? (
																				<>
																					{/* Top Left - Name */}
																					<div className="pl-3 pr-1 flex items-center h-[23px]">
																						<div className="font-bold text-[11px] w-full truncate leading-tight">
																							{fullName}
																						</div>
																					</div>
																					{/* Top Right - Title/Headline */}
																					<div className="pr-2 pl-1 flex items-center h-[23px]">
																						{headline ? (
																							<div
																								className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																								style={{
																									backgroundColor: isRestaurantTitle(
																										headline
																									)
																										? '#C3FBD1'
																										: isCoffeeShopTitle(headline)
																											? '#D6F1BD'
																											: isMusicVenueTitle(headline)
																												? '#B7E5FF'
																												: isMusicFestivalTitle(headline)
																													? '#C1D6FF'
																													: isWeddingPlannerTitle(
																																headline
																														  ) ||
																														  isWeddingVenueTitle(
																																headline
																														  )
																														? '#FFF2BC'
																														: '#E8EFFF',
																								}}
																							>
																								{isRestaurantTitle(headline) && (
																									<RestaurantsIcon size={12} />
																								)}
																								{isCoffeeShopTitle(headline) && (
																									<CoffeeShopsIcon size={7} />
																								)}
																								{isMusicVenueTitle(headline) && (
																									<MusicVenuesIcon
																										size={12}
																										className="flex-shrink-0"
																									/>
																								)}
																								{isMusicFestivalTitle(headline) && (
																									<FestivalsIcon
																										size={12}
																										className="flex-shrink-0"
																									/>
																								)}
																								{(isWeddingPlannerTitle(headline) ||
																									isWeddingVenueTitle(headline)) && (
																									<WeddingPlannersIcon size={12} />
																								)}
																								<span className="text-[10px] text-black leading-none truncate">
																									{isRestaurantTitle(headline)
																										? 'Restaurant'
																										: isCoffeeShopTitle(headline)
																											? 'Coffee Shop'
																											: isMusicVenueTitle(headline)
																												? 'Music Venue'
																												: isMusicFestivalTitle(headline)
																													? 'Music Festival'
																													: isWeddingPlannerTitle(
																																headline
																														  )
																														? 'Wedding Planner'
																														: isWeddingVenueTitle(
																																	headline
																															  )
																															? 'Wedding Venue'
																															: headline}
																								</span>
																							</div>
																						) : (
																							<div className="w-full" />
																						)}
																					</div>
																					{/* Bottom Left - Company */}
																					<div className="pl-3 pr-1 flex items-center h-[22px]">
																						<div className="text-[11px] text-black w-full truncate leading-tight">
																							{company}
																						</div>
																					</div>
																					{/* Bottom Right - Location */}
																					<div className="pr-2 pl-1 flex items-center h-[22px]">
																						{city || stateAbbr ? (
																							<div className="flex items-center gap-1 w-full">
																								{stateAbbr && (
																									<span
																										className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																										style={{
																											backgroundColor:
																												stateBadgeColorMap[stateAbbr] ||
																												'transparent',
																											borderColor: '#000000',
																										}}
																									>
																										{stateAbbr}
																									</span>
																								)}
																								{city && (
																									<span className="text-[10px] text-black leading-none truncate">
																										{city}
																									</span>
																								)}
																							</div>
																						) : (
																							<div className="w-full" />
																						)}
																					</div>
																				</>
																			) : (
																				<>
																					{/* No name - Company spans left column */}
																					<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
																						<div className="font-bold text-[11px] w-full truncate leading-tight">
																							{company || '—'}
																						</div>
																					</div>
																					{/* Top Right - Title/Headline */}
																					<div className="pr-2 pl-1 flex items-center h-[23px]">
																						{headline ? (
																							<div
																								className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																								style={{
																									backgroundColor: isRestaurantTitle(
																										headline
																									)
																										? '#C3FBD1'
																										: isCoffeeShopTitle(headline)
																											? '#D6F1BD'
																											: isMusicVenueTitle(headline)
																												? '#B7E5FF'
																												: isMusicFestivalTitle(headline)
																													? '#C1D6FF'
																													: isWeddingPlannerTitle(
																																headline
																														  ) ||
																														  isWeddingVenueTitle(
																																headline
																														  )
																														? '#FFF2BC'
																														: '#E8EFFF',
																								}}
																							>
																								{isRestaurantTitle(headline) && (
																									<RestaurantsIcon size={12} />
																								)}
																								{isCoffeeShopTitle(headline) && (
																									<CoffeeShopsIcon size={7} />
																								)}
																								{isMusicVenueTitle(headline) && (
																									<MusicVenuesIcon
																										size={12}
																										className="flex-shrink-0"
																									/>
																								)}
																								{isMusicFestivalTitle(headline) && (
																									<FestivalsIcon
																										size={12}
																										className="flex-shrink-0"
																									/>
																								)}
																								{(isWeddingPlannerTitle(headline) ||
																									isWeddingVenueTitle(headline)) && (
																									<WeddingPlannersIcon size={12} />
																								)}
																								<span className="text-[10px] text-black leading-none truncate">
																									{isRestaurantTitle(headline)
																										? 'Restaurant'
																										: isCoffeeShopTitle(headline)
																											? 'Coffee Shop'
																											: isMusicVenueTitle(headline)
																												? 'Music Venue'
																												: isMusicFestivalTitle(headline)
																													? 'Music Festival'
																													: isWeddingPlannerTitle(
																																headline
																														  )
																														? 'Wedding Planner'
																														: isWeddingVenueTitle(
																																	headline
																															  )
																															? 'Wedding Venue'
																															: headline}
																								</span>
																							</div>
																						) : (
																							<div className="w-full" />
																						)}
																					</div>
																					{/* Bottom Right - Location */}
																					<div className="pr-2 pl-1 flex items-center h-[22px]">
																						{city || stateAbbr ? (
																							<div className="flex items-center gap-1 w-full">
																								{stateAbbr && (
																									<span
																										className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																										style={{
																											backgroundColor:
																												stateBadgeColorMap[stateAbbr] ||
																												'transparent',
																											borderColor: '#000000',
																										}}
																									>
																										{stateAbbr}
																									</span>
																								)}
																								{city && (
																									<span className="text-[10px] text-black leading-none truncate">
																										{city}
																									</span>
																								)}
																							</div>
																						) : (
																							<div className="w-full" />
																						)}
																					</div>
																				</>
																			)}
																		</div>
																	);
																})}
															</div>
														</CustomScrollbar>

														{/* Footer with Add to Campaign button */}
														{searchResultsSelectedContacts.length > 0 && (
															<div className="w-full h-[50px] flex-shrink-0 bg-[#D8E5FB] flex items-center justify-center px-3">
																<div className="relative flex w-full h-[36px] rounded-[6px] border-2 border-black overflow-hidden">
																	<span
																		className="absolute inset-0 flex items-center justify-center text-white font-serif font-medium text-[15px] pointer-events-none"
																		style={{ zIndex: 1 }}
																	>
																		{isAddingToCampaign ? (
																			<>
																				<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
																				Adding...
																			</>
																		) : (
																			'Add to Campaign'
																		)}
																	</span>
																	<button
																		type="button"
																		onClick={handleAddSearchResultsToCampaign}
																		disabled={
																			searchResultsSelectedContacts.length === 0 ||
																			isAddingToCampaign
																		}
																		className="flex-1 bg-[#62A967] hover:bg-[#529957] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
																	/>
																	<div
																		className="w-[2px]"
																		style={{ backgroundColor: '#349A37', zIndex: 2 }}
																	/>
																	<button
																		type="button"
																		onClick={() => {
																			if (!areAllSearchResultsSelected) {
																				setSearchResultsSelectedContacts(
																					searchResultsForPanelIds
																				);
																			}
																		}}
																		className="w-[50px] bg-[#7AD47A] hover:bg-[#6AC46A] text-black font-inter text-[13px] flex items-center justify-center transition-colors"
																		style={{ zIndex: 2 }}
																	>
																		All
																	</button>
																</div>
															</div>
														)}
													</div>
												) : isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={375}
														height={557}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={contactsAvailableForDrafting.length === 0}
														className="!block"
													/>
												)}
											</div>
										</div>
									)}
									{/* Map and button column container */}
									<div className="flex flex-col items-center">
										{/* Outer container box */}
										<div
											className="relative rounded-[12px] overflow-hidden"
											data-campaign-main-box="search"
											style={{
												width: isSearchTabNarrow ? '498px' : '768px',
												height: '815px',
												backgroundColor: '#AFD6EF',
												border: '3px solid #143883',
											}}
										>
											{/* Search label */}
											<span
												className="absolute font-inter font-bold text-[14px] text-black"
												style={{ top: '5px', left: '16px' }}
											>
												Search
											</span>

											{/* Search tabs header */}
											<div
												className="absolute flex items-center"
												style={{
													left: '138px',
													top: '0',
													right: '14px',
													height: '36px',
												}}
											>
												{/* Original tab */}
												<div
													className="relative flex items-center justify-center cursor-pointer border-l border-black"
													style={{
														width: '105px',
														height: '36px',
														backgroundColor:
															activeSearchTabId === null ? '#94c4e4' : '#95D6FF',
													}}
													onClick={() => setActiveSearchTabId(null)}
												>
													<span className="font-inter font-normal text-[15px] text-black">
														Original
													</span>
												</div>
												<div className="border-l border-black h-full" />

												{/* Dynamic search tabs */}
												{searchTabs.map((tab) => (
													<Fragment key={tab.id}>
														<div
															className="relative flex items-center justify-center cursor-pointer group"
															style={{
																minWidth: '120px',
																maxWidth: '220px',
																height: '36px',
																backgroundColor:
																	activeSearchTabId === tab.id ? '#94c4e4' : '#95d6ff',
																paddingLeft: '12px',
																paddingRight: '28px',
															}}
															onClick={() => setActiveSearchTabId(tab.id)}
														>
															<span
																className="font-inter font-normal text-[15px] text-black whitespace-nowrap overflow-hidden"
																style={{
																	maskImage:
																		'linear-gradient(to right, black calc(100% - 20px), transparent 100%)',
																	WebkitMaskImage:
																		'linear-gradient(to right, black calc(100% - 20px), transparent 100%)',
																}}
															>
																{tab.label}
															</span>
															{/* Close button - visible on hover */}
															<button
																type="button"
																className="absolute right-[8px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] hidden group-hover:flex items-center justify-center text-black/60 hover:text-black"
																onClick={(e) => {
																	e.stopPropagation();
																	handleCloseSearchTab(tab.id);
																}}
															>
																×
															</button>
														</div>
														<div className="border-l border-black h-full" />
													</Fragment>
												))}

												{/* Plus button to add new search */}
												<div
													className="flex items-center justify-center cursor-pointer"
													style={{
														width: '36px',
														height: '36px',
													}}
													onClick={() => {
														// Create a new empty tab
														const newTab: SearchTab = {
															id: `search-${Date.now()}`,
															label: 'New Search',
															query: '',
															what: '',
															selectedContacts: [],
															extraContacts: [],
														};
														setSearchTabs((tabs) => [...tabs, newTab]);
														setActiveSearchTabId(newTab.id);
														// Reset search inputs to placeholders
														setSearchWhyValue('[Booking]');
														setSearchWhatValue('');
														setSearchWhereValue('');
														// Focus the search bar
														setSearchActiveSection('what');
													}}
												>
													<span className="font-inter font-normal text-[20px] text-black">
														+
													</span>
												</div>
											</div>

											{/* Map container */}
											<div
												className="absolute"
												style={{
													top: '36px',
													left: '14px',
													right: '14px',
													bottom: '14px',
												}}
											>
												{/* Mini searchbar - overlaid on top of map */}
												<div
													className="absolute flex items-center z-10"
													style={{
														top: '12px',
														left: '50%',
														transform: 'translateX(-50%)',
														width: isSearchTabNarrow ? '380px' : '440px',
														height: '49px',
													}}
												>
													<div
														className={`relative w-full h-full bg-white rounded-[8px] border-[3px] border-black flex items-center ${
															searchActiveSection ? 'bg-[#F3F3F3]' : 'bg-white'
														}`}
													>
														{/* Pills container */}
														<div
															className={`absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center rounded-[6px] z-10 group ${
																searchActiveSection
																	? 'bg-[#F3F3F3] border border-transparent'
																	: 'bg-white border border-black'
															}`}
															style={{
																width: 'calc(100% - 66px)',
																height: '38px',
															}}
														>
															{/* Sliding active section indicator (matches dashboard) */}
															<div
																ref={searchActiveSectionIndicatorRef}
																className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[6px] pointer-events-none z-0"
																style={{ opacity: 0, willChange: 'transform' }}
															/>
															{/* Why pill (Booking/Promotion) */}
															<div
																className={`campaign-mini-search-section-why flex-1 flex items-center justify-start border-r border-transparent ${
																	!searchActiveSection
																		? 'group-hover:border-black/10'
																		: ''
																} h-full min-w-0 relative pl-[16px] pr-1 cursor-pointer`}
																onClick={() => setSearchActiveSection('why')}
															>
																<div className="w-full h-full flex items-center text-left text-[13px] font-bold font-secondary truncate p-0 relative z-10">
																	{searchWhyValue
																		? searchWhyValue.replace(/[\[\]]/g, '')
																		: 'Why'}
																</div>
															</div>
															{/* What pill */}
															<div
																className={`campaign-mini-search-section-what flex-1 flex items-center justify-start border-r border-transparent ${
																	!searchActiveSection
																		? 'group-hover:border-black/10'
																		: ''
																} h-full min-w-0 relative pl-[16px] pr-1`}
															>
																<input
																	ref={whatInputRef}
																	value={searchWhatValue}
																	onChange={(e) => setSearchWhatValue(e.target.value)}
																	className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																	style={{
																		maskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																		WebkitMaskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																	}}
																	placeholder="What"
																	onFocus={(e) => {
																		setSearchActiveSection('what');
																		const target = e.target;
																		setTimeout(() => target.setSelectionRange(0, 0), 0);
																	}}
																/>
															</div>
															{/* Where pill */}
															<div className="campaign-mini-search-section-where flex-1 flex items-center justify-end h-full min-w-0 relative pr-[12px] pl-[16px]">
																<input
																	ref={whereInputRef}
																	value={searchWhereValue}
																	onChange={(e) => setSearchWhereValue(e.target.value)}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') {
																			e.preventDefault();
																			setSearchActiveSection(null);
																			handleCampaignSearch();
																		}
																	}}
																	className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																	style={{
																		maskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																		WebkitMaskImage:
																			'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
																	}}
																	placeholder="Where"
																	onFocus={(e) => {
																		setSearchActiveSection('where');
																		const target = e.target;
																		setTimeout(
																			() =>
																				target.setSelectionRange(0, target.value.length),
																			0
																		);
																	}}
																/>
															</div>
														</div>
														{/* Search button */}
														<button
															type="button"
															className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer hover:bg-[#a3d9a5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
															style={{
																width: '48px',
																height: '37px',
																backgroundColor: '#B8E4BE',
																border: '1px solid #5DAB68',
																borderRadius: '6px',
															}}
															aria-label="Search"
															onClick={handleCampaignSearch}
														>
															<div style={{ transform: 'scale(0.75)', display: 'flex' }}>
																<SearchIconDesktop />
															</div>
														</button>
													</div>
												</div>
												{/* Render search dropdowns via portal */}
												{renderSearchDropdowns()}

												<div
													className="relative rounded-[8px] overflow-hidden w-full h-full"
													style={{
														border: '3px solid #143883',
													}}
												>
													<SearchResultsMap
														weatherMood={globeWeatherMood}
														weatherRegionCenter={globeWeatherRegionCenter}
														weatherTemperatureF={globeWeatherTemperatureF}
														nightLighting={globeNightLighting}
														contacts={
															activeSearchTabId === null
																? contacts || [] // Original tab - show campaign contacts
																: activeCampaignSearchQuery
																	? searchResults || [] // Search tab with query - show results
																	: [] // Empty search tab - show nothing (zoomed out view)
														}
														isLoading={activeSearchTabId !== null ? isSearching : false}
														selectedContacts={
															activeSearchTabId !== null
																? searchResultsSelectedContacts
																: searchTabSelectedContacts
														}
														searchQuery={
															activeSearchTabId !== null
																? activeCampaignSearchQuery
																: undefined
														}
														searchWhat={
															activeSearchTabId !== null
																? activeSearchTab?.what
																: undefined
														}
														onMarkerHover={handleResearchContactHover}
														onToggleSelection={(contactId) => {
															if (activeSearchTabId !== null) {
																// Handle selection for search results
																if (searchResultsSelectedContacts.includes(contactId)) {
																	setSearchResultsSelectedContacts(
																		searchResultsSelectedContacts.filter(
																			(id) => id !== contactId
																		)
																	);
																} else {
																	setSearchResultsSelectedContacts([
																		...searchResultsSelectedContacts,
																		contactId,
																	]);
																}

																// Mirror dashboard UX: when selecting from the map, scroll the contact into view
																// in the Search Results panel so the user immediately sees it.
																if (typeof document !== 'undefined') {
																	const tryScroll = (attempt = 0) => {
																		const contactElement = document.querySelector(
																			`[data-contact-id="${contactId}"]`
																		);
																		if (contactElement) {
																			contactElement.scrollIntoView({
																				behavior: 'smooth',
																				block: 'center',
																			});
																			return;
																		}
																		if (attempt < 10) {
																			setTimeout(() => tryScroll(attempt + 1), 50);
																		}
																	};
																	setTimeout(() => tryScroll(0), 0);
																}
															} else {
																// Handle selection for campaign contacts
																if (searchTabSelectedContacts.includes(contactId)) {
																	setSearchTabSelectedContacts(
																		searchTabSelectedContacts.filter(
																			(id) => id !== contactId
																		)
																	);
																} else {
																	setSearchTabSelectedContacts([
																		...searchTabSelectedContacts,
																		contactId,
																	]);
																}
															}
														}}
														onMarkerClick={(contact) => {
															handleResearchContactClick(contact);
															// Booking extra/overlay markers can be selected from the map but are not part of the
															// base `searchResults` list. Add them to the active tab's results list so they
															// appear in the Search Results panel.
															if (
																activeSearchTabId !== null &&
																!baseSearchResultsIdSet.has(contact.id)
															) {
																addContactToActiveSearchTabResults(contact);
															}
														}}
														enableStateInteractions
														onStateSelect={(stateName) => {
															setSearchActiveSection(null);
															setSearchWhereValue(stateName);
															// Trigger search after a short delay to allow state to update
															setTimeout(() => handleCampaignSearch(), 0);
														}}
														lockedStateName={searchWhereValue}
													/>
												</div>
											</div>
										</div>
									</div>
									{/* Close wrapper div for centered left panel + map at narrow breakpoint */}
								</div>
								{/* Add to Campaign button below the map - always visible, centered on page at narrow breakpoint */}
								<div
									className="flex items-center justify-center gap-[29px]"
									style={{ marginTop: '25px' }}
								>
									{/* Left arrow - only at narrow breakpoint */}
									{isSearchTabNarrow && (
										<button
											type="button"
											onClick={goToPreviousTab}
											className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
											aria-label="Previous tab"
										>
											<LeftArrow width="20" height="39" />
										</button>
									)}
									{/* Button container */}
									<div
										className="relative flex rounded-[6px] border-2 border-black overflow-hidden"
										style={{
											width: isNarrowestDesktop
												? '407px'
												: isSearchTabNarrow
													? '691px'
													: '528px',
											height: '39px',
										}}
									>
										{/* Absolutely centered text */}
										<span
											className="absolute inset-0 flex items-center justify-center text-black font-serif font-medium text-[15px] pointer-events-none"
											style={{ zIndex: 1 }}
										>
											{isAddingToCampaign ? (
												<>
													<div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
													Adding...
												</>
											) : (
												'Add to Campaign'
											)}
										</span>
										{/* Clickable left area */}
										<button
											type="button"
											onClick={handleAddSearchResultsToCampaign}
											disabled={
												searchResultsSelectedContacts.length === 0 || isAddingToCampaign
											}
											className="flex-1 bg-[#AFD6EF] hover:bg-[#9BC6DF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										/>
										<div
											className="w-[2px]"
											style={{ backgroundColor: '#143883', zIndex: 2 }}
										/>
										<button
											type="button"
											onClick={() => {
												if (
													searchResultsForPanelIds.length > 0 &&
													!areAllSearchResultsSelected
												) {
													setSearchResultsSelectedContacts(searchResultsForPanelIds);
												}
											}}
											className="w-[50px] bg-[#43AEEC] hover:bg-[#3A9AD9] text-black font-inter text-[13px] flex items-center justify-center transition-colors"
											style={{ zIndex: 2 }}
										>
											All
										</button>
									</div>
									{/* Right arrow - only at narrow breakpoint */}
									{isSearchTabNarrow && (
										<button
											type="button"
											onClick={goToNextTab}
											className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
											aria-label="Next tab"
										>
											<RightArrow width="20" height="39" />
										</button>
									)}
								</div>
								{/* Research panel OR Search results below Add to Campaign button - only at narrowest breakpoint (< 952px) */}
								{isNarrowestDesktop && (
									<div className="mt-[70px] w-full flex justify-center">
										{/* At narrowest breakpoint (< 952px) with search results, show search results table */}
										{hasCampaignSearched &&
										!isSearching &&
										searchResultsForPanel.length > 0 ? (
											<div
												className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
												style={{
													width: '498px',
													height: '400px',
												}}
												onMouseOver={handleRailContainerMouseOver}
												onMouseOut={handleRailContainerMouseOut}
											>
												{/* Fixed header section */}
												<div
													className="flex-shrink-0 flex flex-col justify-center px-[6px]"
													style={{ height: '44px' }}
												>
													<div className="flex items-center justify-between">
														<span className="font-inter text-[13px] font-medium text-black pl-1">
															Search Results
														</span>
														<div className="flex flex-col items-end">
															<span className="font-inter text-[11px] text-black">
																{selectedSearchResultsCount} selected
															</span>
															<button
																type="button"
																onClick={() => {
																	if (areAllSearchResultsSelected) {
																		setSearchResultsSelectedContacts([]);
																	} else {
																		setSearchResultsSelectedContacts(
																			searchResultsForPanelIds
																		);
																	}
																}}
																className="font-secondary text-[11px] font-medium text-black hover:underline"
															>
																{areAllSearchResultsSelected
																	? 'Deselect all'
																	: 'Select all'}
															</button>
														</div>
													</div>
												</div>
												{/* Scrollable contact list */}
												<CustomScrollbar
													className="flex-1 min-h-0"
													contentClassName="px-[6px] pb-[14px]"
													thumbWidth={2}
													thumbColor="#000000"
													trackColor="transparent"
													offsetRight={-6}
													disableOverflowClass
												>
													<div className="space-y-[7px]">
														{searchResultsForPanel.map((contact) => {
															const isSelected = searchResultsSelectedContacts.includes(
																contact.id
															);
															const firstName = contact.firstName || '';
															const lastName = contact.lastName || '';
															const fullName =
																contact.name || `${firstName} ${lastName}`.trim();
															const company = contact.company || '';
															const headline = contact.headline || contact.title || '';
															const stateAbbr =
																getStateAbbreviation(contact.state || '') || '';
															const city = contact.city || '';

															return (
																<div
																	key={contact.id}
																	data-contact-id={contact.id}
																	className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-[#ABABAB] select-none"
																	style={{
																		backgroundColor: isSelected ? '#C9EAFF' : '#FFFFFF',
																	}}
																	onClick={() => {
																		if (isSelected) {
																			setSearchResultsSelectedContacts(
																				searchResultsSelectedContacts.filter(
																					(id) => id !== contact.id
																				)
																			);
																		} else {
																			setSearchResultsSelectedContacts([
																				...searchResultsSelectedContacts,
																				contact.id,
																			]);
																		}
																	}}
																>
																	{fullName ? (
																		<>
																			{/* Top Left - Name */}
																			<div className="pl-3 pr-1 flex items-center h-[23px]">
																				<div className="font-bold text-[11px] w-full truncate leading-tight">
																					{fullName}
																				</div>
																			</div>
																			{/* Top Right - Title/Headline */}
																			<div className="pr-2 pl-1 flex items-center h-[23px]">
																				{headline ? (
																					<div
																						className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																						style={{
																							backgroundColor: isRestaurantTitle(headline)
																								? '#C3FBD1'
																								: isCoffeeShopTitle(headline)
																									? '#D6F1BD'
																									: isMusicVenueTitle(headline)
																										? '#B7E5FF'
																										: isMusicFestivalTitle(headline)
																											? '#C1D6FF'
																											: isWeddingPlannerTitle(headline) ||
																												  isWeddingVenueTitle(headline)
																												? '#FFF2BC'
																												: '#E8EFFF',
																						}}
																					>
																						{isRestaurantTitle(headline) && (
																							<RestaurantsIcon size={12} />
																						)}
																						{isCoffeeShopTitle(headline) && (
																							<CoffeeShopsIcon size={7} />
																						)}
																						{isMusicVenueTitle(headline) && (
																							<MusicVenuesIcon
																								size={12}
																								className="flex-shrink-0"
																							/>
																						)}
																						{isMusicFestivalTitle(headline) && (
																							<FestivalsIcon
																								size={12}
																								className="flex-shrink-0"
																							/>
																						)}
																						{(isWeddingPlannerTitle(headline) ||
																							isWeddingVenueTitle(headline)) && (
																							<WeddingPlannersIcon size={12} />
																						)}
																						<span className="text-[10px] text-black leading-none truncate">
																							{isRestaurantTitle(headline)
																								? 'Restaurant'
																								: isCoffeeShopTitle(headline)
																									? 'Coffee Shop'
																									: isMusicVenueTitle(headline)
																										? 'Music Venue'
																										: isMusicFestivalTitle(headline)
																											? 'Music Festival'
																											: isWeddingPlannerTitle(headline)
																												? 'Wedding Planner'
																												: isWeddingVenueTitle(headline)
																													? 'Wedding Venue'
																													: headline}
																						</span>
																					</div>
																				) : (
																					<div className="w-full" />
																				)}
																			</div>
																			{/* Bottom Left - Company */}
																			<div className="pl-3 pr-1 flex items-center h-[22px]">
																				<div className="text-[11px] text-black w-full truncate leading-tight">
																					{company}
																				</div>
																			</div>
																			{/* Bottom Right - Location */}
																			<div className="pr-2 pl-1 flex items-center h-[22px]">
																				{city || stateAbbr ? (
																					<div className="flex items-center gap-1 w-full">
																						{stateAbbr && (
																							<span
																								className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																								style={{
																									backgroundColor:
																										stateBadgeColorMap[stateAbbr] ||
																										'transparent',
																									borderColor: '#000000',
																								}}
																							>
																								{stateAbbr}
																							</span>
																						)}
																						{city && (
																							<span className="text-[10px] text-black leading-none truncate">
																								{city}
																							</span>
																						)}
																					</div>
																				) : (
																					<div className="w-full" />
																				)}
																			</div>
																		</>
																	) : (
																		<>
																			{/* No name - Company spans left column */}
																			<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
																				<div className="font-bold text-[11px] w-full truncate leading-tight">
																					{company || '—'}
																				</div>
																			</div>
																			{/* Top Right - Title/Headline */}
																			<div className="pr-2 pl-1 flex items-center h-[23px]">
																				{headline ? (
																					<div
																						className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																						style={{
																							backgroundColor: isRestaurantTitle(headline)
																								? '#C3FBD1'
																								: isCoffeeShopTitle(headline)
																									? '#D6F1BD'
																									: isMusicVenueTitle(headline)
																										? '#B7E5FF'
																										: isWeddingPlannerTitle(headline) ||
																											  isWeddingVenueTitle(headline)
																											? '#FFF2BC'
																											: '#E8EFFF',
																						}}
																					>
																						{isRestaurantTitle(headline) && (
																							<RestaurantsIcon size={12} />
																						)}
																						{isCoffeeShopTitle(headline) && (
																							<CoffeeShopsIcon size={7} />
																						)}
																						{isMusicVenueTitle(headline) && (
																							<MusicVenuesIcon
																								size={12}
																								className="flex-shrink-0"
																							/>
																						)}
																						{(isWeddingPlannerTitle(headline) ||
																							isWeddingVenueTitle(headline)) && (
																							<WeddingPlannersIcon size={12} />
																						)}
																						<span className="text-[10px] text-black leading-none truncate">
																							{isRestaurantTitle(headline)
																								? 'Restaurant'
																								: isCoffeeShopTitle(headline)
																									? 'Coffee Shop'
																									: isMusicVenueTitle(headline)
																										? 'Music Venue'
																										: isWeddingPlannerTitle(headline)
																											? 'Wedding Planner'
																											: isWeddingVenueTitle(headline)
																												? 'Wedding Venue'
																												: headline}
																						</span>
																					</div>
																				) : (
																					<div className="w-full" />
																				)}
																			</div>
																			{/* Bottom Right - Location */}
																			<div className="pr-2 pl-1 flex items-center h-[22px]">
																				{city || stateAbbr ? (
																					<div className="flex items-center gap-1 w-full">
																						{stateAbbr && (
																							<span
																								className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																								style={{
																									backgroundColor:
																										stateBadgeColorMap[stateAbbr] ||
																										'transparent',
																									borderColor: '#000000',
																								}}
																							>
																								{stateAbbr}
																							</span>
																						)}
																						{city && (
																							<span className="text-[10px] text-black leading-none truncate">
																								{city}
																							</span>
																						)}
																					</div>
																				) : (
																					<div className="w-full" />
																				)}
																			</div>
																		</>
																	)}
																</div>
															);
														})}
													</div>
												</CustomScrollbar>
											</div>
										) : isBatchDraftingInProgress ? (
											<DraftPreviewExpandedList
												contacts={contacts || []}
												livePreview={liveDraftPreview}
												fallbackDraft={draftPreviewFallbackDraft}
												width={498}
												height={400}
											/>
										) : (
											<ContactResearchPanel
												contact={displayedContactForResearch}
												hideAllText={contactsAvailableForDrafting.length === 0}
												hideSummaryIfBullets={true}
												height={400}
												width={498}
												boxWidth={483}
												compactHeader
												style={{ display: 'block' }}
											/>
										)}
									</div>
								)}
							</div>
						)}

						{/* Inbox tab: reuse the dashboard inbox UI, but scoped and labeled by campaign contacts */}
						{view === 'inbox' && (
							<div className="mt-6 flex flex-col items-center">
								{isNarrowestDesktop ? (
									// Narrowest layout (< 952px): the compact-workspace detail panel on top
									// (501x703 — these exact dims gate InboxSection's campaign compact detail
									// design), with the inbox list that sits to its left at wider widths
									// stacked below it.
									<div className="flex flex-col items-center w-full">
										<InboxSection
											allowedSenderEmails={campaignContactEmails}
											contactByEmail={campaignContactsByEmail}
											campaignId={campaign.id}
											onGoToDrafting={goToDrafting}
											onGoToWriting={goToWriting}
											onGoToSearch={onGoToSearch}
											inboxSentTabRequest={effectiveInboxSentTabRequest}
											onInboxSentTabChange={onInboxSentTabChange}
											onCampaignInboxEmpty={
												inboxMockOverrideActive || !renderGlobalOverlays
													? undefined
													: handleCampaignInboxEmpty
											}
											selectedEmailId={selectedInboxEmailId}
											onSelectedEmailIdChange={setSelectedInboxEmailId}
											onThreadReplySent={handleInboxThreadReplySent}
											autoSelectFirstEmail
											detailOnly
											hideSelectedEmailBackButton
											desktopWidth={501}
											desktopHeight={703}
											sampleData={inboxSectionSampleData}
											onContactSelect={(contact) => {
												if (contact) {
													setSelectedContactForResearch(contact);
												}
											}}
											onContactHover={(contact) => {
												setHoveredContactForResearch(contact);
											}}
											isNarrow={true}
										/>
										{/* Inbox mode of ContactsExpandedList drives the selected email in the detail panel above. */}
										<div className="mt-[20px]" data-campaign-interactive-surface>
											<ContactsExpandedList
												contacts={contactsForContactsExpandedList}
												{...contactsListSupplementalProps}
												{...contactsListTopNavProps}
												isLoading={isContactsLoading}
												campaign={campaign}
												focusMode="inbox"
												inboxPanelTabRequest={inboxPanelTabRequest}
												selectedInboxEmailId={selectedInboxEmailId}
												onInboxEmailClick={handleInboxEmailClick}
												onContactHover={handleResearchContactHover}
												width={501}
												height={582}
												minRows={6}
											/>
										</div>
									</div>
								) : isInboxTabStacked || isNarrowDesktop ? (
									// Stacked layout (952px - 1317px): left inbox column + the compact-workspace
									// detail panel (501x703 gates InboxSection's campaign compact detail design).
									// 912 = 375 left column + 36 gap + 501 detail.
									<div
										className="flex flex-col items-center mx-auto"
										style={{ width: '912px' }}
									>
										<div className="flex flex-row items-start gap-[36px] w-full">
											{/* Left column: Campaign Header + Inbox list */}
											<div
												data-campaign-interactive-surface
												className="flex flex-col flex-shrink-0"
												style={{ gap: '16px', width: '375px' }}
											>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													draftingProgress={draftingProgressForHeader}
													onFromClick={onOpenIdentityDialog}
													onDraftsClick={goToDrafting}
													onSentClick={goToSent}
													width={375}
												/>
												{/* Inbox mode of ContactsExpandedList drives the selected email in the center panel. */}
												<ContactsExpandedList
													contacts={contactsForContactsExpandedList}
													{...contactsListSupplementalProps}
													{...contactsListTopNavProps}
													isLoading={isContactsLoading}
													campaign={campaign}
													focusMode="inbox"
													inboxPanelTabRequest={inboxPanelTabRequest}
													selectedInboxEmailId={selectedInboxEmailId}
													onInboxEmailClick={handleInboxEmailClick}
													onContactHover={handleResearchContactHover}
													width={375}
													height={582}
													minRows={6}
												/>
											</div>
											{/* Right column: selected email detail */}
											<div className="flex-shrink-0">
												<InboxSection
													allowedSenderEmails={campaignContactEmails}
													contactByEmail={campaignContactsByEmail}
													campaignId={campaign.id}
													onGoToDrafting={goToDrafting}
													onGoToWriting={goToWriting}
													onGoToSearch={onGoToSearch}
													inboxSentTabRequest={effectiveInboxSentTabRequest}
													onInboxSentTabChange={onInboxSentTabChange}
													onCampaignInboxEmpty={
														inboxMockOverrideActive || !renderGlobalOverlays
															? undefined
															: handleCampaignInboxEmpty
													}
													selectedEmailId={selectedInboxEmailId}
													onSelectedEmailIdChange={setSelectedInboxEmailId}
													onThreadReplySent={handleInboxThreadReplySent}
													autoSelectFirstEmail
													detailOnly
													hideSelectedEmailBackButton
													desktopWidth={501}
													desktopHeight={703}
													sampleData={inboxSectionSampleData}
													onContactSelect={(contact) => {
														if (contact) {
															setSelectedContactForResearch(contact);
														}
													}}
													onContactHover={(contact) => {
														setHoveredContactForResearch(contact);
													}}
													isNarrow={true}
												/>
											</div>
										</div>
									</div>
								) : (
									// Normal wide layout
									<>
										{/* Center panel: selected email detail.
										    Cancel the wrapping `mt-6` so the box sits flush at the top of
										    the flow — matching the Write/Drafts right panel, which has no
										    top margin and so sits slightly above the left header box. */}
										<div
											style={{
												transform: `translateX(${activeInboxMainPanelShiftRightPx}px)`,
												marginTop: `${-inboxWideTopMarginPx}px`,
											}}
										>
											<InboxSection
												allowedSenderEmails={campaignContactEmails}
												contactByEmail={campaignContactsByEmail}
												campaignId={campaign.id}
												onGoToDrafting={goToDrafting}
												onGoToWriting={goToWriting}
												onGoToSearch={onGoToSearch}
												inboxSentTabRequest={effectiveInboxSentTabRequest}
												onInboxSentTabChange={onInboxSentTabChange}
												onCampaignInboxEmpty={
													inboxMockOverrideActive || !renderGlobalOverlays
														? undefined
														: handleCampaignInboxEmpty
												}
												selectedEmailId={selectedInboxEmailId}
												onSelectedEmailIdChange={setSelectedInboxEmailId}
												onThreadReplySent={handleInboxThreadReplySent}
												autoSelectFirstEmail
												detailOnly
												hideSelectedEmailBackButton
												desktopWidth={activeInboxMainPanelWidthPx}
												desktopHeight={activeInboxMainPanelHeightPx}
												sampleData={inboxSectionSampleData}
												onContactSelect={(contact) => {
													if (contact) {
														setSelectedContactForResearch(contact);
													}
												}}
												onContactHover={(contact) => {
													setHoveredContactForResearch(contact);
												}}
												isNarrow={isCampaignWorkspaceCompact || isInboxTabNarrow}
											/>
										</div>
									</>
								)}
							</div>
						)}

						{shouldRenderWriteBottomDraftBar && (
							<div
								className="absolute left-0 right-0 z-30 flex justify-center"
								style={{
									top: `${writeDraftBottomBarSlotTopPx}px`,
									transform: isCampaignWorkspaceCompact
										? 'translateX(-180px)'
										: undefined,
								}}
							>
								{renderWriteBottomDraftBar()}
							</div>
						)}

						{shouldRenderDraftsBottomSendBar && (
							<div
								ref={draftsSendBarWrapperRef}
								className="absolute left-0 right-0 z-30 flex justify-center"
								style={{
									top: `${writeDraftBottomBarSlotTopPx}px`,
									transform: isCampaignWorkspaceCompact
										? 'translateX(-180px)'
										: undefined,
									// Kept mounted (so it stays measurable) but hidden when the open
									// draft's action row would collide with it. See the overlap-
									// detection effect above.
									visibility: isDraftReviewOverlappingSendBar ? 'hidden' : 'visible',
									pointerEvents: isDraftReviewOverlappingSendBar ? 'none' : undefined,
								}}
							>
								{renderDraftsBottomSendBar()}
							</div>
						)}

						{shouldRenderSharedBottomPanels && (
							<div
								className="absolute left-0 right-0 z-30 flex justify-center"
								style={{
									top: `${sharedBottomPanelSlotTopPx}px`,
									transform: isCampaignWorkspaceCompact
										? 'translateX(-180px)'
										: undefined,
								}}
							>
								<BottomPanelsContainer
									className="flex justify-center gap-[15px]"
									data-campaign-bottom-anchor
									collapsed={bottomPanelCollapsed}
									historyActions={historyActions}
								>
									{sharedBottomPanelKinds.map(renderSharedBottomPanel)}
								</BottomPanelsContainer>
							</div>
						)}

						{/* Mobile-only: show the Drafting status panel inside the Drafting tab - disabled for now */}
						{/* {view === 'drafting' && isMobile && (
							<div className="mt-6 lg:hidden w-screen max-w-none px-3 flex justify-center">
								<DraftingStatusPanel
									campaign={campaign}
									contacts={contacts || []}
									form={form}
									generationProgress={generationProgress}
									onOpenDrafting={goToDrafting}
									isGenerationDisabled={isGenerationDisabled}
									isPendingGeneration={isPendingGeneration}
									isLivePreviewVisible={isLivePreviewVisible}
									livePreviewContactId={livePreviewContactId || undefined}
									livePreviewSubject={livePreviewSubject}
									livePreviewMessage={livePreviewMessage}
									onDraftSelectedContacts={async (ids) => {
										await handleGenerateDrafts(ids);
									}}
								/>
							</div>
						)} */}
					</div>

					{/* Spacer below expanded lists (mobile only; desktop campaign page should not scroll) */}
					{isMobile && (
						<div
							className="relative w-screen max-w-none mt-10 pb-10"
							aria-hidden="true"
						/>
					)}
				</form>
			</Form>

			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={isOpenUpgradeSubscriptionDrawer}
				setIsOpen={setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>
			{/* Search/overview rail rows hover the same research card, rendered as a fixed
			    overlay so it escapes the rails' clipping/scaled wrappers. Portaled INTO the
			    campaign interactive layer (not <body>) so it shares the stacking context of
			    the bottom count boxes — that layer is `isolation: isolate`, so a <body> portal
			    paints BELOW it regardless of z-index; inside it, z-9999 wins. The layer isn't
			    transformed (campaign zoom lives on <html>), so a fixed child positions the
			    same as a body portal and the getMurmurRootScale math is unchanged. */}
			{isRailHoverResearchEnabled &&
				railHoverResearchContact &&
				railHoverResearchPos &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						className="fixed pointer-events-none"
						style={{
							zIndex: 9999,
							top: `${railHoverResearchPos.topPx}px`,
							left: `${railHoverResearchPos.leftPx}px`,
							transform: `scale(${railHoverResearchPos.scale})`,
							transformOrigin: 'top left',
						}}
					>
						<ContactResearchHoverCard contact={railHoverResearchContact} />
					</div>,
					document.querySelector('.campaign-map-interactive-page') ?? document.body
				)}
		</div>
	);
};
