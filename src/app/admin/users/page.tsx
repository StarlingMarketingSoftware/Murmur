'use client';

import { useManageUsers } from './useManageUsers';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';

const ManageUsersPage = () => {
	const {
		users,
		isPendingUsers,
		columns,
		handleRowClick,
		leads,
		isPendingLeads,
		leadsColumns,
	} = useManageUsers();
	return (
		<div>
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
			<Card size="lg">
				<CardHeader>
					<CardTitle>Manage Leads</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{isPendingLeads ? (
						<Spinner />
					) : (
						<CustomTable columns={leadsColumns} data={leads} />
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default ManageUsersPage;
