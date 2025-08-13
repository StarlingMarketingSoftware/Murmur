# Migration Guide: Integrating New Search with Existing Route

## Overview

This guide shows how to integrate the new tiered search system with your existing `/api/contacts/route.ts` endpoint while maintaining backward compatibility.

## Integration Options

### Option 1: Gradual Migration (Recommended)

Add the new search as an optional path alongside existing vector search:

```typescript
// In src/app/api/contacts/route.ts

import { searchVenues } from '@/search/searchService';

export async function GET(req: NextRequest) {
  // ... existing auth and validation ...
  
  const { query, useVectorSearch, useTieredSearch, ...otherParams } = validatedData;
  
  // Use new search if explicitly requested or if vector search fails
  if (useTieredSearch || (query && !process.env.OPEN_AI_API_KEY)) {
    const searchResult = await searchVenues({
      query,
      limit,
      verificationStatus,
      excludeContactIds,
    });
    
    // Transform to match existing response format
    return apiResponse({
      contacts: searchResult.contacts,
      searchTier: searchResult.tierUsed,
      searchMessage: searchResult.message,
    });
  }
  
  // ... existing vector search code ...
}
```

### Option 2: Feature Flag

Use environment variable to control which search to use:

```typescript
const USE_NEW_SEARCH = process.env.USE_TIERED_SEARCH === 'true';

if (USE_NEW_SEARCH && query) {
  // New search
  const result = await searchVenues({ query, limit });
  // ...
} else if (useVectorSearch && query) {
  // Existing vector search
  // ...
}
```

### Option 3: A/B Testing

Route percentage of traffic to new search:

```typescript
const useNewSearch = Math.random() < 0.5; // 50% split

if (useNewSearch && query) {
  // Track metrics
  console.log('[A/B Test] Using new tiered search');
  const result = await searchVenues({ query, limit });
  // ...
}
```

## Complete Integration Example

Here's how to modify your existing route.ts to use the new search:

```typescript
// Add imports at the top
import { searchVenues } from '@/search/searchService';

// In your GET function, replace the vector search section:

// OLD CODE (lines 284-668 approximately):
if (useVectorSearch && query) {
  // ... existing vector search implementation ...
}

// NEW CODE:
if (query) {
  // Try new tiered search first
  try {
    const searchResult = await searchVenues({
      query,
      limit: limit ?? VECTOR_SEARCH_LIMIT_DEFAULT,
      verificationStatus: verificationStatus || undefined,
      excludeContactIds: addedContactIds,
    });
    
    // Get full contact records if we have IDs
    const contactIds = searchResult.contacts
      .map(c => Number(c.id))
      .filter(id => Number.isFinite(id) && id > 0);
    
    if (contactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          emailValidationStatus: verificationStatus
            ? { equals: verificationStatus }
            : undefined,
        },
      });
      
      // Preserve search order
      const contactMap = new Map(contacts.map(c => [c.id, c]));
      const orderedContacts = contactIds
        .map(id => contactMap.get(id))
        .filter(Boolean);
      
      return apiResponse({
        contacts: orderedContacts,
        searchTier: searchResult.tierUsed,
        searchMessage: searchResult.message,
      });
    }
    
    // Return Elasticsearch results directly if no DB matches
    return apiResponse({
      contacts: searchResult.contacts,
      searchTier: searchResult.tierUsed,
      searchMessage: searchResult.message,
    });
    
  } catch (error) {
    console.error('Tiered search failed, falling back to substring search:', error);
    // Fall back to existing substring search
    contacts = await substringSearch();
    return apiResponse(contacts);
  }
}
```

## Removing Old Dependencies

Once the new search is stable, you can remove:

1. **OpenAI location parsing** (lines 89-128)
   - The new system handles this internally
   
2. **Location override logic** (lines 130-131)
   - Built into the new locationNormalize.ts

3. **Post-training filters** (lines 318-574)
   - Integrated into synonyms.ts exclusions

4. **Vector search complexity** (lines 284-451)
   - Replaced by simpler tiered approach

## Configuration Migration

### Old Environment Variables
```env
OPEN_AI_API_KEY=sk-...
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=...
```

### New Configuration (if needed)
```env
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=...
USE_TIERED_SEARCH=true
SEARCH_DEBUG=true
```

## Response Format Compatibility

The new search maintains backward compatibility:

### Old Response
```json
{
  "contacts": [...],
  "status": "success"
}
```

### New Response (with metadata)
```json
{
  "contacts": [...],
  "searchMetadata": {
    "tierUsed": 2,
    "message": "Showing results with flexible matching",
    "suggestions": ["Try adding a city name"]
  },
  "status": "success"
}
```

## Testing the Migration

1. **Unit Tests**: Run new test suite
   ```bash
   npm test tests/search/
   ```

2. **Integration Tests**: Test with real Elasticsearch
   ```bash
   npm run test:integration
   ```

3. **Smoke Tests**: Verify key queries
   ```typescript
   const testQueries = [
     'music venues in manhattan',
     'live music in brooklyn',
     'venues in idaho',
     'jazz clubs',
   ];
   ```

4. **Performance Tests**: Compare response times
   ```typescript
   console.time('search');
   const result = await searchVenues({ query: 'venues' });
   console.timeEnd('search');
   ```

## Rollback Plan

If issues arise, you can quickly rollback:

1. **Environment Variable**: Set `USE_TIERED_SEARCH=false`
2. **Code Revert**: Git revert the integration commit
3. **Feature Flag**: Disable via feature flag service

## Monitoring

Add monitoring for the new search:

```typescript
// Track tier usage
if (searchResult.tierUsed > 3) {
  metrics.increment('search.broad_tier_used');
}

// Track empty results
if (searchResult.total === 0) {
  metrics.increment('search.no_results');
  logger.warn(`No results for query: ${query}`);
}

// Track response time by tier
metrics.timing('search.response_time', responseTime, {
  tier: searchResult.tierUsed
});
```

## Common Issues and Solutions

### Issue: Different result counts
**Solution**: The new search may return different results due to improved matching. This is expected and generally better.

### Issue: Slower initial queries
**Solution**: First queries may be slower due to cold cache. Subsequent queries should be faster.

### Issue: Missing specific venues
**Solution**: Check if they're being filtered by exclusions. Adjust `EXCLUSIONS` in synonyms.ts if needed.

### Issue: Too many irrelevant results
**Solution**: Increase minimum_should_match percentages or add more exclusion terms.

## Support

For questions or issues with the migration:
1. Check the search README: `src/search/README.md`
2. Review test cases: `tests/search/*.test.ts`
3. Enable debug logging: `DEBUG=search:* npm start`
