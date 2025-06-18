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

const ContactListTable: FC<ContactListTableProps> = (props) => {
	const {
		columns,
		dataContactLists,
		isPendingContactLists,
		handleRowClick,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		selectedContactList,
		setSelectedRows,
	} = useContactListTable(props);

	if (isPendingContactLists) {
		return <Spinner />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Contact Lists</CardTitle>
				<CardDescription>
					Click on a list to view and select individual recipients.
				</CardDescription>
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
			{/* <SelectRecipientsDialog
				isOpen={isContactListDialogOpen}
				setIsOpen={setIsContactListDialogOpen}
				selectedContactList={selectedContactList}
				selectedRecipients={campaign.contacts}
			/> */}
		</Card>
	);
};

export default ContactListTable;
