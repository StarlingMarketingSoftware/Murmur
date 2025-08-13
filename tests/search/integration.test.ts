import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { runWithFallback } from '../../src/search/queryBuilder';

// Integration test with mock Elasticsearch data
// In production, these would run against a test ES instance

describe('Search Integration Tests', () => {
  let mockClient: Client;
  
  // Mock venue data that would be in Elasticsearch
  const mockVenues = [
    {
      _id: '1',
      _source: {
        contactId: '1',
        company: 'Blue Note Jazz Club',
        headline: 'Premier jazz venue in Manhattan',
        city: 'New York',
        state: 'New York',
        country: 'United States',
        metadata: 'Live music venue featuring world-class jazz performances',
      }
    },
    {
      _id: '2',
      _source: {
        contactId: '2',
        company: 'Brooklyn Bowl',
        headline: 'Music venue, bowling, and food',
        city: 'Brooklyn',
        state: 'New York',
        country: 'United States',
        metadata: 'Live music concerts, 16 bowling lanes, blue ribbon food',
      }
    },
    {
      _id: '3',
      _source: {
        contactId: '3',
        company: 'The Knitting Factory',
        headline: 'Multi-room music venue',
        city: 'Boise',
        state: 'Idaho',
        country: 'United States',
        metadata: 'Live music venue with multiple stages',
      }
    },
    {
      _id: '4',
      _source: {
        contactId: '4',
        company: 'Treefort Music Hall',
        headline: 'All-ages music venue',
        city: 'Boise',
        state: 'Idaho',
        country: 'United States',
        metadata: 'Live music performances and events',
      }
    },
    {
      _id: '5',
      _source: {
        contactId: '5',
        company: 'Empty Bottle',
        headline: 'Independent music venue',
        city: 'Chicago',
        state: 'Illinois',
        country: 'United States',
        metadata: 'Bar and live music venue featuring indie and alternative acts',
      }
    },
    {
      _id: '6',
      _source: {
        contactId: '6',
        company: 'University Concert Hall',
        headline: 'Academic music facility',
        city: 'Boston',
        state: 'Massachusetts',
        country: 'United States',
        metadata: 'University venue for classical music and student performances',
      }
    },
    {
      _id: '7',
      _source: {
        contactId: '7',
        company: 'DJ Equipment Rental Co',
        headline: 'Professional DJ equipment rental',
        city: 'Los Angeles',
        state: 'California',
        country: 'United States',
        metadata: 'DJ rental service for events and parties',
      }
    },
    {
      _id: '8',
      _source: {
        contactId: '8',
        company: 'Wedding Band Agency',
        headline: 'Book live bands for weddings',
        city: 'Nashville',
        state: 'Tennessee',
        country: 'United States',
        metadata: 'Wedding band agency connecting couples with musicians',
      }
    }
  ];
  
  beforeAll(() => {
    // Create a mock client that simulates Elasticsearch behavior
    mockClient = {
      search: async ({ body }: any) => {
        // Simple mock search implementation
        let results = [...mockVenues];
        const query = body.query;
        
        // Filter by location if present
        if (query.bool?.filter) {
          results = results.filter(venue => {
            for (const filter of query.bool.filter) {
              if (filter.term) {
                const [field, value] = Object.entries(filter.term)[0];
                const fieldName = field.replace('.keyword', '');
                if (venue._source[fieldName] !== value) {
                  return false;
                }
              }
              if (filter.bool?.should) {
                // Handle OR filters (like NYC boroughs)
                const matches = filter.bool.should.some((should: any) => {
                  if (should.term) {
                    const [field, value] = Object.entries(should.term)[0];
                    const fieldName = field.replace('.keyword', '');
                    return venue._source[fieldName] === value;
                  }
                  return false;
                });
                if (!matches) return false;
              }
            }
            return true;
          });
        }
        
        // Filter by exclusions
        if (query.bool?.must_not) {
          results = results.filter(venue => {
            const text = Object.values(venue._source).join(' ').toLowerCase();
            for (const mustNot of query.bool.must_not) {
              if (mustNot.bool?.should) {
                for (const should of mustNot.bool.should) {
                  if (should.match_phrase) {
                    const phrase = Object.values(should.match_phrase)[0];
                    if (text.includes(phrase.toLowerCase())) {
                      return false;
                    }
                  }
                }
              }
            }
            return true;
          });
        }
        
        // Simple text matching
        if (query.bool?.must) {
          const mustQuery = query.bool.must[0];
          let searchText = '';
          
          if (mustQuery.multi_match) {
            searchText = mustQuery.multi_match.query.toLowerCase();
          } else if (mustQuery.dis_max) {
            searchText = mustQuery.dis_max.queries[0].multi_match.query.toLowerCase();
          } else if (mustQuery.bool?.should) {
            searchText = mustQuery.bool.should[0].multi_match?.query?.toLowerCase() || '';
          }
          
          if (searchText) {
            results = results.filter(venue => {
              const venueText = Object.values(venue._source).join(' ').toLowerCase();
              const searchTerms = searchText.split(/\s+/);
              return searchTerms.some(term => venueText.includes(term));
            });
          }
        }
        
        return {
          body: {
            hits: {
              hits: results.map((r, i) => ({ ...r, _score: 1 - i * 0.1 })),
              total: { value: results.length }
            }
          }
        };
      }
    } as unknown as Client;
  });

  describe('Required test cases', () => {
    it('should return results for "venues in idaho"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'venues in idaho', 10);
      
      expect(result.hits.length).toBeGreaterThan(0);
      expect(result.tierUsed).toBeLessThanOrEqual(2);
      
      // Should return Idaho venues
      const cities = result.hits.map(h => h._source.city);
      expect(cities).toContain('Boise');
    });

    it('should return Boise results for "live music in boise"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'live music in boise', 10);
      
      expect(result.hits.length).toBeGreaterThan(0);
      
      // All results should be from Boise
      result.hits.forEach(hit => {
        expect(hit._source.city).toBe('Boise');
      });
    });

    it('should find Brooklyn venues for "bars in brooklyn"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'bars in brooklyn', 10);
      
      expect(result.hits.length).toBeGreaterThan(0);
      
      // Should include Brooklyn Bowl
      const companies = result.hits.map(h => h._source.company);
      expect(companies).toContain('Brooklyn Bowl');
    });

    it('should normalize Manhattan to New York for "manhattan jazz venues"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'manhattan jazz venues', 10);
      
      expect(result.hits.length).toBeGreaterThan(0);
      
      // Should find NYC venues (not literal "Manhattan" city)
      const cities = result.hits.map(h => h._source.city);
      expect(cities).toContain('New York');
      // Should prioritize jazz venues
      const companies = result.hits.map(h => h._source.company);
      expect(companies[0]).toContain('Jazz');
    });

    it('should return NYC and Brooklyn for "new york city live music"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'new york city live music', 10);
      
      expect(result.hits.length).toBeGreaterThan(0);
      
      // Should include both NYC and Brooklyn venues
      const cities = result.hits.map(h => h._source.city);
      expect(cities).toContain('New York');
      expect(cities).toContain('Brooklyn');
    });

    it('should handle typos with fuzziness: "venu in boisee"', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'venu in boisee', 10);
      
      // Should still find results despite typos
      expect(result.hits.length).toBeGreaterThan(0);
      
      // Might use tier 2 or higher for fuzzy matching
      expect(result.tierUsed).toBeGreaterThanOrEqual(1);
    });

    it('should exclude non-venue results', async () => {
      const result = await runWithFallback(mockClient, 'contacts', 'music venues', 25);
      
      // Should not include excluded terms
      const companies = result.hits.map(h => h._source.company);
      expect(companies).not.toContain('DJ Equipment Rental Co');
      expect(companies).not.toContain('Wedding Band Agency');
      
      // Should not include universities (unless they're performance venues)
      const nonVenueUniversity = result.hits.find(h => 
        h._source.metadata.includes('student performances') &&
        h._source.company.includes('University')
      );
      // University Concert Hall might be included but ranked lower
      if (nonVenueUniversity) {
        const venueIndex = result.hits.findIndex(h => 
          !h._source.company.includes('University')
        );
        const universityIndex = result.hits.findIndex(h => 
          h._source.company.includes('University')
        );
        expect(venueIndex).toBeLessThan(universityIndex);
      }
    });

    it('should never return 0 results for reasonable queries', async () => {
      const queries = [
        'music venues',
        'live music',
        'concert halls',
        'jazz clubs',
        'venues in california',
        'bars with music',
        'performance spaces',
      ];

      for (const query of queries) {
        const result = await runWithFallback(mockClient, 'contacts', query, 10);
        expect(result.hits.length).toBeGreaterThan(0);
      }
    });

    it('should handle queries without "music venue" prefix', async () => {
      const queries = [
        'jazz clubs in chicago',
        'brooklyn live music',
        'concert halls manhattan',
        'bars with bands idaho',
      ];

      for (const query of queries) {
        const result = await runWithFallback(mockClient, 'contacts', query, 10);
        expect(result.hits.length).toBeGreaterThan(0);
      }
    });

    it('should progressively broaden search through tiers', async () => {
      // Create a client that only returns results on tier 3
      const tierTestClient = {
        search: vi.fn()
          .mockResolvedValueOnce({ body: { hits: { hits: [], total: 0 } } }) // Tier 1 fails
          .mockResolvedValueOnce({ body: { hits: { hits: [], total: 0 } } }) // Tier 2 fails
          .mockResolvedValueOnce({ // Tier 3 succeeds
            body: {
              hits: {
                hits: [mockVenues[0]],
                total: { value: 1 }
              }
            }
          })
      } as unknown as Client;

      const result = await runWithFallback(tierTestClient, 'contacts', 'very specific query xyz', 10);
      
      expect(result.tierUsed).toBe(3);
      expect(result.message).toContain('Expanded search');
      expect(result.hits.length).toBe(1);
    });
  });

  describe('Location edge cases', () => {
    it('should handle multi-word cities', () => {
      const queries = [
        'venues in los angeles',
        'venues in new orleans', 
        'venues in las vegas',
        'venues in san francisco',
      ];

      queries.forEach(async query => {
        const result = await runWithFallback(mockClient, 'contacts', query, 10);
        expect(result.tierUsed).toBeLessThanOrEqual(3);
      });
    });

    it('should handle state abbreviations', () => {
      const queries = [
        'venues in CA',
        'venues in NY',
        'venues in IL',
        'venues in TX',
      ];

      queries.forEach(async query => {
        const result = await runWithFallback(mockClient, 'contacts', query, 10);
        expect(result.tierUsed).toBeLessThanOrEqual(3);
      });
    });

    it('should handle "city, state" format', () => {
      const queries = [
        'venues in boise, id',
        'venues in chicago, il',
        'venues in brooklyn, ny',
      ];

      queries.forEach(async query => {
        const result = await runWithFallback(mockClient, 'contacts', query, 10);
        expect(result.tierUsed).toBeLessThanOrEqual(2);
      });
    });
  });
});
