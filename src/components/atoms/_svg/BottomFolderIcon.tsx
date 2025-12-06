import { SVGProps } from 'react';

const BottomFolderIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg width="30" height="17" viewBox="0 0 30 17" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<rect y="2" width="30" height="15" rx="1" fill="black" />
		<path
			d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
			fill="black"
		/>
	</svg>
);

export default BottomFolderIcon;
