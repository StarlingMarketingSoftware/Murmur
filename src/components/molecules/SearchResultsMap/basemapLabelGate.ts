import {
	BASEMAP_SETTLEMENT_ICON_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_ICON_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_ICON_OPACITY,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_MIN_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_OPACITY,
	BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
	BASEMAP_SETTLEMENT_MAJOR_TEXT_PADDING_STOPS,
	BASEMAP_SETTLEMENT_TOP_CITY_MATCHES,
	BASEMAP_SETTLEMENT_TOP_CITY_ONLY_MAX_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_MIN_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_OPACITY,
	BASEMAP_SETTLEMENT_MINOR_SYMBOLRANK_STOPS,
	BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_MIN_ZOOM,
	BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_OPACITY,
	BASEMAP_STREET_LABEL_FADE_END_ZOOM,
	BASEMAP_STREET_LABEL_FADE_START_ZOOM,
} from './constants';

export type BasemapLabelLayerKind =
	| 'settlement-major'
	| 'settlement-minor'
	| 'settlement-subdivision'
	| 'street';

export type BasemapLabelVisualSpec = {
	minZoom: number;
	fadeStartZoom: number;
	fadeEndZoom: number;
	targetOpacity: number;
};

export const isBasemapSettlementLabelKind = (
	kind: BasemapLabelLayerKind | null
) =>
	kind === 'settlement-major' ||
	kind === 'settlement-minor' ||
	kind === 'settlement-subdivision';

// Which base-style symbol layers we re-enable. Everything else (POI, transit,
// airport, natural, water, country, continent, Mapbox's own state label) stays
// hidden by basemap.ts. The three settlement tiers match Streets' major/minor/
// subdivision label families, with conservative fallbacks for style variants.
export const classifyBasemapLabelLayer = (
	idLowerRaw: string,
	sourceLayer?: string
): BasemapLabelLayerKind | null => {
	const idLower = idLowerRaw.toLowerCase();
	const src = (sourceLayer ?? '').toLowerCase();

	// Street/road name labels (v12: `road-label-simple`, source-layer `road`).
	// Exclude route shields / road numbers.
	if (
		(src === 'road' || idLower.includes('road-label')) &&
		idLower.includes('label') &&
		!idLower.includes('shield') &&
		!idLower.includes('number')
	) {
		return 'street';
	}

	const isPlaceLabel =
		src === 'place_label' ||
		idLower.includes('place-label') ||
		idLower.includes('settlement');
	if (!isPlaceLabel) return null;
	if (
		idLower.includes('country') ||
		idLower.includes('continent') ||
		idLower.includes('state') ||
		idLower.includes('marine')
	) {
		return null;
	}

	if (idLower.includes('subdivision') || idLower.includes('neighborhood')) {
		return 'settlement-subdivision';
	}
	if (idLower.includes('major')) return 'settlement-major';

	// Unknown settlement/place-label layers should become part of the regional
	// city/town tier: earlier than the old z6.5→8 fade, but not as loud as top
	// metros at the US-wide view.
	return 'settlement-minor';
};

export const getBasemapLabelVisualSpec = (
	kind: BasemapLabelLayerKind,
	floorDelta = 0
): BasemapLabelVisualSpec => {
	switch (kind) {
		case 'settlement-major':
			// Major-city fade is pinned to the state-initials near-floor band, so it
			// shifts by the same viewport-proportional floor delta the state labels
			// use (keeps big cities and state names arriving together on every
			// monitor size).
			return {
				minZoom: BASEMAP_SETTLEMENT_MAJOR_LABEL_MIN_ZOOM + floorDelta,
				fadeStartZoom: BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_START_ZOOM + floorDelta,
				fadeEndZoom: BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_END_ZOOM + floorDelta,
				targetOpacity: BASEMAP_SETTLEMENT_MAJOR_LABEL_OPACITY,
			};
		case 'settlement-minor':
			return {
				minZoom: BASEMAP_SETTLEMENT_MINOR_LABEL_MIN_ZOOM,
				fadeStartZoom: BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_START_ZOOM,
				fadeEndZoom: BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_END_ZOOM,
				targetOpacity: BASEMAP_SETTLEMENT_MINOR_LABEL_OPACITY,
			};
		case 'settlement-subdivision':
			return {
				minZoom: BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_MIN_ZOOM,
				fadeStartZoom: BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_FADE_START_ZOOM,
				fadeEndZoom: BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_FADE_END_ZOOM,
				targetOpacity: BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_OPACITY,
			};
		case 'street':
			return {
				minZoom: BASEMAP_STREET_LABEL_FADE_START_ZOOM,
				fadeStartZoom: BASEMAP_STREET_LABEL_FADE_START_ZOOM,
				fadeEndZoom: BASEMAP_STREET_LABEL_FADE_END_ZOOM,
				targetOpacity: 1,
			};
	}
};

export const buildBasemapLabelOpacityRamp = (
	fadeStartZoom: number,
	fadeEndZoom: number,
	targetOpacity: number
) =>
	[
		'interpolate',
		['linear'],
		['zoom'],
		fadeStartZoom,
		0,
		fadeEndZoom,
		targetOpacity,
	] as const;

export const buildBasemapSettlementIconOpacityRamp = () =>
	[
		'interpolate',
		['linear'],
		['zoom'],
		BASEMAP_SETTLEMENT_ICON_FADE_START_ZOOM,
		0,
		BASEMAP_SETTLEMENT_ICON_FADE_END_ZOOM,
		BASEMAP_SETTLEMENT_ICON_OPACITY,
	] as const;

