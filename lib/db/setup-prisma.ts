import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function getPostgresURL(): Promise<string> {
  if (process.env.DATABASE_URL) {
    const useExisting = await question(
      `Found existing DATABASE_URL in .env file. Use it? (Y/n): `
    );
    if (useExisting.toLowerCase() !== 'n') {
      return process.env.DATABASE_URL;
    }
  }

  const host = await question('Enter database host (default: localhost): ');
  const port = await question('Enter database port (default: 5432): ');
  const user = await question('Enter database user (default: postgres): ');
  const password = await question('Enter database password: ');
  const database = await question('Enter database name (default: flock): ');

  return `postgresql://${user || 'postgres'}:${password}@${
    host || 'localhost'
  }:${port || '5432'}/${database || 'flock'}`;
}

async function createEnvFile(databaseURL: string) {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = `# Database configuration
DATABASE_URL=${databaseURL}
POSTGRES_URL=${databaseURL}

# Stripe configuration (replace with your actual keys)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Application configuration
BASE_URL=http://localhost:3000
AUTH_SECRET=${Math.random().toString(36).substring(2, 15)}
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`Created .env file at ${envPath}`);
}

async function main() {
  console.log('Setting up Flock database with Prisma...');

  // Get database connection details
  const DATABASE_URL = await getPostgresURL();

  // Create .env file if it doesn't exist
  if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
    await createEnvFile(DATABASE_URL);
  }

  // Initialize Prisma client
  const prisma = new PrismaClient();

  try {
    // Test connection
    await prisma.$connect();
    console.log('Successfully connected to the database');

    // Run migrations
    console.log('Running migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });

    console.log('Database setup complete!');
    console.log('You can now run:');
    console.log('  npm run prisma:studio - to view your database');
    console.log('  npm run dev - to start the development server');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
}); 