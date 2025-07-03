import * as React from 'react';
import { cn } from '@/utils';
import { cva, VariantProps } from 'class-variance-authority';

const inputVariants = cva(
	'file:text-foreground placeholder:text-muted-foreground selection:bg-primary dark:bg-input/30 border-input flex h-12 w-full min-w-0 border px-3 py-1 text-base transition-[color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-light disabled:text-light-foreground md:text-sm  transition-all focus-visible:accent border-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
	{
		variants: {
			variant: {
				default: 'bg-background border-gray-300',
				light: 'bg-background border-input',
				outlined: 'bg-background border-gray-300',
			},
			rounded: {
				true: 'rounded-lg',
				false: 'rounded-none',
			},
		},
		defaultVariants: {
			variant: 'default',
			rounded: true,
		},
	}
);

interface InputProps
	extends React.ComponentProps<'input'>,
		VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, rounded, ...props }: InputProps) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(className, inputVariants({ variant, rounded }))}
			{...props}
		/>
	);
}

export { Input };
