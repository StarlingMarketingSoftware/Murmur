export interface UsStateCentroid {
	name: string;
	abbr: string;
	centroid: { lat: number; lng: number };
}

// Approximate geographic centroids for the 50 US states.
// Source values are commonly used state centroid approximations (sufficient for "nearest states" sorting).
export const US_STATES: UsStateCentroid[] = [
	{ name: 'Alabama', abbr: 'AL', centroid: { lat: 32.806671, lng: -86.79113 } },
	{ name: 'Alaska', abbr: 'AK', centroid: { lat: 61.370716, lng: -152.404419 } },
	{ name: 'Arizona', abbr: 'AZ', centroid: { lat: 33.729759, lng: -111.431221 } },
	{ name: 'Arkansas', abbr: 'AR', centroid: { lat: 34.969704, lng: -92.373123 } },
	{ name: 'California', abbr: 'CA', centroid: { lat: 36.116203, lng: -119.681564 } },
	{ name: 'Colorado', abbr: 'CO', centroid: { lat: 39.059811, lng: -105.311104 } },
	{ name: 'Connecticut', abbr: 'CT', centroid: { lat: 41.597782, lng: -72.755371 } },
	{ name: 'Delaware', abbr: 'DE', centroid: { lat: 39.318523, lng: -75.507141 } },
	{ name: 'Florida', abbr: 'FL', centroid: { lat: 27.766279, lng: -81.686783 } },
	{ name: 'Georgia', abbr: 'GA', centroid: { lat: 33.040619, lng: -83.643074 } },
	{ name: 'Hawaii', abbr: 'HI', centroid: { lat: 21.094318, lng: -157.498337 } },
	{ name: 'Idaho', abbr: 'ID', centroid: { lat: 44.240459, lng: -114.478828 } },
	{ name: 'Illinois', abbr: 'IL', centroid: { lat: 40.349457, lng: -88.986137 } },
	{ name: 'Indiana', abbr: 'IN', centroid: { lat: 39.849426, lng: -86.258278 } },
	{ name: 'Iowa', abbr: 'IA', centroid: { lat: 42.011539, lng: -93.210526 } },
	{ name: 'Kansas', abbr: 'KS', centroid: { lat: 38.5266, lng: -96.726486 } },
	{ name: 'Kentucky', abbr: 'KY', centroid: { lat: 37.66814, lng: -84.670067 } },
	{ name: 'Louisiana', abbr: 'LA', centroid: { lat: 31.169546, lng: -91.867805 } },
	{ name: 'Maine', abbr: 'ME', centroid: { lat: 44.693947, lng: -69.381927 } },
	{ name: 'Maryland', abbr: 'MD', centroid: { lat: 39.063946, lng: -76.802101 } },
	{ name: 'Massachusetts', abbr: 'MA', centroid: { lat: 42.230171, lng: -71.530106 } },
	{ name: 'Michigan', abbr: 'MI', centroid: { lat: 43.326618, lng: -84.536095 } },
	{ name: 'Minnesota', abbr: 'MN', centroid: { lat: 45.694454, lng: -93.900192 } },
	{ name: 'Mississippi', abbr: 'MS', centroid: { lat: 32.741646, lng: -89.678696 } },
	{ name: 'Missouri', abbr: 'MO', centroid: { lat: 38.456085, lng: -92.288368 } },
	{ name: 'Montana', abbr: 'MT', centroid: { lat: 46.921925, lng: -110.454353 } },
	{ name: 'Nebraska', abbr: 'NE', centroid: { lat: 41.12537, lng: -98.268082 } },
	{ name: 'Nevada', abbr: 'NV', centroid: { lat: 38.313515, lng: -117.055374 } },
	{ name: 'New Hampshire', abbr: 'NH', centroid: { lat: 43.452492, lng: -71.563896 } },
	{ name: 'New Jersey', abbr: 'NJ', centroid: { lat: 40.298904, lng: -74.521011 } },
	{ name: 'New Mexico', abbr: 'NM', centroid: { lat: 34.840515, lng: -106.248482 } },
	{ name: 'New York', abbr: 'NY', centroid: { lat: 42.165726, lng: -74.948051 } },
	{ name: 'North Carolina', abbr: 'NC', centroid: { lat: 35.630066, lng: -79.806419 } },
	{ name: 'North Dakota', abbr: 'ND', centroid: { lat: 47.528912, lng: -99.784012 } },
	{ name: 'Ohio', abbr: 'OH', centroid: { lat: 40.388783, lng: -82.764915 } },
	{ name: 'Oklahoma', abbr: 'OK', centroid: { lat: 35.565342, lng: -96.928917 } },
	{ name: 'Oregon', abbr: 'OR', centroid: { lat: 44.572021, lng: -122.070938 } },
	{ name: 'Pennsylvania', abbr: 'PA', centroid: { lat: 40.590752, lng: -77.209755 } },
	{ name: 'Rhode Island', abbr: 'RI', centroid: { lat: 41.680893, lng: -71.51178 } },
	{ name: 'South Carolina', abbr: 'SC', centroid: { lat: 33.856892, lng: -80.945007 } },
	{ name: 'South Dakota', abbr: 'SD', centroid: { lat: 44.299782, lng: -99.438828 } },
	{ name: 'Tennessee', abbr: 'TN', centroid: { lat: 35.747845, lng: -86.692345 } },
	{ name: 'Texas', abbr: 'TX', centroid: { lat: 31.054487, lng: -97.563461 } },
	{ name: 'Utah', abbr: 'UT', centroid: { lat: 40.150032, lng: -111.862434 } },
	{ name: 'Vermont', abbr: 'VT', centroid: { lat: 44.045876, lng: -72.710686 } },
	{ name: 'Virginia', abbr: 'VA', centroid: { lat: 37.769337, lng: -78.169968 } },
	{ name: 'Washington', abbr: 'WA', centroid: { lat: 47.400902, lng: -121.490494 } },
	{ name: 'West Virginia', abbr: 'WV', centroid: { lat: 38.491226, lng: -80.954456 } },
	{ name: 'Wisconsin', abbr: 'WI', centroid: { lat: 44.268543, lng: -89.616508 } },
	{ name: 'Wyoming', abbr: 'WY', centroid: { lat: 42.755966, lng: -107.30249 } },
];


