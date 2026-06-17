'use client';

import { useEffect, useState } from 'react';

import { wmoCodeToLabel } from '@/lib/weather/wmoToLabel';

type DashboardHeroDateWeatherBarProps = {
	temperatureF: number | null;
	weatherCode: number | null;
};

// Exact Figma spec for all three text segments.
const TEXT_STYLE: React.CSSProperties = {
	color: '#000',
	fontFamily: 'var(--font-inter), Inter, sans-serif',
	fontSize: '14px',
	fontWeight: 500,
	lineHeight: '17.186px',
};

// "Tuesday, October 8 2026" — assembled from parts so there's no comma before
// the year (toLocaleDateString with `year` would insert one).
function formatHeroDate(date: Date): string {
	const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
	const month = date.toLocaleDateString('en-US', { month: 'long' });
	return `${weekday}, ${month} ${date.getDate()} ${date.getFullYear()}`;
}

// "1:45pm" — lowercase, no space before the meridiem.
function formatHeroTime(date: Date): string {
	return date
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
		.toLowerCase()
		.replace(/\s/g, '');
}

// Top-of-hero strip on the initial dashboard: regional weather, date, live time.
// Isolated into its own component so the 1s clock tick re-renders only this bar,
// not the whole DashboardPageClient.
export default function DashboardHeroDateWeatherBar({
	temperatureF,
	weatherCode,
}: DashboardHeroDateWeatherBarProps) {
	const [now, setNow] = useState<Date>(() => new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	const conditionLabel = weatherCode != null ? wmoCodeToLabel(weatherCode) : '';
	const showWeather = temperatureF != null && conditionLabel !== '';
	const weatherText = showWeather
		? `${Math.round(temperatureF as number)}°, ${conditionLabel}`
		: null;

	return (
		<div
			className="pointer-events-none fixed left-0 right-0 top-[16px] z-[50] flex justify-center"
			aria-hidden
		>
			<div className="flex w-full max-w-[520px] items-center justify-between px-6">
				<span style={TEXT_STYLE}>{weatherText}</span>
				<span style={TEXT_STYLE}>{formatHeroDate(now)}</span>
				<span style={TEXT_STYLE}>{formatHeroTime(now)}</span>
			</div>
		</div>
	);
}
