import { FC } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { ConfirmDialog } from '../../_dialogs/ConfirmDialog/ConfirmDialog';

export const CampaignsTable: FC = () => {
	const {
		data,
		isPending,
		columns,
		handleRowClick,
		currentRow,
		deleteCampaign,
		isPendingDelete,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
	} = useCampaignsTable();

	return (
		<>
			<Card className="relative border-none bg-gradient-to-l from-gray-100 via-background to-gray-100 w-full max-w-[1132px] mx-auto">
				{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
				<CardHeader>
					<CardTitle className="text-center text-2xl">Campaigns</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 w-full px-6 pb-6 pt-0">
					<div className="campaigns-table-container">
						<CustomTable
							variant="secondary"
							handleRowClick={handleRowClick}
							columns={columns}
							data={data}
							noDataMessage="No campaigns found."
							rowsPerPage={100}
							displayRowsPerPage={false}
							constrainHeight
							hidePagination={true}
							searchable={false}
							excludeFromEqualWidth={[]}
						/>
					</div>
				</CardContent>
			</Card>
			<ConfirmDialog
				open={isConfirmDialogOpen}
				placeholderText="Enter the name of the campaign."
				onClose={() => setIsConfirmDialogOpen(false)}
				confirmWithInput
				isLoading={isPendingDelete}
				confirmWithInputValue={currentRow?.name}
				title="Confirm Campaign Deletion"
				confirmAction={async () => {
					if (currentRow) {
						await deleteCampaign(currentRow.id);
						setIsConfirmDialogOpen(false);
					}
				}}
				text={`Are you sure you want to delete the campaign "${currentRow?.name}"? You will no longer be able to access the drafts and sent emails associated with this campaign.`}
			/>
		</>
	);
};
