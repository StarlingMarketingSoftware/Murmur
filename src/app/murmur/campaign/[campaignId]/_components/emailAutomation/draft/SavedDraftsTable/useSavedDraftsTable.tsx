import { AccessorFnColumnDef } from '@tanstack/react-table';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TableSortingButton } from '../../../CustomTable';
import { EmailWithRelations } from '@/constants/types';
import { useState } from 'react';

export const useSavedDraftsTable = () => {
	const columns: AccessorFnColumnDef<EmailWithRelations>[] = [
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
				return <div className="text-left">{row.getValue('subject')}</div>;
			},
		},
		{
			id: 'message',
			accessorFn: (row) => row.message,
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Message" />;
			},
			cell: ({ row }) => {
				const message: string = row.getValue('message');
				return <div className="text-left">{message.substring(0, 60) + '...'}</div>;
			},
		},
	];

	const params = useParams();
	const { campaignId } = params;

	const { data, isPending, isError, error } = useQuery({
		queryKey: ['drafts', campaignId],
		queryFn: async (): Promise<EmailWithRelations[]> => {
			const response = await fetch(`/api/emails?campaignId=${campaignId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch drafts');
			}
			return response.json();
		},
		enabled: !!campaignId,
	});

	const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const handleRowClick = (rowData: EmailWithRelations) => {
		setIsDraftDialogOpen(true);
		setSelectedDraft(rowData);
	};

	return {
		columns,
		data,
		isPending,
		isError,
		error,
		handleRowClick,
		isDraftDialogOpen,
		selectedDraft,
		setIsDraftDialogOpen,
	};
};
