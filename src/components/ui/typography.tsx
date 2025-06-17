import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const typographyVariants = cva('', {
	variants: {
		variant: {
			h1: 'scroll-m-20 text-4xl font-normal lg:text-[63px]',
			h2: 'scroll-m-20 text-3xl font-normal',
			h3: 'scroll-m-20 text-2xl font-normal',
			h4: 'scroll-m-20 text-xl font-normal',
			p: 'leading-7 text-[26px] font-normal',
			label: 'text-[14px]',
			blockquote: 'border-l-2 pl-6 italic',
			table: 'my-6 w-full overflow-y-auto',
			list: 'my-6 ml-6 list-disc [&>li]:mt-2 text-lg',
			inlineCode:
				'relative rounded bg-muted px-[0.3rem] py-[0.2rem]text-sm font-semibold',
			lead: 'text-xl text-muted-foreground',
			muted: 'text-lg text-muted-foreground font-normal',
		},
		color: {
			foreground: 'text-foreground',
			primary: 'text-primary',
			secondary: 'text-secondary',
			success: 'text-success',
			warning: 'text-warning',
			danger: 'text-destructive',
			light: 'text-light-foreground',
			muted: 'text-muted-foreground',
			background: 'text-background',
		},
		font: {
			primary: 'font-primary',
			secondary: 'font-secondary',
		},
		bold: {
			true: 'font-bold',
			false: '',
		},
		margins: {
			true: '[&:not(:first-child)]:mt-6',
			false: '',
		},
	},
	defaultVariants: {
		variant: 'p',
		color: 'foreground',
		font: 'primary',
		bold: false,
	},
});

const elementMap = {
	h1: 'h1',
	h2: 'h2',
	h3: 'h3',
	h4: 'h4',
	p: 'p',
	label: 'span',
	blockquote: 'blockquote',
	table: 'div',
	list: 'ul',
	inlineCode: 'code',
	lead: 'p',
	muted: 'p',
} as const;

interface TypographyProps
	extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
		VariantProps<typeof typographyVariants> {
	children?: React.ReactNode;
	asChild?: boolean;
}

function Typography({
	className,
	variant = 'p',
	color,
	font,
	bold,
	children,
	asChild = false,
	...props
}: TypographyProps) {
	if (asChild) {
		return <>{children}</>;
	}

	const Comp = elementMap[variant as keyof typeof elementMap];

	return React.createElement(
		Comp,
		{
			className: cn(typographyVariants({ variant, bold, color, font, className })),
			...props,
		},
		children
	);
}

export { Typography, typographyVariants };
