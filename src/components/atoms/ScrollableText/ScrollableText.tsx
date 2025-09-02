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
				'hover-scroll-container overflow-hidden relative w-full flex items-center h-full'
			)}
		>
			<div
				ref={textRef}
				className={cn(
					'inline-block whitespace-nowrap',
					isOverflowing
						? 'hover-scroll-text'
						: 'overflow-hidden text-ellipsis max-w-full',
					className
				)}
				data-text={text}
			>
				{text}
				{isOverflowing && <span className="inline-block pl-[50px]">{text}</span>}
			</div>
		</div>
	);
};
