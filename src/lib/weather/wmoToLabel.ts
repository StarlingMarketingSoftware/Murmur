// Human-readable label for a WMO weather code. Mirrors the buckets in
// wmoToMood.ts, but keeps the original descriptive text (e.g. "Partly Cloudy")
// rather than collapsing to the 5 visual moods — used for the dashboard's
// top weather strip. Unknown codes return '' so the caller can hide the
// weather segment rather than show a bogus label.
export function wmoCodeToLabel(code: number): string {
	if (code === 0) return 'Clear';
	if (code === 1) return 'Mainly Clear';
	if (code === 2) return 'Partly Cloudy';
	if (code === 3) return 'Overcast';
	if (code === 45 || code === 48) return 'Fog';
	if (code === 51 || code === 53 || code === 55) return 'Drizzle';
	if (code === 56 || code === 57) return 'Freezing Drizzle';
	if (code === 61 || code === 63 || code === 65) return 'Rain';
	if (code === 66 || code === 67) return 'Freezing Rain';
	if (code === 71 || code === 73 || code === 75) return 'Snow';
	if (code === 77) return 'Snow Grains';
	if (code === 80 || code === 81 || code === 82) return 'Rain Showers';
	if (code === 85 || code === 86) return 'Snow Showers';
	if (code === 95) return 'Thunderstorm';
	if (code === 96 || code === 99) return 'Thunderstorm';
	return '';
}
