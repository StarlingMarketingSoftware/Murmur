import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, geocodeContact, batchGeocodeAddresses } from '@/utils/geocoding';

/**
 * POST /api/geocode
 * Geocode an address or contact to get coordinates
 * 
 * Request body:
 * - For single address: { address: string }
 * - For contact fields: { city?: string, state?: string, country?: string, address?: string }
 * - For batch addresses: { addresses: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Batch geocoding
    if (body.addresses && Array.isArray(body.addresses)) {
      if (body.addresses.length > 100) {
        return NextResponse.json(
          { error: 'Maximum 100 addresses allowed per batch request' },
          { status: 400 }
        );
      }

      const results = await batchGeocodeAddresses(body.addresses);
      return NextResponse.json({ results });
    }

    // Single address geocoding
    if (body.address && typeof body.address === 'string') {
      const result = await geocodeAddress(body.address);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Unable to geocode address', address: body.address },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result);
    }

    // Contact fields geocoding
    if (body.city || body.state || body.country || body.contactAddress) {
      const result = await geocodeContact({
        city: body.city,
        state: body.state,
        country: body.country,
        address: body.contactAddress,
      });
      
      if (!result) {
        return NextResponse.json(
          { error: 'Unable to geocode contact location' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide either "address", "addresses" array, or contact fields (city, state, country, contactAddress)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geocode?address=...
 * Simple geocoding endpoint for a single address
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Missing "address" query parameter' },
        { status: 400 }
      );
    }
    
    const result = await geocodeAddress(address);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Unable to geocode address', address },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

