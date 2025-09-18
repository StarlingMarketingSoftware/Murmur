'use client';

import { FC, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';

interface DraftPreviewBoxProps {
	draft: EmailWithRelations;
	contacts: ContactWithName[];
	onClose: () => void;
}

export const DraftPreviewBox: FC<DraftPreviewBoxProps> = ({
	draft,
	contacts,
	onClose,
}) => {
	const contact = useMemo(
		() => contacts.find((c) => c.id === draft.contactId) || null,
		[contacts, draft.contactId]
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

	const plainMessage = useMemo(
		() => convertHtmlToPlainText(draft.message || ''),
		[draft.message]
	);

	return (
		<div style={{ width: '376px', height: '474px', position: 'relative' }}>
			<div
				style={{
					width: '100%',
					height: '100%',
					border: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: 'white',
				}}
			>
				<div
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: '2px solid #ABABAB',
						padding: '12px 16px',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						height: '48px',
						backgroundColor: 'white',
					}}
				>
					<div style={{ transform: 'translateY(-6px)' }}>
						<div className="text-sm font-inter font-medium text-black">Draft Preview</div>
					</div>
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						className="p-1 h-auto w-auto hover:bg-gray-100 rounded"
					>
						×
					</Button>
				</div>

				<CustomScrollbar
					className="flex-1"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-5}
				>
					<div className="p-3">
						<div className="mb-2">
							<div className="text-[12px] font-medium text-black">{contactName}</div>
							{contact?.company ? (
								<div className="text-[11px] text-black">{contact.company}</div>
							) : null}
						</div>
						<div className="whitespace-pre-wrap text-[12px] leading-[1.5]">
							{plainMessage || 'No content'}
						</div>
					</div>
				</CustomScrollbar>
			</div>
		</div>
	);
};

export default DraftPreviewBox;
