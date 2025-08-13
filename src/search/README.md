# Venue Search System

## Overview

This search system implements a tiered fallback approach to ensure users always get relevant results for venue searches, even with loose or misspelled queries. The system progressively relaxes search constraints through 5 tiers until results are found.

## Key Features

- **Location Normalization**: Intelligent parsing of location queries with special handling for NYC boroughs
- **Synonym Expansion**: Recognizes venue-related terms (venue, club, bar, live music, etc.)
- **Tiered Fallback**: 5 progressively broader search strategies
- **Exclusion Filtering**: Removes non-venue results (equipment rental, agencies, etc.)
- **Fuzzy Matching**: Handles typos and partial matches in later tiers

## Architecture

### Modules

1. **locationNormalize.ts**
   - Parses location from natural language queries
   - Handles special cases (Manhattan → New York, NYC → New York + Brooklyn)
   - Normalizes state names and abbreviations

2. **synonyms.ts**
   - Defines venue-related synonyms with boost values
   - Lists exclusion terms for filtering
   - Provides venue indicator terms for positive signals

3. **queryBuilder.ts**
   - Builds 5 tiers of Elasticsearch queries
   - Implements progressive relaxation strategy
   - Manages location filters and text matching

4. **searchService.ts**
   - Integration layer with Elasticsearch
   - Handles post-processing and filtering
   - Provides backward compatibility

## Search Tiers

### Tier 1: Strict Matching (Best Quality)
- **Text**: AND operator, 75% minimum match
- **Location**: Strict filters applied
- **Fuzziness**: Disabled
- **Use Case**: Perfect or near-perfect matches

### Tier 2: Flexible Matching
- **Text**: OR operator, 50% minimum match, phrase prefix
- **Location**: Filters still applied
- **Fuzziness**: AUTO:4,7 (tolerates typos)
- **Use Case**: Queries with minor typos or variations

### Tier 3: Relaxed Location
- **Text**: 35% minimum match, wildcard support
- **Location**: State filter only, city becomes a boost
- **Fuzziness**: AUTO
- **Use Case**: Broader geographic search

### Tier 4: State-Level Search
- **Text**: Heavy synonym expansion, 25% minimum match
- **Location**: State filter only (if available)
- **Fuzziness**: AUTO
- **Use Case**: Finding any venue-like business in a state

### Tier 5: Broadest Search
- **Text**: Minimal constraints, match_all fallback
- **Location**: No filters
- **Fuzziness**: AUTO
- **Use Case**: Last resort to avoid empty results

## Configuration

### Field Boosts

Adjust field importance in `queryBuilder.ts`:

```typescript
const SEARCH_FIELDS = [
  'company^8',      // Venue name (highest)
  'headline^3',     // Description
  'metadata^2',     // Additional info
  'title^2',        // Job title
  'city^4',         // Location
  'state^1',        
  'address^1',
  'website^0.5',    // URL (lowest)
];
```

### Synonym Boosts

Modify term preferences in `synonyms.ts`:

```typescript
export const BOOSTED_TERMS = [
  { term: 'music venue', boost: 3.0 },    // Highest priority
  { term: 'concert hall', boost: 2.8 },
  { term: 'live music', boost: 2.5 },
  { term: 'venue', boost: 2.0 },
  { term: 'club', boost: 1.5 },
  { term: 'bar', boost: 1.2 },           // Lower priority
];
```

### Location Handling

Add new location aliases in `locationNormalize.ts`:

```typescript
const NYC_BOROUGH_MAP = new Map([
  ['manhattan', { city: 'New York', state: 'New York' }],
  ['brooklyn', { city: 'Brooklyn', state: 'New York' }],
  // Add more mappings as needed
]);
```

## Usage Examples

### Basic Integration

```typescript
import { searchVenues } from './search/searchService';

const results = await searchVenues({
  query: 'jazz clubs in manhattan',
  limit: 25,
  verificationStatus: 'valid'
});

console.log(`Found ${results.total} venues using tier ${results.tierUsed}`);
if (results.message) {
  console.log(`Search note: ${results.message}`);
}
```

### Direct Query Building

```typescript
import { buildTiers } from './search/queryBuilder';

const tiers = buildTiers('live music in brooklyn');
// Returns array of 5 ES queries from strict to broad
```

## Query Examples

### Supported Queries
- ✅ `venues in idaho` - State search
- ✅ `live music in boise` - City search
- ✅ `bars in brooklyn` - Borough search
- ✅ `manhattan jazz venues` - Manhattan normalization
- ✅ `new york city live music` - NYC handling
- ✅ `jazz clubs` - No location
- ✅ `venu in boisee` - Typos handled

### Special Cases
- **Manhattan** → Searches for city:"New York", state:"New York"
- **NYC/New York City** → Searches for city:"New York" OR city:"Brooklyn"
- **Brooklyn** → Searches for city:"Brooklyn", state:"New York"
- **DC/Washington DC** → Searches for city:"Washington", state:"District of Columbia"

## Tuning Guide

### Improving Relevance

1. **Too many irrelevant results?**
   - Add terms to `EXCLUSIONS` in synonyms.ts
   - Increase `minimum_should_match` percentages
   - Reduce boost values for generic terms

2. **Missing expected results?**
   - Add synonyms to `VENUE_SYNONYMS`
   - Reduce `minimum_should_match` percentages
   - Check if exclusions are too strict

3. **Wrong tier being used?**
   - Adjust tier conditions in `buildTiers()`
   - Modify fuzziness settings
   - Tune location filter strictness

### Performance Optimization

1. **Slow searches?**
   - Reduce size parameter
   - Limit synonym expansion
   - Use more selective filters early

2. **Too many ES calls?**
   - Adjust tier thresholds
   - Cache common queries
   - Pre-filter on client side

## Monitoring

### Metrics to Track

```typescript
// Log tier usage
console.log(`[Search] Query: "${query}", Tier: ${tierUsed}, Results: ${total}`);

// Track common tier 4-5 queries (may need tuning)
if (tierUsed >= 4) {
  console.warn(`Broad search needed for: "${query}"`);
}

// Monitor zero results (should be rare)
if (total === 0) {
  console.error(`No results for: "${query}" after all tiers`);
}
```

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
DEBUG=search:* npm start
```

## Testing

Run tests with:

```bash
npm test tests/search/
```

Key test coverage:
- Location normalization edge cases
- All 5 tier progressions
- NYC/Manhattan special handling
- Exclusion filtering
- Fuzzy matching
- Never-zero-results guarantee

## Future Enhancements

1. **Geo-distance scoring**: Use lat/lon coordinates for proximity boost
2. **ML ranking**: Train model on click-through data
3. **Query autocomplete**: Real-time suggestions while typing
4. **Faceted search**: Filter by venue type, capacity, etc.
5. **Personalization**: Boost based on user history
6. **A/B testing**: Compare tier strategies
