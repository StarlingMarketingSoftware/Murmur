import { FC } from 'react';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';

export interface BlockSelectOption {
	value: string;
	label: string;
	description: string;
}

export interface BlockSelectProps {
	options: BlockSelectOption[];
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
}

export const BlockSelect: FC<BlockSelectProps> = ({
	options,
	value,
	onChange,
	disabled = false,
	className,
}) => {
	return (
		<div
			className={twMerge(
				'grid grid-cols-2 gap-3 mt-2 w-fit transition',
				disabled && 'opacity-50 pointer-events-none',
				className
			)}
		>
			{options.map((tone: BlockSelectOption) => (
				<div
					key={tone.value}
					className={twMerge(
						'w-[194px] h-[78px] border-2 p-1 col-span-1 transition transition-300',
						tone.value === value
							? 'bg-gradient-to-br from-background to-primary/30 pointer-events-none border-primary'
							: 'cursor-pointer hover:bg-primary/10 border-border',
						disabled && 'cursor-not-allowed hover:bg-transparent'
					)}
					onClick={() => !disabled && onChange(tone.value)}
				>
					<Typography variant="h4" className="text-[20px]" font="secondary">
						{tone.label}
					</Typography>
					<Typography className="!text-[12px]">{tone.description}</Typography>
				</div>
			))}
		</div>
	);
};
