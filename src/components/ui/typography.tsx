import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface TypographyProps {
	children?: ReactNode;
	className?: string;
}

export function TypographyH1({ children, className }: TypographyProps) {
	return (
		<h1
			className={twMerge(
				'scroll-m-20 text-4xl font-medium lg:text-7xl tracking-wide',
				className
			)}
		>
			{children}
		</h1>
	);
}

export function TypographyH2({ children, className }: TypographyProps) {
	return (
		<h2
			className={twMerge('scroll-m-20 pb-2 text-3xl font-normal first:mt-0', className)}
		>
			{children}
		</h2>
	);
}

export function TypographyH3({ children, className }: TypographyProps) {
	return (
		<h3 className={twMerge('scroll-m-20 text-2xl font-semibold ', className)}>
			{children}
		</h3>
	);
}

export function TypographyH4({ children, className }: TypographyProps) {
	return (
		<h4 className={twMerge('scroll-m-20 text-xl font-semibold ', className)}>
			{children}
		</h4>
	);
}

export function TypographyP({ children, className }: TypographyProps) {
	return (
		<p className={twMerge('leading-7 [&:not(:first-child)]:mt-6 text-[26px]', className)}>
			{children}
		</p>
	);
}

export function TypographyBlockquote({ children, className }: TypographyProps) {
	return (
		<blockquote className={twMerge('mt-6 border-l-2 pl-6 italic ', className)}>
			{children}
		</blockquote>
	);
}

export function TypographyTable({ children, className }: TypographyProps) {
	return (
		<div className={twMerge('my-6 w-full overflow-y-auto', className)}>{children}</div>
	);
}

export function TypographyList({ children, className }: TypographyProps) {
	return (
		<ul className={twMerge('my-6 ml-6 list-disc [&>li]:mt-2  text-lg', className)}>
			{children}
		</ul>
	);
}

export function TypographyInlineCode({ children, className }: TypographyProps) {
	return (
		<code
			className={twMerge(
				'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
				className
			)}
		>
			{children}
		</code>
	);
}

export function TypographyLead({ children, className }: TypographyProps) {
	return (
		<p className={twMerge('text-xl text-muted-foreground', className)}>{children}</p>
	);
}

export function TypographyLarge({ children, className }: TypographyProps) {
	return <div className={twMerge('text-lg font-semibold', className)}>{children}</div>;
}

export function TypographySmall({ children, className }: TypographyProps) {
	return (
		<small className={twMerge('text-sm font-medium leading-none', className)}>
			{children}
		</small>
	);
}

export function TypographyMuted({ children, className }: TypographyProps) {
	return (
		<p className={twMerge('text-lg text-muted-foreground', className)}>{children}</p>
	);
}
