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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const verificationFormSchema = z.object({
	limit: z
		.number({
			invalid_type_error: 'Limit must be a number',
		})
		.int('Limit must be a whole number')
		.positive('Limit must be greater than 0')
		.max(10000, 'Limit cannot exceed 10,000 contacts')
		.optional(),
	onlyUnverified: z.boolean().default(true),
	query: z.string().email('Must be a valid email address').optional().or(z.literal('')),
});

type VerificationFormData = z.infer<typeof verificationFormSchema>;

export const useContactVerificationTable = () => {
	const form = useForm<VerificationFormData>({
		resolver: zodResolver(verificationFormSchema),
		defaultValues: {
			limit: 1,
			onlyUnverified: true,
			query: '',
		},
	});

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
	const onSubmit = (data: VerificationFormData) => {
		verifyContacts({
			onlyUnverified: data.onlyUnverified,
			limit: data.limit,
			query: data.query && data.query.trim() !== '' ? data.query : undefined,
		});
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
		form,
		onSubmit,
	};
};
