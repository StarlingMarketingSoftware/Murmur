'use client';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { Button } from '@/components/ui/button';
import {
	useCheckContactVerificationRequest,
	useContactVerificationRequests,
	useCreateContactVerificationRequest,
} from '@/hooks/queryHooks/useContactVerificationRequests';
import { MMddyyyyHHmm } from '@/utils';
import {
	ContactVerificationRequest,
	ContactVerificationRequestStatus,
} from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';

export const useContactVerificationTable = () => {
	const columns: ColumnDef<ContactVerificationRequest>[] = [
		{
			accessorKey: 'estimatedTimeOfCompletion',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Estimated Completion Time" />;
			},
			cell: ({ row }) => {
				return (
					<div className="capitalize text-left">
						{MMddyyyyHHmm(new Date(row.getValue('estimatedTimeOfCompletion')))}
					</div>
				);
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Created" />;
			},
			cell: ({ row }) => {
				return (
					<div className="capitalize text-left">
						{MMddyyyyHHmm(new Date(row.getValue('createdAt')))}
					</div>
				);
			},
		},
		{
			accessorKey: 'status',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Status" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('status')}</div>;
			},
		},
		{
			id: 'action',
			cell: ({ row }) => (
				<>
					{row.original.status === ContactVerificationRequestStatus.processing && (
						<Button
							size="sm"
							isLoading={isPendingCheckVerificationRequest}
							onClick={() => {
								checkVerificationRequest({ fileId: row.original.fileId });
							}}
						>
							Check Status
						</Button>
					)}
				</>
			),
		},
	];

	const {
		data: contactVerificationRequests,
		isPending: isPendingContactVerificationRequests,
	} = useContactVerificationRequests();
	const { mutate: verifyContacts, isPending: isPendingVerifyContacts } =
		useCreateContactVerificationRequest();
	const {
		mutate: checkVerificationRequest,
		isPending: isPendingCheckVerificationRequest,
	} = useCheckContactVerificationRequest();

	const handleVerifyAllContacts = () => {
		verifyContacts({ onlyUnverified: true });
	};

	return {
		columns,
		contactVerificationRequests,
		isPendingContactVerificationRequests,
		verifyContacts,
		isPendingVerifyContacts,
		checkVerificationRequest,
		isPendingCheckVerificationRequest,
		handleVerifyAllContacts,
	};
};
