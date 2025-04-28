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
import ContactListDialog from '../../_dialogs/ContactListDialog/ContactListDialog';

const ContactListTable: FC<ContactListTableProps> = (props) => {
	const {
		columns,
		dataContactLists,
		isPendingContactLists,
		handleRowClick,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		selectedContactList,
		campaign,
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
				/>
			</CardContent>
			<ContactListDialog
				isOpen={isContactListDialogOpen}
				setIsOpen={setIsContactListDialogOpen}
				selectedContactList={selectedContactList}
				selectedRecipients={campaign.contacts}
			/>
			{/* <Button
    onClick={handleImportGoogleContacts}
    variant="outline"
    className="w-fit mx-auto flex items-center gap-2"
  >
    <FcGoogle />
    Import your Google Contacts
  </Button>
  <Button
    onClick={() => dispatch(setStep2(true))}
    disabled={selectedContactLists.length === 0}
    className="w-fit max-w-[500px] mx-auto"
  >
    Extract Contacts from Selected Lists
  </Button>
  <RequestPeopleAPIPermissionsDialog
    isOpen={isPermissionsDialogOpen}
    setIsOpen={setIsPermissionsDialogOpen}
  /> */}
		</Card>
	);
};

export default ContactListTable;
