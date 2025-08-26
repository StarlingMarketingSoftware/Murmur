import { FC, useState } from 'react';
import { DraftedEmailsProps, useDraftedEmails } from './useDraftedEmails';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import { EmailWithRelations } from '@/types';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { toast } from 'sonner';

export const DraftedEmails: FC<DraftedEmailsProps> = (props) => {
	const {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		handleDeleteDraft,
		contacts,
	} = useDraftedEmails(props);

	// State for inline editing
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const [editedSubject, setEditedSubject] = useState('');
	const [editedMessage, setEditedMessage] = useState('');
	const { mutateAsync: updateEmail, isPending: isPendingUpdate } = useEditEmail();

	const handleDraftSelect = (draft: EmailWithRelations) => {
		setSelectedDraft(draft);
		setEditedSubject(draft.subject || '');
		// Strip HTML tags to show plain text, preserving line breaks
		let plainMessage = draft.message || '';

		// Handle different paragraph and line break patterns using markers first
		// Paragraph transitions
		plainMessage = plainMessage.replace(/<\/p>\s*<p[^>]*>/gi, '§PARA§');
		plainMessage = plainMessage.replace(/<\/div>\s*<div[^>]*>/gi, '§PARA§');
		// Standalone closings should also break paragraphs
		plainMessage = plainMessage.replace(/<\/p>/gi, '§PARA§');
		plainMessage = plainMessage.replace(/<\/div>/gi, '§PARA§');
		// Line breaks inside paragraphs
		plainMessage = plainMessage.replace(/<br\s*\/?>/gi, '§BR§');

		// Remove opening tags for block elements
		plainMessage = plainMessage.replace(/<p[^>]*>/gi, '');
		plainMessage = plainMessage.replace(/<div[^>]*>/gi, '');

		// Remove any other HTML tags
		plainMessage = plainMessage.replace(/<[^>]*>/g, '');

		// Decode minimal entities
		plainMessage = plainMessage.replace(/&nbsp;/gi, ' ');

		// Replace markers with actual line breaks
		plainMessage = plainMessage.replace(/§PARA§/g, '\n\n');
		plainMessage = plainMessage.replace(/§BR§/g, '\n');

		// Normalize newlines (max 2 in a row)
		plainMessage = plainMessage.replace(/\r\n/g, '\n');
		plainMessage = plainMessage.replace(/\n{3,}/g, '\n\n');

		// Trim
		plainMessage = plainMessage.trim();

		setEditedMessage(plainMessage);
	};

	const handleSave = async () => {
		if (!selectedDraft) return;
		try {
			// Convert plain text back to HTML
			// Split by double newlines to get paragraphs
			const paragraphs = editedMessage.split('\n\n');
			const htmlMessage = paragraphs
				.map((para) => {
					// Within each paragraph, convert single newlines to <br>
					const withBreaks = para.replace(/\n/g, '<br>');
					return `<p>${withBreaks}</p>`;
				})
				.join('');

			await updateEmail({
				id: selectedDraft.id.toString(),
				data: {
					subject: editedSubject,
					message: htmlMessage,
				},
			});
			toast.success('Draft updated successfully');
		} catch {
			toast.error('Failed to update draft');
		}
	};

	const handleBack = () => {
		setSelectedDraft(null);
		setEditedSubject('');
		setEditedMessage('');
	};

	// If a draft is selected, show the inline editor
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
						<button
							type="button"
							onClick={handleSave}
							disabled={isPendingUpdate}
							className="w-[100px] h-[20px] bg-[rgba(93,171,104,0.49)] border border-[#5DAB68] rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isPendingUpdate ? '...' : 'Save'}
						</button>
						<button
							type="button"
							onClick={async (e) => {
								if (selectedDraft) {
									await handleDeleteDraft(e, selectedDraft.id);
									setSelectedDraft(null);
								}
							}}
							disabled={isPendingDeleteEmail}
							className="w-[100px] h-[20px] bg-[#E69A9A] border border-[#B92929] rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-[#e48787] hover:border-[#a32424] active:bg-[#e17474] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							style={{ backgroundColor: '#E69A9A', borderColor: '#B92929' }}
						>
							{isPendingDeleteEmail ? '...' : 'Delete'}
						</button>
					</div>
				</div>
			</div>
		);
	}

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
								onClick={() => handleDraftSelect(draft)}
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
