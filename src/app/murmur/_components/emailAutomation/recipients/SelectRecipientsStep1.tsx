import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { Dispatch, FC, SetStateAction } from 'react';
import CustomTable from '../../CustomTable';
import { Button } from '@/components/ui/button';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const columns: ColumnDef<ContactList>[] = [
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

interface SelectRecipientsStep1Props {
	selectedRows: ContactList[];
	setSelectedRows: Dispatch<SetStateAction<ContactList[]>>;
	contactLists: ContactList[];
	setStep2: Dispatch<SetStateAction<boolean>>;
}

const SelectRecipientsStep1: FC<SelectRecipientsStep1Props> = ({
	selectedRows,
	setSelectedRows,
	contactLists,
}) => {
	const handleImportGoogleContacts = () => {
		console.log('import google');
	};
	return (
		<Card>
			<CardHeader>
				<CardDescription>
					Select a list to manage or import from Google Contacts.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<CustomTable
					columns={columns}
					data={contactLists}
					setSelectedRows={setSelectedRows}
				/>
			</CardContent>
			<Button variant="outline" className="w-fit mx-auto">
				Import your Google Contacts
			</Button>
			<Button
				disabled={selectedRows.length === 0}
				className="w-fit max-w-[500px] mx-auto"
				onClick={handleImportGoogleContacts}
			>
				Extract Contacts from Selected Lists
			</Button>
		</Card>
	);
};

export default SelectRecipientsStep1;
