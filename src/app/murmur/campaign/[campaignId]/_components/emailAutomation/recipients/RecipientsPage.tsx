'use client';

import RecipientsTable from './RecipientsTable/RecipientsTable';
import { FC } from 'react';
import ContactListTable from './ContactListTable/ContactListTable';
import { CampaignWithRelations } from '@/constants/types';

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
