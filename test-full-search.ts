import { normalizeLocation } from './src/search/locationNormalize';
import { buildTiers } from './src/search/queryBuilder';

const testQueries = [
  'Music venue Boston',
  'Music venue California',
  'Music venues New York',
];

console.log('FULL SEARCH PIPELINE DEBUG\n' + '='.repeat(60));

testQueries.forEach(query => {
  console.log(`\n\nQUERY: "${query}"`);
  console.log('-'.repeat(60));
  
  // Step 1: Location parsing
  const location = normalizeLocation(query);
  console.log('\n1. LOCATION PARSING:');
  console.log('   Result:', JSON.stringify(location, null, 2));
  
  // Step 2: Build query tiers
  console.log('\n2. QUERY BUILDING:');
  const tiers = buildTiers(query);
  
  // Check first tier (most important)
  const tier1 = tiers[0];
  console.log('\n   TIER 1 QUERY:');
  
  // Check the must clause
  if (tier1.bool?.must?.[0]) {
    const mustClause = tier1.bool.must[0];
    if (mustClause.multi_match) {
      console.log('   Text search:', mustClause.multi_match.query);
      console.log('   Fields:', mustClause.multi_match.fields);
    }
  }
  
  // Check filters
  if (tier1.bool?.filter) {
    console.log('   Location filters:', JSON.stringify(tier1.bool.filter, null, 2));
  } else {
    console.log('   ⚠️  NO LOCATION FILTERS!');
  }
  
  // Check if query text was properly cleaned
  console.log('\n3. CLEANED QUERY TEXT:');
  const mustQuery = tier1.bool?.must?.[0]?.multi_match?.query;
  console.log('   Original:', query);
  console.log('   Cleaned:', mustQuery);
  
  if (!mustQuery || mustQuery === query.toLowerCase()) {
    console.log('   ❌ QUERY NOT CLEANED - Location still in search text!');
  } else if (mustQuery.length < 3) {
    console.log('   ⚠️  Query too short after cleaning');
  } else {
    console.log('   ✅ Query properly cleaned');
  }
});
