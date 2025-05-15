'use client';

import { FC } from 'react';
import { CampaignWithRelations } from '@/types/types';
import RecipientsTable from '@/components/organisms/_tables/RecipientsTable/RecipientsTable';
import ContactListTable from '@/components/organisms/_tables/ContactListTable/ContactListTable';

export interface RecipientsPageProps {
	campaign: CampaignWithRelations;
}

const SelectRecipients: FC<RecipientsPageProps> = ({ campaign }) => {
	return (
		<>
			<ContactListTable campaign={campaign} />
			<RecipientsTable contacts={campaign.contacts} />
		</>
	);
};

export default SelectRecipients;
