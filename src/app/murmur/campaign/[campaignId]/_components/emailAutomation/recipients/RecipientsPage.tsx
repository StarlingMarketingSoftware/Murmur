'use client';

import Spinner from '@/components/ui/spinner';
import { TypographyH2 } from '@/components/ui/typography';
import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardTitle,
} from '@/components/ui/card';
import CustomTable from '../../CustomTable';
import { RecipientsPageProps, useRecipientsPage } from './useRecipientsPage';
import ContactListDialog from './ContactListDialog';
import RecipientsTable from './RecipientsTable';
import { FC } from 'react';

const SelectRecipients: FC<RecipientsPageProps> = (props) => {
	const {
		columns,
		dataContactLists,
		handleRowClick,
		isContactListDialogOpen,
		isPendingContactLists,
		setIsContactListDialogOpen,
		selectedContactList,
		campaign,
	} = useRecipientsPage(props);

	if (isPendingContactLists) {
		return <Spinner />;
	}
	return (
		<>
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
			<RecipientsTable contacts={campaign.contacts} />
		</>
	);
};

export default SelectRecipients;
