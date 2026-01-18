// Database connection using Drizzle ORM with PostgreSQL
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres.js connection
// SSL is required for cloud providers like Neon, Supabase, etc.
const requireSSL =
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase.com') ||
  connectionString.includes('sslmode=require');

const client = postgres(connectionString, {
  max: 10, // Max connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout for establishing connection
  ssl: requireSSL ? 'require' : false,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema';

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await client.end();
}
