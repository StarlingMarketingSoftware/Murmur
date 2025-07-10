import { FC } from 'react';
import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardTitle,
} from '@/components/ui/card';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { ContactListTableProps, useContactListTable } from './useContactListTable';
import Spinner from '@/components/ui/spinner';
import SelectRecipientsDialog from '../../_dialogs/SelectRecipientsDialog/SelectRecipientsDialog';
import { ConfirmDialog } from '../../_dialogs/ConfirmDialog/ConfirmDialog';
import { Typography } from '@/components/ui/typography';

const ContactListTable: FC<ContactListTableProps> = (props) => {
	const {
		columns,
		dataContactLists,
		isPendingContactLists,
		handleRowClick,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		setSelectedRows,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		currentContactList,
		handleConfirmDelete,
	} = useContactListTable(props);

	if (isPendingContactLists) {
		return <Spinner />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Contact Lists</CardTitle>
				<CardDescription>Select lists and create your campaign.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<CustomTable
					columns={columns}
					data={dataContactLists}
					handleRowClick={handleRowClick}
					isSelectable
					setSelectedRows={setSelectedRows}
				/>
			</CardContent>
			<SelectRecipientsDialog
				isOpen={isContactListDialogOpen}
				setIsOpen={setIsContactListDialogOpen}
				selectedContactList={currentContactList}
			/>
			<ConfirmDialog
				title="Confirm Contact List Deletion"
				confirmAction={handleConfirmDelete}
				open={isConfirmDialogOpen}
				onOpenChange={setIsConfirmDialogOpen}
			>
				<Typography>
					Are you sure you want to delete the following contact list? Associated contacts
					will not be deleted.
				</Typography>
				<Typography className="text-center" bold>
					{currentContactList?.name}
				</Typography>
			</ConfirmDialog>
		</Card>
	);
};

export default ContactListTable;
