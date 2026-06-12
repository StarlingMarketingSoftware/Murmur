'use client';

import { FC } from 'react';

// Theme backgrounds: white fading into the state color (the draft gradient stops are
// from Figma; the chat blue/green reuse the inbox header blue and the inbox
// "replied/waiting" green family).
const HEADER_BACKGROUND_BY_THEME = {
	chatBlue: 'linear-gradient(180deg, #FFF 0%, rgba(104, 199, 228, 0.60) 129.87%)',
	chatGreen: 'linear-gradient(180deg, #FFF 0%, rgba(126, 210, 158, 0.75) 129.87%)',
	draft: 'linear-gradient(180deg, #FFF 0%, #FFE4B6 129.87%)',
} as const;

export type MobileContactHeaderTheme = keyof typeof HEADER_BACKGROUND_BY_THEME;

// Shared fullscreen-view header: contact name/company on the left, minimize dash and
// the contact's coordinates on the right.
export const MobileContactHeader: FC<{
	name: string;
	company?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	theme: MobileContactHeaderTheme;
	onMinimize: () => void;
}> = ({ name, company, latitude, longitude, theme, onMinimize }) => (
	<div
		className="flex-shrink-0 flex items-start justify-between gap-2 px-4 pb-2 border-b-2 border-black"
		style={{
			background: HEADER_BACKGROUND_BY_THEME[theme],
			paddingTop: 'calc(10px + env(safe-area-inset-top))',
		}}
	>
		<div className="flex flex-col min-w-0">
			<span className="font-inter text-[16px] font-bold text-black leading-[1.3] truncate">
				{name}
			</span>
			{company && (
				<span className="font-inter text-[14px] text-black leading-[1.3] truncate">
					{company}
				</span>
			)}
		</div>
		<div className="flex flex-col items-end flex-shrink-0">
			<button
				type="button"
				aria-label="Minimize"
				onClick={onMinimize}
				className="min-w-[44px] h-[28px] flex items-start justify-end text-[22px] leading-none text-black"
			>
				—
			</button>
			{latitude != null && longitude != null && (
				<span className="font-inter text-[12px] font-semibold text-black leading-none">
					{latitude.toFixed(4)}&nbsp;&nbsp;{longitude.toFixed(4)}
				</span>
			)}
		</div>
	</div>
);
