import { Client } from '@elastic/elasticsearch';
import { buildTiers } from './src/search/queryBuilder';

const es = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ...(process.env.ELASTICSEARCH_API_KEY && {
    auth: {
      apiKey: process.env.ELASTICSEARCH_API_KEY,
    },
  }),
});

async function testActualSearch() {
  console.log('TESTING ACTUAL SEARCHES\n' + '='.repeat(60));
  
  const testQueries = [
    'Music venue Boston',
    'Music venue California',
    'Music venues New York'
  ];
  
  for (const query of testQueries) {
    console.log(`\n\nTESTING: "${query}"`);
    console.log('-'.repeat(60));
    
    // Build the query using our system
    const tiers = buildTiers(query);
    const tier1Query = tiers[0];
    
    console.log('\nQuery being sent to Elasticsearch:');
    console.log(JSON.stringify(tier1Query, null, 2));
    
    try {
      // Execute the search
      const result = await es.search({
        index: 'contacts',
        size: 5,
        query: tier1Query
      });
      
      const hits = result.hits?.hits || [];
      const total = result.hits?.total?.value || 0;
      
      console.log(`\n✅ RESULTS: Found ${total} total matches`);
      console.log(`Showing first ${hits.length}:`);
      
      hits.forEach((hit, i) => {
        const doc = hit._source;
        console.log(`\n${i + 1}. ${doc.company || 'Unknown'}`);
        console.log(`   Location: ${doc.city}, ${doc.state}`);
        console.log(`   Score: ${hit._score}`);
        if (doc.headline) {
          console.log(`   Headline: ${doc.headline.substring(0, 80)}...`);
        }
      });
      
      if (total === 0) {
        console.log('\n❌ NO RESULTS FOUND!');
        
        // Try without filters to see if it's a filter issue
        console.log('\nTrying without location filters...');
        const noFilterQuery = {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'music venue',
                  fields: ['company^8', 'headline^3', 'metadata^2', 'title^2']
                }
              }
            ]
          }
        };
        
        const noFilterResult = await es.search({
          index: 'contacts',
          size: 3,
          query: noFilterQuery
        });
        
        console.log(`Found ${noFilterResult.hits?.total?.value || 0} without location filters`);
      }
      
    } catch (error: any) {
      console.log('\n❌ SEARCH ERROR:', error.message);
    }
  }
}

testActualSearch().catch(console.error);
