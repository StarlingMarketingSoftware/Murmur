import { FC } from 'react';
import { ScrollableTextProps, useScrollableText } from './useScrollableText';
import { cn } from '@/utils';

export const ScrollableText: FC<ScrollableTextProps> = (props) => {
	const { containerRef, textRef, isOverflowing, className, text } =
		useScrollableText(props);

	return (
		<div
			ref={containerRef}
			className={cn(
				'hover-scroll-container overflow-hidden relative w-full hover:scrollText'
			)}
		>
			<span
				ref={textRef}
				className={cn(
					isOverflowing && 'hover-scroll-text',
					'inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full',
					className
				)}
				data-text={text}
			>
				{text}
			</span>
		</div>
	);
};
