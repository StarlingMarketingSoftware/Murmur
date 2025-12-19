'use client';

// Force server-rendering (no static path generation) to avoid Clerk chunk build errors
export const dynamic = 'force-dynamic';

import { useCampaignDetail } from './useCampaignDetail';
import { CampaignPageSkeleton } from '@/components/molecules/CampaignPageSkeleton/CampaignPageSkeleton';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMe } from '@/hooks/useMe';
import { useState, useEffect, useRef, useCallback } from 'react';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import nextDynamic from 'next/dynamic';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useCreateIdentity, useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import { EmailStatus } from '@/constants/prismaEnums';

type ViewType = 'search' | 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all';

// Transition duration in ms - kept short for that premium, snappy feel
const TRANSITION_DURATION = 280;

// Dynamically import heavy components to reduce initial bundle size and prevent Vercel timeout
const DraftingSection = nextDynamic(
	() => import('./DraftingSection/DraftingSection').then((mod) => mod.DraftingSection),
	{
		loading: () => <CampaignPageSkeleton />,
	}
);

const IdentityDialog = nextDynamic(
	() =>
		import('@/components/organisms/_dialogs/IdentityDialog/IdentityDialog').then(
			(mod) => mod.IdentityDialog
		),
	{}
);

const CampaignRightPanel = nextDynamic(
	() =>
		import('@/components/organisms/CampaignRightPanel/CampaignRightPanel').then(
			(mod) => mod.CampaignRightPanel
		),
	{}
);

