import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://aiphy_user:aiphy_password@localhost:5432/aiphy_db',
  },
});
