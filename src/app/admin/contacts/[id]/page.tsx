'use client';

import { Button } from '@/components/ui/button';

import { FC } from 'react';
import Spinner from '@/components/ui/spinner';

import CustomTable from '@/app/murmur/campaign/[campaignId]/_components/CustomTable';
import { useManageContactListDetail } from './useManageContactListDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';

const ManageContactListDetail: FC = () => {
	const { data, isPending, columns } = useManageContactListDetail();
	return (
		<>
			{isPending || !data ? (
				<Spinner />
			) : (
				<Card className="w-29/30 mx-auto mt-4 max-w-[1920px]">
					<CardContent>
						<CardTitle>Contact List Title</CardTitle>
						<Button>
							<PlusIcon />
							Add Contact
						</Button>
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
