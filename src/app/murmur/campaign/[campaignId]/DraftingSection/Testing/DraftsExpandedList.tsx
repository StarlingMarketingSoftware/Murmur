'use client';

import { FC, MouseEvent, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { StripeSubscriptionStatus } from '@/types';
import { EmailStatus } from '@/constants/prismaEnums';
import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { cn } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';

export interface DraftsExpandedListProps {
	drafts: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
}

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

export const DraftsExpandedList: FC<DraftsExpandedListProps> = ({
	drafts,
	contacts,
	onHeaderClick,
}) => {
	const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	const [isSending, setIsSending] = useState(false);

	// Data/context for sending
	const { campaignId } = useParams() as { campaignId: string };
	const { data: campaign } = useGetCampaign(campaignId);
	const { user, subscriptionTier } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

	const handleDraftClick = (draftId: number, e: MouseEvent) => {
		if (e.shiftKey && lastClickedRef.current !== null) {
			// Prevent text selection on shift-click
			e.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = drafts.findIndex((d) => d.id === draftId);
			const lastIndex = drafts.findIndex((d) => d.id === lastClickedRef.current);
			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);
				const newSelected = new Set<number>();
				for (let i = start; i <= end; i++) {
					const id = drafts[i].id as number;
					newSelected.add(id);
				}
				setSelectedDraftIds(newSelected);
			}
		} else {
			setSelectedDraftIds((prev) => {
				const next = new Set(prev);
				if (next.has(draftId)) {
					next.delete(draftId);
				} else {
					next.add(draftId);
				}
				return next;
			});
			lastClickedRef.current = draftId ?? null;
		}
	};

	const areAllSelected = selectedDraftIds.size === drafts.length && drafts.length > 0;
	const handleSelectAllToggle = () => {
		if (areAllSelected) {
			setSelectedDraftIds(new Set());
		} else {
			setSelectedDraftIds(new Set(drafts.map((d) => d.id as number)));
		}
	};

	// Keep footer button disabled state in sync if used later
	const isSendDisabled = selectedDraftIds.size === 0 || isSending;

	const handleSendSelected = async () => {
		console.log('handleSendSelected called', { isSendDisabled, selectedDraftIds });
		if (isSendDisabled) return;
		const selectedDrafts = drafts.filter((d) => selectedDraftIds.has(d.id as number));
		console.log('Selected drafts:', selectedDrafts);
		if (selectedDrafts.length === 0) return;

		console.log('Campaign identity:', campaign?.identity);
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
		if (sendingCredits === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		const emailsWeCanSend = Math.min(selectedDrafts.length, sendingCredits);
		const emailsToProcess = selectedDrafts.slice(0, emailsWeCanSend);

		setIsSending(true);
		let successfulSends = 0;
		try {
			for (let i = 0; i < emailsToProcess.length; i++) {
				const email = emailsToProcess[i];
				try {
					// Find the contact email from the contacts array
					const contact = contacts.find((c) => c.id === email.contactId);
					const recipientEmail = email.contact?.email || contact?.email;

					if (!recipientEmail) {
						console.error('No recipient email found for draft:', email.id);
						continue;
					}

					const res = await sendMailgunMessage({
						subject: email.subject,
						message: email.message,
						recipientEmail: recipientEmail,
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
							data: { status: EmailStatus.sent, sentAt: new Date() },
						});
						successfulSends++;
					}
				} catch (err) {
					console.error('Failed to send email:', err);
				}
			}

			// Update user credits
			if (user && successfulSends > 0) {
				const newCreditBalance = Math.max(0, sendingCredits - successfulSends);
				await editUser({
					clerkId: user.clerkId,
					data: { sendingCredits: newCreditBalance },
				});
			}

			// Invalidate campaign and email queries
			await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			await queryClient.invalidateQueries({ queryKey: ['emails'] });

			// Clear selection and notify
			setSelectedDraftIds(new Set());
			if (successfulSends === selectedDrafts.length) {
				toast.success(`All ${successfulSends} emails sent successfully!`);
			} else if (successfulSends > 0) {
				if (emailsWeCanSend < selectedDrafts.length) {
					toast.warning(`Sent ${successfulSends} emails before running out of credits.`);
				} else {
					toast.warning(
						`${successfulSends} of ${selectedDrafts.length} emails sent successfully.`
					);
				}
			} else {
				toast.error('Failed to send emails. Please try again.');
			}
		} finally {
			setIsSending(false);
		}
	};
	return (
		<div
			className="w-[376px] h-[426px] rounded-md border-2 border-black/30 bg-[#F4E5BC] px-2 pb-2 flex flex-col"
			role="region"
			aria-label="Expanded drafts preview"
		>
			{/* Header row */}
			<div
				className={cn(
					'flex items-center gap-2 h-[21px] px-1',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				role={onHeaderClick ? 'button' : undefined}
				tabIndex={onHeaderClick ? 0 : undefined}
				onClick={onHeaderClick}
				onKeyDown={(e) => {
					if (!onHeaderClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onHeaderClick();
					}
				}}
			>
				<span className="font-bold text-black text-sm">Drafts</span>
				<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full">
					<span>{`${drafts.length} drafts`}</span>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => {
							e.stopPropagation();
							handleSelectAllToggle();
						}}
					>
						{areAllSelected ? 'Deselect All' : 'Select All'}
					</button>
					<div className="w-px self-stretch border-l border-black/40" />
					<button
						type="button"
						className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
						onClick={(e) => e.stopPropagation()}
					>
						Send
					</button>
				</div>
				<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
					<span className="w-[20px] text-center">3</span>
					<ArrowIcon />
				</div>
			</div>

			{/* Scrollable list */}
			<CustomScrollbar
				className="flex-1 drafting-table-content"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-5}
				contentClassName="overflow-x-hidden"
				alwaysShow
			>
				<div className="space-y-2 pb-2 flex flex-col items-center">
					{drafts.map((draft) => {
						const contact = contacts?.find((c) => c.id === draft.contactId);
						const contactName = contact
							? contact.name ||
							  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
							  contact.company ||
							  'Contact'
							: 'Unknown Contact';
						const isSelected = selectedDraftIds.has(draft.id as number);
						return (
							<div
								key={draft.id}
								className={cn(
									'cursor-pointer relative select-none w-full max-w-[356px] h-[64px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
									isSelected && 'bg-[#FFDF9F]'
								)}
								onMouseDown={(e) => {
									if (e.shiftKey) e.preventDefault();
								}}
								onClick={(e) => handleDraftClick(draft.id as number, e)}
							>
								{/* Fixed top-right info (Location + Title) - match Drafting tab */}
								<div className="absolute top-[6px] right-[28px] flex flex-col items-end gap-[2px] w-[92px] pointer-events-none">
									<div className="flex items-center justify-start gap-1 h-[11.67px] w-[92px]">
										{(() => {
											const fullStateName = (contact?.state as string) || '';
											const stateAbbr = getStateAbbreviation(fullStateName) || '';
											const normalizedState = fullStateName.trim();
											const lowercaseCanadianProvinceNames = canadianProvinceNames.map(
												(s) => s.toLowerCase()
											);
											const isCanadianProvince =
												lowercaseCanadianProvinceNames.includes(
													normalizedState.toLowerCase()
												) ||
												canadianProvinceAbbreviations.includes(
													normalizedState.toUpperCase()
												) ||
												canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
											const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

											if (!stateAbbr) return null;
											return isCanadianProvince ? (
												<div
													className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border overflow-hidden"
													style={{ borderColor: '#000000' }}
												>
													<CanadianFlag
														width="100%"
														height="100%"
														className="w-full h-full"
													/>
												</div>
											) : isUSAbbr ? (
												<span
													className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border text-[8px] leading-none font-bold"
													style={{
														backgroundColor:
															stateBadgeColorMap[stateAbbr] || 'transparent',
														borderColor: '#000000',
													}}
												>
													{stateAbbr}
												</span>
											) : (
												<span
													className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border"
													style={{ borderColor: '#000000' }}
												/>
											);
										})()}
										{contact?.city ? (
											<ScrollableText
												text={contact.city}
												className="text-[10px] text-black leading-none max-w-[70px]"
											/>
										) : null}
									</div>

									{contact?.headline ? (
										<div className="w-[92px] h-[10px] rounded-[3.71px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
											<ScrollableText
												text={contact.headline}
												className="text-[8px] text-black leading-none px-1"
											/>
										</div>
									) : null}
								</div>

								{/* Content grid */}
								<div className="grid grid-cols-1 grid-rows-4 h-full pr-[150px]">
									{/* Row 1: Name */}
									<div className="row-start-1 col-start-1 flex items-center">
										<div className="font-bold text-[11px] truncate leading-none">
											{contactName}
										</div>
									</div>
									{/* Row 2: Company (when separate name exists) */}
									{(() => {
										const hasSeparateName = Boolean(
											(contact?.name && contact.name.trim()) ||
												(contact?.firstName && contact.firstName.trim()) ||
												(contact?.lastName && contact.lastName.trim())
										);
										return (
											<div className="row-start-2 col-start-1 flex items-center pr-2">
												<div className="text-[11px] text-black truncate leading-none">
													{hasSeparateName ? contact?.company || '' : ''}
												</div>
											</div>
										);
									})()}
									{/* Row 3: Subject */}
									<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center">
										{draft.subject || 'No subject'}
									</div>
									{/* Row 4: Message preview */}
									<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center">
										{draft.message
											? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
											: 'No content'}
									</div>
								</div>
							</div>
						);
					})}
					{Array.from({ length: Math.max(0, 6 - drafts.length) }).map((_, idx) => (
						<div
							key={`draft-placeholder-${idx}`}
							className="select-none w-full max-w-[356px] h-[64px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2"
						/>
					))}
				</div>
			</CustomScrollbar>

			{/* Footer bar */}
			<button
				type="button"
				disabled={isSendDisabled}
				className={cn(
					'mt-2 w-full max-w-[356px] h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium',
					isSendDisabled && 'opacity-50 cursor-not-allowed'
				)}
				onClick={handleSendSelected}
			>
				{isSending ? 'Sending...' : 'Send Selected'}
			</button>
		</div>
	);
};

export default DraftsExpandedList;
