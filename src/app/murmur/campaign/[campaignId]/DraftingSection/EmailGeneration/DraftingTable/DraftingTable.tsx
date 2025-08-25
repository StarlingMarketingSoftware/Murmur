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
}) => {
	return (
		<div>
			<div className="text-sm font-inter font-medium text-black">{title}</div>
			<div className="flex w-full justify-end">
				<Button
					type="button"
					variant="ghost"
					className="text-sm font-inter font-medium text-black bg-none border-none cursor-pointer p-0 hover:underline transition-colors"
					onClick={handleClick}
				>
					{areAllSelected ? 'Deselect All' : 'Select All'}
				</Button>
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
		</div>
	);
};
