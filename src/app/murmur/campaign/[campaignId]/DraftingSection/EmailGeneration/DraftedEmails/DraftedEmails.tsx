import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DraftedEmailsProps, useDraftedEmails } from './useDraftedEmails';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { Button } from '@/components/ui/button';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import PreviewIcon from '@/components/atoms/_svg/PreviewIcon';
import CloseButtonIcon from '@/components/atoms/_svg/CloseButtonIcon';
import ApproveCheckIcon from '@/components/atoms/svg/ApproveCheckIcon';
import RejectXIcon from '@/components/atoms/svg/RejectXIcon';
import LeftArrowReviewIcon from '@/components/atoms/svg/LeftArrowReviewIcon';
import RightArrowReviewIcon from '@/components/atoms/svg/RightArrowReviewIcon';
import { getStateAbbreviation } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';

interface ScrollableTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	containerClassName?: string;
	thumbColor?: string;
	trackColor?: string;
	thumbWidth?: number;
	trackOffset?: number;
}

const ScrollableTextarea: FC<ScrollableTextareaProps> = ({
	containerClassName,
	thumbColor = '#000000',
	trackColor = 'transparent',
	thumbWidth = 2,
	trackOffset = 4,
	className,
	style,
	onScroll,
	...textareaProps
}) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const [thumbHeight, setThumbHeight] = useState(0);
	const [thumbTop, setThumbTop] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [scrollStartY, setScrollStartY] = useState(0);

	const updateScrollbar = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const { scrollTop, scrollHeight, clientHeight } = textarea;

		if (!clientHeight || scrollHeight <= clientHeight) {
			setThumbHeight((prev) => (prev !== 0 ? 0 : prev));
			setThumbTop(0);
			return;
		}

		const maxScrollTop = scrollHeight - clientHeight;
		const ratio = clientHeight / scrollHeight;
		const calculatedHeight = Math.max(ratio * clientHeight, 30);
		const maxThumbTop = clientHeight - calculatedHeight;
		const newThumbTop =
			maxThumbTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

		setThumbHeight(calculatedHeight);
		setThumbTop(newThumbTop);
	}, []);

	const handleTextareaScroll = useCallback(
		(event: React.UIEvent<HTMLTextAreaElement>) => {
			onScroll?.(event);
			updateScrollbar();
		},
		[onScroll, updateScrollbar]
	);

	useEffect(() => {
		updateScrollbar();
	}, [updateScrollbar, textareaProps.value]);

	useEffect(() => {
		if (typeof ResizeObserver === 'undefined') return;

		const textarea = textareaRef.current;
		if (!textarea) return;

		const resizeObserver = new ResizeObserver(updateScrollbar);
		resizeObserver.observe(textarea);

		return () => {
			resizeObserver.disconnect();
		};
	}, [updateScrollbar]);

	const handleThumbMouseDown = useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		setIsDragging(true);
		setDragStartY(event.clientY);
		const textarea = textareaRef.current;
		if (textarea) {
			setScrollStartY(textarea.scrollTop);
		}
	}, []);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (event: MouseEvent) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const { scrollHeight, clientHeight } = textarea;
			const maxScrollTop = scrollHeight - clientHeight;
			if (maxScrollTop <= 0) return;

			const maxThumbTravel = Math.max(clientHeight - thumbHeight, 1);
			const scrollRatio = maxScrollTop / maxThumbTravel;
			const deltaY = event.clientY - dragStartY;
			textarea.scrollTop = scrollStartY + deltaY * scrollRatio;
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [dragStartY, isDragging, scrollStartY, thumbHeight]);

	const handleTrackClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const textarea = textareaRef.current;
		if (!textarea || event.target !== event.currentTarget) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const clickY = event.clientY - rect.top;
		const { scrollHeight, clientHeight } = textarea;
		const maxScrollTop = scrollHeight - clientHeight;
		if (maxScrollTop <= 0) return;

		textarea.scrollTop = (clickY / clientHeight) * maxScrollTop;
	}, []);

	return (
		<div className={cn('relative h-full w-full', containerClassName)}>
			<textarea
				{...textareaProps}
				ref={textareaRef}
				className={cn('scrollbar-hide', className)}
				style={{
					...style,
					overflowY: 'auto',
					scrollbarWidth: 'none',
					msOverflowStyle: 'none',
					overscrollBehavior: 'contain',
					WebkitOverflowScrolling: 'touch',
					touchAction: 'pan-y',
				}}
				onScroll={handleTextareaScroll}
			/>
			{thumbHeight > 0 && (
				<div
					className="absolute top-0 bottom-0 cursor-pointer"
					style={{
						width: `${thumbWidth}px`,
						right: `${trackOffset}px`,
						backgroundColor: trackColor,
					}}
					onClick={handleTrackClick}
				>
					<div
						className="absolute left-0 cursor-grab active:cursor-grabbing"
						style={{
							width: `${thumbWidth}px`,
							height: `${thumbHeight}px`,
							transform: `translateY(${thumbTop}px)`,
							backgroundColor: thumbColor,
							borderRadius: thumbWidth / 2,
						}}
						onMouseDown={handleThumbMouseDown}
					/>
				</div>
			)}
		</div>
	);
};

