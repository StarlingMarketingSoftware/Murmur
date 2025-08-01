import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/index';
import Spinner from './spinner';
import { twMerge } from 'tailwind-merge';

export type ButtonVariants = VariantProps<typeof buttonVariants>;

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[17px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:cursor-pointer font-primary",
	{
		variants: {
			variant: {
				primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
				'primary-light':
					'bg-primary/30 text-foreground hover:bg-primary/20 border-primary border-1 focus-visible:ring-primary/50',
				destructive:
					'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				'destructive-light':
					'bg-destructive/50 border-destructive border-1 text-foreground hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				muted: 'bg-muted text-background hover:bg-muted/80',
				light:
					'bg-light text-foreground hover:bg-light/80 border-gray-400 border-1 hover:bg-light/20',
				// outline:
				// 	'border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				'secondary-light':
					'bg-secondary/20 text-secondary hover:bg-secondary-light/80 border-secondary border-solid border-1',
				'secondary-outline':
					'bg-secondary/10 text-secondary hover:bg-secondary/0 border-secondary border-solid border-1',

				ghost: '',
				link: 'text-primary underline-offset-4 hover:underline',
				product:
					'bg-medium hover:bg-medium/80 rounded-none !h-19 p-8 text-[30px] !w-full',
				'action-link':
					'text-[15px] !text-secondary underline cursor-pointer hover:text-secondary/80 !p-0 !h-fit !font-normal',
			},
			size: {
				default: 'h-10 w-fit px-4 py-2 has-[>svg]:px-3',
				sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
				lg: 'h-9 rounded-md py-5 sm:py-6 px-14 sm:px-24 text-[17px] sm:text-[20px] has-[>svg]:px-4',
				xl: 'h-19 p-8 text-[30px]',
				icon: 'size-8',
				iconSm: 'size-4',
			},
			font: {
				primary: 'font-primary',
				secondary: 'font-secondary',
			},
			outline: {
				true: '', // Base outline class, will be combined with variant
				false: '',
			},
			bold: {
				true: 'font-bold',
				false: '',
			},
		},
		defaultVariants: {
			variant: 'primary',
			size: 'default',
			outline: false,
			font: 'primary',
			bold: false,
		},
	}
);

function Button({
	className,
	variant = 'primary',
	size,
	font,
	bold,
	outline,
	asChild = false,
	children,
	isLoading = false,
	noPadding = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		isLoading?: boolean;
		noPadding?: boolean;
		bold?: boolean;
	}) {
	const Comp = asChild ? SlotPrimitive.Slot : 'button';

	const getOutlineClasses = () => {
		if (!outline) return '';

		let outlineClasses = 'border-2 border-solid';

		switch (variant) {
			case 'primary':
				outlineClasses += ' border-primary';
				break;
			case 'destructive':
				outlineClasses += ' border-destructive';
				break;
			case 'secondary':
				outlineClasses += ' border-secondary';
				break;
			case 'muted':
				outlineClasses += ' border-muted';
				break;
			case 'light':
				outlineClasses += ' border-muted';
				break;
			default:
				outlineClasses += ' border-foreground';
		}

		return outlineClasses;
	};

	const outlineClasses = getOutlineClasses();

	return (
		<Comp
			data-slot="button"
			className={cn(
				buttonVariants({
					variant,
					size,
					font,
					outline,
					bold,
					className,
				}),
				outlineClasses,
				noPadding ? '!p-0 px-0 min-w-0' : ''
			)}
			disabled={isLoading}
			{...props}
		>
			{isLoading && (
				<div className="absolute flex items-center justify-center">
					<Spinner color={variant === 'primary' ? 'background' : 'foreground'} />
				</div>
			)}
			<div
				className={twMerge(
					isLoading ? 'invisible' : 'visible',
					'flex gap-2 items-center justify-center',
					noPadding ? '!p-0' : ''
				)}
			>
				{children}
			</div>
		</Comp>
	);
}

export { Button, buttonVariants };
