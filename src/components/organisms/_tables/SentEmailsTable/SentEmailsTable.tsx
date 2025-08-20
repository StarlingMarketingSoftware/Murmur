import { FC } from 'react';
import { SentEmailsTableProps, useSentEmailsTable } from './useSentEmailsTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Spinner } from '@/components/atoms/Spinner/Spinner';

export const SentEmailsTable: FC<SentEmailsTableProps> = (props) => {
	const {
		columns,
		isPendingEmails,
		handleRowClick,
		isDraftDialogOpen,
		selectedDraft,
		setIsDraftDialogOpen,
		sentEmails,
	} = useSentEmailsTable(props);

	if (sentEmails.length === 0) {
		return null;
	}

	return (
		<Card className="mt-12" variant="secondary">
			<CardHeader>
				<CardTitle>Sent Emails</CardTitle>
			</CardHeader>
			<CardContent>
				{isPendingEmails ? (
					<Spinner />
				) : (
					<CustomTable
						columns={columns}
						data={sentEmails}
						singleSelection
						noDataMessage={'Emails will appear here as they are sent.'}
						handleRowClick={handleRowClick}
					/>
				)}
				<ViewEditEmailDialog
					email={selectedDraft}
					isOpen={isDraftDialogOpen}
					setIsOpen={setIsDraftDialogOpen}
					showRecipientEmail
				/>
			</CardContent>
		</Card>
	);
};
