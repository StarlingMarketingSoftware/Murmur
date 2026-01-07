'use client';

import { FC } from 'react';

type MapResultsPanelSkeletonVariant = 'desktop' | 'narrow';

export const MapResultsPanelSkeleton: FC<{
	variant?: MapResultsPanelSkeletonVariant;
	rows?: number;
}> = ({ variant = 'desktop', rows }) => {
	const resolvedRows = rows ?? (variant === 'desktop' ? 14 : 8);
	const items = Array.from({ length: resolvedRows });
	// 23 keyframe points => 22 equal intervals; duration is 2.2s => 0.1s per interval.
	// We offset each row so the palette is "top-to-bottom" on initial paint AND the wave reads downward (top leads).
	const stepDelaySeconds = 0.1;
	const durationSeconds = 2.5;

	if (variant === 'narrow') {
		return (
			<>
				{items.map((_, idx) => (
					<div
						key={idx}
						aria-hidden="true"
						className="transition-colors flex w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-black select-none map-results-panel-loading-wave-row"
						style={{
							animationDelay: `${-(durationSeconds - idx * stepDelaySeconds)}s`,
						}}
					>
						{/* Left side - Name/Company */}
						<div className="flex-1 min-w-0 flex flex-col justify-center pl-3 pr-2">
							<div className="h-[10px]" />
							<div className="h-[6px]" />
							<div className="h-[10px]" />
						</div>

						{/* Right side - Title + Location */}
						<div
							className="flex-shrink-0 flex flex-col justify-center pr-2"
							style={{ width: '240px' }}
						>
							<div
								className="overflow-hidden flex items-center px-2"
								style={{
									width: '230px',
									height: '19px',
									borderRadius: '8px',
								}}
							/>
							<div className="flex items-center gap-1 mt-[4px]">
								<span
									className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] flex-shrink-0"
									style={{ backgroundColor: 'transparent' }}
								/>
								<div className="h-[8px]" style={{ width: '55%' }} />
							</div>
						</div>
					</div>
				))}
			</>
		);
	}

	// Desktop (2x2 grid) row skeleton that matches the map search results panel rows.
	return (
		<>
			{items.map((_, idx) => (
				<div
					key={idx}
					aria-hidden="true"
					className="transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-black select-none map-results-panel-loading-wave-row"
					style={{
						animationDelay: `${-(durationSeconds - idx * stepDelaySeconds)}s`,
					}}
				>
					{/* Top Left - Name */}
					<div className="pl-3 pr-1 flex items-center h-[23px]">
						<div className="h-[10px]" style={{ width: '64%' }} />
					</div>
					{/* Top Right - Title/Headline pill */}
					<div className="pr-2 pl-1 flex items-center h-[23px]">
						<div className="h-[17px] rounded-[6px] px-2 flex items-center w-full overflow-hidden" />
					</div>
					{/* Bottom Left - Company */}
					<div className="pl-3 pr-1 flex items-center h-[22px]">
						<div className="h-[10px]" style={{ width: '52%' }} />
					</div>
					{/* Bottom Right - Location */}
					<div className="pr-2 pl-1 flex items-center h-[22px]">
						<div className="flex items-center gap-1 w-full">
							<span
								className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] flex-shrink-0"
								style={{ backgroundColor: 'transparent' }}
							/>
							<div className="h-[8px]" style={{ width: '48%' }} />
						</div>
					</div>
				</div>
			))}
		</>
	);
};


