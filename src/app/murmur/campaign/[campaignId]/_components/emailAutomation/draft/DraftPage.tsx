import { FC } from 'react';
import EmailsTable from '../EmailsTable/EmailsTable';
import ComposeEmailSection from './ComposeEmailSection/ComposeEmailSection';
import { Card, CardContent } from '@/components/ui/card';
import { DraftsPageProps, useDraftPage } from './useDraftPage';
import Spinner from '@/components/ui/spinner';

const DraftPage: FC<DraftsPageProps> = (props) => {
	const { draftEmails, isPending, campaign } = useDraftPage(props);

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

export default DraftPage;
