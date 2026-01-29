'use client';

import { FC, MouseEvent, useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import OpenIcon from '@/components/atoms/svg/OpenIcon';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

export interface DraftsExpandedListProps {
	drafts: EmailWithRelations[];
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	onOpenDrafts?: () => void;
	onSendingPreviewUpdate?: (args: { contactId: number; subject?: string }) => void;
	onSendingPreviewReset?: () => void;
	/**
	 * When true, renders only the header chrome (no rows) for ultra-compact bottom panel layouts.
	 */
	collapsed?: boolean;
	width?: number;
	height?: number;
	hideSendButton?: boolean;
	whiteSectionHeight?: number;
	rowWidth?: number;
	rowHeight?: number;
	rejectedDraftIds?: Set<number>;
	approvedDraftIds?: Set<number>;
	previewedDraftId?: number | null;
	/** When true, clicking a draft opens it in preview instead of selecting it */
	isPreviewMode?: boolean;
	/** Callback when a draft is clicked in preview mode */
	onDraftPreviewClick?: (draft: EmailWithRelations) => void;
}

const DraftsHeaderChrome: FC<{
	offsetY?: number;
	hasData?: boolean;
	isAllTab?: boolean;
	whiteSectionHeight?: number;
}> = ({ offsetY = 0, hasData = true, isAllTab = false, whiteSectionHeight }) => {
	const isBottomView = whiteSectionHeight === 15;
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#000000' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#EFDAAF' : '#FFAEAE';
	const dotSize = isBottomView ? 5 : isAllTab ? 6 : 9;
	const dot1Left = isBottomView ? 18 : 29;
	const dot2Left = isBottomView ? 110 : isAllTab ? 177.5 : 176;
	const dot3Left = isBottomView ? 146 : isAllTab ? 236.5 : 235;
	const pillWidth = isBottomView ? 40 : isAllTab ? 50 : 72;
	const midpointBetweenDots = (dot1Left + dot2Left) / 2;
	const pillLeft = midpointBetweenDots - pillWidth / 2;
	const pillHeight = isBottomView ? 10 : isAllTab ? 15 : 22;
	const pillBorderRadius = isBottomView ? 5 : isAllTab ? 7.5 : 11;
	const pillFontSize = isBottomView ? '8px' : isAllTab ? '10px' : '13px';
	// Add a tiny visual padding so the pill doesn't visually "kiss" the top border in tighter headers.
	const visualTopPaddingPx = 1;
	const pillTopBase = whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3;
	const pillTop = pillTopBase + offsetY + visualTopPaddingPx;
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
						marginTop: isAllTab ? '-1px' : 0,
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
	onOpenDrafts,
	onSendingPreviewUpdate,
	onSendingPreviewReset,
	collapsed = false,
	width = 376,
	height = 426,
	hideSendButton = false,
	whiteSectionHeight: customWhiteSectionHeight,
	rowWidth,
	rowHeight,
	rejectedDraftIds,
	approvedDraftIds,
	previewedDraftId,
	isPreviewMode = false,
	onDraftPreviewClick,
}) => {
	const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
	const lastClickedRef = useRef<number | null>(null);
	const [isSending, setIsSending] = useState(false);
	const draftRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	
	// Track whether the container is being hovered (for bottom view outline)
	const [isContainerHovered, setIsContainerHovered] = useState(false);
	
	// Track hovered draft index for keyboard navigation
	const [hoveredDraftIndex, setHoveredDraftIndex] = useState<number | null>(null);
	
	// Keyboard navigation: up/down arrows move hover between rows when hovering over the table
	const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
		// Only handle up/down arrows
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		
		// Only work if we have a hovered draft
		if (hoveredDraftIndex === null) return;
		
		// Check if a text input element is focused (don't intercept typing)
		const activeElement = document.activeElement;
		if (activeElement) {
			const tagName = activeElement.tagName.toLowerCase();
			if (
				tagName === 'input' ||
				tagName === 'textarea' ||
				(activeElement as HTMLElement).isContentEditable
			) {
				return;
			}
		}
		
		e.preventDefault();
		e.stopImmediatePropagation(); // Prevent campaign page tab navigation
		
		let newIndex: number;
		if (e.key === 'ArrowUp') {
			newIndex = hoveredDraftIndex > 0 ? hoveredDraftIndex - 1 : drafts.length - 1;
		} else {
			newIndex = hoveredDraftIndex < drafts.length - 1 ? hoveredDraftIndex + 1 : 0;
		}
		
		setHoveredDraftIndex(newIndex);
	}, [hoveredDraftIndex, drafts.length]);

	useEffect(() => {
		// Only add listener if we have a hovered draft
		if (hoveredDraftIndex === null) return;
		
		// Use capture phase to run before campaign page handler
		document.addEventListener('keydown', handleKeyboardNavigation, true);
		return () => {
			document.removeEventListener('keydown', handleKeyboardNavigation, true);
		};
	}, [hoveredDraftIndex, handleKeyboardNavigation]);

	// Scroll the previewed draft into view when it changes
	useEffect(() => {
		if (previewedDraftId == null) return;
		const rowEl = draftRowRefs.current.get(previewedDraftId);
		if (rowEl) {
			// Use 'auto' (instant) instead of 'smooth' so rapid key navigation works
			rowEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		}
	}, [previewedDraftId]);

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

	const handleDraftClick = (draft: EmailWithRelations, e: MouseEvent) => {
		if (isPreviewMode && onDraftPreviewClick) {
			onDraftPreviewClick(draft);
			return;
		}

		const draftId = draft.id as number;
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

	const isSendDisabled = selectedDraftIds.size === 0 || isSending;

	const isAllTab = height === 347;
	const whiteSectionHeight = customWhiteSectionHeight ?? (isAllTab ? 20 : 28);
	const isBottomView = customWhiteSectionHeight === 15;
	const resolvedRowWidth = rowWidth ?? 356;
	const resolvedRowHeight = rowHeight ?? 64;
	const hasCustomRowSize = Boolean(rowWidth || rowHeight);
	const isFullyEmpty = drafts.length === 0;
	const placeholderBgColor = isFullyEmpty ? '#FDCF7D' : '#FFDC9E';
	const horizontalPaddingClass = hasCustomRowSize
		? 'px-0'
		: isBottomView
		? 'px-0'
		: 'px-2';
	const verticalPaddingClass = isBottomView ? 'pt-0 pb-0' : 'pt-2 pb-2';

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
		if (onSendingPreviewReset) onSendingPreviewReset();
		let successfulSends = 0;
		try {
			for (let i = 0; i < emailsToProcess.length; i++) {
				const email = emailsToProcess[i];
				if (onSendingPreviewUpdate) {
					onSendingPreviewUpdate({
						contactId: email.contactId,
						subject: email.subject || undefined,
					});
				}
				try {
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
						replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
					});
					if (res.success) {
						await updateEmail({
							id: email.id.toString(),
							data: { status: EmailStatus.sent, sentAt: new Date() },
						});
						successfulSends++;
						if (onSendingPreviewReset) onSendingPreviewReset();
					}
				} catch (err) {
					console.error('Failed to send email:', err);
				}
			}

			// Update credits per user with this
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
				isBottomView
					? 'border-2 border-black'
					: isAllTab
					? 'border-[3px] border-black'
					: 'border-2 border-black/30'
			)}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				background: `linear-gradient(to bottom, #ffffff ${whiteSectionHeight}px, #FFDC9E ${whiteSectionHeight}px)`,
				...(isBottomView ? { cursor: 'pointer' } : {}),
			}}
			data-hover-description="Drafts: Emails you've generated but haven't sent yet. Select drafts to preview or send."
			role="region"
			aria-label="Expanded drafts preview"
			onMouseEnter={() => isBottomView && setIsContainerHovered(true)}
			onMouseLeave={() => isBottomView && setIsContainerHovered(false)}
			onClick={() => isBottomView && onOpenDrafts?.()}
		>
			{/* Hover outline for bottom view - 3px gap top/bottom, 2px gap sides, 4px thick */}
			{isBottomView && isContainerHovered && (
				<div
					style={{
						position: 'absolute',
						top: '-7px',
						bottom: '-7px',
						left: '-6px',
						right: '-6px',
						border: '4px solid #FCCF7E',
						borderRadius: 0,
						pointerEvents: 'none',
						zIndex: 50,
					}}
				/>
			)}
			<DraftsHeaderChrome isAllTab={isAllTab} whiteSectionHeight={customWhiteSectionHeight} />
			<div
				className={cn(
					'flex items-center gap-2 px-3 shrink-0',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				style={{ height: `${whiteSectionHeight}px` }}
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

			{(isAllTab || isBottomView) && (
				<div
					className="absolute z-20 flex items-center gap-[12px] cursor-pointer"
					style={{ top: isBottomView ? 1 : -1, right: isBottomView ? 4 : 4 }}
					onClick={onOpenDrafts}
					role={onOpenDrafts ? 'button' : undefined}
					tabIndex={onOpenDrafts ? 0 : undefined}
					onKeyDown={(e) => {
						if (!onOpenDrafts) return;
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onOpenDrafts();
						}
					}}
				>
					<span className={cn(
						"font-medium leading-none text-[#B3B3B3] font-inter",
						isBottomView ? "text-[8px]" : "text-[10px]"
					)}>
						Open
					</span>
					<div className="flex items-center" style={{ marginTop: isBottomView ? 0 : '1px' }}>
						<OpenIcon width={isBottomView ? 10 : undefined} height={isBottomView ? 10 : undefined} />
					</div>
				</div>
			)}

			{/* Selection counter and Select All row - absolutely positioned */}
			{!collapsed && isAllTab && (
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

			{!collapsed && (
				<div
					className={cn(
						'relative flex-1 flex flex-col min-h-0',
						horizontalPaddingClass,
						verticalPaddingClass
					)}
				>
					{/* Scrollable list */}
					<CustomScrollbar
						className="flex-1 drafting-table-content"
						thumbWidth={2}
						thumbColor={isBottomView ? 'transparent' : '#000000'}
						trackColor="transparent"
						offsetRight={isBottomView ? -7 : hasCustomRowSize ? -4 : -14}
						contentClassName="overflow-x-hidden"
						alwaysShow={!isBottomView && !isFullyEmpty}
					>
						<div
							className={cn(
								'flex flex-col items-center',
								isBottomView ? 'space-y-[5px] pb-0' : 'space-y-2 pb-2'
							)}
							style={{
								paddingTop:
									customWhiteSectionHeight !== undefined
										? '2px'
										: isAllTab
										? `${39 - whiteSectionHeight}px`
										: `${38 - whiteSectionHeight}px`,
							}}
							onMouseLeave={() => {
								setHoveredDraftIndex(null);
							}}
						>
						{drafts.map((draft, draftIndex) => {
							const contact = contacts?.find((c) => c.id === draft.contactId);
							const contactName = contact
								? contact.name ||
								  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';
							// having a totally different selection view logic for preview and selected, where preview will show the selected state
							const isSelected = !isPreviewMode && selectedDraftIds.has(draft.id as number);
							const isRejected = rejectedDraftIds?.has(draft.id as number) ?? false;
							const isApproved = approvedDraftIds?.has(draft.id as number) ?? false;
							const isPreviewed = previewedDraftId === draft.id;
							const contactTitle = contact?.headline || contact?.title || '';
							const indicatorLeftClass = isBottomView ? 'left-2' : 'left-[8px]';
							// Keyboard focus shows hover UI independently of mouse hover
							const isKeyboardFocused = hoveredDraftIndex === draftIndex;
							// Final background: previewed > selected > keyboard focus > white (mouse hover handled by CSS)
							const draftBgColor = isPreviewed
								? 'bg-[#FDDEA5]'
								: isSelected
									? 'bg-[#FFDF9F]'
									: isKeyboardFocused
										? 'bg-[#F9E5BA]'
										: 'bg-white hover:bg-[#F9E5BA]';
							return (
								<div
									key={draft.id}
									ref={(el) => {
										if (el) {
											draftRowRefs.current.set(draft.id as number, el);
										} else {
											draftRowRefs.current.delete(draft.id as number);
										}
									}}
									className={cn(
										'cursor-pointer relative select-none overflow-visible rounded-[8px] border-2 border-[#000000]',
										isBottomView
											? 'w-[224px] h-[28px]'
											: !hasCustomRowSize &&
											  'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]',
										!isBottomView && 'p-2',
										draftBgColor,
									)}
									style={
										isBottomView
											? undefined
											: {
													width: hasCustomRowSize ? `${resolvedRowWidth}px` : undefined,
													height: hasCustomRowSize ? `${resolvedRowHeight}px` : undefined,
											  }
									}
									onMouseDown={(e) => {
										if (e.shiftKey && !isPreviewMode) e.preventDefault();
									}}
									onMouseEnter={() => {
										setHoveredDraftIndex(draftIndex);
									}}
									onClick={(e) => handleDraftClick(draft, e)}
								>
									{/* Used-contact indicator - stacked above reject/approve when both present */}
									{usedContactIdsSet.has(draft.contactId) && (
										<span
											className={cn('absolute', indicatorLeftClass)}
											style={{
												top: (isRejected || isApproved) ? 'calc(50% - 16px)' : '50%',
												transform: (isRejected || isApproved) ? 'none' : 'translateY(-50%)',
												width: isBottomView ? '12px' : '13px',
												height: isBottomView ? '12px' : '13px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#DAE6FE',
											}}
										/>
									)}
									{/* Rejected indicator - stacked below used-contact when both present */}
									{isRejected && (
										<span
											className={cn('absolute', indicatorLeftClass)}
											title="Marked for rejection"
											aria-label="Rejected draft"
											style={{
												top: usedContactIdsSet.has(draft.contactId) ? 'calc(50% + 3px)' : '50%',
												transform: usedContactIdsSet.has(draft.contactId) ? 'none' : 'translateY(-50%)',
												width: isBottomView ? '12px' : '13px',
												height: isBottomView ? '12px' : '13px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#A03C3C',
											}}
										/>
									)}
									{isApproved && (
										<span
											className={cn('absolute', indicatorLeftClass)}
											title="Marked for approval"
											aria-label="Approved draft"
											style={{
												top: usedContactIdsSet.has(draft.contactId) ? 'calc(50% + 3px)' : '50%',
												transform: usedContactIdsSet.has(draft.contactId) ? 'none' : 'translateY(-50%)',
												width: isBottomView ? '12px' : '13px',
												height: isBottomView ? '12px' : '13px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#69AF69',
											}}
										/>
									)}
								{/* Fixed top-right info (Title + Location) - match Drafting tab */}
								<div
									className={cn(
										'absolute flex flex-col items-end pointer-events-none',
										isBottomView
											? 'top-[4px] right-[4px] gap-[1px] w-[90px]'
											: isAllTab
											? 'top-[4px] right-[8px] gap-[2px] w-[158px]'
											: 'top-[4px] right-[8px] gap-[2px] w-[169px]'
									)}
								>
									{/* Title row - on top */}
									{contactTitle ? (
										<div
											className={cn(
												'border border-black overflow-hidden flex items-center gap-0.5',
												isBottomView
													? 'h-[10px] rounded-[3px] px-1 w-full'
													: isAllTab
													? 'w-[158px] h-[15px] rounded-[5px] justify-center px-1'
													: 'w-[169px] h-[21px] rounded-[5px] justify-center px-2'
											)}
											style={{
												backgroundColor: isRestaurantTitle(contactTitle)
													? '#C3FBD1'
													: isCoffeeShopTitle(contactTitle)
														? '#D6F1BD'
														: isMusicVenueTitle(contactTitle)
															? '#B7E5FF'
															: isMusicFestivalTitle(contactTitle)
																? '#C1D6FF'
																: (isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle))
																	? '#FFF2BC'
																	: isWineBeerSpiritsTitle(contactTitle)
																		? '#BFC4FF'
																		: '#E8EFFF',
											}}
										>
											{isRestaurantTitle(contactTitle) && (
												<RestaurantsIcon size={isBottomView ? 7 : isAllTab ? 10 : 14} />
											)}
											{isCoffeeShopTitle(contactTitle) && (
												<CoffeeShopsIcon size={6} />
											)}
											{isMusicVenueTitle(contactTitle) && (
												<MusicVenuesIcon size={isBottomView ? 7 : isAllTab ? 10 : 14} className="flex-shrink-0" />
											)}
											{isMusicFestivalTitle(contactTitle) && (
												<FestivalsIcon size={isBottomView ? 7 : isAllTab ? 10 : 14} className="flex-shrink-0" />
											)}
											{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
												<WeddingPlannersIcon size={isBottomView ? 7 : isAllTab ? 10 : 14} />
											)}
											{isWineBeerSpiritsTitle(contactTitle) && (
												<WineBeerSpiritsIcon size={isBottomView ? 7 : isAllTab ? 10 : 14} className="flex-shrink-0" />
											)}
											{isBottomView ? (
												<span className="text-[7px] text-black leading-none truncate">
													{isRestaurantTitle(contactTitle)
														? 'Restaurant'
														: isCoffeeShopTitle(contactTitle)
															? 'Coffee Shop'
															: isMusicVenueTitle(contactTitle)
																? 'Music Venue'
																: isMusicFestivalTitle(contactTitle)
																	? 'Music Festival'
																	: isWeddingPlannerTitle(contactTitle)
																		? 'Wedding Planner'
																		: isWeddingVenueTitle(contactTitle)
																			? 'Wedding Venue'
																			: isWineBeerSpiritsTitle(contactTitle)
																				? getWineBeerSpiritsLabel(contactTitle)
																				: contactTitle}
												</span>
											) : (
												<ScrollableText
													text={
														isRestaurantTitle(contactTitle)
															? 'Restaurant'
															: isCoffeeShopTitle(contactTitle)
																? 'Coffee Shop'
																: isMusicVenueTitle(contactTitle)
																	? 'Music Venue'
																	: isMusicFestivalTitle(contactTitle)
																		? 'Music Festival'
																		: isWeddingPlannerTitle(contactTitle)
																			? 'Wedding Planner'
																			: isWeddingVenueTitle(contactTitle)
																				? 'Wedding Venue'
																				: isWineBeerSpiritsTitle(contactTitle)
																					? getWineBeerSpiritsLabel(contactTitle) ?? contactTitle
																					: contactTitle
													}
													className="text-[11px] text-black leading-none"
												/>
											)}
										</div>
									) : null}

									{/* Location row - below title */}
									<div
										className={cn(
											'flex items-center justify-start',
											isBottomView
												? 'gap-0.5 h-[10px] w-[90px]'
												: isAllTab
												? 'gap-1 h-[14px] w-[158px]'
												: 'gap-1 h-[19px] w-[169px]'
										)}
									>
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
													className={cn(
														'inline-flex items-center justify-center border overflow-hidden',
														isBottomView
															? 'w-[20px] h-[10px] rounded-[2px]'
															: isAllTab
															? 'w-[27px] h-[14px] rounded-[4px]'
															: 'w-[29px] h-[19px] rounded-[4px]'
													)}
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
													className={cn(
														'inline-flex items-center justify-center border leading-none font-bold',
														isBottomView
															? 'w-[20px] h-[10px] rounded-[2px] text-[7px]'
															: isAllTab
															? 'w-[27px] h-[14px] rounded-[4px] text-[9px]'
															: 'w-[29px] h-[19px] rounded-[4px] text-[10px]'
													)}
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
													className={cn(
														'inline-flex items-center justify-center border',
														isBottomView
															? 'w-[20px] h-[10px] rounded-[2px]'
															: isAllTab
															? 'w-[27px] h-[14px] rounded-[4px]'
															: 'w-[29px] h-[19px] rounded-[4px]'
													)}
													style={{ borderColor: '#000000' }}
												/>
											);
										})()}
										{contact?.city ? (
											isBottomView ? (
												<span className="text-[7px] text-black leading-none truncate max-w-[50px]">
													{contact.city}
												</span>
											) : (
												<ScrollableText
													text={contact.city}
													className="text-[11px] text-black leading-none max-w-[130px]"
												/>
											)
										) : null}
									</div>
								</div>

									{/* Content grid */}
									{isBottomView ? (
										/* Bottom view: compact layout matching Contacts bottom view (no subject/body) */
										<div className="grid grid-cols-1 grid-rows-2 h-full pr-[95px] pl-[22px]">
											{/* Row 1: Name */}
											<div className="flex items-center h-[12px] overflow-hidden">
												<div
													className="font-bold text-[9px] leading-none whitespace-nowrap overflow-hidden w-full pr-1"
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{contactName}
												</div>
											</div>
											{/* Row 2: Company */}
											<div className="flex items-center h-[12px] overflow-hidden">
												{(() => {
													const hasSeparateName = Boolean(
														(contact?.name && contact.name.trim()) ||
															(contact?.firstName && contact.firstName.trim()) ||
															(contact?.lastName && contact.lastName.trim())
													);
													return (
														<div
															className="text-[8px] text-black leading-none whitespace-nowrap overflow-hidden w-full pr-1"
															style={{
																WebkitMaskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
																maskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
															}}
														>
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													);
												})()}
											</div>
										</div>
									) : (
										/* Normal view: 4-row layout */
										<div
											className={cn(
												"grid grid-cols-1 grid-rows-4 h-full pl-[22px]",
												// In the All tab, only the top rows need to reserve space for the fixed
												// top-right badges. Subject/body should be able to use the full right side.
												isAllTab ? "pr-2" : "pr-[180px]"
											)}
										>
											{/* Row 1: Name */}
											<div
												className={cn(
													"row-start-1 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]",
													isAllTab && "pr-[170px]"
												)}
											>
												<div
													className="font-bold text-[11px] leading-none whitespace-nowrap overflow-hidden w-full pr-2"
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
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
													<div
														className={cn(
															"row-start-2 col-start-1 flex items-center h-[16px] max-[480px]:h-[12px]",
															isAllTab && "pr-[170px]"
														)}
													>
														<div
															className="text-[11px] text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2"
															style={{
																WebkitMaskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
																maskImage:
																	'linear-gradient(90deg, #000 96%, transparent 100%)',
															}}
														>
															{hasSeparateName ? contact?.company || '' : ''}
														</div>
													</div>
												);
											})()}
											{/* Row 3: Subject */}
											<div
												className={cn(
													"row-start-3 col-span-1 flex items-start h-[16px] max-[480px]:h-[12px] max-[480px]:items-start max-[480px]:-mt-[2px]",
													isAllTab ? "pt-[5px]" : "mt-[4px]"
												)}
											>
												<div
													className={cn(
														"text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2 font-bold",
														isAllTab ? "text-[9px]" : "text-[10px]"
													)}
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{draft.subject || 'No subject'}
												</div>
											</div>
											{/* Row 4: Message preview */}
											<div
												className={cn(
													"row-start-4 col-span-1 flex items-start h-[16px] max-[480px]:h-[12px]",
													isAllTab && "pt-[2px]"
												)}
											>
												<div
													className={cn(
														"text-gray-500 leading-none whitespace-nowrap overflow-hidden w-full pr-2",
														isAllTab ? "text-[9px]" : "text-[10px]"
													)}
													style={{
														WebkitMaskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
														maskImage:
															'linear-gradient(90deg, #000 96%, transparent 100%)',
													}}
												>
													{draft.message ? draft.message.replace(/<[^>]*>/g, '') : 'No content'}
												</div>
											</div>
										</div>
									)}
								</div>
							);
						})}
						{Array.from({
							length: Math.max(
								0,
								(isBottomView ? 3 : isPreviewMode ? 5 : 4) - drafts.length
							),
						}).map((_, idx) => (
							<div
								key={`draft-placeholder-${idx}`}
								className={cn(
									'select-none overflow-hidden rounded-[8px] border-2 border-[#000000]',
									isBottomView
										? 'w-[224px] h-[28px]'
										: !hasCustomRowSize &&
										  'w-full max-w-[356px] max-[480px]:max-w-none h-[64px] max-[480px]:h-[50px]',
									!isBottomView && 'p-2'
								)}
								style={
									isBottomView
										? { backgroundColor: placeholderBgColor }
										: {
												backgroundColor: placeholderBgColor,
												width: hasCustomRowSize ? `${resolvedRowWidth}px` : undefined,
												height: hasCustomRowSize ? `${resolvedRowHeight}px` : undefined,
										  }
								}
							/>
						))}
						</div>
					</CustomScrollbar>
				</div>
			)}

			{!collapsed && !hideSendButton && (
				<div className="flex justify-center w-full mt-2">
					<button
						type="button"
						disabled={isSendDisabled}
						className={cn(
							'w-full max-w-[356px] max-[480px]:max-w-none h-[26px] rounded-[6px] bg-[#B5E2B5] border border-black flex items-center justify-center text-[12px] font-medium',
							isSendDisabled && 'opacity-50 cursor-not-allowed',
							isBottomView && 'w-[225px] max-w-none'
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
