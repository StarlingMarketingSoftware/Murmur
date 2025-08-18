import { Client } from '@elastic/elasticsearch';
import { config } from 'dotenv';

// Load environment variables
config();

// Local Elasticsearch client (will act as the target)
const localClient = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: process.env.ELASTICSEARCH_API_KEY
		? {
				apiKey: process.env.ELASTICSEARCH_API_KEY,
		  }
		: undefined, // No auth for local development if no API key
});

const INDEX_NAME = 'contacts';
const PRODUCTION_ES_URL = process.env.ELASTICSEARCH_URL_PRODUCTION;

async function checkLocalConnection() {
	try {
		const health = await localClient.cluster.health();
		console.log('✅ Local Elasticsearch connection successful:', health.status);
		return true;
	} catch (error) {
		console.error('❌ Local Elasticsearch connection failed:', error);
		return false;
	}
}

async function prepareLocalIndex() {
	console.log('🏗️  Preparing local index...');

	try {
		// Check if index exists and delete it for clean import
		const exists = await localClient.indices.exists({ index: INDEX_NAME });
		if (exists) {
			console.log('⚠️  Deleting existing local index for clean import...');
			await localClient.indices.delete({ index: INDEX_NAME });
		}

		// Create index with basic settings - the reindex operation will copy the mapping
		await localClient.indices.create({
			index: INDEX_NAME,
			settings: {
				number_of_shards: 1,
				number_of_replicas: 0, // No replicas needed for local dev
			},
		});

		console.log('✅ Local index prepared');
	} catch (error) {
		console.error('❌ Failed to prepare local index:', error);
		throw error;
	}
}

async function reindexFromProduction() {
	console.log('🚀 Starting reindex from production...');

	// Read API key from command line arguments
	const productionApiKey = process.argv[2];

	if (!productionApiKey) {
		throw new Error(
			'API Key was not provided. Please pass the key as an argument to the script.'
		);
	}

	if (!PRODUCTION_ES_URL) {
		console.error('ELASTICSEARCH_URL_PRODUCTION is not set');
		process.exit(1);
	}

	try {
		const reindexResponse = await localClient.reindex({
			wait_for_completion: true,
			source: {
				remote: {
					host: PRODUCTION_ES_URL,
					headers: {
						Authorization: `ApiKey ${productionApiKey}`,
					},
					socket_timeout: '10m',
					connect_timeout: '10s',
				},
				index: INDEX_NAME,
				size: 1000, // Batch size
			},
			dest: {
				index: INDEX_NAME,
			},
		});

		console.log('📊 Reindex completed:');
		console.log(`   Total documents: ${reindexResponse.total}`);
		console.log(`   Created documents: ${reindexResponse.created}`);
		console.log(`   Updated documents: ${reindexResponse.updated}`);
		console.log(`   Deleted documents: ${reindexResponse.deleted}`);
		console.log(`   Batches: ${reindexResponse.batches}`);
		console.log(`   Failures: ${reindexResponse.version_conflicts || 0}`);
		console.log(`   Duration: ${reindexResponse.took}ms`);

		if (reindexResponse.failures && reindexResponse.failures.length > 0) {
			console.log('\n❌ Failures encountered:');
			reindexResponse.failures.forEach((failure, index: number) => {
				console.log(`${index + 1}. ${JSON.stringify(failure, null, 2)}`);
			});
		}

		return reindexResponse;
	} catch (error) {
		console.error('❌ Reindex failed:', error);
		throw error;
	}
}

async function verifyImport() {
	console.log('🔍 Verifying import...');

	try {
		const count = await localClient.count({ index: INDEX_NAME });
		console.log(`✅ Local documents count: ${count.count}`);

		// Test search functionality
		const searchTest = await localClient.search({
			index: INDEX_NAME,
			size: 1,
			query: { match_all: {} },
		});

		if (searchTest.hits.hits.length > 0) {
			console.log('✅ Search test successful');
			console.log(
				'📄 Sample document fields:',
				Object.keys(searchTest.hits.hits[0]._source || {})
			);
		}

		return count.count;
	} catch (error) {
		console.error('❌ Verification failed:', error);
		throw error;
	}
}

async function main() {
	console.log('🎯 Reindexing Production Contacts to Local Elasticsearch');
	console.log('========================================================');

	try {
		// Step 1: Check local connection
		const connectionOk = await checkLocalConnection();
		if (!connectionOk) {
			throw new Error('Local connection check failed');
		}

		// Step 2: Prepare local index
		await prepareLocalIndex();

		// Step 3: Reindex from production
		const reindexResult = await reindexFromProduction();

		// Step 4: Verify
		const finalCount = await verifyImport();

		// Step 5: Summary
		console.log('\n🎉 Reindex Summary:');
		console.log('===================');
		console.log(`Documents copied: ${reindexResult.created}`);
		console.log(`Final local count: ${finalCount}`);
		console.log(`Success: ${reindexResult.created === finalCount ? '✅' : '❌'}`);

		if (reindexResult.created === finalCount && finalCount > 0) {
			console.log('\n🎉 Successfully copied production contacts to local Elasticsearch!');
			console.log('You can now test your search implementation with real data.');
		}
	} catch (error) {
		console.error('💥 Fatal error:', error);
		console.error('\n💡 Troubleshooting tips:');
		console.error(
			'1. Make sure you provided the correct production API key as a command line argument.'
		);
		console.error(
			'2. Make sure your local Docker Elasticsearch is running: docker-compose up -d'
		);
		console.error('3. Verify your production API key has read permissions');
		console.error('4. Check that the production URL is accessible from your network');
		process.exit(1);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
