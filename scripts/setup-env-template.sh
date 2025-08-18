#!/bin/bash

# Environment Setup Template for Elasticsearch Migration
# Copy this to setup-env.sh and fill in your actual values

echo "Creating .env template for Elasticsearch migration..."

cat >> .env << 'EOF'

# ============================================
# Elasticsearch Configuration for Migration
# ============================================

# Local Elasticsearch (Docker)
ELASTICSEARCH_URL=http://localhost:9200
# ELASTICSEARCH_API_KEY=  # Usually not needed for local development

# Production Elasticsearch (get these from your team)
ELASTICSEARCH_URL_PRODUCTION=your_production_url
ELASTICSEARCH_API_KEY=your_production_api_key_here

# OpenAI (needed for vector embeddings)
OPEN_AI_API_KEY=your_openai_api_key_here

EOF

echo "✅ Environment template added to .env"
echo "📝 Please update .env with your actual production API keys"
echo "🔑 Get production keys from your team member"
