'use client';
import { Logo } from '@/types/types';
import { useTheme } from 'next-themes';
import Image from 'next/image';

export const LogoList = ({ logos }: { logos: Logo[] }) => {
	const { theme } = useTheme();

	return (
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
	);
};
