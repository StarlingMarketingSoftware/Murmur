import { FC } from 'react';
import { DraftedEmailsProps, useDraftedEmails } from './useDraftedEmails';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { DraftingTable } from '../DraftingTable/DraftingTable';

export const DraftedEmails: FC<DraftedEmailsProps> = (props) => {
	const {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		handleDraftClick,
		handleDeleteDraft,
		contacts,
	} = useDraftedEmails(props);

	return (
		<>
			{/* Right table - Generated Drafts */}
			<DraftingTable
				handleClick={() => {}}
				areAllSelected={false}
				hasData={draftEmails.length > 0}
				noDataMessage="No drafts generated"
				noDataDescription='Click "Generate Drafts" to create emails for the selected contacts'
				isPending={isPendingEmails}
				title="Drafts"
			>
				<>
					{draftEmails.map((draft) => {
						const contact = contacts?.find((c) => c.id === draft.contactId);
						const contactName = contact
							? contact.name ||
							  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
							  contact.company ||
							  'Contact'
							: 'Unknown Contact';

						return (
							<div
								key={draft.id}
								className={cn(
									'border-b border-gray-200 cursor-pointer transition-colors p-3 relative'
								)}
								onDoubleClick={() => handleDraftClick(draft)}
							>
								{/* Delete button */}
								<Button
									type="button"
									variant="icon"
									onClick={(e) => handleDeleteDraft(e, draft.id)}
									className="absolute top-2 right-2 p-1 transition-colors z-10 group"
								>
									<X size={16} className="text-gray-500 group-hover:text-red-500" />
								</Button>

								{/* Contact name */}
								<div className="font-bold text-xs mb-1 pr-8">{contactName}</div>

								{/* Email subject */}
								<div className="text-xs text-gray-600 mb-1 pr-8">
									<span className="font-semibold">Subject:</span>{' '}
									{draft.subject || 'No subject'}
								</div>

								{/* Preview of message */}
								<div className="text-xs text-gray-500 pr-8">
									{draft.message
										? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
										: 'No content'}
								</div>
							</div>
						);
					})}
				</>

				{isPendingDeleteEmail && (
					<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
						<Spinner size="small" />
					</div>
				)}
			</DraftingTable>
		</>
	);
};
