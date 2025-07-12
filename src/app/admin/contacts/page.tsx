'use client';

import { useManageContacts } from './useManageContacts';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import CreateContactListDialog from '@/components/organisms/_dialogs/CreateContactListDialog/CreateContactListDialog';
import ContactVerificationTable from '@/components/organisms/_tables/ContactVerificationTable/ContactVerificationTable';
import ContactTSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactTSVUploadDialog';
const ManageContactsPage = () => {
	const { contactLists, isPendingContactLists, columns, handleRowClick } =
		useManageContacts();
	return (
		<>
			<ContactTSVUploadDialog isPrivate={false} triggerText="Upload Contacts via TSV" />
			<Card size="lg">
				<CardHeader>
					<CardTitle>Manage Contact Lists</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<CreateContactListDialog />
					{isPendingContactLists ? (
						<Spinner />
					) : (
						<CustomTable
							columns={columns}
							data={contactLists}
							handleRowClick={handleRowClick}
						/>
					)}
				</CardContent>
			</Card>
			<Card size="lg">
				<CardHeader>
					<CardTitle>Contact Verification</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<ContactVerificationTable />
				</CardContent>
			</Card>
		</>
	);
};

export default ManageContactsPage;
