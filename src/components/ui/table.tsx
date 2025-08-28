'use client';

import * as React from 'react';

import { cn } from '@/utils';
import { cva, VariantProps } from 'class-variance-authority';

const tableVariants = cva('w-full caption-bottom border-collapse', {
	variants: {
		variant: {
			primary: 'text-[15px] font-secondary',
			secondary: 'text-[15px] font-secondary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function Table({
	className,
	variant,
	...props
}: React.ComponentProps<'table'> & VariantProps<typeof tableVariants>) {
	return (
		<table
			data-slot="table"
			className={cn(tableVariants({ variant }), className, 'rounded-md')}
			{...props}
		/>
	);
}

const tableHeaderVariants = cva('', {
	variants: {
		variant: {
			primary: 'text-[15px] font-primary [&_tr]:border-b-2 [&_tr]:border-black',
			secondary: 'text-[15px] font-secondary bg-primary',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

interface TableHeaderProps extends React.ComponentProps<'thead'> {
	variant?: 'primary' | 'secondary';
	sticky?: boolean;
}

function TableHeader({
	className,
	variant = 'primary',
	sticky = false,
	...props
}: TableHeaderProps) {
	return (
		<thead
			data-slot="table-header"
			className={cn(
				tableHeaderVariants({ variant }),
				sticky && 'sticky -top-2 z-10 bg-background',
				className
			)}
			{...props}
		/>
	);
}

const tableBodyVariants = cva('', {
	variants: {
		variant: {
			primary: 'text-[15px] font-primary',
			secondary: 'text-[15px] font-secondary bg-background',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function TableBody({
	className,
	variant,
	...props
}: React.ComponentProps<'tbody'> & VariantProps<typeof tableBodyVariants>) {
	return (
		<tbody
			data-slot="table-body"
			className={cn(tableBodyVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableFooterVariants = cva(
	'bg-muted/50 border-t font-medium ',
	// '[&>tr]:last:border-b-0',
	{
		variants: {
			variant: {
				primary: 'text-[15px] font-primary',
				secondary: 'text-[15px] font-secondary',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function TableFooter({
	className,
	variant,
	...props
}: React.ComponentProps<'tfoot'> & VariantProps<typeof tableFooterVariants>) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn(tableFooterVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableRowVariants = cva(
	'hover:bg-primary/20 transition-all duration-200 cursor-pointer border border-t',
	{
		variants: {
			variant: {
				primary:
					'text-[15px] odd:bg-gray-50 even:bg-background border-black data-[state=selected]:!bg-primary/30 data-[state=selected]:shadow-inner data-[state=selected]:font-medium data-[state=selected]:scale-[1.005]',
				secondary: 'text-[15px] font-secondary bg-background border-gray-200 py-2',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function TableRow({
	className,
	variant,
	...props
}: React.ComponentProps<'tr'> & VariantProps<typeof tableRowVariants>) {
	return (
		<tr
			data-slot="table-row"
			className={cn(tableRowVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableHeadVariants = cva(
	'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap overflow-hidden text-ellipsis [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] bg-background',
	{
		variants: {
			variant: {
				primary: 'border-b-2 border-black',
				secondary: 'font-secondary border-b border-[#8C8C8C]',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function TableHead({
	className,
	variant,
	...props
}: React.ComponentProps<'th'> & VariantProps<typeof tableHeadVariants>) {
	return (
		<th
			data-slot="table-head"
			className={cn(tableHeadVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableCellVariants = cva(
	'p-2 align-middle whitespace-nowrap overflow-hidden text-ellipsis [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
	{
		variants: {
			variant: {
				primary: 'text-sm font-secondary',
				secondary: 'text-[15px] font-secondary bg-background py-3',
			},
		},
		defaultVariants: {
			variant: 'primary',
		},
	}
);

function TableCell({
	className,
	variant,
	...props
}: React.ComponentProps<'td'> & VariantProps<typeof tableCellVariants>) {
	return (
		<td
			data-slot="table-cell"
			className={cn(tableCellVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableCaptionVariants = cva('text-muted-foreground mt-4 text-sm', {
	variants: {
		variant: {
			primary: 'text-[15px] font-secondary',
			secondary: 'text-[15px] font-secondary bg-background',
		},
	},
	defaultVariants: {
		variant: 'primary',
	},
});

function TableCaption({
	className,
	variant,
	...props
}: React.ComponentProps<'caption'> & VariantProps<typeof tableCaptionVariants>) {
	return (
		<caption
			data-slot="table-caption"
			className={cn(tableCaptionVariants({ variant }), className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
};
