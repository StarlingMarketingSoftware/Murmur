import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';

export interface TabOption<T = string> {
	value: T;
	label: string;
	disabled?: boolean;
}

interface TabsCustomProps<T = string> {
	options: TabOption<T>[];
	activeValue: T;
	onValueChange: (value: T) => void;
	className?: string;
	tabClassName?: string;
	activeTabClassName?: string;
	inactiveTabClassName?: string;
}

export function BlockTabs<T = string>({
	options,
	activeValue,
	onValueChange,
	className,
	tabClassName,
	activeTabClassName,
	inactiveTabClassName,
}: TabsCustomProps<T>) {
	return (
		<div className={twMerge('flex gap-2', className)}>
			{options.map((option) => (
				<div
					key={String(option.value)}
					className={twMerge(
						'h-8 transition border-2',
						option.disabled && 'opacity-50 pointer-events-none',
						activeValue === option.value
							? twMerge(
									'border-primary bg-gradient-to-br from-background to-primary/20',
									activeTabClassName
							  )
							: twMerge(
									'cursor-pointer outline-1 outline-border bg-transparent hover:bg-primary/10 border-transparent',
									inactiveTabClassName
							  ),
						tabClassName
					)}
					style={{
						width: `${100 / options.length}%`,
					}}
					onClick={() => !option.disabled && onValueChange(option.value)}
				>
					<Typography font="secondary" className="ml-2 !text-[20px]">
						{option.label}
					</Typography>
				</div>
			))}
		</div>
	);
}
