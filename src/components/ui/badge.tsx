import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils';

const badgeVariants = cva(
	'inline-flex items-center justify-center rounded-md border text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color] overflow-hidden transition',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
				destructive:
					'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
				warning: 'text-warning border-warning bg-warning/10 [a&]:hover:bg-warning/20',
			},
			size: {
				small: 'px-2 py-0.5 text-xs [&>svg]:size-3 gap-1',
				medium: 'px-2.5 py-1 text-sm [&>svg]:size-4 gap-1.5',
				large: 'px-3 py-1.5 text-base [&>svg]:size-5 gap-2',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'small',
		},
	}
);

interface BadgeProps
	extends React.ComponentProps<'span'>,
		VariantProps<typeof badgeVariants> {
	asChild?: boolean;
	isDragging?: boolean;
}

function Badge({
	className,
	variant,
	size,
	asChild = false,
	isDragging = false,
	...props
}: BadgeProps) {
	const Comp = asChild ? SlotPrimitive.Slot : 'span';

	return (
		<Comp
			data-slot="badge"
			className={cn(
				badgeVariants({ variant, size }),
				isDragging && 'opacity-50 scale-105 shadow-lg',
				className
			)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
