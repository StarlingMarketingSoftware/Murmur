import { CommonIconProps } from '@/utils';
import { FC } from 'react';

const SelectionCountClearIcon: FC<CommonIconProps> = ({
	width = 18,
	height = 18,
	className,
}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={width}
		height={height}
		viewBox="0 0 18 18"
		fill="none"
		aria-hidden="true"
		className={className}
	>
		<g opacity="0.2">
			<line
				x1="4.58211"
				y1="4.4254"
				x2="13.5818"
				y2="13.4251"
				stroke="black"
				strokeWidth="2"
			/>
			<line
				x1="4.42571"
				y1="13.4293"
				x2="13.4254"
				y2="4.42961"
				stroke="black"
				strokeWidth="2"
			/>
		</g>
	</svg>
);

export default SelectionCountClearIcon;
