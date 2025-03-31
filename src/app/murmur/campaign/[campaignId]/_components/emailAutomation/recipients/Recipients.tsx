'use client';

import Spinner from '@/components/ui/spinner';
import { TypographyH2 } from '@/components/ui/typography';
import { useContactLists } from '@/hooks/useContactLists';
import SelectRecipientsStep1 from './SelectRecipientsStep1';
import SelectRecipientsStep2 from './SelectRecipientsStep2';
import { useAppSelector } from '@/lib/redux/hooks';

const SelectRecipients = () => {
	const step2 = useAppSelector((state) => state.murmur.recipients.step2);
	const selectedContactLists = useAppSelector(
		(state) => state.murmur.recipients.selectedContactLists
	);
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
