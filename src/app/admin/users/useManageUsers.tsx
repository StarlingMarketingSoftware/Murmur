'use client';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { urls } from '@/constants/urls';
import { useGetLeads } from '@/hooks/queryHooks/useLeads';
import { useGetUsers } from '@/hooks/queryHooks/useUsers';
import { Lead, User } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

export const useManageUsers = () => {
	const router = useRouter();
	const columns: ColumnDef<User>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('email')}</div>;
			},
		},
		{
			accessorKey: 'murmurEmail',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Murmur Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('murmurEmail')}</div>;
			},
		},
		{
			accessorKey: 'role',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Role" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('role')}</div>;
			},
		},
		{
			accessorKey: 'aiTestCredits',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="AI Test Credits" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('aiTestCredits')}</div>;
			},
		},
		{
			accessorKey: 'aiDraftCredits',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="AI Draft Credits" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('aiDraftCredits')}</div>;
			},
		},
		{
			accessorKey: 'stripeSubscriptionStatus',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Subscription Status" />;
			},
			cell: ({ row }) => {
				return (
					<div className="text-left">{row.getValue('stripeSubscriptionStatus')}</div>
				);
			},
		},
	];

	const leadsColumns: ColumnDef<Lead>[] = [
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Created At" />;
			},
		},
	];

	const { data: users, isPending: isPendingUsers } = useGetUsers();
	const { data: leads, isPending: isPendingLeads } = useGetLeads({
		filters: {
			email: '',
		},
	});

	const handleRowClick = (rowData: User) => {
		router.push(urls.admin.users.detail(rowData.clerkId));
	};

	return {
		columns,
		handleRowClick,
		users,
		isPendingUsers,
		leads,
		isPendingLeads,
		leadsColumns,
	};
};
