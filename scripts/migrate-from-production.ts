import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';
import { initializeVectorDb } from '../src/app/api/_utils/vectorDb';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify API key is loaded
if (!process.env.PROD_ELASTICSEARCH_API_KEY) {
  console.error('❌ PROD_ELASTICSEARCH_API_KEY not found in environment variables');
  console.log('Make sure you have a .env.local file with your API key');
  process.exit(1);
}

console.log('✅ API key loaded successfully');

// Production Elasticsearch client
const prodElasticsearch = new Client({
	node: 'https://0ede66e587f64b5e81a1dcb22ab8459d.us-central1.gcp.cloud.es.io:443',
	auth: {
		apiKey: process.env.PROD_ELASTICSEARCH_API_KEY!,
	},
});

// Local Elasticsearch client (no auth needed for Docker setup)
const localElasticsearch = new Client({
	node: 'http://localhost:9200',
});

const PROD_INDEX_NAME = 'contacts';  // Production index
const LOCAL_INDEX_NAME = 'contacts'; // Local index

async function migrateFromProduction() {
	try {
		console.log('🔍 Testing API key with a simple request...');
		
		// Test with a simpler request first
		try {
			const clusterInfo = await prodElasticsearch.info();
			console.log('✅ Production connection successful:', clusterInfo.cluster_name);
		} catch (error) {
			console.error('❌ Failed to connect to production:', error);
			return;
		}

		// Test local connection
		console.log('🔍 Connecting to local Elasticsearch...');
		const localHealth = await localElasticsearch.cluster.health();
		console.log('✅ Local connection successful:', localHealth.cluster_name);

		// Initialize local index with proper mappings
		console.log('🔧 Initializing local vector database...');
		await initializeVectorDb();

		// Try to get index info first
		console.log('📊 Checking production index...');
		try {
			const indexInfo = await prodElasticsearch.indices.get({
				index: PROD_INDEX_NAME,
			});
			console.log('✅ Found production index:', PROD_INDEX_NAME);
		} catch (error) {
			console.error('❌ Cannot access production index:', error);
			console.log('This might be a permissions issue. Your API key may need access to the "contacts" index.');
			return;
		}

		// Get total count from production
		const countResponse = await prodElasticsearch.count({
			index: PROD_INDEX_NAME,
		});
		console.log(`📊 Total contacts in production: ${countResponse.count}`);

		// Export data from production (start with small batch for testing)
		console.log('📥 Exporting data from production...');
		const searchResponse = await prodElasticsearch.search({
			index: PROD_INDEX_NAME,
			size: 10, // Start with just 10 for testing
			query: { match_all: {} },
			_source: true,
		});

		const hits = searchResponse.hits.hits;
		console.log(`📥 Retrieved ${hits.length} contacts from production`);

		if (hits.length === 0) {
			console.log('⚠️  No contacts found in production index');
			return;
		}

		// Import to local
		console.log('📤 Importing to local Elasticsearch...');
		
		for (const hit of hits) {
			try {
				await localElasticsearch.index({
					index: LOCAL_INDEX_NAME,
					id: hit._id,
					document: hit._source,
				});
				console.log(`✅ Imported contact ${hit._id}`);
			} catch (error) {
				console.error(`❌ Failed to import contact ${hit._id}:`, error);
			}
		}

		// Verify the import
		await localElasticsearch.indices.refresh({ index: LOCAL_INDEX_NAME });
		const localCount = await localElasticsearch.count({
			index: LOCAL_INDEX_NAME,
		});

		console.log('🎉 Migration completed!');
		console.log(`📊 Production contacts exported: ${hits.length}`);
		console.log(`📊 Local contacts imported: ${localCount.count}`);

		// Test a quick search
		console.log('🔍 Testing local search...');
		const testSearch = await localElasticsearch.search({
			index: LOCAL_INDEX_NAME,
			size: 3,
			query: { match_all: {} },
		});
		
		console.log(`🎯 Sample contacts in local index: ${testSearch.hits.hits.length}`);
		testSearch.hits.hits.forEach((hit, index) => {
			const source = hit._source as any;
			console.log(`  ${index + 1}. ${source.firstName || 'N/A'} ${source.lastName || 'N/A'} (${source.email || 'N/A'})`);
		});

	} catch (error) {
		console.error('❌ Migration failed:', error);
		
		// More detailed error info
		if (error instanceof Error) {
			console.error('Error message:', error.message);
		}
		
		process.exit(1);
	}
}

// Run the migration
migrateFromProduction()
	.then(() => {
		console.log('✨ Migration script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Migration script failed:', error);
		process.exit(1);
	});
