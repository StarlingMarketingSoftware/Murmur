import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import EmailsTable from '../EmailsTable/EmailsTable';
import { FC } from 'react';
import {
	PrepareSendingTableProps,
	usePrepareSendingTable,
} from './usePrepareSendingTable';
import { ConfirmSendDialog } from '../../_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';

export const PrepareSendingTable: FC<PrepareSendingTableProps> = (props) => {
	const { campaign, draftEmails, isPending, sendingProgress, setSendingProgress } =
		usePrepareSendingTable(props);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Drafts to be Sent</CardTitle>
			</CardHeader>
			<CardContent>
				<EmailsTable
					emails={draftEmails}
					isPending={isPending}
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
