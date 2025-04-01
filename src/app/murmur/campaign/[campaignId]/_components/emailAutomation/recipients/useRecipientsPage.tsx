import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Contact, ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { LocalStorageKeys } from '@/constants/constants';
import { hasContactsReadOnlyPermission } from '@/app/utils/googlePermissions';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';

export const useRecipientsPage = () => {
	const columns: ColumnDef<ContactList>[] = [
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
				// TODO set state
			} catch (error) {
				if (error instanceof Error) {
					toast.error('Error fetching Google contacts: ' + error.message);
				}
				throw error;
			}
		} else {
			setIsPermissionsDialogOpen(true);
		}
	};

	const [isContactListDialogOpen, setIsContactListDialogOpen] = useState(false);
	const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
	const [selectedContactList, setSelectedContactList] = useState<ContactList | null>(
		null
	);

	const handleRowClick = (rowData: ContactList) => {
		console.log('🚀 ~ handleRowClick ~ rowData:', rowData);
		setIsContactListDialogOpen(true);
		setSelectedContactList(rowData);
	};

	const { data: dataContactLists, isPending: isPendingContactLists } = useQuery<
		ContactList[]
	>({
		queryKey: ['contact-list'],
		queryFn: async () => {
			const response = await fetch(`/api/contact-list/`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message);
			}
			return await response.json();
		},
	});

	return {
		columns,
		handleRowClick,
		dataContactLists,
		isPendingContactLists,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		selectedContactList,
		setSelectedContactList,
	};
};

export interface ContactListDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	selectedContactList: ContactList | null;
}

export const useContactListDialog = (props: ContactListDialogProps) => {
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
	const { selectedContactList, isOpen, setIsOpen } = props;
	const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (categories: string[]) => {
			const response = await fetch('/api/contacts/get-by-category', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ categories }),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	useEffect(() => {
		if (selectedContactList) {
			fetchContacts([selectedContactList.category]);
		}
	}, [selectedContactList, fetchContacts]);

	return {
		data,
		isPending,
		fetchContacts,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
	};
};
