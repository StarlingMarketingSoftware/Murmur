import { Client } from '@elastic/elasticsearch';

const elasticsearch = new Client({
	nodes: [process.env.ELASTICSEARCH_URL || 'http://localhost:9200'],
});

const INDEX_NAME = 'contacts';

// Function to check if a specific contact exists
const checkContact = async (contactId: string) => {
	try {
		const exists = await elasticsearch.exists({
			index: INDEX_NAME,
			id: contactId,
		});

		if (exists) {
			// If exists, get the full document
			const doc = await elasticsearch.get({
				index: INDEX_NAME,
				id: contactId,
			});
			console.log('Found contact:', JSON.stringify(doc, null, 2));
		} else {
			console.log(`Contact ${contactId} not found`);
		}
	} catch (error) {
		console.error('Error checking contact:', error);
	}
};

// Function to search contacts by any field
const searchContacts = async (field: string, value: string) => {
	try {
		const response = await elasticsearch.search({
			index: INDEX_NAME,
			query: {
				match: {
					[field]: value,
				},
			},
		});

		console.log(`Found ${response.hits.total} matches:`);
		console.log(JSON.stringify(response.hits.hits, null, 2));
	} catch (error) {
		console.error('Error searching contacts:', error);
	}
};

// Function to list all contacts
const listAllContacts = async () => {
	try {
		const response = await elasticsearch.search({
			index: INDEX_NAME,
			query: { match_all: {} },
			size: 100, // Adjust this number based on your needs
		});

		console.log(`Total contacts: ${response.hits.total}`);
		response.hits.hits.forEach((hit) => {
			console.log(`ID: ${hit._id}`);
			console.log('Data:', hit._source);
			console.log('---');
		});
	} catch (error) {
		console.error('Error listing contacts:', error);
	}
};

// Example usage:
const command = process.argv[2];
const param1 = process.argv[3];
const param2 = process.argv[4];

switch (command) {
	case 'check':
		if (!param1) {
			console.error('Please provide a contact ID');
			process.exit(1);
		}
		checkContact(param1);
		break;
	case 'search':
		if (!param1 || !param2) {
			console.error('Please provide a field and value to search');
			process.exit(1);
		}
		searchContacts(param1, param2);
		break;
	case 'list':
		listAllContacts();
		break;
	default:
		console.log(`
Usage:
  npx tsx scripts/check-elasticsearch.tsx check <contactId>
  npx tsx scripts/check-elasticsearch.tsx search <field> <value>
  npx tsx scripts/check-elasticsearch.tsx list

Examples:
  npx tsx scripts/check-elasticsearch.tsx check "contact-1"
  npx tsx scripts/check-elasticsearch.tsx search email "example@email.com"
  npx tsx scripts/check-elasticsearch.tsx search firstName "John"
  npx tsx scripts/check-elasticsearch.tsx list
        `);
}
