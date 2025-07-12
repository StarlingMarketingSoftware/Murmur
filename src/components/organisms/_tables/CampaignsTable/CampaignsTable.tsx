import { FC } from 'react';
import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardTitle,
} from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
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
			<Card className="relative  border-none bg-gradient-to-l from-gray-100 via-background to-gray-100 max-w-]1250px] ">
				{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
				<CardHeader>
					<CardTitle className="text-center text-3xl">Your Campaigns</CardTitle>
					<CardDescription className="text-center !text-[15px] mt-2">
						Campaigns you have created.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<CustomTable
						variant="secondary"
						handleRowClick={handleRowClick}
						columns={columns}
						data={data}
						noDataMessage="No campaigns found."
					/>
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
