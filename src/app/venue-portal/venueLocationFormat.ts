// Geocode config + address formatting for venue location pickers, shared by
// VenuePortalClient's profile editor and VenueCreateEventMapPanel's Where box.
import type { ProfileAreaMapFeature } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { US_STATES } from '@/constants/usStates';

export const VENUE_LOCATION_GEOCODE_TYPES =
	'address,street,neighborhood,place,locality,district,region,postcode';

// Pull the structured city + 2-letter US state out of a geocode feature. Used both
// for the saved address string and for the profile card's location chip.
export const parseVenueLocationParts = (
	feature: ProfileAreaMapFeature
): { city: string; state: string } => {
	const context = feature.properties?.context;
	const city =
		context?.place?.name || context?.locality?.name || context?.district?.name || '';
	const rawRegion =
		context?.region?.region_code ||
		context?.region?.short_code?.split('-').pop()?.toUpperCase() ||
		context?.region?.name ||
		'';
	const state =
		rawRegion.length === 2
			? rawRegion.toUpperCase()
			: (US_STATES.find((s) => s.name.toLowerCase() === rawRegion.toLowerCase())?.abbr ??
				rawRegion);
	return { city, state };
};

export const formatVenueLocationFeature = (feature: ProfileAreaMapFeature) => {
	const properties = feature.properties;
	const context = properties?.context;
	const street =
		properties?.full_address?.split(',')[0]?.trim() || properties?.name || '';
	const { city, state: region } = parseVenueLocationParts(feature);
	const postcode = context?.postcode?.name || '';
	const cityRegion = [city, [region, postcode].filter(Boolean).join(' ')]
		.filter(Boolean)
		.join(', ');
	const streetDuplicatesCity =
		street.length > 0 && city.length > 0 && street.toLowerCase() === city.toLowerCase();
	const formattedAddress = [streetDuplicatesCity ? '' : street, cityRegion]
		.filter(Boolean)
		.join(', ');

	return (
		(cityRegion ? formattedAddress : '') ||
		properties?.full_address ||
		properties?.place_formatted ||
		properties?.name ||
		''
	);
};
