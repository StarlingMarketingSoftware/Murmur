import { AccessorFnColumnDef, ColumnDef } from '@tanstack/react-table';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { EmailWithRelations } from '@/types';
import { useState } from 'react';
import { ellipsesText } from '@/utils';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { stripHtmlTags } from '@/utils';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';

export interface EmailsTableProps {
	emails: EmailWithRelations[];
	isPending: boolean;
	noDataMessage?: string;
	isEditable?: boolean;
}

export const useEmailsTable = (props: EmailsTableProps) => {
	const { subscriptionTier } = useMe();

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
				return subscriptionTier?.viewEmailAddresses ? (
					<div className="text-left">{row.getValue('contactEmail')}</div>
				) : (
					<FeatureLockedButton message={RESTRICTED_FEATURE_MESSAGES.viewEmails} />
				);
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
			id: 'action',
			cell: ({ row }) => (
				<TableDeleteRowButton
					disabled={isPendingDeleteEmail}
					onClick={() => {
						handleDeleteEmail(row.original.id);
					}}
				/>
			),
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
		handleRowClick,
		isDraftDialogOpen,
		selectedDraft,
		setIsDraftDialogOpen,
		handleDeleteEmail,
		isPendingDeleteEmail,
		...props,
	};
};