// Per-zoom collision padding (px) for the major tier. Wide spacing at the
// far-out view caps the on-screen count to the ~top 15 most-prominent,
// well-spread cities; it eases to the native default as the user zooms in so
// the rest of the major pool fills back in.
export const buildBasemapMajorSettlementTextPaddingRamp = () => {
	const ramp: any[] = ['interpolate', ['linear'], ['zoom']];
	for (const [zoom, padding] of BASEMAP_SETTLEMENT_MAJOR_TEXT_PADDING_STOPS) {
		ramp.push(zoom, padding);
	}
	return ramp;
};

// symbolrank is the global settlement prominence ranking (lower = bigger). We
// read it via `coalesce(symbolrank, filterrank, 99)` so the gate degrades
// gracefully on style variants that omit symbolrank.
const settlementRankExpr = () =>
	['coalesce', ['get', 'symbolrank'], ['get', 'filterrank'], 99] as const;

const settlementNameExpr = () =>
	['coalesce', ['get', 'name_en'], ['get', 'name']] as const;

export const buildBasemapTopCityFilter = () =>
	[
		'any',
		...BASEMAP_SETTLEMENT_TOP_CITY_MATCHES.map(({ name, iso3166_2 }) => [
			'all',
			['==', settlementNameExpr(), name],
			['==', ['get', 'iso_3166_2'], iso3166_2],
		]),
	] as const;

export const buildNotBasemapTopCityFilter = () =>
	['case', buildBasemapTopCityFilter(), false, true] as const;

// Major tier: from far out through the state/regional band, allow exactly the
// researched top-15 U.S. cities. After that, keep those top-15 cities admitted
// and broaden to the ranked Mapbox major pool so additional large cities can
// fade in naturally as users zoom.
export const buildBasemapMajorSettlementRankFilter = () =>
	[
		'step',
		['zoom'],
		buildBasemapTopCityFilter(),
		BASEMAP_SETTLEMENT_TOP_CITY_ONLY_MAX_ZOOM,
		[
			'any',
			buildBasemapTopCityFilter(),
			['<=', settlementRankExpr(), BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING],
		],
	] as const;

// Minor tier: everything ranked below the major ceiling, revealed on a
// zoom-stepped symbolrank window so smaller cities/towns fill in gradually.
// Below the first stop the ceiling is the major ceiling itself (so nothing in
// the minor band paints until its first stop), keeping the tiers disjoint.
export const buildBasemapMinorSettlementRankFilter = () => {
	const ceilingByZoom: any[] = ['step', ['zoom'], BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING];
	for (const [zoom, ceiling] of BASEMAP_SETTLEMENT_MINOR_SYMBOLRANK_STOPS) {
		ceilingByZoom.push(zoom, ceiling);
	}

	return [
		'all',
		buildNotBasemapTopCityFilter(),
		['>', settlementRankExpr(), BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING],
		['<=', settlementRankExpr(), ceilingByZoom],
	] as const;
};

export const buildBasemapSettlementRankFilter = (
	kind: BasemapLabelLayerKind
) => {
	if (kind === 'settlement-major') return buildBasemapMajorSettlementRankFilter();
	if (kind === 'settlement-minor') return buildBasemapMinorSettlementRankFilter();
	return null;
};

// Does a Mapbox expression reference `["get","symbolrank"]` anywhere? Used to
// locate (and drop) the basemap's native zoom→symbolrank clause so we can
// substitute our broader window without disturbing the class/filterrank/
// worldview predicates that sit alongside it.
export const expressionReferencesSymbolrank = (expr: unknown): boolean => {
	if (!Array.isArray(expr)) return false;
	if (expr[0] === 'get' && expr[1] === 'symbolrank') return true;
	return expr.some((part) => expressionReferencesSymbolrank(part));
};

// Remove the native symbolrank-based clause(s) from a settlement label filter,
// preserving every other predicate (class match, filterrank<=3, worldview).
// Returns a filter that is permissive on rank so our own window decides it.
export const stripNativeSymbolrankClause = (baseFilter: unknown): unknown => {
	if (Array.isArray(baseFilter) && baseFilter[0] === 'all') {
		const kept = baseFilter.filter(
			(clause, index) => index === 0 || !expressionReferencesSymbolrank(clause)
		);
		return kept.length > 1 ? kept : ['all'];
	}
	// A non-`all` filter that is itself rank-based carries no other predicates we
	// must keep; fall back to permissive so our window takes over cleanly.
	if (expressionReferencesSymbolrank(baseFilter)) return ['all'];
	return baseFilter ?? ['all'];
};

export const combineBasemapLabelFilters = (
	baseFilter: unknown | null,
	extraFilter: unknown | null
) => {
	if (!baseFilter) return extraFilter;
	if (!extraFilter) return baseFilter;
	return ['all', baseFilter, extraFilter] as const;
};

// Final settlement filter: native predicates (minus the native rank clause) AND
// our broader, zoom-aware symbolrank window for this tier.
export const composeBasemapSettlementFilter = (
	baseFilter: unknown | null,
	kind: BasemapLabelLayerKind
) => {
	const rankGate = buildBasemapSettlementRankFilter(kind);
	if (!rankGate) return baseFilter;
	const strippedBase = stripNativeSymbolrankClause(baseFilter);
	return combineBasemapLabelFilters(strippedBase, rankGate);
};
