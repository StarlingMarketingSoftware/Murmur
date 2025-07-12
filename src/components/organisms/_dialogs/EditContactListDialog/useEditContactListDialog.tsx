import { Contact, UserContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import {
	useEditUserContactList,
	useGetUserContactList,
} from '@/hooks/queryHooks/useUserContactLists';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';

export interface EditContactListDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	selectedContactList: UserContactList | null;
}

export const useEditContactListDialog = (props: EditContactListDialogProps) => {
	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				if (!name) return <NoDataCell />;

				return <div className="text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return subscriptionTier?.viewEmailAddresses ? (
					<div className="text-left">{row.getValue('email')}</div>
				) : (
					<FeatureLockedButton message={RESTRICTED_FEATURE_MESSAGES.viewEmails} />
				);
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
			accessorKey: 'city',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="City" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('city')}</div>;
			},
		},
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
			id: 'action',
			cell: ({ row }) => (
				<TableDeleteRowButton
					disabled={isPendingRemoveContactFromContactList}
					onClick={async () => {
						removeContactFromContactList({
							id: selectedContactList?.id || 0,
							data: {
								contactOperation: {
									action: 'disconnect',
									contactIds: [row.original.id],
								},
							},
						});
					}}
				/>
			),
		},
	];
	const { selectedContactList, isOpen, setIsOpen } = props;

	const { subscriptionTier } = useMe();
	const { data, isPending } = useGetUserContactList(
		selectedContactList?.id.toString() || ''
	);

	const {
		mutate: removeContactFromContactList,
		isPending: isPendingRemoveContactFromContactList,
	} = useEditUserContactList({
		successMessage: 'Contact removed from contact list',
		errorMessage: 'Failed to remove contact from contact list',
	});

	return {
		data,
		isPending,
		isOpen,
		setIsOpen,
		columns,
		selectedContactList,
	};
};
