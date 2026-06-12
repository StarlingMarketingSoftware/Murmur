import type { SVGProps } from 'react';

export const VenuePortalMailIcon = ({
	selected = false,
	...props
}: SVGProps<SVGSVGElement> & { selected?: boolean }) => {
	if (selected) {
		return (
			<svg
				width="26"
				height="22"
				viewBox="0 0 28 26"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
				{...props}
			>
				<rect y="1" width="27.125" height="24" rx="4" fill="#8FDBFF" />
				<mask
					id="venuePortalMailSelectedMask"
					style={{ maskType: 'alpha' }}
					maskUnits="userSpaceOnUse"
					x="0"
					y="0"
					width="28"
					height="26"
				>
					<rect width="27.125" height="26" rx="5" fill="#1E1E1E" />
				</mask>
				<g mask="url(#venuePortalMailSelectedMask)">
					<path
						d="M14.0107 18L-7.96484 -3H35.9863L14.0107 18ZM14.0107 13.3398L27.584 0.369141H0.4375L14.0107 13.3398Z"
						fill="#1E1E1E"
					/>
				</g>
				<rect
					x="0.71"
					y="0.71"
					width="26.58"
					height="24.58"
					rx="3.29"
					stroke="black"
					strokeWidth="1.42"
				/>
			</svg>
		);
	}

	return (
		<svg
			width="26"
			height="22"
			viewBox="0 0 31 26"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			{...props}
		>
			<mask
				id="venuePortalMailMask"
				style={{ maskType: 'alpha' }}
				maskUnits="userSpaceOnUse"
				x="0"
				y="0"
				width="31"
				height="26"
			>
				<rect width="30.0149" height="25.2688" fill="#0A0A0A" />
			</mask>
			<g opacity="0.3" mask="url(#venuePortalMailMask)">
				<path
					d="M26.9629 0.0859375C28.7176 0.510237 30.0205 2.09054 30.0205 3.97559V21.2402C30.0205 23.4505 28.2288 25.2422 26.0186 25.2422H4.00781C1.79769 25.2421 0.00585938 23.4504 0.00585938 21.2402V3.97559C0.00587296 2.09044 1.30964 0.510135 3.06445 0.0859375L15.0137 16.8408L26.9629 0.0859375ZM15.0146 11.0391L7.12305 -0.0263672H22.9062L15.0146 11.0391ZM26.9629 0.0859375C26.6602 0.0127439 26.3437 -0.0263672 26.0186 -0.0263672H22.9062L26.6689 -5.30273H3.35938L7.12305 -0.0263672H4.00781C3.68282 -0.0263472 3.36698 0.0128069 3.06445 0.0859375L-3.18164 -8.67188H33.21L26.9629 0.0859375Z"
					fill="#0A0A0A"
				/>
			</g>
		</svg>
	);
};
