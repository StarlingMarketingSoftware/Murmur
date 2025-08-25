import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';

interface DraftingTableProps {
	handleClick: () => void;
	children: ReactNode;
	areAllSelected: boolean;
	hasData: boolean;
	noDataMessage: string;
	noDataDescription: string;
	isPending: boolean;
	title: string;
	generationProgress?: number;
	totalContacts?: number;
	onCancel?: () => void;
}
export const DraftingTable: FC<DraftingTableProps> = ({
	title,
	handleClick,
	children,
	areAllSelected,
	hasData,
	noDataMessage,
	noDataDescription,
	isPending,
	generationProgress = -1,
	totalContacts = 0,
	onCancel,
}) => {
	return (
		<div>
			<div className="text-sm font-inter font-medium text-black">{title}</div>
			<div className="flex w-full justify-end h-[20px] mb-2">
				{title !== 'Drafts' && (
					<Button
						type="button"
						variant="ghost"
						className="text-sm font-inter font-medium text-black bg-none border-none cursor-pointer p-0 hover:underline transition-colors -mt-1"
						onClick={handleClick}
					>
						{areAllSelected ? 'Deselect All' : 'Select All'}
					</Button>
				)}
			</div>
			{/* Left table - Contacts list */}
			<div className="bg-background border border-gray-300 overflow-auto custom-scroll w-[336px] h-[441px] overflow-x-hidden overflow-y-auto pr-[10px]">
				{isPending ? (
					<div className="flex items-center justify-center h-full">
						<Spinner size="small" />
					</div>
				) : (
					<>
						{hasData ? (
							children
						) : (
							<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
								<div className="text-sm font-semibold mb-2">{noDataMessage}</div>
								<div className="text-xs text-center">{noDataDescription}</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Progress bar underneath contacts table */}
			{title === 'Contacts' && (
				<div className="mt-2 w-[336px] flex items-center gap-3">
					{/* Progress text - left aligned */}
					<div className="text-xs font-inter text-gray-600 flex-none">
						{generationProgress >= 0 && totalContacts > 0
							? `Drafting ${generationProgress}/${totalContacts}`
							: 'Ready to draft'}
					</div>

					{/* Progress bar - fills remaining width */}
					<div className="flex-1 h-[7px] bg-[rgba(93,171,104,0.49)] border-0 relative">
						<div
							className="h-full bg-[#5DAB68] transition-all duration-300 ease-out absolute top-0 left-0"
							style={{
								width: `${
									generationProgress >= 0 && totalContacts > 0
										? Math.min((generationProgress / totalContacts) * 100, 100)
										: 0
								}%`,
							}}
						/>
					</div>

					{/* Cancel button */}
					{onCancel && generationProgress >= 0 && (
						<button
							type="button"
							onClick={onCancel}
							className="ml-2 w-[16px] h-[16px] flex items-center justify-center text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors cursor-pointer"
							aria-label="Cancel drafting"
						>
							×
						</button>
					)}
				</div>
			)}
		</div>
	);
};
