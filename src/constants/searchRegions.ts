// US region definitions for the free-text contact search. Each region maps a
// colloquial phrase ("pacific northwest", "the south", "bay area") to a set of
// states and/or a geographic circle so the search route can enforce real
// geography instead of leaking nationwide.
//
// Scope semantics:
//   - 'states': the state set is the enforcement authority. centroid/radiusKm
//     only drive candidate fetching and map fit — never trimming.
//   - 'metro': the centroid + radiusKm circle is the enforcement authority
//     (sub-state or cross-state areas where a state list would be far too
//     broad). stateAbbrs is an additional belt where the circle is
//     state-contained, and may be empty for coastal/corridor regions.
export interface SearchRegionDef {
	key: string;
	name: string;
	/** Lowercase phrases, matched longest-first with word boundaries. */
	aliases: readonly string[];
	scope: 'states' | 'metro';
	stateAbbrs: readonly string[];
	centroid: { lat: number; lng: number };
	radiusKm: number;
	/**
	 * Acronym aliases that are also common words/initialisms ("dmv") only
	 * match when the query token is fully uppercase. Multi-word aliases of
	 * the same region are unaffected.
	 */
	requiresUppercaseAliases?: readonly string[];
	/**
	 * Direction-family aliases ("northeast", "midwest"...) are rejected when
	 * immediately followed by a state name/abbr or city token — "northeast
	 * ohio" means Ohio, not the Northeast region.
	 */
	directionalGuard?: boolean;
}

