import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { TypographyH2 } from '@/components/ui/typography';
import { FC, useEffect, useState } from 'react';
import ContactListTable from './ContactListTable';
import { useContacts } from '@/hooks/useContactsByCategory';
import Spinner from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Contact } from '@prisma/client';
import { Checkbox } from '@radix-ui/react-checkbox';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

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
		accessorKey: 'count',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Number of contacts
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-left">{row.getValue('count')}</div>;
		},
	},
];

const SelectRecipientsStep2: FC<SelectedRecipientsStep2Props> = ({ categories }) => {
	const { data, isPending, fetchContacts } = useContacts();
	const [selectedRows, setSelectedRows] = useState<string[]>([]);
	console.log('🚀 ~ selectedRows:', selectedRows);

	useEffect(() => {
		if (categories.length > 0) {
			fetchContacts(categories);
		}
	}, [categories]);

	if (isPending) {
		return <Spinner />;
	}

	console.log('🚀 ~ data:', data);
	return (
		<>
			<Card className="my-5">
				<CardHeader>
					<CardDescription>Select individual recipients.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{/* <ContactListTable
						columns={columns}
						data={data}
						setSelectedRows={setSelectedRows}
					/> */}
				</CardContent>
			</Card>
		</>
	);
};

export default SelectRecipientsStep2;
