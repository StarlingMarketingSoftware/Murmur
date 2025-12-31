import { FC } from 'react';

interface FontDropdownArrowProps {
	className?: string;
	color?: string;
}

const FontDropdownArrow: FC<FontDropdownArrowProps> = ({
	className,
	color = '#000000',
}) => {
	return (
		<svg
			width="8"
			height="5"
			viewBox="0 0 8 5"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M1 1L4 4L7 1"
				stroke={color}
				strokeWidth="1.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export default FontDropdownArrow;
