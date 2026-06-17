import { SVGProps } from 'react';

const DiamondIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<mask id="path-1-inside-1_1235_37231" fill="white">
			<path d="M7.99609 0L15.9922 7.99609L7.99609 15.9922L-1.43493e-07 7.99609L7.99609 0Z" />
		</mask>
		<path
			d="M7.99609 15.9922L7.10724 16.881L7.99609 17.7699L8.88494 16.881L7.99609 15.9922ZM15.9922 7.99609L15.1033 7.10724L7.10724 15.1033L7.99609 15.9922L8.88494 16.881L16.881 8.88494L15.9922 7.99609ZM7.99609 15.9922L8.88494 15.1033L0.888849 7.10724L-1.43493e-07 7.99609L-0.88885 8.88494L7.10724 16.881L7.99609 15.9922Z"
			fill="black"
			mask="url(#path-1-inside-1_1235_37231)"
		/>
	</svg>
);

export default DiamondIcon;
