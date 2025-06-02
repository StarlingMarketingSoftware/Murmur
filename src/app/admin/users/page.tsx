'use client';

import { useManageUsers } from './useManageUsers';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';

const ManageUsersPage = () => {
	const { users, isPendingUsers, columns, handleRowClick } = useManageUsers();
	return (
		<Card size="lg">
			<CardHeader>
				<CardTitle>Manage Users</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{isPendingUsers ? (
					<Spinner />
				) : (
					<CustomTable columns={columns} data={users} handleRowClick={handleRowClick} />
				)}
			</CardContent>
		</Card>
	);
};

export default ManageUsersPage;
