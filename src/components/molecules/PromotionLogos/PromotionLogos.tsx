'use client';
import { Logo } from '@/types';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export const PromotionLogos = () => {
	const { theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Don't render anything until mounted (prevents hydration mismatch)
	if (!mounted) {
		return null;
	}

	const LOGO_HORIZONTAL_WIDTH = 400;
	const LOGO_VERTICAL_WIDTH = 200;

	const logos: Logo[] = [
		{
			fileName: 'nordstrom.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'cushman.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'uPennTextLogo.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'freeLibraryFoundation.png',
			width: LOGO_VERTICAL_WIDTH,
		},
		{
			fileName: 'massMutual.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'charlesSchwab.png',
			width: LOGO_VERTICAL_WIDTH,
		},
		{
			fileName: 'uPittsburgh.png',
			width: LOGO_VERTICAL_WIDTH,
		},
		{
			fileName: 'headForTheCure.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'bjs.png',
			width: LOGO_VERTICAL_WIDTH,
		},
		{
			fileName: 'pennsylvaniaMedical.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'americanLungAssociation.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
		{
			fileName: 'lutherCrest.png',
			width: LOGO_HORIZONTAL_WIDTH,
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 lg:gap-16 max-w-[1000px] mx-auto">
			{logos.map((logo, i) => {
				const fileName =
					theme === 'dark' && logo.darkFileName ? logo.darkFileName : logo.fileName;
				return (
					<div key={i} className="flex justify-center items-center">
						<Image
							src={`/logos/${fileName}`}
							alt="Logo"
							height={94}
							width={logo.width}
							className="w-[100px] sm:w-[140px] md:w-[180px] lg:w-[220px] h-auto object-contain md:max-h-45"
						/>
					</div>
				);
			})}
		</div>
	);
};
