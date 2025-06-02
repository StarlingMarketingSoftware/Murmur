'use client';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import { useManageUserDetail } from './useManageContactListDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ManageContactListDetail: FC = () => {
	const { user, isPendingUser, handleGenerateFreeTrialCode, freeTrialCode } =
		useManageUserDetail();
	return (
		<>
			{isPendingUser ? (
				<Spinner />
			) : (
				<Card size="lg">
					<CardHeader>
						<CardTitle>{user?.firstName}</CardTitle>
					</CardHeader>
					<CardContent>
						<Button
							className="mb-2"
							onClick={handleGenerateFreeTrialCode}
							variant="default"
						>
							Generate Free Trial Code
						</Button>
						{freeTrialCode && <Input value={freeTrialCode} readOnly />}
					</CardContent>
				</Card>
			)}
		</>
	);
};

export default ManageContactListDetail;
