import { FC, ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { cn } from '@/utils';
import { CampaignWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import ContactsExpandedList from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import { DraftsExpandedList } from './DraftsExpandedList';
import { SentExpandedList } from './SentExpandedList';
import { DraftPreviewExpandedList } from './DraftPreviewExpandedList';
import { SendPreviewExpandedList } from './SendPreviewExpandedList';
import EmailStructureExpandedBox from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/EmailStructureExpandedBox';
import { useIsMobile } from '@/hooks/useIsMobile';

export type DraftingPreviewKind =
	| 'none'
	| 'contacts'
	| 'emailStructure'
	| 'draftPreview'
	| 'drafts'
	| 'sendPreview'
	| 'sent';

export interface DraftingStatusPanelRenderers {
	contacts?: () => ReactNode;
	emailStructure?: () => ReactNode;
	draftPreview?: () => ReactNode;
	drafts?: () => ReactNode;
	sendPreview?: () => ReactNode;
	sent?: () => ReactNode;
}

export interface DraftingStatusPanelProps {
	campaign: CampaignWithRelations;
	contacts: ContactWithName[];
	form: UseFormReturn<DraftingFormValues>;
	generationProgress: number; // -1 when idle
	generationTotal?: number; // 0 when unknown
	renderers?: DraftingStatusPanelRenderers; // Custom UI hooks for previews
	onOpenDrafting?: () => void;
	// New: wire drafting action/disabled/pending to match main drafting tab
	isGenerationDisabled?: () => boolean;
	isPendingGeneration?: boolean;
	onDraftSelectedContacts?: (contactIds: number[]) => void | Promise<void>;
	// Live drafting preview summary shown inline in Draft Preview row
	isLivePreviewVisible?: boolean;
	livePreviewContactId?: number;
	livePreviewSubject?: string;
	// New: full message for the expanded Draft Preview
	livePreviewMessage?: string;
}

const Divider = () => <div className="w-px self-stretch border-l border-black/40" />;

const ArrowIcon = () => (
	<svg
		width="7"
		height="12"
		viewBox="0 0 7 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M6.53033 6.53033C6.82322 6.23744 6.82322 5.76256 6.53033 5.46967L1.75736 0.696699C1.46447 0.403806 0.989593 0.403806 0.696699 0.696699C0.403806 0.989593 0.403806 1.46447 0.696699 1.75736L4.93934 6L0.696699 10.2426C0.403806 10.5355 0.403806 11.0104 0.696699 11.3033C0.989593 11.5962 1.46447 11.5962 1.75736 11.3033L6.53033 6.53033ZM5 6V6.75H6V6V5.25H5V6Z"
			fill="#636363"
			fillOpacity="0.46"
		/>
	</svg>
);

const ExpandIcon = () => (
	<svg
		className="inline-block align-middle"
		width="14"
		height="14"
		viewBox="0 0 15 15"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M14.4047 1.00117C14.4047 0.780258 14.2256 0.601172 14.0047 0.601172L10.4047 0.601172C10.1838 0.601172 10.0047 0.780258 10.0047 1.00117C10.0047 1.22209 10.1838 1.40117 10.4047 1.40117L13.6047 1.40117L13.6047 4.60117C13.6047 4.82209 13.7838 5.00117 14.0047 5.00117C14.2256 5.00117 14.4047 4.82209 14.4047 4.60117L14.4047 1.00117ZM8.80469 6.20117L9.08753 6.48401L14.2875 1.28401L14.0047 1.00117L13.7218 0.718329L8.52184 5.91833L8.80469 6.20117Z"
			fill="currentColor"
		/>
		<path
			d="M14.0047 14.4013C14.2256 14.4013 14.4047 14.2222 14.4047 14.0013L14.4047 10.4013C14.4047 10.1804 14.2256 10.0013 14.0047 10.0013C13.7838 10.0013 13.6047 10.1804 13.6047 10.4013L13.6047 13.6013L10.4047 13.6013C10.1838 13.6013 10.0047 13.7804 10.0047 14.0013C10.0047 14.2222 10.1838 14.4013 10.4047 14.4013L14.0047 14.4013ZM8.80469 8.80127L8.52184 9.08411L13.7218 14.2841L14.0047 14.0013L14.2875 13.7184L9.08753 8.51843L8.80469 8.80127Z"
			fill="currentColor"
		/>
		<path
			d="M0.603125 14.0013C0.603125 14.2222 0.782211 14.4013 1.00312 14.4013L4.60312 14.4013C4.82404 14.4013 5.00312 14.2222 5.00312 14.0013C5.00312 13.7804 4.82404 13.6013 4.60312 13.6013L1.40312 13.6013L1.40312 10.4013C1.40312 10.1804 1.22404 10.0013 1.00312 10.0013C0.782211 10.0013 0.603125 10.1804 0.603125 10.4013L0.603125 14.0013ZM6.20312 8.80127L5.92028 8.51843L0.720282 13.7184L1.00312 14.0013L1.28597 14.2841L6.48597 9.08411L6.20312 8.80127Z"
			fill="currentColor"
		/>
		<path
			d="M1.00313 0.601172C0.782211 0.601172 0.603125 0.780258 0.603125 1.00117V4.60117C0.603125 4.82209 0.782211 5.00117 1.00313 5.00117C1.22404 5.00117 1.40313 4.82209 1.40313 4.60117V1.40117H4.60313C4.82404 1.40117 5.00313 1.22209 5.00313 1.00117C5.00313 0.780258 4.82404 0.601172 4.60313 0.601172H1.00313ZM6.20312 6.20117L6.48597 5.91833L1.28597 0.718329L1.00313 1.00117L0.720282 1.28401L5.92028 6.48401L6.20312 6.20117Z"
			fill="currentColor"
		/>
	</svg>
);

export const DraftingStatusPanel: FC<DraftingStatusPanelProps> = (props) => {
	const { campaign, contacts, form, generationProgress, generationTotal = 0 } = props;

	const [isOpen, setIsOpen] = useState(true);
	const [activePreview, setActivePreview] = useState<DraftingPreviewKind>('none');

	// Detect mobile landscape mode for split layout (left expanded, right panel)
	const isMobile = useIsMobile();
	const [isLandscape, setIsLandscape] = useState<boolean>(false);
	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const mq = window.matchMedia('(orientation: landscape)');
		const update = () => setIsLandscape(Boolean(mq.matches));
		update();
		try {
			mq.addEventListener('change', update);
			return () => mq.removeEventListener('change', update);
		} catch {
			mq.addListener(update);
			return () => mq.removeListener(update);
		}
	}, []);

	const isSplitLayout = Boolean(isMobile && isLandscape);
	const isPortraitMobile = Boolean(isMobile && !isLandscape);

	// Live inline preview state for Send Preview row (updated by DraftsExpandedList)
	const [sendingPreviewContactId, setSendingPreviewContactId] = useState<number | null>(
		null
	);
	const [sendingPreviewSubject, setSendingPreviewSubject] = useState<string>('');

	// Only show Draft Preview while live preview is explicitly visible
	const showDraftPreviewBox = Boolean(props.isLivePreviewVisible);
	// Only show Send Preview while a send is actively previewing
	// Note: depends only on state declared above
	const showSendPreviewBox = Boolean(sendingPreviewContactId && sendingPreviewSubject);

	const { data: emails } = useGetEmails({
		filters: { campaignId: campaign.id },
	});

	const draftedEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.draft),
		[emails]
	);
	const sentEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.sent),
		[emails]
	);

	const contactedContactIds = useMemo(
		() => new Set([...draftedEmails, ...sentEmails].map((e) => e.contactId)),
		[draftedEmails, sentEmails]
	);
	const availableContacts = useMemo(
		() => (contacts || []).filter((c) => !contactedContactIds.has(c.id)),
		[contacts, contactedContactIds]
	);
	const contactsCount = availableContacts.length;
	const draftsCount = draftedEmails.length;
	const sentCount = sentEmails.length;

	// Helper to select a fallback preview panel (for portrait mobile)
	const selectFallbackPreview = useCallback(
		(exclude?: DraftingPreviewKind): DraftingPreviewKind => {
			// Priority order: contacts, emailStructure, draftPreview, drafts, sendPreview, sent
			const candidates: DraftingPreviewKind[] = [];
			if (contactsCount > 0) candidates.push('contacts');
			candidates.push('emailStructure'); // Always available
			if (showDraftPreviewBox) candidates.push('draftPreview');
			if (draftsCount > 0) candidates.push('drafts');
			if (showSendPreviewBox) candidates.push('sendPreview');
			if (sentCount > 0) candidates.push('sent');

			// Return first available that's not excluded
			for (const c of candidates) {
				if (!exclude || c !== exclude) return c;
			}
			// Fallback to emailStructure (always available)
			return 'emailStructure';
		},
		[contactsCount, showDraftPreviewBox, draftsCount, showSendPreviewBox, sentCount]
	);

	// Default-open Contacts when entering Drafting on mobile portrait
	useEffect(() => {
		if (!isMobile) return; // only mobile
		if (isLandscape) return; // only portrait
		// only on first mount when nothing selected yet
		setActivePreview((prev) => (prev === 'none' ? 'contacts' : prev));
	}, [isMobile, isLandscape]);

	// Default-open Contacts when in mobile landscape (split layout)
	useEffect(() => {
		if (!isMobile) return; // only mobile
		if (!isLandscape) return; // only landscape
		// only on first mount when nothing selected yet
		setActivePreview((prev) => (prev === 'none' ? 'contacts' : prev));
	}, [isMobile, isLandscape]);

	// In portrait mobile, never allow 'none' state
	useEffect(() => {
		if (!isPortraitMobile) return;
		if (activePreview === 'none') {
			setActivePreview(selectFallbackPreview());
		}
	}, [isPortraitMobile, activePreview, selectFallbackPreview]);

	// In mobile landscape (split layout), also never allow 'none' state
	useEffect(() => {
		if (!isSplitLayout) return;
		if (activePreview === 'none') {
			setActivePreview(selectFallbackPreview());
		}
	}, [isSplitLayout, activePreview, selectFallbackPreview]);

	// Ensure expanded Draft Preview collapses when hidden
	useEffect(() => {
		if (!showDraftPreviewBox && activePreview === 'draftPreview') {
			setActivePreview(
				isPortraitMobile || isSplitLayout ? selectFallbackPreview('draftPreview') : 'none'
			);
		}
	}, [
		showDraftPreviewBox,
		activePreview,
		isPortraitMobile,
		isSplitLayout,
		selectFallbackPreview,
	]);

	// Ensure expanded Send Preview collapses when hidden
	useEffect(() => {
		if (!showSendPreviewBox && activePreview === 'sendPreview') {
			setActivePreview(
				isPortraitMobile || isSplitLayout ? selectFallbackPreview('sendPreview') : 'none'
			);
		}
	}, [
		showSendPreviewBox,
		activePreview,
		isPortraitMobile,
		isSplitLayout,
		selectFallbackPreview,
	]);

	const isDrafting =
		generationProgress >= 0 &&
		generationTotal > 0 &&
		generationProgress < generationTotal;
	const draftingPct = useMemo(() => {
		if (!isDrafting) return 0;
		const pct = Math.round((generationProgress / Math.max(1, generationTotal)) * 100);
		return Math.max(0, Math.min(100, pct));
	}, [generationProgress, generationTotal, isDrafting]);

	// Email structure quick facts
	const hybridBlocks = form.watch('hybridBlockPrompts');
	const hasFullAutomated = Boolean(
		hybridBlocks?.some((b) => b.type === 'full_automated')
	);
	const isOnlyTextBlocks = Boolean(
		hybridBlocks &&
			hybridBlocks.length > 0 &&
			hybridBlocks.every((b) => b.type === 'text')
	);
	const draftingMode: 'Full Auto' | 'Hybrid' | 'Handwritten' = hasFullAutomated
		? 'Full Auto'
		: isOnlyTextBlocks
		? 'Handwritten'
		: 'Hybrid';

	const draftingModeStyle = useMemo(() => {
		switch (draftingMode) {
			case 'Full Auto':
				return { backgroundColor: '#DAE6FE' };
			case 'Hybrid':
				return { backgroundColor: 'rgba(74, 74, 217, 0.31)' };
			case 'Handwritten':
				return { backgroundColor: 'rgba(93, 171, 104, 0.47)' };
			default:
				return {};
		}
	}, [draftingMode]);

	const isAiSubject = form.watch('isAiSubject');
	const subjectStyle = useMemo(() => {
		return {
			backgroundColor: isAiSubject ? '#B3D8B8' : '#F1F1F1',
		};
	}, [isAiSubject]);
	const fromName = campaign.identity?.name || '';

	// Live inline preview data for Draft Preview row
	const livePreviewContactName = useMemo(() => {
		if (!props.isLivePreviewVisible || !props.livePreviewContactId) return '';
		const c = contacts?.find((x) => x.id === props.livePreviewContactId);
		if (!c) return '';
		// Show only a real person name; avoid falling back to company or generic labels
		return c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '';
	}, [props.isLivePreviewVisible, props.livePreviewContactId, contacts]);

	const livePreviewSubject = useMemo(() => {
		if (!props.isLivePreviewVisible) return '';
		return props.livePreviewSubject && props.livePreviewSubject.trim() !== ''
			? props.livePreviewSubject
			: 'Drafting...';
	}, [props.isLivePreviewVisible, props.livePreviewSubject]);

	// Live inline preview data for Send Preview row
	const sendingPreviewContactName = useMemo(() => {
		if (!sendingPreviewContactId) return '';
		const c = contacts?.find((x) => x.id === sendingPreviewContactId);
		if (!c) return '';
		return c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '';
	}, [sendingPreviewContactId, contacts]);

	const sendingInlineSubject = useMemo(() => {
		return sendingPreviewSubject && sendingPreviewSubject.trim() !== ''
			? sendingPreviewSubject
			: '';
	}, [sendingPreviewSubject]);

	const headerRight = (
		<div className="flex items-center gap-2">
			<button
				type="button"
				className="text-sm font-semibold text-black/70 hover:text-black flex items-center gap-1"
				onClick={() => {
					if (props?.onOpenDrafting) {
						props.onOpenDrafting();
						return;
					}
					setIsOpen((v) => !v);
				}}
			>
				{isOpen ? 'Open' : 'Closed'}
				<ExpandIcon />
			</button>
		</div>
	);

	const renderActivePreview = (): ReactNode => {
		if (activePreview === 'none') return null;

		switch (activePreview) {
			case 'contacts':
				// Expanded contacts are rendered inline inside the Contacts box itself
				return null;
			case 'emailStructure':
				// No bottom popover for Email Structure
				return null;
			case 'draftPreview':
				// No bottom popover; uses inline expanded box like Contacts/Drafts
				return null;
			case 'drafts':
				// Expanded drafts are rendered inline inside the Drafts box itself
				return null;
			case 'sendPreview':
				// Expanded send preview is rendered inline inside the Send Preview box itself
				return null;
			case 'sent':
				// Expanded sent are rendered inline inside the Sent box itself
				return null;
			default:
				return null;
		}
	};

	// When in split mode (mobile landscape), render the expanded content on the left
	const renderLeftExpanded = (): ReactNode => {
		if (activePreview === 'none') return null;
		switch (activePreview) {
			case 'contacts':
				return (
					<ContactsExpandedList
						contacts={availableContacts}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('contacts'));
							}
						}}
						onDraftSelected={async (ids) => {
							if (props.onDraftSelectedContacts) await props.onDraftSelectedContacts(ids);
						}}
						isDraftDisabled={
							props.isGenerationDisabled ? props.isGenerationDisabled() : false
						}
						isPendingGeneration={props.isPendingGeneration}
					/>
				);
			case 'emailStructure':
				return (
					<EmailStructureExpandedBox
						form={form}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('emailStructure'));
							}
						}}
						onDraft={() => {}}
						isDraftDisabled={
							props.isGenerationDisabled ? props.isGenerationDisabled() : true
						}
						isPendingGeneration={props.isPendingGeneration}
						generationProgress={generationProgress}
						generationTotal={generationTotal}
						onCancel={() => {}}
					/>
				);
			case 'draftPreview':
				if (!showDraftPreviewBox) return null;
				return (
					<DraftPreviewExpandedList
						contacts={contacts}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('draftPreview'));
							}
						}}
						livePreview={{
							visible: props.isLivePreviewVisible,
							contactId: props.livePreviewContactId || null,
							subject: livePreviewSubject,
							message: props.livePreviewMessage || '',
						}}
						fallbackDraft={
							draftedEmails?.[0]
								? {
										contactId: draftedEmails[0].contactId,
										subject: draftedEmails[0].subject,
										message: draftedEmails[0].message,
								  }
								: null
						}
					/>
				);
			case 'drafts':
				return (
					<DraftsExpandedList
						drafts={draftedEmails}
						contacts={contacts}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('drafts'));
							}
						}}
						onSendingPreviewUpdate={({ contactId, subject }) => {
							setSendingPreviewContactId(contactId || null);
							setSendingPreviewSubject(subject || '');
						}}
						onSendingPreviewReset={() => {
							setSendingPreviewContactId(null);
							setSendingPreviewSubject('');
						}}
					/>
				);
			case 'sendPreview':
				if (!showSendPreviewBox) return null;
				return (
					<SendPreviewExpandedList
						contacts={contacts}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('sendPreview'));
							}
						}}
						livePreview={{
							visible: Boolean(sendingPreviewContactId && sendingInlineSubject),
							contactId: sendingPreviewContactId,
							subject: sendingInlineSubject,
						}}
						fallbackDraft={(() => {
							const match = sendingPreviewContactId
								? draftedEmails.find((e) => e.contactId === sendingPreviewContactId)
								: draftedEmails?.[0];
							return match
								? {
										contactId: match.contactId,
										subject: match.subject,
										message: match.message,
								  }
								: null;
						})()}
					/>
				);
			case 'sent':
				return (
					<SentExpandedList
						sent={sentEmails}
						contacts={contacts}
						onHeaderClick={() => {
							if (isPortraitMobile) {
								setActivePreview(selectFallbackPreview('sent'));
							}
						}}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div
			className={cn(
				isSplitLayout ? 'relative flex items-start mx-auto' : '',
				// When showing a left expanded panel in split layout, pad the wrapper on the left
				// so the wrapper's width reflects both panels. This allows mx-auto centering
				// of the entire combined unit (left expanded + right preview).
				isSplitLayout && activePreview !== 'none' ? 'pl-[388px]' : ''
			)}
		>
			{isSplitLayout && activePreview !== 'none' && (
				<div className="absolute left-3 top-3" data-left-expanded-panel>
					{renderLeftExpanded()}
				</div>
			)}
			<div
				className={cn(
					'w-[400px] max-[480px]:w-[96.27vw]',
					'rounded-lg max-[480px]:rounded-none',
					'border-2 border-black max-[480px]:border-0',
					'bg-[#EEF2F6] max-[480px]:bg-transparent',
					'overflow-visible font-inter',
					'origin-top-left',
					'scale-[0.85] max-[480px]:scale-100'
				)}
				data-drafting-preview-panel
			>
				<div
					className="h-[31px] bg-white rounded-t-lg px-3 flex items-center max-[480px]:hidden"
					data-drafting-preview-header
				>
					<div className="text-[14px] font-inter font-medium">Drafting</div>
					<div className="ml-auto">{headerRight}</div>
				</div>

				{isOpen && (
					<div className="p-3 max-[480px]:p-0">
						{/* Contacts */}
						<div className="mb-2">
							{activePreview === 'contacts' && !isSplitLayout ? (
								<ContactsExpandedList
									contacts={availableContacts}
									onHeaderClick={() =>
										setActivePreview(
											isPortraitMobile ? selectFallbackPreview('contacts') : 'none'
										)
									}
									onDraftSelected={async (ids) => {
										if (props.onDraftSelectedContacts)
											await props.onDraftSelectedContacts(ids);
									}}
									isDraftDisabled={
										props.isGenerationDisabled ? props.isGenerationDisabled() : false
									}
									isPendingGeneration={props.isPendingGeneration}
								/>
							) : (
								<div className="relative">
									{isSplitLayout && activePreview === 'contacts' && (
										<div
											className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
											aria-hidden="true"
										/>
									)}
									<div
										className={cn(
											'relative z-10 rounded-md border-2 border-black/30 font-sans',
											'bg-[#F5DADA] backdrop-blur-sm select-none transition-all',
											'w-[376px] max-[480px]:w-[96.27vw]'
										)}
									>
										<div
											className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
											style={{ height: '28px' }}
											onClick={() => setActivePreview('contacts')}
										>
											<span className="font-bold text-black text-sm">Contacts</span>
											<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full pr-2">
												<span>{`${String(contactsCount).padStart(2, '0')} ${
													contactsCount === 1 ? 'person' : 'people'
												}`}</span>
												<Divider />
												<button
													type="button"
													className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
													onClick={(e) => {
														e.stopPropagation();
														setActivePreview('contacts');
													}}
												>
													Select
												</button>
												<Divider />
												<button
													type="button"
													className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
													onClick={(e) => {
														e.stopPropagation();
														setActivePreview('draftPreview');
													}}
												>
													Draft
												</button>
											</div>
											<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
												<span className="w-[20px] text-center">1</span>
												<ArrowIcon />
											</div>
										</div>
										{isDrafting && (
											<div className="px-2 pb-2">
												<div className="mt-1">
													<div className="text-[10px] mb-0.5">Drafting</div>
													<div className="h-1.5 w-full rounded-sm border-2 border-black/20 bg-white">
														<div
															className="h-full bg-[#B5E2B5]"
															style={{ width: `${draftingPct}%` }}
														/>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Email Structure */}
						{activePreview === 'emailStructure' && !isSplitLayout ? (
							<EmailStructureExpandedBox
								form={form}
								onHeaderClick={() =>
									setActivePreview(
										isPortraitMobile ? selectFallbackPreview('emailStructure') : 'none'
									)
								}
								onDraft={() => {}}
								isDraftDisabled={
									props.isGenerationDisabled ? props.isGenerationDisabled() : true
								}
								isPendingGeneration={props.isPendingGeneration}
								generationProgress={generationProgress}
								generationTotal={generationTotal}
								onCancel={() => {}}
							/>
						) : (
							<div className="relative mb-2">
								{isSplitLayout && activePreview === 'emailStructure' && (
									<div
										className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
										aria-hidden="true"
									/>
								)}
								<div
									className="relative z-10 flex items-stretch rounded-lg border-2 border-black w-[376px] max-[480px]:w-[96.27vw] h-[32px] font-sans text-xs cursor-pointer overflow-hidden"
									onClick={() => setActivePreview('emailStructure')}
								>
									<div className="px-3 text-sm font-bold text-black bg-white flex items-center border-r border-black/40">
										<span className="whitespace-nowrap">Email Structure</span>
									</div>
									<div
										className="px-3 flex items-center border-r border-black/40 font-medium text-black/80 text-[11px]"
										style={draftingModeStyle}
									>
										<span className="whitespace-nowrap">{draftingMode}</span>
									</div>
									<div
										className="px-3 flex items-center border-r border-black/40 font-medium text-black/80 text-[11px]"
										style={subjectStyle}
									>
										<span className="whitespace-nowrap">
											{isAiSubject ? 'Auto Subject' : 'Subject'}
										</span>
									</div>
									<div className="px-3 bg-[#E0E0E0] flex items-center flex-grow font-medium text-black/80 text-[11px] min-w-0">
										<span className="truncate">{fromName || 'From'}</span>
									</div>
									<div className="bg-white flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
										<span className="w-[20px] text-center">2</span>
									</div>
								</div>
							</div>
						)}

						{/* Draft Preview */}
						{showDraftPreviewBox &&
							(activePreview === 'draftPreview' && !isSplitLayout ? (
								<DraftPreviewExpandedList
									contacts={contacts}
									onHeaderClick={() =>
										setActivePreview(
											isPortraitMobile ? selectFallbackPreview('draftPreview') : 'none'
										)
									}
									livePreview={{
										visible: props.isLivePreviewVisible,
										contactId: props.livePreviewContactId || null,
										subject: livePreviewSubject,
										message: props.livePreviewMessage || '',
									}}
									fallbackDraft={
										draftedEmails?.[0]
											? {
													contactId: draftedEmails[0].contactId,
													subject: draftedEmails[0].subject,
													message: draftedEmails[0].message,
											  }
											: null
									}
								/>
							) : (
								<div className="relative mb-2">
									{isSplitLayout && activePreview === 'draftPreview' && (
										<div
											className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
											aria-hidden="true"
										/>
									)}
									<div
										className={cn(
											'relative z-10 rounded-md border-2 border-[#295094] font-sans',
											'bg-[#B4CBF4] backdrop-blur-sm select-none transition-all',
											'w-[376px] max-[480px]:w-[96.27vw]'
										)}
									>
										<div
											className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
											style={{ height: '28px' }}
											onClick={() => setActivePreview('draftPreview')}
										>
											<span className="font-bold text-black text-sm">Draft Preview</span>
											<div className="ml-2 flex-1 min-w-0 self-stretch flex items-stretch">
												<div className="w-px self-stretch border-l border-black" />
												<div
													className="flex items-center bg-white w-full px-2"
													style={{ backgroundColor: '#FFFFFF' }}
												>
													{livePreviewContactName && (
														<>
															<div
																className="text-[12px] font-bold text-black truncate"
																title={livePreviewContactName}
															>
																{livePreviewContactName}
															</div>
															<div className="w-px self-stretch border-l border-black/40 mx-2" />
														</>
													)}
													<div
														className="text-[12px] text-black/80 truncate flex-1"
														title={livePreviewSubject}
													>
														{livePreviewSubject || <>&nbsp;</>}
													</div>
												</div>
												<div className="w-px self-stretch border-l border-black" />
											</div>
											<div className="self-stretch ml-auto flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 pl-2">
												<span className="w-[20px] text-center"></span>
												<ArrowIcon />
											</div>
										</div>
									</div>
								</div>
							))}

						{/* Drafts */}
						{activePreview === 'drafts' && !isSplitLayout ? (
							<DraftsExpandedList
								drafts={draftedEmails}
								contacts={contacts}
								onHeaderClick={() =>
									setActivePreview(
										isPortraitMobile ? selectFallbackPreview('drafts') : 'none'
									)
								}
								onSendingPreviewUpdate={({ contactId, subject }) => {
									setSendingPreviewContactId(contactId || null);
									setSendingPreviewSubject(subject || '');
								}}
								onSendingPreviewReset={() => {
									setSendingPreviewContactId(null);
									setSendingPreviewSubject('');
								}}
							/>
						) : (
							<div className="relative mb-2">
								{isSplitLayout && activePreview === 'drafts' && (
									<div
										className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
										aria-hidden="true"
									/>
								)}
								<div
									className={cn(
										'relative z-10 rounded-md border-2 border-black/30 font-sans',
										'bg-[#F4E5BC] backdrop-blur-sm select-none transition-all',
										'w-[376px] max-[480px]:w-[96.27vw]'
									)}
								>
									<div
										className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
										style={{ height: '28px' }}
										onClick={() => setActivePreview('drafts')}
									>
										<span className="font-bold text-black text-sm">Drafts</span>
										<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full pr-2">
											<span>{`${draftsCount} drafts`}</span>
											<Divider />
											<button
												type="button"
												className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
												onClick={(e) => {
													e.stopPropagation();
													setActivePreview('drafts');
												}}
											>
												Select
											</button>
											<Divider />
											<button
												type="button"
												className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
												onClick={(e) => {
													e.stopPropagation();
													setActivePreview('sendPreview');
												}}
											>
												Send
											</button>
										</div>
										<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
											<span className="w-[20px] text-center">3</span>
											<ArrowIcon />
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Send Preview */}
						{showSendPreviewBox &&
							(activePreview === 'sendPreview' && !isSplitLayout ? (
								<SendPreviewExpandedList
									contacts={contacts}
									onHeaderClick={() =>
										setActivePreview(
											isPortraitMobile ? selectFallbackPreview('sendPreview') : 'none'
										)
									}
									livePreview={{
										visible: Boolean(sendingPreviewContactId && sendingInlineSubject),
										contactId: sendingPreviewContactId,
										subject: sendingInlineSubject,
									}}
									fallbackDraft={(() => {
										const match = sendingPreviewContactId
											? draftedEmails.find((e) => e.contactId === sendingPreviewContactId)
											: draftedEmails?.[0];
										return match
											? {
													contactId: match.contactId,
													subject: match.subject,
													message: match.message,
											  }
											: null;
									})()}
								/>
							) : (
								<div className="relative mb-2">
									{isSplitLayout && activePreview === 'sendPreview' && (
										<div
											className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
											aria-hidden="true"
										/>
									)}
									<div
										className={cn(
											'relative z-10 rounded-md border-2 border-[#295094] font-sans',
											'bg-[#B4CBF4] backdrop-blur-sm select-none transition-all',
											'w-[376px] max-[480px]:w-[96.27vw]'
										)}
									>
										<div
											className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
											style={{ height: '28px' }}
											onClick={() => setActivePreview('sendPreview')}
										>
											<span className="font-bold text-black text-sm">Send Preview</span>
											<div className="ml-2 flex-1 min-w-0 self-stretch flex items-stretch">
												<div className="w-px self-stretch border-l border-black" />
												<div
													className="flex items-center bg-white w-full px-2"
													style={{ backgroundColor: '#FFFFFF' }}
												>
													{sendingPreviewContactName && (
														<>
															<div
																className="text-[12px] font-bold text-black truncate"
																title={sendingPreviewContactName}
															>
																{sendingPreviewContactName}
															</div>
															<div className="w-px self-stretch border-l border-black/40 mx-2" />
														</>
													)}
													<div
														className="text-[12px] text-black/80 truncate flex-1"
														title={sendingInlineSubject}
													>
														{sendingInlineSubject || <>&nbsp;</>}
													</div>
												</div>
												<div className="w-px self-stretch border-l border-black" />
											</div>
											<div className="self-stretch ml-auto flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 pl-2">
												<span className="w-[20px] text-center"></span>
												<ArrowIcon />
											</div>
										</div>
									</div>
								</div>
							))}

						{/* Sent */}
						{activePreview === 'sent' && !isSplitLayout ? (
							<SentExpandedList
								sent={sentEmails}
								contacts={contacts}
								onHeaderClick={() =>
									setActivePreview(
										isPortraitMobile ? selectFallbackPreview('sent') : 'none'
									)
								}
							/>
						) : (
							<div className="relative mb-2">
								{isSplitLayout && activePreview === 'sent' && (
									<div
										className="absolute -inset-1 rounded-none border-2 border-black/50 bg-[rgba(93,171,104,0.35)] z-0 pointer-events-none"
										aria-hidden="true"
									/>
								)}
								<div
									className={cn(
										'relative z-10 rounded-md border-2 border-black/30 font-sans',
										'bg-[#CFEBCF] backdrop-blur-sm select-none transition-all',
										'w-[376px] max-[480px]:w-[96.27vw]'
									)}
								>
									<div
										className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
										style={{ height: '28px' }}
										onClick={() => setActivePreview('sent')}
									>
										<span className="font-bold text-black text-sm">Sent</span>
										<div className="flex-1 flex items-center justify-center text-[11px] text-black/70 font-medium h-full">
											<span>{`${sentCount.toString().padStart(2, '0')} sent`}</span>
										</div>
										<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
											<span className="w-[20px] text-center">4</span>
											<ArrowIcon />
										</div>
									</div>
								</div>
							</div>
						)}

						{!isSplitLayout && renderActivePreview()}
					</div>
				)}
			</div>
		</div>
	);
};

export default DraftingStatusPanel;
