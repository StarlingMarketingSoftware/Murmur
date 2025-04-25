'use client';

import { useManageContacts } from './useManageContacts';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import CustomTable from '@/app/murmur/campaign/[campaignId]/_components/CustomTable';
import CreateContactListDialog from '@/components/organisms/dialogs/CreateContactListDialog/CreateContactListDialog';
const ManageContactsPage = () => {
	const { contactLists, isPendingContactLists, columns, handleRowClick } =
		useManageContacts();
	return (
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
	);
};

export default ManageContactsPage;
