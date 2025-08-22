import { Typography } from '@/components/ui/typography';
import { FC } from 'react';
import { cn } from '@/utils';

interface StatBlockProps {
	size?: 'sm' | 'md' | 'lg';
	stat: string;
	description?: string;
	className?: string;
}

const EMAIL_STATS = [
	{
		value: '115%',
		label: 'More Responses',
	},
	{
		value: '99.7%',
		label: 'Delivery Rate',
	},
	{
		value: '10x',
		label: 'More Connections',
	},
];

export const StatBlock: FC<StatBlockProps> = ({
	stat = EMAIL_STATS[0].value,
	description,
	size,
	className,
}) => {
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
		<div className={cn('text-center flex flex-col', className)}>
			<Typography variant="h2" className={cn(['p-0', cnStat])}>
				{stat}
			</Typography>
			<Typography variant="p" className={cn(['!mt-0 font-bold', cnDescription])}>
				{description}
			</Typography>
		</div>
	);
};
