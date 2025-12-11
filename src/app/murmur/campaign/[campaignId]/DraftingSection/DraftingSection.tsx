import { FC, Fragment, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DraftingSectionProps, useDraftingSection, HybridBlockPrompt } from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
// EmailGeneration kept available but not used in current view
// import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn, stringifyJsonSubset, generateEmailTemplateFromBlocks, generatePromptsFromBlocks, removeEmDashes, convertAiResponseToRichTextEmail } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useGetContacts, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus, EmailVerificationStatus, DraftingMode, ReviewStatus } from '@/constants/prismaEnums';
import { ContactsSelection } from './EmailGeneration/ContactsSelection/ContactsSelection';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';
import { DraftedEmails } from './EmailGeneration/DraftedEmails/DraftedEmails';
import { EmailWithRelations, StripeSubscriptionStatus } from '@/types';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ContactWithName } from '@/types/contact';
import { CampaignsTable } from '@/components/organisms/_tables/CampaignsTable/CampaignsTable';
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
import { useGemini } from '@/hooks/useGemini';
import { GEMINI_FULL_AI_PROMPT, GEMINI_HYBRID_PROMPT } from '@/constants/ai';
import { Contact, Identity } from '@prisma/client';
import BottomHomeIcon from '@/components/atoms/_svg/BottomHomeIcon';
import BottomArrowIcon from '@/components/atoms/_svg/BottomArrowIcon';
import BottomFolderIcon from '@/components/atoms/_svg/BottomFolderIcon';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';

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
}

