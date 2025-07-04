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
			fileName: 'nordstrom.png',
			width: 400,
			darkFileName: 'nordstromDark.png',
		},
		{
			fileName: 'cushman.png',
			width: 400,
		},
		{
			fileName: 'uPenn.png',
			width: 200,
		},
		{
			fileName: 'freeLibraryFoundation.png',
			width: 200,
		},
		{
			fileName: 'massMutual.png',
			width: 400,
		},
		{
			fileName: 'charlesSchwab.png',
			width: 200,
		},
		{
			fileName: 'uPittsburgh.png',
			width: 200,
		},
		{
			fileName: 'headForTheCure.png',
			width: 400,
		},
		{
			fileName: 'bjs.png',
			width: 200,
		},
		{
			fileName: 'pennsylvaniaMedical.png',
			width: 400,
		},
		{
			fileName: 'americanLungAssociation.png',
			width: 400,
		},
		{
			fileName: 'lutherCrest.png',
			width: 400,
			darkFileName: 'lutherCrestDark.png',
		},
	];
	const generateLogos = (logos: Logo[]) => {
		const res = [];
		for (let i = 0; i < logos.length - 1; i += 3) {
			const logo1 = logos[i];
			const logo2 = logos[i + 1];
			const logo3 = logos[i + 2];
			const fileName1 =
				theme === 'dark' && logo1.darkFileName ? logo1.darkFileName : logo1.fileName;
			const fileName2 =
				theme === 'dark' && logo2.darkFileName ? logo2.darkFileName : logo2.fileName;
			const fileName3 =
				theme === 'dark' && logo3.darkFileName ? logo3.darkFileName : logo3.fileName;
			res.push(
				<div key={i} className="flex gap-32 justify-center items-center">
					<div className="min-w-[400px] flex justify-center items-center gap-6">
						<Image
							src={`/logos/${fileName1}`}
							alt="Logo"
							height={94}
							width={logo1.width / 1.2}
						/>
					</div>
					<div className="min-w-[400px] flex justify-center items-center">
						<Image
							src={`/logos/${fileName2}`}
							alt="Logo"
							height={94}
							width={logo2.width / 1.2}
						/>
					</div>
					<div className="min-w-[400px] flex justify-center items-center">
						<Image
							src={`/logos/${fileName3}`}
							alt="Logo"
							height={94}
							width={logo3.width / 1.2}
						/>
					</div>
				</div>
			);
		}
		return res;
	};
	return <div className="flex flex-col gap-12 h-fit">{generateLogos(logos)}</div>;
};
