'use client';

import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { cn, convertHtmlToPlainText } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

export interface DraftPreviewExpandedListProps {
	contacts: ContactWithName[];
	onHeaderClick?: () => void;
	// Live drafting preview data (streaming)
	livePreview?: {
		visible?: boolean;
		contactId?: number | null;
		subject?: string;
		message?: string;
	};
	// Fallback to the first drafted email if live preview not available
	fallbackDraft?: {
		contactId: number;
		subject?: string | null;
		message?: string | null;
	} | null;
	/** Custom width in pixels */
	width?: number;
	/** Custom height in pixels */
	height?: number;
}

export const DraftPreviewExpandedList: FC<DraftPreviewExpandedListProps> = ({
	contacts,
	onHeaderClick,
	livePreview,
	fallbackDraft,
	width = 376,
	height = 426,
}) => {
	// Layout spec (pixel-perfect):
	// - First divider line: 4px from top
	// - Identity bar: 40px tall (between the two divider lines)
	// - Subject box: 5px below the identity bar
	const TOP_DIVIDER_Y = 4;
	const STROKE_PX = 3;
	// Identity bar is 40px including its 3px bottom border (box-sizing: border-box)
	const IDENTITY_BAR_HEIGHT = 40;
	const IDENTITY_BAR_TOP = TOP_DIVIDER_Y + STROKE_PX;
	const SUBJECT_GAP_BELOW_IDENTITY = 5;
	const SUBJECT_BOX_HEIGHT = 46;
	const BODY_BOTTOM_GAP = 12;
	// Body marginTop = first divider (3px) + identity bar (40px) + gap (5px) = 48px
	// This places the subject box 5px below the identity bar's bottom border
	const BODY_TOP_MARGIN = STROKE_PX + IDENTITY_BAR_HEIGHT + SUBJECT_GAP_BELOW_IDENTITY;

	const useLive = Boolean(livePreview?.visible);

	const effectiveContactId = useMemo(() => {
		// If live preview is active and has a contact ID, use it.
		// Note: livePreview.contactId might be missing/null during initial stream start,
		// so we fall back to fallbackDraft if needed.
		if (useLive && livePreview?.contactId) {
			return livePreview.contactId;
		}
		// If live preview doesn't have an ID (or isn't active), use fallback.
		// This ensures we show the contact info even if the live stream hasn't sent the ID yet.
		return fallbackDraft?.contactId ?? 0;
	}, [useLive, livePreview?.contactId, fallbackDraft?.contactId]);

	// Determine if we're in an empty state (no content to display)
	const isEmpty = useMemo(() => {
		const hasLiveContent = livePreview?.visible && (livePreview?.message || livePreview?.subject);
		const hasFallbackContent = fallbackDraft?.message || fallbackDraft?.subject;
		return !hasLiveContent && !hasFallbackContent;
	}, [livePreview?.visible, livePreview?.message, livePreview?.subject, fallbackDraft?.message, fallbackDraft?.subject]);

	// Color spec:
	// - Identity strip: #E5EEFF
	// - Rest of the preview box: #BAD1FB
	const identityBg = '#E5EEFF';
	const outerBg = '#BAD1FB';
	const subjectAndBodyBg = '#FFFFFF';
	const draftWaveBaseBg = '#B6CCF6';

	const contact = useMemo(
		() => contacts.find((c) => c.id === effectiveContactId) || null,
		[contacts, effectiveContactId]
	);

	const contactName = useMemo(() => {
		if (!contact) return '';
		return (
			contact.name ||
			`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			contact.company ||
			''
		);
	}, [contact]);

	const showCompanyLine = useMemo(() => {
		if (!contact) return false;
		const hasName = Boolean(
			(contact.name && contact.name.trim()) ||
				(contact.firstName && contact.firstName.trim()) ||
				(contact.lastName && contact.lastName.trim())
		);
		return Boolean(contact.company && hasName);
	}, [contact]);

	const plainMessage = useMemo(() => {
		if (useLive) {
			const msg = (livePreview?.message || '').trim();
			return msg || 'Drafting...';
		}
		return convertHtmlToPlainText(fallbackDraft?.message || '');
	}, [useLive, livePreview?.message, fallbackDraft?.message]);

	// Check if message contains anchor tags - if so, render as HTML to show links
	const hasLinks = useMemo(() => {
		const messageToCheck = useLive ? livePreview?.message : fallbackDraft?.message;
		return /<a\s+[^>]*href=/i.test(messageToCheck || '');
	}, [useLive, livePreview?.message, fallbackDraft?.message]);

	// Get raw HTML message for rendering when links are present
	const rawHtmlMessage = useMemo(() => {
		if (useLive) {
			return livePreview?.message || '';
		}
		return fallbackDraft?.message || '';
	}, [useLive, livePreview?.message, fallbackDraft?.message]);

	const subjectLine = useMemo(() => {
		if (useLive) {
			return livePreview?.subject || '';
		}
		return fallbackDraft?.subject || '';
	}, [useLive, livePreview?.subject, fallbackDraft?.subject]);

	// Draft-loading wave state:
	// - Use the same staggered wave style as the Test Preview Panel, but with the blue palette.
	// - Apply wave when content is empty OR when the text matches the placeholder "Drafting..."
	const liveSubjectText = (livePreview?.subject || '').trim();
	const liveMessageText = (livePreview?.message || '').trim();
	const isDraftingPlaceholder = (text: string) => text.trim().toLowerCase() === 'drafting...';
	
	// Check if live content is "real" (not empty and not placeholder)
	const hasRealSubject = liveSubjectText.length > 0 && !isDraftingPlaceholder(liveSubjectText);
	const hasRealMessage = liveMessageText.length > 0 && !isDraftingPlaceholder(liveMessageText);
	
	// Wave if empty state (global) OR if in live mode but content isn't "real" yet
	const shouldWaveSubject = isEmpty || (useLive && !hasRealSubject);
	const shouldWaveBody = isEmpty || (useLive && !hasRealMessage);
	const shouldWaveIdentity = shouldWaveSubject || shouldWaveBody;
	const isWaveActive = shouldWaveIdentity;

	const stateAbbr = useMemo(() => {
		if (!contact?.state) return '';
		return getStateAbbreviation(contact.state) || '';
	}, [contact?.state]);

	return (
		<div
			className={cn(
				'max-[480px]:w-[96.27vw] rounded-md pb-2 flex flex-col relative border-[3px] border-black'
			)}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				backgroundColor: isWaveActive ? draftWaveBaseBg : outerBg,
			}}
			role="region"
			aria-label="Expanded draft preview"
		>
			{/* Section between the two divider lines - shows contact info */}
			<div
				className={cn(shouldWaveIdentity && 'draft-preview-blank-wave-identity')}
				style={{
					position: 'absolute',
					top: `${IDENTITY_BAR_TOP}px`,
					left: 0,
					right: 0,
					height: `${IDENTITY_BAR_HEIGHT}px`,
					backgroundColor: shouldWaveIdentity ? undefined : identityBg,
					borderBottom: `${STROKE_PX}px solid #000000`,
					boxSizing: 'border-box',
					display: 'flex',
					alignItems: 'center',
					paddingLeft: '10px',
					paddingRight: '10px',
				}}
			>
				{contact && (
					<div className="flex items-center justify-between w-full h-full">
						{/* Left side: Name and Company */}
						<div className="flex flex-col justify-center min-w-0 flex-1">
							<div className="font-inter font-bold text-[14px] leading-tight truncate">
								{contactName}
							</div>
							{showCompanyLine && (
								<div className="text-[11px] leading-tight truncate">
									{contact?.company}
								</div>
							)}
						</div>
						{/* Right side: State, City, Title */}
						<div className="flex flex-col items-start justify-center gap-[2px] flex-shrink-0 ml-2 h-full">
							<div className="flex items-center gap-1">
								{stateAbbr ? (
									<span
										className="inline-flex items-center justify-center font-inter font-normal leading-none"
										style={{
											width: '22px',
											height: '12px',
											borderRadius: '5px',
											border: '0.5px solid #000000',
											backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
											fontSize: '8px',
										}}
									>
										{stateAbbr}
									</span>
								) : null}
								{contact?.city ? (
									<span className="text-[11px] leading-none truncate max-w-[70px]">
										{contact.city}
									</span>
								) : null}
							</div>
							{contact?.title ? (
								<div
									className="px-1 flex items-center bg-[#E8EFFF] overflow-hidden"
									style={{
										maxWidth: '117px',
										height: '14px',
										borderRadius: '5px',
										border: '0.5px solid #000000',
									}}
								>
									<span
										className="font-inter font-normal leading-none truncate"
										style={{ fontSize: '9px' }}
									>
										{contact.title}
									</span>
								</div>
							) : null}
						</div>
					</div>
				)}
			</div>

			{/* Horizontal divider line - exactly 15px from top */}
			<div
				style={{
					position: 'absolute',
					top: `${TOP_DIVIDER_Y}px`,
					left: 0,
					right: 0,
					height: `${STROKE_PX}px`,
					backgroundColor: '#000000',
				}}
			/>

			{/* Second divider is now the borderBottom of the identity bar above */}

			{/* Header */}
			<div
				className={cn(
					'flex items-center gap-2 px-1',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				style={{ height: `${TOP_DIVIDER_Y}px` }}
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
				{/* Intentionally blank: remove "Draft Preview" label per UI spec */}
			</div>

			{/* Body - Direct rendering without DraftPreviewBox wrapper */}
			<div
				className="flex-1 flex flex-col items-center gap-2 overflow-hidden"
				style={{ marginTop: `${BODY_TOP_MARGIN}px` }}
			>
				{/* Email subject box - 8px below 2nd divider (44px + 8px = 52px from top) */}
				<div
					style={{
						width: `${width - 20}px`,
						height: `${SUBJECT_BOX_HEIGHT}px`,
						border: `${STROKE_PX}px solid #000000`,
						borderRadius: '6px',
						backgroundColor: shouldWaveSubject ? undefined : subjectAndBodyBg,
					}}
					className={cn(
						'overflow-hidden flex-shrink-0 flex items-center px-3',
						shouldWaveSubject && 'draft-preview-blank-wave-subject'
					)}
				>
					{!shouldWaveSubject && !isEmpty && (
						<span className="font-inter font-bold text-[14px] leading-tight truncate">
							{subjectLine || 'No subject'}
						</span>
					)}
				</div>

				{/* Draft body box */}
				<div
					style={{
						width: `${width - 20}px`,
						border: `${STROKE_PX}px solid #000000`,
						borderRadius: '6px',
						backgroundColor: shouldWaveBody ? undefined : subjectAndBodyBg,
						marginBottom: `${BODY_BOTTOM_GAP}px`,
					}}
					className={cn(
						'flex-1 overflow-hidden drafting-table-content',
						shouldWaveBody && 'draft-preview-blank-wave-body'
					)}
				>
					{!shouldWaveBody && !isEmpty && (
					<CustomScrollbar
						className="h-full"
						thumbWidth={2}
						thumbColor="#000000"
						trackColor="transparent"
						offsetRight={2}
						contentClassName="overflow-x-hidden"
						alwaysShow
						lockHorizontalScroll
					>
						{hasLinks ? (
							<div 
								className="p-3 text-[14px] leading-[1.6] draft-preview-content"
								style={{ wordBreak: 'break-word' }}
								dangerouslySetInnerHTML={{ __html: rawHtmlMessage || 'No content' }}
							/>
						) : (
							<div className="p-3 whitespace-pre-wrap text-[14px] leading-[1.6]">
								{plainMessage || 'No content'}
							</div>
						)}
					</CustomScrollbar>
				)}
				</div>
			</div>
		</div>
	);
};

export default DraftPreviewExpandedList;
