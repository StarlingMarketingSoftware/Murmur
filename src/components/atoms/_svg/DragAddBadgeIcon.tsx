import { CommonIconProps } from '@/utils';
import { FC } from 'react';

// macOS-Finder-style "add" affordance: a green circle with a white plus. Used as
// the glued drop badge on the campaign finder split-view drag overlay. Fills are
// intentionally hardcoded (#4DC864 / white) — they're intrinsic to the affordance,
// not themeable — so pathClassName/currentColor are deliberately not wired up.
const DragAddBadgeIcon: FC<CommonIconProps> = (props) => {
	const { width = 18, height = 18, className } = props;
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 18 18"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<rect width="18" height="18" rx="9" fill="#4DC864" />
			<path
				d="M7.67188 14.9199V3.68651H9.90692V14.9199H7.67188ZM3.17688 10.4166V8.18152H14.4102V10.4166H3.17688Z"
				fill="white"
			/>
		</svg>
	);
};

export default DragAddBadgeIcon;
