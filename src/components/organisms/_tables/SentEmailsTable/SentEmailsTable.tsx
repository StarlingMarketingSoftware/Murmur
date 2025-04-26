import { FC } from 'react';
import { SentEmailsTableProps, useSentEmailsTable } from './useSentEmailsTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import EmailsTable from '../EmailsTable/EmailsTable';

export const SentEmailsTable: FC<SentEmailsTableProps> = (props) => {
	const { sentEmails, isPending } = useSentEmailsTable(props);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sent Emails</CardTitle>
			</CardHeader>
			<CardContent>
				<EmailsTable
					emails={sentEmails}
					isPending={isPending}
					noDataMessage="Emails will appear here as they are sent."
				/>
			</CardContent>
		</Card>
	);
};
