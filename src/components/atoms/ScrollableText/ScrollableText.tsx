import { FC } from 'react';
import { ScrollableTextProps, useScrollableText } from './useScrollableText';

export const ScrollableText: FC<ScrollableTextProps> = (props) => {
	const { containerRef, textRef, isOverflowing, style, className, text } =
		useScrollableText(props);

	return (
		<div
			ref={containerRef}
			className={
				isOverflowing ? 'hover-scroll-container' : 'overflow-hidden relative w-full'
			}
			style={style}
		>
			<span
				ref={textRef}
				className={
					isOverflowing
						? `hover-scroll-text ${className || ''}`
						: `inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full ${
								className || ''
						  }`
				}
				data-text={text}
			>
				{text}
			</span>
		</div>
	);
};
