import { Client } from '@elastic/elasticsearch';
import { config } from 'dotenv';

// Load environment variables
config();

// Production Elasticsearch client
const productionClient = new Client({
	node: process.env.PRODUCTION_ELASTICSEARCH_URL!,
	auth: {
		apiKey: process.argv[2], // Read from command line
	},
});

// Local Elasticsearch client
const localClient = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		apiKey: process.argv[3], // Read from command line
	},
});

const INDEX_NAME = 'contacts';

interface ImportStats {
	totalDocuments: number;
	importedDocuments: number;
	errors: any[];
	startTime: Date;
	endTime?: Date;
}

async function checkConnections() {
	console.log('🔍 Checking connections...');
	
	try {
		// Check local connection
		const localHealth = await localClient.cluster.health();
		console.log('✅ Local Elasticsearch connection successful:', localHealth.status);
		
		// Check production connection
		const prodHealth = await productionClient.cluster.health();
		console.log('✅ Production Elasticsearch connection successful:', prodHealth.status);
		
		return true;
	} catch (error) {
		console.error('❌ Connection check failed:', error);
		return false;
	}
}

async function getProductionIndexInfo() {
	try {
		const count = await productionClient.count({
			index: INDEX_NAME,
		});
		
		const mapping = await productionClient.indices.getMapping({
			index: INDEX_NAME,
		});
		
		console.log(`📊 Production index info:`);
		console.log(`   Documents: ${count.count}`);
		console.log(`   Mapping fields: ${Object.keys(mapping[INDEX_NAME]?.mappings?.properties || {}).length}`);
		
		return count.count;
	} catch (error) {
		console.error('❌ Failed to get production index info:', error);
		throw error;
	}
}

async function prepareLocalIndex() {
	console.log('🏗️  Preparing local index...');
	
	try {
		// Check if index exists
		const exists = await localClient.indices.exists({ index: INDEX_NAME });
		
		if (exists) {
			console.log('⚠️  Local index exists. Deleting to ensure clean import...');
			await localClient.indices.delete({ index: INDEX_NAME });
		}
		
		// Get production mapping
		const productionMapping = await productionClient.indices.getMapping({
			index: INDEX_NAME,
		});
		
		const productionSettings = await productionClient.indices.getSettings({
			index: INDEX_NAME,
		});
		
		// Filter out internal settings that can't be set on new indices
		const rawSettings = productionSettings[INDEX_NAME]?.settings?.index || {};
		const filteredSettings: any = {};
		
		// Only copy allowed settings, exclude internal ones
		const allowedSettings = [
			'number_of_shards',
			'number_of_replicas', 
			'analysis',
			'max_result_window',
			'mapping'
		];
		
		for (const [key, value] of Object.entries(rawSettings)) {
			if (allowedSettings.some(allowed => key.startsWith(allowed))) {
				filteredSettings[key] = value;
			}
		}
		
		// Set sensible defaults for local development
		filteredSettings.number_of_replicas = 0; // No replicas needed for local dev
		if (!filteredSettings.number_of_shards) {
			filteredSettings.number_of_shards = 1;
		}

		// Create local index with production mapping and filtered settings
		await localClient.indices.create({
			index: INDEX_NAME,
			settings: filteredSettings,
			mappings: productionMapping[INDEX_NAME]?.mappings,
		});
		
		console.log('✅ Local index created with production mapping');
	} catch (error) {
		console.error('❌ Failed to prepare local index:', error);
		throw error;
	}
}

