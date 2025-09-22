'use client';

import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { cn, convertHtmlToPlainText } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';

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

export const DraftPreviewExpandedList: FC<DraftPreviewExpandedListProps> = ({
	contacts,
	onHeaderClick,
	livePreview,
	fallbackDraft,
}) => {
	const useLive = Boolean(
		livePreview?.visible && (livePreview?.message || livePreview?.subject)
	);

	const effectiveContactId = useMemo(() => {
		return (
			(useLive ? livePreview?.contactId || undefined : fallbackDraft?.contactId) ?? 0
		);
	}, [useLive, livePreview?.contactId, fallbackDraft?.contactId]);

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

	const stateAbbr = useMemo(() => {
		if (!contact?.state) return '';
		return getStateAbbreviation(contact.state) || '';
	}, [contact?.state]);

	return (
		<div
			className="w-[376px] h-[426px] rounded-md border-2 border-black/30 bg-[#B4CBF4] px-2 pb-2 flex flex-col"
			role="region"
			aria-label="Expanded draft preview"
		>
			{/* Header */}
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
				<span className="font-bold text-black text-sm">Draft Preview</span>
				<div className="self-stretch ml-auto flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 pl-2">
					<span className="w-[20px] text-center"></span>
					<ArrowIcon />
				</div>
			</div>

			{/* Body - Direct rendering without DraftPreviewBox wrapper */}
			<div className="flex-1 flex flex-col items-center gap-2 pt-2 overflow-hidden">
				{/* Contact info box */}
				<div
					style={{
						width: '356px',
						height: '38px',
						border: '2px solid #000000',
						borderRadius: '6px',
						backgroundColor: 'white',
					}}
					className="overflow-hidden flex-shrink-0"
				>
					<div className="grid grid-cols-[1fr_auto] gap-2 h-full px-2 py-[2px] items-center">
						<div className="flex flex-col justify-center">
							<div className="font-inter font-bold text-[13px] leading-4 truncate">
								{contactName}
							</div>
							<div className="text-[11px] leading-4 truncate">
								{showCompanyLine ? contact?.company : ''}
							</div>
						</div>
						<div className="flex flex-col items-start gap-0.5 overflow-hidden">
							<div className="flex items-center gap-2 w-full">
								{stateAbbr ? (
									<span
										className="inline-flex items-center justify-center font-inter font-normal leading-none"
										style={{
											width: '22px',
											height: '13px',
											borderRadius: '3px',
											border: '0.5px solid #000000',
											backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
											fontSize: '10px',
										}}
									>
										{stateAbbr}
									</span>
								) : null}
								{contact?.city ? (
									<span className="text-[9px] leading-none truncate max-w-[70px]">
										{contact.city}
									</span>
								) : null}
							</div>
							{contact?.headline ? (
								<div
									className="px-2 flex items-center bg-[#E8EFFF] overflow-hidden"
									style={{
										width: '120px',
										height: '15px',
										borderRadius: '4px',
										border: '0.5px solid #000000',
									}}
								>
									<span
										className="font-inter font-normal leading-none truncate"
										style={{ fontSize: '8.5px' }}
									>
										{contact.headline}
									</span>
								</div>
							) : null}
						</div>
					</div>
				</div>

				{/* Draft body box */}
				<div
					style={{
						width: '356px',
						border: '2px solid #000000',
						borderRadius: '6px',
						backgroundColor: 'white',
					}}
					className="flex-1 overflow-hidden"
				>
					<div className="h-full overflow-hidden">
						<div className="p-3 whitespace-pre-wrap text-[11px] leading-[1.4] overflow-y-auto h-full">
							{plainMessage || 'No content'}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DraftPreviewExpandedList;
