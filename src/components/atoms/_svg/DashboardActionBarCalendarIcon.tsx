'use client';

import { SVGProps, useEffect, useState } from 'react';

const DashboardActionBarCalendarIcon = (props: SVGProps<SVGSVGElement>) => {
	// Show the current day-of-month inside the glyph. Seed from `new Date()` so the
	// icon never renders blank, then re-read after mount so it reflects the user's
	// local day (the SSR pass may run in a different timezone). `suppressHydrationWarning`
	// on the <text> silences the rare TZ-boundary diff.
	const [day, setDay] = useState(() => new Date().getDate());
	useEffect(() => {
		setDay(new Date().getDate());
	}, []);

	return (
		<svg
			width="25"
			height="19"
			viewBox="0 0 25 19"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M24.3808 4.13009C24.3808 2.97094 23.4411 2.03125 22.2819 2.03125H2.59493C1.43578 2.03125 0.496094 2.97094 0.496094 4.13009V4.90537H24.3808V4.13009Z"
				fill="currentColor"
			/>
			<path
				d="M0 15.5421C0 16.9726 1.16381 18.1364 2.59436 18.1364H22.2813C23.7119 18.1364 24.8757 16.9726 24.8757 15.5421V4.13049C24.8757 2.69994 23.7119 1.53612 22.2814 1.53612H21.6548V0.495522C21.6548 0.221889 21.4329 0 21.1592 0C20.8856 0 20.6637 0.221889 20.6637 0.495522V1.53612H4.21201V0.495522C4.21201 0.221889 3.99012 0 3.71649 0C3.44286 0 3.22097 0.221889 3.22097 0.495522V1.53612H2.59436C1.16381 1.53612 0 2.69994 0 4.13044V15.5421ZM0.991045 4.13044C0.991045 3.24648 1.7103 2.52717 2.59436 2.52717H3.22097V3.17136C3.22097 3.445 3.44286 3.66689 3.71649 3.66689C3.99012 3.66689 4.21201 3.445 4.21201 3.17136V2.52717H20.6637V3.17136C20.6637 3.445 20.8856 3.66689 21.1592 3.66689C21.4329 3.66689 21.6548 3.445 21.6548 3.17136V2.52717H22.2814C23.1654 2.52717 23.8847 3.24643 23.8847 4.13044V4.41019H0.991045V4.13044ZM23.8847 15.5421C23.8847 16.4261 23.1654 17.1454 22.2814 17.1454H2.59436C1.71035 17.1454 0.991045 16.4261 0.991045 15.5421V5.40129H23.8846L23.8847 15.5421Z"
				fill="currentColor"
			/>
			<text
				x="12.2"
				y="15.9"
				textAnchor="middle"
				fontSize="13"
				fontWeight={600}
				fill="currentColor"
				suppressHydrationWarning
			>
				{String(day).padStart(2, '0')}
			</text>
		</svg>
	);
};

export default DashboardActionBarCalendarIcon;
