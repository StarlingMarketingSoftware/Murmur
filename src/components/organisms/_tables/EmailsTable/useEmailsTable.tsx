import { AccessorFnColumnDef, ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { EmailWithRelations } from '@/constants/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { ellipsesText } from '@/app/utils/string';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { restrictedFeatureMessages } from '@/constants/constants';
import { useDeleteEmail } from '@/hooks/useEmails';
import { stripHtmlTags } from '@/app/utils/htmlFormatting';

export interface EmailsTableProps {
	emails: EmailWithRelations[];
	isPending: boolean;
	noDataMessage?: string;
	isEditable?: boolean;
}

export const useEmailsTable = (props: EmailsTableProps) => {
	const queryClient = useQueryClient();
	const { subscriptionTier } = useMe();

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDeleteEmail = async (emailId: number) => {
		await deleteEmail(emailId);
		queryClient.invalidateQueries({ queryKey: ['drafts'] });
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
					<FeatureLockedButton message={restrictedFeatureMessages.viewEmails} />
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
				<Button
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						handleDeleteEmail(row.original.id);
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
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
