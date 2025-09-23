'use client';

import React from 'react';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useMobileAppComingSoon } from './useMobileAppComingSoon';

export const MobileAppComingSoon: React.FC = () => {
	const {
		lineOneRef,
		lineTwoRef,
		lineThreeRef,
		lineFourRef,
		lineFiveRef,
		verticalLineOneRef,
		verticalLineTwoRef,
		shimmerRef,
		handleGoBack,
	} = useMobileAppComingSoon();

	return (
		<div
			className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center min-h-dvh overflow-hidden bg-white"
			style={{
				WebkitOverflowScrolling: 'touch',
				WebkitTapHighlightColor: 'transparent',
				touchAction: 'none',
				WebkitTransform: 'translateZ(0)', // Safari GPU acceleration
				WebkitBackfaceVisibility: 'hidden', // Safari flicker fix
			}}
		>
			{/* Animated lines overlay */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden">
				<div
					ref={lineOneRef}
					className="absolute w-[60%] h-[1px] opacity-0 top-[15%] left-0 bg-red-500"
					style={{
						background: 'linear-gradient(90deg, transparent, #D0D0D0, transparent)',
					}}
				/>
				<div
					ref={lineTwoRef}
					className="absolute w-[80%] h-[1px] opacity-0 top-[35%] left-0"
					style={{
						background: 'linear-gradient(90deg, transparent, #C0C0C0, transparent)',
					}}
				/>
				<div
					ref={lineThreeRef}
					className="absolute h-[1px] opacity-0 top-[50%] left-[50%] w-[0%] bg-[#B8B8B8] -translate-x-1/2"
				/>
				<div
					ref={lineFourRef}
					className="absolute w-[70%] h-[1px] opacity-0 top-[70%] left-0"
					style={{
						background: 'linear-gradient(90deg, transparent, #E0E0E0, transparent)',
					}}
				/>
				<div
					ref={lineFiveRef}
					className="absolute w-[50%] h-[1px] opacity-0 top-[85%] left-0"
					style={{
						background: 'linear-gradient(90deg, transparent, #D8D8D8, transparent)',
					}}
				/>

				{/* Vertical lines */}
				<div
					ref={verticalLineOneRef}
					className="absolute w-1 h-[40%] opacity-0 top-0 left-[20%] bg-[#C8C8C8]"
					style={{
						background: 'linear-gradient(180deg, transparent, #C8C8C8, transparent)',
					}}
				/>
				<div
					ref={verticalLineTwoRef}
					className="absolute w-1 h-[50%] opacity-0 top-0 left-[75%] bg-[#E8E8E8]"
					style={{
						background: 'linear-gradient(180deg, transparent, #E8E8E8, transparent)',
					}}
				/>

				{/* Shimmer overlay */}
				<div
					ref={shimmerRef}
					className="absolute inset-0 w-[30%] h-full top-0 left-0"
					style={{
						background:
							'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
					}}
				/>
			</div>

			{/* Content */}
			<Button
				onClick={handleGoBack}
				variant="ghost"
				size="icon"
				className="absolute top-4 left-4 w-10 text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 transition-colors duration-200 active:scale-95 z-10"
				aria-label="Go back"
			>
				<ChevronLeft className="w-5 h-5" />
			</Button>

			<div className="max-w-sm w-full relative z-10">
				<div className="mb-8 flex justify-center">
					<div className="w-24 h-20">
						<LogoIcon />
					</div>
				</div>

				<Typography variant="h2" bold className="text-gray-700 !text-2xl">
					Mobile App
					<br />
					Coming Soon
				</Typography>
			</div>
		</div>
	);
};
