import { FC, Fragment, useEffect, useState, useRef } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Form } from '@/components/ui/form';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
// EmailGeneration kept available but not used in current view
// import { EmailGeneration } from './EmailGeneration/EmailGeneration';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import DraftingStatusPanel from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/DraftingStatusPanel';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useGetContacts, useGetLocations } from '@/hooks/queryHooks/useContacts';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus, EmailVerificationStatus } from '@/constants/prismaEnums';
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
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { TestPreviewPanel } from '@/components/molecules/TestPreviewPanel/TestPreviewPanel';
import { MiniEmailStructure } from './EmailGeneration/MiniEmailStructure';
import ContactsExpandedList from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
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
		goToWriting,
		onOpenIdentityDialog,
		onGoToSearch,
		goToContacts,
		goToInbox,
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

	const isMobile = useIsMobile();

	const clampedPromptScore =
		typeof promptQualityScore === 'number'
			? Math.max(60, Math.min(100, Math.round(promptQualityScore)))
			: null;

	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	const suggestionText1 = promptSuggestions?.[0] || '';
	const suggestionText2 = promptSuggestions?.[1] || '';

	const promptScoreDisplayLabel =
		clampedPromptScore == null
			? 'Prompt score pending'
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

	// State for contacts selection in the Contacts tab
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

	// State for search tab map selection
	const [searchTabSelectedContacts, setSearchTabSelectedContacts] = useState<number[]>(
		[]
	);

	// State for mini searchbar dropdowns
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

	// Debounce and location search for mini searchbar
	const debouncedWhereValue = useDebounce(searchWhereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state-first'
	);
	const isPromotion = searchWhyValue === '[Promotion]';

	// Initialize searchWhereValue from first contact's state
	useEffect(() => {
		if (contacts?.[0]?.state && !searchWhereValue) {
			setSearchWhereValue(contacts[0].state);
		}
	}, [contacts, searchWhereValue]);

	// Update searchWhatValue when campaign name changes
	useEffect(() => {
		if (campaign?.name) {
			setSearchWhatValue(campaign.name);
		}
	}, [campaign?.name]);

	// Handle clicks outside to close search dropdowns
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

	// Focus input when section becomes active
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

		// Get the first user contact list ID from the campaign
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

	// Handler for closing a search tab
	const handleCloseSearchTab = (tabId: string) => {
		setSearchTabs((tabs) => tabs.filter((tab) => tab.id !== tabId));
		// If we're closing the active tab, switch to Original
		if (activeSearchTabId === tabId) {
			setActiveSearchTabId(null);
		}
	};

	// State for drafts selection in the Drafts tab
	const [draftsTabSelectedIds, setDraftsTabSelectedIds] = useState<Set<number>>(
		new Set()
	);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
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

	// Get contact and email counts for the header box
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

	// Contacts that are still eligible for drafting in this campaign:
	// hide any contact that already has a draft email for this campaign.
	const draftedContactIds = new Set(draftEmails.map((e) => e.contactId));
	const contactsAvailableForDrafting = (contacts || []).filter(
		(contact) => !draftedContactIds.has(contact.id)
	);

	const isSendingDisabled = isFreeTrial || (user?.sendingCredits || 0) === 0;

	// Selected contact for shared research panel (persistent on click)
	const [selectedContactForResearch, setSelectedContactForResearch] =
		useState<ContactWithName | null>(null);
	// Hovered contact for temporary preview
	const [hoveredContactForResearch, setHoveredContactForResearch] =
		useState<ContactWithName | null>(null);
	// Track whether the user has explicitly selected a contact (via click)
	const [hasUserSelectedResearchContact, setHasUserSelectedResearchContact] =
		useState(false);
	// Whether to show the Test Preview panel in place of the Research panel (desktop only)
	const [showTestPreview, setShowTestPreview] = useState(false);

	// Display priority: hovered contact > selected contact
	const displayedContactForResearch =
		hoveredContactForResearch || selectedContactForResearch;

	// Default to the first contact in the campaign for the research panel
	useEffect(() => {
		if (!selectedContactForResearch && contacts && contacts.length > 0) {
			setSelectedContactForResearch(contacts[0]);
		}
	}, [contacts, selectedContactForResearch]);

	// Ensure selected IDs only reference contacts that are still available for drafting.
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

	// Handlers to coordinate hover / selection behavior for the research panel
	const handleResearchContactClick = (contact: ContactWithName | null) => {
		if (!contact) return;
		setSelectedContactForResearch(contact);
		setHasUserSelectedResearchContact(true);
	};

	const handleResearchContactHover = (contact: ContactWithName | null) => {
		if (contact) {
			// Always update the currently hovered contact
			setHoveredContactForResearch(contact);
			return;
		}

		// When hover ends (null), decide what to show:
		// - If the user has explicitly selected a contact, fall back to that selection
		//   by clearing the hover state.
		// - If not, keep showing the last hovered contact by leaving hover state as-is.
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

	// Sender email addresses for all contacts in this campaign.
	// Used to scope the in‑campaign inbox so it only shows replies
	// from contacts that belong to this campaign.
	const campaignContactEmails = contacts
		? contacts
				.map((contact) => contact.email)
				.filter((email): email is string => Boolean(email))
		: undefined;

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
						{!isMobile &&
							['testing', 'contacts', 'drafting', 'sent', 'search'].includes(view) && (
								<div
									className="absolute hidden lg:flex flex-col"
									style={{
										right:
											view === 'search'
												? 'calc(50% + 384px + 32px)'
												: 'calc(50% + 250px + 32px)',
										top: '29px',
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
									{/* For the Writing (testing) and Search tabs, show a mini contacts table instead of mini email structure. */}
									{view === 'testing' || view === 'search' ? (
										<>
											<div
												style={{
													width: '375px',
													height: view === 'search' ? '557px' : '274px',
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
													width={375}
													height={view === 'search' ? 557 : 274}
													minRows={view === 'search' ? 8 : 5}
													onSearchFromMiniBar={handleMiniContactsSearch}
												/>
											</div>
											{view === 'testing' && (suggestionText1 || suggestionText2) && (
												<div
													style={{
														width: '377px',
														height: '249px',
														marginTop: '-5px', // 16px gap - 5px = 11px
														background:
															'linear-gradient(to bottom, #FFFFFF 28px, #D6EFD7 28px)',
														border: '2px solid #000000',
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
															top: '83px', // 34px + 44px + 5px
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
															left: '50px', // 6px + 39px + 5px
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
												</div>
											)}
										</>
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
											/>
										</div>
									)}
								</div>
							)}

						{/* Shared Research / Test Preview panel to the right of the drafting tables / writing view */}
						{!isMobile &&
							['testing', 'contacts', 'drafting', 'sent', 'search'].includes(view) &&
							!(view === 'search' && hasCampaignSearched) && (
								<div
									className="absolute hidden xl:block"
									style={{
										top: '29px',
										left:
											view === 'search'
												? 'calc(50% + 384px + 32px)'
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
										/>
									)}
								</div>
							)}

						{/* Search Results Panel - replaces Research panel when search has been performed */}
						{!isMobile &&
							view === 'search' &&
							hasCampaignSearched &&
							!isSearching &&
							searchResults &&
							searchResults.length > 0 && (
								<div
									className="absolute hidden xl:block"
									style={{
										top: '29px',
										left: 'calc(50% + 384px + 32px)',
									}}
								>
									<div
										className="bg-[#D8E5FB] border-[2px] border-black rounded-[7px] overflow-hidden flex flex-col"
										style={{
											width: '375px',
											height: '815px',
										}}
									>
										{/* Header */}
										<div
											className="w-full flex-shrink-0 flex items-center justify-between px-4 relative"
											style={{
												height: '24px',
												backgroundColor: '#E8EFFF',
											}}
										>
											<span className="font-secondary font-bold text-[14px] leading-none text-black">
												Search Results
											</span>
											<div className="flex items-center gap-2">
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

										{/* Divider under header */}
										<div className="w-full h-[1px] bg-black flex-shrink-0" />

										{/* Scrollable contact list */}
										<CustomScrollbar
											className="flex-1 min-h-0"
											contentClassName="p-[6px] pb-[14px] space-y-[7px]"
											thumbWidth={2}
											thumbColor="#000000"
											trackColor="transparent"
											offsetRight={-6}
											disableOverflowClass
										>
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
												const stateAbbr = getStateAbbreviation(contact.state || '') || '';
												const city = contact.city || '';

												return (
													<div
														key={contact.id}
														data-contact-id={contact.id}
														className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-black select-none"
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
										</CustomScrollbar>

										{/* Footer with Add to Campaign button */}
										<div className="w-full h-[50px] flex-shrink-0 bg-[#E8EFFF] flex items-center justify-between px-3 border-t border-black">
											<button
												type="button"
												onClick={handleAddSearchResultsToCampaign}
												disabled={
													searchResultsSelectedContacts.length === 0 || isAddingToCampaign
												}
												className="flex-1 h-[36px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-[#143883] hover:bg-[#1a4a9e] rounded-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isAddingToCampaign ? (
													<>
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
														Adding...
													</>
												) : (
													<>+ Add to Campaign</>
												)}
											</button>
											<button
												type="button"
												onClick={() => {
													if (
														searchResultsSelectedContacts.length !== searchResults.length
													) {
														setSearchResultsSelectedContacts(
															searchResults.map((c) => c.id)
														);
													}
												}}
												className="ml-2 h-[36px] px-4 flex items-center justify-center text-[13px] font-semibold text-black bg-white hover:bg-gray-100 rounded-[6px] border-2 border-black transition-colors"
											>
												All
											</button>
										</div>
									</div>
								</div>
							)}

						{view === 'testing' && (
							<div className="relative">
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
								/>
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
							{view === 'drafting' && (
								<div className="flex items-center justify-center min-h-[300px]">
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
									/>
								</div>
							)}
						</div>

						{/* Contacts tab - show the contacts table */}
						{view === 'contacts' && (
							<div className="flex items-center justify-center min-h-[300px]">
								<ContactsSelection
									contacts={contactsAvailableForDrafting}
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
								/>
							</div>
						)}

						{/* Sent tab - show the sent emails table */}
						{view === 'sent' && (
							<div className="flex items-center justify-center min-h-[300px]">
								<SentEmails
									emails={sentEmails}
									isPendingEmails={isPendingEmails}
									onContactClick={handleResearchContactClick}
									onContactHover={handleResearchContactHover}
									goToDrafts={goToDrafting}
									goToWriting={goToWriting}
									goToContacts={goToContacts}
								/>
							</div>
						)}

						{/* Search tab - show the campaign contacts on a map */}
						{view === 'search' && (
							<div className="flex items-center justify-center min-h-[300px]">
								{/* Outer container box */}
								<div
									className="relative rounded-[12px] overflow-hidden"
									style={{
										width: '768px',
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
												width: '440px',
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
															className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary truncate placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
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
															className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary truncate placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
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
						)}

						{/* Inbox tab: reuse the dashboard inbox UI */}
						{(view === 'inbox' || view === 'all') && (
							<div className="mt-6 flex justify-center">
								<InboxSection allowedSenderEmails={campaignContactEmails} />
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
				</form>
			</Form>

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
