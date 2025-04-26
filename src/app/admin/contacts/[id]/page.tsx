'use client';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { useManageContactListDetail } from './useManageContactListDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ContactCSVUploadDialog from '@/components/organisms/_dialogs/ContactCSVUploadDialog/ContactCSVUploadDialog';

const ManageContactListDetail: FC = () => {
	const { data, isPending, columns, contactListData, isPendingContactList } =
		useManageContactListDetail();
	return (
		<>
			{isPending || isPendingContactList || !data ? (
				<Spinner />
			) : (
				<Card size="lg">
					<CardHeader>
						<CardTitle>{contactListData?.name}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-row gap-4">
							{/* <Button variant="default">
								<PlusIcon />
								Add Contact
							</Button> */}
							<ContactCSVUploadDialog />
						</div>
						<CustomTable
							columns={columns}
							data={data}
							noDataMessage="There are no contacts in this contact list."
						/>
					</CardContent>
				</Card>
			)}
		</>
	);
};

export default ManageContactListDetail;
