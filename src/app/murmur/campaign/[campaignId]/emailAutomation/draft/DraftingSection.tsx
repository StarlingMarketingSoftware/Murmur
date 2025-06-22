import { FC } from 'react';
import EmailsTable from '../../../../../../components/organisms/_tables/EmailsTable/EmailsTable';
import ComposeEmailSection from '../../../../../../components/organisms/ComposeEmailSection/ComposeEmailSection';
import { Card, CardContent } from '@/components/ui/card';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import Spinner from '@/components/ui/spinner';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const { draftEmails, isPending, campaign } = useDraftingSection(props);

	if (isPending) {
		return <Spinner />;
	}

	return (
		<>
			<ComposeEmailSection campaign={campaign} />
			<Card className="relative">
				<CardContent>
					<EmailsTable
						isEditable
						emails={draftEmails}
						isPending={isPending}
						noDataMessage="Drafts will appear here as they are created."
					/>
				</CardContent>
			</Card>
		</>
	);
};
