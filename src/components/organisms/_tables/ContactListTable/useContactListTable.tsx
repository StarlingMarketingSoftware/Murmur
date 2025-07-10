import { Dispatch, SetStateAction, useState } from 'react';
import { UserContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import {
	useDeleteUserContactList,
	useGetUserContactLists,
} from '@/hooks/queryHooks/useUserContactLists';
import { Checkbox } from '@/components/ui/checkbox';
import { MMddyyyyHHmm } from '@/utils';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ContactListTableProps {
	setSelectedRows: Dispatch<SetStateAction<UserContactList[]>>;
}

export const useContactListTable = (props: ContactListTableProps) => {
	const { setSelectedRows } = props;

	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentContactList, setCurrentContactList] = useState<UserContactList | null>(
		null
	);
	const handleDeleteClick = (contactList: UserContactList) => {
		setCurrentContactList(contactList);
		setIsConfirmDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		if (currentContactList) {
			deleteContactList(currentContactList.id);
			setIsConfirmDialogOpen(false);
			setCurrentContactList(null);
		}
	};

	const columns: ColumnDef<UserContactList>[] = [
		{
			id: 'select',
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
		},
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
			accessorKey: 'createdAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Created At" />;
			},
			cell: ({ row }) => {
				return (
					<div className="text-left">
						{MMddyyyyHHmm(new Date(row.getValue('createdAt')))}
					</div>
				);
			},
		},
		{
			accessorKey: 'updatedAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Updated At" />;
			},
			cell: ({ row }) => {
				return (
					<div className="text-left">
						{MMddyyyyHHmm(new Date(row.getValue('updatedAt')))}
					</div>
				);
			},
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const contactList = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="light"
								className="h-8 w-8 p-0"
								onClick={(e) => {
									e.stopPropagation();
								}}
								disabled={isPendingDeleteContactList}
							>
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									setCurrentContactList(contactList);
									handleRowClick(contactList);
								}}
							>
								Detail
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									handleDeleteClick(contactList);
								}}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const [isContactListDialogOpen, setIsContactListDialogOpen] = useState(false);

	const [selectedContactList, setSelectedContactList] = useState<UserContactList | null>(
		null
	);

	const handleRowClick = (rowData: UserContactList) => {
		setIsContactListDialogOpen(true);
		setSelectedContactList(rowData);
	};

	const { data: dataContactLists, isPending: isPendingContactLists } =
		useGetUserContactLists();

	const { mutate: deleteContactList, isPending: isPendingDeleteContactList } =
		useDeleteUserContactList();

	return {
		columns,
		handleRowClick,
		dataContactLists,
		isPendingContactLists,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		selectedContactList,
		setSelectedContactList,
		setSelectedRows,
		isPendingDeleteContactList,
		isConfirmDialogOpen,
		handleConfirmDelete,
		currentContactList,
		handleDeleteClick,
		setIsConfirmDialogOpen,
	};
};
