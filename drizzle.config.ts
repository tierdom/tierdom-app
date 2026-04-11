import { join } from 'node:path';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATA_PATH) throw new Error('DATA_PATH is not set');

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: join(process.env.DATA_PATH, 'db.sqlite') },
  verbose: true,
  strict: true
});
