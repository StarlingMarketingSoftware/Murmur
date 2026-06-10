'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import {
	getInboxMessageSnippet,
	normalizeInboxEmailAddress,
	type InboxConversation,
} from '@/utils/inboxConversations';
import type { OpportunityStatus } from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { MobileSearchCategoryPill } from './MobileCampaignSearchHeader';

// Panel salmon matches the Write-tab supplemental row fill used across the campaign UI.
const SUMMARY_PANEL_FILL = '#EB8586';
const CONVERSATION_TOP_BAR_FILL = '#85A7F4';
const CONVERSATION_BODY_FILL = '#D6E2FF';
const DRAFT_TOP_BAR_FILL = '#FFE3AA';
const DRAFT_BODY_FILL = '#FFF8E7';

export type MobileSummarySection = 'conversations' | 'drafts' | 'contacts';

export type MobileSummaryScrollRequest = {
	section: MobileSummarySection;
	requestId: number;
};

const resolveConversationContact = (
	conversation: InboxConversation,
	contactByEmail?: Record<string, ContactWithName>
): ContactWithName | null => {
	const message = conversation.latestInboundMessage ?? conversation.latestMessage;
	const senderKey = normalizeInboxEmailAddress(message.sender);
	if (senderKey && contactByEmail?.[senderKey]) return contactByEmail[senderKey];
	return (message.contact as ContactWithName | null) ?? null;
};

const getContactDisplayName = (
	contact: ContactWithName | null,
	fallbackName?: string | null,
	fallbackEmail?: string | null
): string => {
	const personName =
		contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	return (
		personName ||
		contact?.company ||
		fallbackName?.trim() ||
		fallbackEmail?.trim() ||
		'Unknown'
	);
};