export const DraftingSection: FC<ExtendedDraftingSectionProps> = (props) => {
	const {
		view = 'testing',
		goToDrafting,
		goToAll,
		goToWriting,
		onOpenIdentityDialog,
		onGoToSearch,
		goToInbox,
		goToContacts,
		goToSent,
		goToPreviousTab,
		goToNextTab,
		hideHeaderBox,
	} = props;
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
	} = useDraftingSection(props);

	const { user, subscriptionTier, isFreeTrial } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

	const router = useRouter();
	const isMobile = useIsMobile();
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const isDraftPreviewOpen = view === 'drafting' && Boolean(selectedDraft);

	// Bottom hover box state
	const [showBottomBox, setShowBottomBox] = useState(false);
	const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [showCampaignsTable, setShowCampaignsTable] = useState(false);

	// All tab hover states
	const [isContactsHovered, setIsContactsHovered] = useState(false);
	const [isWritingHovered, setIsWritingHovered] = useState(false);
	const [isDraftsHovered, setIsDraftsHovered] = useState(false);
	const [isSentHovered, setIsSentHovered] = useState(false);
	const [isInboxHovered, setIsInboxHovered] = useState(false);

	// Narrow desktop detection for Writing tab compact layout (952px - 1279px)
	const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
	// Narrowest desktop detection (< 952px) - shows contacts table below writing box
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Search tab narrow detection (< 1414px) - reduces map box width
	const [isSearchTabNarrow, setIsSearchTabNarrow] = useState(false);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const checkBreakpoints = () => {
			const width = window.innerWidth;
			setIsNarrowDesktop(width >= 952 && width < 1280);
			setIsNarrowestDesktop(width < 952);
			setIsSearchTabNarrow(width < 1414);
		};
		checkBreakpoints();
		window.addEventListener('resize', checkBreakpoints);
		return () => window.removeEventListener('resize', checkBreakpoints);
	}, []);
	const handleGoToDashboard = useCallback(() => {
		router.push('/murmur/dashboard');
	}, [router]);

	const handleGoToAll = useCallback(() => {
		if (goToAll) {
			goToAll();
			return;
		}
		if (campaign?.id) {
			router.push(`/murmur/campaign/${campaign.id}?tab=all`);
			return;
		}
		router.push('/murmur/campaign');
	}, [campaign?.id, goToAll, router]);

	const handleToggleCampaignsTable = useCallback(() => {
		setShowCampaignsTable((prev) => !prev);
	}, []);
	const bottomBarIcons = useMemo(
		() => [
			{ key: 'home', element: <BottomHomeIcon aria-label="Home icon" />, onClick: handleGoToDashboard },
			{ key: 'arrow', element: <BottomArrowIcon aria-label="Arrow icon" />, onClick: handleGoToAll },
			{ key: 'folder', element: <BottomFolderIcon aria-label="Folder icon" />, onClick: handleToggleCampaignsTable },
		],
		[handleGoToAll, handleGoToDashboard, handleToggleCampaignsTable]
	);

	// Hide campaigns table whenever the footer is not visible
	useEffect(() => {
		if (!showBottomBox && showCampaignsTable) {
			setShowCampaignsTable(false);
		}
	}, [showBottomBox, showCampaignsTable]);

	const handleBottomHoverEnter = () => {
		if (showBottomBox || hoverTimerRef.current) return;
		hoverTimerRef.current = setTimeout(() => {
			setShowBottomBox(true);
			hoverTimerRef.current = null;
		}, 2000);
	};

	const handleBottomHoverLeave = () => {
		if (hoverTimerRef.current) {
			clearTimeout(hoverTimerRef.current);
			hoverTimerRef.current = null;
		}
		setShowBottomBox(false);
	};

	useEffect(() => {
		return () => {
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
		};
	}, []);

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

	// Gemini hook for regenerating drafts
	const { mutateAsync: callGemini } = useGemini({ suppressToasts: true });

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
				let geminiResponse: string;

				if (draftingMode === DraftingMode.ai) {
					// Full AI mode - use the full_automated block prompt
					const fullAutomatedBlock = values.hybridBlockPrompts?.find(
						(block: HybridBlockPrompt) => block.type === 'full_automated'
					);
					const fullAiPrompt =
						(fullAutomatedBlock?.value?.trim() ??
							values.fullAiPrompt?.trim() ??
							campaign.fullAiPrompt?.trim() ??
							'') || 'Generate an outreach email.';

					const populatedSystemPrompt = GEMINI_FULL_AI_PROMPT.replace(
						'{recipient_first_name}',
						contact.firstName || ''
					).replace('{company}', contact.company || '');

					const userPrompt = `Sender information\n: ${stringifyJsonSubset<Identity>(
						campaign.identity,
						['name', 'website']
					)}\n\nRecipient information: ${stringifyJsonSubset<Contact>(contact as Contact, [
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
					])}\n\nUser Goal: ${fullAiPrompt}`;

					geminiResponse = await callGemini({
						model: 'gemini-3-pro-preview',
						prompt: populatedSystemPrompt,
						content: userPrompt,
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

					const stringifiedSender = stringifyJsonSubset<Identity>(campaign.identity, [
						'name',
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

					geminiResponse = await callGemini({
						model: 'gemini-3-pro-preview',
						prompt: GEMINI_HYBRID_PROMPT,
						content: geminiPrompt,
					});
				} else {
					// Handwritten mode - no AI regeneration
					toast.error('Regeneration is not available in handwritten mode');
					return null;
				}

				// Parse the Gemini response
				let parsed: { subject: string; message: string };
				try {
					let cleanedResponse = geminiResponse;
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
					const subjectMatch = geminiResponse.match(/subject["']?\s*:\s*["']([^"']+)["']/i);
					const messageMatch = geminiResponse.match(/message["']?\s*:\s*["']([\s\S]*?)["']\s*[,}]/i);
					
					parsed = {
						subject: subjectMatch?.[1] || draft.subject || 'Re: Your inquiry',
						message: messageMatch?.[1] || geminiResponse,
					};
				}

				const cleanedSubject = removeEmDashes(parsed.subject);
				const cleanedMessageText = removeEmDashes(parsed.message);

				const signatureText = values.signature || `Thank you,\n${campaign.identity?.name || ''}`;
				const font = values.font || 'Arial';

				const richTextMessage = convertAiResponseToRichTextEmail(
					cleanedMessageText,
					font,
					signatureText
				);

				await updateEmail({
					id: draft.id.toString(),
					data: {
						subject: cleanedSubject,
						message: richTextMessage,
					},
				});

				queryClient.invalidateQueries({ queryKey: ['emails'] });

				toast.success('Draft regenerated successfully');
				const messageWithSignature = `${cleanedMessageText}\n\n${signatureText}`;
				return { subject: cleanedSubject, message: messageWithSignature };
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
			? Math.max(60, Math.min(100, Math.round(promptQualityScore)))
			: null;

	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	const suggestionText1 = promptSuggestions?.[0] || '';
	const suggestionText2 = promptSuggestions?.[1] || '';
	const suggestionText3 = promptSuggestions?.[2] || '';

	// Track if the HybridPromptInput is focused to show/hide suggestions box
	const [isPromptInputFocused, setIsPromptInputFocused] = useState(false);
	const suggestionBoxRef = useRef<HTMLDivElement>(null);
	
	const handlePromptInputFocusChange = useCallback((isFocused: boolean) => {
		if (isFocused) {
			setIsPromptInputFocused(true);
		} else {
			setTimeout(() => {
				const activeElement = document.activeElement;
				if (suggestionBoxRef.current?.contains(activeElement)) {
					return;
				}
				setIsPromptInputFocused(false);
			}, 50);
		}
	}, []);

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
					(clampedPromptScore >= 90
						? 'Excellent'
						: clampedPromptScore >= 80
						? 'Great'
						: clampedPromptScore >= 70
						? 'Good'
						: 'Fair')
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

	// Search tab type and state
	type SearchTab = {
		id: string;
		label: string;
		query: string;
		selectedContacts: number[];
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
			limit: 50,
		},
		enabled:
			hasCampaignSearched &&
			!!activeCampaignSearchQuery &&
			activeCampaignSearchQuery.trim().length > 0,
	});

	const isSearching = isLoadingSearchResults || isRefetchingSearchResults;

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
				tabs.map((tab) => (tab.id === activeSearchTabId ? { ...tab, label, query } : tab))
			);
		} else {
			// Create a new tab
			const newTab: SearchTab = {
				id: `search-${Date.now()}`,
				label,
				query,
				selectedContacts: [],
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
		// Sync the Search tab's mini searchbar state so the UI reflects the query
		if (why) {
			setSearchWhyValue(why);
		}
		setSearchWhatValue(what);
		setSearchWhereValue(where);

		const parts: string[] = [];
		if (what) parts.push(what);
		if (where) parts.push(where);
		const query = parts.join(' ');

		if (!query.trim()) {
			toast.error('Please enter what you want to search for');
			return;
		}

		// Build a label for the tab
		const labelParts: string[] = [];
		if (where) {
			const stateAbbrev =
				where.length === 2 ? where.toUpperCase() : where.split(',')[0]?.trim() || where;
			labelParts.push(stateAbbrev);
		}
		if (what) {
			labelParts.push(what);
		}
		const label = labelParts.join(' - ') || query;

		// Create a new search tab
		const newTab: SearchTab = {
			id: `search-${Date.now()}`,
			label,
			query,
			selectedContacts: [],
		};

		setSearchTabs((tabs) => [...tabs, newTab]);
		setActiveSearchTabId(newTab.id);
		setSearchActiveSection(null);

		// Ask the parent page to switch to the Search tab, if supported
		if (onGoToSearch) {
			onGoToSearch();
		}
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

	const displayedContactForResearch =
		hoveredContactForResearch || selectedContactForResearch;

	useEffect(() => {
		if (!selectedContactForResearch && contacts && contacts.length > 0) {
			setSelectedContactForResearch(contacts[0]);
		}
	}, [contacts, selectedContactForResearch]);

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
		const dropdownContent = (
			<>
				{searchActiveSection === 'why' && (
					<div
						className="campaign-search-dropdown-menu flex flex-col items-center justify-center gap-[12px] w-[439px] h-[173px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[120]"
						style={{ position: 'absolute', top: '75px', left: 'calc(50% - 220px)' }}
					>
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
				)}
				{searchActiveSection === 'what' && searchWhyValue === '[Promotion]' && (
					<div
						className="campaign-search-dropdown-menu flex flex-col items-center justify-center gap-[10px] w-[439px] h-[92px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[120]"
						style={{ position: 'absolute', top: '75px', left: 'calc(50% - 120px)' }}
					>
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
				)}
				{searchActiveSection === 'what' && searchWhyValue !== '[Promotion]' && (
					<div
						id="campaign-what-dropdown-container"
						className="campaign-search-dropdown-menu w-[439px] h-[404px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[120]"
						style={{ position: 'absolute', top: '75px', left: 'calc(50% - 120px)' }}
					>
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
									setSearchWhatValue('Wedding Planners');
									setSearchActiveSection('where');
								}}
							>
								<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<WeddingPlannersIcon />
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
						</CustomScrollbar>
					</div>
				)}
				{searchActiveSection === 'where' && (
					<div
						id="campaign-where-dropdown-container"
						className="campaign-search-dropdown-menu w-[439px] h-[370px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[120]"
						style={{
							position: 'absolute',
							top: '75px',
							left: 'calc(50% - 120px)',
							overflow: 'visible',
						}}
					>
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
				)}
			</>
		);

		// Render dropdowns directly (not via portal) so they scroll with the page
		return dropdownContent;
	};

	return (
		<div className="mb-30 flex flex-col items-center">
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
						{!isMobile &&
							!hideHeaderBox &&
							['testing', 'contacts', 'drafting', 'sent', 'search', 'inbox'].includes(
								view
							) &&
							!(view === 'testing' && isNarrowDesktop) &&
							!(view === 'contacts' && isNarrowDesktop) &&
							!(view === 'drafting' && isNarrowDesktop) &&
							!(view === 'search' && isSearchTabNarrow) && (
								<div
									className="absolute hidden lg:flex flex-col"
									style={{
										right:
											view === 'search'
												? isSearchTabNarrow
													? 'calc(50% + 249px + 37px)' // 37px left of narrow map box (498px / 2 = 249px)
													: 'calc(50% + 384px + 32px)'
												: view === 'inbox'
												? 'calc(50% + 471.5px)'
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
									/>
									{view === 'testing' || view === 'search' ? (
										<>
											{/* Regular full-size layout for wider viewports */}
											<div
												style={{
													width: '375px',
													height: '557px',
													overflow: 'visible',
												}}
											>
												{/* Show research panel instead of contacts list when search tab is narrow */}
												{view === 'search' && isSearchTabNarrow ? (
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={contactsAvailableForDrafting.length === 0}
													/>
												) : (
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
														width={375}
														height={557}
														minRows={8}
														onSearchFromMiniBar={handleMiniContactsSearch}
													/>
												)}
											</div>
											{view === 'testing' && isPromptInputFocused && (suggestionText1 || suggestionText2) && (
												<div
													ref={suggestionBoxRef}
													tabIndex={-1}
													onBlur={(e) => {
														// Check if focus is moving outside the suggestion box and prompt input
														const relatedTarget = e.relatedTarget as HTMLElement | null;
														const promptInputContainer = document.querySelector('[data-hpi-container]');
														if (
															!suggestionBoxRef.current?.contains(relatedTarget) &&
															!promptInputContainer?.contains(relatedTarget)
														) {
															setIsPromptInputFocused(false);
														}
													}}
													style={{
														width: '405px',
														height: '319px',
														position: 'absolute',
														top: '115px',
														left: '-15px',
														zIndex: 10,
														background:
															'linear-gradient(to bottom, #FFFFFF 28px, #D6EFD7 28px)',
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
															top: '34px',
															left: '50%',
															transform: 'translateX(-50%)',
															width: '369px',
															height: '44px',
															backgroundColor: '#FFFFFF',
															border: '2px solid #000000',
															borderRadius: '7px',
														}}
													>
														{/* Score label */}
														<div
															style={{
																position: 'absolute',
																top: '6px',
																left: '10px',
																fontFamily: 'Inter, system-ui, sans-serif',
																fontWeight: 700,
																fontSize: '12px',
																lineHeight: '14px',
																color: '#000000',
															}}
														>
															{promptScoreDisplayLabel}
														</div>
														{/* Small box inside (progress track) */}
														<div
															style={{
																position: 'absolute',
																bottom: '3px',
																left: '4px',
																width: '223px',
																height: '12px',
																backgroundColor: '#FFFFFF',
																border: '2px solid #000000',
																borderRadius: '8px',
																overflow: 'hidden',
															}}
														>
															<div
																style={{
																	position: 'absolute',
																	top: 0,
																	bottom: 0,
																	left: 0,
																	borderRadius: '999px',
																	backgroundColor: '#36B24A',
																	width: `${promptScoreFillPercent}%`,
																	maxWidth: '100%',
																	transition: 'width 250ms ease-out',
																}}
															/>
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
															top: '83px',
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
															opacity: hasPreviousPrompt ? 1 : 0.5,
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
															top: '83px',
															left: '66px',
															width: '196px',
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
															{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Prompt'}
														</span>
														<div style={{ flexShrink: 0 }}>
															<UpscaleIcon width="24" height="24" />
														</div>
													</div>
													{/* Box below the two small boxes */}
													<div
														style={{
															position: 'absolute',
															top: '123px', // 83px + 32px + 8px
															left: '50%',
															transform: 'translateX(-50%)',
															width: '362px',
															height: '56px',
															backgroundColor: '#A6E0B4',
															border: '2px solid #000000',
															borderRadius: '8px',
														}}
													>
														{/* Section indicator */}
														<div
															className="absolute font-inter font-bold"
															style={{
																top: '4.5px',
																left: '8px',
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
															top: '187px', // 123px + 56px + 8px
															left: '50%',
															transform: 'translateX(-50%)',
															width: '362px',
															height: '56px',
															backgroundColor: '#5BCB75',
															border: '2px solid #000000',
															borderRadius: '8px',
														}}
													>
														{/* Section indicator */}
														<div
															className="absolute font-inter font-bold"
															style={{
																top: '4.5px',
																left: '8px',
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
															top: '251px', // 187px + 56px + 8px
															left: '50%',
															transform: 'translateX(-50%)',
															width: '362px',
															height: '56px',
															backgroundColor: '#359D4D',
															border: '2px solid #000000',
															borderRadius: '8px',
														}}
													>
														{/* Section indicator */}
														<div
															className="absolute font-inter font-bold"
															style={{
																top: '4.5px',
																left: '8px',
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
										</>
									) : view !== 'inbox' ? (
										isDraftPreviewOpen ? (
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
										) : (
											<div
												style={{
													width: '375px',
													height: '373px',
													// Fixed-height mini structure that uses the compact layout
													// inside; no scaling, just a tighter signature area.
													overflow: 'visible',
												}}
											>
												<MiniEmailStructure
													form={form}
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
										)
									) : null}
								</div>
							)}

						{/* Shared Research / Test Preview panel to the right of the drafting tables / writing view */}
						{!isMobile &&
							['testing', 'contacts', 'drafting', 'sent', 'search', 'inbox'].includes(view) &&
							!(view === 'search' && hasCampaignSearched) &&
							!(view === 'search' && isSearchTabNarrow) && (
								<div
									className="absolute hidden xl:block"
									style={{
										top: '29px',
										left:
											view === 'search'
												? 'calc(50% + 384px + 32px)'
												: view === 'inbox'
												? 'calc(50% + 453.5px + 32px)'
												: 'calc(50% + 250px + 32px)',
									}}
								>
									{view === 'testing' && showTestPreview ? (
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
							searchResults &&
							searchResults.length > 0 && (
								<div
									className="absolute hidden xl:block"
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
													{searchResultsSelectedContacts.length} selected
												</span>
												<button
													type="button"
													onClick={() => {
														if (
															searchResultsSelectedContacts.length ===
															searchResults.length
														) {
															setSearchResultsSelectedContacts([]);
														} else {
															setSearchResultsSelectedContacts(
																searchResults.map((c) => c.id)
															);
														}
													}}
													className="font-secondary text-[11px] font-medium text-black hover:underline text-right pr-1"
												>
													{searchResultsSelectedContacts.length === searchResults.length
														? 'Deselect all'
														: 'Select all'}
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
												{searchResults.map((contact) => {
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
																			<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																				<span className="text-[10px] text-black leading-none truncate">
																					{headline}
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
																			<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																				<span className="text-[10px] text-black leading-none truncate">
																					{headline}
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
															if (
																searchResultsSelectedContacts.length !==
																searchResults.length
															) {
																setSearchResultsSelectedContacts(
																	searchResults.map((c) => c.id)
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
													onFocusChange={handlePromptInputFocusChange}
													hideDraftButton={true}
												/>
											</div>
										</div>
										{/* Draft button with arrows - spans full width below both columns */}
										{!isPendingGeneration && (
											<div className="flex items-center justify-center gap-[29px] mt-[10px] w-full">
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
											onFocusChange={handlePromptInputFocusChange}
											isNarrowestDesktop={isNarrowestDesktop}
											hideDraftButton={isNarrowestDesktop}
										/>
										{/* Draft button with arrows at narrowest breakpoint */}
										{isNarrowestDesktop && !isPendingGeneration && (
											<div className="flex items-center justify-center gap-[20px] mt-[10px] w-full">
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
									<div className="mt-[35px] flex justify-center gap-[15px]">
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
								<div className="w-full min-h-[300px]">
									{isNarrowDesktop ? (
										// Narrow desktop (952px - 1279px): center BOTH the left panel and drafts table together
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
														width={330}
													/>
													{/* Mini Email Structure panel */}
													<div style={{ width: '330px' }}>
														<MiniEmailStructure
															form={form}
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
															height={316}
															onOpenWriting={goToWriting}
														/>
													</div>
													{/* Research panel - height set so bottom aligns with drafts table (71 + 10 + 316 + 10 + 321 = 728 = 25 margin + 703 table) */}
													<ContactResearchPanel
														contact={displayedContactForResearch}
														hideAllText={draftCount === 0}
														hideSummaryIfBullets={true}
														height={321}
														width={330}
														boxWidth={315}
														compactHeader
														style={{ display: 'block' }}
													/>
												</div>
												{/* Right column: Drafts table - fixed 499px, overflow visible for bottom panels */}
												<div className="flex-shrink-0 [&>*]:!items-start" style={{ width: '499px', overflow: 'visible' }}>
													<DraftedEmails
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
														subject={form.watch('subject')}
														onContactClick={handleResearchContactClick}
														onContactHover={handleResearchContactHover}
														goToWriting={goToWriting}
														goToSearch={onGoToSearch}
														goToInbox={goToInbox}
														onRejectDraft={handleRejectDraft}
														onApproveDraft={handleApproveDraft}
														onRegenerateDraft={handleRegenerateDraft}
														rejectedDraftIds={rejectedDraftIds}
														approvedDraftIds={approvedDraftIds}
														statusFilter={draftStatusFilter}
														onStatusFilterChange={setDraftStatusFilter}
														hideSendButton
													/>
												</div>
											</div>
											{/* Send Button with arrows - centered relative to full container width */}
											{draftEmails.length > 0 && (
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
												<div className="mt-[35px] flex justify-center gap-[15px]">
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
												subject={form.watch('subject')}
												onContactClick={handleResearchContactClick}
												onContactHover={handleResearchContactHover}
												goToWriting={goToWriting}
												goToSearch={onGoToSearch}
												goToInbox={goToInbox}
												onRejectDraft={handleRejectDraft}
												onApproveDraft={handleApproveDraft}
												onRegenerateDraft={handleRegenerateDraft}
												rejectedDraftIds={rejectedDraftIds}
												approvedDraftIds={approvedDraftIds}
												statusFilter={draftStatusFilter}
												onStatusFilterChange={setDraftStatusFilter}
											/>

											{/* Bottom Panels: Contacts, Sent, and Inbox - hidden at narrowest breakpoint */}
											{!isNarrowestDesktop && (
												<div className="mt-[35px] flex justify-center gap-[15px]">
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
							<div className="w-full min-h-[300px]">
								{isNarrowDesktop ? (
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
													width={330}
												/>
												{/* Mini Email Structure panel */}
												<div style={{ width: '330px' }}>
													<MiniEmailStructure
														form={form}
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
														height={316}
														onOpenWriting={goToWriting}
													/>
												</div>
												{/* Research panel - height set so bottom aligns with contacts table (703px) */}
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
											</div>
											{/* Right column: Contacts table - fixed 499px, overflow visible for bottom panels */}
											<div className="flex-shrink-0 [&>*]:!items-start" style={{ width: '499px', overflow: 'visible' }}>
												<ContactsSelection
													contacts={contactsAvailableForDrafting}
													allContacts={contacts}
													selectedContactIds={contactsTabSelectedIds}
													setSelectedContactIds={setContactsTabSelectedIds}
													handleContactSelection={handleContactsTabSelection}
													campaign={campaign}
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
										<div className="mt-[35px] flex justify-center gap-[15px]">
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
											contacts={contactsAvailableForDrafting}
											allContacts={contacts}
											selectedContactIds={contactsTabSelectedIds}
											setSelectedContactIds={setContactsTabSelectedIds}
											handleContactSelection={handleContactsTabSelection}
											campaign={campaign}
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
											</div>
										)}
										{/* Writing box below research panel at narrowest breakpoint */}
										{isNarrowestDesktop && (
											<div className="mt-[20px] w-full flex justify-center">
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
													isNarrowestDesktop={isNarrowestDesktop}
													hideDraftButton
												/>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Sent tab - show the sent emails table */}
						{view === 'sent' && (
							<div className="flex flex-col items-center min-h-[300px]">
								<SentEmails
									emails={sentEmails}
									isPendingEmails={isPendingEmails}
									onContactClick={handleResearchContactClick}
									onContactHover={handleResearchContactHover}
									goToDrafts={goToDrafting}
									goToWriting={goToWriting}
									goToSearch={onGoToSearch}
								/>

								{/* Bottom Panels: Contacts, Drafts, and Inbox */}
								<div className="mt-[35px] flex justify-center gap-[15px]">
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
											/>
											<div
												style={{
													width: '375px',
													height: '557px',
													overflow: 'visible',
												}}
											>
												{/* Show search results table when search has been performed, otherwise show research panel */}
												{hasCampaignSearched && !isSearching && searchResults && searchResults.length > 0 ? (
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
																		{searchResultsSelectedContacts.length} selected
																	</span>
																	<button
																		type="button"
																		onClick={() => {
																			if (
																				searchResultsSelectedContacts.length ===
																				searchResults.length
																			) {
																				setSearchResultsSelectedContacts([]);
																			} else {
																				setSearchResultsSelectedContacts(
																					searchResults.map((c) => c.id)
																				);
																			}
																		}}
																		className="font-secondary text-[11px] font-medium text-black hover:underline"
																	>
																		{searchResultsSelectedContacts.length === searchResults.length
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
																{searchResults.map((contact) => {
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
																							<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																								<span className="text-[10px] text-black leading-none truncate">
																									{headline}
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
																							<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																								<span className="text-[10px] text-black leading-none truncate">
																									{headline}
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
																			if (
																				searchResultsSelectedContacts.length !==
																				searchResults.length
																			) {
																				setSearchResultsSelectedContacts(
																					searchResults.map((c) => c.id)
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
													selectedContacts: [],
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
													{/* Why pill (Booking/Promotion) */}
													<div
														className={`campaign-mini-search-section-why flex-1 flex items-center justify-start border-r border-transparent ${
															!searchActiveSection ? 'group-hover:border-black/10' : ''
														} h-full min-w-0 relative pl-[16px] pr-1 cursor-pointer`}
														onClick={() => setSearchActiveSection('why')}
													>
														{searchActiveSection === 'why' && (
															<div
																className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
																style={{
																	width: 'calc(100% + 2px)',
																	height: 'calc(100% + 2px)',
																}}
															/>
														)}
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
														{searchActiveSection === 'what' && (
															<div
																className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
																style={{
																	width: 'calc(100% + 2px)',
																	height: 'calc(100% + 2px)',
																}}
															/>
														)}
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
														{searchActiveSection === 'where' && (
															<div
																className="absolute -left-[1px] -top-[1px] border border-black bg-white rounded-[6px] z-0"
																style={{
																	width: 'calc(100% + 2px)',
																	height: 'calc(100% + 2px)',
																}}
															/>
														)}
														<input
															ref={whereInputRef}
															value={searchWhereValue}
															onChange={(e) => setSearchWhereValue(e.target.value)}
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
												}}
												enableStateInteractions
												onStateSelect={(stateName) => {
													setSearchActiveSection('why');
													setSearchWhereValue(stateName);
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
											if (
												searchResults &&
												searchResultsSelectedContacts.length !==
												searchResults.length
											) {
												setSearchResultsSelectedContacts(
													searchResults.map((c) => c.id)
												);
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
									{hasCampaignSearched && !isSearching && searchResults && searchResults.length > 0 ? (
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
															{searchResultsSelectedContacts.length} selected
														</span>
														<button
															type="button"
															onClick={() => {
																if (
																	searchResultsSelectedContacts.length ===
																	searchResults.length
																) {
																	setSearchResultsSelectedContacts([]);
																} else {
																	setSearchResultsSelectedContacts(
																		searchResults.map((c) => c.id)
																	);
																}
															}}
															className="font-secondary text-[11px] font-medium text-black hover:underline"
														>
															{searchResultsSelectedContacts.length === searchResults.length
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
													{searchResults.map((contact) => {
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
																				<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																					<span className="text-[10px] text-black leading-none truncate">
																						{headline}
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
																				<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full bg-[#E8EFFF] border border-black overflow-hidden">
																					<span className="text-[10px] text-black leading-none truncate">
																						{headline}
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
								<InboxSection
									allowedSenderEmails={campaignContactEmails}
									contactByEmail={campaignContactsByEmail}
									campaignId={campaign.id}
									onGoToDrafting={goToDrafting}
									onGoToWriting={goToWriting}
									onGoToContacts={goToContacts}
									onContactSelect={(contact) => {
										if (contact) {
											setSelectedContactForResearch(contact);
										}
									}}
									onContactHover={(contact) => {
										setHoveredContactForResearch(contact);
									}}
								/>

								{/* Bottom Panels: Contacts, Drafts, and Sent */}
								<div className="mt-[35px] flex justify-center gap-[15px]">
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
						)}

						{/* All tab */}
						{view === 'all' && (
							<div className="mt-6 flex justify-center">
								<div className="flex flex-row items-start" style={{ gap: '30px' }}>
									{/* Left column: Campaign Header + Contacts + Research */}
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
										{/* Research Panel */}
										<ContactResearchPanel
											contact={displayedContactForResearch}
											hideAllText={contactsAvailableForDrafting.length === 0}
											hideSummaryIfBullets={true}
											height={347}
											width={330}
											boxWidth={315}
											compactHeader
										/>
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
													form={form}
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
													height={349}
													onOpenWriting={goToWriting}
												/>
											</div>
										</div>
										{/* Row 2: Suggestion Box */}
										<div
											style={{
												width: '330px',
												height: '347px',
												background:
													'linear-gradient(to bottom, #FFFFFF 28px, #D6EFD7 28px)',
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
													top: '34px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '322px',
													height: '44px',
													backgroundColor: '#FFFFFF',
													border: '2px solid #000000',
													borderRadius: '7px',
												}}
											>
												{/* Score label */}
												<div
													style={{
														position: 'absolute',
														top: '6px',
														left: '10px',
														fontFamily: 'Inter, system-ui, sans-serif',
														fontWeight: 700,
														fontSize: '12px',
														lineHeight: '14px',
														color: '#000000',
													}}
												>
													{promptScoreDisplayLabel}
												</div>
												{/* Small box inside (progress track) */}
												<div
													style={{
														position: 'absolute',
														bottom: '3px',
														left: '4px',
														width: '223px',
														height: '12px',
														backgroundColor: '#FFFFFF',
														border: '2px solid #000000',
														borderRadius: '8px',
														overflow: 'hidden',
													}}
												>
													<div
														style={{
															position: 'absolute',
															top: 0,
															bottom: 0,
															left: 0,
															borderRadius: '999px',
															backgroundColor: '#36B24A',
															width: `${promptScoreFillPercent}%`,
															maxWidth: '100%',
															transition: 'width 250ms ease-out',
														}}
													/>
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
													top: '83px',
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
													opacity: hasPreviousPrompt ? 1 : 0.5,
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
													top: '83px',
													left: '50px',
													width: '155px',
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
															{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Prompt'}
														</span>
														<div style={{ flexShrink: 0 }}>
															<UpscaleIcon width="20" height="20" />
														</div>
													</>
												)}
											</div>
											{/* Suggestion 1 */}
											<div
												style={{
													position: 'absolute',
													top: '123px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#A6E0B4',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
												<div
													className="absolute font-inter font-bold"
													style={{
														top: '4.5px',
														left: '8px',
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
														backgroundColor: clampedPromptScore == null ? '#A6E0B4' : '#FFFFFF',
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
													top: '187px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#5BCB75',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
												<div
													className="absolute font-inter font-bold"
													style={{
														top: '4.5px',
														left: '8px',
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
														backgroundColor: clampedPromptScore == null ? '#5BCB75' : '#FFFFFF',
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
													top: '251px',
													left: '50%',
													transform: 'translateX(-50%)',
													width: '315px',
													height: '46px',
													backgroundColor: '#359D4D',
													border: '2px solid #000000',
													borderRadius: '8px',
													overflow: 'hidden',
												}}
											>
												<div
													className="absolute font-inter font-bold"
													style={{
														top: '4.5px',
														left: '8px',
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
														backgroundColor: clampedPromptScore == null ? '#359D4D' : '#FFFFFF',
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
									</div>

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
								</div>
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

					{/* Hover area below expanded lists to reveal bottom box */}
					<div className="relative w-screen max-w-none mt-10 pb-10" aria-hidden="true" />
				</form>
			</Form>

			{/* Fixed hover zone at the bottom of the viewport - expands when campaigns table is visible */}
			<div
				className={`fixed inset-x-0 bottom-0 z-50 pointer-events-none ${showCampaignsTable ? 'h-[320px]' : 'h-[200px]'}`}
				onMouseLeave={handleBottomHoverLeave}
			>
				{/* Thin hover trigger at the very bottom - only active when bottom box is hidden */}
				{!showBottomBox && (
					<div 
						className="absolute inset-x-0 bottom-0 h-[40px] pointer-events-auto" 
						onMouseEnter={handleBottomHoverEnter}
					/>
				)}
				
				{/* Full capture area - only active when bottom box is shown to keep it open */}
				{showBottomBox && (
					<div 
						className="absolute inset-0 pointer-events-auto" 
						onMouseEnter={handleBottomHoverEnter}
					/>
				)}

				{/* Campaigns table - positioned inside hover zone */}
				{showBottomBox && showCampaignsTable && (
					<div className="absolute left-1/2 -translate-x-1/2 bottom-[40px] z-[60] pointer-events-auto">
						<div className="campaigns-popup-wrapper bg-[#EDEDED] rounded-[12px] overflow-hidden w-[891px] h-[242px] border-2 border-[#8C8C8C]">
							<CampaignsTable />
						</div>
					</div>
				)}

				{/* Revealed bar lives inside the hover zone so moving into it won't dismiss */}
				{showBottomBox && (
					<div
						className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center text-black font-inter text-[14px] font-medium pointer-events-auto"
						style={{
							width: '816px',
							height: '34px',
							bottom: 0,
							backgroundColor: '#F5F5F5',
							border: '2px solid #000000',
							borderRadius: '0px',
						}}
						aria-label="Bottom navigation reveal"
					>
						<div className="flex items-center justify-center gap-0">
							{bottomBarIcons.map((icon) => (
								<button
									key={icon.key}
									type="button"
									className="flex items-center justify-center border-0 p-0 cursor-pointer transition-colors"
									style={{
										width: '65px',
										height: '30px',
										backgroundColor: 'transparent',
									}}
									onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D9D9D9')}
									onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
									onClick={icon.onClick}
									aria-label={icon.element.props['aria-label'] || icon.key}
								>
									{icon.element}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

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
