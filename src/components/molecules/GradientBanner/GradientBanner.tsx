import { FC } from 'react';
import { GradientBannerProps } from './useGradientBanner';
import { twMerge } from 'tailwind-merge';

export const GradientBanner: FC<GradientBannerProps> = (props) => {
	const { className, children, gloss } = props;

	return (
		<div
			className={twMerge(
				'relative w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent overflow-hidden py-7',
				className
			)}
		>
			{gloss && (
				<div className="absolute z-10 w-full h-full bg-gradient-to-r from-white/50 via-transparent to-white/50 pointer-events-none" />
			)}
			{children}
		</div>
	);
};
