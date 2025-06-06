import { AccessorFnColumnDef, ColumnDef } from '@tanstack/react-table';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { EmailWithRelations } from '@/types';
import { useState } from 'react';
import { ellipsesText, MMddyyyyHHmm } from '@/utils';
import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { stripHtmlTags } from '@/utils';

export interface SentEmailsTableProps {
	emails: EmailWithRelations[];
	isPending: boolean;
}

export const useSentEmailsTable = (props: SentEmailsTableProps) => {
	const { emails, isPending } = props;

	const sentEmails = emails.filter((email) => email.status === 'sent');

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDeleteEmail = async (emailId: number) => {
		await deleteEmail(emailId);
	};

	const columns: (
		| AccessorFnColumnDef<EmailWithRelations>
		| ColumnDef<EmailWithRelations>
	)[] = [
		{
			id: 'contactEmail',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Recipient" />;
			},
			accessorFn: (row) => row.contact?.email,
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('contactEmail')}</div>;
			},
		},
		{
			id: 'subject',
			accessorFn: (row) => row.subject,
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Subject" />;
			},
			cell: ({ row }) => {
				const subject: string = row.getValue('subject');
				return <div className="text-left">{ellipsesText(subject, 30)}</div>;
			},
		},
		{
			id: 'message',
			accessorFn: (row) => stripHtmlTags(row.message),
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Message" />;
			},
			cell: ({ row }) => {
				const message: string = row.getValue('message');
				return <div className="text-left">{ellipsesText(message, 55)}</div>;
			},
		},
		{
			id: 'sentAt',
			accessorFn: (row) => row.sentAt,
			header: ({ column }) => {
				return <TableSortingButton column={column} label="sentAt" />;
			},
			cell: ({ row }) => {
				const value = new Date(row.getValue('sentAt'));
				return <div className="text-left">{MMddyyyyHHmm(value)}</div>;
			},
		},
	];

	const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const handleRowClick = (rowData: EmailWithRelations) => {
		setIsDraftDialogOpen(true);
		setSelectedDraft(rowData);
	};

	return {
		columns,
		isPending,
		handleRowClick,
		isDraftDialogOpen,
		selectedDraft,
		setIsDraftDialogOpen,
		handleDeleteEmail,
		isPendingDeleteEmail,
		sentEmails,
	};
};
