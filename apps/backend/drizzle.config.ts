import { defineConfig } from 'drizzle-kit';

import { resolveDatabaseUrl } from './src/utils/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/**/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});
