import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

export const ContactsHeaderChrome: FC<{ offsetY?: number }> = ({ offsetY = 0 }) => {
	const pillTop = 3 + offsetY;
	const dotTop = 10 + offsetY;

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: '21px',
					width: '72px',
					height: '22px',
					backgroundColor: '#F5DADA',
					border: '2px solid #8D5B5B',
					borderRadius: '11px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
				}}
			>
				<span className="text-[13px] font-semibold font-inter text-black leading-none">
					Contacts
				</span>
			</div>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: '117px',
					width: '9px',
					height: '9px',
					borderRadius: '50%',
					backgroundColor: '#D9D9D9',
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: '176px',
					width: '9px',
					height: '9px',
					borderRadius: '50%',
					backgroundColor: '#D9D9D9',
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: '235px',
					width: '9px',
					height: '9px',
					borderRadius: '50%',
					backgroundColor: '#D9D9D9',
					zIndex: 10,
				}}
			/>
		</>
	);
};

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
	topContent?: ReactNode;
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
	topContent,
}) => {
	const isContacts = title === 'Contacts';
	const isCompactHeader = isContacts || title === 'Drafts' || title === 'Sent';
	const showTitle = !isContacts && title !== 'Drafts' && title !== 'Sent';
	const isDrafts = title === 'Drafts';
	const isSent = title === 'Sent';

	const boxWidth = isContacts || isDrafts || isSent ? '499px' : '376px';
	const boxHeight = isContacts || isDrafts || isSent ? '703px' : '474px';
	const contentWidth = isContacts || isDrafts || isSent ? 'w-[489px]' : 'w-[366px]';

	return (
		<div style={{ width: boxWidth, height: boxHeight, position: 'relative' }}>
			{/* Centered number above block */}
			<div
				data-drafting-top-number
				style={{
					position: 'absolute',
					top: '-26px',
					left: '50%',
					transform: 'translateX(-50%)',
					pointerEvents: 'none',
				}}
				className="text-[12px] font-inter font-medium text-black"
			>
				{isContacts ? '' : isDrafts ? '' : isSent ? '' : ''}
			</div>
			{/* New Contacts Pill */}
			{isContacts && <ContactsHeaderChrome />}

			{/* New Drafts Pill */}
			{isDrafts && (
				<>
					<div
						style={{
							position: 'absolute',
							top: '3px',
							left: '69px',
							width: '72px',
							height: '22px',
							backgroundColor: !hasData ? '#FFCD73' : '#FFECDC',
							border: `2px solid ${!hasData ? '#B0B0B0' : '#A8833A'}`,
							borderRadius: '11px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
						}}
					>
						<span
							className="text-[13px] font-semibold font-inter leading-none"
							style={{ color: !hasData ? '#B0B0B0' : '#000000' }}
						>
							Drafts
						</span>
					</div>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '36px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: !hasData ? '#B0B0B0' : '#D9D9D9',
							zIndex: 10,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '176px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: !hasData ? '#B0B0B0' : '#D9D9D9',
							zIndex: 10,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '235px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: !hasData ? '#B0B0B0' : '#D9D9D9',
							zIndex: 10,
						}}
					/>
				</>
			)}

			{/* New Sent Pill */}
			{isSent && (
				<>
					<div
						style={{
							position: 'absolute',
							top: '3px',
							left: '137px',
							width: '72px',
							height: '22px',
							backgroundColor: '#DBF6D4',
							border: '2px solid #19670F',
							borderRadius: '11px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
						}}
					>
						<span className="text-[13px] font-semibold font-inter text-black leading-none">
							Sent
						</span>
					</div>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '102px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: '#D9D9D9',
							zIndex: 10,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '36px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: '#D9D9D9',
							zIndex: 10,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '235px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: '#D9D9D9',
							zIndex: 10,
						}}
					/>
				</>
			)}

			{/* Top-left text label */}
			<div
				data-drafting-top-label
				style={{ position: 'absolute', top: '-20px', left: '2px', pointerEvents: 'none' }}
				className="text-[12px] font-inter font-medium text-black"
			>
				{isContacts ? '' : isDrafts ? '' : isSent ? '' : title}
			</div>
			{/* Container box with header */}
			<div
				data-drafting-table
				style={{
					width: '100%',
					height: '100%',
					border: isContacts
						? '2px solid #000000'
						: isDrafts
						? '2px solid #A8833A'
						: isSent
						? '2px solid #19670F'
						: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					background: isContacts
						? 'linear-gradient(to bottom, #ffffff 26px, #EB8586 26px)'
						: isDrafts
						? hasData
							? 'linear-gradient(to bottom, #ffffff 26px, #FFDC9E 26px)'
							: '#FFCD73'
						: isSent
						? 'linear-gradient(to bottom, #ffffff 26px, #5AB477 26px)'
						: 'white',
				}}
			>
				{/* Header section with top rounded corners */}
				<div
					data-drafting-table-header
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: isCompactHeader ? 'none !important' : '2px solid #ABABAB',
						padding: isCompactHeader ? '0 10px' : '12px 16px',
						display: 'flex',
						justifyContent: isCompactHeader ? 'flex-end' : 'space-between',
						alignItems: 'center',
						height: isCompactHeader ? '20px' : '48px',
						backgroundColor: isContacts
							? 'transparent'
							: isDrafts
							? 'transparent'
							: isSent
							? 'transparent'
							: 'white',
					}}
				>
					{showTitle && (
						<div style={{ transform: 'translateY(-6px)' }}>
							<div className="text-sm font-inter font-medium text-black">{title}</div>
						</div>
					)}
					{hasData && !isSent && !(isContacts && topContent) && (
						<div
							style={{
								transform: isCompactHeader
									? isContacts
										? 'translateY(103px)'
										: isDrafts || isSent
										? 'translateY(30px)'
										: 'translateY(-2px)'
									: 'translateY(6px)',
							}}
						>
							<Button
								type="button"
								variant="ghost"
								className="!h-[18px] text-xs font-inter font-medium text-black bg-none border-none cursor-pointer p-0 m-0 leading-none hover:underline transition-colors"
								onClick={handleClick}
							>
								{areAllSelected ? 'Deselect All' : 'Select All'}
							</Button>
						</div>
					)}
				</div>

				{/* Top content area (e.g., mini searchbar for contacts) */}
				{isContacts && topContent && (
					<div
						style={{
							position: 'absolute',
							top: '35px',
							left: 0,
							right: 0,
							zIndex: 5,
						}}
					>
						{topContent}
					</div>
				)}

				{/* Content area */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					style={{
						marginTop:
							isContacts && topContent
								? '115px'
								: isContacts
								? '105px'
								: isDrafts || isSent
								? '32px'
								: 0,
					}}
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-5}
				>
					{isPending ? (
						<div className="flex items-center justify-center h-full">
							<Spinner size="small" />
						</div>
					) : hasData ? (
						children
					) : isDrafts || isSent ? (
						<div
							className="overflow-visible w-full flex flex-col items-center"
							style={{ gap: '11px' }}
						>
							{Array.from({ length: 8 }).map((_, idx) => {
								// For drafts empty state: boxes 2-5 (idx 1-4) are 52px, all others are 85px
								const boxHeight =
									isDrafts && idx >= 1 && idx <= 4 ? 'h-[52px]' : 'h-[85px]';
								return (
									<div
										key={idx}
										className={`select-none w-[489px] ${boxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] ${
											isDrafts ? 'bg-[#FFCD73]' : isSent ? 'bg-[#5AB477]' : 'bg-white'
										} p-2 flex items-center justify-center`}
									>
										{isDrafts && idx === 0 && (
											<span className="text-[15px] font-semibold font-inter text-black">
												Draft Your First Email
											</span>
										)}
									</div>
								);
							})}
						</div>
					) : isContacts ? (
						<div className="overflow-visible w-full flex flex-col gap-4 items-center py-2">
							{Array.from({ length: 9 }).map((_, idx) => (
								<div
									key={idx}
									className={`select-none ${contentWidth} h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#EB8586]`}
								/>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
							<div className="text-sm font-semibold mb-2">{noDataMessage}</div>
							<div className="text-xs text-center">{noDataDescription}</div>
						</div>
					)}
				</CustomScrollbar>

				{/* Optional footer area (e.g., Send button for Drafts) */}
				{footer && (
					<div
						data-drafting-table-footer
						style={{
							padding: isDrafts ? '6px 5px' : isCompactHeader ? '6px 16px' : '12px 16px',
							backgroundColor: isContacts
								? '#EB8586'
								: isDrafts
								? '#FFDC9E'
								: isSent
								? '#5AB477'
								: 'white',
						}}
					>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
};
