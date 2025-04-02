import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { FC } from 'react';
import CustomTable from '../../CustomTable';
import Spinner from '@/components/ui/spinner';
import { RecipientsTableProps, useRecipientsTable } from './useRecipientsPage';

const RecipientsTable: FC<RecipientsTableProps> = (props) => {
	const { columns, contacts } = useRecipientsTable(props);

	if (!contacts) {
		return <Spinner />;
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardDescription>Select individual recipients.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<CustomTable columns={columns} data={contacts} />
				</CardContent>
			</Card>
		</>
	);
};

export default RecipientsTable;
