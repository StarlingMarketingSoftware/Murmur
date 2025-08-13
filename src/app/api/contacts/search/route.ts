import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  apiBadRequest,
  apiResponse,
  apiUnauthorized,
  handleApiError,
} from '@/app/api/_utils';
import { EmailVerificationStatus } from '@prisma/client';
import { searchVenues } from '@/search/searchService';

// Schema for search parameters
const searchSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().optional().default(100),
  verificationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
  contactListIds: z.array(z.number()).optional(),
  excludeUsedContacts: z.boolean().optional().default(false),
  // Keep for backward compatibility but ignore
  useVectorSearch: z.boolean().optional(),
  location: z.string().optional(),
});

export type SearchData = z.infer<typeof searchSchema>;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    // Handle array parameters
    if (params.contactListIds) {
      params.contactListIds = params.contactListIds.split(',').map(Number);
    }
    
    const validatedParams = searchSchema.safeParse(params);
    if (!validatedParams.success) {
      return apiBadRequest(validatedParams.error);
    }

    const {
      query,
      limit,
      verificationStatus,
      contactListIds,
      excludeUsedContacts,
    } = validatedParams.data;

    // Handle contact list filtering (existing functionality)
    if (contactListIds && contactListIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          userContactLists: {
            some: {
              id: {
                in: contactListIds,
              },
            },
          },
          emailValidationStatus: verificationStatus
            ? { equals: verificationStatus }
            : undefined,
        },
        orderBy: {
          company: 'asc',
        },
      });
      return apiResponse({ contacts, searchType: 'contactList' });
    }

    // Get excluded contact IDs if needed
    let excludeContactIds: number[] = [];
    if (excludeUsedContacts) {
      const userContactLists = await prisma.userContactList.findMany({
        where: { userId },
        include: { contacts: true },
      });
      
      excludeContactIds = userContactLists
        .flatMap(list => list.contacts.map(c => c.id));
    }

    // Use new tiered search system if query is provided
    if (query) {
      const searchResult = await searchVenues({
        query,
        limit,
        verificationStatus: verificationStatus || undefined,
        excludeContactIds,
      });

      // Get full contact records from database
      const contactIds = searchResult.contacts.map(c => c.id).filter(id => id > 0);
      
      let contacts = [];
      if (contactIds.length > 0) {
        // Fetch from database to get complete records
        const dbContacts = await prisma.contact.findMany({
          where: {
            id: { in: contactIds },
            ...(verificationStatus && {
              emailValidationStatus: { equals: verificationStatus }
            }),
          },
        });

        // Preserve search order
        const contactMap = new Map(dbContacts.map(c => [c.id, c]));
        contacts = contactIds
          .map(id => contactMap.get(id))
          .filter(Boolean);
      } else {
        // Use Elasticsearch results directly if no DB matches
        contacts = searchResult.contacts;
      }

      return apiResponse({
        contacts,
        searchMetadata: {
          tierUsed: searchResult.tierUsed,
          total: searchResult.total,
          message: searchResult.message,
          suggestions: searchResult.suggestions,
          locationParsed: searchResult.locationParsed,
        },
      });
    }

    // Default: return all contacts (existing behavior)
    const contacts = await prisma.contact.findMany({
      where: {
        ...(verificationStatus && {
          emailValidationStatus: { equals: verificationStatus }
        }),
        ...(excludeUsedContacts && excludeContactIds.length > 0 && {
          id: { notIn: excludeContactIds }
        }),
      },
      take: limit,
      orderBy: {
        userContactListCount: 'asc',
      },
    });

    return apiResponse({ contacts, searchType: 'all' });
    
  } catch (error) {
    console.error('[Search API] Error:', error);
    return handleApiError(error);
  }
}
