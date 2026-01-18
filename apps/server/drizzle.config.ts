import type { Config } from 'drizzle-kit';

// Load dotenv for drizzle-kit CLI
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;

// Append sslmode if not present and it's a cloud provider
let url = connectionString;
if (
  !url.includes('sslmode=') &&
  (url.includes('neon.tech') || url.includes('supabase.com') || url.includes('railway.app'))
) {
  url += url.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
} satisfies Config;
