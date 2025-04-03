import { CampaignWithRelations } from '@/constants/types';
import { FC } from 'react';
import SavedDraftsTable from './SavedDraftsTable/SavedDraftsTable';
import ComposeEmailSection from './ComposeEmailSection/ComposeEmailSection';
import { Card, CardContent } from '@/components/ui/card';

interface DraftsPageProps {
	campaign: CampaignWithRelations;
}

const DraftPage: FC<DraftsPageProps> = ({ campaign }) => {
	return (
		<>
			<ComposeEmailSection campaign={campaign} />
			<Card className="relative">
				<CardContent>
					<SavedDraftsTable />
				</CardContent>
			</Card>
		</>
	);
};

export default DraftPage;
