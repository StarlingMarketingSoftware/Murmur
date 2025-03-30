'use client';

import { useState } from 'react';
import Spinner from '@/components/ui/spinner';
import { TypographyH2 } from '@/components/ui/typography';
import { useContactLists } from '@/hooks/useContactLists';
import { ContactList } from '@prisma/client';
import SelectRecipientsStep1 from './SelectRecipientsStep1';
import SelectRecipientsStep2 from './SelectRecipientsStep2';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';

const SelectRecipients = () => {
	const step2 = useAppSelector((state) => state.murmur.recipients.step2);
	const selectedContactLists = useAppSelector(
		(state) => state.murmur.recipients.selectedContactLists
	);
	console.log('🚀 ~ SelectRecipients ~ selectedContactLists:', selectedContactLists);
	const { data, isPending } = useContactLists();

	if (isPending) {
		return <Spinner />;
	}
	return (
		<>
			<TypographyH2>Contact Lists</TypographyH2>
			<SelectRecipientsStep1 contactLists={data!} />
			{step2 && (
				<SelectRecipientsStep2
					categories={selectedContactLists.map((row) => row.category)}
				/>
			)}
		</>
	);
};

export default SelectRecipients;
