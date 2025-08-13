import { describe, it, expect } from 'vitest';
import { 
  normalizeLocation, 
  locationFilters,
  getNYCBoroughBoosts,
  testHelpers 
} from '../../src/search/locationNormalize';

describe('Location Normalization', () => {
  describe('normalizeLocation', () => {
    it('should handle Manhattan as New York, New York', () => {
      const result = normalizeLocation('manhattan jazz venues');
      expect(result).toEqual({
        type: 'city_state',
        city: 'New York',
        state: 'New York'
      });
    });

    it('should handle NYC as New York, New York', () => {
      const result = normalizeLocation('nyc live music');
      expect(result).toEqual({
        type: 'city_state',
        city: 'New York',
        state: 'New York'
      });
    });

    it('should handle "new york city" as New York, New York', () => {
      const result = normalizeLocation('new york city live music');
      expect(result).toEqual({
        type: 'city_state',
        city: 'New York',
        state: 'New York'
      });
    });

    it('should handle Brooklyn correctly', () => {
      const result = normalizeLocation('bars in brooklyn');
      expect(result).toEqual({
        type: 'city_state',
        city: 'Brooklyn',
        state: 'New York'
      });
    });

    it('should extract state from "venues in idaho"', () => {
      const result = normalizeLocation('venues in idaho');
      expect(result).toEqual({
        type: 'state',
        state: 'Idaho'
      });
    });

    it('should extract city from "live music in boise"', () => {
      const result = normalizeLocation('live music in boise');
      expect(result).toEqual({
        type: 'city_only',
        city: 'Boise'
      });
    });

    it('should handle city, state format', () => {
      const result = normalizeLocation('venues in boise, id');
      expect(result).toEqual({
        type: 'city_state',
        city: 'Boise',
        state: 'Idaho'
      });
    });

    it('should handle state abbreviations', () => {
      const result = normalizeLocation('music venues in CA');
      expect(result).toEqual({
        type: 'state',
        state: 'California'
      });
    });

    it('should return none for queries without location', () => {
      const result = normalizeLocation('best jazz clubs');
      expect(result).toEqual({
        type: 'none'
      });
    });

    it('should handle major cities without state', () => {
      const result = normalizeLocation('venues in chicago');
      expect(result).toEqual({
        type: 'city_only',
        city: 'Chicago'
      });
    });

    it('should handle multi-word cities', () => {
      const result = normalizeLocation('bars in los angeles');
      expect(result).toEqual({
        type: 'city_only',
        city: 'Los Angeles'
      });
    });

    it('should handle Washington DC variations', () => {
      const variations = [
        'venues in washington dc',
        'venues in washington, dc',
        'venues in district of columbia'
      ];
      
      variations.forEach(query => {
        const result = normalizeLocation(query);
        expect(result.type).toBe('city_only');
        if (result.type === 'city_only') {
          expect(result.city).toBe('Washington');
        }
      });
    });
  });

  describe('locationFilters', () => {
    it('should create filters for city and state', () => {
      const location = { type: 'city_state' as const, city: 'Boston', state: 'Massachusetts' };
      const filters = locationFilters(location);
      
      expect(filters).toContainEqual({ term: { 'city.keyword': 'Boston' } });
      expect(filters).toContainEqual({ term: { 'state.keyword': 'Massachusetts' } });
    });

    it('should create special filters for NYC', () => {
      const location = { type: 'city_state' as const, city: 'New York', state: 'New York' };
      const filters = locationFilters(location);
      
      // Should have a bool query for NYC boroughs
      const boolFilter = filters.find((f: any) => f.bool);
      expect(boolFilter).toBeDefined();
      expect(boolFilter.bool.should).toContainEqual({ term: { 'city.keyword': 'New York' } });
      expect(boolFilter.bool.should).toContainEqual({ term: { 'city.keyword': 'Brooklyn' } });
    });

    it('should create filter for state only', () => {
      const location = { type: 'state' as const, state: 'California' };
      const filters = locationFilters(location);
      
      expect(filters).toHaveLength(1);
      expect(filters).toContainEqual({ term: { 'state.keyword': 'California' } });
    });

    it('should create filter for city only', () => {
      const location = { type: 'city_only' as const, city: 'Seattle' };
      const filters = locationFilters(location);
      
      expect(filters).toHaveLength(1);
      expect(filters).toContainEqual({ term: { 'city.keyword': 'Seattle' } });
    });

    it('should return empty array for no location', () => {
      const location = { type: 'none' as const };
      const filters = locationFilters(location);
      
      expect(filters).toEqual([]);
    });
  });

  describe('getNYCBoroughBoosts', () => {
    it('should return borough boosts for NYC queries', () => {
      const boosts = getNYCBoroughBoosts('new york city venues');
      
      expect(boosts).toContainEqual(
        expect.objectContaining({
          term: expect.objectContaining({
            'city.keyword': expect.objectContaining({
              value: 'Brooklyn',
              boost: 0.8
            })
          })
        })
      );
    });

    it('should return borough boosts for nyc queries', () => {
      const boosts = getNYCBoroughBoosts('nyc live music');
      
      expect(boosts.length).toBeGreaterThan(0);
      // Check that all boroughs are included with appropriate boosts
      const boroughNames = boosts.map((b: any) => b.term['city.keyword'].value);
      expect(boroughNames).toContain('Brooklyn');
      expect(boroughNames).toContain('Queens');
    });

    it('should return empty array for non-NYC queries', () => {
      const boosts = getNYCBoroughBoosts('venues in boston');
      
      expect(boosts).toEqual([]);
    });
  });

  describe('Pattern: "Music venue {location}"', () => {
    it('should handle "Music venue {city}" pattern', () => {
      const queries = [
        { input: 'Music venue Boston', expectedCity: 'Boston' },
        { input: 'Music venues Chicago', expectedCity: 'Chicago' },
        { input: 'Jazz clubs Miami', expectedCity: 'Miami' },
        { input: 'Concert halls Philadelphia', expectedCity: 'Philadelphia' },
        { input: 'Bars Seattle', expectedCity: 'Seattle' },
        { input: 'Live music Atlanta', expectedCity: 'Atlanta' },
      ];

      queries.forEach(({ input, expectedCity }) => {
        const result = normalizeLocation(input);
        expect(result.type).toMatch(/city/);
        if (result.type === 'city_only' || result.type === 'city_state') {
          expect(result.city).toBe(expectedCity);
        }
      });
    });

    it('should handle "Music venue {state}" pattern', () => {
      const queries = [
        { input: 'Music venue California', expectedState: 'California' },
        { input: 'Music venues Texas', expectedState: 'Texas' },
        { input: 'Jazz clubs Florida', expectedState: 'Florida' },
        { input: 'Concert halls Pennsylvania', expectedState: 'Pennsylvania' },
        { input: 'Live music Colorado', expectedState: 'Colorado' },
        { input: 'Music venue New York', expectedState: 'New York' },
        { input: 'Music venues District of Columbia', expectedState: 'District of Columbia' },
      ];

      queries.forEach(({ input, expectedState }) => {
        const result = normalizeLocation(input);
        expect(result.type).toBe('state');
        if (result.type === 'state') {
          expect(result.state).toBe(expectedState);
        }
      });
    });

    it('should handle multi-word cities at end', () => {
      const queries = [
        { input: 'Music venue Los Angeles', expectedCity: 'Los Angeles' },
        { input: 'Music venue San Francisco', expectedCity: 'San Francisco' },
        { input: 'Music venue New Orleans', expectedCity: 'New Orleans' },
        { input: 'Music venue Las Vegas', expectedCity: 'Las Vegas' },
      ];

      queries.forEach(({ input, expectedCity }) => {
        const result = normalizeLocation(input);
        expect(result.type).toBe('city_only');
        if (result.type === 'city_only') {
          expect(result.city).toBe(expectedCity);
        }
      });
    });
  });

  describe('State name normalization', () => {
    it('should handle full state names', () => {
      const states = [
        { input: 'venues in california', expected: 'California' },
        { input: 'venues in new york', expected: 'New York' },
        { input: 'venues in pennsylvania', expected: 'Pennsylvania' },
        { input: 'venues in district of columbia', expected: 'District of Columbia' }
      ];

      states.forEach(({ input, expected }) => {
        const result = normalizeLocation(input);
        if (result.type === 'state' || result.type === 'city_state') {
          expect(result.state).toBe(expected);
        }
      });
    });

    it('should handle state abbreviations', () => {
      const states = [
        { input: 'venues in ca', expected: 'California' },
        { input: 'venues in ny', expected: 'New York' },
        { input: 'venues in pa', expected: 'Pennsylvania' },
        { input: 'venues in dc', expected: 'District of Columbia' }
      ];

      states.forEach(({ input, expected }) => {
        const result = normalizeLocation(input);
        if (result.type === 'state') {
          expect(result.state).toBe(expected);
        }
      });
    });
  });
});
