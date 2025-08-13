#!/usr/bin/env tsx
/**
 * Debug utility for testing the search system
 * Run with: npx tsx src/search/debug.ts "your search query"
 */

import { Client } from '@elastic/elasticsearch';
import { buildTiers, runWithFallback } from './queryBuilder';
import { normalizeLocation } from './locationNormalize';
import { searchVenues } from './searchService';

// Test queries to verify the system works
const TEST_QUERIES = [
  // Original test queries
  'music venues in manhattan',
  'live music in brooklyn', 
  'venues in idaho',
  'bars in brooklyn',
  'manhattan jazz venues',
  'new york city live music',
  'jazz clubs',
  'venu in boisee', // typo test
  'concert halls',
  'venues in california',
  'live music in boise',
  // NEW: Test "Music venue {city}" and "Music venue {state}" patterns
  'Music venue Boston',
  'Music venue California',
  'Music venues New York',
  'Jazz clubs Chicago',
  'Live music Texas',
  'Concert halls Philadelphia',
  'Bars Miami',
  'Music venue New York City',
  'Music venues District of Columbia',
];

async function debugSearch(query: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`QUERY: "${query}"`);
  console.log('='.repeat(60));
  
  // 1. Test location parsing
  console.log('\n📍 LOCATION PARSING:');
  const location = normalizeLocation(query);
  console.log(JSON.stringify(location, null, 2));
  
  // 2. Show query tiers
  console.log('\n📊 QUERY TIERS:');
  const tiers = buildTiers(query);
  tiers.forEach((tier, i) => {
    console.log(`\nTier ${i + 1}:`);
    // Show key parts of the query
    if (tier.bool.must?.[0]) {
      const must = tier.bool.must[0];
      if (must.multi_match) {
        console.log(`  Text: "${must.multi_match.query.substring(0, 50)}..."`);
        console.log(`  Match: ${must.multi_match.minimum_should_match || 'default'}`);
        console.log(`  Fuzzy: ${must.multi_match.fuzziness || 'none'}`);
      }
    }
    if (tier.bool.filter?.length > 0) {
      console.log(`  Filters: ${tier.bool.filter.length} location filters`);
    }
    if (tier.bool.should?.length > 0) {
      console.log(`  Boosts: ${tier.bool.should.length} should clauses`);
    }
  });
  
  // 3. Run actual search (if Elasticsearch is available)
  if (process.env.ELASTICSEARCH_URL) {
    console.log('\n🔍 SEARCH RESULTS:');
    try {
      const client = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        ...(process.env.ELASTICSEARCH_API_KEY && {
          auth: {
            apiKey: process.env.ELASTICSEARCH_API_KEY,
          },
        }),
      });
      
      const result = await runWithFallback(client, 'contacts', query, 10);
      
      console.log(`  Tier Used: ${result.tierUsed}`);
      console.log(`  Results: ${result.hits.length}`);
      console.log(`  Message: ${result.message || 'Perfect match'}`);
      
      if (result.hits.length > 0) {
        console.log('\n  Top 3 Results:');
        result.hits.slice(0, 3).forEach((hit, i) => {
          const source = hit._source;
          console.log(`    ${i + 1}. ${source.company || 'Unknown'}`);
          console.log(`       ${source.city}, ${source.state}`);
          console.log(`       Score: ${hit._score?.toFixed(3)}`);
        });
      }
    } catch (error: any) {
      console.log(`  ⚠️  Elasticsearch not available: ${error.message}`);
      console.log('  (Install and run Elasticsearch to test actual searches)');
    }
  } else {
    console.log('\n⚠️  ELASTICSEARCH_URL not set - skipping live search test');
  }
}

async function runAllTests() {
  console.log('🧪 RUNNING SEARCH SYSTEM TESTS');
  console.log('================================\n');
  
  for (const query of TEST_QUERIES) {
    await debugSearch(query);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETE');
  console.log('='.repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all test queries
    await runAllTests();
  } else {
    // Run specific query
    const query = args.join(' ');
    await debugSearch(query);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { debugSearch, runAllTests };
