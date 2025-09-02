import { FC } from 'react';
import { ScrollableText } from './ScrollableText';

interface ScrollableTextWrapperProps {
	text: string;
	className?: string;
}

export const ScrollableTextWrapper: FC<ScrollableTextWrapperProps> = ({
	text,
	className,
}) => {
	return (
		<div className="relative w-full h-full overflow-hidden">
			<ScrollableText text={text} className={className} />
		</div>
	);
};
