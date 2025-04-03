import { Card, CardContent } from '@/components/ui/card';
import { FC } from 'react';
import CustomTable from '../../../CustomTable';
import { useSavedDraftsTable } from './useSavedDraftsTable';
import Spinner from '@/components/ui/spinner';
import ViewEditEmailDialog from '@/app/murmur/_components/ViewEditEmailDialog/ViewEditEmailDialog';

const SavedDraftsTable: FC = () => {
	const {
		data,
		columns,
		isPending,
		handleRowClick,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		selectedDraft,
		isPendingDeleteEmail,
	} = useSavedDraftsTable();

	if (isPending) {
		return <Spinner />;
	}
	return (
		<Card className="relative">
			{isPendingDeleteEmail && (
				<Spinner size="medium" className="absolute top-2 right-2" />
			)}
			<CardContent>
				<CustomTable
					columns={columns}
					data={data}
					singleSelection
					noDataMessage="Drafts will appear here as they are created."
					handleRowClick={handleRowClick}
				/>
			</CardContent>
			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
			/>
		</Card>
	);
};

export default SavedDraftsTable;
