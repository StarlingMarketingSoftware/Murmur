import { SVGProps, useId } from 'react';

const MapBottomSearchArrowIcon = (props: SVGProps<SVGSVGElement>) => {
	const maskId = useId().replace(/:/g, '');

	return (
		<svg
			width="14"
			height="17"
			viewBox="0 0 14 17"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<mask id={maskId} fill="white">
				<path d="M13.582 6.79102L6.79183 13.5812L0.0016385 6.79102L6.79183 0.000819248L13.582 6.79102Z" />
			</mask>
			<path
				d="M6.79183 0.000819248L8.20605 -1.41339L6.79183 -2.82761L5.37762 -1.41339L6.79183 0.000819248ZM0.0016385 6.79102L1.41585 8.20523L8.20605 1.41503L6.79183 0.000819248L5.37762 -1.41339L-1.41258 5.3768L0.0016385 6.79102ZM6.79183 0.000819248L5.37762 1.41503L12.1678 8.20523L13.582 6.79102L14.9962 5.3768L8.20605 -1.41339L6.79183 0.000819248Z"
				fill="currentColor"
				mask={`url(#${maskId})`}
			/>
			<line
				x1="6.69141"
				y1="2.00195"
				x2="6.69141"
				y2="17.002"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export default MapBottomSearchArrowIcon;
