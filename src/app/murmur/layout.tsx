import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/api/_utils/user';
import { urls } from '@/constants/urls';
import { AccountType } from '@/constants/prismaEnums';
import MurmurLayoutClient from './MurmurLayoutClient';

export default async function MurmurLayout({ children }: { children: ReactNode }) {
	const user = await getUser();
	if (user?.accountType === AccountType.venue) {
		redirect(urls.venuePortal.index);
	}
	return <MurmurLayoutClient>{children}</MurmurLayoutClient>;
}
