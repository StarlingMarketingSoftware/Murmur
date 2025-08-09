console.log('Environment variables:');
console.log('PROD_ELASTICSEARCH_API_KEY:', process.env.PROD_ELASTICSEARCH_API_KEY ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.PROD_ELASTICSEARCH_API_KEY) {
  console.log('API Key first 10 chars:', process.env.PROD_ELASTICSEARCH_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ PROD_ELASTICSEARCH_API_KEY is not set!');
}
