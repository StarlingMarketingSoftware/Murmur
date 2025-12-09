import { FC } from 'react';

interface ResearchChevronProps {
	className?: string;
	color?: string;
}

const ResearchChevron: FC<ResearchChevronProps> = ({ className, color = '#56ACDE' }) => {
	return (
		<svg
			width="9"
			height="15"
			viewBox="0 0 9 15"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M0.292745 0.292745C0.68317 -0.0976805 1.31626 -0.0974827 1.70681 0.292745L8.07106 6.657C8.46159 7.04753 8.46159 7.68054 8.07106 8.07106L1.70681 14.4353C1.31626 14.8256 0.68317 14.8257 0.292745 14.4353C-0.0976805 14.0449 -0.0974827 13.4118 0.292745 13.0213L5.94997 7.36403L0.292745 1.70681C-0.0974827 1.31626 -0.0976805 0.68317 0.292745 0.292745Z"
				fill={color}
			/>
		</svg>
	);
};

export default ResearchChevron;
