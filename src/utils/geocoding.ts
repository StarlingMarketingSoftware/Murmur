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

/**
 * Geocode a contact based on their address fields
 * @param contact - Contact object with address fields
 * @returns Promise with geocode result or null if no address or geocoding fails
 */
export async function geocodeContact(contact: {
	address?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
}): Promise<GeocodeResult | null> {
	const address = buildAddressFromContact(contact);

	if (!address) {
		return null;
	}

	return geocodeAddress(address);
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
