import { FC, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { urls } from '@/constants/urls';
import ApproveCheckIcon from '@/components/atoms/svg/ApproveCheckIcon';
import RejectXIcon from '@/components/atoms/svg/RejectXIcon';

export const ContactsHeaderChrome: FC<{ offsetY?: number; hasData?: boolean; isAllTab?: boolean; whiteSectionHeight?: number }> = ({
	offsetY = 0,
	hasData = true,
	isAllTab = false,
	whiteSectionHeight,
}) => {
	const isBottomView = whiteSectionHeight === 15;
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#8D5B5B' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#F5DADA' : '#FFAEAE';
	const dotSize = isBottomView ? 5 : isAllTab ? 6 : 9;
	// Adjust left position to center smaller dots (add 1.5px to keep same visual center)
	const dot1Left = isBottomView ? 75 : isAllTab ? 118.5 : 117;
	const dot2Left = isBottomView ? 110 : isAllTab ? 177.5 : 176;
	const dot3Left = isBottomView ? 146 : isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isBottomView ? 40 : isAllTab ? 50 : 72;
	const pillHeight = isBottomView ? 10 : isAllTab ? 15 : 22;
	const pillBorderRadius = isBottomView ? 5 : isAllTab ? 7.5 : 11;
	const pillFontSize = isBottomView ? '6px' : isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop = whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3 + offsetY;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);
	const pillLeft = isBottomView ? 18 : 21;

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${pillLeft}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: pillBgColor,
					border: `2px solid ${pillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: pillTextColor, 
						fontSize: pillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						marginTop: isBottomView ? '-1px' : isAllTab ? '-1px' : 0 // Optical alignment adjustment
					}}
				>
					Contacts
				</span>
			</div>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot1Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot3Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
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
	/**
	 * Optional: marks this table as the "main box" for cross-tab morph animations.
	 * When provided, the wrapper will be tagged with `data-campaign-main-box`.
	 */
	mainBoxId?: string;
	footer?: ReactNode;
	topContent?: ReactNode;
	goToWriting?: () => void;
	goToSearch?: () => void;
	goToDrafts?: () => void;
	goToInbox?: () => void;
	selectedCount?: number;
	/** Filter state for Drafts table */
	statusFilter?: 'all' | 'approved' | 'rejected';
	/** Callback to change status filter */
	onStatusFilterChange?: (filter: 'all' | 'approved' | 'rejected') => void;
	/** Count of approved drafts */
	approvedCount?: number;
	/** Count of rejected drafts */
	rejectedCount?: number;
	/** Total count of all drafts */
	totalDraftsCount?: number;
	/** Mobile mode flag */
	isMobile?: boolean | null;
	/**
	 * Contacts-only: controls the amount of reserved vertical space when `topContent` is provided.
	 * - default: assumes the mini search bar + selected row (existing layout)
	 * - compact: assumes only the selected row (no search bar)
	 */
	contactsTopContentVariant?: 'default' | 'compact';
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
	mainBoxId,
	footer,
	topContent,
	goToWriting,
	goToSearch,
	goToDrafts,
	goToInbox,
	selectedCount = 0,
	statusFilter = 'all',
	onStatusFilterChange,
	approvedCount = 0,
	rejectedCount = 0,
	totalDraftsCount = 0,
	isMobile,
	contactsTopContentVariant = 'default',
}) => {
	const router = useRouter();
	const [isDraftsCounterHovered, setIsDraftsCounterHovered] = useState(false);
	const [isApprovedCounterHovered, setIsApprovedCounterHovered] = useState(false);
	const [isRejectedCounterHovered, setIsRejectedCounterHovered] = useState(false);
	const isContacts = title === 'Contacts';
	const isCompactHeader = isContacts || title === 'Drafts' || title === 'Sent';
	const showTitle = !isContacts && title !== 'Drafts' && title !== 'Sent';
	const isDrafts = title === 'Drafts';
	const isSent = title === 'Sent';

	// Mobile-responsive box dimensions
	const mobileBoxWidth = 'calc(100vw - 8px)'; // 4px margins on each side
	const mobileBoxHeight = 'calc(100dvh - 160px)';
	const boxWidth = isMobile ? mobileBoxWidth : (isContacts || isDrafts || isSent ? '499px' : '376px');
	const boxHeight = isMobile ? mobileBoxHeight : (isContacts || isDrafts || isSent ? '703px' : '474px');

	return (
		<div
			data-campaign-main-box={mainBoxId}
			data-hover-description={
				isContacts
					? 'Select which contacts you want to send to.'
					: isDrafts
						? 'Drafts: review and select the emails you want to send.'
						: undefined
			}
			style={{ width: boxWidth, height: boxHeight, position: 'relative' }}
		>
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
			{/* New Contacts Pill - hidden on mobile */}
			{isContacts && !isMobile && <ContactsHeaderChrome hasData={hasData} />}

			{/* New Drafts Pill - hidden on mobile */}
			{isDrafts && !isMobile && (
				<>
					<div
						style={{
							position: 'absolute',
							top: '3px',
							left: '69px',
							width: '72px',
							height: '22px',
							backgroundColor: !hasData ? '#F8D69A' : '#FFECDC',
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

			{/* Counter in top right corner of Drafts table - hidden on approved/rejected tabs and on mobile */}
			{isDrafts && statusFilter === 'all' && !isMobile && (
				<div
					style={{
						position: 'absolute',
						top: '5px',
						right: '10px',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}
				>
					{/* Approved count */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
						<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{approvedCount}</span>
						<ApproveCheckIcon width={12} height={9} className="text-black" />
					</div>
					{/* Rejected count */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
						<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{rejectedCount}</span>
						<RejectXIcon width={10} height={10} className="text-black" />
					</div>
				</div>
			)}

			{/* New Sent Pill - hidden on mobile (use simpler header) */}
			{isSent && !isMobile && (
				<>
					<div
						style={{
							position: 'absolute',
							top: '3px',
							left: '137px',
							width: '72px',
							height: '22px',
							backgroundColor: hasData ? '#DBF6D4' : '#a2e1b7',
							border: `2px solid ${hasData ? '#19670F' : '#B0B0B0'}`,
							borderRadius: '11px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
						}}
					>
						<span
							className="text-[13px] font-semibold font-inter leading-none"
							style={{ color: hasData ? '#000000' : '#B0B0B0' }}
						>
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
							backgroundColor: hasData ? '#D9D9D9' : '#B0B0B0',
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
							backgroundColor: hasData ? '#D9D9D9' : '#B0B0B0',
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
							backgroundColor: hasData ? '#D9D9D9' : '#B0B0B0',
							zIndex: 10,
						}}
					/>
				</>
			)}
			{/* Mobile Sent Header - hidden on mobile per user request */}

			{/* Filter tabs in gray section for Drafts - hidden on mobile */}
			{isDrafts && hasData && onStatusFilterChange && !isMobile && (
				<div
					style={{
						position: 'absolute',
						top: '32px',
						left: 0,
						right: 0,
						zIndex: 10,
						display: 'flex',
						justifyContent: 'center',
					}}
				>
					<div style={{ display: 'flex', gap: '37px' }}>
						{(['all', 'approved', 'rejected'] as const).map((tab) => {
							const isActive = statusFilter === tab;
							const labels: Record<typeof tab, string> = {
								all: 'All Drafts',
								approved: 'Approved',
								rejected: 'Rejected',
							};
							return (
								<button
									key={tab}
									type="button"
									style={{
										width: '62px',
										height: '17px',
										fontSize: '10px',
										fontWeight: 600,
										borderRadius: '6px',
										border: 'none',
										backgroundColor: isActive
											? tab === 'approved'
												? '#559855'
												: tab === 'rejected'
												? '#A03C3C'
												: '#949494'
											: '#D9D9D9',
										color: isActive ? '#FFFFFF' : '#000000',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										padding: 0,
									}}
									onClick={() => onStatusFilterChange(tab)}
								>
									{labels[tab]}
								</button>
							);
						})}
					</div>
				</div>
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
						? '3px solid #000000'
						: isDrafts
						? '3px solid #000000'
						: isSent
						? '3px solid #19670F'
						: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
				background: isContacts
					? isMobile
						? '#EB8586' // Solid pink on mobile (no white header)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #EB8586 26px)'
						: '#FFAEAE'
					: isDrafts
					? isMobile
						? '#FFDC9E' // Solid orange on mobile (no white header or tabs)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #E7E7E7 26px, #E7E7E7 55px, #FFDC9E 55px)'
						: '#F8D69A'
					: isSent
					? isMobile
						? '#5AB477' // Solid green on mobile (no white header)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #5AB477 26px)'
						: '#a2e1b7'
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
										: isDrafts
										? 'translateY(57px)'
										: isSent
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

				{/* Green section for Approved tab - hidden on mobile (no tabs) */}
				{isDrafts && hasData && statusFilter === 'approved' && !isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '52px',
							left: 0,
							right: 0,
							height: '29px',
							backgroundColor: '#559855',
							zIndex: 9,
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							alignItems: 'center',
							padding: '0 16px',
						}}
					>
						<div 
							style={{ 
								position: 'relative',
							}}
							onMouseEnter={() => setIsApprovedCounterHovered(true)}
							onMouseLeave={() => setIsApprovedCounterHovered(false)}
						>
							{isApprovedCounterHovered && (
								<div
									onClick={handleClick}
									style={{
										width: '15px',
										height: '15px',
										border: areAllSelected ? '2px solid #559855' : '2px solid #FFFFFF',
										borderRadius: '1px',
										backgroundColor: areAllSelected ? '#FFFFFF' : 'transparent',
										cursor: 'pointer',
									}}
								/>
							)}
							{!isApprovedCounterHovered && (
								<span className="text-[14px] font-inter font-medium text-white text-left">
									{approvedCount} Approved
								</span>
							)}
						</div>
						<span className="text-[14px] font-inter font-medium text-white text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-white hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Red section for Rejected tab - hidden on mobile (no tabs) */}
				{isDrafts && hasData && statusFilter === 'rejected' && !isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '52px',
							left: 0,
							right: 0,
							height: '29px',
							backgroundColor: '#A03C3C',
							zIndex: 9,
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							alignItems: 'center',
							padding: '0 16px',
						}}
					>
						<div 
							style={{ 
								position: 'relative',
							}}
							onMouseEnter={() => setIsRejectedCounterHovered(true)}
							onMouseLeave={() => setIsRejectedCounterHovered(false)}
						>
							{isRejectedCounterHovered && (
								<div
									onClick={handleClick}
									style={{
										width: '15px',
										height: '15px',
										border: areAllSelected ? '2px solid #A03C3C' : '2px solid #FFFFFF',
										borderRadius: '1px',
										backgroundColor: areAllSelected ? '#FFFFFF' : 'transparent',
										cursor: 'pointer',
									}}
								/>
							)}
							{!isRejectedCounterHovered && (
								<span className="text-[14px] font-inter font-medium text-white text-left">
									{rejectedCount} Rejected
								</span>
							)}
						</div>
						<span className="text-[14px] font-inter font-medium text-white text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-white hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Yellow section for All Drafts tab - hidden on mobile (no tabs header needed) */}
			{isDrafts && hasData && statusFilter === 'all' && !isMobile && (
				<div
					style={{
						position: 'absolute',
						top: '52px',
						left: 0,
						right: 0,
						height: '29px',
						backgroundColor: '#FFDC9E',
						zIndex: 9,
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						alignItems: 'center',
						padding: '0 16px',
					}}
				>
					<div 
						style={{ 
							position: 'relative',
							transition: 'none !important',
							animation: 'none !important',
						}}
						onMouseEnter={() => setIsDraftsCounterHovered(true)}
						onMouseLeave={() => setIsDraftsCounterHovered(false)}
					>
						{isDraftsCounterHovered && (
							<div
								onClick={handleClick}
								style={{
									width: '15px',
									height: '15px',
									border: areAllSelected ? '2px solid #FFFFFF' : '2px solid #000000',
									borderRadius: '1px',
									backgroundColor: areAllSelected ? '#000000' : 'transparent',
									cursor: 'pointer',
								}}
							/>
						)}
						{!isDraftsCounterHovered && (
							<span 
								className="text-[14px] font-inter font-medium text-black text-left"
							>
								{totalDraftsCount} Drafts
							</span>
						)}
					</div>
						<span className="text-[14px] font-inter font-medium text-black text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-black hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Top content area (e.g., mini searchbar for contacts) */}
				{isContacts && topContent && hasData && (
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
						isContacts && isMobile
							? '8px' // Minimal margin on mobile (no white header)
							: isContacts && topContent && hasData
							? contactsTopContentVariant === 'compact'
								? '45px'
								: '115px'
							: isContacts && hasData
							? '105px'
							: isContacts
							? '68px'
							: isDrafts
							? (isMobile ? '8px' : hasData ? '66px' : '32px') // 66px with data (tabs shown), 32px when empty (no tabs)
							: isSent
							? (isMobile ? '8px' : '32px') // Minimal margin on mobile (no white header)
							: 0,
					}}
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-6}
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
						style={{ gap: '10px', padding: isMobile ? '0 8px' : undefined }}
					>
						{Array.from({ length: isMobile ? 5 : 8 }).map((_, idx) => {
							// For drafts/sent empty state: boxes 2-5 (idx 1-4) are 52px, all others are 85px
							// On mobile: boxes are slightly taller (58px vs 52px, 90px vs 85px)
							const placeholderBoxHeight =
								(isDrafts || isSent) && idx >= 1 && idx <= 4 
									? (isMobile ? 'h-[58px]' : 'h-[52px]') 
									: (isMobile ? 'h-[90px]' : 'h-[85px]');
							const boxBgColor = isDrafts
								? idx === 1
									? 'bg-[#FFCF79]'
									: idx === 2
									? 'bg-[#FFD487]'
									: idx === 3
									? 'bg-[#FFD892]'
									: idx === 4
									? 'bg-[#FFDA97]'
									: 'bg-[#FFCD73]'
								: isSent
								? idx === 1
									? 'bg-[#52CD7A]'
									: idx === 2
									? 'bg-[#63D286]'
									: idx === 3
									? 'bg-[#79dc99]'
									: idx === 4
									? 'bg-[#96e7b0]'
									: 'bg-[#53c076]'
								: 'bg-white';
							const placeholderBoxWidth = isMobile ? 'w-full' : 'w-[489px]';
							const innerButtonWidth = isMobile ? 'calc(100% - 24px)' : '376px';
							return (
								<div
									key={idx}
									className={`select-none ${placeholderBoxWidth} ${placeholderBoxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] ${boxBgColor} p-2 flex items-center justify-center`}
								>
									{isDrafts && idx === 0 && (
										<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
											Draft Your First Email
										</span>
									)}
									{isSent && idx === 0 && (
										<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
											Send Your First Message
										</span>
									)}
									{isDrafts && idx === 1 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToWriting}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Write Your Emails
											</span>
										</div>
									)}
									{isDrafts && idx === 2 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToSearch}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Search For More Contacts
											</span>
										</div>
									)}
									{isDrafts && idx === 3 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToInbox}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Check Inbox
											</span>
										</div>
									)}
									{isDrafts && idx === 4 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={() => router.push(urls.murmur.dashboard.index)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Create New Campaign
											</span>
										</div>
									)}
									{isSent && idx === 1 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToDrafts}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Review and Send Drafts
											</span>
										</div>
									)}
									{isSent && idx === 2 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToWriting}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Write More Emails
											</span>
										</div>
									)}
									{isSent && idx === 3 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToSearch}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Add More Contacts
											</span>
										</div>
									)}
									{isSent && idx === 4 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={() => router.push(urls.murmur.dashboard.index)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Create New Campaign
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
					) : isContacts ? (
						<div
							className="overflow-visible w-full flex flex-col items-center pb-2"
							style={{ gap: isMobile ? '10px' : '11px', padding: isMobile ? '0 8px' : undefined }}
						>
							{Array.from({ length: isMobile ? 5 : 9 }).map((_, idx) => {
								const contactsPlaceholderBoxWidth = isMobile ? 'w-full' : 'w-[459px]';
								const contactsPlaceholderBoxHeight = isMobile 
									? (idx === 0 ? 'h-[90px]' : 'h-[58px]')
									: 'h-[52px]';
								const contactsInnerButtonWidth = isMobile ? 'calc(100% - 24px)' : '403px';
								return (
									<div
										key={idx}
										className={`select-none ${contactsPlaceholderBoxWidth} ${contactsPlaceholderBoxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] flex items-center justify-center ${
											idx === 0
												? 'bg-[#E54D50]'
												: idx === 2
												? 'bg-[#E72528]'
												: idx === 3
												? 'bg-[#E85052]'
												: idx === 4
												? 'bg-[#F87C7D]'
												: idx === 5
												? 'bg-[#EB8586]'
												: 'bg-[#E15E60]'
										}`}
									>
										{idx === 0 && (
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
												All Contacts Drafted
											</span>
										)}
										{isMobile ? (
											idx >= 1 && idx <= 4 && (
												<div
													className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
													style={{ width: contactsInnerButtonWidth, height: '44px' }}
													onClick={() => {
														if (idx === 1) goToSearch?.();
														if (idx === 2) goToDrafts?.();
														if (idx === 3) goToInbox?.();
														if (idx === 4) router.push(urls.murmur.dashboard.index);
													}}
												>
													<span className="text-[12px] font-semibold font-inter text-black">
														{idx === 1 && 'Add More Contacts'}
														{idx === 2 && 'Send Drafts'}
														{idx === 3 && 'Check Inbox'}
														{idx === 4 && 'Create New Campaign'}
													</span>
												</div>
											)
										) : (
											idx >= 2 && idx <= 5 && (
												<div
													className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
													style={{ width: contactsInnerButtonWidth, height: '42px' }}
													onClick={() => {
														if (idx === 2) goToSearch?.();
														if (idx === 3) goToDrafts?.();
														if (idx === 4) goToInbox?.();
														if (idx === 5) router.push(urls.murmur.dashboard.index);
													}}
												>
													<span className="text-[15px] font-semibold font-inter text-black">
														{idx === 2 && 'Add More Contacts'}
														{idx === 3 && 'Send Drafts'}
														{idx === 4 && 'Check Inbox'}
														{idx === 5 && 'Create New Campaign'}
													</span>
												</div>
											)
										)}
									</div>
								);
							})}
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
