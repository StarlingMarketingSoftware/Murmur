'use client';

import { FC, MouseEvent, useMemo, useRef, useState } from 'react';
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
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';

export interface DraftsExpandedListProps {
	drafts: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	// Live Send Preview callbacks for status panel
	onSendingPreviewUpdate?: (args: { contactId: number; subject?: string }) => void;
	onSendingPreviewReset?: () => void;
	/** Custom width in pixels */
	width?: number;
	/** Custom height in pixels */
	height?: number;
	/** When true, hides the footer send button */
	hideSendButton?: boolean;
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

const DraftsHeaderChrome: FC<{ offsetY?: number; hasData?: boolean; isAllTab?: boolean }> = ({
	offsetY = 0,
	hasData = true,
	isAllTab = false,
}) => {
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#000000' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#EFDAAF' : '#FFAEAE';
	const dotSize = isAllTab ? 6 : 9;
	// First dot is 29px from the left
	const dot1Left = 29;
	const dot2Left = isAllTab ? 177.5 : 176;
	const dot3Left = isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isAllTab ? 50 : 72;
	// Center pill between first and second dots
	const midpointBetweenDots = (dot1Left + dot2Left) / 2;
	const pillLeft = midpointBetweenDots - pillWidth / 2;
	const pillHeight = isAllTab ? 15 : 22;
	const pillBorderRadius = isAllTab ? 7.5 : 11;
	const pillFontSize = isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop = 3 + offsetY;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot1Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${pillLeft}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: pillBgColor,
					border: `2px solid ${pillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: pillTextColor, 
						fontSize: pillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						marginTop: isAllTab ? '-1px' : 0 // Optical alignment adjustment
					}}
				>
					Drafts
				</span>
			</div>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot3Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
		</>
	);
};

export const DraftsExpandedList: FC<DraftsExpandedListProps> = ({
	drafts,
	contacts,
	onHeaderClick,
	onSendingPreviewUpdate,
	onSendingPreviewReset,
	width = 376,
	height = 426,
	hideSendButton = false,
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

	// Used contacts indicator
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

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

	// Special hack for "All" tab: if height is exactly 347px, we apply a thicker 3px border
	// to match the other elements in that layout. Otherwise standard 2px border.
	const isAllTab = height === 347;
	const whiteSectionHeight = isAllTab ? 20 : 28;

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
		// Initialize status panel Send Preview
		if (onSendingPreviewReset) onSendingPreviewReset();
		let successfulSends = 0;
		try {
			for (let i = 0; i < emailsToProcess.length; i++) {
				const email = emailsToProcess[i];
				// Update Send Preview row live with current email
				if (onSendingPreviewUpdate) {
					onSendingPreviewUpdate({
						contactId: email.contactId,
						subject: email.subject || undefined,
					});
				}
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
						// Hide Send Preview immediately after this email is sent
						if (onSendingPreviewReset) onSendingPreviewReset();
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
			// Clear live Send Preview in status panel
			if (onSendingPreviewReset) onSendingPreviewReset();
		}
	};
	return (
		<div
			className={cn(
				'relative max-[480px]:w-[96.27vw] rounded-md flex flex-col overflow-visible',
				isAllTab ? 'border-[3px] border-black' : 'border-2 border-black/30'
			)}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				background: `linear-gradient(to bottom, #ffffff ${whiteSectionHeight}px, #FFDC9E ${whiteSectionHeight}px)`,
			}}
			role="region"
			aria-label="Expanded drafts preview"
		>
			{/* Header row (no explicit divider; let the background change from white to yellow like the main table) */}
			<DraftsHeaderChrome isAllTab={isAllTab} />
			<div
				className={cn(
					'flex items-center gap-2 h-[28px] px-3 shrink-0',
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
			></div>

			{/* Selection counter and Select All row - absolutely positioned */}
			{isAllTab && (
				<div
					className="absolute flex items-center justify-center px-2 z-10"
					style={{ top: '22px', left: 0, right: 0, height: '14px' }}
				>
					<span
						className="font-inter font-medium text-[10px] text-black"
						style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
					>
						{selectedDraftIds.size} Selected
					</span>
					<span
						className="font-inter font-medium text-[10px] text-black cursor-pointer hover:underline"
						style={{ position: 'absolute', right: '10px' }}
						onClick={handleSelectAllToggle}
					>
						Select All
					</span>
				</div>
			)}

			<div className="relative flex-1 flex flex-col pb-2 pt-2 min-h-0 px-2">
				{/* Scrollable list */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-14}
					contentClassName="overflow-x-hidden"
					alwaysShow
				>
					<div 
						className="space-y-2 pb-2 flex flex-col items-center"
						style={{ paddingTop: isAllTab ? '3px' : `${38 - whiteSectionHeight}px` }}
					>
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
									'cursor-pointer relative select-none w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
									isSelected && 'bg-[#FFDF9F]'
								)}
								onMouseDown={(e) => {
									if (e.shiftKey) e.preventDefault();
								}}
								onClick={(e) => handleDraftClick(draft.id as number, e)}
							>
								{/* Used-contact indicator - vertically centered */}
								{usedContactIdsSet.has(draft.contactId) && (
									<span
										className="absolute left-[8px]"
										title="Used in a previous campaign"
										style={{
											top: '50%',
											transform: 'translateY(-50%)',
											width: '16px',
											height: '16px',
											borderRadius: '50%',
											border: '1px solid #000000',
											backgroundColor: '#DAE6FE',
										}}
									/>
								)}
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
								<div className="grid grid-cols-1 grid-rows-4 h-full pr-[150px] pl-[22px]">
									{/* Row 1: Name */}
									<div className="row-start-1 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]">
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
											<div className="row-start-2 col-start-1 flex items-center pr-2 h-[16px] max-[480px]:h-[12px]">
												<div className="text-[11px] text-black truncate leading-none">
													{hasSeparateName ? contact?.company || '' : ''}
												</div>
											</div>
										);
									})()}
									{/* Row 3: Subject */}
									<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px] max-[480px]:items-start max-[480px]:-mt-[2px]">
										{draft.subject || 'No subject'}
									</div>
									{/* Row 4: Message preview */}
									<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center h-[16px] max-[480px]:h-[12px]">
										{draft.message
											? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
											: 'No content'}
									</div>
								</div>
							</div>
						);
					})}
					{Array.from({ length: Math.max(0, 4 - drafts.length) }).map((_, idx) => (
						<div
							key={`draft-placeholder-${idx}`}
							className="select-none w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2"
						/>
					))}
				</div>
			</CustomScrollbar>
			</div>

			{/* Footer bar */}
			{!hideSendButton && (
				<div className="flex justify-center w-full mt-2">
					<button
						type="button"
						disabled={isSendDisabled}
						className={cn(
							'w-full max-w-[356px] max-[480px]:max-w-none h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium',
							isSendDisabled && 'opacity-50 cursor-not-allowed'
						)}
						onClick={handleSendSelected}
					>
						{isSending ? 'Sending...' : 'Send Selected'}
					</button>
				</div>
			)}
		</div>
	);
};

export default DraftsExpandedList;