export const SEARCH_REGIONS_LIST: readonly SearchRegionDef[] = [
	{
		key: 'pacific-northwest',
		name: 'Pacific Northwest',
		aliases: ['pacific northwest', 'pacific north west', 'pac northwest', 'pnw'],
		scope: 'states',
		stateAbbrs: ['WA', 'OR'],
		centroid: { lat: 46.0, lng: -121.8 },
		radiusKm: 600,
	},
	{
		key: 'northeast',
		name: 'Northeast',
		aliases: [
			'northeast',
			'north east',
			'the northeast',
			'northeastern us',
			'northeastern united states',
		],
		scope: 'states',
		stateAbbrs: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
		centroid: { lat: 42.3, lng: -72.9 },
		radiusKm: 650,
		directionalGuard: true,
	},
	{
		key: 'new-england',
		name: 'New England',
		aliases: ['new england'],
		scope: 'states',
		stateAbbrs: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
		centroid: { lat: 43.0, lng: -71.6 },
		radiusKm: 500,
	},
	{
		key: 'mid-atlantic',
		name: 'Mid-Atlantic',
		aliases: ['mid atlantic', 'mid-atlantic', 'midatlantic', 'the mid atlantic'],
		scope: 'states',
		stateAbbrs: ['NY', 'NJ', 'PA', 'DE', 'MD', 'DC', 'VA'],
		centroid: { lat: 40.0, lng: -76.0 },
		radiusKm: 500,
	},
	{
		key: 'midwest',
		name: 'Midwest',
		aliases: ['midwest', 'mid west', 'mid-west', 'the midwest', 'midwestern us'],
		scope: 'states',
		stateAbbrs: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
		centroid: { lat: 42.2, lng: -92.2 },
		radiusKm: 1000,
		directionalGuard: true,
	},
	{
		key: 'upper-midwest',
		name: 'Upper Midwest',
		aliases: ['upper midwest', 'the upper midwest'],
		scope: 'states',
		stateAbbrs: ['MN', 'WI', 'MI', 'ND', 'SD', 'IA'],
		centroid: { lat: 45.0, lng: -93.5 },
		radiusKm: 700,
	},
	{
		key: 'south',
		name: 'The South',
		aliases: ['the south', 'down south', 'southern us', 'southern united states'],
		scope: 'states',
		stateAbbrs: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
		centroid: { lat: 34.5, lng: -85.5 },
		radiusKm: 900,
		directionalGuard: true,
	},
	{
		key: 'deep-south',
		name: 'Deep South',
		aliases: ['deep south', 'the deep south'],
		scope: 'states',
		stateAbbrs: ['AL', 'GA', 'LA', 'MS', 'SC'],
		centroid: { lat: 32.5, lng: -87.5 },
		radiusKm: 550,
	},
	{
		key: 'southeast',
		name: 'Southeast',
		aliases: ['southeast', 'south east', 'the southeast', 'southeastern us'],
		scope: 'states',
		stateAbbrs: ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA'],
		centroid: { lat: 33.8, lng: -83.9 },
		radiusKm: 800,
		directionalGuard: true,
	},
	{
		key: 'southwest',
		name: 'Southwest',
		aliases: [
			'southwest',
			'south west',
			'the southwest',
			'southwestern us',
			'desert southwest',
		],
		scope: 'states',
		stateAbbrs: ['AZ', 'NM', 'NV', 'UT'],
		centroid: { lat: 36.0, lng: -111.5 },
		radiusKm: 700,
		directionalGuard: true,
	},
	{
		key: 'west-coast',
		name: 'West Coast',
		aliases: ['west coast', 'the west coast', 'pacific coast'],
		scope: 'states',
		stateAbbrs: ['CA', 'OR', 'WA'],
		centroid: { lat: 42.7, lng: -121.1 },
		radiusKm: 1200,
	},
	{
		key: 'east-coast',
		name: 'East Coast',
		aliases: ['east coast', 'the east coast', 'eastern seaboard'],
		scope: 'states',
		stateAbbrs: [
			'ME',
			'NH',
			'MA',
			'RI',
			'CT',
			'NY',
			'NJ',
			'PA',
			'DE',
			'MD',
			'DC',
			'VA',
			'NC',
			'SC',
			'GA',
			'FL',
		],
		centroid: { lat: 37.5, lng: -77.0 },
		radiusKm: 1400,
	},
	{
		key: 'gulf-coast',
		name: 'Gulf Coast',
		aliases: ['gulf coast', 'the gulf coast'],
		scope: 'metro',
		stateAbbrs: [],
		centroid: { lat: 28.8, lng: -89.5 },
		radiusKm: 800,
	},
	{
		key: 'mountain-west',
		name: 'Mountain West',
		aliases: [
			'mountain west',
			'rockies',
			'the rockies',
			'rocky mountains',
			'rocky mountain region',
			'intermountain west',
		],
		scope: 'states',
		stateAbbrs: ['CO', 'UT', 'WY', 'MT', 'ID', 'NV'],
		centroid: { lat: 42.5, lng: -111.5 },
		radiusKm: 900,
	},
	{
		key: 'great-plains',
		name: 'Great Plains',
		aliases: ['great plains', 'the great plains'],
		scope: 'states',
		stateAbbrs: ['ND', 'SD', 'NE', 'KS', 'OK'],
		centroid: { lat: 42.0, lng: -98.0 },
		radiusKm: 700,
	},
	{
		key: 'great-lakes',
		name: 'Great Lakes',
		aliases: ['great lakes', 'great lakes region'],
		scope: 'states',
		stateAbbrs: ['MN', 'WI', 'IL', 'IN', 'MI', 'OH'],
		centroid: { lat: 43.0, lng: -87.5 },
		radiusKm: 700,
	},
	{
		key: 'appalachia',
		name: 'Appalachia',
		aliases: [
			'appalachia',
			'the appalachians',
			'appalachian mountains',
			'appalachian region',
		],
		scope: 'metro',
		stateAbbrs: [],
		centroid: { lat: 38.0, lng: -81.7 },
		radiusKm: 500,
	},
	{
		key: 'carolinas',
		name: 'The Carolinas',
		aliases: ['carolinas', 'the carolinas'],
		scope: 'states',
		stateAbbrs: ['NC', 'SC'],
		centroid: { lat: 34.7, lng: -80.4 },
		radiusKm: 450,
	},
	{
		key: 'dakotas',
		name: 'The Dakotas',
		aliases: ['dakotas', 'the dakotas'],
		scope: 'states',
		stateAbbrs: ['ND', 'SD'],
		centroid: { lat: 45.9, lng: -99.6 },
		radiusKm: 500,
	},
	{
		key: 'tri-state',
		name: 'Tri-State Area',
		aliases: [
			'tri state area',
			'tri-state area',
			'tristate area',
			'tri state',
			'tri-state',
			'tristate',
		],
		scope: 'metro',
		stateAbbrs: ['NY', 'NJ', 'CT'],
		centroid: { lat: 40.71, lng: -74.01 },
		radiusKm: 160,
	},
	{
		key: 'dmv',
		name: 'DMV',
		aliases: ['dmv', 'the dmv', 'dmv area'],
		scope: 'metro',
		stateAbbrs: ['DC', 'MD', 'VA'],
		centroid: { lat: 38.9, lng: -77.04 },
		radiusKm: 80,
		requiresUppercaseAliases: ['dmv'],
	},
	{
		key: 'bay-area',
		name: 'Bay Area',
		aliases: ['bay area', 'the bay area', 'sf bay area', 'san francisco bay area'],
		scope: 'metro',
		stateAbbrs: ['CA'],
		centroid: { lat: 37.79, lng: -122.27 },
		radiusKm: 100,
	},
	{
		key: 'socal',
		name: 'Southern California',
		aliases: ['socal', 'so cal', 'southern california'],
		scope: 'metro',
		stateAbbrs: ['CA'],
		centroid: { lat: 33.8, lng: -117.9 },
		radiusKm: 250,
	},
	{
		key: 'norcal',
		name: 'Northern California',
		aliases: ['norcal', 'nor cal', 'northern california'],
		scope: 'metro',
		stateAbbrs: ['CA'],
		centroid: { lat: 38.5, lng: -121.7 },
		radiusKm: 250,
	},
] as const;
