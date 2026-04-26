import { WeatherMood } from './regions';

export function wmoCodeToMood(
	code: number,
	precipitationMm: number,
	windMph: number
): WeatherMood {
	let mood = baseMoodFromCode(code);

	if (mood === 'cloudy' && precipitationMm > 0.5) mood = 'rainy';
	if (mood === 'rainy' && windMph > 30) mood = 'stormy';

	return mood;
}

function baseMoodFromCode(code: number): WeatherMood {
	if (code === 0) return 'sunny';
	if (code === 1 || code === 2) return 'normal';
	if (code === 3 || code === 45 || code === 48) return 'cloudy';
	if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
	if (code === 95 || code === 96 || code === 99) return 'stormy';
	return 'normal';
}
