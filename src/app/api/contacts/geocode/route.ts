import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { UserRole } from '@prisma/client';
import { geocodeContact } from '@/utils/geocoding';

/**
 * POST /api/contacts/geocode
 * Batch geocode contacts that are missing latitude/longitude coordinates
 * 
 * Request body:
 * - limit: number (default: 50, max: 100 for admin, max: 25 for regular users) - Number of contacts to process
 * - contactIds: number[] (required for non-admin users) - Specific contact IDs to geocode
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    const isAdmin = user?.role === UserRole.admin;

    const body = await req.json();
    const contactIds: number[] | undefined = body.contactIds;

    // Non-admin users must provide specific contact IDs
    if (!isAdmin && (!contactIds || contactIds.length === 0)) {
      return NextResponse.json(
        { error: 'Contact IDs are required for non-admin users' },
        { status: 400 }
      );
    }

    // Different limits for admin vs regular users
    const maxLimit = isAdmin ? 100 : 25;
    const limit = Math.min(body.limit || (isAdmin ? 50 : 25), maxLimit);

    // Build query for contacts missing coordinates
    const whereClause: {
      latitude: null;
      longitude: null;
      id?: { in: number[] };
      OR?: Array<{ city: { not: null } } | { state: { not: null } } | { address: { not: null } }>;
    } = {
      latitude: null,
      longitude: null,
      // Must have at least some location info to geocode
      OR: [
        { city: { not: null } },
        { state: { not: null } },
        { address: { not: null } },
      ],
    };

    if (contactIds && contactIds.length > 0) {
      whereClause.id = { in: contactIds };
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        country: true,
      },
      take: limit,
    });

    if (contacts.length === 0) {
      return NextResponse.json({
        message: 'No contacts found that need geocoding',
        processed: 0,
        success: 0,
        failed: 0,
      });
    }

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      geocoded: [] as { id: number; latitude: number; longitude: number }[],
      errors: [] as { id: number; error: string }[],
    };

    // Process contacts with rate limiting (100ms between requests)
    for (const contact of contacts) {
      results.processed++;

      try {
        const geocodeResult = await geocodeContact({
          address: contact.address,
          city: contact.city,
          state: contact.state,
          country: contact.country,
        });

        if (geocodeResult) {
          // Update the contact with coordinates
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              latitude: geocodeResult.latitude,
              longitude: geocodeResult.longitude,
            },
          });

          results.success++;
          results.geocoded.push({
            id: contact.id,
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
          });
        } else {
          results.failed++;
          results.errors.push({
            id: contact.id,
            error: 'Geocoding returned no results',
          });
        }

        // Rate limiting: 100ms delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: contact.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Geocoding complete: ${results.success}/${results.processed} successful`,
      ...results,
    });
  } catch (error) {
    console.error('Contacts geocode API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/geocode
 * Get count of contacts that need geocoding
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user?.role !== UserRole.admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Count contacts missing coordinates but having location info
    const needsGeocodingCount = await prisma.contact.count({
      where: {
        latitude: null,
        longitude: null,
        OR: [
          { city: { not: null } },
          { state: { not: null } },
          { address: { not: null } },
        ],
      },
    });

    // Count contacts with coordinates
    const hasCoordinatesCount = await prisma.contact.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    // Count contacts with no location info at all
    const noLocationInfoCount = await prisma.contact.count({
      where: {
        latitude: null,
        longitude: null,
        city: null,
        state: null,
        address: null,
      },
    });

    return NextResponse.json({
      needsGeocoding: needsGeocodingCount,
      hasCoordinates: hasCoordinatesCount,
      noLocationInfo: noLocationInfoCount,
    });
  } catch (error) {
    console.error('Contacts geocode count API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

