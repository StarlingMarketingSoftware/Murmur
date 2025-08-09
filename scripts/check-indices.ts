import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prodElasticsearch = new Client({
	node: 'https://0ede66e587f64b5e81a1dcb22ab8459d.us-central1.gcp.cloud.es.io:443',
	auth: {
		apiKey: process.env.PROD_ELASTICSEARCH_API_KEY!,
	},
});

async function checkIndices() {
	try {
		console.log('🔍 Checking what indices are accessible...');
		
		// Try to list all indices
		const indices = await prodElasticsearch.cat.indices({
			format: 'json',
		});
		
		console.log('📋 Available indices:');
		indices.forEach((index: any) => {
			console.log(`  - ${index.index} (${index['docs.count']} docs)`);
		});
		
		// Try to search for any index that might contain contacts
		const allIndices = indices.map((i: any) => i.index);
		const contactIndices = allIndices.filter((name: string) => 
			name.includes('contact') || name.includes('test')
		);
		
		console.log('\n🎯 Potential contact indices:', contactIndices);
		
	} catch (error) {
		console.error('❌ Failed to check indices:', error);
	}
}

checkIndices();
