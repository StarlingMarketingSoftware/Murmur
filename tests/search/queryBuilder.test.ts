import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTiers, runWithFallback, getSearchSuggestions } from '../../src/search/queryBuilder';
import { Client } from '@elastic/elasticsearch';

// Mock Elasticsearch client
const mockSearch = vi.fn();
const mockClient = {
  search: mockSearch
} as unknown as Client;

describe('Query Builder', () => {
  beforeEach(() => {
    mockSearch.mockClear();
  });

  describe('buildTiers', () => {
    it('should create 5 tiers of queries', () => {
      const tiers = buildTiers('music venues in manhattan');
      expect(tiers).toHaveLength(5);
    });

    it('should apply location filters in strict tiers', () => {
      const tiers = buildTiers('venues in brooklyn');
      
      // Tier 1 should have location filters
      expect(tiers[0].bool.filter).toBeDefined();
      expect(tiers[0].bool.filter.length).toBeGreaterThan(0);
      
      // Later tiers should progressively relax location
      expect(tiers[2].bool.filter.length).toBeLessThanOrEqual(tiers[0].bool.filter.length);
    });

    it('should include synonym boosts', () => {
      const tiers = buildTiers('live music in boise');
      
      // Should have synonym should clauses
      tiers.forEach(tier => {
        expect(tier.bool.should).toBeDefined();
        expect(tier.bool.should.length).toBeGreaterThan(0);
      });
    });

    it('should include exclusion terms', () => {
      const tiers = buildTiers('music venues');
      
      // All tiers should have must_not clauses for exclusions
      tiers.forEach(tier => {
        expect(tier.bool.must_not).toBeDefined();
        expect(tier.bool.must_not.length).toBeGreaterThan(0);
      });
    });

    it('should handle queries without location', () => {
      const tiers = buildTiers('best jazz clubs');
      
      // First tier should not have location filters
      expect(tiers[0].bool.filter).toEqual([]);
    });

    it('should progressively loosen matching requirements', () => {
      const tiers = buildTiers('music venues in idaho');
      
      // Check minimum_should_match decreases
      const tier1Match = tiers[0].bool.must[0].multi_match;
      const tier2Match = tiers[1].bool.must[0].dis_max.queries[0].multi_match;
      
      expect(tier1Match.minimum_should_match).toBe('75%');
      expect(tier2Match.minimum_should_match).toBe('50%');
    });

    it('should add fuzziness in later tiers', () => {
      const tiers = buildTiers('venu in boisee'); // Typos
      
      // Tier 1 should not have fuzziness
      expect(tiers[0].bool.must[0].multi_match.fuzziness).toBeUndefined();
      
      // Tier 2 should have fuzziness
      const tier2Query = tiers[1].bool.must[0].dis_max.queries[0].multi_match;
      expect(tier2Query.fuzziness).toBeDefined();
    });

    it('should handle Manhattan normalization', () => {
      const tiers = buildTiers('manhattan jazz venues');
      
      // Should have filters for New York, New York
      const filters = tiers[0].bool.filter;
      expect(filters).toBeDefined();
      
      // Should include NYC borough handling
      const hasNYCFilter = filters.some((f: any) => 
        f.bool && f.bool.should && 
        f.bool.should.some((s: any) => s.term && s.term['city.keyword'] === 'New York')
      );
      expect(hasNYCFilter).toBe(true);
    });

    it('should handle NYC with Brooklyn boost', () => {
      const tiers = buildTiers('new york city live music');
      
      // Should have Brooklyn in should clauses
      const shouldClauses = tiers[0].bool.should;
      const hasBrooklynBoost = shouldClauses.some((clause: any) => 
        clause.term && 
        clause.term['city.keyword'] && 
        clause.term['city.keyword'].value === 'Brooklyn'
      );
      expect(hasBrooklynBoost).toBe(true);
    });

    it('should include wildcard matching in tier 3', () => {
      const tiers = buildTiers('music venues');
      
      // Tier 3 should have wildcard matching
      const tier3Should = tiers[2].bool.should;
      const hasWildcard = tier3Should.some((clause: any) => clause.wildcard);
      expect(hasWildcard).toBe(true);
    });

    it('should have match_all fallback in tier 5', () => {
      const tiers = buildTiers('venues');
      
      // Tier 5 should have match_all as last resort
      const tier5Should = tiers[4].bool.should;
      const hasMatchAll = tier5Should.some((clause: any) => clause.match_all);
      expect(hasMatchAll).toBe(true);
    });
  });

  describe('runWithFallback', () => {
    it('should return results from first successful tier', async () => {
      mockSearch.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [
              { _id: '1', _score: 1.0, _source: { company: 'Test Venue' } }
            ],
            total: { value: 1 }
          }
        }
      });

      const result = await runWithFallback(mockClient, 'contacts', 'music venues', 10);
      
      expect(result.tierUsed).toBe(1);
      expect(result.hits).toHaveLength(1);
      expect(result.message).toBeUndefined();
    });

    it('should try next tier if current returns no results', async () => {
      mockSearch
        .mockResolvedValueOnce({ body: { hits: { hits: [], total: 0 } } })
        .mockResolvedValueOnce({
          body: {
            hits: {
              hits: [
                { _id: '1', _score: 0.8, _source: { company: 'Test Venue' } }
              ],
              total: { value: 1 }
            }
          }
        });

      const result = await runWithFallback(mockClient, 'contacts', 'music venues', 10);
      
      expect(result.tierUsed).toBe(2);
      expect(result.hits).toHaveLength(1);
      expect(result.message).toBe('Showing results with flexible matching');
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('should handle all tiers returning no results', async () => {
      mockSearch.mockResolvedValue({ body: { hits: { hits: [], total: 0 } } });

      const result = await runWithFallback(mockClient, 'contacts', 'impossible query xyz123', 10);
      
      expect(result.tierUsed).toBe(5);
      expect(result.hits).toHaveLength(0);
      expect(result.message).toContain('No results found');
      expect(mockSearch).toHaveBeenCalledTimes(5);
    });

    it('should handle search errors gracefully', async () => {
      mockSearch
        .mockRejectedValueOnce(new Error('ES Error'))
        .mockResolvedValueOnce({
          body: {
            hits: {
              hits: [
                { _id: '1', _score: 0.5, _source: { company: 'Fallback Venue' } }
              ],
              total: 1
            }
          }
        });

      const result = await runWithFallback(mockClient, 'contacts', 'venues', 10);
      
      expect(result.tierUsed).toBe(2);
      expect(result.hits).toHaveLength(1);
    });

    it('should include appropriate messages for each tier', async () => {
      const messages = [
        undefined, // Tier 1
        'Showing results with flexible matching', // Tier 2
        'Expanded search to nearby areas', // Tier 3
        'Showing all venues in the state', // Tier 4
        'Showing broadest results - try adding a location', // Tier 5
      ];

      for (let i = 0; i < 5; i++) {
        mockSearch.mockReset();
        
        // Mock empty results for all tiers before the target
        for (let j = 0; j < i; j++) {
          mockSearch.mockResolvedValueOnce({ body: { hits: { hits: [], total: 0 } } });
        }
        
        // Mock successful result for target tier
        mockSearch.mockResolvedValueOnce({
          body: {
            hits: {
              hits: [{ _id: '1', _score: 1, _source: {} }],
              total: 1
            }
          }
        });

        const result = await runWithFallback(mockClient, 'contacts', 'test', 10);
        expect(result.message).toBe(messages[i]);
      }
    });
  });

  describe('getSearchSuggestions', () => {
    it('should suggest broader searches for high tier with few results', () => {
      const suggestions = getSearchSuggestions(3, 'venues in specific city', 3);
      
      expect(suggestions).toContain('Try searching for the entire state');
      expect(suggestions).toContain('Try using broader terms like "venue" or "live music"');
    });

    it('should suggest narrower searches for tier 1 with many results', () => {
      const suggestions = getSearchSuggestions(1, 'venues in california', 150);
      
      expect(suggestions).toContain('Add more specific terms to narrow results');
      expect(suggestions).toContain('Try adding a city name for more targeted results');
    });

    it('should not suggest state search if already searching by city', () => {
      const suggestions = getSearchSuggestions(1, 'venues in los angeles', 200);
      
      expect(suggestions).toContain('Add more specific terms to narrow results');
      expect(suggestions).not.toContain('Try adding a city name for more targeted results');
    });

    it('should return empty suggestions for good results', () => {
      const suggestions = getSearchSuggestions(1, 'jazz clubs in chicago', 25);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('Query cleaning', () => {
    it('should remove location from query text', () => {
      const tiers = buildTiers('venues in brooklyn');
      
      // Check that the cleaned query doesn't contain location
      const queryText = tiers[0].bool.must[0].multi_match.query;
      expect(queryText.toLowerCase()).not.toContain('brooklyn');
    });

    it('should preserve non-location terms', () => {
      const tiers = buildTiers('jazz venues in manhattan');
      
      const queryText = tiers[0].bool.must[0].multi_match.query;
      expect(queryText.toLowerCase()).toContain('jazz');
      expect(queryText.toLowerCase()).toContain('venue');
    });

    it('should use default venue terms if query becomes empty', () => {
      const tiers = buildTiers('in california'); // Only location
      
      const queryText = tiers[0].bool.must[0].multi_match.query;
      expect(queryText).toContain('music venue');
      expect(queryText).toContain('live music');
    });
  });
});
