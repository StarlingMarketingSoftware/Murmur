import { FC, useMemo, useState } from 'react';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TestingDraftsProps {
	draftEmails: EmailWithRelations[];
	contacts: ContactWithName[];
}

export const TestingDrafts: FC<TestingDraftsProps> = ({ draftEmails, contacts }) => {
	const [selected, setSelected] = useState<EmailWithRelations | null>(null);

	const contactById = useMemo(() => {
		const map = new Map<number, ContactWithName>();
		for (const c of contacts || []) map.set(c.id, c);
		return map;
	}, [contacts]);

	if (selected) {
		const contact = contactById.get(selected.contactId);
		const contactName = contact
			? contact.name ||
			  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			  contact.company ||
			  'Contact'
			: 'Contact';
		const message = convertHtmlToPlainText(selected.message || '');

		return (
			<div className="relative" style={{ width: '376px', minHeight: '260px' }}>
				<div className="rounded-[8px] border-2 border-black bg-white p-3">
					<Button
						type="button"
						variant="ghost"
						onClick={() => setSelected(null)}
						className="absolute top-2 right-2 p-1 h-auto w-auto hover:bg-gray-100 rounded"
					>
						<X size={16} className="text-black" />
					</Button>

					<div className="text-sm font-inter font-medium text-black">{contactName}</div>
					<div className="mt-2 text-xs font-inter font-semibold text-black break-words">
						{selected.subject || 'No subject'}
					</div>
					<div className="mt-2 text-sm font-inter text-[#333] whitespace-pre-wrap max-h-[360px] overflow-y-auto">
						{message || 'No content'}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full flex flex-col gap-2 items-center">
			{draftEmails.map((draft) => {
				const contact = contactById.get(draft.contactId);
				const contactName = contact
					? contact.name ||
					  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
					  contact.company ||
					  'Contact'
					: 'Contact';
				return (
					<div
						key={draft.id}
						className="cursor-pointer transition-colors relative select-none w-[366px] h-[64px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2 hover:bg-[#FFF4DE]"
						onClick={() => setSelected(draft)}
					>
						<div className="grid grid-cols-1 grid-rows-4 h-full pr-2">
							<div className="row-start-1 col-start-1 flex items-center">
								<div className="font-bold text-[11px] truncate leading-none">
									{contactName}
								</div>
							</div>
							<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center">
								{draft.subject || 'No subject'}
							</div>
							<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center">
								{convertHtmlToPlainText(draft.message || '').substring(0, 60) ||
									'No content'}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default TestingDrafts;
