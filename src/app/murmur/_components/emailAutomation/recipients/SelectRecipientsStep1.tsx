import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import CustomTable from '../../CustomTable';
import { Button } from '@/components/ui/button';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { FcGoogle } from 'react-icons/fc'; // Import the Google icon from react-icons
import RequestPeopleAPIPermissionsDialog from '../../RequestPeopleAPIPermissionsDialog';
import { LocalStorageKeys } from '@/constants/constants';
import { hasContactsReadOnlyPermission } from '@/app/utils/googlePermissions';
import { toast } from 'sonner';

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
	setStep2,
}) => {
	const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

	const handleImportGoogleContacts = async () => {
		if (hasContactsReadOnlyPermission()) {
			console.log('calling peoples api');
			try {
				const response = await fetch(
					'https://people.googleapis.com/v1/people/me/connections?' +
						new URLSearchParams({
							personFields: 'names,emailAddresses',
							pageSize: '1000',
						}),
					{
						headers: {
							Authorization: `Bearer ${localStorage.getItem(
								LocalStorageKeys.GoogleAccessToken
							)}`,
							Accept: 'application/json',
						},
					}
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				console.log('🚀 ~ handleImportGoogleContacts ~ data:', data);
				// set state
			} catch (error: any) {
				toast.error('Error fetching Google contacts:', error);
				throw error;
			}
		} else {
			setIsPermissionsDialogOpen(true);
		}
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
			<Button
				onClick={handleImportGoogleContacts}
				variant="outline"
				className="w-fit mx-auto flex items-center gap-2"
			>
				<FcGoogle />
				Import your Google Contacts
			</Button>
			<Button
				onClick={() => setStep2(true)}
				disabled={selectedRows.length === 0}
				className="w-fit max-w-[500px] mx-auto"
			>
				Extract Contacts from Selected Lists
			</Button>
			<RequestPeopleAPIPermissionsDialog
				isOpen={isPermissionsDialogOpen}
				setIsOpen={setIsPermissionsDialogOpen}
			/>
		</Card>
	);
};

export default SelectRecipientsStep1;
