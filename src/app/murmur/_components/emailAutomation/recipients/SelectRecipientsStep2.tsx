import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { FC, useEffect, useState } from 'react';
import CustomTable from '../../CustomTable';
import { useContacts } from '@/hooks/useContactsByCategory';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDispatch } from 'react-redux';
import { setSelectedRecipients } from '@/lib/redux/features/murmur/murmurSlice';

interface SelectedRecipientsStep2Props {
	categories: string[];
}

const columns: ColumnDef<Contact>[] = [
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
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Name
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-left">{row.getValue('name')}</div>;
		},
	},
	{
		accessorKey: 'email',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Email
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-left">{row.getValue('email')}</div>;
		},
	},
	{
		accessorKey: 'category',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Category
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="capitalize text-left">{row.getValue('category')}</div>;
		},
	},
	{
		accessorKey: 'company',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Company
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-left">{row.getValue('company')}</div>;
		},
	},
];

const SelectRecipientsStep2: FC<SelectedRecipientsStep2Props> = ({ categories }) => {
	const { data, isPending, fetchContacts } = useContacts();
	const dispatch = useDispatch();

	const handleSelectedRowsChange = (rows: Contact[]) => {
		dispatch(setSelectedRecipients(rows));
	};

	useEffect(() => {
		if (categories.length > 0) {
			fetchContacts(categories);
		}
	}, [categories]);

	if (isPending) {
		return <Spinner />;
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardDescription>Select individual recipients.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<CustomTable
						columns={columns}
						data={data}
						setSelectedRows={handleSelectedRowsChange}
					/>
				</CardContent>
			</Card>
		</>
	);
};

export default SelectRecipientsStep2;
