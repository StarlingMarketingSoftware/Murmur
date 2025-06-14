import { ReactNode } from 'react';

export interface GradientBannerProps {
	className?: string;
	children?: ReactNode;
	gloss?: boolean;
}

export const useGradientBanner = (props: GradientBannerProps) => {
	const { className, children, gloss } = props;

	return {
		gloss,
		className,
		children,
	};
};
