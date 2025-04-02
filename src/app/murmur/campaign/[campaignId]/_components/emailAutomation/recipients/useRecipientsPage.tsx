import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Campaign, Contact, ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, DeleteIcon, TrashIcon } from 'lucide-react';
import { LocalStorageKeys } from '@/constants/constants';
import { hasContactsReadOnlyPermission } from '@/app/utils/googlePermissions';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { CampaignWithRelations } from '@/constants/types';
import { useParams } from 'next/navigation';
import { updateCampaignSchema } from '@/app/api/campaigns/[campaignId]/route';
import { z } from 'zod';
import { TableSortingButton } from '../../CustomTable';

export interface RecipientsPageProps {
	campaign: CampaignWithRelations;
}

export const useRecipientsPage = (props: RecipientsPageProps) => {
	const columns: ColumnDef<ContactList>[] = [
		{
			accessorKey: 'category',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Category" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('category')}</div>;
			},
		},
		{
			accessorKey: 'count',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Count" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('count')}</div>;
			},
		},
	];
	const { campaign } = props;

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
		campaign,
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
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('name')}</div>;
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
			accessorKey: 'category',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Category" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('category')}</div>;
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('company')}</div>;
			},
		},
	];
	const { selectedContactList, isOpen, setIsOpen } = props;
	const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

	const params = useParams();
	const campaignId = params.campaignId as string;

	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (contactListIds: number[]) => {
			const response = await fetch('/api/contacts/get-by-category', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ contactListIds }),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	const queryClient = useQueryClient();

	const { isPendingUpdateCampaign, mutate: updateCampaign } = useMutation({
		mutationFn: async (campaign: z.infer<typeof updateCampaignSchema>) => {
			console.log('🚀 ~ mutationFn: ~ campaign:', campaign);
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(campaign),
			});
			console.log('🚀 ~ mutationFn: ~ response:', response);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success('Recipients saved successfully!');
			setIsOpen(false);
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
		},
		onError: () => {
			toast.error('Failed to save recipients. Please try again.');
		},
	});

	useEffect(() => {
		if (selectedContactList) {
			fetchContacts([selectedContactList.id]);
		}
	}, [selectedContactList, fetchContacts]);

	const saveSelectedRecipients = async () => {
		console.log('were updating campaign');
		if (selectedContactList && !!campaignId) {
			updateCampaign({
				contactIds: selectedRows.map((row) => row.id),
			});
		}
	};

	return {
		data,
		isPending,
		fetchContacts,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
		saveSelectedRecipients,
	};
};

export interface RecipientsTableProps {
	contacts: Contact[];
}

export const useRecipientsTable = (props: RecipientsTableProps) => {
	const { contacts } = props;

	const columns: ColumnDef<Contact>[] = [
		// {
		// 	id: 'select',
		// 	header: ({ table }) => (
		// 		<Checkbox
		// 			checked={
		// 				table.getIsAllPageRowsSelected() ||
		// 				(table.getIsSomePageRowsSelected() && 'indeterminate')
		// 			}
		// 			onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
		// 			aria-label="Select all"
		// 		/>
		// 	),
		// 	cell: ({ row }) => (
		// 		<Checkbox
		// 			checked={row.getIsSelected()}
		// 			onCheckedChange={(value) => row.toggleSelected(!!value)}
		// 			aria-label="Select row"
		// 		/>
		// 	),
		// },
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
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('email')}</div>;
			},
		},
		// {
		// 	accessorKey: 'website',
		// 	header: ({ column }) => {
		// 		return (
		// 			<Button
		// 				variant="ghost"
		// 				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
		// 			>
		// 				Website
		// 				<ArrowUpDown className="h-4 w-4" />
		// 			</Button>
		// 		);
		// 	},
		// 	cell: ({ row }) => {
		// 		return <div className="text-left">{row.getValue('website')}</div>;
		// 	},
		// },
		{
			accessorKey: 'state',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="State" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('state')}</div>;
			},
		},
		{
			accessorKey: 'country',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Country" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('country')}</div>;
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('company')}</div>;
			},
		},
		{
			id: 'delete',
			cell: ({ row }) => (
				<Button
					variant="ghost" // or any other variant like "outline", "default"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
				// <Checkbox
				// 	checked={row.getIsSelected()}
				// 	onCheckedChange={(value) => row.toggleSelected(!!value)}
				// 	aria-label="Select row"
				// />
			),
		},
	];

	return {
		columns,
		contacts,
	};
};