const Murmur = () => {
	// Add campaign-specific class to body for background styling
	useEffect(() => {
		document.body.classList.add('murmur-campaign');
		return () => {
			document.body.classList.remove('murmur-campaign');
		};
	}, []);
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();
	const isMobile = useIsMobile();

	const searchParams = useSearchParams();
	const silentLoad = searchParams.get('silent') === '1';
	const originParam = searchParams.get('origin');
	const cameFromSearch = originParam === 'search';
	const tabParam = searchParams.get('tab');
	const [identityDialogOrigin, setIdentityDialogOrigin] = useState<'campaign' | 'search'>(
		cameFromSearch ? 'search' : 'campaign'
	);

	const { user, isPendingUser, isLoaded } = useMe();
	const { data: identities, isPending: isPendingIdentities } = useGetIdentities({});
	const { mutateAsync: editCampaign } = useEditCampaign({ suppressToasts: true });
	const { mutateAsync: createIdentity } = useCreateIdentity({ suppressToasts: true });
	const autoEnsureIdentityOnceRef = useRef(false);

	// If we landed here without an identity:
	// - Normal flow: force the IdentityDialog (existing behavior)
	// - Search -> campaign flow: silently create/assign an identity so Profile tab can populate it
	useEffect(() => {
		if (!campaign) return;
		if (campaign.identityId) return;

		if (!cameFromSearch) {
			setIsIdentityDialogOpen(true);
			return;
		}

		if (autoEnsureIdentityOnceRef.current) return;
		if (isPendingIdentities) return;

		const existingIdentityId = identities?.[0]?.id;
		const needsCreate = !existingIdentityId;
		if (needsCreate) {
			// Wait for auth + user record, otherwise we can't create an identity.
			if (!isLoaded || isPendingUser) return;
			// If we still can't access a user email, fall back to the dialog to avoid a dead-end.
			if (!user?.email) {
				autoEnsureIdentityOnceRef.current = true;
				setIdentityDialogOrigin('search');
				setIsIdentityDialogOpen(true);
				return;
			}
		}

		autoEnsureIdentityOnceRef.current = true;

		(async () => {
			try {
				const identityIdToAssign = existingIdentityId
					? existingIdentityId
					: (
							await createIdentity({
								name:
									`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
									user?.email ||
									'New Profile',
								email: user?.replyToEmail ?? user?.email ?? '',
							})
					  )?.id;

				if (!identityIdToAssign) {
					throw new Error('Failed to determine identityId for campaign');
				}

				await editCampaign({
					id: campaign.id,
					data: { identityId: identityIdToAssign },
				});
			} catch (error) {
				console.error('Failed to auto-assign identity for campaign:', error);
				// Fallback: allow the existing IdentityDialog flow so the user isn't blocked
				setIdentityDialogOrigin('search');
				setIsIdentityDialogOpen(true);
			}
		})();
	}, [
		campaign,
		cameFromSearch,
		identities,
		isPendingIdentities,
		isLoaded,
		isPendingUser,
		user,
		createIdentity,
		editCampaign,
		setIsIdentityDialogOpen,
	]);
	
	// Determine initial view based on tab query parameter
	const getInitialView = (): ViewType => {
		if (tabParam === 'inbox') return 'inbox';
		if (tabParam === 'contacts') return 'contacts';
		if (tabParam === 'drafting') return 'drafting';
		if (tabParam === 'sent') return 'sent';
		if (tabParam === 'search') return 'search';
		if (tabParam === 'all') return 'all';
		return 'testing';
	};
	
	const [activeView, setActiveViewInternal] = useState<ViewType>(getInitialView());
	
	// Track previous view for crossfade transitions
	const [previousView, setPreviousView] = useState<ViewType | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	
	// Wrapped setActiveView that handles transitions
	const setActiveView = useCallback((newView: ViewType) => {
		if (newView === activeView) return;
		
		// Clear any pending transition
		if (transitionTimeoutRef.current) {
			clearTimeout(transitionTimeoutRef.current);
		}
		
		// Start transition: keep previous view visible while fading
		setPreviousView(activeView);
		setIsTransitioning(true);
		setActiveViewInternal(newView);
		
		// End transition after animation completes
		transitionTimeoutRef.current = setTimeout(() => {
			setPreviousView(null);
			setIsTransitioning(false);
		}, TRANSITION_DURATION);
	}, [activeView]);
	
	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (transitionTimeoutRef.current) {
				clearTimeout(transitionTimeoutRef.current);
			}
		};
	}, []);

	// Narrow desktop detection for Writing tab compact layout (952px - 1279px)
	const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
	// Narrowest desktop detection (< 952px) - header box above tabs
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Hide right panel when arrows would overlap with it (below 1522px)
	const [hideRightPanel, setHideRightPanel] = useState(false);
	// Hide right panel on search tab at wider breakpoint (below 1796px)
	const [hideRightPanelOnSearch, setHideRightPanelOnSearch] = useState(false);
	// Hide right panel on all tab at breakpoint (below 1665px)
	const [hideRightPanelOnAll, setHideRightPanelOnAll] = useState(false);
	// Hide right panel on inbox tab at breakpoint (below 1681px)
	const [hideRightPanelOnInbox, setHideRightPanelOnInbox] = useState(false);
	// Hide arrows when they would overlap with content boxes (below 1317px)
	const [hideArrowsAtBreakpoint, setHideArrowsAtBreakpoint] = useState(false);
	// Hide arrows on search tab at wider breakpoint (below 1557px)
	const [hideArrowsOnSearch, setHideArrowsOnSearch] = useState(false);
	// Hide arrows on all tab at breakpoint (at or below 1396px)
	const [hideArrowsOnAll, setHideArrowsOnAll] = useState(false);
	// Hide arrows on inbox tab at breakpoint (below 1476px)
	const [hideArrowsOnInbox, setHideArrowsOnInbox] = useState(false);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const checkBreakpoints = () => {
			const width = window.innerWidth;
			setIsNarrowDesktop(width >= 952 && width < 1280);
			setIsNarrowestDesktop(width < 952);
			setHideRightPanel(width < 1522);
			setHideRightPanelOnSearch(width < 1796);
			setHideRightPanelOnAll(width <= 1665);
			setHideRightPanelOnInbox(width < 1681);
			setHideArrowsAtBreakpoint(width < 1317);
			setHideArrowsOnSearch(width < 1557);
			setHideArrowsOnAll(width <= 1396);
			setHideArrowsOnInbox(width < 1476);
		};
		checkBreakpoints();
		window.addEventListener('resize', checkBreakpoints);
		return () => window.removeEventListener('resize', checkBreakpoints);
	}, []);

	// Fetch header data for narrowest desktop layout
	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: headerContacts } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0 && isNarrowestDesktop && !isMobile,
	});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
		enabled: !!campaign?.id && isNarrowestDesktop && !isMobile,
	});

	// Compute header metrics
	const headerContactsCount = headerContacts?.length || 0;
	const headerDraftCount = (headerEmails || []).filter((e) => e.status === EmailStatus.draft).length;
	const headerSentCount = (headerEmails || []).filter((e) => e.status === EmailStatus.sent).length;
	const headerToListNames = campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const headerFromName = campaign?.identity?.name || '';

	// Hide fixed arrows when in narrow desktop + testing view (arrows show next to draft button instead)
	// or when width < 1317px to prevent overlap with content boxes
	// or when on search tab and width < 1557px
	// or when on all tab and width <= 1396px
	// or when on inbox tab and width < 1476px
	const hideFixedArrows =
		(activeView === 'testing' && isNarrowDesktop) ||
		hideArrowsAtBreakpoint ||
		(activeView === 'search' && hideArrowsOnSearch) ||
		(activeView === 'all' && hideArrowsOnAll) ||
		(activeView === 'inbox' && hideArrowsOnInbox);

	// Tab navigation order
	const tabOrder: Array<'search' | 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all'> = [
		'search',
		'contacts',
		'testing',
		'drafting',
		'sent',
		'inbox',
		'all',
	];

	const goToPreviousTab = () => {
		const currentIndex = tabOrder.indexOf(activeView);
		if (currentIndex > 0) {
			setActiveView(tabOrder[currentIndex - 1]);
		} else {
			// Wrap around to the last tab
			setActiveView(tabOrder[tabOrder.length - 1]);
		}
	};

	const goToNextTab = () => {
		const currentIndex = tabOrder.indexOf(activeView);
		if (currentIndex < tabOrder.length - 1) {
			setActiveView(tabOrder[currentIndex + 1]);
		} else {
			// Wrap around to the first tab
			setActiveView(tabOrder[0]);
		}
	};

	// Mobile-specific tab navigation (only the 4 visible tabs on mobile)
	const mobileTabOrder: Array<'contacts' | 'drafting' | 'sent' | 'inbox'> = [
		'contacts',
		'drafting',
		'sent',
		'inbox',
	];

	const goToPreviousMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'contacts' | 'drafting' | 'sent' | 'inbox');
		if (currentIndex > 0) {
			setActiveView(mobileTabOrder[currentIndex - 1]);
		} else {
			// Wrap around to the last mobile tab
			setActiveView(mobileTabOrder[mobileTabOrder.length - 1]);
		}
	};

	const goToNextMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'contacts' | 'drafting' | 'sent' | 'inbox');
		if (currentIndex >= 0 && currentIndex < mobileTabOrder.length - 1) {
			setActiveView(mobileTabOrder[currentIndex + 1]);
		} else {
			// Wrap around to the first mobile tab
			setActiveView(mobileTabOrder[0]);
		}
	};

	if (isPendingCampaign || !campaign) {
		return silentLoad ? null : <CampaignPageSkeleton />;
	}

	if (isMobile === null) {
		return null;
	}
	// Hide underlying content and show a white overlay when we require the user to set up an identity
	// or while the full-screen User Settings dialog is open. This prevents any visual "glimpses" and
	// ensures a premium, smooth transition with no scale effects.
	const shouldHideContent = isIdentityDialogOpen || !campaign.identityId;
	return (
		<div className="min-h-screen">
			{/* Left navigation arrow - absolute position (hidden in narrow desktop + testing) */}
			{!hideFixedArrows && (
				<button
					type="button"
					onClick={goToPreviousTab}
					className="absolute z-50 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
					style={{
						left: '33px',
						top: '467px',
					}}
					aria-label="Previous tab"
				>
					<LeftArrow />
				</button>
			)}

			{/* Right navigation arrow - absolute position (hidden in narrow desktop + testing) */}
			{!hideFixedArrows && (
				<button
					type="button"
					onClick={goToNextTab}
					className="absolute z-50 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
					style={{
						right: '33px',
						top: '467px',
					}}
					aria-label="Next tab"
				>
					<RightArrow />
				</button>
			)}

			{/* Header row with Back to Home link, centered tabs, and Clerk icon (from layout) */}
			<div data-slot="campaign-header">
				<div className="relative h-[50px] flex items-center justify-center">
					{/* Back to Home link - left side */}
					<Link
						href={urls.murmur.dashboard.index}
						prefetch
						className={cn(
							'absolute left-8 flex items-center text-[15px] font-inter font-normal no-underline hover:no-underline z-[100] group text-[#060606] hover:text-gray-500',
							isMobile && 'hidden'
						)}
						title="Back to Home"
						onClick={(e) => {
							e.preventDefault();
							if (typeof window !== 'undefined') {
								window.location.assign(urls.murmur.dashboard.index);
							}
						}}
						style={{
							gap: '20px',
							fontWeight: 400,
						}}
					>
						<svg
							width="16"
							height="10"
							viewBox="0 0 27 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="inline-block align-middle"
						>
							<path
								d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
								fill="currentColor"
							/>
						</svg>
						<span>Back to Home</span>
					</Link>

					{/* View tabs - centered in header (hidden at narrowest breakpoint and on mobile) */}
					<div className={cn("flex gap-12 mobile-landscape-hide", (isMobile || isNarrowestDesktop) && "hidden")}>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'search'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('search')}
						>
							Search
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'contacts'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('contacts')}
						>
							Contacts
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'testing'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('testing')}
						>
							Writing
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'drafting'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('drafting')}
						>
							Drafts
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'sent'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('sent')}
						>
							Sent
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'inbox'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('inbox')}
						>
							Inbox
						</button>
						<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'all'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('all')}
						>
							All
						</button>
					</div>

				{/* Mobile header - campaign title and tabs */}
				{isMobile && (
					<div className="absolute inset-x-0 top-0 flex flex-col mt-3">
						<div 
							className="pl-4 pr-20 overflow-hidden"
							style={{
								maskImage: 'linear-gradient(to right, black 60%, transparent 95%)',
								WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 95%)',
							}}
						>
							<h1 
								className="text-[22px] font-medium text-left text-black mb-2 leading-7 whitespace-nowrap" 
								style={{ fontFamily: "'Times New Roman', Times, serif" }}
							>
								{campaign?.name || 'Untitled Campaign'}
							</h1>
						</div>
						<div className="flex gap-3 justify-center mt-4">
							<button
								type="button"
								className={cn(
									'font-inter text-[13px] font-medium leading-none bg-[#F5DADA] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'contacts'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('contacts')}
							>
								{headerContactsCount.toString().padStart(2, '0')} Contacts
							</button>
							<button
								type="button"
								className={cn(
									'font-inter text-[13px] font-medium leading-none bg-[#FFE3AA] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'drafting'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('drafting')}
							>
								{headerDraftCount.toString().padStart(2, '0')} Drafts
							</button>
							<button
								type="button"
								className={cn(
									'font-inter text-[13px] font-medium leading-none bg-[#B0E0A6] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'sent'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('sent')}
							>
								{headerSentCount.toString().padStart(2, '0')} Sent
							</button>
							<button
								type="button"
								className={cn(
									'font-inter text-[13px] font-medium leading-none bg-[#E8EFFF] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'inbox'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('inbox')}
							>
								Inbox
							</button>
						</div>
					</div>
				)}
				</div>
			</div>

			{/* Main content container */}
			<div data-slot="campaign-content" className="relative">
				{shouldHideContent && (
					<div
						className={cn(
							'fixed inset-0 z-40 pointer-events-none flex items-center justify-center',
							isMobile ? 'bg-white' : 'bg-background'
						)}
					>
						{cameFromSearch && !campaign.identityId && !isIdentityDialogOpen ? (
							<div className="text-center">
								<p className="font-inter text-[14px] text-[#3b3b3b]">
									Setting up your profile…
								</p>
							</div>
						) : null}
					</div>
				)}
				<div
					className={cn(
						'transition-opacity duration-200',
						shouldHideContent
							? 'opacity-0 pointer-events-none select-none'
							: 'opacity-100'
					)}
					style={{
						WebkitTransition: 'opacity 0.2s',
						transition: 'opacity 0.2s',
					}}
				>
					<IdentityDialog
						campaign={campaign}
						title="User Settings"
						open={isIdentityDialogOpen}
						onOpenChange={setIsIdentityDialogOpen}
						backButtonText={
							identityDialogOrigin === 'search'
								? 'Back to Search Results'
								: 'Back to Campaign'
						}
					/>

					{/* Campaign Header Box - shown at narrowest breakpoint (< 952px) */}
					{!isMobile && isNarrowestDesktop && campaign && (
						<div className="flex justify-center mb-4">
							<CampaignHeaderBox
								campaignId={campaign.id}
								campaignName={campaign.name || 'Untitled Campaign'}
								toListNames={headerToListNames}
								fromName={headerFromName}
								contactsCount={headerContactsCount}
								draftCount={headerDraftCount}
								sentCount={headerSentCount}
								onFromClick={() => {
									setIdentityDialogOrigin('campaign');
									setIsIdentityDialogOpen(true);
								}}
								fullWidth
							/>
						</div>
					)}

					{/* View tabs - shown below header box at narrowest breakpoint (< 952px) */}
					{!isMobile && isNarrowestDesktop && (
						<div className="flex justify-center mb-4">
							<div className="flex gap-6">
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'search'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('search')}
								>
									Search
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'contacts'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('contacts')}
								>
									Contacts
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'testing'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('testing')}
								>
									Writing
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'drafting'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('drafting')}
								>
									Drafts
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'sent'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('sent')}
								>
									Sent
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'inbox'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('inbox')}
								>
									Inbox
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'all'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('all')}
								>
									All
								</button>
							</div>
						</div>
					)}

					<div className="mt-6 flex justify-center">
						{/* Crossfade transition container */}
						<div className="relative w-full">
							{/* Determine if both views share the same research panel position */}
							{(() => {
								const standardPositionTabs: ViewType[] = ['testing', 'contacts', 'drafting', 'sent'];
								const bothSharePosition = isTransitioning && previousView && 
									standardPositionTabs.includes(previousView) && 
									standardPositionTabs.includes(activeView);
								
								return (
									<>
										{/* Previous view - fading out */}
										{isTransitioning && previousView && (
											<div
												className="absolute inset-0 w-full"
												style={{
													animation: `viewFadeOut ${TRANSITION_DURATION}ms ease-out forwards`,
													zIndex: 1,
												}}
											>
												<DraftingSection
													campaign={campaign}
													view={previousView}
													autoOpenProfileTabWhenIncomplete={
														cameFromSearch || previousView === 'search'
													}
													goToDrafting={() => setActiveView('drafting')}
													goToAll={() => setActiveView('all')}
													goToWriting={() => setActiveView('testing')}
													onGoToSearch={() => setActiveView('search')}
													goToContacts={() => setActiveView('contacts')}
													goToInbox={() => setActiveView('inbox')}
													goToSent={() => setActiveView('sent')}
													onOpenIdentityDialog={() => {
														setIdentityDialogOrigin('campaign');
														setIsIdentityDialogOpen(true);
													}}
													goToPreviousTab={goToPreviousTab}
													goToNextTab={goToNextTab}
													hideHeaderBox={isNarrowestDesktop && !isMobile}
													isTransitioningOut={bothSharePosition ?? undefined}
												/>
											</div>
										)}
										
										{/* Current view - fading in (skip fade when research panel should stay stable) */}
										<div
											className="w-full"
											style={{
												// When both views share the research panel position, use a different animation
												// that doesn't fade the whole container - only fade in non-research content
												animation: isTransitioning
													? bothSharePosition
														? `viewFadeInStableResearch ${TRANSITION_DURATION}ms ease-out forwards`
														: `viewFadeIn ${TRANSITION_DURATION}ms ease-out forwards`
													: undefined,
												zIndex: 2,
											}}
										>
											<DraftingSection
												campaign={campaign}
												view={activeView}
												autoOpenProfileTabWhenIncomplete={
													cameFromSearch || previousView === 'search'
												}
												goToDrafting={() => setActiveView('drafting')}
												goToAll={() => setActiveView('all')}
												goToWriting={() => setActiveView('testing')}
												onGoToSearch={() => setActiveView('search')}
												goToContacts={() => setActiveView('contacts')}
												goToInbox={() => setActiveView('inbox')}
												goToSent={() => setActiveView('sent')}
												onOpenIdentityDialog={() => {
													setIdentityDialogOrigin('campaign');
													setIsIdentityDialogOpen(true);
												}}
												goToPreviousTab={goToPreviousTab}
												goToNextTab={goToNextTab}
												hideHeaderBox={isNarrowestDesktop && !isMobile}
												isTransitioningIn={bothSharePosition ?? undefined}
											/>
										</div>
									</>
								);
							})()}
						</div>
					</div>
				{/* Crossfade transition animations and mobile-specific styles */}
					<style jsx global>{`
						/* View transition animations - smooth, clean crossfade */
						@keyframes viewFadeIn {
							0% {
								opacity: 0;
							}
							100% {
								opacity: 1;
							}
						}
						
						@keyframes viewFadeOut {
							0% {
								opacity: 1;
							}
							100% {
								opacity: 0;
							}
						}
						
						/* Animation for transitions where research panel should stay stable
						   The container stays at full opacity so the research panel doesn't fade,
						   but we use CSS to fade in the rest of the content */
						@keyframes viewFadeInStableResearch {
							0% {
								opacity: 1;
							}
							100% {
								opacity: 1;
							}
						}
						
						/* When using stable research transition, fade the main content instead */
						[data-research-panel-container] {
							/* Research panel container - stays stable */
						}
						
						/* Fade in non-research-panel content when transitioning */
						.view-fade-in-content > *:not([data-research-panel-container]) {
							animation: viewFadeIn 280ms ease-out forwards;
						}
						
						/* Mobile styles below */
						body.murmur-mobile [data-drafting-container] {
							display: none !important;
						}

						/* Default: hide the inline header controls (used only in landscape) */
						body.murmur-mobile .mobile-landscape-inline-controls {
							display: none !important;
						}

						/* Default: hide the centered metrics overlay (shown only in landscape) */
						body.murmur-mobile .mobile-landscape-metrics-center {
							display: none !important;
						}

						/* Mobile portrait: fix signature block height */
						@media (max-width: 480px) and (orientation: portrait) {
							/* Specific case: when Full Auto block exists, set exact 8px gap to Signature while keeping it bottom-anchored */
							body.murmur-mobile [data-hpi-left-panel]:has([data-block-type='full']) {
								display: grid !important;
								grid-template-rows: auto 1fr auto !important;
								row-gap: 8px !important;
							}
							body.murmur-mobile
								[data-hpi-left-panel]:has([data-block-type='full'])
								[data-hpi-footer] {
								margin-top: 0 !important; /* grid controls the 8px gap */
							}
							/* Ensure the drafting box doesn't get too small */
							body.murmur-mobile [data-hpi-container] {
								min-height: 483px !important;
							}
							/* Keep the signature footer anchored to the bottom */
							body.murmur-mobile [data-hpi-content] {
								padding-bottom: 0 !important;
							}
							body.murmur-mobile [data-hpi-content] > div {
								padding-bottom: 0 !important; /* override inner pb-3 */
							}
							/* Make the gap from Signature to the bottom of the box exactly 8px */
							body.murmur-mobile [data-hpi-footer] .mb-\[23px\],
							body.murmur-mobile [data-hpi-footer] .mb-\[9px\] {
								margin-bottom: 8px !important;
							}
							/* Anchor footer at bottom of the drafting box and layer above gradient */
							body.murmur-mobile [data-hpi-footer] {
								margin-top: auto !important; /* keep bottom-anchored */
								position: relative !important;
								z-index: 10 !important;
							}
							/* Ensure signature card and textarea are fully opaque white */
							body.murmur-mobile [data-hpi-signature-card] {
								background-color: #ffffff !important;
								position: relative !important;
								z-index: 10 !important;
							}
							body.murmur-mobile .signature-textarea {
								background-color: #ffffff !important;
							}
							body.murmur-mobile [data-hpi-signature-card] {
								min-height: 68px !important;
							}
							/* Allow the signature textarea to auto-expand on mobile portrait */
							body.murmur-mobile .signature-textarea {
								min-height: 44px !important; /* base height */
								font-size: 12px !important;
								line-height: 1.2 !important;
								padding: 2px 0 0 2px !important;
								overflow: hidden !important;
								resize: none !important;
							}
						}

						/* Mobile landscape: inline header controls, centered metrics, and title layout */
						@media (orientation: landscape) {
							/* Left-side expanded panel height cap in mobile landscape (exclude Email Structure) */
							body.murmur-mobile
								[data-left-expanded-panel]
								> div:not([aria-label='Expanded email structure']) {
								height: 273px !important;
								max-height: 273px !important;
								overflow: hidden !important;
							}
							/* Ensure inner scroll areas flex correctly within the capped height */
							body.murmur-mobile
								[data-left-expanded-panel]
								> div:not([aria-label='Expanded email structure'])
								> * {
								max-height: 100% !important;
							}
							/* Row: use a 3-column grid so title/metrics/controls never overlap */
							body.murmur-mobile .mobile-header-row {
								display: grid !important;
								grid-template-columns: 1fr auto 1fr !important; /* left flex, centered auto, right flex */
								align-items: center !important;
								gap: 6px !important;
							}
							/* Centered metrics: inline in the center grid cell */
							body.murmur-mobile .mobile-landscape-metrics-center {
								display: inline-flex !important;
								gap: 6px !important;
								position: static !important;
								left: auto !important;
								top: auto !important;
								transform: none !important;
								z-index: auto !important;
								pointer-events: auto !important;
								justify-self: center !important; /* center within middle column */
								grid-column: 2 / 3 !important;
							}
							/* Controls: right grid cell */
							body.murmur-mobile .mobile-landscape-inline-controls {
								display: inline-flex !important;
								gap: 3px; /* tighter spacing to free more room for title */
								align-items: center !important;
								position: static !important;
								left: auto !important;
								transform: none !important;
								margin-left: 0 !important;
								padding-right: 15px !important; /* increased right padding */
								justify-self: end !important;
								grid-column: 3 / 4 !important;
							}
							/* Title: flex and truncate on the left side */
							body.murmur-mobile .campaign-title-landscape {
								margin-left: -8px !important; /* nudge farther left in landscape */
								padding-left: 15px !important; /* increased left padding */
								max-width: none;
								overflow: hidden;
								white-space: nowrap;
								text-overflow: ellipsis;
								flex: 1 1 auto; /* allow the title to use remaining row space */
								min-width: 0; /* enable proper truncation inside flex layouts */
							}
							/* smaller title text only in mobile landscape and enforce truncation */
							body.murmur-mobile .campaign-title-landscape * {
								font-size: 15px !important;
								line-height: 1 !important;
								text-align: left !important; /* show more of the beginning */
								max-width: 100% !important;
								width: 100% !important; /* override inner w-fit to enable truncation */
								overflow: hidden !important;
								white-space: nowrap !important;
								text-overflow: ellipsis !important;
							}

							/* Shrink metric boxes a bit to free width for the title */
							body.murmur-mobile .mobile-landscape-inline-controls .metric-box {
								width: 70px !important;
								font-size: 10.5px !important;
								padding-left: 6px !important;
								padding-right: 6px !important;
							}
							/* Make To/From pills slightly narrower */
							body.murmur-mobile .mobile-landscape-inline-controls .pill-mini {
								width: 32px !important;
								height: 14px !important;
								border-radius: 5px !important;
							}
							body.murmur-mobile .mobile-landscape-inline-controls .pill-mini span {
								font-size: 9px !important;
							}
							/* Tighten spacing before the inline view tabs in landscape */
							body.murmur-mobile .mobile-landscape-inline-controls .ml-2 {
								margin-left: 4px !important;
							}
							/* Slightly smaller view-tab labels to prioritize title width */
							body.murmur-mobile .mobile-landscape-inline-controls button {
								font-size: 14px !important;
							}

							/* Make the preview panel mimic portrait style by hiding its outer chrome */
							body.murmur-mobile [data-drafting-preview-panel] {
								background: transparent !important;
								border: 0 !important;
								scale: 1 !important;
								border-radius: 0 !important;
							}
							body.murmur-mobile [data-drafting-preview-header] {
								display: none !important;
							}

							/* Mobile landscape: make Test Preview match main drafting box dimensions */
							body.murmur-mobile [data-test-preview-wrapper] {
								width: 96.27vw !important; /* same as main drafting box */
							}
							body.murmur-mobile [data-test-preview-wrapper] [data-test-preview-panel] {
								width: 100% !important; /* fill wrapper */
								height: 644px !important; /* keep same inner height used in portrait */
							}
							/* Show sticky Back to Testing / Go to Drafting footer in landscape on mobile */
							body.murmur-mobile
								[data-test-preview-wrapper]
								.mobile-landscape-sticky-preview-footer {
								display: block !important;
							}
						}

						/* At 667px landscape, adjust spacing for less cramped layout */
						@media (max-width: 667px) and (orientation: landscape) {
							body.murmur-mobile .campaign-title-landscape {
								margin-left: -20px;
							}
							/* Home button on the right - push it out slightly */
							body.murmur-mobile button[title='Home'] {
								margin-right: -4px;
							}
						}

						@media (orientation: landscape) {
							/* Hide portrait container and bottom tabs while in landscape */
							body.murmur-mobile [data-slot='mobile-header-controls'] {
								display: none !important;
							}
							body.murmur-mobile .mobile-landscape-hide {
								display: none !important;
							}
							/* Mobile landscape: shrink the Hybrid Prompt Input to its minimal functional height */
							body.murmur-mobile [data-hpi-container] {
								min-height: unset !important;
								margin-bottom: 6px !important;
							}
							body.murmur-mobile [data-hpi-left-panel] {
								padding-top: 6px !important;
								padding-bottom: 6px !important;
							}
							body.murmur-mobile [data-hpi-content] {
								padding-top: 6px !important;
								padding-bottom: 0 !important;
								gap: 8px !important;
							}
							/* Mobile landscape: enforce exact 8px gap from subject bar to first block */
							body.murmur-mobile
								[data-hpi-left-panel]
								[data-slot='form-item']:first-of-type {
								margin-bottom: 0 !important;
							}
							/* Remove container top padding and set inner wrapper top padding to 8px */
							body.murmur-mobile [data-hpi-content] {
								padding-top: 0 !important;
								gap: 6px !important; /* keep tighter inter-block spacing */
							}
							body.murmur-mobile [data-hpi-content] > div {
								padding-top: 8px !important; /* overrides pt-[16px]/pt-[8px] utility classes */
							}
							/* Subject bar: minimal but legible */
							body.murmur-mobile .subject-bar {
								height: 24px !important;
								min-height: 24px !important;
								max-height: 24px !important;
							}
							/* iPhone landscape: prevent overlap by slightly reducing label size and spacing toggle */
							body.murmur-mobile .subject-bar .subject-label {
								font-size: 15px !important;
							}
							body.murmur-mobile .subject-bar .subject-toggle {
								margin-right: 4px !important;
							}
							/* Full Auto textarea: reduce height and hide example for space */
							body.murmur-mobile .full-auto-textarea {
								height: 90px !important;
								min-height: 90px !important;
							}
							body.murmur-mobile .full-auto-placeholder-example {
								display: none !important;
							}
							/* Mini Email Structure: make Full Auto much shorter in mobile landscape */
							body.murmur-mobile
								[aria-label='Expanded email structure']
								.mini-full-auto-textarea {
								height: 48px !important;
								min-height: 48px !important;
							}
							/* Reduce extra whitespace under the paragraph slider in the mini card */
							body.murmur-mobile
								[aria-label='Expanded email structure']
								.mini-paragraph-slider {
								margin-bottom: 0 !important;
								padding-bottom: 0 !important;
							}
							body.murmur-mobile
								[aria-label='Expanded email structure']
								.mini-full-auto-card {
								padding-bottom: 6px !important; /* tighten bottom padding of the card */
							}
							body.murmur-mobile
								[aria-label='Expanded email structure']
								.mini-full-auto-placeholder {
								display: block !important;
								font-size: 9px !important;
								line-height: 1.15 !important;
								padding: 4px 6px 2px 0 !important;
								color: #505050 !important;
								overflow: hidden !important;
							}
							/* Show full guidance text (both lines) but keep smaller sizing */
							/* Signature area: single-line compact */
							body.murmur-mobile [data-hpi-footer] {
								margin-top: 2px !important;
							}
							/* Reduce space between last block and signature */
							body.murmur-mobile [data-hpi-content] [data-block-type]:last-of-type {
								margin-bottom: 2px !important;
							}
							body.murmur-mobile [data-hpi-signature-card] {
								min-height: 42px !important;
								padding-top: 4px !important;
								padding-bottom: 4px !important;
								display: flex !important;
								align-items: center !important;
								gap: 8px !important;
							}
							body.murmur-mobile [data-hpi-signature-card] [data-slot='form-label'] {
								margin: 0 8px 0 0 !important;
								white-space: nowrap !important;
							}
							body.murmur-mobile .signature-textarea {
								height: 30px !important;
								min-height: 30px !important;
								max-height: 30px !important;
								overflow: hidden !important;
								resize: none !important;
								flex: 1 1 auto !important;
								min-width: 0 !important;
								font-size: 12px !important; /* match the 'Signature' header size on mobile */
								line-height: 1.2 !important;
								padding: 2px 0 0 2px !important;
							}
							/* Blocks: tighten vertical chrome */
							body.murmur-mobile [data-block-type] {
								margin-top: 6px !important;
								margin-bottom: 6px !important;
							}
							body.murmur-mobile [data-block-type='text'] {
								min-height: 44px !important;
							}
							body.murmur-mobile [data-drag-handle] {
								height: 24px !important;
							}
							/* Show sticky Test; hide in-box Test */
							body.murmur-mobile .mobile-sticky-test-button {
								display: block !important;
							}
							body.murmur-mobile .w-full > .flex.justify-center.mb-4.w-full {
								display: none !important;
							}
							/* Exact 8px gap between last content block and Signature; keep Signature bottom-anchored */
							body.murmur-mobile [data-hpi-container] {
								display: grid !important;
								grid-template-rows: 1fr auto !important; /* content fills, footer at bottom */
								align-items: stretch !important;
								row-gap: 8px !important; /* exact gap above signature */
							}
							/* Remove extra bottom spacing inside the content area so the gap is truly 8px */
							body.murmur-mobile [data-hpi-left-panel] {
								padding-bottom: 0 !important;
							}
							body.murmur-mobile [data-hpi-content] {
								padding-bottom: 0 !important;
							}
							body.murmur-mobile [data-hpi-content] > div {
								padding-bottom: 0 !important; /* override inner pb-3 */
							}
							body.murmur-mobile [data-hpi-content] [data-block-type]:last-of-type {
								margin-bottom: 0 !important; /* account for any margins on the last block */
							}
							/* Rely on grid spacing; do not add margin on footer */
							body.murmur-mobile [data-hpi-footer] {
								margin-top: 0 !important; /* override mt-auto/margin rules */
							}
							/* Ensure exactly 8px between the bottom of Signature and the bottom of the box */
							body.murmur-mobile [data-hpi-footer] {
								padding-bottom: 8px !important;
							}
							/* Remove extra bottom margin from the Signature FormItem wrapper */
							body.murmur-mobile [data-hpi-footer] .mb-\[23px\],
							body.murmur-mobile [data-hpi-footer] .mb-\[9px\] {
								margin-bottom: 0 !important;
							}
							/* Hide any in-box footer content below Signature in landscape (Test/error), relying on sticky Test */
							body.murmur-mobile [data-hpi-footer] > .w-full {
								display: none !important;
							}
						}

						/* Previously we drew only a bottom divider. Replace with a full header box in landscape. */
						@media (orientation: landscape) {
							/* Full-width box around header */
							body.murmur-mobile [data-slot='campaign-header'] {
								border: 2px solid #000000 !important;
								box-sizing: border-box !important;
							}
							/* Remove old bottom divider and any gap so header box touches content */
							body.murmur-mobile [data-slot='campaign-content'] {
								border-top: 0 !important;
								margin-top: 0 !important;
							}
						}
					`}</style>
				</div>
			</div>

			{/* Right side panel - hidden on mobile, when width < 1522px, on search tab when width < 1796px, on all tab when width <= 1665px, or on inbox tab when width < 1681px */}
			{!isMobile && !hideRightPanel && !(activeView === 'search' && hideRightPanelOnSearch) && !(activeView === 'all' && hideRightPanelOnAll) && !(activeView === 'inbox' && hideRightPanelOnInbox) && (
				<CampaignRightPanel view={activeView} onTabChange={setActiveView} />
			)}

			{/* Mobile bottom navigation panel */}
			{isMobile && (
				<div
					className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-1"
					style={{ backgroundColor: '#E1EFF4' }}
				>
					<button
						type="button"
						onClick={goToPreviousMobileTab}
						className="bg-transparent border-0 p-1 cursor-pointer hover:opacity-70 transition-opacity"
						aria-label="Previous tab"
					>
						<LeftArrow width={18} height={34} color="#000000" opacity={1} />
					</button>
					<button
						type="button"
						onClick={goToNextMobileTab}
						className="bg-transparent border-0 p-1 cursor-pointer hover:opacity-70 transition-opacity"
						aria-label="Next tab"
					>
						<RightArrow width={18} height={34} color="#000000" opacity={1} />
					</button>
				</div>
			)}
		</div>
	);
};

export default Murmur;

