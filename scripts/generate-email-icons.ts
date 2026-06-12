/**
 * Rasterizes the profile-field SVG icons used in the app (genre icons, performing
 * name, area marker, bio, play) into PNGs for the branded outbound email — email
 * clients strip inline <svg>, so the template references hosted PNGs instead.
 *
 * Output: public/email/icons/*.png at 2x of their display size in the email.
 * Run: npx tsx scripts/generate-email-icons.ts
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// tsx transforms the icon components' JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

import { GenreClassicalIcon } from '../src/components/atoms/_svg/GenreClassicalIcon';
import { GenreCountryIcon } from '../src/components/atoms/_svg/GenreCountryIcon';
import { GenreElectronicIcon } from '../src/components/atoms/_svg/GenreElectronicIcon';
import { GenreFolkIcon } from '../src/components/atoms/_svg/GenreFolkIcon';
import { GenreGospelIcon } from '../src/components/atoms/_svg/GenreGospelIcon';
import { GenreHipHopIcon } from '../src/components/atoms/_svg/GenreHipHopIcon';
import { GenreJazzIcon } from '../src/components/atoms/_svg/GenreJazzIcon';
import { GenrePopIcon } from '../src/components/atoms/_svg/GenrePopIcon';
import { GenreRandBIcon } from '../src/components/atoms/_svg/GenreRandBIcon';
import { GenreRockIcon } from '../src/components/atoms/_svg/GenreRockIcon';
import { profileAreaMarkerSvg } from '../src/components/atoms/_svg/ProfileAreaMarkerIcon';
import {
	profileBioIconSvg,
	profilePerformingNameIconSvg,
} from '../src/components/molecules/HybridPromptInput/profileFieldIcons';

const OUT_DIR = path.join(__dirname, '..', 'public', 'email', 'icons');

// Matches the mockups' plain solid play triangle (lucide Play shape, filled).
const playIconSvg = `
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
		<polygon points="6 3 20 12 6 21 6 3" fill="black"/>
	</svg>
`;

const genreComponents = {
	'genre-pop': GenrePopIcon,
	'genre-rock': GenreRockIcon,
	'genre-country': GenreCountryIcon,
	'genre-jazz': GenreJazzIcon,
	'genre-electronic': GenreElectronicIcon,
	'genre-classical': GenreClassicalIcon,
	'genre-hip-hop': GenreHipHopIcon,
	'genre-gospel': GenreGospelIcon,
	'genre-r-and-b': GenreRandBIcon,
	'genre-folk': GenreFolkIcon,
};

// [name, svg, output width in px (2x of email display size)]
const jobs: Array<[string, string, number]> = [
	...Object.entries(genreComponents).map(
		([name, Icon]): [string, string, number] => [
			name,
			renderToStaticMarkup(createElement(Icon)),
			26, // displayed 13x13
		]
	),
	['performing-name', profilePerformingNameIconSvg, 28], // displayed 14x14
	['area-marker', profileAreaMarkerSvg, 24], // displayed 12x15 (13:16)
	['bio', profileBioIconSvg, 16], // displayed 8x17
	['play', playIconSvg, 24], // displayed 12x12
];

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });
	for (const [name, svg, width] of jobs) {
		// sharp needs concrete dimensions: drop percentage sizing, keep the viewBox.
		const cleaned = svg.replace(/(width|height)="100%"\s*/g, '');
		const file = path.join(OUT_DIR, `${name}.png`);
		await sharp(Buffer.from(cleaned), { density: 300 }).resize({ width }).png().toFile(file);
		console.log(`Wrote ${file}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
