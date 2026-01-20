import { FC, Fragment, useCallback, useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import {
	DraftingSectionProps,
	useDraftingSection,
	HybridBlockPrompt,
	type DraftingFormValues,
} from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
// EmailGeneration kept available but not used in current view
// import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import {
	cn,
	stringifyJsonSubset,
	generateEmailTemplateFromBlocks,
	generatePromptsFromBlocks,
	removeEmDashes,
	stripEmailSignatureFromAiMessage,
	convertAiResponseToRichTextEmail,
	convertHtmlToPlainText,
} from '@/utils';
import {
	extractMurmurDraftSettingsSnapshot,
	injectMurmurDraftSettingsSnapshot,
} from '@/utils/draftSettings';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useGetContacts, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus, EmailVerificationStatus, DraftingMode, ReviewStatus } from '@/constants/prismaEnums';
import { resolveAutoSignatureText } from '@/constants/autoSignatures';
import { ContactsSelection } from './EmailGeneration/ContactsSelection/ContactsSelection';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';
import { DraftedEmails, type DraftedEmailsHandle } from './EmailGeneration/DraftedEmails/DraftedEmails';
import { EmailWithRelations, StripeSubscriptionStatus } from '@/types';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useEditIdentity } from '@/hooks/queryHooks/useIdentities';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContactWithName } from '@/types/contact';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { TestPreviewPanel } from '@/components/molecules/TestPreviewPanel/TestPreviewPanel';
import { MiniEmailStructure } from './EmailGeneration/MiniEmailStructure';
import ContactsExpandedList from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import { DraftsExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftsExpandedList';
import { DraftPreviewExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftPreviewExpandedList';
import { SentExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/SentExpandedList';
import { InboxExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/InboxExpandedList';
import SearchResultsMap from '@/components/molecules/SearchResultsMap/SearchResultsMap';
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
import { useGemini } from '@/hooks/useGemini';
import { useOpenRouter } from '@/hooks/useOpenRouter';
import {
	FULL_AI_DRAFTING_SYSTEM_PROMPT,
	GEMINI_HYBRID_PROMPT,
	OPENROUTER_DRAFTING_MODELS,
	insertWebsiteLinkPhrase,
} from '@/constants/ai';
import { Contact, Identity } from '@prisma/client';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';

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

interface ExtendedDraftingSectionProps extends DraftingSectionProps {
	onOpenIdentityDialog?: () => void;
	autoOpenProfileTabWhenIncomplete?: boolean;
}

export const DraftingSection: FC<ExtendedDraftingSectionProps> = (props) => {
	const {
		view = 'testing',
		renderGlobalOverlays = true,
		onViewReady,
		goToDrafting,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		goToAll: _goToAll,
		goToWriting,
		onOpenIdentityDialog,
		onGoToSearch,
		goToInbox,
		goToContacts,
		goToSent,
		goToPreviousTab,
		goToNextTab,
		hideHeaderBox,
		isTransitioningOut,
		isTransitioningIn,
	} = props;

	// Let the campaign page know when the destination view has actually rendered,
	// so we can avoid ending the tab crossfade before heavy UI (e.g. HybridPromptInput) is painted.
	// We also keep a local "painted view" ref so the inbox morph animation can hold its final
	// frame until the destination view has *actually painted*, avoiding a blank flash.
	const lastPaintedViewRef = useRef<typeof view>(view);
	useEffect(() => {
		if (!renderGlobalOverlays) return;
		lastPaintedViewRef.current = view;
		onViewReady?.(view);
	}, [onViewReady, renderGlobalOverlays, view]);
	const {
		campaign,
		contacts,
		form,
		promptQualityScore,
		promptQualityLabel,
		promptSuggestions,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		isUpscalingPrompt,
		upscalePrompt,
		undoUpscalePrompt,
		hasPreviousPrompt,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
		handleGenerateDrafts,
		generationProgress,
		scoreFullAutomatedPrompt,
		critiqueManualEmailText,
		// These are kept available for future use but not in current view:
		// setGenerationProgress,
		// cancelGeneration,
		// isFirstLoad,
		// scrollToEmailStructure,
		draftingRef,
		emailStructureRef,
		isLivePreviewVisible,
		livePreviewContactId,
		livePreviewMessage,
		livePreviewSubject,
		livePreviewDraftNumber,
		livePreviewTotal,
	} = useDraftingSection(props);

	const { user, subscriptionTier, isFreeTrial } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });
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
		const identityProfile = campaign?.identity as IdentityProfileFields | undefined | null;
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
	const [isClient, setIsClient] = useState(false);
	useEffect(() => setIsClient(true), []);
	const progressBarPortalTarget = useMemo(() => {
		if (!isClient) return null;
		// We want the bar to live at the top of the DOCUMENT (not the viewport),
		// so it scrolls away naturally with the page.
		return document.body;
	}, [isClient]);
	const isDraftingView = view === 'drafting';
	const isSentView = view === 'sent';
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	// Ref to the main DraftedEmails instance (center column) so side preview controls can exit regen mode.
	const draftedEmailsRef = useRef<DraftedEmailsHandle | null>(null);
	// Tracks whether the DraftedEmails "regen settings preview" (HybridPromptInput) is open for the selected draft.
	// Used to swap the pinned left column from DraftsExpandedList -> full email preview while regenerating.
	const [isSelectedDraftRegenSettingsPreviewOpen, setIsSelectedDraftRegenSettingsPreviewOpen] =
		useState(false);
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
	const draftForSettingsPreview =
		isDraftingView ? selectedDraft ?? hoveredDraftForSettings : null;
	useEffect(() => {
		if (!isDraftingView) {
			// Avoid leaking hover state across tabs.
			if (hoveredDraftForSettings) setHoveredDraftForSettings(null);
			return;
		}

		const snapshot = draftForSettingsPreview
			? extractMurmurDraftSettingsSnapshot(draftForSettingsPreview.message)
			: null;
		const nextValues = snapshot?.values ?? form.getValues();
		draftsSettingsPreviewForm.reset(nextValues);
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
	useEffect(() => {
		if (!isSentView) {
			// Avoid leaking hover state across tabs.
			if (hoveredSentForSettings) setHoveredSentForSettings(null);
			return;
		}

		const snapshot = sentForSettingsPreview
			? extractMurmurDraftSettingsSnapshot(sentForSettingsPreview.message)
			: null;
		const nextValues = snapshot?.values ?? form.getValues();
		sentSettingsPreviewForm.reset(nextValues);
	}, [
		view,
		sentForSettingsPreview?.id,
		sentForSettingsPreview?.message,
		form,
		sentSettingsPreviewForm,
		hoveredSentForSettings,
	]);

	// All tab hover states
	const [isContactsHovered, setIsContactsHovered] = useState(false);
	const [isWritingHovered, setIsWritingHovered] = useState(false);
	const [isDraftsHovered, setIsDraftsHovered] = useState(false);
	const [isSentHovered, setIsSentHovered] = useState(false);
	const [isInboxHovered, setIsInboxHovered] = useState(false);

	// Narrow desktop detection for Writing tab compact layout.
	// Note: widened upper bound from 1280 -> 1317 so the left pinned panel never clips
	// when campaign zoom / browser zoom reduces available space.
	const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
	// Narrowest desktop detection (< 952px) - shows contacts table below writing box
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Search tab narrow detection (< 1414px) - reduces map box width
	const [isSearchTabNarrow, setIsSearchTabNarrow] = useState(false);
	// All tab narrow detection (<= 1269px) - switches from 4x2 to 2x4 grid
	const [isAllTabNarrow, setIsAllTabNarrow] = useState(false);
	// Inbox tab narrow detection (<= 1520px) - reduces inbox box width to 516px
	const [isInboxTabNarrow, setIsInboxTabNarrow] = useState(false);
	// Inbox tab stacked layout detection (<= 1279px) - moves research panel below header box on the left
	const [isInboxTabStacked, setIsInboxTabStacked] = useState(false);
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
			const varZoomStr = window.getComputedStyle(html).getPropertyValue(CAMPAIGN_ZOOM_VAR);
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
			setIsAllTabNarrow(effectiveWidth <= 1269);
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

	// --- Pinned left panel (ContactsExpandedList <-> MiniEmailStructure) ---
	// We intentionally render the correct panel immediately (no height-morph animation),
	// because the panel heights are now kept in sync across tabs.
	type PinnedLeftPanelVariant = 'contacts' | 'mini';
	const pinnedLeftPanelVariant: PinnedLeftPanelVariant = useMemo(() => {
		if (view === 'testing' || view === 'search') return 'contacts';
		return 'mini';
	}, [view]);

	// Track previous view to detect when we're transitioning from inbox/search.
	// When coming from these views, the pinned left panel (ContactsExpandedList or
	// MiniEmailStructure) should fade in to blend with the morph animations.
	const prevViewForPinnedPanelRef = useRef<typeof view>(view);
	const [isEnteringFromMorphView, setIsEnteringFromMorphView] = useState(false);
	useLayoutEffect(() => {
		const prevView = prevViewForPinnedPanelRef.current;
		prevViewForPinnedPanelRef.current = view;
		// Detect transition from inbox/search to tabs that show the pinned left panel.
		// This includes: testing (ContactsExpandedList), contacts/drafting/sent (MiniEmailStructure)
		const isMorphOrigin = prevView === 'inbox' || prevView === 'search';
		const showsPinnedPanel = view === 'testing' || view === 'contacts' || view === 'drafting' || view === 'sent';
		if (isMorphOrigin && showsPinnedPanel) {
			setIsEnteringFromMorphView(true);
			// Clear the flag after the morph animation completes (~350ms)
			const timer = setTimeout(() => setIsEnteringFromMorphView(false), 400);
			return () => clearTimeout(timer);
		}
	}, [view]);

	// Mirror the exact render conditions for the absolute pinned left column and for this shell.
	// We only animate when the shell is actually rendered.
	const shouldRenderAbsolutePinnedLeftColumn =
		!isMobile &&
		!hideHeaderBox &&
		['testing', 'contacts', 'drafting', 'sent', 'search', 'inbox'].includes(view) &&
		!(view === 'testing' && isNarrowDesktop) &&
		!(view === 'contacts' && isNarrowDesktop) &&
		!(view === 'drafting' && isNarrowDesktop) &&
		!(view === 'sent' && isNarrowDesktop) &&
		!(view === 'search' && isSearchTabNarrow) &&
		!(view === 'inbox' && isInboxTabStacked);

	// (No pinned-left-panel morph animation)

	// --- Main box morph transition (Contacts/Writing/Drafts/Sent <-> Search/Inbox) ---
	type CampaignMainBoxKey = 'writing' | 'contacts' | 'drafts' | 'sent' | 'search' | 'inbox';
	const getCampaignMainBoxKey = useCallback((v: typeof view): CampaignMainBoxKey | null => {
		if (v === 'testing') return 'writing';
		if (v === 'contacts') return 'contacts';
		if (v === 'drafting') return 'drafts';
		if (v === 'sent') return 'sent';
		if (v === 'search') return 'search';
		if (v === 'inbox') return 'inbox';
		return null;
	}, []);

	// --- Research panel morph transition (Standard tabs <-> Search/Inbox) ---
	type CampaignResearchPanelKey = 'standard' | 'search' | 'inbox';
	const getCampaignResearchPanelKey = useCallback(
		(v: typeof view): CampaignResearchPanelKey | null => {
			if (v === 'search') return 'search';
			if (v === 'inbox') return 'inbox';
			if (v === 'testing' || v === 'contacts' || v === 'drafting' || v === 'sent') return 'standard';
			return null;
		},
		[]
	);

	const MAIN_BOX_VISUAL: Record<
		CampaignMainBoxKey,
		{ borderWidthPx: number; radiusPx: number; borderColor: string }
	> = useMemo(
		() => ({
			writing: { borderWidthPx: 3, radiusPx: 6, borderColor: '#000000' },
			contacts: { borderWidthPx: 2, radiusPx: 8, borderColor: '#000000' },
			drafts: { borderWidthPx: 3, radiusPx: 8, borderColor: '#000000' },
			sent: { borderWidthPx: 2, radiusPx: 8, borderColor: '#19670F' },
			search: { borderWidthPx: 3, radiusPx: 12, borderColor: '#143883' },
			inbox: { borderWidthPx: 3, radiusPx: 8, borderColor: '#000000' },
		}),
		[]
	);

	const mainBoxGhostRef = useRef<HTMLDivElement | null>(null);
	const mainBoxGhostFromFillRef = useRef<HTMLDivElement | null>(null);
	const mainBoxGhostToFillRef = useRef<HTMLDivElement | null>(null);
	const mainBoxGhostFromContentRef = useRef<HTMLDivElement | null>(null);
	const mainBoxGhostToContentRef = useRef<HTMLDivElement | null>(null);
	const mainBoxTransitionIdRef = useRef(0);
	const mainBoxActiveElRef = useRef<HTMLElement | null>(null);

	// Stores the LAST rendered main box (used as the "from" rect when the view changes).
	const lastMainBoxKeyRef = useRef<CampaignMainBoxKey | null>(getCampaignMainBoxKey(view));
	const lastMainBoxRectRef = useRef<DOMRect | null>(null);

	const researchPanelGhostRef = useRef<HTMLDivElement | null>(null);
	const researchPanelGhostFromFillRef = useRef<HTMLDivElement | null>(null);
	const researchPanelGhostToFillRef = useRef<HTMLDivElement | null>(null);
	const researchPanelGhostFromContentRef = useRef<HTMLDivElement | null>(null);
	const researchPanelGhostToContentRef = useRef<HTMLDivElement | null>(null);
	const researchPanelTransitionIdRef = useRef(0);
	const researchPanelActiveElRef = useRef<HTMLElement | null>(null);

	// Stores the LAST rendered research panel (used as the "from" rect when the view changes).
	const lastResearchPanelKeyRef = useRef<CampaignResearchPanelKey | null>(
		getCampaignResearchPanelKey(view)
	);
	const lastResearchPanelRectRef = useRef<DOMRect | null>(null);

	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (isMobile) return;

		const ghost = mainBoxGhostRef.current;
		const ghostFromFill = mainBoxGhostFromFillRef.current;
		const ghostToFill = mainBoxGhostToFillRef.current;
		const ghostFromContent = mainBoxGhostFromContentRef.current;
		const ghostToContent = mainBoxGhostToContentRef.current;
		if (!ghost || !ghostFromFill || !ghostToFill || !ghostFromContent || !ghostToContent) return;

		const fromKey = lastMainBoxKeyRef.current;
		const fromRect = lastMainBoxRectRef.current;
		const toKey = getCampaignMainBoxKey(view);

		// Reset any previously "held" element state.
		mainBoxActiveElRef.current = null;

		// Only morph when entering/leaving the Search or Inbox tabs.
		const isMorphEndpoint = (k: CampaignMainBoxKey) => k === 'search' || k === 'inbox';
		if (
			!fromKey ||
			!fromRect ||
			!toKey ||
			fromKey === toKey ||
			(!isMorphEndpoint(fromKey) && !isMorphEndpoint(toKey))
		) {
			gsap.killTweensOf(ghost);
			gsap.set(ghost, { opacity: 0 });
			return;
		}

		const transitionId = ++mainBoxTransitionIdRef.current;

		gsap.killTweensOf(ghost);
		gsap.killTweensOf(ghostFromFill);
		gsap.killTweensOf(ghostToFill);
		gsap.killTweensOf(ghostFromContent);
		gsap.killTweensOf(ghostToContent);

		// Match normal tab crossfade timing (350ms total).
		const morphSeconds = 0.35;
		const morphEase = 'power2.inOut';
		const HANDOFF_SECONDS = 0.03;

		// Snap to device pixels to keep borders crisp.
		const dpr = window.devicePixelRatio || 1;
		const snapPx = (v: number) => Math.round(v * dpr) / dpr;
		const snapStep = 1 / (dpr || 1);

		const tweenTo = (target: gsap.TweenTarget, vars: gsap.TweenVars) =>
			new Promise<void>((resolve) => {
				gsap.to(target, { ...vars, onComplete: resolve });
			});
		const nextFrame = () =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => resolve());
			});

		const getVisualBoxEl = (wrapper: HTMLElement | null): HTMLElement | null => {
			if (!wrapper) return null;
			const inner = wrapper.querySelector('[data-drafting-table]') as HTMLElement | null;
			return inner ?? wrapper;
		};

		const copyBackgroundStyles = (fill: HTMLElement, source: HTMLElement) => {
			const cs = window.getComputedStyle(source);
			fill.style.backgroundImage = cs.backgroundImage;
			fill.style.backgroundColor = cs.backgroundColor;
			fill.style.backgroundRepeat = cs.backgroundRepeat;
			fill.style.backgroundSize = cs.backgroundSize;
			fill.style.backgroundPosition = cs.backgroundPosition;
		};

		const buildGhostContentClone = (source: HTMLElement): HTMLElement => {
			const clone = source.cloneNode(true) as HTMLElement;
			clone.removeAttribute('data-campaign-main-box');
			clone.removeAttribute('id');
			clone.querySelectorAll('[data-campaign-main-box]').forEach((n) =>
				(n as HTMLElement).removeAttribute('data-campaign-main-box')
			);
			clone.querySelectorAll('[id]').forEach((n) => (n as HTMLElement).removeAttribute('id'));
			clone.style.position = 'absolute';
			clone.style.left = '0';
			clone.style.top = '0';
			clone.style.width = '100%';
			clone.style.height = '100%';
			clone.style.margin = '0';
			clone.style.maxWidth = 'none';
			clone.style.boxSizing = 'border-box';
			clone.style.border = 'none';
			clone.style.borderColor = 'transparent';
			clone.style.outline = 'none';
			clone.style.background = 'transparent';
			clone.style.backgroundColor = 'transparent';
			clone.style.backgroundImage = 'none';
			clone.setAttribute('aria-hidden', 'true');
			clone.style.pointerEvents = 'none';
			return clone;
		};

		const hideBox = (el: HTMLElement | null) => {
			if (!el) return null;
			const prev = { opacity: el.style.opacity, pointerEvents: el.style.pointerEvents };
			el.style.opacity = '0';
			el.style.pointerEvents = 'none';
			return () => {
				el.style.opacity = prev.opacity;
				el.style.pointerEvents = prev.pointerEvents;
			};
		};

		const cleanupFns: Array<() => void> = [];
		const scheduleDomCleanup = (fn: () => void) => {
			const w = window as any;
			if (typeof w.requestIdleCallback === 'function') {
				w.requestIdleCallback(fn, { timeout: 750 });
			} else {
				window.setTimeout(fn, 0);
			}
		};

		(async () => {
			const fromVisual = MAIN_BOX_VISUAL[fromKey];
			const toVisual = MAIN_BOX_VISUAL[toKey];

			const zoomStr = window.getComputedStyle(document.documentElement).zoom;
			const zoom = zoomStr ? parseFloat(zoomStr) : 1;
			const z = zoom || 1;

			const fromWrapper = document.querySelector(
				`[data-campaign-main-box="${fromKey}"]`
			) as HTMLElement | null;
			const fromVisualEl = getVisualBoxEl(fromWrapper);

			let toWrapper = document.querySelector(
				`[data-campaign-main-box="${toKey}"]`
			) as HTMLElement | null;
			if (!toWrapper) {
				await nextFrame();
				if (mainBoxTransitionIdRef.current !== transitionId) return;
				toWrapper = document.querySelector(
					`[data-campaign-main-box="${toKey}"]`
				) as HTMLElement | null;
			}
			if (!toWrapper) {
				gsap.set(ghost, { opacity: 0 });
				return;
			}
			const toVisualEl = getVisualBoxEl(toWrapper);

			// Prime fills
			if (fromVisualEl) copyBackgroundStyles(ghostFromFill, fromVisualEl);
			gsap.set(ghostFromFill, { opacity: 1 });
			if (toVisualEl) copyBackgroundStyles(ghostToFill, toVisualEl);
			gsap.set(ghostToFill, { opacity: 0 });

			// Prime content
			ghostFromContent.replaceChildren();
			ghostToContent.replaceChildren();
			if (fromVisualEl) ghostFromContent.appendChild(buildGhostContentClone(fromVisualEl));
			if (toVisualEl) ghostToContent.appendChild(buildGhostContentClone(toVisualEl));
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });

			// Position ghost at from box
			ghost.style.left = `${snapPx(fromRect.left / z)}px`;
			ghost.style.top = `${snapPx(fromRect.top / z)}px`;
			ghost.style.width = `${snapPx(fromRect.width / z)}px`;
			ghost.style.height = `${snapPx(fromRect.height / z)}px`;
			ghost.style.borderWidth = `${fromVisual.borderWidthPx}px`;
			ghost.style.borderColor = fromVisual.borderColor;
			ghost.style.borderRadius = `${fromVisual.radiusPx}px`;
			ghost.style.opacity = '1';

			// Hide real boxes
			const restoreFrom = hideBox(fromWrapper);
			if (restoreFrom) cleanupFns.push(restoreFrom);
			const restoreTo = hideBox(toWrapper);
			if (restoreTo) cleanupFns.push(restoreTo);
			mainBoxActiveElRef.current = toWrapper;

			const toRect = toWrapper.getBoundingClientRect();
			const toLeft = snapPx(toRect.left / z);
			const toTop = snapPx(toRect.top / z);
			const toWidth = snapPx(toRect.width / z);
			const toHeight = snapPx(toRect.height / z);

			// Morph ghost + crossfade fills/content
			await Promise.all([
				tweenTo(ghost, {
					left: toLeft,
					top: toTop,
					width: toWidth,
					height: toHeight,
					borderWidth: `${toVisual.borderWidthPx}px`,
					borderColor: toVisual.borderColor,
					borderRadius: `${toVisual.radiusPx}px`,
					duration: morphSeconds,
					ease: morphEase,
					snap: { left: snapStep, top: snapStep, width: snapStep, height: snapStep },
				}),
				tweenTo(ghostFromFill, { opacity: 0, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostToFill, { opacity: 1, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostFromContent, { opacity: 0, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostToContent, { opacity: 1, duration: morphSeconds, ease: morphEase }),
			]);
			if (mainBoxTransitionIdRef.current !== transitionId) return;

			// Hand-off: show destination behind ghost, wait, then drop ghost
			restoreTo?.();
			await tweenTo(toWrapper, { opacity: 1, duration: HANDOFF_SECONDS, ease: 'none' });
			if (mainBoxTransitionIdRef.current !== transitionId) return;

			// Inbox -> other tab: if the destination hasn't painted yet, keep the ghost "parked"
			// at the final position until we know the destination UI is ready to be revealed.
			const shouldHoldGhostUntilPaint = fromKey === 'inbox' && toKey !== 'inbox';
			if (shouldHoldGhostUntilPaint && renderGlobalOverlays) {
				const HOLD_TIMEOUT_MS = 1200;
				const holdStart = performance.now();
				while (
					lastPaintedViewRef.current !== view &&
					mainBoxTransitionIdRef.current === transitionId &&
					performance.now() - holdStart < HOLD_TIMEOUT_MS
				) {
					await nextFrame();
				}
				if (mainBoxTransitionIdRef.current !== transitionId) return;

				// Dissolve the ghost into the real destination so it feels like one continuous motion.
				await tweenTo(ghost, { opacity: 0, duration: 0.14, ease: 'power1.out' });
				if (mainBoxTransitionIdRef.current !== transitionId) return;
			} else {
				// Preserve existing behavior for non-inbox morphs.
				gsap.set(ghost, { opacity: 0 });
			}

			gsap.set(ghostFromFill, { opacity: 1 });
			gsap.set(ghostToFill, { opacity: 0 });
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });

			scheduleDomCleanup(() => {
				ghostFromContent.replaceChildren();
				ghostToContent.replaceChildren();
			});

			mainBoxActiveElRef.current = null;
		})();

		return () => {
			mainBoxTransitionIdRef.current = transitionId + 1;
			gsap.killTweensOf(ghost);
			gsap.killTweensOf(ghostFromFill);
			gsap.killTweensOf(ghostToFill);
			gsap.killTweensOf(ghostFromContent);
			gsap.killTweensOf(ghostToContent);
			const el = mainBoxActiveElRef.current;
			if (el) {
				gsap.killTweensOf(el);
				gsap.set(el, { opacity: 1, clearProps: 'pointerEvents' });
			}
			cleanupFns.forEach((fn) => fn());
			gsap.set(ghost, { opacity: 0 });
			gsap.set(ghostFromFill, { opacity: 1 });
			gsap.set(ghostToFill, { opacity: 0 });
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });
			ghostFromContent.replaceChildren();
			ghostToContent.replaceChildren();
			mainBoxActiveElRef.current = null;
		};
	}, [view, isMobile, MAIN_BOX_VISUAL, getCampaignMainBoxKey]);

	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (isMobile) return;

		const ghost = researchPanelGhostRef.current;
		const ghostFromFill = researchPanelGhostFromFillRef.current;
		const ghostToFill = researchPanelGhostToFillRef.current;
		const ghostFromContent = researchPanelGhostFromContentRef.current;
		const ghostToContent = researchPanelGhostToContentRef.current;
		if (!ghost || !ghostFromFill || !ghostToFill || !ghostFromContent || !ghostToContent) return;

		const fromKey = lastResearchPanelKeyRef.current;
		const fromRect = lastResearchPanelRectRef.current;
		const toKey = getCampaignResearchPanelKey(view);

		// Reset any previously "held" element state.
		researchPanelActiveElRef.current = null;

		// Only morph when entering/leaving the Search or Inbox tabs.
		const isMorphEndpoint = (k: CampaignResearchPanelKey) => k === 'search' || k === 'inbox';
		if (
			!fromKey ||
			!fromRect ||
			!toKey ||
			fromKey === toKey ||
			(!isMorphEndpoint(fromKey) && !isMorphEndpoint(toKey))
		) {
			gsap.killTweensOf(ghost);
			gsap.set(ghost, { opacity: 0 });
			return;
		}

		const transitionId = ++researchPanelTransitionIdRef.current;

		gsap.killTweensOf(ghost);
		gsap.killTweensOf(ghostFromFill);
		gsap.killTweensOf(ghostToFill);
		gsap.killTweensOf(ghostFromContent);
		gsap.killTweensOf(ghostToContent);

		// Match the main box morph timing/ease so the research panel stays in lockstep.
		const morphSeconds = 0.35;
		const morphEase = 'power2.inOut';
		const HANDOFF_SECONDS = 0.03;

		// Snap to device pixels to keep borders crisp.
		const dpr = window.devicePixelRatio || 1;
		const snapPx = (v: number) => Math.round(v * dpr) / dpr;
		const snapStep = 1 / (dpr || 1);

		const tweenTo = (target: gsap.TweenTarget, vars: gsap.TweenVars) =>
			new Promise<void>((resolve) => {
				gsap.to(target, { ...vars, onComplete: resolve });
			});
		const nextFrame = () =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => resolve());
			});

		const getVisualPanelEl = (wrapper: HTMLElement | null): HTMLElement | null => {
			if (!wrapper) return null;
			const inner = wrapper.firstElementChild as HTMLElement | null;
			return inner ?? wrapper;
		};

		const copyBackgroundStyles = (fill: HTMLElement, source: HTMLElement) => {
			const cs = window.getComputedStyle(source);
			fill.style.backgroundImage = cs.backgroundImage;
			fill.style.backgroundColor = cs.backgroundColor;
			fill.style.backgroundRepeat = cs.backgroundRepeat;
			fill.style.backgroundSize = cs.backgroundSize;
			fill.style.backgroundPosition = cs.backgroundPosition;
		};

		const buildGhostContentClone = (source: HTMLElement): HTMLElement => {
			const clone = source.cloneNode(true) as HTMLElement;
			clone.removeAttribute('data-research-panel-container');
			clone.removeAttribute('data-research-panel-variant');
			clone.removeAttribute('data-hover-description');
			clone.querySelectorAll('[data-research-panel-container]').forEach((n) =>
				(n as HTMLElement).removeAttribute('data-research-panel-container')
			);
			clone.querySelectorAll('[data-research-panel-variant]').forEach((n) =>
				(n as HTMLElement).removeAttribute('data-research-panel-variant')
			);
			clone.querySelectorAll('[id]').forEach((n) => (n as HTMLElement).removeAttribute('id'));
			clone.style.position = 'absolute';
			clone.style.left = '0';
			clone.style.top = '0';
			clone.style.width = '100%';
			clone.style.height = '100%';
			clone.style.margin = '0';
			clone.style.maxWidth = 'none';
			clone.style.boxSizing = 'border-box';
			// Ensure it's visible even if Tailwind's `hidden xl:block` exists on the source.
			clone.style.display = 'block';
			clone.style.visibility = 'visible';
			// Remove outer chrome so the ghost container owns the border/background.
			clone.style.border = 'none';
			clone.style.borderColor = 'transparent';
			clone.style.outline = 'none';
			clone.style.background = 'transparent';
			clone.style.backgroundColor = 'transparent';
			clone.style.backgroundImage = 'none';
			clone.setAttribute('aria-hidden', 'true');
			clone.style.pointerEvents = 'none';
			return clone;
		};

		const hideBox = (el: HTMLElement | null) => {
			if (!el) return null;
			const prev = { opacity: el.style.opacity, pointerEvents: el.style.pointerEvents };
			el.style.opacity = '0';
			el.style.pointerEvents = 'none';
			return () => {
				el.style.opacity = prev.opacity;
				el.style.pointerEvents = prev.pointerEvents;
			};
		};

		const cleanupFns: Array<() => void> = [];
		const scheduleDomCleanup = (fn: () => void) => {
			const w = window as any;
			if (typeof w.requestIdleCallback === 'function') {
				w.requestIdleCallback(fn, { timeout: 750 });
			} else {
				window.setTimeout(fn, 0);
			}
		};

		(async () => {
			const zoomStr = window.getComputedStyle(document.documentElement).zoom;
			const zoom = zoomStr ? parseFloat(zoomStr) : 1;
			const z = zoom || 1;

			const fromWrapper = document.querySelector(
				`[data-research-panel-variant="${fromKey}"]`
			) as HTMLElement | null;
			if (!fromWrapper) {
				gsap.set(ghost, { opacity: 0 });
				return;
			}
			const fromVisualEl = getVisualPanelEl(fromWrapper);

			let toWrapper = document.querySelector(
				`[data-research-panel-variant="${toKey}"]`
			) as HTMLElement | null;
			if (!toWrapper) {
				await nextFrame();
				if (researchPanelTransitionIdRef.current !== transitionId) return;
				toWrapper = document.querySelector(
					`[data-research-panel-variant="${toKey}"]`
				) as HTMLElement | null;
			}
			if (!toWrapper) {
				gsap.set(ghost, { opacity: 0 });
				return;
			}
			const toVisualEl = getVisualPanelEl(toWrapper);

			// Prime fills
			if (fromVisualEl) copyBackgroundStyles(ghostFromFill, fromVisualEl);
			gsap.set(ghostFromFill, { opacity: 1 });
			if (toVisualEl) copyBackgroundStyles(ghostToFill, toVisualEl);
			gsap.set(ghostToFill, { opacity: 0 });

			// Prime content
			ghostFromContent.replaceChildren();
			ghostToContent.replaceChildren();
			if (fromVisualEl) ghostFromContent.appendChild(buildGhostContentClone(fromVisualEl));
			if (toVisualEl) ghostToContent.appendChild(buildGhostContentClone(toVisualEl));
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });

			// Position ghost at from panel
			ghost.style.left = `${snapPx(fromRect.left / z)}px`;
			ghost.style.top = `${snapPx(fromRect.top / z)}px`;
			ghost.style.width = `${snapPx(fromRect.width / z)}px`;
			ghost.style.height = `${snapPx(fromRect.height / z)}px`;
			ghost.style.borderWidth = '3px';
			ghost.style.borderColor = '#000000';
			ghost.style.borderRadius = '7px';
			ghost.style.opacity = '1';

			// Hide real panels
			const restoreFrom = hideBox(fromWrapper);
			if (restoreFrom) cleanupFns.push(restoreFrom);
			const restoreTo = hideBox(toWrapper);
			if (restoreTo) cleanupFns.push(restoreTo);
			researchPanelActiveElRef.current = toWrapper;

			const toRect = toWrapper.getBoundingClientRect();
			const toLeft = snapPx(toRect.left / z);
			const toTop = snapPx(toRect.top / z);
			const toWidth = snapPx(toRect.width / z);
			const toHeight = snapPx(toRect.height / z);

			// Morph ghost + crossfade fills/content
			await Promise.all([
				tweenTo(ghost, {
					left: toLeft,
					top: toTop,
					width: toWidth,
					height: toHeight,
					duration: morphSeconds,
					ease: morphEase,
					snap: { left: snapStep, top: snapStep, width: snapStep, height: snapStep },
				}),
				tweenTo(ghostFromFill, { opacity: 0, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostToFill, { opacity: 1, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostFromContent, { opacity: 0, duration: morphSeconds, ease: morphEase }),
				tweenTo(ghostToContent, { opacity: 1, duration: morphSeconds, ease: morphEase }),
			]);
			if (researchPanelTransitionIdRef.current !== transitionId) return;

			// Hand-off: show destination behind ghost, wait, then drop ghost
			restoreTo?.();
			await tweenTo(toWrapper, { opacity: 1, duration: HANDOFF_SECONDS, ease: 'none' });
			if (researchPanelTransitionIdRef.current !== transitionId) return;

			// Mirror the main-box "inbox -> other" hold so the panel doesn't flicker during heavy paints.
			const shouldHoldGhostUntilPaint = fromKey === 'inbox' && toKey !== 'inbox';
			if (shouldHoldGhostUntilPaint && renderGlobalOverlays) {
				const HOLD_TIMEOUT_MS = 1200;
				const holdStart = performance.now();
				while (
					lastPaintedViewRef.current !== view &&
					researchPanelTransitionIdRef.current === transitionId &&
					performance.now() - holdStart < HOLD_TIMEOUT_MS
				) {
					await nextFrame();
				}
				if (researchPanelTransitionIdRef.current !== transitionId) return;

				await tweenTo(ghost, { opacity: 0, duration: 0.14, ease: 'power1.out' });
				if (researchPanelTransitionIdRef.current !== transitionId) return;
			} else {
				gsap.set(ghost, { opacity: 0 });
			}

			gsap.set(ghostFromFill, { opacity: 1 });
			gsap.set(ghostToFill, { opacity: 0 });
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });

			scheduleDomCleanup(() => {
				ghostFromContent.replaceChildren();
				ghostToContent.replaceChildren();
			});

			researchPanelActiveElRef.current = null;
		})();

		return () => {
			researchPanelTransitionIdRef.current = transitionId + 1;
			gsap.killTweensOf(ghost);
			gsap.killTweensOf(ghostFromFill);
			gsap.killTweensOf(ghostToFill);
			gsap.killTweensOf(ghostFromContent);
			gsap.killTweensOf(ghostToContent);
			const el = researchPanelActiveElRef.current;
			if (el) {
				gsap.killTweensOf(el);
				gsap.set(el, { opacity: 1, clearProps: 'pointerEvents' });
			}
			cleanupFns.forEach((fn) => fn());
			gsap.set(ghost, { opacity: 0 });
			gsap.set(ghostFromFill, { opacity: 1 });
			gsap.set(ghostToFill, { opacity: 0 });
			gsap.set(ghostFromContent, { opacity: 1 });
			gsap.set(ghostToContent, { opacity: 0 });
			ghostFromContent.replaceChildren();
			ghostToContent.replaceChildren();
			researchPanelActiveElRef.current = null;
		};
	}, [view, isMobile, getCampaignResearchPanelKey, renderGlobalOverlays]);

	// After every view/layout change, record the current main box rect so we can morph from it next time.
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (isMobile) return;

		const key = getCampaignMainBoxKey(view);
		lastMainBoxKeyRef.current = key;

		if (!key) return;
		const el = document.querySelector(`[data-campaign-main-box="${key}"]`) as HTMLElement | null;
		if (!el) return;

		const rect = el.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			lastMainBoxRectRef.current = rect;
		}
	}, [
		view,
		isMobile,
		isNarrowDesktop,
		isNarrowestDesktop,
		isSearchTabNarrow,
		isInboxTabNarrow,
		isInboxTabStacked,
		getCampaignMainBoxKey,
	]);

	// After every view/layout change, record the current research panel rect so we can morph from it next time.
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;
		if (isMobile) return;

		const key = getCampaignResearchPanelKey(view);
		lastResearchPanelKeyRef.current = key;
		if (!key) return;

		const el = document.querySelector(
			`[data-research-panel-variant="${key}"]`
		) as HTMLElement | null;
		if (!el) return;

		const rect = el.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			lastResearchPanelRectRef.current = rect;
		}
	}, [
		view,
		isMobile,
		isSearchTabNarrow,
		isInboxTabNarrow,
		isInboxTabStacked,
		hideHeaderBox,
		getCampaignResearchPanelKey,
	]);

	const handleRejectDraft = useCallback(
		async (draftId: number, currentlyRejected?: boolean) => {
			try {
				await updateEmail({
					id: draftId,
					data: { reviewStatus: currentlyRejected ? null : ReviewStatus.rejected },
				});
			} catch (error) {
				console.error('Failed to update draft review status:', error);
				toast.error('Failed to reject draft');
			}
		},
		[updateEmail]
	);

	const handleApproveDraft = useCallback(
		async (draftId: number, currentlyApproved?: boolean) => {
			try {
				await updateEmail({
					id: draftId,
					data: { reviewStatus: currentlyApproved ? null : ReviewStatus.approved },
				});
			} catch (error) {
				console.error('Failed to update draft review status:', error);
				toast.error('Failed to approve draft');
			}
		},
		[updateEmail]
	);

	// Gemini hook for regenerating drafts (used for Hybrid mode)
	const { mutateAsync: callGemini } = useGemini({ suppressToasts: true });
	// OpenRouter hook for regenerating drafts (used for Full AI mode)
	const { mutateAsync: callOpenRouter } = useOpenRouter({ suppressToasts: true });

	// Helper to determine drafting mode from form blocks
	const getDraftingModeFromBlocks = useCallback(() => {
		const blocks = form.getValues('hybridBlockPrompts');
		const hasFullAutomatedBlock = blocks?.some(
			(block: HybridBlockPrompt) => block.type === 'full_automated'
		);
		if (hasFullAutomatedBlock) return DraftingMode.ai;
		const isOnlyTextBlocks = blocks?.every((block: HybridBlockPrompt) => block.type === 'text');
		if (isOnlyTextBlocks) return DraftingMode.handwritten;
		return DraftingMode.hybrid;
	}, [form]);

	// Handle regenerating a draft using the current prompt
	const handleRegenerateDraft = useCallback(
		async (draft: EmailWithRelations): Promise<{ subject: string; message: string } | null> => {
			const contact = contacts?.find((c) => c.id === draft.contactId);
			if (!contact) {
				toast.error('Contact not found for this draft');
				return null;
			}

			if (!campaign.identity) {
				toast.error('Campaign identity is required');
				return null;
			}

			const draftingMode = getDraftingModeFromBlocks();
			const values = form.getValues();

			try {
				let aiResponse: string;

				if (draftingMode === DraftingMode.ai) {
					// Full AI mode - use OpenRouter with a random model from the pool
					const fullAutomatedBlock = values.hybridBlockPrompts?.find(
						(block: HybridBlockPrompt) => block.type === 'full_automated'
					);
					const fullAiPrompt =
						(fullAutomatedBlock?.value?.trim() ??
							values.fullAiPrompt?.trim() ??
							campaign.fullAiPrompt?.trim() ??
							'') || 'Generate an outreach email.';

					const populatedSystemPrompt = FULL_AI_DRAFTING_SYSTEM_PROMPT.replace(
						'{recipient_first_name}',
						contact.firstName || ''
					).replace('{company}', contact.company || '');

					const identityProfile = campaign.identity as IdentityProfileFields;
					const senderProfile = {
						name: identityProfile.name,
						bandName: identityProfile.bandName ?? undefined,
						genre: identityProfile.genre ?? undefined,
						area: identityProfile.area ?? undefined,
						bio: identityProfile.bio ?? undefined,
						website: identityProfile.website ?? undefined,
					};

					const userPrompt = `Sender information (user profile):\n${stringifyJsonSubset(
						senderProfile,
						['name', 'bandName', 'genre', 'area', 'bio', 'website']
					)}\n\nRecipient information:\n${stringifyJsonSubset<Contact>(contact as Contact, [
						'lastName',
						'firstName',
						'email',
						'company',
						'address',
						'city',
						'state',
						'country',
						'website',
						'phone',
						'metadata',
					])}\n\nUser Goal:\n${fullAiPrompt}`;

					// Pick a random model for regeneration
					const selectedModel = OPENROUTER_DRAFTING_MODELS[Math.floor(Math.random() * OPENROUTER_DRAFTING_MODELS.length)];
					console.log('[Regenerate] Using OpenRouter model:', selectedModel);

					aiResponse = await callOpenRouter({
						model: selectedModel,
						prompt: populatedSystemPrompt,
						content: userPrompt,
						debug: {
							contactId: contact.id,
							contactEmail: contact.email,
							campaignId: campaign.id,
							source: 'regenerate',
						},
					});
				} else if (draftingMode === DraftingMode.hybrid) {
					const hybridBlocks = values.hybridBlockPrompts?.filter(
						(block: HybridBlockPrompt) => block.type !== 'full_automated'
					) || [];

					if (hybridBlocks.length === 0) {
						toast.error('Please set up your email template first');
						return null;
					}

					const stringifiedRecipient = stringifyJsonSubset<Contact>(contact as Contact, [
						'firstName',
						'lastName',
						'company',
						'address',
						'city',
						'state',
						'country',
						'website',
						'phone',
						'metadata',
					]);

					const identityProfile = campaign.identity as IdentityProfileFields;
					const senderProfile = {
						name: identityProfile.name,
						bandName: identityProfile.bandName ?? undefined,
						genre: identityProfile.genre ?? undefined,
						area: identityProfile.area ?? undefined,
						bio: identityProfile.bio ?? undefined,
						website: identityProfile.website ?? undefined,
					};

					const stringifiedSender = stringifyJsonSubset(senderProfile, [
						'name',
						'bandName',
						'genre',
						'area',
						'bio',
						'website',
					]);

					const stringifiedHybridBlocks = generateEmailTemplateFromBlocks(hybridBlocks);
					const hybridPrompt =
						(values.hybridPrompt?.trim() ??
							campaign.hybridPrompt?.trim() ??
							'') ||
						'Generate a professional email based on the template below.';
					const geminiPrompt = `**RECIPIENT**\n${stringifiedRecipient}\n\n**SENDER**\n${stringifiedSender}\n\n**PROMPT**\n${hybridPrompt}\n\n**EMAIL TEMPLATE**\n${stringifiedHybridBlocks}\n\n**PROMPTS**\n${generatePromptsFromBlocks(
						hybridBlocks
					)}`;

					aiResponse = await callGemini({
						model: 'gemini-3-pro-preview',
						prompt: GEMINI_HYBRID_PROMPT,
						content: geminiPrompt,
					});
				} else {
					// Handwritten mode - no AI regeneration
					toast.error('Regeneration is not available in handwritten mode');
					return null;
				}

				// Parse the AI response
				let parsed: { subject: string; message: string };
				try {
					let cleanedResponse = aiResponse;
					cleanedResponse = cleanedResponse
						.replace(/^```(?:json)?\s*/i, '')
						.replace(/\s*```$/i, '');

					const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						cleanedResponse = jsonMatch[0];
					}

					cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
					parsed = JSON.parse(cleanedResponse);

					if (!parsed.message || !parsed.subject) {
						throw new Error('Missing required fields');
					}
				} catch {
					const subjectMatch = aiResponse.match(/subject["']?\s*:\s*["']([^"']+)["']/i);
					const messageMatch = aiResponse.match(/message["']?\s*:\s*["']([\s\S]*?)["']\s*[,}]/i);
					
					parsed = {
						subject: subjectMatch?.[1] || draft.subject || 'Re: Your inquiry',
						message: messageMatch?.[1] || aiResponse,
					};
				}

				const cleanedSubject = removeEmDashes(parsed.subject);
				const cleanedMessageText = removeEmDashes(parsed.message);
				const cleanedMessageNoSignature = stripEmailSignatureFromAiMessage(cleanedMessageText, {
					senderName: campaign.identity?.name ?? null,
					senderBandName: campaign.identity?.bandName ?? null,
				});

				const signatureText = resolveAutoSignatureText({
					currentSignature: values.signature ?? null,
					fallbackSignature: `Thank you,\n${campaign.identity?.name || ''}`,
					context: {
						name: campaign.identity?.name ?? null,
						bandName: campaign.identity?.bandName ?? null,
						website: campaign.identity?.website ?? null,
						email: campaign.identity?.email ?? null,
					},
				});
				const font = values.font || 'Arial';

				let processedMessageText = cleanedMessageNoSignature;
				if (campaign.identity?.website) {
					processedMessageText = insertWebsiteLinkPhrase(
						processedMessageText,
						campaign.identity.website
					);
				}

				const richTextMessage = convertAiResponseToRichTextEmail(
					processedMessageText,
					font,
					signatureText
				);
				const richTextMessageWithSettings = injectMurmurDraftSettingsSnapshot(
					richTextMessage,
					{
						version: 1,
						values: {
							...values,
							signature: signatureText,
						},
					}
				);

				await updateEmail({
					id: draft.id.toString(),
					data: {
						subject: cleanedSubject,
						message: richTextMessageWithSettings,
					},
				});

				queryClient.invalidateQueries({ queryKey: ['emails'] });

				toast.success('Draft regenerated successfully');
				const messageForUi = convertHtmlToPlainText(richTextMessageWithSettings);
				return { subject: cleanedSubject, message: messageForUi };
			} catch (error) {
				console.error('[Regenerate] Error:', error);
				toast.error('Failed to regenerate draft');
				return null;
			}
		},
		[
			contacts,
			campaign.identity,
			campaign.fullAiPrompt,
			campaign.hybridPrompt,
			getDraftingModeFromBlocks,
			form,
			callGemini,
			updateEmail,
			queryClient,
		]
	);

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
	const handleContactsTabSelection = (contactId: number) => {
		setContactsTabSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(contactId)) {
				next.delete(contactId);
			} else {
				next.add(contactId);
			}
			return next;
		});
	};

	const [searchTabSelectedContacts, setSearchTabSelectedContacts] = useState<number[]>(
		[]
	);

	const [searchActiveSection, setSearchActiveSection] = useState<
		'why' | 'what' | 'where' | null
	>(null);
	const [searchWhyValue, setSearchWhyValue] = useState('[Booking]');
	const [searchWhatValue, setSearchWhatValue] = useState(campaign?.name || '');
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
		if (campaign?.name) {
			setSearchWhatValue(campaign.name);
		}
	}, [campaign?.name]);

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
					tab.id === activeSearchTabId ? { ...tab, label, query, what: searchWhatValue } : tab
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

		// Match the top campaign search button behavior: route to dashboard map view in
		// "from campaign" mode, and pass the query via sessionStorage.
		if (!trimmedWhat && !trimmedWhere) {
			toast.error('Please enter what you want to search for');
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
					sessionStorage.setItem('murmur_pending_search', searchQuery);
				}
			} catch {
				// Ignore sessionStorage errors (e.g., disabled storage)
			}
		}

		const dashboardUrl = campaign?.id
			? `${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}`
			: urls.murmur.dashboard.index;
		router.push(dashboardUrl);
	};

	// Handler for adding selected search results to campaign
	const handleAddSearchResultsToCampaign = async () => {
		if (searchResultsSelectedContacts.length === 0) {
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
						contactIds: searchResultsSelectedContacts,
					},
				},
			});

			const addedCount = searchResultsSelectedContacts.length;

			// Clear selection
			setSearchResultsSelectedContacts([]);

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

	const [draftStatusFilter, setDraftStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
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
	const sentEmails = (headerEmails || []).filter((e) => e.status === EmailStatus.sent);
	const sentCount = sentEmails.length;

	// When batch drafting is in progress (or still animating queued drafts), swap the campaign
	// research panel slot to a live "Draft Preview" so users can watch drafts type out from any tab.
	const isBatchDraftingInProgress = isLivePreviewVisible;
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

	const draftedContactIds = new Set(draftEmails.map((e) => e.contactId));
	const contactsAvailableForDrafting = (contacts || []).filter(
		(contact) => !draftedContactIds.has(contact.id)
	);

	const isSendingDisabled = isFreeTrial || (user?.sendingCredits || 0) === 0;

	const [selectedContactForResearch, setSelectedContactForResearch] =
		useState<ContactWithName | null>(null);
	const [hoveredContactForResearch, setHoveredContactForResearch] =
		useState<ContactWithName | null>(null);	
	const [hasUserSelectedResearchContact, setHasUserSelectedResearchContact] =
		useState(false);
	const [showTestPreview, setShowTestPreview] = useState(false);

	// When a draft is open, the research panel should stay locked to that draft's contact.
	const displayedContactForResearch = isDraftPreviewOpen
		? selectedContactForResearch
		: hoveredContactForResearch || selectedContactForResearch;
	const draftsMiniEmailTopHeaderLabel = draftsMiniEmailTopHeaderHeight ? 'Settings' : undefined;
	const draftsMiniEmailSettingsLabels = useMemo(() => {
		const contact = displayedContactForResearch;
		if (!draftsMiniEmailTopHeaderHeight || !contact) return { primary: '', secondary: '' };

		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const name = (fullName || contact.name || '').trim();
		const company = (contact.company || '').trim();

		if (!name) return { primary: company, secondary: '' };
		if (!company) return { primary: name, secondary: '' };
		return { primary: name, secondary: company };
	}, [displayedContactForResearch, draftsMiniEmailTopHeaderHeight]);

	useEffect(() => {
		if (!selectedContactForResearch && contacts && contacts.length > 0) {
			setSelectedContactForResearch(contacts[0]);
		}
	}, [contacts, selectedContactForResearch]);

	// When reviewing a draft in the Drafts tab, the research panel should reflect the
	// currently open draft (not whatever was last hovered in the table).
	useEffect(() => {
		if (view !== 'drafting') return;
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
	}, [view, selectedDraft?.id, contacts]);

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

	const handleSendDrafts = async () => {
		const selectedDrafts =
			draftsTabSelectedIds.size > 0
				? draftEmails.filter((d) => draftsTabSelectedIds.has(d.id))
				: draftEmails;

		if (selectedDrafts.length === 0) {
			toast.error('No drafts selected to send.');
			return;
		}

		if (!campaign?.identity?.email || !campaign?.identity?.name) {
			toast.error('Please create an Identity before sending emails.');
			return;
		}

		if (
			!subscriptionTier &&
			user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
		) {
			toast.error('Please upgrade to a paid plan to send emails.');
			return;
		}

		const sendingCredits = user?.sendingCredits || 0;
		const emailsToSend = selectedDrafts.length;

		if (sendingCredits === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		const emailsWeCanSend = Math.min(emailsToSend, sendingCredits);
		const emailsToProcess = selectedDrafts.slice(0, emailsWeCanSend);

		let successfulSends = 0;

		for (let i = 0; i < emailsToProcess.length; i++) {
			const email = emailsToProcess[i];

			try {
				const res = await sendMailgunMessage({
					subject: email.subject,
					message: email.message,
					recipientEmail: email.contact.email,
					senderEmail: campaign.identity?.email,
					senderName: campaign.identity?.name,
					originEmail:
						user?.customDomain && user?.customDomain !== ''
							? user?.customDomain
							: user?.murmurEmail,
					replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
				});

				if (res.success) {
					await updateEmail({
						id: email.id.toString(),
						data: {
							status: EmailStatus.sent,
							sentAt: new Date(),
						},
					});
					successfulSends++;
					queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
				}
			} catch (error) {
				console.error('Failed to send email:', error);
			}
		}

		if (user && successfulSends > 0) {
			const newCreditBalance = Math.max(0, sendingCredits - successfulSends);
			await editUser({
				clerkId: user.clerkId,
				data: { sendingCredits: newCreditBalance },
			});
		}

		setDraftsTabSelectedIds(new Set());

		if (successfulSends === emailsToSend) {
			toast.success(`All ${successfulSends} emails sent successfully!`);
		} else if (successfulSends > 0) {
			if (emailsWeCanSend < emailsToSend) {
				toast.warning(`Sent ${successfulSends} emails before running out of credits.`);
			} else {
				toast.warning(`${successfulSends} of ${emailsToSend} emails sent successfully.`);
			}
		} else {
			toast.error('Failed to send emails. Please try again.');
		}
	};

	const campaignContactEmails = contacts
		? contacts
				.map((contact) => contact.email)
				.filter((email): email is string => Boolean(email))
		: undefined;

	const campaignContactsByEmail = useMemo(() => {
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

	const toListNames =
		campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const fromName = campaign?.identity?.name || '';
	const fromEmail = campaign?.identity?.email || '';

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
									reach out to radio stations, playlists, and more to get your music played
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
										const { icon, backgroundColor } = getCityIconProps(loc.city, loc.state);
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
									<div className="text-black font-medium font-secondary">No locations found</div>
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
											{isLoadingLocation ? 'Locating...' : userLocationName || 'Placeholder'}
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
					<div className="relative w-full flex flex-col items-center">
						{/* Persistent Campaign Header Box for specific tabs */}
						{/* Hide this absolute panel in narrow desktop + testing/contacts mode - we'll use inline layout instead */}
						{/* Also hide when hideHeaderBox is true (header rendered at page level for narrowest breakpoint) */}
						{shouldRenderAbsolutePinnedLeftColumn && (
							<div
								className="absolute hidden lg:flex flex-col"
								style={{
									right:
										view === 'search'
											? isSearchTabNarrow
												? 'calc(50% + 249px + 37px)' // 37px left of narrow map box (498px / 2 = 249px)
												: 'calc(50% + 384px + 32px)'
											: view === 'inbox'
											? isInboxTabNarrow
												? 'calc(50% + 276px)' // 258px (half of 516px narrow inbox) + 18px gap
												: 'calc(50% + 471.5px)'
											: 'calc(50% + 250px + 32px)',
									top: view === 'inbox' ? '9px' : '29px',
									gap: '16px',
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
										onFromClick={onOpenIdentityDialog}
										onContactsClick={goToContacts}
										onDraftsClick={goToDrafting}
										onSentClick={goToSent}
									/>
									{view !== 'inbox' &&
										(isDraftPreviewOpen ? (
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
														draftEmails={draftEmails}
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
														goToContacts={goToContacts}
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
													style={{
														width: '376px',
														height: '587px',
													}}
												>
													<DraftsExpandedList
														drafts={draftEmails}
														contacts={contacts || []}
														width={376}
														height={587}
														hideSendButton
														rowWidth={366}
														rowHeight={92}
														rejectedDraftIds={rejectedDraftIds}
														approvedDraftIds={approvedDraftIds}
														previewedDraftId={selectedDraft?.id}
														isPreviewMode
														onDraftPreviewClick={(draft) =>
															setSelectedDraft((prev) =>
																prev?.id === draft.id ? null : draft
															)
														}
													/>
												</div>
											)
										) : (
											<div
												style={{
													width: '375px',
													overflow: 'visible',
													position: 'relative',
												}}
											>
												{pinnedLeftPanelVariant === 'contacts' ? (
														<div
															style={{
																// Gradual fade-in when entering from inbox/search so the
																// ContactsExpandedList blends with the morph animations
																opacity: isEnteringFromMorphView ? 0 : 1,
																animation: isEnteringFromMorphView
																	? 'miniEmailStructureFadeIn 350ms ease-in 0ms forwards'
																	: 'none',
															}}
														>
															<ContactsExpandedList
																contacts={contactsAvailableForDrafting}
																campaign={campaign}
																selectedContactIds={contactsTabSelectedIds}
																onContactSelectionChange={(updater) =>
																	setContactsTabSelectedIds((prev) =>
																		updater(new Set(prev))
																	)
																}
																onContactClick={handleResearchContactClick}
																onContactHover={handleResearchContactHover}
																onDraftSelected={async (ids) => {
																	await handleGenerateDrafts(ids);
																}}
																isDraftDisabled={
																	isGenerationDisabled() || isPendingGeneration
																}
																isPendingGeneration={isPendingGeneration}
																width={375}
																height={557}
																minRows={8}
																onSearchFromMiniBar={handleMiniContactsSearch}
															/>
														</div>
													) : (
														<div
															style={{
																// Gradual fade-in when entering from inbox/search so the
																// MiniEmailStructure blends with the morph animations
																opacity: isEnteringFromMorphView ? 0 : 1,
																animation: isEnteringFromMorphView
																	? 'miniEmailStructureFadeIn 350ms ease-in 0ms forwards'
																	: 'none',
															}}
														>
														<MiniEmailStructure
															form={
																isDraftingView
																	? draftsSettingsPreviewForm
																	: isSentView
																		? sentSettingsPreviewForm
																		: form
															}
															readOnly={isDraftingView || isSentView}
															variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
															settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
															settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
															profileFields={miniProfileFields}
															identityProfile={campaign?.identity as IdentityProfileFields | null}
															onIdentityUpdate={handleIdentityUpdate}
															onDraft={() =>
																handleGenerateDrafts(
																	contactsAvailableForDrafting.map((c) => c.id)
																)
															}
															isDraftDisabled={
																isGenerationDisabled() || isPendingGeneration
															}
															isPendingGeneration={isPendingGeneration}
															generationProgress={generationProgress}
															generationTotal={contactsAvailableForDrafting.length}
															hideTopChrome
															hideFooter
															fullWidthMobile
															hideAddTextButtons
															// Match the Writing tab contacts list height (557px) so the left panel stays consistent.
															// Applies on tabs where this pinned panel renders the MiniEmailStructure (Contacts + Drafts + Sent).
															height={
																view === 'contacts' || view === 'drafting' || view === 'sent'
																	? 557
																	: undefined
															}
															pageFillColor={draftsMiniEmailFillColor}
															topHeaderHeight={draftsMiniEmailTopHeaderHeight}
															topHeaderLabel={draftsMiniEmailTopHeaderLabel}
															hideAllText={
																// Hide all structure text to show chrome-only skeleton:
																// - When the Drafts tab has no drafts
																// - When the Sent tab is in its empty state
																// - When the Contacts tab has no contacts to show
																(view === 'drafting' && draftCount === 0) ||
																(view === 'sent' && sentCount === 0) ||
																(view === 'contacts' &&
																	contactsAvailableForDrafting.length === 0)
															}
															onOpenWriting={goToWriting}
														/>
														</div>
													)}
											</div>
										))}

									{view === 'testing' &&
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
						{/* Hide when transitioning out from standard-position tabs to prevent double-fade */}
						{!isMobile &&
							// Use our *effective* width breakpoints (which account for campaign zoom),
							// rather than Tailwind's `xl:` media query which ignores CSS zoom.
							!isNarrowDesktop &&
							!isNarrowestDesktop &&
							['testing', 'contacts', 'drafting', 'sent', 'search', 'inbox'].includes(view) &&
							!(view === 'search' && hasCampaignSearched) &&
							!(view === 'search' && isSearchTabNarrow) &&
							!(view === 'inbox' && isInboxTabStacked) &&
							!(isTransitioningOut && ['testing', 'contacts', 'drafting', 'sent'].includes(view)) && (
							<div
								className="absolute"
								data-research-panel-container
								data-research-panel-variant={
									view === 'search' ? 'search' : view === 'inbox' ? 'inbox' : 'standard'
								}
								style={{
									top: '29px',
									left:
										view === 'search'
											? 'calc(50% + 384px + 32px)'
											: view === 'inbox'
											? isInboxTabNarrow
												? 'calc(50% + 258px + 32px)' // 258px = half of 516px narrow inbox + 32px gap
												: 'calc(50% + 453.5px + 32px)'
											: 'calc(50% + 250px + 32px)',
									// Counter-animate when transitioning in to keep research panel stable
									...(isTransitioningIn && ['testing', 'contacts', 'drafting', 'sent'].includes(view) ? {
										animation: 'researchPanelStable 180ms ease-out forwards',
									} : {}),
								}}
							>
									{isBatchDraftingInProgress ? (
										<DraftPreviewExpandedList
											contacts={contacts || []}
											livePreview={liveDraftPreview}
											fallbackDraft={draftPreviewFallbackDraft}
											width={view === 'inbox' ? 259 : 375}
											height={670}
										/>
									) : view === 'testing' && showTestPreview ? (
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
											style={{ width: 375, height: 670 }}
										/>
									) : view === 'drafting' && Boolean(selectedDraft) ? (
										<div
											className="flex flex-col"
											style={{
												// Match the legacy research panel footprint so it remains aligned with the rest of the layout.
												width: 376,
												height: 670,
												gap: 12,
											}}
										>
											<MiniEmailStructure
												form={draftsSettingsPreviewForm}
												readOnly
												variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
												settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
												settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
												profileFields={miniProfileFields}
												identityProfile={campaign?.identity as IdentityProfileFields | null}
												onIdentityUpdate={handleIdentityUpdate}
												onDraft={() =>
													handleGenerateDrafts(
														contactsAvailableForDrafting.map((c) => c.id)
													)
												}
												isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
												isPendingGeneration={isPendingGeneration}
												generationProgress={generationProgress}
												generationTotal={contactsAvailableForDrafting.length}
												hideTopChrome
												hideFooter
												hideAddTextButtons
												// Keep this a tight preview that never shows an inner scrollbar.
												fitToHeight
												lockFitToHeightScale
												// Requested: compressed Settings view height.
												height={358}
												pageFillColor={draftsMiniEmailFillColor}
											/>

											<ContactResearchPanel
												contact={displayedContactForResearch}
												hideAllText={
													// Hide all research text to show a chrome-only skeleton:
													// - When the Drafts tab has no drafts
													(view === 'drafting' && draftCount === 0)
												}
												hideSummaryIfBullets
												// Requested: 300px tall research block in the bottom half.
												height={300}
												width={376}
												boxWidth={361}
											/>
										</div>
									) : (
										<ContactResearchPanel
											contact={displayedContactForResearch}
											hideAllText={
												// Hide all research text to show a chrome-only skeleton:
												// - When the Drafts tab has no drafts
												// - When the Sent tab is in its empty state
												// - When the Contacts tab has no contacts to show
												(view === 'drafting' && draftCount === 0) ||
												(view === 'sent' && sentCount === 0) ||
												(view === 'contacts' && contactsAvailableForDrafting.length === 0)
											}
											style={view === 'inbox' ? { width: 259 } : undefined}
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
									className="absolute"
									style={{
										top: '29px',
										left: 'calc(50% + 384px + 32px)',
									}}
								>
									{/* Title above the panel */}
									<span className="font-inter text-[13px] font-medium text-black mb-1 block">
										Search Results
									</span>
									<div
										className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
										style={{
											width: '396px',
											height: '703px',
										}}
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
															setSearchResultsSelectedContacts(
																searchResultsForPanelIds
															);
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
																									: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																					<MusicVenuesIcon size={12} className="flex-shrink-0" />
																				)}
																				{isMusicFestivalTitle(headline) && (
																					<FestivalsIcon size={12} className="flex-shrink-0" />
																				)}
																				{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
																					<WeddingPlannersIcon size={12} />
																				)}
																				{isWineBeerSpiritsTitle(headline) && (
																					<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
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
																												? getWineBeerSpiritsLabel(headline)
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
																									: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																					<MusicVenuesIcon size={12} className="flex-shrink-0" />
																				)}
																				{isMusicFestivalTitle(headline) && (
																					<FestivalsIcon size={12} className="flex-shrink-0" />
																				)}
																				{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
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
																setSearchResultsSelectedContacts(searchResultsForPanelIds);
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

						{view === 'testing' && (
							<div className="relative">
								{/* Narrow desktop: grouped layout with left panel + writing box centered together */}
								{isNarrowDesktop ? (
									<div className="flex flex-col items-center">
										{/* Row with both columns */}
										<div className="flex flex-row items-start justify-center gap-[10px]">
											{/* Left column: Campaign Header + Contacts + Research */}
											<div className="flex flex-col" style={{ gap: '10px' }}>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													onFromClick={onOpenIdentityDialog}
													onContactsClick={goToContacts}
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
													<ContactsExpandedList
														contacts={contactsAvailableForDrafting}
														campaign={campaign}
														selectedContactIds={contactsTabSelectedIds}
														onContactSelectionChange={(updater) =>
															setContactsTabSelectedIds((prev) => updater(new Set(prev)))
														}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														onDraftSelected={async (ids) => {
															await handleGenerateDrafts(ids);
														}}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														width={330}
														height={263}
														minRows={5}
														onSearchFromMiniBar={handleMiniContactsSearch}
														onOpenContacts={goToContacts}
													/>
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
											</div>
											{/* Right column: Writing box */}
											<div>
												<HybridPromptInput
													trackFocusedField={trackFocusedField}
													testMessage={campaign?.testMessage}
													handleGenerateTestDrafts={handleGenerateTestDrafts}
													isGenerationDisabled={isGenerationDisabled}
													isPendingGeneration={isPendingGeneration}
													isTest={isTest}
													contact={contacts?.[0]}
													onGoToDrafting={goToDrafting}
													onTestPreviewToggle={setShowTestPreview}
													draftCount={contactsTabSelectedIds.size}
													onDraftClick={async () => {
														if (contactsTabSelectedIds.size === 0) {
															toast.error('Select at least one contact to draft emails.');
															return;
														}
														await handleGenerateDrafts(
															Array.from(contactsTabSelectedIds.values())
														);
													}}
													isDraftDisabled={
														isPendingGeneration || contactsTabSelectedIds.size === 0
													}
													onSelectAllContacts={() => {
														const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
														const areAllSelected =
															contactsTabSelectedIds.size === allIds.size &&
															[...allIds].every((id) => contactsTabSelectedIds.has(id));

														if (areAllSelected) {
															setContactsTabSelectedIds(new Set());
														} else {
															setContactsTabSelectedIds(allIds);
														}
													}}
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
													autoOpenProfileTabWhenIncomplete={
														props.autoOpenProfileTabWhenIncomplete
													}
												/>
											</div>
										</div>
										{/* Draft button with arrows - spans full width below both columns */}
										{!isPendingGeneration && (
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
												{/* Draft button container */}
												<div
													className="relative h-[40px] flex-1"
													style={{ maxWidth: '691px' }}
												>
													{contactsTabSelectedIds.size > 0 ? (
														<>
															<button
																type="button"
																onClick={async () => {
																	if (contactsTabSelectedIds.size === 0) {
																		toast.error('Select at least one contact to draft emails.');
																		return;
																	}
																	await handleGenerateDrafts(
																		Array.from(contactsTabSelectedIds.values())
																	);
																}}
																disabled={isPendingGeneration || contactsTabSelectedIds.size === 0}
																className={cn(
																	'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px]',
																	isPendingGeneration || contactsTabSelectedIds.size === 0
																		? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																		: 'bg-[#C7F2C9] border-[#349A37] hover:bg-[#B9E7BC] cursor-pointer'
																)}
															>
																Draft {contactsTabSelectedIds.size} {contactsTabSelectedIds.size === 1 ? 'Contact' : 'Contacts'}
															</button>
															{/* Right section "All" button */}
															<button
																type="button"
																className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
																onClick={() => {
																	const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
																	const areAllSelected =
																		contactsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) => contactsTabSelectedIds.has(id));

																	if (areAllSelected) {
																		setContactsTabSelectedIds(new Set());
																	} else {
																		setContactsTabSelectedIds(allIds);
																	}
																}}
															>
																All
															</button>
														</>
													) : (
														<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
															Select Contacts and Draft Emails
														</div>
													)}
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
											onTestPreviewToggle={setShowTestPreview}
											draftCount={contactsTabSelectedIds.size}
											onDraftClick={async () => {
												if (contactsTabSelectedIds.size === 0) {
													toast.error('Select at least one contact to draft emails.');
													return;
												}
												await handleGenerateDrafts(
													Array.from(contactsTabSelectedIds.values())
												);
											}}
											isDraftDisabled={
												isPendingGeneration || contactsTabSelectedIds.size === 0
											}
											onSelectAllContacts={() => {
												const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
												const areAllSelected =
													contactsTabSelectedIds.size === allIds.size &&
													[...allIds].every((id) => contactsTabSelectedIds.has(id));

												if (areAllSelected) {
													setContactsTabSelectedIds(new Set());
												} else {
													setContactsTabSelectedIds(allIds);
												}
											}}
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
											hideDraftButton={isNarrowestDesktop}
											identity={campaign?.identity}
											onIdentityUpdate={handleIdentityUpdate}
											autoOpenProfileTabWhenIncomplete={
												props.autoOpenProfileTabWhenIncomplete
											}
										/>
										{/* Draft button with arrows at narrowest breakpoint */}
										{isNarrowestDesktop && !isPendingGeneration && (
											<div className="flex items-center justify-center gap-[20px] mt-4 w-full">
												{/* Left arrow */}
												<button
													type="button"
													onClick={goToPreviousTab}
													className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
													aria-label="Previous tab"
												>
													<LeftArrow width="20" height="39" />
												</button>
												{/* Draft button container */}
												<div
													className="relative h-[40px] w-full max-w-[407px]"
												>
													{contactsTabSelectedIds.size > 0 ? (
														<>
															<button
																type="button"
																onClick={async () => {
																	if (contactsTabSelectedIds.size === 0) {
																		toast.error('Select at least one contact to draft emails.');
																		return;
																	}
																	await handleGenerateDrafts(
																		Array.from(contactsTabSelectedIds.values())
																	);
																}}
																disabled={isPendingGeneration || contactsTabSelectedIds.size === 0}
																className={cn(
																	'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px]',
																	isPendingGeneration || contactsTabSelectedIds.size === 0
																		? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																		: 'bg-[#C7F2C9] border-[#349A37] hover:bg-[#B9E7BC] cursor-pointer'
																)}
															>
																Draft {contactsTabSelectedIds.size} {contactsTabSelectedIds.size === 1 ? 'Contact' : 'Contacts'}
															</button>
															{/* Right section "All" button */}
															<button
																type="button"
																className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
																onClick={() => {
																	const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
																	const areAllSelected =
																		contactsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) => contactsTabSelectedIds.has(id));

																	if (areAllSelected) {
																		setContactsTabSelectedIds(new Set());
																	} else {
																		setContactsTabSelectedIds(allIds);
																	}
																}}
															>
																All
															</button>
														</>
													) : (
														<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
															Select Contacts and Draft Emails
														</div>
													)}
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
										{/* Contacts table below writing box at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div className="mt-[20px] w-full flex justify-center">
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													campaign={campaign}
													selectedContactIds={contactsTabSelectedIds}
													onContactSelectionChange={(updater) =>
														setContactsTabSelectedIds((prev) => updater(new Set(prev)))
													}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onDraftSelected={async (ids) => {
														await handleGenerateDrafts(ids);
													}}
													isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
													width={489}
													height={349}
													minRows={5}
													onSearchFromMiniBar={handleMiniContactsSearch}
													onOpenContacts={goToContacts}
												/>
											</div>
										)}
										{/* Research panel below contacts at narrowest breakpoint */}
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

								{/* Bottom Panels: Drafts, Sent, and Inbox - hidden at narrowest breakpoint */}
								{!hideHeaderBox && (
									<div
										className="mt-[35px] flex justify-center gap-[15px]"
										data-campaign-bottom-anchor
									>
										<DraftsExpandedList
											drafts={draftEmails}
											contacts={contacts || []}
											width={233}
											height={117}
											whiteSectionHeight={15}
											hideSendButton={true}
												onOpenDrafts={goToDrafting}
										/>
										<SentExpandedList
											sent={sentEmails}
											contacts={contacts || []}
											width={233}
											height={117}
											whiteSectionHeight={15}
												onOpenSent={goToSent}
										/>
										<InboxExpandedList
											contacts={contacts || []}
											width={233}
											height={117}
											whiteSectionHeight={15}
											onOpenInbox={goToInbox}
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
							{view === 'drafting' && (
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
												draftEmails={draftEmails}
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
												goToContacts={goToContacts}
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
											/>
										</div>
									) : isNarrowDesktop ? (
										// Narrow desktop (952px - 1279px): center BOTH the left panel and drafts table together
										// Fixed width container: left (330) + gap (10) + right (499) = 839px, centered with mx-auto
										<div className="flex flex-col items-center mx-auto" style={{ width: '839px' }}>
											<div
												className="flex flex-row items-start gap-[10px] w-full"
												style={{ position: 'relative' }}
											>
												{/* Left column: Campaign Header + Email Structure + Research - fixed 330px */}
												<div className="flex flex-col flex-shrink-0" style={{ gap: '10px', width: '330px' }}>
													<CampaignHeaderBox
														campaignId={campaign?.id}
														campaignName={campaign?.name || 'Untitled Campaign'}
														toListNames={toListNames}
														fromName={fromName}
														contactsCount={contactsCount}
														draftCount={draftCount}
														sentCount={sentCount}
														onFromClick={onOpenIdentityDialog}
														onContactsClick={goToContacts}
														onDraftsClick={goToDrafting}
														onSentClick={goToSent}
														width={330}
													/>
													{/* Mini Email Structure panel */}
													<div style={{ width: '330px' }}>
														<MiniEmailStructure
															form={draftsSettingsPreviewForm}
															readOnly
															variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
															settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
															settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
															profileFields={miniProfileFields}
															identityProfile={campaign?.identity as IdentityProfileFields | null}
															onIdentityUpdate={handleIdentityUpdate}
															onDraft={() =>
																handleGenerateDrafts(
																	contactsAvailableForDrafting.map((c) => c.id)
																)
															}
															isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
															isPendingGeneration={isPendingGeneration}
															generationProgress={generationProgress}
															generationTotal={contactsAvailableForDrafting.length}
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
												{/* Research panel - height set so bottom aligns with drafts table (71 + 10 + 316 + 10 + 296 = 703 = drafts table height) */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={330}
														height={296}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={draftCount === 0}
														hideSummaryIfBullets={true}
														height={296}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
												</div>
												{/* Right column: Drafts table - fixed 499px, overflow visible for bottom panels */}
												<div className="flex-shrink-0 [&>*]:!items-start" style={{ width: '499px', overflow: 'visible' }}>
													<DraftedEmails
														ref={draftedEmailsRef}
														mainBoxId="drafts"
														contacts={contacts || []}
														selectedDraftIds={draftsTabSelectedIds}
														selectedDraft={selectedDraft}
														setSelectedDraft={setSelectedDraft}
														setIsDraftDialogOpen={setIsDraftDialogOpen}
														handleDraftSelection={handleDraftSelection}
														draftEmails={draftEmails}
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
														goToContacts={goToContacts}
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
														isNarrowDesktop
														goToPreviousTab={goToPreviousTab}
														goToNextTab={goToNextTab}
													/>
												</div>
											</div>
											{/* Send Button with arrows - centered relative to full container width */}
											{draftEmails.length > 0 && !selectedDraft && (
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
																disabled={draftsTabSelectedIds.size === 0 || isSendingDisabled}
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
																	const allIds = new Set(draftEmails.map((d) => d.id));
																	const isAllSelected =
																		draftsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) => draftsTabSelectedIds.has(id));
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
											{/* Bottom Panels: Contacts, Sent, and Inbox - centered relative to container - hidden at narrowest breakpoint */}
											{!isNarrowestDesktop && (
												<div
													className={cn(
														draftEmails.length === 0 ? 'mt-[91px]' : 'mt-[35px]',
														'flex justify-center gap-[15px]'
													)}
													data-campaign-bottom-anchor
												>
													<ContactsExpandedList
														contacts={contactsAvailableForDrafting}
														width={232}
														height={117}
														whiteSectionHeight={15}
														showSearchBar={false}
														onOpenContacts={goToContacts}
													/>
													<SentExpandedList
														sent={sentEmails}
														contacts={contacts || []}
														width={233}
														height={117}
														whiteSectionHeight={15}
														onOpenSent={goToSent}
													/>
													<InboxExpandedList
														contacts={contacts || []}
														width={233}
														height={117}
														whiteSectionHeight={15}
														onOpenInbox={goToInbox}
													/>
												</div>
											)}
										</div>
									) : (
										// Regular centered layout for wider viewports
										<div className="flex flex-col items-center">
											<DraftedEmails
												ref={draftedEmailsRef}
											mainBoxId="drafts"
												contacts={contacts || []}
												selectedDraftIds={draftsTabSelectedIds}
												selectedDraft={selectedDraft}
												setSelectedDraft={setSelectedDraft}
												setIsDraftDialogOpen={setIsDraftDialogOpen}
												handleDraftSelection={handleDraftSelection}
												draftEmails={draftEmails}
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
												goToContacts={goToContacts}
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
												isNarrowestDesktop={isNarrowestDesktop}
												isNarrowDesktop={isNarrowDesktop}
												goToPreviousTab={goToPreviousTab}
												goToNextTab={goToNextTab}
											/>

											{/* Send Button with arrows at narrowest breakpoint (< 952px) */}
											{isNarrowestDesktop && draftEmails.length > 0 && !selectedDraft && (
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
																disabled={draftsTabSelectedIds.size === 0 || isSendingDisabled}
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
																	const allIds = new Set(draftEmails.map((d) => d.id));
																	const isAllSelected =
																		draftsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) => draftsTabSelectedIds.has(id));
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
														variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
														profileFields={miniProfileFields}
														identityProfile={campaign?.identity as IdentityProfileFields | null}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={contactsAvailableForDrafting.length}
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

										{/* Bottom Panels: Contacts, Sent, and Inbox - hidden at narrowest breakpoint */}
										{!isNarrowestDesktop && (
											<div
												className={cn(
													draftEmails.length === 0 ? 'mt-[91px]' : 'mt-[35px]',
													'flex justify-center gap-[15px]'
												)}
												data-campaign-bottom-anchor
											>
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													width={232}
													height={117}
													whiteSectionHeight={15}
													showSearchBar={false}
													onOpenContacts={goToContacts}
												/>
												<SentExpandedList
													sent={sentEmails}
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													onOpenSent={goToSent}
												/>
												<InboxExpandedList
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													onOpenInbox={goToInbox}
												/>
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>

				{/* Contacts tab - show the contacts table */}
					{view === 'contacts' && (
						<div className={`w-full ${isMobile ? 'mt-6' : 'min-h-[300px]'}`}>
							{isMobile ? (
								// Mobile layout: Full-width contacts, no side panels
								<div className="flex flex-col items-center w-full px-1">
									<ContactsSelection
										mainBoxId="contacts"
										contacts={contactsAvailableForDrafting}
										allContacts={contacts}
										selectedContactIds={contactsTabSelectedIds}
										setSelectedContactIds={setContactsTabSelectedIds}
										handleContactSelection={handleContactsTabSelection}
										campaign={campaign}
										showSearchBar={false}
										onDraftEmails={async (ids) => {
											await handleGenerateDrafts(ids);
										}}
										isDraftingDisabled={isGenerationDisabled() || isPendingGeneration}
										onContactClick={handleResearchContactClick}
										onContactHover={handleResearchContactHover}
										onSearchFromMiniBar={handleMiniContactsSearch}
										goToSearch={onGoToSearch}
										goToDrafts={goToDrafting}
										goToInbox={goToInbox}
										goToWriting={goToWriting}
										hideBottomPanels
										hideButton
									/>
								</div>
							) : isNarrowDesktop ? (
									// Narrow desktop (952px - 1279px): center BOTH the left panel and contacts table together
									// Fixed width container: left (330) + gap (35) + right (499) = 864px, centered with mx-auto
									// Bottom panels are rendered separately and centered relative to the full container
									<div className="flex flex-col items-center mx-auto" style={{ width: '839px' }}>
										<div className="flex flex-row items-start gap-[10px] w-full">
											{/* Left column: Campaign Header + Email Structure + Research - fixed 330px */}
											<div className="flex flex-col flex-shrink-0" style={{ gap: '10px', width: '330px' }}>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													onFromClick={onOpenIdentityDialog}
													onContactsClick={goToContacts}
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
														variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
														profileFields={miniProfileFields}
														identityProfile={campaign?.identity as IdentityProfileFields | null}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={contactsAvailableForDrafting.length}
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
												{/* Research panel - height set so bottom aligns with contacts table (703px) */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={330}
														height={296}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={contactsAvailableForDrafting.length === 0}
														hideSummaryIfBullets={true}
														height={296}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
											</div>
											{/* Right column: Contacts table - fixed 499px, overflow visible for bottom panels */}
											<div className="flex-shrink-0 [&>*]:!items-start" style={{ width: '499px', overflow: 'visible' }}>
												<ContactsSelection
													mainBoxId="contacts"
													contacts={contactsAvailableForDrafting}
													allContacts={contacts}
													selectedContactIds={contactsTabSelectedIds}
													setSelectedContactIds={setContactsTabSelectedIds}
													handleContactSelection={handleContactsTabSelection}
													campaign={campaign}
													showSearchBar={false}
													onDraftEmails={async (ids) => {
														await handleGenerateDrafts(ids);
													}}
													isDraftingDisabled={isGenerationDisabled() || isPendingGeneration}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onSearchFromMiniBar={handleMiniContactsSearch}
													goToSearch={onGoToSearch}
													goToDrafts={goToDrafting}
													goToInbox={goToInbox}
													goToWriting={goToWriting}
													hideBottomPanels
													hideButton
												/>
											</div>
										</div>
										{/* Draft Button with arrows - centered relative to full container width */}
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
											{/* Draft button container */}
											<div
												className="relative h-[40px] flex-1"
												style={{ maxWidth: '691px' }}
											>
												{contactsTabSelectedIds.size > 0 ? (
													<>
														<button
															type="button"
															onClick={() => {
																if (contactsTabSelectedIds.size === 0) {
																	return;
																}
																handleGenerateDrafts(
																	Array.from(contactsTabSelectedIds.values())
																);
															}}
															disabled={isPendingGeneration || contactsTabSelectedIds.size === 0}
															className={cn(
																'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px]',
																isPendingGeneration || contactsTabSelectedIds.size === 0
																	? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																	: 'bg-[#F2C7C7] border-[#9A3434] hover:bg-[#E6B9B9] cursor-pointer'
															)}
														>
															Draft {contactsTabSelectedIds.size} {contactsTabSelectedIds.size === 1 ? 'Contact' : 'Contacts'}
														</button>
														{/* Right section "All" button */}
														<button
															type="button"
															className="absolute right-[3px] top-[2.5px] bottom-[2.5px] w-[62px] bg-[#D17474] rounded-r-[1px] rounded-l-none flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#C26666] cursor-pointer z-10"
															onClick={(e) => {
																e.stopPropagation();
																const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
																const isAllSelected =
																	contactsTabSelectedIds.size === allIds.size &&
																	[...allIds].every((id) => contactsTabSelectedIds.has(id));
																if (isAllSelected) {
																	setContactsTabSelectedIds(new Set());
																} else {
																	setContactsTabSelectedIds(allIds);
																}
															}}
														>
															{/* Vertical divider line */}
															<div className="absolute left-0 -top-[0.5px] -bottom-[0.5px] w-[2px] bg-[#9A3434]" />
															All
														</button>
													</>
												) : (
													<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
														Select Contacts and Draft Emails
													</div>
												)}
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
										{/* Bottom Panels: Drafts, Sent, and Inbox - centered relative to 864px container */}
										<div
											className="mt-[35px] flex justify-center gap-[15px]"
											data-campaign-bottom-anchor
										>
											<DraftsExpandedList
												drafts={draftEmails}
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
												hideSendButton={true}
											/>
											<SentExpandedList
												sent={sentEmails}
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
											/>
											<InboxExpandedList
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
											/>
										</div>
									</div>
								) : (
									/* Regular centered layout for wider viewports, hide bottom panels at narrowest breakpoint */
									<div className="flex flex-col items-center">
										<ContactsSelection
										mainBoxId="contacts"
											contacts={contactsAvailableForDrafting}
											allContacts={contacts}
											selectedContactIds={contactsTabSelectedIds}
											setSelectedContactIds={setContactsTabSelectedIds}
											handleContactSelection={handleContactsTabSelection}
											campaign={campaign}
											showSearchBar={false}
											onDraftEmails={async (ids) => {
												await handleGenerateDrafts(ids);
											}}
											isDraftingDisabled={isGenerationDisabled() || isPendingGeneration}
											onContactClick={handleResearchContactClick}
											onContactHover={handleResearchContactHover}
											onSearchFromMiniBar={handleMiniContactsSearch}
											goToSearch={onGoToSearch}
											goToDrafts={goToDrafting}
											goToInbox={goToInbox}
											goToWriting={goToWriting}
											hideBottomPanels={isNarrowestDesktop}
											hideButton={isNarrowestDesktop}
										/>
										{/* Navigation arrows with draft button at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div className="flex items-center justify-center gap-[20px] mt-4 w-full px-4">
												{/* Left arrow */}
												<button
													type="button"
													onClick={goToPreviousTab}
													className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
													aria-label="Previous tab"
												>
													<LeftArrow width="14" height="27" />
												</button>
												{/* Draft button container */}
												<div
													className="relative h-[36px] flex-1"
													style={{ maxWidth: '400px' }}
												>
													{contactsTabSelectedIds.size > 0 ? (
														<>
															<button
																type="button"
																onClick={() => {
																	if (contactsTabSelectedIds.size === 0) {
																		return;
																	}
																	handleGenerateDrafts(
																		Array.from(contactsTabSelectedIds.values())
																	);
																}}
																disabled={isPendingGeneration || contactsTabSelectedIds.size === 0}
																className={cn(
																	'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[15px]',
																	isPendingGeneration || contactsTabSelectedIds.size === 0
																		? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
																		: 'bg-[#F2C7C7] border-[#9A3434] hover:bg-[#E6B9B9] cursor-pointer'
																)}
															>
																Draft {contactsTabSelectedIds.size} {contactsTabSelectedIds.size === 1 ? 'Contact' : 'Contacts'}
															</button>
															{/* Right section "All" button */}
															<button
																type="button"
																className="absolute right-[3px] top-[2.5px] bottom-[2.5px] w-[52px] bg-[#D17474] rounded-r-[1px] rounded-l-none flex items-center justify-center font-inter font-normal text-[15px] text-black hover:bg-[#C26666] cursor-pointer z-10"
																onClick={(e) => {
																	e.stopPropagation();
																	const allIds = new Set(contactsAvailableForDrafting.map((c) => c.id));
																	const isAllSelected =
																		contactsTabSelectedIds.size === allIds.size &&
																		[...allIds].every((id) => contactsTabSelectedIds.has(id));
																	if (isAllSelected) {
																		setContactsTabSelectedIds(new Set());
																	} else {
																		setContactsTabSelectedIds(allIds);
																	}
																}}
															>
																{/* Vertical divider line */}
																<div className="absolute left-0 -top-[0.5px] -bottom-[0.5px] w-[2px] bg-[#9A3434]" />
																All
															</button>
														</>
													) : (
														<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[15px]">
															Select Contacts and Draft Emails
														</div>
													)}
												</div>
												{/* Right arrow */}
												<button
													type="button"
													onClick={goToNextTab}
													className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
													aria-label="Next tab"
												>
													<RightArrow width="14" height="27" />
												</button>
											</div>
										)}
										{/* Research panel below draft button at narrowest breakpoint */}
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
														variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
														profileFields={miniProfileFields}
														identityProfile={campaign?.identity as IdentityProfileFields | null}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={contactsAvailableForDrafting.length}
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
											goToContacts={goToContacts}
											goToDrafts={goToDrafting}
											goToWriting={goToWriting}
											goToSearch={onGoToSearch}
											goToInbox={goToInbox}
										/>
									</div>
								) : isNarrowDesktop ? (
									// Narrow desktop (952px - 1279px): center BOTH the left panel and sent table together
									// Fixed width container: left (330) + gap (10) + right (499) = 839px, centered with mx-auto
									<div className="flex flex-col items-center mx-auto" style={{ width: '839px' }}>
										<div className="flex flex-row items-start gap-[10px] w-full">
											{/* Left column: Campaign Header + Email Structure + Research - fixed 330px */}
											<div className="flex flex-col flex-shrink-0" style={{ gap: '10px', width: '330px' }}>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													onFromClick={onOpenIdentityDialog}
													onContactsClick={goToContacts}
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
														variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
														profileFields={miniProfileFields}
														identityProfile={campaign?.identity as IdentityProfileFields | null}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={contactsAvailableForDrafting.length}
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
												{/* Research panel below mini email structure - height set so bottom aligns with sent table (71 + 10 + 316 + 10 + 296 = 703 = sent table height) */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={330}
														height={296}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={sentEmails.length === 0}
														hideSummaryIfBullets={true}
														height={296}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												)}
											</div>
											{/* Right column: Sent table - fixed 499px, overflow visible for bottom panels */}
											<div className="flex-shrink-0 [&>*]:!items-start" style={{ width: '499px', overflow: 'visible' }}>
												<SentEmails
													mainBoxId="sent"
													emails={sentEmails}
													isPendingEmails={isPendingEmails}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onEmailHover={setHoveredSentForSettings}
													goToContacts={goToContacts}
													goToDrafts={goToDrafting}
													goToWriting={goToWriting}
													goToSearch={onGoToSearch}
													goToInbox={goToInbox}
												/>
											</div>
										</div>
										{/* Bottom Panels: Contacts, Drafts, and Inbox - centered relative to container */}
										<div
											className="mt-[91px] flex justify-center gap-[15px]"
											data-campaign-bottom-anchor
										>
											<ContactsExpandedList
												contacts={contactsAvailableForDrafting}
												width={232}
												height={117}
												whiteSectionHeight={15}
												showSearchBar={false}
												onOpenContacts={goToContacts}
											/>
											<DraftsExpandedList
												drafts={draftEmails}
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
												hideSendButton={true}
												onOpenDrafts={goToDrafting}
											/>
											<InboxExpandedList
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
												onOpenInbox={goToInbox}
											/>
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
											goToContacts={goToContacts}
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
														variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
														settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
														settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
														profileFields={miniProfileFields}
														identityProfile={campaign?.identity as IdentityProfileFields | null}
														onIdentityUpdate={handleIdentityUpdate}
														onDraft={() =>
															handleGenerateDrafts(
																contactsAvailableForDrafting.map((c) => c.id)
															)
														}
														isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
														isPendingGeneration={isPendingGeneration}
														generationProgress={generationProgress}
														generationTotal={contactsAvailableForDrafting.length}
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

										{/* Bottom Panels: Contacts, Drafts, and Inbox - hidden at narrowest breakpoint (< 952px) */}
										{!isNarrowestDesktop && (
											<div className="mt-[91px] flex justify-center gap-[15px]">
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													width={232}
													height={117}
													whiteSectionHeight={15}
													showSearchBar={false}
													onOpenContacts={goToContacts}
												/>
												<DraftsExpandedList
													drafts={draftEmails}
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													hideSendButton={true}
													onOpenDrafts={goToDrafting}
												/>
												<InboxExpandedList
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													onOpenInbox={goToInbox}
												/>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Search tab - show the campaign contacts on a map */}
						{view === 'search' && (
							<div className="flex flex-col items-center justify-center min-h-[300px]">
								{/* Wrapper to center both left panel and map as one unit at narrow breakpoint */}
								<div className={isSearchTabNarrow ? 'flex items-start gap-[37px]' : ''}>
									{/* Left panel - header box + research panel (only at narrow breakpoint) */}
									{isSearchTabNarrow && !isMobile && !hideHeaderBox && (
										<div className="flex flex-col" style={{ gap: '16px', paddingTop: '29px' }}>
											<CampaignHeaderBox
												campaignId={campaign?.id}
												campaignName={campaign?.name || 'Untitled Campaign'}
												toListNames={toListNames}
												fromName={fromName}
												contactsCount={contactsCount}
												draftCount={draftCount}
												sentCount={sentCount}
												onFromClick={onOpenIdentityDialog}
												onContactsClick={goToContacts}
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
												{hasCampaignSearched && !isSearching && searchResultsForPanel.length > 0 ? (
													<div
														className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
														style={{
															width: '375px',
															height: '557px',
														}}
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
																	{areAllSearchResultsSelected ? 'Deselect all' : 'Select all'}
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
																													: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																									<MusicVenuesIcon size={12} className="flex-shrink-0" />
																								)}
																								{isMusicFestivalTitle(headline) && (
																									<FestivalsIcon size={12} className="flex-shrink-0" />
																								)}
{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
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
																												: isMusicFestivalTitle(headline)
																													? '#C1D6FF'
																													: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																									<MusicVenuesIcon size={12} className="flex-shrink-0" />
																								)}
																								{isMusicFestivalTitle(headline) && (
																									<FestivalsIcon size={12} className="flex-shrink-0" />
																								)}
{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
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
																				setSearchResultsSelectedContacts(searchResultsForPanelIds);
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
												) : (
													isBatchDraftingInProgress ? (
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
													)
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
															!searchActiveSection ? 'group-hover:border-black/10' : ''
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
															!searchActiveSection ? 'group-hover:border-black/10' : ''
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
																	() => target.setSelectionRange(0, target.value.length),
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
												contacts={
													activeSearchTabId === null
														? contacts || [] // Original tab - show campaign contacts
														: activeCampaignSearchQuery
														? searchResults || [] // Search tab with query - show results
														: [] // Empty search tab - show nothing (zoomed out view)
												}
												selectedContacts={
													activeSearchTabId !== null
														? searchResultsSelectedContacts
														: searchTabSelectedContacts
												}
												searchQuery={activeSearchTabId !== null ? activeCampaignSearchQuery : undefined}
												searchWhat={activeSearchTabId !== null ? activeSearchTab?.what : undefined}
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
																searchTabSelectedContacts.filter((id) => id !== contactId)
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
													if (activeSearchTabId !== null && !baseSearchResultsIdSet.has(contact.id)) {
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
										width: isNarrowestDesktop ? '407px' : isSearchTabNarrow ? '691px' : '528px',
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
											searchResultsSelectedContacts.length === 0 ||
											isAddingToCampaign
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
											if (searchResultsForPanelIds.length > 0 && !areAllSearchResultsSelected) {
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
									{hasCampaignSearched && !isSearching && searchResultsForPanel.length > 0 ? (
										<div
											className="bg-[#D8E5FB] border-[3px] border-[#143883] rounded-[7px] overflow-hidden flex flex-col"
											style={{
												width: '498px',
												height: '400px',
											}}
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
															{areAllSearchResultsSelected ? 'Deselect all' : 'Select all'}
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
																										: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																						<MusicVenuesIcon size={12} className="flex-shrink-0" />
																					)}
																					{isMusicFestivalTitle(headline) && (
																						<FestivalsIcon size={12} className="flex-shrink-0" />
																					)}
{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
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
																									: (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
																						<MusicVenuesIcon size={12} className="flex-shrink-0" />
																					)}
{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
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
									) : (
										isBatchDraftingInProgress ? (
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
										)
									)}
								</div>
							)}
						</div>
						)}

						{/* Inbox tab: reuse the dashboard inbox UI, but scoped and labeled by campaign contacts */}
						{view === 'inbox' && (
							<div className="mt-6 flex flex-col items-center">
								{isNarrowestDesktop ? (
									// Narrowest layout (< 952px): Single column with Inbox on top, Research below
									<div className="flex flex-col items-center w-full">
										{/* Inbox section */}
										<InboxSection
											allowedSenderEmails={campaignContactEmails}
											contactByEmail={campaignContactsByEmail}
											campaignId={campaign.id}
											onGoToDrafting={goToDrafting}
											onGoToWriting={goToWriting}
											onGoToContacts={goToContacts}
											onGoToSearch={onGoToSearch}
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
										{/* Research panel below inbox - matches InboxSection's container structure (w-full mx-auto px-4 maxWidth 516px) - hidden on mobile */}
									{!isMobile && (
										<div className="mt-[20px] w-full flex justify-center px-4">
											{isBatchDraftingInProgress ? (
												<DraftPreviewExpandedList
													contacts={contacts || []}
													livePreview={liveDraftPreview}
													fallbackDraft={draftPreviewFallbackDraft}
													width={516}
													height={400}
												/>
											) : (
												<ContactResearchPanel
													contact={displayedContactForResearch}
													hideAllText={false}
													hideSummaryIfBullets={true}
													height={400}
													width={516}
													boxWidth={488}
													compactHeader
													style={{ display: 'block' }}
												/>
											)}
										</div>
									)}
									</div>
								) : isInboxTabStacked ? (
									// Stacked layout (952px - 1279px): Header + Research on left, Inbox on right
									<div className="flex flex-col items-center mx-auto" style={{ width: '909px' }}>
										<div className="flex flex-row items-start gap-[18px] w-full">
											{/* Left column: Campaign Header + Research Panel */}
											<div className="flex flex-col flex-shrink-0" style={{ gap: '16px', width: '375px' }}>
												<CampaignHeaderBox
													campaignId={campaign?.id}
													campaignName={campaign?.name || 'Untitled Campaign'}
													toListNames={toListNames}
													fromName={fromName}
													contactsCount={contactsCount}
													draftCount={draftCount}
													sentCount={sentCount}
													onFromClick={onOpenIdentityDialog}
													onContactsClick={goToContacts}
													onDraftsClick={goToDrafting}
													onSentClick={goToSent}
													width={375}
												/>
												{/* Research panel below header - full aesthetic matching other tabs */}
											{/* Height calculated so bottom aligns with inbox: 657px inbox - 71px header - 16px gap = 570px */}
												{isBatchDraftingInProgress ? (
													<DraftPreviewExpandedList
														contacts={contacts || []}
														livePreview={liveDraftPreview}
														fallbackDraft={draftPreviewFallbackDraft}
														width={375}
														height={570}
													/>
												) : (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={false}
														height={570}
														style={{ display: 'block' }}
													/>
												)}
											</div>
											{/* Right column: Inbox */}
											<div className="flex-shrink-0">
												<InboxSection
													allowedSenderEmails={campaignContactEmails}
													contactByEmail={campaignContactsByEmail}
													campaignId={campaign.id}
													onGoToDrafting={goToDrafting}
													onGoToWriting={goToWriting}
													onGoToContacts={goToContacts}
													onGoToSearch={onGoToSearch}
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
										{/* Bottom Panels: Contacts, Drafts, and Sent */}
										<div className="mt-[91px] flex justify-center gap-[15px]">
											<ContactsExpandedList
												contacts={contactsAvailableForDrafting}
												width={232}
												height={117}
												whiteSectionHeight={15}
												showSearchBar={false}
												onOpenContacts={goToContacts}
											/>
											<DraftsExpandedList
												drafts={draftEmails}
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
												hideSendButton={true}
												onOpenDrafts={goToDrafting}
											/>
											<SentExpandedList
												sent={sentEmails}
												contacts={contacts || []}
												width={233}
												height={117}
												whiteSectionHeight={15}
												onOpenSent={goToSent}
											/>
										</div>
									</div>
								) : (
									// Normal wide layout
									<>
										<InboxSection
											allowedSenderEmails={campaignContactEmails}
											contactByEmail={campaignContactsByEmail}
											campaignId={campaign.id}
											onGoToDrafting={goToDrafting}
											onGoToWriting={goToWriting}
											onGoToContacts={goToContacts}
											onGoToSearch={onGoToSearch}
											onContactSelect={(contact) => {
												if (contact) {
													setSelectedContactForResearch(contact);
												}
											}}
											onContactHover={(contact) => {
												setHoveredContactForResearch(contact);
											}}
											isNarrow={isInboxTabNarrow}
										/>

										{/* Bottom Panels: Contacts, Drafts, and Sent - hidden at narrowest breakpoint (< 952px) */}
										{!isNarrowestDesktop && (
											<div
												className="mt-[35px] flex justify-center gap-[15px]"
												data-campaign-bottom-anchor
											>
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													width={232}
													height={117}
													whiteSectionHeight={15}
													showSearchBar={false}
													onOpenContacts={goToContacts}
												/>
												<DraftsExpandedList
													drafts={draftEmails}
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													hideSendButton={true}
													onOpenDrafts={goToDrafting}
												/>
												<SentExpandedList
													sent={sentEmails}
													contacts={contacts || []}
													width={233}
													height={117}
													whiteSectionHeight={15}
													onOpenSent={goToSent}
												/>
											</div>
										)}
									</>
								)}
							</div>
						)}

						{/* All tab */}
						{view === 'all' && (
							<div className="mt-6 flex justify-center">
								{/* Single column layout at narrowest breakpoint (< 952px) */}
								{isNarrowestDesktop ? (
									<div className="flex flex-col items-center" style={{ gap: '39px' }}>
										{/* 1. Campaign Header */}
										<CampaignHeaderBox
											campaignId={campaign?.id}
											campaignName={campaign?.name || 'Untitled Campaign'}
											toListNames={toListNames}
											fromName={fromName}
											contactsCount={contactsCount}
											draftCount={draftCount}
											sentCount={sentCount}
											onFromClick={onOpenIdentityDialog}
											onContactsClick={goToContacts}
											onDraftsClick={goToDrafting}
											onSentClick={goToSent}
											width={330}
										/>
										{/* 2. Contacts */}
										<div
											style={{
												width: '330px',
												height: '263px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsContactsHovered(true)}
											onMouseLeave={() => setIsContactsHovered(false)}
											onClick={() => {
												setIsContactsHovered(false);
												goToContacts?.();
											}}
										>
											{isContactsHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '278px',
														backgroundColor: 'transparent',
														border: '6px solid #D75152',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													campaign={campaign}
													selectedContactIds={contactsTabSelectedIds}
													onContactSelectionChange={(updater) =>
														setContactsTabSelectedIds((prev) => updater(new Set(prev)))
													}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onDraftSelected={async (ids) => {
														await handleGenerateDrafts(ids);
													}}
													isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
													isPendingGeneration={isPendingGeneration}
													width={330}
													height={263}
													minRows={5}
													onSearchFromMiniBar={handleMiniContactsSearch}
													onOpenContacts={goToContacts}
												/>
											</div>
										</div>
										{/* 3. Writing */}
										<div
											style={{
												width: '330px',
												height: '349px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsWritingHovered(true)}
											onMouseLeave={() => setIsWritingHovered(false)}
											onClick={() => {
												setIsWritingHovered(false);
												goToWriting?.();
											}}
										>
											{isWritingHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #37B73B',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<MiniEmailStructure
													form={
														isDraftingView
															? draftsSettingsPreviewForm
															: isSentView
																? sentSettingsPreviewForm
																: form
													}
													readOnly={isDraftingView || isSentView}
													variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
													settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
													settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
													profileFields={miniProfileFields}
													identityProfile={campaign?.identity as IdentityProfileFields | null}
													onIdentityUpdate={handleIdentityUpdate}
													onDraft={() =>
														handleGenerateDrafts(
															contactsAvailableForDrafting.map((c) => c.id)
														)
													}
													isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
													isPendingGeneration={isPendingGeneration}
													generationProgress={generationProgress}
													generationTotal={contactsAvailableForDrafting.length}
													hideTopChrome
													hideFooter
													fullWidthMobile
													hideAddTextButtons
													fitToHeight
													height={349}
													pageFillColor={draftsMiniEmailFillColor}
													topHeaderHeight={draftsMiniEmailTopHeaderHeight}
													topHeaderLabel={draftsMiniEmailTopHeaderLabel}
													onOpenWriting={goToWriting}
												/>
											</div>
										</div>
										{/* 4. Drafts */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsDraftsHovered(true)}
											onMouseLeave={() => setIsDraftsHovered(false)}
											onClick={() => {
												setIsDraftsHovered(false);
												goToDrafting?.();
											}}
										>
											{isDraftsHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #E6AF4D',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<DraftsExpandedList
													drafts={draftEmails}
													contacts={contacts || []}
													width={330}
													height={347}
													hideSendButton
													onOpenDrafts={goToDrafting}
												/>
											</div>
										</div>
										{/* 5. Sent */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsSentHovered(true)}
											onMouseLeave={() => setIsSentHovered(false)}
											onClick={() => {
												setIsSentHovered(false);
												goToSent?.();
											}}
										>
											{isSentHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #2CA954',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<SentExpandedList
													sent={sentEmails}
													contacts={contacts || []}
													width={330}
													height={347}
													onOpenSent={goToSent}
												/>
											</div>
										</div>
										{/* 6. Research Panel */}
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
												className="!block"
											/>
										)}
										{/* 7. Suggestion Box */}
										<div
											style={{
												width: '330px',
												height: '347px',
												backgroundColor: '#D6EEEF',
												border: '3px solid #000000',
												borderRadius: '7px',
												position: 'relative',
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
											<div
												style={{
													position: 'absolute',
													top: '26px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '322px',
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
											<div
												onClick={() => {
													if (hasPreviousPrompt) {
														undoUpscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '6px',
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
												{clampedPromptScore != null && <UndoIcon width="24" height="24" />}
											</div>
											<div
												onClick={() => {
													if (!isUpscalingPrompt) {
														upscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '50px',
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
												{(clampedPromptScore != null || isUpscalingPrompt) && (
													<>
														<span
															style={{
																fontFamily: 'Inter, system-ui, sans-serif',
																fontSize: '13px',
																fontWeight: 500,
																color: '#000000',
																lineHeight: '1',
															}}
														>
															{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Instructions'}
														</span>
														<div style={{ flexShrink: 0 }}>
															<UpscaleIcon width="20" height="20" />
														</div>
													</>
												)}
											</div>
											<div
												style={{
													position: 'absolute',
													top: '139px',
													left: '8px',
													fontFamily: 'Inter, system-ui, sans-serif',
													fontWeight: 500,
													fontSize: '17px',
													lineHeight: '20px',
													color: '#000000',
												}}
											>
												Custom Instructions
											</div>
											{/* Suggestion 1 */}
											<div
												style={{
													position: 'absolute',
													top: '176px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#A6DDE0',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#A6DDE0' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText1 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText1 || (clampedPromptScore != null ? 'Add your prompt to get suggestions' : '')}
													</div>
												</div>
											</div>
											{/* Suggestion 2 */}
											<div
												style={{
													position: 'absolute',
													top: '230px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#5BB9CB',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#5BB9CB' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText2 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText2 || (clampedPromptScore != null ? 'More suggestions will appear here' : '')}
													</div>
												</div>
											</div>
											{/* Suggestion 3 */}
											<div
												style={{
													position: 'absolute',
													top: '284px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#35859D',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#35859D' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText3 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText3 || (clampedPromptScore != null ? 'Additional suggestions here' : '')}
													</div>
												</div>
											</div>
										</div>
										{/* 8. Draft Preview */}
										<DraftPreviewExpandedList
											contacts={contacts || []}
											fallbackDraft={
												draftEmails[0]
													? {
															contactId: draftEmails[0].contactId,
															subject: draftEmails[0].subject,
															message: draftEmails[0].message,
													  }
													: null
											}
											width={330}
											height={347}
										/>
										{/* 9. Inbox */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsInboxHovered(true)}
											onMouseLeave={() => setIsInboxHovered(false)}
											onClick={() => {
												setIsInboxHovered(false);
												goToInbox?.();
											}}
										>
											{isInboxHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #5EB6D6',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<InboxExpandedList
													contacts={contacts || []}
													allowedSenderEmails={campaignContactEmails}
													contactByEmail={campaignContactsByEmail}
													width={330}
													height={347}
													onOpenInbox={goToInbox}
												/>
											</div>
										</div>
									</div>
								) : (
								<div className="flex flex-row items-start" style={{ gap: '30px' }}>
									{/* Left column: Campaign Header + Contacts + Research (+ Preview in narrow mode) */}
									<div className="flex flex-col items-center" style={{ gap: '39px' }}>
										<CampaignHeaderBox
											campaignId={campaign?.id}
											campaignName={campaign?.name || 'Untitled Campaign'}
											toListNames={toListNames}
											fromName={fromName}
											contactsCount={contactsCount}
											draftCount={draftCount}
											sentCount={sentCount}
											onFromClick={onOpenIdentityDialog}
											onContactsClick={goToContacts}
											onDraftsClick={goToDrafting}
											onSentClick={goToSent}
											width={330}
										/>
										<div
											style={{
												width: '330px',
												height: '263px',
												overflow: 'visible',
												marginTop: '-24px', // Align bottom with MiniEmailStructure (349px): Header 71px + Gap 39px - 24px + Contacts 263px = 349px
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsContactsHovered(true)}
											onMouseLeave={() => setIsContactsHovered(false)}
											onClick={() => {
												setIsContactsHovered(false);
												goToContacts?.();
											}}
										>
											{/* Hover box */}
											{isContactsHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '278px',
														backgroundColor: 'transparent',
														border: '6px solid #D75152',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<ContactsExpandedList
													contacts={contactsAvailableForDrafting}
													campaign={campaign}
													selectedContactIds={contactsTabSelectedIds}
													onContactSelectionChange={(updater) =>
														setContactsTabSelectedIds((prev) => updater(new Set(prev)))
													}
													onContactClick={handleResearchContactClick}
													onContactHover={handleResearchContactHover}
													onDraftSelected={async (ids) => {
														await handleGenerateDrafts(ids);
													}}
													isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
													isPendingGeneration={isPendingGeneration}
													width={330}
													height={263}
													minRows={5}
													onSearchFromMiniBar={handleMiniContactsSearch}
													onOpenContacts={goToContacts}
												/>
											</div>
										</div>
										{/* In narrow mode (2x4 grid), add Drafts here after Contacts */}
										{isAllTabNarrow && (
											<div
												style={{
													width: '330px',
													height: '347px',
													overflow: 'visible',
													position: 'relative',
													cursor: 'pointer',
												}}
												onMouseEnter={() => setIsDraftsHovered(true)}
												onMouseLeave={() => setIsDraftsHovered(false)}
												onClick={() => {
													setIsDraftsHovered(false);
													goToDrafting?.();
												}}
											>
												{/* Hover box */}
												{isDraftsHovered && (
													<div
														style={{
															position: 'absolute',
															top: '50%',
															left: '50%',
															transform: 'translate(-50%, -50%)',
															width: '364px',
															height: '364px',
															backgroundColor: 'transparent',
															border: '6px solid #E6AF4D',
															borderRadius: '0px',
															zIndex: 10,
															pointerEvents: 'none',
														}}
													/>
												)}
												<div style={{ position: 'relative', zIndex: 20 }}>
													<DraftsExpandedList
														drafts={draftEmails}
														contacts={contacts || []}
														width={330}
														height={347}
														hideSendButton
														onOpenDrafts={goToDrafting}
													/>
												</div>
											</div>
										)}
										{/* Research Panel */}
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
												className="!block"
											/>
										)}
										{/* In narrow mode (2x4 grid), move Preview here */}
										{isAllTabNarrow && (
											<DraftPreviewExpandedList
												contacts={contacts || []}
												fallbackDraft={
													draftEmails[0]
														? {
																contactId: draftEmails[0].contactId,
																subject: draftEmails[0].subject,
																message: draftEmails[0].message,
														  }
														: null
												}
												width={330}
												height={347}
											/>
										)}
									</div>
									{/* Column 2: Writing (Row 1) + Suggestion (Row 2) */}
									<div className="flex flex-col items-center" style={{ gap: '39px' }}>
										{/* Row 1: Mini Email Structure */}
										<div
											style={{
												width: '330px',
												height: '349px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsWritingHovered(true)}
											onMouseLeave={() => setIsWritingHovered(false)}
											onClick={() => {
												setIsWritingHovered(false);
												goToWriting?.();
											}}
										>
											{/* Hover box */}
											{isWritingHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #37B73B',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<MiniEmailStructure
													form={
														isDraftingView
															? draftsSettingsPreviewForm
															: isSentView
																? sentSettingsPreviewForm
																: form
													}
													readOnly={isDraftingView || isSentView}
													variant={draftsMiniEmailTopHeaderHeight ? 'settings' : undefined}
													settingsPrimaryLabel={draftsMiniEmailSettingsLabels.primary}
													settingsSecondaryLabel={draftsMiniEmailSettingsLabels.secondary}
													profileFields={miniProfileFields}
													identityProfile={campaign?.identity as IdentityProfileFields | null}
													onIdentityUpdate={handleIdentityUpdate}
													onDraft={() =>
														handleGenerateDrafts(
															contactsAvailableForDrafting.map((c) => c.id)
														)
													}
													isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
													isPendingGeneration={isPendingGeneration}
													generationProgress={generationProgress}
													generationTotal={contactsAvailableForDrafting.length}
													hideTopChrome
													hideFooter
													fullWidthMobile
													hideAddTextButtons
													fitToHeight
													height={349}
													pageFillColor={draftsMiniEmailFillColor}
													topHeaderHeight={draftsMiniEmailTopHeaderHeight}
													topHeaderLabel={draftsMiniEmailTopHeaderLabel}
													onOpenWriting={goToWriting}
												/>
											</div>
										</div>
										{/* In narrow mode, add Sent here (after Writing, before Suggestion) */}
										{isAllTabNarrow && (
											<div
												style={{
													width: '330px',
													height: '347px',
													overflow: 'visible',
													position: 'relative',
													cursor: 'pointer',
												}}
												onMouseEnter={() => setIsSentHovered(true)}
												onMouseLeave={() => setIsSentHovered(false)}
												onClick={() => {
													setIsSentHovered(false);
													goToSent?.();
												}}
											>
												{/* Hover box */}
												{isSentHovered && (
													<div
														style={{
															position: 'absolute',
															top: '50%',
															left: '50%',
															transform: 'translate(-50%, -50%)',
															width: '364px',
															height: '364px',
															backgroundColor: 'transparent',
															border: '6px solid #2CA954',
															borderRadius: '0px',
															zIndex: 10,
															pointerEvents: 'none',
														}}
													/>
												)}
												<div style={{ position: 'relative', zIndex: 20 }}>
													<SentExpandedList
														sent={sentEmails}
														contacts={contacts || []}
														width={330}
														height={347}
														onOpenSent={goToSent}
													/>
												</div>
											</div>
										)}
										{/* Row 2: Suggestion Box */}
										<div
											style={{
												width: '330px',
												height: '347px',
												backgroundColor: '#D6EEEF',
												border: '3px solid #000000',
												borderRadius: '7px',
												position: 'relative',
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
													width: '322px',
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
											{/* Undo button */}
											<div
												onClick={() => {
													if (hasPreviousPrompt) {
														undoUpscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '6px',
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
												{clampedPromptScore != null && <UndoIcon width="24" height="24" />}
											</div>
											{/* Upscale Prompt button */}
											<div
												onClick={() => {
													if (!isUpscalingPrompt) {
														upscalePrompt();
													}
												}}
												style={{
													position: 'absolute',
													top: '61px',
													left: '50px',
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
												{(clampedPromptScore != null || isUpscalingPrompt) && (
													<>
														<span
															style={{
																fontFamily: 'Inter, system-ui, sans-serif',
																fontSize: '13px',
																fontWeight: 500,
																color: '#000000',
																lineHeight: '1',
															}}
														>
															{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Instructions'}
														</span>
														<div style={{ flexShrink: 0 }}>
															<UpscaleIcon width="20" height="20" />
														</div>
													</>
												)}
											</div>
											<div
												style={{
													position: 'absolute',
													top: '139px',
													left: '8px',
													fontFamily: 'Inter, system-ui, sans-serif',
													fontWeight: 500,
													fontSize: '17px',
													lineHeight: '20px',
													color: '#000000',
												}}
											>
												Custom Instructions
											</div>
											{/* Suggestion 1 */}
											<div
												style={{
													position: 'absolute',
													top: '176px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#A6DDE0',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#A6DDE0' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText1 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText1 || (clampedPromptScore != null ? 'Add your prompt to get suggestions' : '')}
													</div>
												</div>
											</div>
											{/* Suggestion 2 */}
											<div
												style={{
													position: 'absolute',
													top: '230px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#5BB9CB',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#5BB9CB' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText2 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText2 || (clampedPromptScore != null ? 'More suggestions will appear here' : '')}
													</div>
												</div>
											</div>
											{/* Suggestion 3 */}
											<div
												style={{
													position: 'absolute',
													top: '284px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#35859D',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
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
												<div
													style={{
														position: 'absolute',
														top: '0',
														bottom: '0',
														margin: 'auto',
														right: '6px',
														width: '260px',
														height: '39px',
														backgroundColor: clampedPromptScore == null ? '#35859D' : '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														display: 'flex',
														alignItems: 'center',
														padding: '4px 6px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															fontFamily: 'Inter, system-ui, sans-serif',
															fontSize: '10px',
															lineHeight: '1.3',
															color: suggestionText3 ? '#000000' : '#888888',
															wordBreak: 'break-word',
															whiteSpace: 'normal',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
														}}
													>
														{suggestionText3 || (clampedPromptScore != null ? 'Additional suggestions here' : '')}
													</div>
												</div>
											</div>
										</div>
										{/* In narrow mode (2x4 grid), add Inbox here (after Suggestion) */}
										{isAllTabNarrow && (
											<>
												{/* Inbox */}
												<div
													style={{
														width: '330px',
														height: '347px',
														overflow: 'visible',
														position: 'relative',
														cursor: 'pointer',
													}}
													onMouseEnter={() => setIsInboxHovered(true)}
													onMouseLeave={() => setIsInboxHovered(false)}
													onClick={() => {
														setIsInboxHovered(false);
														goToInbox?.();
													}}
												>
													{/* Hover box */}
													{isInboxHovered && (
														<div
															style={{
																position: 'absolute',
																top: '50%',
																left: '50%',
																transform: 'translate(-50%, -50%)',
																width: '364px',
																height: '364px',
																backgroundColor: 'transparent',
																border: '6px solid #5EB6D6',
																borderRadius: '0px',
																zIndex: 10,
																pointerEvents: 'none',
															}}
														/>
													)}
													<div style={{ position: 'relative', zIndex: 20 }}>
														<InboxExpandedList
															contacts={contacts || []}
															allowedSenderEmails={campaignContactEmails}
															contactByEmail={campaignContactsByEmail}
															width={330}
															height={347}
															onOpenInbox={goToInbox}
														/>
													</div>
												</div>
											</>
										)}
									</div>

									{/* Column 3 & 4: hidden in narrow mode (2x4 grid) */}
									{!isAllTabNarrow && (
									<>
									{/* Column 3: Drafts (Row 1) + Preview (Row 2) */}
									<div className="flex flex-col items-center" style={{ gap: '39px' }}>
										{/* Row 1: Drafts */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsDraftsHovered(true)}
											onMouseLeave={() => setIsDraftsHovered(false)}
											onClick={() => {
												setIsDraftsHovered(false);
												goToDrafting?.();
											}}
										>
											{/* Hover box */}
											{isDraftsHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #E6AF4D',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<DraftsExpandedList
													drafts={draftEmails}
													contacts={contacts || []}
													width={330}
													height={347}
													hideSendButton
													onOpenDrafts={goToDrafting}
												/>
											</div>
										</div>
										{/* Row 2: Draft Preview */}
										<DraftPreviewExpandedList
											contacts={contacts || []}
											fallbackDraft={
												draftEmails[0]
													? {
															contactId: draftEmails[0].contactId,
															subject: draftEmails[0].subject,
															message: draftEmails[0].message,
													  }
													: null
											}
											width={330}
											height={347}
										/>
									</div>

									{/* Column 4: Sent (Row 1) + Inbox (Row 2) */}
									<div className="flex flex-col items-center" style={{ gap: '39px' }}>
										{/* Row 1: Sent */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsSentHovered(true)}
											onMouseLeave={() => setIsSentHovered(false)}
											onClick={() => {
												setIsSentHovered(false);
												goToSent?.();
											}}
										>
											{/* Hover box */}
											{isSentHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #2CA954',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<SentExpandedList
													sent={sentEmails}
													contacts={contacts || []}
													width={330}
													height={347}
													onOpenSent={goToSent}
												/>
											</div>
										</div>
										{/* Row 2: Inbox */}
										<div
											style={{
												width: '330px',
												height: '347px',
												overflow: 'visible',
												position: 'relative',
												cursor: 'pointer',
											}}
											onMouseEnter={() => setIsInboxHovered(true)}
											onMouseLeave={() => setIsInboxHovered(false)}
											onClick={() => {
												setIsInboxHovered(false);
												goToInbox?.();
											}}
										>
											{/* Hover box */}
											{isInboxHovered && (
												<div
													style={{
														position: 'absolute',
														top: '50%',
														left: '50%',
														transform: 'translate(-50%, -50%)',
														width: '364px',
														height: '364px',
														backgroundColor: 'transparent',
														border: '6px solid #5EB6D6',
														borderRadius: '0px',
														zIndex: 10,
														pointerEvents: 'none',
													}}
												/>
											)}
											<div style={{ position: 'relative', zIndex: 20 }}>
												<InboxExpandedList
													contacts={contacts || []}
													allowedSenderEmails={campaignContactEmails}
													contactByEmail={campaignContactsByEmail}
													width={330}
													height={347}
													onOpenInbox={goToInbox}
												/>
											</div>
										</div>
									</div>
									</>
									)}
								</div>
								)}
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
						<div className="relative w-screen max-w-none mt-10 pb-10" aria-hidden="true" />
					)}
				</form>
			</Form>

			{/* Main-box ghost: portal to <body> so "fixed" aligns with viewport (avoid transformed-parent offsets) */}
			{/* Top-of-page drafting progress bar (synced with the live Draft Preview playback) */}
			{isClient &&
				renderGlobalOverlays &&
				isLivePreviewVisible &&
				livePreviewTotal > 0 &&
				progressBarPortalTarget &&
				createPortal(
					<div
						aria-hidden="true"
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 'calc(env(safe-area-inset-top) + 6px)',
							zIndex: 9999,
							pointerEvents: 'none',
							display: 'flex',
							justifyContent: 'center',
						}}
					>
						<div
							className="flex items-center gap-3 font-inter font-medium text-black text-[14px]"
							style={{ lineHeight: 1 }}
						>
							<span style={{ minWidth: 18, textAlign: 'right' }}>
								{Math.min(Math.max(livePreviewDraftNumber, 0), livePreviewTotal)}
							</span>
							<div
								style={{
									width: 500,
									maxWidth: 'calc(100vw - 120px)',
									height: 9,
									backgroundColor: '#D1D1D1',
									position: 'relative',
								}}
							>
								<div
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										height: '100%',
										width: `${Math.min(
											100,
											Math.max(
												0,
												(livePreviewDraftNumber / Math.max(1, livePreviewTotal)) * 100
											)
										)}%`,
										backgroundColor: '#EDB552',
									}}
								/>
							</div>
							<span style={{ minWidth: 18, textAlign: 'left' }}>
								{livePreviewTotal}
							</span>
						</div>
					</div>,
					progressBarPortalTarget
				)}

		{isClient &&
			createPortal(
				<div
					ref={mainBoxGhostRef}
					aria-hidden="true"
					style={{
						position: 'fixed',
						left: 0,
						top: 0,
						width: 0,
						height: 0,
						boxSizing: 'border-box',
						border: '3px solid #000000',
						borderRadius: '8px',
						background: 'transparent',
						opacity: 0,
						pointerEvents: 'none',
						zIndex: 2000,
						overflow: 'hidden',
					}}
				>
					{/* Fill layers for background crossfade */}
					<div
						ref={mainBoxGhostFromFillRef}
						style={{ position: 'absolute', inset: 0, opacity: 1, pointerEvents: 'none' }}
					/>
					<div
						ref={mainBoxGhostToFillRef}
						style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
					/>
					{/* Content layers for UI crossfade */}
					<div
						ref={mainBoxGhostFromContentRef}
						style={{ position: 'absolute', inset: 0, opacity: 1, pointerEvents: 'none', overflow: 'hidden' }}
					/>
					<div
						ref={mainBoxGhostToContentRef}
						style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
					/>
				</div>,
				// Use <html> instead of <body> because Murmur applies fallback scaling
				// via `html.murmur-compact body { transform: scale(...) }` on browsers
				// that don't support `zoom` (e.g. Firefox). A transformed <body> would
				// offset `position: fixed` children and break rect alignment.
				document.documentElement
			)}

		{isClient &&
			createPortal(
				<div
					ref={researchPanelGhostRef}
					aria-hidden="true"
					style={{
						position: 'fixed',
						left: 0,
						top: 0,
						width: 0,
						height: 0,
						boxSizing: 'border-box',
						border: '3px solid #000000',
						borderRadius: '7px',
						background: 'transparent',
						opacity: 0,
						pointerEvents: 'none',
						zIndex: 2001,
						overflow: 'hidden',
					}}
				>
					{/* Fill layers for background crossfade */}
					<div
						ref={researchPanelGhostFromFillRef}
						style={{ position: 'absolute', inset: 0, opacity: 1, pointerEvents: 'none' }}
					/>
					<div
						ref={researchPanelGhostToFillRef}
						style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
					/>
					{/* Content layers for UI crossfade */}
					<div
						ref={researchPanelGhostFromContentRef}
						style={{
							position: 'absolute',
							inset: 0,
							opacity: 1,
							pointerEvents: 'none',
							overflow: 'hidden',
						}}
					/>
					<div
						ref={researchPanelGhostToContentRef}
						style={{
							position: 'absolute',
							inset: 0,
							opacity: 0,
							pointerEvents: 'none',
							overflow: 'hidden',
						}}
					/>
				</div>,
				document.documentElement
			)}

			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={isOpenUpgradeSubscriptionDrawer}
				setIsOpen={setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>
		</div>
	);
};
