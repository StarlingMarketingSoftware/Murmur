import { SVGProps } from 'react';

const DashboardActionBarEnvelopeIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		width="18"
		height="11"
		viewBox="0 0 18 11"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<mask
			id="dashboard-action-bar-envelope-mask"
			style={{ maskType: 'alpha' }}
			maskUnits="userSpaceOnUse"
			x="0"
			y="0"
			width="18"
			height="11"
		>
			<rect width="17.7848" height="10.6709" fill="#D9D9D9" />
		</mask>
		<g mask="url(#dashboard-action-bar-envelope-mask)">
			<path
				d="M17.7871 10.6719H0.00195312V0.0732422L8.89453 7.11523L17.7871 0.0732422V10.6719ZM2.20117 0.000976562H0.00195312V0.0732422L-1.88672 -1.42188H19.6758L17.7871 0.0732422V0.000976562H15.5879L8.89453 5.30078L2.20117 0.000976562Z"
				fill="currentColor"
			/>
		</g>
	</svg>
);

export default DashboardActionBarEnvelopeIcon;
