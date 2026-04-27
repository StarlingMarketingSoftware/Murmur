#!/usr/bin/env node
/**
 * Export contact lat/lon from an .xlsx export into a simple CSV (lng,lat).
 *
 * Usage:
 *   node scripts/exportContactLightCoordsFromXlsx.mjs \
 *     --input public/contactLists/Contact.xlsx \
 *     --out /tmp/murmur_contact_lights.csv \
 *     --bbox -125.5,24.0,-66.0,50.0
 */

import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const parseNumber = (value, name) => {
	if (value == null || value === '') throw new Error(`Missing ${name}`);
	const n = Number(value);
	if (!Number.isFinite(n)) throw new Error(`Invalid ${name}: ${value}`);
	return n;
};

const parseBBox = (raw) => {
	if (!raw) return null;
	const parts = String(raw)
		.split(',')
		.map((p) => p.trim());
	if (parts.length !== 4) throw new Error(`Invalid --bbox (expected 4 numbers): ${raw}`);
	return {
		lonMin: parseNumber(parts[0], 'bbox lonMin'),
		latMin: parseNumber(parts[1], 'bbox latMin'),
		lonMax: parseNumber(parts[2], 'bbox lonMax'),
		latMax: parseNumber(parts[3], 'bbox latMax'),
	};
};

const parseArgs = () => {
	const argv = process.argv.slice(2);
	const get = (flag) => {
		const i = argv.indexOf(flag);
		if (i === -1) return null;
		return argv[i + 1] ?? null;
	};

	const input = get('--input') || path.join(process.cwd(), 'public', 'contactLists', 'Contact.xlsx');
	const out = get('--out') || '/tmp/murmur_contact_lights.csv';
	const limitRaw = get('--limit');
	const bboxRaw = get('--bbox');

	return {
		input,
		out,
		limit: limitRaw ? parseNumber(limitRaw, 'limit') : null,
		bbox: parseBBox(bboxRaw),
	};
};

const main = async () => {
	const args = parseArgs();
	fs.mkdirSync(path.dirname(args.out), { recursive: true });

	console.log('Reading:', args.input);
	const wb = xlsx.readFile(args.input);
	const sheetName = wb.SheetNames[0];
	if (!sheetName) throw new Error('No sheets found in workbook');
	const ws = wb.Sheets[sheetName];
	if (!ws) throw new Error('Sheet not found');

	// Read full sheet; ~85k rows is fine for local dev.
	const rows = xlsx.utils.sheet_to_json(ws, { defval: null });
	console.log(`Loaded ${rows.length} rows from sheet "${sheetName}"`);

	const stream = fs.createWriteStream(args.out, { encoding: 'utf8' });
	stream.write('lng,lat\n');

	let written = 0;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const latRaw = row.latitude ?? row.Latitude ?? row.lat ?? row.Lat;
		const lngRaw = row.longitude ?? row.Longitude ?? row.lng ?? row.Lng;
		const lat = typeof latRaw === 'number' ? latRaw : latRaw ? Number(latRaw) : NaN;
		const lng = typeof lngRaw === 'number' ? lngRaw : lngRaw ? Number(lngRaw) : NaN;
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

		if (args.bbox) {
			if (
				lat < args.bbox.latMin ||
				lat > args.bbox.latMax ||
				lng < args.bbox.lonMin ||
				lng > args.bbox.lonMax ||
				!Number.isFinite(lat) ||
				!Number.isFinite(lng)
			)
				continue;
		}

		stream.write(`${lng},${lat}\n`);
		written++;
		if (args.limit != null && written >= args.limit) break;
	}

	await new Promise((resolve, reject) => {
		stream.end(() => resolve());
		stream.on('error', (err) => reject(err));
	});

	console.log(`Wrote ${written} points to ${args.out}`);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

