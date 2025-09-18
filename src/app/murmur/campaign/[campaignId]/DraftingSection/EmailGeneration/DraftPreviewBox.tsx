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
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: '#BFD4FA',
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
							backgroundColor: 'white',
						}}
						className="overflow-hidden"
					>
						<div className="grid grid-cols-[1fr_auto] gap-2 h-full px-2 py-[2px] items-center">
							<div className="flex flex-col justify-center">
								<div className="font-inter font-bold text-[14px] leading-4 truncate">
									{contactName}
								</div>
								<div className="text-[12px] leading-4 truncate">
									{contact?.company || ''}
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
							backgroundColor: 'white',
						}}
						className="overflow-hidden"
					>
						<div className="h-full overflow-hidden">
							<div className="p-3 whitespace-pre-wrap text-[12px] leading-[1.5]">
								{plainMessage || 'No content'}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DraftPreviewBox;
