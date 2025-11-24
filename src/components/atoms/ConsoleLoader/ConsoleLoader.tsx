import React, { FC } from 'react';
import { ConsoleLoaderProps, useConsoleLoader } from './useConsoleLoader';
import { GOLDEN_RATIO, INVERSE_GOLDEN } from '@/constants';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

export const ConsoleLoader: FC<ConsoleLoaderProps> = (props) => {
	const {
		goldenLarge,
		baseUnit,
		logs,
		goldenSmall,
		isThinking,
		getLogStyle,
		opsPerSec,
		className,
	} = useConsoleLoader(props);

	const isMobile = useIsMobile();
	const mobile = isMobile === true;

	// Mobile-specific sizing that does not affect desktop
	const paddingVertical = mobile ? baseUnit : goldenLarge * 2;
	const paddingHorizontal = mobile ? Math.round(baseUnit * 1.25) : goldenLarge * 3;
	const containerMinHeight = mobile ? baseUnit * 14 : baseUnit * 21;
	const contentMinHeight = mobile ? baseUnit * 9 : baseUnit * 13;
	const contentMarginLeft = mobile ? Math.round(baseUnit * 1.5) : baseUnit * 5;
	const iconWidth = mobile ? Math.round(goldenSmall * 1.5) : goldenSmall * 2;
	const iconMarginRightClass = mobile ? 'mr-2' : 'mr-3';
	const detailTextClass = mobile
		? 'tracking-[0.015em] text-[10px]'
		: 'tracking-[0.015em] text-[12px]';
	const normalTextClass = mobile
		? 'tracking-[0.005em] text-[11px]'
		: 'tracking-[0.005em] text-[13px]';
	const thinkingTextSizeClass = mobile ? 'text-[10px]' : 'text-[11px]';
	const indicatorMarginTop = mobile ? Math.round(baseUnit * 1.25) : goldenLarge;

	return (
		<div className={cn('relative', className)}>
			{/* Main container with golden ratio padding */}
			<div
				style={{
					padding: `${paddingVertical}px ${paddingHorizontal}px`,
					minHeight: `${containerMinHeight}px`,
				}}
			>
				{/* Console output area - slightly offset for visual interest */}
				<div
					className={cn(
						'font-mono space-y-[2px]',
						mobile ? 'text-[11px] max-w-full' : 'text-[13px] max-w-9/10'
					)}
					style={{
						lineHeight: GOLDEN_RATIO,
						minHeight: `${contentMinHeight}px`,
						marginLeft: `${contentMarginLeft}px`,
					}}
				>
					{logs.map((log) => (
						<div key={log.id} style={getLogStyle(log)}>
							<span
								className={cn('inline-block text-gray-400/60', iconMarginRightClass)}
								style={{ width: `${iconWidth}px` }}
							>
								{log.type === 'success'
									? '✓'
									: log.type === 'process'
									? '◆'
									: log.type === 'detail'
									? '·'
									: '›'}
							</span>
							<span
								className={cn(log.type === 'detail' ? detailTextClass : normalTextClass)}
							>
								{log.text}
							</span>
						</div>
					))}

					{/* Thinking indicator or active cursor */}
					<div className="text-gray-500" style={{ height: `${goldenSmall * 2}px` }}>
						{isThinking ? (
							<span className={cn('text-gray-400', thinkingTextSizeClass)}>
								<span
									className={cn('inline-block', iconMarginRightClass)}
									style={{ width: `${iconWidth}px` }}
								>
									◆
								</span>
								<span className="opacity-50">Analyzing</span>
								<span className="inline-flex ml-2">
									{[...Array(3)].map((_, i) => (
										<span
											key={i}
											className="inline-block w-[2px] h-[2px] bg-gray-400/60 rounded-full mx-[1px]"
											style={{
												animation: 'thinking-pulse 1.4s ease-in-out infinite',
												animationDelay: `${i * 0.15}s`,
											}}
										/>
									))}
								</span>
							</span>
						) : (
							<>
								<span
									className={cn('inline-block', iconMarginRightClass)}
									style={{ width: `${iconWidth}px` }}
								>
									›
								</span>
								<span
									className="inline-block w-[2px] bg-gray-400"
									style={{
										height: `${Math.round(baseUnit * INVERSE_GOLDEN)}px`,
										animation: 'blink 1.2s steps(2, start) infinite',
									}}
								/>
							</>
						)}
					</div>
				</div>

				{/* Ultra-minimal progress indicator - positioned with golden ratio */}
				<div
					className="flex justify-center"
					style={{ marginTop: `${indicatorMarginTop}px` }}
				>
					<div className="flex items-center" style={{ gap: `${goldenLarge}px` }}>
						{/* Left indicator */}
						<div className="flex gap-[3px]">
							{[...Array(3)].map((_, i) => (
								<div
									key={i}
									className="w-[1.5px] h-[1.5px] bg-gray-300 rounded-full"
									style={{
										animation: 'gentle-fade 2.4s ease-in-out infinite',
										animationDelay: `${i * 0.2}s`,
									}}
								/>
							))}
						</div>

						{/* Center text */}
						<div
							className="text-[10px] text-gray-400 font-mono tracking-wider uppercase"
							style={{ minWidth: `${baseUnit * 8}px` }}
						>
							<span className="tabular-nums">{(opsPerSec / 1000).toFixed(1)}k ops</span>
						</div>

						{/* Right indicator */}
						<div className="flex gap-[3px]">
							{[...Array(3)].map((_, i) => (
								<div
									key={i}
									className="w-[1.5px] h-[1.5px] bg-gray-300 rounded-full"
									style={{
										animation: 'gentle-fade 2.4s ease-in-out infinite',
										animationDelay: `${(2 - i) * 0.2}s`,
									}}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConsoleLoader;
