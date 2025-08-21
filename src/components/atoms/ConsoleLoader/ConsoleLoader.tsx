import React, { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { ConsoleLoaderProps, useConsoleLoader } from './useConsoleLoader';
import { GOLDEN_RATIO, INVERSE_GOLDEN } from '@/constants';

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

	return (
		<div className={twMerge('relative', className)}>
			{/* Main container with golden ratio padding */}
			<div
				style={{
					padding: `${goldenLarge * 2}px ${goldenLarge * 3}px`,
					minHeight: `${baseUnit * 21}px`,
				}}
			>
				{/* Console output area - slightly offset for visual interest */}
				<div
					className="font-mono text-[13px] space-y-[2px] max-w-9/10"
					style={{
						lineHeight: GOLDEN_RATIO,
						minHeight: `${baseUnit * 13}px`,
						marginLeft: `${baseUnit * 5}px`,
					}}
				>
					{logs.map((log) => (
						<div key={log.id} style={getLogStyle(log)}>
							<span
								className="inline-block text-gray-400/60 mr-3"
								style={{ width: `${goldenSmall * 2}px` }}
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
								className={twMerge(
									log.type === 'detail'
										? 'tracking-[0.015em] text-[12px]'
										: 'tracking-[0.005em] text-[13px]'
								)}
							>
								{log.text}
							</span>
						</div>
					))}

					{/* Thinking indicator or active cursor */}
					<div className="text-gray-500" style={{ height: `${goldenSmall * 2}px` }}>
						{isThinking ? (
							<span className="text-gray-400 text-[11px]">
								<span
									className="inline-block mr-3"
									style={{ width: `${goldenSmall * 2}px` }}
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
									className="inline-block mr-3"
									style={{ width: `${goldenSmall * 2}px` }}
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
				<div className="flex justify-center" style={{ marginTop: `${goldenLarge}px` }}>
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
