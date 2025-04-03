import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import SavedDraftsTable from '../../draft/SavedDraftsTable/SavedDraftsTable';
import { ConfirmSendDialog } from '../ConfirmSendDialog/ConfirmSendDialog';
import { FC } from 'react';
import {
	PrepareSendingTableProps,
	usePrepareSendingTable,
} from './usePrepareSendingTable';

export const PrepareSendingTable: FC<PrepareSendingTableProps> = (props) => {
	const { campaign, draftEmails } = usePrepareSendingTable(props);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Drafts to be Sent</CardTitle>
			</CardHeader>
			<CardContent>
				<SavedDraftsTable />
				<ConfirmSendDialog campaign={campaign} draftEmails={draftEmails} />
			</CardContent>
		</Card>
	);
};
