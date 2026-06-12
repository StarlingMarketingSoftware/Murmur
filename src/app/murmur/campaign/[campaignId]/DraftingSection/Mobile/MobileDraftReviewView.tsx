'use client';

import { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import ApproveCheckIcon from '@/components/atoms/svg/ApproveCheckIcon';
import RejectXIcon from '@/components/atoms/svg/RejectXIcon';
import { convertHtmlToPlainText } from '@/utils/html';
import { sanitizeMessageHtml } from '@/utils/sanitizeMessageHtml';
import { stripMurmurDraftSettingsSnapshot } from '@/utils/draftSettings';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { MobileContactHeader } from './MobileContactHeader';

const SUBJECT_STRIP_FILL = '#FFD182';
const SEND_BUTTON_FILL = '#B8E4BE';
const DELETE_BUTTON_FILL = '#E17272';
const ACTION_BAR_FILL = '#D8E5FB';
const COUNTER_PILL_FILL = '#E8F1FB';

const Spinner: FC = () => (
	<div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
);

interface MobileDraftReviewViewProps {
	draft: EmailWithRelations;
	/** Session counters (owned by the parent; reset on page load). */
	sentCount: number;
	deletedCount: number;
	/** Resolves true when the draft was actually sent (guards toast + return false). */
	onSend: () => Promise<boolean>;
	onDelete: () => Promise<void>;
	onClose: () => void;
}

export const MobileDraftReviewView: FC<MobileDraftReviewViewProps> = ({
	draft,
	sentCount,
	deletedCount,
	onSend,
	onDelete,
	onClose,
}) => {
	const [isSending, setIsSending] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const isBusy = isSending || isDeleting;

	const contact = draft.contact as ContactWithName;
	const personName =
		contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const name = personName || contact?.company || contact?.email || 'Unknown';
	const company = contact?.company && name !== contact.company ? contact.company : null;

	const message = draft.message || '';
	const hasLinks = /<a\s+[^>]*href=/i.test(message);

	const handleSend = async () => {
		if (isBusy) return;
		setIsSending(true);
		try {
			await onSend();
		} finally {
			setIsSending(false);
		}
	};

	const handleDelete = async () => {
		if (isBusy) return;
		setIsDeleting(true);
		try {
			await onDelete();
		} finally {
			setIsDeleting(false);
		}
	};

	// Portal to <body>: the summary overlay's z-30 container is its own stacking
	// context, so only a portal can cover the layout's fixed avatar/dashboard
	// buttons (z-50).
	return createPortal(
		<div className="fixed inset-0 z-[60] flex flex-col bg-white font-inter">
			<MobileContactHeader
				name={name}
				company={company}
				latitude={contact?.latitude}
				longitude={contact?.longitude}
				theme="draft"
				onMinimize={onClose}
			/>

			{/* Subject strip */}
			<div
				className="flex-shrink-0 px-4 py-3"
				style={{ backgroundColor: SUBJECT_STRIP_FILL }}
			>
				<span className="font-inter text-[15px] font-bold text-black leading-[1.35] line-clamp-2">
					{draft.subject || 'No subject'}
				</span>
			</div>

			{/* Draft body (same render rule as the desktop draft review: HTML when the
			    draft carries links, plain text otherwise) */}
			<div
				className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-4"
				style={{ WebkitOverflowScrolling: 'touch' }}
			>
				{hasLinks ? (
					<div
						className="murmur-selectable font-inter text-[14px] leading-[1.45] text-black [&_p]:m-0"
						dangerouslySetInnerHTML={{
							__html: sanitizeMessageHtml(stripMurmurDraftSettingsSnapshot(message)),
						}}
					/>
				) : (
					<p className="murmur-selectable font-inter text-[14px] leading-[1.45] text-black whitespace-pre-wrap">
						{convertHtmlToPlainText(message)}
					</p>
				)}
			</div>

			{/* Send / counters / Delete action bar */}
			<div
				className="flex-shrink-0 flex items-stretch gap-2 px-3 pt-2"
				style={{
					backgroundColor: ACTION_BAR_FILL,
					paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
				}}
			>
				<button
					type="button"
					onClick={handleSend}
					disabled={isBusy}
					className="flex-1 h-[46px] rounded-[8px] flex items-center justify-center gap-2 font-inter text-[17px] text-black disabled:opacity-50"
					style={{ backgroundColor: SEND_BUTTON_FILL, border: '1.5px solid #000' }}
				>
					{isSending ? (
						<Spinner />
					) : (
						<>
							Send
							<ApproveCheckIcon width={16} height={12} className="text-black" />
						</>
					)}
				</button>
				<div
					className="flex-shrink-0 h-[46px] rounded-[8px] px-4 flex items-center gap-3"
					style={{ backgroundColor: COUNTER_PILL_FILL, border: '1.5px solid #000' }}
				>
					<span className="flex items-center gap-[4px]">
						<span
							className="font-bold text-[17px] text-black"
							style={{ fontFamily: 'Times New Roman, serif' }}
						>
							{sentCount}
						</span>
						<ApproveCheckIcon width={15} height={11} className="text-black" />
					</span>
					<span className="flex items-center gap-[4px]">
						<span
							className="font-bold text-[17px] text-black"
							style={{ fontFamily: 'Times New Roman, serif' }}
						>
							{deletedCount}
						</span>
						<RejectXIcon width={13} height={13} className="text-black" />
					</span>
				</div>
				<button
					type="button"
					onClick={handleDelete}
					disabled={isBusy}
					className="flex-1 h-[46px] rounded-[8px] flex items-center justify-center gap-2 font-inter text-[17px] text-black disabled:opacity-50"
					style={{ backgroundColor: DELETE_BUTTON_FILL, border: '1.5px solid #000' }}
				>
					{isDeleting ? (
						<Spinner />
					) : (
						<>
							Delete
							<RejectXIcon width={13} height={13} className="text-black" />
						</>
					)}
				</button>
			</div>
		</div>,
		document.body
	);
};
