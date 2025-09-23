import { FC } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';

export const CampaignsTable: FC = () => {
	const { data, isPending, columns, handleRowClick } = useCampaignsTable();

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto">
			{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
			<CardHeader className="px-6 pb-0 bg-transparent">
				<CardTitle
					className="text-left text-[14px] font-inter font-medium mb-0.5"
					variant="secondary"
					style={{ fontFamily: 'Inter, sans-serif' }}
				>
					My Campaigns
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 w-full px-6 pb-6 pt-0">
				<div className="campaigns-table-container" id="campaigns-table-container">
					<CustomTable
						variant="secondary"
						containerClassName="border-[2px] border-[#8C8C8C] rounded-[8px] my-campaigns-table"
						handleRowClick={handleRowClick}
						columns={columns}
						data={data}
						noDataMessage="No campaigns found."
						rowsPerPage={100}
						displayRowsPerPage={false}
						constrainHeight
						hidePagination={true}
						searchable={false}
						useAutoLayout
						useCustomScrollbar={true}
						scrollbarOffsetRight={-5}
					/>
				</div>
			</CardContent>
		</Card>
	);
};
