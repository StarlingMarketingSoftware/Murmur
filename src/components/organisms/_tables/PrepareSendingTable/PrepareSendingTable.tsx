import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import EmailsTable from '../EmailsTable/EmailsTable';
import { FC } from 'react';
import {
	PrepareSendingTableProps,
	usePrepareSendingTable,
} from './usePrepareSendingTable';
import { ConfirmSendDialog } from '../../_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import Spinner from '@/components/ui/spinner';

export const PrepareSendingTable: FC<PrepareSendingTableProps> = (props) => {
	const { campaign, draftEmails, isPendingEmails, sendingProgress, setSendingProgress } =
		usePrepareSendingTable(props);

	if (isPendingEmails) {
		return <Spinner />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Drafted Emails</CardTitle>
			</CardHeader>
			<CardContent>
				<EmailsTable
					emails={draftEmails}
					isPending={isPendingEmails}
					noDataMessage="No draft emails were found."
					isEditable
				/>
				<ConfirmSendDialog
					setSendingProgress={setSendingProgress}
					campaign={campaign}
					draftEmails={draftEmails}
				/>
				<ProgressIndicator
					progress={sendingProgress}
					total={draftEmails.length}
					setProgress={setSendingProgress}
					pendingMessage="Sending {{progress}} emails..."
					completeMessage="Finished sending {{progress}} emails."
				/>
			</CardContent>
		</Card>
	);
};
