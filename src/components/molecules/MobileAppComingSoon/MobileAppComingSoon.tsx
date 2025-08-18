'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const MobileAppComingSoon: React.FC = () => {
	const router = useRouter();

	const handleGoBack = () => {
		router.back();
	};

	return (
		<div 
			className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
			style={{
				backgroundColor: '#E2E2E2',
				minHeight: '100dvh', /* Dynamic viewport height for better mobile support */
				// @ts-ignore - WebKit specific properties
				WebkitOverflowScrolling: 'touch',
				WebkitTapHighlightColor: 'transparent',
			}}
		>
			{/* Back Button */}
			<Button
				onClick={handleGoBack}
				variant="ghost"
				size="icon"
				className="absolute top-4 left-4 w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 transition-colors duration-200 active:scale-95"
				aria-label="Go back"
			>
				<ChevronLeft className="w-5 h-5" />
			</Button>

			<div className="max-w-sm w-full">
				{/* Logo */}
				<div className="mb-8 flex justify-center">
					<div className="w-24 h-20">
						<LogoIcon />
					</div>
				</div>

				{/* Coming Soon Message */}
				<Typography 
					variant="h2" 
					className="text-gray-700 !text-2xl font-bold"
				>
					Mobile App<br />Coming Soon
				</Typography>
			</div>
		</div>
	);
};
