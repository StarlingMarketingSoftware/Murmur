'use client';

import Spinner from '@/components/ui/spinner';
import { TypographyH2 } from '@/components/ui/typography';
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import CustomTable from '../../CustomTable';
import { useRecipientsPage } from './useRecipientsPage';
import ContactListDialog from './ContactListDialog';

const SelectRecipients = () => {
	const {
		columns,
		dataContactLists,
		handleRowClick,
		isContactListDialogOpen,
		isPendingContactLists,
		setIsContactListDialogOpen,
		selectedContactList,
	} = useRecipientsPage();

	if (isPendingContactLists) {
		return <Spinner />;
	}
	return (
		<>
			<TypographyH2>Contact Lists</TypographyH2>
			<Card>
				<CardHeader>
					<CardDescription>
						Select a list to manage or import from Google Contacts.
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
		</>
	);
};

export default SelectRecipients;
