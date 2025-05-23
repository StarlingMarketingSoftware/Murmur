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
	const logos: Logo[] = [
		{
			fileName: 'uPittsburgh.png',
			width: 200,
		},
		{
			fileName: 'delawareValleyEagles.png',
			width: 200,
		},
		{
			fileName: 'bjs.png',
			width: 200,
		},
		{
			fileName: 'uPenn.png',
			width: 200,
		},
		{
			fileName: 'nordstrom.png',
			width: 400,
			darkFileName: 'nordstromDark.png',
		},
		{
			fileName: 'pennsylvaniaMedical.png',
			width: 400,
		},
		{
			fileName: 'cushman.png',
			width: 400,
		},

		{
			fileName: 'illusion.png',
			width: 400,
		},
		{
			fileName: 'lutherCrest.png',
			width: 400,
			darkFileName: 'lutherCrestDark.png',
		},
		{
			fileName: 'massMutual.png',
			width: 400,
		},
	];

	return (
		<div className="w-full overflow-hidden mt-10">
			<div className="flex gap-12 items-center justify-center mb-10 w-full flex-wrap">
				{logos.map((logo, index) => {
					const fileName =
						theme === 'dark' && logo.darkFileName ? logo.darkFileName : logo.fileName;
					return (
						<Image
							key={index}
							src={`/logos/${fileName}`}
							alt="Logo"
							height={200}
							width={logo.width / 1.2}
						/>
					);
				})}
			</div>
		</div>
	);
};
