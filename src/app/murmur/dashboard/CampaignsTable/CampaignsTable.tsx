import { FC } from 'react';
import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardTitle,
} from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import CustomTable from '../../campaign/[campaignId]/_components/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { ConfirmModal } from '@/components/ConfirmModal/ConfirmModal';

export const CampaignsTable: FC = () => {
	const {
		data,
		isPending,
		columns,
		handleRowClick,
		currentRow,
		deleteCampaign,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
	} = useCampaignsTable();

	return (
		<>
			<Card className="relative">
				{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
				<CardHeader>
					<CardTitle>Selected Recipients</CardTitle>
					<CardDescription>
						Recipients you have selected for this campaign.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<CustomTable
						handleRowClick={handleRowClick}
						columns={columns}
						data={data}
						noDataMessage="You have no campaigns. Please create one to get started."
					/>
				</CardContent>
			</Card>
			<ConfirmModal
				open={isConfirmDialogOpen}
				onClose={() => setIsConfirmDialogOpen(false)}
				confirmWithInput
				confirmWithInputValue={currentRow?.name}
				title="Confirm Campaign Deletion"
				confirmAction={() => currentRow && deleteCampaign(currentRow?.id)}
				text={`Are you sure you want to delete the campaign "${currentRow?.name}"? You will no longer be able to access the drafts and sent emails associated with this campaign.`}
			/>
		</>
	);
};
