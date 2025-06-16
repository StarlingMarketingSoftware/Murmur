import { Typography } from '@/components/ui/typography';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

interface StatBlockProps {
	size?: 'sm' | 'md' | 'lg';
	stat: string;
	description?: string;
	className?: string;
}

export const StatBlock: FC<StatBlockProps> = ({ stat, description, size, className }) => {
	const cnStat = [];
	const cnDescription = [];

	switch (size) {
		case 'sm':
			cnStat.push('text-[30px]', 'font-bold');
			cnDescription.push('text-sm');
			break;
		case 'md':
			cnStat.push('text-[60px] font-extrabold');
			cnDescription.push('text-lg', 'font-bold');
			break;
		case 'lg':
			cnStat.push('text-[90px] font-extrabold leading-[100px]');
			cnDescription.push('text-[30px]');
			break;
		default:
			cnStat.push('text-[40px]', 'font-extrabold');
			cnDescription.push('text-base');
	}

	return (
		<div className={twMerge('text-center flex flex-col', className)}>
			<Typography variant="h2" className={twMerge(['p-0', cnStat])}>
				{stat}
			</Typography>
			<Typography variant="p" className={twMerge(['!mt-0 font-bold', cnDescription])}>
				{description}
			</Typography>
		</div>
	);
};
