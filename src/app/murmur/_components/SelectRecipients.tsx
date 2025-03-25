'use client';

import { useState } from 'react';
import Spinner from '@/components/ui/spinner';
import { TypographyH2 } from '@/components/ui/typography';
import { useContactLists } from '@/hooks/useContactLists';
import { ContactList } from '@prisma/client';
import SelectRecipientsStep2 from './SelectRecipientsStep2';
import SelectRecipientsStep1 from './SelectRecipientsStep1';

const SelectRecipients = () => {
	const [selectedRows, setSelectedRows] = useState<ContactList[]>([]);
	const [step2, setStep2] = useState(false);

	const { data, isPending } = useContactLists();

	if (isPending) {
		return <Spinner />;
	}
	return (
		<>
			<TypographyH2>Contact Lists</TypographyH2>
			<SelectRecipientsStep1
				selectedRows={selectedRows}
				setSelectedRows={setSelectedRows}
				contactLists={data!}
				setStep2={setStep2}
			/>
			{step2 && (
				<SelectRecipientsStep2 categories={selectedRows.map((row) => row.category)} />
			)}
		</>
	);
};

export default SelectRecipients;
