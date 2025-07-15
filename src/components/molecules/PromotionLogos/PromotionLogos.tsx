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

	const generateLogos = (logos: Logo[]) => {
		const rows = [];
		const mobileRows = [];
		for (let i = 0; i < logos.length; i += 2) {
			const logo1 = logos[i];
			const logo2 = logos[i + 1];

			const fileName1 =
				theme === 'dark' && logo1.darkFileName ? logo1.darkFileName : logo1.fileName;
			const fileName2 =
				logo2 &&
				(theme === 'dark' && logo2.darkFileName ? logo2.darkFileName : logo2.fileName);

			mobileRows.push(
				<div key={`mobile-${i}`} className="grid grid-cols-2 gap-4 md:hidden">
					<div className="flex justify-center items-center">
						<Image
							src={`/logos/${fileName1}`}
							alt="Logo"
							height={50}
							width={logo1.width}
							className="w-[120px] sm:w-[160px] h-auto object-contain"
						/>
					</div>
					{logo2 && (
						<div className="flex justify-center items-center">
							<Image
								src={`/logos/${fileName2}`}
								alt="Logo"
								height={50}
								width={logo2.width}
								className="w-[120px] sm:w-[160px] h-auto object-contain"
							/>
						</div>
					)}
				</div>
			);
		}

		// On desktop, we'll show 3 logos per row
		for (let i = 0; i < logos.length; i += 3) {
			const logo1 = logos[i];
			const logo2 = logos[i + 1];
			const logo3 = logos[i + 2];

			const fileName1 =
				theme === 'dark' && logo1.darkFileName ? logo1.darkFileName : logo1.fileName;
			const fileName2 =
				logo2 &&
				(theme === 'dark' && logo2.darkFileName ? logo2.darkFileName : logo2.fileName);
			const fileName3 =
				logo3 &&
				(theme === 'dark' && logo3.darkFileName ? logo3.darkFileName : logo3.fileName);

			rows.push(
				<div
					key={`desktop-${i}`}
					className="hidden md:grid md:grid-cols-3 gap-8 lg:gap-12"
				>
					<div className="flex justify-center items-center">
						<Image
							src={`/logos/${fileName1}`}
							alt="Logo"
							height={50}
							width={logo1.width}
							className="w-[200px] lg:w-[250px] h-auto object-contain max-h-45"
						/>
					</div>
					{logo2 && (
						<div className="flex justify-center items-center">
							<Image
								src={`/logos/${fileName2}`}
								alt="Logo"
								height={50}
								width={logo2.width}
								className="w-[200px] lg:w-[250px] h-auto object-contain max-h-45"
							/>
						</div>
					)}
					{logo3 && (
						<div className="flex justify-center items-center">
							<Image
								src={`/logos/${fileName3}`}
								alt="Logo"
								height={94}
								width={logo3.width}
								className="w-[200px] lg:w-[250px] h-auto object-contain max-h-45"
							/>
						</div>
					)}
				</div>
			);
		}

		return (
			<>
				{mobileRows}
				{rows}
			</>
		);
	};

	return (
		<div className="grid gap-8 md:gap-12 lg:gap-16 px-4 sm:px-8 md:px-12 max-w-[1200px] mx-auto">
			{generateLogos(logos)}
		</div>
	);
};
