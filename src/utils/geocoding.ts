/**
 * Google Geocoding API utility for converting addresses to coordinates
 */

export interface GeocodeResult {
	latitude: number;
	longitude: number;
	formattedAddress: string;
	placeId: string;
}

export interface GeocodeError {
	error: string;
	status: string;
}

interface GoogleGeocodingResponse {
	results: Array<{
		formatted_address: string;
		geometry: {
			location: {
				lat: number;
				lng: number;
			};
		};
		place_id: string;
	}>;
	status: string;
	error_message?: string;
}

/**
 * Geocode an address to get latitude and longitude coordinates
 * @param address - The address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
 * @returns Promise with geocode result or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
	const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;

	if (!apiKey) {
		console.error('GOOGLE_GEOCODING_API_KEY environment variable is not set');
		return null;
	}

	if (!address || address.trim().length === 0) {
		console.warn('Empty address provided to geocodeAddress');
		return null;
	}

	try {
		const encodedAddress = encodeURIComponent(address.trim());
		const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

		const response = await fetch(url);
		const data: GoogleGeocodingResponse = await response.json();

		if (data.status === 'OK' && data.results.length > 0) {
			const result = data.results[0];
			return {
				latitude: result.geometry.location.lat,
				longitude: result.geometry.location.lng,
				formattedAddress: result.formatted_address,
				placeId: result.place_id,
			};
		}

		if (data.status === 'ZERO_RESULTS') {
			console.warn(`No geocoding results found for address: ${address}`);
			return null;
		}

		console.error(
			`Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`
		);
		return null;
	} catch (error) {
		console.error('Geocoding request failed:', error);
		return null;
	}
}

/**
 * Build an address string from contact fields
 */
export function buildAddressFromContact(contact: {
	address?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
}): string | null {
	const parts: string[] = [];

	if (contact.address) parts.push(contact.address);
	if (contact.city) parts.push(contact.city);
	if (contact.state) parts.push(contact.state);
	if (contact.country) parts.push(contact.country);

	if (parts.length === 0) return null;

	return parts.join(', ');
}

// US state names and abbreviations for detection
const US_STATES = new Set([
	'alabama',
	'al',
	'alaska',
	'ak',
	'arizona',
	'az',
	'arkansas',
	'ar',
	'california',
	'ca',
	'colorado',
	'co',
	'connecticut',
	'ct',
	'delaware',
	'de',
	'florida',
	'fl',
	'georgia',
	'ga',
	'hawaii',
	'hi',
	'idaho',
	'id',
	'illinois',
	'il',
	'indiana',
	'in',
	'iowa',
	'ia',
	'kansas',
	'ks',
	'kentucky',
	'ky',
	'louisiana',
	'la',
	'maine',
	'me',
	'maryland',
	'md',
	'massachusetts',
	'ma',
	'michigan',
	'mi',
	'minnesota',
	'mn',
	'mississippi',
	'ms',
	'missouri',
	'mo',
	'montana',
	'mt',
	'nebraska',
	'ne',
	'nevada',
	'nv',
	'new hampshire',
	'nh',
	'new jersey',
	'nj',
	'new mexico',
	'nm',
	'new york',
	'ny',
	'north carolina',
	'nc',
	'north dakota',
	'nd',
	'ohio',
	'oh',
	'oklahoma',
	'ok',
	'oregon',
	'or',
	'pennsylvania',
	'pa',
	'rhode island',
	'ri',
	'south carolina',
	'sc',
	'south dakota',
	'sd',
	'tennessee',
	'tn',
	'texas',
	'tx',
	'utah',
	'ut',
	'vermont',
	'vt',
	'virginia',
	'va',
	'washington',
	'wa',
	'west virginia',
	'wv',
	'wisconsin',
	'wi',
	'wyoming',
	'wy',
	'district of columbia',
	'dc',
]);

/**
 * Check if a state value looks like a US state
 */
function isUSState(state: string | null | undefined): boolean {
	if (!state) return false;
	return US_STATES.has(state.toLowerCase().trim());
}

/**
 * Normalize country - detect if it's USA or should default to USA
 */
function normalizeCountry(
	country: string | null | undefined,
	state: string | null | undefined
): string | null {
	if (country) {
		const lower = country.toLowerCase().trim();
		// Normalize various USA formats
		if (
			[
				'usa',
				'us',
				'u.s.',
				'u.s.a.',
				'united states',
				'united states of america',
				'america',
			].includes(lower)
		) {
			return 'USA';
		}
		return country;
	}
	// If no country but state is a US state, default to USA
	if (isUSState(state)) {
		return 'USA';
	}
	return null;
}

/**
 * Build address query strings with fallback variations
 * Returns an array of address strings to try, from most specific to least specific
 * Always includes country context to avoid ambiguous results (e.g., "New York" → London)
 */
export function buildAddressVariations(contact: {
	address?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
}): string[] {
	const variations: string[] = [];
	const { address, city, state } = contact;

	// Normalize country - auto-detect USA from state if country is missing
	const country = normalizeCountry(contact.country, state);

	// Most specific: full address with all components (always include country)
	if (address && city && state && country) {
		variations.push([address, city, state, country].join(', '));
	}

	// Full address with city, state, country
	if (address && city && state) {
		variations.push([address, city, state, country].filter(Boolean).join(', '));
	}

	// Address with city and country (skip state)
	if (address && city && country) {
		variations.push([address, city, country].join(', '));
	}

	// City, state, country - most common fallback for business contacts
	if (city && state && country) {
		variations.push([city, state, country].join(', '));
	}

	// City and state with USA (if state is US state and country wasn't provided)
	if (city && state && isUSState(state)) {
		variations.push([city, state, 'USA'].join(', '));
	}

	// City, state only (but ONLY if we have both - avoids ambiguity)
	if (city && state) {
		variations.push([city, state].join(', '));
	}

	// City and country (for international or when state is missing)
	if (city && country) {
		variations.push([city, country].join(', '));
	}

	// State and country (very approximate - center of state)
	if (state && country) {
		variations.push([state, country].join(', '));
	}

	// AVOID: Just city or just state without country - too ambiguous!
	// "New York" alone can match places in UK, "Georgia" matches the country, etc.

	// Remove duplicates while preserving order
	return [...new Set(variations)];
}

/**
 * Geocode a contact based on their address fields with fallback logic
 * Tries progressively simpler address combinations if more specific ones fail
 * @param contact - Contact object with address fields
 * @returns Promise with geocode result or null if no address or all geocoding attempts fail
 */
export async function geocodeContact(contact: {
	address?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
}): Promise<GeocodeResult | null> {
	const addressVariations = buildAddressVariations(contact);

	if (addressVariations.length === 0) {
		return null;
	}

	// Try each variation until one succeeds
	for (const addressQuery of addressVariations) {
		const result = await geocodeAddress(addressQuery);
		if (result) {
			return result;
		}
		// Small delay between retries to be nice to the API
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	return null;
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Google Geocoding API has a rate limit of 50 requests per second
 * @param addresses - Array of addresses to geocode
 * @param delayMs - Delay between requests in milliseconds (default: 100ms for ~10 req/s)
 * @returns Promise with array of results (null for failed geocodes)
 */
export async function batchGeocodeAddresses(
	addresses: string[],
	delayMs: number = 100
): Promise<(GeocodeResult | null)[]> {
	const results: (GeocodeResult | null)[] = [];

	for (const address of addresses) {
		const result = await geocodeAddress(address);
		results.push(result);

		// Add delay to avoid rate limiting
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return results;
}
