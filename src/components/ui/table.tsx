'use client';

import * as React from 'react';

import { cn } from '@/utils';
import { cva, VariantProps } from 'class-variance-authority';

const tableVariants = cva('w-full caption-bottom border-collapse', {
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

function Table({
	className,
	variant,
	...props
}: React.ComponentProps<'table'> & VariantProps<typeof tableVariants>) {
	return (
		<div data-slot="table-container" className="relative w-full overflow-x-auto">
			<table
				data-slot="table"
				className={cn(tableVariants({ variant }), className)}
				{...props}
			/>
		</div>
	);
}

const tableHeaderVariants = cva(
	'',
	// '[&_tr]:border-b',
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

function TableHeader({
	className,
	variant,
	...props
}: React.ComponentProps<'thead'> & VariantProps<typeof tableHeaderVariants>) {
	return (
		<thead
			data-slot="table-header"
			className={cn(tableHeaderVariants({ variant }), className)}
			{...props}
		/>
	);
}

const tableBodyVariants = cva('', {
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
				secondary: 'text-[15px] font-primary bg-primary',
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
	'hover:bg-primary/15 transition-colors data-[state=selected]:bg-primary/50 border border-primary/20 border-t border-t-primary data-[state=selected]:border-primary data-[state=selected]:!border-t-primary',
	{
		variants: {
			variant: {
				primary: 'font-bold text-[15px] odd:bg-gray-50 even:bg-white',
				secondary: 'text-[15px] font-primary bg-primary',
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
	'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] bg-background rounded-md',
	{
		variants: {
			variant: {
				primary: '',
				secondary: '',
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
	'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
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
			primary: 'text-[15px] font-primary',
			secondary: 'text-[15px] font-primary bg-primary',
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
