import { FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { urls } from '@/constants/urls';

export const ContactsHeaderChrome: FC<{ offsetY?: number; hasData?: boolean; isAllTab?: boolean }> = ({
	offsetY = 0,
	hasData = true,
	isAllTab = false,
}) => {
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#8D5B5B' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#F5DADA' : '#FFAEAE';
	const dotSize = isAllTab ? 6 : 9;
	// Adjust left position to center smaller dots (add 1.5px to keep same visual center)
	const dot1Left = isAllTab ? 118.5 : 117;
	const dot2Left = isAllTab ? 177.5 : 176;
	const dot3Left = isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isAllTab ? 50 : 72;
	const pillHeight = isAllTab ? 15 : 22;
	const pillBorderRadius = isAllTab ? 7.5 : 11;
	const pillFontSize = isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	const pillTop = 3 + offsetY;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: '21px',
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
						marginTop: isAllTab ? '-1px' : 0 // Optical alignment adjustment
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
	footer?: ReactNode;
	topContent?: ReactNode;
	goToWriting?: () => void;
	goToSearch?: () => void;
	goToDrafts?: () => void;
	goToInbox?: () => void;
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
	goToWriting,
	goToSearch,
	goToDrafts,
	goToInbox,
}) => {
	const router = useRouter();
	const isContacts = title === 'Contacts';
	const isCompactHeader = isContacts || title === 'Drafts' || title === 'Sent';
	const showTitle = !isContacts && title !== 'Drafts' && title !== 'Sent';
	const isDrafts = title === 'Drafts';
	const isSent = title === 'Sent';

	const boxWidth = isContacts || isDrafts || isSent ? '499px' : '376px';
	const boxHeight = isContacts || isDrafts || isSent ? '703px' : '474px';

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
			{isContacts && <ContactsHeaderChrome hasData={hasData} />}

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
						? hasData
							? 'linear-gradient(to bottom, #ffffff 26px, #EB8586 26px)'
							: '#FFAEAE'
						: isDrafts
						? hasData
							? 'linear-gradient(to bottom, #ffffff 26px, #FFDC9E 26px)'
							: '#F8D69A'
						: isSent
						? hasData
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
							isContacts && topContent && hasData
								? '115px'
								: isContacts && hasData
								? '105px'
								: isContacts
								? '68px'
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
								// For drafts/sent empty state: boxes 2-5 (idx 1-4) are 52px, all others are 85px
								const boxHeight =
									(isDrafts || isSent) && idx >= 1 && idx <= 4 ? 'h-[52px]' : 'h-[85px]';
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
								return (
									<div
										key={idx}
										className={`select-none w-[489px] ${boxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] ${boxBgColor} p-2 flex items-center justify-center`}
									>
										{isDrafts && idx === 0 && (
											<span className="text-[15px] font-semibold font-inter text-black">
												Draft Your First Email
											</span>
										)}
										{isSent && idx === 0 && (
											<span className="text-[15px] font-semibold font-inter text-black">
												Send Your First Message
											</span>
										)}
										{isDrafts && idx === 1 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '375px', height: '42px' }}
												onClick={goToWriting}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Write Your Emails
												</span>
											</div>
										)}
										{isDrafts && idx === 2 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '375px', height: '42px' }}
												onClick={goToSearch}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Search For More Contacts
												</span>
											</div>
										)}
										{isDrafts && idx === 3 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '375px', height: '42px' }}
												onClick={goToInbox}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Check Inbox
												</span>
											</div>
										)}
										{isDrafts && idx === 4 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '375px', height: '42px' }}
												onClick={() => router.push(urls.murmur.dashboard.index)}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Create New Campaign
												</span>
											</div>
										)}
										{isSent && idx === 1 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '376px', height: '42px' }}
												onClick={goToDrafts}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Review and Send Drafts
												</span>
											</div>
										)}
										{isSent && idx === 2 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '376px', height: '42px' }}
												onClick={goToWriting}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Write More Emails
												</span>
											</div>
										)}
										{isSent && idx === 3 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '376px', height: '42px' }}
												onClick={goToSearch}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
													Add More Contacts
												</span>
											</div>
										)}
										{isSent && idx === 4 && (
											<div
												className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
												style={{ width: '376px', height: '42px' }}
												onClick={() => router.push(urls.murmur.dashboard.index)}
											>
												<span className="text-[15px] font-semibold font-inter text-black">
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
							style={{ gap: '11px' }}
						>
							{Array.from({ length: 9 }).map((_, idx) => (
								<div
									key={idx}
									className={`select-none w-[459px] h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] flex items-center justify-center ${
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
										<span className="text-[15px] font-semibold font-inter text-black">
											All Contacts Drafted
										</span>
									)}
									{idx >= 2 && idx <= 5 && (
										<div
											className="w-[403px] h-[42px] bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
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
									)}
								</div>
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
