'use client';

import Spinner from '@/components/ui/spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Button } from '@/components/ui/button';
import { useContactVerificationTable } from './useContactVerificationTable';
import { CheckIcon } from 'lucide-react';
const ContactVerificationTable = () => {
	const {
		contactVerificationRequests,
		isPendingContactVerificationRequests,
		isPendingVerifyContacts,
		handleVerifyAllContacts,
		columns,
	} = useContactVerificationTable();
	return (
		<>
			<Button onClick={handleVerifyAllContacts} isLoading={isPendingVerifyContacts}>
				<CheckIcon />
				Verify All Contacts
			</Button>
			{isPendingContactVerificationRequests ? (
				<Spinner />
			) : (
				<CustomTable columns={columns} data={contactVerificationRequests} />
			)}
		</>
	);
};

export default ContactVerificationTable;
