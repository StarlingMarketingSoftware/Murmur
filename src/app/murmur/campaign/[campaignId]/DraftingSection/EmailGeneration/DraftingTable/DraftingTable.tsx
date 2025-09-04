import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

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
		<div style={{ width: '366px', height: '489px', position: 'relative' }}>
			{/* Container box with header */}
			<div
				data-drafting-table
				style={{
					width: '100%',
					height: '100%',
					border: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Header section with top rounded corners */}
				<div
					data-drafting-table-header
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: '2px solid #ABABAB',
						padding: '12px 16px',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						height: '48px',
						backgroundColor: 'white',
					}}
				>
					<div style={{ transform: 'translateY(-6px)' }}>
						<div className="text-sm font-inter font-medium text-black">{title}</div>
					</div>
					{hasData && (
						<div style={{ transform: 'translateY(6px)' }}>
							<Button
								type="button"
								variant="ghost"
								className="text-sm font-inter font-medium text-black bg-none border-none cursor-pointer p-0 hover:underline transition-colors"
								onClick={handleClick}
							>
								{areAllSelected ? 'Deselect All' : 'Select All'}
							</Button>
						</div>
					)}
				</div>

				{/* Content area */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-6}
				>
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
				</CustomScrollbar>

				{/* Progress bar - positioned at bottom of container */}
				{title === 'Contacts' && (
					<div className="px-4 py-2 border-t-2 border-[#ABABAB]">
						<div className="flex items-center gap-3">
							<div className="text-xs font-inter text-gray-600 flex-none">
								{generationProgress >= 0 && totalContacts > 0
									? generationProgress >= totalContacts
										? `Drafted ${Math.min(
												generationProgress,
												totalContacts
										  )}/${totalContacts}`
										: `Drafting ${generationProgress}/${totalContacts}`
									: 'Ready to draft'}
							</div>

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

							{onCancel && generationProgress >= 0 && (
								<button
									type="button"
									onClick={onCancel}
									className="ml-2 p-0 h-auto w-auto bg-transparent border-0 text-black hover:text-red-600 transition-colors cursor-pointer"
									aria-label="Cancel drafting"
								>
									×
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
