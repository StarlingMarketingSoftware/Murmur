import * as React from 'react';
import { cn } from '@/utils';
import { cva, VariantProps } from 'class-variance-authority';

const cardVariants = cva('bg-card text-card-foreground flex flex-col p-4 my-4', {
	variants: {
		variant: {
			primary:
				'text-[15px] font-primary rounded-md border-x-3 border-t-7 border-b-3 border-primary/25 border-solid p-10',
			secondary: 'text-[15px] font-primary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

type CardProps = React.ComponentProps<'div'> &
	VariantProps<typeof cardVariants> & {
		size?: 'none' | 'sm' | 'md' | 'lg';
	};

function Card({ className, size = 'none', variant, ...props }: CardProps) {
	return (
		<div
			data-slot="card"
			className={cn(
				cardVariants({ variant }),
				{
					'': size === 'none',
					'w-15/30 mx-auto mt-4 max-w-[756px]': size === 'sm',
					'w-20/30 mx-auto mt-4 max-w-[1080px]': size === 'md',
					'w-29/30 mx-auto mt-4 max-w-[1920px]': size === 'lg',
				},
				className
			)}
			{...props}
		/>
	);
}

const cardHeaderVariants = cva(
	'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-[data-slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
	{
		variants: {
			variant: {
				primary: 'pb-3',
				secondary: '',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function CardHeader({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardHeaderVariants>) {
	return (
		<div
			data-slot="card-header"
			className={cn(cardHeaderVariants({ variant }), className)}
			{...props}
		/>
	);
}

const cardTitleVariants = cva('leading-none font-semibold', {
	variants: {
		variant: {
			primary: 'text-[30px] font-bold',
			secondary: 'text-[15px] font-primary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function CardTitle({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardTitleVariants>) {
	return (
		<div
			data-slot="card-title"
			className={cn(cardTitleVariants({ variant }), className)}
			{...props}
		/>
	);
}

const cardDescriptionVariants = cva('text-muted-foreground text-sm', {
	variants: {
		variant: {
			primary: 'text-sm text-light-foreground font-secondary',
			secondary: 'text-[15px] font-primary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function CardDescription({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardDescriptionVariants>) {
	return (
		<div
			data-slot="card-description"
			className={cn(cardDescriptionVariants({ variant }), className)}
			{...props}
		/>
	);
}

const cardActionVariants = cva(
	'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
	{
		variants: {
			variant: {
				primary: 'text-[15px] font-primary',
				secondary: 'text-[15px] font-primary bg-primary',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function CardAction({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardActionVariants>) {
	return (
		<div
			data-slot="card-action"
			className={cn(cardActionVariants({ variant }), className)}
			{...props}
		/>
	);
}

const cardContentVariants = cva('', {
	variants: {
		variant: {
			primary: 'text-[15px] font-primary',
			secondary: 'text-[15px] font-primary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function CardContent({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardContentVariants>) {
	return (
		<div
			data-slot="card-content"
			className={cn(cardContentVariants({ variant }), className)}
			{...props}
		/>
	);
}

const cardFooterVariants = cva('flex items-center px-6 [.border-t]:pt-6', {
	variants: {
		variant: {
			primary: 'text-[15px] font-primary',
			secondary: 'text-[15px] font-primary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function CardFooter({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardFooterVariants>) {
	return (
		<div
			data-slot="card-footer"
			className={cn(cardFooterVariants({ variant }), className)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};
