import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardTitle,
} from '@/components/ui/card';
import { FC } from 'react';
import CustomTable from '../../../CustomTable';
import Spinner from '@/components/ui/spinner';
import { RecipientsTableProps, useRecipientsTable } from './useRecipientsTable';

const RecipientsTable: FC<RecipientsTableProps> = (props) => {
	const { columns, contacts, isPendingRemoveContacts } = useRecipientsTable(props);

	if (!contacts) {
		return <Spinner />;
	}

	return (
		<>
			<Card className="relative">
				{isPendingRemoveContacts && (
					<Spinner size="medium" className="absolute top-2 right-2" />
				)}
				<CardHeader>
					<CardTitle>Selected Recipients</CardTitle>
					<CardDescription>
						Recipients you have selected for this campaign.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<CustomTable
						columns={columns}
						data={contacts}
						noDataMessage="There are no selected recipients for this campaign, please select from the table above."
					/>
				</CardContent>
			</Card>
		</>
	);
};

export default RecipientsTable;