// Name/company + category/state grid shared by all three card kinds.
const SummaryCardIdentityRow: FC<{
	name: string;
	company: string;
	headline: string;
	state: string;
}> = ({ name, company, headline, state }) => {
	const stateAbbr = getStateAbbreviation(state || '') || '';
	return (
		<div className="flex items-start justify-between gap-2 min-w-0">
			<div className="flex flex-col min-w-0 flex-1">
				<span className="font-inter text-[16px] font-bold text-black leading-[1.25] truncate">
					{name}
				</span>
				{company && (
					<span className="font-inter text-[14px] text-black leading-[1.25] truncate">
						{company}
					</span>
				)}
			</div>
			<div className="flex flex-col items-end gap-[4px] flex-shrink-0 w-[46%]">
				{headline ? (
					<MobileSearchCategoryPill headline={headline} />
				) : (
					<div className="h-[17px]" />
				)}
				{(stateAbbr || state) && (
					<div className="flex items-center gap-1 w-full min-w-0">
						{stateAbbr && (
							<span
								className="inline-flex items-center justify-center w-[30px] h-[18px] rounded-[5px] border border-black text-[11px] leading-none font-bold flex-shrink-0"
								style={{
									backgroundColor: stateBadgeColorMap[stateAbbr] || '#FFF6E3',
								}}
							>
								{stateAbbr}
							</span>
						)}
						<span className="font-inter text-[13px] text-black leading-none truncate">
							{state}
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

const SummaryPreviewLines: FC<{ subject: string; preview: string }> = ({
	subject,
	preview,
}) => (
	<div className="flex flex-col mt-[6px] min-w-0">
		{subject && (
			<span className="font-inter text-[13px] font-semibold text-black leading-[1.35] truncate">
				{subject}
			</span>
		)}
		{preview && (
			<span className="font-inter text-[13px] text-black leading-[1.35] truncate">
				{preview}
			</span>
		)}
	</div>
);

interface MobileCampaignSummaryProps {
	/** Ongoing conversations (≥1 inbound reply), recency desc. */
	conversations: InboxConversation[];
	/** Campaign draft emails, recency desc. */
	drafts: EmailWithRelations[];
	/** Contacts with no conversation and no draft, recency desc. */
	plainContacts: ContactWithName[];
	/** Conversations classified as opportunities (key → status). */
	opportunityStatusByKey: Map<string, OpportunityStatus>;
	/** Campaign contacts indexed by normalized email for canonical names. */
	contactByEmail?: Record<string, ContactWithName>;
	scrollRequest: MobileSummaryScrollRequest | null;
	onOpenConversation: (key: string) => void;
	onOpenDraft: (draftId: number) => void;
	/** Floating "+" → back to the Search view. */
	onGoToSearch: () => void;
	className?: string;
}

export const MobileCampaignSummary: FC<MobileCampaignSummaryProps> = ({
	conversations,
	drafts,
	plainContacts,
	opportunityStatusByKey,
	contactByEmail,
	scrollRequest,
	onOpenConversation,
	onOpenDraft,
	onGoToSearch,
	className,
}) => {
	const [segment, setSegment] = useState<'messages' | 'opportunities'>('messages');
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const conversationsRef = useRef<HTMLDivElement | null>(null);
	const draftsRef = useRef<HTMLDivElement | null>(null);
	const contactsRef = useRef<HTMLDivElement | null>(null);
	const [isScrolled, setIsScrolled] = useState(false);

	const isEmpty =
		conversations.length === 0 && drafts.length === 0 && plainContacts.length === 0;

	// Header pill scroll requests: jump to the section anchor (always from the
	// Messages segment — Opportunities hides drafts/contacts entirely).
	useEffect(() => {
		if (!scrollRequest) return;
		setSegment('messages');
		const refBySection = {
			conversations: conversationsRef,
			drafts: draftsRef,
			contacts: contactsRef,
		} as const;
		// Wait a frame so the Messages segment is rendered before scrolling.
		const frame = requestAnimationFrame(() => {
			refBySection[scrollRequest.section].current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		});
		return () => cancelAnimationFrame(frame);
	}, [scrollRequest]);

	const visibleConversations =
		segment === 'opportunities'
			? conversations.filter((conversation) =>
					opportunityStatusByKey.has(conversation.key)
				)
			: conversations;

	return (
		<div className={cn('relative flex flex-col min-h-0', className)}>
			<div
				className="flex-1 min-h-0 rounded-[12px] border-2 border-black flex flex-col overflow-hidden"
				style={{ backgroundColor: SUMMARY_PANEL_FILL }}
			>
				<div
					ref={scrollContainerRef}
					className="flex-1 min-h-0 overflow-y-auto px-[10px] py-[10px]"
					style={{ WebkitOverflowScrolling: 'touch' }}
					onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 80)}
				>
					{/* Messages | Opportunities segmented bar */}
					<div className="flex h-[44px] rounded-[10px] border-2 border-black overflow-hidden mb-[10px]">
						<button
							type="button"
							onClick={() => setSegment('messages')}
							className="flex-1 flex items-center justify-center font-inter text-[15px] font-semibold text-black border-r border-black/40"
							style={{
								backgroundColor: segment === 'messages' ? '#A8C4FA' : '#CFDDFC',
							}}
						>
							Messages
						</button>
						<button
							type="button"
							onClick={() => setSegment('opportunities')}
							className="flex-1 flex items-center justify-center gap-1.5 font-inter text-[15px] font-semibold text-black"
							style={{
								backgroundColor: segment === 'opportunities' ? '#A8C4FA' : '#CFDDFC',
							}}
						>
							<span className="text-[#E14B4B] text-[16px] leading-none">✷</span>
							Opportunities
						</button>
					</div>

					{/* Conversations (ongoing first) */}
					<div ref={conversationsRef} className="flex flex-col gap-[10px]">
						{visibleConversations.map((conversation) => {
							const contact = resolveConversationContact(conversation, contactByEmail);
							const latest = conversation.latestMessage;
							const inbound = conversation.latestInboundMessage ?? latest;
							return (
								<button
									key={conversation.key}
									type="button"
									onClick={() => onOpenConversation(conversation.key)}
									className="w-full text-left rounded-[10px] border-2 border-black overflow-hidden"
									style={{ backgroundColor: CONVERSATION_BODY_FILL }}
								>
									<div
										className="h-[14px] w-full"
										style={{ backgroundColor: CONVERSATION_TOP_BAR_FILL }}
									/>
									<div className="px-3 pt-[7px] pb-[9px]">
										<SummaryCardIdentityRow
											name={getContactDisplayName(
												contact,
												inbound.senderName,
												inbound.sender
											)}
											company={contact?.company || ''}
											headline={contact?.headline || contact?.title || ''}
											state={contact?.state || ''}
										/>
										<SummaryPreviewLines
											subject={inbound.subject || latest.subject || ''}
											preview={getInboxMessageSnippet(latest)}
										/>
									</div>
								</button>
							);
						})}
						{segment === 'opportunities' && visibleConversations.length === 0 && (
							<div className="font-inter text-[13px] text-black text-center py-6">
								No opportunities yet
							</div>
						)}
					</div>

					{segment === 'messages' && (
						<>
							{/* Drafts */}
							<div
								ref={draftsRef}
								className={cn(
									'flex flex-col gap-[10px]',
									visibleConversations.length > 0 && 'mt-[10px]'
								)}
							>
								{drafts.map((draft) => {
									const contact = draft.contact as ContactWithName;
									return (
										<button
											key={draft.id}
											type="button"
											onClick={() => onOpenDraft(draft.id)}
											className="w-full text-left rounded-[10px] border-2 border-black overflow-hidden"
											style={{ backgroundColor: DRAFT_BODY_FILL }}
										>
											<div className="flex">
												<div
													className="h-[14px] w-[38%] rounded-br-[6px]"
													style={{ backgroundColor: DRAFT_TOP_BAR_FILL }}
												/>
											</div>
											<div className="px-3 pt-[3px] pb-[9px]">
												<SummaryCardIdentityRow
													name={getContactDisplayName(contact, null, contact?.email)}
													company={contact?.company || ''}
													headline={contact?.headline || contact?.title || ''}
													state={contact?.state || ''}
												/>
												<SummaryPreviewLines
													subject={draft.subject || ''}
													preview={(draft.message || '')
														.replace(/<[^>]*>/g, ' ')
														.replace(/\s+/g, ' ')
														.trim()}
												/>
											</div>
										</button>
									);
								})}
							</div>

							{/* Plain contacts */}
							<div
								ref={contactsRef}
								className={cn(
									'flex flex-col gap-[10px]',
									(visibleConversations.length > 0 || drafts.length > 0) && 'mt-[10px]'
								)}
							>
								{plainContacts.map((contact) => (
									<div
										key={contact.id}
										className="w-full rounded-[10px] border-2 border-black bg-[#F7F8FA] px-3 py-[9px]"
									>
										<SummaryCardIdentityRow
											name={getContactDisplayName(contact, null, contact.email)}
											company={contact.company || ''}
											headline={contact.headline || contact.title || ''}
											state={contact.state || ''}
										/>
									</div>
								))}
							</div>

							{isEmpty && (
								<div className="font-inter text-[14px] text-black text-center py-10">
									No contacts yet — search the map to add some.
								</div>
							)}
						</>
					)}

					{/* Spacer so the floating "+" never covers the last card */}
					<div className="h-[64px]" aria-hidden="true" />
				</div>
			</div>

			{/* Floating "+" back to Search (revealed on scroll; always shown when empty) */}
			{(isScrolled || isEmpty) && (
				<button
					type="button"
					aria-label="Back to search"
					onClick={onGoToSearch}
					className="absolute bottom-[14px] left-1/2 -translate-x-1/2 w-[62%] h-[52px] rounded-[12px] border-2 border-black flex items-center justify-center"
					style={{ backgroundColor: SUMMARY_PANEL_FILL }}
				>
					<span className="font-inter text-[28px] font-medium text-black leading-none">
						+
					</span>
				</button>
			)}
		</div>
	);
};