export const DraftedEmails: FC<DraftedEmailsProps> = (props) => {
	const {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		handleDeleteDraft,
		contacts,
		selectedDraft,
		handleBack,
		handleSave,
		handleDraftSelect,
		handleDraftDoubleClick,
		isPendingUpdate,
		editedSubject,
		editedMessage,
		setEditedMessage,
		setEditedSubject,
		setSelectedDraft,
		selectedDraftIds,
		handleSelectAllDrafts,
	} = useDraftedEmails(props);
	const { onContactClick, onContactHover, onRegenerateDraft } = props;

	const [showConfirm, setShowConfirm] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	// Used contacts indicator
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);
	const filteredDrafts = useMemo(() => {
		if (props.statusFilter === 'approved') {
			return draftEmails.filter((d) => props.approvedDraftIds?.has(d.id));
		}
		if (props.statusFilter === 'rejected') {
			return draftEmails.filter((d) => props.rejectedDraftIds?.has(d.id));
		}
		return draftEmails;
	}, [draftEmails, props.approvedDraftIds, props.rejectedDraftIds, props.statusFilter]);
	const approvedCount = props.approvedDraftIds?.size ?? 0;
	const rejectedCount = props.rejectedDraftIds?.size ?? 0;
	const allFilteredSelected =
		filteredDrafts.length > 0 &&
		filteredDrafts.every((draft) => selectedDraftIds.has(draft.id));
	const selectedCount = selectedDraftIds.size;
	const hasSelection = selectedCount > 0;
	const toCount = selectedCount; // used in confirmation details
	const subjectPreview = useMemo(() => props.subject || '', [props.subject]);
	const hasDrafts = filteredDrafts.length > 0;

	const handleNavigateDraft = useCallback(
		(direction: 'previous' | 'next') => {
			if (!hasDrafts) return;

			const totalDrafts = draftEmails.length;
			const currentIndex = selectedDraft
				? draftEmails.findIndex((draft) => draft.id === selectedDraft.id)
				: -1;

			if (currentIndex === -1) {
				const fallbackIndex = direction === 'next' ? 0 : totalDrafts - 1;
				handleDraftDoubleClick(draftEmails[fallbackIndex]);
				return;
			}

			const nextIndex =
				direction === 'next'
					? (currentIndex + 1) % totalDrafts
					: (currentIndex - 1 + totalDrafts) % totalDrafts;

			handleDraftDoubleClick(draftEmails[nextIndex]);
		},
		[draftEmails, handleDraftDoubleClick, hasDrafts, selectedDraft]
	);

	const handleNavigatePrevious = useCallback(
		() => handleNavigateDraft('previous'),
		[handleNavigateDraft]
	);

	const handleNavigateNext = useCallback(
		() => handleNavigateDraft('next'),
		[handleNavigateDraft]
	);

	const handleRegenerate = useCallback(async () => {
		if (!selectedDraft || !onRegenerateDraft || isRegenerating) return;
		
		setIsRegenerating(true);
		try {
			const result = await onRegenerateDraft(selectedDraft);
			if (result) {
				// Update the local state with the regenerated content
				setEditedSubject(result.subject);
				setEditedMessage(result.message);
				// Also update the selectedDraft to reflect the new content
				setSelectedDraft((prev) => {
					if (!prev || prev.id !== selectedDraft.id) return prev;
					return {
						...prev,
						subject: result.subject,
						message: result.message,
					};
				});
			}
		} finally {
			setIsRegenerating(false);
		}
	}, [selectedDraft, onRegenerateDraft, isRegenerating, setEditedSubject, setEditedMessage, setSelectedDraft]);

	if (selectedDraft) {
		const contact = contacts?.find((c) => c.id === selectedDraft.contactId);
		const contactTitle = contact?.headline || contact?.title || '';
		// Check if we have a separate name (not just company)
		const hasName = Boolean(
			contact?.name?.trim() ||
			contact?.firstName?.trim() ||
			contact?.lastName?.trim()
		);
		const displayName = contact
			? contact.name?.trim() ||
			  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			  ''
			: '';
		const companyName = contact?.company || '';
		const fullStateName = (contact?.state as string) || '';
		const stateAbbr = getStateAbbreviation(fullStateName) || '';
		const normalizedState = fullStateName.trim();
		const lowercaseCanadianProvinceNames = canadianProvinceNames.map((s) => s.toLowerCase());
		const isCanadianProvince =
			lowercaseCanadianProvinceNames.includes(normalizedState.toLowerCase()) ||
			canadianProvinceAbbreviations.includes(normalizedState.toUpperCase()) ||
			canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
		const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);
		const isDraftApproved = props.approvedDraftIds?.has(selectedDraft.id) ?? false;
		const isDraftRejected = props.rejectedDraftIds?.has(selectedDraft.id) ?? false;
		const hasStatusBar = isDraftApproved || isDraftRejected;

		return (
			<div className="flex flex-col items-center">
				<div style={{ width: '499px', height: '703px', position: 'relative' }}>
				{/* Container box with header - matching the table view */}
				<div
					style={{
						width: '100%',
						height: '100%',
						border: '3px solid #000000',
						borderRadius: '8px',
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					{/* Header section with top rounded corners */}
					<div
						style={{
							borderTopLeftRadius: '8px',
							borderTopRightRadius: '8px',
							borderBottomWidth: '2px',
							borderBottomStyle: 'solid',
							borderBottomColor: '#000000',
							padding: '12px 16px',
							boxSizing: 'border-box',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							height: '48px',
							backgroundColor: 'white',
							position: 'relative',
						}}
					>
						{/* Close button */}
						<Button
							type="button"
							variant="ghost"
							onClick={handleBack}
							className="absolute top-1/2 -translate-y-1/2 right-2 p-1 h-auto w-auto hover:bg-gray-100 rounded z-10"
						>
							<CloseButtonIcon width={14} height={14} />
						</Button>
						<div style={{ 
							display: 'flex', 
							flexDirection: 'column', 
							justifyContent: 'center',
							height: '100%',
						}}>
							{hasName && companyName ? (
								<>
									<div className="font-inter font-bold text-black leading-none" style={{ fontSize: '17px' }}>
										{companyName}
									</div>
									<div className="font-inter font-normal text-black leading-none" style={{ fontSize: '11px', marginTop: '2px' }}>
										{displayName}
									</div>
								</>
							) : (
								<div className="font-inter font-bold text-black leading-none" style={{ fontSize: '17px' }}>
									{companyName || displayName || 'Unknown Contact'}
								</div>
							)}
						</div>
						<div
							className="flex flex-col items-start"
							style={{
								position: 'absolute',
								right: '63px',
								bottom: '7px',
								width: '152px',
							}}
						>
							<div
								className="flex items-center justify-start gap-2 w-full"
								style={{ marginBottom: contactTitle ? '2px' : 0 }}
							>
								{stateAbbr ? (
									isCanadianProvince ? (
										<div
											className="inline-flex items-center justify-center rounded-[4px] border border-black overflow-hidden flex-shrink-0"
											style={{ width: '28px', height: '15px' }}
											title="Canadian province"
										>
											<CanadianFlag width="100%" height="100%" className="w-full h-full" />
										</div>
									) : isUSAbbr ? (
										<span
											className="inline-flex items-center justify-center rounded-[4px] border text-[12px] leading-none font-bold flex-shrink-0"
											style={{
												width: '28px',
												height: '15px',
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												borderColor: '#000000',
											}}
										>
											{stateAbbr}
										</span>
									) : (
										<span
											className="inline-flex items-center justify-center rounded-[6px] border flex-shrink-0"
											style={{ width: '39px', height: '20px', borderColor: '#000000' }}
										/>
									)
								) : null}

								{contact?.city ? (
									<ScrollableText
										text={contact.city}
										className="text-[12px] font-inter text-black leading-none max-w-[160px]"
									/>
								) : null}
							</div>
							{contactTitle ? (
								<div
									className="rounded-[6px] border border-black bg-[#E8EFFF] px-2 flex items-center justify-start"
									style={{ width: '152px', height: '18px' }}
								>
									<ScrollableText
										text={contactTitle}
										className="text-[11px] font-inter text-black leading-none w-full"
									/>
								</div>
							) : null}
						</div>
					</div>

					{/* Approved status bar - 6px from header, 11px above subject box */}
					{isDraftApproved && (
						<div
							style={{
								backgroundColor: '#FFDC9E',
								paddingTop: '6px',
								paddingBottom: '11px',
							}}
						>
							<div
								style={{
									height: '30px',
									backgroundColor: '#8FC981',
									display: 'flex',
									alignItems: 'center',
									paddingLeft: '12px',
									borderTop: '2px solid #000000',
									borderBottom: '2px solid #000000',
									position: 'relative',
								}}
							>
								<span className="font-inter font-semibold text-[14px] text-black">
									Approved
								</span>
								<span 
									className="font-inter font-medium text-[14px] text-black" 
									style={{ 
										position: 'absolute', 
										left: '50%', 
										transform: 'translateX(-50%)',
										textAlign: 'center',
									}}
								>
									Send this Email
								</span>
								{/* Left divider - 54px from right edge (15px + 39px) */}
								<div
									style={{
										position: 'absolute',
										right: '54px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
								{/* Send button container - between the two dividers */}
								<button
									type="button"
									className="font-inter font-semibold text-[9px] text-black hover:bg-[#4a9d41] flex items-center justify-center"
									style={{
										position: 'absolute',
										right: '17px',
										width: '37px',
										height: '100%',
										backgroundColor: '#59B44E',
										border: 'none',
										cursor: props.isSendingDisabled ? 'not-allowed' : 'pointer',
										opacity: props.isSendingDisabled ? 0.6 : 1,
									}}
									disabled={props.isSendingDisabled}
									onClick={async () => {
										if (selectedDraft && !props.isSendingDisabled) {
											// Select only the current draft and send it
											props.setSelectedDraftIds(new Set([selectedDraft.id]));
											// Small delay to ensure state is updated before sending
											await new Promise((resolve) => setTimeout(resolve, 50));
											await props.onSend();
										}
									}}
								>
									Send
								</button>
								{/* Right divider - 15px from right edge */}
								<div
									style={{
										position: 'absolute',
										right: '15px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
							</div>
						</div>
					)}

					{/* Rejected status bar - 6px from header, 11px above subject box */}
					{isDraftRejected && (
						<div
							style={{
								backgroundColor: '#FFDC9E',
								paddingTop: '6px',
								paddingBottom: '11px',
							}}
						>
							<div
								style={{
									height: '30px',
									backgroundColor: '#E8A0A0',
									display: 'flex',
									alignItems: 'center',
									paddingLeft: '12px',
									borderTop: '2px solid #000000',
									borderBottom: '2px solid #000000',
									position: 'relative',
								}}
							>
								<span className="font-inter font-semibold text-[14px] text-black">
									Rejected
								</span>
								<span 
									className="font-inter font-medium text-[14px] text-black" 
									style={{ 
										position: 'absolute', 
										left: '50%', 
										transform: 'translateX(-50%)',
										textAlign: 'center',
									}}
								>
									Delete this Email
								</span>
								{/* Left divider - 54px from right edge (15px + 39px) */}
								<div
									style={{
										position: 'absolute',
										right: '54px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
								{/* Delete button container - between the two dividers */}
								<button
									type="button"
									className="font-inter font-semibold text-[9px] text-black hover:bg-[#c44a4a] flex items-center justify-center"
									style={{
										position: 'absolute',
										right: '17px',
										width: '37px',
										height: '100%',
										backgroundColor: '#D65C5C',
										border: 'none',
										cursor: isPendingDeleteEmail ? 'not-allowed' : 'pointer',
										opacity: isPendingDeleteEmail ? 0.6 : 1,
									}}
									disabled={isPendingDeleteEmail}
									onClick={async (e) => {
										if (selectedDraft) {
											await handleDeleteDraft(e, selectedDraft.id);
											setSelectedDraft(null);
										}
									}}
								>
									Delete
								</button>
								{/* Right divider - 15px from right edge */}
								<div
									style={{
										position: 'absolute',
										right: '15px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
							</div>
						</div>
					)}

					{/* Editor container */}
					<div
						className="flex-1 overflow-hidden flex flex-col relative"
						data-lenis-prevent
						style={{ margin: '0', border: 'none', padding: hasStatusBar ? '0 12px 12px 12px' : '6px 12px 12px 12px', borderBottomLeftRadius: '5px', borderBottomRightRadius: '5px', backgroundColor: '#FFDC9E' }}
					>
						{/* Subject input */}
						<div className="flex justify-center" style={{ marginBottom: '8px' }}>
							<input
								type="text"
								value={editedSubject}
								onChange={(e) => setEditedSubject(e.target.value)}
								className="font-inter text-[14px] font-extrabold bg-white border-2 border-black rounded-[4px] px-2 focus:outline-none focus:ring-0"
								style={{ width: '469px', height: '39px' }}
							/>
						</div>

						{/* Message editor - plain text */}
						<div className="flex justify-center flex-1">
							<div
								className="bg-white border-2 border-black rounded-[4px] overflow-hidden"
								style={{ width: '470px', height: hasStatusBar ? '531px' : '587px' }}
							>
								<ScrollableTextarea
									value={editedMessage}
									onChange={(e) => setEditedMessage(e.target.value)}
									className="w-full h-full p-3 text-sm resize-none focus:outline-none focus:ring-0 bg-transparent border-0 whitespace-pre-wrap"
									placeholder="Type your message here..."
									thumbWidth={2}
									thumbColor="#000000"
									trackOffset={4}
								/>
							</div>
						</div>

						{/* Save and Delete buttons - hidden for now */}
						<div className="hidden mt-3 flex justify-end gap-2">
							<Button
								type="button"
								onClick={handleSave}
								disabled={isPendingUpdate}
								className="w-[100px] font-secondary h-[20px] bg-primary/50 border border-primary rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-primary/60 hover:border-primary-dark active:bg-primary/70 transition-colors"
							>
								{isPendingUpdate ? '...' : 'Save'}
							</Button>
							<Button
								type="button"
								onClick={async (e) => {
									if (selectedDraft) {
										await handleDeleteDraft(e, selectedDraft.id);
										setSelectedDraft(null);
									}
								}}
								disabled={isPendingDeleteEmail}
								className="font-secondary w-[100px] h-[20px] bg-destructive/50 border border-destructive rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-destructive/60 hover:border-destructive-dark active:bg-destructive/70 transition-colors"
							>
								{isPendingDeleteEmail ? '...' : 'Delete'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		<div className="flex items-center" style={{ marginTop: '22px' }}>
			<button
				type="button"
				onClick={handleNavigatePrevious}
				disabled={!hasDrafts}
				aria-label="View previous draft"
				className="p-0 bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				style={{ marginRight: '20px' }}
			>
				<LeftArrowReviewIcon />
			</button>
			<div className="flex" style={{ gap: '13px' }}>
				<Button
					type="button"
					variant="ghost"
					className="font-secondary text-[14px] font-semibold text-black border-[2px] border-black rounded-none"
					style={{
						width: '124px',
						height: '40px',
						borderTopLeftRadius: '8px',
						borderBottomLeftRadius: '8px',
						backgroundColor: '#D5FFCB',
					}}
					onClick={() => {
						if (selectedDraft) {
							const isCurrentlyApproved = props.approvedDraftIds?.has(selectedDraft.id) ?? false;
							props.onApproveDraft?.(selectedDraft.id, isCurrentlyApproved);
							// Only navigate to next if we're approving, not toggling off
							if (!isCurrentlyApproved) {
								handleNavigateNext();
							}
						}
					}}
				>
					<span>Approve</span>
					<ApproveCheckIcon />
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="font-secondary text-[14px] font-semibold text-black border-[2px] border-black rounded-none"
					style={{
						width: '124px',
						height: '40px',
						backgroundColor: '#FFDC9E',
					}}
					onClick={handleRegenerate}
					disabled={isRegenerating || !onRegenerateDraft}
				>
					{isRegenerating ? (
						<Spinner size="small" />
					) : (
						'Regenerate'
					)}
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="font-secondary text-[14px] font-semibold text-black border-[2px] border-black rounded-none"
					style={{
						width: '124px',
						height: '40px',
						borderTopRightRadius: '8px',
						borderBottomRightRadius: '8px',
						backgroundColor: '#E17272',
					}}
					onClick={() => {
						if (selectedDraft) {
							const isCurrentlyRejected = props.rejectedDraftIds?.has(selectedDraft.id) ?? false;
							props.onRejectDraft?.(selectedDraft.id, isCurrentlyRejected);
							// Only navigate to next if we're rejecting, not toggling off
							if (!isCurrentlyRejected) {
								handleNavigateNext();
							}
						}
					}}
				>
					<span>Reject</span>
					<RejectXIcon />
				</Button>
			</div>
			<button
				type="button"
				onClick={handleNavigateNext}
				disabled={!hasDrafts}
				aria-label="View next draft"
				className="p-0 bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
				style={{ marginLeft: '20px' }}
			>
				<RightArrowReviewIcon />
			</button>
		</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 items-center">
			{/* Right table - Generated Drafts */}
			<DraftingTable
				handleClick={() => handleSelectAllDrafts(filteredDrafts)}
				areAllSelected={allFilteredSelected}
				hasData={draftEmails.length > 0}
				noDataMessage="No drafts generated"
				noDataDescription='Click "Generate Drafts" to create emails for the selected contacts'
				isPending={isPendingEmails}
				title="Drafts"
				goToWriting={props.goToWriting}
				goToSearch={props.goToSearch}
				goToInbox={props.goToInbox}
				selectedCount={selectedDraftIds.size}
				statusFilter={props.statusFilter}
				onStatusFilterChange={props.onStatusFilterChange}
				approvedCount={approvedCount}
				rejectedCount={rejectedCount}
				totalDraftsCount={draftEmails.length}
			>
				<>
					<div className="overflow-visible w-full flex flex-col items-center">
						{filteredDrafts.map((draft, idx) => {
							const contact = contacts?.find((c) => c.id === draft.contactId);
							const contactName = contact
								? contact.name ||
								  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';
							const isSelected = selectedDraftIds.has(draft.id);
							const prevDraft = filteredDrafts[idx - 1];
							const isPrevSelected = prevDraft && selectedDraftIds.has(prevDraft.id);
							const isRejected = props.rejectedDraftIds?.has(draft.id) ?? false;
							const isApproved = props.approvedDraftIds?.has(draft.id) ?? false;

							// Check if we have a separate name to decide layout
							const hasSeparateName = Boolean(
								(contact?.name && contact.name.trim()) ||
									(contact?.firstName && contact.firstName.trim()) ||
									(contact?.lastName && contact.lastName.trim())
							);

							const contactTitle = contact?.headline || contact?.title || '';
							
							// Determine spacing: if both this and previous are selected, use green connector, otherwise normal gap
							const showConnector = isSelected && isPrevSelected;
							
							// Check if next is selected for bottom cap
							const nextDraft = filteredDrafts[idx + 1];
							const isNextSelected = nextDraft && selectedDraftIds.has(nextDraft.id);
							
							// Caps for first/last in selection group
							const isFirstInGroup = isSelected && !isPrevSelected;
							const isLastInGroup = isSelected && !isNextSelected;
							
							// Colors based on tab
							const isRejectedTab = props.statusFilter === 'rejected';
							const selectedBgColor = isRejectedTab ? 'bg-[#D99696]' : 'bg-[#A4D996]';
							const connectorColor = isRejectedTab ? 'bg-[#A34C4C]' : 'bg-[#43A24C]';
							
							return (
								<>
									{/* Connector between adjacent selected items */}
									{showConnector && (
										<div
											key={`connector-${draft.id}`}
											className={cn("w-[499px] h-[10px]", connectorColor)}
										/>
									)}
									{/* Normal gap spacer when not showing connector */}
									{!showConnector && idx > 0 && (
										<div key={`spacer-${draft.id}`} className="h-[10px]" />
									)}
									<div
										key={draft.id}
										className={cn(
											'cursor-pointer relative select-none h-[97px] overflow-visible border-2 p-2 group/draft',
											isSelected
												? cn('w-[499px] rounded-none border-[#FFFFFF]', selectedBgColor)
												: 'w-[489px] rounded-[8px] bg-white border-[#000000] hover:bg-[#F9E5BA]'
										)}
									onMouseDown={(e) => {
										// Prevent text selection on shift-click
										if (e.shiftKey) {
											e.preventDefault();
										}
									}}
									onMouseEnter={() => {
										if (contact) {
											onContactHover?.(contact);
										}
									}}
									onMouseLeave={() => {
										onContactHover?.(null);
									}}
									onClick={() => {
										handleDraftDoubleClick(draft);
										if (contact) {
											onContactClick?.(contact);
										}
									}}
								>
									{/* Top cap - 6px above first selected in group */}
									{isFirstInGroup && (
										<div
											className={cn("absolute left-0 right-0 h-[6px] pointer-events-none", connectorColor)}
											style={{ top: '-8px' }}
										/>
									)}
									{/* Bottom cap - 6px below last selected in group */}
									{isLastInGroup && (
										<div
											className={cn("absolute left-0 right-0 h-[6px] pointer-events-none", connectorColor)}
											style={{ bottom: '-8px' }}
										/>
									)}
									{/* Used-contact indicator - 11px from top */}
									{usedContactIdsSet.has(draft.contactId) && (
										<span
											className="absolute"
											title="Used in a previous campaign"
											style={{
												left: isSelected ? '13px' : '8px',
												top: '11px',
												width: '16px',
												height: '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#DAE6FE',
											}}
										/>
									)}
									{/* Rejected indicator - stacked below used-contact when present */}
									{isRejected && (
										<span
											className="absolute"
											title="Marked for rejection"
											aria-label="Rejected draft"
											style={{
												left: isSelected ? '13px' : '8px',
												top: usedContactIdsSet.has(draft.contactId) ? '33px' : '11px',
												width: '16px',
												height: '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#A03C3C',
											}}
										/>
									)}
									{/* Approved indicator - stacked below used-contact when present */}
									{isApproved && (
										<span
											className="absolute"
											title="Marked for approval"
											aria-label="Approved draft"
											style={{
												left: isSelected ? '13px' : '8px',
												top: usedContactIdsSet.has(draft.contactId) ? '33px' : '11px',
												width: '16px',
												height: '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#69AF69',
											}}
										/>
									)}
									{/* Checkbox indicator - visible on hover only */}
									<span
										className="absolute hidden group-hover/draft:block cursor-pointer"
										style={{
											left: isSelected ? '15px' : '10px',
											bottom: '10px',
											width: '15px',
											height: '15px',
											borderRadius: '1px',
											border: isSelected ? '2px solid #FFFFFF' : '2px solid #676767',
											backgroundColor: isSelected ? '#22C21C' : 'transparent',
										}}
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											handleDraftSelect(draft, e);
										}}
										onDoubleClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
										}}
									/>
									{/* Delete button */}
									<Button
										type="button"
										variant="icon"
										onClick={(e) => handleDeleteDraft(e, draft.id)}
										className={cn("absolute top-[50px] p-1 transition-colors z-10 group hidden group-hover/draft:block", isSelected ? "right-[7px]" : "right-[2px]")}
									>
										<X size={16} className="text-gray-500 group-hover:text-red-500" />
									</Button>

									{/* Preview button */}
									<Button
										type="button"
										variant="icon"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (props.onPreview) {
												props.onPreview(draft);
											} else {
												handleDraftDoubleClick(draft);
											}
										}}
										className={cn("absolute top-[72px] p-1 transition-colors z-20 hidden group-hover/draft:block", isSelected ? "right-[7px]" : "right-[2px]")}
										aria-label="Preview draft"
									>
										<PreviewIcon
											width="16px"
											height="16px"
											pathClassName="fill-[#4A4A4A]"
										/>
									</Button>

									{/* Fixed top-right info (Title + Location) - matching contacts table design */}
									<div 
										className="absolute top-[6px] flex flex-col items-start gap-[2px] pointer-events-none"
										style={{ right: isSelected ? '9px' : '4px' }}
									>
										{contactTitle ? (
											<div className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden">
												<ScrollableText
													text={contactTitle}
													className="text-[10px] text-black leading-none"
													scrollPixelsPerSecond={60}
												/>
											</div>
										) : null}

										<div className="flex items-center justify-start gap-1 h-[20px]">
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
														className="inline-flex items-center justify-center rounded-[6px] border overflow-hidden flex-shrink-0"
														style={{
															width: '39px',
															height: '20px',
															borderColor: '#000000',
														}}
														title="Canadian province"
													>
														<CanadianFlag
															width="100%"
															height="100%"
															className="w-full h-full"
														/>
													</div>
												) : isUSAbbr ? (
													<span
														className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold flex-shrink-0"
														style={{
															width: '39px',
															height: '20px',
															backgroundColor:
																stateBadgeColorMap[stateAbbr] || 'transparent',
															borderColor: '#000000',
														}}
													>
														{stateAbbr}
													</span>
												) : (
													<span
														className="inline-flex items-center justify-center rounded-[6px] border flex-shrink-0"
														style={{
															width: '39px',
															height: '20px',
															borderColor: '#000000',
														}}
													/>
												);
											})()}
											{contact?.city ? (
												<ScrollableText
													text={contact.city}
													className="text-[12px] font-inter font-normal text-black leading-none"
												/>
											) : null}
										</div>
									</div>

									{/* Content flex column */}
									<div className={cn(
										"flex flex-col justify-center h-full gap-[2px]",
										isSelected ? "pl-[35px] pr-[35px]" : "pl-[30px] pr-[30px]"
									)}>
										{/* Row 1 & 2: Name / Company */}
										{(() => {
											const topRowMargin = contactTitle
												? 'mr-[220px]'
												: 'mr-[120px]';
											if (hasSeparateName) {
												return (
													<>
														{/* Name */}
														<div
															className={cn(
																'flex items-center min-h-[20px]',
																topRowMargin
															)}
														>
															<div className="text-[15px] font-inter font-semibold truncate leading-none">
																{contactName}
															</div>
														</div>
														{/* Company */}
														<div
															className={cn(
																'flex items-center min-h-[20px]',
																topRowMargin
															)}
														>
															<div className="text-[15px] font-inter font-medium text-black leading-tight line-clamp-2">
																{contact?.company || ''}
															</div>
														</div>
													</>
												);
											}

											// No separate name - Company (in contactName) spans 2 rows height
											return (
												<div
													className={cn(
														'flex items-center min-h-[42px] pb-[6px]',
														topRowMargin
													)}
												>
													<div className="text-[15px] font-inter font-medium text-black leading-tight line-clamp-2">
														{contactName}
													</div>
												</div>
											);
										})()}

										{/* Row 3: Subject */}
										<div className="flex items-center min-h-[14px]">
											<div className="text-[14px] font-inter font-semibold text-black truncate leading-none">
												{draft.subject || 'No subject'}
											</div>
										</div>

										{/* Row 4: Message preview */}
										<div className="flex items-center min-h-[14px]">
											<div className="text-[10px] text-gray-500 truncate leading-none">
												{draft.message
													? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
													: 'No content'}
											</div>
										</div>
									</div>
								</div>
							</>
						);
						})}
						{Array.from({ length: Math.max(0, 6 - filteredDrafts.length) }).map((_, idx) => (
							<>
								{(idx > 0 || filteredDrafts.length > 0) && (
									<div key={`placeholder-spacer-${idx}`} className="h-[10px]" />
								)}
								<div
									key={`draft-placeholder-${idx}`}
									className="select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#FFDC9E] p-2"
								/>
							</>
						))}
					</div>
				</>

				{isPendingDeleteEmail && (
					<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
						<Spinner size="small" />
					</div>
				)}
			</DraftingTable>
			{draftEmails.length > 0 && (
				<div className="w-[499px] flex flex-col gap-2">
					{/* Inline confirmation details */}
					<div className={cn('w-full', !showConfirm && 'hidden')}>
						<div
							className="grid w-full gap-x-3 gap-y-1 items-start"
							style={{ gridTemplateColumns: '120px 1fr' }}
						>
							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								To:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
								{toCount} emails selected
							</div>

							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								From:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
								{props.fromName || ''}
							</div>

							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								Return Address:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-all pl-1">
								{props.fromEmail || ''}
							</div>

							{subjectPreview && (
								<>
									<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
										Subject:
									</div>
									<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
										{subjectPreview}
									</div>
								</>
							)}
						</div>
					</div>

					<div className="relative w-[475px] h-[40px] mx-auto">
						{hasSelection ? (
							props.isSendingDisabled ? (
								<UpgradeSubscriptionDrawer
									triggerButtonText={
										showConfirm
											? 'Click to Confirm and Send'
											: hasSelection
											? `Send ${selectedCount} Selected`
											: 'Send'
									}
									buttonVariant="primary"
									className={cn(
										'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] !flex !items-center !justify-center',
										hasSelection
											? '!bg-[#C7F2C9] !border-[#349A37] hover:!bg-[#B9E7BC] cursor-pointer'
											: '!bg-[#E0E0E0] !border-[#A0A0A0] !cursor-not-allowed !opacity-60 pointer-events-none'
									)}
									message={
										props.isFreeTrial
											? `Your free trial subscription does not include the ability to send emails. To send the emails\'ve drafted, please upgrade your subscription to the paid version.`
											: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
									}
								/>
							) : (
								<div className="w-full h-full rounded-[4px] border-[3px] border-[#000000] flex overflow-hidden">
									<button
										type="button"
										className={cn(
											'flex-1 h-full flex items-center justify-center text-center text-black font-inter font-normal text-[17px] pl-[62px]',
											hasSelection
												? 'bg-[#FFDC9F] hover:bg-[#F4C87E] cursor-pointer'
												: 'bg-[#E0E0E0] cursor-not-allowed opacity-60'
										)}
										onClick={async () => {
											if (!hasSelection) return;
											if (!showConfirm) {
												setShowConfirm(true);
												setTimeout(() => setShowConfirm(false), 10000);
												return;
											}
											setShowConfirm(false);
											await props.onSend();
										}}
										disabled={!hasSelection}
									>
										{showConfirm
											? 'Click to Confirm and Send'
											: hasSelection
											? `Send ${selectedCount} Selected`
											: 'Send'}
									</button>

									{/* Right section "All" button */}
									<button
										type="button"
										className="w-[62px] h-full bg-[#C69A4D] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#B2863F] cursor-pointer border-l-[2px] border-[#000000]"
										onClick={(e) => {
											e.stopPropagation();
											handleSelectAllDrafts(filteredDrafts);
											setShowConfirm(true);
											setTimeout(() => setShowConfirm(false), 10000);
										}}
									>
										All
									</button>
								</div>
							)
						) : (
							<div className="w-full h-full flex items-center justify-center text-center text-[15px] font-inter text-black">
								Select Drafts and Send Emails
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};