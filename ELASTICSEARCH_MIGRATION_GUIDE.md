# Elasticsearch Production Data Migration Guide

This guide explains how to load the production `contacts` index (60,000+ documents) into your local Docker Elasticsearch instance for testing.

## Prerequisites

1. **Local Docker Setup Running:**
   ```bash
   docker-compose up -d
   ```
2. **Verify Local Elasticsearch:**

   - Access http://localhost:9200 in browser
   - Should see Elasticsearch cluster info
   - Verify in Elasticvue: http://localhost:8080 (if you have it running)

3. **Environment Variables:**
   You need these environment variables in your `.env` file:

   ```
   # Local Elasticsearch (should work without API key for development)
   ELASTICSEARCH_URL=http://localhost:9200
   ELASTICSEARCH_API_KEY=your_local_api_key_if_needed

   # Production Elasticsearch
   ELASTICSEARCH_URL_PRODUCTION=your_production_elastic_search_url
   ELASTICSEARCH_API_KEY=your_production_api_key
   ```

## Migration Options

### Option 1: Elasticsearch Reindex API (Recommended - Fastest)

Uses Elasticsearch's built-in reindex feature to copy data directly from production to local.

```bash
npx tsx scripts/reindex-from-production.ts
```

**Advantages:**

- Very fast (handled internally by Elasticsearch)
- Preserves exact mapping and data structure
- Minimal memory usage
- Built-in error handling

### Option 2: Scroll and Bulk Import (Alternative)

Uses the scroll API to read from production and bulk API to write to local.

```bash
npx tsx scripts/import-production-contacts.ts
```

**Advantages:**

- More control over the process
- Better error reporting
- Can transform data during import if needed

## Step-by-Step Migration Process

### 1. Get Production API Key

Contact your team to get the production Elasticsearch API key with read permissions for the `contacts` index.

### 2. Set Environment Variables

Add to your `.env` file:

```bash
ELASTICSEARCH_URL_PRODUCTION=your_production_url
ELASTICSEARCH_API_KEY=your_api_key_here
```

### 3. Ensure Local Elasticsearch is Running

```bash
# Start local services
docker-compose up -d

# Verify Elasticsearch is healthy
curl http://localhost:9200/_cluster/health
```

### 4. Run Migration Script

```bash
# Option 1 (Recommended): Reindex API
npx tsx scripts/reindex-from-production.ts

# Option 2 (Alternative): Scroll + Bulk
npx tsx scripts/import-production-contacts.ts
```

### 5. Verify Migration

```bash
# Check document count
curl http://localhost:9200/contacts/_count

# Test search functionality
npx tsx scripts/check-elasticsearch.tsx
```

## Troubleshooting

### Common Issues

1. **Connection Refused (Local)**

   ```bash
   # Restart Docker services
   docker-compose down
   docker-compose up -d
   ```

2. **Authentication Error (Production)**

   - Verify your API key has read permissions
   - Check the API key format (should be base64 encoded)

3. **Network/Firewall Issues**

   - Ensure you can reach the production URL
   - Try: `curl -I your_elastic_search_production_url`

4. **Memory Issues (Large Dataset)**
   - The reindex script handles large datasets efficiently
   - If using import script, it processes in 1000-document batches

### Verification Commands

```bash
# Check if index exists
curl http://localhost:9200/contacts

# Get document count
curl http://localhost:9200/contacts/_count

# Get sample documents
curl "http://localhost:9200/contacts/_search?size=3&pretty"

# Check index mapping
curl http://localhost:9200/contacts/_mapping?pretty
```

## Important Notes

1. **Index Structure:**

   - Index name: `contacts`
   - Vector dimensions: 1536 (OpenAI embeddings)
   - Document structure includes: contactId, email, company, location, vectors, etc.

2. **Data Size:**

   - 60,000+ documents
   - Each document ~2-3KB average
   - Total index size: ~120-180MB

3. **Local Development:**

   - No replicas needed (set to 0 for faster imports)
   - Single shard sufficient for local testing

4. **Security:**
   - Local Elasticsearch runs without authentication
   - Production requires API key authentication

## Testing Your Search Implementation

After migration, test your search functionality:

```bash
# Test the application search
npm run dev

# Test vector search API endpoints
# Use Postman or curl to test /api/vector-search endpoints

# Test with the check script
npx tsx scripts/check-elasticsearch.tsx
```

## Resetting Local Data

If you need to start over:

```bash
# Delete just the contacts index
curl -X DELETE http://localhost:9200/contacts

# Or reset entire Elasticsearch
docker-compose down -v
docker-compose up -d
```

## Performance Notes

- **Reindex (Option 1):** ~30-60 seconds for 60K documents
- **Scroll+Bulk (Option 2):** ~2-5 minutes for 60K documents
- Local searches should respond in <100ms with proper indexing
