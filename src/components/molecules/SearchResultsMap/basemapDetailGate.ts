export type BasemapDetailLayerKind = 'detail-fill' | 'detail-line';

const isRoadLikeLineLayer = (idLower: string, sourceLayer?: string) => {
	const src = (sourceLayer ?? '').toLowerCase();
	return (
		src === 'road' ||
		idLower.includes('road') ||
		idLower.includes('motorway') ||
		idLower.includes('highway') ||
		idLower.includes('bridge') ||
		idLower.includes('tunnel')
	);
};

const isWaterwayLineLayer = (idLower: string, sourceLayer?: string) => {
	const src = (sourceLayer ?? '').toLowerCase();
	return src === 'waterway' || idLower.includes('waterway');
};

const isMajorRoadLikeLineLayer = (idLower: string, sourceLayer?: string) => {
	const src = (sourceLayer ?? '').toLowerCase();
	if (src !== 'road' && !isRoadLikeLineLayer(idLower, sourceLayer)) return false;

	return (
		idLower === 'road' ||
		idLower === 'road-simple' ||
		idLower === 'bridge-simple' ||
		idLower === 'tunnel-simple' ||
		idLower.includes('motorway') ||
		idLower.includes('trunk') ||
		idLower.includes('primary') ||
		idLower.includes('highway')
	);
};

const isLandcoverLikeFillLayer = (idLower: string, sourceLayer?: string) => {
	const src = (sourceLayer ?? '').toLowerCase();
	return (
		src === 'landcover' ||
		idLower.includes('landcover') ||
		idLower.includes('national-park') ||
		idLower.includes('pitch') ||
		idLower === 'park' ||
		idLower.startsWith('park')
	);
};

const isLanduseLikeFillLayer = (idLower: string, sourceLayer?: string) => {
	const src = (sourceLayer ?? '').toLowerCase();
	return src === 'landuse' || idLower.includes('landuse');
};

export type BasemapLanduseFillPalette = {
	urban: string;
	land: string;
	landcover: string;
};

// Every *developed / built* landuse class reads as the cream "city" tone. This
// must be the full built set, not just `residential`: in Mapbox Streets the
// native `landuse` fill drives `residential` opacity to 0 at zoom ≥ 10 (Mapbox
// expects the base land color to carry residential), while the OTHER built
// classes (industrial, commercial, school, hospital, parking, …) stay fully
// opaque at close zoom. If those are not cream, they fall through to the green
// land fallback and punch green holes into the city — the "patchy" look. Keeping
// the whole built set cream makes the urban footprint one consistent tone; only
// true vegetation (handled separately below) stays green.
export const MAPBOX_URBAN_LANDUSE_CLASSES = [
	'residential',
	'commercial_area',
	'industrial',
	'facility',
	'school',
	'hospital',
	'parking',
	'airport',
] as const;
export const buildBasemapLanduseFillColorExpression = ({
	urban,
	land,
	landcover,
}: BasemapLanduseFillPalette) =>
	[
		'match',
		['get', 'class'],
		MAPBOX_URBAN_LANDUSE_CLASSES,
		urban,
		['park', 'wood', 'grass', 'scrub', 'agriculture', 'cemetery', 'pitch'],
		landcover,
		land,
	] as const;

export const buildBasemapUrbanLanduseFilterExpression = () =>
	['match', ['get', 'class'], MAPBOX_URBAN_LANDUSE_CLASSES, true, false] as const;

export const classifyBasemapDetailLayer = (
	type: string | undefined,
	idLower: string,
	sourceLayer?: string
): BasemapDetailLayerKind | null => {
	if (!type || idLower.startsWith('murmur-')) return null;

	if (type === 'fill') {
		// Leave the base land/water layers alone here: low-zoom land is handled by
		// the cream world-land fill, and water gets its own major-lakes backstop.
		if (idLower === 'land' || idLower === 'water' || idLower.startsWith('water')) {
			return null;
		}
		if (
			isLandcoverLikeFillLayer(idLower, sourceLayer) ||
			isLanduseLikeFillLayer(idLower, sourceLayer)
		) {
			return 'detail-fill';
		}
	}

	if (type === 'line') {
		if (
			isRoadLikeLineLayer(idLower, sourceLayer) ||
			isWaterwayLineLayer(idLower, sourceLayer)
		) {
			return 'detail-line';
		}
	}

	return null;
};

export const isBasemapWaterFillLayer = (
	type: string | undefined,
	idLower: string,
	sourceLayer?: string
) => {
	const src = (sourceLayer ?? '').toLowerCase();
	return (
		type === 'fill' &&
		(src === 'water' || idLower === 'water' || idLower.startsWith('water'))
	);
};

export const isBasemapLandcoverLikeFillLayer = (
	idLower: string,
	sourceLayer?: string
) => isLandcoverLikeFillLayer(idLower, sourceLayer);

export const isBasemapLanduseLikeFillLayer = (
	idLower: string,
	sourceLayer?: string
) => isLanduseLikeFillLayer(idLower, sourceLayer);

export const isBasemapRoadLikeLineLayer = (
	idLower: string,
	sourceLayer?: string
) => isRoadLikeLineLayer(idLower, sourceLayer);

export const isBasemapWaterwayLineLayer = (
	idLower: string,
	sourceLayer?: string
) => isWaterwayLineLayer(idLower, sourceLayer);

export const isBasemapMajorRoadLikeLineLayer = (
	idLower: string,
	sourceLayer?: string
) => isMajorRoadLikeLineLayer(idLower, sourceLayer);

// Terrain relief raster (Mapbox `hillshade`, backed by the heavy mapbox-terrain
// DEM source). It is its own Mapbox layer type — neither fill nor line — so it
// slips past the fill/line gating above and would keep streaming DEM texture at
// the globe/state overview. Gated as the final rung of the low-zoom detail ladder.
export const isBasemapHillshadeLayer = (type: string | undefined) =>
	type === 'hillshade';

export const containsZoomExpression = (expr: unknown): boolean => {
	if (!Array.isArray(expr)) return false;
	if (expr[0] === 'zoom') return true;
	return expr.some((part) => containsZoomExpression(part));
};

export const buildBasemapDetailOpacityRamp = (
	nativeValue: unknown,
	startZoom: number,
	endZoom: number
) => {
	const safeNativeValue = nativeValue == null ? 1 : nativeValue;
	if (containsZoomExpression(safeNativeValue)) return null;

	return [
		'interpolate',
		['linear'],
		['zoom'],
		startZoom,
		0,
		endZoom,
		safeNativeValue,
	];
};
