import { AccessorFnColumnDef, ColumnDef } from '@tanstack/react-table';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSortingButton } from '../../../CustomTable';
import { EmailWithRelations } from '@/constants/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ellipsesText } from '@/app/utils/functions';

export const useSavedDraftsTable = () => {
	const queryClient = useQueryClient();
	const params = useParams();
	const { campaignId } = params;

	const { mutate: deleteEmail, isPending: isPendingDeleteEmail } = useMutation({
		mutationFn: async (emailId: number) => {
			const response = await fetch(`/api/emails/${emailId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete email');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['drafts', campaignId] });
			toast.success('Email deleted successfully');
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete email: ${error.message}`);
		},
	});

	const handleDeleteEmail = (emailId: number) => {
		deleteEmail(emailId);
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
			accessorFn: (row) => row.message,
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
		handleDeleteEmail,
		isPendingDeleteEmail,
	};
};
