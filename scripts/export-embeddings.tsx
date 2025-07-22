import { Client } from '@elastic/elasticsearch';
import fs from 'fs/promises';
import path from 'path';

interface EmbeddingSource {
	vector_field: number[];
}

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY!,
	},
});

const INDEX_NAME = 'contacts';

async function exportEmbeddings() {
	try {
		// Get all documents from Elasticsearch
		const response = await elasticsearch.search<EmbeddingSource>({
			index: INDEX_NAME,
			query: { match_all: {} },
			size: 10000, // Adjust this number based on your data size
		});

		const hits = response.hits.hits;

		let output = '// Contact embeddings\nexport const contactEmbeddings = [\n';

		hits.forEach((hit) => {
			if (!hit._id || !hit._source?.vector_field) {
				console.warn('Skipping invalid hit:', hit);
				return;
			}

			// Keep the full ID (with contact- prefix) and wrap in quotes
			const id = hit._id;
			const embedding = hit._source.vector_field;

			output += `  {\n`;
			output += `    id: "${id}",\n`; // Add quotes around the ID
			output += `    embedding: [${embedding.join(', ')}],\n`;
			output += `  },\n`;
		});

		output += '];\n';

		// Write to file
		const outputPath = path.join(process.cwd(), 'embeddings-export.txt');
		await fs.writeFile(outputPath, output, 'utf-8');

		console.log(`Embeddings exported to ${outputPath}`);
	} catch (error) {
		console.error('Error exporting embeddings:', error);
	}
}

exportEmbeddings()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
