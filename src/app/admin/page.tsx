'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { urls } from '@/constants/urls';
import Link from 'next/link';

const AdminHome = () => {
	return (
		<Card size="md">
			<CardHeader>
				<CardTitle>Admin Home</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4 items-center">
					<Link href={urls.admin.contacts.index}>
						<Button>Contact Management</Button>
					</Link>
					<Link href={urls.admin.products.index}>
						<Button> Product Management</Button>
					</Link>
					<Link href={urls.admin.users.index}>
						<Button> User Management</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
};

export default AdminHome;
