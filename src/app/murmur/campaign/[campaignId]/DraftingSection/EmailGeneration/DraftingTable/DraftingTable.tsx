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
	footer?: ReactNode;
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
	footer,
}) => {
	const isContacts = title === 'Contacts';
	const isCompactHeader = isContacts || title === 'Drafts';
	const showTitle = !isContacts && title !== 'Drafts';
	const isDrafts = title === 'Drafts';
	return (
		<div style={{ width: '376px', height: '474px', position: 'relative' }}>
			{/* Container box with header */}
			<div
				data-drafting-table
				style={{
					width: '100%',
					height: '100%',
					border: isContacts
						? '2.3px solid #5D5B5B'
						: isDrafts
						? '2px solid #A8833A'
						: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: isContacts ? '#F5DADA' : isDrafts ? '#EFDAAF' : 'white',
				}}
			>
				{/* Header section with top rounded corners */}
				<div
					data-drafting-table-header
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: isCompactHeader ? 'none' : '2px solid #ABABAB',
						padding: isCompactHeader ? '6px 16px' : '12px 16px',
						display: 'flex',
						justifyContent: isCompactHeader ? 'flex-end' : 'space-between',
						alignItems: 'center',
						height: isCompactHeader ? '32px' : '48px',
						backgroundColor: isContacts ? '#F5DADA' : isDrafts ? '#EFDAAF' : 'white',
					}}
				>
					{showTitle && (
						<div style={{ transform: 'translateY(-6px)' }}>
							<div className="text-sm font-inter font-medium text-black">{title}</div>
						</div>
					)}
					{hasData && (
						<div
							style={{ transform: isCompactHeader ? 'translateY(0)' : 'translateY(6px)' }}
						>
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

				{/* Optional footer area (e.g., Send button for Drafts) */}
				{footer && (
					<div
						data-drafting-table-footer
						style={{
							padding: isCompactHeader ? '6px 16px' : '12px 16px',
							backgroundColor: isContacts ? '#F5DADA' : isDrafts ? '#EFDAAF' : 'white',
						}}
					>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
};
