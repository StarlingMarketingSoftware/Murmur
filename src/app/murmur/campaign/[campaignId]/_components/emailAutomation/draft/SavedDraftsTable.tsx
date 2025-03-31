import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@radix-ui/react-checkbox';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Dispatch, FC, SetStateAction } from 'react';
import CustomTable from '../../CustomTable';
import { Draft } from '@/constants/types';
import { useAppSelector } from '@/lib/redux/hooks';

const columns: ColumnDef<Draft>[] = [
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
		accessorKey: 'contactEmail',
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
			return <div className=" text-left">{row.getValue('contactEmail')}</div>;
		},
	},
	{
		accessorKey: 'subject',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Subject
					<ArrowUpDown className="h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-left">{row.getValue('subject')}</div>;
		},
	},
	{
		accessorKey: 'message',
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
			return <div className="text-left">{row.getValue('message')}</div>;
		},
	},
];

export interface SavedDraftsTableProps {
	drafts: Draft[];
	setSelectedRows: Dispatch<SetStateAction<Draft[]>>;
}
const SavedDraftsTable: FC<SavedDraftsTableProps> = ({ drafts, setSelectedRows }) => {
	const completedDrafts = useAppSelector((state) => state.murmur.completedDrafts);
	console.log('🚀 ~ completedDrafts:', completedDrafts);

	return (
		<Card>
			<CardContent>
				<CustomTable
					columns={columns}
					data={completedDrafts}
					setSelectedRows={setSelectedRows}
					singleSelection
					noDataMessage="Drafts will appear here as they are created."
				/>
			</CardContent>
		</Card>
	);
};

export default SavedDraftsTable;
