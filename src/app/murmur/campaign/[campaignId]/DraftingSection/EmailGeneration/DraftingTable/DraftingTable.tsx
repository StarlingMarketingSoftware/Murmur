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
	const isContacts = title === 'Contacts';
	return (
		<div style={{ width: '376px', height: '474px', position: 'relative' }}>
			{/* Container box with header */}
			<div
				data-drafting-table
				style={{
					width: '100%',
					height: '100%',
					border: isContacts ? '2.3px solid #5D5B5B' : '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: isContacts ? '#F5DADA' : 'white',
				}}
			>
				{/* Header section with top rounded corners */}
				<div
					data-drafting-table-header
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: isContacts ? 'none' : '2px solid #ABABAB',
						padding: isContacts ? '6px 16px' : '12px 16px',
						display: 'flex',
						justifyContent: isContacts ? 'flex-end' : 'space-between',
						alignItems: 'center',
						height: isContacts ? '32px' : '48px',
						backgroundColor: isContacts ? '#F5DADA' : 'white',
					}}
				>
					{!isContacts && (
						<div style={{ transform: 'translateY(-6px)' }}>
							<div className="text-sm font-inter font-medium text-black">{title}</div>
						</div>
					)}
					{hasData && (
						<div style={{ transform: isContacts ? 'translateY(0)' : 'translateY(6px)' }}>
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
					offsetRight={-5}
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

				{/* Progress bar removed from Contacts table; now displayed below Draft button in MiniEmailStructure */}
			</div>
		</div>
	);
};
