import { CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM } from './constants';

export const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_X_PX = 112;

export const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_TOP_PX = 48;

export const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_BOTTOM_PX = 24;

export const GENERAL_CONTACT_CONSTELLATION_LINE_COLOR = '#1F2429';

export const CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY = 1;

export const CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY = 0.18;

export const CAMPAIGN_STATUS_MARKER_RADIUS_SCALE = 1;

export const CAMPAIGN_STATUS_MARKER_STROKE_WIDTH = 2.32338;

// Selected campaign status marker (Write/Drafts/Inbox tabs): a bigger light-blue
// circle (#A8BFF5 fill, #5A81DA stroke) per the campaign marker spec. Applied via
// the `selected` feature-state, gated on the per-feature `statusMode` flag so the
// dashboard pick-flow / category-mode dots stay untouched.
export const SELECTED_STATUS_DOT_RADIUS_SCALE = 1.45;

export const SELECTED_STATUS_DOT_FILL_COLOR = '#A8BFF5';

export const SELECTED_STATUS_DOT_STROKE_COLOR = '#5A81DA';

export const SELECTED_STATUS_DOT_STROKE_WIDTH = 2.4;


export type DashboardDraftingMapContactStatus = 'queued' | 'drafting' | 'drafted';


export const DASHBOARD_DRAFTING_MARKER_STYLES: Record<
	DashboardDraftingMapContactStatus,
	{
		centerFillColor: string;
		strokeColor: string;
		tooltipFillColor: string;
	}
> = {
	queued: {
		centerFillColor: '#FFFFFF',
		strokeColor: '#A33535',
		tooltipFillColor: '#FF8D8D',
	},
	drafting: {
		centerFillColor: '#B0CEFB',
		strokeColor: '#5A8DD8',
		tooltipFillColor: '#B0CEFB',
	},
	drafted: {
		centerFillColor: '#F8C262',
		strokeColor: '#B78429',
		tooltipFillColor: '#FFE4B6',
	},
};

export const DASHBOARD_DRAFTING_DRAFT_LINE_COLOR = '#F8EBD0';


export type CampaignContactMapStatus = 'contacts' | 'drafts' | 'new-message' | 'sent';


export type CampaignStatusMarkerStyle = {
	fillColor: string;
	/** Multiplies the dot fill opacity; 0 renders a hollow ring (e.g. "sent"). */
	fillOpacity: number;
	strokeColor: string;
	strokeWidth: number;
	strokeOpacity: number;
	radiusScale: number;
	lineColor: string;
};


export const CAMPAIGN_STATUS_MARKER_STYLES: Record<
	CampaignContactMapStatus,
	CampaignStatusMarkerStyle
> = {
	// Solid white disc (white fill + white stroke) — matches StatusContactsIcon.
	contacts: {
		fillColor: '#FFFFFF',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#FFFFFF',
	},
	// Light-blue fill, white ring — matches StatusDraftsIcon.
	drafts: {
		fillColor: '#B7E5FF',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#B6B6B6',
	},
	// Deep-blue fill, white ring — matches StatusNewMessageIcon.
	'new-message': {
		fillColor: '#277CAE',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#000000',
	},
	// Hollow deep-blue ring at 30% opacity (no fill) — matches StatusSentIcon.
	// fillColor stays a real hex so hover/washout helpers keep working; fillOpacity 0 hides it.
	sent: {
		fillColor: '#277CAE',
		fillOpacity: 0,
		strokeColor: '#277CAE',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 0.3,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#91C9CF',
	},
};


export const FEATURE_FILL_OPACITY_FACTOR: any = ['coalesce', ['get', 'fillOpacity'], 1];

export const FEATURE_STROKE_OPACITY_FACTOR = ['coalesce', ['get', 'strokeOpacity'], 0] as const;


// Registered venues render larger than a normal dot so they stand out on the map.
export const VENUE_DOT_RADIUS_SCALE = 1.75;

// Per-feature icon-size multiplier so venue fallback (uncategorized) markers match
// the 1.75× circle scale. Folded into interpolate stops to keep zoom outermost.
export const VENUE_ICON_SIZE_SCALE_EXPR: any = [
	'case',
	['boolean', ['get', 'isVenue'], false],
	VENUE_DOT_RADIUS_SCALE,
	1,
];


export const withFeatureOpacityFactor = (opacityExpr: any, factorExpr: any): any => {
	if (Array.isArray(opacityExpr)) {
		const op = opacityExpr[0];
		const isInterpolate =
			op === 'interpolate' || op === 'interpolate-hcl' || op === 'interpolate-lab';
		const isStep = op === 'step';
		if (isInterpolate || isStep) {
			// Output values are the second item of each (stop, output) pair:
			// interpolate -> indices 4, 6, 8, … ; step -> 2, 4, 6, … . The zoom
			// input (interpolate[2] / step[1]) and the stop inputs stay untouched.
			const firstOutputIndex = isInterpolate ? 4 : 2;
			return opacityExpr.map((part: any, i: number) =>
				i >= firstOutputIndex && i % 2 === 0 ? ['*', part, factorExpr] : part
			);
		}
	}
	return ['*', opacityExpr, factorExpr];
};


export const withFeatureFillOpacity = (opacityExpr: any): any =>
	withFeatureOpacityFactor(opacityExpr, FEATURE_FILL_OPACITY_FACTOR);


export const withFeatureStrokeOpacity = (opacityExpr: any): any =>
	withFeatureOpacityFactor(opacityExpr, FEATURE_STROKE_OPACITY_FACTOR);


export const buildBaseMarkerVisibilityFilter = (
	visibleIds: number[],
	zoom: number,
	campaignFootprintContactIds: ReadonlySet<number>
): any => {
	const effectiveVisibleIds =
		zoom >= CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM &&
		campaignFootprintContactIds.size > 0
			? visibleIds.filter((id) => !campaignFootprintContactIds.has(id))
			: visibleIds;

	return effectiveVisibleIds.length === 0
		? ['==', ['id'], -1]
		: ['match', ['id'], effectiveVisibleIds, true, false];
};
