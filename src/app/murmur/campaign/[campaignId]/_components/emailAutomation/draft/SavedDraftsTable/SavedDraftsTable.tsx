import { Card, CardContent } from '@/components/ui/card';
import { FC } from 'react';
import CustomTable from '../../../CustomTable';
import { useAppSelector } from '@/lib/redux/hooks';
import { useSavedDraftsTable } from './useSavedDraftsTable';
import Spinner from '@/components/ui/spinner';

const SavedDraftsTable: FC = () => {
	const { data, columns, isPending } = useSavedDraftsTable();

	if (isPending) {
		return <Spinner />;
	}
	return (
		<Card>
			<CardContent>
				<CustomTable
					columns={columns}
					data={data}
					singleSelection
					noDataMessage="Drafts will appear here as they are created."
				/>
			</CardContent>
		</Card>
	);
};

export default SavedDraftsTable;
