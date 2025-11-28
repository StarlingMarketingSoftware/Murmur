import { FC, useEffect, useState, useRef } from 'react';
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
import { useEditEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
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
import { getCityIconProps } from '@/utils/cityIcons';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

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
	const { view = 'testing', goToDrafting, onOpenIdentityDialog } = props;
	const {
		campaign,
		contacts,
		form,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
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
												? 'calc(50% + 384px + 37px)'
												: 'calc(50% + 250px + 24px)',
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
										<div
											style={{
												width: '373px',
												height: '373px',
												overflow: 'hidden',
											}}
										>
											<ContactsExpandedList
												contacts={contacts || []}
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
												width={373}
												height={373}
											/>
										</div>
									) : (
										<div
											style={{
												width: '373px',
												height: '373px',
												// Fixed-height mini structure that uses the compact layout
												// inside; no scaling, just a tighter signature area.
												overflow: 'hidden',
											}}
										>
											<MiniEmailStructure
												form={form}
												onDraft={() =>
													handleGenerateDrafts(contacts?.map((c) => c.id) || [])
												}
												isDraftDisabled={isGenerationDisabled() || isPendingGeneration}
												isPendingGeneration={isPendingGeneration}
												generationProgress={generationProgress}
												generationTotal={contacts?.length || 0}
												hideTopChrome
												hideFooter
												fullWidthMobile
											/>
										</div>
									)}
								</div>
							)}

						{/* Shared Research / Test Preview panel to the right of the drafting tables / writing view */}
						{!isMobile &&
							['testing', 'contacts', 'drafting', 'sent', 'search'].includes(view) && (
								<div
									className="absolute hidden xl:block"
									style={{
										top: '29px',
										left:
											view === 'search'
												? 'calc(50% + 384px + 37px)'
												: 'calc(50% + 250px + 36px)',
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
											style={{ width: 375, height: 630 }}
										/>
									) : (
										<ContactResearchPanel contact={displayedContactForResearch} />
									)}
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
								/>
								{/* Right panel for Testing view - positioned absolutely */}
								{false && (
									<div
										className="absolute hidden lg:block"
										style={{
											left: 'calc(50% + 250px + 50px)',
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
									/>
								</div>
							)}
						</div>

						{/* Contacts tab - show the contacts table */}
						{view === 'contacts' && (
							<div className="flex items-center justify-center min-h-[300px]">
								<ContactsSelection
									contacts={contacts || []}
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
										backgroundColor: '#D8E5FB',
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
													className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer hover:bg-[#a3d9a5] transition-colors"
													style={{
														width: '48px',
														height: '37px',
														backgroundColor: '#B8E4BE',
														border: '1px solid #5DAB68',
														borderRadius: '6px',
													}}
													aria-label="Search"
													onClick={() => {
														// TODO: Trigger search with selected values
														setSearchActiveSection(null);
													}}
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
												contacts={contacts || []}
												selectedContacts={searchTabSelectedContacts}
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
												onMarkerClick={(contact) => {
													handleResearchContactClick(contact);
												}}
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Placeholder content for future tabs */}
						{(view === 'inbox' || view === 'all') && (
							<div className="flex items-center justify-center min-h-[300px] text-gray-400">
								{/* Blank for now */}
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
