'use client';

import { FC, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';

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
					border: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: 'white',
				}}
			>
				{/* Close button (floating) */}
				<Button
					type="button"
					variant="ghost"
					onClick={onClose}
					className="absolute top-2 right-2 p-1 h-auto w-auto hover:bg-gray-100 rounded"
				>
					×
				</Button>

				<div className="flex-1 flex flex-col items-center gap-3 p-3 pt-12">
					{/* Contact info box: adjusted width for close button clearance */}
					<div
						style={{
							width: '350px',
							height: '41px',
							border: '2px solid #000000',
							borderRadius: '8px',
							backgroundColor: 'white',
						}}
						className="overflow-hidden"
					>
						<div className="grid grid-cols-2 gap-2 h-full px-2 py-1 items-center">
							<div className="flex flex-col justify-center">
								<div className="font-inter font-bold text-[14px] leading-4 truncate">
									{contactName}
								</div>
								<div className="text-[12px] leading-4 truncate">
									{contact?.company || ''}
								</div>
							</div>
							<div className="flex flex-col items-end gap-1 overflow-hidden">
								<div className="flex items-center gap-1 w-full justify-end">
									{stateAbbr ? (
										<span
											className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold"
											style={{
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												borderColor: '#000000',
											}}
										>
											{stateAbbr}
										</span>
									) : null}
									{contact?.city ? (
										<span className="text-[11px] leading-none truncate max-w-[100px]">
											{contact.city}
										</span>
									) : null}
								</div>
								{contact?.headline ? (
									<div className="rounded-[6px] px-2 h-[17px] flex items-center border border-black bg-[#E8EFFF] max-w-[160px] overflow-hidden">
										<span className="text-[10px] leading-none truncate">
											{contact.headline}
										</span>
									</div>
								) : null}
							</div>
						</div>
					</div>

					{/* Draft body box: adjusted width for close button clearance */}
					<div
						style={{
							width: '350px',
							height: '390px',
							border: '2px solid #000000',
							borderRadius: '8px',
							backgroundColor: 'white',
						}}
						className="overflow-hidden"
					>
						<CustomScrollbar
							className="h-full"
							thumbWidth={2}
							thumbColor="#000000"
							trackColor="transparent"
							offsetRight={-5}
						>
							<div className="p-3 whitespace-pre-wrap text-[12px] leading-[1.5]">
								{plainMessage || 'No content'}
							</div>
						</CustomScrollbar>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DraftPreviewBox;
