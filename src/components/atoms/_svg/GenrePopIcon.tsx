import type { SVGProps } from 'react';

export const GenrePopIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		width="13"
		height="13"
		viewBox="0 0 13 13"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<circle cx="5.2" cy="6.1" r="3.8" fill="#76A7FF" />
		<circle cx="5.2" cy="6.1" r="2.1" fill="#FF7FAE" />
		<circle cx="5.2" cy="6.1" r="0.9" fill="white" stroke="#4C6FFF" strokeWidth="0.45" />
		<path d="M2.1 9.2C2.9 9.8 3.9 10.1 5 10.1" stroke="#FFB45F" strokeWidth="0.75" strokeLinecap="round" />
		<path d="M1.7 7.7C2.5 8.3 3.5 8.7 4.6 8.8" stroke="#FFB45F" strokeWidth="0.75" strokeLinecap="round" />
		<rect x="8.35" y="2.3" width="2.2" height="6.6" rx="1.1" fill="#5CD6FF" stroke="#4C6FFF" strokeWidth="0.55" />
		<path d="M8.35 4.2H10.55" stroke="white" strokeWidth="0.45" strokeLinecap="round" />
		<path d="M9.45 8.9V10.6" stroke="#4C6FFF" strokeWidth="0.55" strokeLinecap="round" />
		<path d="M8.6 10.6H10.3" stroke="#4C6FFF" strokeWidth="0.55" strokeLinecap="round" />
		<path d="M3.25 10.05V11.55" stroke="#FF8E57" strokeWidth="0.6" strokeLinecap="round" />
		<circle cx="2.7" cy="11.55" r="0.45" fill="#FF8E57" />
		<path d="M11.3 7.15H12.2" stroke="#72D1FF" strokeWidth="0.55" strokeLinecap="round" />
	</svg>
);
