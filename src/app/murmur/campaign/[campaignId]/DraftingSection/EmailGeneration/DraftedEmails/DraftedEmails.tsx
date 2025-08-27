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
		handleDeleteDraft,
		contacts,
		selectedDraft,
		handleBack,
		handleSave,
		handleDraftSelect,
		handleDraftDoubleClick,
		isPendingUpdate,
		editedSubject,
		editedMessage,
		setEditedMessage,
		setEditedSubject,
		setSelectedDraft,
		selectedDraftIds,
		handleSelectAllDrafts,
	} = useDraftedEmails(props);

	if (selectedDraft) {
		const contact = contacts?.find((c) => c.id === selectedDraft.contactId);
		const contactName = contact
			? contact.name ||
			  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			  contact.company ||
			  'Contact'
			: 'Unknown Contact';

		return (
			<div className="w-[336px]">
				{/* Title area to match contacts table header */}
				<div className="text-sm font-inter font-medium text-black">Drafts</div>
				<div className="h-[20px] mb-2"></div>

				{/* Editor container matching table dimensions exactly */}
				<div className="bg-background border border-gray-300 w-[336px] h-[441px] overflow-x-hidden overflow-y-auto pr-[10px] flex flex-col p-3 relative scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-black [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
					{/* Close button */}
					<Button
						type="button"
						variant="ghost"
						onClick={handleBack}
						className="absolute top-2 right-2 p-1 h-auto w-auto hover:bg-gray-100 rounded"
					>
						<X size={16} className="text-black" />
					</Button>
					{/* Recipient info */}
					<div className="mb-3">
						<div className="text-sm font-medium">{contactName}</div>
					</div>

					{/* Subject input */}
					<div className="mb-3">
						<input
							type="text"
							value={editedSubject}
							onChange={(e) => setEditedSubject(e.target.value)}
							className="h-8 text-xs w-full bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
						/>
					</div>

					{/* Message editor - plain text */}
					<div className="flex-1 flex flex-col min-h-0">
						<textarea
							value={editedMessage}
							onChange={(e) => setEditedMessage(e.target.value)}
							className="flex-1 w-full p-0 text-sm resize-none focus:outline-none focus:ring-0 bg-transparent border-0 whitespace-pre-wrap"
							placeholder="Type your message here..."
						/>
					</div>

					{/* Save button */}
					<div className="mt-3 flex justify-end gap-2">
						<Button
							type="button"
							onClick={handleSave}
							disabled={isPendingUpdate}
							className="w-[100px] font-secondary h-[20px] bg-primary/50 border border-primary rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-primary/60 hover:border-primary-dark active:bg-primary/70 transition-colors"
						>
							{isPendingUpdate ? '...' : 'Save'}
						</Button>
						<Button
							type="button"
							onClick={async (e) => {
								if (selectedDraft) {
									await handleDeleteDraft(e, selectedDraft.id);
									setSelectedDraft(null);
								}
							}}
							disabled={isPendingDeleteEmail}
							className="font-secondary w-[100px] h-[20px] bg-destructive/50 border border-destructive rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-destructive/60 hover:border-destructive-dark active:bg-destructive/70 transition-colors"
						>
							{isPendingDeleteEmail ? '...' : 'Delete'}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* Right table - Generated Drafts */}
			<DraftingTable
				handleClick={handleSelectAllDrafts}
				areAllSelected={
					selectedDraftIds.size === draftEmails.length && draftEmails.length > 0
				}
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
						const isSelected = selectedDraftIds.has(draft.id);

						return (
							<div
								key={draft.id}
								className={cn(
									'border-b border-gray-200 cursor-pointer transition-colors p-3 relative',
									isSelected && 'bg-[#D6E8D9] border-2 border-primary'
								)}
								onClick={(e) => handleDraftSelect(draft, e)}
								onDoubleClick={() => handleDraftDoubleClick(draft)}
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
