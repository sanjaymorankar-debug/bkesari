import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// The same precedence as `npm run db:migrate` (src/lib/env.ts,
// databaseUrlForMigrations): the direct endpoint when there is one, except that
// a DATABASE_URL set in the shell beats a DATABASE_URL_UNPOOLED from .env.
const shellNamesPooledOnly =
  Boolean(process.env.DATABASE_URL) && !process.env.DATABASE_URL_UNPOOLED;
loadDotenv();

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit's own commands (push, pull, studio) run DDL and long
    // introspection queries, so they take the direct endpoint when there is one.
    url: ((!shellNamesPooledOnly && process.env.DATABASE_URL_UNPOOLED) ||
      process.env.DATABASE_URL)!,
  },
  verbose: true,
  strict: true,
});
