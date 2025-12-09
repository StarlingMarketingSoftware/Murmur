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
	const useLive = Boolean(
		livePreview?.visible && (livePreview?.message || livePreview?.subject)
	);

	// Special hack for "All" tab: if height is exactly 347px, we apply a thicker 3px border
	// to match the other elements in that layout. Otherwise standard 2px border.
	const isAllTab = height === 347;

	const effectiveContactId = useMemo(() => {
		return (
			(useLive ? livePreview?.contactId || undefined : fallbackDraft?.contactId) ?? 0
		);
	}, [useLive, livePreview?.contactId, fallbackDraft?.contactId]);

	// Determine if we're in an empty state (no content to display)
	const isEmpty = useMemo(() => {
		const hasLiveContent = livePreview?.visible && (livePreview?.message || livePreview?.subject);
		const hasFallbackContent = fallbackDraft?.message || fallbackDraft?.subject;
		return !hasLiveContent && !hasFallbackContent;
	}, [livePreview?.visible, livePreview?.message, livePreview?.subject, fallbackDraft?.message, fallbackDraft?.subject]);

	// Background color for inner boxes - blue when empty, white when has content
	const innerBoxBg = isEmpty ? '#B6E2FF' : 'white';
	// Outer container background - darker blue when empty, lighter when has content
	const outerBg = isEmpty ? '#BAD1FB' : '#B6E2FF';

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

	const subjectLine = useMemo(() => {
		if (useLive) {
			return livePreview?.subject || '';
		}
		return fallbackDraft?.subject || '';
	}, [useLive, livePreview?.subject, fallbackDraft?.subject]);

	const stateAbbr = useMemo(() => {
		if (!contact?.state) return '';
		return getStateAbbreviation(contact.state) || '';
	}, [contact?.state]);

	return (
		<div
			className={cn(
				'max-[480px]:w-[96.27vw] rounded-md pb-2 flex flex-col relative',
				isAllTab ? 'border-[3px] border-black' : 'border-2 border-black/30'
			)}
			style={{ width: `${width}px`, height: `${height}px`, backgroundColor: outerBg }}
			role="region"
			aria-label="Expanded draft preview"
		>
			{/* Section between the two divider lines - shows contact info */}
			<div
				style={{
					position: 'absolute',
					top: '15px',
					left: 0,
					right: 0,
					height: '29px',
					backgroundColor: innerBoxBg,
					display: 'flex',
					alignItems: 'center',
					paddingLeft: '10px',
					paddingRight: '10px',
				}}
			>
				{!isEmpty && (
					<div className="flex items-center justify-between w-full h-full">
						{/* Left side: Name and Company */}
						<div className="flex flex-col justify-center min-w-0 flex-1">
							<div className="font-inter font-bold text-[12px] leading-tight truncate">
								{contactName}
							</div>
							{showCompanyLine && (
								<div className="text-[10px] leading-tight truncate">
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
											width: '18px',
											height: '11px',
											borderRadius: '3px',
											border: '0.5px solid #000000',
											backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
											fontSize: '8px',
										}}
									>
										{stateAbbr}
									</span>
								) : null}
								{contact?.city ? (
									<span className="text-[8px] leading-none truncate max-w-[50px]">
										{contact.city}
									</span>
								) : null}
							</div>
							{contact?.title ? (
								<div
									className="px-1 flex items-center bg-[#E8EFFF] overflow-hidden"
									style={{
										maxWidth: '100px',
										height: '11px',
										borderRadius: '3px',
										border: '0.5px solid #000000',
									}}
								>
									<span
										className="font-inter font-normal leading-none truncate"
										style={{ fontSize: '7px' }}
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
					top: '15px',
					left: 0,
					right: 0,
					height: '1px',
					backgroundColor: '#000000',
				}}
			/>

			{/* Second horizontal divider line - 29px below the first (44px from top) */}
			<div
				style={{
					position: 'absolute',
					top: '44px',
					left: 0,
					right: 0,
					height: '1px',
					backgroundColor: '#000000',
				}}
			/>

			{/* Header */}
			<div
				className={cn(
					'flex items-center gap-2 h-[15px] px-1',
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
				<span className="font-inter font-semibold text-black text-[8px]">Draft Preview</span>
			</div>

			{/* Body - Direct rendering without DraftPreviewBox wrapper */}
			<div
				className="flex-1 flex flex-col items-center gap-2 overflow-hidden"
				style={{ marginTop: '37px' }}
			>
				{/* Email subject box - 8px below 2nd divider (44px + 8px = 52px from top) */}
				<div
					style={{
						width: `${width - 20}px`,
						height: '33px',
						border: '2px solid #000000',
						borderRadius: '6px',
						backgroundColor: innerBoxBg,
					}}
					className="overflow-hidden flex-shrink-0 flex items-center px-3"
				>
					{!isEmpty && (
						<span className="font-inter font-bold text-[13px] leading-tight truncate">
							{subjectLine || 'No subject'}
						</span>
					)}
				</div>

				{/* Draft body box */}
				<div
					style={{
						width: `${width - 20}px`,
						border: '2px solid #000000',
						borderRadius: '6px',
						backgroundColor: innerBoxBg,
					}}
					className="flex-1 overflow-hidden drafting-table-content"
				>
					{!isEmpty && (
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
						<div className="p-3 whitespace-pre-wrap text-[11px] leading-[1.4]">
							{plainMessage || 'No content'}
						</div>
					</CustomScrollbar>
				)}
				</div>
			</div>
		</div>
	);
};

export default DraftPreviewExpandedList;
