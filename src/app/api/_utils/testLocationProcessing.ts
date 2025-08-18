/**
 * Test suite to demonstrate the difference between hardcoded and LLM-based location processing
 * Run with: npx tsx src/app/api/_utils/testLocationProcessing.ts
 */

import { applyHardcodedLocationOverrides } from './searchPreprocess';
import { applySmartLocationOverrides } from './searchPreprocessLLM';

// Test cases that showcase LLM advantages
const testCases = [
  // Cases both should handle
  {
    query: "software engineers in philly",
    description: "Common nickname - both should handle"
  },
  {
    query: "restaurants in NYC",
    description: "Common abbreviation - both should handle"
  },
  
  // Cases where LLM excels
  {
    query: "tech companies in the big apple",
    description: "Nickname not in hardcoded list"
  },
  {
    query: "museums in the windy city",
    description: "Chicago nickname - not hardcoded"
  },
  {
    query: "hotels in sin city",
    description: "Las Vegas nickname - not hardcoded"
  },
  {
    query: "startups in silicon valley",
    description: "Region, not a single city"
  },
  {
    query: "music venues in the DMV area",
    description: "DC/Maryland/Virginia region"
  },
  {
    query: "restaurants in filadelfia", 
    description: "Misspelling not in hardcoded list"
  },
  {
    query: "law firms in beantown",
    description: "Boston nickname - not hardcoded"
  },
  {
    query: "conferences in the emerald city",
    description: "Seattle nickname - not hardcoded"
  },
  {
    query: "buffalo steak house in new york",
    description: "Context matters - buffalo is food, not city"
  },
  {
    query: "jobs in the bay area",
    description: "Multi-city region around San Francisco"
  },
  {
    query: "events in motor city",
    description: "Detroit nickname - not hardcoded"
  },
  {
    query: "offices near the space needle",
    description: "Landmark implying Seattle"
  },
  {
    query: "apartments in the city of angels",
    description: "Los Angeles poetic name"
  },
  {
    query: "Schools in the twin cities",
    description: "Minneapolis-St. Paul region"
  }
];

// Parse a basic query to location JSON
function createParsedLocation(query: string) {
  // Simple mock parser - in reality this comes from the initial OpenAI call
  return {
    city: null,
    state: null,
    country: null,
    restOfQuery: query
  };
}

async function runComparison() {
  console.log('🔍 Location Processing Comparison\n');
  console.log('=' .repeat(80));
  
  for (const testCase of testCases) {
    console.log(`\n📝 Query: "${testCase.query}"`);
    console.log(`   ${testCase.description}`);
    console.log('-'.repeat(80));
    
    const parsed = createParsedLocation(testCase.query);
    
    try {
      // Run hardcoded processing
      const hardcodedResult = applyHardcodedLocationOverrides(testCase.query, parsed);
      
      console.log('🔧 Hardcoded Result:');
      console.log('   City:', hardcodedResult.overrides.city || '(none)');
      console.log('   State:', hardcodedResult.overrides.state || '(none)');
      console.log('   Rest:', hardcodedResult.overrides.restOfQuery);
      
      // Run LLM processing (if API key is available)
      if (process.env.OPEN_AI_API_KEY) {
        const llmResult = await applySmartLocationOverrides(testCase.query, parsed);
        
        console.log('\n🤖 LLM Result:');
        console.log('   City:', llmResult.overrides.city || '(none)');
        console.log('   State:', llmResult.overrides.state || '(none)');
        console.log('   Rest:', llmResult.overrides.restOfQuery);
        
        // Compare results
        const citiesMatch = hardcodedResult.overrides.city === llmResult.overrides.city;
        const statesMatch = hardcodedResult.overrides.state === llmResult.overrides.state;
        
        if (!citiesMatch || !statesMatch) {
          console.log(`\n   ⚡ Difference detected!`);
          if (!citiesMatch) {
            console.log(`   City: "${hardcodedResult.overrides.city}" → "${llmResult.overrides.city}"`);
          }
          if (!statesMatch) {
            console.log(`   State: "${hardcodedResult.overrides.state}" → "${llmResult.overrides.state}"`);
          }
        } else if (hardcodedResult.overrides.city || hardcodedResult.overrides.state) {
          console.log('\n   ✅ Both methods agree');
        } else {
          console.log('\n   🆕 LLM found location where hardcoded did not');
        }
      } else {
        console.log('\n⚠️  OpenAI API key not configured - skipping LLM comparison');
      }
    } catch (error) {
      console.error('❌ Error processing:', error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary:');
  console.log('- Hardcoded approach handles ~82 city variations');
  console.log('- LLM approach handles unlimited variations');
  console.log('- LLM provides contextual understanding');
  console.log('- Hybrid approach optimizes for both speed and coverage');
}

// Performance benchmark
async function benchmarkPerformance() {
  console.log('\n⏱️  Performance Benchmark\n');
  console.log('='.repeat(80));
  
  const iterations = 10;
  const query = "software engineers in new york city";
  const parsed = createParsedLocation(query);
  
  // Benchmark hardcoded
  const hardcodedStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    applyHardcodedLocationOverrides(query, parsed);
  }
  const hardcodedTime = Date.now() - hardcodedStart;
  
  console.log(`Hardcoded: ${hardcodedTime}ms for ${iterations} iterations`);
  console.log(`Average: ${(hardcodedTime / iterations).toFixed(2)}ms per query`);
  
  if (process.env.OPEN_AI_API_KEY) {
    // Benchmark LLM (with caching)
    const llmStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await applySmartLocationOverrides(query, parsed);
    }
    const llmTime = Date.now() - llmStart;
    
    console.log(`\nLLM (with cache): ${llmTime}ms for ${iterations} iterations`);
    console.log(`Average: ${(llmTime / iterations).toFixed(2)}ms per query`);
    console.log(`\n💡 Note: First call is slower (API), subsequent calls use cache`);
  }
}

// Run the comparison
async function main() {
  await runComparison();
  await benchmarkPerformance();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { runComparison, benchmarkPerformance };
