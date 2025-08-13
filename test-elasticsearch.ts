import { Client } from '@elastic/elasticsearch';

const es = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ...(process.env.ELASTICSEARCH_API_KEY && {
    auth: {
      apiKey: process.env.ELASTICSEARCH_API_KEY,
    },
  }),
});

async function testElasticsearch() {
  console.log('ELASTICSEARCH DEBUG\n' + '='.repeat(60));
  
  try {
    // 1. Check if index exists
    console.log('\n1. Checking index...');
    const indexExists = await es.indices.exists({ index: 'contacts' });
    console.log('   Index "contacts" exists:', indexExists);
    
    if (!indexExists) {
      console.log('   ❌ INDEX DOES NOT EXIST!');
      return;
    }
    
    // 2. Get mapping to see field names
    console.log('\n2. Getting index mapping...');
    const mapping = await es.indices.getMapping({ index: 'contacts' });
    const properties = mapping.contacts?.mappings?.properties || {};
    
    console.log('   Fields in index:');
    const fieldNames = Object.keys(properties);
    fieldNames.forEach(field => {
      const fieldType = properties[field].type;
      const hasKeyword = properties[field].fields?.keyword ? ' (has .keyword)' : '';
      console.log(`   - ${field}: ${fieldType}${hasKeyword}`);
    });
    
    // 3. Check if city.keyword and state.keyword exist
    console.log('\n3. Checking required fields:');
    const hasCity = 'city' in properties;
    const hasCityKeyword = properties.city?.fields?.keyword ? true : false;
    const hasState = 'state' in properties;
    const hasStateKeyword = properties.state?.fields?.keyword ? true : false;
    
    console.log(`   city field: ${hasCity ? '✅' : '❌'}`);
    console.log(`   city.keyword: ${hasCityKeyword ? '✅' : '❌'}`);
    console.log(`   state field: ${hasState ? '✅' : '❌'}`);
    console.log(`   state.keyword: ${hasStateKeyword ? '✅' : '❌'}`);
    
    // 4. Try a simple search to see if we get any data
    console.log('\n4. Testing simple search...');
    const testSearch = await es.search({
      index: 'contacts',
      size: 3,
      query: {
        match_all: {}
      }
    });
    
    const hits = testSearch.hits?.hits || [];
    console.log(`   Found ${hits.length} documents`);
    
    if (hits.length > 0) {
      console.log('\n   Sample document fields:');
      const sampleDoc = hits[0]._source;
      Object.keys(sampleDoc).forEach(key => {
        const value = sampleDoc[key];
        if (key === 'city' || key === 'state' || key === 'company') {
          console.log(`   - ${key}: "${value}"`);
        }
      });
    }
    
    // 5. Test a location filter query
    console.log('\n5. Testing location filter query...');
    const locationTest = await es.search({
      index: 'contacts',
      size: 5,
      query: {
        bool: {
          filter: [
            { exists: { field: 'city' } }
          ]
        }
      }
    });
    
    console.log(`   Documents with city field: ${locationTest.hits?.total?.value || 0}`);
    
    // 6. Test searching for "music venue"
    console.log('\n6. Testing "music venue" text search...');
    const textTest = await es.search({
      index: 'contacts',
      size: 5,
      query: {
        multi_match: {
          query: 'music venue',
          fields: ['company', 'headline', 'metadata', 'title']
        }
      }
    });
    
    console.log(`   Documents matching "music venue": ${textTest.hits?.total?.value || 0}`);
    
  } catch (error: any) {
    console.log('\n❌ ELASTICSEARCH ERROR:');
    console.log('   ', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n   ⚠️  Elasticsearch is not running or not accessible!');
      console.log('   Make sure Elasticsearch is running on', process.env.ELASTICSEARCH_URL || 'http://localhost:9200');
    }
  }
}

testElasticsearch().catch(console.error);
