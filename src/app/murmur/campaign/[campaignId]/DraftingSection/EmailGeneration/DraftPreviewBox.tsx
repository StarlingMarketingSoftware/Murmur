'use client';

import { FC, useMemo, memo } from 'react';
// removed unused imports
// import removed: accept minimal draft shape to support ephemeral previews
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

interface DraftPreviewBoxProps {
	draft: { contactId: number; message?: string; subject?: string };
	contacts: ContactWithName[];
	onClose: () => void;
	// When provided, overrides the computed plain text message for streaming UI
	overridePlainMessage?: string;
	// When provided, overrides the contact lookup id (useful for ephemeral previews)
	overrideContactId?: number;
}

export const DraftPreviewBox: FC<DraftPreviewBoxProps> = ({
	draft,
	contacts,
	onClose,
	overridePlainMessage,
	overrideContactId,
}) => {
	// keep prop referenced to satisfy linter; close control handled by parent
	void onClose;
	const effectiveContactId = overrideContactId ?? draft.contactId;
	const contact = useMemo(
		() => contacts.find((c) => c.id === effectiveContactId) || null,
		[contacts, effectiveContactId]
	);

	const contactName = useMemo(() => {
		if (!contact) return 'Contact';
		return (
			contact.name ||
			`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			contact.company ||
			'Contact'
		);
	}, [contact]);

	// Show company on the second line only when there is a separate name
	const showCompanyLine = useMemo(() => {
		if (!contact) return false;
		const hasName = Boolean(
			(contact.name && contact.name.trim()) ||
				(contact.firstName && contact.firstName.trim()) ||
				(contact.lastName && contact.lastName.trim())
		);
		return Boolean(contact.company && hasName);
	}, [contact]);

	const plainMessage = useMemo(
		() => overridePlainMessage ?? convertHtmlToPlainText(draft.message || ''),
		[overridePlainMessage, draft.message]
	);

	// When we're streaming a draft, we pass an override message of "Drafting...".
	// During that brief period (before real content arrives) OR if content is empty,
	// show the same blank-wave loading animation style used by the Test Preview Panel (but in blue).
	const shouldBlankWave = useMemo(() => {
		const text = plainMessage.trim();
		return text.length === 0 || text.toLowerCase() === 'drafting...';
	}, [plainMessage]);

	// Check if message contains anchor tags - if so, render as HTML to show links
	const hasLinks = useMemo(
		() => /<a\s+[^>]*href=/i.test(draft.message || ''),
		[draft.message]
	);

	const stateAbbr = useMemo(() => {
		if (!contact?.state) return '';
		return getStateAbbreviation(contact.state) || '';
	}, [contact?.state]);

	return (
		<div style={{ width: '376px', height: '474px', position: 'relative' }}>
			<div
				style={{
					width: '100%',
					height: '100%',
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: shouldBlankWave ? '#B6CCF6' : '#BFD4FA',
				}}
			>
				{/* Removed close button per request */}

				<div className="flex-1 flex flex-col items-center gap-3 p-3 pt-2">
					{/* Contact info box: adjusted width for close button clearance */}
					<div
						style={{
							width: '366px',
							height: '41px',
							border: '2px solid #000000',
							borderRadius: '8px',
							backgroundColor: shouldBlankWave ? undefined : 'white',
						}}
						className={
							'overflow-hidden' +
							(shouldBlankWave ? ' draft-preview-blank-wave-identity' : '')
						}
					>
						<div className="grid grid-cols-[1fr_auto] gap-2 h-full px-2 py-[2px] items-center">
							<div className="flex flex-col justify-center">
								<div className="font-inter font-bold text-[14px] leading-4 truncate">
									{contactName}
								</div>
								<div className="text-[12px] leading-4 truncate">
									{showCompanyLine ? contact?.company : ''}
								</div>
							</div>
							<div className="flex flex-col items-start gap-0.5 overflow-hidden">
								<div className="flex items-center gap-2 w-full">
									{stateAbbr ? (
										<span
											className="inline-flex items-center justify-center font-inter font-normal leading-none"
											style={{
												width: '25px',
												height: '14px',
												borderRadius: '3.98px',
												border: '0.5px solid #000000',
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												fontSize: '11.22px',
											}}
										>
											{stateAbbr}
										</span>
									) : null}
									{contact?.city ? (
										<span className="text-[10px] leading-none truncate max-w-[72px]">
											{contact.city}
										</span>
									) : null}
								</div>
								{contact?.headline ? (
									<div
										className="px-2 flex items-center bg-[#E8EFFF] overflow-hidden"
										style={{
											width: '133px',
											height: '17px',
											borderRadius: '5.06px',
											border: '0.63px solid #000000',
										}}
									>
										<span
											className="font-inter font-normal leading-none truncate"
											style={{ fontSize: '9.49px' }}
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
						width: '366px',
						height: '390px',
						border: '2px solid #000000',
						borderRadius: '8px',
						backgroundColor: shouldBlankWave ? undefined : 'white',
					}}
					className={
						'overflow-hidden' +
						(shouldBlankWave ? ' draft-preview-blank-wave-body' : '')
					}
				>
					{!shouldBlankWave && (
						<CustomScrollbar
							className="h-full"
							thumbWidth={2}
							thumbColor="#000000"
							offsetRight={2}
						>
							{hasLinks ? (
								<div
									className="p-3 text-[12px] leading-[1.5] draft-preview-content"
									style={{ wordBreak: 'break-word' }}
									dangerouslySetInnerHTML={{ __html: draft.message || 'No content' }}
								/>
							) : (
								<div className="p-3 whitespace-pre-wrap text-[12px] leading-[1.5]">
									{plainMessage || 'No content'}
								</div>
							)}
						</CustomScrollbar>
					)}
				</div>
				</div>
			</div>
		</div>
	);
};

export default memo(DraftPreviewBox);