async function importContacts(): Promise<ImportStats> {
	const stats: ImportStats = {
		totalDocuments: 0,
		importedDocuments: 0,
		errors: [],
		startTime: new Date(),
	};
	
	console.log('🚀 Starting contact import...');
	
	try {
		// Get total count first
		const totalCount = await getProductionIndexInfo();
		stats.totalDocuments = totalCount;
		
		// Use scroll API for large datasets
		const scrollTimeout = '5m';
		const batchSize = 1000;
		
		let response = await productionClient.search({
			index: INDEX_NAME,
			scroll: scrollTimeout,
			size: batchSize,
			body: {
				query: { match_all: {} },
			},
		});
		
		let scrollId = response._scroll_id;
		let hits = response.hits.hits;
		
		while (hits.length > 0) {
			// Prepare bulk operations
			const bulkOperations: any[] = [];
			
			for (const hit of hits) {
				bulkOperations.push({
					index: {
						_index: INDEX_NAME,
						_id: hit._id,
					},
				});
				bulkOperations.push(hit._source);
			}
			
			// Bulk insert to local
			try {
				const bulkResponse = await localClient.bulk({
					body: bulkOperations,
				});
				
				// Check for errors
				if (bulkResponse.errors) {
					const erroredDocuments = bulkResponse.items.filter((item: any) => 
						item.index && item.index.error
					);
					stats.errors.push(...erroredDocuments.map((item: any) => item.index.error));
				}
				
				stats.importedDocuments += hits.length;
				console.log(`📥 Imported ${stats.importedDocuments}/${stats.totalDocuments} documents`);
				
			} catch (bulkError) {
				console.error('❌ Bulk import error:', bulkError);
				stats.errors.push(bulkError);
			}
			
			// Get next batch
			try {
				response = await productionClient.scroll({
					scroll_id: scrollId,
					scroll: scrollTimeout,
				});
				hits = response.hits.hits;
				scrollId = response._scroll_id;
			} catch (scrollError) {
				console.error('❌ Scroll error:', scrollError);
				break;
			}
		}
		
		// Clear scroll
		if (scrollId) {
			try {
				await productionClient.clearScroll({ scroll_id: scrollId });
			} catch (clearError) {
				console.warn('⚠️  Failed to clear scroll:', clearError);
			}
		}
		
	} catch (error) {
		console.error('❌ Import failed:', error);
		stats.errors.push(error);
	}
	
	stats.endTime = new Date();
	return stats;
}

async function verifyImport() {
	console.log('🔍 Verifying import...');
	
	try {
		const localCount = await localClient.count({ index: INDEX_NAME });
		console.log(`✅ Local documents count: ${localCount.count}`);
		
		// Test a simple search
		const searchTest = await localClient.search({
			index: INDEX_NAME,
			size: 1,
			body: {
				query: { match_all: {} },
			},
		});
		
		if (searchTest.hits.hits.length > 0) {
			console.log('✅ Search test successful');
			console.log('📄 Sample document:', JSON.stringify(searchTest.hits.hits[0]._source, null, 2));
		}
		
		return localCount.count;
	} catch (error) {
		console.error('❌ Verification failed:', error);
		throw error;
	}
}

async function main() {
	console.log('🎯 Starting Production Contacts Import to Local Elasticsearch');
	console.log('============================================================');

	// Validate command line arguments
	if (!process.argv[2]) {
		throw new Error('Production Elasticsearch API Key is required as the first argument.');
	}
	if (!process.argv[3]) {
		throw new Error('Local Elasticsearch API Key is required as the second argument. If none, use "none".');
	}

	// Validate environment variables
	if (!process.env.PRODUCTION_ELASTICSEARCH_URL) {
		throw new Error('PRODUCTION_ELASTICSEARCH_URL environment variable is required');
	}
	
	try {
		// Step 1: Check connections
		const connectionsOk = await checkConnections();
		if (!connectionsOk) {
			throw new Error('Connection checks failed');
		}
		
		// Step 2: Prepare local index
		await prepareLocalIndex();
		
		// Step 3: Import data
		const stats = await importContacts();
		
		// Step 4: Verify import
		const finalCount = await verifyImport();
		
		// Step 5: Summary
		console.log('\n📈 Import Summary:');
		console.log('==================');
		console.log(`Total documents in production: ${stats.totalDocuments}`);
		console.log(`Documents imported: ${stats.importedDocuments}`);
		console.log(`Final local count: ${finalCount}`);
		console.log(`Errors: ${stats.errors.length}`);
		console.log(`Duration: ${((stats.endTime!.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)}s`);
		
		if (stats.errors.length > 0) {
			console.log('\n❌ Errors encountered:');
			stats.errors.forEach((error, index) => {
				console.log(`${index + 1}. ${JSON.stringify(error, null, 2)}`);
			});
		}
		
		if (stats.importedDocuments === stats.totalDocuments && stats.errors.length === 0) {
			console.log('\n🎉 Import completed successfully! Your local Elasticsearch now has all production contacts.');
		} else {
			console.log('\n⚠️  Import completed with issues. Please review the errors above.');
		}
		
	} catch (error) {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
