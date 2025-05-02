import Link from 'next/link';

export const StyledLink = ({
	children,
	href,
	className,
	...props
}: React.ComponentProps<typeof Link>) => {
	return (
		<Link
			className={`text-primary hover:text-primary/80 underline underline-offset-4 transition-colors ${
				className ?? ''
			}`}
			href={href}
			{...props}
		>
			{children}
		</Link>
	);
};
