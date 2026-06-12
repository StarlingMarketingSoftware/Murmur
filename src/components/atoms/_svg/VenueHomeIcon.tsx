import type { SVGProps } from 'react';

export const venueHomeIconSvg = `
	<svg width="466" height="406" viewBox="0 0 466 406" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g id="house-icon">
			<path d="M269 98L167 121L119 193L127 200L130 199V252L229 291L308 252V185L316 181L269 98Z" fill="#6F7375"/>
			<path d="M172 135L143 179V244L163 253V214L187 221L188 262L221 275V220L216 216L172 135Z" fill="#DCF0FB"/>
			<path d="M296 190L234 214V275L296 244V190Z" fill="#DCF0FB"/>
			<path d="M163 214L188 222V263L163 253V214Z" fill="#6F7375"/>
		</g>
	</svg>
`;

export const VenueHomeIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		width="466"
		height="406"
		viewBox="0 0 466 406"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<g id="house-icon">
			<path
				d="M269 98L167 121L119 193L127 200L130 199V252L229 291L308 252V185L316 181L269 98Z"
				fill="#6F7375"
			/>
			<path
				d="M172 135L143 179V244L163 253V214L187 221L188 262L221 275V220L216 216L172 135Z"
				fill="#DCF0FB"
			/>
			<path d="M296 190L234 214V275L296 244V190Z" fill="#DCF0FB" />
			<path d="M163 214L188 222V263L163 253V214Z" fill="#6F7375" />
		</g>
	</svg>
);
