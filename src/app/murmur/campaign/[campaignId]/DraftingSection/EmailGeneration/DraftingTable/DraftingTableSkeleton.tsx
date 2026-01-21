import { FC } from 'react';

interface DraftingTableSkeletonProps {
	isMobile?: boolean | null;
}

export const DraftingTableSkeleton: FC<DraftingTableSkeletonProps> = ({ isMobile }) => {
	// Mobile-responsive box dimensions
	const mobileBoxWidth = 'calc(100vw - 8px)';
	const mobileBoxHeight = 'calc(100dvh - 160px)';
	const boxWidth = isMobile ? mobileBoxWidth : '499px';
	const boxHeight = isMobile ? mobileBoxHeight : '703px';

	return (
		<div style={{ width: boxWidth, height: boxHeight, position: 'relative' }}>
			{/* Drafts Pill skeleton - hidden on mobile */}
			{!isMobile && (
				<>
					<div
						style={{
							position: 'absolute',
							top: '3px',
							left: '69px',
							width: '72px',
							height: '22px',
							// Keep original warm/yellow chrome for the outer box header
							backgroundColor: '#F8D69A',
							border: '2px solid #B0B0B0',
							borderRadius: '11px',
							zIndex: 10,
						}}
					/>
					{/* Header dots */}
					<div
						style={{
							position: 'absolute',
							top: '10px',
							left: '36px',
							width: '9px',
							height: '9px',
							borderRadius: '50%',
							backgroundColor: '#B0B0B0',
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
							backgroundColor: '#B0B0B0',
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
							backgroundColor: '#B0B0B0',
							zIndex: 10,
						}}
					/>
				</>
			)}

			{/* Container box */}
			<div
				style={{
					width: '100%',
					height: '100%',
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					// Keep the original yellow fill for the larger container box
					backgroundColor: '#FFDC9E',
					overflow: 'hidden',
				}}
			>
				{/* Filter tabs skeleton - hidden on mobile */}
				{!isMobile && (
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
							{[0, 1, 2].map((idx) => (
								<div
									key={idx}
									className="animate-pulse"
									style={{
										width: '62px',
										height: '17px',
										borderRadius: '6px',
										backgroundColor: idx === 0 ? '#949494' : '#D9D9D9',
									}}
								/>
							))}
						</div>
					</div>
				)}

				{/* Section header skeleton - hidden on mobile */}
				{!isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '52px',
							left: 0,
							right: 0,
							height: '29px',
							// Match the container's yellow fill
							backgroundColor: '#FFDC9E',
							zIndex: 9,
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							alignItems: 'center',
							padding: '0 16px',
						}}
					>
						<div
							className="animate-pulse"
							style={{
								width: '70px',
								height: '14px',
								backgroundColor: 'rgba(0, 0, 0, 0.15)',
								borderRadius: '4px',
							}}
						/>
						<div
							className="animate-pulse"
							style={{
								width: '70px',
								height: '14px',
								backgroundColor: 'rgba(0, 0, 0, 0.15)',
								borderRadius: '4px',
								justifySelf: 'center',
							}}
						/>
						<div
							className="animate-pulse"
							style={{
								width: '60px',
								height: '14px',
								backgroundColor: 'rgba(0, 0, 0, 0.15)',
								borderRadius: '4px',
								justifySelf: 'end',
							}}
						/>
					</div>
				)}

				{/* Skeleton rows */}
				<div
					style={{
						marginTop: isMobile ? '8px' : '82px',
						padding: isMobile ? '0 8px' : '0 5px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '10px',
						overflow: 'hidden',
					}}
				>
					{Array.from({ length: isMobile ? 5 : 7 }).map((_, idx) => (
						<SkeletonRow key={idx} index={idx} isMobile={isMobile} />
					))}
				</div>
			</div>
		</div>
	);
};

const SkeletonRow: FC<{ index: number; isMobile?: boolean | null }> = ({ index, isMobile }) => {
	const rowHeight = isMobile ? '90px' : '85px';
	const rowWidth = isMobile ? '100%' : '489px';

	return (
		<div
			style={{
				width: rowWidth,
				height: rowHeight,
				backgroundColor: '#FFFFFF',
				border: '2px solid #000000',
				borderRadius: '8px',
				padding: '12px',
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
			}}
		>
			{/* Top row: checkbox placeholder + name */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
				{/* Checkbox placeholder */}
				<div
					className="animate-pulse"
					style={{
						width: '16px',
						height: '16px',
						borderRadius: '50%',
						backgroundColor: '#E5E5E5',
						animationDelay: `${index * 100}ms`,
					}}
				/>
				{/* Status dot placeholder */}
				<div
					className="animate-pulse"
					style={{
						width: '10px',
						height: '10px',
						borderRadius: '50%',
						backgroundColor: '#E5E5E5',
						animationDelay: `${index * 100}ms`,
					}}
				/>
				{/* Name placeholder */}
				<div
					className="animate-pulse"
					style={{
						width: isMobile ? '120px' : '140px',
						height: '14px',
						backgroundColor: '#E5E5E5',
						borderRadius: '4px',
						animationDelay: `${index * 100}ms`,
					}}
				/>
			</div>

			{/* Subject line placeholder */}
			<div
				className="animate-pulse"
				style={{
					width: isMobile ? '80%' : '320px',
					height: '14px',
					backgroundColor: '#EBEBEB',
					borderRadius: '4px',
					marginLeft: '38px',
					animationDelay: `${index * 100}ms`,
				}}
			/>

			{/* Preview text placeholder */}
			<div
				className="animate-pulse"
				style={{
					width: isMobile ? '90%' : '380px',
					height: '12px',
					backgroundColor: '#F0F0F0',
					borderRadius: '4px',
					marginLeft: '38px',
					animationDelay: `${index * 100}ms`,
				}}
			/>
		</div>
	);
};
