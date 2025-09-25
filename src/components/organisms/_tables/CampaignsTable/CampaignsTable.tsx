import { FC, useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { X } from 'lucide-react';
import { Campaign } from '@prisma/client';

export const CampaignsTable: FC = () => {
	const [isMobilePortrait, setIsMobilePortrait] = useState<boolean | null>(null);

	const shouldShowMobileFeatures = isMobilePortrait === true;

	const {
		data,
		isPending,
		columns,
		handleRowClick,
		handleDeleteClick,
		confirmingCampaignId,
	} = useCampaignsTable({ compactMetrics: shouldShowMobileFeatures });

	// Check if we're in mobile portrait mode
	useEffect(() => {
		const checkOrientation = () => {
			const isPortrait = window.innerHeight > window.innerWidth;
			const isMobile = window.innerWidth <= 640;
			setIsMobilePortrait(isPortrait && isMobile);
		};

		checkOrientation();
		window.addEventListener('resize', checkOrientation);
		window.addEventListener('orientationchange', checkOrientation);

		return () => {
			window.removeEventListener('resize', checkOrientation);
			window.removeEventListener('orientationchange', checkOrientation);
		};
	}, []);

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto !p-0">
			{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
			<CardHeader className="px-4 pb-0 bg-transparent">
				<CardTitle
					className="text-left text-[14px] font-inter font-medium mb-0.5"
					variant="secondary"
					style={{ fontFamily: 'Inter, sans-serif' }}
				>
					My Campaigns
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 w-full px-0 pb-6 pt-0">
				<div
					className={`mobile-campaigns-wrapper ${
						shouldShowMobileFeatures ? 'mobile-portrait-mode' : ''
					}`}
				>
					<div className="campaigns-table-container" id="campaigns-table-container">
						{shouldShowMobileFeatures ? (
							// Mobile portrait mode: wrapper scroll container with table and delete buttons
							<div className="mobile-scroll-wrapper">
								<div className="mobile-table-and-buttons">
									<CustomTable
										variant="secondary"
										containerClassName="border-[2px] border-[#8C8C8C] rounded-[8px] my-campaigns-table mobile-table-no-scroll"
										handleRowClick={handleRowClick}
										columns={columns.filter((col) => col.id !== 'delete')}
										data={data}
										noDataMessage="No campaigns found."
										rowsPerPage={100}
										displayRowsPerPage={false}
										constrainHeight={false}
										hidePagination={true}
										searchable={false}
										useAutoLayout
										useCustomScrollbar={false}
										scrollbarOffsetRight={0}
										nativeScroll={false}
									/>
									{data && data.length > 0 && (
										<div className="mobile-delete-buttons-column">
											{data.map((campaign: Campaign) => (
												<button
													key={campaign.id}
													type="button"
													aria-label="Delete campaign"
													className="mobile-delete-btn"
													data-campaign-id={campaign.id}
													onClick={(e) => handleDeleteClick(e, campaign.id)}
												>
													<X
														className="w-[20px] h-[20px]"
														style={{
															color:
																campaign.id === confirmingCampaignId
																	? '#FFFFFF'
																	: '#000000',
														}}
													/>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
						) : (
							// Desktop mode: normal table with delete column
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
								scrollbarOffsetRight={0}
								nativeScroll={false}
							/>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
