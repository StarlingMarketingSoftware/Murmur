import { WeatherMood } from './regions';

// Stormy is the comprehensive wet-weather bucket: anything from drizzle to a
// full thunderstorm collapses here. The visual is tuned to read as "active
// weather" rather than specifically "thunderstorm" so that the same config
// works across that whole intensity range.
export function wmoCodeToMood(
	code: number,
	precipitationMm: number
): WeatherMood {
	const mood = baseMoodFromCode(code);

	// Overcast/fog with measurable precipitation isn't really "cloudy" — promote
	// it into the stormy bucket so the visuals reflect that water's falling.
	if (mood === 'cloudy' && precipitationMm > 0.5) return 'stormy';

	return mood;
}

function baseMoodFromCode(code: number): WeatherMood {
	if (code === 0) return 'sunny';
	if (code === 1 || code === 2) return 'normal';
	if (code === 3 || code === 45 || code === 48) return 'cloudy';
	// Drizzle (51–57), rain (61–65), freezing rain (66–67), rain showers (80–82),
	// and thunderstorms (95/96/99) all share the stormy bucket.
	if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'stormy';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
	if (code === 95 || code === 96 || code === 99) return 'stormy';
	return 'normal';
}
